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
  const total = Math.max(0, inRunLuck) + Math.max(0, permLuck);
  return statBonus(total, LUCK.max, LUCK.half);
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
  const offset = Math.max(0, curse) * LUCK.curseWeight * (1 - LUCK.curseLuckDamp * (lb / LUCK.max));
  const eff = lb - offset;
  return clamp(1 + eff, LUCK.goodMulMin, 1 + LUCK.max);
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}
