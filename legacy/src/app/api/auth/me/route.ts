import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const ACCESS_TOKEN_COOKIE = 'access_token';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/users`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    const apiData = await res.json();
    const backendUser = apiData.data;
    const user = {
      uuid: backendUser.uuid,
      email: backendUser.email,
      name: backendUser.name,
      iconUrl: backendUser.icon_url ?? undefined,
      createdAt: backendUser.created_at,
      updatedAt: backendUser.updated_at,
    };
    return NextResponse.json({ authenticated: true, user }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  }
}


