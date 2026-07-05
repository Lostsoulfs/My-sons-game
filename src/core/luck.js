// =====================================================================
// luck.js — PURE luck/curse → offer-tier-weight multiplier (CP4, ADR-0037). No THREE, no game state.
//
// Luck uses the D2 "magic find" shape (core/scaling.js statBonus): strong early value that flattens
// toward an asymptote (config.LUCK.max) — so luck always helps but NEVER guarantees a rare+. Two
// dials feed one curve: in-run stacks (LUCK_UP picks) + permanent Fortune (META_UPGRADES → baseline).
//
// CURSE is negative luck, but only PARTIALLY offset by luck, on a curve: a point of curse costs
// `curseWeight` of the luck bonus, damped by how much luck you have — so even at high luck a point of
// curse still bites (~−25% of the good-drop bonus at the ceiling). The curse SOURCE (ambush/elite
// spawns) is Phase 6b; this module is the MATH, driven by a `curse` number that defaults to 0.
//
// The result multiplies ONLY the rare+ tier weights on the offer roll (commons are unaffected), so
// luck reshapes the tier distribution up and curse reshapes it down — see core/offers.js rollTier.
// =====================================================================

import { LUCK } from '../config.js';
import { statBonus } from './scaling.js';

/**
 * The positive luck bonus (0 .. LUCK.max) from combined in-run + permanent luck, on the D2 curve.
 * Both dials are summed into one "stack" total, then run through the diminishing-returns curve.
 * PURE. Negative inputs clamp to 0.
 */
export function luckBonus(inRunLuck = 0, permLuck = 0) {
  // clamp STRICTLY below the asymptote: at absurd inputs float64 rounds total/(total+half) to exactly
  // 1 (or the summed total overflows to Infinity → statBonus NaN), either of which would let the bonus
  // reach/guarantee LUCK.max. The ε cap keeps the "never guarantees" contract literally true and is a
  // no-op for every reachable input (combined stacks ≲ 14).
  const cap = LUCK.max * (1 - Number.EPSILON);
  const b = statBonus(pos(inRunLuck) + pos(permLuck), LUCK.max, LUCK.half);
  return Number.isFinite(b) ? Math.min(b, cap) : cap;
}

/**
 * The rare+ tier-weight multiplier for an offer roll given luck + curse. PURE + deterministic.
 *   1.0  = neutral (no luck, no curse)
 *   >1   = luck biases rare+ up (asymptotes at 1 + LUCK.max — never a guarantee)
 *   <1   = curse thins rare+ down (floored at LUCK.goodMulMin — drops thin out, never vanish)
 *
 * Curse offset is damped by luck: `offset = curse · curseWeight · (1 − curseLuckDamp · luckBonus/max)`,
 * so more luck softens each curse point but never fully cancels it (the design target: ≈−25% of the
 * good-drop bonus per curse point even at the luck ceiling).
 *
 * @param {{inRunLuck?: number, permLuck?: number, curse?: number}} [ctx]
 * @returns {number} multiplier applied to rare+ tier weights
 */
export function goodDropMultiplier({ inRunLuck = 0, permLuck = 0, curse = 0 } = {}) {
  const lb = luckBonus(inRunLuck, permLuck);
  const offset = pos(curse) * LUCK.curseWeight * (1 - LUCK.curseLuckDamp * (lb / LUCK.max));
  const m = clamp(1 + (lb - offset), LUCK.goodMulMin, 1 + LUCK.max);
  // final belt: a non-finite dial (a bad Phase-6b curse source) must fall back to NEUTRAL, never a
  // silent all-ultra roll (a NaN weight bypasses weightedChoice's fallback — see core/weighted.js).
  return Number.isFinite(m) ? m : 1;
}

/** a finite, non-negative number (NaN / ±Infinity / undefined → 0) — sanitises the dials at the edge. */
function pos(x) {
  return Number.isFinite(x) && x > 0 ? x : 0;
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}
