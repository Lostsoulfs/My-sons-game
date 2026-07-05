// =====================================================================
// duty.js — the DUTY CYCLE of a weapon (CP3, ADR-0036): the fraction of time it can actually
// fire, vs its reload/overheat downtime. PURE, no THREE. This is the single "downside" term in
// the power score (core/powerScore.js): a high-burst gun pays its power back in downtime, which
// is exactly what lets rarity ≈ power. Derived from the same config.WEAPON_LIMITS the live
// mechanic (core/reload.js / core/heat.js) uses, so the number the model scores == what you feel.
// =====================================================================

/** Ballistic: fire `clipSize` rounds at `cooldown` each, then sit out `reloadTime`. */
export function dutyBallistic(clipSize, cooldown, reloadTime) {
  const active = clipSize * cooldown;
  const total = active + reloadTime;
  return total > 0 ? active / total : 1;
}

/**
 * Energy: sustained hosing at `cooldown`. Net heat per shot = heatPerShot − coolRatePerSec·cooldown.
 * If ≤ 0 the gun cools as fast as it heats → never overheats → duty 1. Otherwise it fires
 * `1/net` shots before overheating, then a forced `(1−resetHeat)/coolRatePerSec` downtime.
 */
export function dutyEnergy(cooldown, { heatPerShot, coolRatePerSec, resetHeat }) {
  const net = heatPerShot - coolRatePerSec * cooldown;
  if (net <= 0) return 1; // feathering-proof: it can hose forever
  const shots = 1 / net;
  const active = shots * cooldown;
  const downtime = (1 - resetHeat) / coolRatePerSec;
  const total = active + downtime;
  return total > 0 ? active / total : 1;
}

/**
 * Duty for a weapon given its effective `cooldown` and its config.WEAPON_LIMITS entry.
 * Returns 1 for a limiter-less weapon (e.g. the orbital — a passive contact weapon).
 */
export function weaponDuty(cooldown, limit) {
  if (limit?.reload) return dutyBallistic(limit.reload.clipSize, cooldown, limit.reload.reloadTime);
  if (limit?.heat) return dutyEnergy(cooldown, limit.heat);
  return 1;
}
