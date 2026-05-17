import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const isAuthenticated = await validateAuth();
  if (!isAuthenticated) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!params.id) {
    return NextResponse.json(
      { success: false, error: 'Missing engineer id' },
      { status: 400 }
    );
  }

  const webhookUrl = process.env.N8N_DEACTIVATE_ENGINEER_URL;
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
      body: JSON.stringify({ engineer_id: params.id }),
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
    console.error('Deactivate engineer proxy failed:', err);
    return NextResponse.json(
      { success: false, error: 'Provisioning service unreachable' },
      { status: 503 }
    );
  }
}
