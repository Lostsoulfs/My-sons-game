// =====================================================================
// saves.js — versioned localStorage save for the Echoes meta-progression
// (ADR-0029 / B10). Mirrors systems/settings.js: try/catch at every
// storage boundary, normalize() on load, never throws.
//
// Gate rule (triple-enforced here + in game.js):
//   Echoes only drop after the first full win; upgrades and baseline
//   stacks are all zero while gameBeaten === false.
// =====================================================================

import { SAVES, META_UPGRADES, META_CURVE } from '../config.js';
import { metaBreakpointBonus, metaLevelCost } from './scaling.js';

const KEY = SAVES.key;

const DEFAULTS = () => ({
  v: 1,
  echoes: 0,
  gameBeaten: false,
  upgrades: {},
  stats: { runs: 0, wins: 0, bestFloor: 0, bossesBeaten: 0 },
});

// ---- pure helpers (unit-tested, imported by tests/saves.test.js) ----

export function nodeById(id) {
  return META_UPGRADES.find((n) => n.id === id);
}

/** Cost (in Echoes) of buying the NEXT level of a node (current level → level+1).
 *  `percent` nodes (ADR-0031) compute the steep breakpoint-ramp cost; `perLevel`
 *  (flat) nodes read the fixed cost array — unchanged from B10. */
export function costOf(id, level) {
  const node = nodeById(id);
  if (!node || level < 0 || level >= node.maxLevel) return Infinity;
  if (node.effect.curve === 'percent') {
    return metaLevelCost(level + 1, {
      base: node.costBase,
      growth: node.costGrowth,
      breakpointMul: META_CURVE.breakpointCostMul,
      every: META_CURVE.every,
    });
  }
  return node.cost[level] ?? Infinity;
}

export function canAfford(save, id) {
  const node = nodeById(id);
  if (!node) return false;
  const level = save.upgrades[id] ?? 0;
  if (level >= node.maxLevel) return false;
  return save.echoes >= costOf(id, level);
}

/** Returns a new save with the purchase applied; leaves the input unchanged. */
export function purchase(save, id) {
  const node = nodeById(id);
  if (!node) return save;
  const level = save.upgrades[id] ?? 0;
  if (level >= node.maxLevel) return save;
  const price = costOf(id, level);
  if (save.echoes < price) return save;
  return {
    ...save,
    echoes: save.echoes - price,
    upgrades: { ...save.upgrades, [id]: level + 1 },
  };
}

/**
 * Returns { damage, fireRate, speed, damageReduction, hearts, guard } from purchased meta
 * upgrades. ALL-ZERO unless save.gameBeaten (belt-and-suspenders gate — the first playthrough
 * is the pure base game with no permanent buffs).
 *
 * `percent` nodes (ADR-0031: sharpness/swiftness/rapid/toughHide) return a standalone %
 * bonus (metaBreakpointBonus) meant to be ADDED on top of the in-run stat curve, not folded
 * into its stack count — see entities/player.js _recomputeUpgrades. `perLevel` (flat) nodes
 * (vitality/aegis) are unchanged: a small integer stack per level.
 */
export function baselineStacks(save) {
  const zero = { damage: 0, fireRate: 0, speed: 0, damageReduction: 0, hearts: 0, guard: 0 };
  if (!save.gameBeaten) return zero;
  const result = { ...zero };
  for (const node of META_UPGRADES) {
    const level = save.upgrades[node.id] ?? 0;
    if (level <= 0) continue;
    result[node.effect.stat] +=
      node.effect.curve === 'percent'
        ? metaBreakpointBonus(level, META_CURVE)
        : node.effect.perLevel * level;
  }
  return result;
}

/**
 * Coerce a (possibly corrupt / hand-edited) blob to the right types.
 * Unknown upgrade ids are dropped; known ids are clamped 0..maxLevel.
 */
export function normalizeSave(raw) {
  if (!raw || typeof raw !== 'object') return DEFAULTS();

  const echoes = Number(raw.echoes);
  const gameBeaten = !!raw.gameBeaten;

  const upgrades = {};
  const rawUp = raw.upgrades && typeof raw.upgrades === 'object' ? raw.upgrades : {};
  for (const node of META_UPGRADES) {
    const v = Number(rawUp[node.id]);
    if (Number.isFinite(v)) {
      upgrades[node.id] = Math.max(0, Math.min(node.maxLevel, Math.floor(v)));
    }
  }

  const rs = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
  const fi = (x) => {
    const n = Math.floor(Number(x));
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  };
  const stats = {
    runs: fi(rs.runs),
    wins: fi(rs.wins),
    bestFloor: fi(rs.bestFloor),
    bossesBeaten: fi(rs.bossesBeaten),
  };

  return {
    v: 1,
    echoes: Number.isFinite(echoes) ? Math.max(0, Math.floor(echoes)) : 0,
    gameBeaten,
    upgrades,
    stats,
  };
}

/**
 * If the blob is missing or has an unrecognised version, return fresh defaults.
 * Currently v:1 is the only version; this is the hook for future migrations.
 */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return DEFAULTS();
  return raw;
}

function load() {
  try {
    const stored = localStorage.getItem(KEY);
    return stored ? normalizeSave(migrate(JSON.parse(stored))) : DEFAULTS();
  } catch {
    return DEFAULTS();
  }
}

// ---- the singleton Save (one shared instance for the whole game) ----

class Save {
  constructor() {
    this._v = load();
  }

  /** Read-only snapshot of the current save. */
  get() {
    return this._v;
  }

  /**
   * Award Echoes. GATED: no-ops if gameBeaten is false, so callers don't
   * need to check — the gate is always enforced here.
   */
  addEchoes(n) {
    if (!this._v.gameBeaten) return;
    const amount = Math.max(0, Math.floor(n));
    if (amount === 0) return;
    this._v = { ...this._v, echoes: this._v.echoes + amount };
    this._save();
  }

  /**
   * Called when the player clears the final boss. Bumps wins, sets gameBeaten,
   * and grants the one-time starter budget (winBonus) if this is the first win.
   */
  recordWin() {
    const bonus = this._v.gameBeaten ? 0 : SAVES.winBonus;
    this._v = {
      ...this._v,
      gameBeaten: true,
      echoes: this._v.echoes + bonus,
      stats: { ...this._v.stats, wins: this._v.stats.wins + 1 },
    };
    this._save();
  }

  /** Called on a GAMEOVER (death). Bumps runs + tracks the deepest floor reached. */
  recordRun({ floor = 0 } = {}) {
    const f = Math.max(0, Math.floor(floor));
    this._v = {
      ...this._v,
      stats: {
        ...this._v.stats,
        runs: this._v.stats.runs + 1,
        bestFloor: Math.max(this._v.stats.bestFloor, f),
      },
    };
    this._save();
  }

  /**
   * Called whenever a boss dies. Bumps the lifetime boss-kill counter and —
   * only if gameBeaten — awards Echoes proportional to floor depth.
   */
  recordBossKill(floorIndex) {
    const f = Math.max(0, Math.floor(floorIndex));
    const echoes = this._v.gameBeaten ? SAVES.echoesPerBoss + SAVES.echoesFloorBonus * f : 0;
    this._v = {
      ...this._v,
      echoes: this._v.echoes + echoes,
      stats: { ...this._v.stats, bossesBeaten: this._v.stats.bossesBeaten + 1 },
    };
    this._save();
  }

  /** True iff the node can be purchased right now (gameBeaten + affordable + not maxed). */
  canBuy(id) {
    // Gate first, then defer the affordable/not-maxed/exists checks to the pure helper
    // (keeps the rule in one place — no duplicated guard between here and canAfford).
    return this._v.gameBeaten && canAfford(this._v, id);
  }

  /** Attempt a purchase. Returns true on success, false if canBuy would have returned false. */
  buy(id) {
    if (!this.canBuy(id)) return false;
    this._v = purchase(this._v, id);
    this._save();
    return true;
  }

  /** Wipe everything and start fresh (debug / full reset). */
  reset() {
    this._v = DEFAULTS();
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* storage unavailable */
    }
  }

  _save() {
    const json = JSON.stringify(this._v);
    try {
      localStorage.setItem(KEY, json);
    } catch {
      /* storage unavailable — keep in-memory */
    }
  }
}

export const saves = new Save();
