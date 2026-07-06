import * as Phaser from 'phaser';
import type { SwipeDirection } from '../../shared/combat/types';
import { PAPER } from '../ui/theme';
import { paperRect } from '../ui/paperShapes';

const SWORD_REST = { x: 1120, y: 668, angle: -24 };
const SHIELD_REST = { x: 195, y: 795 };
const SHIELD_RAISED = { x: 290, y: 625 };

/** Swing offsets (where the sword lunges) per swipe direction. */
const SWING_VECTORS: Record<
  SwipeDirection,
  { x: number; y: number; angle: number }
> = {
  left: { x: -300, y: -60, angle: -110 },
  right: { x: 120, y: -80, angle: 40 },
  up: { x: -80, y: -260, angle: -10 },
  down: { x: -100, y: 60, angle: -120 },
  upLeft: { x: -260, y: -200, angle: -70 },
  upRight: { x: 60, y: -240, angle: 20 },
  downLeft: { x: -280, y: 20, angle: -130 },
  downRight: { x: 80, y: 20, angle: -60 },
};

/**
 * First-person hands in silhouette: a dark blade with a moonlit glint
 * bottom-right, a round shield rimmed in dusk light bottom-left. Purely
 * cosmetic — combat math lives in shared modules.
 */
export class PlayerRigView {
  private readonly sword: Phaser.GameObjects.Container;
  private readonly shield: Phaser.GameObjects.Container;
  private readonly shieldRim: Phaser.GameObjects.Arc;
  private swordBusy = false;

  constructor(private readonly scene: Phaser.Scene) {
    // Sword: supplied sprite art when present, procedural silhouette otherwise.
    this.sword = scene.add.container(SWORD_REST.x, SWORD_REST.y);
    if (scene.textures.exists('fp_sword')) {
      // Art contract (ASSETS.md): blade points up, grip sits at 85% height.
      const art = scene.add.image(0, 40, 'fp_sword').setOrigin(0.5, 0.85);
      art.setScale(310 / art.height);
      this.sword.add(art);
    } else {
      const blade = paperRect(scene, 34, 230, PAPER.blade, {
        radius: { tl: 17, tr: 17, bl: 3, br: 3 },
        strokeWidth: 2,
        strokeColor: PAPER.rim,
      });
      blade.setY(-112);
      const glint = paperRect(scene, 3.5, 200, PAPER.bladeGlint, {
        radius: 2,
        strokeWidth: 0,
        fillAlpha: 0.6,
      });
      glint.setPosition(9, -114);
      const crossGuard = paperRect(scene, 78, 16, PAPER.glove, {
        radius: 8,
        strokeWidth: 2,
        strokeColor: PAPER.rim,
      });
      crossGuard.setY(0);
      const grip = paperRect(scene, 20, 60, PAPER.glove, {
        radius: 9,
        strokeWidth: 0,
      });
      grip.setY(36);
      const fist = paperRect(scene, 46, 40, PAPER.glove, {
        radius: 16,
        strokeWidth: 2,
        strokeColor: PAPER.rim,
      });
      fist.setPosition(-2, 32);
      this.sword.add([blade, glint, crossGuard, grip, fist]);
    }
    this.sword.setAngle(SWORD_REST.angle);
    this.sword.setDepth(50);

    // Idle sway.
    scene.tweens.add({
      targets: this.sword,
      y: SWORD_REST.y + 10,
      angle: SWORD_REST.angle + 3,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Round shield: a dark disc that catches the horizon light on its rim.
    this.shield = scene.add.container(SHIELD_REST.x, SHIELD_REST.y);
    const radius = 128;
    if (scene.textures.exists('round_shield')) {
      const art = scene.add.image(0, 0, 'round_shield');
      art.setScale((radius * 2) / art.width);
      this.shield.add(art);
    } else {
      const plate = scene.add
        .circle(0, 0, radius, PAPER.enemyShield)
        .setStrokeStyle(3, PAPER.rim, 0.7);
      const inner = scene.add
        .circle(0, 0, radius * 0.7)
        .setStrokeStyle(2, PAPER.rim, 0.35);
      inner.setFillStyle(0, 0);
      const boss = scene.add
        .circle(0, 0, radius * 0.2, PAPER.glove)
        .setStrokeStyle(2, PAPER.rim, 0.5);
      this.shield.add([plate, inner, boss]);
    }
    // The glow rim is feedback, not art — it stays on both variants.
    this.shieldRim = scene.add.circle(0, 0, radius);
    this.shieldRim.setFillStyle(0, 0);
    this.shieldRim.setStrokeStyle(5, PAPER.guard, 0.9);
    this.shieldRim.setBlendMode(Phaser.BlendModes.ADD);
    this.shieldRim.setAlpha(0);
    this.shield.add(this.shieldRim);
    this.shield.setDepth(51);
  }

  /**
   * Quick sidestep: the camera lurches aside while both hands dip. Purely
   * cosmetic — evasion frames are tracked in shared combat state.
   */
  playDodge(durationMs: number): void {
    const cam = this.scene.cameras.main;
    this.scene.tweens.add({
      targets: cam,
      scrollX: -80,
      duration: durationMs * 0.45,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => cam.setScroll(0, cam.scrollY),
    });
    // One tween per hand so raiseShield's killTweensOf can't stop the sword.
    for (const hand of [this.sword, this.shield]) {
      this.scene.tweens.add({
        targets: hand,
        y: '+=34',
        duration: durationMs * 0.45,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }
  }

  swing(direction: SwipeDirection, heavy: boolean): void {
    if (this.swordBusy) this.scene.tweens.killTweensOf(this.sword);
    this.swordBusy = true;
    const vec = SWING_VECTORS[direction];
    const outMs = heavy ? 190 : 130;
    this.scene.tweens.add({
      targets: this.sword,
      x: SWORD_REST.x + vec.x * (heavy ? 1.15 : 1),
      y: SWORD_REST.y + vec.y * (heavy ? 1.15 : 1),
      angle: vec.angle,
      duration: outMs,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.sword,
          x: SWORD_REST.x,
          y: SWORD_REST.y,
          angle: SWORD_REST.angle,
          duration: 200,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.swordBusy = false;
          },
        });
      },
    });
  }

  raiseShield(): void {
    this.scene.tweens.killTweensOf(this.shield);
    this.shieldRim.setAlpha(0.85);
    this.scene.tweens.add({
      targets: this.shield,
      x: SHIELD_RAISED.x,
      y: SHIELD_RAISED.y,
      angle: -6,
      duration: 90,
      ease: 'Quad.easeOut',
    });
  }

  lowerShield(): void {
    this.scene.tweens.killTweensOf(this.shield);
    this.shieldRim.setAlpha(0);
    this.scene.tweens.add({
      targets: this.shield,
      x: SHIELD_REST.x,
      y: SHIELD_REST.y,
      angle: 0,
      duration: 160,
      ease: 'Sine.easeIn',
    });
  }

  /** Shield goes dark and drops when the player's guard breaks. */
  breakShield(): void {
    this.scene.tweens.killTweensOf(this.shield);
    this.shieldRim.setAlpha(0);
    this.scene.tweens.add({
      targets: this.shield,
      x: SHIELD_REST.x - 60,
      y: SHIELD_REST.y + 110,
      angle: -35,
      duration: 260,
      ease: 'Quad.easeIn',
    });
  }

  restoreShield(): void {
    this.lowerShield();
  }

  /** Cool ring pop when an enemy blow whiffs through a dodge. */
  evadeFlash(): void {
    const ring = this.scene.add
      .circle(this.shield.x, this.shield.y - 60, 26)
      .setStrokeStyle(5, PAPER.dodge)
      .setDepth(52)
      .setBlendMode(Phaser.BlendModes.ADD);
    ring.setFillStyle(0, 0);
    this.scene.tweens.add({
      targets: ring,
      radius: 110,
      alpha: { from: 1, to: 0 },
      duration: 300,
      onComplete: () => ring.destroy(),
    });
  }

  /** Bright flash on a successful perfect counter. */
  counterFlash(): void {
    const ring = this.scene.add
      .circle(this.shield.x, this.shield.y - 60, 30)
      .setStrokeStyle(6, PAPER.counterCue)
      .setDepth(52)
      .setBlendMode(Phaser.BlendModes.ADD);
    ring.setFillStyle(0, 0);
    this.scene.tweens.add({
      targets: ring,
      radius: 120,
      alpha: { from: 1, to: 0 },
      duration: 320,
      onComplete: () => ring.destroy(),
    });
  }
}
