import { describe, expect, it } from 'vitest';
import {
  createDailyRunDefinition,
  scoreDailyRun,
  seededRandom,
} from './daily';
import { GAMBIT_IDS } from './gambits';

describe('daily runs', () => {
  it('gives every player the same route and Gambit deck for a day', () => {
    expect(createDailyRunDefinition('2026-07-09')).toEqual(
      createDailyRunDefinition('2026-07-09')
    );
  });

  it('builds a four-fight route and a complete non-repeating Gambit deck', () => {
    const daily = createDailyRunDefinition('2026-07-09');
    expect(daily.roadEnemyIds).toHaveLength(4);
    expect(new Set(daily.gambitDeck)).toHaveLength(GAMBIT_IDS.length);
  });

  it('keeps its random stream stable for the same seed', () => {
    const first = seededRandom(42);
    const second = seededRandom(42);
    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it('rewards a clean victory more than an equal defeat', () => {
    const stats = {
      foesFelled: 6,
      damageDealt: 900,
      damageTaken: 30,
      weakPointHits: 8,
      perfectCounters: 3,
      dodgeCounters: 1,
      attacksEvaded: 2,
    };
    expect(scoreDailyRun({ outcome: 'victory', durationSec: 180, stats })).toBeGreaterThan(
      scoreDailyRun({ outcome: 'defeat', durationSec: 180, stats })
    );
  });
});
