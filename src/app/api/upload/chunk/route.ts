/**
 * API Route for handling chunked file uploads
 *
 * This API endpoint handles individual chunk uploads for the chunked upload system.
 * It validates chunk data, stores chunks, and manages upload session state.
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

import { z } from 'zod';

// Validation schema for chunk upload requests
const ChunkUploadSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  fileId: z.string().min(1, 'File ID is required'),
  chunkId: z.string().min(1, 'Chunk ID is required'),
  chunkIndex: z.number().int().min(0, 'Chunk index must be non-negative'),
  chunkStart: z.number().int().min(0, 'Chunk start must be non-negative'),
  chunkEnd: z.number().int().min(0, 'Chunk end must be non-negative'),
  totalChunks: z.number().int().min(1, 'Total chunks must be at least 1'),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().int().min(0, 'File size must be non-negative'),
  fileType: z.string().min(1, 'File type is required'),
});

// In-memory session storage (in production, use Redis or database)
const uploadSessions = new Map<string, UploadSession>();

interface UploadSession {
  sessionId: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  uploadedChunks: Set<string>;
  chunkInfo: Map<number, ChunkInfo>;
  createdAt: Date;
  lastActivity: Date;
  tempDirectory: string;
}

interface ChunkInfo {
  chunkId: string;
  chunkIndex: number;
  chunkStart: number;
  chunkEnd: number;
  chunkSize: number;
  uploadedAt?: Date;
  filePath: string;
}

/**
 * POST /api/upload/chunk - Handle chunk upload
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract form fields
    const metadata = {
      sessionId: formData.get('sessionId') as string,
      fileId: formData.get('fileId') as string,
      chunkId: formData.get('chunkId') as string,
      chunkIndex: parseInt(formData.get('chunkIndex') as string),
      chunkStart: parseInt(formData.get('chunkStart') as string),
      chunkEnd: parseInt(formData.get('chunkEnd') as string),
      totalChunks: parseInt(formData.get('totalChunks') as string),
      fileName: formData.get('fileName') as string,
      fileSize: parseInt(formData.get('fileSize') as string),
      fileType: formData.get('fileType') as string,
    };

    // Extract chunk data
    const chunkData = formData.get('chunk') as File;
    if (!chunkData) {
      return NextResponse.json(
        { success: false, error: 'No chunk data provided' },
        { status: 400 }
      );
    }

    // Validate metadata
    const validation = ChunkUploadSchema.safeParse(metadata);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid metadata',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Get or create upload session
    let session = uploadSessions.get(validatedData.sessionId);

    if (!session) {
      // Create new session
      session = await createUploadSession(validatedData);
      uploadSessions.set(validatedData.sessionId, session);
    }

    // Validate chunk integrity
    const expectedChunkSize = validatedData.chunkEnd - validatedData.chunkStart;
    if (chunkData.size !== expectedChunkSize) {
      return NextResponse.json(
        {
          success: false,
          error: `Chunk size mismatch. Expected: ${expectedChunkSize}, Received: ${chunkData.size}`,
          retryable: true
        },
        { status: 400 }
      );
    }

    // Validate chunk sequence
    if (validatedData.chunkIndex >= validatedData.totalChunks) {
      return NextResponse.json(
        {
          success: false,
          error: `Chunk index ${validatedData.chunkIndex} exceeds total chunks ${validatedData.totalChunks}`,
          retryable: false
        },
        { status: 400 }
      );
    }

    // Check if chunk already uploaded
    if (session.uploadedChunks.has(validatedData.chunkId)) {
      return NextResponse.json(
        {
          success: true,
          chunkId: validatedData.chunkId,
          message: 'Chunk already uploaded',
          duplicate: true
        }
      );
    }

    // Store chunk
    const chunkResult = await storeChunk(session, validatedData, chunkData);
    if (!chunkResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: chunkResult.error,
          retryable: chunkResult.retryable
        },
        { status: 500 }
      );
    }

    // Update session
    session.uploadedChunks.add(validatedData.chunkId);
    session.lastActivity = new Date();
    session.chunkInfo.set(validatedData.chunkIndex, {
      chunkId: validatedData.chunkId,
      chunkIndex: validatedData.chunkIndex,
      chunkStart: validatedData.chunkStart,
      chunkEnd: validatedData.chunkEnd,
      chunkSize: validatedData.chunkEnd - validatedData.chunkStart,
      uploadedAt: new Date(),
      filePath: chunkResult.filePath!,
    });

    // Check if upload is complete
    const isComplete = session.uploadedChunks.size === validatedData.totalChunks;

    if (isComplete) {
      // Trigger file assembly
      await assembleFile(session);

      // Clean up session (optional, keep for a while for debugging)
      setTimeout(() => {
        cleanupSession(session.sessionId);
      }, 300000); // Clean up after 5 minutes
    }

    return NextResponse.json({
      success: true,
      chunkId: validatedData.chunkId,
      uploadId: session.sessionId,
      complete: isComplete,
      progress: {
        uploaded: session.uploadedChunks.size,
        total: validatedData.totalChunks,
        percentage: Math.round((session.uploadedChunks.size / validatedData.totalChunks) * 100),
      }
    });

  } catch (error) {
    console.error('Chunk upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during chunk upload',
        retryable: true
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/upload/chunk - Get upload session status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = uploadSessions.get(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Calculate session status
    const status = {
      sessionId: session.sessionId,
      fileId: session.fileId,
      fileName: session.fileName,
      fileSize: session.fileSize,
      fileType: session.fileType,
      totalChunks: session.totalChunks,
      uploadedChunks: session.uploadedChunks.size,
      progress: Math.round((session.uploadedChunks.size / session.totalChunks) * 100),
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      isComplete: session.uploadedChunks.size === session.totalChunks,
      chunks: Array.from(session.chunkInfo.values()).map(chunk => ({
        chunkId: chunk.chunkId,
        chunkIndex: chunk.chunkIndex,
        uploadedAt: chunk.uploadedAt,
      })),
    };

    return NextResponse.json(status);

  } catch (error) {
    console.error('Get session status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload/chunk - Cancel upload session
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = uploadSessions.get(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Clean up session and temporary files
    await cleanupSession(sessionId);

    return NextResponse.json({
      success: true,
      message: 'Upload session cancelled and cleaned up'
    });

  } catch (error) {
    console.error('Cancel session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions

async function createUploadSession(metadata: z.infer<typeof ChunkUploadSchema>): Promise<UploadSession> {
  // Create temporary directory for chunks
  const tempDir = join(process.cwd(), 'temp', 'uploads', metadata.sessionId);

  try {
    await mkdir(tempDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create temp directory:', error);
    throw new Error('Failed to create upload session');
  }

  return {
    sessionId: metadata.sessionId,
    fileId: metadata.fileId,
    fileName: metadata.fileName,
    fileSize: metadata.fileSize,
    fileType: metadata.fileType,
    totalChunks: metadata.totalChunks,
    uploadedChunks: new Set(),
    chunkInfo: new Map(),
    createdAt: new Date(),
    lastActivity: new Date(),
    tempDirectory: tempDir,
  };
}

async function storeChunk(
  session: UploadSession,
  metadata: z.infer<typeof ChunkUploadSchema>,
  chunkData: File
): Promise<{ success: boolean; filePath?: string; error?: string; retryable?: boolean }> {
  try {
    const chunkFileName = `chunk_${metadata.chunkIndex.toString().padStart(6, '0')}_${metadata.chunkId}.part`;
    const chunkFilePath = join(session.tempDirectory, chunkFileName);

    // Convert File to Buffer
    const arrayBuffer = await chunkData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write chunk to disk
    await writeFile(chunkFilePath, buffer);

    return { success: true, filePath: chunkFilePath };
  } catch (error) {
    console.error('Failed to store chunk:', error);
    return {
      success: false,
      error: 'Failed to store chunk data',
      retryable: true
    };
  }
}

async function assembleFile(session: UploadSession): Promise<string> {
  const outputDir = join(process.cwd(), 'uploads');
  const outputFilePath = join(outputDir, `${session.fileId}_${session.fileName}`);

  try {
    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });

    // Get sorted chunks
    const sortedChunks = Array.from(session.chunkInfo.values())
      .sort((a, b) => a.chunkIndex - b.chunkIndex);

    // Assemble file from chunks
    const fileBuffer = Buffer.concat(
      await Promise.all(
        sortedChunks.map(async (chunk) => {
          const chunkBuffer = await import('fs/promises').then(fs => fs.readFile(chunk.filePath));
          return chunkBuffer;
        })
      )
    );

    // Write assembled file
    await writeFile(outputFilePath, fileBuffer);

    console.log(`File assembled successfully: ${outputFilePath}`);
    return outputFilePath;

  } catch (error) {
    console.error('Failed to assemble file:', error);
    throw new Error('Failed to assemble uploaded file');
  }
}

async function cleanupSession(sessionId: string): Promise<void> {
  try {
    const session = uploadSessions.get(sessionId);
    if (!session) return;

    // Remove session from memory
    uploadSessions.delete(sessionId);

    // Clean up temporary directory
    const { rm } = await import('fs/promises');
    await rm(session.tempDirectory, { recursive: true, force: true });

    console.log(`Session ${sessionId} cleaned up successfully`);
  } catch (error) {
    console.error('Failed to cleanup session:', error);
  }
}

/**
 * Cleanup old sessions (run periodically)
 */
export async function cleanupOldSessions(): Promise<void> {
  const now = new Date();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [sessionId, session] of uploadSessions.entries()) {
    const age = now.getTime() - session.lastActivity.getTime();

    if (age > maxAge) {
      console.log(`Cleaning up old session: ${sessionId}`);
      await cleanupSession(sessionId);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupOldSessions, 60 * 60 * 1000);
