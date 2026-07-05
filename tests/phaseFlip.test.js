import { describe, it, expect } from 'vitest';
import { pendingFlips } from '../src/core/phaseFlip.js';

// Boss HP-breakpoint crossing is a PURE transform (no THREE, no rng) so the "phase 2"
// cinematic beat is deterministic + testable. These lock the contract the Boss shell
// relies on: fire once per breakpoint, in order, skip nothing on a big hit, never re-fire.

const BPS = [0.5, 0.25]; // descending, like config.BOSS.enforcer.phaseFlips

describe('pendingFlips — HP-breakpoint crossing', () => {
  it('returns nothing while above the first breakpoint', () => {
    expect(pendingFlips(1, BPS, 0)).toEqual([]);
    expect(pendingFlips(0.51, BPS, 0)).toEqual([]);
  });

  it('fires a single flip when the fraction dips to/under a breakpoint', () => {
    expect(pendingFlips(0.5, BPS, 0)).toEqual([0]);
    expect(pendingFlips(0.49, BPS, 0)).toEqual([0]);
  });

  it('does NOT re-fire an already-passed breakpoint', () => {
    // flip 0 already fired (passed=1); still above the 2nd breakpoint → nothing new
    expect(pendingFlips(0.4, BPS, 1)).toEqual([]);
    // now under the 2nd → only index 1 (not 0 again)
    expect(pendingFlips(0.25, BPS, 1)).toEqual([1]);
  });

  it('catches up BOTH flips when one big hit skips a band', () => {
    // fresh boss (passed=0) chunked straight to 10% HP → fire 0 and 1 this tick, in order
    expect(pendingFlips(0.1, BPS, 0)).toEqual([0, 1]);
  });

  it('reports nothing once every breakpoint has fired', () => {
    expect(pendingFlips(0.01, BPS, 2)).toEqual([]);
  });

  it('degrades safely on a boss with no phaseFlips', () => {
    expect(pendingFlips(0.3, undefined, 0)).toEqual([]);
    expect(pendingFlips(0.3, [], 0)).toEqual([]);
  });
});
