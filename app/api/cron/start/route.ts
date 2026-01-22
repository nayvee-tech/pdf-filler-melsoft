import { NextResponse } from 'next/server';
import { startCleanupCron } from '@/lib/cleanup-cron';

export async function GET() {
  try {
    startCleanupCron();
    return NextResponse.json({ success: true, message: 'Cleanup cron started' });
  } catch (error) {
    console.error('Failed to start cron:', error);
    return NextResponse.json(
      { error: 'Failed to start cleanup cron' },
      { status: 500 }
    );
  }
}
