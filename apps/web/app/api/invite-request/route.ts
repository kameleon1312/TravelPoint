import { NextRequest, NextResponse } from 'next/server';
import { InviteRequestSchema } from '@travelpoint/validation';

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const parsed = InviteRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Forward to ENGINE or store directly (in production: call apps/api waitlist endpoint)
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
  try {
    await fetch(`${apiUrl}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
  } catch {
    // Non-fatal: log and respond success anyway (queue offline fallback)
  }

  return NextResponse.json({ message: 'Request received' }, { status: 201 });
}
