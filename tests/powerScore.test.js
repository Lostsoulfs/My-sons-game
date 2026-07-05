import { describe, it, expect } from 'vitest';
import {
  effectiveCooldown,
  burstDPS,
  accuracy,
  rangeFactor,
  targetCount,
  alphaFactor,
  perShotDamage,
  powerScore,
  tierForScore,
} from '../src/core/powerScore.js';
import { dutyBallistic, dutyEnergy, weaponDuty } from '../src/core/duty.js';
import { POWER_SCORE } from '../src/config.js';

// CP3 (ADR-0036): focused unit coverage of the PURE power-budget model. The roster-level contract
// lives in weaponEconomy.test.js; these lock the non-obvious per-function behavior (the ones that
// bit during tuning: charge fires on its charge-time not its base cooldown; a spun-up minigun is
// scored at its wound-up cadence; alpha credit is AoE-only; energy duty=1 when it can't overheat).

describe('effectiveCooldown', () => {
  it('a full charge takes charge-time + cooldown, not the base cooldown', () => {
    expect(effectiveCooldown({ charge: { maxTime: 0.8 }, cooldown: 0.12 })).toBeCloseTo(0.92);
  });
  it('a spun-up gun is scored at its wound-up END cadence', () => {
    expect(effectiveCooldown({ spinUp: { startCd: 0.14, endCd: 0.045 } })).toBe(0.045);
  });
  it('an orbital uses its per-enemy hit cooldown', () => {
    expect(effectiveCooldown({ orbital: true, hitCooldown: 0.4 })).toBe(0.4);
  });
});

describe('burstDPS', () => {
  it('a plain gun = damage × pellets / cooldown', () => {
    expect(burstDPS({ damage: 2, pellets: 3, cooldown: 0.5 })).toBeCloseTo(12);
  });
  it('a charge amortizes its big shot over the charge time', () => {
    expect(burstDPS({ charge: { maxDamage: 7, maxTime: 0.8 }, cooldown: 0.12 })).toBeCloseTo(
      7.6,
      1,
    );
  });
  it('a spun-up minigun is valued at its wound-up rate, not its slow start', () => {
    const mg = { damage: 1, pellets: 1, cooldown: 0.14, spinUp: { startCd: 0.14, endCd: 0.045 } };
    expect(burstDPS(mg)).toBeCloseTo(1 / 0.045, 1); // ~22, not 1/0.14 ~7
  });
});

describe('accuracy', () => {
  it('multi-pellet spread is coverage, not a penalty (factor 1)', () => {
    expect(accuracy(40, 6)).toBe(1);
  });
  it('a pin-point single-pellet gun is perfect', () => {
    expect(accuracy(0, 1)).toBe(1);
  });
  it('wide single-pellet spray never falls below the floor', () => {
    expect(accuracy(9999, 1)).toBeGreaterThanOrEqual(POWER_SCORE.ACC_FLOOR);
    expect(accuracy(9999, 1)).toBeCloseTo(POWER_SCORE.ACC_FLOOR, 1);
  });
});

describe('rangeFactor', () => {
  it('is monotonic and asymptotes between BASE and BASE+GAIN', () => {
    const slow = rangeFactor(16);
    const fast = rangeFactor(46);
    expect(fast).toBeGreaterThan(slow);
    expect(slow).toBeGreaterThan(POWER_SCORE.RANGE_BASE);
    expect(fast).toBeLessThan(POWER_SCORE.RANGE_BASE + POWER_SCORE.RANGE_GAIN);
  });
});

describe('targetCount (crowd reach, capped at CROWD_N)', () => {
  it('a single-target gun hits one', () => {
    expect(targetCount({ damage: 1 })).toBe(1);
  });
  it('pierce and big AoE are capped at CROWD_N', () => {
    expect(targetCount({ pierce: 8 })).toBe(POWER_SCORE.CROWD_N);
    expect(targetCount({ explosive: true, explodeRadius: 8 })).toBe(POWER_SCORE.CROWD_N);
  });
});

describe('alphaFactor (AoE-only burst credit)', () => {
  it('is exactly 1 for a non-explosive gun — even a big piercing charge shot', () => {
    expect(alphaFactor({ charge: { maxDamage: 7, pierce: 3 } })).toBe(1);
    expect(alphaFactor({ damage: 4, pierce: 3 })).toBe(1);
  });
  it('credits a heavy AoE nuke above 1, and more damage → more credit', () => {
    const small = alphaFactor({ damage: 4, explosive: true, explodeRadius: 4 });
    const nuke = alphaFactor({ damage: 11, explosive: true, explodeRadius: 8 });
    expect(nuke).toBeGreaterThan(small);
    expect(small).toBeGreaterThanOrEqual(1);
  });
  it('is capped (never exceeds 1 + GAIN·CAP)', () => {
    const huge = alphaFactor({ damage: 999, explosive: true, explodeRadius: 40 });
    expect(huge).toBeCloseTo(1 + POWER_SCORE.ALPHA_GAIN * POWER_SCORE.ALPHA_CAP);
  });
  it('perShotDamage reads a full charge as its max, else damage × pellets', () => {
    expect(perShotDamage({ charge: { maxDamage: 7 } })).toBe(7);
    expect(perShotDamage({ damage: 2, pellets: 3 })).toBe(6);
  });
});

describe('duty cycle', () => {
  it('ballistic: reload downtime pulls duty below 1', () => {
    expect(dutyBallistic(8, 0.1, 1.0)).toBeCloseTo(0.8 / 1.8, 3);
  });
  it('energy: cools faster than it heats → never overheats → duty 1', () => {
    expect(dutyEnergy(0.2, { heatPerShot: 0.05, coolRatePerSec: 0.5, resetHeat: 0.25 })).toBe(1);
  });
  it('energy: net positive heat → a real overheat downtime → duty < 1', () => {
    const d = dutyEnergy(0.2, { heatPerShot: 0.2, coolRatePerSec: 0.5, resetHeat: 0.25 });
    expect(d).toBeLessThan(1);
    expect(d).toBeGreaterThan(0);
  });
  it('weaponDuty routes by limiter kind and is 1 for a limiter-less weapon', () => {
    expect(weaponDuty(0.1, { reload: { clipSize: 8, reloadTime: 1 } })).toBeCloseTo(0.8 / 1.8, 3);
    expect(weaponDuty(0.4, undefined)).toBe(1);
  });
});

describe('tierForScore band lookup', () => {
  it('maps scores into the config bands, open at the top', () => {
    expect(tierForScore(0)).toBe('common');
    expect(tierForScore(8)).toBe('rare');
    expect(tierForScore(12)).toBe('epic');
    expect(tierForScore(999)).toBe('ultra');
  });
});

describe('powerScore integration (a nuke beats a pop-gun)', () => {
  it('combines every factor into one positive scalar, ordered sensibly', () => {
    const popgun = powerScore(
      { damage: 1, cooldown: 0.26, bulletSpeed: 24 },
      {
        reload: { clipSize: 8, reloadTime: 1 },
      },
    );
    const nuke = powerScore(
      { damage: 11, cooldown: 1.6, bulletSpeed: 16, explosive: true, explodeRadius: 8 },
      { reload: { clipSize: 2, reloadTime: 2.4 } },
    );
    expect(popgun).toBeGreaterThan(0);
    expect(nuke).toBeGreaterThan(popgun);
  });
});
