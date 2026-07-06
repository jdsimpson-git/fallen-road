import { describe, expect, it } from 'vitest';
import type { BlockStanceDefinition } from '../balance/enemies';
import { isStrikeBlocked } from './directionalGuard';

const CENTER: BlockStanceDefinition = {
  id: 'center',
  weight: 100,
  blockedZones: ['torso'],
  blockedDirections: ['left', 'right'],
};

const HIGH: BlockStanceDefinition = {
  id: 'high',
  weight: 100,
  blockedZones: ['head'],
  blockedDirections: ['down', 'downLeft', 'downRight'],
};

describe('isStrikeBlocked', () => {
  it('blocks a covered zone regardless of direction', () => {
    expect(isStrikeBlocked(CENTER, 'torso', 'up')).toBe(true);
  });

  it('blocks a covered direction regardless of zone', () => {
    expect(isStrikeBlocked(CENTER, 'head', 'left')).toBe(true);
  });

  it('lets an uncovered strike through even while "blocking"', () => {
    expect(isStrikeBlocked(CENTER, 'head', 'up')).toBe(false);
  });

  it('high guard protects the head but exposes the legs', () => {
    expect(isStrikeBlocked(HIGH, 'head', 'left')).toBe(true);
    expect(isStrikeBlocked(HIGH, 'torso', 'down')).toBe(true);
    expect(isStrikeBlocked(HIGH, 'legs', 'left')).toBe(false);
    expect(isStrikeBlocked(HIGH, 'torso', 'up')).toBe(false);
  });
});
