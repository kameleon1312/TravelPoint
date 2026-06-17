import { Prisma, type PrismaClient } from '@prisma/client';
import { deleteStoredPhotos } from './storage';
import { logger } from '../lib/logger';

export async function runRetention(prisma: PrismaClient, now = new Date()) {
  const expiredRoutes = await prisma.journey.updateMany({
    where: {
      retainRoute: false,
      routeGeoJson: { not: Prisma.DbNull },
      routeExpiresAt: { lte: now },
    },
    data: { routeGeoJson: Prisma.DbNull, routeExpiresAt: null },
  });

  const explorers = await prisma.explorer.findMany({
    where: { deletedAt: { not: null }, purgeAt: { lte: now } },
    select: {
      id: true,
      photos: { select: { objectKey: true, thumbnailKey: true } },
    },
    take: 100,
  });
  let purgedAccounts = 0;
  for (const explorer of explorers) {
    try {
      await deleteStoredPhotos(explorer.photos.flatMap((photo) => [photo.objectKey, photo.thumbnailKey]));
    } catch (error) {
      logger.warn({ err: error, explorerId: explorer.id }, 'Failed to remove account photos from storage');
      continue;
    }
    await prisma.explorer.delete({ where: { id: explorer.id } });
    purgedAccounts += 1;
  }

  await prisma.authToken.deleteMany({ where: { expiresAt: { lt: now } } });
  await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: now }, revokedAt: { not: null } },
  });
  const result = { expiredRoutes: expiredRoutes.count, purgedAccounts };
  await prisma.auditLog.create({
    data: {
      action: 'RETENTION_JOB_COMPLETED',
      metadata: {
        ...result,
        completedAt: now.toISOString(),
      },
    },
  });
  return result;
}
