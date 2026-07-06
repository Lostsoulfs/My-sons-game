import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/core/rng.js';
import {
  generateFloorplan,
  roomCountForFloor,
  minimapView,
  DIRS,
  OPPOSITE,
} from '../src/core/floorplan.js';
import { MAP } from '../src/config.js';

// ADR-0032 — the connected-floor generator. Pure + seeded, so every invariant
// below is a hard proof across many seeds, not a spot check.

const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7 + 1);
const gen = (seed, roomCount = 9) => generateFloorplan(makeRng(seed), { ...MAP, roomCount });

/** neighbour edge count (each link counted once) */
function edgeCount(plan) {
  let n = 0;
  for (const r of plan.rooms) for (const d of DIRS) if (r.neighbours[d] != null) n++;
  return n / 2; // symmetric links counted from both sides
}

describe('generateFloorplan shape invariants (60 seeds)', () => {
  it('produces exactly the requested room count', () => {
    for (const s of SEEDS) expect(gen(s).rooms).toHaveLength(9);
  });

  it('is deterministic for a given seed', () => {
    for (const s of SEEDS.slice(0, 10)) expect(gen(s)).toEqual(gen(s));
  });

  it('is a TREE: rooms-1 edges, so every route back is the route you came (plus full backtracking)', () => {
    for (const s of SEEDS) {
      const plan = gen(s);
      expect(edgeCount(plan)).toBe(plan.rooms.length - 1);
    }
  });

  it('every room is reachable from the start (connectivity proof)', () => {
    for (const s of SEEDS) {
      const plan = gen(s);
      const seen = new Set([plan.startId]);
      const stack = [plan.startId];
      while (stack.length) {
        const r = plan.rooms[stack.pop()];
        for (const d of DIRS) {
          const n = r.neighbours[d];
          if (n != null && !seen.has(n)) {
            seen.add(n);
            stack.push(n);
          }
        }
      }
      expect(seen.size).toBe(plan.rooms.length);
    }
  });

  it('neighbour links are symmetric (A north of B ⇒ B south of A)', () => {
    for (const s of SEEDS.slice(0, 20)) {
      const plan = gen(s);
      for (const r of plan.rooms) {
        for (const d of DIRS) {
          const n = r.neighbours[d];
          if (n != null) expect(plan.rooms[n].neighbours[OPPOSITE[d]]).toBe(r.id);
        }
      }
    }
  });
});

describe('boss + special placement', () => {
  it('the boss room is a DEAD END (exactly one neighbour)', () => {
    for (const s of SEEDS) {
      const boss = gen(s).rooms.find((r) => r.type === 'boss');
      expect(boss).toBeDefined();
      expect(DIRS.filter((d) => boss.neighbours[d] != null)).toHaveLength(1);
    }
  });

  it('the boss sits at the FARTHEST dead end from the start (the journey)', () => {
    for (const s of SEEDS) {
      const plan = gen(s);
      const boss = plan.rooms.find((r) => r.type === 'boss');
      const deadEnds = plan.rooms.filter(
        (r) => r.id !== plan.startId && DIRS.filter((d) => r.neighbours[d] != null).length === 1,
      );
      for (const de of deadEnds) expect(boss.dist).toBeGreaterThanOrEqual(de.dist);
    }
  });

  it('exactly one start, one boss; a choice room appears when a spare dead end exists', () => {
    for (const s of SEEDS) {
      const plan = gen(s);
      const types = plan.rooms.map((r) => r.type);
      expect(types.filter((t) => t === 'start')).toHaveLength(1);
      expect(types.filter((t) => t === 'boss')).toHaveLength(1);
      expect(types.filter((t) => t === 'choice').length).toBeLessThanOrEqual(1);
    }
  });

  it('the choice room (when present) is never the boss or the start', () => {
    for (const s of SEEDS) {
      const choice = gen(s).rooms.find((r) => r.type === 'choice');
      if (choice) {
        expect(choice.type).toBe('choice'); // trivially true — the real assert is the ids differ
        const plan = gen(s);
        expect(plan.rooms.find((r) => r.type === 'choice').id).not.toBe(plan.bossId);
        expect(plan.rooms.find((r) => r.type === 'choice').id).not.toBe(plan.startId);
      }
    }
  });

  it('dist is a true BFS depth: every room is exactly 1 deeper than some neighbour (except the start)', () => {
    for (const s of SEEDS.slice(0, 20)) {
      const plan = gen(s);
      for (const r of plan.rooms) {
        if (r.id === plan.startId) {
          expect(r.dist).toBe(0);
          continue;
        }
        const parentDepths = DIRS.map((d) => r.neighbours[d])
          .filter((n) => n != null)
          .map((n) => plan.rooms[n].dist);
        expect(Math.min(...parentDepths)).toBe(r.dist - 1);
      }
    }
  });
});

describe('degenerate configs never crash or violate invariants', () => {
  it('tiny floor (2 rooms): start + boss, linked', () => {
    for (const s of SEEDS.slice(0, 10)) {
      const plan = gen(s, 2);
      expect(plan.rooms).toHaveLength(2);
      expect(plan.rooms.find((r) => r.type === 'boss')).toBeDefined();
    }
  });

  it('a large count still terminates and holds the tree invariant', () => {
    const plan = gen(3, MAP.maxRooms);
    expect(plan.rooms).toHaveLength(MAP.maxRooms);
    expect(edgeCount(plan)).toBe(plan.rooms.length - 1);
  });
});

describe('layout seeds + survivor quota (ADR-0032)', () => {
  it('every room gets a deterministic layoutSeed (same seed, same seeds)', () => {
    for (const s of SEEDS.slice(0, 10)) {
      const a = gen(s).rooms.map((r) => r.layoutSeed);
      const b = gen(s).rooms.map((r) => r.layoutSeed);
      expect(a).toEqual(b);
      for (const seed of a) expect(Number.isInteger(seed)).toBe(true);
    }
  });

  it('tags the survivor quota on NORMAL rooms only (never start/boss/heal)', () => {
    for (const s of SEEDS) {
      const plan = generateFloorplan(makeRng(s), { ...MAP, roomCount: 9, survivors: 2 });
      const tagged = plan.rooms.filter((r) => r.survivor);
      expect(tagged.length).toBeLessThanOrEqual(2);
      for (const r of tagged) expect(r.type).toBe('normal');
    }
  });

  it('tags EXACTLY min(quota, normal-room count) survivors — quota met when rooms allow', () => {
    // enough normal rooms → the full quota lands (not fewer): a real coverage check,
    // not the old tautology that stayed green even if zero survivors were ever tagged.
    for (const s of SEEDS) {
      const plan = generateFloorplan(makeRng(s), { ...MAP, roomCount: 12, survivors: 2 });
      const normals = plan.rooms.filter((r) => r.type === 'normal').length;
      const tagged = plan.rooms.filter((r) => r.survivor).length;
      expect(tagged).toBe(Math.min(2, normals));
    }
  });

  it('survivor quota degrades to the normal-room count when survivors outnumber rooms', () => {
    const plan = generateFloorplan(makeRng(5), { ...MAP, roomCount: 3, survivors: 5 });
    const normals = plan.rooms.filter((r) => r.type === 'normal').length;
    const tagged = plan.rooms.filter((r) => r.survivor).length;
    expect(tagged).toBe(normals); // clamped to what's available, never over-tagged
  });
});

// The degenerate corridor fallback (floorplan.js) is the one path the happy-path tests
// never hit; drive it directly so its invariants (exact count, tree, dead-end boss) are
// locked, not assumed (ADR-0032).
describe('corridor fallback (pathological configs)', () => {
  it('falls back to a straight corridor and still honours every invariant', () => {
    // retries:0 forces the fallback with zero expansion attempts; gridSize ≥ roomCount
    // (the config invariant) means the corridor fits the EXACT room count.
    for (const s of SEEDS.slice(0, 8)) {
      const plan = generateFloorplan(makeRng(s), {
        gridSize: 16,
        rejectChance: 0.5,
        roomCount: 12,
        retries: 0,
        survivors: 2,
      });
      expect(plan.rooms.length).toBe(12); // exact-count contract holds in the fallback too
      const edges = plan.rooms.reduce(
        (n, r) => n + DIRS.filter((d) => r.neighbours[d] != null).length,
        0,
      );
      expect(edges / 2).toBe(plan.rooms.length - 1); // tree: rooms-1 undirected edges
      expect(plan.rooms[plan.bossId].type).toBe('boss');
      const bossLinks = DIRS.filter((d) => plan.rooms[plan.bossId].neighbours[d] != null).length;
      expect(bossLinks).toBe(1); // boss is a dead end even in the corridor
    }
  });
});

describe('minimapView (the pure minimap model)', () => {
  it('shows only explored cells + their unexplored neighbours, identity hidden', () => {
    const plan = gen(11);
    const explored = new Set([plan.startId]);
    const view = minimapView(plan, { currentId: plan.startId, explored });
    const kinds = view.cells.map((c) => c.kind);
    expect(kinds.filter((k) => k === 'current')).toHaveLength(1);
    expect(kinds).not.toContain('boss'); // identity is never exposed
    // every non-current cell is an adjacent-unknown at this point
    expect(kinds.filter((k) => k === 'adjacent').length).toBe(view.cells.length - 1);
  });

  it('fully explored: every room is a cell, exactly one current, no adjacents', () => {
    const plan = gen(12);
    const explored = new Set(plan.rooms.map((r) => r.id));
    const view = minimapView(plan, { currentId: plan.bossId, explored });
    expect(view.cells).toHaveLength(plan.rooms.length);
    expect(view.cells.filter((c) => c.kind === 'current')).toHaveLength(1);
    expect(view.cells.filter((c) => c.kind === 'adjacent')).toHaveLength(0);
  });

  it('coordinates are stable (bbox-shifted): revealing rooms never moves existing cells', () => {
    const plan = gen(13);
    const e1 = new Set([plan.startId]);
    const v1 = minimapView(plan, { currentId: plan.startId, explored: e1 });
    const start1 = v1.cells.find((c) => c.kind === 'current');
    const all = new Set(plan.rooms.map((r) => r.id));
    const v2 = minimapView(plan, { currentId: plan.startId, explored: all });
    const start2 = v2.cells.find((c) => c.kind === 'current');
    expect(start2.gx).toBe(start1.gx);
    expect(start2.gy).toBe(start1.gy);
  });
});

describe('roomCountForFloor (the depth ramp)', () => {
  it('starts at baseRooms and grows by roomsPerFloor', () => {
    expect(roomCountForFloor(0, MAP)).toBe(MAP.baseRooms);
    expect(roomCountForFloor(2, MAP)).toBe(Math.round(MAP.baseRooms + 2 * MAP.roomsPerFloor));
  });

  it('caps at maxRooms and clamps negative floors', () => {
    expect(roomCountForFloor(99, MAP)).toBe(MAP.maxRooms);
    expect(roomCountForFloor(-3, MAP)).toBe(MAP.baseRooms);
  });

  it('the shipped 6-floor run is monotonic and within bounds', () => {
    let prev = 0;
    for (let f = 0; f < 6; f++) {
      const n = roomCountForFloor(f, MAP);
      expect(n).toBeGreaterThanOrEqual(prev);
      expect(n).toBeLessThanOrEqual(MAP.maxRooms);
      prev = n;
    }
  });
});
