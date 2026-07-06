export type BurstAttackDefinition = {
  name: string;
  hits: number;
  damagePerHit: number;
  guardDamagePerHit: number;
  hitIntervalMs: number;
  /** Burst hits land even while the enemy is blocking. */
  ignoresBlock: boolean;
};

export type WeaponDefinition = {
  id: string;
  name: string;
  archetype: 'sword' | 'spear' | 'hammer';
  baseDamage: number;
  recoveryMs: number;
  guardDamage: number;
  heavy: {
    damageMultiplier: number;
    guardDamageMultiplier: number;
    recoveryMs: number;
  };
  burst: BurstAttackDefinition;
};

export const SWORD: WeaponDefinition = {
  id: 'sword',
  name: 'Paper Sword',
  archetype: 'sword',
  baseDamage: 10,
  recoveryMs: 420,
  guardDamage: 10,
  heavy: {
    damageMultiplier: 1.25,
    guardDamageMultiplier: 1.6,
    recoveryMs: 690,
  },
  burst: {
    name: 'Paper-Rending Combo',
    hits: 5,
    damagePerHit: 7,
    guardDamagePerHit: 8,
    hitIntervalMs: 180,
    ignoresBlock: true,
  },
};

export const WEAPONS: Record<string, WeaponDefinition> = {
  [SWORD.id]: SWORD,
};
