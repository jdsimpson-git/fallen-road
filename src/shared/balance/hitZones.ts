/**
 * Hit-zone tuning. Priorities follow the design order: exposed wound (6) >
 * weapon hand (5) > head (4) > shield arm (3) > legs (2) > torso (1).
 * Phase 2 ships head, torso, weapon hand, and legs; the rest arrive with
 * later enemies.
 */
export type HitZoneBalance = {
  priority: number;
  damageMultiplier: number;
  /** Weak points award bonus burst and stronger hit feedback. */
  weakPoint: boolean;
  /** Chance to interrupt an in-progress telegraph (weapon hand). */
  interruptChance?: number;
  /** Temporary slow applied to the enemy's actions (legs). */
  slow?: { durationMs: number; factor: number };
};

export const HIT_ZONE_BALANCE: Record<string, HitZoneBalance> = {
  weaponHand: {
    priority: 5,
    damageMultiplier: 1.1,
    weakPoint: false,
    interruptChance: 0.35,
  },
  head: { priority: 4, damageMultiplier: 1.5, weakPoint: true },
  legs: {
    priority: 2,
    damageMultiplier: 1.2,
    weakPoint: false,
    slow: { durationMs: 2500, factor: 1.35 },
  },
  torso: { priority: 1, damageMultiplier: 1.0, weakPoint: false },
};

export const DEFAULT_ZONE_BALANCE: HitZoneBalance = {
  priority: 0,
  damageMultiplier: 1.0,
  weakPoint: false,
};

export const zoneBalance = (zoneId: string): HitZoneBalance =>
  HIT_ZONE_BALANCE[zoneId] ?? DEFAULT_ZONE_BALANCE;
