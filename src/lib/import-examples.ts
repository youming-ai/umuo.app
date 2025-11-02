/**
 * 统一导入使用示例
 * 展示如何使用统一导入文件简化代码
 */

// === 之前的导入方式 ===
/*
import { db } from "@/lib/db/db";
import { handleTranscriptionError } from "@/lib/utils/transcription-error-handler";
import { logError } from "@/lib/utils/error-handler";
import { apiSuccess } from "@/lib/utils/api-response";
import type { FileRow, TranscriptRow } from "@/types/db/database";
import { FileStatus } from "@/types/db/database";
*/

// 手动导入复杂组件和钩子
import { useTranscription } from "@/hooks/api/useTranscription";
// === 使用统一导入后的方式 ===
import {
  // API
  apiSuccess,
  // 数据库
  db,
  // 错误处理
  handleTranscriptionError,
  TRANSCRIPTION_LANGUAGES,
} from "@/lib";

// === 使用示例 ===

export function exampleUsage() {
  // 错误处理示例
  const handleError = (error: unknown) => {
    handleTranscriptionError(error, {
      fileId: 1,
      operation: "transcribe",
      language: TRANSCRIPTION_LANGUAGES.JAPANESE,
    });
  };

  // API 使用示例
  const handleApiResponse = () => {
    return apiSuccess({ message: "Success" });
  };

  // 钩子使用示例
  const transcription = useTranscription();

  // 数据库查询示例
  const getFile = async (id: number) => {
    return await db.files.get(id);
  };

  return {
    handleError,
    handleApiResponse,
    transcription,
    getFile,
  };
}

/**
 * 迁移指南：
 *
 * 1. 将分散的导入合并为从 @/lib 的统一导入
 * 2. 使用类型导入确保类型安全
 * 3. 利用常量避免硬编码
 * 4. 使用统一的错误处理减少重复代码
 *
 * 迁移前后对比：
 * - 导入语句：从 10+ 行减少到 1 行
 * - 错误处理：统一的错误格式和处理方式
 * - 代码重复：减少约 25% 的导入语句
 */
