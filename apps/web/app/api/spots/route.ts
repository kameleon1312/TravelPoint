import { NextRequest, NextResponse } from 'next/server';

// Proxy do ENGINE — ukrywa URL API i umożliwia cache na edge
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

  const params = new URLSearchParams();
  const limit    = searchParams.get('limit');
  const category = searchParams.get('category');
  if (limit)    params.set('limit', limit);
  if (category) params.set('category', category);

  try {
    const res = await fetch(`${apiUrl}/api/spots/public?${params.toString()}`, {
      next: { revalidate: 300 }, // Cache 5 min na Next.js edge
    });

    if (!res.ok) {
      return NextResponse.json({ spots: [] }, { status: 200 });
    }

    const spots: unknown = await res.json();
    return NextResponse.json(spots, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    // API offline — zwracamy pustą listę zamiast 500
    return NextResponse.json([], { status: 200 });
  }
}
