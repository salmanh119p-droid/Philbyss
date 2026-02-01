import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

export async function POST() {
  const cookie = clearAuthCookie();
  const response = NextResponse.json({ success: true });
  
  response.cookies.set(cookie.name, cookie.value, {
    maxAge: cookie.maxAge,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return response;
}
