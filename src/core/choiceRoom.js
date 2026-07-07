// =====================================================================
// choiceRoom.js — PURE rolls for the CHOICE room (ADR-0044). No THREE, no game state.
//
// The floor's breather dead-end (the old interim heal room) now holds a handful of
// survivors, each carrying ONE reward — walk up to one and choose them; the rest
// slip away. This module rolls WHO shows up (seeded, no duplicates, ring positions)
// and the gunsmith's weapon (tier rides the same luck⊖curse curve as offers).
//
// Determinism split (ADR-0013/0032): the survivor SET + positions come from the
// node's layoutSeed (path-independent — leave and return, the same trio waits).
// Pick-time rolls (gunsmith tier, tinkerer stat, stranger outcome) consume the RUN
// rng at the moment you commit, exactly like the help/leave survivor gamble.
// =====================================================================

import { CHOICE_ROOM, OFFERS } from '../config.js';
import { TIERS, itemsByTier } from './items.js';
import { weightedChoice } from './weighted.js';
import { goodDropMultiplier } from './luck.js';

/**
 * Roll the room's survivors: a weighted, no-repeat draw from CHOICE_ROOM.pool, each
 * placed on a seeded ring around the room centre (evenly spaced angles + jittered
 * radius, so they never stack). The scavenger (Echoes) only joins the pool once the
 * game is beaten — saves.addEchoes() no-ops pre-win, and a reward that silently does
 * nothing is worse than no reward.
 *
 * @param {{next:()=>number, int:(n:number)=>number}} rng the NODE's layout rng
 * @param {{gameBeaten?: boolean, count?: number, pool?: object}} [opts]
 * @returns {Array<{kind:string, name:string, color:number, x:number, z:number}>}
 */
export function rollChoiceSurvivors(rng, opts = {}) {
  const pool = opts.pool ?? CHOICE_ROOM.pool;
  const kinds = Object.keys(pool).filter((k) => opts.gameBeaten || !pool[k].echoes);
  const count = Math.min(opts.count ?? CHOICE_ROOM.count, kinds.length);

  const drawn = [];
  const remaining = kinds.slice();
  for (let i = 0; i < count; i++) {
    const entries = remaining.map((k) => ({ value: k, weight: pool[k].weight ?? 1 }));
    const kind = weightedChoice(rng, entries);
    drawn.push(kind);
    remaining.splice(remaining.indexOf(kind), 1);
  }

  // ring placement: one seeded base angle, then even spacing — guaranteed separation
  const base = rng.next() * Math.PI * 2;
  const { min, max } = CHOICE_ROOM.ring;
  return drawn.map((kind, i) => {
    const a = base + (i / drawn.length) * Math.PI * 2;
    const r = min + rng.next() * (max - min);
    return {
      kind,
      name: pool[kind].name,
      color: pool[kind].color,
      x: Math.cos(a) * r,
      z: Math.sin(a) * r,
    };
  });
}

/**
 * The gunsmith's gun: roll a TIER through the same weights + luck⊖curse multiplier
 * the offer economy uses (rare+ ×goodMul, commons ×1 — biases, never guarantees),
 * then a weapon within it (owned guns down-weighted so he rarely hands you your own).
 * Ultra weapons stay in at their sliver of a weight — the gunsmith can surprise you.
 *
 * @param {{next:()=>number, int:(n:number)=>number}} rng the RUN rng (pick-time seam)
 * @param {{owned?: string[], luck?: number, permLuck?: number, curse?: number, bonusLuck?: number}} [ctx]
 * @returns {{id:string, name:string, tier:string}} a weapon item from the registry
 */
export function rollGunsmithWeapon(rng, ctx = {}) {
  const luck = Math.max(0, Math.min(ctx.luck ?? 0, OFFERS.luck.maxStacks)); // same clamp as offers
  const goodMul = goodDropMultiplier({
    inRunLuck: luck,
    permLuck: ctx.permLuck ?? 0,
    curse: ctx.curse ?? 0,
    bonusLuck: ctx.bonusLuck ?? 0, // ADR-0045: positive karma lifts the gunsmith's tier too
  });

  const gunsIn = (t) => (itemsByTier[t] ?? []).filter((it) => it.category === 'weapon');
  const tierEntries = TIERS.filter((t) => gunsIn(t).length > 0).map((t) => ({
    value: t,
    weight: (OFFERS.tierWeights[t] ?? 0) * (TIERS.indexOf(t) >= 1 ? goodMul : 1),
  }));
  const tier = weightedChoice(rng, tierEntries);

  const owned = new Set(ctx.owned ?? []);
  const gunEntries = gunsIn(tier).map((it) => ({
    value: it,
    weight: owned.has(it.id) ? OFFERS.ownedWeaponDecay : 1,
  }));
  return weightedChoice(rng, gunEntries);
}
