import { NextRequest, NextResponse } from 'next/server';

const ACCESS_TOKEN_COOKIE = 'access_token';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}


