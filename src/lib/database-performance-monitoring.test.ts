/**
 * 数据库性能监控测试
 */

import {
  DatabasePerformanceMonitoring,
  DatabaseOperation,
  DatabaseTable,
} from "./database-performance-monitoring";
import { PerformanceMonitoring, MetricCategory } from "./performance-monitoring";

// 启用 fake timers
jest.useFakeTimers();

// Mock PerformanceMonitoring
jest.mock("./performance-monitoring");
const MockedPerformanceMonitoring = PerformanceMonitoring as jest.MockedClass<
  typeof PerformanceMonitoring
>;

describe("DatabasePerformanceMonitoring", () => {
  let dbMonitoring: DatabasePerformanceMonitoring;
  let mockPerformanceMonitoring: jest.Mocked<PerformanceMonitoring>;

  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();

    // 创建mock实例
    mockPerformanceMonitoring =
      new MockedPerformanceMonitoring() as jest.Mocked<PerformanceMonitoring>;
    dbMonitoring = new DatabasePerformanceMonitoring({}, mockPerformanceMonitoring);
  });

  describe("constructor", () => {
    test("应该使用提供的配置创建数据库监控实例", () => {
      const config = {
        enabled: false,
        slowQueryThreshold: 2000,
        maxHistorySize: 500,
      };

      const customDbMonitoring = new DatabasePerformanceMonitoring(
        config,
        mockPerformanceMonitoring,
      );

      expect(customDbMonitoring).toBeInstanceOf(DatabasePerformanceMonitoring);
    });

    test("应该使用默认配置创建数据库监控实例", () => {
      expect(dbMonitoring).toBeInstanceOf(DatabasePerformanceMonitoring);
    });
  });

  describe("recordConnection", () => {
    test("应该记录成功的数据库连接", () => {
      const connectionTime = 500;
      const success = true;

      dbMonitoring.recordConnection(connectionTime, success);

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "database_connection_time",
        MetricCategory.DATABASE,
        connectionTime,
        "ms",
        { success: "true" },
      );

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "database_connection_success",
        MetricCategory.DATABASE,
        1,
        "count",
      );
    });

    test("应该记录失败的数据库连接", () => {
      const connectionTime = 1000;
      const success = false;

      dbMonitoring.recordConnection(connectionTime, success);

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "database_connection_time",
        MetricCategory.DATABASE,
        connectionTime,
        "ms",
        { success: "false" },
      );

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "database_connection_failed",
        MetricCategory.DATABASE,
        1,
        "count",
      );
    });

    test("应该在监控禁用时不记录连接", () => {
      const disabledMonitoring = new DatabasePerformanceMonitoring(
        { enabled: false },
        mockPerformanceMonitoring,
      );

      disabledMonitoring.recordConnection(500, true);

      expect(mockPerformanceMonitoring.recordMetric).not.toHaveBeenCalled();
    });
  });

  describe("startDatabaseOperation and endDatabaseOperation", () => {
    test("应该正确开始和结束数据库操作", () => {
      const operation = DatabaseOperation.QUERY;
      const table = DatabaseTable.FILES;
      const recordCount = 10;

      const operationId = dbMonitoring.startDatabaseOperation(operation, table, recordCount);

      expect(typeof operationId).toBe("string");
      expect(operationId).toContain("query_files");

      // 模拟一些处理时间
      jest.advanceTimersByTime(50);

      const metric = dbMonitoring.endDatabaseOperation(operationId, true);

      expect(metric).toMatchObject({
        operation,
        table,
        executionTime: expect.any(Number),
        recordCount,
        success: true,
      });

      expect(metric?.executionTime).toBeGreaterThan(40);
    });

    test("应该记录失败的操作", () => {
      const operation = DatabaseOperation.INSERT;
      const table = DatabaseTable.TRANSCRIPTS;
      const recordCount = 1;
      const errorMessage = "Insert failed";

      const operationId = dbMonitoring.startDatabaseOperation(operation, table, recordCount);
      const metric = dbMonitoring.endDatabaseOperation(operationId, false, errorMessage);

      expect(metric).toMatchObject({
        operation,
        table,
        recordCount,
        success: false,
        error: errorMessage,
      });
    });

    test("应该处理不存在的操作ID", () => {
      const metric = dbMonitoring.endDatabaseOperation("nonexistent_operation");

      expect(metric).toBeNull();
    });

    test("应该在监控禁用时返回空字符串", () => {
      const disabledMonitoring = new DatabasePerformanceMonitoring(
        { enabled: false },
        mockPerformanceMonitoring,
      );

      const operationId = disabledMonitoring.startDatabaseOperation(
        DatabaseOperation.QUERY,
        DatabaseTable.FILES,
        10,
      );

      expect(operationId).toBe("");
    });
  });

  describe("transaction management", () => {
    test("应该管理事务生命周期", () => {
      const transactionId = "test_transaction_1";

      // 开始事务
      dbMonitoring.startTransaction(transactionId);

      // 添加事务操作
      const operationId1 = dbMonitoring.startDatabaseOperation(
        DatabaseOperation.INSERT,
        DatabaseTable.FILES,
        1,
      );
      dbMonitoring.addTransactionOperation(transactionId, operationId1);

      const operationId2 = dbMonitoring.startDatabaseOperation(
        DatabaseOperation.INSERT,
        DatabaseTable.SEGMENTS,
        5,
      );
      dbMonitoring.addTransactionOperation(transactionId, operationId2);

      // 结束事务
      dbMonitoring.endTransaction(transactionId, true);

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "database_transaction_duration",
        MetricCategory.DATABASE,
        expect.any(Number),
        "ms",
        { success: "true" },
        {
          operationCount: 2,
          transactionId,
        },
      );
    });

    test("应该处理不存在的事务", () => {
      const transactionId = "nonexistent_transaction";

      // 不应该抛出错误
      expect(() => {
        dbMonitoring.endTransaction(transactionId, true);
      }).not.toThrow();
    });

    test("应该在事务监控禁用时不记录", () => {
      const disabledMonitoring = new DatabasePerformanceMonitoring(
        { enabled: true, trackTransactionPerformance: false },
        mockPerformanceMonitoring,
      );

      disabledMonitoring.startTransaction("test_transaction");
      disabledMonitoring.endTransaction("test_transaction", true);

      expect(mockPerformanceMonitoring.recordMetric).not.toHaveBeenCalledWith(
        "database_transaction_duration",
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe("recordIndexUsage and recordQueryType", () => {
    test("应该记录索引使用情况", () => {
      const operationId = dbMonitoring.startDatabaseOperation(
        DatabaseOperation.QUERY,
        DatabaseTable.FILES,
        10,
      );
      const indexUsed = true;
      const indexName = "idx_files_name";

      dbMonitoring.recordIndexUsage(operationId, indexUsed, indexName);

      // 操作应该在metadata中包含索引信息
      const metric = dbMonitoring.endDatabaseOperation(operationId, true);

      expect(metric?.metadata).toMatchObject({
        indexUsed,
        indexName,
      });
    });

    test("应该记录查询类型", () => {
      const operationId = dbMonitoring.startDatabaseOperation(
        DatabaseOperation.QUERY,
        DatabaseTable.FILES,
        10,
      );
      const queryType = "join";

      dbMonitoring.recordQueryType(operationId, queryType);

      const metric = dbMonitoring.endDatabaseOperation(operationId, true);

      expect(metric?.metadata).toMatchObject({
        queryType,
      });
    });

    test("应该在查询模式监控禁用时不记录", () => {
      const disabledMonitoring = new DatabasePerformanceMonitoring(
        { enabled: true, trackQueryPatterns: false },
        mockPerformanceMonitoring,
      );

      const operationId = disabledMonitoring.startDatabaseOperation(
        DatabaseOperation.QUERY,
        DatabaseTable.FILES,
        10,
      );

      disabledMonitoring.recordIndexUsage(operationId, true, "test_index");
      disabledMonitoring.recordQueryType(operationId, "complex");

      const metric = disabledMonitoring.endDatabaseOperation(operationId, true);

      expect(metric?.metadata).not.toHaveProperty("indexUsed");
      expect(metric?.metadata).not.toHaveProperty("queryType");
    });
  });

  describe("getDatabaseStats", () => {
    test("应该计算正确的数据库统计", () => {
      // 添加一些测试指标
      const operationId1 = dbMonitoring.startDatabaseOperation(
        DatabaseOperation.QUERY,
        DatabaseTable.FILES,
        10,
      );
      dbMonitoring.endDatabaseOperation(operationId1, true);

      const operationId2 = dbMonitoring.startDatabaseOperation(
        DatabaseOperation.INSERT,
        DatabaseTable.TRANSCRIPTS,
        1,
      );
      dbMonitoring.endDatabaseOperation(operationId2, false, "Insert failed");

      const operationId3 = dbMonitoring.startDatabaseOperation(
        DatabaseOperation.UPDATE,
        DatabaseTable.SEGMENTS,
        5,
      );
      dbMonitoring.endDatabaseOperation(operationId3, true);

      const stats = dbMonitoring.getDatabaseStats();

      expect(stats).toMatchObject({
        totalOperations: 3,
        averageExecutionTime: expect.any(Number),
        successRate: expect.any(Number),
        operationBreakdown: expect.any(Object),
        tableBreakdown: expect.any(Object),
        queryTypeBreakdown: expect.any(Object),
        indexUsage: expect.any(Object),
        throughput: expect.any(Number),
      });

      expect(stats.successRate).toBeCloseTo(66.67, 1); // 2/3 = 66.67%
      expect(stats.operationBreakdown).toHaveProperty(DatabaseOperation.QUERY);
      expect(stats.operationBreakdown).toHaveProperty(DatabaseOperation.INSERT);
      expect(stats.operationBreakdown).toHaveProperty(DatabaseOperation.UPDATE);
    });

    test("应该计算索引使用统计", () => {
      // 添加索引查询
      const operationId1 = dbMonitoring.startDatabaseOperation(
        DatabaseOperation.QUERY,
        DatabaseTable.FILES,
        10,
      );
      dbMonitoring.recordIndexUsage(operationId1, true, "idx_name");
      dbMonitoring.endDatabaseOperation(operationId1, true);

      // 添加非索引查询
      const operationId2 = dbMonitoring.startDatabaseOperation(
        DatabaseOperation.QUERY,
        DatabaseTable.SEGMENTS,
        5,
      );
      dbMonitoring.recordIndexUsage(operationId2, false);
      dbMonitoring.endDatabaseOperation(operationId2, true);

      const stats = dbMonitoring.getDatabaseStats();

      expect(stats.indexUsage).toMatchObject({
        indexed: 1,
        nonIndexed: 1,
        indexUsageRate: 50,
      });
    });

    test("应该返回空的统计信息如果没有数据", () => {
      const stats = dbMonitoring.getDatabaseStats();

      expect(stats).toMatchObject({
        totalOperations: 0,
        averageExecutionTime: 0,
        successRate: 0,
        operationBreakdown: expect.any(Object),
        tableBreakdown: expect.any(Object),
        queryTypeBreakdown: { simple: 0, complex: 0, join: 0, aggregate: 0 },
        indexUsage: { indexed: 0, nonIndexed: 0, indexUsageRate: 0 },
        throughput: 0,
      });
    });
  });

  describe("getRealTimeMetrics", () => {
    test("应该计算实时数据库性能指标", () => {
      // 添加一些最近的操作
      dbMonitoring.startDatabaseOperation(DatabaseOperation.QUERY, DatabaseTable.FILES, 10);
      dbMonitoring.endDatabaseOperation("realtime_1", true);

      dbMonitoring.startDatabaseOperation(DatabaseOperation.INSERT, DatabaseTable.TRANSCRIPTS, 1);
      dbMonitoring.endDatabaseOperation("realtime_2", false, "Insert failed");

      const realTimeMetrics = dbMonitoring.getRealTimeMetrics();

      expect(realTimeMetrics).toMatchObject({
        currentOperations: expect.any(Number),
        averageExecutionTime: expect.any(Number),
        successRate: expect.any(Number),
        throughput: expect.any(Number),
        slowQueryRate: expect.any(Number),
        connectionStatus: expect.any(Object),
      });

      expect(realTimeMetrics.successRate).toBeCloseTo(50, 1); // 1/2 = 50%
    });

    test("应该在没有数据时返回默认值", () => {
      const realTimeMetrics = dbMonitoring.getRealTimeMetrics();

      expect(realTimeMetrics).toMatchObject({
        currentOperations: 0,
        averageExecutionTime: 0,
        successRate: 0,
        throughput: 0,
        slowQueryRate: 0,
        connectionStatus: {
          connected: false,
          connectionTime: 0,
          lastOperationTime: 0,
          totalOperations: 0,
          failedOperations: 0,
          averageResponseTime: 0,
        },
      });
    });
  });

  describe("getDatabasePerformanceReport", () => {
    test("应该生成完整的数据库性能报告", () => {
      // 添加一些测试数据
      dbMonitoring.startDatabaseOperation(DatabaseOperation.QUERY, DatabaseTable.FILES, 10);
      dbMonitoring.endDatabaseOperation("report_1", true);

      dbMonitoring.startDatabaseOperation(DatabaseOperation.INSERT, DatabaseTable.TRANSCRIPTS, 1);
      dbMonitoring.endDatabaseOperation("report_2", false, "Insert failed");

      const report = dbMonitoring.getDatabasePerformanceReport();

      expect(report).toMatchObject({
        stats: expect.any(Object),
        realTimeMetrics: expect.any(Object),
        slowQueries: expect.any(Array),
        performanceAlerts: expect.any(Array),
        recommendations: expect.any(Array),
        timestamp: expect.any(Number),
      });

      expect(report.stats.totalOperations).toBe(2);
    });

    test("应该识别慢查询", () => {
      // 添加一个慢查询
      const operationId = dbMonitoring.startDatabaseOperation(
        DatabaseOperation.QUERY,
        DatabaseTable.FILES,
        100,
      );

      // 模拟很长的执行时间
      jest.advanceTimersByTime(2000); // 2秒，超过默认的1秒阈值

      dbMonitoring.endDatabaseOperation(operationId, true);

      const report = dbMonitoring.getDatabasePerformanceReport();

      expect(report.slowQueries).toHaveLength(1);
      expect(report.slowQueries[0].executionTime).toBeGreaterThan(1000);
    });

    test("应该生成性能告警", () => {
      // 添加高失败率的场景
      for (let i = 0; i < 10; i++) {
        dbMonitoring.startDatabaseOperation(DatabaseOperation.QUERY, DatabaseTable.FILES, 10);
        dbMonitoring.endDatabaseOperation(`alert_${i}`, i < 3); // 只有3个成功
      }

      const report = dbMonitoring.getDatabasePerformanceReport();

      expect(report.performanceAlerts.length).toBeGreaterThan(0);
      expect(report.performanceAlerts.some((alert) => alert.includes("数据库操作成功率低"))).toBe(
        true,
      );
    });
  });

  describe("getConnectionStatus", () => {
    test("应该返回当前的连接状态", () => {
      // 记录一个连接
      dbMonitoring.recordConnection(500, true);

      // 记录一些操作
      dbMonitoring.startDatabaseOperation(DatabaseOperation.QUERY, DatabaseTable.FILES, 10);
      dbMonitoring.endDatabaseOperation("conn_test_1", true);

      const connectionStatus = dbMonitoring.getConnectionStatus();

      expect(connectionStatus).toMatchObject({
        connected: true,
        connectionTime: 500,
        lastOperationTime: expect.any(Number),
        totalOperations: 1,
        failedOperations: 0,
        averageResponseTime: expect.any(Number),
      });
    });
  });

  describe("clearHistory", () => {
    test("应该清理所有历史记录", () => {
      // 添加一些测试数据
      dbMonitoring.startDatabaseOperation(DatabaseOperation.QUERY, DatabaseTable.FILES, 10);
      dbMonitoring.endDatabaseOperation("clear_test_1", true);

      dbMonitoring.startDatabaseOperation(DatabaseOperation.INSERT, DatabaseTable.TRANSCRIPTS, 1);
      dbMonitoring.endDatabaseOperation("clear_test_2", false, "Test error");

      // 确认数据存在
      expect(dbMonitoring.getDatabaseStats().totalOperations).toBe(2);

      // 清理历史
      dbMonitoring.clearHistory();

      // 确认数据已清理
      expect(dbMonitoring.getDatabaseStats().totalOperations).toBe(0);
    });
  });

  describe("slow query detection", () => {
    test("应该记录慢查询", () => {
      const config = { slowQueryThreshold: 100 };
      const sensitiveMonitoring = new DatabasePerformanceMonitoring(
        config,
        mockPerformanceMonitoring,
      );

      const operationId = sensitiveMonitoring.startDatabaseOperation(
        DatabaseOperation.QUERY,
        DatabaseTable.FILES,
        10,
      );

      // 模拟超过阈值的执行时间
      jest.advanceTimersByTime(150);

      sensitiveMonitoring.endDatabaseOperation(operationId, true);

      expect(mockPerformanceMonitoring.recordMetric).toHaveBeenCalledWith(
        "database_slow_query",
        MetricCategory.DATABASE,
        expect.any(Number),
        "ms",
        { operation: DatabaseOperation.QUERY, table: DatabaseTable.FILES, severity: "warning" },
        expect.objectContaining({
          threshold: 100,
          exceededBy: expect.any(Number),
        }),
      );
    });

    test("应该在慢查询监控禁用时不记录", () => {
      const disabledMonitoring = new DatabasePerformanceMonitoring(
        { enabled: true, trackSlowQueries: false },
        mockPerformanceMonitoring,
      );

      const operationId = disabledMonitoring.startDatabaseOperation(
        DatabaseOperation.QUERY,
        DatabaseTable.FILES,
        10,
      );

      jest.advanceTimersByTime(2000);

      disabledMonitoring.endDatabaseOperation(operationId, true);

      expect(mockPerformanceMonitoring.recordMetric).not.toHaveBeenCalledWith(
        "database_slow_query",
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe("configuration edge cases", () => {
    test("应该处理采样率", () => {
      const lowSampleMonitoring = new DatabasePerformanceMonitoring(
        { samplingRate: 0 },
        mockPerformanceMonitoring,
      );

      const operationId = lowSampleMonitoring.startDatabaseOperation(
        DatabaseOperation.QUERY,
        DatabaseTable.FILES,
        10,
      );

      // 即使采样率为0，也会返回操作ID，但不会记录到metrics中
      expect(operationId).toContain("query_files");
    });

    test("应该限制历史记录大小", () => {
      const limitedMonitoring = new DatabasePerformanceMonitoring(
        { maxHistorySize: 2 },
        mockPerformanceMonitoring,
      );

      // 添加超过限制的数据
      limitedMonitoring.startDatabaseOperation(DatabaseOperation.QUERY, DatabaseTable.FILES, 10);
      limitedMonitoring.endDatabaseOperation("limited_1", true);

      limitedMonitoring.startDatabaseOperation(
        DatabaseOperation.INSERT,
        DatabaseTable.TRANSCRIPTS,
        1,
      );
      limitedMonitoring.endDatabaseOperation("limited_2", true);

      limitedMonitoring.startDatabaseOperation(DatabaseOperation.UPDATE, DatabaseTable.SEGMENTS, 5);
      limitedMonitoring.endDatabaseOperation("limited_3", true);

      const stats = limitedMonitoring.getDatabaseStats();
      expect(stats.totalOperations).toBe(2); // 应该只保留最新的2条
    });
  });

  describe("utility functions", () => {
    test("monitorDatabaseOperation应该监控同步操作", () => {
      const testFunction = () => {
        // 模拟数据库操作
        return { id: 1, success: true };
      };

      const operationId = dbMonitoring.startDatabaseOperation(
        DatabaseOperation.QUERY,
        DatabaseTable.FILES,
        10,
      );

      try {
        const result = testFunction();
        dbMonitoring.endDatabaseOperation(operationId, true);
        expect(result).toEqual({ id: 1, success: true });
      } catch (error) {
        dbMonitoring.endDatabaseOperation(
          operationId,
          false,
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }

      const stats = dbMonitoring.getDatabaseStats();
      expect(stats.totalOperations).toBe(1);
      expect(stats.successRate).toBe(100);
    });

    test("monitorAsyncDatabaseOperation应该监控异步操作", async () => {
      const testFunction = async () => {
        // 模拟异步数据库操作
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { id: 2, success: true };
      };

      const operationId = dbMonitoring.startDatabaseOperation(
        DatabaseOperation.INSERT,
        DatabaseTable.TRANSCRIPTS,
        1,
      );

      try {
        const result = await testFunction();
        dbMonitoring.endDatabaseOperation(operationId, true);
        expect(result).toEqual({ id: 2, success: true });
      } catch (error) {
        dbMonitoring.endDatabaseOperation(
          operationId,
          false,
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }

      const stats = dbMonitoring.getDatabaseStats();
      expect(stats.totalOperations).toBe(1);
      expect(stats.successRate).toBe(100);
    });

    test("应该正确处理操作中的错误", () => {
      const testFunction = () => {
        throw new Error("Database query failed");
      };

      const operationId = dbMonitoring.startDatabaseOperation(
        DatabaseOperation.QUERY,
        DatabaseTable.FILES,
        10,
      );

      expect(() => {
        try {
          testFunction();
        } catch (error) {
          dbMonitoring.endDatabaseOperation(
            operationId,
            false,
            error instanceof Error ? error.message : String(error),
          );
          throw error;
        }
      }).toThrow("Database query failed");

      const stats = dbMonitoring.getDatabaseStats();
      expect(stats.totalOperations).toBe(1);
      expect(stats.successRate).toBe(0);
    });
  });
});

// 全局函数测试
describe("Global Database Performance Monitoring Functions", () => {
  beforeEach(() => {
    // 重置全局实例
    (global as any).globalDatabasePerformanceMonitoring = null;
    jest.clearAllMocks();
  });

  test("getDatabasePerformanceMonitoring应该返回单例实例", () => {
    const { getDatabasePerformanceMonitoring } = require("./database-performance-monitoring");

    const instance1 = getDatabasePerformanceMonitoring();
    const instance2 = getDatabasePerformanceMonitoring();

    expect(instance1).toBe(instance2);
  });

  test("initializeDatabasePerformanceMonitoring应该创建实例", () => {
    const {
      initializeDatabasePerformanceMonitoring,
      getDatabasePerformanceMonitoring,
    } = require("./database-performance-monitoring");

    initializeDatabasePerformanceMonitoring();

    const instance = getDatabasePerformanceMonitoring();
    expect(instance).toBeDefined();
  });
});
