import { describe, expect, it } from 'vitest';
import {
  applyGuardDamage,
  createGuardMeter,
  isGuardBroken,
  regenGuard,
} from './guard';

const TUNING = { regenPerSecond: 18, regenDelayMs: 800 };
const BREAK_MS = 1400;

describe('applyGuardDamage', () => {
  it('subtracts guard without breaking above zero', () => {
    const { meter, broke } = applyGuardDamage(
      createGuardMeter(100),
      30,
      1000,
      BREAK_MS
    );
    expect(meter.current).toBe(70);
    expect(broke).toBe(false);
    expect(isGuardBroken(meter, 1000)).toBe(false);
  });

  it('breaks the guard when it reaches exactly zero', () => {
    const start = { ...createGuardMeter(100), current: 30 };
    const { meter, broke } = applyGuardDamage(start, 30, 1000, BREAK_MS);
    expect(meter.current).toBe(0);
    expect(broke).toBe(true);
    expect(isGuardBroken(meter, 1000)).toBe(true);
  });

  it('keeps the guard broken for the configured duration', () => {
    const start = { ...createGuardMeter(100), current: 10 };
    const { meter } = applyGuardDamage(start, 50, 1000, BREAK_MS);
    expect(isGuardBroken(meter, 1000 + BREAK_MS - 1)).toBe(true);
    expect(isGuardBroken(meter, 1000 + BREAK_MS)).toBe(false);
  });
});

describe('regenGuard', () => {
  it('regenerates at the configured rate once the delay passes', () => {
    const damaged = {
      ...createGuardMeter(100),
      current: 50,
      lastGuardHitAt: 0,
    };
    const meter = regenGuard(damaged, 1000, 1000, false, TUNING);
    expect(meter.current).toBeCloseTo(68);
  });

  it('does not regenerate while blocking', () => {
    const damaged = {
      ...createGuardMeter(100),
      current: 50,
      lastGuardHitAt: 0,
    };
    const meter = regenGuard(damaged, 1000, 1000, true, TUNING);
    expect(meter.current).toBe(50);
  });

  it('does not regenerate inside the post-hit delay', () => {
    const damaged = {
      ...createGuardMeter(100),
      current: 50,
      lastGuardHitAt: 500,
    };
    const meter = regenGuard(damaged, 1000, 16, false, TUNING);
    expect(meter.current).toBe(50);
  });

  it('does not regenerate while broken', () => {
    const broken = {
      ...createGuardMeter(100),
      current: 0,
      brokenUntil: 2000,
      lastGuardHitAt: 0,
    };
    const meter = regenGuard(broken, 1500, 16, false, TUNING);
    expect(meter.current).toBe(0);
  });

  it('resumes regeneration after the break expires', () => {
    const broken = {
      ...createGuardMeter(100),
      current: 0,
      brokenUntil: 2000,
      lastGuardHitAt: 600,
    };
    const meter = regenGuard(broken, 3000, 1000, false, TUNING);
    expect(meter.current).toBeCloseTo(18);
  });

  it('clamps at the maximum', () => {
    const nearlyFull = {
      ...createGuardMeter(100),
      current: 99,
      lastGuardHitAt: 0,
    };
    const meter = regenGuard(nearlyFull, 5000, 1000, false, TUNING);
    expect(meter.current).toBe(100);
  });
});
