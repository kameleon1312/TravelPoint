import type { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';
import { storePendingTicket } from './pushReceipts';

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

async function sendBatch(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return [];

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'Expo Push API non-2xx response');
      return [];
    }

    const { data } = await res.json() as { data: ExpoPushTicket[] };
    return data;
  } catch (err) {
    logger.error({ err }, 'Expo Push send failed — non-fatal');
    return [];
  }
}

async function handleTickets(
  tickets: ExpoPushTicket[],
  tokens: string[],
  prisma: PrismaClient,
): Promise<void> {
  const unregistered: string[] = [];

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const token = tokens[i];
    if (!ticket || !token) continue;

    if (ticket.status === 'ok' && ticket.id) {
      storePendingTicket(ticket.id, token);
    } else if (ticket.status === 'error') {
      if (ticket.details?.error === 'DeviceNotRegistered') {
        unregistered.push(token);
      } else {
        logger.warn({ ticket }, 'Expo Push ticket error');
      }
    }
  }

  if (unregistered.length > 0) {
    await prisma.explorer.updateMany({
      where: { pushToken: { in: unregistered } },
      data: { pushToken: null },
    });
    logger.info({ count: unregistered.length }, 'Cleared unregistered push tokens at send time');
  }
}

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
  const token = explorer?.pushToken;
  if (!token || !token.startsWith('ExponentPushToken')) return;

  const tickets = await sendBatch([{ to: token, title, body, sound: 'default', priority: 'high', data }]);
  await handleTickets(tickets, [token], prisma);
}

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

  const tokens = explorers
    .filter((e): e is { pushToken: string } => !!e.pushToken && e.pushToken.startsWith('ExponentPushToken'))
    .map((e) => e.pushToken);

  if (tokens.length === 0) return;

  const messages = tokens.map((to) => ({
    to,
    title,
    body,
    sound: 'default' as const,
    priority: 'high' as const,
    data,
  }));

  const tickets = await sendBatch(messages);
  await handleTickets(tickets, tokens, prisma);
}

// Kept for ad-hoc use where prisma is not available
export async function sendPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!token || !token.startsWith('ExponentPushToken')) return;
  await sendBatch([{ to: token, title, body, sound: 'default', priority: 'high', data }]);
}
