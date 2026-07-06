import * as Phaser from 'phaser';
import type { Vec2 } from '../../shared/combat/types';
import { PAPER } from './theme';

/** Glowing shreds scattering from a point — sparks off struck silhouettes. */
export const spawnPaperFragments = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  count: number,
  color: number = PAPER.ember
): void => {
  for (let i = 0; i < count; i++) {
    const size = 5 + Math.random() * 10;
    const fragment = scene.add
      .rectangle(x, y, size, size * (0.6 + Math.random() * 0.8), color)
      .setStrokeStyle(1, PAPER.ink, 0.6)
      .setDepth(55)
      .setAngle(Math.random() * 360);
    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 90;
    scene.tweens.add({
      targets: fragment,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance + 60,
      angle: fragment.angle + (Math.random() - 0.5) * 540,
      alpha: 0,
      duration: 450 + Math.random() * 350,
      ease: 'Quad.easeOut',
      onComplete: () => fragment.destroy(),
    });
  }
};

/** Fading ink trail along a completed swipe path. */
export const drawSlashTrail = (
  scene: Phaser.Scene,
  path: readonly Vec2[],
  heavy: boolean,
  hit: boolean
): void => {
  if (path.length < 2) return;
  const first = path[0]!;
  const last = path[path.length - 1]!;
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const distance = Math.hypot(dx, dy);
  const textureKey =
    heavy && scene.textures.exists('vfx_burst_slash')
      ? 'vfx_burst_slash'
      : 'vfx_white_swipe_arc';
  if (scene.textures.exists(textureKey) && distance > 0) {
    const trail = scene.add
      .image(first.x + dx / 2, first.y + dy / 2, textureKey)
      .setDepth(54)
      .setRotation(Math.atan2(dy, dx))
      .setAlpha(hit ? 0.95 : 0.55);
    trail.setDisplaySize(distance * 1.16, heavy ? 104 : 72);
    scene.tweens.add({
      targets: trail,
      alpha: 0,
      duration: heavy ? 260 : 180,
      onComplete: () => trail.destroy(),
    });
    return;
  }
  const trail = scene.add.graphics().setDepth(54);
  trail.lineStyle(
    heavy ? 10 : 6,
    hit ? PAPER.flash : PAPER.parchment,
    hit ? 0.95 : 0.55
  );
  trail.beginPath();
  trail.moveTo(first.x, first.y);
  for (let i = 1; i < path.length; i++) {
    trail.lineTo(path[i]!.x, path[i]!.y);
  }
  trail.strokePath();
  scene.tweens.add({
    targets: trail,
    alpha: 0,
    duration: heavy ? 260 : 180,
    onComplete: () => trail.destroy(),
  });
};

/** Full-screen red pulse when the player takes damage. */
export const damageVignette = (scene: Phaser.Scene): void => {
  const overlay = scene.add
    .rectangle(640, 360, 1280, 720, PAPER.danger, 0.28)
    .setDepth(80);
  scene.tweens.add({
    targets: overlay,
    alpha: 0,
    duration: 240,
    onComplete: () => overlay.destroy(),
  });
};
