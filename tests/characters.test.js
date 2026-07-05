import { describe, it, expect } from 'vitest';
import { CHARACTERS, WEAPONS, WEAPON_LIMITS, PLAYER } from '../src/config.js';

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

  it('the two characters read as DISTINCT silhouettes (different colors + models)', () => {
    // (not `=== PALETTE.player`: the config assigns from PALETTE, so that would be circular.) The
    // invariant that actually matters is that Dad and Son are visually tellable apart.
    expect(CHARACTERS.dad.color).not.toBe(CHARACTERS.son.color);
    expect(CHARACTERS.dad.modelKey).not.toBe(CHARACTERS.son.modelKey);
    // Dad's blue is more blue than red; Son's green is more green than red — a sanity check on hue.
    const blue = (c) => c & 0xff;
    const green = (c) => (c >> 8) & 0xff;
    const red = (c) => (c >> 16) & 0xff;
    expect(blue(CHARACTERS.dad.color)).toBeGreaterThan(red(CHARACTERS.dad.color));
    expect(green(CHARACTERS.son.color)).toBeGreaterThan(red(CHARACTERS.son.color));
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

  // CP-D (ADR-0041): Son's modelKey used to BE 'ally' — the same key the dormant Ally class uses.
  // Pointing a real GLB at 'ally' (for Son) would have silently reskinned the future CP-C demon
  // companion too, since they'd share one asset slot. Lock that Son (and Dad) each own a DISTINCT
  // key, and neither is the reserved 'ally' slot.
  it("no character's modelKey collides with the reserved 'ally' (CP-C demon) slot", () => {
    for (const [key, c] of Object.entries(CHARACTERS)) {
      expect(c.modelKey, key).not.toBe('ally');
    }
  });

  // CP-D: a visual-only silhouette differentiator (meshRadius/meshHeight/prop) — deliberately
  // separate from PLAYER.radius, the real hit-circle, so 2P stays fair regardless of character.
  it('meshRadius/meshHeight are VISUAL-ONLY and diverge per character; prop is set + distinct', () => {
    for (const [key, c] of Object.entries(CHARACTERS)) {
      expect(typeof c.meshRadius, key).toBe('number');
      expect(typeof c.meshHeight, key).toBe('number');
      expect(typeof c.prop, key).toBe('string');
    }
    expect(CHARACTERS.dad.meshRadius).not.toBe(CHARACTERS.son.meshRadius);
    expect(CHARACTERS.dad.meshHeight).not.toBe(CHARACTERS.son.meshHeight);
    expect(CHARACTERS.dad.prop).not.toBe(CHARACTERS.son.prop);
    // Dad reads broad/planted; Son reads lean/quick (the panel's silhouette direction).
    expect(CHARACTERS.dad.meshRadius).toBeGreaterThan(CHARACTERS.son.meshRadius);
    expect(CHARACTERS.dad.meshHeight).toBeLessThan(CHARACTERS.son.meshHeight);
  });

  it('the collision hit-circle is IDENTICAL for both characters regardless of visual silhouette', () => {
    // Fairness invariant: only PLAYER.radius (shared, global) drives the real hit-circle in
    // player.js — meshRadius must never leak into it. Nothing in CHARACTERS should override it.
    expect(CHARACTERS.dad.radius).toBeUndefined();
    expect(CHARACTERS.son.radius).toBeUndefined();
    expect(typeof PLAYER.radius).toBe('number');
  });
});
