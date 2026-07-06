import * as Phaser from 'phaser';
import { FONT, INK_TEXT, MUTED_TEXT, PAPER, PARCHMENT_TEXT } from './theme';
import {
  inkDodgeGlyph,
  inkHeart,
  inkShieldGlyph,
  inkSpark,
  paperRect,
} from './paperShapes';

export type HudCallbacks = {
  onShieldDown: () => void;
  onShieldUp: () => void;
  onDodgePressed: () => void;
  onBurstPressed: () => void;
};

export type HudSnapshot = {
  playerHealth: number;
  playerMaxHealth: number;
  playerGuard: number;
  playerMaxGuard: number;
  playerGuardBroken: boolean;
  /** Dodge cooldown recovery in [0, 1] — 1 means ready. */
  dodgeReady01: number;
  burst: number;
  burstMax: number;
  enemyHealth: number;
  enemyMaxHealth: number;
  enemyGuard: number;
  enemyMaxGuard: number;
};

type Bar = {
  fill: Phaser.GameObjects.Rectangle;
  width: number;
  valueText?: Phaser.GameObjects.Text;
};

const GUARD_BUTTON = { x: 1002, y: 640, radius: 56 };
const DODGE_BUTTON = { x: 278, y: 640, radius: 56 };
const BURST_BUTTON = { x: 640, y: 668, width: 250, height: 56 };

const addAssetIcon = (
  scene: Phaser.Scene,
  key: string,
  x: number,
  y: number,
  size: number,
  depth: number
): Phaser.GameObjects.Image | null => {
  if (!scene.textures.exists(key)) return null;
  const icon = scene.add.image(x, y, key).setDepth(depth);
  const largestSide = Math.max(icon.width, icon.height);
  if (largestSide > 0) icon.setScale(size / largestSide);
  return icon;
};

/** Dark dusk HUD: translucent panels, glowing accent bars. 1280x720. */
export class Hud {
  private playerHealthBar: Bar;
  private playerGuardBar: Bar;
  private enemyHealthBar: Bar;
  private enemyGuardBar: Bar;
  private enemyCard: Phaser.GameObjects.Container;
  private enemyNameText: Phaser.GameObjects.Text;
  private burstBar: Bar;
  private burstLabel: Phaser.GameObjects.Text;
  private burstPanel: Phaser.GameObjects.Rectangle;
  private burstPulse: Phaser.Tweens.Tween | null = null;
  private guardButton: Phaser.GameObjects.Arc;
  private guardLabel: Phaser.GameObjects.Text;
  private dodgeButton: Phaser.GameObjects.Arc;
  private dodgeGlyph: Phaser.GameObjects.Graphics;
  private dodgeLabel: Phaser.GameObjects.Text;
  private dodgeRing: Phaser.GameObjects.Graphics;
  private dodgeReady = true;
  private burstReady = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly callbacks: HudCallbacks
  ) {
    // --- Player panel, top-left ---
    this.panel(190, 66, 350, 104);
    this.label(38, 24, 'YOU');
    if (!addAssetIcon(scene, 'ui_heart_full', 48, 60, 30, 61)) {
      inkHeart(scene).setPosition(48, 60).setDepth(61);
    }
    this.playerHealthBar = this.bar(66, 60, 280, 20, PAPER.health, true);
    if (!addAssetIcon(scene, 'ui_guard_icon', 48, 89, 28, 61)) {
      inkShieldGlyph(scene).setPosition(48, 89).setDepth(61);
    }
    this.playerGuardBar = this.bar(66, 89, 280, 12, PAPER.guard);

    // --- Enemy panel, top-center (hidden while traveling) ---
    this.enemyCard = scene.add.container(0, 0);
    const enemyPieces: Phaser.GameObjects.GameObject[] = [];
    enemyPieces.push(this.panelPiece(640, 64, 380, 108));
    this.enemyNameText = scene.add
      .text(640, 26, '', {
        fontFamily: FONT,
        fontSize: '19px',
        fontStyle: 'bold',
        color: PARCHMENT_TEXT,
      })
      .setOrigin(0.5, 0)
      .setDepth(61);
    enemyPieces.push(this.enemyNameText);
    const enemyHeart =
      addAssetIcon(scene, 'ui_heart_full', 488, 62, 30, 61) ??
      inkHeart(scene).setPosition(488, 62).setDepth(61);
    enemyPieces.push(enemyHeart);
    this.enemyHealthBar = this.bar(
      506,
      62,
      290,
      20,
      PAPER.health,
      true,
      enemyPieces
    );
    const enemyGuard =
      addAssetIcon(scene, 'ui_guard_icon', 488, 91, 28, 61) ??
      inkShieldGlyph(scene).setPosition(488, 91).setDepth(61);
    enemyPieces.push(enemyGuard);
    this.enemyGuardBar = this.bar(
      506,
      91,
      290,
      12,
      PAPER.guard,
      false,
      enemyPieces
    );
    this.enemyCard.add(enemyPieces);
    this.enemyCard.setVisible(false);

    // --- Guard button, bottom-right ---
    this.guardButton = scene.add
      .circle(
        GUARD_BUTTON.x,
        GUARD_BUTTON.y,
        GUARD_BUTTON.radius,
        PAPER.panel,
        0.8
      )
      .setStrokeStyle(3, PAPER.guard, 0.8)
      .setDepth(60)
      .setInteractive({ useHandCursor: true });
    addAssetIcon(
      scene,
      'ui_button_guard',
      GUARD_BUTTON.x,
      GUARD_BUTTON.y,
      106,
      60
    );
    if (
      !addAssetIcon(
        scene,
        'ui_guard_icon',
        GUARD_BUTTON.x,
        GUARD_BUTTON.y - 12,
        44,
        61
      )
    ) {
      inkShieldGlyph(scene, PAPER.guard, 1.7)
        .setPosition(GUARD_BUTTON.x, GUARD_BUTTON.y - 12)
        .setDepth(61);
    }
    this.guardLabel = scene.add
      .text(GUARD_BUTTON.x, GUARD_BUTTON.y + 26, 'GUARD', {
        fontFamily: FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        color: PARCHMENT_TEXT,
      })
      .setOrigin(0.5)
      .setDepth(61);

    this.guardButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.guardButton.setScale(0.92);
      this.callbacks.onShieldDown();
    });
    const release = (): void => {
      this.guardButton.setScale(1);
      this.callbacks.onShieldUp();
    };
    this.guardButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, release);
    this.guardButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, release);

    // --- Dodge button, bottom-left (tap, cooldown ring while recharging) ---
    this.dodgeButton = scene.add
      .circle(
        DODGE_BUTTON.x,
        DODGE_BUTTON.y,
        DODGE_BUTTON.radius,
        PAPER.panel,
        0.8
      )
      .setStrokeStyle(3, PAPER.dodge, 0.8)
      .setDepth(60)
      .setInteractive({ useHandCursor: true });
    addAssetIcon(
      scene,
      'ui_button_dodge',
      DODGE_BUTTON.x,
      DODGE_BUTTON.y,
      106,
      60
    );
    this.dodgeGlyph = inkDodgeGlyph(scene, PAPER.dodge, 1.5)
      .setPosition(DODGE_BUTTON.x - 8, DODGE_BUTTON.y - 12)
      .setDepth(61);
    this.dodgeLabel = scene.add
      .text(DODGE_BUTTON.x, DODGE_BUTTON.y + 26, 'DODGE', {
        fontFamily: FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        color: PARCHMENT_TEXT,
      })
      .setOrigin(0.5)
      .setDepth(61);
    this.dodgeRing = scene.add.graphics().setDepth(62);

    this.dodgeButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.dodgeButton.setScale(0.92);
      this.callbacks.onDodgePressed();
    });
    const dodgeRelease = (): void => {
      this.dodgeButton.setScale(1);
    };
    this.dodgeButton.on(
      Phaser.Input.Events.GAMEOBJECT_POINTER_UP,
      dodgeRelease
    );
    this.dodgeButton.on(
      Phaser.Input.Events.GAMEOBJECT_POINTER_OUT,
      dodgeRelease
    );

    // --- Burst meter + button, bottom-center ---
    this.burstPanel = scene.add
      .rectangle(
        BURST_BUTTON.x,
        BURST_BUTTON.y,
        BURST_BUTTON.width,
        BURST_BUTTON.height,
        PAPER.panel,
        0.8
      )
      .setStrokeStyle(3, PAPER.burst, 0.7)
      .setDepth(60)
      .setInteractive({ useHandCursor: true });
    this.burstBar = {
      fill: scene.add
        .rectangle(
          BURST_BUTTON.x - BURST_BUTTON.width / 2 + 5,
          BURST_BUTTON.y,
          BURST_BUTTON.width - 10,
          BURST_BUTTON.height - 12,
          PAPER.burst,
          0.85
        )
        .setOrigin(0, 0.5)
        .setDepth(61),
      width: BURST_BUTTON.width - 10,
    };
    if (
      !addAssetIcon(
        scene,
        'ui_burst_icon',
        BURST_BUTTON.x - 82,
        BURST_BUTTON.y,
        34,
        62
      )
    ) {
      inkSpark(scene, PAPER.parchment, 0.8)
        .setPosition(BURST_BUTTON.x - 82, BURST_BUTTON.y)
        .setDepth(62);
    }
    this.burstLabel = scene.add
      .text(BURST_BUTTON.x + 8, BURST_BUTTON.y, 'BURST', {
        fontFamily: FONT,
        fontSize: '22px',
        fontStyle: 'bold',
        color: PARCHMENT_TEXT,
      })
      .setOrigin(0.5)
      .setDepth(62);
    this.burstPanel.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.callbacks.onBurstPressed();
    });
  }

  /** Show the enemy readout (with its name) or hide it while traveling. */
  setEnemyActive(name: string | null): void {
    if (name) this.enemyNameText.setText(name.toUpperCase());
    this.enemyCard.setVisible(name !== null);
  }

  /** True when the point sits on a HUD control — swipes should not start there. */
  isPointOverUi(x: number, y: number): boolean {
    const overGuard =
      Math.hypot(x - GUARD_BUTTON.x, y - GUARD_BUTTON.y) <=
      GUARD_BUTTON.radius + 12;
    const overDodge =
      Math.hypot(x - DODGE_BUTTON.x, y - DODGE_BUTTON.y) <=
      DODGE_BUTTON.radius + 12;
    const overBurst =
      Math.abs(x - BURST_BUTTON.x) <= BURST_BUTTON.width / 2 + 12 &&
      Math.abs(y - BURST_BUTTON.y) <= BURST_BUTTON.height / 2 + 12;
    return overGuard || overDodge || overBurst;
  }

  update(snapshot: HudSnapshot): void {
    this.setBar(
      this.playerHealthBar,
      snapshot.playerHealth,
      snapshot.playerMaxHealth
    );
    this.setBar(
      this.playerGuardBar,
      snapshot.playerGuard,
      snapshot.playerMaxGuard
    );
    this.setBar(
      this.enemyHealthBar,
      snapshot.enemyHealth,
      snapshot.enemyMaxHealth
    );
    this.setBar(
      this.enemyGuardBar,
      snapshot.enemyGuard,
      snapshot.enemyMaxGuard
    );
    this.setBar(this.burstBar, snapshot.burst, snapshot.burstMax);

    if (snapshot.playerGuardBroken) {
      this.guardButton.setStrokeStyle(3, PAPER.danger, 1);
      this.guardLabel.setText('BROKEN');
    } else {
      this.guardButton.setStrokeStyle(3, PAPER.guard, 0.8);
      this.guardLabel.setText('GUARD');
    }

    // Dodge cooldown: dimmed button with a ring that sweeps back to full.
    const dodgeReady = snapshot.dodgeReady01 >= 1;
    this.dodgeRing.clear();
    if (!dodgeReady) {
      this.dodgeRing.lineStyle(4, PAPER.dodge, 0.9);
      this.dodgeRing.beginPath();
      this.dodgeRing.arc(
        DODGE_BUTTON.x,
        DODGE_BUTTON.y,
        DODGE_BUTTON.radius - 7,
        -Math.PI / 2,
        -Math.PI / 2 + snapshot.dodgeReady01 * Math.PI * 2
      );
      this.dodgeRing.strokePath();
    }
    const dodgePieces = [this.dodgeButton, this.dodgeGlyph, this.dodgeLabel];
    for (const piece of dodgePieces) piece.setAlpha(dodgeReady ? 1 : 0.45);
    if (dodgeReady && !this.dodgeReady) {
      this.scene.tweens.add({
        targets: dodgePieces,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 110,
        yoyo: true,
        ease: 'Sine.easeOut',
      });
    }
    this.dodgeReady = dodgeReady;

    const ready = snapshot.burst >= snapshot.burstMax;
    if (ready !== this.burstReady) {
      this.burstReady = ready;
      if (ready) {
        this.burstLabel.setText('BURST — READY!');
        this.burstPulse = this.scene.tweens.add({
          targets: [this.burstPanel, this.burstLabel],
          scaleX: 1.06,
          scaleY: 1.06,
          duration: 300,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else {
        this.burstLabel.setText('BURST');
        this.burstPulse?.stop();
        this.burstPulse = null;
        this.burstPanel.setScale(1);
        this.burstLabel.setScale(1);
      }
    }
  }

  /** Banner message on a dark plate. */
  showMessage(text: string, accent = '#ffb347', sizePx = 34): void {
    const accentColor = Number.parseInt(accent.replace('#', ''), 16);
    const label = this.scene.add
      .text(662, 190, text, {
        fontFamily: FONT,
        fontSize: `${sizePx}px`,
        fontStyle: 'bold',
        color: PARCHMENT_TEXT,
      })
      .setOrigin(0.5)
      .setDepth(71);
    const plate = paperRect(
      this.scene,
      label.width + 110,
      sizePx + 38,
      PAPER.plate,
      {
        radius: 12,
        strokeWidth: 2,
        strokeColor: accentColor,
        fillAlpha: 0.88,
      }
    )
      .setPosition(640, 190)
      .setDepth(70);
    const spark = inkSpark(this.scene, accentColor, 0.9)
      .setPosition(640 - label.width / 2 - 28, 190)
      .setDepth(71);

    const group = [plate, label, spark];
    for (const part of group) part.setScale(0.6);
    this.scene.tweens.add({
      targets: group,
      scale: 1,
      duration: 150,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: group,
      alpha: 0,
      y: '-=26',
      delay: 760,
      duration: 260,
      onComplete: () => {
        for (const part of group) part.destroy();
      },
    });
  }

  /** Floating combat number at a world position. */
  showFloatingText(x: number, y: number, text: string, color = INK_TEXT): void {
    const floating = this.scene.add
      .text(x, y, text, {
        fontFamily: FONT,
        fontSize: '30px',
        fontStyle: 'bold',
        color,
        stroke: '#0d0a14',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(70);
    this.scene.tweens.add({
      targets: floating,
      y: y - 54,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => floating.destroy(),
    });
  }

  private panel(
    centerX: number,
    centerY: number,
    width: number,
    height: number
  ): void {
    this.panelPiece(centerX, centerY, width, height);
  }

  private panelPiece(
    centerX: number,
    centerY: number,
    width: number,
    height: number
  ): Phaser.GameObjects.Graphics {
    return paperRect(this.scene, width, height, PAPER.panel, {
      radius: 12,
      strokeWidth: 2,
      strokeColor: PAPER.rim,
      fillAlpha: 0.62,
    })
      .setPosition(centerX, centerY)
      .setDepth(59);
  }

  private label(x: number, y: number, text: string): void {
    this.scene.add
      .text(x, y, text, {
        fontFamily: FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: MUTED_TEXT,
      })
      .setOrigin(0, 0)
      .setDepth(61);
  }

  private bar(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    withValue = false,
    collector?: Phaser.GameObjects.GameObject[]
  ): Bar {
    const back = this.scene.add
      .rectangle(x, y, width, height, PAPER.barBack, 0.85)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1.5, PAPER.rim, 0.5)
      .setDepth(60);
    const fill = this.scene.add
      .rectangle(x + 2, y, width - 4, height - 5, color, 0.92)
      .setOrigin(0, 0.5)
      .setDepth(61);
    collector?.push(back, fill);
    const bar: Bar = { fill, width: width - 4 };
    if (withValue) {
      bar.valueText = this.scene.add
        .text(x + width / 2, y, '', {
          fontFamily: FONT,
          fontSize: '13px',
          fontStyle: 'bold',
          color: PARCHMENT_TEXT,
        })
        .setOrigin(0.5)
        .setDepth(62);
      collector?.push(bar.valueText);
    }
    return bar;
  }

  private setBar(bar: Bar, value: number, max: number): void {
    const clamped = Math.max(0, Math.min(1, value / max));
    bar.fill.displayWidth = Math.max(0.0001, bar.width * clamped);
    bar.valueText?.setText(`${Math.ceil(value)} / ${max}`);
  }
}
