import { describe, expect, it } from 'vitest';
import { computeRank } from './trustScore';

describe('computeRank', () => {
  it.each([
    [0, 'NEWCOMER'],
    [50, 'EXPLORER'],
    [150, 'TRUSTED'],
    [400, 'INSIDER'],
    [1000, 'LEGEND'],
  ] as const)('maps %s points to %s', (score, rank) => {
    expect(computeRank(score)).toBe(rank);
  });
});
