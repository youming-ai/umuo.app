import { NextRequest, NextResponse } from 'next/server';
import { getServiceStatuses } from '@/lib/health-check/checks/api-connectivity';

export async function GET(request: NextRequest) {
  try {
    const serviceStatuses = await getServiceStatuses();

    return NextResponse.json({
      services: serviceStatuses,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching service statuses:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch service statuses',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}