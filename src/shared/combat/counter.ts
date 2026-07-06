import type { DefenseInput, DefenseOutcome } from './types';

/**
 * Resolve an enemy hit landing at `impactAt` against the player's shield
 * state. A shield press inside the final `counterWindowMs` before impact is a
 * perfect counter; a hold that began earlier is a normal block; anything else
 * takes the hit. A broken guard can do neither.
 */
export const resolveDefense = (
  input: DefenseInput,
  impactAt: number,
  counterWindowMs: number
): DefenseOutcome => {
  if (input.guardBroken) return 'hit';
  if (input.lastShieldPressAt !== null) {
    const lead = impactAt - input.lastShieldPressAt;
    if (lead >= 0 && lead <= counterWindowMs) return 'counter';
  }
  if (input.holdingBlock) return 'block';
  return 'hit';
};
