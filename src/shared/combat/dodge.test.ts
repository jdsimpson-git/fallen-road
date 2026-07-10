import { describe, expect, it } from 'vitest';
import {
  createDodgeState,
  dodgeReadyFraction,
  isDodgeActive,
  isPerfectDodge,
  startDodge,
} from './dodge';

const TUNING = { dodgeDurationMs: 340, dodgeCooldownMs: 1100 };

describe('startDodge', () => {
  it('starts from an idle state and opens the evasion window', () => {
    const { state, started } = startDodge(createDodgeState(), 1000, TUNING);
    expect(started).toBe(true);
    expect(isDodgeActive(state, 1000)).toBe(true);
    expect(state.readyAt).toBe(1000 + TUNING.dodgeCooldownMs);
  });

  it('rejects a dodge while the cooldown is running', () => {
    const first = startDodge(createDodgeState(), 1000, TUNING);
    const second = startDodge(first.state, 1000 + TUNING.dodgeCooldownMs - 1, TUNING);
    expect(second.started).toBe(false);
    expect(second.state).toBe(first.state);
  });

  it('allows a new dodge exactly when the cooldown elapses', () => {
    const first = startDodge(createDodgeState(), 1000, TUNING);
    const second = startDodge(first.state, 1000 + TUNING.dodgeCooldownMs, TUNING);
    expect(second.started).toBe(true);
  });
});

describe('isDodgeActive', () => {
  it('holds evasion frames for the configured duration only', () => {
    const { state } = startDodge(createDodgeState(), 1000, TUNING);
    expect(isDodgeActive(state, 1000 + TUNING.dodgeDurationMs - 1)).toBe(true);
    expect(isDodgeActive(state, 1000 + TUNING.dodgeDurationMs)).toBe(false);
  });

  it('is inactive on a fresh state', () => {
    expect(isDodgeActive(createDodgeState(), 0)).toBe(false);
  });
});

describe('isPerfectDodge', () => {
  it('turns a last-moment active dodge into a counter', () => {
    const { state } = startDodge(createDodgeState(), 1000, TUNING);
    expect(isPerfectDodge(state, 1120, 240)).toBe(true);
  });

  it('rejects dodges begun too early or after their active frames end', () => {
    const { state } = startDodge(createDodgeState(), 1000, TUNING);
    expect(isPerfectDodge(state, 1250, 240)).toBe(false);
    expect(isPerfectDodge(state, 1400, 240)).toBe(false);
  });
});

describe('dodgeReadyFraction', () => {
  it('reads 1 on a fresh state', () => {
    expect(dodgeReadyFraction(createDodgeState(), 0, TUNING.dodgeCooldownMs)).toBe(1);
  });

  it('climbs from 0 to 1 across the cooldown', () => {
    const { state } = startDodge(createDodgeState(), 1000, TUNING);
    expect(dodgeReadyFraction(state, 1000, TUNING.dodgeCooldownMs)).toBe(0);
    expect(
      dodgeReadyFraction(state, 1000 + TUNING.dodgeCooldownMs / 2, TUNING.dodgeCooldownMs)
    ).toBeCloseTo(0.5);
    expect(
      dodgeReadyFraction(state, 1000 + TUNING.dodgeCooldownMs, TUNING.dodgeCooldownMs)
    ).toBe(1);
  });
});
