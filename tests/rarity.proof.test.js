import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/core/rng.js';
import { rollDrop, rarityOf, typesByTier, rarityBand } from '../src/core/drops.js';
import { chiSquare } from '../src/core/probability.js';
import { PICKUPS } from '../src/config.js';
import { WEAPON_TYPES } from '../src/entities/pickups.js';

// B8 — drop rarity tiers (research report (4)). Seeded + deterministic, chi-square proven, the same
// way the old flat drop table was. Proves the tier roll matches the configured weights and that the
// rarity tagging stays internally consistent.

const R = PICKUPS.rarity;

describe('rarity tagging is consistent', () => {
  it('every tagged type maps to a declared tier, and typesByTier round-trips', () => {
    for (const [type, tier] of Object.entries(R.itemRarity)) {
      expect(R.tiers).toContain(tier);
      expect(rarityOf(type)).toBe(tier);
      expect(typesByTier[tier]).toContain(type);
    }
  });

  it('every droppable weapon has a tier in the B8 ladder (common light guns + stat gems, up to epic)', () => {
    for (const w of WEAPON_TYPES) {
      expect(R.tiers).toContain(rarityOf(w)); // common | rare | epic — ultra guns are offer-only, not here
    }
  });

  it('unknown types fall back to the lowest tier (never undefined)', () => {
    expect(rarityOf('NOPE_NOT_A_THING')).toBe(R.tiers[0]);
  });
});

describe('rarityBand (floor → weight band)', () => {
  it('maps floors across the configured edges [2,4] → bands 0,1,2', () => {
    expect(rarityBand(0)).toBe(0);
    expect(rarityBand(1)).toBe(0);
    expect(rarityBand(2)).toBe(1);
    expect(rarityBand(3)).toBe(1);
    expect(rarityBand(4)).toBe(2);
    expect(rarityBand(99)).toBe(R.regularChestWeights.length - 1); // clamps, never overflows
  });
});

describe('rollDrop matches the configured tier weights (chi-square, seeded)', () => {
  it('a normal-chest band roll fits its weight distribution', () => {
    const weights = R.regularChestWeights[0]; // {common,rare,epic}
    const rng = makeRng(2024);
    const N = 30000;
    const counts = { common: 0, rare: 0, epic: 0 };
    for (let i = 0; i < N; i++) counts[rollDrop(rng, weights).tier]++;

    const total = R.tiers.reduce((s, t) => s + weights[t], 0);
    const observed = R.tiers.map((t) => counts[t]);
    const expected = R.tiers.map((t) => (weights[t] / total) * N);

    // df=2 (3 tiers), p=0.01 critical = 9.21 — generous + deterministic for the fixed seed
    expect(chiSquare(observed, expected)).toBeLessThan(9.21);
    for (let i = 0; i < R.tiers.length; i++) {
      expect(observed[i]).toBeGreaterThan(expected[i] * 0.9);
      expect(observed[i]).toBeLessThan(expected[i] * 1.1);
    }
  });

  it('boss chests never roll a common (a hard fight always pays a weapon)', () => {
    const rng = makeRng(777);
    for (let i = 0; i < 500; i++) {
      const drop = rollDrop(rng, R.bossChestWeights);
      expect(drop.tier).not.toBe('common');
      expect(WEAPON_TYPES).toContain(drop.type);
    }
  });

  it('is deterministic for a given seed', () => {
    const seq = (seed) => {
      const r = makeRng(seed);
      return Array.from({ length: 25 }, () => rollDrop(r, R.regularChestWeights[1]).type);
    };
    expect(seq(42)).toEqual(seq(42));
  });
});
