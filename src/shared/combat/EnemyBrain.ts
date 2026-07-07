import type {
  BlockStanceDefinition,
  DecisionWeights,
  EnemyAttackDefinition,
  EnemyDefinition,
  EnemyPhaseDefinition,
} from '../balance/enemies';
import {
  adaptStanceWeight,
  adaptWeights,
  EMPTY_SIGNALS,
  type PatternSignals,
} from './patterns';

export type EnemyBrainState =
  | 'idle'
  | 'telegraph'
  | 'recover'
  | 'block'
  | 'dodge'
  | 'counterStance'
  | 'staggered'
  | 'guardBroken'
  | 'dead';

export type DodgeDirection = -1 | 1;

export type EnemyBrainEvents = {
  onTelegraphStart: (attack: EnemyAttackDefinition, impactAt: number) => void;
  onAttackImpact: (attack: EnemyAttackDefinition) => void;
  onRecoverStart: () => void;
  onBlockStart: (stance: BlockStanceDefinition) => void;
  onBlockEnd: () => void;
  onDodgeStart: (direction: DodgeDirection) => void;
  onDodgeEnd: () => void;
  onCounterStanceStart: (totalMs: number) => void;
  onCounterStanceEnd: () => void;
  /** The player struck into a live counter stance and will eat a riposte. */
  onParry: () => void;
  onStaggerStart: () => void;
  onGuardBreakStart: () => void;
  onVulnerableEnd: () => void;
  onPhaseChange: (phase: EnemyPhaseDefinition) => void;
};

export type EnemyBrainContext = {
  /** Enemy health fraction 0..1, drives phase transitions. */
  healthFraction: number;
  /** Player habit signals for adaptation. */
  signals: PatternSignals;
};

const DEFAULT_CONTEXT: EnemyBrainContext = {
  healthFraction: 1,
  signals: EMPTY_SIGNALS,
};
const INTERRUPT_STAGGER_MS = 450;

type Decision = 'attack' | 'block' | 'dodge' | 'counter' | 'wait';

/**
 * Time-driven finite state machine for one enemy. It owns behavior choices
 * and timing; the scene owns health/guard numbers and rendering. All state
 * changes flow through `update(now, ctx)` plus explicit notifications, so
 * the brain has no framework dependency and is fully unit-testable.
 */
export class EnemyBrain {
  private state: EnemyBrainState = 'idle';
  private stateUntil = 0;
  private nextDecisionAt: number;
  private lastDefensiveActionAt = Number.NEGATIVE_INFINITY;
  private currentAttack: EnemyAttackDefinition | null = null;
  private impactAt = 0;
  private impactFired = false;

  private activeStance: BlockStanceDefinition | null = null;

  private counterActiveFrom = 0;
  private counterCooldownUntil = 0;

  private slowUntil = 0;
  private slowFactor = 1;

  private telegraphMultiplier = 1;
  private recoverMultiplier = 1;
  private weights: DecisionWeights;
  private appliedPhaseIds = new Set<string>();

  constructor(
    private readonly def: EnemyDefinition,
    private readonly events: EnemyBrainEvents,
    private readonly rng: () => number = Math.random,
    startAt = 0
  ) {
    this.weights = { ...def.behavior.weights };
    this.nextDecisionAt = startAt + this.rollDecisionDelay();
  }

  get currentState(): EnemyBrainState {
    return this.state;
  }

  isBlocking(): boolean {
    return this.state === 'block';
  }

  currentStance(): BlockStanceDefinition | null {
    return this.state === 'block' ? this.activeStance : null;
  }

  isDodging(): boolean {
    return this.state === 'dodge';
  }

  isTelegraphing(): boolean {
    return this.state === 'telegraph';
  }

  isCounterStanceActive(now: number): boolean {
    return this.state === 'counterStance' && now >= this.counterActiveFrom;
  }

  /** Exposed and taking bonus damage (guard broken or countered). */
  isVulnerable(): boolean {
    return this.state === 'guardBroken' || this.state === 'staggered';
  }

  isDead(): boolean {
    return this.state === 'dead';
  }

  update(now: number, ctx: EnemyBrainContext = DEFAULT_CONTEXT): void {
    if (this.state === 'dead') return;

    this.applyPhases(ctx.healthFraction);

    if (this.state === 'telegraph') {
      if (!this.impactFired && now >= this.impactAt && this.currentAttack) {
        this.impactFired = true;
        const attack = this.currentAttack;
        this.currentAttack = null;
        this.events.onAttackImpact(attack);
        const followUp = this.rollComboFollowUp(attack);
        if (followUp) {
          // Chain straight into the next swing — no recovery gap.
          this.beginTelegraph(followUp, now);
        } else {
          this.enter(
            'recover',
            now,
            this.scaled(attack.recoverMs, now) * this.recoverMultiplier
          );
          this.events.onRecoverStart();
        }
      }
      return;
    }

    if (now < this.stateUntil) return;

    switch (this.state) {
      case 'block':
        this.events.onBlockEnd();
        this.activeStance = null;
        this.becomeIdle(now);
        break;
      case 'dodge':
        this.events.onDodgeEnd();
        this.becomeIdle(now);
        break;
      case 'counterStance':
        // Window expired unanswered — the stance was wasted.
        this.events.onCounterStanceEnd();
        this.startCounterCooldown(now);
        this.becomeIdle(now);
        break;
      case 'staggered':
      case 'guardBroken':
        this.events.onVulnerableEnd();
        this.becomeIdle(now);
        break;
      case 'recover':
        this.becomeIdle(now);
        break;
      case 'idle':
        if (now >= this.nextDecisionAt) this.decide(now, ctx);
        break;
    }
  }

  /** The player perfect-countered this enemy's attack. */
  notifyCountered(now: number): void {
    if (this.state === 'dead') return;
    this.cancelTransientState();
    this.currentAttack = null;
    this.events.onStaggerStart();
    this.enter('staggered', now, this.def.staggerDurationMs);
  }

  /** A weapon-hand hit interrupted the wind-up. */
  notifyInterrupted(now: number): void {
    if (this.state !== 'telegraph') return;
    this.currentAttack = null;
    this.events.onStaggerStart();
    this.enter('staggered', now, INTERRUPT_STAGGER_MS);
  }

  /** The enemy's guard meter was emptied by player pressure. */
  notifyGuardBroken(now: number): void {
    if (this.state === 'dead') return;
    this.cancelTransientState();
    this.currentAttack = null;
    this.events.onGuardBreakStart();
    this.enter('guardBroken', now, this.def.guardBreakDurationMs);
  }

  /** A player burst locks the enemy down for its full duration. */
  notifyBurstLock(now: number, durationMs: number): void {
    if (this.state === 'dead') return;
    this.cancelTransientState();
    this.currentAttack = null;
    if (this.state !== 'staggered' && this.state !== 'guardBroken') {
      this.events.onStaggerStart();
      this.enter('staggered', now, durationMs);
    } else {
      this.stateUntil = Math.max(this.stateUntil, now + durationMs);
    }
  }

  /** Leg hits slow every subsequent action for a while. */
  applySlow(now: number, durationMs: number, factor: number): void {
    this.slowUntil = Math.max(this.slowUntil, now + durationMs);
    this.slowFactor = factor;
  }

  isSlowed(now: number): boolean {
    return now < this.slowUntil;
  }

  /**
   * The player's strike landed inside a live counter stance: parry it and
   * riposte. Returns the riposte attack, or null when the stance is not live.
   */
  triggerRiposte(now: number): EnemyAttackDefinition | null {
    if (!this.isCounterStanceActive(now) || !this.def.counterStance)
      return null;
    const riposte = this.def.attacks.find(
      (a) => a.id === this.def.counterStance?.riposteAttackId
    );
    if (!riposte) return null;
    this.events.onCounterStanceEnd();
    this.events.onParry();
    this.startCounterCooldown(now);
    this.beginTelegraph(riposte, now);
    return riposte;
  }

  notifyDied(): void {
    this.state = 'dead';
    this.currentAttack = null;
  }

  // ------------------------------------------------------------------

  private cancelTransientState(): void {
    if (this.state === 'block') {
      this.events.onBlockEnd();
      this.activeStance = null;
    }
    if (this.state === 'dodge') this.events.onDodgeEnd();
    if (this.state === 'counterStance') {
      this.events.onCounterStanceEnd();
      this.startCounterCooldown(this.stateUntil - this.totalCounterMs());
    }
  }

  private totalCounterMs(): number {
    const cs = this.def.counterStance;
    return cs ? cs.startupMs + cs.activeMs : 0;
  }

  private startCounterCooldown(now: number): void {
    const cs = this.def.counterStance;
    if (cs) this.counterCooldownUntil = now + cs.cooldownMs;
  }

  private applyPhases(healthFraction: number): void {
    for (const phase of this.def.phases ?? []) {
      if (this.appliedPhaseIds.has(phase.id)) continue;
      if (healthFraction > phase.healthFractionBelow) continue;
      this.appliedPhaseIds.add(phase.id);
      this.telegraphMultiplier *= phase.telegraphSpeedMultiplier ?? 1;
      this.recoverMultiplier *= phase.recoverMultiplier ?? 1;
      this.weights = { ...this.weights, ...phase.weightOverrides };
      this.events.onPhaseChange(phase);
    }
  }

  /** Action durations stretch while slowed. */
  private scaled(durationMs: number, now: number): number {
    return durationMs * (now < this.slowUntil ? this.slowFactor : 1);
  }

  private becomeIdle(now: number): void {
    this.state = 'idle';
    this.nextDecisionAt = now + this.rollDecisionDelay();
  }

  private enter(state: EnemyBrainState, now: number, durationMs: number): void {
    this.state = state;
    this.stateUntil = now + durationMs;
  }

  private rollDecisionDelay(): number {
    const [min, max] = this.def.behavior.decisionIntervalMs;
    return min + this.rng() * (max - min);
  }

  private rollComboFollowUp(
    attack: EnemyAttackDefinition
  ): EnemyAttackDefinition | null {
    const combo = attack.comboFollowUp;
    if (!combo || this.rng() >= combo.chance) return null;
    return this.def.attacks.find((a) => a.id === combo.attackId) ?? null;
  }

  private beginTelegraph(attack: EnemyAttackDefinition, now: number): void {
    const telegraphMs =
      this.scaled(attack.telegraphMs, now) * this.telegraphMultiplier;
    this.currentAttack = attack;
    this.impactAt = now + telegraphMs;
    this.impactFired = false;
    this.state = 'telegraph';
    this.stateUntil = this.impactAt;
    this.events.onTelegraphStart(attack, this.impactAt);
  }

  private decide(now: number, ctx: EnemyBrainContext): void {
    switch (this.pickDecision(now, ctx)) {
      case 'attack': {
        const attack = this.pickWeighted(
          this.def.attacks.filter((a) => a.weight > 0),
          (a) => a.weight
        );
        if (!attack) {
          this.becomeIdle(now);
          return;
        }
        this.beginTelegraph(attack, now);
        break;
      }
      case 'block': {
        const stance = this.pickWeighted(this.def.blockStances, (s) =>
          adaptStanceWeight(
            s.weight,
            s.adaptToSignal,
            ctx.signals,
            this.def.adaptation.cap
          )
        );
        if (!stance) {
          this.becomeIdle(now);
          return;
        }
        this.lastDefensiveActionAt = now;
        this.activeStance = stance;
        this.events.onBlockStart(stance);
        this.enter(
          'block',
          now,
          this.scaled(this.def.behavior.blockDurationMs, now)
        );
        break;
      }
      case 'dodge': {
        this.lastDefensiveActionAt = now;
        const direction: DodgeDirection = this.rng() < 0.5 ? -1 : 1;
        this.events.onDodgeStart(direction);
        this.enter(
          'dodge',
          now,
          this.scaled(this.def.behavior.dodgeDurationMs, now)
        );
        break;
      }
      case 'counter': {
        const cs = this.def.counterStance;
        if (!cs) {
          this.becomeIdle(now);
          return;
        }
        this.lastDefensiveActionAt = now;
        const total = this.scaled(cs.startupMs + cs.activeMs, now);
        this.counterActiveFrom = now + this.scaled(cs.startupMs, now);
        this.events.onCounterStanceStart(total);
        this.enter('counterStance', now, total);
        break;
      }
      case 'wait':
        this.becomeIdle(now);
        break;
    }
  }

  private pickDecision(now: number, ctx: EnemyBrainContext): Decision {
    const adapted = adaptWeights(
      this.weights,
      ctx.signals,
      this.def.adaptation
    );
    const defenseReady =
      now - this.lastDefensiveActionAt >= this.def.behavior.defensiveCooldownMs;
    const counterReady =
      defenseReady &&
      this.def.counterStance !== undefined &&
      now >= this.counterCooldownUntil;

    const entries: [Decision, number][] = [
      ['attack', adapted.attack],
      [
        'block',
        defenseReady && this.def.blockStances.length > 0 ? adapted.block : 0,
      ],
      [
        'dodge',
        defenseReady && this.def.behavior.dodgeDistance > 0 ? adapted.dodge : 0,
      ],
      ['counter', counterReady ? adapted.counter : 0],
      ['wait', adapted.wait],
    ];
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    if (total <= 0) return 'wait';
    let roll = this.rng() * total;
    for (const [decision, weight] of entries) {
      roll -= weight;
      if (roll < 0) return decision;
    }
    return 'wait';
  }

  private pickWeighted<T>(
    items: readonly T[],
    weightOf: (item: T) => number
  ): T | null {
    const total = items.reduce((sum, item) => sum + weightOf(item), 0);
    if (total <= 0) return items[0] ?? null;
    let roll = this.rng() * total;
    for (const item of items) {
      roll -= weightOf(item);
      if (roll < 0) return item;
    }
    return items[items.length - 1] ?? null;
  }
}
