import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/crypto';

const prisma = new PrismaClient();

async function main() {
  const hash = await hashPassword('Explorer#2026!');

  const explorer = await prisma.explorer.upsert({
    where: { email: 'admin@travelpoint.io' },
    update: {},
    create: {
      email: 'admin@travelpoint.io',
      handle: 'travelpoint',
      passwordHash: hash,
      displayName: 'TravelPoint',
      archetype: 'WANDERER',
      rank: 'LEGEND',
      trustScore: 9999,
      tier: 'EXPEDITION',
      emailVerified: true,
      consentTerms: new Date(),
      consentPrivacy: new Date(),
    },
  });

  console.log('Seed done. Admin explorer:', explorer.handle);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
