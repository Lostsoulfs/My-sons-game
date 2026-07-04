import { describe, it, expect } from 'vitest';
import { MAP, WEAPONS, PROGRESSION } from '../src/config.js';

// Config invariant tests for WEAPONS and PROGRESSION.
// Pattern ported from the config harness in Lost-secuirty/Demo-math-slot-test-only.
// These catch misconfigured entries (e.g. a weapon added with zero cooldown or
// a negative damage) before they reach gameplay — no game instance needed.

describe('WEAPONS config invariants', () => {
  const entries = Object.entries(WEAPONS);

  it('every weapon has a positive damage', () => {
    for (const [name, w] of entries) {
      expect(w.damage, `${name}.damage`).toBeGreaterThan(0);
    }
  });

  it('every non-orbital weapon has a positive cooldown', () => {
    for (const [name, w] of entries) {
      if (w.orbital) continue;
      expect(w.cooldown, `${name}.cooldown`).toBeGreaterThan(0);
    }
  });

  it('every non-orbital weapon has at least 1 pellet and a positive bullet speed', () => {
    for (const [name, w] of entries) {
      if (w.orbital) continue;
      expect(w.pellets, `${name}.pellets`).toBeGreaterThanOrEqual(1);
      expect(w.bulletSpeed, `${name}.bulletSpeed`).toBeGreaterThan(0);
    }
  });

  it('spreadDeg is in [0, 360) for every weapon that has it', () => {
    for (const [name, w] of entries) {
      if (w.spreadDeg == null) continue;
      expect(w.spreadDeg, `${name}.spreadDeg`).toBeGreaterThanOrEqual(0);
      expect(w.spreadDeg, `${name}.spreadDeg`).toBeLessThan(360);
    }
  });

  it('explosive weapons have a positive explodeRadius', () => {
    for (const [name, w] of entries) {
      if (!w.explosive) continue;
      expect(w.explodeRadius, `${name}.explodeRadius`).toBeGreaterThan(0);
    }
  });

  it('charge cannon has valid min/max damage ordering and a positive maxTime', () => {
    const { charge } = WEAPONS.charge;
    expect(charge.minDamage).toBeGreaterThan(0);
    expect(charge.maxDamage).toBeGreaterThan(charge.minDamage);
    expect(charge.maxTime).toBeGreaterThan(0);
  });

  it('orbital blade has positive orbit radius, spin, damage, and hitCooldown', () => {
    const orb = WEAPONS.orbital;
    expect(orb.orbital).toBe(true);
    expect(orb.count).toBeGreaterThan(0);
    expect(orb.radius).toBeGreaterThan(0);
    expect(orb.spin).toBeGreaterThan(0);
    expect(orb.damage).toBeGreaterThan(0);
    expect(orb.hitCooldown).toBeGreaterThan(0);
  });

  it('homing weapon has a positive turnRate', () => {
    expect(WEAPONS.homing.turnRate).toBeGreaterThan(0);
  });

  it('spin-up weapons ramp from a slower startCd down to a faster endCd > 0', () => {
    for (const [name, w] of entries) {
      if (!w.spinUp) continue;
      expect(w.spinUp.startCd, `${name}.spinUp.startCd`).toBeGreaterThan(w.spinUp.endCd);
      expect(w.spinUp.endCd, `${name}.spinUp.endCd`).toBeGreaterThan(0);
      expect(w.spinUp.rampTime, `${name}.spinUp.rampTime`).toBeGreaterThan(0);
    }
  });
});

describe('PROGRESSION config invariants', () => {
  it('the connected-map knobs are sane (ADR-0032 replaced roomsPerFloor)', () => {
    expect(MAP.baseRooms).toBeGreaterThan(1);
    expect(MAP.maxRooms).toBeGreaterThanOrEqual(MAP.baseRooms);
    expect(MAP.rejectChance).toBeGreaterThan(0);
    expect(MAP.rejectChance).toBeLessThan(1);
    expect(MAP.gridSize * MAP.gridSize).toBeGreaterThan(MAP.maxRooms); // grid never the bottleneck
  });

  it('there is at least one floor', () => {
    expect(PROGRESSION.floors.length).toBeGreaterThan(0);
  });

  it('every floor has a non-empty name and boss type', () => {
    for (const floor of PROGRESSION.floors) {
      expect(typeof floor.name, `floor name`).toBe('string');
      expect(floor.name.length).toBeGreaterThan(0);
      expect(typeof floor.boss, `floor boss`).toBe('string');
      expect(floor.boss.length).toBeGreaterThan(0);
    }
  });

  it('no two floors share the same boss type', () => {
    const types = PROGRESSION.floors.map((f) => f.boss);
    expect(new Set(types).size).toBe(types.length);
  });

  it('optional diffMul, when present, is a positive number', () => {
    for (const floor of PROGRESSION.floors) {
      if (floor.diffMul == null) continue;
      expect(floor.diffMul).toBeGreaterThan(0);
    }
  });
});
