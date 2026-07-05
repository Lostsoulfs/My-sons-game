import { describe, it, expect } from 'vitest';
import { demonInherit } from '../src/core/demonInherit.js';

// CP-C (ADR-0042): the demon companion inherits a SHARE of the player's PERMANENT (Resonance)
// baseline — nothing from the run. These lock the balance invariant the adversarial review guards:
// identity pre-first-win, monotonic growth with Resonance, share-scaled, and hostile-input-safe.

describe('demonInherit — permanent-baseline share', () => {
  it('is exact identity pre-first-win (all-zero baseline)', () => {
    expect(demonInherit({ damage: 0, fireRate: 0, speed: 0 }, 0.5)).toEqual({
      damageMul: 1,
      fireRateMul: 1,
      speedMul: 1,
    });
  });

  it('inherits exactly share × each permanent bonus', () => {
    const r = demonInherit({ damage: 0.4, fireRate: 0.2, speed: 0.3 }, 0.5);
    expect(r.damageMul).toBeCloseTo(1.2); // 1 + 0.5·0.4
    expect(r.fireRateMul).toBeCloseTo(0.9); // 1 − 0.5·0.2 (lower = faster)
    expect(r.speedMul).toBeCloseTo(1.15); // 1 + 0.5·0.3
  });

  it('grows monotonically with Resonance (more baseline → stronger demon)', () => {
    const weak = demonInherit({ damage: 0.1, fireRate: 0.05, speed: 0.1 }, 0.5);
    const strong = demonInherit({ damage: 0.5, fireRate: 0.25, speed: 0.4 }, 0.5);
    expect(strong.damageMul).toBeGreaterThan(weak.damageMul);
    expect(strong.fireRateMul).toBeLessThan(weak.fireRateMul); // faster
    expect(strong.speedMul).toBeGreaterThan(weak.speedMul);
  });

  it('share=0 is identity regardless of baseline (a fully-nerfed demon config)', () => {
    expect(demonInherit({ damage: 9, fireRate: 9, speed: 9 }, 0)).toEqual({
      damageMul: 1,
      fireRateMul: 1,
      speedMul: 1,
    });
  });

  it('the fire-rate floor stops a hostile/extreme config from hitting zero cooldown', () => {
    expect(demonInherit({ fireRate: 100 }, 1).fireRateMul).toBeCloseTo(0.4); // default floor
    expect(demonInherit({ fireRate: 100 }, 1, 0.25).fireRateMul).toBeCloseTo(0.25);
  });

  it('degrades safely on junk input (null baseline, negative fields, missing keys)', () => {
    expect(demonInherit(null, 0.5)).toEqual({ damageMul: 1, fireRateMul: 1, speedMul: 1 });
    // negative baseline fields (should never happen) must not turn into a DEBUFF or a speedup
    const r = demonInherit({ damage: -2, fireRate: -2, speed: -2 }, 0.5);
    expect(r).toEqual({ damageMul: 1, fireRateMul: 1, speedMul: 1 });
    expect(demonInherit({}, -1)).toEqual({ damageMul: 1, fireRateMul: 1, speedMul: 1 }); // negative share clamps
  });
});
