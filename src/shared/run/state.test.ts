import { describe, expect, it } from 'vitest';
import { SWORD } from '../balance/weapons';
import { computeStrike } from '../combat/damage';
import {
  addCoins,
  addGambit,
  advanceFrozenRhythm,
  claimGambit,
  createRunState,
  equipWeapon,
  MERCHANT_OFFERS,
  modifiersForRun,
  modifyStrikeForRun,
  rewardGambitsForRun,
  spendCoins,
  weaponForRun,
} from './state';

describe('roguelite run state', () => {
  it('starts with the balanced sword and can swap weapons', () => {
    const spearRun = equipWeapon(createRunState(), 'spear');
    expect(weaponForRun(spearRun).id).toBe('spear');
    expect(weaponForRun(equipWeapon(spearRun, 'dagger')).id).toBe('dagger');
    expect(weaponForRun(equipWeapon(spearRun, 'mace')).id).toBe('mace');
  });

  it('composes the expanded Gambit modifiers', () => {
    const bloodEdge = addGambit(createRunState(), 'blood-edge');
    const emberDebt = addGambit(bloodEdge, 'ember-debt');
    const modifiers = modifiersForRun(emberDebt);
    expect(modifiers.directDamageHealingFraction).toBe(0.08);
    expect(modifiers.blockedHitSelfDamage).toBe(2);
    expect(modifiers.burstDamageMultiplier).toBe(1.35);
    expect(modifiers.burstHealthCost).toBe(8);
  });

  it('only spends currency when the run can afford the offer', () => {
    const run = addCoins(createRunState(), 20);
    expect(spendCoins(run, 21)).toBeNull();
    expect(spendCoins(run, 14)?.coins).toBe(6);
  });

  it('puts every alternate weapon in the Peddler inventory', () => {
    const weaponIds = MERCHANT_OFFERS.flatMap((offer) =>
      offer.kind === 'weapon' ? [offer.weaponId] : []
    );
    expect(new Set(weaponIds)).toEqual(
      new Set(['spear', 'hammer', 'dagger', 'mace'])
    );
  });

  it('does not offer Gambits the run already owns', () => {
    const run = addGambit(createRunState(), 'glass-counter');
    expect(rewardGambitsForRun(run).map((gambit) => gambit.id)).not.toContain(
      'glass-counter'
    );
  });

  it('rotates the second reward into the next three Gambits', () => {
    const first = claimGambit(createRunState(), 'glass-counter');
    expect(rewardGambitsForRun(first).map((gambit) => gambit.id)).toEqual([
      'last-stand',
      'reckless-focus',
      'open-guard',
    ]);
  });

  it('applies Reckless Focus to head and torso strikes', () => {
    const run = addGambit(createRunState(), 'reckless-focus');
    const base = computeStrike(SWORD, 'head', false);
    expect(modifyStrikeForRun(run, base, 'head', false).damage).toBe(
      Math.round(base.damage * 1.35)
    );
    expect(modifyStrikeForRun(run, base, 'torso', false).damage).toBe(
      Math.round(base.damage * 0.85)
    );
  });

  it('triggers Frozen Rhythm on every third direct hit', () => {
    let run = addGambit(createRunState(), 'frozen-rhythm');
    const first = advanceFrozenRhythm(run);
    run = first.state;
    const second = advanceFrozenRhythm(run);
    run = second.state;
    const third = advanceFrozenRhythm(run);
    expect(first.triggered).toBe(false);
    expect(second.triggered).toBe(false);
    expect(third.triggered).toBe(true);
    expect(third.state.frozenRhythmHits).toBe(0);
  });
});
