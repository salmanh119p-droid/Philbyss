import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { getSheetData, updateSheetCell } from '@/lib/sheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SHEET_ID = '1esRTmNel4HJ54bCUKwaq3Oho2yOhKhicFTDJN6C0lWg';
const SHEET_NAME = 'MASTER';
const VALID_MANAGERS = ['James', 'Jan', 'Ayesha'];

const FIELD_TO_COLUMN: Record<string, string> = {
  manager: 'A',
  trade: 'B',
  engineer: 'C',
  wo: 'D',
  po: 'E',
  category: 'F',
  jobStatus: 'G',
  desc: 'H',
  date: 'I',
  tenant: 'J',
  phone: 'K',
  email: 'L',
  status: 'M',
  lastContact: 'N',
  notes: 'O',
};

function parseDatetime(raw: string): { date: string; scheduledTime: string } {
  if (!raw || !raw.trim()) {
    return { date: '', scheduledTime: '' };
  }

  const trimmed = raw.trim();

  // Handle "YYYY-MM-DD HH:MM:SS" format
  const parts = trimmed.split(' ');
  const datePart = parts[0];
  const timePart = parts[1] || '';

  // Try to parse date part
  const dateSegments = datePart.includes('-') ? datePart.split('-') : datePart.split('/');

  let day: string, month: string, year: string;

  if (dateSegments.length === 3) {
    if (dateSegments[0].length === 4) {
      // YYYY-MM-DD
      [year, month, day] = dateSegments;
    } else {
      // DD/MM/YYYY or similar
      [day, month, year] = dateSegments;
    }
    day = day.padStart(2, '0');
    month = month.padStart(2, '0');
    const formattedDate = `${day}/${month}/${year}`;

    let scheduledTime = '';
    if (timePart) {
      const timeSegments = timePart.split(':');
      scheduledTime = `${(timeSegments[0] || '').padStart(2, '0')}:${(timeSegments[1] || '00').padStart(2, '0')}`;
    }

    return { date: formattedDate, scheduledTime };
  }

  // Fallback — return raw value as date
  return { date: trimmed, scheduledTime: '' };
}

export async function GET() {
  try {
    const isAuthenticated = await validateAuth();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rows = await getSheetData(SHEET_ID, SHEET_NAME, 'A2:O');

    const jobs = rows.map((row, index) => {
      const rawManager = (row[0] || '').trim();
      const manager = VALID_MANAGERS.includes(rawManager) ? rawManager : 'Unknown';
      const rawStatus = (row[12] || '').trim();
      const status = rawStatus || 'Pending';
      const { date, scheduledTime } = parseDatetime(row[8] || '');

      return {
        rowNumber: index + 2,
        manager,
        trade: row[1] || '',
        engineer: row[2] || '',
        wo: String(row[3] || ''),
        po: row[4] || '',
        category: row[5] || '',
        jobStatus: row[6] || '',
        desc: row[7] || '',
        date,
        scheduledTime,
        tenant: row[9] || '',
        phone: row[10] || '',
        email: row[11] || '',
        status,
        lastContact: row[13] || '',
        notes: row[14] || '',
      };
    });

    return NextResponse.json({ success: true, jobs });
  } catch (error) {
    console.error('Tenants confirmation GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tenants data',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await validateAuth();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { rowNumber, updates } = body;

    if (!rowNumber || !updates || typeof updates !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: rowNumber, updates' },
        { status: 400 }
      );
    }

    const errors: string[] = [];

    for (const [field, value] of Object.entries(updates)) {
      const column = FIELD_TO_COLUMN[field];
      if (!column) {
        errors.push(`Unknown field: ${field}`);
        continue;
      }
      const success = await updateSheetCell(
        SHEET_ID,
        SHEET_NAME,
        rowNumber,
        column,
        value as string
      );
      if (!success) {
        errors.push(`Failed to update ${field}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join(', ') },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, rowNumber });
  } catch (error) {
    console.error('Tenants confirmation POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update tenants data',
      },
      { status: 500 }
    );
  }
}
