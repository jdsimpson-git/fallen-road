/**
 * Dusk silhouette palette — a twilight road toward a dark tower. Layered
 * black silhouettes against a burning horizon; glow is used sparingly for
 * eyes, telegraphs, and UI accents.
 */
export const PAPER = {
  // Sky gradient stops (top -> horizon).
  skyTop: 0x171226,
  skyMid: 0x453054,
  horizon: 0xb05c33,
  sunGlow: 0xe8b87a,

  // Silhouette layers, far to near.
  farHill: 0x2a2138,
  treeLine: 0x1e1830,
  nearTree: 0x130f1d,
  ground: 0x171122,
  road: 0x282039,
  roadCenter: 0x322847,
  tower: 0x100c18,
  towerWindow: 0xffb45e,
  fog: 0x8a7a9a,
  ember: 0xffb45e,

  // Characters (silhouettes with glow accents).
  enemyBody: 0x241a30,
  enemyArmor: 0x1a1226,
  enemyAccent: 0xff9d4d,
  enemyShield: 0x1f1729,
  blade: 0x2c2440,
  bladeGlint: 0xcfc4e8,
  glove: 0x1d1526,
  rim: 0x8d7ab5,

  // Feedback.
  flash: 0xffffff,
  counterCue: 0xffd75e,
  danger: 0xd94f3d,

  // UI.
  panel: 0x0d0a14,
  plate: 0x171226,
  barBack: 0x0d0a14,
  health: 0xd94f3d,
  guard: 0x4f8fdd,
  burst: 0xffb347,
  dodge: 0x7fc9a0,

  // Legacy keys still referenced by shared helpers/effects.
  ink: 0x0d0a14,
  parchment: 0xe8e0d8,
  cardboard: 0x3a2d50,
  shadow: 0x000000,
  trunk: 0x130f1d,
} as const;

export const INK_TEXT = '#e8e0d8';
export const PARCHMENT_TEXT = '#e8e0d8';
export const MUTED_TEXT = '#9a8fb0';
export const DODGE_TEXT = '#7fc9a0';
export const FONT = 'Georgia, "Times New Roman", serif';

export const STROKE_WIDTH = 2;
export const SHADOW_OFFSET = 5;
