import type { FileRow } from "@/types/db/database";
import { URLManager } from "../config/url-manager";
import { DbUtils } from "../db/db";
import { type ValidationResult, validateFileWithSecurity } from "../utils/file-validation";
import {
  CHUNK_SIZE,
  calculateChunkCount,
  createFileChunks,
  formatFileSize,
  needsChunking,
  validateFileSize,
} from "./file-chunk";

export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<number> {
  try {
    console.log(`开始文件上传: ${file.name} (${formatFileSize(file.size)})`);

    // 使用增强的文件验证
    const validationResult = await validateFileWithSecurity(file);

    // 记录验证结果
    console.log("文件验证结果:", {
      isValid: validationResult.isValid,
      fileType: validationResult.fileType,
      securityScore: validationResult.securityScore,
      errors: validationResult.errors.length,
      warnings: validationResult.warnings.length,
    });

    // 如果验证失败，抛出详细错误
    if (!validationResult.isValid) {
      const errorMessages = validationResult.errors
        .map((error) => `${error.code}: ${error.message}`)
        .join("; ");
      throw new Error(`文件验证失败: ${errorMessages}`);
    }

    // 如果有警告，记录到控制台
    if (validationResult.warnings.length > 0) {
      console.warn("文件验证警告:", validationResult.warnings);
    }

    // 显示验证信息
    if (validationResult.info.length > 0) {
      validationResult.info.forEach((info) => {
        console.log(`验证信息: ${info.message}`);
      });
    }

    // 基本文件大小验证（兼容性）
    const sizeValidation = validateFileSize(file.size);
    if (!sizeValidation.isValid) {
      throw new Error(sizeValidation.error);
    }

    const shouldChunk = needsChunking(file.size);
    const totalChunks = shouldChunk ? calculateChunkCount(file.size) : 1;

    console.log(`文件上传参数: 分块=${shouldChunk}, 总分块数=${totalChunks}`);

    let fileId: number;

    if (shouldChunk) {
      // 分块存储大文件
      fileId = await uploadChunkedFile(file, totalChunks, onProgress);
    } else {
      // 直接存储小文件
      fileId = await uploadRegularFile(file);
      onProgress?.(100);
    }

    return fileId;
  } catch (error) {
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * 上传普通文件（非分块）
 */
async function uploadRegularFile(file: File): Promise<number> {
  const blob = new Blob([file], { type: file.type });

  const fileRow: Omit<FileRow, "id" | "createdAt" | "updatedAt"> = {
    name: file.name,
    size: file.size,
    type: file.type,
    blob: blob,
    isChunked: false,
  };

  return await DbUtils.addFile(fileRow);
}

/**
 * 上传分块文件
 */
async function uploadChunkedFile(
  file: File,
  totalChunks: number,
  onProgress?: (progress: number) => void,
): Promise<number> {
  return await DbUtils.withTransaction(async () => {
    // 创建文件记录（不包含 blob）
    const fileRow: Omit<FileRow, "id" | "createdAt" | "updatedAt"> = {
      name: file.name,
      size: file.size,
      type: file.type,
      isChunked: true,
      chunkSize: CHUNK_SIZE,
      totalChunks,
    };

    const fileId = await DbUtils.addFile(fileRow);
    let processedChunks = 0;

    // 上传分块
    for (const chunk of createFileChunks(file, CHUNK_SIZE)) {
      await DbUtils.addFileChunk({
        fileId,
        chunkIndex: chunk.index,
        chunkSize: chunk.data.size,
        offset: chunk.offset,
        data: chunk.data,
      });

      processedChunks++;
      const progress = (processedChunks / totalChunks) * 100;
      onProgress?.(progress);
    }

    return fileId;
  });
}

export async function getFileBlob(fileId: number): Promise<Blob> {
  const file = await DbUtils.getFile(fileId);
  if (!file) {
    throw new Error("File not found");
  }

  // 如果是分块存储的文件，需要重组分块
  if (file.isChunked) {
    return await reassembleFileChunks(fileId, file.type);
  }

  // 直接存储的文件
  if (!file.blob) {
    throw new Error("File blob not found");
  }

  return file.blob;
}

/**
 * 重组文件分块
 */
async function reassembleFileChunks(fileId: number, mimeType: string): Promise<Blob> {
  const chunks = await DbUtils.getFileChunks(fileId);

  if (chunks.length === 0) {
    throw new Error("No chunks found for file");
  }

  // 按分块索引排序
  chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

  // 验证分块完整性
  const expectedChunks = await DbUtils.getFileChunksCount(fileId);
  if (chunks.length !== expectedChunks) {
    throw new Error(`Incomplete file: ${chunks.length}/${expectedChunks} chunks found`);
  }

  // 创建所有分块的 Blob 数组
  const chunkBlobs = chunks.map((chunk) => chunk.data);

  // 重组为完整的 Blob
  return new Blob(chunkBlobs, { type: mimeType });
}

export async function getFileUrl(fileId: number): Promise<string> {
  const blob = await getFileBlob(fileId);
  // 使用临时URL，5分钟后自动清理
  return URLManager.createTemporaryURL(blob, 5 * 60 * 1000);
}

export async function getAllFiles() {
  return await DbUtils.getAllFiles();
}

export async function deleteFile(fileId: number): Promise<void> {
  try {
    const file = await DbUtils.getFile(fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // Use the new transactional delete method
    await DbUtils.deleteFileWithDependencies(fileId);
  } catch (error) {
    throw new Error(`Deletion failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function updateFileMetadata(
  fileId: number,
  updates: Partial<Pick<FileRow, "name" | "duration">>,
): Promise<void> {
  await DbUtils.updateFile(fileId, updates);
}

export async function getFileInfo(fileId: number) {
  const file = await DbUtils.getFile(fileId);
  if (!file) {
    throw new Error("File not found");
  }

  const transcripts = await DbUtils.getTranscriptsByFileId(fileId);

  return {
    ...file,
    transcripts,
    transcriptCount: transcripts.length,
    hasCompletedTranscript: transcripts.some((t) => t.status === "completed"),
  };
}

/**
 * 文件验证函数（增强版）
 * 提供详细的文件验证和安全检查
 */
export async function validateFile(file: File): Promise<{
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  securityScore?: number;
  fileType?: string;
}> {
  const result = await validateFileWithSecurity(file);

  return {
    isValid: result.isValid,
    errors: result.errors.map((error) => error.message),
    warnings: result.warnings.map((warning) => warning.message),
    securityScore: result.securityScore,
    fileType: result.fileType,
  };
}

/**
 * 获取详细的文件验证报告
 */
export async function getDetailedValidationReport(file: File): Promise<ValidationResult> {
  return await validateFileWithSecurity(file);
}

export async function getStorageUsage(): Promise<{
  totalFiles: number;
  totalSize: number;
  averageFileSize: number;
  chunkedFiles: number;
  regularFiles: number;
  usagePercentage: number;
}> {
  const stats = await DbUtils.getStorageStats();
  const files = await DbUtils.getAllFiles();

  return {
    totalFiles: files.length,
    totalSize: stats.totalSize,
    averageFileSize: files.length > 0 ? stats.totalSize / files.length : 0,
    chunkedFiles: stats.chunkedFiles,
    regularFiles: stats.regularFiles,
    usagePercentage: stats.usagePercentage,
  };
}

// 为了向后兼容，保留类作为函数的包装器
export const FileUploadUtils = {
  uploadFile,
  getFileBlob,
  getFileUrl,
  getAllFiles,
  deleteFile,
  updateFileMetadata,
  getFileInfo,
  validateFile,
  getDetailedValidationReport,
  getStorageUsage,
};
