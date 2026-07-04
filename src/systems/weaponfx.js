// =====================================================================
// weaponfx.js — pooled weapon "juice": muzzle flashes, bullet tracer/energy
// trails, and impact sparks/scorch. Bright energy FX cross the bloom threshold
// (config.GRAPHICS.bloom, ADR-0025) so they GLOW. Everything is pool-backed (no
// per-shot allocation) and gated by GRAPHICS.vfx + the reducedEffects setting, so
// it's free to dial off on low-end machines.
//
// Two orthogonal axes drive the look (the design principle for this game):
//   FLAVOR = fx.kind — ballistic (warm tracer + spark) vs energy (glow bolt/beam)
//   RARITY = fxIntensity — scales size / brightness / spark counts
//
// Reuses the shared particle pool (systems/particles.js) for bursts; adds ONE
// fixed pool of stretched "streak" segments for the per-bullet trails + muzzle.
// =====================================================================

import * as THREE from 'three';
import { GRAPHICS } from '../config.js';
import { settings } from './settings.js';

const BALLISTIC_TRAIL = 0xffd27a; // warm lead tracer
const FLY_H = 1.0; // bullets fly at y ~= 1
const BARREL = 0.7; // muzzle offset out from the shooter's center

export class WeaponFX {
  constructor(scene, particles) {
    this.particles = particles; // reuse the blood/spark pool for bursts
    const pool = GRAPHICS.vfx?.trail?.pool ?? 160;
    const geo = new THREE.BoxGeometry(1, 1, 1); // shared; scaled per streak
    this.streaks = [];
    for (let i = 0; i < pool; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending, // layer + glow (bloom catches the bright ones)
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      scene.add(mesh);
      this.streaks.push({ mesh, mat, life: 0, maxLife: 1 });
    }
    this._next = 0;
  }

  _on() {
    return GRAPHICS.vfx?.enabled !== false && !settings.get('reducedEffects');
  }

  // O(1) round-robin: overwrite the oldest slot. Streaks are short-lived, so when the
  // pool saturates (a machinegun/minigun hose) trails just get shorter — graceful decimation.
  _grab() {
    const s = this.streaks[this._next];
    this._next = (this._next + 1) % this.streaks.length;
    return s;
  }

  // one short bright segment along `dir` — the primitive behind trails + the muzzle flash.
  _streak(x, z, dir, color, width, length, life) {
    const s = this._grab();
    s.mat.color.setHex(color);
    s.mat.opacity = 1;
    s.life = life;
    s.maxLife = life;
    const m = s.mesh;
    m.position.set(x - dir.x * length * 0.5, FLY_H, z - dir.z * length * 0.5); // trails behind
    m.rotation.y = Math.atan2(dir.x, dir.z); // local +Z = travel direction (bullet convention)
    m.scale.set(width, width, length);
    m.visible = true;
  }

  /** muzzle flash + a couple sparks at the barrel when a shot fires. */
  muzzle(x, z, dir, fx, intensity = 1) {
    if (!this._on() || !dir || (dir.x === 0 && dir.z === 0)) return;
    const energy = fx && fx.kind === 'energy';
    const mcfg = GRAPHICS.vfx?.muzzle || {};
    const bx = x + dir.x * BARREL;
    const bz = z + dir.z * BARREL;
    const color = energy ? (fx.color ?? 0x9effe0) : (mcfg.color ?? 0xffe0a0);
    const life = (GRAPHICS.vfx?.trail?.life ?? 0.09) * 1.3;
    this._streak(bx, bz, dir, color, 0.28 * intensity, 1.1 * intensity, life);
    if (this.particles) {
      this.particles.burst(bx, bz, Math.max(1, Math.round((mcfg.sparks ?? 3) * intensity)), color);
    }
  }

  /** a per-frame tracer/energy trail behind a live bullet (called from bullets.update). */
  trailFor(b) {
    if (!this._on() || !b.fx || b.fx.trail === 'none') return;
    const speed = Math.hypot(b.vx, b.vz) || 1;
    const dir = { x: b.vx / speed, z: b.vz / speed };
    const t = GRAPHICS.vfx?.trail || {};
    const energy = b.fx.kind === 'energy';
    const beam = b.fx.trail === 'beam';
    const bolt = b.fx.trail === 'bolt';
    const inten = b.fxIntensity ?? 1;
    const color = energy ? (b.fx.color ?? this._bulletColor(b)) : BALLISTIC_TRAIL;
    const width = (t.width ?? 0.16) * (beam ? 1.5 : bolt ? 1.15 : 1) * inten;
    const length = (t.length ?? 0.9) * (beam ? 1.8 : 1) * (0.8 + inten * 0.4);
    this._streak(b.x, b.z, dir, color, width, length, (t.life ?? 0.09) * (energy ? 1.2 : 1));
  }

  _bulletColor(b) {
    const c = b.mesh && b.mesh.material && b.mesh.material.color;
    return c ? c.getHex() : 0x9effe0;
  }

  /** impact burst where a shot lands. kind ∈ 'wall' | 'enemy' | 'explode'. */
  impact(x, z, kind, fx, intensity = 1) {
    if (!this.particles) return;
    const vfx = GRAPHICS.vfx || {};
    if (kind === 'explode') {
      this.particles.burst(x, z, 26, 0xff7722); // the rocket blast (unconditional, as before)
      return;
    }
    if (!this._on() || vfx.impactSparks === false) return;
    const energy = fx && fx.kind === 'energy';
    const icfg = vfx.impact || {};
    const base = kind === 'enemy' ? (icfg.sparks ?? 5) : (vfx.sparkCount ?? 4);
    const color = energy ? (icfg.scorchColor ?? 0x88ffcc) : (vfx.sparkColor ?? 0xffd27a);
    this.particles.burst(x, z, Math.max(2, Math.round(base * intensity)), color);
  }

  update(dt) {
    for (const s of this.streaks) {
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.mesh.visible = false;
        s.mat.opacity = 0;
        continue;
      }
      s.mat.opacity = s.life / s.maxLife; // fade out; recycle when spent
    }
  }
}
