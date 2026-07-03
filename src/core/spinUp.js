// =====================================================================
// spinUp.js — the minigun's "spin-up" cadence (PURE, unit-testable). While the
// trigger is held the fire cooldown ramps from a slow `startCd` down to a fast
// `endCd` over `rampTime` seconds, so the barrel has to wind up before it hoses.
// =====================================================================

/**
 * @param {number} held seconds the trigger has been held (firing)
 * @param {{startCd:number, endCd:number, rampTime:number}} cfg
 * @returns {number} the effective per-shot cooldown for this instant
 */
export function spinUpCooldown(held, cfg) {
  const { startCd, endCd, rampTime } = cfg;
  const t = rampTime > 0 ? Math.max(0, Math.min(1, held / rampTime)) : 1;
  return startCd + (endCd - startCd) * t;
}
