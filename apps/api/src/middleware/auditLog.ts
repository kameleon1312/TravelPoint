import type { PrismaClient } from '@prisma/client';

export async function auditAccess(
  prisma: PrismaClient,
  explorerId: string,
  action: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      explorerId,
      action,
      ...(metadata ? { metadata: metadata as unknown } : {}),
    },
  });
}
