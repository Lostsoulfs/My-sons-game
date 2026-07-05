import { describe, it, expect } from 'vitest';
import { PROGRESSION, MODES } from '../src/config.js';
import { resolveMode, floorDef, floorMeta, floorCount } from '../src/core/progression.js';

// CP-E (ADR-0043): run modes. Story must be BIT-IDENTICAL to the pre-mode game; Endless is a
// post-first-win scaffold that loops floor defs and keeps escalating. These lock the gate, the
// loop, the ramp, and story's unchanged behavior.

const LAST = floorCount() - 1;

describe('resolveMode — the endless gate', () => {
  it('endless requires gameBeaten; everything else is story', () => {
    expect(resolveMode('endless', true)).toBe('endless');
    expect(resolveMode('endless', false)).toBe('story'); // pre-win console call → story
    expect(resolveMode('story', true)).toBe('story');
    expect(resolveMode('story', false)).toBe('story');
  });

  it('junk input degrades to story (no accidental mode from a typo)', () => {
    expect(resolveMode('ENDLESS', true)).toBe('story');
    expect(resolveMode(undefined, true)).toBe('story');
    expect(resolveMode(null, false)).toBe('story');
  });
});

describe('story is bit-identical to the pre-mode game', () => {
  it('floorDef clamps to the last floor (default + explicit story)', () => {
    expect(floorDef(999)).toBe(PROGRESSION.floors[LAST]);
    expect(floorDef(999, 'story')).toBe(PROGRESSION.floors[LAST]);
  });

  it('floorMeta with no mode arg === floorMeta("story") on every story floor', () => {
    for (let i = 0; i <= LAST; i++) {
      expect(floorMeta(i)).toEqual(floorMeta(i, 'story'));
    }
  });

  it('the last story floor is still the last floor (the win exit fires)', () => {
    expect(floorMeta(LAST, 'story').isLastFloor).toBe(true);
    expect(floorMeta(LAST - 1, 'story').isLastFloor).toBe(false);
  });
});

describe('endless — the loop', () => {
  it('NEVER has a last floor (the exit descends forever; no win)', () => {
    for (const i of [0, LAST, LAST + 1, LAST + 50]) {
      expect(floorMeta(i, 'endless').isLastFloor, `floor ${i}`).toBe(false);
    }
  });

  it('floor defs CYCLE the whole roster (bosses rotate, not Enforcer-forever)', () => {
    const n = floorCount();
    expect(floorDef(n, 'endless')).toBe(PROGRESSION.floors[0]); // first loop restarts the roster
    expect(floorDef(n + 2, 'endless')).toBe(PROGRESSION.floors[2]);
    expect(floorDef(2 * n + 1, 'endless')).toBe(PROGRESSION.floors[1]);
  });

  it('within the story floors, endless diff === story diff (the ramp only starts PAST them)', () => {
    for (let i = 0; i <= LAST; i++) {
      expect(floorMeta(i, 'endless').diff).toBeCloseTo(floorMeta(i, 'story').diff, 10);
    }
  });

  it('past the story floors the diff is STRICTLY increasing and steeper than story-clamped', () => {
    let prev = floorMeta(LAST, 'endless').diff;
    for (let i = LAST + 1; i <= LAST + 12; i++) {
      const d = floorMeta(i, 'endless').diff;
      expect(d, `floor ${i}`).toBeGreaterThan(prev);
      prev = d;
    }
    // the extra ramp really is EXTRA: endless deep-floor diff beats what pure floorScale would give
    const deep = LAST + 10;
    const pure = floorMeta(deep, 'endless').diff;
    const noRamp = floorMeta(deep, 'story').diff; // story formula on the same raw index
    expect(pure / noRamp).toBeCloseTo(Math.pow(MODES.endless.rampMul, 10) * ratioDefMul(deep), 6);
  });

  it('the ramp multiplier is a sane scaffold (>1, modest)', () => {
    expect(MODES.endless.rampMul).toBeGreaterThan(1);
    expect(MODES.endless.rampMul).toBeLessThan(1.5);
  });
});

// endless cycles defs while story clamps to the LAST def — divide out the two defs' diffMul
// so the ramp comparison above isolates the rampMul term alone.
function ratioDefMul(floorIndex) {
  const cycled = PROGRESSION.floors[floorIndex % floorCount()].diffMul ?? 1;
  const clamped = PROGRESSION.floors[LAST].diffMul ?? 1;
  return cycled / clamped;
}
