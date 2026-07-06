import { describe, expect, it } from 'vitest';
import type {
  DecisionWeights,
  EnemyAttackDefinition,
  EnemyDefinition,
} from '../balance/enemies';
import { EnemyBrain, type EnemyBrainEvents } from './EnemyBrain';
import { EMPTY_SIGNALS } from './patterns';

const SLASH: EnemyAttackDefinition = {
  id: 'slash',
  style: 'slash',
  telegraphMs: 1000,
  damage: 10,
  recoverMs: 500,
  counterGuardDamage: 20,
  weight: 100,
};

const RIPOSTE: EnemyAttackDefinition = {
  id: 'riposte',
  style: 'thrust',
  telegraphMs: 380,
  damage: 16,
  recoverMs: 620,
  counterGuardDamage: 16,
  weight: 0,
};

const makeDef = (
  weights: Partial<DecisionWeights>,
  overrides: Partial<EnemyDefinition> = {}
): EnemyDefinition => ({
  id: 'test-foe',
  name: 'Test Foe',
  tagline: '',
  tier: 'basic',
  maxHealth: 100,
  maxGuard: 50,
  blockDamageReduction: 0.8,
  guardBreakDurationMs: 2000,
  guardBrokenDamageTakenMultiplier: 1.5,
  staggerDurationMs: 800,
  guardRegenPerSecond: 10,
  guardRegenDelayMs: 800,
  attacks: [SLASH, RIPOSTE],
  blockStances: [
    {
      id: 'center',
      weight: 100,
      blockedZones: ['torso'],
      blockedDirections: [],
    },
  ],
  behavior: {
    decisionIntervalMs: [500, 500],
    weights: {
      attack: 0,
      block: 0,
      dodge: 0,
      counter: 0,
      wait: 100,
      ...weights,
    },
    blockDurationMs: 600,
    dodgeDurationMs: 400,
    dodgeDistance: 100,
    defensiveCooldownMs: 0,
    headBob: { amplitudeX: 10, amplitudeY: 5, periodMs: 2000 },
  },
  adaptation: {
    cap: 2,
    blockingBoostsAttack: 0,
    spamBoostsDodge: 0,
    spamBoostsCounter: 0,
    horizontalBoostsDodge: 0,
    zoneFocusBoostsBlock: 0,
  },
  hitZones: [
    { id: 'head', type: 'circle', radius: 30, attachTo: 'head' },
    {
      id: 'torso',
      type: 'rect',
      halfWidth: 50,
      halfHeight: 70,
      attachTo: 'torso',
    },
  ],
  ...overrides,
});

type EventLog = { name: string; args: unknown[] }[];

const makeEvents = (): { events: EnemyBrainEvents; log: EventLog } => {
  const log: EventLog = [];
  const record =
    (name: string) =>
    (...args: unknown[]): void => {
      log.push({ name, args });
    };
  return {
    log,
    events: {
      onTelegraphStart: record('telegraphStart'),
      onAttackImpact: record('attackImpact'),
      onRecoverStart: record('recoverStart'),
      onBlockStart: record('blockStart'),
      onBlockEnd: record('blockEnd'),
      onDodgeStart: record('dodgeStart'),
      onDodgeEnd: record('dodgeEnd'),
      onCounterStanceStart: record('counterStanceStart'),
      onCounterStanceEnd: record('counterStanceEnd'),
      onParry: record('parry'),
      onStaggerStart: record('staggerStart'),
      onGuardBreakStart: record('guardBreakStart'),
      onVulnerableEnd: record('vulnerableEnd'),
      onPhaseChange: record('phaseChange'),
    },
  };
};

const names = (log: EventLog): string[] => log.map((e) => e.name);
const ctx = (healthFraction = 1) => ({
  healthFraction,
  signals: EMPTY_SIGNALS,
});

describe('EnemyBrain attack cycle', () => {
  it('telegraphs after the decision interval and lands the impact on time', () => {
    const { events, log } = makeEvents();
    const brain = new EnemyBrain(
      makeDef({ attack: 100, wait: 0 }),
      events,
      () => 0,
      0
    );

    brain.update(499, ctx());
    expect(log).toHaveLength(0);

    brain.update(500, ctx());
    expect(names(log)).toEqual(['telegraphStart']);
    expect(log[0]!.args[1]).toBe(1500); // impactAt = 500 + telegraph 1000
    expect(brain.isTelegraphing()).toBe(true);

    brain.update(1499, ctx());
    expect(names(log)).toEqual(['telegraphStart']);

    brain.update(1500, ctx());
    expect(names(log)).toEqual([
      'telegraphStart',
      'attackImpact',
      'recoverStart',
    ]);

    brain.update(2000, ctx()); // recover (500ms) ends
    brain.update(2500, ctx()); // next decision
    expect(names(log)).toEqual([
      'telegraphStart',
      'attackImpact',
      'recoverStart',
      'telegraphStart',
    ]);
  });

  it('never lands the impact after a weapon-hand interrupt', () => {
    const { events, log } = makeEvents();
    const brain = new EnemyBrain(
      makeDef({ attack: 100, wait: 0 }),
      events,
      () => 0,
      0
    );
    brain.update(500, ctx());
    brain.notifyInterrupted(700);
    expect(names(log)).toEqual(['telegraphStart', 'staggerStart']);
    expect(brain.isVulnerable()).toBe(true);

    brain.update(1150, ctx()); // 450ms interrupt stagger ends
    brain.update(1500, ctx()); // original impact time
    expect(names(log)).toEqual([
      'telegraphStart',
      'staggerStart',
      'vulnerableEnd',
    ]);
  });
});

describe('EnemyBrain defense gating', () => {
  it('does not dodge when the archetype has no dodge distance', () => {
    const { events, log } = makeEvents();
    const def = makeDef(
      { dodge: 100, wait: 10 },
      {
        behavior: {
          ...makeDef({}).behavior,
          weights: { attack: 0, block: 0, dodge: 100, counter: 0, wait: 10 },
          dodgeDistance: 0,
        },
      }
    );
    const brain = new EnemyBrain(def, events, () => 0, 0);
    brain.update(500, ctx());
    expect(names(log)).toEqual([]);
    expect(brain.isDodging()).toBe(false);
  });

  it('enforces the defensive cooldown between blocks', () => {
    const { events, log } = makeEvents();
    const def = makeDef(
      { block: 100, wait: 0 },
      {
        behavior: {
          ...makeDef({}).behavior,
          weights: { attack: 0, block: 100, dodge: 0, counter: 0, wait: 0 },
          defensiveCooldownMs: 5000,
        },
      }
    );
    const brain = new EnemyBrain(def, events, () => 0, 0);
    brain.update(500, ctx());
    expect(names(log)).toEqual(['blockStart']);
    brain.update(1100, ctx()); // block (600ms) ends
    brain.update(1600, ctx()); // next decision: cooldown active -> wait
    expect(names(log)).toEqual(['blockStart', 'blockEnd']);

    brain.update(5500, ctx()); // decision past the cooldown
    expect(names(log)).toEqual(['blockStart', 'blockEnd', 'blockStart']);
  });
});

describe('EnemyBrain counter stance', () => {
  const counterDef = (cooldownMs = 3000): EnemyDefinition =>
    makeDef(
      { counter: 100, wait: 0 },
      {
        counterStance: {
          startupMs: 200,
          activeMs: 400,
          riposteAttackId: 'riposte',
          cooldownMs,
        },
      }
    );

  it('has a startup tell before the window becomes live', () => {
    const { events, log } = makeEvents();
    const brain = new EnemyBrain(counterDef(), events, () => 0, 0);
    brain.update(500, ctx());
    expect(names(log)).toEqual(['counterStanceStart']);
    expect(log[0]!.args[0]).toBe(600); // startup + active
    expect(brain.isCounterStanceActive(650)).toBe(false);
    expect(brain.isCounterStanceActive(700)).toBe(true);
  });

  it('parries a strike in the live window and ripostes with the fast attack', () => {
    const { events, log } = makeEvents();
    const brain = new EnemyBrain(counterDef(), events, () => 0, 0);
    brain.update(500, ctx());

    const riposte = brain.triggerRiposte(750);
    expect(riposte?.id).toBe('riposte');
    expect(names(log)).toEqual([
      'counterStanceStart',
      'counterStanceEnd',
      'parry',
      'telegraphStart',
    ]);
    expect(log[3]!.args[1]).toBe(750 + RIPOSTE.telegraphMs);

    brain.update(750 + RIPOSTE.telegraphMs, ctx());
    expect(names(log)).toContain('attackImpact');
  });

  it('refuses to riposte during startup or after expiry', () => {
    const { events } = makeEvents();
    const brain = new EnemyBrain(counterDef(), events, () => 0, 0);
    brain.update(500, ctx());
    expect(brain.triggerRiposte(600)).toBeNull(); // startup
    brain.update(1100, ctx()); // expires unanswered
    expect(brain.triggerRiposte(1150)).toBeNull();
  });

  it('respects the counter-stance cooldown after an unanswered stance', () => {
    const { events, log } = makeEvents();
    const brain = new EnemyBrain(counterDef(3000), events, () => 0, 0);
    brain.update(500, ctx());
    brain.update(1100, ctx()); // stance expires -> cooldown until 4100
    for (let t = 1600; t < 4100; t += 500) brain.update(t, ctx());
    expect(names(log).filter((n) => n === 'counterStanceStart')).toHaveLength(
      1
    );

    brain.update(4600, ctx());
    expect(names(log).filter((n) => n === 'counterStanceStart')).toHaveLength(
      2
    );
  });
});

describe('EnemyBrain slow and phases', () => {
  it('stretches telegraphs while slowed', () => {
    const { events, log } = makeEvents();
    const brain = new EnemyBrain(
      makeDef({ attack: 100, wait: 0 }),
      events,
      () => 0,
      0
    );
    brain.applySlow(0, 5000, 1.5);
    expect(brain.isSlowed(400)).toBe(true);
    brain.update(500, ctx());
    expect(log[0]!.args[1]).toBe(500 + 1500); // telegraph 1000 * 1.5
  });

  it('applies a phase once when health crosses the threshold', () => {
    const { events, log } = makeEvents();
    const def = makeDef(
      { attack: 0, wait: 100 },
      {
        phases: [
          {
            id: 'enraged',
            healthFractionBelow: 0.5,
            telegraphSpeedMultiplier: 0.5,
            weightOverrides: { attack: 100, wait: 0 },
          },
        ],
      }
    );
    const brain = new EnemyBrain(def, events, () => 0, 0);

    brain.update(500, ctx(1)); // healthy: waits
    expect(names(log)).toEqual([]);

    brain.update(1000, ctx(0.4)); // crosses the threshold
    expect(names(log)).toEqual(['phaseChange', 'telegraphStart']);
    expect(log[1]!.args[1]).toBe(1000 + 500); // telegraph halved

    brain.update(1500, ctx(0.3)); // impact; phase must not re-fire
    expect(names(log).filter((n) => n === 'phaseChange')).toHaveLength(1);
  });
});

describe('EnemyBrain lockdown notifications', () => {
  it('staggers for the burst duration', () => {
    const { events, log } = makeEvents();
    const brain = new EnemyBrain(
      makeDef({ attack: 100, wait: 0 }),
      events,
      () => 0,
      0
    );
    brain.notifyBurstLock(100, 1000);
    expect(names(log)).toEqual(['staggerStart']);
    expect(brain.isVulnerable()).toBe(true);
    brain.update(1100, ctx());
    expect(names(log)).toEqual(['staggerStart', 'vulnerableEnd']);
  });

  it('cancels an active counter stance when guard breaks', () => {
    const { events, log } = makeEvents();
    const def = makeDef(
      { counter: 100, wait: 0 },
      {
        counterStance: {
          startupMs: 200,
          activeMs: 400,
          riposteAttackId: 'riposte',
          cooldownMs: 3000,
        },
      }
    );
    const brain = new EnemyBrain(def, events, () => 0, 0);
    brain.update(500, ctx());
    brain.notifyGuardBroken(700);
    expect(names(log)).toEqual([
      'counterStanceStart',
      'counterStanceEnd',
      'guardBreakStart',
    ]);
    expect(brain.isVulnerable()).toBe(true);
  });

  it('ignores everything after death', () => {
    const { events, log } = makeEvents();
    const brain = new EnemyBrain(
      makeDef({ attack: 100, wait: 0 }),
      events,
      () => 0,
      0
    );
    brain.notifyDied();
    brain.update(5000, ctx());
    brain.notifyCountered(5100);
    expect(log).toHaveLength(0);
    expect(brain.isDead()).toBe(true);
  });
});
