import type { BurstEvent } from '../combat/types';

/** Burst meter charge awarded per combat event. */
export const BURST_GAINS: Record<BurstEvent, number> = {
  torsoHit: 5,
  weakPointHit: 9,
  heavyHit: 8,
  normalBlock: 2,
  perfectCounter: 18,
  evade: 6,
  kill: 10,
};
