import { describe, it, expect } from 'vitest';
import { KARMA, LUCK } from '../src/config.js';
import { clampKarma, karmaDropInputs, karmaTitle, isPositiveKarma } from '../src/core/karma.js';
import { goodDropMultiplier } from '../src/core/luck.js';

// ADR-0045: karma is a SIGNED dial that splits into the tested drop curve — positive → bonus luck,
// negative → curse. These lock the split, the clamp, the sign contract, and that karma actually
// moves rare+ odds through core/luck.js (both directions), without ever breaking its guarantees.

describe('clampKarma', () => {
  it('clamps to the configured ±range and sanitises non-finite', () => {
    expect(clampKarma(999)).toBe(KARMA.max);
    expect(clampKarma(-999)).toBe(-KARMA.max);
    expect(clampKarma(3)).toBe(3);
    expect(clampKarma(NaN)).toBe(0);
    expect(clampKarma(Infinity)).toBe(0);
    expect(clampKarma(undefined)).toBe(0);
  });
});

describe('karmaDropInputs — the split', () => {
  it('karma 0 is fully neutral (both inputs zero)', () => {
    expect(karmaDropInputs(0)).toEqual({ bonusLuck: 0, curse: 0 });
  });

  it('positive karma → bonusLuck only; negative karma → curse only (never both)', () => {
    const good = karmaDropInputs(5);
    expect(good.bonusLuck).toBeGreaterThan(0);
    expect(good.curse).toBe(0);

    const bad = karmaDropInputs(-5);
    expect(bad.curse).toBeGreaterThan(0);
    expect(bad.bonusLuck).toBe(0);
  });

  it('scales linearly by the per-point config and clamps the extremes', () => {
    expect(karmaDropInputs(3).bonusLuck).toBeCloseTo(3 * KARMA.luckPerPoint, 10);
    expect(karmaDropInputs(-3).curse).toBeCloseTo(3 * KARMA.cursePerPoint, 10);
    // past ±max, the value is clamped before scaling (no runaway)
    expect(karmaDropInputs(9999).bonusLuck).toBeCloseTo(KARMA.max * KARMA.luckPerPoint, 10);
    expect(karmaDropInputs(-9999).curse).toBeCloseTo(KARMA.max * KARMA.cursePerPoint, 10);
  });
});

describe('karma actually moves the drop curve (both ways, within its guarantees)', () => {
  const mul = (karma) => goodDropMultiplier(karmaDropInputs(karma));

  it('good karma lifts rare+ odds above neutral; bad karma sinks them below', () => {
    expect(mul(0)).toBeCloseTo(1, 10); // neutral
    expect(mul(6)).toBeGreaterThan(1); // helping pays
    expect(mul(-6)).toBeLessThan(1); // leaving/dosing bites
  });

  it('is monotonic in karma across the whole range', () => {
    let prev = -Infinity;
    for (let k = -KARMA.max; k <= KARMA.max; k++) {
      const m = mul(k);
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });

  it('never breaks luck.js guarantees: never guarantees rare+, never zeroes drops', () => {
    for (let k = -KARMA.max; k <= KARMA.max; k++) {
      const m = mul(k);
      expect(m).toBeGreaterThanOrEqual(LUCK.goodMulMin - 1e-9); // floor holds
      expect(m).toBeLessThanOrEqual(1 + LUCK.max + 1e-9); // asymptote holds
    }
  });

  it('bonusLuck defaults to 0 — the extended curve is bit-identical for pre-karma callers', () => {
    // every existing goodDropMultiplier caller passes no bonusLuck; that path must not shift
    expect(goodDropMultiplier({ inRunLuck: 4, permLuck: 2, curse: 1 })).toBe(
      goodDropMultiplier({ inRunLuck: 4, permLuck: 2, curse: 1, bonusLuck: 0 }),
    );
  });

  it('positive karma rides the SAME asymptote as luck (can approach, never pass the ceiling)', () => {
    // stack max good karma on top of max luck — still capped at 1 + LUCK.max
    const m = goodDropMultiplier({ inRunLuck: 14, permLuck: 6, ...karmaDropInputs(KARMA.max) });
    expect(m).toBeLessThanOrEqual(1 + LUCK.max + 1e-9);
  });
});

describe('karmaTitle — the legibility band (CP-K1)', () => {
  it('resolves every karma in range to a non-empty band, monotonic top→bottom', () => {
    const names = [];
    for (let k = KARMA.max; k >= -KARMA.max; k--) {
      const t = karmaTitle(k);
      expect(typeof t).toBe('string');
      expect(t.length).toBeGreaterThan(0);
      names.push(t);
    }
    // titles only ever change as karma falls, never oscillate (bands are contiguous)
    const distinct = names.filter((t, i) => i === 0 || t !== names[i - 1]);
    expect(new Set(distinct).size).toBe(distinct.length);
  });

  it('picks the first band whose threshold is reached (high→low), clamping the extremes', () => {
    expect(karmaTitle(12)).toBe('Saint');
    expect(karmaTitle(9)).toBe('Saint');
    expect(karmaTitle(8)).toBe('Good Samaritan');
    expect(karmaTitle(1)).toBe('Decent');
    expect(karmaTitle(0)).toBe('Unmarked');
    expect(karmaTitle(-1)).toBe('Cold');
    expect(karmaTitle(-8)).toBe('Marked');
    expect(karmaTitle(-999)).toBe('Forsaken'); // clamps to the bottom band
  });

  it('isPositiveKarma is true only at a genuine positive standing (≥ +1)', () => {
    expect(isPositiveKarma(1)).toBe(true);
    expect(isPositiveKarma(12)).toBe(true);
    expect(isPositiveKarma(0)).toBe(false); // neutral is not a positive standing
    expect(isPositiveKarma(-3)).toBe(false);
  });
});
