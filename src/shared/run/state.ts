import { WEAPONS, type WeaponDefinition, type WeaponId } from '../balance/weapons';
import type { StrikeResult } from '../combat/types';
import {
  GAMBITS,
  GAMBIT_IDS,
  gambitModifiersFor,
  type GambitDefinition,
  type GambitId,
  type GambitModifiers,
} from './gambits';

export const MAX_GAMBITS_PER_RUN = 5;

export type RunState = {
  weaponId: WeaponId;
  gambitIds: readonly GambitId[];
  /** Server-issued daily deck, retained when the scene restarts in the castle. */
  gambitDeck: readonly GambitId[];
  coins: number;
  frozenRhythmHits: number;
  rewardRound: number;
};

export type FrozenRhythmResult = {
  state: RunState;
  triggered: boolean;
};

export type MerchantOffer =
  | {
      id: 'mend';
      kind: 'heal';
      name: string;
      description: string;
      price: number;
      healing: number;
    }
  | {
      id: WeaponId;
      kind: 'weapon';
      name: string;
      description: string;
      price: number;
      weaponId: WeaponId;
    };

export const MERCHANT_OFFERS: readonly MerchantOffer[] = [
  {
    id: 'mend',
    kind: 'heal',
    name: 'Mend the Paper',
    description: 'Restore 30 health before the road takes its due.',
    price: 14,
    healing: 30,
  },
  {
    id: 'spear',
    kind: 'weapon',
    name: WEAPONS.spear.name,
    description: 'A precise thrust and a piercing Burst. Replaces your weapon.',
    price: 20,
    weaponId: 'spear',
  },
  {
    id: 'hammer',
    kind: 'weapon',
    name: WEAPONS.hammer.name,
    description: 'Slow, crushing hits with a guard-breaking Burst. Replaces your weapon.',
    price: 20,
    weaponId: 'hammer',
  },
  {
    id: 'dagger',
    kind: 'weapon',
    name: WEAPONS.dagger.name,
    description: 'Fast weak-point cuts and a seven-hit Burst. Replaces your weapon.',
    price: 18,
    weaponId: 'dagger',
  },
  {
    id: 'mace',
    kind: 'weapon',
    name: WEAPONS.mace.name,
    description: 'Crushes guard with a three-impact Burst. Replaces your weapon.',
    price: 20,
    weaponId: 'mace',
  },
];

export const createRunState = (
  options: { gambitDeck?: readonly GambitId[] } = {}
): RunState => ({
  weaponId: 'sword',
  gambitIds: [],
  gambitDeck: options.gambitDeck ?? GAMBIT_IDS,
  coins: 0,
  frozenRhythmHits: 0,
  rewardRound: 0,
});

/** Fisher-Yates deck builder used by unranked runs; dailies supply their seed. */
export const shuffledGambitDeck = (random: () => number): GambitId[] => {
  const deck = [...GAMBIT_IDS];
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = deck[index];
    deck[index] = deck[swapIndex]!;
    deck[swapIndex] = current!;
  }
  return deck;
};

export const weaponForRun = (state: RunState): WeaponDefinition =>
  WEAPONS[state.weaponId];

export const gambitsForRun = (state: RunState): readonly GambitDefinition[] =>
  state.gambitIds.map((id) => GAMBITS[id]);

export const modifiersForRun = (state: RunState): GambitModifiers =>
  gambitModifiersFor(state.gambitIds);

export const addCoins = (state: RunState, amount: number): RunState => ({
  ...state,
  coins: Math.max(0, state.coins + amount),
});

export const spendCoins = (state: RunState, amount: number): RunState | null =>
  state.coins < amount ? null : { ...state, coins: state.coins - amount };

export const equipWeapon = (state: RunState, weaponId: WeaponId): RunState => ({
  ...state,
  weaponId,
});

export const addGambit = (state: RunState, gambitId: GambitId): RunState => {
  if (
    state.gambitIds.includes(gambitId) ||
    state.gambitIds.length >= MAX_GAMBITS_PER_RUN
  ) {
    return state;
  }
  return { ...state, gambitIds: [...state.gambitIds, gambitId] };
};

/** Claims one card and advances the next reward to a fresh three-card set. */
export const claimGambit = (state: RunState, gambitId: GambitId): RunState => {
  const withGambit = addGambit(state, gambitId);
  return withGambit === state
    ? state
    : { ...withGambit, rewardRound: state.rewardRound + 1 };
};

/** Always returns three unowned Gambits when at least three remain. */
export const rewardGambitsForRun = (state: RunState): readonly GambitDefinition[] => {
  const offset = (state.rewardRound * 3) % state.gambitDeck.length;
  const ordered = [
    ...state.gambitDeck.slice(offset),
    ...state.gambitDeck.slice(0, offset),
  ];
  return ordered
    .filter((id) => !state.gambitIds.includes(id))
    .slice(0, 3)
    .map((id) => GAMBITS[id]);
};

export const modifyStrikeForRun = (
  state: RunState,
  strike: StrikeResult,
  zoneId: string,
  heavy: boolean
): StrikeResult => {
  const modifiers = modifiersForRun(state);
  const zoneMultiplier =
    zoneId === 'head'
      ? modifiers.headDamageMultiplier
      : zoneId === 'torso'
        ? modifiers.torsoDamageMultiplier
        : 1;
  return {
    damage: Math.round(strike.damage * modifiers.damageMultiplier * zoneMultiplier),
    guardDamage: Math.round(
      strike.guardDamage * (heavy ? modifiers.heavyGuardDamageMultiplier : 1)
    ),
  };
};

/** Advances Frozen Rhythm only when the Gambit is owned. */
export const advanceFrozenRhythm = (state: RunState): FrozenRhythmResult => {
  if (!modifiersForRun(state).frozenRhythm) return { state, triggered: false };
  const nextHits = state.frozenRhythmHits + 1;
  const triggered = nextHits >= 3;
  return {
    state: { ...state, frozenRhythmHits: triggered ? 0 : nextHits },
    triggered,
  };
};
