import type { FallenRival } from '../api';
import type { WeaponId } from './weapons';
import type {
  EnemyAttackDefinition,
  EnemyDefinition,
} from './enemies';

const attacksForWeapon = (weaponId: WeaponId): EnemyAttackDefinition[] => {
  switch (weaponId) {
    case 'spear':
      return [
        {
          id: 'long-thrust',
          style: 'thrust',
          telegraphMs: 700,
          damage: 19,
          recoverMs: 680,
          counterGuardDamage: 25,
          weight: 60,
          comboFollowUp: { attackId: 'quick-thrust', chance: 0.42 },
        },
        {
          id: 'quick-thrust',
          style: 'thrust',
          telegraphMs: 440,
          damage: 11,
          recoverMs: 580,
          counterGuardDamage: 17,
          weight: 40,
        },
      ];
    case 'hammer':
      return [
        {
          id: 'crushing-blow',
          style: 'bash',
          telegraphMs: 980,
          damage: 28,
          recoverMs: 980,
          counterGuardDamage: 36,
          weight: 55,
        },
        {
          id: 'short-swing',
          style: 'slash',
          telegraphMs: 690,
          damage: 16,
          recoverMs: 720,
          counterGuardDamage: 24,
          weight: 45,
        },
      ];
    case 'dagger':
      return [
        {
          id: 'rival-flurry',
          style: 'slash',
          telegraphMs: 520,
          damage: 11,
          recoverMs: 470,
          counterGuardDamage: 16,
          weight: 58,
          comboFollowUp: { attackId: 'rival-backcut', chance: 0.58 },
        },
        {
          id: 'rival-backcut',
          style: 'slash',
          telegraphMs: 370,
          damage: 9,
          recoverMs: 520,
          counterGuardDamage: 14,
          weight: 42,
        },
      ];
    case 'mace':
      return [
        {
          id: 'rival-bell-ringer',
          style: 'bash',
          telegraphMs: 820,
          damage: 23,
          recoverMs: 840,
          counterGuardDamage: 32,
          weight: 55,
          comboFollowUp: { attackId: 'rival-sweep', chance: 0.34 },
        },
        {
          id: 'rival-sweep',
          style: 'slash',
          telegraphMs: 610,
          damage: 15,
          recoverMs: 680,
          counterGuardDamage: 22,
          weight: 45,
        },
      ];
    case 'sword':
      return [
        {
          id: 'rival-slash',
          style: 'slash',
          telegraphMs: 750,
          damage: 20,
          recoverMs: 680,
          counterGuardDamage: 26,
          weight: 58,
          comboFollowUp: { attackId: 'rival-cut', chance: 0.36 },
        },
        {
          id: 'rival-cut',
          style: 'slash',
          telegraphMs: 510,
          damage: 12,
          recoverMs: 620,
          counterGuardDamage: 18,
          weight: 42,
        },
      ];
  }
};

/** Builds an unranked revenge duel from a sanitized defeated-run snapshot. */
export const createFallenRivalDefinition = (rival: FallenRival): EnemyDefinition => {
  const gambitCount = rival.gambitIds.length;
  const attacks = attacksForWeapon(rival.weaponId);
  const riposte = attacks[1] ?? attacks[0];
  if (!riposte) throw new Error('Fallen Rival needs at least one attack');
  return {
    id: 'fallen-rival',
    name: 'Fallen Rival',
    tagline: `The echo of u/${rival.username}, carrying their broken oath.`,
    tier: 'elite',
    maxHealth: 104 + rival.foesFelled * 12 + gambitCount * 8,
    maxGuard: 76 + gambitCount * 7,
    blockDamageReduction: 0.82,
    guardBreakDurationMs: 2500,
    guardBrokenDamageTakenMultiplier: 1.65,
    staggerDurationMs: 950,
    guardRegenPerSecond: 12,
    guardRegenDelayMs: 950,
    attacks,
    blockStances: [
      {
        id: 'rival-high',
        weight: 55,
        blockedZones: ['head', 'torso'],
        blockedDirections: ['up', 'upLeft', 'upRight'],
        adaptToSignal: 'headRatio',
      },
      {
        id: 'rival-center',
        weight: 45,
        blockedZones: ['torso'],
        blockedDirections: ['left', 'right'],
        adaptToSignal: 'torsoRatio',
      },
    ],
    counterStance: {
      startupMs: 260,
      activeMs: 360,
      riposteAttackId: riposte.id,
      cooldownMs: 3400,
    },
    behavior: {
      decisionIntervalMs: [420, 760],
      weights: { attack: 58, block: 17, dodge: 14, counter: 6, wait: 5 },
      blockDurationMs: 880,
      dodgeDurationMs: 530,
      dodgeDistance: 110,
      defensiveCooldownMs: 1150,
      headBob: { amplitudeX: 30, amplitudeY: 12, periodMs: 1700 },
    },
    adaptation: {
      cap: 1.55,
      blockingBoostsAttack: 0.45,
      spamBoostsDodge: 0.45,
      spamBoostsCounter: 0.4,
      horizontalBoostsDodge: 0.32,
      zoneFocusBoostsBlock: 0.45,
    },
    hitZones: [
      { id: 'head', type: 'circle', radius: 36, attachTo: 'head' },
      {
        id: 'torso',
        type: 'rect',
        halfWidth: 58,
        halfHeight: 78,
        attachTo: 'torso',
      },
      { id: 'weaponHand', type: 'circle', radius: 27, attachTo: 'weaponHand' },
      {
        id: 'legs',
        type: 'rect',
        halfWidth: 56,
        halfHeight: 44,
        attachTo: 'legs',
      },
    ],
  };
};
