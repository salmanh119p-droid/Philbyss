import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'philbys_dashboard_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function hashPassword(password: string): string {
  // Simple hash for session validation (not cryptographically secure storage)
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `phb_${Math.abs(hash).toString(36)}`;
}

export async function validateAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  
  if (!authCookie) return false;
  
  const expectedHash = hashPassword(process.env.DASHBOARD_PASSWORD || 'admin');
  return authCookie.value === expectedHash;
}

export function createAuthCookie(password: string): { name: string; value: string; maxAge: number } {
  return {
    name: AUTH_COOKIE_NAME,
    value: hashPassword(password),
    maxAge: COOKIE_MAX_AGE,
  };
}

export function clearAuthCookie(): { name: string; value: string; maxAge: number } {
  return {
    name: AUTH_COOKIE_NAME,
    value: '',
    maxAge: 0,
  };
}

export function checkPassword(password: string): boolean {
  return password === (process.env.DASHBOARD_PASSWORD || 'admin');
}
