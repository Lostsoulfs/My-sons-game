import { describe, it, expect } from 'vitest';
import { bossSpawnForEntry } from '../src/core/bossPlacement.js';
import { OPPOSITE } from '../src/core/floorplan.js';

// ADR-0033 — the boss spawns on the wall OPPOSITE the entry so the player always
// crosses the room to meet it. Pure fn → every invariant is checkable headlessly.

const ARENA = { width: 64, depth: 48 };
const hw = ARENA.width / 2;
const hd = ARENA.depth / 2;
const SIDES = ['N', 'S', 'E', 'W'];

// which coordinate a boss on a given wall is pinned to (its distance from centre)
const onWall = (wall, spot, inset) => {
  if (wall === 'N') return Math.abs(spot.z - (-hd + inset)) < 1e-9;
  if (wall === 'S') return Math.abs(spot.z - (hd - inset)) < 1e-9;
  if (wall === 'E') return Math.abs(spot.x - (hw - inset)) < 1e-9;
  if (wall === 'W') return Math.abs(spot.x - (-hw + inset)) < 1e-9;
  return false;
};

describe('bossSpawnForEntry (ADR-0033 entry-opposite placement)', () => {
  it('places a single boss on the wall OPPOSITE the entry side', () => {
    for (const side of SIDES) {
      const { wall, spots } = bossSpawnForEntry(side, ARENA, { inset: 4, count: 1 });
      expect(wall).toBe(OPPOSITE[side]);
      expect(spots).toHaveLength(1);
      expect(onWall(wall, spots[0], 4)).toBe(true);
    }
  });

  it('treats a null (floor-start) entry as the classic north-wall boss', () => {
    const { wall, spots } = bossSpawnForEntry(null, ARENA, { inset: 4, count: 1 });
    expect(wall).toBe('N');
    expect(spots[0].x).toBe(0);
    expect(spots[0].z).toBe(-hd + 4);
  });

  it('keeps the boss inside the arena and off the wall by `inset`', () => {
    for (const side of [...SIDES, null]) {
      const { spots } = bossSpawnForEntry(side, ARENA, { inset: 4, count: 1 });
      for (const s of spots) {
        expect(Math.abs(s.x)).toBeLessThan(hw);
        expect(Math.abs(s.z)).toBeLessThan(hd);
      }
    }
  });

  it('faces the boss toward the arena centre (dir=(sin,cos) points inward)', () => {
    for (const side of SIDES) {
      const { spots } = bossSpawnForEntry(side, ARENA, { count: 1 });
      const s = spots[0];
      const dir = { x: Math.sin(s.facing), z: Math.cos(s.facing) };
      // the facing vector, from the boss's position, should point toward the origin:
      // dir · (origin - pos) > 0
      expect(dir.x * -s.x + dir.z * -s.z).toBeGreaterThan(0);
    }
  });

  it('spreads a DUO along the wall-perpendicular axis (X on N/S, Z on E/W), symmetric + distinct', () => {
    // N/S walls (from E/W... no): a south or floor-start entry → N wall → spread on X
    const ns = bossSpawnForEntry('S', ARENA, { count: 2, spread: 5 });
    expect(ns.spreadAxis).toBe('x');
    expect(ns.spots[0].x).toBe(-5);
    expect(ns.spots[1].x).toBe(5);
    expect(ns.spots[0].z).toBe(ns.spots[1].z); // share the wall coordinate
    // E/W walls: an east entry → W wall → spread on Z
    const ew = bossSpawnForEntry('E', ARENA, { count: 2, spread: 5 });
    expect(ew.spreadAxis).toBe('z');
    expect(ew.spots[0].z).toBe(-5);
    expect(ew.spots[1].z).toBe(5);
    expect(ew.spots[0].x).toBe(ew.spots[1].x);
  });

  it('a duo never stacks its two beasts on one point (any entry side)', () => {
    for (const side of [...SIDES, null]) {
      const { spots } = bossSpawnForEntry(side, ARENA, { count: 2, spread: 5 });
      const d = Math.hypot(spots[0].x - spots[1].x, spots[0].z - spots[1].z);
      expect(d).toBeGreaterThan(1);
    }
  });
});
