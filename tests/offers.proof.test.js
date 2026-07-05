import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/core/rng.js';
import { generateOffer, pityFloorTier } from '../src/core/offers.js';
import { chiSquare } from '../src/core/probability.js';
import { OFFERS } from '../src/config.js';

// B9a — the room-clear offer generator. Pure + seeded, so every property below is reproducible.

const tierIdx = (t) => OFFERS.tiers.indexOf(t);

describe('generateOffer shape', () => {
  it('returns exactly cardCount DISTINCT cards, each fully formed', () => {
    const rng = makeRng(11);
    for (let i = 0; i < 200; i++) {
      const cards = generateOffer(rng, {});
      expect(cards).toHaveLength(OFFERS.cardCount);
      expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length); // no duplicate items
      for (const c of cards) {
        expect(typeof c.id).toBe('string');
        expect(typeof c.name).toBe('string');
        expect(OFFERS.tiers).toContain(c.tier);
        expect(c.blurb.length).toBeGreaterThan(0);
      }
    }
  });

  it('is deterministic for a given seed', () => {
    const run = (seed) => generateOffer(makeRng(seed), { commonStreak: 1 });
    expect(run(42)).toEqual(run(42));
  });

  it('never shows three cards of the same category (variety guard)', () => {
    const rng = makeRng(2024);
    for (let i = 0; i < 500; i++) {
      const cards = generateOffer(rng, {});
      const counts = {};
      for (const c of cards) counts[c.category] = (counts[c.category] ?? 0) + 1;
      expect(Math.max(...Object.values(counts))).toBeLessThan(OFFERS.cardCount);
    }
  });
});

describe('tier roll matches the configured weights (chi-square, seeded)', () => {
  it('the first card (no pity) fits OFFERS.tierWeights', () => {
    const rng = makeRng(7);
    const N = 24000;
    const counts = {};
    for (const t of OFFERS.tiers) counts[t] = 0;
    for (let i = 0; i < N; i++) counts[generateOffer(rng, { commonStreak: 0 })[0].tier]++;

    const total = OFFERS.tiers.reduce((s, t) => s + OFFERS.tierWeights[t], 0);
    const observed = OFFERS.tiers.map((t) => counts[t]);
    const expected = OFFERS.tiers.map((t) => (OFFERS.tierWeights[t] / total) * N);
    // df=3, p=0.01 critical = 11.34 — generous + deterministic for the fixed seed
    expect(chiSquare(observed, expected)).toBeLessThan(11.34);
  });
});

// CP3 (ADR-0036): dry-streak pity is DISABLED — the offer economy is deliberately harsh. The
// boss-clear rare+ floor is a SEPARATE mechanism that stays (covered below under weapon-aware gating).
describe('dry-streak pity is disabled (harsh economy, ADR-0036)', () => {
  it('pityFloorTier returns null at every streak length', () => {
    for (const s of [0, OFFERS.softPity.rareAfter, OFFERS.hardPity.commonStreakMax, 99]) {
      expect(pityFloorTier(s)).toBeNull();
    }
  });

  it('a long dry streak does NOT floor the first card — it can still be common', () => {
    let sawCommonFirst = false;
    for (let seed = 0; seed < 60 && !sawCommonFirst; seed++) {
      const cards = generateOffer(makeRng(seed), {
        commonStreak: OFFERS.hardPity.commonStreakMax + 5,
      });
      if (cards[0].tier === 'common') sawCommonFirst = true;
    }
    expect(sawCommonFirst).toBe(true); // no safety net — a run can stay mean
  });
});

describe('anti-repeat down-weights recent items and owned weapons', () => {
  const countAppearances = (id, ctx, seed, N = 5000) => {
    const rng = makeRng(seed);
    let n = 0;
    for (let i = 0; i < N; i++) {
      if (generateOffer(rng, ctx).some((c) => c.id === id)) n++;
    }
    return n;
  };

  it('a recently-offered item shows up less often than when it is not recent', () => {
    const fresh = countAppearances('SPEED_UP', {}, 100);
    const recent = countAppearances('SPEED_UP', { recent: ['SPEED_UP'] }, 100);
    expect(recent).toBeLessThan(fresh);
  });

  it('an owned weapon shows up less often than when it is not owned', () => {
    const fresh = countAppearances('SHOTGUN', {}, 200);
    const owned = countAppearances('SHOTGUN', { owned: ['SHOTGUN'] }, 200);
    expect(owned).toBeLessThan(fresh);
  });
});

// ADR-0030 — the offer generator is weapon-aware (all opt-in via ctx). These lock the gating.
describe('ADR-0030 weapon-aware gating', () => {
  const has = (id, ctx, seed, N = 4000) => {
    const rng = makeRng(seed);
    let n = 0;
    for (let i = 0; i < N; i++) if (generateOffer(rng, ctx).some((c) => c.id === id)) n++;
    return n;
  };

  it('never offers a stat the HELD weapon has already maxed', () => {
    const rng = makeRng(5);
    for (let i = 0; i < 2000; i++) {
      const cards = generateOffer(rng, { statCap: 9, weaponStat: { DAMAGE_UP: 9 } });
      expect(cards.some((c) => c.id === 'DAMAGE_UP')).toBe(false);
    }
  });

  it('withholds explosive tips on an already-explosive OR fast-firing gun', () => {
    const rng = makeRng(6);
    for (let i = 0; i < 1500; i++) {
      expect(generateOffer(rng, { weaponExplosive: true }).some((c) => c.id === 'MOD_BLAST')).toBe(
        false,
      );
      expect(generateOffer(rng, { weaponFast: true }).some((c) => c.id === 'MOD_BLAST')).toBe(
        false,
      );
    }
  });

  it('a boss-tier offer guarantees the first card is rare or better', () => {
    for (let seed = 0; seed < 60; seed++) {
      const cards = generateOffer(makeRng(seed), { bossTier: true });
      expect(tierIdx(cards[0].tier)).toBeGreaterThanOrEqual(tierIdx('rare'));
    }
  });

  it('down-weights NEW weapon offers once you already hold more than one gun', () => {
    const one = has('SHOTGUN', { ownedCount: 1 }, 300);
    const many = has('SHOTGUN', { ownedCount: 2 }, 300);
    expect(many).toBeLessThan(one);
  });

  it('LUCK biases the tier roll up: fewer commons at max luck', () => {
    const commons = (luck, seed) => {
      const rng = makeRng(seed);
      let n = 0;
      for (let i = 0; i < 4000; i++) if (generateOffer(rng, { luck })[0].tier === 'common') n++;
      return n;
    };
    expect(commons(OFFERS.luck.maxStacks, 400)).toBeLessThan(commons(0, 400));
  });

  it('LUCK is hard-capped: stacks past maxStacks change nothing (same seed, same cards)', () => {
    const run = (luck) => generateOffer(makeRng(77), { luck });
    expect(run(OFFERS.luck.maxStacks)).toEqual(run(999));
  });

  it('see-it-once: a weapon offered before shows up less and less', () => {
    const fresh = has('SHOTGUN', {}, 500);
    const seenOnce = has('SHOTGUN', { seenWeapons: { SHOTGUN: 1 } }, 500);
    const seenLots = has('SHOTGUN', { seenWeapons: { SHOTGUN: 4 } }, 500);
    expect(seenOnce).toBeLessThan(fresh);
    expect(seenLots).toBeLessThan(seenOnce);
  });

  it('LUCK_UP leaves the pool once luck is at its cap (no dead card)', () => {
    const rng = makeRng(8);
    for (let i = 0; i < 2000; i++) {
      const cards = generateOffer(rng, { luck: OFFERS.luck.maxStacks });
      expect(cards.some((c) => c.id === 'LUCK_UP')).toBe(false);
    }
  });

  it('negative luck clamps to 0 (identical to no luck for the same seed)', () => {
    expect(generateOffer(makeRng(88), { luck: -5 })).toEqual(
      generateOffer(makeRng(88), { luck: 0 }),
    );
  });

  it('a MAXED weapon mod leaves the pool (no silent no-op picks)', () => {
    const rng = makeRng(9);
    for (let i = 0; i < 2000; i++) {
      const cards = generateOffer(rng, { statCap: 9, weaponMods: { MOD_PIERCE: 9 } });
      expect(cards.some((c) => c.id === 'MOD_PIERCE')).toBe(false);
    }
  });

  it('the Blade Aura pick stops being offered once it is at max level (CP-B)', () => {
    const rng = makeRng(10);
    for (let i = 0; i < 2000; i++) {
      const cards = generateOffer(rng, { auraLevel: 3 }); // BLADE_AURA.maxLevel
      expect(cards.some((c) => c.id === 'BLADE_AURA')).toBe(false);
    }
  });
});
