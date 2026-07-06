import * as Phaser from 'phaser';
import { PAPER } from './theme';

export type PaperRectOptions = {
  radius?: number | Phaser.Types.GameObjects.Graphics.RoundedRectRadius;
  strokeWidth?: number;
  strokeColor?: number;
  fillAlpha?: number;
};

/**
 * A hand-cut paper piece: rounded rectangle with a thick ink outline,
 * centered on (0, 0) so it drops into containers like the shape objects.
 */
export const paperRect = (
  scene: Phaser.Scene,
  width: number,
  height: number,
  color: number,
  options: PaperRectOptions = {}
): Phaser.GameObjects.Graphics => {
  const radius = options.radius ?? Math.min(10, Math.min(width, height) * 0.3);
  const g = scene.add.graphics();
  g.fillStyle(color, options.fillAlpha ?? 1);
  g.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
  if (options.strokeWidth !== 0) {
    g.lineStyle(options.strokeWidth ?? 4, options.strokeColor ?? PAPER.ink, 1);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
  }
  return g;
};

/**
 * A torn-edged parchment scrap: an irregular polygon whose edges jitter like
 * ripped paper. Centered on (0, 0).
 */
export const tornPaperRect = (
  scene: Phaser.Scene,
  width: number,
  height: number,
  color: number,
  options: {
    strokeWidth?: number;
    strokeColor?: number;
    fillAlpha?: number;
    jitter?: number;
  } = {}
): Phaser.GameObjects.Graphics => {
  const jitter = options.jitter ?? Math.min(5, Math.min(width, height) * 0.08);
  const hw = width / 2;
  const hh = height / 2;
  const j = (): number => (Math.random() - 0.5) * 2 * jitter;
  const points: { x: number; y: number }[] = [];
  const steps = Math.max(3, Math.round(width / 46));
  const stepsV = Math.max(2, Math.round(height / 40));
  for (let i = 0; i <= steps; i++)
    points.push({ x: -hw + (width * i) / steps, y: -hh + j() });
  for (let i = 1; i <= stepsV; i++)
    points.push({ x: hw + j(), y: -hh + (height * i) / stepsV });
  for (let i = 1; i <= steps; i++)
    points.push({ x: hw - (width * i) / steps, y: hh + j() });
  for (let i = 1; i < stepsV; i++)
    points.push({ x: -hw + j(), y: hh - (height * i) / stepsV });

  const g = scene.add.graphics();
  g.fillStyle(color, options.fillAlpha ?? 1);
  g.lineStyle(options.strokeWidth ?? 3, options.strokeColor ?? PAPER.ink, 1);
  g.beginPath();
  const first = points[0]!;
  g.moveTo(first.x, first.y);
  for (const p of points.slice(1)) g.lineTo(p.x, p.y);
  g.closePath();
  g.fillPath();
  if (options.strokeWidth !== 0) g.strokePath();
  return g;
};

/**
 * Invisible overlay matching a paper piece, used for hit flashes and status
 * dims (Graphics can't hot-swap fill colors the way shapes can).
 */
export const overlayRect = (
  scene: Phaser.Scene,
  width: number,
  height: number,
  color: number,
  radius?: number | Phaser.Types.GameObjects.Graphics.RoundedRectRadius
): Phaser.GameObjects.Graphics => {
  const g = paperRect(scene, width, height, color, {
    radius: radius ?? Math.min(10, Math.min(width, height) * 0.3),
    strokeWidth: 0,
  });
  g.setAlpha(0);
  return g;
};

/** Quick white pop on an overlay (or any object) — the paper "hit" flash. */
export const flashOverlay = (
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Graphics | Phaser.GameObjects.Shape,
  peakAlpha = 0.85,
  durationMs = 160
): void => {
  scene.tweens.killTweensOf(target);
  target.setAlpha(peakAlpha);
  scene.tweens.add({
    targets: target,
    alpha: 0,
    duration: durationMs,
    ease: 'Quad.easeOut',
  });
};

/** Cartoon eye: white with a big pupil. Returns the parts to add. */
export const paperEye = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale = 1
): Phaser.GameObjects.GameObject[] => {
  const white = scene.add
    .ellipse(x, y, 15 * scale, 19 * scale, 0xffffff)
    .setStrokeStyle(2.5, PAPER.ink);
  const pupil = scene.add.circle(
    x + 1.5 * scale,
    y + 1 * scale,
    4 * scale,
    PAPER.ink
  );
  return [white, pupil];
};

/** A paper-puppet joint: the little brass brad pinning two pieces together. */
export const puppetJoint = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius = 5
): Phaser.GameObjects.GameObject[] => [
  scene.add.circle(x, y, radius, PAPER.ink),
  scene.add.circle(
    x - radius * 0.25,
    y - radius * 0.25,
    radius * 0.45,
    0xcbbfa4
  ),
];

/** Small ink heart icon, centered on (0, 0). */
export const inkHeart = (
  scene: Phaser.Scene,
  color: number = PAPER.health
): Phaser.GameObjects.Graphics => {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.lineStyle(2.5, PAPER.ink, 1);
  g.fillCircle(-4.5, -3, 5.5);
  g.fillCircle(4.5, -3, 5.5);
  g.fillTriangle(-9.4, 0, 9.4, 0, 0, 11);
  g.strokeCircle(-4.5, -3, 5.5);
  g.strokeCircle(4.5, -3, 5.5);
  return g;
};

/** Small shield glyph, centered on (0, 0). */
export const inkShieldGlyph = (
  scene: Phaser.Scene,
  color: number = PAPER.guard,
  scale = 1
): Phaser.GameObjects.Graphics => {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.lineStyle(2.5, PAPER.ink, 1);
  g.beginPath();
  g.moveTo(-9 * scale, -10 * scale);
  g.lineTo(9 * scale, -10 * scale);
  g.lineTo(9 * scale, 2 * scale);
  g.lineTo(0, 12 * scale);
  g.lineTo(-9 * scale, 2 * scale);
  g.closePath();
  g.fillPath();
  g.strokePath();
  return g;
};

/** Sidestep glyph: two chevrons sweeping left, centered on (0, 0). */
export const inkDodgeGlyph = (
  scene: Phaser.Scene,
  color: number = PAPER.dodge,
  scale = 1
): Phaser.GameObjects.Graphics => {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.lineStyle(2, PAPER.ink, 1);
  for (const offset of [-3, 8]) {
    g.beginPath();
    g.moveTo((offset + 6) * scale, -10 * scale);
    g.lineTo(offset * scale, 0);
    g.lineTo((offset + 6) * scale, 10 * scale);
    g.lineTo((offset + 10) * scale, 10 * scale);
    g.lineTo((offset + 4) * scale, 0);
    g.lineTo((offset + 10) * scale, -10 * scale);
    g.closePath();
    g.fillPath();
    g.strokePath();
  }
  return g;
};

/** Four-point spark/star, centered on (0, 0). */
export const inkSpark = (
  scene: Phaser.Scene,
  color: number = PAPER.burst,
  scale = 1
): Phaser.GameObjects.Graphics => {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.lineStyle(2, PAPER.ink, 1);
  g.beginPath();
  g.moveTo(0, -12 * scale);
  g.lineTo(3 * scale, -3 * scale);
  g.lineTo(12 * scale, 0);
  g.lineTo(3 * scale, 3 * scale);
  g.lineTo(0, 12 * scale);
  g.lineTo(-3 * scale, 3 * scale);
  g.lineTo(-12 * scale, 0);
  g.lineTo(-3 * scale, -3 * scale);
  g.closePath();
  g.fillPath();
  g.strokePath();
  return g;
};

/**
 * Film-like paper overlays: tiled grain plus a soft dark vignette, rendered
 * above gameplay and HUD so every scene shares the same aged-paper finish.
 * Textures are generated once in the Preloader.
 */
export const addPaperOverlays = (scene: Phaser.Scene): void => {
  if (scene.textures.exists('grain_tile')) {
    scene.add
      .tileSprite(640, 360, 1280, 720, 'grain_tile')
      .setAlpha(0.35)
      .setDepth(150);
  }
  if (scene.textures.exists('vignette_tile')) {
    scene.add
      .image(640, 360, 'vignette_tile')
      .setDisplaySize(1280, 720)
      .setDepth(151);
  }
};
