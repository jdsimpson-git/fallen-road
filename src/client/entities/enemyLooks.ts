/** Presentation-only config for the silhouette enemy builder. */
export type EnemyShieldLook =
  | { shape: 'round'; radius: number; color: number }
  | { shape: 'tower'; width: number; height: number; color: number };

export type EnemyLook = {
  /** Silhouette tones — body slightly lighter than armor so parts read. */
  body: number;
  armor: number;
  /** Glow color: eyes, telegraph accents. */
  accent: number;
  /** Omitted = no shield arm (the Duelist fights open-handed). */
  shield?: EnemyShieldLook;
  weapon: 'sword' | 'rapier';
  /** Blade length in px. */
  bladeLength: number;
  /** Helmet silhouette drawn on the head. */
  face: 'soldier' | 'visor' | 'duelist';
};

export const ENEMY_LOOKS: Record<string, EnemyLook> = {
  'road-soldier': {
    body: 0x3a2b52,
    armor: 0x261c38,
    accent: 0xff9d4d,
    shield: { shape: 'round', radius: 34, color: 0x2c2141 },
    weapon: 'sword',
    bladeLength: 92,
    face: 'soldier',
  },
  'shield-bearer': {
    body: 0x37294e,
    armor: 0x231a34,
    accent: 0x7fb4ff,
    shield: { shape: 'tower', width: 74, height: 126, color: 0x291f3d },
    weapon: 'sword',
    bladeLength: 76,
    face: 'visor',
  },
  duelist: {
    body: 0x3d2c55,
    armor: 0x2a1e3f,
    accent: 0xff5e7a,
    weapon: 'rapier',
    bladeLength: 112,
    face: 'duelist',
  },
  gatekeeper: {
    body: 0x2f2344,
    armor: 0x1c1430,
    accent: 0xffd75e,
    shield: { shape: 'tower', width: 92, height: 150, color: 0x241a38 },
    weapon: 'sword',
    bladeLength: 118,
    face: 'visor',
  },
};

export const DEFAULT_LOOK: EnemyLook = ENEMY_LOOKS['road-soldier']!;
