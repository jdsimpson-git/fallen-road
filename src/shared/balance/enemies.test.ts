import { describe, expect, it } from 'vitest';
import {
  ENEMIES,
  GAUNTLET_ORDER,
  ROAD_FIGHTS_BEFORE_BOSS,
  randomizedRoadRoute,
} from './enemies';

describe('road enemy pool', () => {
  it('builds a four-fight route from the expanded enemy pool', () => {
    const route = randomizedRoadRoute(() => 0.37);
    expect(route).toHaveLength(ROAD_FIGHTS_BEFORE_BOSS);
    expect(new Set(route)).toHaveLength(ROAD_FIGHTS_BEFORE_BOSS);
    expect(route.every((id) => GAUNTLET_ORDER.includes(id))).toBe(true);
  });

  it('registers every road encounter as a playable definition', () => {
    expect(GAUNTLET_ORDER.every((id) => ENEMIES[id] !== undefined)).toBe(true);
  });
});
