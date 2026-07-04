import { describe, it, expect } from 'vitest';
import { spinUpCooldown } from '../src/core/spinUp.js';

// The minigun's wind-up: cooldown ramps from a slow startCd down to a fast endCd
// over rampTime seconds while the trigger is held.
describe('spinUpCooldown (minigun wind-up)', () => {
  const cfg = { startCd: 0.14, endCd: 0.045, rampTime: 0.9 };

  it('starts slow, ends fast, and is monotonically non-increasing', () => {
    expect(spinUpCooldown(0, cfg)).toBeCloseTo(0.14, 5); // cold start = slow
    expect(spinUpCooldown(0.9, cfg)).toBeCloseTo(0.045, 5); // fully spun = fast
    expect(spinUpCooldown(0.45, cfg)).toBeCloseTo((0.14 + 0.045) / 2, 5); // halfway

    let prev = Infinity;
    for (let t = 0; t <= 1.2; t += 0.1) {
      const cd = spinUpCooldown(t, cfg);
      expect(cd).toBeLessThanOrEqual(prev + 1e-9);
      prev = cd;
    }
  });

  it('clamps outside [0, rampTime] and treats rampTime 0 as instant', () => {
    expect(spinUpCooldown(5, cfg)).toBe(0.045); // past full spin → stays fast
    expect(spinUpCooldown(-1, cfg)).toBe(0.14); // negative held → clamps to start
    expect(spinUpCooldown(0, { startCd: 0.1, endCd: 0.03, rampTime: 0 })).toBe(0.03);
  });
});
