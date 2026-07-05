// =====================================================================
// scaling.js — pure progression/difficulty CURVES (no imports). The "feel math"
// lives here so it's testable and tunable from one place (config.UPGRADES /
// config.DIFFICULTY). Two curves:
//   1. statBonus  — diminishing-returns player upgrades (no hard cap-in-3).
//   2. floorScale — the per-floor difficulty ramp for the whole run.
// =====================================================================

/**
 * Diminishing-returns upgrade bonus for a stack count (PURE):
 *
 *     bonus(n) = maxBonus * n / (n + half)
 *
 * A saturating curve: big early, tapering, approaching `maxBonus` but never
 * hitting a hard wall — so every pickup still adds *something* across a whole run
 * instead of capping after ~3. `half` is the number of stacks that reaches HALF of
 * `maxBonus` (the "knee" of the curve). n<=0 -> 0.
 *
 * @param {number} stacks   how many of this upgrade you've collected
 * @param {number} maxBonus the eventual ceiling (e.g. 1.0 = up to +100%)
 * @param {number} half     stacks to reach half of maxBonus; MUST be > 0 (higher =
 *                          slower ramp). half <= 0 degrades to the asymptote rather
 *                          than producing Infinity / a negative (debuff) bonus.
 * @returns {number} the bonus to ADD (damage/speed) or convert (fire rate)
 */
export function statBonus(stacks, maxBonus, half) {
  if (stacks <= 0 || half <= 0) return stacks > 0 ? maxBonus : 0;
  return (maxBonus * stacks) / (stacks + half);
}

/**
 * Per-floor difficulty multiplier on a smooth growth curve (PURE):
 *
 *     floorScale(i) = base * (1 + growth)^i
 *
 * One place shapes the whole run's challenge: `base` is floor 0 (the tutorial
 * floor) and `growth` is the per-floor ramp. Used for the "safe" difficulty knobs
 * (boss HP, ring density, enemy counts) — never bullet speed. Replaces hand-set
 * per-floor diffs so the curve is tunable in one spot. Negative indices clamp to 0.
 *
 * @param {number} floorIndex 0-based floor
 * @param {{base:number, growth:number}} params REQUIRED — pass `config.DIFFICULTY`
 *        (kept pure/import-free, so the only source of these knobs is the caller's
 *        config; no in-module defaults to silently drift from it).
 * @returns {number} the difficulty multiplier for that floor
 */
export function floorScale(floorIndex, { base, growth }) {
  return base * Math.pow(1 + growth, Math.max(0, floorIndex));
}

/**
 * Distribute the "twice as hard" master knob across one difficulty FACET (PURE):
 *
 *     facet(mul, weight) = 1 + (mul - 1) * weight
 *
 * `hardnessMul` is the single dial (1 = the original game, 2 = "twice as hard"). Applying it
 * 1:1 to EVERY facet would compound (2× HP × 2× count × 2× damage ≈ brutal), so each facet
 * takes a `weight` (0..1) share of it: weight 1 = full doubling, 0 = untouched. This keeps the
 * harder game FAIR — e.g. ring density + contact damage stay at weight 0 so bullet gaps
 * (tests/fairness.test.js) and one-hit risk don't change. `mul<1` clamps to 1 (no easier-mode here).
 *
 * @param {number} hardnessMul config.DIFFICULTY.hardnessMul
 * @param {number} weight 0..1 share of the hardness this facet absorbs
 * @returns {number} the per-facet multiplier (>= 1)
 */
export function hardnessFacet(hardnessMul, weight) {
  const w = Math.min(1, Math.max(0, weight)); // clamp to the documented 0..1 share
  return 1 + (Math.max(1, hardnessMul) - 1) * w;
}

/**
 * The MARGINAL gain of the n-th stack of a diminishing-returns upgrade (PURE):
 *
 *     marginalBonus(n) = statBonus(n) - statBonus(n-1)
 *
 * The offer cards show this — "+12% damage" early, "+1.5%" deep into a run — so the player sees the
 * honest delta of THIS pick, not the running total. Shrinks toward 0 as the curve approaches its cap
 * (B9). n<=0 -> 0.
 *
 * @param {number} stacks the stack number being ADDED (1 = the first pick)
 * @param {number} maxBonus the curve ceiling (same as statBonus)
 * @param {number} half stacks to reach half of maxBonus (same as statBonus)
 * @returns {number} the bonus the n-th stack adds on top of the (n-1)-th
 */
export function marginalBonus(stacks, maxBonus, half) {
  if (stacks <= 0) return 0;
  return statBonus(stacks, maxBonus, half) - statBonus(stacks - 1, maxBonus, half);
}

/**
 * The bonus a SINGLE permanent (Resonance) level `n` contributes (PURE) — ADR-0031.
 * Unlike statBonus (asymptotic, capped), this is a flat step curve with periodic
 * BREAKPOINTS: the first level is a bigger taste, filler levels are small, and every
 * `every`-th level jumps back up. Deliberately never caps — repeat breakpoint tiers
 * (20, 30…) fall out of the same formula for free.
 *
 *   n === 1        -> cfg.first
 *   n % every === 0 -> cfg.breakpoint
 *   else            -> cfg.small
 *
 * @param {number} n the level being added (1-indexed; 1 = the first purchase)
 * @param {{first:number, small:number, breakpoint:number, every:number}} cfg
 * @returns {number} that level's own contribution (a fraction, e.g. 0.005 = +0.5%)
 */
export function metaLevelBonus(n, cfg) {
  if (n <= 0) return 0;
  if (n === 1) return cfg.first;
  if (n % cfg.every === 0) return cfg.breakpoint;
  return cfg.small;
}

/**
 * Cumulative permanent (Resonance) bonus at a given level (PURE) — Σ metaLevelBonus(1..level).
 * Slow and steep by design (Scott: perm upgrades must NOT fill in a few playthroughs) —
 * this is the total % baked into `baselineStacks()`, applied on TOP of (not mixed into)
 * the in-run diminishing-returns curve.
 *
 * @param {number} level how many levels of this node are purchased
 * @param {{first:number, small:number, breakpoint:number, every:number}} cfg
 * @returns {number} the total permanent bonus (a fraction, e.g. 0.023 = +2.3% at level 10)
 */
export function metaBreakpointBonus(level, cfg) {
  let total = 0;
  for (let n = 1; n <= level; n++) total += metaLevelBonus(n, cfg);
  return total;
}

/**
 * Echo cost to purchase permanent level `n` (PURE) — ADR-0031. Geometric growth per level
 * (steep on purpose: Scott doesn't want these fillable in a few playthroughs), with an extra
 * `breakpointMul` (e.g. 2x) crossed at breakpoint levels: "10 becomes a 1% perm upgrade with
 * twice the cost." The toll COMPOUNDS forward (level 11 stays 2x, level 20 becomes 4x, …) —
 * a one-time toll would let the very next level cost LESS than the breakpoint that preceded
 * it, which would read as a discount instead of a wall.
 *
 * @param {number} n the level being purchased (1-indexed; 1 = the first purchase)
 * @param {{base:number, growth:number, breakpointMul:number, every:number}} cfg
 * @returns {number} the Echo cost, rounded (Echoes are integer-only)
 */
export function metaLevelCost(n, cfg) {
  if (n <= 0) return Infinity;
  const geo = cfg.base * Math.pow(cfg.growth, n - 1);
  const toll = Math.pow(cfg.breakpointMul, Math.floor(n / cfg.every));
  return Math.round(geo * toll);
}

// (B9's allyShare lived here until CP-C: the AI Ally became the Demon companion, whose
// permanent-baseline inheritance is core/demonInherit.js — a different contract, not a share
// of IN-RUN bonuses. ADR-0042.)
