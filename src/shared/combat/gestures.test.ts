import { describe, expect, it } from 'vitest';
import { GESTURE_TUNING } from '../balance/gestures';
import { classifyDirection, classifyGesture, pathLength } from './gestures';
import type { GesturePoint } from './types';

const line = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  durationMs: number,
  steps = 8
): GesturePoint[] =>
  Array.from({ length: steps + 1 }, (_, i) => ({
    x: x0 + ((x1 - x0) * i) / steps,
    y: y0 + ((y1 - y0) * i) / steps,
    t: (durationMs * i) / steps,
  }));

describe('classifyDirection', () => {
  it('classifies the four cardinal directions in screen space', () => {
    expect(classifyDirection(100, 0)).toBe('right');
    expect(classifyDirection(-100, 0)).toBe('left');
    expect(classifyDirection(0, 100)).toBe('down');
    expect(classifyDirection(0, -100)).toBe('up');
  });

  it('classifies the four diagonals', () => {
    expect(classifyDirection(100, 100)).toBe('downRight');
    expect(classifyDirection(-100, 100)).toBe('downLeft');
    expect(classifyDirection(100, -100)).toBe('upRight');
    expect(classifyDirection(-100, -100)).toBe('upLeft');
  });

  it('snaps near-diagonal angles to the closest sector', () => {
    expect(classifyDirection(100, 20)).toBe('right');
    expect(classifyDirection(100, 50)).toBe('downRight');
  });
});

describe('classifyGesture', () => {
  it('accepts a fast horizontal drag as a swipe', () => {
    const result = classifyGesture(
      line(100, 300, 300, 300, 200),
      GESTURE_TUNING
    );
    expect(result.kind).toBe('swipe');
    if (result.kind !== 'swipe') return;
    expect(result.direction).toBe('right');
    expect(result.distance).toBeCloseTo(200);
    expect(result.heavy).toBe(false);
  });

  it('rejects a drag shorter than the minimum distance', () => {
    const result = classifyGesture(
      line(100, 300, 100 + GESTURE_TUNING.minSwipeDistance - 1, 300, 150),
      GESTURE_TUNING
    );
    expect(result).toEqual({ kind: 'none', reason: 'tooShort' });
  });

  it('rejects a drag that takes longer than the attack duration cap', () => {
    const result = classifyGesture(
      line(100, 300, 400, 300, GESTURE_TUNING.maxSwipeDurationMs + 100),
      GESTURE_TUNING
    );
    expect(result).toEqual({ kind: 'none', reason: 'tooLong' });
  });

  it('rejects a slow crawl below minimum average velocity', () => {
    // 80px over 600ms = 133 px/s, under the 180 px/s minimum.
    const result = classifyGesture(
      line(100, 300, 180, 300, 600),
      GESTURE_TUNING
    );
    expect(result).toEqual({ kind: 'none', reason: 'tooSlow' });
  });

  it('classifies a long deliberate drag as a heavy attack', () => {
    const result = classifyGesture(
      line(100, 300, 400, 300, 400),
      GESTURE_TUNING
    );
    expect(result.kind).toBe('swipe');
    if (result.kind !== 'swipe') return;
    expect(result.heavy).toBe(true);
  });

  it('does not mark a long but instant flick as heavy', () => {
    // Same 300px distance but faster than the heavy minimum duration.
    const result = classifyGesture(
      line(100, 300, 400, 300, 150),
      GESTURE_TUNING
    );
    expect(result.kind).toBe('swipe');
    if (result.kind !== 'swipe') return;
    expect(result.heavy).toBe(false);
  });

  it('classifies a stationary press as a tap', () => {
    const result = classifyGesture(
      [
        { x: 50, y: 60, t: 0 },
        { x: 52, y: 61, t: 90 },
      ],
      GESTURE_TUNING
    );
    expect(result.kind).toBe('tap');
  });

  it('uses full path length so curved slashes count', () => {
    // An L-shaped drag: net displacement is short but the path is long.
    const points: GesturePoint[] = [
      { x: 100, y: 100, t: 0 },
      { x: 160, y: 100, t: 100 },
      { x: 160, y: 160, t: 200 },
    ];
    expect(pathLength(points)).toBeCloseTo(120);
    const result = classifyGesture(points, GESTURE_TUNING);
    expect(result.kind).toBe('swipe');
    if (result.kind !== 'swipe') return;
    expect(result.direction).toBe('downRight');
  });

  it('rejects an empty sample list', () => {
    expect(classifyGesture([], GESTURE_TUNING)).toEqual({
      kind: 'none',
      reason: 'empty',
    });
  });
});
