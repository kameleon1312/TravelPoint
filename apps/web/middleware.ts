import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: ['/admin/:path*'],
};

const API_URL = (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000').replace(/\/$/, '');

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get('tp_access_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/?unauthorized=1', request.url));
  }

  try {
    const res = await fetch(`${API_URL}/api/explorers/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return NextResponse.redirect(new URL('/?unauthorized=1', request.url));
    }

    const data = (await res.json()) as { role?: string };
    if (!['MODERATOR', 'ADMIN'].includes(data.role ?? '')) {
      return NextResponse.redirect(new URL('/?unauthorized=1', request.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/?unauthorized=1', request.url));
  }

  return NextResponse.next();
}
