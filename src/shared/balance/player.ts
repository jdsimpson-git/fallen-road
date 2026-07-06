/**
 * Player base stats. All values are tuning data — combat logic must read from
 * here rather than hard-coding numbers.
 */
export const PLAYER_BALANCE = {
  maxHealth: 100,
  maxGuard: 100,
  /** Fraction of incoming damage prevented by a normal block. */
  blockDamageReduction: 0.75,
  /** A shield press within this window before impact is a perfect counter. */
  counterWindowMs: 240,
  /**
   * Stamina spent per blocked hit = attack damage x this factor. Stamina does
   * not regenerate during a duel — it refills only after winning one.
   */
  blockGuardCostFactor: 1.1,
  /** Blocking and counters are disabled for this long after a guard break. */
  guardBreakDurationMs: 1400,
  /** Fraction of max stamina handed back once a guard break wears off. */
  guardRestoredAfterBreakFraction: 0.35,
  /** A dodge grants evasion frames for this long after the press. */
  dodgeDurationMs: 340,
  /** Time from one dodge press until the next dodge is available. */
  dodgeCooldownMs: 1100,
  burstMax: 100,
} as const;
