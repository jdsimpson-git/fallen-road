import type { AdaptationTuning, DecisionWeights } from '../balance/enemies';
import type { SwipeDirection } from './types';

export type PatternAction =
  | {
      kind: 'attack';
      direction: SwipeDirection;
      zoneId: string | null;
      at: number;
    }
  | { kind: 'block'; at: number }
  | { kind: 'counter'; at: number };

export type PatternSignals = {
  /** Fraction of remembered actions that were attacks aimed at the head. */
  headRatio: number;
  /** Fraction of remembered actions that were attacks aimed at the torso. */
  torsoRatio: number;
  /** Fraction of remembered attacks swung horizontally (left/right). */
  horizontalRatio: number;
  /** Fraction of remembered actions that were blocks. */
  blockRatio: number;
  /** Fraction of remembered actions that were successful counters. */
  counterRatio: number;
  /** Attacks per second across the remembered attack window, 0..∞. */
  attacksPerSecond: number;
};

export const EMPTY_SIGNALS: PatternSignals = {
  headRatio: 0,
  torsoRatio: 0,
  horizontalRatio: 0,
  blockRatio: 0,
  counterRatio: 0,
  attacksPerSecond: 0,
};

const HORIZONTAL: readonly SwipeDirection[] = ['left', 'right'];

/**
 * Rolling memory of the player's last N meaningful actions (attacks, blocks,
 * successful counters). Enemies read the derived signals to bias their
 * decisions — suggestion of intelligence, capped so they stay beatable.
 */
export class PlayerPatternTracker {
  private actions: PatternAction[] = [];

  constructor(private readonly memorySize = 5) {}

  recordAttack(
    direction: SwipeDirection,
    zoneId: string | null,
    at: number
  ): void {
    this.push({ kind: 'attack', direction, zoneId, at });
  }

  recordBlock(at: number): void {
    this.push({ kind: 'block', at });
  }

  recordCounter(at: number): void {
    this.push({ kind: 'counter', at });
  }

  signals(): PatternSignals {
    const total = this.actions.length;
    if (total === 0) return EMPTY_SIGNALS;

    const attacks = this.actions.filter(
      (a): a is Extract<PatternAction, { kind: 'attack' }> =>
        a.kind === 'attack'
    );
    const headAttacks = attacks.filter((a) => a.zoneId === 'head').length;
    const torsoAttacks = attacks.filter((a) => a.zoneId === 'torso').length;
    const horizontal = attacks.filter((a) =>
      HORIZONTAL.includes(a.direction)
    ).length;
    const blocks = this.actions.filter((a) => a.kind === 'block').length;
    const counters = this.actions.filter((a) => a.kind === 'counter').length;

    let attacksPerSecond = 0;
    if (attacks.length >= 2) {
      const spanMs = attacks[attacks.length - 1]!.at - attacks[0]!.at;
      if (spanMs > 0) attacksPerSecond = ((attacks.length - 1) / spanMs) * 1000;
    }

    return {
      headRatio: headAttacks / total,
      torsoRatio: torsoAttacks / total,
      horizontalRatio: attacks.length === 0 ? 0 : horizontal / attacks.length,
      blockRatio: blocks / total,
      counterRatio: counters / total,
      attacksPerSecond,
    };
  }

  private push(action: PatternAction): void {
    this.actions.push(action);
    if (this.actions.length > this.memorySize) this.actions.shift();
  }
}

/** Attack spam saturates around 2 swipes per second. */
const spamStrength = (attacksPerSecond: number): number =>
  Math.min(1, attacksPerSecond / 2);

/**
 * Bias base decision weights toward the player's habits. Every multiplier is
 * clamped to `tuning.cap` so adaptation suggests intelligence without making
 * the enemy unbeatable.
 */
export const adaptWeights = (
  base: DecisionWeights,
  signals: PatternSignals,
  tuning: AdaptationTuning
): DecisionWeights => {
  const clamp = (multiplier: number): number =>
    Math.min(tuning.cap, Math.max(0, multiplier));
  const spam = spamStrength(signals.attacksPerSecond);
  const zoneFocus = Math.max(signals.headRatio, signals.torsoRatio);

  return {
    attack:
      base.attack * clamp(1 + signals.blockRatio * tuning.blockingBoostsAttack),
    block: base.block * clamp(1 + zoneFocus * tuning.zoneFocusBoostsBlock),
    dodge:
      base.dodge *
      clamp(
        1 +
          spam * tuning.spamBoostsDodge +
          signals.horizontalRatio * tuning.horizontalBoostsDodge
      ),
    counter: base.counter * clamp(1 + spam * tuning.spamBoostsCounter),
    wait: base.wait,
  };
};

/**
 * Bias a block-stance weight by the pattern signal it is declared to adapt
 * to (e.g. head-hunters see more high guards).
 */
export const adaptStanceWeight = (
  baseWeight: number,
  adaptToSignal: 'headRatio' | 'torsoRatio' | undefined,
  signals: PatternSignals,
  cap: number
): number => {
  if (!adaptToSignal) return baseWeight;
  const strength = signals[adaptToSignal];
  return baseWeight * Math.min(cap, 1 + strength * 2);
};
