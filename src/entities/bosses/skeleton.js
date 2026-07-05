// =====================================================================
// bosses/skeleton.js — RATTLEBONES 💀, the skeleton boss (Expansion 6 Stage 4).
//
//   P1 — bone throw: a quick aimed volley of bone bolts.
//   P2 — scatter ring: a rattle wind-up, then a ring of bones at seeded
//        jittered angles (the "scatter" — still has gaps to slip through).
//   P3 — reassemble & relocate: it COLLAPSES (invulnerable + intangible),
//        vanishes for a beat (your free breather), then reforms far from you.
//   P4 — boneling summons: HP-gated (skeletonWaveTarget(); the summoner raises
//        a bigger wave than the spider/mushroom as it weakens).
//
// All feel-numbers live in config.BOSS.skeleton (data-driven, ADR-0014); the
// i-frame flag (boss.invuln) is handled by the generic Boss shell.
// =====================================================================

import { ARENA } from '../../config.js';
import { loadAnimated } from '../../core/animModel.js';
import { buildSkeletonMesh } from '../skeletonMesh.js';
import { skeletonWaveTarget } from '../../core/progression.js';
import { topUpMinions } from '../enemies.js';
import { aimedBurst, telegraphedRing, fireAngles } from './patterns.js';
import { jitterRing } from './emitters.js';
import { normalize } from '../../core/math2d.js';
import { slideOutOfWalls, clampToArena } from '../../systems/collision.js';
import * as audio from '../../systems/audio.js';

const POOF = 18; // particle puff on vanish/reform (cosmetic, like other death/spawn puffs)

// P2 signature: an even ring + a seeded per-bone jitter = a "scatter" (still has
// gaps; deterministic/testable via game.rng).
function fireScatterRing(boss, game) {
  boss.phase += 0.3;
  const angles = jitterRing(boss.ringCount, boss.cfg.scatterJitter, game.rng.next, boss.phase);
  fireAngles(boss, game, angles, boss.cfg.ringBulletSpeed, 0.18);
}

/** pick a relocate spot far from every living player (seeded; honors teleportMargin) */
function teleportSpot(boss, game) {
  const hw = ARENA.width / 2 - 3;
  const hd = ARENA.depth / 2 - 3;
  let best = { x: 0, z: -hd };
  let bestD = -1;
  for (let t = 0; t < 8; t++) {
    const x = game.rng.range(-hw, hw);
    const z = game.rng.range(-hd, hd);
    let minD = Infinity;
    for (const pl of game.players) {
      if (!pl.alive) continue;
      minD = Math.min(minD, Math.hypot(pl.x - x, pl.z - z));
    }
    if (minD > bestD) {
      bestD = minD;
      best = { x, z };
    }
    if (minD >= boss.cfg.teleportMargin) break; // far enough, stop early
  }
  // push out of any rubble it landed in, then clamp (same order as move())
  const q = slideOutOfWalls(best.x, best.z, boss.radius, game.walls);
  return clampToArena(q.x, q.z, boss.radius);
}

export const skeleton = {
  name: 'Rattlebones',
  title: 'Marshal of the Catacombs',
  roar: 'bossRoar',

  buildMesh(boss, palette) {
    const a = loadAnimated('skeleton', boss.radius * 2.6);
    if (a) return { mesh: a.wrap, anim: a.anim };
    const built = buildSkeletonMesh(boss.radius, palette || {});
    boss.skull = built.skull;
    return { mesh: built.group };
  },

  init(boss) {
    boss.p1Timer = boss.cfg.p1Interval;
    boss.p2Timer = boss.cfg.p2Interval;
    boss.spawnTimer = boss.cfg.spawnInterval;
    boss.reassembleTimer = boss.cfg.reassembleInterval;
    boss.ringCount = Math.round(boss.cfg.ringBullets * boss.diff);
    boss._reassembling = false;
  },

  // scuttle toward the player, but periodically pull the disappear-and-reform trick
  move(boss, dt, game, p, rage) {
    const cfg = boss.cfg;

    // mid-reassemble: stand gone & intangible, count down, then reform far away
    if (boss._reassembling) {
      boss.reassembleTimer -= dt;
      if (boss.reassembleTimer <= 0) {
        const spot = teleportSpot(boss, game);
        boss.x = spot.x;
        boss.z = spot.z;
        boss._reassembling = false;
        boss.invuln = false;
        boss.mesh.visible = true;
        game.particles.burst(boss.x, boss.z, POOF, boss.palette?.eye ?? 0x9bff6a);
        audio.play('bossRoar');
        boss.reassembleTimer = cfg.reassembleInterval;
      }
      return;
    }

    const dir = normalize(p.x - boss.x, p.z - boss.z);
    boss.x += dir.x * boss.speed * rage * dt;
    boss.z += dir.z * boss.speed * rage * dt;
    let q = slideOutOfWalls(boss.x, boss.z, boss.radius, game.walls);
    q = clampToArena(q.x, q.z, boss.radius);
    boss.x = q.x;
    boss.z = q.z;
    boss.mesh.rotation.y = Math.atan2(dir.x, dir.z);

    boss.reassembleTimer -= dt;
    if (boss.reassembleTimer <= 0) {
      boss._reassembling = true;
      boss.invuln = true; // i-frames + intangible (shell handles both)
      boss.mesh.visible = false;
      game.particles.burst(boss.x, boss.z, POOF, boss.palette?.eye ?? 0x9bff6a);
      audio.play('bossRattle');
      boss.reassembleTimer = cfg.reassembleTime; // gone for this long (your breather)
    }
  },

  attacks(boss, dt, game, p, rage) {
    if (boss._reassembling) return; // it's gone — no attacks while reforming
    aimedBurst(boss, dt, game, p, rage); // P1 — aimed bone-bolt volley
    telegraphedRing(boss, dt, game, fireScatterRing, 'bossRattle'); // P2 — scatter ring
  },

  // P4 — keep the HP-gated number of bonelings alive
  spawns(boss, dt, game) {
    if (boss._reassembling) return; // it's gone — no summoning while reforming
    boss.spawnTimer -= dt;
    if (boss.spawnTimer > 0) return;
    boss.spawnTimer = boss.cfg.spawnInterval;
    topUpMinions(boss, game, skeletonWaveTarget(boss.hp / boss.maxHp), 'isBoneling', {
      dist: boss.cfg.spawnDist,
      scale: boss.cfg.bonelingScale,
      hp: boss.cfg.bonelingHp,
      puff: boss.palette?.eye ?? 0x9bff6a,
    });
  },

  animate(boss) {
    if (boss.skull) boss.skull.rotation.z = Math.sin(boss.t * 4) * 0.08; // skull sway (fallback)
  },
};
