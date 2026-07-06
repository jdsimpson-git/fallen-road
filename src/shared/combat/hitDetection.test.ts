import { describe, expect, it } from 'vitest';
import {
  resolveHit,
  segmentIntersectsCircle,
  segmentIntersectsRect,
} from './hitDetection';
import type { ActiveHitZone } from './types';

const headAt = (x: number, y: number): ActiveHitZone => ({
  id: 'head',
  shape: { type: 'circle', x, y, radius: 34 },
  priority: 4,
});

const torsoAt = (x: number, y: number): ActiveHitZone => ({
  id: 'torso',
  shape: { type: 'rect', x, y, halfWidth: 55, halfHeight: 72 },
  priority: 1,
});

describe('segment primitives', () => {
  it('detects a segment crossing a circle', () => {
    expect(
      segmentIntersectsCircle(
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { type: 'circle', x: 50, y: 20, radius: 25 }
      )
    ).toBe(true);
  });

  it('rejects a segment passing outside a circle', () => {
    expect(
      segmentIntersectsCircle(
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { type: 'circle', x: 50, y: 40, radius: 25 }
      )
    ).toBe(false);
  });

  it('detects a segment crossing straight through a rect', () => {
    expect(
      segmentIntersectsRect(
        { x: -100, y: 0 },
        { x: 100, y: 0 },
        { type: 'rect', x: 0, y: 0, halfWidth: 20, halfHeight: 20 }
      )
    ).toBe(true);
  });

  it('detects a segment fully inside a rect', () => {
    expect(
      segmentIntersectsRect(
        { x: -5, y: -5 },
        { x: 5, y: 5 },
        { type: 'rect', x: 0, y: 0, halfWidth: 20, halfHeight: 20 }
      )
    ).toBe(true);
  });

  it('rejects a segment that misses a rect', () => {
    expect(
      segmentIntersectsRect(
        { x: -100, y: 50 },
        { x: 100, y: 50 },
        { type: 'rect', x: 0, y: 0, halfWidth: 20, halfHeight: 20 }
      )
    ).toBe(false);
  });
});

describe('resolveHit', () => {
  it('returns null when the swipe misses everything', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
    ];
    expect(resolveHit(path, [headAt(600, 300), torsoAt(600, 450)])).toBeNull();
  });

  it('hits the torso with a swipe through the body', () => {
    const path = [
      { x: 500, y: 450 },
      { x: 700, y: 450 },
    ];
    const hit = resolveHit(path, [headAt(600, 300), torsoAt(600, 450)]);
    expect(hit?.id).toBe('torso');
  });

  it('prefers the head when the swipe crosses both zones', () => {
    // A vertical slash down the middle passes through head then torso.
    const path = [
      { x: 600, y: 250 },
      { x: 600, y: 500 },
    ];
    const hit = resolveHit(path, [headAt(600, 300), torsoAt(600, 450)]);
    expect(hit?.id).toBe('head');
  });

  it('misses the head after it moves out of the swipe path', () => {
    const path = [
      { x: 550, y: 300 },
      { x: 650, y: 300 },
    ];
    // Head bobbed 80px to the right: the same swipe now only grazes air.
    expect(resolveHit(path, [headAt(720, 380)])).toBeNull();
  });

  it('hits the moved head when the swipe tracks it', () => {
    const path = [
      { x: 670, y: 380 },
      { x: 770, y: 380 },
    ];
    expect(resolveHit(path, [headAt(720, 380)])?.id).toBe('head');
  });
});
