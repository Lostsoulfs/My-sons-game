import { describe, it, expect } from 'vitest';
import { resolveIncoming } from '../src/core/defense.js';

// CP4 (ADR-0037): incoming-damage resolution is now GUARD-ONLY — the % damage-reduction soak + its
// fractional carry were cut. Pure, deterministic. Invariant: a whole-heart HP pool subtracts
// `heartsLost` directly, and a guard charge blocks a WHOLE hit (all-or-nothing).

describe('resolveIncoming — baseline (no guard)', () => {
  it('passes the full hit through', () => {
    expect(resolveIncoming(1, {})).toEqual({ heartsLost: 1, guardCharges: 0, blocked: false });
  });
  it('a multi-damage hit lands in full (no soak)', () => {
    expect(resolveIncoming(4, {})).toEqual({ heartsLost: 4, guardCharges: 0, blocked: false });
  });
  it('defaults missing state to zero', () => {
    expect(resolveIncoming(2).heartsLost).toBe(2);
  });
});

describe('resolveIncoming — guard charges block whole hits first', () => {
  it('eats one whole hit per charge (even a big rocket hit) and decrements', () => {
    const r = resolveIncoming(4, { guardCharges: 2 });
    expect(r.blocked).toBe(true);
    expect(r.heartsLost).toBe(0);
    expect(r.guardCharges).toBe(1);
  });
  it('falls through to full damage once the charges run out', () => {
    const r = resolveIncoming(1, { guardCharges: 0 });
    expect(r.blocked).toBe(false);
    expect(r.heartsLost).toBe(1);
  });
});

describe('resolveIncoming — heart-loss invariants across a sweep', () => {
  it('never returns a fractional, negative, or >dmg heart loss', () => {
    for (const dmg of [1, 2, 3, 4]) {
      for (const guardCharges of [0, 1, 3]) {
        const res = resolveIncoming(dmg, { guardCharges });
        expect(Number.isInteger(res.heartsLost)).toBe(true);
        expect(res.heartsLost).toBeGreaterThanOrEqual(0);
        expect(res.heartsLost).toBeLessThanOrEqual(dmg);
        // a charge blocks the whole hit; otherwise the hit lands in full
        expect(res.heartsLost).toBe(guardCharges > 0 ? 0 : dmg);
      }
    }
  });
});
