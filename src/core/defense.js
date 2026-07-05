// =====================================================================
// defense.js — PURE incoming-damage resolution for the player. No imports, no game state — just
// (dmg, state) -> outcome, so it's deterministic + unit-testable like weighted.js / scaling.js.
//
// CP4 (ADR-0037): the percentage damage-reduction SOAK (and its fractional CARRY accumulator) was
// CUT — incremental survivability flattened the danger. Defense is now ONE thing: the GUARD
// block-charge (rare = 1, ultra = 3). Each charge eats one WHOLE hit; when charges run out, the hit
// lands in full. All-or-nothing keeps the mechanic skill-legible (you either had a charge or you didn't).
// =====================================================================

/**
 * Resolve one incoming hit against the player's guard charges. PURE.
 *
 * A guard charge (if any) blocks the WHOLE hit first; otherwise the hit lands in full (whole hearts).
 * `heartsLost` is always a non-negative integer ≤ `dmg`, so it subtracts straight from a whole-heart pool.
 *
 * @param {number} dmg incoming damage in hearts (usually 1; a rocket can be more)
 * @param {{guardCharges?: number}} [state] guardCharges = block-N-hit charges left
 * @returns {{heartsLost: number, guardCharges: number, blocked: boolean}}
 *   blocked = true when a guard charge ate the hit (heartsLost 0).
 */
export function resolveIncoming(dmg, { guardCharges = 0 } = {}) {
  if (guardCharges > 0) {
    return { heartsLost: 0, guardCharges: guardCharges - 1, blocked: true };
  }
  const heartsLost = Math.max(0, Math.floor(dmg + 1e-9)); // whole hearts; epsilon kills float drift
  return { heartsLost, guardCharges, blocked: false };
}
