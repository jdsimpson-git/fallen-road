import * as Phaser from 'phaser';
import { InitResponseSchema } from '../../shared/api';
import { buildBackdrop } from '../ui/backdrop';
import { FONT, MUTED_TEXT, PAPER, PARCHMENT_TEXT } from '../ui/theme';
import { paperRect } from '../ui/paperShapes';

export class HomeScene extends Phaser.Scene {
  private greeting: Phaser.GameObjects.Text;
  private communityLine: Phaser.GameObjects.Text;

  constructor() {
    super('Home');
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
    const begin = this.add
      .rectangle(640, 470, 400, 76, PAPER.plate, 0.95)
      .setStrokeStyle(3, PAPER.burst, 0.9)
      .setInteractive({ useHandCursor: true });
    const beginLabel = this.add
      .text(640, 470, 'WALK THE ROAD', {
        fontFamily: FONT,
        fontSize: '28px',
        fontStyle: 'bold',
        color: PARCHMENT_TEXT,
      })
      .setOrigin(0.5);
    beginLabel.setShadow(0, 0, '#ffb347', 10, true, true);
    this.tweens.add({
      targets: [begin, beginLabel],
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    begin.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () =>
      begin.setStrokeStyle(3, PAPER.counterCue, 1)
    );
    begin.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () =>
      begin.setStrokeStyle(3, PAPER.burst, 0.9)
    );
    begin.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () =>
      // Explicit stage: Phaser reuses stale scene data when none is passed.
      this.scene.start('Battle', { stage: 'road' })
    );

    this.add
      .text(640, 530, 'Walk until the road claims you. Every foe felled lights another window.', {
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

    this.add
      .text(
        640,
        694,
        'Combat slice — weapons, Gambits, merchants and Fallen Rivals lie further down the road.',
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
}
