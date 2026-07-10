export type BurstAttackDefinition = {
  name: string;
  hits: number;
  damagePerHit: number;
  guardDamagePerHit: number;
  hitIntervalMs: number;
  /** Burst hits land even while the enemy is blocking. */
  ignoresBlock: boolean;
  /** The burst immediately breaks an enemy guard after it connects. */
  breaksGuard: boolean;
};

export type WeaponId = 'sword' | 'spear' | 'hammer' | 'dagger' | 'mace';

export type WeaponDefinition = {
  id: WeaponId;
  name: string;
  archetype: WeaponId;
  baseDamage: number;
  recoveryMs: number;
  guardDamage: number;
  /** Multiplies the radius of weak-point hit zones for this weapon. */
  weakPointHitRadiusMultiplier: number;
  /** Extra stagger caused by a heavy hit. 0 means the weapon has none. */
  heavyStaggerMs: number;
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
  weakPointHitRadiusMultiplier: 1,
  heavyStaggerMs: 0,
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
    breaksGuard: false,
  },
};

export const SPEAR: WeaponDefinition = {
  id: 'spear',
  name: 'Paper Spear',
  archetype: 'spear',
  baseDamage: 9,
  recoveryMs: 500,
  guardDamage: 8,
  weakPointHitRadiusMultiplier: 1.3,
  heavyStaggerMs: 0,
  heavy: {
    damageMultiplier: 1.4,
    guardDamageMultiplier: 1.25,
    recoveryMs: 770,
  },
  burst: {
    name: 'Piercing Thrust',
    hits: 1,
    damagePerHit: 32,
    guardDamagePerHit: 12,
    hitIntervalMs: 0,
    ignoresBlock: true,
    breaksGuard: false,
  },
};

export const HAMMER: WeaponDefinition = {
  id: 'hammer',
  name: 'Paper Hammer',
  archetype: 'hammer',
  baseDamage: 14,
  recoveryMs: 690,
  guardDamage: 18,
  weakPointHitRadiusMultiplier: 1,
  heavyStaggerMs: 450,
  heavy: {
    damageMultiplier: 1.35,
    guardDamageMultiplier: 2,
    recoveryMs: 980,
  },
  burst: {
    name: 'Full Guard Break',
    hits: 1,
    damagePerHit: 24,
    guardDamagePerHit: 999,
    hitIntervalMs: 0,
    ignoresBlock: true,
    breaksGuard: true,
  },
};

export const DAGGER: WeaponDefinition = {
  id: 'dagger',
  name: 'Paper Daggers',
  archetype: 'dagger',
  baseDamage: 7,
  recoveryMs: 280,
  guardDamage: 5,
  weakPointHitRadiusMultiplier: 1.15,
  heavyStaggerMs: 0,
  heavy: {
    damageMultiplier: 1.6,
    guardDamageMultiplier: 1.15,
    recoveryMs: 480,
  },
  burst: {
    name: 'Thousand Paper Cuts',
    hits: 7,
    damagePerHit: 4,
    guardDamagePerHit: 4,
    hitIntervalMs: 95,
    ignoresBlock: true,
    breaksGuard: false,
  },
};

export const MACE: WeaponDefinition = {
  id: 'mace',
  name: 'Paper Mace',
  archetype: 'mace',
  baseDamage: 12,
  recoveryMs: 570,
  guardDamage: 15,
  weakPointHitRadiusMultiplier: 1,
  heavyStaggerMs: 250,
  heavy: {
    damageMultiplier: 1.4,
    guardDamageMultiplier: 1.75,
    recoveryMs: 840,
  },
  burst: {
    name: 'Bell-Ringer',
    hits: 3,
    damagePerHit: 10,
    guardDamagePerHit: 22,
    hitIntervalMs: 240,
    ignoresBlock: true,
    breaksGuard: false,
  },
};

export const WEAPON_IDS: readonly WeaponId[] = [
  'sword',
  'spear',
  'hammer',
  'dagger',
  'mace',
];

export const WEAPONS: Readonly<Record<WeaponId, WeaponDefinition>> = {
  sword: SWORD,
  spear: SPEAR,
  hammer: HAMMER,
  dagger: DAGGER,
  mace: MACE,
};
