/**
 * Cloudflare Workers 类型定义
 * 为 Edge Runtime 环境提供类型支持
 */

declare global {
  interface KVNamespace {
    get(key: string): Promise<string | null>;
    get(key: string, type: 'text'): Promise<string | null>;
    get(key: string, type: 'json'): Promise<any | null>;
    get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
    get(key: string, type: 'stream'): Promise<ReadableStream | null>;

    put(key: string, value: string): Promise<void>;
    put(key: string, value: string, options: { expiration?: number; expirationTtl?: number }): Promise<void>;
    put(key: string, value: ArrayBuffer): Promise<void>;
    put(key: string, value: ArrayBuffer, options: { expiration?: number; expirationTtl?: number }): Promise<void>;
    put(key: string, value: ReadableStream): Promise<void>;
    put(key: string, value: ReadableStream, options: { expiration?: number; expirationTtl?: number }): Promise<void>;

    delete(key: string): Promise<void>;

    list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
      keys: Array<{ name: string; expiration?: number; metadata?: any }>;
      list_complete: boolean;
      cursor?: string;
    }>;
  }

  interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
  }

  const EdgeRuntime: string;
}

export type { KVNamespace, ExecutionContext };