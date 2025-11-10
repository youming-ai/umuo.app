/**
 * Server Integration for Chunked Upload System
 *
 * This module provides utilities for integrating with server-side chunk upload endpoints,
 * including chunk upload, verification, and assembly operations.
 */

import type {
  ChunkInfo,
  ChunkUploadResponse,
  UploadSession,
  UploadConfig,
} from '@/types/upload';

/**
 * Server API client for chunk upload operations
 */
export class ChunkUploadServerClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(options: {
    baseUrl: string;
    headers?: Record<string, string>;
  }) {
    this.baseUrl = options.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  }

  /**
   * Initialize a new upload session on the server
   */
  async initializeUploadSession(file: File, config: UploadConfig): Promise<UploadSession> {
    const response = await fetch(`${this.baseUrl}/upload/initialize`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        chunkSize: config.chunkSize,
        totalChunks: Math.ceil(file.size / config.chunkSize),
        metadata: {
          lastModified: file.lastModified,
          uploadedAt: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize upload session: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Upload a chunk to the server
   */
  async uploadChunk(
    session: UploadSession,
    chunk: ChunkInfo,
    chunkData: Blob
  ): Promise<ChunkUploadResponse> {
    const formData = new FormData();

    formData.append('sessionId', session.id);
    formData.append('fileId', session.fileId);
    formData.append('chunkId', chunk.id);
    formData.append('chunkIndex', chunk.index.toString());
    formData.append('chunkStart', chunk.start.toString());
    formData.append('chunkEnd', chunk.end.toString());
    formData.append('totalChunks', session.totalChunks.toString());
    formData.append('fileName', session.fileName);
    formData.append('fileSize', session.fileSize.toString());
    formData.append('fileType', session.fileType);
    formData.append('chunk', chunkData);

    // Add hash if verification is enabled
    if (chunk.hash) {
      formData.append('chunkHash', chunk.hash);
    }

    const response = await fetch(`${this.baseUrl}/upload/chunk`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(session.config.networkTimeout),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Chunk upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Verify a chunk upload
   */
  async verifyChunk(
    sessionId: string,
    chunkId: string,
    expectedHash?: string
  ): Promise<{ valid: boolean; actualHash?: string }> {
    const response = await fetch(`${this.baseUrl}/upload/verify`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        sessionId,
        chunkId,
        expectedHash,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chunk verification failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Complete the upload by assembling all chunks
   */
  async completeUpload(session: UploadSession): Promise<{ fileId: string; url: string }> {
    const response = await fetch(`${this.baseUrl}/upload/complete`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        sessionId: session.id,
        fileId: session.fileId,
        fileName: session.fileName,
        fileSize: session.fileSize,
        totalChunks: session.totalChunks,
        metadata: session.metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`Upload completion failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Cancel an upload session
   */
  async cancelUpload(sessionId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/upload/cancel`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      throw new Error(`Upload cancellation failed: ${response.statusText}`);
    }
  }

  /**
   * Get upload session status
   */
  async getUploadStatus(sessionId: string): Promise<{
    status: 'preparing' | 'uploading' | 'completed' | 'failed' | 'cancelled';
    uploadedChunks: number;
    totalChunks: number;
    uploadedSize: number;
    totalSize: number;
  }> {
    const response = await fetch(`${this.baseUrl}/upload/status/${sessionId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get upload status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Resume an interrupted upload session
   */
  async resumeUpload(sessionId: string): Promise<{
    sessionId: string;
    completedChunks: string[];
    missingChunks: string[];
  }> {
    const response = await fetch(`${this.baseUrl}/upload/resume`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      throw new Error(`Upload resume failed: ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Mock server implementation for development and testing
 */
export class MockChunkUploadServer {
  private sessions: Map<string, any> = new Map();
  private chunks: Map<string, Blob> = new Map();

  /**
   * Initialize a mock upload session
   */
  async initializeUploadSession(file: File, config: UploadConfig): Promise<UploadSession> {
    const sessionId = `mock_session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const fileId = `mock_file_${Date.now()}`;

    const session: UploadSession = {
      id: sessionId,
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      totalChunks: Math.ceil(file.size / config.chunkSize),
      uploadedChunks: 0,
      uploadedSize: 0,
      status: 'preparing',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      chunks: new Map(),
      metadata: {
        lastModified: file.lastModified,
        uploadedAt: new Date().toISOString(),
      },
      config,
    };

    this.sessions.set(sessionId, session);

    // Simulate network delay
    await this.simulateNetworkDelay(100, 300);

    return session;
  }

  /**
   * Mock chunk upload
   */
  async uploadChunk(
    session: UploadSession,
    chunk: ChunkInfo,
    chunkData: Blob
  ): Promise<ChunkUploadResponse> {
    // Simulate upload time based on chunk size
    const uploadTime = Math.max(200, chunk.size / 10000); // Simulate upload speed
    await this.simulateNetworkDelay(uploadTime * 0.5, uploadTime * 1.5);

    // Simulate random failures (10% chance)
    if (Math.random() < 0.1) {
      return {
        success: false,
        chunkId: chunk.id,
        error: 'Simulated network error',
        retryable: true,
      };
    }

    // Store chunk data
    const chunkKey = `${session.id}_${chunk.id}`;
    this.chunks.set(chunkKey, chunkData);

    // Update session
    const updatedSession = this.sessions.get(session.id);
    if (updatedSession) {
      updatedSession.uploadedChunks++;
      updatedSession.uploadedSize += chunk.size;
      updatedSession.updatedAt = Date.now();
      updatedSession.status = 'uploading';
    }

    return {
      success: true,
      chunkId: chunk.id,
    };
  }

  /**
   * Mock chunk verification
   */
  async verifyChunk(
    sessionId: string,
    chunkId: string,
    expectedHash?: string
  ): Promise<{ valid: boolean; actualHash?: string }> {
    await this.simulateNetworkDelay(50, 150);

    const chunkKey = `${sessionId}_${chunkId}`;
    const chunkData = this.chunks.get(chunkKey);

    if (!chunkData) {
      return { valid: false };
    }

    // For mock purposes, just return true
    // In a real implementation, you'd calculate and compare hashes
    return { valid: true };
  }

  /**
   * Mock upload completion
   */
  async completeUpload(session: UploadSession): Promise<{ fileId: string; url: string }> {
    await this.simulateNetworkDelay(500, 1500);

    // Update session status
    const updatedSession = this.sessions.get(session.id);
    if (updatedSession) {
      updatedSession.status = 'completed';
      updatedSession.completedAt = Date.now();
    }

    return {
      fileId: session.fileId,
      url: `/api/files/${session.fileId}`,
    };
  }

  /**
   * Mock upload cancellation
   */
  async cancelUpload(sessionId: string): Promise<void> {
    await this.simulateNetworkDelay(100, 300);

    // Clean up session data
    this.sessions.delete(sessionId);

    // Clean up chunk data
    for (const [key] of this.chunks.entries()) {
      if (key.startsWith(`${sessionId}_`)) {
        this.chunks.delete(key);
      }
    }
  }

  /**
   * Mock status check
   */
  async getUploadStatus(sessionId: string): Promise<{
    status: 'preparing' | 'uploading' | 'completed' | 'failed' | 'cancelled';
    uploadedChunks: number;
    totalChunks: number;
    uploadedSize: number;
    totalSize: number;
  }> {
    await this.simulateNetworkDelay(50, 200);

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    return {
      status: session.status,
      uploadedChunks: session.uploadedChunks,
      totalChunks: session.totalChunks,
      uploadedSize: session.uploadedSize,
      totalSize: session.fileSize,
    };
  }

  /**
   * Mock upload resume
   */
  async resumeUpload(sessionId: string): Promise<{
    sessionId: string;
    completedChunks: string[];
    missingChunks: string[];
  }> {
    await this.simulateNetworkDelay(200, 500);

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Find existing chunks
    const completedChunks: string[] = [];
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkId = this.generateChunkId(session.id, i);
      const chunkKey = `${session.id}_${chunkId}`;
      if (this.chunks.has(chunkKey)) {
        completedChunks.push(chunkId);
      }
    }

    // Generate missing chunk IDs
    const missingChunks: string[] = [];
    for (let i = 0; i < session.totalChunks; i++) {
      const chunkId = this.generateChunkId(session.id, i);
      if (!completedChunks.includes(chunkId)) {
        missingChunks.push(chunkId);
      }
    }

    return {
      sessionId,
      completedChunks,
      missingChunks,
    };
  }

  /**
   * Get mock server statistics
   */
  getServerStats(): {
    activeSessions: number;
    totalChunks: number;
    storageUsed: number;
  } {
    const activeSessions = Array.from(this.sessions.values())
      .filter(session => ['preparing', 'uploading'].includes(session.status))
      .length;

    const totalChunks = this.chunks.size;

    let storageUsed = 0;
    for (const chunk of this.chunks.values()) {
      storageUsed += chunk.size;
    }

    return {
      activeSessions,
      totalChunks,
      storageUsed,
    };
  }

  /**
   * Clean up old mock data
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    // Clean up old sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.createdAt > maxAge) {
        this.sessions.delete(sessionId);

        // Clean up associated chunks
        for (const [key] of this.chunks.entries()) {
          if (key.startsWith(`${sessionId}_`)) {
            this.chunks.delete(key);
          }
        }
      }
    }
  }

  // Private helper methods

  private generateChunkId(sessionId: string, index: number): string {
    return `${sessionId}_chunk_${index}`;
  }

  private async simulateNetworkDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

/**
 * Factory function to create appropriate server client
 */
export function createUploadServerClient(options: {
  baseUrl: string;
  useMock?: boolean;
  headers?: Record<string, string>;
}): ChunkUploadServerClient | MockChunkUploadServer {
  if (options.useMock) {
    return new MockChunkUploadServer();
  }

  return new ChunkUploadServerClient({
    baseUrl: options.baseUrl,
    headers: options.headers,
  });
}

/**
 * Integration utilities for Next.js API routes
 */
export class NextJSUploadIntegration {
  /**
   * Create API route handler for chunk upload initialization
   */
  static createInitializeHandler() {
    return async (req: Request) => {
      if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      try {
        const body = await req.json();

        // Validate input
        const { fileName, fileSize, fileType, chunkSize, totalChunks, metadata } = body;

        if (!fileName || !fileSize || !fileType || !chunkSize || !totalChunks) {
          return new Response('Missing required fields', { status: 400 });
        }

        // Generate session ID and file ID
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2)}`;

        // Store session data (you'd use a database in production)
        const sessionData = {
          sessionId,
          fileId,
          fileName,
          fileSize,
          fileType,
          chunkSize,
          totalChunks,
          metadata,
          createdAt: new Date().toISOString(),
        };

        // In production, save to database
        // await db.sessions.create(sessionData);

        return Response.json(sessionData);
      } catch (error) {
        console.error('Upload initialization error:', error);
        return new Response('Internal server error', { status: 500 });
      }
    };
  }

  /**
   * Create API route handler for chunk upload
   */
  static createChunkHandler() {
    return async (req: Request) => {
      if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      try {
        const formData = await req.formData();

        // Extract form fields
        const sessionId = formData.get('sessionId') as string;
        const fileId = formData.get('fileId') as string;
        const chunkId = formData.get('chunkId') as string;
        const chunkIndex = parseInt(formData.get('chunkIndex') as string);
        const chunkStart = parseInt(formData.get('chunkStart') as string);
        const chunkEnd = parseInt(formData.get('chunkEnd') as string);
        const totalChunks = parseInt(formData.get('totalChunks') as string);
        const chunk = formData.get('chunk') as Blob;
        const chunkHash = formData.get('chunkHash') as string;

        // Validate inputs
        if (!sessionId || !fileId || !chunkId || !chunk) {
          return new Response('Missing required fields', { status: 400 });
        }

        // Verify chunk size matches expected range
        const expectedSize = chunkEnd - chunkStart;
        if (chunk.size !== expectedSize) {
          return new Response('Chunk size mismatch', { status: 400 });
        }

        // Store chunk data (you'd use cloud storage in production)
        // await storage.storeChunk(sessionId, chunkId, chunk);

        // Verify hash if provided
        if (chunkHash) {
          const actualHash = await this.calculateChunkHash(chunk);
          if (actualHash !== chunkHash) {
            return new Response('Chunk hash mismatch', { status: 400 });
          }
        }

        // Update session progress
        // await db.sessions.updateProgress(sessionId, chunkIndex);

        return Response.json({
          success: true,
          chunkId,
        });
      } catch (error) {
        console.error('Chunk upload error:', error);
        return new Response('Internal server error', { status: 500 });
      }
    };
  }

  /**
   * Create API route handler for upload completion
   */
  static createCompleteHandler() {
    return async (req: Request) => {
      if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      try {
        const body = await req.json();
        const { sessionId, fileId, fileName, fileSize, totalChunks, metadata } = body;

        // Validate all chunks are uploaded
        // const uploadedChunks = await db.sessions.getUploadedChunks(sessionId);
        // if (uploadedChunks.length !== totalChunks) {
        //   return new Response('Not all chunks uploaded', { status: 400 });
        // }

        // Assemble file from chunks
        // const finalFile = await storage.assembleFile(sessionId, totalChunks);

        // Store final file
        // const storedFile = await db.files.create({
        //   id: fileId,
        //   name: fileName,
        //   size: fileSize,
        //   url: finalFile.url,
        //   metadata,
        // });

        // Clean up session and chunks
        // await db.sessions.delete(sessionId);
        // await storage.cleanupChunks(sessionId);

        return Response.json({
          fileId,
          url: `/api/files/${fileId}`,
        });
      } catch (error) {
        console.error('Upload completion error:', error);
        return new Response('Internal server error', { status: 500 });
      }
    };
  }

  private static async calculateChunkHash(chunk: Blob): Promise<string> {
    // Simple hash implementation for demonstration
    const buffer = await chunk.arrayBuffer();
    const view = new Uint8Array(buffer);
    let hash = 0;

    for (let i = 0; i < view.length; i++) {
      hash = ((hash << 5) - hash + view[i]) & 0xffffffff;
    }

    return Math.abs(hash).toString(36);
  }
}

export default {
  ChunkUploadServerClient,
  MockChunkUploadServer,
  createUploadServerClient,
  NextJSUploadIntegration,
};
