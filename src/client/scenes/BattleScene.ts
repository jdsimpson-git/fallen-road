import * as Phaser from 'phaser';
import { PLAYER_BALANCE } from '../../shared/balance/player';
import { SWORD } from '../../shared/balance/weapons';
import {
  ENEMIES,
  GATEKEEPER,
  GAUNTLET_ORDER,
  ROAD_FIGHTS_BEFORE_BOSS,
  ROAD_SOLDIER,
  type EnemyAttackDefinition,
  type EnemyDefinition,
} from '../../shared/balance/enemies';
import { zoneBalance } from '../../shared/balance/hitZones';
import { resolveHit } from '../../shared/combat/hitDetection';
import { computeStrike, blockedDamage, guardBrokenDamage } from '../../shared/combat/damage';
import {
  applyGuardDamage,
  createGuardMeter,
  isGuardBroken,
  regenGuard,
} from '../../shared/combat/guard';
import { resolveDefense } from '../../shared/combat/counter';
import {
  createDodgeState,
  dodgeReadyFraction,
  isDodgeActive,
  startDodge,
} from '../../shared/combat/dodge';
import { canActivateBurst, classifyHitBurstEvent, gainBurst } from '../../shared/combat/burst';
import { isStrikeBlocked } from '../../shared/combat/directionalGuard';
import { PlayerPatternTracker } from '../../shared/combat/patterns';
import { blockedHitGuardCost } from '../../shared/combat/playerGuard';
import { EnemyBrain } from '../../shared/combat/EnemyBrain';
import type {
  ActiveHitZone,
  DodgeState,
  GestureClassification,
  GuardMeter,
  SwipeDirection,
} from '../../shared/combat/types';
import { SwipeInput } from '../combat/SwipeInput';
import { PaperEnemyView } from '../entities/PaperEnemyView';
import { PlayerRigView } from '../entities/PlayerRigView';
import { Hud } from '../ui/Hud';
import { buildBackdrop, spawnRoadsideDrift } from '../ui/backdrop';
import { damageVignette, drawSlashTrail, spawnPaperFragments } from '../ui/effects';
import { DODGE_TEXT, FONT, MUTED_TEXT, PAPER, PARCHMENT_TEXT } from '../ui/theme';

const ENEMY_POSITION = { x: 700, y: 600 };
const FIRST_TRAVEL_MS = 2400;
const TRAVEL_MS = 4200;
const HEAL_PER_KILL = 18;

type Mode = 'travel' | 'fight' | 'over';

type RunStats = {
  foesFelled: number;
  damageDealt: number;
  damageTaken: number;
  weakPointHits: number;
  perfectCounters: number;
  attacksEvaded: number;
};

/**
 * The road itself: one continuous scene. The player walks toward the tower;
 * enemies step out of the fog one after another; the run ends only in death.
 */
export class BattleScene extends Phaser.Scene {
  private mode: Mode;
  private encounterNumber: number;

  private def: EnemyDefinition | null;
  private enemyView: PaperEnemyView | null;
  private brain: EnemyBrain | null;
  private enemyHealth: number;
  private enemyGuard: GuardMeter;
  private enemyGuardBrokenState: boolean;

  private rig: PlayerRigView;
  private hud: Hud;
  private tracker: PlayerPatternTracker;

  private playerHealth: number;
  private playerGuard: GuardMeter;
  private playerBurst: number;
  private playerDodge: DodgeState;
  private holdingBlock: boolean;
  private lastShieldPressAt: number | null;
  private nextAttackReadyAt: number;

  private hitStopUntil: number;
  private burstActive: boolean;
  private nextSpawnAt: number;
  private runStartAt: number;
  private stats: RunStats;

  constructor() {
    super('Battle');
  }

  create(): void {
    this.tweens.timeScale = 1;
    this.mode = 'travel';
    this.encounterNumber = 1;
    this.def = null;
    this.enemyView = null;
    this.brain = null;
    this.enemyHealth = 0;
    this.enemyGuard = createGuardMeter(1);
    this.enemyGuardBrokenState = false;
    this.playerHealth = PLAYER_BALANCE.maxHealth;
    this.playerGuard = createGuardMeter(PLAYER_BALANCE.maxGuard);
    this.playerBurst = 0;
    this.playerDodge = createDodgeState();
    this.holdingBlock = false;
    this.lastShieldPressAt = null;
    this.nextAttackReadyAt = 0;
    this.hitStopUntil = 0;
    this.burstActive = false;
    this.runStartAt = this.time.now;
    this.stats = {
      foesFelled: 0,
      damageDealt: 0,
      damageTaken: 0,
      weakPointHits: 0,
      perfectCounters: 0,
      attacksEvaded: 0,
    };
    this.tracker = new PlayerPatternTracker();

    buildBackdrop(this);
    this.rig = new PlayerRigView(this);
    this.hud = new Hud(this, {
      onShieldDown: () => this.pressShield(),
      onShieldUp: () => this.releaseShield(),
      onDodgePressed: () => this.pressDodge(),
      onBurstPressed: () => this.tryActivateBurst(),
    });
    this.hud.setEnemyActive(null);

    new SwipeInput(this, {
      isBlockedAt: (x, y) => this.hud.isPointOverUi(x, y),
      onGesture: (gesture) => this.onGesture(gesture),
    });

    // Desktop controls: Space or right mouse to block, Shift to dodge, Q for burst.
    this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
      if (!event.repeat) this.pressShield();
    });
    this.input.keyboard?.on('keyup-SPACE', () => this.releaseShield());
    this.input.keyboard?.on('keydown-SHIFT', (event: KeyboardEvent) => {
      if (!event.repeat) this.pressDodge();
    });
    this.input.keyboard?.on('keydown-Q', () => this.tryActivateBurst());
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) this.pressShield();
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonReleased()) this.releaseShield();
    });

    // Roadside silhouettes rush past while walking.
    this.time.addEvent({
      delay: 640,
      loop: true,
      callback: () => {
        if (this.mode === 'travel') spawnRoadsideDrift(this);
      },
    });

    this.hud.showMessage('THE ROAD TO THE TOWER', '#ffb347', 30);
    this.nextSpawnAt = this.time.now + FIRST_TRAVEL_MS;
  }

  override update(time: number, delta: number): void {
    const inHitStop = time < this.hitStopUntil;
    this.tweens.timeScale = inHitStop ? 0.05 : 1;

    // Player stamina does not regenerate — it refills only on a won duel.
    if (this.mode === 'fight' && this.brain && this.def && this.enemyView && !inHitStop) {
      this.brain.update(time, {
        healthFraction: this.enemyHealth / this.def.maxHealth,
        signals: this.tracker.signals(),
      });
      this.enemyView.updateIdle(time);
      this.enemyGuard = regenGuard(this.enemyGuard, time, delta, this.brain.isBlocking(), {
        regenPerSecond: this.def.guardRegenPerSecond,
        regenDelayMs: this.def.guardRegenDelayMs,
      });
    }

    if (this.mode === 'travel' && time >= this.nextSpawnAt) {
      this.spawnEnemy();
    }

    this.hud.update({
      playerHealth: this.playerHealth,
      playerMaxHealth: PLAYER_BALANCE.maxHealth,
      playerGuard: this.playerGuard.current,
      playerMaxGuard: this.playerGuard.max,
      playerGuardBroken: isGuardBroken(this.playerGuard, time),
      dodgeReady01: dodgeReadyFraction(this.playerDodge, time, PLAYER_BALANCE.dodgeCooldownMs),
      burst: this.playerBurst,
      burstMax: PLAYER_BALANCE.burstMax,
      enemyHealth: this.enemyHealth,
      enemyMaxHealth: this.def?.maxHealth ?? 1,
      enemyGuard: this.enemyGuard.current,
      enemyMaxGuard: this.enemyGuard.max,
    });
  }

  // ------------------------------------------------------------------
  // Encounter flow
  // ------------------------------------------------------------------

  private spawnEnemy(): void {
    const bossFight = this.encounterNumber > ROAD_FIGHTS_BEFORE_BOSS;
    const id = GAUNTLET_ORDER[(this.encounterNumber - 1) % GAUNTLET_ORDER.length]!;
    const def = bossFight ? GATEKEEPER : (ENEMIES[id] ?? ROAD_SOLDIER);
    this.def = def;
    this.enemyHealth = def.maxHealth;
    this.enemyGuard = createGuardMeter(def.maxGuard);
    this.enemyGuardBrokenState = false;

    const view = new PaperEnemyView(this, ENEMY_POSITION.x, ENEMY_POSITION.y, def);
    view.playSpawn();
    this.enemyView = view;

    this.brain = new EnemyBrain(
      def,
      {
        onTelegraphStart: (attack, impactAt) =>
          view.playTelegraph(
            Math.max(1, impactAt - this.time.now),
            PLAYER_BALANCE.counterWindowMs,
            attack.style
          ),
        onAttackImpact: (attack) => this.onEnemyAttackImpact(attack),
        onRecoverStart: () => view.playRecover(),
        onBlockStart: (stance) => view.playBlock(stance),
        onBlockEnd: () => view.endBlock(),
        onDodgeStart: (direction) =>
          view.playDodge(direction, def.behavior.dodgeDurationMs, def.behavior.dodgeDistance),
        onDodgeEnd: () => {},
        onCounterStanceStart: (totalMs) => view.showCounterStance(totalMs),
        onCounterStanceEnd: () => view.hideCounterStance(),
        onParry: () => this.onParried(),
        onStaggerStart: () => view.playStagger(),
        onGuardBreakStart: () => this.onEnemyGuardBreak(),
        onVulnerableEnd: () => this.onEnemyVulnerableEnd(),
        onPhaseChange: (phase) => {
          view.playPhaseChange();
          const phaseMessages: Record<string, string> = {
            enraged: 'THE DUELIST IS ENRAGED!',
            'gate-fury': "THE GATEKEEPER'S FURY RISES!",
            'last-stand': 'THE GATEKEEPER MAKES A LAST STAND!',
          };
          this.hud.showMessage(phaseMessages[phase.id] ?? 'THE FOE CHANGES STANCE!', '#d94f3d');
          this.cameras.main.shake(120, 0.005);
        },
      },
      Math.random,
      this.time.now + 700
    );

    this.hud.setEnemyActive(def.name);
    if (bossFight) {
      this.hud.showMessage('THE GATEKEEPER BARS THE GATES', '#ffd75e', 30);
      this.cameras.main.shake(200, 0.006);
    } else {
      this.hud.showMessage(`A ${def.name.toUpperCase()} BLOCKS THE ROAD`, '#d94f3d', 26);
    }
    this.mode = 'fight';
  }

  private onEnemyFelled(): void {
    if (!this.enemyView || this.mode !== 'fight') return;
    const felled = this.def;
    const view = this.enemyView;
    this.mode = 'travel';
    this.stats.foesFelled += 1;
    this.encounterNumber += 1;
    this.playerBurst = gainBurst(this.playerBurst, 'kill', PLAYER_BALANCE.burstMax);
    this.playerHealth = Math.min(PLAYER_BALANCE.maxHealth, this.playerHealth + HEAL_PER_KILL);
    // Winning the duel is the only thing that repairs the shield.
    this.playerGuard = createGuardMeter(PLAYER_BALANCE.maxGuard);
    this.holdingBlock = false;
    this.lastShieldPressAt = null;
    this.rig.restoreShield();
    this.brain?.notifyDied();
    this.hud.setEnemyActive(null);

    const torso = view.getHitZones().find((z) => z.id === 'torso');
    if (torso) spawnPaperFragments(this, torso.shape.x, torso.shape.y, 18);
    view.playDeath(() => {
      view.destroy();
      if (this.enemyView === view) {
        this.enemyView = null;
        this.brain = null;
        this.def = null;
      }
    });

    if (felled?.tier === 'boss') {
      this.handleTriumph();
    } else {
      const gatesNext = this.encounterNumber > ROAD_FIGHTS_BEFORE_BOSS;
      this.time.delayedCall(900, () => {
        if (this.mode !== 'over') {
          this.hud.showMessage(
            gatesNext ? 'THE CASTLE GATES LOOM AHEAD' : 'THE ROAD CONTINUES',
            '#ffb347',
            28
          );
        }
      });
      this.nextSpawnAt = this.time.now + (gatesNext ? TRAVEL_MS + 1000 : TRAVEL_MS);
    }
    void this.recordVictory();
  }

  private async recordVictory(): Promise<void> {
    try {
      await fetch('/api/victory', { method: 'POST' });
    } catch {
      // Offline or local dev — the run continues regardless.
    }
  }

  // ------------------------------------------------------------------
  // Player offense
  // ------------------------------------------------------------------

  private onGesture(gesture: GestureClassification): void {
    if (gesture.kind !== 'swipe') return;
    if (this.mode === 'over' || this.burstActive) return;
    const now = this.time.now;

    if (isGuardBroken(this.playerGuard, now)) {
      this.hud.showFloatingText(gesture.end.x, gesture.end.y, 'stunned', '#d94f3d');
      return;
    }
    // The shield commits you: no swinging while it is raised.
    if (this.holdingBlock) {
      this.hud.showFloatingText(gesture.end.x, gesture.end.y, 'guarding', MUTED_TEXT);
      return;
    }
    if (now < this.nextAttackReadyAt) return;
    this.nextAttackReadyAt = now + (gesture.heavy ? SWORD.heavy.recoveryMs : SWORD.recoveryMs);

    this.rig.swing(gesture.direction, gesture.heavy);

    const brain = this.brain;
    const view = this.enemyView;
    const def = this.def;
    if (this.mode !== 'fight' || !brain || !view || !def || brain.isDead()) {
      drawSlashTrail(this, gesture.path, gesture.heavy, false);
      return;
    }

    const hitZone = resolveHit(gesture.path, view.getHitZones());
    drawSlashTrail(this, gesture.path, gesture.heavy, hitZone !== null);
    this.tracker.recordAttack(gesture.direction, hitZone?.id ?? null, now);

    if (!hitZone) {
      const note = brain.isDodging() ? 'DODGED' : 'miss';
      this.hud.showFloatingText(gesture.end.x, gesture.end.y, note, MUTED_TEXT);
      return;
    }

    // Striking into a live counter stance gets parried and punished.
    if (brain.isCounterStanceActive(now)) {
      brain.triggerRiposte(now);
      return;
    }

    const zonePos = this.zoneCenter(hitZone);
    const strike = computeStrike(SWORD, hitZone.id, gesture.heavy);
    const stance = brain.currentStance();

    if (stance && isStrikeBlocked(stance, hitZone.id, gesture.direction)) {
      // The guard covers this strike: chip damage plus real guard pressure.
      const chip = blockedDamage(strike.damage, def.blockDamageReduction);
      this.enemyHealth = Math.max(0, this.enemyHealth - chip);
      this.stats.damageDealt += chip;
      view.playBlockedHit();
      spawnPaperFragments(this, zonePos.x - 40, zonePos.y, 3, PAPER.guard);
      this.hud.showFloatingText(zonePos.x, zonePos.y - 20, 'BLOCKED', '#4f8fdd');
      this.applyEnemyGuardDamage(strike.guardDamage, now);
    } else {
      const zoneInfo = zoneBalance(hitZone.id);
      const damage = brain.isVulnerable()
        ? guardBrokenDamage(strike.damage, def.guardBrokenDamageTakenMultiplier)
        : strike.damage;
      this.enemyHealth = Math.max(0, this.enemyHealth - damage);
      this.stats.damageDealt += damage;
      if (zoneInfo.weakPoint) this.stats.weakPointHits += 1;
      this.playerBurst = gainBurst(
        this.playerBurst,
        classifyHitBurstEvent(zoneInfo.weakPoint, gesture.heavy),
        PLAYER_BALANCE.burstMax
      );
      view.playHitReaction(hitZone.id, gesture.heavy);
      spawnPaperFragments(this, zonePos.x, zonePos.y, gesture.heavy ? 10 : 6);
      this.hud.showFloatingText(
        zonePos.x,
        zonePos.y - 24,
        `-${damage}`,
        zoneInfo.weakPoint ? '#d94f3d' : PARCHMENT_TEXT
      );
      if (zoneInfo.weakPoint || gesture.heavy) {
        this.hitStopUntil = now + 70;
        this.cameras.main.shake(90, 0.004);
      }

      // Zone side effects: leg hits slow, weapon-hand hits can interrupt.
      const slow = zoneInfo.slow;
      if (slow) {
        brain.applySlow(now, slow.durationMs, slow.factor);
        this.hud.showFloatingText(zonePos.x, zonePos.y - 60, 'SLOWED', '#4f8fdd');
      }
      if (
        zoneInfo.interruptChance !== undefined &&
        brain.isTelegraphing() &&
        Math.random() < zoneInfo.interruptChance
      ) {
        brain.notifyInterrupted(now);
        this.hud.showMessage('INTERRUPTED!', '#4f8fdd', 30);
      }
    }

    if (this.enemyHealth <= 0) this.onEnemyFelled();
  }

  private zoneCenter(zone: ActiveHitZone): { x: number; y: number } {
    return { x: zone.shape.x, y: zone.shape.y };
  }

  private applyEnemyGuardDamage(amount: number, now: number): void {
    if (this.enemyGuardBrokenState || !this.def || !this.brain) return;
    const result = applyGuardDamage(this.enemyGuard, amount, now, this.def.guardBreakDurationMs);
    this.enemyGuard = result.meter;
    if (result.broke) this.brain.notifyGuardBroken(now);
  }

  private onEnemyGuardBreak(): void {
    this.enemyGuardBrokenState = true;
    this.enemyView?.playGuardBreak();
    this.hud.showMessage('ENEMY GUARD BROKEN!', '#d94f3d');
    const torso = this.enemyView?.getHitZones().find((z) => z.id === 'torso');
    if (torso) spawnPaperFragments(this, torso.shape.x, torso.shape.y, 14);
    this.cameras.main.shake(140, 0.006);
  }

  private onEnemyVulnerableEnd(): void {
    this.enemyView?.endVulnerable();
    if (this.enemyGuardBrokenState) {
      this.enemyGuardBrokenState = false;
      // A recovered foe straightens up with partial guard, not zero.
      this.enemyGuard = {
        ...this.enemyGuard,
        current: Math.round(this.enemyGuard.max * 0.4),
      };
    }
  }

  /** The player's strike was caught by the Duelist's counter stance. */
  private onParried(): void {
    this.enemyView?.playParry();
    this.hud.showMessage('PARRIED!', '#d94f3d', 32);
    this.cameras.main.shake(90, 0.004);
    // The riposte itself arrives via the normal telegraph -> impact flow,
    // so it can still be blocked or perfect-countered.
  }

  // ------------------------------------------------------------------
  // Player defense
  // ------------------------------------------------------------------

  private pressShield(): void {
    if (this.mode === 'over') return;
    const now = this.time.now;
    this.lastShieldPressAt = now;
    if (isGuardBroken(this.playerGuard, now)) return;
    if (!this.holdingBlock) {
      this.holdingBlock = true;
      this.tracker.recordBlock(now);
      this.rig.raiseShield();
    }
  }

  private releaseShield(): void {
    if (!this.holdingBlock) return;
    this.holdingBlock = false;
    if (!isGuardBroken(this.playerGuard, this.time.now) && this.mode !== 'over') {
      this.rig.lowerShield();
    }
  }

  /** Tap dodge: brief evasion frames on a cooldown. Stun still locks it out. */
  private pressDodge(): void {
    if (this.mode === 'over' || this.burstActive) return;
    const now = this.time.now;
    if (isGuardBroken(this.playerGuard, now)) return;
    const result = startDodge(this.playerDodge, now, PLAYER_BALANCE);
    if (!result.started) return;
    this.playerDodge = result.state;
    this.rig.playDodge(PLAYER_BALANCE.dodgeDurationMs);
  }

  private onEnemyAttackImpact(attack: EnemyAttackDefinition): void {
    if (this.mode !== 'fight') return;
    const now = this.time.now;

    // A live dodge slips the blow entirely — no damage, no guard chip.
    if (isDodgeActive(this.playerDodge, now)) {
      this.stats.attacksEvaded += 1;
      this.playerBurst = gainBurst(this.playerBurst, 'evade', PLAYER_BALANCE.burstMax);
      this.rig.evadeFlash();
      this.hud.showFloatingText(420, 500, 'EVADED', DODGE_TEXT);
      return;
    }

    const outcome = resolveDefense(
      {
        holdingBlock: this.holdingBlock,
        lastShieldPressAt: this.lastShieldPressAt,
        guardBroken: isGuardBroken(this.playerGuard, now),
      },
      now,
      PLAYER_BALANCE.counterWindowMs
    );

    switch (outcome) {
      case 'counter': {
        this.stats.perfectCounters += 1;
        this.tracker.recordCounter(now);
        this.playerBurst = gainBurst(this.playerBurst, 'perfectCounter', PLAYER_BALANCE.burstMax);
        this.rig.counterFlash();
        this.hud.showMessage('PERFECT COUNTER!', '#4f8fdd');
        this.cameras.main.flash(90, 40, 40, 80);
        this.cameras.main.zoomTo(1.05, 80, 'Sine.easeOut', true);
        this.time.delayedCall(150, () => this.cameras.main.zoomTo(1, 140, 'Sine.easeIn', true));
        this.brain?.notifyCountered(now);
        this.applyEnemyGuardDamage(attack.counterGuardDamage, now);
        break;
      }
      case 'block': {
        const leak = blockedDamage(attack.damage, PLAYER_BALANCE.blockDamageReduction);
        this.damagePlayer(leak, false);
        this.playerBurst = gainBurst(this.playerBurst, 'normalBlock', PLAYER_BALANCE.burstMax);
        this.cameras.main.shake(70, 0.003);
        spawnPaperFragments(this, 300, 620, 4, PAPER.guard);
        // Shield durability gets chewed up quickly: most foes shatter it in 2-3 blocks.
        const durabilityCost = blockedHitGuardCost(attack.damage, PLAYER_BALANCE);
        const result = applyGuardDamage(
          this.playerGuard,
          durabilityCost,
          now,
          PLAYER_BALANCE.shieldDestroyedUntilNextFightMs
        );
        this.playerGuard = result.meter;
        if (result.broke) this.onPlayerGuardBroken();
        break;
      }
      case 'hit': {
        this.damagePlayer(attack.damage, true);
        break;
      }
    }
  }

  private onPlayerGuardBroken(): void {
    this.holdingBlock = false;
    this.lastShieldPressAt = null;
    this.rig.breakShield();
    this.hud.showMessage('SHIELD DESTROYED!', '#d94f3d');
    spawnPaperFragments(this, 300, 640, 14, PAPER.guard);
    this.cameras.main.shake(160, 0.008);
  }

  private damagePlayer(amount: number, fullHit: boolean): void {
    if (amount <= 0 || this.mode === 'over') return;
    this.playerHealth = Math.max(0, this.playerHealth - amount);
    this.stats.damageTaken += amount;
    if (fullHit) {
      damageVignette(this);
      this.cameras.main.shake(140, 0.006);
      this.hud.showFloatingText(420, 480, `-${amount}`, '#d94f3d');
    }
    if (this.playerHealth <= 0) this.handleDefeat();
  }

  // ------------------------------------------------------------------
  // Burst
  // ------------------------------------------------------------------

  private tryActivateBurst(): void {
    const now = this.time.now;
    if (this.mode !== 'fight' || this.burstActive || !this.brain || this.brain.isDead()) return;
    if (!canActivateBurst(this.playerBurst, PLAYER_BALANCE.burstMax)) return;
    if (isGuardBroken(this.playerGuard, now)) return;

    // Bursting is an all-out attack — the shield drops for it.
    this.releaseShield();
    this.burstActive = true;
    this.playerBurst = 0;
    const burst = SWORD.burst;
    const totalMs = 200 + burst.hits * burst.hitIntervalMs;
    this.brain.notifyBurstLock(now, totalMs + 200);
    this.hud.showMessage(burst.name.toUpperCase(), '#ffb347', 32);
    this.cameras.main.flash(120, 40, 40, 80);

    for (let i = 0; i < burst.hits; i++) {
      this.time.delayedCall(200 + i * burst.hitIntervalMs, () => this.applyBurstHit(i));
    }
    this.time.delayedCall(totalMs + 120, () => {
      this.burstActive = false;
    });
  }

  private applyBurstHit(index: number): void {
    if (this.mode !== 'fight' || !this.brain || !this.enemyView || !this.def) return;
    if (this.brain.isDead()) return;
    const burst = SWORD.burst;
    const directions: SwipeDirection[] = ['left', 'downRight', 'right', 'downLeft', 'down'];
    const direction = directions[index % directions.length]!;
    this.rig.swing(direction, false);

    const zones = this.enemyView.getHitZones();
    const target = zones.find((z) => z.id === (index % 2 === 0 ? 'torso' : 'head')) ?? zones[0];
    const center = target ? this.zoneCenter(target) : { x: ENEMY_POSITION.x, y: 460 };

    const angle = Math.random() * Math.PI;
    const reach = 130;
    drawSlashTrail(
      this,
      [
        { x: center.x - Math.cos(angle) * reach, y: center.y - Math.sin(angle) * reach },
        { x: center.x + Math.cos(angle) * reach, y: center.y + Math.sin(angle) * reach },
      ],
      false,
      true
    );

    this.enemyHealth = Math.max(0, this.enemyHealth - burst.damagePerHit);
    this.stats.damageDealt += burst.damagePerHit;
    this.enemyGuard = applyGuardDamage(
      this.enemyGuard,
      burst.guardDamagePerHit,
      this.time.now,
      this.def.guardBreakDurationMs
    ).meter;
    this.enemyView.playHitReaction(target?.id ?? 'torso', false);
    spawnPaperFragments(this, center.x, center.y, 5);
    this.hud.showFloatingText(center.x, center.y - 24, `-${burst.damagePerHit}`, '#ffb347');
    this.cameras.main.shake(60, 0.003);

    if (this.enemyHealth <= 0) this.onEnemyFelled();
  }

  // ------------------------------------------------------------------
  // Run end: death or triumph
  // ------------------------------------------------------------------

  private handleDefeat(): void {
    if (this.mode === 'over') return;
    this.mode = 'over';
    this.holdingBlock = false;
    this.hud.showMessage('YOU HAVE FALLEN', '#d94f3d', 46);
    this.cameras.main.shake(220, 0.01);
    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0).setDepth(85);
    this.tweens.add({ targets: overlay, fillAlpha: 0.55, duration: 700 });
    this.time.delayedCall(900, () => this.showEndPanel(false));
  }

  /** The Gatekeeper is down — the run is won at the castle gates. */
  private handleTriumph(): void {
    if (this.mode === 'over') return;
    this.mode = 'over';
    this.holdingBlock = false;
    this.hud.showMessage('THE GATES OPEN', '#ffd75e', 46);
    this.cameras.main.flash(300, 60, 50, 20);
    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0).setDepth(85);
    this.tweens.add({ targets: overlay, fillAlpha: 0.4, duration: 900 });
    this.time.delayedCall(1300, () => this.showEndPanel(true));
  }

  private showEndPanel(victory: boolean): void {
    const durationSec = Math.round((this.time.now - this.runStartAt) / 1000);
    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.3).setDepth(90).setInteractive();

    const panel = this.add
      .rectangle(640, 360, 560, 420, PAPER.plate, 0.96)
      .setStrokeStyle(3, victory ? PAPER.counterCue : PAPER.rim)
      .setDepth(91);
    panel.setInteractive();
    this.add
      .text(640, 208, victory ? 'THE GATES OPEN' : 'THE ROAD CLAIMS YOU', {
        fontFamily: FONT,
        fontSize: '36px',
        fontStyle: 'bold',
        color: victory ? '#ffd75e' : '#d94f3d',
      })
      .setOrigin(0.5)
      .setDepth(92);

    const lines = [
      victory ? 'The Gatekeeper has fallen. The road is yours.' : '',
      `Foes felled: ${this.stats.foesFelled}`,
      `Damage dealt: ${this.stats.damageDealt}`,
      `Damage taken: ${this.stats.damageTaken}`,
      `Weak-point hits: ${this.stats.weakPointHits}`,
      `Perfect counters: ${this.stats.perfectCounters}`,
      `Attacks evaded: ${this.stats.attacksEvaded}`,
      `The road held you for ${durationSec}s`,
    ].filter((line) => line !== '');
    this.add
      .text(640, 330, lines.join('\n'), {
        fontFamily: FONT,
        fontSize: '21px',
        color: PARCHMENT_TEXT,
        align: 'center',
        lineSpacing: 7,
      })
      .setOrigin(0.5)
      .setDepth(92);

    this.endButton(640, 478, 'WALK AGAIN', () => this.scene.restart());
    this.endButton(640, 534, 'RETURN HOME', () => this.scene.start('Home'), true);
  }

  private endButton(x: number, y: number, label: string, onClick: () => void, minor = false): void {
    const button = this.add
      .rectangle(x, y, minor ? 300 : 360, minor ? 42 : 54, minor ? PAPER.plate : PAPER.cardboard)
      .setStrokeStyle(2.5, minor ? PAPER.rim : PAPER.burst, 0.9)
      .setDepth(92)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y, label, {
        fontFamily: FONT,
        fontSize: minor ? '17px' : '22px',
        fontStyle: 'bold',
        color: PARCHMENT_TEXT,
      })
      .setOrigin(0.5)
      .setDepth(93);
    button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () =>
      button.setStrokeStyle(2.5, PAPER.counterCue, 1)
    );
    button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () =>
      button.setStrokeStyle(2.5, minor ? PAPER.rim : PAPER.burst, 0.9)
    );
    button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      text.setScale(0.95);
      onClick();
    });
  }
}
