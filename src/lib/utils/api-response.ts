import { NextResponse } from "next/server";
import {
  createError,
  handleError,
  internalError,
  notFoundError,
  validationError,
} from "@/lib/utils/error-handler";
import type { AppError } from "@/types/api/errors";

// 成功响应函数
export function apiSuccess(data: unknown, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        pragma: "no-cache",
        expires: "0",
      },
    },
  );
}

// 错误响应函数
export function apiError(error: AppError) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: error.statusCode,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        pragma: "no-cache",
        expires: "0",
      },
    },
  );
}

// 从未知错误创建响应
export function apiFromError(error: unknown, context?: string) {
  const appError = handleError(error, context);
  return apiError(appError);
}

// 常用的成功响应
export function apiCreated(data: unknown) {
  return apiSuccess(data, 201);
}

export function apiNoContent() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      pragma: "no-cache",
      expires: "0",
    },
  });
}

export function apiAccepted(data: unknown) {
  return apiSuccess(data, 202);
}

// 常用的错误响应
export function apiBadRequest(message: string, details?: Record<string, unknown>) {
  const error = validationError(message, details);
  return apiError(error);
}

export function apiNotFound(message: string, details?: Record<string, unknown>) {
  const error = notFoundError(message, details);
  return apiError(error);
}

export function apiInternalError(message: string, details?: Record<string, unknown>) {
  const error = internalError(message, details);
  return apiError(error);
}

export function apiUnauthorized(
  message: string = "Unauthorized",
  details?: Record<string, unknown>,
) {
  const error = createError("apiAuthError", message, details, 401);
  return apiError(error);
}

export function apiForbidden(message: string = "Forbidden", details?: Record<string, unknown>) {
  const error = createError("apiAuthError", message, details, 403);
  return apiError(error);
}

export function apiTooManyRequests(
  message: string = "Too many requests",
  details?: Record<string, unknown>,
) {
  const error = createError("apiRateLimit", message, details, 429);
  return apiError(error);
}

export function apiServiceUnavailable(
  message: string = "Service unavailable",
  details?: Record<string, unknown>,
) {
  const error = createError("serviceUnavailable", message, details, 503);
  return apiError(error);
}

// 为了向后兼容，保留函数别名
export const ApiResponse = {
  success: apiSuccess,
  error: apiError,
  fromError: apiFromError,
  created: apiCreated,
  noContent: apiNoContent,
  accepted: apiAccepted,
  badRequest: apiBadRequest,
  notFound: apiNotFound,
  internalError: apiInternalError,
  unauthorized: apiUnauthorized,
  forbidden: apiForbidden,
  tooManyRequests: apiTooManyRequests,
  serviceUnavailable: apiServiceUnavailable,
};
