// =====================================================================
// bosses/cat.js — WHISKER, the cat half of the duo. 🐱 A ranged ZONER.
//
// Whisker keeps its distance and circles you, firing telegraphed CROSS-SWIPES:
// arms of slow bullets in a "+", rotated 45° each volley so the next one is an
// "X" — easy to read, dodgeable through the gaps. While it's the PASSIVE partner
// (Fang is pouncing) it instead summons a small KITTEN litter to keep pressure.
//
// Pairs with bosses/dog.js under one DuoController (bosses/duo.js): only the
// aggressor swipes; the survivor enrages (and may both swipe AND summon) if Fang
// falls. Shares the beast mesh builder with dog.js.
// =====================================================================

import { buildBeastBoss } from './dog.js';
import { Enemy } from '../enemies.js';
import { star } from './emitters.js';
import { normalize, dist } from '../../core/math2d.js';
import { slideOutOfWalls, clampToArena } from '../../systems/collision.js';
import * as audio from '../../systems/audio.js';

/** a "+" / "X" of slow bullets; speeds staggered so each arm grows into a line */
function fireCrossSwipe(boss, game) {
  const arms = boss.cfg.swipeArms;
  const per = boss.cfg.swipeBullets;
  for (const ang of star(arms, boss.phase)) {
    const dx = Math.sin(ang);
    const dz = Math.cos(ang);
    for (let i = 1; i <= per; i++) {
      const shaped = boss.cfg.swipeSpeedBase + i * boss.cfg.swipeSpeedStep;
      game.bullets.spawnEnemy(boss.x, boss.z, dx, dz, boss.cfg.swipeBulletSpeed * shaped);
    }
  }
  boss.phase += Math.PI / arms; // rotate 45° -> the next volley lands as the "X"
  game.juice.addTrauma(game.JUICE.traumaOnCatSwipe);
}

export const cat = {
  name: 'Whisker',
  title: 'Wardens of the Kennels',
  roar: 'bossRoar',

  buildMesh(boss, palette) {
    return buildBeastBoss(boss, palette, 'cat', 'cat');
  },

  init(boss) {
    boss.swipeTimer = boss.cfg.swipeInterval;
    boss.kittenTimer = boss.cfg.kittenInterval;
    boss.phase = 0;
  },

  // zoner: hold preferred distance and strafe so it circles (overrides default move)
  move(boss, dt, game, p, rage) {
    const cfg = boss.cfg;
    const target = boss.duo ? boss.duo.chooseTarget(game.players, p) : p;
    const d = dist(boss.x, boss.z, target.x, target.z);
    const dir = normalize(target.x - boss.x, target.z - boss.z);
    const sign = d < cfg.preferredDist - 1 ? -1 : d > cfg.preferredDist + 1 ? 1 : 0;
    const perp = { x: -dir.z, z: dir.x }; // strafe sideways while keeping range
    const sw = cfg.preferredStrafe;
    boss.x += (dir.x * sign + perp.x * sw) * cfg.speed * rage * dt;
    boss.z += (dir.z * sign + perp.z * sw) * cfg.speed * rage * dt;
    let q = slideOutOfWalls(boss.x, boss.z, boss.radius, game.walls);
    q = clampToArena(q.x, q.z, boss.radius);
    boss.x = q.x;
    boss.z = q.z;
    if (dir.x || dir.z) boss.mesh.rotation.y = Math.atan2(dir.x, dir.z);
  },

  // cross-swipe (telegraphed) — only starts a new one while AGGRESSOR
  attacks(boss, dt, game) {
    const cfg = boss.cfg;
    if (boss.charge > 0) {
      boss.charge -= dt;
      if (boss.charge <= 0) {
        boss.charge = 0;
        fireCrossSwipe(boss, game);
      }
      return;
    }
    const canSwipe = boss.duo ? boss.duo.isAggressor(boss) : true;
    if (!canSwipe) return;
    boss.swipeTimer -= dt;
    if (boss.swipeTimer <= 0) {
      boss.charge = cfg.telegraph;
      audio.play('bossSwipe');
      boss.swipeTimer = cfg.swipeInterval / boss.rage;
    }
  },

  // kitten litter — summoned while PASSIVE (covers Fang's pounce); enraged solo cat too
  spawns(boss, dt, game) {
    const passive = boss.duo ? !boss.duo.isAggressor(boss) : false;
    if (!passive && !boss.enraged) return;
    boss.kittenTimer -= dt;
    if (boss.kittenTimer > 0) return;
    boss.kittenTimer = boss.cfg.kittenInterval;

    const cap = boss.cfg.kittenCap + (boss.enraged ? 1 : 0);
    const alive = game.enemies.filter((e) => e.isKitten && !e.dead).length;
    if (alive >= cap) return;

    const a = game.rng.next() * Math.PI * 2; // seeded (ADR-0013)
    const lx = boss.x + Math.cos(a) * boss.radius * 1.4;
    const lz = boss.z + Math.sin(a) * boss.radius * 1.4;
    game.particles.burst(lx, lz, 5, 0x8a8ad0); // little spawn puff (telegraph)
    const k = new Enemy(boss.scene, 'chaser', lx, lz, { boss: 'cat', palette: boss.palette });
    k.isKitten = true;
    k.mesh.scale.setScalar(0.6);
    k.radius *= 0.6;
    k.hp = 1;
    game.addEnemy(k);
  },

  animate(boss) {
    if (boss.beastParts?.tail) boss.beastParts.tail.rotation.z = Math.sin(boss.t * 5) * 0.4; // tail flick
  },
};
