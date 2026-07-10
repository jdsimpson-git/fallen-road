import * as Phaser from 'phaser';
import type {
  AttackStyle,
  BlockStanceDefinition,
  EnemyDefinition,
} from '../../shared/balance/enemies';
import type { ActiveHitZone } from '../../shared/combat/types';
import { zoneBalance } from '../../shared/balance/hitZones';
import type { DodgeDirection } from '../../shared/combat/EnemyBrain';
import { PAPER } from '../ui/theme';
import { flashOverlay, overlayRect, paperRect } from '../ui/paperShapes';
import { DEFAULT_LOOK, ENEMY_LOOKS, type EnemyLook } from './enemyLooks';

const RIM = { strokeWidth: 2.5, strokeColor: PAPER.rim } as const;

type EnemyRigAssets = {
  head: string;
  torso: string;
  armFront: string;
  armBack?: string;
  legFront: string;
  legBack: string;
  /**
   * The rig's straightest leg sprite, used for BOTH legs (right one
   * mirrored). The sheets' paired leg sprites bake in stride poses that
   * read bow-legged when planted side by side.
   */
  stanceLeg: string;
  weapon: string;
  shield?: string;
  /** Optional cape layer rendered behind the torso, breathing with it. */
  cape?: string;
  /** Per-rig joint tuning for art that is much larger than the base soldier. */
  armFrontHeight?: number;
  armFrontOffset?: { x: number; y: number };
  armFrontFlipX?: boolean;
  handOffset?: { x: number; y: number };
  weaponAnchor?: { x: number; y: number };
  weaponLength?: number;
  weaponTip?: { x: number; y: number };
  armBackHeight?: number;
  armBackOffset?: { x: number; y: number };
};

const ENEMY_RIG_ASSETS: Record<string, EnemyRigAssets> = {
  'road-soldier': {
    head: 'road_soldier_head',
    torso: 'road_soldier_torso',
    armFront: 'road_soldier_arm_front',
    armBack: 'road_soldier_arm_back',
    legFront: 'road_soldier_leg_front',
    legBack: 'road_soldier_leg_back',
    stanceLeg: 'road_soldier_leg_front',
    weapon: 'road_soldier_weapon',
    shield: 'road_soldier_shield',
  },
  'shield-bearer': {
    head: 'road_soldier_head',
    torso: 'road_soldier_torso',
    armFront: 'road_soldier_arm_front',
    armBack: 'road_soldier_arm_back',
    legFront: 'road_soldier_leg_front',
    legBack: 'road_soldier_leg_back',
    stanceLeg: 'road_soldier_leg_front',
    weapon: 'road_soldier_weapon',
    shield: 'road_soldier_shield',
  },
  duelist: {
    head: 'fallen_rival_head',
    torso: 'fallen_rival_torso',
    armFront: 'fallen_rival_arm_front',
    armBack: 'fallen_rival_arm_back',
    legFront: 'fallen_rival_leg_front',
    legBack: 'fallen_rival_leg_back',
    stanceLeg: 'fallen_rival_leg_front',
    weapon: 'fallen_rival_weapon_frost_spear',
    shield: 'fallen_rival_shield',
  },
  'fallen-rival': {
    head: 'fallen_rival_head',
    torso: 'fallen_rival_torso',
    armFront: 'fallen_rival_arm_front',
    armBack: 'fallen_rival_arm_back',
    legFront: 'fallen_rival_leg_front',
    legBack: 'fallen_rival_leg_back',
    stanceLeg: 'fallen_rival_leg_front',
    weapon: 'fallen_rival_weapon_frost_spear',
    shield: 'fallen_rival_shield',
  },
  'spear-wraith': {
    head: 'spear_wraith_head',
    torso: 'spear_wraith_torso',
    armFront: 'spear_wraith_arm_front',
    armBack: 'spear_wraith_arm_back',
    legFront: 'spear_wraith_leg_front',
    legBack: 'spear_wraith_leg_back',
    stanceLeg: 'spear_wraith_leg_front',
    weapon: 'spear_wraith_weapon',
  },
  'bell-templar': {
    head: 'bell_templar_head',
    torso: 'bell_templar_torso',
    armFront: 'bell_templar_arm_front',
    armBack: 'bell_templar_arm_back',
    legFront: 'bell_templar_leg_front',
    legBack: 'bell_templar_leg_back',
    stanceLeg: 'bell_templar_leg_front',
    weapon: 'bell_templar_weapon',
    armBackHeight: 145,
  },
  'cinder-reaver': {
    head: 'cinder_reaver_head',
    torso: 'cinder_reaver_torso',
    armFront: 'cinder_reaver_arm_front',
    armBack: 'cinder_reaver_arm_back',
    legFront: 'cinder_reaver_leg_front',
    legBack: 'cinder_reaver_leg_back',
    stanceLeg: 'cinder_reaver_leg_front',
    weapon: 'cinder_reaver_weapon',
  },
  gatekeeper: {
    head: 'warden_king_head',
    torso: 'warden_king_torso',
    armFront: 'gatekeeper_arm_front_v2',
    armBack: 'warden_king_arm_back',
    legFront: 'warden_king_leg_front',
    legBack: 'warden_king_leg_back',
    stanceLeg: 'warden_king_leg_back',
    weapon: 'gatekeeper_weapon_hammer_v2',
    cape: 'warden_king_cape',
    armFrontHeight: 172,
    armFrontOffset: { x: 2, y: 0 },
    armFrontFlipX: true,
    handOffset: { x: 2, y: 76 },
    weaponAnchor: { x: 4, y: 66 },
    weaponLength: 150,
    weaponTip: { x: 8, y: -62 },
    armBackHeight: 178,
    armBackOffset: { x: 2, y: 6 },
  },
  'fallen-king': {
    head: 'fallen_king_head',
    torso: 'fallen_king_torso',
    armFront: 'fallen_king_arm_front_v2',
    legFront: 'fallen_king_leg_front',
    legBack: 'fallen_king_leg_back',
    stanceLeg: 'fallen_king_leg_front',
    weapon: 'fallen_king_weapon_hammer_v2',
    shield: 'fallen_king_shield_arm_v2',
    cape: 'fallen_king_cape',
    armFrontHeight: 220,
    armFrontOffset: { x: 4, y: 2 },
    handOffset: { x: 6, y: 101 },
    weaponAnchor: { x: 8, y: 92 },
    weaponLength: 188,
    weaponTip: { x: 8, y: -96 },
  },
};

/**
 * Silhouette enemy against the dusk: near-black paper-theater figure with
 * glowing eyes and weapon accents. Built from an EnemyDefinition (combat
 * geometry) plus an EnemyLook (tones, glow color, shield, weapon). Hit zones
 * derive from the same live part positions used for rendering, so a dodging
 * body really moves its hitboxes.
 */
export class PaperEnemyView {
  readonly container: Phaser.GameObjects.Container;

  private readonly look: EnemyLook;
  private readonly head: Phaser.GameObjects.Container;
  private readonly torso: Phaser.GameObjects.Container;
  private shieldArm: Phaser.GameObjects.Container | null = null;
  private readonly swordArm: Phaser.GameObjects.Container;
  private readonly bladeGlow: Phaser.GameObjects.Graphics;
  private readonly hand: Phaser.GameObjects.Arc;
  private readonly eyes: Phaser.GameObjects.Arc[] = [];

  private readonly headFlash: Phaser.GameObjects.Arc;
  private readonly torsoFlash: Phaser.GameObjects.Graphics;
  private readonly torsoRage: Phaser.GameObjects.Graphics;
  private readonly legFlashes: Phaser.GameObjects.Graphics[] = [];
  private shieldFlash:
    | Phaser.GameObjects.Graphics
    | Phaser.GameObjects.Arc
    | null = null;

  private readonly handRestAlpha: number;
  private readonly headBase: { x: number; y: number };
  private readonly torsoBase: { x: number; y: number };
  private readonly swordArmBase: { x: number; y: number };
  private readonly shieldArmBase: { x: number; y: number };
  private readonly legsCenterY: number;
  private readonly baseX: number;
  private readonly weaponTipLocal: { x: number; y: number };

  private actionTweens: Phaser.Tweens.Tween[] = [];
  private cueRing: Phaser.GameObjects.Arc | null = null;
  private stanceRing: Phaser.GameObjects.Arc | null = null;
  private bobEnabled = true;
  private dead = false;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly def: EnemyDefinition
  ) {
    const look = ENEMY_LOOKS[def.id] ?? DEFAULT_LOOK;
    const rigAssets = ENEMY_RIG_ASSETS[def.id] ?? null;
    this.look = look;
    this.baseX = x;
    this.container = scene.add.container(x, y).setDepth(10);

    // Derive the skeleton from the combat hit zones.
    const headZone = def.hitZones.find((z) => z.attachTo === 'head');
    const torsoZone = def.hitZones.find((z) => z.attachTo === 'torso');
    const legsZone = def.hitZones.find((z) => z.attachTo === 'legs');
    const headRadius = headZone?.type === 'circle' ? headZone.radius : 32;
    const torsoHalfW = torsoZone?.type === 'rect' ? torsoZone.halfWidth : 55;
    const torsoHalfH = torsoZone?.type === 'rect' ? torsoZone.halfHeight : 72;
    const legsHeight = legsZone?.type === 'rect' ? legsZone.halfHeight * 2 : 72;

    this.legsCenterY = -legsHeight / 2;
    this.torsoBase = { x: 0, y: -(legsHeight + torsoHalfH) };
    this.headBase = { x: 0, y: this.torsoBase.y - torsoHalfH - headRadius - 4 };
    this.swordArmBase = { x: torsoHalfW + 14, y: this.torsoBase.y - 12 };
    this.shieldArmBase = { x: -(torsoHalfW + 14), y: this.torsoBase.y - 4 };

    // Warm backglow so the silhouette reads against the dark road.
    const totalHeight = legsHeight + torsoHalfH * 2 + headRadius * 2;
    const backGlow = scene.add
      .ellipse(
        0,
        -totalHeight * 0.45,
        torsoHalfW * 5.2,
        totalHeight * 1.25,
        PAPER.ember,
        0.13
      )
      .setBlendMode(Phaser.BlendModes.ADD);

    // Pooled shadow on the road.
    const groundShadow = scene.add.ellipse(
      0,
      6,
      torsoHalfW * 3.2,
      20,
      0x000000,
      0.4
    );

    // Legs.
    const legWidth = Math.max(22, torsoHalfW * 0.44);
    const legParts: Phaser.GameObjects.GameObject[] = [];
    for (const side of [-1, 1]) {
      const legArt = this.assetImage(rigAssets?.stanceLeg, legsHeight * 1.32);
      legArt?.setFlipX(side > 0);
      const leg =
        legArt ??
        paperRect(scene, legWidth, legsHeight, look.armor, {
          radius: 8,
          ...RIM,
        });
      leg.setPosition(side * legWidth * 0.92, this.legsCenterY);
      const flash = overlayRect(scene, legWidth, legsHeight, PAPER.flash, 8);
      flash.setPosition(leg.x, leg.y);
      this.legFlashes.push(flash);
      legParts.push(leg, flash);
    }

    // Torso.
    this.torso = scene.add.container(this.torsoBase.x, this.torsoBase.y);
    const torsoArt = this.assetImage(rigAssets?.torso, torsoHalfH * 2.24);
    const torsoParts: Phaser.GameObjects.GameObject[] = [];
    const capeArt = this.assetImage(rigAssets?.cape, torsoHalfH * 2.5);
    if (capeArt) {
      capeArt.setPosition(0, torsoHalfH * 0.24);
      torsoParts.push(capeArt);
    }
    if (torsoArt) {
      torsoParts.push(torsoArt);
    } else {
      const torsoBody = paperRect(
        scene,
        torsoHalfW * 2,
        torsoHalfH * 2,
        look.body,
        {
          radius: 16,
          ...RIM,
        }
      );
      const mantle = paperRect(
        scene,
        torsoHalfW * 2 - 4,
        torsoHalfH * 0.6,
        look.armor,
        {
          radius: 12,
          strokeWidth: 0,
        }
      );
      mantle.setY(-torsoHalfH * 0.62);
      torsoParts.push(torsoBody, mantle);
    }
    this.torsoFlash = overlayRect(
      scene,
      torsoHalfW * 2,
      torsoHalfH * 2,
      PAPER.flash,
      16
    );
    this.torsoRage = overlayRect(
      scene,
      torsoHalfW * 2,
      torsoHalfH * 2,
      PAPER.danger,
      16
    );
    this.torsoRage.setBlendMode(Phaser.BlendModes.ADD);
    this.torso.add([...torsoParts, this.torsoFlash, this.torsoRage]);

    // Breathing.
    scene.tweens.add({
      targets: this.torso,
      scaleY: { from: 1, to: 1.02 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Sword arm.
    this.swordArm = scene.add.container(
      this.swordArmBase.x,
      this.swordArmBase.y
    );
    const armFrontOffset = rigAssets?.armFrontOffset ?? { x: 0, y: 10 };
    const armArt = this.assetImage(
      rigAssets?.armFront,
      rigAssets?.armFrontHeight ?? 64
    )?.setPosition(armFrontOffset.x, armFrontOffset.y);
    armArt?.setFlipX(rigAssets?.armFrontFlipX === true);
    const arm =
      armArt ?? paperRect(scene, 22, 48, look.body, { radius: 10, ...RIM });
    arm.setPosition(armFrontOffset.x, armFrontOffset.y);
    // With painted arm art the gauntlet is the hand visual; keep the disc as
    // a faint hit-zone marker that brightens on weapon-hand hits.
    this.handRestAlpha = armArt ? 0.15 : 1;
    const handOffset = rigAssets?.handOffset ?? { x: 6, y: 30 };
    this.hand = scene.add
      .circle(handOffset.x, handOffset.y, 12, look.body)
      .setStrokeStyle(2, PAPER.rim, 0.5)
      .setAlpha(this.handRestAlpha);
    const bladeWidth = look.weapon === 'rapier' ? 8 : 14;
    const weaponAnchor = rigAssets?.weaponAnchor ?? { x: 8, y: 0 };
    const weaponLength = rigAssets?.weaponLength ?? look.bladeLength;
    const weaponArt = this.assetImage(rigAssets?.weapon, bladeWidth * 5.5);
    let weapon: Phaser.GameObjects.GameObject;
    let glint: Phaser.GameObjects.Graphics | null = null;
    if (weaponArt) {
      weaponArt.setOrigin(0.12, 0.5);
      weaponArt.setScale(weaponLength / weaponArt.width);
      weaponArt.setPosition(weaponAnchor.x, weaponAnchor.y);
      weaponArt.setAngle(-90);
      weapon = weaponArt;
    } else {
      const blade = paperRect(
        scene,
        bladeWidth,
        look.bladeLength,
        PAPER.blade,
        {
          radius: { tl: bladeWidth / 2, tr: bladeWidth / 2, bl: 2, br: 2 },
          strokeWidth: 2,
          strokeColor: PAPER.rim,
        }
      );
      blade.setPosition(
        weaponAnchor.x,
        weaponAnchor.y - look.bladeLength / 2 - 4
      );
      weapon = blade;
      // Glint line down the edge.
      glint = paperRect(scene, 2.5, look.bladeLength - 14, PAPER.bladeGlint, {
        radius: 1,
        strokeWidth: 0,
        fillAlpha: 0.55,
      });
      glint.setPosition(
        weaponAnchor.x + bladeWidth / 4,
        weaponAnchor.y - look.bladeLength / 2 - 4
      );
    }
    this.weaponTipLocal = rigAssets?.weaponTip ?? {
      x: weaponAnchor.x,
      y: weaponAnchor.y - look.bladeLength - 6,
    };
    // Telegraph glow overlay.
    this.bladeGlow = overlayRect(
      scene,
      bladeWidth + 10,
      look.bladeLength + 10,
      PAPER.counterCue,
      6
    );
    this.bladeGlow.setPosition(
      weaponAnchor.x,
      weaponAnchor.y - look.bladeLength / 2 - 4
    );
    this.bladeGlow.setBlendMode(Phaser.BlendModes.ADD);
    const guard = paperRect(
      scene,
      look.weapon === 'rapier' ? 22 : 32,
      8,
      look.armor,
      {
        radius: 4,
        strokeWidth: 0,
      }
    );
    guard.setPosition(weaponAnchor.x, weaponAnchor.y - 2);
    const swordParts: Phaser.GameObjects.GameObject[] = [arm, weapon];
    if (glint) swordParts.push(glint);
    if (!weaponArt) swordParts.push(guard);
    swordParts.push(this.hand, this.bladeGlow);
    this.swordArm.add(swordParts);

    // Head: silhouette skull with glowing eyes and a helmet profile.
    this.head = scene.add.container(this.headBase.x, this.headBase.y);
    this.headFlash = scene.add
      .circle(0, 0, headRadius, PAPER.flash)
      .setAlpha(0);
    const headArt = this.assetImage(rigAssets?.head, headRadius * 2.36);
    if (headArt) {
      this.head.add(headArt);
    } else {
      const skull = scene.add
        .circle(0, 0, headRadius, look.body)
        .setStrokeStyle(2, PAPER.rim, 0.45);
      this.head.add([skull]);
      this.buildHelmet(headRadius);
    }
    this.buildEyes(headRadius);
    this.head.add(this.headFlash);

    // Shield arm — added LAST so a raised guard renders in front of the body.
    if (look.shield) {
      const shieldArm = scene.add.container(
        this.shieldArmBase.x,
        this.shieldArmBase.y
      );
      const s = look.shield;
      const shieldHeight =
        s.shape === 'round' ? s.radius * 2.25 : s.height * 1.05;
      const shieldArt = this.assetImage(rigAssets?.shield, shieldHeight);
      const armBack = this.assetImage(
        rigAssets?.armBack,
        // With no dedicated shield art the armored arm itself is the guard
        // visual (e.g. the Warden King's plated arm) — draw it shield-sized
        // instead of backing a flat procedural plate.
        shieldArt ? 68 : (rigAssets?.armBackHeight ?? shieldHeight * 1.15)
      );
      if (armBack) {
        const armBackOffset = rigAssets?.armBackOffset ?? { x: 2, y: 16 };
        armBack.setPosition(armBackOffset.x, armBackOffset.y);
        shieldArm.add(armBack);
      }
      if (shieldArt || armBack) {
        if (shieldArt) shieldArm.add(shieldArt);
        if (s.shape === 'round') {
          const flash = scene.add
            .circle(0, 0, s.radius, PAPER.flash)
            .setAlpha(0);
          this.shieldFlash = flash;
          shieldArm.add(flash);
        } else {
          this.shieldFlash = overlayRect(
            scene,
            s.width,
            s.height,
            PAPER.flash,
            14
          );
          shieldArm.add(this.shieldFlash);
        }
      } else if (s.shape === 'round') {
        const plate = scene.add
          .circle(0, 0, s.radius, s.color)
          .setStrokeStyle(2.5, PAPER.rim, 0.6);
        const boss = scene.add
          .circle(0, 0, s.radius * 0.2, look.armor)
          .setStrokeStyle(2, PAPER.rim, 0.4);
        const flash = scene.add.circle(0, 0, s.radius, PAPER.flash).setAlpha(0);
        this.shieldFlash = flash;
        shieldArm.add([plate, boss, flash]);
      } else {
        const plate = paperRect(scene, s.width, s.height, s.color, {
          radius: 14,
          ...RIM,
        });
        const ridge = paperRect(scene, 4, s.height - 22, look.armor, {
          radius: 2,
          strokeWidth: 0,
        });
        this.shieldFlash = overlayRect(
          scene,
          s.width,
          s.height,
          PAPER.flash,
          14
        );
        shieldArm.add([plate, ridge, this.shieldFlash]);
      }
      this.shieldArm = shieldArm;
    }

    const parts: Phaser.GameObjects.GameObject[] = [
      backGlow,
      groundShadow,
      ...legParts,
      this.torso,
      this.head,
      this.swordArm,
    ];
    if (this.shieldArm) parts.push(this.shieldArm);
    this.container.add(parts);

    // Slow, watchful sway.
    scene.tweens.add({
      targets: this.container,
      angle: { from: -0.8, to: 0.8 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private assetImage(
    key: string | undefined,
    targetHeight: number
  ): Phaser.GameObjects.Image | null {
    if (!key || !this.scene.textures.exists(key)) return null;
    const image = this.scene.add.image(0, 0, key);
    if (image.height > 0) image.setScale(targetHeight / image.height);
    return image;
  }

  private buildHelmet(r: number): void {
    const scene = this.scene;
    const look = this.look;
    const g = scene.add.graphics();
    g.fillStyle(look.armor, 1);
    if (look.face === 'visor') {
      // Wide slab helm covering the whole head.
      g.fillRoundedRect(-r - 4, -r - 2, (r + 4) * 2, r * 1.3, r * 0.4);
    } else if (look.face === 'duelist') {
      // Swept cap with a long plume trailing back.
      g.fillRoundedRect(-r, -r - 2, r * 2, r * 0.7, r * 0.3);
      g.fillTriangle(r * 0.4, -r * 0.85, r * 1.9, -r * 1.7, r * 0.9, -r * 0.35);
    } else {
      // Round soldier helm with a short crest.
      g.fillRoundedRect(-r - 2, -r - 2, (r + 2) * 2, r * 0.95, r * 0.45);
      g.fillTriangle(-r * 0.25, -r - 2, r * 0.25, -r - 2, 0, -r - 16);
    }
    this.head.add(g);
  }

  private buildEyes(r: number): void {
    const scene = this.scene;
    const color = this.look.accent;
    const eyeY = this.look.face === 'visor' ? -r * 0.18 : 0;
    for (const side of [-1, 1]) {
      const halo = scene.add
        .circle(side * r * 0.38, eyeY, 7.5, color, 0.3)
        .setBlendMode(Phaser.BlendModes.ADD);
      const eye = scene.add
        .circle(side * r * 0.38, eyeY, 3.4, color)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.eyes.push(halo, eye);
      this.head.add([halo, eye]);
    }
    // Idle glow pulse.
    scene.tweens.add({
      targets: this.eyes,
      alpha: { from: 1, to: 0.55 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private setEyesDimmed(dimmed: boolean): void {
    for (const eye of this.eyes) {
      eye.setAlpha(dimmed ? 0.15 : 1);
    }
  }

  /** Idle head sway — the moving weak point. Call every frame. */
  updateIdle(now: number): void {
    if (this.dead || !this.bobEnabled) return;
    const { amplitudeX, amplitudeY, periodMs } = this.def.behavior.headBob;
    const phase = (now / periodMs) * Math.PI * 2;
    this.head.x = this.headBase.x + Math.sin(phase) * amplitudeX;
    this.head.y = this.headBase.y + Math.sin(phase * 2) * amplitudeY;
  }

  /** Hit zones in world coordinates, tracking live part positions. */
  getHitZones(): ActiveHitZone[] {
    if (this.dead) return [];
    const cx = this.container.x;
    const cy = this.container.y;
    const zones: ActiveHitZone[] = [];
    for (const zone of this.def.hitZones) {
      const priority = zoneBalance(zone.id).priority;
      if (zone.type === 'circle' && zone.attachTo === 'head') {
        zones.push({
          id: zone.id,
          priority,
          shape: {
            type: 'circle',
            x: cx + this.head.x,
            y: cy + this.head.y,
            radius: zone.radius,
          },
        });
      } else if (zone.type === 'circle' && zone.attachTo === 'weaponHand') {
        const hand = this.handWorldPosition();
        zones.push({
          id: zone.id,
          priority,
          shape: { type: 'circle', x: hand.x, y: hand.y, radius: zone.radius },
        });
      } else if (zone.type === 'rect' && zone.attachTo === 'torso') {
        zones.push({
          id: zone.id,
          priority,
          shape: {
            type: 'rect',
            x: cx + this.torso.x,
            y: cy + this.torso.y,
            halfWidth: zone.halfWidth,
            halfHeight: zone.halfHeight,
          },
        });
      } else if (zone.type === 'rect' && zone.attachTo === 'legs') {
        zones.push({
          id: zone.id,
          priority,
          shape: {
            type: 'rect',
            x: cx,
            y: cy + this.legsCenterY,
            halfWidth: zone.halfWidth,
            halfHeight: zone.halfHeight,
          },
        });
      }
    }
    return zones;
  }

  private handWorldPosition(): { x: number; y: number } {
    const out = new Phaser.Math.Vector2();
    this.swordArm
      .getWorldTransformMatrix()
      .transformPoint(this.hand.x, this.hand.y, out);
    return { x: out.x, y: out.y };
  }

  bladeWorldPosition(): { x: number; y: number } {
    const tip = new Phaser.Math.Vector2();
    this.swordArm
      .getWorldTransformMatrix()
      .transformPoint(this.weaponTipLocal.x, this.weaponTipLocal.y, tip);
    return { x: tip.x, y: tip.y };
  }

  /** Wind-up, glowing blade, counter-window cue, then the swing itself. */
  playTelegraph(
    telegraphMs: number,
    counterWindowMs: number,
    style: AttackStyle
  ): void {
    this.cancelActionTweens();
    const swingMs = Math.min(140, telegraphMs * 0.2);
    const windupMs = telegraphMs - swingMs;

    if (style === 'bash' && this.shieldArm) {
      this.track(
        this.scene.tweens.add({
          targets: this.shieldArm,
          x: this.shieldArmBase.x + 26,
          angle: -14,
          duration: windupMs,
          ease: 'Sine.easeOut',
        })
      );
      this.track(
        this.scene.tweens.add({
          targets: this.shieldArm,
          x: this.shieldArmBase.x - 70,
          angle: 6,
          delay: windupMs,
          duration: swingMs,
          ease: 'Quad.easeIn',
        })
      );
      if (this.shieldFlash) this.glowPulse(this.shieldFlash);
    } else if (style === 'thrust') {
      this.track(
        this.scene.tweens.add({
          targets: this.swordArm,
          x: this.swordArmBase.x + 46,
          angle: -95,
          duration: windupMs,
          ease: 'Sine.easeOut',
        })
      );
      this.track(
        this.scene.tweens.add({
          targets: this.swordArm,
          x: this.swordArmBase.x - 90,
          delay: windupMs,
          duration: swingMs,
          ease: 'Quad.easeIn',
        })
      );
      this.glowPulse(this.bladeGlow);
    } else {
      this.track(
        this.scene.tweens.add({
          targets: this.swordArm,
          angle: -78,
          y: this.swordArmBase.y - 24,
          duration: windupMs,
          ease: 'Sine.easeOut',
        })
      );
      this.track(
        this.scene.tweens.add({
          targets: this.swordArm,
          angle: 62,
          y: this.swordArmBase.y + 12,
          delay: windupMs,
          duration: swingMs,
          ease: 'Quad.easeIn',
        })
      );
      this.glowPulse(this.bladeGlow);
    }

    // Counter-window cue: a bright expanding ring at the weapon.
    this.scene.time.delayedCall(
      Math.max(0, telegraphMs - counterWindowMs),
      () => {
        if (this.dead || !this.isMidTelegraph()) return;
        this.showCounterCue();
      }
    );
  }

  private glowPulse(
    target: Phaser.GameObjects.Graphics | Phaser.GameObjects.Arc
  ): void {
    this.track(
      this.scene.tweens.add({
        targets: target,
        alpha: { from: 0, to: 0.65 },
        duration: 150,
        yoyo: true,
        repeat: 2,
        onComplete: () => target.setAlpha(0),
      })
    );
  }

  private isMidTelegraph(): boolean {
    return this.actionTweens.some((t) => t.isPlaying());
  }

  private showCounterCue(): void {
    const tip = this.bladeWorldPosition();
    this.cueRing?.destroy();
    const ring = this.scene.add
      .circle(tip.x, tip.y, 14)
      .setStrokeStyle(6, PAPER.counterCue);
    ring.setFillStyle(0, 0);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    this.cueRing = ring;
    this.scene.tweens.add({
      targets: ring,
      radius: 46,
      alpha: { from: 1, to: 0 },
      duration: 260,
      onComplete: () => {
        ring.destroy();
        if (this.cueRing === ring) this.cueRing = null;
      },
    });
  }

  /** Blue ring tell for the Duelist's counter stance. */
  showCounterStance(totalMs: number): void {
    this.hideCounterStance();
    const tip = this.bladeWorldPosition();
    const ring = this.scene.add
      .circle(tip.x, tip.y, 30)
      .setStrokeStyle(6, PAPER.guard)
      .setDepth(56);
    ring.setFillStyle(0, 0);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    this.stanceRing = ring;
    this.scene.tweens.add({
      targets: ring,
      radius: { from: 30, to: 44 },
      alpha: { from: 1, to: 0.5 },
      duration: 260,
      yoyo: true,
      repeat: Math.max(1, Math.floor(totalMs / 520)),
    });
    this.scene.time.delayedCall(totalMs + 60, () => this.hideCounterStance());
  }

  hideCounterStance(): void {
    this.stanceRing?.destroy();
    this.stanceRing = null;
  }

  /** Sharp parry flash when the player strikes into the counter stance. */
  playParry(): void {
    this.hideCounterStance();
    const tip = this.bladeWorldPosition();
    const flash = this.scene.add
      .circle(tip.x, tip.y, 26, PAPER.flash, 0.9)
      .setDepth(56)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: flash,
      radius: 70,
      alpha: 0,
      duration: 220,
      onComplete: () => flash.destroy(),
    });
  }

  /** Return the weapon to rest after a swing. */
  playRecover(): void {
    this.track(
      this.scene.tweens.add({
        targets: this.swordArm,
        angle: 0,
        x: this.swordArmBase.x,
        y: this.swordArmBase.y,
        duration: 320,
        ease: 'Sine.easeOut',
      })
    );
    if (this.shieldArm) {
      this.track(
        this.scene.tweens.add({
          targets: this.shieldArm,
          x: this.shieldArmBase.x,
          y: this.shieldArmBase.y,
          angle: 0,
          duration: 320,
          ease: 'Sine.easeOut',
        })
      );
    }
  }

  playBlock(stance: BlockStanceDefinition): void {
    this.cancelActionTweens();
    const guardTarget = this.shieldArm ?? this.swordArm;
    const targetY =
      stance.id === 'high' ? this.headBase.y + 8 : this.torsoBase.y - 8;
    this.track(
      this.scene.tweens.add({
        targets: guardTarget,
        x: 0,
        y: targetY,
        scaleX: 1.35,
        scaleY: 1.35,
        angle: stance.id === 'high' ? 90 : 0,
        duration: 110,
        ease: 'Quad.easeOut',
      })
    );
  }

  endBlock(): void {
    const guardTarget = this.shieldArm ?? this.swordArm;
    const base = this.shieldArm ? this.shieldArmBase : this.swordArmBase;
    this.track(
      this.scene.tweens.add({
        targets: guardTarget,
        x: base.x,
        y: base.y,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        duration: 180,
        ease: 'Sine.easeOut',
      })
    );
  }

  playDodge(
    direction: DodgeDirection,
    durationMs: number,
    distance: number
  ): void {
    this.track(
      this.scene.tweens.add({
        targets: this.container,
        x: this.baseX + direction * distance,
        duration: durationMs * 0.35,
        yoyo: true,
        hold: durationMs * 0.3,
        ease: 'Quad.easeOut',
      })
    );
    this.track(
      this.scene.tweens.add({
        targets: this.container,
        angle: direction * 7,
        duration: durationMs * 0.35,
        yoyo: true,
        hold: durationMs * 0.3,
        ease: 'Quad.easeOut',
      })
    );
  }

  playHitReaction(zoneId: string, heavy: boolean): void {
    switch (zoneId) {
      case 'head':
        flashOverlay(this.scene, this.headFlash);
        break;
      case 'weaponHand': {
        const original = this.look.body;
        this.hand.setFillStyle(PAPER.flash).setAlpha(1);
        this.scene.time.delayedCall(80, () => {
          if (!this.dead)
            this.hand.setFillStyle(original).setAlpha(this.handRestAlpha);
        });
        break;
      }
      case 'legs':
        for (const flash of this.legFlashes) flashOverlay(this.scene, flash);
        break;
      default:
        flashOverlay(this.scene, this.torsoFlash);
    }
    const kick = heavy ? 16 : 8;
    this.scene.tweens.add({
      targets: this.container,
      x: this.container.x + kick,
      duration: 50,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  playBlockedHit(): void {
    if (this.shieldFlash) flashOverlay(this.scene, this.shieldFlash, 0.6);
  }

  playStagger(): void {
    this.cancelActionTweens();
    this.hideCounterStance();
    this.track(
      this.scene.tweens.add({
        targets: this.swordArm,
        angle: 24,
        y: this.swordArmBase.y + 16,
        duration: 130,
        ease: 'Quad.easeOut',
      })
    );
    this.track(
      this.scene.tweens.add({
        targets: this.head,
        angle: { from: -12, to: 12 },
        duration: 160,
        yoyo: true,
        repeat: 3,
      })
    );
  }

  /** Crumple and lose the light in the eyes while guard-broken. */
  playGuardBreak(): void {
    this.cancelActionTweens();
    this.hideCounterStance();
    this.setEyesDimmed(true);
    flashOverlay(this.scene, this.torsoFlash, 0.5, 260);
    this.track(
      this.scene.tweens.add({
        targets: this.container,
        scaleY: 0.84,
        angle: -5,
        duration: 160,
        ease: 'Quad.easeOut',
      })
    );
    if (this.shieldArm) {
      this.track(
        this.scene.tweens.add({
          targets: this.shieldArm,
          angle: 64,
          y: this.shieldArmBase.y + 44,
          x: this.shieldArmBase.x - 14,
          scaleX: 1,
          scaleY: 1,
          duration: 160,
          ease: 'Quad.easeIn',
        })
      );
    }
  }

  /** Recover posture after stagger or guard break ends. */
  endVulnerable(): void {
    if (this.dead) return;
    this.setEyesDimmed(false);
    this.track(
      this.scene.tweens.add({
        targets: this.container,
        scaleY: 1,
        angle: 0,
        duration: 220,
        ease: 'Sine.easeOut',
      })
    );
    if (this.shieldArm) {
      this.track(
        this.scene.tweens.add({
          targets: this.shieldArm,
          angle: 0,
          x: this.shieldArmBase.x,
          y: this.shieldArmBase.y,
          duration: 220,
          ease: 'Sine.easeOut',
        })
      );
    }
    this.playRecover();
  }

  /** Furious glow when a phase transition triggers (e.g. Duelist enrage). */
  playPhaseChange(): void {
    flashOverlay(this.scene, this.torsoRage, 0.5, 420);
    this.scene.tweens.add({
      targets: this.container,
      scaleX: { from: 1, to: 1.06 },
      scaleY: { from: 1, to: 1.06 },
      duration: 140,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  /** Fade up from the fog when the encounter begins. */
  playSpawn(): void {
    this.container.setAlpha(0);
    this.container.y += 14;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      y: this.container.y - 14,
      duration: 600,
      ease: 'Sine.easeOut',
    });
  }

  playDeath(onComplete: () => void): void {
    this.dead = true;
    this.bobEnabled = false;
    this.cancelActionTweens();
    this.cueRing?.destroy();
    this.cueRing = null;
    this.hideCounterStance();
    this.setEyesDimmed(true);
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.add({
      targets: this.container,
      angle: -84,
      y: this.container.y + 46,
      scaleY: 0.55,
      alpha: 0,
      duration: 750,
      ease: 'Quad.easeIn',
      onComplete,
    });
  }

  destroy(): void {
    this.dead = true;
    this.scene.tweens.killTweensOf(this.container);
    this.container.destroy();
  }

  isDead(): boolean {
    return this.dead;
  }

  private track(tween: Phaser.Tweens.Tween): void {
    this.actionTweens = this.actionTweens.filter((t) => t.isPlaying());
    this.actionTweens.push(tween);
  }

  private cancelActionTweens(): void {
    for (const tween of this.actionTweens) tween.stop();
    this.actionTweens = [];
  }
}
