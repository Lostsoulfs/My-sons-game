// =====================================================================
// powerScore.js — the weapon POWER-BUDGET model (CP3, ADR-0036). PURE, no THREE. One scalar for a
// weapon's true combat value, so rarity can be a strict pyramid of power instead of noise.
//
//   PowerScore = burstDPS · dutyCycle · accuracy(spread,pellets) · range(bulletSpeed) · scenario(flags)
//
// dutyCycle (core/duty.js) folds in the reload/overheat downside — the ONLY subtracted term, so a
// high-burst gun (Browning) pays its raw DPS back in reload time and lands in its band. scenario
// blends single-target and a small crowd so pierce/AoE archetypes score on what they hit.
// All knobs in config.POWER_SCORE; tier bands in config.TIER_BANDS.
// =====================================================================

import { POWER_SCORE, TIER_BANDS } from '../config.js';
import { weaponDuty } from './duty.js';

/** effective cadence for scoring: spun-up guns fire at their wound-up (end) cadence; a full charge
 *  takes its whole charge time PLUS the cooldown to land, not the base cooldown. */
export function effectiveCooldown(w) {
  if (w.spinUp) return w.spinUp.endCd;
  if (w.charge) return (w.charge.maxTime ?? 0.8) + (w.cooldown ?? 0.12);
  return w.cooldown ?? 0.3;
}

/** raw single-target burst DPS at the effective cadence (damageMul held at 1 for scoring). */
export function burstDPS(w) {
  // full charge takes maxTime to build + the cooldown between shots — not fired every cooldown
  if (w.charge) return w.charge.maxDamage / ((w.charge.maxTime ?? 0.8) + (w.cooldown ?? 0.12));
  // effectiveCooldown gives a spun-up gun (minigun) its wound-up cadence, not its slow start
  return ((w.damage ?? 1) * (w.pellets ?? 1)) / effectiveCooldown(w);
}

/** single-pellet wide-spray guns lose accuracy at range; multi-pellet spread is coverage (neutral). */
export function accuracy(spreadDeg, pellets) {
  if ((pellets ?? 1) > 1) return 1;
  const s = spreadDeg ?? 0;
  return 1 - (1 - POWER_SCORE.ACC_FLOOR) * (s / (s + POWER_SCORE.ACC_HALF));
}

/** faster bullets reach more, up to an asymptote (a 44-unit railgun bolt > a 16-unit lob). */
export function rangeFactor(bulletSpeed) {
  const bs = bulletSpeed ?? 24;
  return POWER_SCORE.RANGE_BASE + POWER_SCORE.RANGE_GAIN * (bs / (bs + POWER_SCORE.REF_SPEED));
}

/** per-shot damage that lands (a full charge = maxDamage; else damage × pellets). */
export function perShotDamage(w) {
  if (w.charge) return w.charge.maxDamage ?? 1;
  return (w.damage ?? 1) * (w.pellets ?? 1);
}

/**
 * Alpha-strike credit: an AoE weapon that deletes a whole cluster in ONE shot (Davy Crockett,
 * plasma bomb) is worth more than its sustained DPS says — the sustained model structurally
 * undervalues burst room-clear. Only EXPLOSIVE weapons earn it (a pierce line is already credited
 * via the crowd scenario), and the blast REACH is uncapped by CROWD_N so a room-nuke (r8) dwarfs a
 * small blast (r3). Credit = per-shot damage × reach over a reference; below the reference → no
 * credit (factor 1). Capped so it lifts nukes without distorting the roster.
 */
export function alphaFactor(w) {
  const P = POWER_SCORE;
  if (!(w.explosive && w.explodeRadius)) return 1;
  const reach = (Math.PI * w.explodeRadius * w.explodeRadius) / P.AOE_AREA_DIV;
  const punch = (perShotDamage(w) * reach) / P.ALPHA_REF - 1;
  return 1 + P.ALPHA_GAIN * Math.max(0, Math.min(punch, P.ALPHA_CAP));
}

/** effective targets hit (pierce / AoE / homing), capped at CROWD_N. */
export function targetCount(w) {
  const P = POWER_SCORE;
  let t = 1;
  if (w.pierce) t = Math.max(t, 1 + Math.min(w.pierce, 8) * P.PIERCE_HIT);
  if (w.charge?.pierce) t = Math.max(t, 1 + Math.min(w.charge.pierce, 8) * P.PIERCE_HIT);
  if (w.explosive && w.explodeRadius) {
    t = Math.max(t, 1 + (Math.PI * w.explodeRadius * w.explodeRadius) / P.AOE_AREA_DIV);
  }
  if (w.homing) t = Math.max(t, P.HOMING_TARGETS);
  return Math.min(t, P.CROWD_N);
}

/** the single power scalar. `limit` = config.WEAPON_LIMITS[key] (or undefined for an exempt weapon). */
export function powerScore(w, limit) {
  const duty = weaponDuty(effectiveCooldown(w), limit);
  const scenario = 0.5 * 1 + 0.5 * targetCount(w); // blend single-target + small crowd
  return (
    burstDPS(w) *
    duty *
    accuracy(w.spreadDeg, w.pellets) *
    rangeFactor(w.bulletSpeed) *
    scenario *
    alphaFactor(w)
  );
}

/** the tier whose band contains `score` (bands are [lo, hi); the top band's hi is Infinity so a
 *  legitimately huge finite score matches it directly). A score that matches NO band — negative,
 *  NaN, or ±Infinity from a broken factor — clamps to the BOTTOM tier: failing SAFE (least
 *  permissive) makes a bad score surface as a failed roster assertion instead of a silent 'ultra'. */
export function tierForScore(score) {
  const bottomTier = Object.keys(TIER_BANDS)[0]; // TIER_BANDS is authored ascending (common → ultra)
  if (!Number.isFinite(score)) return bottomTier;
  for (const [tier, [lo, hi]] of Object.entries(TIER_BANDS)) {
    if (score >= lo && score < hi) return tier;
  }
  return bottomTier; // below the lowest band → clamp low, never up to the open top band
}
