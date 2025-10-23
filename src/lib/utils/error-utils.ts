/**
 * 检查是否为API密钥相关错误
 */
export function isApiKeyError(error: unknown): boolean {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes("groq_api_key") ||
      errorMessage.includes("环境变量未设置") ||
      errorMessage.includes("api key") ||
      errorMessage.includes("authentication")
    );
  }
  return false;
}

/**
 * 获取用户友好的错误消息
 */
export function getFriendlyErrorMessage(error: unknown): string {
  if (isApiKeyError(error)) {
    return "请配置 GROQ_API_KEY 环境变量以使用转录功能";
  }

  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return "网络连接失败，请检查网络连接后重试";
    }

    if (errorMessage.includes("timeout")) {
      return "请求超时，请稍后重试";
    }

    if (errorMessage.includes("rate limit")) {
      return "请求过于频繁，请稍后重试";
    }

    if (errorMessage.includes("file size") || errorMessage.includes("文件大小")) {
      return "文件太大，请上传较小的音频文件";
    }

    return error.message;
  }

  return "未知错误，请重试";
}
