import { describe, expect, it } from 'vitest';
import { applyGuardDamage, createGuardMeter, isGuardBroken } from './guard';
import { blockedHitGuardCost } from './playerGuard';

const TUNING = {
  blockGuardCostFactor: 2.5,
  minBlockGuardCost: 30,
};

describe('blockedHitGuardCost', () => {
  it('drains at least the minimum durability for weak blocked hits', () => {
    expect(blockedHitGuardCost(9, TUNING)).toBe(30);
  });

  it('scales durability loss for heavy blocked hits', () => {
    expect(blockedHitGuardCost(22, TUNING)).toBe(55);
  });

  it('does not drain durability for non-damaging hits', () => {
    expect(blockedHitGuardCost(0, TUNING)).toBe(0);
  });

  it('shatters a fresh shield on the third common blocked hit', () => {
    const breakMs = Number.POSITIVE_INFINITY;
    const cost = blockedHitGuardCost(12, TUNING);
    const first = applyGuardDamage(createGuardMeter(90), cost, 1000, breakMs);
    const second = applyGuardDamage(first.meter, cost, 2000, breakMs);
    const third = applyGuardDamage(second.meter, cost, 3000, breakMs);

    expect(first.meter.current).toBe(60);
    expect(second.meter.current).toBe(30);
    expect(third.meter.current).toBe(0);
    expect(third.broke).toBe(true);
    expect(isGuardBroken(third.meter, 10_000)).toBe(true);
  });
});
