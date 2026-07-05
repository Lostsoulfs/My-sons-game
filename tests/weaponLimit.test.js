import { describe, it, expect } from 'vitest';
import { initClip, tickReload, fireRound, canFireClip } from '../src/core/reload.js';
import { initHeat, coolHeat, addHeat, canFireHeat } from '../src/core/heat.js';

describe('reload (ballistic magazine)', () => {
  const cfg = { clipSize: 5, reloadTime: 1.2 };

  it('starts full and ready', () => {
    const s = initClip(cfg);
    expect(s.ammo).toBe(5);
    expect(s.reloading).toBe(false);
    expect(canFireClip(s)).toBe(true);
  });

  it('firing the last round starts a reload and blocks firing', () => {
    let s = initClip(cfg);
    for (let i = 0; i < 4; i++) s = fireRound(s, cfg); // 5 → 1
    expect(s.ammo).toBe(1);
    expect(canFireClip(s)).toBe(true);
    s = fireRound(s, cfg); // 1 → 0 → reload
    expect(s.ammo).toBe(0);
    expect(s.reloading).toBe(true);
    expect(s.reloadT).toBeCloseTo(1.2);
    expect(canFireClip(s)).toBe(false); // can't fire mid-reload
  });

  it('a reload completes after reloadTime and refills the clip', () => {
    let s = { ammo: 0, reloading: true, reloadT: 1.2 };
    // tick most of the way — still reloading
    for (let i = 0; i < 70; i++) s = tickReload(s, 1 / 60, cfg); // ~1.167s
    expect(s.reloading).toBe(true);
    expect(canFireClip(s)).toBe(false);
    // finish it
    for (let i = 0; i < 5; i++) s = tickReload(s, 1 / 60, cfg);
    expect(s.reloading).toBe(false);
    expect(s.ammo).toBe(5);
    expect(canFireClip(s)).toBe(true);
  });

  it('tickReload is a no-op while not reloading', () => {
    const s = initClip(cfg);
    expect(tickReload(s, 0.5, cfg)).toBe(s); // same reference — untouched
  });

  it('duty cycle: full clip + reload restores exactly one full clip', () => {
    let s = initClip(cfg);
    for (let i = 0; i < 5; i++) s = fireRound(s, cfg); // empty → reloading
    let t = 0;
    while (s.reloading && t < 5) {
      s = tickReload(s, 1 / 60, cfg);
      t += 1 / 60;
    }
    expect(s.ammo).toBe(5);
    expect(t).toBeGreaterThanOrEqual(1.2); // took at least the reloadTime
  });
});

describe('heat (energy overheat)', () => {
  const cfg = { heatPerShot: 0.2, coolRatePerSec: 0.4, resetHeat: 0.3 };

  it('starts cool and ready', () => {
    const s = initHeat();
    expect(s.heat).toBe(0);
    expect(s.overheated).toBe(false);
    expect(canFireHeat(s)).toBe(true);
  });

  it('hosing (fire faster than it cools) overheats and latches a forced cooldown', () => {
    let s = initHeat();
    // net +~0.19 heat per shot-frame (add 0.2, bleed ~0.007) → overheats within ~6 shots
    for (let i = 0; i < 8; i++) {
      s = coolHeat(s, 1 / 60, cfg); // one frame of cooling per shot (cd tiny)
      s = addHeat(s, cfg);
    }
    expect(s.heat).toBe(1);
    expect(s.overheated).toBe(true);
    expect(canFireHeat(s)).toBe(false);
  });

  it('an overheated gauge stays locked until it bleeds back under resetHeat', () => {
    let s = { heat: 1, overheated: true };
    // cool a bit — still above resetHeat 0.3 → still locked
    for (let i = 0; i < 60; i++) s = coolHeat(s, 1 / 60, cfg); // ~0.4 bled → heat ~0.6
    expect(s.overheated).toBe(true);
    expect(canFireHeat(s)).toBe(false);
    // cool the rest of the way under 0.3 → unlatches
    for (let i = 0; i < 90; i++) s = coolHeat(s, 1 / 60, cfg);
    expect(s.heat).toBeLessThanOrEqual(cfg.resetHeat);
    expect(s.overheated).toBe(false);
    expect(canFireHeat(s)).toBe(true);
  });

  it('feathering (a shot every ~1s) never overheats — the skill seam', () => {
    let s = initHeat();
    for (let shot = 0; shot < 20; shot++) {
      s = addHeat(s, cfg); // +0.2
      for (let f = 0; f < 60; f++) s = coolHeat(s, 1 / 60, cfg); // 1s of cooling = -0.4
      expect(s.overheated).toBe(false); // heat can never climb: +0.2 then −0.4 each cycle
    }
    expect(s.heat).toBe(0);
  });

  it('heat never goes negative or above 1', () => {
    let s = initHeat();
    for (let i = 0; i < 200; i++) s = coolHeat(s, 1, cfg); // over-cool
    expect(s.heat).toBe(0);
    for (let i = 0; i < 200; i++) s = addHeat(s, cfg); // over-heat
    expect(s.heat).toBe(1);
  });
});
