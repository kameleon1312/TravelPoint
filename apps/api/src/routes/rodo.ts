import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { Resend } from 'resend';

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

export async function rodoRoutes(app: FastifyInstance) {
  app.post('/api/rodo-request', async (req, reply) => {
    const parsed = RodoRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }

    const { email, handle, type, details } = parsed.data;

    // Persist in audit log for DPO records
    await app.prisma.auditLog.create({
      data: {
        action: 'RODO_REQUEST',
        metadata: { email, handle: handle ?? null, type, details: details ?? null, receivedAt: new Date().toISOString() },
      },
    });

    // Notify DPO via email (fire-and-forget)
    const dpEmail = process.env['DPO_EMAIL'] ?? process.env['EMAIL_FROM'];
    if (dpEmail && process.env['RESEND_API_KEY']) {
      const resend = new Resend(process.env['RESEND_API_KEY']);
      void resend.emails.send({
        from: process.env['EMAIL_FROM'] ?? 'TravelPoint <noreply@travelpoint.app>',
        to: dpEmail,
        subject: `[RODO] ${TYPE_LABELS[type] ?? type} — ${email}`,
        text: `Nowy wniosek RODO\n\nTyp: ${TYPE_LABELS[type] ?? type}\nE-mail: ${email}\nHandle: ${handle ?? '—'}\n\nSzczegóły:\n${details ?? '—'}\n\nDatai: ${new Date().toISOString()}`,
      }).catch((err: unknown) => logger.error({ err }, 'RODO DPO notification failed'));
    }

    // Confirmation to the requester
    if (process.env['RESEND_API_KEY']) {
      const resend = new Resend(process.env['RESEND_API_KEY']);
      void resend.emails.send({
        from: process.env['EMAIL_FROM'] ?? 'TravelPoint <noreply@travelpoint.app>',
        to: email,
        subject: 'Potwierdzenie wniosku RODO — TravelPoint',
        text: `Twój wniosek RODO został przyjęty.\n\nRodzaj: ${TYPE_LABELS[type] ?? type}\nData przyjęcia: ${new Date().toLocaleDateString('pl-PL')}\n\nOdpowiemy w ciągu 30 dni na ten adres e-mail, zgodnie z art. 12 RODO.\n\nJeśli nie składałeś/aś tego wniosku, zignoruj tę wiadomość.\n\n---\nTravelPoint — privacy@travelpoint.app`,
      }).catch((err: unknown) => logger.error({ err }, 'RODO confirmation email failed'));
    }

    logger.info({ email, type }, 'RODO request received');
    return reply.status(201).send({ message: 'Request received. We will respond within 30 days.' });
  });
}
