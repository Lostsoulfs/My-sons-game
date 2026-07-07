// =====================================================================
// karma.js — PURE. The signed morality dial → the drop curve's inputs (ADR-0045). No THREE, no state.
//
// Karma starts at 0 each run and moves on moral choices (help a survivor: +, leave one: −; later,
// dosing Echo for power: −). It feeds the SAME tested curve as luck/curse (core/luck.js): positive
// karma becomes BONUS LUCK (rides the D2 asymptote — biases rare+ up, never guarantees), negative
// karma becomes CURSE (the tested downward pressure, floored). Only ever one side at a time.
//
// This module is deliberately tiny: it just converts a signed integer into { bonusLuck, curse } and
// clamps the raw value. The heavy lifting (the actual multiplier) stays in core/luck.js, untouched.
// =====================================================================

import { KARMA } from '../config.js';

/** Clamp a raw karma value into the configured ±range (non-finite → 0). PURE. */
export function clampKarma(karma) {
  const k = Number.isFinite(karma) ? karma : 0;
  return Math.max(-KARMA.max, Math.min(KARMA.max, k));
}

/**
 * Split signed run karma into the two drop-curve inputs (core/luck.js goodDropMultiplier). PURE.
 * Positive → { bonusLuck } (added to the luck total, same asymptotic curve); negative → { curse }.
 * The value is clamped first, so a caller can't overshoot the intended economy swing.
 * @param {number} karma signed run karma
 * @param {{luckPerPoint:number, cursePerPoint:number}} [cfg]
 * @returns {{bonusLuck:number, curse:number}} exactly one is nonzero (both 0 at karma 0)
 */
export function karmaDropInputs(karma = 0, cfg = KARMA) {
  const k = clampKarma(karma);
  if (k >= 0) return { bonusLuck: k * cfg.luckPerPoint, curse: 0 };
  return { bonusLuck: 0, curse: -k * cfg.cursePerPoint };
}
