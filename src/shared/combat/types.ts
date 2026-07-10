export type Vec2 = { x: number; y: number };

/** A sampled pointer position. `t` is a timestamp in milliseconds. */
export type GesturePoint = { x: number; y: number; t: number };

export type SwipeDirection =
  | 'right'
  | 'downRight'
  | 'down'
  | 'downLeft'
  | 'left'
  | 'upLeft'
  | 'up'
  | 'upRight';

export type GestureRejection = 'tooShort' | 'tooSlow' | 'tooLong' | 'empty';

export type SwipeGesture = {
  kind: 'swipe';
  direction: SwipeDirection;
  /** Total path length in logical pixels. */
  distance: number;
  durationMs: number;
  /** Average velocity in logical pixels per second. */
  velocity: number;
  heavy: boolean;
  start: Vec2;
  end: Vec2;
  /** The sampled path, for hit-zone intersection tests. */
  path: Vec2[];
};

export type TapGesture = { kind: 'tap'; position: Vec2 };

export type RejectedGesture = { kind: 'none'; reason: GestureRejection };

export type GestureClassification = SwipeGesture | TapGesture | RejectedGesture;

export type CircleShape = {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
};

/** Axis-aligned rectangle, defined by its center. */
export type RectShape = {
  type: 'rect';
  x: number;
  y: number;
  halfWidth: number;
  halfHeight: number;
};

export type HitZoneShape = CircleShape | RectShape;

export type ActiveHitZone = {
  id: string;
  shape: HitZoneShape;
  priority: number;
};

export type StrikeResult = {
  damage: number;
  guardDamage: number;
};

export type GuardMeter = {
  current: number;
  max: number;
  /** Timestamp until which the guard is broken. 0 when never broken. */
  brokenUntil: number;
  /** Timestamp of the last hit absorbed by this guard. Gates regeneration. */
  lastGuardHitAt: number;
};

export type DefenseInput = {
  /** Shield is currently held down. */
  holdingBlock: boolean;
  /** Timestamp of the most recent shield press (transition to held), or null. */
  lastShieldPressAt: number | null;
  guardBroken: boolean;
};

export type DefenseOutcome = 'counter' | 'block' | 'hit';

export type DodgeState = {
  /** Timestamp when the current or most recent dodge began. */
  startedAt: number;
  /** Timestamp until which the dodge grants evasion frames. 0 = idle. */
  activeUntil: number;
  /** Timestamp when the next dodge may begin. */
  readyAt: number;
};

export type BurstEvent =
  | 'torsoHit'
  | 'weakPointHit'
  | 'heavyHit'
  | 'normalBlock'
  | 'perfectCounter'
  | 'evade'
  | 'kill';
