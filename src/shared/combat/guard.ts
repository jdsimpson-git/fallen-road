import type { GuardMeter } from './types';

export const createGuardMeter = (max: number): GuardMeter => ({
  current: max,
  max,
  brokenUntil: 0,
  lastGuardHitAt: Number.NEGATIVE_INFINITY,
});

export const isGuardBroken = (meter: GuardMeter, now: number): boolean =>
  now < meter.brokenUntil;

export type GuardDamageResult = { meter: GuardMeter; broke: boolean };

/**
 * Apply guard damage at time `now`. Reaching zero breaks the guard for
 * `breakDurationMs` and empties the meter.
 */
export const applyGuardDamage = (
  meter: GuardMeter,
  amount: number,
  now: number,
  breakDurationMs: number
): GuardDamageResult => {
  const next = meter.current - amount;
  if (next <= 0) {
    return {
      meter: {
        ...meter,
        current: 0,
        brokenUntil: now + breakDurationMs,
        lastGuardHitAt: now,
      },
      broke: meter.current > 0 || !isGuardBroken(meter, now),
    };
  }
  return {
    meter: { ...meter, current: next, lastGuardHitAt: now },
    broke: false,
  };
};

export type GuardRegenTuning = {
  regenPerSecond: number;
  regenDelayMs: number;
};

/**
 * Regenerate guard over `dtMs`. Guard does not recover while blocking, while
 * broken, or within the regen delay after absorbing a hit.
 */
export const regenGuard = (
  meter: GuardMeter,
  now: number,
  dtMs: number,
  blocking: boolean,
  tuning: GuardRegenTuning
): GuardMeter => {
  if (blocking) return meter;
  if (isGuardBroken(meter, now)) return meter;
  if (now - meter.lastGuardHitAt < tuning.regenDelayMs) return meter;
  if (meter.current >= meter.max) return meter;
  const current = Math.min(
    meter.max,
    meter.current + (tuning.regenPerSecond * dtMs) / 1000
  );
  return { ...meter, current };
};
