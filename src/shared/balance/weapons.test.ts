import { describe, expect, it } from 'vitest';
import { WEAPONS, WEAPON_IDS } from './weapons';

describe('weapon roster', () => {
  it('gives every weapon a usable Burst sequence', () => {
    for (const id of WEAPON_IDS) {
      const burst = WEAPONS[id].burst;
      expect(burst.hits, `${id} Burst hits`).toBeGreaterThan(0);
      expect(burst.damagePerHit, `${id} Burst damage`).toBeGreaterThan(0);
      expect(burst.hitIntervalMs, `${id} Burst interval`).toBeGreaterThanOrEqual(0);
    }
  });

  it('keeps each weapon Burst mechanically distinct', () => {
    const signatures = WEAPON_IDS.map((id) => {
      const burst = WEAPONS[id].burst;
      return `${burst.hits}:${burst.damagePerHit}:${burst.guardDamagePerHit}:${burst.breaksGuard}`;
    });
    expect(new Set(signatures)).toHaveLength(WEAPON_IDS.length);
  });
});
