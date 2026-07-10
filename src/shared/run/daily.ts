import { GAUNTLET_ORDER, ROAD_FIGHTS_BEFORE_BOSS } from '../balance/enemies';
import { GAMBIT_IDS, type GambitId } from './gambits';

export const DAILY_CONTENT_VERSION = 3;

export type DailyRunDefinition = {
  contentVersion: number;
  day: string;
  seed: number;
  roadEnemyIds: readonly string[];
  gambitDeck: readonly GambitId[];
};

export type DailyScoreStats = {
  foesFelled: number;
  damageDealt: number;
  damageTaken: number;
  weakPointHits: number;
  perfectCounters: number;
  dodgeCounters: number;
  attacksEvaded: number;
};

export type DailyRunScoreInput = {
  outcome: 'victory' | 'defeat';
  durationSec: number;
  stats: DailyScoreStats;
};

/** UTC day identifier used in server-issued daily runs, e.g. 2026-07-09. */
export const utcDayKey = (date = new Date()): string => date.toISOString().slice(0, 10);

/** Stable 32-bit FNV-1a hash; never use Math.random for daily generation. */
export const dailySeedForDay = (day: string): number => {
  let hash = 0x811c9dc5;
  const source = `fallen-road:${DAILY_CONTENT_VERSION}:${day}`;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

/** Mulberry32: compact, deterministic and sufficient for encounter variety. */
export const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
};

const shuffled = <Item>(items: readonly Item[], random: () => number): Item[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = result[index];
    result[index] = result[swapIndex]!;
    result[swapIndex] = current!;
  }
  return result;
};

/**
 * Generates the public rules for one day. Every player receives this exact
 * route and card order; only choices and execution can change their score.
 */
export const createDailyRunDefinition = (day: string): DailyRunDefinition => {
  const seed = dailySeedForDay(day);
  const random = seededRandom(seed);
  const routeCycle = shuffled(GAUNTLET_ORDER, random);
  const roadEnemyIds = Array.from(
    { length: ROAD_FIGHTS_BEFORE_BOSS },
    (_, index) => routeCycle[index % routeCycle.length]!
  );
  return {
    contentVersion: DAILY_CONTENT_VERSION,
    day,
    seed,
    roadEnemyIds,
    gambitDeck: shuffled(GAMBIT_IDS, random),
  };
};

/** Gives every encounter a separate stream, so a previous fight cannot skew it. */
export const encounterSeed = (
  dailySeed: number,
  stage: 'road' | 'castle',
  encounterNumber: number
): number => {
  const stageSalt = stage === 'castle' ? 0x85ebca6b : 0xc2b2ae35;
  return (dailySeed ^ stageSalt ^ Math.imul(encounterNumber, 0x27d4eb2d)) >>> 0;
};

/**
 * Score is intentionally recomputed on the server. A throne clear is the
 * largest reward; clean, precise and fast play separates equal clears.
 */
export const scoreDailyRun = ({ outcome, durationSec, stats }: DailyRunScoreInput): number => {
  const clearBonus = outcome === 'victory' ? 10000 : 0;
  const total =
    clearBonus +
    stats.foesFelled * 1000 +
    stats.damageDealt * 2 +
    stats.weakPointHits * 120 +
    stats.perfectCounters * 150 +
    stats.dodgeCounters * 150 +
    stats.attacksEvaded * 70 -
    stats.damageTaken * 8 -
    durationSec * 10;
  return Math.max(0, Math.round(total));
};
