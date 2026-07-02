import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const ACCESS_TOKEN_COOKIE = 'access_token';

async function ensureAuth(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return { token: null, response: NextResponse.json({ detail: { error_key: 'unauthorized', error_message: 'Missing token' } }, { status: 401 }) };
  }
  return { token, response: null };
}

export async function POST(request: NextRequest) {
  const { token, response } = await ensureAuth(request);
  if (!token) return response as NextResponse;

  const body = await request.json();
  const res = await fetch(`${API_BASE_URL}/api/v1/tracks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function GET(request: NextRequest) {
  const { token, response } = await ensureAuth(request);
  if (!token) return response as NextResponse;

  const { searchParams } = new URL(request.url);
  const uuid = searchParams.get('uuid');
  if (!uuid) {
    return NextResponse.json({ detail: { error_key: 'invalid_params', error_message: 'Missing uuid' } }, { status: 400 });
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/tracks?uuid=${encodeURIComponent(uuid)}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(request: NextRequest) {
  const { token, response } = await ensureAuth(request);
  if (!token) return response as NextResponse;

  const body = await request.json();
  const res = await fetch(`${API_BASE_URL}/api/v1/tracks`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(request: NextRequest) {
  const { token, response } = await ensureAuth(request);
  if (!token) return response as NextResponse;

  const body = await request.json();
  const res = await fetch(`${API_BASE_URL}/api/v1/tracks`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}


