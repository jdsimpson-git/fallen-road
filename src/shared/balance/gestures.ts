/**
 * Swipe recognition thresholds, in logical pixels (1280x720 canvas) and
 * milliseconds.
 */
export const GESTURE_TUNING = {
  /** Minimum path length for a drag to register as an attack swipe. */
  minSwipeDistance: 70,
  /** Gestures slower than this are deliberate drags, not attacks. */
  maxSwipeDurationMs: 650,
  /** Minimum average speed in logical pixels per second. */
  minAvgVelocity: 180,
  /** Short, near-stationary presses classify as taps (UI / future tap mode). */
  tapMaxDistance: 12,
  tapMaxDurationMs: 250,
  heavy: {
    /** A swipe at least this long ... */
    minDistance: 220,
    /** ... with a deliberate duration in this range becomes a heavy attack. */
    minDurationMs: 260,
    maxDurationMs: 600,
  },
} as const;

export type GestureTuning = typeof GESTURE_TUNING;
