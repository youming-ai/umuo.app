/**
 * API Route for completing chunked file uploads
 *
 * This API endpoint handles the finalization of chunked uploads,
 * assembling chunks into complete files and processing them.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, access, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { hash } from 'crypto';

import { z } from 'zod';

// Import the session management from chunk route
// In a real implementation, this would be shared via a database or Redis
import { uploadSessions, cleanupSession } from '../chunk/route';

// Validation schema for upload completion
const UploadCompleteSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  fileId: z.string().min(1, 'File ID is required'),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().int().min(0, 'File size must be non-negative'),
  totalChunks: z.number().int().min(1, 'Total chunks must be at least 1'),
  metadata: z.record(z.any()).optional(),
});

/**
 * POST /api/upload/complete - Complete chunked upload
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = UploadCompleteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { sessionId, fileId, fileName, fileSize, totalChunks, metadata } = validation.data;

    // Get upload session
    const session = uploadSessions.get(sessionId);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Upload session not found or expired'
        },
        { status: 404 }
      );
    }

    // Verify all chunks are uploaded
    if (session.uploadedChunks.size !== totalChunks) {
      return NextResponse.json(
        {
          success: false,
          error: `Incomplete upload. ${session.uploadedChunks.size}/${totalChunks} chunks uploaded`,
          uploadedChunks: session.uploadedChunks.size,
          totalChunks
        },
        { status: 400 }
      );
    }

    // Assemble the file
    const assembledFilePath = await assembleFile(session);

    // Verify file integrity
    const verificationResult = await verifyFileIntegrity(assembledFilePath, session);
    if (!verificationResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: `File integrity check failed: ${verificationResult.error}`
        },
        { status: 500 }
      );
    }

    // Process the completed file (e.g., move to permanent storage, create database record)
    const processingResult = await processCompletedFile(assembledFilePath, session, metadata);

    if (!processingResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `File processing failed: ${processingResult.error}`
        },
        { status: 500 }
      );
    }

    // Clean up session (with delay for potential retries)
    setTimeout(() => {
      cleanupSession(sessionId);
    }, 60000); // Clean up after 1 minute

    return NextResponse.json({
      success: true,
      fileId: processingResult.fileId,
      fileName: processingResult.fileName,
      fileSize: processingResult.fileSize,
      filePath: processingResult.filePath,
      uploadedAt: processingResult.uploadedAt,
      checksum: verificationResult.checksum,
      metadata: {
        ...metadata,
        sessionId,
        totalChunks,
        uploadDuration: Date.now() - session.createdAt.getTime(),
        chunkSize: Math.ceil(fileSize / totalChunks),
      },
    });

  } catch (error) {
    console.error('Upload completion error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during upload completion'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/upload/complete - Get upload completion status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const fileId = searchParams.get('fileId');

    if (!sessionId && !fileId) {
      return NextResponse.json(
        { error: 'Session ID or File ID is required' },
        { status: 400 }
      );
    }

    let session;
    if (sessionId) {
      session = uploadSessions.get(sessionId);
    } else {
      // Find session by file ID
      session = Array.from(uploadSessions.values()).find(s => s.fileId === fileId);
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Upload session not found' },
        { status: 404 }
      );
    }

    const isComplete = session.uploadedChunks.size === session.totalChunks;
    const progress = Math.round((session.uploadedChunks.size / session.totalChunks) * 100);

    return NextResponse.json({
      sessionId: session.sessionId,
      fileId: session.fileId,
      fileName: session.fileName,
      fileSize: session.fileSize,
      totalChunks: session.totalChunks,
      uploadedChunks: session.uploadedChunks.size,
      progress,
      isComplete,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
    });

  } catch (error) {
    console.error('Get completion status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions

async function assembleFile(session: any): Promise<string> {
  const outputDir = join(process.cwd(), 'uploads', 'completed');
  const outputFilePath = join(outputDir, `${session.fileId}_${session.fileName}`);

  try {
    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });

    // Get sorted chunks by index
    const sortedChunks = Array.from(session.chunkInfo.values())
      .sort((a: any, b: any) => a.chunkIndex - b.chunkIndex);

    console.log(`Assembling ${sortedChunks.length} chunks for ${session.fileName}`);

    // Assemble file from chunks
    const chunkBuffers = await Promise.all(
      sortedChunks.map(async (chunk: any) => {
        try {
          return await readFile(chunk.filePath);
        } catch (error) {
          console.error(`Failed to read chunk ${chunk.chunkIndex}:`, error);
          throw new Error(`Failed to read chunk ${chunk.chunkIndex}`);
        }
      })
    );

    // Concatenate all chunks
    const fileBuffer = Buffer.concat(chunkBuffers);

    // Write assembled file
    await writeFile(outputFilePath, fileBuffer);

    console.log(`File assembled successfully: ${outputFilePath} (${fileBuffer.length} bytes)`);
    return outputFilePath;

  } catch (error) {
    console.error('Failed to assemble file:', error);
    throw new Error('Failed to assemble uploaded file');
  }
}

async function verifyFileIntegrity(filePath: string, session: any): Promise<{
  isValid: boolean;
  checksum?: string;
  error?: string;
}> {
  try {
    // Read the assembled file
    const fileBuffer = await readFile(filePath);

    // Verify file size matches expected
    if (fileBuffer.length !== session.fileSize) {
      return {
        isValid: false,
        error: `File size mismatch. Expected: ${session.fileSize}, Actual: ${fileBuffer.length}`
      };
    }

    // Calculate checksum (SHA-256)
    const checksum = hash('sha256').update(fileBuffer).digest('hex');

    return {
      isValid: true,
      checksum
    };

  } catch (error) {
    console.error('File integrity verification failed:', error);
    return {
      isValid: false,
      error: 'Failed to verify file integrity'
    };
  }
}

async function processCompletedFile(
  filePath: string,
  session: any,
  metadata?: Record<string, any>
): Promise<{
  success: boolean;
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  filePath?: string;
  uploadedAt?: Date;
  error?: string;
}> {
  try {
    // In a real implementation, this would:
    // 1. Store file information in database
    // 2. Move file to permanent storage (e.g., S3, Google Cloud Storage)
    // 3. Trigger any post-processing (e.g., thumbnail generation, virus scanning)
    // 4. Notify other systems about the new file

    // For this example, we'll simulate database storage
    const fileRecord = {
      id: session.fileId,
      originalName: session.fileName,
      fileName: `${session.fileId}_${session.fileName}`,
      fileSize: session.fileSize,
      mimeType: session.fileType,
      filePath: filePath,
      checksum: '', // This would come from integrity check
      uploadedAt: new Date(),
      metadata: {
        ...metadata,
        sessionId: session.sessionId,
        totalChunks: session.totalChunks,
        uploadDuration: Date.now() - session.createdAt.getTime(),
      },
    };

    // Simulate database insertion
    console.log('File record created:', fileRecord);

    // Simulate any post-processing
    await simulatePostProcessing(filePath, session);

    return {
      success: true,
      fileId: fileRecord.id,
      fileName: fileRecord.fileName,
      fileSize: fileRecord.fileSize,
      filePath: fileRecord.filePath,
      uploadedAt: fileRecord.uploadedAt,
    };

  } catch (error) {
    console.error('File processing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown processing error'
    };
  }
}

async function simulatePostProcessing(filePath: string, session: any): Promise<void> {
  // Simulate various post-processing steps

  // 1. File type verification
  const isAudioFile = session.fileType.startsWith('audio/');
  const isVideoFile = session.fileType.startsWith('video/');
  const isImageFile = session.fileType.startsWith('image/');

  if (isAudioFile) {
    console.log('Processing audio file for transcription readiness');
    // In a real app, this might validate audio format, prepare for transcription, etc.
  }

  if (isVideoFile) {
    console.log('Processing video file');
    // In a real app, this might extract audio, generate thumbnails, etc.
  }

  if (isImageFile) {
    console.log('Processing image file');
    // In a real app, this might generate thumbnails, optimize image, etc.
  }

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log(`Post-processing completed for ${session.fileName}`);
}

/**
 * Additional utility endpoint for cleanup
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const olderThan = searchParams.get('olderThan');

    if (sessionId) {
      // Clean up specific session
      await cleanupSession(sessionId);
      return NextResponse.json({
        success: true,
        message: `Session ${sessionId} cleaned up`
      });
    } else if (olderThan) {
      // Clean up sessions older than specified age (in minutes)
      const ageMinutes = parseInt(olderThan);
      const maxAge = ageMinutes * 60 * 1000;
      const now = new Date();
      let cleanedCount = 0;

      for (const [sessionId, session] of uploadSessions.entries()) {
        const age = now.getTime() - session.lastActivity.getTime();

        if (age > maxAge) {
          await cleanupSession(sessionId);
          cleanedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Cleaned up ${cleanedCount} old sessions`
      });
    } else {
      return NextResponse.json(
        { error: 'Session ID or olderThan parameter is required' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error during cleanup' },
      { status: 500 }
    );
  }
}
