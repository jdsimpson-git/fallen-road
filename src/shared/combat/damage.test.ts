import { describe, expect, it } from 'vitest';
import { SWORD } from '../balance/weapons';
import { blockedDamage, computeStrike, guardBrokenDamage } from './damage';

describe('computeStrike', () => {
  it('deals base damage on a torso hit', () => {
    const strike = computeStrike(SWORD, 'torso', false);
    expect(strike.damage).toBe(SWORD.baseDamage);
    expect(strike.guardDamage).toBe(SWORD.guardDamage);
  });

  it('deals 1.5x damage on a head (weak point) hit', () => {
    const strike = computeStrike(SWORD, 'head', false);
    expect(strike.damage).toBe(Math.round(SWORD.baseDamage * 1.5));
  });

  it('multiplies damage and guard damage on a heavy attack', () => {
    const strike = computeStrike(SWORD, 'torso', true);
    expect(strike.damage).toBe(
      Math.round(SWORD.baseDamage * SWORD.heavy.damageMultiplier)
    );
    expect(strike.guardDamage).toBe(
      Math.round(SWORD.guardDamage * SWORD.heavy.guardDamageMultiplier)
    );
  });

  it('stacks heavy and weak-point multipliers', () => {
    const strike = computeStrike(SWORD, 'head', true);
    expect(strike.damage).toBe(
      Math.round(SWORD.baseDamage * 1.5 * SWORD.heavy.damageMultiplier)
    );
  });

  it('falls back to 1.0x for unknown zones', () => {
    const strike = computeStrike(SWORD, 'mystery-zone', false);
    expect(strike.damage).toBe(SWORD.baseDamage);
  });
});

describe('blockedDamage', () => {
  it('reduces damage by the block reduction fraction', () => {
    expect(blockedDamage(12, 0.75)).toBe(3);
    expect(blockedDamage(10, 0.8)).toBe(2);
  });

  it('lets everything through at zero reduction', () => {
    expect(blockedDamage(12, 0)).toBe(12);
  });
});

describe('guardBrokenDamage', () => {
  it('amplifies damage against a broken guard', () => {
    expect(guardBrokenDamage(10, 1.5)).toBe(15);
  });
});
