import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const ACCESS_TOKEN_COOKIE = 'access_token';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state') || undefined;

  if (!code) {
    const url = new URL('/login?error=missing_code', request.url);
    return NextResponse.redirect(url);
  }

  try {
    const tokenRes = await fetch(`${API_BASE_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    });

    if (!tokenRes.ok) {
      const url = new URL('/login?error=exchange_failed', request.url);
      return NextResponse.redirect(url);
    }

    const tokenData = await tokenRes.json();
    // Support both accessToken and access_token shapes
    const accessToken: string = tokenData.accessToken || tokenData.access_token;
    const expiresIn: number = tokenData.expiresIn || tokenData.expires_in || 60 * 60 * 24 * 7; // fallback 7d

    if (!accessToken) {
      const url = new URL('/login?error=no_token', request.url);
      return NextResponse.redirect(url);
    }

    const response = NextResponse.redirect(new URL('/', request.url));
    // Set HttpOnly cookie
    response.cookies.set({
      name: ACCESS_TOKEN_COOKIE,
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expiresIn,
    });
    return response;
  } catch (error) {
    const url = new URL('/login?error=unexpected', request.url);
    return NextResponse.redirect(url);
  }
}


