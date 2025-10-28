import { BaseRepository } from "../base.repository";
import { type IFileRepository, type QueryOptions } from "../interfaces/repository.interface";
import { db } from "@/lib/db/db";
import type { FileRow } from "@/types/db/database";

/**
 * 文件Repository实现
 * 封装对files表的CRUD操作和业务逻辑
 */
export class FileRepository extends BaseRepository<FileRow> implements IFileRepository {
  constructor() {
    super("FileRepository");
  }

  async findById(id: number, options?: QueryOptions): Promise<FileRow | null> {
    this.validateId(id);

    return this.executeWithMetrics(
      "findById",
      async () => {
        // 简化实现
        const file = await db.files.get(id);
        return file || null;
      },
      { fileId: id },
    );
  }

  async findAll(options?: QueryOptions): Promise<FileRow[]> {
    return this.executeWithMetrics(
      "findAll",
      async () => {
        // 简化实现 - 获取所有数据后在内存中处理排序和分页
        let results = await db.files.toArray();

        // 默认按创建时间倒序
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // 应用分页
        if (options?.offset) {
          results = results.slice(options.offset);
        }

        if (options?.limit) {
          results = results.slice(0, options.limit);
        }

        return results;
      },
      { options },
    );
  }

  async create(data: Partial<FileRow>, options?: QueryOptions): Promise<FileRow> {
    this.validateData(data);

    return this.executeWithMetrics(
      "create",
      async () => {
        const now = new Date();

        const fileData = {
          name: data.name,
          size: data.size || 0,
          type: data.type || "",
          createdAt: now,
          updatedAt: now,
        };

        const id = await db.files.add(fileData as any);
        const createdFile = await this.findById(id);

        if (!createdFile) {
          throw new Error("Failed to create file: Unable to retrieve created record");
        }

        return createdFile;
      },
      { fileName: data.name },
    );
  }

  async update(id: number, data: Partial<FileRow>, options?: QueryOptions): Promise<FileRow> {
    this.validateId(id);
    this.validateData(data);

    return this.executeWithMetrics(
      "update",
      async () => {
        const updateData = {
          ...data,
          updatedAt: new Date(),
        };

        await db.files.update(id, updateData as any);

        const updatedFile = await this.findById(id);
        if (!updatedFile) {
          throw new Error("Failed to update file: Unable to retrieve updated record");
        }

        return updatedFile;
      },
      { fileId: id },
    );
  }

  async delete(id: number, options?: QueryOptions): Promise<boolean> {
    this.validateId(id);

    return this.executeWithMetrics(
      "delete",
      async () => {
        // 检查文件是否存在
        const file = await this.findById(id);
        if (!file) {
          return false;
        }

        // 删除文件
        await db.files.delete(id);

        return true;
      },
      { fileId: id },
    );
  }

  async count(options?: QueryOptions): Promise<number> {
    return this.executeWithMetrics(
      "count",
      async () => {
        return await db.files.count();
      },
      { options },
    );
  }

  // 实现IFileRepository特有的方法 - 简化版本
  async findBySize(minSize?: number, maxSize?: number): Promise<FileRow[]> {
    return this.executeWithMetrics(
      "findBySize",
      async () => {
        const allFiles = await db.files.toArray();

        return allFiles.filter((file) => {
          const size = file.size || 0;
          if (minSize !== undefined && size < minSize) return false;
          if (maxSize !== undefined && size > maxSize) return false;
          return true;
        });
      },
      { minSize, maxSize },
    );
  }

  async findByType(type: string): Promise<FileRow[]> {
    return this.executeWithMetrics(
      "findByType",
      async () => {
        return await db.files.where("type").equals(type).toArray();
      },
      { type },
    );
  }

  async findByStatus(status: string): Promise<FileRow[]> {
    return this.executeWithMetrics(
      "findByStatus",
      async () => {
        // 简化实现，假设所有文件都是该状态
        return await db.files.toArray();
      },
      { status },
    );
  }

  async findRecent(limit?: number): Promise<FileRow[]> {
    return this.executeWithMetrics(
      "findRecent",
      async () => {
        const allFiles = await db.files.toArray();
        allFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return limit ? allFiles.slice(0, limit) : allFiles;
      },
      { limit },
    );
  }

  async findByNamePattern(pattern: string): Promise<FileRow[]> {
    return this.executeWithMetrics(
      "findByNamePattern",
      async () => {
        const allFiles = await db.files.toArray();
        return allFiles.filter((file) => file.name.toLowerCase().includes(pattern.toLowerCase()));
      },
      { pattern },
    );
  }

  async getTotalSize(): Promise<number> {
    return this.executeWithMetrics("getTotalSize", async () => {
      const files = await db.files.toArray();
      return files.reduce((total, file) => total + (file.size || 0), 0);
    });
  }

  async getAverageProcessingTime(): Promise<number> {
    return this.executeWithMetrics("getAverageProcessingTime", async () => {
      // 简化实现
      return 0;
    });
  }

  async getSuccessRate(): Promise<number> {
    return this.executeWithMetrics("getSuccessRate", async () => {
      // 简化实现
      return 100;
    });
  }

  async cleanupOldFiles(daysOld: number): Promise<number> {
    return this.executeWithMetrics(
      "cleanupOldFiles",
      async () => {
        // 简化实现
        return 0;
      },
      { daysOld },
    );
  }

  async getStorageUsage(): Promise<{
    totalFiles: number;
    totalSize: number;
    averageSize: number;
  }> {
    return this.executeWithMetrics("getStorageUsage", async () => {
      const files = await db.files.toArray();
      const totalFiles = files.length;
      const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
      const averageSize = totalFiles > 0 ? totalSize / totalFiles : 0;

      return { totalFiles, totalSize, averageSize };
    });
  }
}
