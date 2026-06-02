import type { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound?: 'default' | null;
  badge?: number;
  data?: Record<string, unknown>;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

// ─── Send one or many push messages ──────────────────────────────────────────
async function sendBatch(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'Expo Push API non-2xx response');
      return;
    }

    const { data }: { data: ExpoPushTicket[] } = await res.json() as { data: ExpoPushTicket[] };
    for (const ticket of data) {
      if (ticket.status === 'error') {
        logger.warn({ ticket }, 'Expo Push ticket error');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Expo Push send failed — non-fatal');
  }
}

// ─── Send push to a specific token ───────────────────────────────────────────
export async function sendPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!token || !token.startsWith('ExponentPushToken')) return;
  await sendBatch([{ to: token, title, body, sound: 'default', priority: 'high', data }]);
}

// ─── Resolve explorer's push token from DB and send ──────────────────────────
export async function sendPushToExplorer(
  prisma: PrismaClient,
  explorerId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const explorer = await prisma.explorer.findUnique({
    where: { id: explorerId },
    select: { pushToken: true },
  });
  if (!explorer?.pushToken) return;
  await sendPush(explorer.pushToken, title, body, data);
}

// ─── Send push to multiple explorers (e.g. circle members) ───────────────────
export async function sendPushToMany(
  prisma: PrismaClient,
  explorerIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (explorerIds.length === 0) return;

  const explorers = await prisma.explorer.findMany({
    where: { id: { in: explorerIds }, pushToken: { not: null } },
    select: { pushToken: true },
  });

  const messages: ExpoPushMessage[] = explorers
    .filter((e: { pushToken: string | null }): e is { pushToken: string } => !!e.pushToken && e.pushToken.startsWith('ExponentPushToken'))
    .map((e: { pushToken: string }) => ({
      to: e.pushToken,
      title,
      body,
      sound: 'default' as const,
      priority: 'high' as const,
      data,
    }));

  await sendBatch(messages);
}
