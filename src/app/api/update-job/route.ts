import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { updateJobCost } from '@/lib/sheets';
import { clearCache } from '@/lib/cache';

const PAYSLIP_SHEET_ID = process.env.PAYSLIP_SHEET_ID!;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const isAuthenticated = await validateAuth();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { engineerName, jobId, newCost } = body;

    if (!engineerName || !jobId || newCost === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: engineerName, jobId, newCost' },
        { status: 400 }
      );
    }

    // Update the sheet
    const success = await updateJobCost(
      PAYSLIP_SHEET_ID,
      engineerName,
      jobId,
      newCost
    );

    if (success) {
      // Clear cache so next fetch gets updated data
      clearCache();
      
      return NextResponse.json({
        success: true,
        message: `Updated job ${jobId} cost to £${newCost}`,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to update sheet' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Update job error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update job' 
      },
      { status: 500 }
    );
  }
}
