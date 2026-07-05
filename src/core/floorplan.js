// =====================================================================
// floorplan.js — PURE connected-floor generation (ADR-0032). No THREE, no game
// state — just (rng, opts) -> a room graph, so it's deterministic + unit-testable.
//
// The Isaac recipe (docs/research/2026-07-03-roguelite-economy.md §2), battle-
// tested and deliberately simple:
//   1. BFS-expand rooms from a start cell on a sparse grid.
//   2. REJECT a candidate cell if it would touch 2+ already-filled cells
//      (keeps the map a TREE — naturally sparse, fully backtrackable), or on a
//      coin flip (rejectChance) — that's where the organic shape comes from.
//   3. Collect DEAD ENDS (exactly one neighbour). The BOSS takes the farthest
//      dead end from the start (the journey); other dead ends host special
//      rooms (v1: one HEAL room; the type field is the seam for Phase 6b's
//      shop / mini-boss / curse rooms — contents are a separate layer).
//
// Two-layer split on purpose: this file owns the floorPLAN (the graph); room
// CONTENTS stay in systems/spawner.js keyed by { floor, depth, type }.
// =====================================================================

// grid directions; N is "up" (y-1). OPPOSITE pairs door the two sides of a wall.
export const DIRS = ['N', 'S', 'E', 'W'];
export const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' };
const DELTA = { N: { x: 0, y: -1 }, S: { x: 0, y: 1 }, E: { x: 1, y: 0 }, W: { x: -1, y: 0 } };

const key = (x, y) => `${x},${y}`;

/** filled-neighbour count for a candidate cell (the 2+ reject that keeps the map a tree). */
function filledNeighbours(cells, x, y) {
  let n = 0;
  for (const d of DIRS) if (cells.has(key(x + DELTA[d].x, y + DELTA[d].y))) n++;
  return n;
}

/** one BFS-expansion attempt; returns a Map cellKey -> {x,y} of size roomCount, or null if it stalled. */
function tryExpand(rng, { roomCount, gridSize, rejectChance }) {
  const start = { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) };
  const cells = new Map([[key(start.x, start.y), start]]);
  let queue = [start];
  // re-sweep the frontier until the quota is hit or a full pass adds nothing (stall)
  while (cells.size < roomCount) {
    let added = 0;
    const next = [];
    for (const cell of queue) {
      for (const d of DIRS) {
        if (cells.size >= roomCount) break;
        const x = cell.x + DELTA[d].x;
        const y = cell.y + DELTA[d].y;
        if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) continue; // off-grid
        if (cells.has(key(x, y))) continue; // occupied
        if (filledNeighbours(cells, x, y) >= 2) continue; // would close a loop — keep the tree
        if (rng.next() < rejectChance) continue; // the organic-shape coin flip
        const c = { x, y };
        cells.set(key(x, y), c);
        next.push(c);
        added++;
      }
      next.push(cell); // a cell can grow again on a later sweep (rejected ≠ dead)
    }
    if (added === 0) return null; // stalled — caller retries with fresh rolls
    queue = next;
  }
  return { cells, start };
}

/**
 * Generate a connected floor: a sparse TREE of rooms with the boss at the
 * farthest dead end. PURE + seeded (ADR-0013) → same seed, same floor.
 *
 * @param {{next:()=>number, int:(n:number)=>number}} rng the run rng
 * @param {{roomCount:number, gridSize?:number, rejectChance?:number, retries?:number}} opts
 * @returns {{rooms: Array<{id:number, x:number, y:number, type:string,
 *            neighbours: Record<string, number|null>, dist:number}>,
 *            startId:number, bossId:number, gridSize:number}}
 *   rooms[i].id === i; `dist` is BFS depth from the start; type ∈
 *   'start' | 'normal' | 'heal' | 'boss'. Neighbour links are symmetric.
 */
export function generateFloorplan(rng, opts) {
  const gridSize = opts.gridSize ?? 11;
  const rejectChance = opts.rejectChance ?? 0.5;
  const roomCount = Math.max(2, opts.roomCount);
  const retries = opts.retries ?? 40;

  // expansion can stall on unlucky rolls (all frontier cells rejected/blocked);
  // fresh rolls fix it — still deterministic, the retry consumes the same rng stream.
  let grown = null;
  for (let i = 0; i < retries && !grown; i++) {
    grown = tryExpand(rng, { roomCount, gridSize, rejectChance });
  }
  if (!grown) {
    // pathological config (e.g. roomCount ≈ grid area). Degrade: a straight
    // corridor always fits and keeps every invariant (tree, dead-end boss).
    const y = Math.floor(gridSize / 2);
    const cells = new Map();
    for (let x = 0; x < Math.min(roomCount, gridSize); x++) cells.set(key(x, y), { x, y });
    grown = { cells, start: { x: 0, y } };
  }

  // build rooms with symmetric neighbour links
  const list = [...grown.cells.values()];
  const idOf = new Map(list.map((c, i) => [key(c.x, c.y), i]));
  const rooms = list.map((c, i) => {
    const neighbours = {};
    for (const d of DIRS) {
      neighbours[d] = idOf.get(key(c.x + DELTA[d].x, c.y + DELTA[d].y)) ?? null;
    }
    return { id: i, x: c.x, y: c.y, type: 'normal', neighbours, dist: 0 };
  });
  const startId = idOf.get(key(grown.start.x, grown.start.y));
  rooms[startId].type = 'start';

  // BFS depth from the start (drives boss placement + the content difficulty ramp)
  const seen = new Set([startId]);
  let frontier = [startId];
  let depth = 0;
  while (frontier.length) {
    const next = [];
    for (const id of frontier) {
      rooms[id].dist = depth;
      for (const d of DIRS) {
        const n = rooms[id].neighbours[d];
        if (n != null && !seen.has(n)) {
          seen.add(n);
          next.push(n);
        }
      }
    }
    frontier = next;
    depth++;
  }

  // dead ends = exactly one neighbour (the start never hosts a special even if it is one)
  const deadEnds = rooms.filter(
    (r) => r.id !== startId && DIRS.filter((d) => r.neighbours[d] != null).length === 1,
  );
  // the boss takes the FARTHEST dead end — the floor's journey. A tree with 2+
  // rooms always has a non-start dead end (every leaf but possibly the start).
  deadEnds.sort((a, b) => b.dist - a.dist);
  const boss = deadEnds[0];
  boss.type = 'boss';
  // one HEAL room on the farthest REMAINING dead end (if any) — the v1 special;
  // Phase 6b hangs shop/mini-boss/curse types on the exact same slot logic.
  if (deadEnds.length > 1) deadEnds[1].type = 'heal';

  // per-node LAYOUT SEEDS, drawn once in node order (ADR-0032): buildRoom/populateRoom
  // use makeRng(node.layoutSeed) instead of the shared run rng, so a room replays the
  // exact same layout/spawns on every re-entry — run determinism is independent of the
  // path the player walks (the rng-order trap the understand-pass flagged).
  for (const r of rooms) r.layoutSeed = Math.floor(rng.next() * 2 ** 31);

  // seeded SURVIVOR quota on normal rooms (replaces the old index whitelist [2,5,7],
  // which can't survive variable room counts) — the NPC help/leave economy stays alive.
  const normals = rooms.filter((r) => r.type === 'normal');
  let quota = Math.min(opts.survivors ?? 2, normals.length);
  while (quota > 0) {
    const pick = normals.splice(rng.int(normals.length), 1)[0];
    pick.survivor = true;
    quota--;
  }

  return { rooms, startId, bossId: boss.id, gridSize };
}

/**
 * The minimap's render model (PURE — unit-tested; the HUD just paints it).
 * Coordinates are shifted to the plan's own bounding box so the map never jumps
 * as rooms are revealed. Special-room identity is deliberately HIDDEN (research:
 * the fog of what's-behind-the-door is the exploration hook) — a cell only says
 * where you are, where you've been, and that *something* is adjacent.
 *
 * @param {{rooms:Array}} plan a generateFloorplan result
 * @param {{currentId:number, explored:Set<number>}} state explored = entered rooms
 * @returns {{w:number, h:number, cells:Array<{gx:number, gy:number, kind:string}>}}
 *   kind ∈ 'current' | 'cleared' | 'adjacent'
 */
export function minimapView(plan, { currentId, explored }) {
  const xs = plan.rooms.map((r) => r.x);
  const ys = plan.rooms.map((r) => r.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const cells = [];
  const adjacent = new Set();
  for (const r of plan.rooms) {
    if (!explored.has(r.id)) continue;
    cells.push({
      gx: r.x - minX,
      gy: r.y - minY,
      kind: r.id === currentId ? 'current' : 'cleared',
    });
    for (const d of DIRS) {
      const n = r.neighbours[d];
      if (n != null && !explored.has(n)) adjacent.add(n);
    }
  }
  for (const id of adjacent) {
    const r = plan.rooms[id];
    cells.push({ gx: r.x - minX, gy: r.y - minY, kind: 'adjacent' });
  }
  return { w: Math.max(...xs) - minX + 1, h: Math.max(...ys) - minY + 1, cells };
}

/**
 * Room count for a floor (the depth ramp — research: depth should ramp room
 * count, mob difficulty, AND offer tiers together). PURE.
 * @param {number} floorIndex 0-based floor
 * @param {{baseRooms:number, roomsPerFloor:number, maxRooms:number}} cfg config.MAP
 */
export function roomCountForFloor(floorIndex, cfg) {
  const n = Math.round(cfg.baseRooms + Math.max(0, floorIndex) * cfg.roomsPerFloor);
  return Math.min(cfg.maxRooms, n);
}
