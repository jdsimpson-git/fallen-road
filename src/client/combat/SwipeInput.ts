import * as Phaser from 'phaser';
import { GESTURE_TUNING } from '../../shared/balance/gestures';
import { classifyGesture } from '../../shared/combat/gestures';
import type {
  GestureClassification,
  GesturePoint,
} from '../../shared/combat/types';

export type SwipeInputOptions = {
  /** UI hit-test — gestures starting over UI controls are ignored. */
  isBlockedAt: (x: number, y: number) => boolean;
  onGesture: (gesture: GestureClassification) => void;
};

const SAMPLE_MIN_DISTANCE = 4;
const MAX_SAMPLES = 128;

/**
 * Captures pointer paths (mouse or touch) inside the combat viewport and
 * feeds them to the shared gesture classifier. Tracks a single gesture
 * pointer so a thumb holding the shield button doesn't corrupt swipes.
 */
export class SwipeInput {
  private points: GesturePoint[] = [];
  private activePointerId: number | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: SwipeInputOptions
  ) {
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.activePointerId !== null) return;
    // The right mouse button is the desktop block control, not a swipe.
    if (pointer.rightButtonDown()) return;
    if (this.options.isBlockedAt(pointer.x, pointer.y)) return;
    this.activePointerId = pointer.id;
    this.points = [{ x: pointer.x, y: pointer.y, t: this.scene.time.now }];
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;
    const last = this.points[this.points.length - 1];
    if (!last) return;
    if (this.points.length >= MAX_SAMPLES) return;
    if (
      Math.hypot(pointer.x - last.x, pointer.y - last.y) < SAMPLE_MIN_DISTANCE
    )
      return;
    this.points.push({ x: pointer.x, y: pointer.y, t: this.scene.time.now });
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) return;
    // Releasing the right (block) button must not end an in-flight swipe.
    if (pointer.leftButtonDown()) return;
    this.points.push({ x: pointer.x, y: pointer.y, t: this.scene.time.now });
    const gesture = classifyGesture(this.points, GESTURE_TUNING);
    this.activePointerId = null;
    this.points = [];
    this.options.onGesture(gesture);
  }
}
