// =====================================================================
// bosses/mushroom.js — the MUSHROOM boss behavior 🍄 (Caden's pick).
//
//   P1 — spore spit: a slow, fat aimed cone (reads as drifting gas).
//   P2 — spore ring: telegraphed, with a guaranteed seeded dodge GAP.
//   P3 — poison pools: telegraphed lingering ground zones at your feet
//        (systems/hazards.js).
//   P4 — puffball spawns: HP-gated (puffballTarget); each pops into a small
//        poison pool when it dies.
// Same conventions as the spider (telegraph via the shell's `charge` scale,
// seeded RNG so rings/spawns/gaps stay reproducible).
// =====================================================================

import { buildMushroomMesh } from '../mushroomMesh.js';
import { loadAnimated } from '../../core/animModel.js';
import { puffballTarget } from '../../core/progression.js';
import { topUpMinions } from '../enemies.js';
import { aimedBurst, telegraphedRing, fireAngles } from './patterns.js';
import { gapRing } from './emitters.js';

// P2 signature: a spore ring with a GUARANTEED seeded dodge gap (distinct lane).
function fireSporeRing(boss, game) {
  boss.phase += 0.3;
  const n = boss.ringCount;
  const gapStart = game.rng.int(n); // seeded dodge lane (deterministic, testable)
  const angles = gapRing(n, gapStart, boss.cfg.ringGap, boss.phase);
  fireAngles(boss, game, angles, boss.cfg.ringBulletSpeed, 0.15);
}

export const mushroom = {
  name: 'The Mushroom King',
  title: 'Sovereign of the Fungal Depths',
  roar: 'bossRoar',

  buildMesh(boss, palette) {
    const a = loadAnimated('mushroom', boss.radius * 3); // imposing "King"
    if (a) return { mesh: a.wrap, anim: a.anim };
    const built = buildMushroomMesh(boss.radius, palette || {});
    return { mesh: built.group, cap: built.cap };
  },

  init(boss) {
    boss.p1Timer = boss.cfg.p1Interval;
    boss.p2Timer = boss.cfg.p2Interval;
    boss.poolTimer = boss.cfg.poolInterval;
    boss.spawnTimer = boss.cfg.spawnInterval;
    boss.ringCount = Math.round(boss.cfg.ringBullets * boss.diff);
  },

  attacks(boss, dt, game, p, rage) {
    const cfg = boss.cfg;
    aimedBurst(boss, dt, game, p, rage); // P1 — slow spore spit
    telegraphedRing(boss, dt, game, fireSporeRing); // P2 — spore ring (seeded dodge gap)

    // P3 — drop a lingering poison pool at a player's feet (the pool telegraphs itself)
    boss.poolTimer -= dt;
    if (boss.poolTimer <= 0) {
      boss.poolTimer = cfg.poolInterval / rage;
      const tp = game.nearestPlayer(boss.x, boss.z) || p;
      if (tp && tp.alive) {
        game.hazards.spawn(tp.x, tp.z, {
          radius: cfg.poolRadius,
          warnTime: cfg.poolWarn,
          liveTime: cfg.poolLive,
          damage: cfg.poolDamage,
        });
      }
    }
  },

  // P4 — keep the HP-gated number of puffballs alive (pop into a pool on death)
  spawns(boss, dt, game) {
    boss.spawnTimer -= dt;
    if (boss.spawnTimer > 0) return;
    boss.spawnTimer = boss.cfg.spawnInterval;
    // each puffball pops into a small poison pool where it dies (per-boss extra)
    topUpMinions(
      boss,
      game,
      puffballTarget(boss.hp / boss.maxHp),
      'isPuffball',
      { puff: 0x7aa030 },
      (pf) => {
        pf.onDeath = (e, g) =>
          g.hazards.spawn(e.x, e.z, {
            radius: boss.cfg.puffPoolRadius,
            warnTime: 0.4,
            liveTime: boss.cfg.poolLive,
            damage: boss.cfg.poolDamage,
          });
      },
    );
  },

  animate(boss) {
    // breathe the cap (procedural mesh only; the GLB plays its own Walk clip)
    if (boss.cap) {
      const e = Math.sin(boss.t * 3) * 0.06;
      boss.cap.scale.set(1 + e, 1 - e * 0.5, 1 + e);
    }
  },
};
