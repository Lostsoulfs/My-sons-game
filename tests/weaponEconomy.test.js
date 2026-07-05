import { describe, it, expect } from 'vitest';
import { WEAPONS, WEAPON_LIMITS, PICKUPS, TIER_BANDS } from '../src/config.js';
import { powerScore, tierForScore, effectiveCooldown } from '../src/core/powerScore.js';
import { weaponDuty } from '../src/core/duty.js';
import { weaponTier } from '../src/core/items.js';

// =====================================================================
// CP3 (ADR-0036): the weapon POWER-BUDGET model makes rarity ≈ power. This suite is the "make the
// guns' math match" contract Scott asked for: every weapon's sustained (duty-corrected) power score
// must sit in its assigned rarity band, the bands form a strict 8/7/5/2 pyramid with strictly
// increasing medians, every weapon pays a real downside, and ULTRA is a 2-weapon offer-only top.
// If a future stat/limit edit drifts a weapon out of its band, THIS test fails loudly.
// =====================================================================

const KEYS = Object.keys(WEAPONS);
const scoreOf = (key) => powerScore(WEAPONS[key], WEAPON_LIMITS[key]);
const dutyOf = (key) =>
  WEAPONS[key].orbital ? 1 : weaponDuty(effectiveCooldown(WEAPONS[key]), WEAPON_LIMITS[key]);

// The single passive/contact weapon with NO firing limiter (an intentional exception).
const EXEMPT_FROM_DOWNSIDE = 'orbital';

// Golden expected tier per weapon — the design intent, locked. Mirrors core/items.js +
// PICKUPS.rarity.itemRarity (pistol = the base gun, implicitly common).
const EXPECTED_TIER = {
  pistol: 'common',
  carbine: 'common',
  uzi: 'common',
  laserpistol: 'common',
  thompson: 'common',
  bouncer: 'common',
  homing: 'common',
  railgun: 'common',
  shotgun: 'rare',
  garand: 'rare',
  bar: 'rare',
  ppsh: 'rare',
  machinegun: 'rare',
  rocket: 'rare',
  orbital: 'rare',
  charge: 'epic',
  plasma: 'epic',
  maser: 'epic',
  browning: 'epic',
  raygun: 'epic',
  minigun: 'ultra',
  davycrockett: 'ultra',
};

const median = (nums) => {
  const s = [...nums].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

describe('every weapon is scored and tiered', () => {
  it('the golden table covers exactly the WEAPONS roster (no weapon un-tiered)', () => {
    expect(new Set(Object.keys(EXPECTED_TIER))).toEqual(new Set(KEYS));
  });

  it("each weapon's assigned tier (items.js) matches the golden design intent", () => {
    for (const key of KEYS) expect(weaponTier(key), key).toBe(EXPECTED_TIER[key]);
  });

  it("each weapon's power SCORE lands in its assigned tier's band", () => {
    for (const key of KEYS) {
      expect(tierForScore(scoreOf(key)), `${key} score=${scoreOf(key).toFixed(1)}`).toBe(
        EXPECTED_TIER[key],
      );
    }
  });
});

describe('the rarity pyramid (strict 8 / 7 / 5 / 2)', () => {
  it('the tier counts form the intended pyramid', () => {
    const counts = { common: 0, rare: 0, epic: 0, ultra: 0 };
    for (const key of KEYS) counts[weaponTier(key)]++;
    expect(counts).toEqual({ common: 8, rare: 7, epic: 5, ultra: 2 });
  });

  it('per-tier median power strictly INCREASES common < rare < epic < ultra', () => {
    const byTier = { common: [], rare: [], epic: [], ultra: [] };
    for (const key of KEYS) byTier[weaponTier(key)].push(scoreOf(key));
    const [c, r, e, u] = ['common', 'rare', 'epic', 'ultra'].map((t) => median(byTier[t]));
    expect(c).toBeLessThan(r);
    expect(r).toBeLessThan(e);
    expect(e).toBeLessThan(u);
    // Golden magnitudes: ordering alone is implied by the band+contiguity tests, so it can't catch a
    // proportional/units regression that keeps order. Pin the actual medians so a scale shift fails HERE.
    expect(c).toBeCloseTo(4.73, 1);
    expect(r).toBeCloseTo(7.5, 1);
    expect(e).toBeCloseTo(12.88, 1);
    expect(u).toBeCloseTo(17.13, 1);
  });

  it('TIER_BANDS are contiguous + ascending (no gaps, no overlap)', () => {
    const order = ['common', 'rare', 'epic', 'ultra'];
    for (let i = 0; i < order.length; i++) {
      const [lo, hi] = TIER_BANDS[order[i]];
      expect(lo).toBeLessThan(hi);
      if (i > 0) expect(lo).toBe(TIER_BANDS[order[i - 1]][1]); // this.lo === prev.hi
    }
    expect(TIER_BANDS.ultra[1]).toBe(Infinity);
  });
});

describe('every weapon pays a real downside (the duty-cycle lever)', () => {
  it('exactly one weapon (the passive Orbital Blade) has no firing limiter', () => {
    const unlimited = KEYS.filter((key) => !WEAPON_LIMITS[key]);
    expect(unlimited).toEqual([EXEMPT_FROM_DOWNSIDE]);
  });

  it('every LIMITED weapon actually loses uptime (duty < 1 — energy guns really overheat)', () => {
    for (const key of KEYS) {
      if (key === EXEMPT_FROM_DOWNSIDE) continue;
      expect(dutyOf(key), `${key} duty`).toBeLessThan(1);
    }
  });
});

describe('ULTRA is a 2-weapon, offer-only top', () => {
  const ultras = KEYS.filter((key) => weaponTier(key) === 'ultra');

  it('is exactly the minigun + Davy Crockett', () => {
    expect(new Set(ultras)).toEqual(new Set(['minigun', 'davycrockett']));
  });

  it('ultra weapons are OFFER-ONLY: absent from the ground-drop rarity table', () => {
    for (const key of ultras) {
      expect(PICKUPS.rarity.itemRarity[key.toUpperCase()]).toBeUndefined();
    }
  });

  it('both ultras out-power every epic (score above the top epic)', () => {
    const topEpic = Math.max(...KEYS.filter((key) => weaponTier(key) === 'epic').map(scoreOf));
    for (const key of ultras) expect(scoreOf(key), key).toBeGreaterThan(topEpic);
  });
});
