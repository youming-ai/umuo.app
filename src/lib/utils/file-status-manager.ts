/**
 * 统一的文件状态管理器
 * 消除 FileRow.status 和 TranscriptRow.status 的不一致问题
 * 以 TranscriptRow.status 为唯一真实数据源 (Single Source of Truth)
 */

import { db } from "@/lib/db/db";
import { FileStatus } from "@/types/db/database";

export type TranscriptStatus = "pending" | "processing" | "completed" | "failed";

/**
 * 文件状态映射器
 * 将 TranscriptRow.status 映射到 FileStatus
 */
export function mapTranscriptStatusToFileStatus(status: TranscriptStatus | undefined): FileStatus {
  switch (status) {
    case "processing":
      return FileStatus.TRANSCRIBING;
    case "completed":
      return FileStatus.COMPLETED;
    case "failed":
      return FileStatus.ERROR;
    case "pending":
    default:
      return FileStatus.UPLOADED;
  }
}

/**
 * 获取文件的真实状态
 * 始终基于 TranscriptRow.status，不依赖 FileRow.status
 */
export async function getFileRealStatus(fileId: number): Promise<{
  status: FileStatus;
  transcriptId?: number;
  transcript?: any;
}> {
  try {
    // 获取转录记录
    const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();
    const transcript = transcripts.length > 0 ? transcripts[0] : null;

    // 如果没有转录记录，状态为 UPLOADED
    if (!transcript) {
      return { status: FileStatus.UPLOADED };
    }

    // 返回基于转录记录的状态
    return {
      status: mapTranscriptStatusToFileStatus(transcript.status),
      transcriptId: transcript.id,
      transcript,
    };
  } catch (error) {
    console.error("获取文件真实状态失败:", error);
    // 出错时返回错误状态
    return { status: FileStatus.ERROR };
  }
}

/**
 * 更新转录状态（统一的更新入口）
 * 只更新 TranscriptRow，不更新 FileRow.status
 */
export async function updateTranscriptionStatus(
  fileId: number,
  status: TranscriptStatus,
  error?: string,
  additionalData?: Partial<any>,
): Promise<number | undefined> {
  try {
    return await db.transaction("rw", db.transcripts, async () => {
      // 查找现有转录记录
      const transcripts = await db.transcripts.where("fileId").equals(fileId).toArray();

      let transcriptId: number;

      if (transcripts.length > 0 && transcripts[0].id) {
        // 更新现有转录记录
        transcriptId = transcripts[0].id;
        await db.transcripts.update(transcriptId, {
          status,
          error: error || undefined,
          updatedAt: new Date(),
          ...additionalData,
        });
      } else {
        // 创建新的转录记录（仅在开始转录时）
        transcriptId = await db.transcripts.add({
          fileId,
          status,
          error: error || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...additionalData,
        });
      }

      return transcriptId;
    });
  } catch (error) {
    console.error("更新转录状态失败:", error);
    throw error;
  }
}

/**
 * 批量获取文件状态
 * 优化性能，减少数据库查询次数
 */
export async function getFilesStatus(fileIds: number[]): Promise<Map<number, FileStatus>> {
  try {
    // 批量查询转录记录
    const transcripts = await db.transcripts.where("fileId").anyOf(fileIds).toArray();

    const statusMap = new Map<number, FileStatus>();

    // 初始化所有文件为 UPLOADED 状态
    fileIds.forEach((fileId) => {
      statusMap.set(fileId, FileStatus.UPLOADED);
    });

    // 更新有转录记录的文件状态
    transcripts.forEach((transcript) => {
      if (transcript.fileId) {
        statusMap.set(transcript.fileId, mapTranscriptStatusToFileStatus(transcript.status));
      }
    });

    return statusMap;
  } catch (error) {
    console.error("批量获取文件状态失败:", error);
    // 出错时返回错误状态
    const errorMap = new Map<number, FileStatus>();
    fileIds.forEach((fileId) => {
      errorMap.set(fileId, FileStatus.ERROR);
    });
    return errorMap;
  }
}

/**
 * 清理过期的转录记录
 * 删除长时间处于 failed 状态的记录
 */
export async function cleanupFailedTranscriptions(olderThanDays: number = 7): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const failedTranscripts = await db.transcripts
      .where("status")
      .equals("failed")
      .and((transcript) => transcript.updatedAt < cutoffDate)
      .toArray();

    for (const transcript of failedTranscripts) {
      if (transcript.id) {
        // 删除相关的 segments
        await db.segments.where("transcriptId").equals(transcript.id).delete();
        // 删除转录记录
        await db.transcripts.delete(transcript.id);
      }
    }

    console.log(`清理了 ${failedTranscripts.length} 个过期的失败转录记录`);
  } catch (error) {
    console.error("清理过期转录记录失败:", error);
  }
}

/**
 * 状态验证器
 * 验证状态转换是否合法
 */
export function isValidStatusTransition(
  fromStatus: TranscriptStatus | undefined,
  toStatus: TranscriptStatus,
): boolean {
  // 允许的状态转换
  const validTransitions: Record<string, TranscriptStatus[]> = {
    undefined: ["pending", "processing"], // 初始状态
    pending: ["processing", "failed"],
    processing: ["completed", "failed"],
    completed: ["processing"], // 允许重新转录
    failed: ["pending", "processing"], // 允许重试
  };

  const from = fromStatus || undefined;
  return validTransitions[String(from)]?.includes(toStatus) ?? false;
}

/**
 * 安全的状态更新
 * 带状态验证的更新函数
 */
export async function safeUpdateTranscriptionStatus(
  fileId: number,
  toStatus: TranscriptStatus,
  error?: string,
  additionalData?: Partial<any>,
): Promise<number | undefined> {
  try {
    // 获取当前状态
    const currentStatusInfo = await getFileRealStatus(fileId);
    const currentStatus = currentStatusInfo.transcript?.status;

    // 验证状态转换
    if (!isValidStatusTransition(currentStatus, toStatus)) {
      console.warn(`无效的状态转换: ${currentStatus} -> ${toStatus} (文件ID: ${fileId})`);
      // 可以选择抛出错误或继续执行
    }

    // 执行更新
    return await updateTranscriptionStatus(fileId, toStatus, error, additionalData);
  } catch (error) {
    console.error("安全更新转录状态失败:", error);
    throw error;
  }
}
