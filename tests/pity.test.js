import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/core/rng.js';
import { rollDrop, pityMinTier } from '../src/core/drops.js';
import { PICKUPS } from '../src/config.js';

// CP3 (ADR-0036): the rarity pyramid is deliberately HARSH — dry-streak pity is DISABLED
// (`PICKUPS.rarity.pityEnabled === false`). A run CAN go all-common; there is no anti-frustration
// safety net. What stays: `rollDrop` still honors an EXPLICIT `minTier` floor — the mechanism the
// boss chest (`bossChestWeights`, no commons) uses to always pay a weapon.

const R = PICKUPS.rarity;
const { minTier } = R.hardPity;

describe('pityMinTier — dry-streak pity is DISABLED (harsh economy, ADR-0036)', () => {
  it('returns no floor at any streak length, even far past the old cap', () => {
    for (const s of [0, 1, R.hardPity.commonStreakMax, R.hardPity.commonStreakMax + 50]) {
      expect(pityMinTier(s)).toBeNull();
    }
  });
});

describe('rollDrop still honors an explicit floor (the boss-chest rare+ mechanism)', () => {
  it('with minTier set, never rolls below it — even on a common-heavy weight table', () => {
    const rng = makeRng(123);
    const commonHeavy = { common: 1000, rare: 1, epic: 1 }; // would almost always roll common
    for (let i = 0; i < 500; i++) {
      const drop = rollDrop(rng, commonHeavy, { minTier });
      expect(drop.tier).not.toBe('common');
    }
  });
});

describe('a dry run has NO safety net (pity never forces a rare+)', () => {
  it('mirrors game.js: the common streak is free to grow unbounded — no forced draw', () => {
    const rng = makeRng(2026);
    const weights = R.regularChestWeights[0]; // early floor — the most common-heavy band
    let streak = 0;
    let maxStreak = 0;

    for (let i = 0; i < 200; i++) {
      const floor = pityMinTier(streak); // game.js passes this as minTier — now always null
      expect(floor).toBeNull();
      const drop = rollDrop(rng, weights, { minTier: floor });
      streak = drop.tier === R.tiers[0] ? streak + 1 : 0;
      maxStreak = Math.max(maxStreak, streak);
    }

    // with pity off and a ~75% common band, a dry streak longer than the old cap WILL occur
    expect(maxStreak).toBeGreaterThan(R.hardPity.commonStreakMax);
  });
});
