// =====================================================================
// bosses/spider.js — the SPIDER boss behavior. 🕷️
//
// A behavior module (see boss.js): the generic Boss shell calls these hooks.
//   P1 — aimed burst (pistol mimic)
//   P2 — telegraphed bullet ring (denser on later floors)
//   P3 — HP-gated baby-spider spawns (spiderlingTarget)
// Extracted verbatim from the original boss.js so the spider plays identically.
// =====================================================================

import { getModel } from '../../core/assets.js';
import { buildSpiderMesh } from '../spiderMesh.js';
import { spiderlingTarget } from '../../core/progression.js';
import { topUpMinions } from '../enemies.js';
import { aimedBurst, telegraphedRing, fireAngles } from './patterns.js';
import { ring } from './emitters.js';

// P2 signature: a clean ROTATING ring (phase steps each volley → it corkscrews).
function fireRing(boss, game) {
  boss.phase += 0.35;
  fireAngles(boss, game, ring(boss.ringCount, boss.phase), boss.cfg.ringBulletSpeed, 0.15);
}

export const spider = {
  name: 'The Spider',
  title: 'Warden of the Outskirts',
  roar: 'bossRoar',

  buildMesh(boss, palette) {
    const model = getModel('spider');
    if (model) return { mesh: model, legs: [] };
    const built = buildSpiderMesh(boss.radius, palette || {});
    return { mesh: built.group, legs: built.legs };
  },

  init(boss) {
    boss.p1Timer = boss.cfg.p1Interval; // P1 base attack
    boss.p2Timer = boss.cfg.p2Interval; // P2 ring
    boss.spawnTimer = boss.cfg.spawnInterval; // P3
    boss.ringCount = Math.round(boss.cfg.ringBullets * boss.diff); // P2 denser on later floors
  },

  // P1 (aimed burst) + P2 (telegraphed bullet ring) — shared primitives (patterns.js)
  attacks(boss, dt, game, p, rage) {
    aimedBurst(boss, dt, game, p, rage);
    telegraphedRing(boss, dt, game, fireRing);
  },

  // P3 — keep the HP-gated number of baby spiders alive
  spawns(boss, dt, game) {
    boss.spawnTimer -= dt;
    if (boss.spawnTimer > 0) return;
    boss.spawnTimer = boss.cfg.spawnInterval;
    topUpMinions(boss, game, spiderlingTarget(boss.hp / boss.maxHp), 'isSpiderling');
  },

  animate(boss, rage) {
    const sp = 6 * rage;
    for (const leg of boss.legs) {
      const a = Math.sin(boss.t * sp + leg.offset) * 0.35;
      leg.thigh.rotation.x = a;
      if (leg.thigh.children[0]) leg.thigh.children[0].rotation.x = -a * 0.8;
    }
  },
};
