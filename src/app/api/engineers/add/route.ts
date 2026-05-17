import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const isAuthenticated = await validateAuth();
  if (!isAuthenticated) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const required = ['first_name', 'last_name', 'email', 'phone', 'area'];
  const missing = required.filter(
    (k) => typeof body[k] !== 'string' || !body[k].trim()
  );
  if (missing.length) {
    return NextResponse.json(
      { success: false, error: `Missing: ${missing.join(', ')}` },
      { status: 400 }
    );
  }

  if (!EMAIL_RE.test(String(body.email).trim())) {
    return NextResponse.json(
      { success: false, error: 'Invalid email address' },
      { status: 400 }
    );
  }

  const webhookUrl = process.env.N8N_ADD_ENGINEER_URL;
  const apiKey = process.env.N8N_PHILBYS_API_KEY;
  if (!webhookUrl || !apiKey) {
    return NextResponse.json(
      { success: false, error: 'Provisioning service not configured' },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        ...body,
        email: String(body.email).trim().toLowerCase(),
      }),
    });

    const text = await res.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : { success: res.ok };
    } catch {
      data = { success: false, error: text || 'Invalid response from provisioning service' };
    }
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('Add engineer proxy failed:', err);
    return NextResponse.json(
      { success: false, error: 'Provisioning service unreachable' },
      { status: 503 }
    );
  }
}
