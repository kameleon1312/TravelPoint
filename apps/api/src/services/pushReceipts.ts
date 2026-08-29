import type { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';

const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
// expoTicketId → pushToken (for receipt correlation)
const pendingTickets = new Map<string, string>();

interface ExpoReceiptData {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

export function storePendingTicket(expoTicketId: string, pushToken: string): void {
  pendingTickets.set(expoTicketId, pushToken);
}

export async function checkPushReceipts(prisma: PrismaClient): Promise<void> {
  if (pendingTickets.size === 0) return;

  // Take up to 300 at a time (Expo limit per request)
  const batch = [...pendingTickets.entries()].slice(0, 300);
  const ids = batch.map(([id]) => id);

  try {
    const res = await fetch(EXPO_RECEIPTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ids }),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'Expo receipts API non-2xx');
      return;
    }

    const { data } = await res.json() as { data: Record<string, ExpoReceiptData> };
    const tokensToRemove: string[] = [];

    for (const [expoId, token] of batch) {
      const receipt = data[expoId];
      if (!receipt) continue;

      pendingTickets.delete(expoId);

      if (receipt.status === 'error') {
        if (receipt.details?.error === 'DeviceNotRegistered') {
          tokensToRemove.push(token);
        } else {
          logger.warn({ expoId, error: receipt.details?.error }, 'Push receipt error');
        }
      }
    }

    if (tokensToRemove.length > 0) {
      await prisma.explorer.updateMany({
        where: { pushToken: { in: tokensToRemove } },
        data: { pushToken: null },
      });
      logger.info({ count: tokensToRemove.length }, 'Cleared unregistered push tokens');
    }
  } catch (err) {
    logger.error({ err }, 'Push receipt check failed — non-fatal');
  }
}
