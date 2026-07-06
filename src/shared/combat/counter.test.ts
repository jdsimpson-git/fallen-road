import { describe, expect, it } from 'vitest';
import { resolveDefense } from './counter';

const WINDOW = 240;

describe('resolveDefense', () => {
  it('is a perfect counter when the press lands inside the window', () => {
    expect(
      resolveDefense(
        { holdingBlock: true, lastShieldPressAt: 900, guardBroken: false },
        1000,
        WINDOW
      )
    ).toBe('counter');
  });

  it('counts a press exactly at the window edge as a counter', () => {
    expect(
      resolveDefense(
        {
          holdingBlock: true,
          lastShieldPressAt: 1000 - WINDOW,
          guardBroken: false,
        },
        1000,
        WINDOW
      )
    ).toBe('counter');
  });

  it('counts a press exactly at impact as a counter', () => {
    expect(
      resolveDefense(
        { holdingBlock: true, lastShieldPressAt: 1000, guardBroken: false },
        1000,
        WINDOW
      )
    ).toBe('counter');
  });

  it('downgrades an early press that is still held to a normal block', () => {
    expect(
      resolveDefense(
        {
          holdingBlock: true,
          lastShieldPressAt: 1000 - WINDOW - 1,
          guardBroken: false,
        },
        1000,
        WINDOW
      )
    ).toBe('block');
  });

  it('is a hit when an early press was already released', () => {
    expect(
      resolveDefense(
        { holdingBlock: false, lastShieldPressAt: 400, guardBroken: false },
        1000,
        WINDOW
      )
    ).toBe('hit');
  });

  it('is a hit when the shield was never touched', () => {
    expect(
      resolveDefense(
        { holdingBlock: false, lastShieldPressAt: null, guardBroken: false },
        1000,
        WINDOW
      )
    ).toBe('hit');
  });

  it('ignores presses that happen after impact', () => {
    expect(
      resolveDefense(
        { holdingBlock: false, lastShieldPressAt: 1100, guardBroken: false },
        1000,
        WINDOW
      )
    ).toBe('hit');
  });

  it('cannot block or counter while guard-broken', () => {
    expect(
      resolveDefense(
        { holdingBlock: true, lastShieldPressAt: 950, guardBroken: true },
        1000,
        WINDOW
      )
    ).toBe('hit');
  });
});
