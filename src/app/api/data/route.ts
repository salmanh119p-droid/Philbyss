import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { fetchDashboardData } from '@/lib/data';
import { getCachedData, setCachedData, clearCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const isAuthenticated = await validateAuth();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check for force refresh parameter
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';
    
    // Try to get cached data first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = getCachedData();
      if (cachedData) {
        return NextResponse.json({
          success: true,
          data: cachedData,
          cached: true,
        });
      }
    } else {
      clearCache();
    }

    // Fetch fresh data from Google Sheets
    const data = await fetchDashboardData();
    
    // Cache the data
    setCachedData(data);
    
    return NextResponse.json({
      success: true,
      data,
      cached: false,
    });
  } catch (error) {
    console.error('Data fetch error:', error);
    
    // If we have cached data, return it even on error
    const cachedData = getCachedData();
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true,
        warning: 'Using cached data due to API error',
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch data' 
      },
      { status: 500 }
    );
  }
}
