import { describe, it, expect } from 'vitest';
import { luckBonus, goodDropMultiplier } from '../src/core/luck.js';
import { LUCK } from '../src/config.js';

// CP4 (ADR-0037): luck/curse as a D2 magic-find curve. luckBonus is the diminishing-returns curve;
// goodDropMultiplier is the rare+ tier-weight it produces. Design contract: luck always helps but
// NEVER guarantees (asymptote), curse always hurts but NEVER zeroes drops (floor), and curse is only
// PARTIALLY offset by luck (even at the luck ceiling a point of curse still costs ~0.25 of the bonus).

describe('luckBonus (the D2 diminishing curve)', () => {
  it('is 0 with no luck and clamps negative inputs to 0', () => {
    expect(luckBonus(0, 0)).toBe(0);
    expect(luckBonus(-5, -5)).toBe(0);
  });

  it('is strictly increasing in stacks and asymptotes below LUCK.max (never guarantees)', () => {
    let prev = -1;
    for (const s of [0, 1, 2, 4, 8, 16, 64, 1000]) {
      const b = luckBonus(s, 0);
      expect(b).toBeGreaterThan(prev);
      expect(b).toBeLessThan(LUCK.max); // strictly below the ceiling for any finite stacks
      prev = b;
    }
    expect(luckBonus(1000, 0)).toBeGreaterThan(0.8); // but it does approach the ceiling
  });

  it('sums the two dials (in-run + permanent Fortune) into one curve input', () => {
    expect(luckBonus(2, 3)).toBe(luckBonus(5, 0));
    expect(luckBonus(2, 3)).toBe(luckBonus(0, 5));
  });

  it('reaches half of LUCK.max at LUCK.half combined stacks', () => {
    expect(luckBonus(LUCK.half, 0)).toBeCloseTo(LUCK.max / 2, 6);
  });
});

describe('goodDropMultiplier (rare+ tier-weight from luck ⊖ curse)', () => {
  it('is exactly 1 at neutral (no luck, no curse)', () => {
    expect(goodDropMultiplier()).toBe(1);
    expect(goodDropMultiplier({ inRunLuck: 0, curse: 0 })).toBe(1);
  });

  it('luck biases UP, monotonic, but never past the no-guarantee ceiling (1 + LUCK.max)', () => {
    let prev = 0;
    for (const s of [0, 1, 3, 9, 100]) {
      const m = goodDropMultiplier({ inRunLuck: s });
      expect(m).toBeGreaterThanOrEqual(prev);
      expect(m).toBeLessThanOrEqual(1 + LUCK.max);
      prev = m;
    }
    expect(goodDropMultiplier({ inRunLuck: 100000 })).toBeLessThanOrEqual(1 + LUCK.max);
  });

  it('curse biases DOWN, monotonic, but never below the floor (LUCK.goodMulMin)', () => {
    let prev = Infinity;
    for (const c of [0, 1, 2, 5, 50]) {
      const m = goodDropMultiplier({ inRunLuck: 3, curse: c });
      expect(m).toBeLessThanOrEqual(prev);
      expect(m).toBeGreaterThanOrEqual(LUCK.goodMulMin);
      prev = m;
    }
    expect(goodDropMultiplier({ curse: 9999 })).toBe(LUCK.goodMulMin); // heavy curse floors, never 0
  });

  it('curse is only PARTIALLY offset by luck: at the ceiling, 1 curse still costs ≈0.25 of the bonus', () => {
    // as luckBonus → LUCK.max, offset → curseWeight·(1 − curseLuckDamp) = 0.5·0.5 = 0.25
    const hi = 100000;
    const drop =
      goodDropMultiplier({ inRunLuck: hi }) - goodDropMultiplier({ inRunLuck: hi, curse: 1 });
    expect(drop).toBeGreaterThan(0.23);
    expect(drop).toBeLessThan(0.27); // the design target: ≈ −25% of the good-drop bonus
  });

  it('luck SOFTENS each curse point (the offset shrinks as luck grows) — but never to zero', () => {
    // pick luck levels where curse=1 stays in the linear region (not floored)
    const offsetAt = (luck) =>
      goodDropMultiplier({ inRunLuck: luck }) - goodDropMultiplier({ inRunLuck: luck, curse: 1 });
    const low = offsetAt(2);
    const high = offsetAt(100000);
    expect(high).toBeLessThan(low); // more luck → smaller curse penalty
    expect(high).toBeGreaterThan(0); // …but a point of curse always bites
  });

  it('permanent Fortune and in-run luck are interchangeable inputs', () => {
    expect(goodDropMultiplier({ inRunLuck: 2, permLuck: 3 })).toBe(
      goodDropMultiplier({ inRunLuck: 5 }),
    );
  });

  it('is non-finite-SAFE: a NaN/±Infinity dial falls back to neutral (never a silent all-ultra roll)', () => {
    // Phase 6b will feed a real `curse` number here; a bad source must NOT invert into max-tier offers.
    expect(goodDropMultiplier({ curse: NaN })).toBe(1);
    expect(goodDropMultiplier({ permLuck: NaN })).toBe(1);
    expect(goodDropMultiplier({ inRunLuck: Infinity })).toBeLessThanOrEqual(1 + LUCK.max);
    expect(Number.isFinite(goodDropMultiplier({ inRunLuck: 1e300, curse: 1e300 }))).toBe(true);
  });

  it('luckBonus stays STRICTLY below LUCK.max even at absurd finite luck (never a guaranteed bonus)', () => {
    // the "never guarantees" contract lives on the CURVE; the multiplier is separately clamped ≤ 1+max
    // (and hitting that ceiling is fine — commons still carry weight, so a rare+ is never forced).
    expect(luckBonus(1e18, 0)).toBeLessThan(LUCK.max);
    expect(luckBonus(Number.MAX_VALUE, Number.MAX_VALUE)).toBeLessThan(LUCK.max);
    expect(goodDropMultiplier({ inRunLuck: 1e18 })).toBeLessThanOrEqual(1 + LUCK.max);
  });
});
