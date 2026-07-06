import { describe, expect, it } from 'vitest';
import { BURST_GAINS } from '../balance/burst';
import { canActivateBurst, classifyHitBurstEvent, gainBurst } from './burst';

describe('classifyHitBurstEvent', () => {
  it('classifies a plain torso hit', () => {
    expect(classifyHitBurstEvent(false, false)).toBe('torsoHit');
  });

  it('classifies a heavy hit', () => {
    expect(classifyHitBurstEvent(false, true)).toBe('heavyHit');
  });

  it('lets weak point outrank heavy', () => {
    expect(classifyHitBurstEvent(true, true)).toBe('weakPointHit');
    expect(classifyHitBurstEvent(true, false)).toBe('weakPointHit');
  });
});

describe('gainBurst', () => {
  it('adds the configured charge per event', () => {
    expect(gainBurst(0, 'torsoHit', 100)).toBe(BURST_GAINS.torsoHit);
    expect(gainBurst(10, 'perfectCounter', 100)).toBe(
      10 + BURST_GAINS.perfectCounter
    );
    expect(gainBurst(20, 'normalBlock', 100)).toBe(
      20 + BURST_GAINS.normalBlock
    );
    expect(gainBurst(30, 'kill', 100)).toBe(30 + BURST_GAINS.kill);
  });

  it('clamps at the maximum', () => {
    expect(gainBurst(97, 'weakPointHit', 100)).toBe(100);
  });
});

describe('canActivateBurst', () => {
  it('activates only when full', () => {
    expect(canActivateBurst(99.9, 100)).toBe(false);
    expect(canActivateBurst(100, 100)).toBe(true);
  });
});
