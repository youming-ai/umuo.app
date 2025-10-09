import { NextRequest, NextResponse } from 'next/server';
import { testTranscription } from '@/lib/health-check/checks/transcription-test';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let audioFile: File | null = null;
    let serviceName: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      audioFile = formData.get('audioFile') as File;
      serviceName = formData.get('serviceName') as string;
    } else {
      const body = await request.json();
      serviceName = body.serviceName;
    }

    const result = await testTranscription({
      audioFile,
      serviceName,
      timeout: 30000, // 30 second timeout
    });

    return NextResponse.json({
      testId: result.testId,
      serviceName: result.serviceName,
      status: result.status,
      transcription: result.transcription,
      confidence: result.confidence,
      language: result.language,
      processingTime: result.processingTime,
      metrics: result.metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error testing transcription:', error);
    return NextResponse.json(
      {
        error: 'Failed to test transcription',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}