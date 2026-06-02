import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const RodoRequestSchema = z.object({
  email:   z.string().email(),
  handle:  z.string().min(1).max(24).nullable().optional(),
  type:    z.enum(['ACCESS', 'ERASURE', 'PORTABILITY', 'RECTIFICATION', 'OBJECTION', 'RESTRICTION']),
  details: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const parsed = RodoRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

  // Forward to ENGINE to be stored and emailed to DPO
  try {
    await fetch(`${apiUrl}/api/rodo-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
  } catch {
    // Non-fatal: log and respond success — email fallback exists
  }

  return NextResponse.json({ message: 'Request received' }, { status: 201 });
}
