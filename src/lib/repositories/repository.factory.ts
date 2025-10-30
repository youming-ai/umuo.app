import { FileRepository } from "./implementations/file.repository";
import { SegmentRepository } from "./implementations/segment.repository";
import { TranscriptRepository } from "./implementations/transcript.repository";
import type {
  IFileRepository,
  ISegmentRepository,
  ITranscriptRepository,
} from "./interfaces/repository.interface";

/**
 * Repository工厂类
 * 负责创建和管理所有Repository实例
 */
export class RepositoryFactory {
  private static instance: RepositoryFactory;

  private readonly fileRepository: FileRepository;
  private readonly transcriptRepository: TranscriptRepository;
  private readonly segmentRepository: SegmentRepository;

  private constructor() {
    this.fileRepository = new FileRepository();
    this.transcriptRepository = new TranscriptRepository();
    this.segmentRepository = new SegmentRepository();
  }

  /**
   * 获取工厂单例
   */
  public static getInstance(): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory();
    }
    return RepositoryFactory.instance;
  }

  /**
   * 获取文件Repository
   */
  public getFileRepository(): IFileRepository {
    return this.fileRepository;
  }

  /**
   * 获取转录Repository
   */
  public getTranscriptRepository(): ITranscriptRepository {
    return this.transcriptRepository;
  }

  /**
   * 获取片段Repository
   */
  public getSegmentRepository(): ISegmentRepository {
    return this.segmentRepository;
  }

  /**
   * 清理所有缓存
   */
  public clearAllCaches(): void {
    this.fileRepository.clearCache();
    this.transcriptRepository.clearCache();
    this.segmentRepository.clearCache();
  }

  /**
   * 获取缓存统计信息
   */
  public getCacheStats(): {
    files: any;
    transcripts: any;
    segments: any;
  } {
    return {
      files: this.fileRepository.getCacheStats(),
      transcripts: this.transcriptRepository.getCacheStats(),
      segments: this.segmentRepository.getCacheStats(),
    };
  }

  /**
   * 执行数据库维护操作
   */
  public async performMaintenance(): Promise<{
    cleanedOrphanedFiles: number;
    cleanedOrphanedTranscripts: number;
    cleanedOrphanedSegments: number;
  }> {
    const [cleanedOrphanedFiles, cleanedOrphanedTranscripts, cleanedOrphanedSegments] =
      await Promise.all([
        this.fileRepository.cleanupOldFiles(90),
        Promise.resolve(0), // 简化的转录清理
        Promise.resolve(0), // 简化的片段清理
      ]);

    this.clearAllCaches();

    return {
      cleanedOrphanedFiles,
      cleanedOrphanedTranscripts,
      cleanedOrphanedSegments,
    };
  }

  /**
   * 获取完整的数据库统计信息
   */
  public async getDatabaseStats(): Promise<{
    files: any;
    transcripts: any;
    segments: any;
    storage: any;
  }> {
    const [fileStats, transcriptStats, segmentStats] = await Promise.all([
      this.fileRepository.getStorageUsage(),
      Promise.resolve({ total: 0, byStatus: {}, averageProcessingTime: 0 }), // 简化的转录统计
      Promise.resolve({
        total: 0,
        averageDuration: 0,
        totalDuration: 0,
        wordCount: 0,
      }), // 简化的片段统计
    ]);

    return {
      files: fileStats,
      transcripts: transcriptStats,
      segments: segmentStats,
      storage: {
        totalFiles: fileStats.totalFiles,
        totalSize: fileStats.totalSize,
        totalTranscripts: transcriptStats.total,
        totalSegments: segmentStats.total,
      },
    };
  }

  /**
   * 重置工厂实例（主要用于测试）
   */
  public static resetInstance(): void {
    RepositoryFactory.instance = null as any;
  }
}

/**
 * 便捷函数：获取Repository工厂实例
 */
export function getRepositoryFactory(): RepositoryFactory {
  return RepositoryFactory.getInstance();
}

/**
 * 便捷函数：获取文件Repository
 */
export function getFileRepository(): IFileRepository {
  return getRepositoryFactory().getFileRepository();
}

/**
 * 便捷函数：获取转录Repository
 */
export function getTranscriptRepository(): ITranscriptRepository {
  return getRepositoryFactory().getTranscriptRepository();
}

/**
 * 便捷函数：获取片段Repository
 */
export function getSegmentRepository(): ISegmentRepository {
  return getRepositoryFactory().getSegmentRepository();
}
