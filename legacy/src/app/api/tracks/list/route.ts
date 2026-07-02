import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const ACCESS_TOKEN_COOKIE = 'access_token';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ detail: { error_key: 'unauthorized', error_message: 'Missing token' } }, { status: 401 });
  }

  // Try backend list endpoint, which per OpenAPI may return ResponseWrapper[ResponseListWrapper[List[TrackFullResponseModel]]]
  const res = await fetch(`${API_BASE_URL}/api/v1/tracks`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}


