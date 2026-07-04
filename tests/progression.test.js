import { describe, it, expect } from 'vitest';
import { floorMeta, resolveDeath, floorCount, floorDef } from '../src/core/progression.js';
import { PROGRESSION } from '../src/config.js';

// ADR-0032: room-level facts (depth, isBoss, isLast) live on the floorplan node
// (tests/floorplan.test.js proves those); progression keeps FLOOR identity + death.

describe('progression.floorMeta', () => {
  it('returns each floor definition with a positive difficulty', () => {
    for (let f = 0; f < floorCount(); f++) {
      const meta = floorMeta(f);
      expect(meta.def).toBe(PROGRESSION.floors[f]);
      expect(meta.diff).toBeGreaterThan(0);
    }
  });

  it('marks exactly the final floor as last', () => {
    for (let f = 0; f < floorCount(); f++) {
      expect(floorMeta(f).isLastFloor).toBe(f === floorCount() - 1);
    }
  });

  it('clamps past-the-end floors to the final definition (endless-safe)', () => {
    expect(floorMeta(99).def).toBe(floorDef(floorCount() - 1));
    expect(floorMeta(99).isLastFloor).toBe(true);
  });

  it('difficulty never decreases across the shipped floors', () => {
    let prev = 0;
    for (let f = 0; f < floorCount(); f++) {
      const d = floorMeta(f).diff;
      expect(d).toBeGreaterThanOrEqual(prev);
      prev = d;
    }
  });
});

describe('progression.resolveDeath (checkpoints are FLOORS, ADR-0032)', () => {
  it('respawns at the checkpoint floor while lives remain', () => {
    expect(resolveDeath(3, 2)).toEqual({ lives: 2, action: 'RESPAWN', floor: 2 });
    expect(resolveDeath(2, 2)).toEqual({ lives: 1, action: 'RESPAWN', floor: 2 });
  });

  it('the last death is game over (back to floor zero)', () => {
    expect(resolveDeath(1, 2)).toEqual({ lives: 0, action: 'GAMEOVER', floor: 0 });
  });
});
