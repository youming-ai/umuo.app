/**
 * 统一的转录错误处理工具
 * 替代项目中分散的转录错误处理代码
 */

import { toast } from "sonner";
import { logError } from "./error-handler";

export interface TranscriptionErrorContext {
  fileId?: number;
  fileName?: string;
  language?: string;
  operation: "transcribe" | "postprocess" | "fetch";
}

/**
 * 统一的转录错误处理函数
 */
export function handleTranscriptionError(
  error: unknown,
  context: TranscriptionErrorContext,
): void {
  const errorMessage = error instanceof Error ? error.message : "未知错误";
  const { fileId, fileName, operation } = context;

  // 构建详细的错误消息
  const detailedMessage = buildDetailedErrorMessage(errorMessage, context);

  // 记录到错误监控系统
  const appError =
    error instanceof Error
      ? {
          code: "TRANSCRIPTION_ERROR",
          message: error.message,
          statusCode: 500,
          stack: error.stack,
        }
      : {
          code: "TRANSCRIPTION_ERROR",
          message: "未知错误",
          statusCode: 500,
          stack: undefined,
        };

  // 构建错误上下文字符串
  const contextString = `转录操作失败 - 文件ID: ${fileId || "未知"}, 操作: ${operation}, 错误: ${detailedMessage}`;

  logError(appError, contextString);

  // 显示用户友好的错误消息
  const userMessage = getUserFriendlyErrorMessage(errorMessage, operation);
  toast.error(userMessage);

  // 控制台输出（开发环境）
  if (process.env.NODE_ENV === "development") {
    console.error(
      `❌ ${operation === "transcribe" ? "转录" : operation === "postprocess" ? "后处理" : "获取"}失败:`,
      {
        error,
        context,
        detailedMessage,
      },
    );
  }
}

/**
 * 构建详细的错误消息
 */
function buildDetailedErrorMessage(
  baseMessage: string,
  context: TranscriptionErrorContext,
): string {
  const { fileId, fileName, operation } = context;
  const operationText =
    operation === "transcribe"
      ? "转录"
      : operation === "postprocess"
        ? "后处理"
        : "数据获取";

  let message = `${operationText}失败: ${baseMessage}`;

  if (fileId) {
    message += ` (文件ID: ${fileId})`;
  }

  if (fileName) {
    message += ` (文件名: ${fileName})`;
  }

  return message;
}

/**
 * 获取用户友好的错误消息
 */
function getUserFriendlyErrorMessage(
  baseMessage: string,
  operation: string,
): string {
  // 常见错误映射
  const commonErrors: Record<string, string> = {
    network: "网络连接失败，请检查网络连接后重试",
    timeout: "处理超时，请稍后重试",
    "file too large": "文件过大，请选择较小的音频文件",
    "invalid format": "音频格式不支持，请使用 MP3、WAV 或 M4A 格式",
    "quota exceeded": "API 配额已用完，请稍后重试",
    "rate limit": "请求过于频繁，请稍后重试",
    authentication: "认证失败，请检查配置",
    permission: "权限不足，请检查 API 密钥配置",
    fetch: "数据获取失败，请检查网络连接",
  };

  // 检查是否包含常见错误
  const lowerMessage = baseMessage.toLowerCase();
  for (const [key, friendlyMessage] of Object.entries(commonErrors)) {
    if (lowerMessage.includes(key)) {
      return friendlyMessage;
    }
  }

  // 根据操作类型返回默认消息
  const operationText =
    operation === "transcribe"
      ? "转录"
      : operation === "postprocess"
        ? "文本处理"
        : "数据处理";

  return `${operationText}失败: ${baseMessage}`;
}

/**
 * 转录成功处理
 */
export function handleTranscriptionSuccess(
  context: TranscriptionErrorContext & {
    duration?: number;
    textLength?: number;
  },
): void {
  const { fileId, fileName, operation, duration, textLength } = context;

  const operationText =
    operation === "transcribe"
      ? "转录"
      : operation === "postprocess"
        ? "后处理"
        : "处理";

  let successMessage = `${operationText}完成`;

  if (fileName) {
    successMessage += ` - ${fileName}`;
  }

  if (duration && textLength) {
    const wordsPerMinute = Math.round((textLength / duration) * 60);
    successMessage += ` (${wordsPerMinute} 字/分钟)`;
  }

  toast.success(successMessage);

  // 开发环境输出详细信息
  if (process.env.NODE_ENV === "development") {
    console.log(`✅ ${operationText}完成:`, {
      fileId,
      fileName,
      duration,
      textLength,
    });
  }
}

/**
 * 转录进度更新处理
 */
export function handleTranscriptionProgress(
  progress: number,
  context: TranscriptionErrorContext,
): void {
  // 开发环境输出进度信息
  if (process.env.NODE_ENV === "development") {
    const { fileId, fileName, operation } = context;
    const operationText =
      operation === "transcribe"
        ? "转录"
        : operation === "postprocess"
          ? "后处理"
          : "处理";

    console.log(`📊 ${operationText}进度: ${progress}%`, { fileId, fileName });
  }

  // 可以在这里添加其他进度处理逻辑，如更新进度条等
}
