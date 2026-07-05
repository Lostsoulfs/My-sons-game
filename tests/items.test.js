import { describe, it, expect } from 'vitest';
import {
  ITEMS,
  TIERS,
  CATEGORIES,
  itemById,
  itemsByTier,
  itemsByCategory,
  blurbFor,
} from '../src/core/items.js';
import { PICKUPS, WEAPONS, BLADE_AURA } from '../src/config.js';

// B9a — the offerable-item registry. Pure data + blurbs, so the offer screen can't drift from it.

describe('registry integrity', () => {
  it('every item is well-formed (id/name/category/tier/tags/effect)', () => {
    for (const it of ITEMS) {
      expect(typeof it.id).toBe('string');
      expect(it.id.length).toBeGreaterThan(0);
      expect(typeof it.name).toBe('string');
      expect(CATEGORIES).toContain(it.category);
      expect(TIERS).toContain(it.tier);
      expect(Array.isArray(it.tags)).toBe(true);
      expect(it.tags.length).toBeGreaterThan(0);
      expect(typeof it.effect?.kind).toBe('string');
    }
  });

  it('ids are unique and itemById round-trips', () => {
    const ids = ITEMS.map((it) => it.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const it of ITEMS) expect(itemById(it.id)).toBe(it);
    expect(itemById('NOT_A_REAL_ID')).toBeUndefined();
  });

  it('the by-tier and by-category maps partition the whole registry', () => {
    expect(TIERS.reduce((n, t) => n + itemsByTier[t].length, 0)).toBe(ITEMS.length);
    expect(CATEGORIES.reduce((n, c) => n + itemsByCategory[c].length, 0)).toBe(ITEMS.length);
  });

  it('covers all three categories and an ultra tier (the guard lives there)', () => {
    for (const c of CATEGORIES) expect(itemsByCategory[c].length).toBeGreaterThan(0);
    expect(itemsByTier.ultra.length).toBeGreaterThan(0);
    expect(itemById('GREATER_GUARD').tier).toBe('ultra');
  });

  it('every weapon item maps to a real weapon key with a valid tier, spanning common..ultra', () => {
    const weapons = itemsByCategory.weapon;
    for (const it of weapons) {
      expect(it.effect.kind).toBe('weapon');
      expect(typeof it.effect.weapon).toBe('string');
      expect(TIERS).toContain(it.tier);
    }
    // rarity ⟂ flavor: weapons deliberately span the whole ladder (a common laser, an ultra minigun)
    const tiers = new Set(weapons.map((w) => w.tier));
    expect(tiers.has('common')).toBe(true);
    expect(tiers.has('ultra')).toBe(true);
  });
});

describe('blurbFor (the exact effect line on a card)', () => {
  it('returns a non-empty string for every item', () => {
    for (const it of ITEMS) {
      expect(blurbFor(it, { stacks: 0 }).length).toBeGreaterThan(0);
    }
  });

  it('shows the MARGINAL percent for stacking stats — shrinks deeper into a run', () => {
    const dmg = itemById('DAMAGE_UP');
    const first = blurbFor(dmg, { stacks: 0 }); // the 1st pick
    const late = blurbFor(dmg, { stacks: 20 }); // the 21st pick
    expect(first).toMatch(/^\+\d+% damage$/);
    const pct = (s) => parseInt(s.match(/\+(\d+)%/)[1], 10);
    expect(pct(first)).toBeGreaterThan(pct(late)); // diminishing returns are visible on the card
  });

  it('describes the guard, mods, and weapons in plain words', () => {
    expect(blurbFor(itemById('GUARD'))).toBe('Block the next hit');
    expect(blurbFor(itemById('GREATER_GUARD'))).toBe('Block the next 3 hits');
    expect(blurbFor(itemById('MOD_PIERCE'))).toMatch(/pierce/i);
    expect(blurbFor(itemById('SHOTGUN'))).toBe('Shotgun');
    expect(blurbFor(itemById('BLADE_AURA'))).toMatch(/blade/i);
  });
});

// CP-B: the Orbital Blade left the weapon roster and came back as the always-on Blade Aura upgrade.
describe('CP-B: the passive Blade Aura upgrade', () => {
  it('is a stacking bladeAura-effect upgrade capped at config.BLADE_AURA.maxLevel', () => {
    const ba = itemById('BLADE_AURA');
    expect(ba.category).toBe('upgrade');
    expect(ba.effect.kind).toBe('bladeAura');
    expect(ba.effect.add).toBe(1);
    expect(ba.effect.maxStacks).toBe(BLADE_AURA.maxLevel); // stays in lockstep with the config cap
  });

  it('is no longer a weapon (the Orbital Blade weapon is gone from every registry)', () => {
    expect(WEAPONS.orbital).toBeUndefined();
    expect(itemsByCategory.weapon.some((it) => it.id === 'ORBITAL')).toBe(false);
    expect(PICKUPS.rarity.itemRarity.ORBITAL).toBeUndefined();
  });
});

// B9b — items.js is the single offer registry, but the B8 ground/boss-chest engine still reads
// PICKUPS.rarity.itemRarity. Guard against the two SOURCES drifting apart on weapon tiers.
describe('no-drift: weapon items stay in lockstep with the B8 drop engine', () => {
  it('every weapon item maps to a real config.WEAPONS key', () => {
    for (const it of itemsByCategory.weapon) {
      expect(WEAPONS[it.effect.weapon]).toBeDefined();
    }
  });

  it('non-ultra weapon tiers equal PICKUPS.rarity.itemRarity[id]; ultra weapons are offer-only', () => {
    for (const it of itemsByCategory.weapon) {
      if (it.tier === 'ultra') {
        // ULTRA weapons are offer-only — they must NOT appear in the B8 ground/chest drop table
        expect(PICKUPS.rarity.itemRarity[it.id]).toBeUndefined();
      } else {
        expect(PICKUPS.rarity.itemRarity[it.id]).toBeDefined(); // a missing entry must fail, not false-pass
        expect(it.tier).toBe(PICKUPS.rarity.itemRarity[it.id]);
      }
    }
  });
});
