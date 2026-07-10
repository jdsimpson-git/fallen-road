/**
 * Run-only upgrades. Each Gambit makes a visible combat trade rather than
 * simply inflating every number, so choosing one changes how a duel feels.
 */
export const GAMBIT_IDS = [
  'glass-counter',
  'brittle-giant',
  'frozen-rhythm',
  'last-stand',
  'reckless-focus',
  'open-guard',
  'quickening-thread',
  'iron-veins',
  'menders-knot',
  'sundering-blow',
  'ashen-pact',
  'blood-edge',
  'iron-patience',
  'ember-debt',
  'second-wind',
] as const;

export type GambitId = (typeof GAMBIT_IDS)[number];

export type GambitModifiers = {
  damageMultiplier: number;
  headDamageMultiplier: number;
  torsoDamageMultiplier: number;
  heavyGuardDamageMultiplier: number;
  counterGuardDamageMultiplier: number;
  attackRecoveryMultiplier: number;
  maxGuardMultiplier: number;
  blockDamageReductionMultiplier: number;
  lowHealthBurstGainMultiplier: number;
  healingReceivedMultiplier: number;
  directDamageHealingFraction: number;
  blockedHitSelfDamage: number;
  attackBurstGainMultiplier: number;
  counterGuardRestore: number;
  burstDamageMultiplier: number;
  burstHealthCost: number;
  secondWindHealing: number;
  failedCounterBreaksGuard: boolean;
  frozenRhythm: boolean;
};

export type GambitDefinition = {
  id: GambitId;
  name: string;
  benefit: string;
  drawback: string;
  modifiers: Partial<GambitModifiers>;
};

export const DEFAULT_GAMBIT_MODIFIERS: GambitModifiers = {
  damageMultiplier: 1,
  headDamageMultiplier: 1,
  torsoDamageMultiplier: 1,
  heavyGuardDamageMultiplier: 1,
  counterGuardDamageMultiplier: 1,
  attackRecoveryMultiplier: 1,
  maxGuardMultiplier: 1,
  blockDamageReductionMultiplier: 1,
  lowHealthBurstGainMultiplier: 1,
  healingReceivedMultiplier: 1,
  directDamageHealingFraction: 0,
  blockedHitSelfDamage: 0,
  attackBurstGainMultiplier: 1,
  counterGuardRestore: 0,
  burstDamageMultiplier: 1,
  burstHealthCost: 0,
  secondWindHealing: 0,
  failedCounterBreaksGuard: false,
  frozenRhythm: false,
};

export const GAMBITS: Record<GambitId, GambitDefinition> = {
  'glass-counter': {
    id: 'glass-counter',
    name: 'Glass Counter',
    benefit: 'Perfect counters deal double guard damage.',
    drawback: 'A blocked hit shatters your guard.',
    modifiers: {
      counterGuardDamageMultiplier: 2,
      failedCounterBreaksGuard: true,
    },
  },
  'brittle-giant': {
    id: 'brittle-giant',
    name: 'Brittle Giant',
    benefit: 'Heavy attacks deal 60% more guard damage.',
    drawback: 'Maximum guard is reduced by 25%.',
    modifiers: {
      heavyGuardDamageMultiplier: 1.6,
      maxGuardMultiplier: 0.75,
    },
  },
  'frozen-rhythm': {
    id: 'frozen-rhythm',
    name: 'Frozen Rhythm',
    benefit: 'Every third direct hit slows the foe.',
    drawback: 'Attack recovery is 12% longer.',
    modifiers: {
      frozenRhythm: true,
      attackRecoveryMultiplier: 1.12,
    },
  },
  'last-stand': {
    id: 'last-stand',
    name: 'Last Stand',
    benefit: 'Below 30% health, Burst gain is doubled.',
    drawback: 'All healing is reduced by 35%.',
    modifiers: {
      lowHealthBurstGainMultiplier: 2,
      healingReceivedMultiplier: 0.65,
    },
  },
  'reckless-focus': {
    id: 'reckless-focus',
    name: 'Reckless Focus',
    benefit: 'Head hits deal 35% more damage.',
    drawback: 'Torso hits deal 15% less damage.',
    modifiers: {
      headDamageMultiplier: 1.35,
      torsoDamageMultiplier: 0.85,
    },
  },
  'open-guard': {
    id: 'open-guard',
    name: 'Open Guard',
    benefit: 'All direct attacks deal 20% more damage.',
    drawback: 'Normal blocks prevent 40% less damage.',
    modifiers: {
      damageMultiplier: 1.2,
      blockDamageReductionMultiplier: 0.6,
    },
  },
  'quickening-thread': {
    id: 'quickening-thread',
    name: 'Quickening Thread',
    benefit: 'Attack recovery is 18% faster.',
    drawback: 'Maximum guard is reduced by 15%.',
    modifiers: {
      attackRecoveryMultiplier: 0.82,
      maxGuardMultiplier: 0.85,
    },
  },
  'iron-veins': {
    id: 'iron-veins',
    name: 'Iron Veins',
    benefit: 'Maximum guard is increased by 25%.',
    drawback: 'Direct damage is reduced by 10%.',
    modifiers: {
      maxGuardMultiplier: 1.25,
      damageMultiplier: 0.9,
    },
  },
  'menders-knot': {
    id: 'menders-knot',
    name: "Mender's Knot",
    benefit: 'All healing is increased by 45%.',
    drawback: 'Attack recovery is 10% longer.',
    modifiers: {
      healingReceivedMultiplier: 1.45,
      attackRecoveryMultiplier: 1.1,
    },
  },
  'sundering-blow': {
    id: 'sundering-blow',
    name: 'Sundering Blow',
    benefit: 'Heavy attacks deal 30% more guard damage.',
    drawback: 'All healing is reduced by 20%.',
    modifiers: {
      heavyGuardDamageMultiplier: 1.3,
      healingReceivedMultiplier: 0.8,
    },
  },
  'ashen-pact': {
    id: 'ashen-pact',
    name: 'Ashen Pact',
    benefit: 'Low-health Burst gain is tripled.',
    drawback: 'Normal blocks prevent 25% less damage.',
    modifiers: {
      lowHealthBurstGainMultiplier: 3,
      blockDamageReductionMultiplier: 0.75,
    },
  },
  'blood-edge': {
    id: 'blood-edge',
    name: 'Blood Edge',
    benefit: 'Direct hits restore health equal to 8% of damage dealt.',
    drawback: 'Every normal block cuts through for 2 extra health.',
    modifiers: {
      directDamageHealingFraction: 0.08,
      blockedHitSelfDamage: 2,
    },
  },
  'iron-patience': {
    id: 'iron-patience',
    name: 'Iron Patience',
    benefit: 'Perfect counters restore 18 guard.',
    drawback: 'Direct attacks generate 30% less Burst.',
    modifiers: {
      counterGuardRestore: 18,
      attackBurstGainMultiplier: 0.7,
    },
  },
  'ember-debt': {
    id: 'ember-debt',
    name: 'Ember Debt',
    benefit: 'Weapon Bursts deal 35% more damage.',
    drawback: 'Unleashing a Burst costs 8 health.',
    modifiers: {
      burstDamageMultiplier: 1.35,
      burstHealthCost: 8,
    },
  },
  'second-wind': {
    id: 'second-wind',
    name: 'Second Wind',
    benefit: 'Your first guard break in each duel restores 22 health.',
    drawback: 'Maximum guard is reduced by 20%.',
    modifiers: {
      secondWindHealing: 22,
      maxGuardMultiplier: 0.8,
    },
  },
};

export const gambitModifiersFor = (
  gambitIds: readonly GambitId[]
): GambitModifiers => {
  const modifiers: GambitModifiers = { ...DEFAULT_GAMBIT_MODIFIERS };
  for (const id of gambitIds) {
    const next = GAMBITS[id].modifiers;
    if (next.damageMultiplier !== undefined)
      modifiers.damageMultiplier *= next.damageMultiplier;
    if (next.headDamageMultiplier !== undefined)
      modifiers.headDamageMultiplier *= next.headDamageMultiplier;
    if (next.torsoDamageMultiplier !== undefined)
      modifiers.torsoDamageMultiplier *= next.torsoDamageMultiplier;
    if (next.heavyGuardDamageMultiplier !== undefined)
      modifiers.heavyGuardDamageMultiplier *= next.heavyGuardDamageMultiplier;
    if (next.counterGuardDamageMultiplier !== undefined)
      modifiers.counterGuardDamageMultiplier *= next.counterGuardDamageMultiplier;
    if (next.attackRecoveryMultiplier !== undefined)
      modifiers.attackRecoveryMultiplier *= next.attackRecoveryMultiplier;
    if (next.maxGuardMultiplier !== undefined)
      modifiers.maxGuardMultiplier *= next.maxGuardMultiplier;
    if (next.blockDamageReductionMultiplier !== undefined)
      modifiers.blockDamageReductionMultiplier *= next.blockDamageReductionMultiplier;
    if (next.lowHealthBurstGainMultiplier !== undefined)
      modifiers.lowHealthBurstGainMultiplier *= next.lowHealthBurstGainMultiplier;
    if (next.healingReceivedMultiplier !== undefined)
      modifiers.healingReceivedMultiplier *= next.healingReceivedMultiplier;
    if (next.directDamageHealingFraction !== undefined)
      modifiers.directDamageHealingFraction += next.directDamageHealingFraction;
    if (next.blockedHitSelfDamage !== undefined)
      modifiers.blockedHitSelfDamage += next.blockedHitSelfDamage;
    if (next.attackBurstGainMultiplier !== undefined)
      modifiers.attackBurstGainMultiplier *= next.attackBurstGainMultiplier;
    if (next.counterGuardRestore !== undefined)
      modifiers.counterGuardRestore += next.counterGuardRestore;
    if (next.burstDamageMultiplier !== undefined)
      modifiers.burstDamageMultiplier *= next.burstDamageMultiplier;
    if (next.burstHealthCost !== undefined)
      modifiers.burstHealthCost += next.burstHealthCost;
    if (next.secondWindHealing !== undefined)
      modifiers.secondWindHealing += next.secondWindHealing;
    modifiers.failedCounterBreaksGuard ||= next.failedCounterBreaksGuard === true;
    modifiers.frozenRhythm ||= next.frozenRhythm === true;
  }
  return modifiers;
};
