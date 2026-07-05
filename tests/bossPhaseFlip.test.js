import { describe, it, expect } from 'vitest';
import { BOSS, JUICE, FEEL } from '../src/config.js';
import { multiArmSpiral, layeredFlower, arc } from '../src/entities/bosses/emitters.js';

// ADR-0040 — HP-gated boss PHASE FLIPS wire the three shelved emitters (multiArmSpiral, layeredFlower,
// arc) onto a rage-phase pattern swap. These lock the config contract the Boss shell + behaviors read:
// breakpoints are DESCENDING and in (0,1), the rage patterns produce sane (bounded, dodgeable-count)
// shapes, and the shared flip-beat juice exists. Real dodge FEEL is verified live; this guards regressions.

describe('phase-flip config contract', () => {
  const flippers = Object.entries(BOSS).filter(([, c]) => c && c.phaseFlips);

  it('only the intended bosses opt in (enforcer, mushroom); floor-1 spider stays gentle', () => {
    expect(new Set(flippers.map(([t]) => t))).toEqual(new Set(['enforcer', 'mushroom']));
    expect(BOSS.spider.phaseFlips).toBeUndefined();
  });

  it('every phaseFlips list is DESCENDING and within (0,1) — the pendingFlips contract', () => {
    for (const [type, c] of flippers) {
      for (const bp of c.phaseFlips) {
        expect(bp, `${type} breakpoint`).toBeGreaterThan(0);
        expect(bp, `${type} breakpoint`).toBeLessThan(1);
      }
      const sorted = [...c.phaseFlips].sort((a, b) => b - a);
      expect(c.phaseFlips, `${type} must be descending`).toEqual(sorted);
    }
  });

  it('the shared flip-beat juice + flash are defined', () => {
    expect(JUICE.traumaOnPhaseFlip).toBeGreaterThan(0);
    expect(JUICE.hitStopOnPhaseFlip).toBeGreaterThan(0);
    expect(FEEL.screenFlash.phaseFlip).toMatchObject({
      peak: expect.any(Number),
      ms: expect.any(Number),
    });
  });
});

describe('enforcer overheat spiral (multiArmSpiral + arc)', () => {
  const c = BOSS.enforcer;

  it('phase-1 spiral is arms×perArm bullets; phase-2 adds an arm + the counter-arc', () => {
    const p1 = multiArmSpiral(c.spiralArms, c.spiralPerArm, 0, c.spiralStep);
    expect(p1).toHaveLength(c.spiralArms * c.spiralPerArm); // 3×3 = 9

    const p2 = multiArmSpiral(c.spiralArms + 1, c.spiralPerArm, 0, c.spiralStep).concat(
      arc(c.arcCount, 0, c.arcStep),
    );
    expect(p2).toHaveLength((c.spiralArms + 1) * c.spiralPerArm + c.arcCount); // 4×3 + 4 = 16
  });

  it('stays readable: modest bullet budget + slower than the base ring', () => {
    expect((c.spiralArms + 1) * c.spiralPerArm + c.arcCount).toBeLessThanOrEqual(18);
    expect(c.spiralBulletSpeed).toBeLessThanOrEqual(c.ringBulletSpeed); // slow = dodgeable
  });
});

describe('mushroom bloom (layeredFlower)', () => {
  const c = BOSS.mushroom;

  it('produces the two interleaved petal rings with a bounded total', () => {
    const petals = layeredFlower(
      c.flowerLayers,
      c.flowerBase,
      c.flowerPhaseStep,
      c.flowerCountStep,
    );
    // layer0 = base, layer1 = base + countStep  →  7 + 9 = 16
    let expected = 0;
    for (let L = 0; L < c.flowerLayers; L++) expected += c.flowerBase + L * c.flowerCountStep;
    expect(petals).toHaveLength(expected);
    expect(petals.length).toBeLessThanOrEqual(20); // kid-fair density ceiling
  });

  it('the densest petal ring is no tighter than a shipped gapless ring (spider ring = 8)', () => {
    const densest = c.flowerBase + (c.flowerLayers - 1) * c.flowerCountStep; // 9
    expect(densest).toBeLessThanOrEqual(BOSS.spider.ringBullets + 2);
  });
});
