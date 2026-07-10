import * as Phaser from 'phaser';
import { PAPER } from './theme';
import { addPaperOverlays } from './paperShapes';

/** Horizon line: the road vanishes here, at the tower gate. */
export const HORIZON_Y = 460;

/**
 * Backdrop pieces the battle scene animates as the run progresses: the tower
 * swells while fights are won, then the castle gate fades in for the boss.
 * Either handle is null when its art wasn't supplied (procedural fallback).
 */
export type BackdropHandles = {
  tower: Phaser.GameObjects.Image | null;
  gate: Phaser.GameObjects.Image | null;
  towerAura: Phaser.GameObjects.Ellipse | null;
  roadGlow: Phaser.GameObjects.Graphics | null;
};

const lastRoadsideSides = new WeakMap<Phaser.Scene, -1 | 1>();

/**
 * A solid pine-tree silhouette centered on its trunk base at (0, 0).
 * Supplied 'pine_silhouette' art (normalized to `height`) replaces the
 * procedural shape; a container keeps caller scaling identical for both
 * variants.
 */
export const pineSilhouette = (
  scene: Phaser.Scene,
  color: number,
  height = 150
): Phaser.GameObjects.Graphics | Phaser.GameObjects.Container => {
  if (scene.textures.exists('pine_silhouette')) {
    const image = scene.add.image(0, 0, 'pine_silhouette').setOrigin(0.5, 1);
    image.setScale(height / image.height);
    return scene.add.container(0, 0, [image]);
  }
  const g = scene.add.graphics();
  const w = height * 0.52;
  g.fillStyle(color, 1);
  g.fillRect(-height * 0.035, -height * 0.16, height * 0.07, height * 0.16);
  const tiers: Array<[number, number, number]> = [
    [1, 0.42, -0.1],
    [0.78, 0.38, -0.4],
    [0.55, 0.34, -0.66],
  ];
  for (const [tw, th, ty] of tiers) {
    g.fillTriangle(
      (-w / 2) * tw,
      height * ty,
      (w / 2) * tw,
      height * ty,
      0,
      height * (ty - th)
    );
  }
  return g;
};

/** Jagged tree-line strip along the horizon, from x0 to x1. */
const treeLineStrip = (
  scene: Phaser.Scene,
  x0: number,
  x1: number,
  baseY: number
): void => {
  const g = scene.add.graphics();
  g.fillStyle(PAPER.treeLine, 1);
  g.beginPath();
  g.moveTo(x0, baseY + 24);
  let x = x0;
  let up = true;
  while (x < x1) {
    const step = 26 + Math.random() * 30;
    const peak = up
      ? baseY - 26 - Math.random() * 30
      : baseY - 6 - Math.random() * 10;
    g.lineTo(Math.min(x1, x + step / 2), peak);
    x += step;
    g.lineTo(Math.min(x1, x), up ? baseY - 10 : baseY - 18);
    up = !up;
  }
  g.lineTo(x1, baseY + 24);
  g.closePath();
  g.fillPath();
};

/** The dark tower waiting at the end of the road. */
const darkTower = (scene: Phaser.Scene): void => {
  const g = scene.add.graphics();
  g.fillStyle(PAPER.tower, 1);
  // Buttressed base astride the road's end.
  g.fillTriangle(560, HORIZON_Y + 4, 640, 330, 610, HORIZON_Y + 4);
  g.fillTriangle(720, HORIZON_Y + 4, 640, 330, 670, HORIZON_Y + 4);
  g.fillRect(602, 250, 76, HORIZON_Y - 246);
  // Tapering spire.
  g.beginPath();
  g.moveTo(602, 258);
  g.lineTo(612, 196);
  g.lineTo(632, 168);
  g.lineTo(640, 128);
  g.lineTo(648, 168);
  g.lineTo(668, 196);
  g.lineTo(678, 258);
  g.closePath();
  g.fillPath();
  // Battlement teeth.
  for (const bx of [598, 622, 646, 670]) g.fillRect(bx, 240, 12, 14);
  // Side turret.
  g.fillRect(676, 330, 26, HORIZON_Y - 326);
  g.fillTriangle(674, 332, 704, 332, 689, 300);
  // Gate: a faint warm slit where the road meets the base.
  g.fillStyle(0x000000, 0.9);
  g.fillRect(630, HORIZON_Y - 26, 20, 26);

  // Lit windows with additive halos.
  for (const [wx, wy, r] of [
    [640, 210, 3],
    [628, 300, 2.5],
    [652, 336, 2.5],
    [689, 352, 2],
  ] as const) {
    scene.add
      .circle(wx, wy, r, PAPER.towerWindow)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.add
      .circle(wx, wy, r * 3.4, PAPER.towerWindow, 0.22)
      .setBlendMode(Phaser.BlendModes.ADD);
  }
  // Faint warm glow bleeding from the gate.
  scene.add
    .ellipse(640, HORIZON_Y - 8, 44, 18, PAPER.towerWindow, 0.16)
    .setBlendMode(Phaser.BlendModes.ADD);
};

/** Drifting ember motes rising from the roadside. */
const startEmbers = (scene: Phaser.Scene): void => {
  scene.time.addEvent({
    delay: 380,
    loop: true,
    callback: () => {
      const x = 90 + Math.random() * 1100;
      const y = HORIZON_Y + 30 + Math.random() * 220;
      const ember = scene.add
        .circle(x, y, 1.4 + Math.random() * 1.8, PAPER.ember, 0.9)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0);
      scene.tweens.add({
        targets: ember,
        alpha: { from: 0.85, to: 0 },
        y: y - 70 - Math.random() * 90,
        x: x + (Math.random() - 0.5) * 70,
        duration: 1900 + Math.random() * 900,
        ease: 'Sine.easeOut',
        onComplete: () => ember.destroy(),
      });
    },
  });
};

/**
 * One roadside silhouette rushing past — called on a timer while traveling
 * to sell forward motion down the road.
 */
export const spawnRoadsideDrift = (scene: Phaser.Scene, intensity = 0): void => {
  const previous = lastRoadsideSides.get(scene) ?? -1;
  const side: -1 | 1 = Math.random() < 0.78 ? (previous === -1 ? 1 : -1) : previous;
  lastRoadsideSides.set(scene, side);
  const nearLane = Math.random() < 0.56;
  spawnDriftingPine(scene, side, nearLane, intensity, 0);
  if (Math.random() < 0.2) {
    spawnDriftingPine(scene, side, false, intensity, 110 + Math.random() * 90);
  }
};

const spawnDriftingPine = (
  scene: Phaser.Scene,
  side: -1 | 1,
  nearLane: boolean,
  intensity: number,
  delay: number
): void => {
  const height = nearLane ? 150 + Math.random() * 45 : 100 + Math.random() * 38;
  const startSpread = nearLane ? 66 + Math.random() * 24 : 46 + Math.random() * 18;
  const endSpread =
    (nearLane ? 600 + Math.random() * 190 : 410 + Math.random() * 130) +
    intensity * 70;
  const endScale =
    (nearLane ? 1.8 + Math.random() * 0.72 : 0.9 + Math.random() * 0.45) +
    intensity * (nearLane ? 0.3 : 0.12);
  const baseDuration = nearLane
    ? 1850 + Math.random() * 520
    : 2850 + Math.random() * 680;
  const duration = baseDuration * (1 - intensity * 0.2);
  const tree = pineSilhouette(scene, PAPER.nearTree, height);
  tree
    .setPosition(640 + side * startSpread, HORIZON_Y + (nearLane ? 10 : 2))
    .setScale(nearLane ? 0.11 : 0.07)
    .setAngle(-side * (1.5 + Math.random() * 2.5))
    .setAlpha(nearLane ? 0.97 : 0.7)
    .setDepth(nearLane ? 4 : 2);
  scene.tweens.add({
    targets: tree,
    x: 640 + side * endSpread,
    y: nearLane ? 770 : 728,
    scale: endScale,
    angle: side * (4 + Math.random() * 4),
    alpha: nearLane ? 1 : 0.88,
    delay,
    duration,
    ease: 'Cubic.easeIn',
    onComplete: () => tree.destroy(),
  });
};

/** Perspective flecks sliding underfoot make the painted road feel traversed. */
export const spawnRoadMark = (scene: Phaser.Scene, intensity = 0): void => {
  const lane = (Math.random() * 2 - 1) * 0.86;
  const startX = 640 + lane * 36;
  const endX = 640 + lane * 310;
  const mark = scene.add
    .rectangle(
      startX,
      HORIZON_Y + 8,
      2,
      7,
      PAPER.rim,
      0.2 + intensity * 0.1
    )
    .setDepth(1)
    .setAngle((Math.atan2(280, endX - startX) * 180) / Math.PI - 90);
  scene.tweens.add({
    targets: mark,
    x: endX,
    y: 738,
    scaleX: 3.5 + Math.random() * 2,
    scaleY: 8 + Math.random() * 5,
    alpha: 0,
    duration: (1250 + Math.random() * 480) * (1 - intensity * 0.28),
    ease: 'Cubic.easeIn',
    onComplete: () => mark.destroy(),
  });
};

/**
 * Twilight road to the dark tower. Layered silhouettes, back to front: sky,
 * dying sun, far hills, the tower, flanking tree lines, ground, the road
 * (which ends at the tower gate), near trees, fog, and embers.
 */
export const buildBackdrop = (scene: Phaser.Scene): BackdropHandles => {
  // Sky. Painted art covers the band above the horizon at its own aspect
  // (sides crop); the procedural gradient stretches over the full screen.
  if (scene.registry.get('skyIsArt') === true) {
    const frame = scene.textures.getFrame('sky_painting');
    const cover = Math.max(1280 / frame.width, (HORIZON_Y + 40) / frame.height);
    scene.add
      .image(640, 0, 'sky_painting')
      .setOrigin(0.5, 0)
      .setDisplaySize(frame.width * cover, frame.height * cover);
  } else {
    scene.add.image(640, 360, 'sky_painting').setDisplaySize(1280, 720);
  }

  // Dying sun, low over the horizon.
  scene.add
    .circle(985, 395, 46, PAPER.sunGlow, 0.85)
    .setBlendMode(Phaser.BlendModes.ADD);
  scene.add
    .circle(985, 395, 78, PAPER.sunGlow, 0.2)
    .setBlendMode(Phaser.BlendModes.ADD);
  const sunHalo = scene.add
    .circle(985, 395, 130, PAPER.sunGlow, 0.08)
    .setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({
    targets: sunHalo,
    alpha: { from: 0.55, to: 1 },
    scale: { from: 0.96, to: 1.06 },
    duration: 4200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // Far rolling hills.
  const hills = scene.add.graphics();
  hills.fillStyle(PAPER.farHill, 1);
  hills.beginPath();
  hills.moveTo(-20, HORIZON_Y + 10);
  hills.lineTo(-20, 430);
  for (let x = -20; x < 1320; x += 160) {
    hills.arc(x + 80, 432, 84, Math.PI, 0, false);
  }
  hills.lineTo(1320, HORIZON_Y + 10);
  hills.closePath();
  hills.fillPath();

  // A dim destination glow grows after each victory and blooms at the gates.
  const towerAura = scene.add
    .ellipse(640, HORIZON_Y - 20, 180, 120, PAPER.towerWindow, 0.1)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(0.42);
  scene.tweens.add({
    targets: towerAura,
    y: { from: HORIZON_Y - 23, to: HORIZON_Y - 17 },
    duration: 2300,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // Supplied tower art sits with its base on the horizon; else the drawn one.
  let tower: Phaser.GameObjects.Image | null = null;
  if (scene.textures.exists('dark_tower')) {
    tower = scene.add
      .image(640, HORIZON_Y + 4, 'dark_tower')
      .setOrigin(0.5, 1)
      .setScale(0.38)
      .setAlpha(0.88);
  } else {
    darkTower(scene);
  }

  // The castle gate waits invisible at the road's end until the boss approach.
  let gate: Phaser.GameObjects.Image | null = null;
  if (scene.textures.exists('castle_gate')) {
    gate = scene.add
      .image(640, HORIZON_Y + 4, 'castle_gate')
      .setOrigin(0.5, 1)
      .setAlpha(0);
    gate.setScale(620 / gate.width);
  }

  // Tree lines flank the road corridor — never under it.
  treeLineStrip(scene, -40, 566, HORIZON_Y - 2);
  treeLineStrip(scene, 714, 1320, HORIZON_Y - 2);

  // Ground plane.
  scene.add.rectangle(
    640,
    (HORIZON_Y + 724) / 2,
    1280,
    724 - HORIZON_Y + 8,
    PAPER.ground
  );

  // The road: begins at the tower gate on the horizon, widens to the player.
  const road = scene.add.graphics();
  road.fillStyle(PAPER.road, 1);
  road.beginPath();
  road.moveTo(300, 724);
  road.lineTo(980, 724);
  road.lineTo(682, HORIZON_Y);
  road.lineTo(598, HORIZON_Y);
  road.closePath();
  road.fillPath();
  // Worn center track.
  road.fillStyle(PAPER.roadCenter, 0.55);
  road.beginPath();
  road.moveTo(470, 724);
  road.lineTo(810, 724);
  road.lineTo(661, HORIZON_Y + 6);
  road.lineTo(619, HORIZON_Y + 6);
  road.closePath();
  road.fillPath();
  // Faint edge light.
  road.lineStyle(2, PAPER.rim, 0.18);
  road.lineBetween(300, 724, 598, HORIZON_Y);
  road.lineBetween(980, 724, 682, HORIZON_Y);

  // Warm light catches the road center as the destination draws nearer.
  const roadGlow = scene.add.graphics().setDepth(1).setAlpha(0.045);
  roadGlow.fillStyle(PAPER.towerWindow, 1);
  roadGlow.beginPath();
  roadGlow.moveTo(617, HORIZON_Y + 3);
  roadGlow.lineTo(663, HORIZON_Y + 3);
  roadGlow.lineTo(770, 724);
  roadGlow.lineTo(510, 724);
  roadGlow.closePath();
  roadGlow.fillPath();
  roadGlow.setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({
    targets: roadGlow,
    y: { from: -2, to: 3 },
    duration: 2600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // Near roadside sentinels.
  const sentinels = [
    { x: 96, y: 700, scale: 1.7, angle: -1.8, duration: 3400 },
    { x: 214, y: 640, scale: 1.1, angle: 1.2, duration: 4100 },
    { x: 1180, y: 688, scale: 1.85, angle: 1.7, duration: 3650 },
    { x: 1058, y: 632, scale: 1.05, angle: -1.1, duration: 4400 },
  ];
  for (const sentinel of sentinels) {
    const tree = pineSilhouette(scene, PAPER.nearTree, 150)
      .setPosition(sentinel.x, sentinel.y)
      .setScale(sentinel.scale)
      .setAngle(-sentinel.angle);
    scene.tweens.add({
      targets: tree,
      angle: sentinel.angle,
      duration: sentinel.duration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // Fog hugging the horizon and drifting embers.
  const farFog = scene.add
    .image(640, HORIZON_Y + 2, 'fog_band')
    .setDisplaySize(1320, 96)
    .setAlpha(0.5);
  const nearFog = scene.add
    .image(640, HORIZON_Y + 56, 'fog_band')
    .setDisplaySize(1320, 140)
    .setAlpha(0.22);
  scene.tweens.add({
    targets: farFog,
    x: { from: 600, to: 680 },
    alpha: { from: 0.42, to: 0.56 },
    duration: 7200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  scene.tweens.add({
    targets: nearFog,
    x: { from: 690, to: 590 },
    alpha: { from: 0.16, to: 0.27 },
    duration: 9400,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  startEmbers(scene);

  // Film finish.
  addPaperOverlays(scene);

  return { tower, gate, towerAura, roadGlow };
};

/**
 * Inside the castle: the painted throne room covers the whole view (sides
 * crop at its native aspect), with warm brazier glows pulsing for life.
 * Fallback is a bare dark hall so a missing painting never blocks the boss.
 */
export const buildCastleBackdrop = (scene: Phaser.Scene): BackdropHandles => {
  if (scene.textures.exists('castle_interior')) {
    const frame = scene.textures.getFrame('castle_interior');
    const cover = Math.max(1280 / frame.width, 720 / frame.height);
    scene.add
      .image(640, 360, 'castle_interior')
      .setDisplaySize(frame.width * cover, frame.height * cover);
  } else {
    scene.add.rectangle(640, 360, 1280, 720, 0x171223);
    scene.add.rectangle(640, 620, 1280, 200, 0x241c33);
  }

  // Firelight breathing over the hall.
  for (const [bx, by] of [
    [305, 330],
    [975, 330],
  ] as const) {
    const glow = scene.add
      .ellipse(bx, by, 220, 260, PAPER.ember, 0.1)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: glow,
      alpha: { from: 0.55, to: 1 },
      scaleX: { from: 0.92, to: 1.06 },
      scaleY: { from: 0.92, to: 1.06 },
      duration: 1700 + Math.random() * 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
  startEmbers(scene);

  addPaperOverlays(scene);
  return { tower: null, gate: null, towerAura: null, roadGlow: null };
};
