import { describe, expect, it } from 'vitest';
import type { FallenRival } from '../api';
import { createFallenRivalDefinition } from './rivals';

const rival = (
  weaponId: 'sword' | 'spear' | 'hammer' | 'dagger' | 'mace'
): FallenRival => ({
  id: `rival-${weaponId}`,
  username: 'paper-traveller',
  weaponId,
  gambitIds: ['glass-counter'],
  foesFelled: 3,
  defeatedAt: '2026-07-09T12:00:00.000Z',
});

describe('Fallen Rival balance', () => {
  it('builds a distinct weapon profile from the defeated traveller', () => {
    expect(createFallenRivalDefinition(rival('spear')).attacks[0]?.style).toBe('thrust');
    expect(createFallenRivalDefinition(rival('hammer')).attacks[0]?.style).toBe('bash');
    expect(createFallenRivalDefinition(rival('dagger')).attacks[0]?.style).toBe('slash');
    expect(createFallenRivalDefinition(rival('mace')).attacks[0]?.style).toBe('bash');
    expect(createFallenRivalDefinition(rival('sword')).attacks[0]?.style).toBe('slash');
  });

  it('always points its counter stance at one of its own attacks', () => {
    const definition = createFallenRivalDefinition(rival('hammer'));
    const riposteId = definition.counterStance?.riposteAttackId;
    expect(definition.attacks.some((attack) => attack.id === riposteId)).toBe(true);
  });

  it('grows with the defeated run without becoming boss-sized', () => {
    const low = createFallenRivalDefinition({ ...rival('sword'), foesFelled: 0 });
    const high = createFallenRivalDefinition({ ...rival('sword'), foesFelled: 5 });
    expect(high.maxHealth).toBeGreaterThan(low.maxHealth);
    expect(high.maxHealth).toBeLessThan(200);
  });
});
