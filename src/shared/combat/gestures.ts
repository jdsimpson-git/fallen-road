import type { GestureTuning } from '../balance/gestures';
import type {
  GestureClassification,
  GesturePoint,
  SwipeDirection,
  Vec2,
} from './types';

/** Total polyline length of the sampled path. */
export const pathLength = (points: readonly Vec2[]): number => {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
};

/**
 * Classify a net displacement into one of eight compass directions.
 * Screen coordinates: +x is right, +y is down.
 */
export const classifyDirection = (dx: number, dy: number): SwipeDirection => {
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI; // -180..180, 0 = right
  const normalized = (angle + 360) % 360;
  const sector = Math.round(normalized / 45) % 8;
  const directions: readonly SwipeDirection[] = [
    'right',
    'downRight',
    'down',
    'downLeft',
    'left',
    'upLeft',
    'up',
    'upRight',
  ];
  return directions[sector]!;
};

/**
 * Turn a raw pointer path into an attack swipe, a tap, or a rejection.
 * Direction comes from net displacement; distance and speed from the full
 * path so curved slashes still register.
 */
export const classifyGesture = (
  points: readonly GesturePoint[],
  tuning: GestureTuning
): GestureClassification => {
  if (points.length < 2) {
    const single = points[0];
    if (single) return { kind: 'tap', position: { x: single.x, y: single.y } };
    return { kind: 'none', reason: 'empty' };
  }

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const durationMs = Math.max(1, last.t - first.t);
  const distance = pathLength(points);
  const velocity = (distance / durationMs) * 1000;

  if (
    distance <= tuning.tapMaxDistance &&
    durationMs <= tuning.tapMaxDurationMs
  ) {
    return { kind: 'tap', position: { x: first.x, y: first.y } };
  }
  if (distance < tuning.minSwipeDistance) {
    return { kind: 'none', reason: 'tooShort' };
  }
  if (durationMs > tuning.maxSwipeDurationMs) {
    return { kind: 'none', reason: 'tooLong' };
  }
  if (velocity < tuning.minAvgVelocity) {
    return { kind: 'none', reason: 'tooSlow' };
  }

  const heavy =
    distance >= tuning.heavy.minDistance &&
    durationMs >= tuning.heavy.minDurationMs &&
    durationMs <= tuning.heavy.maxDurationMs;

  return {
    kind: 'swipe',
    direction: classifyDirection(last.x - first.x, last.y - first.y),
    distance,
    durationMs,
    velocity,
    heavy,
    start: { x: first.x, y: first.y },
    end: { x: last.x, y: last.y },
    path: points.map((p) => ({ x: p.x, y: p.y })),
  };
};
