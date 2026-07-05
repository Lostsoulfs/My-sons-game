import { describe, it, expect } from 'vitest';
import { ITEMS, itemById } from '../src/core/items.js';
import { META_UPGRADES } from '../src/config.js';

// CP4 (ADR-0037): the survival-upgrade rework. HP growth (MAX_HP_UP + Vitality) and the % damage
// SOAK (DMG_REDUCT + Tough Hide) were CUT — incremental survivability flattened the danger. Guard
// (block-charge) stays. Global damage went from a runaway MULTIPLIER to a bounded FLAT +1 (max 3).
// Fortune (permanent luck) is the new premium meta node. These lock the registry so a revert fails.

describe('deleted offer items (HP growth + % soak are gone)', () => {
  for (const id of ['MAX_HP_UP', 'DMG_REDUCT']) {
    it(`${id} is no longer in the registry`, () => {
      expect(itemById(id)).toBeUndefined();
    });
  }
  it('no item carries a maxLife or damageReduction effect kind anymore', () => {
    const kinds = ITEMS.map((it) => it.effect?.kind);
    expect(kinds).not.toContain('maxLife');
    expect(kinds).not.toContain('damageReduction');
  });
});

describe('Guard (block-charge) survives the cut', () => {
  it('keeps both Guard and Greater Guard as guard-effect items', () => {
    for (const id of ['GUARD', 'GREATER_GUARD']) {
      const it = itemById(id);
      expect(it, id).toBeDefined();
      expect(it.effect.kind).toBe('guard');
      expect(it.effect.charges).toBeGreaterThan(0);
    }
  });
});

describe('global damage is a bounded FLAT reward (not a multiplier)', () => {
  const gd = itemById('GLOBAL_DAMAGE');
  it('exists as an ultra flat-damage item', () => {
    expect(gd).toBeDefined();
    expect(gd.tier).toBe('ultra');
    expect(gd.effect.kind).toBe('globalDamageFlat');
  });
  it('adds a flat amount and caps at 3 stacks (no runaway multiplier)', () => {
    expect(gd.effect.add).toBe(1);
    expect(gd.effect.maxStacks).toBe(3);
    expect(gd.effect).not.toHaveProperty('mult'); // the old exponential field is gone
  });
});

describe('meta-upgrade tree (Resonance)', () => {
  const ids = META_UPGRADES.map((n) => n.id);
  it('drops Vitality (+HP) and Tough Hide (+soak)', () => {
    expect(ids).not.toContain('vitality');
    expect(ids).not.toContain('toughHide');
  });
  it('adds Fortune — a flat permanent +luck node, premium-priced, capped below the asymptote', () => {
    const f = META_UPGRADES.find((n) => n.id === 'fortune');
    expect(f).toBeDefined();
    expect(f.effect.stat).toBe('luck');
    expect(f.effect.perLevel).toBeGreaterThan(0);
    expect(f.cost).toHaveLength(f.maxLevel); // flat node → one cost per level
    expect(f.cost[f.maxLevel - 1]).toBeGreaterThan(f.cost[0]); // ramps up (premium)
    // max permanent luck stays below LUCK.half (the curve's shoulder) — never dominates the roll
    expect(f.effect.perLevel * f.maxLevel).toBeLessThanOrEqual(6);
  });
  it('keeps Aegis (permanent guard charge)', () => {
    const a = META_UPGRADES.find((n) => n.id === 'aegis');
    expect(a).toBeDefined();
    expect(a.effect.stat).toBe('guard');
  });
});
