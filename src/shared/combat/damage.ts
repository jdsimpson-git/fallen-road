import { zoneBalance } from '../balance/hitZones';
import type { WeaponDefinition } from '../balance/weapons';
import type { StrikeResult } from './types';

/**
 * Damage and guard damage of a player strike before enemy defense is applied.
 */
export const computeStrike = (
  weapon: WeaponDefinition,
  zoneId: string,
  heavy: boolean
): StrikeResult => {
  const zone = zoneBalance(zoneId);
  const damage =
    weapon.baseDamage *
    zone.damageMultiplier *
    (heavy ? weapon.heavy.damageMultiplier : 1);
  const guardDamage =
    weapon.guardDamage * (heavy ? weapon.heavy.guardDamageMultiplier : 1);
  return { damage: Math.round(damage), guardDamage: Math.round(guardDamage) };
};

/** Health damage that leaks through a block with the given reduction. */
export const blockedDamage = (
  damage: number,
  blockDamageReduction: number
): number => Math.round(damage * (1 - blockDamageReduction));

/** Damage taken while guard-broken (crumpled paper tears easily). */
export const guardBrokenDamage = (damage: number, multiplier: number): number =>
  Math.round(damage * multiplier);
