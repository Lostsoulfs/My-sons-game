import { describe, it, expect } from 'vitest';
import {
  statBonus,
  floorScale,
  hardnessFacet,
  marginalBonus,
  metaLevelBonus,
  metaBreakpointBonus,
  metaLevelCost,
} from '../src/core/scaling.js';
import { UPGRADES, DIFFICULTY, META_CURVE } from '../src/config.js';

// Exp7 Stage 2 / ADR-0022 — the balance curves. Pure functions, golden-value tests
// so the "feel math" can't silently drift.

describe('statBonus (diminishing-returns upgrade curve)', () => {
  it('is zero at zero stacks (and for negative)', () => {
    expect(statBonus(0, 1, 5)).toBe(0);
    expect(statBonus(-3, 1, 5)).toBe(0);
  });

  it('degrades safely on a mis-tuned half<=0 (asymptote, never Infinity / negative)', () => {
    expect(statBonus(3, 1.0, 0)).toBe(1.0); // not 0/0 NaN or a hard step surprise
    expect(statBonus(3, 1.0, -5)).toBe(1.0); // not Infinity / negative debuff
    expect(statBonus(0, 1.0, 0)).toBe(0); // no stacks, no bonus
  });

  it('reaches exactly HALF of maxBonus at `half` stacks (the knee)', () => {
    expect(statBonus(5, 1.0, 5)).toBeCloseTo(0.5);
    expect(statBonus(6, 0.6, 6)).toBeCloseTo(0.3);
  });

  it('is strictly increasing but always below maxBonus (no hard wall)', () => {
    let prev = -1;
    for (let n = 0; n <= 50; n++) {
      const b = statBonus(n, 1.0, 5);
      expect(b).toBeGreaterThan(prev);
      expect(b).toBeLessThan(1.0);
      prev = b;
    }
  });

  it('approaches maxBonus for very large stacks', () => {
    expect(statBonus(1000, 1.0, 5)).toBeGreaterThan(0.99);
  });

  it("fixes 'caps in 3': at 3 stacks it is well under the old +50% hard cap, then keeps growing", () => {
    const at3 = statBonus(3, 1.0, 5); // 3/8 = 0.375
    const at12 = statBonus(12, 1.0, 5); // 12/17 ≈ 0.706
    expect(at3).toBeCloseTo(0.375);
    expect(at12).toBeGreaterThan(at3); // still meaningfully growing past the old cap
  });
});

describe('floorScale (difficulty curve)', () => {
  it('returns base at floor 0 and clamps negatives to 0', () => {
    expect(floorScale(0, { base: 1, growth: 0.26 })).toBeCloseTo(1);
    expect(floorScale(-2, { base: 1.4, growth: 0.26 })).toBeCloseTo(1.4);
  });

  it('grows by exactly (1+growth) per floor', () => {
    const p = { base: 1, growth: 0.26 };
    for (let i = 0; i < 6; i++) {
      expect(floorScale(i + 1, p) / floorScale(i, p)).toBeCloseTo(1.26);
    }
  });

  it('the shipped DIFFICULTY makes a non-decreasing, genuinely rising ramp', () => {
    const diffs = [0, 1, 2, 3, 4].map((i) => floorScale(i, DIFFICULTY));
    for (let i = 1; i < diffs.length; i++) expect(diffs[i]).toBeGreaterThan(diffs[i - 1]);
    expect(diffs[4]).toBeGreaterThan(diffs[0] * 2); // finale clearly harder than floor 0
  });
});

describe('hardnessFacet (B5 "twice as hard" knob distribution)', () => {
  it('is 1 (no change) at hardnessMul 1, or at weight 0', () => {
    expect(hardnessFacet(1, 1)).toBe(1);
    expect(hardnessFacet(2, 0)).toBe(1);
  });

  it('weight 1 applies the full multiplier (2× at hardnessMul 2)', () => {
    expect(hardnessFacet(2, 1)).toBeCloseTo(2);
    expect(hardnessFacet(3, 1)).toBeCloseTo(3);
  });

  it('a partial weight takes a share (the count facet)', () => {
    expect(hardnessFacet(2, 0.35)).toBeCloseTo(1.35);
  });

  it('clamps an easier-mode (mul < 1) to 1 — this knob only adds difficulty', () => {
    expect(hardnessFacet(0.5, 1)).toBe(1);
  });
});

describe('DIFFICULTY "twice as hard" config', () => {
  it('has the master knob + facet weights in range', () => {
    expect(DIFFICULTY.hardnessMul).toBeGreaterThanOrEqual(1);
    for (const w of ['hpWeight', 'countWeight']) {
      expect(DIFFICULTY[w]).toBeGreaterThanOrEqual(0);
      expect(DIFFICULTY[w]).toBeLessThanOrEqual(1);
    }
  });

  it('ships at "twice as hard": HP doubles, rooms get a bit more crowded', () => {
    expect(hardnessFacet(DIFFICULTY.hardnessMul, DIFFICULTY.hpWeight)).toBeCloseTo(2);
    expect(hardnessFacet(DIFFICULTY.hardnessMul, DIFFICULTY.countWeight)).toBeGreaterThan(1);
  });
});

describe('UPGRADES config shape', () => {
  it('every stat has a positive maxBonus and half', () => {
    for (const k of ['damage', 'fireRate', 'speed']) {
      expect(UPGRADES[k].maxBonus).toBeGreaterThan(0);
      expect(UPGRADES[k].half).toBeGreaterThan(0);
    }
  });
});

describe('marginalBonus (B9 — the per-pick delta shown on offer cards)', () => {
  it('is the difference between consecutive stacks (telescopes to statBonus)', () => {
    let sum = 0;
    for (let n = 1; n <= 30; n++) sum += marginalBonus(n, 1.0, 5);
    expect(sum).toBeCloseTo(statBonus(30, 1.0, 5)); // Σ marginals 1..N == total at N
  });

  it('shrinks monotonically as the curve approaches its cap', () => {
    let prev = Infinity;
    for (let n = 1; n <= 50; n++) {
      const m = marginalBonus(n, 1.0, 5);
      expect(m).toBeGreaterThan(0); // every pick still adds something
      expect(m).toBeLessThan(prev); // but less than the pick before it
      prev = m;
    }
  });

  it('the first pick is the biggest, and is 0 for non-positive stacks', () => {
    expect(marginalBonus(1, 1.0, 5)).toBeCloseTo(1 / 6); // statBonus(1) - statBonus(0)
    expect(marginalBonus(0, 1.0, 5)).toBe(0);
    expect(marginalBonus(-3, 1.0, 5)).toBe(0);
  });
});

// ADR-0031 — the Resonance permanent-upgrade curve: golden values pinned to Scott's exact spec
// ("first point is a .5% increase, then the next until 10 are .1%. 10 becomes a 1% perm upgrade
// with twice the cost") so the feel can't silently drift.
describe('metaLevelBonus (ADR-0031 permanent-upgrade breakpoint curve)', () => {
  const cfg = { first: 0.005, small: 0.001, breakpoint: 0.01, every: 10 };

  it('level 1 is the bigger first taste (+0.5%)', () => {
    expect(metaLevelBonus(1, cfg)).toBeCloseTo(0.005);
  });

  it('levels 2-9 are small and FLAT (+0.1% each, not diminishing further)', () => {
    for (let n = 2; n <= 9; n++) expect(metaLevelBonus(n, cfg)).toBeCloseTo(0.001);
  });

  it('level 10 is a breakpoint: back up to +1%', () => {
    expect(metaLevelBonus(10, cfg)).toBeCloseTo(0.01);
  });

  it('breakpoints repeat every `every` levels (20, 30…) — never caps', () => {
    expect(metaLevelBonus(20, cfg)).toBeCloseTo(0.01);
    expect(metaLevelBonus(11, cfg)).toBeCloseTo(0.001); // the level right after a breakpoint is small again
  });

  it('is 0 at level 0 and below', () => {
    expect(metaLevelBonus(0, cfg)).toBe(0);
    expect(metaLevelBonus(-1, cfg)).toBe(0);
  });
});

describe('metaBreakpointBonus (cumulative permanent bonus)', () => {
  const cfg = { first: 0.005, small: 0.001, breakpoint: 0.01, every: 10 };

  it('sums to exactly 2.3% at level 10 (0.5 + 8×0.1 + 1)', () => {
    expect(metaBreakpointBonus(10, cfg)).toBeCloseTo(0.023);
  });

  it('is 0 at level 0', () => {
    expect(metaBreakpointBonus(0, cfg)).toBe(0);
  });

  it('is monotonically increasing (every level adds something)', () => {
    let prev = -1;
    for (let n = 1; n <= 25; n++) {
      const b = metaBreakpointBonus(n, cfg);
      expect(b).toBeGreaterThan(prev);
      prev = b;
    }
  });

  it('the shipped META_CURVE matches Scott’s spec exactly', () => {
    expect(META_CURVE.first).toBeCloseTo(0.005);
    expect(META_CURVE.small).toBeCloseTo(0.001);
    expect(META_CURVE.breakpoint).toBeCloseTo(0.01);
    expect(META_CURVE.every).toBe(10);
    expect(metaBreakpointBonus(10, META_CURVE)).toBeCloseTo(0.023);
  });
});

describe('metaLevelCost (steep Echo cost, doubled on breakpoints)', () => {
  const cfg = { base: 40, growth: 1.4, breakpointMul: 2, every: 10 };

  it('level 1 costs exactly `base`', () => {
    expect(metaLevelCost(1, cfg)).toBe(40);
  });

  it('grows geometrically between breakpoints', () => {
    expect(metaLevelCost(2, cfg)).toBe(Math.round(40 * 1.4));
    expect(metaLevelCost(9, cfg)).toBe(Math.round(40 * Math.pow(1.4, 8)));
  });

  it('a breakpoint level costs 2x what the plain ramp would have charged', () => {
    const plain = 40 * Math.pow(1.4, 9);
    expect(metaLevelCost(10, cfg)).toBe(Math.round(plain * 2));
  });

  it('is strictly increasing — a steep grind, never cheap to max (Scott: not in a few playthroughs)', () => {
    let prev = 0;
    for (let n = 1; n <= 20; n++) {
      const c = metaLevelCost(n, cfg);
      expect(c).toBeGreaterThan(prev);
      prev = c;
    }
  });

  it('is Infinity at level 0 and below', () => {
    expect(metaLevelCost(0, cfg)).toBe(Infinity);
  });
});

// (allyShare's suite lived here until CP-C — the AI Ally became the Demon companion; its
// permanent-baseline inheritance contract is locked in tests/demonInherit.test.js instead.)
