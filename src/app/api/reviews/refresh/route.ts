import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';

export const maxDuration = 300;

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

    const rawText = await res.text();

    let data: unknown;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error('[reviews/refresh] non-JSON from n8n', {
        status: res.status,
        bodyPreview: rawText.slice(0, 300),
      });
      return NextResponse.json(
        {
          error: 'Upstream returned a non-JSON response',
          upstream_status: res.status,
          upstream_body_preview: rawText.slice(0, 300),
        },
        { status: 502 }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[reviews/refresh] webhook error:', err);
    return NextResponse.json(
      { error: 'Refresh failed', details: String(err) },
      { status: 502 }
    );
  }
}
