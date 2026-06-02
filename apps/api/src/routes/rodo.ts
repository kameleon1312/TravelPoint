import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { logger } from '../lib/logger';

const RESEND_URL = 'https://api.resend.com/emails';

const RodoRequestSchema = z.object({
  email:   z.string().email(),
  handle:  z.string().min(1).max(24).nullable().optional(),
  type:    z.enum(['ACCESS', 'ERASURE', 'PORTABILITY', 'RECTIFICATION', 'OBJECTION', 'RESTRICTION']),
  details: z.string().max(1000).optional(),
});

const TYPE_LABELS: Record<string, string> = {
  ACCESS:        'Dostęp do danych (Art. 15)',
  ERASURE:       'Usunięcie danych (Art. 17)',
  PORTABILITY:   'Przenoszenie danych (Art. 20)',
  RECTIFICATION: 'Sprostowanie (Art. 16)',
  OBJECTION:     'Sprzeciw (Art. 21)',
  RESTRICTION:   'Ograniczenie przetwarzania (Art. 18)',
};

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const apiKey = process.env['RESEND_API_KEY'];
  const from   = process.env['EMAIL_FROM'] ?? 'TravelPoint <onboarding@resend.dev>';

  if (!apiKey || apiKey === 're_CHANGE_ME') return;

  try {
    await fetch(RESEND_URL, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, text }),
    });
  } catch (err) {
    logger.error({ err }, 'RODO email send failed — non-fatal');
  }
}

export async function rodoRoutes(app: FastifyInstance) {
  app.post('/api/rodo-request', async (req, reply) => {
    const parsed = RodoRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }

    const { email, handle, type, details } = parsed.data;

    await app.prisma.auditLog.create({
      data: {
        action: 'RODO_REQUEST',
        metadata: {
          email,
          handle:     handle ?? null,
          type,
          details:    details ?? null,
          receivedAt: new Date().toISOString(),
        },
      },
    });

    const dpoEmail = process.env['DPO_EMAIL'];
    const label    = TYPE_LABELS[type] ?? type;

    // Notify DPO
    if (dpoEmail) {
      void sendEmail(
        dpoEmail,
        `[RODO] ${label} — ${email}`,
        `Nowy wniosek RODO\n\nTyp: ${label}\nE-mail: ${email}\nHandle: ${handle ?? '—'}\nSzczegóły: ${details ?? '—'}\nData: ${new Date().toISOString()}`,
      );
    }

    // Confirm to requester
    void sendEmail(
      email,
      'Potwierdzenie wniosku RODO — TravelPoint',
      `Twój wniosek RODO został przyjęty.\n\nRodzaj: ${label}\nData: ${new Date().toLocaleDateString('pl-PL')}\n\nOdpowiemy w ciągu 30 dni na ten adres e-mail (art. 12 RODO).\n\n---\nTravelPoint — privacy@travelpoint.app`,
    );

    logger.info({ email, type }, 'RODO request received');
    return reply.status(201).send({ message: 'Request received. We will respond within 30 days.' });
  });
}
