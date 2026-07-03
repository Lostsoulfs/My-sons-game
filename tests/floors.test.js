import { describe, it, expect } from 'vitest';
import { PROGRESSION } from '../src/config.js';
import { floorInfo, roomsPerFloor } from '../src/core/progression.js';

// Integrity check for the Stage 5 final floor lineup (pure config — no THREE).
const PALETTE_KEYS = ['body', 'emissive', 'leg', 'legEmissive', 'eye'];

describe('PROGRESSION.floors (final lineup)', () => {
  const floors = PROGRESSION.floors;

  it('is the 6-floor order: spider -> human -> mushroom -> duo -> skeleton -> enforcer', () => {
    expect(floors.map((f) => f.boss)).toEqual([
      'spider',
      'human',
      'mushroom',
      'duo',
      'skeleton',
      'enforcer', // the government war-machine finale
    ]);
  });

  it('every floor has a name and a full 5-key palette', () => {
    for (const f of floors) {
      expect(typeof f.name).toBe('string');
      expect(f.name.length).toBeGreaterThan(0);
      for (const k of PALETTE_KEYS) expect(typeof f.palette[k]).toBe('number');
    }
  });

  it('difficulty (from the DIFFICULTY curve) ramps up monotonically per floor', () => {
    const diffs = floors.map((_, i) => floorInfo(i * roomsPerFloor()).diff);
    for (let i = 1; i < diffs.length; i++) {
      expect(diffs[i]).toBeGreaterThanOrEqual(diffs[i - 1]);
    }
    expect(diffs[diffs.length - 1]).toBeGreaterThan(diffs[0]); // it actually rises
  });

  it('the duo floor lists its two beasts', () => {
    const duo = floors.find((f) => f.boss === 'duo');
    expect(duo.duo).toEqual(['dog', 'cat']);
  });
});
