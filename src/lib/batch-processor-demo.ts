import { addSegments } from "./db";
import {
  createSmartBatchProcessor,
  createDatabaseBatchProcessor,
  type ProgressCallback,
} from "./batch-processor";
import type { Segment } from "@/types/database";

/**
 * 演示批量处理功能的示例文件
 * 这个文件展示了如何使用优化后的批量处理功能
 */

/**
 * 示例1: 使用优化的 addSegments 函数
 */
export async function demoOptimizedSegmentsAdd() {
  // 创建大量的测试 segments
  const segments: Omit<Segment, "id" | "createdAt" | "updatedAt">[] = [];
  for (let i = 0; i < 500; i++) {
    segments.push({
      transcriptId: 1,
      start: i * 2,
      end: (i + 1) * 2,
      text: `测试片段 ${i}`,
      normalizedText: `测试片段 ${i}`,
      translation: `Test segment ${i}`,
    });
  }

  // 创建进度回调
  const onProgress: ProgressCallback = (progress) => {
    console.log(
      `进度: ${progress.processed}/${progress.total} (${progress.percentage.toFixed(1)}%)`,
    );
    console.log(`状态: ${progress.status}`);
    if (progress.message) {
      console.log(`消息: ${progress.message}`);
    }
    if (progress.error) {
      console.error(`错误: ${progress.error}`);
    }
  };

  try {
    console.log("开始批量添加 segments...");

    // 使用优化后的 addSegments 函数
    await addSegments(segments, {
      onProgress,
      batchSize: 100,
      enableProgressTracking: true,
    });

    console.log("批量添加完成！");
  } catch (error) {
    console.error("批量添加失败:", error);
  }
}

/**
 * 示例2: 使用智能批量处理器处理大量数据
 */
export async function demoSmartBatchProcessor() {
  // 创建大量测试数据
  const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
    id: i + 1,
    name: `项目 ${i}`,
    value: Math.random() * 100,
  }));

  // 创建处理函数
  const processItem = async (batch: typeof largeDataset) => {
    // 模拟异步处理
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 返回处理结果
    return batch.map((item) => ({
      ...item,
      processed: true,
      processedAt: new Date().toISOString(),
    }));
  };

  // 创建进度回调
  const onProgress: ProgressCallback = (progress) => {
    const percentage = progress.percentage.toFixed(1);
    const status = progress.status === "completed" ? "✅" : "🔄";
    console.log(`${status} 处理进度: ${percentage}% (${progress.processed}/${progress.total})`);

    if (progress.status === "retrying") {
      console.log(`⚠️ 重试: ${progress.message}`);
    }
  };

  try {
    console.log("开始智能批量处理大量数据...");

    // 创建智能批量处理器
    const processor = createSmartBatchProcessor(largeDataset, processItem, {
      maxRetries: 3,
      retryDelay: 1000,
    });

    processor.setProgressCallback(onProgress);

    // 执行批量处理
    const result = await processor.process(largeDataset, processItem);

    console.log("\n批量处理结果:");
    console.log(`- 成功: ${result.success}`);
    console.log(`- 处理项目: ${result.processedItems}/${result.totalItems}`);
    console.log(`- 错误数量: ${result.errors.length}`);
    console.log(`- 处理时间: ${(result.performance.duration / 1000).toFixed(2)}秒`);
    console.log(`- 平均批次时间: ${result.performance.averageBatchTime.toFixed(2)}ms`);
    console.log(`- 重试次数: ${result.performance.retryCount}`);

    if (result.errors.length > 0) {
      console.log("\n错误详情:");
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message}`);
      });
    }

    return result;
  } catch (error) {
    console.error("智能批量处理失败:", error);
    throw error;
  }
}

/**
 * 示例3: 使用数据库专用批量处理器
 */
export async function demoDatabaseBatchProcessor() {
  // 创建大量数据库记录
  const databaseRecords: Omit<Segment, "id" | "createdAt" | "updatedAt">[] = Array.from(
    { length: 1000 },
    (_, i) => ({
      transcriptId: 1,
      start: i * 1.5,
      end: (i + 1) * 1.5,
      text: `数据库记录 ${i}`,
      normalizedText: `数据库记录 ${i}`,
    }),
  );

  // 创建数据库操作函数
  const dbOperation = async (
    batch: Array<Omit<Segment, "updatedAt" | "id" | "createdAt"> & { id?: number }>,
  ) => {
    // 这里可以是任何数据库操作
    console.log(`处理批次: ${batch.length} 条记录`);

    // 模拟数据库延迟
    await new Promise((resolve) => setTimeout(resolve, 50));

    return batch.map((record, index) => ({
      ...record,
      id: Date.now() + index,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  };

  try {
    console.log("开始数据库批量处理...");

    // 创建数据库专用批量处理器
    const processor = createDatabaseBatchProcessor(dbOperation, {
      batchSize: 50, // 数据库操作使用更小的批次
      maxRetries: 2,
      enableProgressTracking: true,
    });

    // 设置进度回调
    processor.setProgressCallback((progress) => {
      console.log(`数据库操作: ${progress.percentage.toFixed(1)}%`);
      if (progress.currentBatch && progress.totalBatches) {
        console.log(`批次: ${progress.currentBatch}/${progress.totalBatches}`);
      }
    });

    // 执行批量处理
    const result = await processor.process(databaseRecords, dbOperation);

    console.log("\n数据库批量处理完成:");
    console.log(`- 成功: ${result.success}`);
    console.log(`- 处理记录: ${result.processedItems}`);
    console.log(`- 性能指标: ${result.performance.duration.toFixed(2)}ms`);

    return result;
  } catch (error) {
    console.error("数据库批量处理失败:", error);
    throw error;
  }
}

/**
 * 示例4: 处理错误和重试
 */
export async function demoErrorHandling() {
  // 创建一些会失败的数据
  const testItems = [1, 2, 3, 4, 5];

  // 创建一个会偶尔失败的处理函数
  const flakyProcessor = async (batch: number[]) => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 第3个项目会失败
    if (batch.includes(3)) {
      throw new Error("处理项目3时发生错误");
    }

    return batch.map((item) => `结果_${item}`);
  };

  const onProgress: ProgressCallback = (progress) => {
    if (progress.status === "retrying") {
      console.log(`🔄 重试: ${progress.message}`);
    } else if (progress.status === "failed") {
      console.log(`❌ 失败: ${progress.error}`);
    } else {
      console.log(`✅ ${progress.status}: ${progress.percentage.toFixed(1)}%`);
    }
  };

  try {
    console.log("演示错误处理和重试机制...");

    const processor = createSmartBatchProcessor(testItems, flakyProcessor, {
      maxRetries: 3,
      retryDelay: 500,
    });

    processor.setProgressCallback(onProgress);

    const result = await processor.process(testItems, flakyProcessor);

    console.log("\n错误处理结果:");
    console.log(`- 成功: ${result.success}`);
    console.log(`- 错误数量: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log("错误信息:");
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.code}: ${error.message}`);
      });
    }

    return result;
  } catch (error) {
    console.error("错误处理演示失败:", error);
    throw error;
  }
}

/**
 * 运行所有演示
 */
export async function runAllDemos() {
  console.log("🚀 开始批量处理功能演示\n");

  try {
    // 演示1: 优化的 addSegments
    console.log("=== 演示1: 优化的 addSegments ===");
    await demoOptimizedSegmentsAdd();
    console.log("");

    // 演示2: 智能批量处理器
    console.log("=== 演示2: 智能批量处理器 ===");
    await demoSmartBatchProcessor();
    console.log("");

    // 演示3: 数据库批量处理器
    console.log("=== 演示3: 数据库批量处理器 ===");
    await demoDatabaseBatchProcessor();
    console.log("");

    // 演示4: 错误处理
    console.log("=== 演示4: 错误处理和重试 ===");
    await demoErrorHandling();
    console.log("");

    console.log("🎉 所有演示完成！");
  } catch (error) {
    console.error("演示过程中发生错误:", error);
  }
}

// 如果直接运行此文件，执行所有演示
if (require.main === module) {
  runAllDemos().catch(console.error);
}
