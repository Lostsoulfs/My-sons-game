import { beforeEach, describe, expect, it } from 'vitest';
import {
  normalizeSave,
  migrate,
  nodeById,
  costOf,
  canAfford,
  purchase,
  baselineStacks,
  saves,
} from '../src/core/saves.js';
import { metaBreakpointBonus } from '../src/core/scaling.js';
import { META_UPGRADES, META_CURVE } from '../src/config.js';

// reset the singleton before each test so they don't bleed into each other
beforeEach(() => saves.reset());

// ---- nodeById ----

describe('nodeById', () => {
  it('finds a known node by id', () => {
    expect(nodeById('vitality')).toBeDefined();
    expect(nodeById('vitality').id).toBe('vitality');
  });
  it('returns undefined for unknown id', () => {
    expect(nodeById('NOT_REAL')).toBeUndefined();
  });
});

// ---- costOf ----

describe('costOf', () => {
  it('returns the cost array entry for a valid level', () => {
    const node = nodeById('vitality'); // maxLevel 2, cost [60, 120]
    expect(costOf('vitality', 0)).toBe(node.cost[0]);
    expect(costOf('vitality', 1)).toBe(node.cost[1]);
  });
  it('returns Infinity at or past maxLevel', () => {
    const node = nodeById('vitality');
    expect(costOf('vitality', node.maxLevel)).toBe(Infinity);
    expect(costOf('vitality', node.maxLevel + 1)).toBe(Infinity);
  });
  it('returns Infinity for unknown id', () => {
    expect(costOf('NOT_REAL', 0)).toBe(Infinity);
  });
});

// ---- normalizeSave ----

describe('normalizeSave', () => {
  it('round-trips a clean save', () => {
    const raw = {
      v: 1,
      echoes: 150,
      gameBeaten: true,
      upgrades: { vitality: 1, sharpness: 2 },
      stats: { runs: 5, wins: 2, bestFloor: 3, bossesBeaten: 8 },
    };
    const out = normalizeSave(raw);
    expect(out.v).toBe(1);
    expect(out.echoes).toBe(150);
    expect(out.gameBeaten).toBe(true);
    expect(out.upgrades.vitality).toBe(1);
    expect(out.upgrades.sharpness).toBe(2);
    expect(out.stats.runs).toBe(5);
    expect(out.stats.wins).toBe(2);
    expect(out.stats.bestFloor).toBe(3);
    expect(out.stats.bossesBeaten).toBe(8);
  });

  it('coerces non-finite echoes to 0', () => {
    expect(normalizeSave({ echoes: NaN }).echoes).toBe(0);
    expect(normalizeSave({ echoes: Infinity }).echoes).toBe(0);
    expect(normalizeSave({ echoes: 'bad' }).echoes).toBe(0);
    expect(normalizeSave({ echoes: -50 }).echoes).toBe(0);
  });

  it('floors fractional echoes to an integer', () => {
    expect(normalizeSave({ echoes: 12.9 }).echoes).toBe(12);
  });

  it('coerces gameBeaten to boolean', () => {
    expect(normalizeSave({ gameBeaten: 1 }).gameBeaten).toBe(true);
    expect(normalizeSave({ gameBeaten: 0 }).gameBeaten).toBe(false);
    expect(normalizeSave({ gameBeaten: 'yes' }).gameBeaten).toBe(true);
  });

  it('defaults + sanitizes seenBosses (ADR-0033 skip-after-seen)', () => {
    expect(normalizeSave({}).seenBosses).toEqual([]); // missing → empty
    expect(normalizeSave({ seenBosses: 'nope' }).seenBosses).toEqual([]); // non-array → empty
    // keeps only non-empty strings, de-duped
    expect(
      normalizeSave({ seenBosses: ['spider', 'spider', '', 3, null, 'enforcer'] }).seenBosses,
    ).toEqual(['spider', 'enforcer']);
  });

  it('drops unknown upgrade ids', () => {
    const out = normalizeSave({ upgrades: { NOT_REAL: 5, vitality: 1 } });
    expect(out.upgrades.NOT_REAL).toBeUndefined();
    expect(out.upgrades.vitality).toBe(1);
  });

  it('clamps upgrade levels to 0..maxLevel', () => {
    const node = nodeById('vitality'); // maxLevel 2
    const out = normalizeSave({ upgrades: { vitality: 99 } });
    expect(out.upgrades.vitality).toBe(node.maxLevel);
  });

  it('coerces negative upgrade levels to 0', () => {
    const out = normalizeSave({ upgrades: { vitality: -3 } });
    expect(out.upgrades.vitality).toBe(0);
  });

  it('coerces bad stat fields to 0', () => {
    const out = normalizeSave({
      stats: { runs: NaN, wins: 'bad', bestFloor: -1, bossesBeaten: Infinity },
    });
    expect(out.stats.runs).toBe(0);
    expect(out.stats.wins).toBe(0);
    expect(out.stats.bestFloor).toBe(0);
    expect(out.stats.bossesBeaten).toBe(0);
  });

  it('handles a null/undefined input gracefully', () => {
    const out = normalizeSave(null);
    expect(out.echoes).toBe(0);
    expect(out.gameBeaten).toBe(false);
  });
});

// ---- idempotency ----

describe('normalizeSave idempotency', () => {
  it('normalize(normalize(x)) deep-equals normalize(x)', () => {
    const raw = {
      v: 1,
      echoes: 77.7,
      gameBeaten: true,
      upgrades: { vitality: 99, NOT_REAL: 2, sharpness: 1 },
      stats: { runs: 3, wins: 1, bestFloor: 2, bossesBeaten: 4 },
    };
    const once = normalizeSave(raw);
    const twice = normalizeSave(once);
    expect(twice).toEqual(once);
  });
});

// ---- migrate ----

describe('migrate', () => {
  it('returns the blob unchanged when v === 1', () => {
    const blob = { v: 1, echoes: 10, gameBeaten: false, upgrades: {}, stats: {} };
    expect(migrate(blob)).toBe(blob);
  });

  it('returns fresh defaults for missing v', () => {
    const out = migrate({ echoes: 50 });
    expect(out.v).toBe(1);
    expect(out.echoes).toBe(0);
  });

  it('returns fresh defaults for an unknown version', () => {
    const out = migrate({ v: 99, echoes: 50 });
    expect(out.echoes).toBe(0);
  });

  it('returns fresh defaults for null/undefined', () => {
    expect(migrate(null).v).toBe(1);
    expect(migrate(undefined).v).toBe(1);
  });
});

// ---- canAfford / purchase (pure, no class) ----

describe('canAfford', () => {
  it('returns false for an unknown id', () => {
    expect(canAfford({ echoes: 9999, upgrades: {}, gameBeaten: true }, 'NOT_REAL')).toBe(false);
  });

  it('returns false when echoes are insufficient', () => {
    const save = { echoes: 1, upgrades: {}, gameBeaten: true };
    expect(canAfford(save, 'vitality')).toBe(false); // costs 60
  });

  it('returns true when affordable', () => {
    const save = { echoes: 9999, upgrades: {}, gameBeaten: true };
    expect(canAfford(save, 'vitality')).toBe(true);
  });

  it('returns false when already at maxLevel', () => {
    const node = nodeById('vitality');
    const save = { echoes: 9999, upgrades: { vitality: node.maxLevel }, gameBeaten: true };
    expect(canAfford(save, 'vitality')).toBe(false);
  });
});

describe('purchase (pure)', () => {
  it('deducts echoes and increments level', () => {
    const before = { echoes: 9999, upgrades: {}, gameBeaten: true };
    const after = purchase(before, 'vitality');
    expect(after.echoes).toBe(9999 - costOf('vitality', 0));
    expect(after.upgrades.vitality).toBe(1);
  });

  it('returns the input unchanged when unaffordable', () => {
    const save = { echoes: 1, upgrades: {}, gameBeaten: true };
    expect(purchase(save, 'vitality')).toBe(save);
  });

  it('returns the input unchanged when already maxed', () => {
    const node = nodeById('vitality');
    const save = { echoes: 9999, upgrades: { vitality: node.maxLevel }, gameBeaten: true };
    expect(purchase(save, 'vitality')).toBe(save);
  });

  it('does not mutate the input', () => {
    const before = { echoes: 9999, upgrades: {}, gameBeaten: true };
    const beforeEchoes = before.echoes;
    purchase(before, 'vitality');
    expect(before.echoes).toBe(beforeEchoes);
    expect(before.upgrades.vitality).toBeUndefined();
  });

  it('caps level at maxLevel after multiple purchases', () => {
    const node = nodeById('vitality'); // maxLevel 2
    let save = { echoes: 99999, upgrades: {}, gameBeaten: true };
    for (let i = 0; i < node.maxLevel + 5; i++) save = purchase(save, 'vitality');
    expect(save.upgrades.vitality).toBe(node.maxLevel);
  });
});

// ---- THE GATE (key test — the whole meta layer is locked pre-beat) ----

describe('the beat-the-game gate', () => {
  it('baselineStacks returns all-zero while !gameBeaten', () => {
    const save = normalizeSave({
      v: 1,
      echoes: 9999,
      gameBeaten: false,
      upgrades: { vitality: 2, sharpness: 3, swiftness: 3, rapid: 3, toughHide: 2, aegis: 2 },
      stats: {},
    });
    const stacks = baselineStacks(save);
    for (const v of Object.values(stacks)) expect(v).toBe(0);
  });

  it('baselineStacks returns non-zero after gameBeaten=true', () => {
    const save = normalizeSave({
      v: 1,
      echoes: 9999,
      gameBeaten: true,
      upgrades: { vitality: 1 },
      stats: {},
    });
    expect(baselineStacks(save).hearts).toBe(1);
  });

  it('baselineStacks maps every node to the right stat key and respects level', () => {
    const upgrades = {};
    for (const node of META_UPGRADES) upgrades[node.id] = node.maxLevel;
    const save = normalizeSave({ v: 1, echoes: 0, gameBeaten: true, upgrades, stats: {} });
    const stacks = baselineStacks(save);
    for (const node of META_UPGRADES) {
      const expected =
        node.effect.curve === 'percent'
          ? metaBreakpointBonus(node.maxLevel, META_CURVE) // ADR-0031: standalone % curve
          : node.effect.perLevel * node.maxLevel; // flat nodes (vitality/aegis) — unchanged
      expect(stacks[node.effect.stat]).toBeCloseTo(expected);
    }
  });

  it('saves.canBuy returns false while !gameBeaten even with enough echoes', () => {
    // saves was reset in beforeEach → gameBeaten=false, echoes=0
    // Manually force echoes high without going through the gated path
    saves._v = { ...saves.get(), echoes: 99999 };
    expect(saves.canBuy('vitality')).toBe(false);
  });

  it('saves.canBuy returns true after recordWin', () => {
    saves._v = { ...saves.get(), echoes: 99999 };
    saves.recordWin();
    expect(saves.canBuy('vitality')).toBe(true);
  });

  it('addEchoes no-ops while !gameBeaten', () => {
    saves.addEchoes(100);
    expect(saves.get().echoes).toBe(0);
  });

  it('addEchoes works after recordWin', () => {
    saves.recordWin(); // sets gameBeaten + grants winBonus
    const before = saves.get().echoes;
    saves.addEchoes(100);
    expect(saves.get().echoes).toBe(before + 100);
  });
});

// ---- Save singleton — economy round-trip ----

describe('saves singleton (economy)', () => {
  it('recordWin sets gameBeaten and grants a one-time winBonus', () => {
    expect(saves.get().gameBeaten).toBe(false);
    saves.recordWin();
    expect(saves.get().gameBeaten).toBe(true);
    expect(saves.get().echoes).toBeGreaterThan(0);
    expect(saves.get().stats.wins).toBe(1);
  });

  it('winBonus is only granted once (first win)', () => {
    saves.recordWin();
    const after1 = saves.get().echoes;
    saves.recordWin();
    const after2 = saves.get().echoes;
    expect(after2 - after1).toBe(0); // no extra bonus on second win
    expect(saves.get().stats.wins).toBe(2);
  });

  it('recordRun bumps runs and tracks bestFloor', () => {
    saves.recordRun({ floor: 3 });
    expect(saves.get().stats.runs).toBe(1);
    expect(saves.get().stats.bestFloor).toBe(3);
    saves.recordRun({ floor: 1 });
    expect(saves.get().stats.bestFloor).toBe(3); // best is kept
    saves.recordRun({ floor: 5 });
    expect(saves.get().stats.bestFloor).toBe(5); // new best
  });

  it('recordBossKill bumps bossesBeaten; awards 0 Echoes pre-beat', () => {
    saves.recordBossKill(0);
    expect(saves.get().stats.bossesBeaten).toBe(1);
    expect(saves.get().echoes).toBe(0);
  });

  it('recordBossKill awards Echoes post-beat, scaled by floor', () => {
    saves.recordWin();
    const before = saves.get().echoes;
    saves.recordBossKill(2); // floor index 2
    const earned = saves.get().echoes - before;
    expect(earned).toBeGreaterThan(0);
    expect(earned).toBeGreaterThan(saves.get().echoes - before - 1); // sanity
  });

  it('buy deducts echoes and increments upgrade level', () => {
    saves.recordWin();
    saves.addEchoes(9999);
    const before = saves.get().echoes;
    const result = saves.buy('vitality');
    expect(result).toBe(true);
    expect(saves.get().upgrades.vitality).toBe(1);
    expect(saves.get().echoes).toBe(before - costOf('vitality', 0));
  });

  it('buy returns false when canBuy is false (unaffordable)', () => {
    saves.recordWin();
    // echoes = winBonus only — ensure it's not enough for 'aegis' (costs 80)
    // reset manually to 0 echoes post-beat
    saves._v = { ...saves.get(), echoes: 0 };
    expect(saves.buy('aegis')).toBe(false);
    expect(saves.get().upgrades.aegis).toBeUndefined();
  });

  it('reset wipes everything back to defaults', () => {
    saves.recordWin();
    saves.addEchoes(200);
    saves.buy('vitality');
    saves.reset();
    expect(saves.get().echoes).toBe(0);
    expect(saves.get().gameBeaten).toBe(false);
    expect(saves.get().upgrades).toEqual({});
    expect(saves.get().stats.wins).toBe(0);
  });
});
