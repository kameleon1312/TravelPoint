import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifySupabaseJwt, requireAuth } from '../middleware/requireAuth';
import { logger } from '../lib/logger';
import { sendWelcomeEmail, sendInviteEmail } from '../services/email';
import { inviteErrorMessage, validateInvite } from '../services/inviteCodes';
import { addTrustPoints, TrustPoints } from '../services/trustScore';
import crypto from 'crypto';

const AUTH_RATE_LIMIT = { max: 5, timeWindow: '15 minutes' };

const CompleteSignupSchema = z.object({
  handle: z
    .string()
    .min(3, 'Handle musi mieć minimum 3 znaki')
    .max(24, 'Handle może mieć maksymalnie 24 znaki')
    .regex(
      /^[a-z0-9][a-z0-9_]*$/,
      'Handle może zawierać tylko małe litery, cyfry i podkreślenia, i musi zaczynać się literą lub cyfrą',
    ),
  inviteCode: z.string().optional(),
});

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/complete-signup
  // Wywoływane raz po supabase.auth.signUp() aby stworzyć profil Explorer w naszej bazie.
  // Supabase JWT weryfikuje tożsamość; email pochodzi z payloadu JWT.
  app.post(
    '/api/auth/complete-signup',
    { config: { rateLimit: AUTH_RATE_LIMIT } },
    async (req, reply) => {
      const auth = req.headers['authorization'];
      if (!auth?.startsWith('Bearer ')) {
        return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Missing token' });
      }

      let supabaseUserId: string;
      let userEmail: string;
      try {
        const payload = verifySupabaseJwt(auth.slice(7));
        supabaseUserId = payload.sub;
        userEmail = payload.email ?? '';
      } catch {
        return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
      }

      if (!userEmail) {
        return reply.status(400).send({ code: 'MISSING_EMAIL', message: 'Email not found in token' });
      }

      // Idempotentne — zwraca istniejący profil jeśli już istnieje
      const existing = await app.prisma.explorer.findFirst({
        where: { supabaseId: supabaseUserId },
        select: { id: true, handle: true, rank: true, emailVerified: true },
      });
      if (existing) {
        return reply.status(200).send(existing);
      }

      const parsed = CompleteSignupSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
      }
      const { handle, inviteCode } = parsed.data;

      const handleTaken = await app.prisma.explorer.findUnique({ where: { handle } });
      if (handleTaken) {
        return reply.status(409).send({ code: 'HANDLE_TAKEN', message: 'Handle jest już zajęty' });
      }

      const emailTaken = await app.prisma.explorer.findUnique({ where: { email: userEmail } });
      if (emailTaken) {
        return reply.status(409).send({ code: 'EMAIL_TAKEN', message: 'Email już zarejestrowany' });
      }

      let invitedById: string | undefined;
      let invite: Awaited<ReturnType<typeof app.prisma.inviteCode.findUnique>> = null;
      if (inviteCode) {
        invite = await app.prisma.inviteCode.findUnique({ where: { code: inviteCode } });
        if (!invite) {
          return reply.status(400).send({ code: 'INVALID_INVITE', message: 'Kod zaproszenia jest nieprawidłowy' });
        }
        const inviteError = validateInvite(invite, 'ACCOUNT', null);
        if (inviteError) {
          return reply.status(400).send({ code: inviteError, message: inviteErrorMessage(inviteError) });
        }
        invitedById = invite.createdById;
      }

      const now = new Date();
      let explorer: { id: string; handle: string; rank: string; emailVerified: boolean };

      try {
        explorer = await app.prisma.$transaction(async (tx) => {
          const created = await tx.explorer.create({
            data: {
              supabaseId: supabaseUserId,
              email: userEmail,
              handle,
              invitedById,
              emailVerified: true,
              consentTerms: now,
              consentPrivacy: now,
              auditLogs: {
                create: { action: 'REGISTER', metadata: { handle } },
              },
            },
            select: { id: true, handle: true, rank: true, emailVerified: true },
          });

          if (invite) {
            const consumed = await tx.inviteCode.updateMany({
              where: {
                id: invite.id,
                purpose: 'ACCOUNT',
                circleId: null,
                expiresAt: { gt: now },
                useCount: invite.useCount,
              },
              data: {
                useCount: { increment: 1 },
                usedById: created.id,
                usedAt: now,
              },
            });
            if (consumed.count !== 1) throw new Error('INVITE_CONSUMPTION_CONFLICT');
            await tx.inviteUse.create({
              data: { inviteId: invite.id, explorerId: created.id },
            });
          }

          return created;
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'INVITE_CONSUMPTION_CONFLICT') {
          return reply.status(409).send({ code: 'INVITE_EXHAUSTED', message: 'Kod zaproszenia był już użyty' });
        }
        throw error;
      }

      logger.info({ handle, supabaseUserId }, 'Explorer profile created');
      void sendWelcomeEmail(userEmail, handle);
      if (invite?.createdById) {
        void addTrustPoints(
          app.prisma,
          invite.createdById,
          TrustPoints.INVITE_JOINED,
          'INVITE_JOINED',
          `${invite.id}:${explorer.id}`,
        );
      }

      return reply.status(201).send(explorer);
    },
  );

  // POST /api/auth/invite — INSIDER+ generuje kod zaproszenia
  app.post('/api/auth/invite', { preHandler: [requireAuth] }, async (req, reply) => {
    const explorer = await app.prisma.explorer.findUnique({ where: { id: req.explorerId } });
    if (!explorer || !['INSIDER', 'LEGEND'].includes(explorer.rank)) {
      return reply.status(403).send({ code: 'FORBIDDEN', message: 'Wymagana ranga INSIDER' });
    }

    const { recipientEmail } = req.body as { recipientEmail?: string };
    const code = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await app.prisma.inviteCode.create({
      data: { code, purpose: 'ACCOUNT', createdById: explorer.id, expiresAt, maxUses: 1 },
    });

    if (recipientEmail) {
      void sendInviteEmail(recipientEmail, explorer.handle, code);
    }

    return reply.status(201).send({ code, expiresAt });
  });
}
