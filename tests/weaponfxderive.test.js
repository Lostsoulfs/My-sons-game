// Pure tests for the weapon-FX descriptor derivation (flavor + shapes) and the
// rarity→intensity mapping. The render side (systems/weaponfx.js) is THREE-backed
// and out of the coverage include; this locks the data-only logic behind it.
import { describe, expect, it } from 'vitest';
import { isEnergyColor, deriveWeaponFx, rarityIntensity } from '../src/core/weaponFxDerive.js';

describe('weaponFxDerive.isEnergyColor', () => {
  it('treats bright cool colors as energy, warm/none/dark as ballistic', () => {
    expect(isEnergyColor(0x66e0ff)).toBe(true); // cyan railgun
    expect(isEnergyColor(0x66ff9e)).toBe(true); // green laser
    expect(isEnergyColor(null)).toBe(false); // no color = lead
    expect(isEnergyColor(0xff7722)).toBe(false); // warm orange (rocket)
    expect(isEnergyColor(0x332211)).toBe(false); // too dark to read as energy
  });
});

describe('weaponFxDerive.deriveWeaponFx', () => {
  it('defaults a plain gun to a ballistic tracer', () => {
    expect(deriveWeaponFx({})).toMatchObject({
      kind: 'ballistic',
      trail: 'tracer',
      impact: 'spark',
    });
  });

  it('makes a piercing energy gun a beam and a non-piercing one a bolt', () => {
    expect(deriveWeaponFx({ color: 0x66e0ff, pierce: 6 })).toMatchObject({
      kind: 'energy',
      trail: 'beam',
    });
    expect(deriveWeaponFx({ color: 0x66ff9e })).toMatchObject({ kind: 'energy', trail: 'bolt' });
  });

  it('gives explosive guns a burst impact', () => {
    expect(deriveWeaponFx({ explosive: true }).impact).toBe('burst');
  });

  it('lets an explicit fx override the derived fields, leaving the rest', () => {
    const fx = deriveWeaponFx({ color: 0xff7722, fx: { kind: 'energy', trail: 'beam' } });
    expect(fx.kind).toBe('energy');
    expect(fx.trail).toBe('beam');
    expect(fx.impact).toBe('spark'); // untouched field stays derived
  });

  it('carries the weapon color through (for tinting), null when absent', () => {
    expect(deriveWeaponFx({ color: 0x66ff9e }).color).toBe(0x66ff9e);
    expect(deriveWeaponFx({}).color).toBe(null);
  });
});

describe('weaponFxDerive.rarityIntensity', () => {
  it('maps a tier through the scale, defaulting to 1', () => {
    const scale = { common: 1.0, epic: 1.6, ultra: 2.1 };
    expect(rarityIntensity('epic', scale)).toBe(1.6);
    expect(rarityIntensity('ultra', scale)).toBe(2.1);
    expect(rarityIntensity('mystery', scale)).toBe(1); // unknown tier
    expect(rarityIntensity('common', undefined)).toBe(1); // no scale
  });
});
