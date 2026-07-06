import { BURST_GAINS } from '../balance/burst';
import type { BurstEvent } from './types';

/**
 * Which burst event a landed strike counts as. Weak-point hits outrank heavy
 * hits so aiming is always worth at least as much as winding up.
 */
export const classifyHitBurstEvent = (
  weakPoint: boolean,
  heavy: boolean
): BurstEvent => (weakPoint ? 'weakPointHit' : heavy ? 'heavyHit' : 'torsoHit');

export const burstGainFor = (event: BurstEvent): number => BURST_GAINS[event];

export const gainBurst = (
  current: number,
  event: BurstEvent,
  max: number
): number => Math.min(max, current + burstGainFor(event));

export const canActivateBurst = (current: number, max: number): boolean =>
  current >= max;
