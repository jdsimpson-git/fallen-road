import * as Phaser from 'phaser';
import { inkSpark, paperRect, tornPaperRect } from '../ui/paperShapes';
import { FONT, MUTED_TEXT, PAPER, PARCHMENT_TEXT } from '../ui/theme';

/** Scene key used when registering the reward overlay in the Phaser config. */
export const REWARD_SCENE_KEY = 'Reward';

/**
 * Optional registry hand-off for callers which cannot pass scene data
 * directly. The payload is consumed when the scene opens, preventing a
 * later reward screen from accidentally reusing it.
 */
export const REWARD_SCENE_REGISTRY_KEY = 'rewardSceneData';

/** Emitted on `scene.game.events` after the player chooses a reward. */
export const REWARD_SELECTED_EVENT = 'reward-selected';

export type RewardChoice = {
  /** Stable application id, such as a Gambit id or a weapon id. */
  id: string;
  /** Short name shown prominently on the card. */
  title: string;
  /** Player-facing explanation of what the reward does. */
  description: string;
  /** Optional smaller mechanical summary, for example "+12% heavy damage". */
  detail?: string;
  /** Small label above the name. Defaults to "REWARD". */
  category?: string;
  /** Phaser color number used for the card's ink highlight. */
  accent?: number;
};

/** The reward screen deliberately always presents a meaningful three-way choice. */
export type RewardChoices = readonly [RewardChoice, RewardChoice, RewardChoice];

export type RewardSelection = {
  choice: RewardChoice;
  index: 0 | 1 | 2;
};

export type RewardSelectionListener = (selection: RewardSelection) => void;

export type RewardSceneData = {
  choices: RewardChoices;
  title?: string;
  subtitle?: string;
  /** A direct, typed result channel for the scene that opened this overlay. */
  onSelected?: RewardSelectionListener;
  /** When supplied, this paused scene resumes after the choice is confirmed. */
  resumeScene?: string;
};

type RewardIndex = RewardSelection['index'];

type RewardCard = {
  container: Phaser.GameObjects.Container;
  highlight: Phaser.GameObjects.Graphics;
  accent: number;
};

const CARD_WIDTH = 340;
const CARD_HEIGHT = 342;
const CARD_Y = 444;
const CARD_X: readonly [number, number, number] = [230, 640, 1050];
const REWARD_INDICES: readonly RewardIndex[] = [0, 1, 2];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isRewardChoice = (value: unknown): value is RewardChoice => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    (value.detail === undefined || typeof value.detail === 'string') &&
    (value.category === undefined || typeof value.category === 'string') &&
    (value.accent === undefined || typeof value.accent === 'number')
  );
};

const isRewardSceneData = (value: unknown): value is RewardSceneData => {
  if (!isRecord(value) || !Array.isArray(value.choices) || value.choices.length !== 3) {
    return false;
  }
  return (
    value.choices.every(isRewardChoice) &&
    (value.title === undefined || typeof value.title === 'string') &&
    (value.subtitle === undefined || typeof value.subtitle === 'string') &&
    (value.onSelected === undefined || typeof value.onSelected === 'function') &&
    (value.resumeScene === undefined || typeof value.resumeScene === 'string')
  );
};

/** Put a reward payload in the registry before launching `RewardScene` without data. */
export const setRewardSceneData = (scene: Phaser.Scene, data: RewardSceneData): void => {
  scene.registry.set(REWARD_SCENE_REGISTRY_KEY, data);
};

/** Subscribe once to the global result event when a callback is inconvenient. */
export const onceRewardSelected = (
  scene: Phaser.Scene,
  listener: RewardSelectionListener
): void => {
  scene.game.events.once(REWARD_SELECTED_EVENT, listener);
};

/**
 * A lightweight, reusable overlay for post-fight choices. It is intentionally
 * UI-only: gameplay owns applying the reward and chooses whether to pause or
 * resume its scene through the supplied data.
 */
export class RewardScene extends Phaser.Scene {
  private rewardData: RewardSceneData | null = null;
  private selected = false;
  private root: Phaser.GameObjects.Container | null = null;
  private cards: RewardCard[] = [];

  constructor() {
    super(REWARD_SCENE_KEY);
  }

  init(data?: RewardSceneData): void {
    const registryData = this.registry.get(REWARD_SCENE_REGISTRY_KEY);
    if (isRewardSceneData(registryData)) {
      this.rewardData = registryData;
      this.registry.remove(REWARD_SCENE_REGISTRY_KEY);
    } else {
      this.rewardData = isRewardSceneData(data) ? data : null;
    }
    this.selected = false;
    this.cards = [];
  }

  create(): void {
    if (!this.rewardData) {
      this.showMissingData();
      return;
    }

    this.root = this.add.container(0, 0).setDepth(200);
    this.addToRoot(
      this.add
        .rectangle(640, 360, 1280, 720, PAPER.ink, 0.8)
        .setInteractive()
    );

    this.addTitle();
    for (const index of REWARD_INDICES) {
      this.createRewardCard(this.rewardData.choices[index], index);
    }

    const hint = this.add
      .text(640, 672, 'Choose one — tap a card or press 1, 2, or 3', {
        fontFamily: FONT,
        fontSize: '17px',
        fontStyle: 'italic',
        color: MUTED_TEXT,
      })
      .setOrigin(0.5);
    this.addToRoot(hint);

    this.input.keyboard?.on('keydown-ONE', this.chooseFirst, this);
    this.input.keyboard?.on('keydown-TWO', this.chooseSecond, this);
    this.input.keyboard?.on('keydown-THREE', this.chooseThird, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.removeKeyboardListeners, this);
  }

  private addTitle(): void {
    if (!this.rewardData) return;
    const title = this.add
      .text(640, 102, this.rewardData.title ?? 'CHOOSE YOUR REWARD', {
        fontFamily: FONT,
        fontSize: '48px',
        fontStyle: 'bold',
        color: PARCHMENT_TEXT,
      })
      .setOrigin(0.5);
    title.setShadow(0, 0, '#ffb347', 16, true, true);
    this.addToRoot(title);

    const subtitle = this.add
      .text(
        640,
        153,
        this.rewardData.subtitle ?? 'The road grants one boon. The other paths fade.',
        {
          fontFamily: FONT,
          fontSize: '20px',
          fontStyle: 'italic',
          color: MUTED_TEXT,
        }
      )
      .setOrigin(0.5);
    this.addToRoot(subtitle);

    const rule = paperRect(this, 760, 3, PAPER.rim, { strokeWidth: 0, fillAlpha: 0.65 })
      .setPosition(640, 190);
    this.addToRoot(rule);
  }

  private createRewardCard(choice: RewardChoice, index: RewardIndex): void {
    const accent = choice.accent ?? this.accentFor(index);
    const card = this.add
      .container(CARD_X[index], CARD_Y)
      .setSize(CARD_WIDTH, CARD_HEIGHT)
      .setAlpha(0)
      .setScale(0.92);
    const body = tornPaperRect(this, CARD_WIDTH, CARD_HEIGHT, PAPER.plate, {
      strokeWidth: 3,
      strokeColor: PAPER.rim,
      fillAlpha: 0.97,
      jitter: 4,
    });
    const highlight = paperRect(this, CARD_WIDTH - 12, CARD_HEIGHT - 12, accent, {
      radius: 14,
      strokeWidth: 2.5,
      strokeColor: accent,
      fillAlpha: 0.08,
    }).setAlpha(0);
    const topPlate = paperRect(this, CARD_WIDTH - 32, 38, PAPER.panel, {
      radius: 8,
      strokeWidth: 1.5,
      strokeColor: accent,
      fillAlpha: 0.9,
    }).setPosition(0, -130);
    const number = this.add
      .text(-132, -130, `${index + 1}`, {
        fontFamily: FONT,
        fontSize: '17px',
        fontStyle: 'bold',
        color: PARCHMENT_TEXT,
      })
      .setOrigin(0.5);
    const category = this.add
      .text(10, -130, (choice.category ?? 'REWARD').toUpperCase(), {
        fontFamily: FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: this.colorString(accent),
      })
      .setOrigin(0.5);
    const spark = inkSpark(this, accent, 0.78).setPosition(-105, -76);
    const title = this.add
      .text(0, -76, choice.title.toUpperCase(), {
        fontFamily: FONT,
        fontSize: '28px',
        fontStyle: 'bold',
        color: PARCHMENT_TEXT,
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 48, useAdvancedWrap: true },
      })
      .setOrigin(0.5);
    const description = this.add
      .text(0, 18, choice.description, {
        fontFamily: FONT,
        fontSize: '19px',
        color: PARCHMENT_TEXT,
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: CARD_WIDTH - 56, useAdvancedWrap: true },
      })
      .setOrigin(0.5);

    card.add([body, highlight, topPlate, number, category, spark, title, description]);

    if (choice.detail) {
      const detailPlate = paperRect(this, CARD_WIDTH - 52, 42, PAPER.panel, {
        radius: 8,
        strokeWidth: 1.5,
        strokeColor: accent,
        fillAlpha: 0.85,
      }).setPosition(0, 118);
      const detail = this.add
        .text(0, 118, choice.detail, {
          fontFamily: FONT,
          fontSize: '16px',
          fontStyle: 'bold',
          color: this.colorString(accent),
          align: 'center',
          wordWrap: { width: CARD_WIDTH - 72, useAdvancedWrap: true },
        })
        .setOrigin(0.5);
      card.add([detailPlate, detail]);
    }

    card.setInteractive({ useHandCursor: true });
    card.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => this.highlightCard(index, true));
    card.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => this.highlightCard(index, false));
    card.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.select(index));
    this.cards.push({ container: card, highlight, accent });
    this.addToRoot(card);

    this.tweens.add({
      targets: card,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      delay: 80 + index * 100,
      duration: 260,
      ease: 'Back.easeOut',
    });
  }

  private highlightCard(index: RewardIndex, active: boolean): void {
    if (this.selected) return;
    const card = this.cards[index];
    if (!card) return;
    card.highlight.setAlpha(active ? 0.58 : 0);
    this.tweens.add({
      targets: card.container,
      scaleX: active ? 1.025 : 1,
      scaleY: active ? 1.025 : 1,
      duration: 100,
      ease: 'Sine.easeOut',
    });
  }

  private select(index: RewardIndex): void {
    if (this.selected || !this.rewardData) return;
    this.selected = true;
    const selection: RewardSelection = {
      choice: this.rewardData.choices[index],
      index,
    };
    const selectedCard = this.cards[index];
    if (selectedCard) selectedCard.highlight.setAlpha(0.88);

    this.rewardData.onSelected?.(selection);
    this.game.events.emit(REWARD_SELECTED_EVENT, selection);

    this.tweens.add({
      targets: this.root ?? [],
      alpha: 0,
      delay: 180,
      duration: 210,
      ease: 'Sine.easeIn',
      onComplete: () => {
        const resumeScene = this.rewardData?.resumeScene;
        this.scene.stop();
        if (resumeScene && this.scene.isPaused(resumeScene)) this.scene.resume(resumeScene);
      },
    });
  }

  private showMissingData(): void {
    this.add.rectangle(640, 360, 1280, 720, PAPER.ink, 0.9).setInteractive();
    this.add
      .text(640, 332, 'THE ROAD HAS NO REWARD TO OFFER', {
        fontFamily: FONT,
        fontSize: '34px',
        fontStyle: 'bold',
        color: PARCHMENT_TEXT,
      })
      .setOrigin(0.5);
    this.add
      .text(640, 382, 'Open this scene with three reward choices.', {
        fontFamily: FONT,
        fontSize: '20px',
        color: MUTED_TEXT,
      })
      .setOrigin(0.5);
  }

  private accentFor(index: RewardIndex): number {
    const accents: readonly [number, number, number] = [
      PAPER.burst,
      PAPER.dodge,
      PAPER.guard,
    ];
    return accents[index];
  }

  private colorString(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private addToRoot(...objects: Phaser.GameObjects.GameObject[]): void {
    this.root?.add(objects);
  }

  private chooseFirst(): void {
    this.select(0);
  }

  private chooseSecond(): void {
    this.select(1);
  }

  private chooseThird(): void {
    this.select(2);
  }

  private removeKeyboardListeners(): void {
    this.input.keyboard?.off('keydown-ONE', this.chooseFirst, this);
    this.input.keyboard?.off('keydown-TWO', this.chooseSecond, this);
    this.input.keyboard?.off('keydown-THREE', this.chooseThird, this);
  }
}
