import type { SwipeDirection } from '../combat/types';

export type AttackStyle = 'slash' | 'bash' | 'thrust';

export type EnemyAttackDefinition = {
  id: string;
  /** Presentation hint for the telegraph pose. */
  style: AttackStyle;
  /** Wind-up duration. The counter window is the final portion of this. */
  telegraphMs: number;
  /** Also drives the player's stamina cost when this attack is blocked. */
  damage: number;
  /** Recovery after the swing, during which the enemy is exposed. */
  recoverMs: number;
  /** Guard damage the enemy suffers when this attack is perfect-countered. */
  counterGuardDamage: number;
  /** Selection weight among the enemy's attacks. 0 = never chosen freely. */
  weight: number;
};

/**
 * A directional guard. A player strike is stopped when its target zone is
 * covered OR its swipe direction is covered; everything else slips through
 * even while the enemy is "blocking" — guessing wrong is the counterplay.
 */
export type BlockStanceDefinition = {
  id: string;
  weight: number;
  blockedZones: readonly string[];
  blockedDirections: readonly SwipeDirection[];
  /**
   * Pattern signal that raises this stance's weight (capped by adaptation
   * tuning), e.g. head-hunters should see more high guards.
   */
  adaptToSignal?: 'headRatio' | 'torsoRatio';
};

export type CounterStanceDefinition = {
  /** Visible tell (blue ring) before the stance becomes live. */
  startupMs: number;
  /** How long the riposte window stays active. */
  activeMs: number;
  /** Attack id (in `attacks`) used for the riposte after a parry. */
  riposteAttackId: string;
  /** Minimum gap between counter stances. */
  cooldownMs: number;
};

/** Behavior-weight overrides that unlock when health drops below a threshold. */
export type EnemyPhaseDefinition = {
  id: string;
  /** Activates once health/maxHealth <= this fraction. */
  healthFractionBelow: number;
  /** Multiplier on telegraph durations; below 1 means faster attacks. */
  telegraphSpeedMultiplier?: number;
  /** Multiplier on recovery durations. */
  recoverMultiplier?: number;
  weightOverrides?: Partial<DecisionWeights>;
};

export type DecisionWeights = {
  attack: number;
  block: number;
  dodge: number;
  counter: number;
  wait: number;
};

/**
 * How strongly this enemy adapts to the player's recent habits. Multipliers
 * scale a base weight by up to `cap` when the matching signal saturates.
 */
export type AdaptationTuning = {
  /** Hard cap on any adapted weight multiplier. */
  cap: number;
  /** Frequent blocking raises attack weight (guard pressure). */
  blockingBoostsAttack: number;
  /** Attack spam raises dodge weight. */
  spamBoostsDodge: number;
  /** Attack spam raises counter-stance weight. */
  spamBoostsCounter: number;
  /** Repeated horizontal swipes raise dodge weight. */
  horizontalBoostsDodge: number;
  /** Head/torso focus raises block weight (stance choice adapts separately). */
  zoneFocusBoostsBlock: number;
};

export type EnemyHitZoneDefinition =
  | {
      id: string;
      type: 'circle';
      radius: number;
      attachTo: 'head' | 'weaponHand';
    }
  | {
      id: string;
      type: 'rect';
      halfWidth: number;
      halfHeight: number;
      attachTo: 'torso' | 'legs';
    };

export type EnemyDefinition = {
  id: string;
  name: string;
  /** One-line flavor + threat descriptor for the foe-selection screen. */
  tagline: string;
  tier: 'basic' | 'advanced' | 'elite' | 'boss';
  maxHealth: number;
  maxGuard: number;
  /** Fraction of damage prevented while the enemy blocks (stance permitting). */
  blockDamageReduction: number;
  guardBreakDurationMs: number;
  /** Damage taken is multiplied by this while guard-broken or staggered. */
  guardBrokenDamageTakenMultiplier: number;
  /** Stagger after being perfect-countered. */
  staggerDurationMs: number;
  guardRegenPerSecond: number;
  guardRegenDelayMs: number;
  attacks: EnemyAttackDefinition[];
  blockStances: BlockStanceDefinition[];
  counterStance?: CounterStanceDefinition;
  phases?: EnemyPhaseDefinition[];
  behavior: {
    /** Random wait between decisions, [min, max] ms. */
    decisionIntervalMs: readonly [number, number];
    weights: DecisionWeights;
    blockDurationMs: number;
    dodgeDurationMs: number;
    /** Horizontal shift of the whole body during a side-step dodge. */
    dodgeDistance: number;
    /** Minimum gap between two defensive actions (block/dodge/counter). */
    defensiveCooldownMs: number;
    /** Idle head sway — this is what makes the head a moving weak point. */
    headBob: { amplitudeX: number; amplitudeY: number; periodMs: number };
  };
  adaptation: AdaptationTuning;
  hitZones: EnemyHitZoneDefinition[];
};

// ---------------------------------------------------------------------------
// Archetypes
// ---------------------------------------------------------------------------

export const ROAD_SOLDIER: EnemyDefinition = {
  id: 'road-soldier',
  name: 'Road Soldier',
  tagline: 'A slow blade and a basic block. Learn the rhythm.',
  tier: 'basic',
  maxHealth: 60,
  maxGuard: 50,
  blockDamageReduction: 0.8,
  guardBreakDurationMs: 2200,
  guardBrokenDamageTakenMultiplier: 1.5,
  staggerDurationMs: 900,
  guardRegenPerSecond: 10,
  guardRegenDelayMs: 1000,
  attacks: [
    {
      id: 'slash',
      style: 'slash',
      telegraphMs: 950,
      damage: 12,
      recoverMs: 900,
      counterGuardDamage: 22,
      weight: 100,
    },
  ],
  blockStances: [
    {
      id: 'center',
      weight: 100,
      blockedZones: ['torso'],
      blockedDirections: ['left', 'right'],
    },
  ],
  behavior: {
    decisionIntervalMs: [650, 1200],
    weights: { attack: 55, block: 20, dodge: 15, counter: 0, wait: 10 },
    blockDurationMs: 950,
    dodgeDurationMs: 550,
    dodgeDistance: 95,
    defensiveCooldownMs: 1600,
    headBob: { amplitudeX: 26, amplitudeY: 10, periodMs: 1900 },
  },
  adaptation: {
    cap: 1.6,
    blockingBoostsAttack: 0.5,
    spamBoostsDodge: 0.4,
    spamBoostsCounter: 0,
    horizontalBoostsDodge: 0.3,
    zoneFocusBoostsBlock: 0.4,
  },
  hitZones: [
    { id: 'head', type: 'circle', radius: 34, attachTo: 'head' },
    {
      id: 'torso',
      type: 'rect',
      halfWidth: 55,
      halfHeight: 72,
      attachTo: 'torso',
    },
  ],
};

export const SHIELD_BEARER: EnemyDefinition = {
  id: 'shield-bearer',
  name: 'Shield Bearer',
  tagline: 'A wall of paper and iron. Strike where the guard is not.',
  tier: 'advanced',
  maxHealth: 80,
  maxGuard: 90,
  blockDamageReduction: 0.85,
  guardBreakDurationMs: 2600,
  guardBrokenDamageTakenMultiplier: 1.6,
  staggerDurationMs: 900,
  guardRegenPerSecond: 14,
  guardRegenDelayMs: 900,
  attacks: [
    {
      id: 'slash',
      style: 'slash',
      telegraphMs: 1000,
      damage: 14,
      recoverMs: 950,
      counterGuardDamage: 24,
      weight: 55,
    },
    {
      id: 'shield-bash',
      style: 'bash',
      telegraphMs: 820,
      damage: 9,
      recoverMs: 1050,
      counterGuardDamage: 30,
      weight: 45,
    },
  ],
  blockStances: [
    {
      id: 'center',
      weight: 60,
      blockedZones: ['torso'],
      blockedDirections: ['left', 'right'],
      adaptToSignal: 'torsoRatio',
    },
    {
      id: 'high',
      weight: 40,
      blockedZones: ['head'],
      blockedDirections: ['down', 'downLeft', 'downRight'],
      adaptToSignal: 'headRatio',
    },
  ],
  behavior: {
    decisionIntervalMs: [700, 1250],
    weights: { attack: 45, block: 40, dodge: 0, counter: 0, wait: 15 },
    blockDurationMs: 1400,
    dodgeDurationMs: 0,
    dodgeDistance: 0,
    defensiveCooldownMs: 1200,
    headBob: { amplitudeX: 12, amplitudeY: 6, periodMs: 2300 },
  },
  adaptation: {
    cap: 1.8,
    blockingBoostsAttack: 0.6,
    spamBoostsDodge: 0,
    spamBoostsCounter: 0,
    horizontalBoostsDodge: 0,
    zoneFocusBoostsBlock: 0.7,
  },
  hitZones: [
    { id: 'head', type: 'circle', radius: 30, attachTo: 'head' },
    {
      id: 'torso',
      type: 'rect',
      halfWidth: 62,
      halfHeight: 80,
      attachTo: 'torso',
    },
    { id: 'weaponHand', type: 'circle', radius: 24, attachTo: 'weaponHand' },
    {
      id: 'legs',
      type: 'rect',
      halfWidth: 46,
      halfHeight: 34,
      attachTo: 'legs',
    },
  ],
};

export const DUELIST: EnemyDefinition = {
  id: 'duelist',
  name: 'Duelist',
  tagline: 'Weaves, sidesteps, and punishes the predictable.',
  tier: 'advanced',
  maxHealth: 55,
  maxGuard: 35,
  blockDamageReduction: 0.7,
  guardBreakDurationMs: 1800,
  guardBrokenDamageTakenMultiplier: 1.5,
  staggerDurationMs: 800,
  guardRegenPerSecond: 12,
  guardRegenDelayMs: 800,
  attacks: [
    {
      id: 'lunge',
      style: 'thrust',
      telegraphMs: 720,
      damage: 11,
      recoverMs: 650,
      counterGuardDamage: 18,
      weight: 100,
    },
    {
      id: 'riposte',
      style: 'thrust',
      telegraphMs: 380,
      damage: 16,
      recoverMs: 620,
      counterGuardDamage: 16,
      weight: 0,
    },
  ],
  blockStances: [
    {
      id: 'center',
      weight: 100,
      blockedZones: ['torso'],
      blockedDirections: ['left', 'right'],
    },
  ],
  counterStance: {
    startupMs: 260,
    activeMs: 650,
    riposteAttackId: 'riposte',
    cooldownMs: 4200,
  },
  phases: [
    {
      id: 'enraged',
      healthFractionBelow: 0.3,
      telegraphSpeedMultiplier: 0.8,
      recoverMultiplier: 0.85,
      weightOverrides: { attack: 60, counter: 25 },
    },
  ],
  behavior: {
    decisionIntervalMs: [500, 950],
    weights: { attack: 40, block: 10, dodge: 30, counter: 20, wait: 10 },
    blockDurationMs: 700,
    dodgeDurationMs: 480,
    dodgeDistance: 115,
    defensiveCooldownMs: 900,
    headBob: { amplitudeX: 34, amplitudeY: 14, periodMs: 1400 },
  },
  adaptation: {
    cap: 2.0,
    blockingBoostsAttack: 0.5,
    spamBoostsDodge: 0.6,
    spamBoostsCounter: 0.8,
    horizontalBoostsDodge: 0.6,
    zoneFocusBoostsBlock: 0.2,
  },
  hitZones: [
    { id: 'head', type: 'circle', radius: 30, attachTo: 'head' },
    {
      id: 'torso',
      type: 'rect',
      halfWidth: 46,
      halfHeight: 66,
      attachTo: 'torso',
    },
  ],
};

export const GATEKEEPER: EnemyDefinition = {
  id: 'gatekeeper',
  name: 'The Gatekeeper',
  tagline: 'The castle gates have a warden. The road ends here.',
  tier: 'boss',
  maxHealth: 240,
  maxGuard: 130,
  blockDamageReduction: 0.85,
  guardBreakDurationMs: 3000,
  guardBrokenDamageTakenMultiplier: 1.7,
  staggerDurationMs: 1000,
  guardRegenPerSecond: 16,
  guardRegenDelayMs: 900,
  attacks: [
    {
      id: 'gate-cleave',
      style: 'slash',
      telegraphMs: 1150,
      damage: 22,
      recoverMs: 1000,
      counterGuardDamage: 34,
      weight: 45,
    },
    {
      id: 'gate-slam',
      style: 'bash',
      telegraphMs: 900,
      damage: 16,
      recoverMs: 1100,
      counterGuardDamage: 40,
      weight: 30,
    },
    {
      id: 'backhand',
      style: 'thrust',
      telegraphMs: 540,
      damage: 10,
      recoverMs: 700,
      counterGuardDamage: 18,
      weight: 25,
    },
    {
      id: 'warden-riposte',
      style: 'thrust',
      telegraphMs: 400,
      damage: 18,
      recoverMs: 700,
      counterGuardDamage: 20,
      weight: 0,
    },
  ],
  blockStances: [
    {
      id: 'center',
      weight: 55,
      blockedZones: ['torso'],
      blockedDirections: ['left', 'right'],
      adaptToSignal: 'torsoRatio',
    },
    {
      id: 'high',
      weight: 45,
      blockedZones: ['head'],
      blockedDirections: ['down', 'downLeft', 'downRight'],
      adaptToSignal: 'headRatio',
    },
  ],
  counterStance: {
    startupMs: 300,
    activeMs: 600,
    riposteAttackId: 'warden-riposte',
    cooldownMs: 6000,
  },
  phases: [
    {
      id: 'gate-fury',
      healthFractionBelow: 0.55,
      telegraphSpeedMultiplier: 0.85,
      recoverMultiplier: 0.9,
      weightOverrides: { attack: 55, block: 25, counter: 12 },
    },
    {
      id: 'last-stand',
      healthFractionBelow: 0.22,
      telegraphSpeedMultiplier: 0.72,
      recoverMultiplier: 0.8,
      weightOverrides: { attack: 68, block: 12, counter: 15, wait: 5 },
    },
  ],
  behavior: {
    decisionIntervalMs: [550, 1000],
    weights: { attack: 45, block: 30, dodge: 0, counter: 10, wait: 15 },
    blockDurationMs: 1300,
    dodgeDurationMs: 0,
    dodgeDistance: 0,
    defensiveCooldownMs: 1000,
    headBob: { amplitudeX: 16, amplitudeY: 8, periodMs: 2600 },
  },
  adaptation: {
    cap: 2.0,
    blockingBoostsAttack: 0.7,
    spamBoostsDodge: 0,
    spamBoostsCounter: 0.7,
    horizontalBoostsDodge: 0,
    zoneFocusBoostsBlock: 0.8,
  },
  hitZones: [
    { id: 'head', type: 'circle', radius: 36, attachTo: 'head' },
    {
      id: 'torso',
      type: 'rect',
      halfWidth: 78,
      halfHeight: 100,
      attachTo: 'torso',
    },
    { id: 'weaponHand', type: 'circle', radius: 26, attachTo: 'weaponHand' },
    {
      id: 'legs',
      type: 'rect',
      halfWidth: 56,
      halfHeight: 40,
      attachTo: 'legs',
    },
  ],
};

export const ENEMIES: Record<string, EnemyDefinition> = {
  [ROAD_SOLDIER.id]: ROAD_SOLDIER,
  [SHIELD_BEARER.id]: SHIELD_BEARER,
  [DUELIST.id]: DUELIST,
  [GATEKEEPER.id]: GATEKEEPER,
};

/** Encounter order cycled on the road before the castle gates. */
export const GAUNTLET_ORDER: readonly string[] = [
  ROAD_SOLDIER.id,
  SHIELD_BEARER.id,
  DUELIST.id,
];

/** Road fights survived before the Gatekeeper bars the way. */
export const ROAD_FIGHTS_BEFORE_BOSS = 6;
