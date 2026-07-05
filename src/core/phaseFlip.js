// =====================================================================
// core/phaseFlip.js — pure HP-breakpoint crossing detection (no THREE, no game state).
//
// A boss can declare HP-fraction breakpoints (config.BOSS[type].phaseFlips, e.g.
// [0.5, 0.25]). As it takes damage and its HP fraction falls PAST a breakpoint, the
// Boss shell "flips" a phase — a one-time cinematic beat that escalates its pattern
// set (see boss.js `_checkPhaseFlips`). This helper is the deterministic core of that:
// given the current fraction and how many flips already fired, it returns the indices
// of the breakpoints newly crossed THIS tick (usually one; two if a big hit skips a
// band). Keeping it pure means it's unit-testable and ADR-0013 seed-deterministic.
//
// CONTRACT: `breakpoints` must be DESCENDING (1 → 0), e.g. [0.5, 0.25]. We stop at the
// first not-yet-reached breakpoint, so an out-of-order list would under-report — the
// config test guards the ordering.
// =====================================================================

/**
 * @param {number} frac        current HP fraction (hp / maxHp), 0..1
 * @param {number[]} breakpoints DESCENDING HP fractions that trigger a flip
 * @param {number} passed       how many flips have already fired (0 at spawn)
 * @returns {number[]} indices (>= `passed`) of breakpoints crossed this tick, in order
 */
export function pendingFlips(frac, breakpoints, passed = 0) {
  if (!Array.isArray(breakpoints)) return [];
  const out = [];
  for (let i = passed; i < breakpoints.length; i++) {
    if (frac <= breakpoints[i]) out.push(i);
    else break; // descending list: once we're above a breakpoint, all later ones are too
  }
  return out;
}
