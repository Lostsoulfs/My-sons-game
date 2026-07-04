// =====================================================================
// bosses/enforcer.js — the ENFORCER boss behavior. 🤖
//
// The government's Atomic-Age WAR-MACHINE — the new FINAL boss. A slow, heavy
// tank that barrages you. Three ATTACK PATTERNS (the co-designer's card; P# is a
// pattern, not a health phase):
//   P1 — tracking chin-cannon burst (aimed)
//   P2 — telegraphed sweeping gap-ring barrage (always a rotating dodge lane)
//   P3 — periodic suppressive strafe (a wide fan you sidestep)
// Loads a CC0 GLB when config.MODELS.enforcer is set; else a procedural mesh.
// =====================================================================

import { loadAnimated } from '../../core/animModel.js';
import { buildEnforcerMesh } from '../enforcerMesh.js';
import { aimedBurst, telegraphedRing, fireAngles } from './patterns.js';
import { gapRing, nWay } from './emitters.js';
import { normalize } from '../../core/math2d.js';

// P2 — a telegraphed ROTATING gap-ring: a dense sweep that always leaves one dodge
// lane, and the lane walks around the ring each volley so you have to keep moving.
function fireBarrage(boss, game) {
  boss.phase += 0.5;
  const gapStart = Math.floor(boss.phase * 2) % boss.ringCount;
  const angles = gapRing(boss.ringCount, gapStart, boss.cfg.ringGap, boss.phase);
  fireAngles(boss, game, angles, boss.cfg.ringBulletSpeed, 0.2);
}

export const enforcer = {
  name: 'The Enforcer',
  roar: 'bossRoar',

  buildMesh(boss, palette) {
    const a = loadAnimated('enforcer', boss.radius * 2); // CC0 GLB when config.MODELS.enforcer is set
    if (a) return { mesh: a.wrap, anim: a.anim };
    const built = buildEnforcerMesh(boss.radius, palette || {});
    boss.parts = built; // keep refs for the procedural animation below
    return { mesh: built.group };
  },

  init(boss) {
    boss.p1Timer = boss.cfg.p1Interval;
    boss.p2Timer = boss.cfg.p2Interval;
    boss.p3Timer = boss.cfg.p3Interval;
    boss.ringCount = Math.round(boss.cfg.ringBullets * boss.diff); // denser barrage deeper in
  },

  attacks(boss, dt, game, p, rage) {
    aimedBurst(boss, dt, game, p, rage); // P1 — tracking chin cannon
    telegraphedRing(boss, dt, game, fireBarrage); // P2 — telegraphed sweeping gap-ring

    // P3 — suppressive strafe: a wide directional fan you dodge by strafing
    boss.p3Timer -= dt;
    if (boss.p3Timer <= 0) {
      const aim = normalize(p.x - boss.x, p.z - boss.z);
      const base = Math.atan2(aim.x, aim.z);
      fireAngles(
        boss,
        game,
        nWay(base, boss.cfg.p3Count, boss.cfg.p3SpreadRad),
        boss.cfg.p3BulletSpeed,
        0.12,
      );
      boss.p3Timer = boss.cfg.p3Interval / rage;
    }
  },

  // procedural-only (a GLB plays its own clip): scan the turret, pulse the eye
  animate(boss) {
    const parts = boss.parts;
    if (!parts) return;
    parts.turret.rotation.y = Math.sin(boss.t * 0.7) * 0.9; // menacing scanning sweep
    const charging = boss.charge > 0;
    const pulse = charging ? 1.3 + 0.2 * Math.sin(boss.t * 20) : 1 + 0.1 * Math.sin(boss.t * 4);
    parts.eye.scale.setScalar(pulse); // eye flares while it winds up an attack
  },
};
