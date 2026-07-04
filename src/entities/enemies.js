// =====================================================================
// enemies.js — the monsters.
//
//   chaser  : runs straight at you and hurts you on contact.
//   shooter : keeps its distance and sprays rings of bullets (bullet-hell).
//
// Both bleed when hit and explode into blood when they die.
// =====================================================================

import * as THREE from 'three';
import { ENEMY, BULLET, PALETTE, PARTICLES, DIFFICULTY, FEEL, PICKUPS } from '../config.js';
import { hardnessFacet } from '../core/scaling.js';
import { getModel } from '../core/assets.js';
import { loadAnimated } from '../core/animModel.js';
import { buildSpiderMesh } from './spiderMesh.js';
import { buildMushroomMesh } from './mushroomMesh.js';
import { buildBeastMesh } from './beastMesh.js';
import { buildSkeletonMesh } from './skeletonMesh.js';
import { makeCharacter } from './characterMesh.js';
import { castShadows } from '../core/shadows.js';
import {
  slideOutOfWalls,
  clampToArena,
  advanceKnockback,
  applyKnockImpulse,
} from '../systems/collision.js';
import { normalize, dist, circleVsCircle } from '../core/math2d.js';
import { ring } from './bosses/emitters.js';
import * as audio from '../systems/audio.js';

// Returns { group, anim } — `anim` is an AnimModel for GLB-backed minions
// (whose mixer the Enemy advances each frame), else null.
function makeEnemyMesh(type, theme) {
  // themed mini-mushrooms on the fungal floor (minions match their boss)
  if (theme && theme.boss === 'mushroom') {
    const a = loadAnimated('sporeling', ENEMY[type].radius * 2.2);
    if (a) return { group: a.wrap, anim: a.anim };
    const g = buildMushroomMesh(ENEMY[type].radius * 1.3, theme.palette || {}, {
      simple: true,
    }).group;
    return { group: g, anim: null };
  }

  // themed beasts on the duo floor: pups (warm) + kittens (cool) match their bosses.
  // theme.boss is 'duo' for normal-room minions (alternate by enemy type) or
  // 'dog'/'cat' for the kittens a boss summons.
  if (theme && (theme.boss === 'dog' || theme.boss === 'cat' || theme.boss === 'duo')) {
    const kind = theme.boss === 'duo' ? (type === 'shooter' ? 'cat' : 'dog') : theme.boss;
    const a = loadAnimated(kind, ENEMY[type].radius * 1.9); // 'dog' / 'cat' model keys
    if (a) return { group: a.wrap, anim: a.anim };
    const g = buildBeastMesh(ENEMY[type].radius * 1.2, theme.palette || {}, {
      kind,
      simple: true,
    }).group;
    return { group: g, anim: null };
  }

  // bone-white catacomb minions (bonelings + archers) match the skeleton boss
  if (theme?.boss === 'skeleton') {
    const a = loadAnimated('skeleton', ENEMY[type].radius * 2.1);
    if (a) return { group: a.wrap, anim: a.anim };
    const g = buildSkeletonMesh(ENEMY[type].radius * 1.3, theme.palette || {}, {
      simple: true,
    }).group;
    return { group: g, anim: null };
  }

  // armed survivors rallied by the human boss (humanoid, match the boss)
  if (theme?.boss === 'human') {
    const a = loadAnimated('human', ENEMY[type].radius * 2.1);
    if (a) return { group: a.wrap, anim: a.anim };
    const g = makeCharacter(null, {
      radius: ENEMY[type].radius,
      height: ENEMY[type].radius * 2.2,
      color: theme.palette?.body ?? PALETTE.npc,
    });
    return { group: g, anim: null };
  }

  const group = new THREE.Group();
  const model = getModel(type);
  if (model) {
    group.add(model);
    return { group, anim: null };
  }
  // themed mini-spiders on spider floors (small, simplified for many on screen)
  if (theme && theme.boss === 'spider') {
    const g = buildSpiderMesh(ENEMY[type].radius * 1.4, theme.palette || {}, {
      simple: true,
    }).group;
    return { group: g, anim: null };
  }
  const cfg = ENEMY[type];
  const color = type === 'chaser' ? PALETTE.enemyChaser : PALETTE.enemyShooter;
  const geo =
    type === 'chaser'
      ? new THREE.IcosahedronGeometry(cfg.radius, 0) // jagged blob
      : new THREE.OctahedronGeometry(cfg.radius, 0); // sharp caster
  const body = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.55,
      roughness: 0.5,
      flatShading: true,
    }),
  );
  body.position.y = cfg.radius + 0.2;
  group.add(body);

  // glowing eyes
  const eyeGeo = new THREE.SphereGeometry(cfg.radius * 0.18, 6, 6);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffe000 });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(sx * cfg.radius * 0.35, cfg.radius + 0.4, cfg.radius * 0.7);
    group.add(eye);
  }
  return { group, anim: null };
}

export class Enemy {
  constructor(scene, type, x, z, theme = null) {
    this.scene = scene;
    this.type = type;
    this.cfg = ENEMY[type];
    this.x = x;
    this.z = z;
    this.radius = this.cfg.radius;
    this.hp = Math.round(this.cfg.hp * hardnessFacet(DIFFICULTY.hardnessMul, DIFFICULTY.hpWeight));
    this.dead = false;
    this.knock = { x: 0, z: 0 }; // active knockback velocity (B7); decays in update()
    this.contactTimer = 0;
    this.fireTimer = this.cfg.fireInterval ? this.cfg.fireInterval * Math.random() : 0;
    this.phase = Math.random() * Math.PI * 2;
    this.isSpider = !!(theme && theme.boss === 'spider');
    this.isMushroom = !!(theme && theme.boss === 'mushroom');
    this.isBeast = !!(
      theme &&
      (theme.boss === 'dog' || theme.boss === 'cat' || theme.boss === 'duo')
    );
    this.isSkeleton = theme?.boss === 'skeleton';
    this.isHuman = theme?.boss === 'human';
    const built = makeEnemyMesh(type, theme);
    this.mesh = built.group;
    this.anim = built.anim; // AnimModel for GLB minions, else null
    castShadows(this.mesh); // monsters cast shadows (covers every mesh variant + GLBs)
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
  }

  update(dt, game) {
    if (this.dead) return;
    const p = game.nearestPlayer(this.x, this.z) || game.player;
    this.contactTimer -= dt;

    if (this.type === 'chaser') {
      const dir = normalize(p.x - this.x, p.z - this.z);
      this.x += dir.x * this.cfg.speed * dt;
      this.z += dir.z * this.cfg.speed * dt;
    } else {
      // shooter: hold preferred distance, then volley
      const d = dist(this.x, this.z, p.x, p.z);
      const dir = normalize(p.x - this.x, p.z - this.z);
      const sign = d < this.cfg.preferredDist - 1 ? -1 : d > this.cfg.preferredDist + 1 ? 1 : 0;
      this.x += dir.x * this.cfg.speed * dt * sign;
      this.z += dir.z * this.cfg.speed * dt * sign;

      this.fireTimer -= dt;
      if (this.fireTimer <= 0 && p.alive) {
        this._fireRing(game);
        this.fireTimer = this.cfg.fireInterval;
      }
    }

    // keep out of walls / arena
    let q = slideOutOfWalls(this.x, this.z, this.radius, game.walls);
    q = clampToArena(q.x, q.z, this.radius);
    this.x = q.x;
    this.z = q.z;

    // apply + decay any knockback shove (no-op when not knocked), re-resolving walls
    advanceKnockback(this, dt, game.walls);

    // contact damage
    if (
      this.contactTimer <= 0 &&
      p.alive &&
      circleVsCircle(this.x, this.z, this.radius, p.x, p.z, p.radius)
    ) {
      p.hurt(this.cfg.contactDamage, game);
      this.contactTimer = this.cfg.contactCooldown;
    }

    // settle the hit-pop scale back to normal
    const s = this.mesh.scale.x;
    if (s !== 1) this.mesh.scale.setScalar(s + (1 - s) * Math.min(1, dt * 12));

    // themed monsters face the player; generic blobs do a slow menacing spin
    if (this.isSpider || this.isMushroom || this.isBeast || this.isSkeleton || this.isHuman)
      this.mesh.rotation.y = Math.atan2(p.x - this.x, p.z - this.z);
    else this.mesh.rotation.y += dt * 1.5;
    this.anim?.update(dt); // advance the GLB animation clip, if any
    this.mesh.position.set(this.x, 0, this.z);
  }

  _fireRing(game) {
    this.phase += 0.4;
    for (const a of ring(this.cfg.bulletsPerRing, this.phase)) {
      game.bullets.spawnEnemy(this.x, this.z, Math.sin(a), Math.cos(a), BULLET.enemy.speed);
    }
  }

  hurt(dmg, game, knockDir = null) {
    if (this.dead) return;
    this.hp -= dmg;
    applyKnockImpulse(this, knockDir, FEEL.knockback.impulse[this.type] ?? 0); // B7 shove (per type)
    game.particles.burst(this.x, this.z, PARTICLES.perHit, PALETTE.blood);
    this.mesh.scale.setScalar(1.35); // pop
    audio.play('hit');
    if (this.hp <= 0) this.die(game);
  }

  die(game) {
    this.dead = true;
    game.particles.burst(this.x, this.z, PARTICLES.perDeath, PALETTE.blood);
    game.juice.addTrauma(game.JUICE.traumaOnKill);
    game.juice.hitStop(game.JUICE.hitStopOnKill);
    audio.play('kill');
    if (this.onDeath) this.onDeath(this, game); // e.g. puffball -> poison pool
    // rare mob heart drop (+1) — seeded (ADR-0013) so runs stay reproducible. Bosses guarantee a
    // HEAL separately; this is the "lucky" mob heal (skill dominates, luck is the small spice).
    if (game.rng.chance(PICKUPS.mobHeartDropRate)) game.spawnPickup('HEART', this.x, this.z);
    this.anim?.dispose(); // free the GLB AnimationMixer for animated minions (no leak)
    this.scene.remove(this.mesh);
  }
}

/**
 * HP-gated minion top-up shared by the boss P-spawns (spider/mushroom/skeleton):
 * keep between target.min and target.max of a `tag`-flagged chaser alive, rising
 * at seeded ring positions. Builds + configures each minion (radius/scale/hp) and
 * addEnemy()s it; `after(e)` adds per-boss extras (e.g. the puffball's onDeath).
 * Seeded via game.rng (ADR-0013) so spawns stay reproducible.
 */
export function topUpMinions(boss, game, target, tag, opts = {}, after = null) {
  if (target.max === 0) return;
  const alive = game.enemies.filter((e) => e[tag] && !e.dead).length;
  if (alive >= target.min) return;
  const { dist = 1.5, scale = 0.55, hp = 1, puff = PALETTE.blood } = opts;
  for (let i = alive; i < target.max; i++) {
    const a = game.rng.next() * Math.PI * 2;
    const lx = boss.x + Math.cos(a) * boss.radius * dist;
    const lz = boss.z + Math.sin(a) * boss.radius * dist;
    game.particles.burst(lx, lz, 5, puff); // little spawn puff (telegraph)
    const e = new Enemy(boss.scene, 'chaser', lx, lz, boss.theme);
    e[tag] = true;
    e.mesh.scale.setScalar(scale);
    e.radius *= 0.6;
    e.hp = Math.round(hp * hardnessFacet(DIFFICULTY.hardnessMul, DIFFICULTY.hpWeight));
    if (after) after(e);
    game.addEnemy(e);
  }
}
