// =====================================================================
// bossPlacement.js — PURE boss spawn placement (ADR-0033). No THREE, no game
// state — just (entrySide, arena, opts) -> where the boss(es) stand, so it's
// deterministic + unit-testable.
//
// The boss spawns on the wall OPPOSITE the player's entry so you always cross
// the room to meet it (the "arrival" — no more walking in on top of the boss).
// This is the sign-for-sign mirror of game.js's ENTRY table: enter from the
// south door → boss on the north wall (the classic framing, which is also the
// floor-start default when entrySide is null).
// =====================================================================

import { OPPOSITE } from './floorplan.js';

// each boss WALL → the wall-centre spot (inset in from the wall) + the free axis
// the duo spreads along (perpendicular to the wall).
const WALL = {
  N: (hw, hd, inset) => ({ x: 0, z: -hd + inset, axis: 'x' }),
  S: (hw, hd, inset) => ({ x: 0, z: hd - inset, axis: 'x' }),
  E: (hw, hd, inset) => ({ x: hw - inset, z: 0, axis: 'z' }),
  W: (hw, hd, inset) => ({ x: -hw + inset, z: 0, axis: 'z' }),
};

/**
 * Where a boss (or a duo) stands, given the side the player entered through.
 * @param {'N'|'S'|'E'|'W'|null} entrySide the door this room was entered by (null = floor start → south)
 * @param {{width:number, depth:number}} arena ARENA
 * @param {{inset?:number, spread?:number, count?:number}} opts
 *   inset = distance off the wall; spread = duo half-separation; count = 1 (single) or 2 (duo)
 * @returns {{wall:'N'|'S'|'E'|'W', spreadAxis:'x'|'z', spots:Array<{x:number,z:number,facing:number}>}}
 *   `facing` is a rotation.y that points the boss toward the arena centre (game dir = (sin,cos)).
 */
export function bossSpawnForEntry(entrySide, arena, opts = {}) {
  const inset = opts.inset ?? 4;
  const spread = opts.spread ?? 5;
  const count = opts.count ?? 1;
  const hw = arena.width / 2;
  const hd = arena.depth / 2;
  const wall = OPPOSITE[entrySide] ?? 'N'; // null/undefined entry (floor start = south) → north wall
  const base = WALL[wall](hw, hd, inset);
  const spots = [];
  for (let i = 0; i < count; i++) {
    // single boss centres on the wall; a duo's two beasts spread ∓ along the free axis
    const off = count < 2 ? 0 : i === 0 ? -spread : spread;
    const x = base.x + (base.axis === 'x' ? off : 0);
    const z = base.z + (base.axis === 'z' ? off : 0);
    spots.push({ x, z, facing: Math.atan2(-x, -z) }); // atan2(-x,-z) faces the centre
  }
  return { wall, spreadAxis: base.axis, spots };
}
