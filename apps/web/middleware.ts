import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: ['/admin/:path*'],
};

const API_URL = (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000').replace(/\/$/, '');

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Login page must pass through to avoid redirect loop
  if (request.nextUrl.pathname === '/admin/login') {
    return NextResponse.next();
  }

  const token = request.cookies.get('tp_access_token')?.value;
  const returnUrl = encodeURIComponent(request.nextUrl.pathname);
  const loginUrl = new URL(`/admin/login?returnUrl=${returnUrl}`, request.url);

  if (!token) {
    return NextResponse.redirect(loginUrl);
  }

  try {
    const res = await fetch(`${API_URL}/api/explorers/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return NextResponse.redirect(loginUrl);
    }

    const data = (await res.json()) as { role?: string };
    if (!['MODERATOR', 'ADMIN'].includes(data.role ?? '')) {
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
