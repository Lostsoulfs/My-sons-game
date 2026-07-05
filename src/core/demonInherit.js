// =====================================================================
// demonInherit.js — the demon companion's stat inheritance (CP-C, ADR-0042).
//
// The demon makes NO picks and takes NOTHING from the run. It inherits a fixed
// SHARE of the player's PERMANENT (Resonance/Echoes) baseline only — so it grows
// when your long-term progression does, and only then. Pre-first-win the baseline
// is all-zero → this returns exact identity (a base-stats demon).
//
// Mirrors the permanent part of player._recomputeUpgrades:
//   damageMul   = 1 + bl.damage          → demon: 1 + share·bl.damage
//   fireRateMul = 1 − bl.fireRate        → demon: 1 − share·bl.fireRate (lower = faster)
//   speed       = base·(1 + bl.speed)    → demon: ×(1 + share·bl.speed)
//
// IMPORTANT: feed this the SAVE's raw baselineStacks(), not player._baseline —
// the player's copy has the Dad/Son ±trait merged in (game._makePlayer), and a
// character trait is NOT a permanent meta buff.
//
// Pure + THREE-free (Vitest in plain Node); no rng → seed-deterministic (ADR-0013).
// =====================================================================

/**
 * @param {{damage?: number, fireRate?: number, speed?: number}|null} baseline
 *   permanent Resonance baseline (core/saves.js baselineStacks) — all-zero pre-first-win
 * @param {number} share    fraction of the permanent bonus the demon receives (config.DEMON.inheritShare)
 * @param {number} rateFloor lowest fireRateMul the demon may reach (guards a runaway-negative config)
 * @returns {{damageMul: number, fireRateMul: number, speedMul: number}}
 */
export function demonInherit(baseline, share, rateFloor = 0.4) {
  const bl = baseline ?? {};
  const s = Math.max(0, share ?? 0);
  return {
    damageMul: 1 + s * Math.max(0, bl.damage ?? 0),
    fireRateMul: Math.max(rateFloor, 1 - s * Math.max(0, bl.fireRate ?? 0)),
    speedMul: 1 + s * Math.max(0, bl.speed ?? 0),
  };
}
