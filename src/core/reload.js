// =====================================================================
// reload.js — ballistic magazine + reload (CP2, ADR-0035-era). PURE, no THREE:
// a tiny state machine the Player ticks each frame. Ballistic guns fire a clip of
// `clipSize` rounds, then sit out a `reloadTime` downtime before the clip refills.
// That downtime IS the weapon's downside (its duty cycle) — scored in core/powerScore (CP3).
//
// State shape: { ammo:int, reloading:bool, reloadT:seconds-left }. All functions are
// pure (return a NEW state), so this unit-tests without a game/DOM and stays
// seed-deterministic (driven by the fixed-step dt, never wall-clock).
// =====================================================================

/**
 * A fresh, full magazine.
 * @param {{clipSize:number}} cfg
 */
export function initClip(cfg) {
  return { ammo: cfg.clipSize, reloading: false, reloadT: 0 };
}

/**
 * Advance a reload-in-progress by `dt`; refill the clip the instant it completes.
 * A no-op (returns the same state) when not reloading.
 * @param {{ammo:number,reloading:boolean,reloadT:number}} state
 * @param {number} dt seconds
 * @param {{clipSize:number}} cfg
 */
export function tickReload(state, dt, cfg) {
  if (!state.reloading) return state;
  const reloadT = state.reloadT - dt;
  if (reloadT <= 0) return { ammo: cfg.clipSize, reloading: false, reloadT: 0 };
  return { ammo: state.ammo, reloading: true, reloadT };
}

/**
 * Consume one round. If that empties the clip, START the reload (downtime = reloadTime).
 * @param {{ammo:number,reloading:boolean,reloadT:number}} state
 * @param {{clipSize:number,reloadTime:number}} cfg
 */
export function fireRound(state, cfg) {
  const ammo = state.ammo - 1;
  if (ammo <= 0) return { ammo: 0, reloading: true, reloadT: cfg.reloadTime };
  return { ammo, reloading: state.reloading, reloadT: state.reloadT };
}

/** True when the weapon can fire right now: rounds left AND not mid-reload. */
export function canFireClip(state) {
  return !state.reloading && state.ammo > 0;
}
