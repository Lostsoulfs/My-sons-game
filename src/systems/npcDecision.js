// =====================================================================
// npcDecision.js — what happens when you HELP or LEAVE a survivor (PURE).
//
// You walk up to a survivor and choose to help them or leave them. Seeded, so it's
// reproducible and testable.
//
// KARMA era (ADR-0045): the two choices are no longer symmetric coin flips.
//   • HELP is the RISKY GOOD DEED: the immediate outcome leans BAD (KARMA.helpGoodChance
//     < 0.5 — "it's a trap" is more likely now), but the deed earns +KARMA.helpGain either
//     way. You brave the danger to build your standing (→ better luck on the drop curve).
//   • LEAVE is SAFE but CORROSIVE: nothing happens to you right now, but abandoning them
//     costs −KARMA.leaveLoss. The safe path slowly darkens your luck.
// Each resolved outcome carries a `karma` delta the caller applies to the run.
// =====================================================================

import { PICKUPS, KARMA } from '../config.js';

// Good things that can happen.
// NOTE: the stat UPs add ONE upgrade stack and IGNORE magnitude since ADR-0022 (the
// diminishing-returns curve in config.UPGRADES sets the strength), so their magnitude
// is 0 here — not a live knob. Only HEAL/TAKE_DAMAGE/SPAWN_ENEMIES consume magnitude.
// HEAL reuses config.PICKUPS.healAmount so there's one source of truth (and the message
// can't drift from the value).
const GOOD_EFFECTS = [
  {
    effect: 'HEAL',
    magnitude: PICKUPS.healAmount,
    message: `They patch you up! +${PICKUPS.healAmount} hearts`,
  },
  { effect: 'FIRE_RATE_UP', magnitude: 0, message: 'They tune your gun! Faster shots' },
  { effect: 'DAMAGE_UP', magnitude: 0, message: 'They sharpen your aim! More damage' },
];

// Bad things that can happen.
const BAD_EFFECTS = [
  { effect: 'TAKE_DAMAGE', magnitude: 1, message: 'It was a trap! -1 heart' },
  { effect: 'SPAWN_ENEMIES', magnitude: 2, message: 'They lured monsters in!' },
];

/**
 * Resolve a survivor interaction. PURE — give it a seeded rng and a choice.
 *
 * HELP rolls the (now risk-leaning) outcome table and earns +KARMA.helpGain regardless of how it
 * turns out — the deed is what builds standing. LEAVE never rolls: it's safe, does nothing to you
 * right now, and costs −KARMA.leaveLoss. The `karma` delta is applied by the caller to the run.
 *
 * @param {{next:()=>number, chance:(p:number)=>boolean, pick:(a:any[])=>any}} rng
 * @param {'HELP'|'LEAVE'} choice
 * @returns {{good:boolean, effect:string, magnitude:number, message:string, choice:string, karma:number}}
 */
export function resolveDecision(rng, choice) {
  if (choice === 'LEAVE') {
    // safe by definition — no combat roll; the only consequence is the karma cost
    return {
      good: false,
      effect: 'NONE',
      magnitude: 0,
      message: 'You leave them to their fate.',
      choice,
      karma: -KARMA.leaveLoss,
    };
  }
  const good = rng.chance(KARMA.helpGoodChance); // helping leans BAD now — that's the risk
  const picked = rng.pick(good ? GOOD_EFFECTS : BAD_EFFECTS);
  return {
    good,
    effect: picked.effect,
    magnitude: picked.magnitude,
    message: picked.message,
    choice,
    karma: KARMA.helpGain, // +karma whether it went well or was a trap — you tried
  };
}

// Exported for tests/tuning visibility.
export const _internals = { GOOD_EFFECTS, BAD_EFFECTS };
