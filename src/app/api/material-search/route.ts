import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'A search query is required' },
        { status: 400 }
      );
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: 'Material search is not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: body.query.trim() }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Supplier search failed. Please try again.' },
        { status: 502 }
      );
    }

    const data = await response.json();

    // The results field may be returned as a JSON string — parse it safely
    let results = [];
    try {
      results = typeof data.results === 'string' ? JSON.parse(data.results) : data.results;
    } catch {
      console.error('Failed to parse material search results');
      results = [];
    }

    return NextResponse.json({
      ...data,
      results: Array.isArray(results) ? results : [],
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
