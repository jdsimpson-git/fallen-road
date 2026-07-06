import type { DodgeState } from './types';

export const createDodgeState = (): DodgeState => ({
  activeUntil: 0,
  readyAt: 0,
});

export type DodgeTuning = {
  dodgeDurationMs: number;
  dodgeCooldownMs: number;
};

export type DodgeStartResult = { state: DodgeState; started: boolean };

/**
 * Begin a dodge at `now`. Rejected while the cooldown from the previous
 * dodge is still running; the caller gates guard-break and game-over states.
 */
export const startDodge = (
  state: DodgeState,
  now: number,
  tuning: DodgeTuning
): DodgeStartResult => {
  if (now < state.readyAt) return { state, started: false };
  return {
    state: {
      activeUntil: now + tuning.dodgeDurationMs,
      readyAt: now + tuning.dodgeCooldownMs,
    },
    started: true,
  };
};

/** True while the player holds evasion frames from a recent dodge. */
export const isDodgeActive = (state: DodgeState, now: number): boolean =>
  now < state.activeUntil;

/** Cooldown recovery in [0, 1] for UI readouts — 1 means ready. */
export const dodgeReadyFraction = (
  state: DodgeState,
  now: number,
  cooldownMs: number
): number => {
  if (now >= state.readyAt) return 1;
  return Math.max(0, Math.min(1, 1 - (state.readyAt - now) / cooldownMs));
};
