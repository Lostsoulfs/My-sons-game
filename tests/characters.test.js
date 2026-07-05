import { describe, it, expect } from 'vitest';
import { CHARACTERS, WEAPONS, WEAPON_LIMITS, PALETTE } from '../src/config.js';

// CP5 (ADR-0038): the two playable characters. Dad/Son differ by STARTER weapon (which carries the
// ballistic-vs-energy flavor for free via CP2 WEAPON_LIMITS) plus a small +/− trait. This locks the
// config so a starter can't silently point at a missing gun or lose its flavor.

describe('CHARACTERS config', () => {
  it('defines exactly Dad and Son', () => {
    expect(Object.keys(CHARACTERS).sort()).toEqual(['dad', 'son']);
  });

  it('each character is fully formed (name, color, model, starter, trait)', () => {
    for (const [key, c] of Object.entries(CHARACTERS)) {
      expect(typeof c.name, key).toBe('string');
      expect(typeof c.color, key).toBe('number');
      expect(typeof c.modelKey, key).toBe('string');
      expect(WEAPONS[c.starter], `${key} starter must be a real weapon`).toBeDefined();
      expect(typeof c.trait, key).toBe('object');
    }
  });

  it('Dad is the ballistic pistol (a reload gun); Son is the energy laser (an overheat gun)', () => {
    expect(CHARACTERS.dad.starter).toBe('pistol');
    expect(WEAPON_LIMITS.pistol.reload).toBeDefined(); // ballistic → magazine + reload
    expect(CHARACTERS.son.starter).toBe('laserpistol');
    expect(WEAPON_LIMITS.laserpistol.heat).toBeDefined(); // energy → overheat
  });

  it('Dad reads blue and Son reads green (distinct silhouettes)', () => {
    expect(CHARACTERS.dad.color).toBe(PALETTE.player);
    expect(CHARACTERS.son.color).toBe(PALETTE.ally);
    expect(CHARACTERS.dad.color).not.toBe(CHARACTERS.son.color);
  });

  it('traits are small, sane baseline nudges (|value| ≤ 0.5, known stat keys)', () => {
    const known = new Set(['damage', 'fireRate', 'speed']);
    for (const [key, c] of Object.entries(CHARACTERS)) {
      for (const [stat, v] of Object.entries(c.trait)) {
        expect(known.has(stat), `${key}.trait.${stat}`).toBe(true);
        expect(Math.abs(v), `${key}.trait.${stat}`).toBeLessThanOrEqual(0.5);
      }
    }
  });
});
