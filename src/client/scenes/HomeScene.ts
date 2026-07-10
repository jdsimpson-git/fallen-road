import * as Phaser from 'phaser';
import {
  DailyLeaderboardResponseSchema,
  DailyRunStartResponseSchema,
  FallenRivalClaimResponseSchema,
  InitResponseSchema,
} from '../../shared/api';
import { buildBackdrop } from '../ui/backdrop';
import { FONT, MUTED_TEXT, PAPER, PARCHMENT_TEXT } from '../ui/theme';
import { paperRect } from '../ui/paperShapes';

export class HomeScene extends Phaser.Scene {
  private greeting: Phaser.GameObjects.Text;
  private communityLine: Phaser.GameObjects.Text;
  private dailyLine: Phaser.GameObjects.Text;
  private leaderboardLine: Phaser.GameObjects.Text;
  private beginButton: Phaser.GameObjects.Rectangle;
  private beginLabel: Phaser.GameObjects.Text;
  private startingDailyRun = false;

  constructor() {
    super('Home');
  }

  /** Phaser reuses Scene instances, so clear per-visit input locks here. */
  init(): void {
    this.startingDailyRun = false;
  }

  create(): void {
    buildBackdrop(this);

    // Title with an ember glow.
    const title = this.add
      .text(640, 150, 'FALLEN ROAD', {
        fontFamily: FONT,
        fontSize: '84px',
        fontStyle: 'bold',
        color: PARCHMENT_TEXT,
      })
      .setOrigin(0.5);
    title.setShadow(0, 0, '#b05c33', 24, true, true);
    this.add
      .text(640, 216, "Your death becomes someone else's enemy.", {
        fontFamily: FONT,
        fontSize: '22px',
        fontStyle: 'italic',
        color: MUTED_TEXT,
      })
      .setOrigin(0.5);

    this.greeting = this.add
      .text(640, 260, 'The road awaits.', {
        fontFamily: FONT,
        fontSize: '17px',
        color: MUTED_TEXT,
      })
      .setOrigin(0.5);

    const rivalButton = this.add
      .rectangle(1060, 260, 220, 38, PAPER.plate, 0.92)
      .setStrokeStyle(2, PAPER.rim, 0.9)
      .setInteractive({ useHandCursor: true });
    const rivalLabel = this.add
      .text(1060, 260, 'AVENGE A RIVAL', {
        fontFamily: FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: PARCHMENT_TEXT,
      })
      .setOrigin(0.5);
    rivalButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () =>
      rivalButton.setStrokeStyle(2, PAPER.counterCue, 1)
    );
    rivalButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () =>
      rivalButton.setStrokeStyle(2, PAPER.rim, 0.9)
    );
    rivalButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () =>
      this.seekFallenRival(rivalButton, rivalLabel)
    );

    // How to fight.
    paperRect(this, 820, 124, PAPER.panel, {
      radius: 12,
      strokeWidth: 2,
      strokeColor: PAPER.rim,
      fillAlpha: 0.55,
    }).setPosition(640, 340);
    this.add
      .text(
        640,
        340,
        'SWIPE to attack\n' +
          'Aim for heads, guard gaps, legs, and sword hands\n' +
          'HOLD GUARD to block. A few hits shatter it.\n' +
          'Tap golden flashes to counter. Fill BURST.',
        {
          fontFamily: FONT,
          fontSize: '16px',
          color: PARCHMENT_TEXT,
          align: 'center',
          lineSpacing: 7,
        }
      )
      .setOrigin(0.5);

    // Begin button.
    this.beginButton = this.add
      .rectangle(640, 470, 400, 76, PAPER.plate, 0.95)
      .setStrokeStyle(3, PAPER.burst, 0.9)
      .setInteractive({ useHandCursor: true });
    this.beginLabel = this.add
      .text(640, 470, 'WALK THE ROAD', {
        fontFamily: FONT,
        fontSize: '28px',
        fontStyle: 'bold',
        color: PARCHMENT_TEXT,
      })
      .setOrigin(0.5);
    this.beginLabel.setShadow(0, 0, '#ffb347', 10, true, true);
    this.tweens.add({
      targets: [this.beginButton, this.beginLabel],
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.beginButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () =>
      this.beginButton.setStrokeStyle(3, PAPER.counterCue, 1)
    );
    this.beginButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () =>
      this.beginButton.setStrokeStyle(3, PAPER.burst, 0.9)
    );
    this.beginButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () =>
      this.startDailyRun()
    );

    this.dailyLine = this.add
      .text(640, 530, 'TODAY’S RANKED ROAD: one route, one Gambit deck, one throne.', {
        fontFamily: FONT,
        fontSize: '15px',
        fontStyle: 'italic',
        color: MUTED_TEXT,
      })
      .setOrigin(0.5)
      .setAlpha(0.9);

    this.communityLine = this.add
      .text(640, 566, '', {
        fontFamily: FONT,
        fontSize: '16px',
        color: MUTED_TEXT,
      })
      .setOrigin(0.5);

    this.leaderboardLine = this.add
      .text(640, 626, '', {
        fontFamily: FONT,
        fontSize: '14px',
        color: MUTED_TEXT,
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(
        640,
        694,
        'Choose Gambits, trade with the peddler, and build your way to the throne.',
        {
          fontFamily: FONT,
          fontSize: '13px',
          fontStyle: 'italic',
          color: MUTED_TEXT,
        }
      )
      .setOrigin(0.5)
      .setAlpha(0.6);

    this.fetchInit();
    this.fetchDailyLeaderboard();
  }

  private fetchInit(): void {
    void (async () => {
      try {
        const response = await fetch('/api/init');
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = InitResponseSchema.parse(await response.json());
        if (!this.greeting.active) return;
        this.greeting.setText(`u/${data.username} walks the road tonight.`);
        if (data.totalVictories > 0) {
          this.communityLine.setText(
            `${data.totalVictories} ${data.totalVictories === 1 ? 'foe' : 'foes'} felled by this community.`
          );
        }
      } catch {
        // Local dev or offline — keep the default greeting.
      }
    })();
  }

  private startDailyRun(): void {
    if (this.startingDailyRun) return;
    this.startingDailyRun = true;
    this.beginButton.disableInteractive();
    this.beginLabel.setText('PREPARING THE ROAD…');
    void (async () => {
      try {
        const response = await fetch('/api/runs/start', { method: 'POST' });
        if (!response.ok) throw new Error(`Daily run error: ${response.status}`);
        const dailyRun = DailyRunStartResponseSchema.parse(await response.json());
        this.scene.start('Battle', { stage: 'road', dailyRun });
      } catch {
        // Local static previews have no Devvit server. Keep them playable,
        // but make their unranked status explicit.
        if (!this.dailyLine.active) return;
        this.dailyLine.setText('SERVER UNAVAILABLE — STARTING AN UNRANKED PRACTICE ROAD.');
        this.scene.start('Battle', { stage: 'road' });
      }
    })();
  }

  private fetchDailyLeaderboard(): void {
    void (async () => {
      try {
        const response = await fetch('/api/leaderboard/daily');
        if (!response.ok) throw new Error(`Leaderboard error: ${response.status}`);
        const data = DailyLeaderboardResponseSchema.parse(await response.json());
        if (!this.leaderboardLine.active) return;
        const leaders = data.leaderboard.slice(0, 3);
        this.leaderboardLine.setText(
          leaders.length === 0
            ? 'TODAY’S LEADERS — the first throne is still unclaimed.'
            : [
                'TODAY’S LEADERS',
                ...leaders.map(
                  (entry, index) => `${index + 1}. u/${entry.username} — ${entry.score}`
                ),
              ].join('\n')
        );
      } catch {
        // The static preview is intentionally unranked.
      }
    })();
  }

  private seekFallenRival(
    button: Phaser.GameObjects.Rectangle,
    label: Phaser.GameObjects.Text
  ): void {
    button.disableInteractive();
    label.setText('SEEKING…');
    void (async () => {
      try {
        const response = await fetch('/api/rivals/claim', { method: 'POST' });
        if (!response.ok) throw new Error(`Rival error: ${response.status}`);
        const data = FallenRivalClaimResponseSchema.parse(await response.json());
        if (!data.rival) {
          if (this.dailyLine.active)
            this.dailyLine.setText('NO FALLEN RIVAL IS WAITING YET. LEAVE AN ECHO ON THE DAILY ROAD.');
          button.setInteractive({ useHandCursor: true });
          label.setText('AVENGE A RIVAL');
          return;
        }
        this.scene.start('Battle', { stage: 'rival', rival: data.rival });
      } catch {
        if (this.dailyLine.active)
          this.dailyLine.setText('THE RIVAL ROAD IS UNAVAILABLE RIGHT NOW.');
        button.setInteractive({ useHandCursor: true });
        label.setText('AVENGE A RIVAL');
      }
    })();
  }
}
