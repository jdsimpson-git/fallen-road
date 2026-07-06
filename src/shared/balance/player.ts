/**
 * Player base stats. All values are tuning data — combat logic must read from
 * here rather than hard-coding numbers.
 */
export const PLAYER_BALANCE = {
  maxHealth: 100,
  maxGuard: 90,
  /** Fraction of incoming damage prevented by a normal block. */
  blockDamageReduction: 0.75,
  /** A shield press within this window before impact is a perfect counter. */
  counterWindowMs: 240,
  /**
   * Durability spent per blocked hit = attack damage x this factor. The shield
   * does not recover during a duel — it refills only after winning one.
   */
  blockGuardCostFactor: 2.5,
  /** Minimum durability lost from any enemy hit caught on the shield. */
  minBlockGuardCost: 30,
  /** A shattered shield stays unusable until the next defeated foe refills it. */
  shieldDestroyedUntilNextFightMs: Number.POSITIVE_INFINITY,
  /** A dodge grants evasion frames for this long after the press. */
  dodgeDurationMs: 340,
  /** Time from one dodge press until the next dodge is available. */
  dodgeCooldownMs: 1100,
  burstMax: 100,
} as const;
