export type PlayerGuardCostTuning = {
  blockGuardCostFactor: number;
  minBlockGuardCost: number;
};

export const blockedHitGuardCost = (
  damage: number,
  tuning: PlayerGuardCostTuning
): number => {
  if (damage <= 0) return 0;
  return Math.max(
    tuning.minBlockGuardCost,
    Math.round(damage * tuning.blockGuardCostFactor)
  );
};
