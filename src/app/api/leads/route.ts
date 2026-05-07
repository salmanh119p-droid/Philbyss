import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import {
  getSheetData,
  updateSheetCell,
  appendSheetRow,
  deleteSheetRow,
  getFirstSheetMeta,
  columnIndexToLetter,
} from '@/lib/sheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Source = 'chatbot' | 'form';

function getSpreadsheetId(source: string | null): string | null {
  if (source === 'chatbot') return process.env.LEADS_CHATBOT_SHEET_ID || null;
  if (source === 'form') return process.env.LEADS_FORM_SHEET_ID || null;
  return null;
}

const metaCache = new Map<string, { title: string; sheetId: number }>();

async function resolveMeta(spreadsheetId: string) {
  const cached = metaCache.get(spreadsheetId);
  if (cached) return cached;
  const meta = await getFirstSheetMeta(spreadsheetId);
  metaCache.set(spreadsheetId, meta);
  return meta;
}

function unauthorized() {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

function badRequest(error: string) {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    if (!(await validateAuth())) return unauthorized();

    const source = request.nextUrl.searchParams.get('source');
    const spreadsheetId = getSpreadsheetId(source);
    if (!spreadsheetId) {
      return badRequest(
        `Invalid or unconfigured source: ${source}. Expected 'chatbot' or 'form' with matching env var set.`
      );
    }

    const meta = await resolveMeta(spreadsheetId);
    const data = await getSheetData(spreadsheetId, meta.title);

    if (data.length === 0) {
      return NextResponse.json({ success: true, headers: [], rows: [] });
    }

    const headers = (data[0] || []).map((h) => String(h || '').trim());
    const rows = data.slice(1).map((row, i) => {
      const values: Record<string, string> = {};
      headers.forEach((h, idx) => {
        values[h] = row[idx] !== undefined ? String(row[idx]) : '';
      });
      return { rowNumber: i + 2, values };
    });

    return NextResponse.json({ success: true, headers, rows });
  } catch (error) {
    console.error('Leads GET error:', error);
    return serverError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await validateAuth())) return unauthorized();

    const body = await request.json();
    const { source, values } = body as { source?: Source; values?: Record<string, string> };
    const spreadsheetId = getSpreadsheetId(source || null);
    if (!spreadsheetId) return badRequest('Invalid or unconfigured source');
    if (!values || typeof values !== 'object') return badRequest('Missing values');

    const meta = await resolveMeta(spreadsheetId);
    const data = await getSheetData(spreadsheetId, meta.title);
    const headers = (data[0] || []).map((h) => String(h || '').trim());
    if (headers.length === 0) {
      return badRequest('Sheet has no header row — add column headers in row 1 first');
    }

    const orderedRow = headers.map((h) => (values[h] !== undefined ? String(values[h]) : ''));
    const ok = await appendSheetRow(spreadsheetId, meta.title, orderedRow);
    if (!ok) throw new Error('Failed to append row to sheet');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leads POST error:', error);
    return serverError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await validateAuth())) return unauthorized();

    const body = await request.json();
    const { source, rowNumber, updates } = body as {
      source?: Source;
      rowNumber?: number;
      updates?: Record<string, string>;
    };
    const spreadsheetId = getSpreadsheetId(source || null);
    if (!spreadsheetId) return badRequest('Invalid or unconfigured source');
    if (!rowNumber || rowNumber < 2) return badRequest('Invalid rowNumber');
    if (!updates || typeof updates !== 'object') return badRequest('Missing updates');

    const meta = await resolveMeta(spreadsheetId);
    const data = await getSheetData(spreadsheetId, meta.title);
    const headers = (data[0] || []).map((h) => String(h || '').trim());

    const errors: string[] = [];
    for (const [field, value] of Object.entries(updates)) {
      const colIdx = headers.indexOf(field);
      if (colIdx === -1) {
        errors.push(`Unknown column: ${field}`);
        continue;
      }
      const ok = await updateSheetCell(
        spreadsheetId,
        meta.title,
        rowNumber,
        columnIndexToLetter(colIdx),
        value
      );
      if (!ok) errors.push(`Failed to update ${field}`);
    }

    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors.join(', ') }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leads PATCH error:', error);
    return serverError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await validateAuth())) return unauthorized();

    const body = await request.json();
    const { source, rowNumber } = body as { source?: Source; rowNumber?: number };
    const spreadsheetId = getSpreadsheetId(source || null);
    if (!spreadsheetId) return badRequest('Invalid or unconfigured source');
    if (!rowNumber || rowNumber < 2) return badRequest('Invalid rowNumber');

    const meta = await resolveMeta(spreadsheetId);
    const ok = await deleteSheetRow(spreadsheetId, meta.sheetId, rowNumber);
    if (!ok) throw new Error('Failed to delete row');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leads DELETE error:', error);
    return serverError(error);
  }
}
