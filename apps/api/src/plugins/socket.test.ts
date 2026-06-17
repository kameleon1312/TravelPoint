import { describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { joinCircleRoom } from './socket';

describe('joinCircleRoom', () => {
  it('prevents cross-user and cross-circle room access', async () => {
    const findUnique = vi.fn(async (args: {
      where: { circleId_explorerId: { circleId: string; explorerId: string } };
    }) => {
      const key = args.where.circleId_explorerId;
      return key.circleId === 'circle-a' && key.explorerId === 'member-a'
        ? { id: 'membership-a' }
        : null;
    });
    const prisma = {
      circleMember: { findUnique },
    } as unknown as FastifyInstance['prisma'];
    const socket = {
      join: vi.fn(async () => undefined),
      emit: vi.fn(),
    };

    await expect(joinCircleRoom(prisma, socket, 'outsider', 'circle-a')).resolves.toBe(false);
    await expect(joinCircleRoom(prisma, socket, 'member-a', 'circle-b')).resolves.toBe(false);
    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledTimes(2);

    await expect(joinCircleRoom(prisma, socket, 'member-a', 'circle-a')).resolves.toBe(true);
    expect(socket.join).toHaveBeenCalledWith('circle:circle-a');
  });
});
