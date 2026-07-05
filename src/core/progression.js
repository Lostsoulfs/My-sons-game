// =====================================================================
// progression.js — pure helpers for "where am I in the run?" (no imports
// except config). Since ADR-0032 each floor is a CONNECTED map (a room graph
// from core/floorplan.js) — room-level facts (depth, isBoss) live on the graph
// node; this file keeps the FLOOR-level identity: definition, difficulty,
// boss-count unlocks, and the death/checkpoint resolver.
// =====================================================================

import { PROGRESSION, CAPS, DIFFICULTY, MODES } from '../config.js';
import { floorScale } from './scaling.js';

/**
 * How many weapon slots are unlocked after beating `bossesBeaten` bosses. PURE.
 * Starts at 1, +1 at each threshold in CAPS.slotUnlockBosses, capped at
 * CAPS.maxWeaponSlots. (the project owner's cadence: unlock at boss 2, 10, 20; max 3.)
 */
export function weaponSlotsForBosses(bossesBeaten) {
  const unlocked = CAPS.slotUnlockBosses.filter((n) => bossesBeaten >= n).length;
  return Math.min(CAPS.maxWeaponSlots, 1 + unlocked);
}

export function floorCount() {
  return PROGRESSION.floors.length;
}

/**
 * CP-E (ADR-0043): resolve the REQUESTED run mode against the save. Endless is a
 * post-first-win reward — pre-beat (or on junk input) it always falls back to story,
 * so the gate holds even if a caller (debug console, hand-edited UI) asks directly.
 * @param {string} requested 'story' | 'endless' (anything else → 'story')
 * @param {boolean} gameBeaten save.gameBeaten
 * @returns {'story'|'endless'}
 */
export function resolveMode(requested, gameBeaten) {
  return requested === 'endless' && gameBeaten ? 'endless' : 'story';
}

/** the floor definition for a floor index — story CLAMPS to the last floor; endless CYCLES
 *  the whole roster (bosses rotate every loop instead of Enforcer-forever). */
export function floorDef(floorIndex, mode = 'story') {
  const f = PROGRESSION.floors;
  if (mode === 'endless') return f[floorIndex % f.length];
  return f[Math.min(floorIndex, f.length - 1)];
}

/**
 * Describe a FLOOR (ADR-0032 — room-level facts come from the floorplan node).
 * CP-E (ADR-0043): in ENDLESS the run never has a last floor (no win exit — the loop is the
 * mode), defs cycle, and past the story floors the diff takes an EXTRA per-floor ramp
 * (MODES.endless.rampMul) on top of floorScale's own growth. Story is bit-identical to before.
 * @param {number} floorIndex 0-based floor
 * @param {'story'|'endless'} mode
 * @returns {{def:object, diff:number, isLastFloor:boolean}}
 */
export function floorMeta(floorIndex, mode = 'story') {
  const def = floorDef(floorIndex, mode);
  // difficulty is the DIFFICULTY curve (one knob for the whole run), times an
  // optional per-floor `diffMul` spike. Drives boss HP / ring density / enemy count.
  let diff = floorScale(floorIndex, DIFFICULTY) * (def.diffMul ?? 1);
  if (mode === 'endless') {
    const past = floorIndex - (floorCount() - 1);
    if (past > 0) diff *= Math.pow(MODES.endless.rampMul, past);
    return { def, diff, isLastFloor: false };
  }
  return { def, diff, isLastFloor: floorIndex >= floorCount() - 1 };
}

/**
 * Spider boss P3: how many baby spiders to keep alive, gated by the boss's HP.
 * PURE. From the co-designer's card: none above 50% HP, keep 2–3 under 50%, keep 3 under 25%.
 * `min` = spawn more when fewer than this are alive; `max` = top up to this (hard cap).
 * @param {number} hpFrac boss hp / maxHp (0..1)
 * @returns {{min:number, max:number}}
 */
export function spiderlingTarget(hpFrac) {
  if (hpFrac > 0.5) return { min: 0, max: 0 };
  if (hpFrac > 0.25) return { min: 2, max: 3 };
  return { min: 3, max: 3 };
}

/**
 * Mushroom boss P4: how many puffball minions to keep alive, gated by HP. PURE.
 * Same shape/cadence as spiderlingTarget (none >50%, 2–3 under 50%, 3 under 25%).
 * @param {number} hpFrac boss hp / maxHp (0..1)
 * @returns {{min:number, max:number}}
 */
export function puffballTarget(hpFrac) {
  if (hpFrac > 0.5) return { min: 0, max: 0 };
  if (hpFrac > 0.25) return { min: 2, max: 3 };
  return { min: 3, max: 3 };
}

/**
 * Skeleton boss P4: how many bonelings to keep alive, gated by HP. PURE.
 * The skeleton is the "summoner", so it raises a bigger wave than the spider/
 * mushroom as it weakens: none above 50%, 2–3 under 50%, up to 4 under 25%.
 * @param {number} hpFrac boss hp / maxHp (0..1)
 * @returns {{min:number, max:number}}
 */
export function skeletonWaveTarget(hpFrac) {
  if (hpFrac > 0.5) return { min: 0, max: 0 };
  if (hpFrac > 0.25) return { min: 2, max: 3 };
  return { min: 3, max: 4 };
}

/**
 * Human boss P3: how many armed survivors he rallies, gated by HP. PURE.
 * Fewer than the other waves because they're tougher (minionHp 2): none above
 * 50% HP, 1–2 under 50%, 2–3 under 25%.
 * @param {number} hpFrac boss hp / maxHp (0..1)
 * @returns {{min:number, max:number}}
 */
export function humanRallyTarget(hpFrac) {
  if (hpFrac > 0.5) return { min: 0, max: 0 };
  if (hpFrac > 0.25) return { min: 1, max: 2 };
  return { min: 2, max: 3 };
}

/**
 * Decide what happens when the player dies. PURE.
 * Lose a life; if any remain, respawn at the checkpoint FLOOR's start room
 * (ADR-0032: checkpoints are floors — the respawned floor regenerates fresh,
 * so a death costs the explored map); otherwise it's game over (which the
 * caller turns into a full restart).
 * @param {number} lives lives BEFORE this death
 * @param {number} checkpointFloor floor index to respawn at
 * @returns {{lives:number, action:'RESPAWN'|'GAMEOVER', floor:number}}
 */
export function resolveDeath(lives, checkpointFloor) {
  const remaining = lives - 1;
  if (remaining <= 0) return { lives: 0, action: 'GAMEOVER', floor: 0 };
  return { lives: remaining, action: 'RESPAWN', floor: checkpointFloor };
}
