import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const isAuthenticated = await validateAuth();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.N8N_REVIEWS_WEBHOOK_URL;
  const key = process.env.N8N_REVIEWS_WEBHOOK_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    );
  }

  const body = await req.json();
  if (!body?.from_date || !body?.to_date) {
    return NextResponse.json(
      { error: 'from_date and to_date are required' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Philbys-Api-Key': key,
      },
      body: JSON.stringify({
        from_date: body.from_date,
        to_date: body.to_date,
      }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[reviews/refresh] webhook error:', err);
    return NextResponse.json(
      { error: 'Refresh failed', details: String(err) },
      { status: 502 }
    );
  }
}
