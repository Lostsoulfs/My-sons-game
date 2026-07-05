// =====================================================================
// heat.js — energy overheat gauge (CP2, ADR-0035-era). PURE, no THREE. Energy
// weapons build heat per shot and bleed it continuously; at full heat they OVERHEAT
// (a forced cooldown) until the gauge bleeds back below `resetHeat`. Feathering the
// trigger never overheats — only sustained hosing does (the skill seam). The overheat
// downtime is the weapon's duty-cycle downside — scored in core/powerScore (CP3).
//
// State shape: { heat:0..1, overheated:bool }. Pure functions (return NEW state),
// driven by the fixed-step dt (never wall-clock) so it stays seed-deterministic.
// =====================================================================

/** A cool, ready gauge. */
export function initHeat() {
  return { heat: 0, overheated: false };
}

/**
 * Bleed heat by `coolRatePerSec·dt` every frame; release the overheat latch once the
 * gauge drops back to/under `resetHeat`. Pure → returns a NEW state.
 * @param {{heat:number,overheated:boolean}} state
 * @param {number} dt seconds
 * @param {{coolRatePerSec:number,resetHeat:number}} cfg
 */
export function coolHeat(state, dt, cfg) {
  const heat = Math.max(0, state.heat - cfg.coolRatePerSec * dt);
  const overheated = state.overheated && heat > cfg.resetHeat;
  return { heat, overheated };
}

/**
 * Add one shot's heat; LATCH overheated at full (1). Pure → returns a NEW state.
 * @param {{heat:number,overheated:boolean}} state
 * @param {{heatPerShot:number}} cfg
 */
export function addHeat(state, cfg) {
  const heat = Math.min(1, state.heat + cfg.heatPerShot);
  const overheated = state.overheated || heat >= 1;
  return { heat, overheated };
}

/** True when the weapon can fire right now: not overheated. */
export function canFireHeat(state) {
  return !state.overheated;
}
