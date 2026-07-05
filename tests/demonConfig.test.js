import { describe, it, expect } from 'vitest';
import { DEMON, META_UPGRADES } from '../src/config.js';
import { baselineStacks, normalizeSave } from '../src/core/saves.js';
import { demonRows } from '../src/core/statsPanel.js';

// CP-C (ADR-0042): the demon companion's CONFIG contract. The unlock rides the Resonance pipe
// (a META_UPGRADES node whose effect.stat feeds baselineStacks), so these lock: the node's shape,
// the first-win gate covering it for free, NaN-safety in baselineStacks, and the pause-menu rows.

const node = META_UPGRADES.find((n) => n.id === 'demon');

describe('the Broken Seal node (demon unlock)', () => {
  it('exists as a one-level premium flat node with a full cost array', () => {
    expect(node).toBeDefined();
    expect(node.maxLevel).toBe(1);
    expect(node.cost).toHaveLength(node.maxLevel);
    expect(node.cost[0]).toBeGreaterThanOrEqual(100); // premium: pricier than an Aegis level (80)
    expect(node.effect).toEqual({ stat: 'demon', perLevel: 1 });
  });

  it('baselineStacks carries demon=0/1 with NO NaN (every effect.stat must have a zero key)', () => {
    const locked = baselineStacks({ gameBeaten: true, upgrades: {} });
    expect(locked.demon).toBe(0);
    const bought = baselineStacks({ gameBeaten: true, upgrades: { demon: 1 } });
    expect(bought.demon).toBe(1);
    // NaN regression guard: every stat any node writes must be a real number
    for (const [k, v] of Object.entries(bought)) {
      expect(Number.isFinite(v), `baselineStacks.${k}`).toBe(true);
    }
  });

  it('the first-win gate covers the demon for free (all-zero pre-beat, even if hand-edited)', () => {
    expect(baselineStacks({ gameBeaten: false, upgrades: { demon: 1 } }).demon).toBe(0);
  });

  it('an old/corrupt save normalizes safely around the new node (clamped 0..1)', () => {
    const norm = normalizeSave({ v: 1, upgrades: { demon: 99 }, gameBeaten: true });
    expect(norm.upgrades.demon).toBe(1); // clamped to maxLevel
    expect(normalizeSave({ v: 1 }).upgrades.demon).toBeUndefined(); // absent stays absent
  });
});

describe('DEMON config sanity', () => {
  it('inheritance dials are sane fractions and the bolt is a real projectile', () => {
    expect(DEMON.inheritShare).toBeGreaterThan(0);
    expect(DEMON.inheritShare).toBeLessThanOrEqual(1);
    expect(DEMON.rateFloor).toBeGreaterThan(0);
    expect(DEMON.bolt.cooldown).toBeGreaterThan(0);
    expect(DEMON.bolt.damage).toBeGreaterThan(0);
    expect(DEMON.bolt.bulletSpeed).toBeGreaterThan(0);
  });

  it('the bolt stays modest — no stronger per shot than the base pistol (companion, not a turret)', () => {
    expect(DEMON.bolt.damage).toBeLessThanOrEqual(1);
    expect(DEMON.bolt.cooldown).toBeGreaterThanOrEqual(0.4); // slower trigger than any player SMG
  });
});

describe('demonRows — the pause-menu readout', () => {
  it('renders the three inherited multipliers as raw ×N.NN tokens', () => {
    const [sec] = demonRows({ damageMul: 1.2, fireRateMul: 0.9, speedMul: 1.15 });
    expect(sec.title).toBe('Inherited (Resonance)');
    expect(sec.rows.map((r) => r.value)).toEqual(['×1.20', '×0.90', '×1.15']);
    // no-hand-holding: values are compact numeric tokens, no prose
    for (const r of sec.rows) expect(r.value).toMatch(/^×\d+\.\d{2}$/);
  });

  it('degrades a missing snapshot to identity multipliers (not zeros — inheritance multiplies)', () => {
    const [sec] = demonRows({});
    expect(sec.rows.map((r) => r.value)).toEqual(['×1.00', '×1.00', '×1.00']);
  });
});
