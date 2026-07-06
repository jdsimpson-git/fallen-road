import { describe, expect, it } from 'vitest';
import type { AdaptationTuning, DecisionWeights } from '../balance/enemies';
import {
  adaptStanceWeight,
  adaptWeights,
  EMPTY_SIGNALS,
  PlayerPatternTracker,
} from './patterns';

const BASE: DecisionWeights = {
  attack: 50,
  block: 20,
  dodge: 10,
  counter: 10,
  wait: 10,
};

const TUNING: AdaptationTuning = {
  cap: 1.5,
  blockingBoostsAttack: 1,
  spamBoostsDodge: 0.5,
  spamBoostsCounter: 0.8,
  horizontalBoostsDodge: 0.6,
  zoneFocusBoostsBlock: 0.5,
};

describe('PlayerPatternTracker', () => {
  it('reports empty signals before any actions', () => {
    expect(new PlayerPatternTracker().signals()).toEqual(EMPTY_SIGNALS);
  });

  it('computes zone and block ratios over remembered actions', () => {
    const tracker = new PlayerPatternTracker(5);
    tracker.recordAttack('right', 'head', 0);
    tracker.recordAttack('left', 'head', 400);
    tracker.recordAttack('up', 'head', 800);
    tracker.recordBlock(1200);
    tracker.recordBlock(1600);
    const signals = tracker.signals();
    expect(signals.headRatio).toBeCloseTo(3 / 5);
    expect(signals.blockRatio).toBeCloseTo(2 / 5);
    expect(signals.torsoRatio).toBe(0);
  });

  it('drops the oldest action once the memory is full', () => {
    const tracker = new PlayerPatternTracker(3);
    tracker.recordAttack('right', 'head', 0);
    tracker.recordAttack('right', 'torso', 100);
    tracker.recordAttack('right', 'torso', 200);
    tracker.recordAttack('right', 'torso', 300); // pushes the head hit out
    expect(tracker.signals().headRatio).toBe(0);
    expect(tracker.signals().torsoRatio).toBe(1);
  });

  it('measures horizontal swipe ratio over attacks only', () => {
    const tracker = new PlayerPatternTracker(5);
    tracker.recordAttack('left', 'torso', 0);
    tracker.recordAttack('right', 'torso', 300);
    tracker.recordAttack('down', 'torso', 600);
    tracker.recordBlock(900);
    expect(tracker.signals().horizontalRatio).toBeCloseTo(2 / 3);
  });

  it('computes attacks per second from the attack timestamps', () => {
    const tracker = new PlayerPatternTracker(5);
    tracker.recordAttack('right', 'torso', 0);
    tracker.recordAttack('right', 'torso', 500);
    tracker.recordAttack('right', 'torso', 1000);
    expect(tracker.signals().attacksPerSecond).toBeCloseTo(2);
  });

  it('records successful counters', () => {
    const tracker = new PlayerPatternTracker(4);
    tracker.recordCounter(0);
    tracker.recordCounter(500);
    tracker.recordAttack('right', 'torso', 900);
    tracker.recordAttack('right', 'torso', 1200);
    expect(tracker.signals().counterRatio).toBeCloseTo(0.5);
  });
});

describe('adaptWeights', () => {
  it('returns base weights for empty signals', () => {
    expect(adaptWeights(BASE, EMPTY_SIGNALS, TUNING)).toEqual(BASE);
  });

  it('boosts attack weight against frequent blockers, clamped at the cap', () => {
    const adapted = adaptWeights(
      BASE,
      { ...EMPTY_SIGNALS, blockRatio: 1 },
      TUNING
    );
    // 1 + 1*1 = 2, clamped to 1.5.
    expect(adapted.attack).toBeCloseTo(BASE.attack * 1.5);
  });

  it('boosts dodge for spam and horizontal habits together, clamped', () => {
    const adapted = adaptWeights(
      BASE,
      { ...EMPTY_SIGNALS, attacksPerSecond: 2, horizontalRatio: 1 },
      TUNING
    );
    // 1 + 0.5 + 0.6 = 2.1, clamped to 1.5.
    expect(adapted.dodge).toBeCloseTo(BASE.dodge * 1.5);
  });

  it('boosts counter stance against attack spam', () => {
    const adapted = adaptWeights(
      BASE,
      { ...EMPTY_SIGNALS, attacksPerSecond: 1 },
      TUNING
    );
    // Spam strength 0.5 -> 1 + 0.5*0.8 = 1.4.
    expect(adapted.counter).toBeCloseTo(BASE.counter * 1.4);
  });

  it('never changes the wait weight', () => {
    const adapted = adaptWeights(
      BASE,
      { ...EMPTY_SIGNALS, blockRatio: 1, attacksPerSecond: 3 },
      TUNING
    );
    expect(adapted.wait).toBe(BASE.wait);
  });
});

describe('adaptStanceWeight', () => {
  it('returns the base weight without an adaptation signal', () => {
    expect(
      adaptStanceWeight(40, undefined, { ...EMPTY_SIGNALS, headRatio: 1 }, 2)
    ).toBe(40);
  });

  it('raises stance weight with its signal, clamped at the cap', () => {
    const boosted = adaptStanceWeight(
      40,
      'headRatio',
      { ...EMPTY_SIGNALS, headRatio: 0.6 },
      2
    );
    // 1 + 0.6*2 = 2.2, clamped to 2.
    expect(boosted).toBeCloseTo(80);
  });
});
