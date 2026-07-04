// =====================================================================
// bullets.js — one pooled projectile system for BOTH the player and enemies.
//
// A fixed pool of small glowing spheres. spawnPlayer/spawnEnemy launch one;
// update() flies them, kills them on walls or after a lifetime, and checks
// hits (player bullets -> enemies, enemy bullets -> you).
//
// Behaviors (all optional, set per-shot from a weapon def — see config.WEAPONS):
//   explosive + explodeRadius — rocket-style area damage on impact.
//   pierce (int)              — pass THROUGH this many enemies before dying.
//   homing (bool) + turnRate  — curve toward the nearest enemy (capped turn).
//   bounces (int)             — ricochet off walls this many times.
//   life / scale / color      — per-bullet overrides of the shared defaults.
// =====================================================================

import * as THREE from 'three';
import { BULLET, PALETTE, GRAPHICS } from '../config.js';
import { circleVsCircle, normalize } from '../core/math2d.js';
import { turnRateHomingVelocity } from '../core/homingMath.js';
import { hitsAnyWall } from '../systems/collision.js';
import * as audio from '../systems/audio.js';

export class Bullets {
  constructor(scene) {
    this.items = [];
    const geo = new THREE.SphereGeometry(BULLET.radius, 8, 8);
    this.playerMat = new THREE.MeshBasicMaterial({ color: PALETTE.playerBullet });
    this.enemyMat = new THREE.MeshBasicMaterial({ color: PALETTE.enemyBullet });
    this.rocketMat = new THREE.MeshBasicMaterial({ color: 0xff7722 });
    this._mats = new Map(); // color -> material (for tinted bullets like the railgun)
    for (let i = 0; i < BULLET.poolSize; i++) {
      const mesh = new THREE.Mesh(geo, this.playerMat);
      mesh.visible = false;
      scene.add(mesh);
      this.items.push({
        mesh,
        active: false,
        x: 0,
        z: 0,
        vx: 0,
        vz: 0,
        speed: 0,
        life: 0,
        age: 0,
        team: 'player',
        damage: 1,
        explosive: false,
        explodeRadius: 0,
        pierce: 0,
        homing: false,
        turnRate: 0,
        bounces: 0,
        hitSet: new Set(),
        fx: null, // weapon FX descriptor (weaponFxDerive) — drives trail/muzzle/impact look
        fxIntensity: 1, // rarity scalar for the juice
        _trailT: 0, // throttle timer for per-frame trail emission
      });
    }
    this._next = 0;
  }

  // opts: { damage, speed, explosive, explodeRadius, pierce, homing, turnRate,
  //         bounces, life, scale, color }   (or a bare number = damage)
  spawnPlayer(x, z, dx, dz, opts = {}) {
    const o = typeof opts === 'number' ? { damage: opts } : opts;
    this._spawn(x, z, dx, dz, 'player', {
      speed: o.speed ?? BULLET.player.speed,
      damage: o.damage ?? BULLET.player.damage,
      explosive: !!o.explosive,
      explodeRadius: o.explodeRadius ?? 0,
      pierce: o.pierce ?? 0,
      homing: !!o.homing,
      turnRate: o.turnRate ?? 0,
      bounces: o.bounces ?? 0,
      life: o.life,
      scale: o.scale,
      color: o.color,
      fx: o.fx,
      fxIntensity: o.fxIntensity,
    });
  }

  spawnEnemy(x, z, dx, dz, speed) {
    this._spawn(x, z, dx, dz, 'enemy', {
      speed: speed ?? BULLET.enemy.speed,
      damage: BULLET.enemy.damage,
      explosive: false,
      explodeRadius: 0,
      pierce: 0,
      homing: false,
      turnRate: 0,
      bounces: 0,
    });
  }

  _matFor(team, o) {
    if (o.explosive) return this.rocketMat;
    if (team === 'enemy') return this.enemyMat;
    if (o.color != null) {
      let m = this._mats.get(o.color);
      if (!m) {
        m = new THREE.MeshBasicMaterial({ color: o.color });
        this._mats.set(o.color, m);
      }
      return m;
    }
    return this.playerMat;
  }

  _spawn(x, z, dx, dz, team, o) {
    const b = this._grab();
    b.active = true;
    b.team = team;
    b.x = x;
    b.z = z;
    b.speed = o.speed;
    b.vx = dx * o.speed;
    b.vz = dz * o.speed;
    b.life = o.life ?? BULLET.lifetime;
    b.age = 0;
    b.damage = o.damage;
    b.explosive = o.explosive;
    b.explodeRadius = o.explodeRadius;
    b.pierce = o.pierce ?? 0;
    b.homing = !!o.homing;
    b.turnRate = o.turnRate ?? 0;
    b.bounces = o.bounces ?? 0;
    b.hitSet.clear();
    b.fx = o.fx || null;
    b.fxIntensity = o.fxIntensity ?? 1;
    b._trailT = 0;
    b.mesh.material = this._matFor(team, o);
    // shape by flavor: PLAYER shots stretch along their travel direction — beams read as long
    // rods, energy bolts as short rods, ballistic tracers slightly stretched. ENEMY bullets stay
    // round dots (bullet-hell readability: the threats must be instantly parseable).
    const s = o.scale ?? (o.explosive ? 1.9 : 1);
    const st = GRAPHICS.vfx?.bulletStretch;
    b.stretched = !!(st && team === 'player' && o.fx);
    if (b.stretched) {
      let stretch = st.tracer ?? 1; // ballistic default: a slight tracer stretch
      if (o.fx.trail === 'beam') stretch = st.beam ?? 1;
      else if (o.fx.kind === 'energy') stretch = st.bolt ?? 1;
      const w = s * (st.squish ?? 0.8);
      b.mesh.scale.set(w, w, s * stretch);
      b.mesh.rotation.y = Math.atan2(b.vx, b.vz); // local +Z = travel (streak convention)
    } else {
      b.mesh.scale.setScalar(s);
      b.mesh.rotation.y = 0;
    }
    b.mesh.position.set(x, 1.0, z);
    b.mesh.visible = true;
  }

  clearEnemyBullets() {
    for (const b of this.items) {
      if (b.active && b.team === 'enemy') {
        b.active = false;
        b.mesh.visible = false;
      }
    }
  }

  clearAll() {
    for (const b of this.items) {
      b.active = false;
      b.mesh.visible = false;
    }
  }

  update(dt, game) {
    for (const b of this.items) {
      if (!b.active) continue;

      b.age += dt;
      b.life -= dt;
      if (b.life <= 0) {
        if (b.explosive) this._explode(b, game);
        this._kill(b);
        continue;
      }

      // homing: curve the velocity toward the nearest enemy (player guns only)
      if (b.homing && b.team === 'player') this._steerHoming(b, dt, game);

      // --- move (with optional wall bounce) ---
      const r = BULLET.radius;
      const nx = b.x + b.vx * dt;
      const nz = b.z + b.vz * dt;
      if (hitsAnyWall(nx, nz, r, game.walls)) {
        if (b.bounces > 0) {
          let bounced = false;
          if (hitsAnyWall(nx, b.z, r, game.walls)) {
            b.vx = -b.vx;
            bounced = true;
          }
          if (hitsAnyWall(b.x, nz, r, game.walls)) {
            b.vz = -b.vz;
            bounced = true;
          }
          if (!bounced) {
            b.vx = -b.vx;
            b.vz = -b.vz;
          }
          b.bounces -= 1;
          const ax = b.x + b.vx * dt;
          const az = b.z + b.vz * dt;
          if (hitsAnyWall(ax, az, r, game.walls)) {
            this._kill(b); // wedged in a corner — give up rather than get stuck
            continue;
          }
          b.x = ax;
          b.z = az;
          audio.play('bounce');
        } else {
          if (b.explosive) this._explode(b, game);
          this._wallSpark(b, game); // small impact spark (no-op if disabled in config)
          this._kill(b);
          continue;
        }
      } else {
        b.x = nx;
        b.z = nz;
      }

      // --- collisions ---
      if (b.team === 'player') {
        let hit = null;
        for (const e of game.enemies) {
          if (e.dead || b.hitSet.has(e)) continue;
          if (circleVsCircle(b.x, b.z, r, e.x, e.z, e.radius)) {
            hit = e;
            break;
          }
        }
        if (hit) {
          if (b.explosive) {
            this._explode(b, game);
            this._kill(b);
            continue;
          }
          hit.hurt(b.damage, game, normalize(b.vx, b.vz)); // shove along the bullet's travel (B7)
          game.weaponfx?.impact(b.x, b.z, 'enemy', b.fx, b.fxIntensity);
          if (b.pierce > 0) {
            b.pierce -= 1;
            b.hitSet.add(hit); // don't re-hit the same enemy while passing through
          } else {
            this._kill(b);
            continue;
          }
        }
      } else {
        let hitPlayer = false;
        for (const p of game.players) {
          if (p.alive && circleVsCircle(b.x, b.z, r, p.x, p.z, p.radius)) {
            p.hurt(b.damage, game);
            hitPlayer = true;
            break;
          }
        }
        if (hitPlayer) {
          this._kill(b);
          continue;
        }
      }

      // pooled tracer/energy trail behind the bullet (player guns only; throttled)
      if (b.team === 'player' && b.fx && b.fx.trail !== 'none' && game.weaponfx) {
        b._trailT -= dt;
        if (b._trailT <= 0) {
          game.weaponfx.trailFor(b);
          b._trailT = GRAPHICS.vfx?.trail?.interval ?? 0.016;
        }
      }

      b.mesh.position.set(b.x, 1.0, b.z);
      // keep a stretched shot pointing where it flies (homing curves, bouncers flip)
      if (b.stretched) b.mesh.rotation.y = Math.atan2(b.vx, b.vz);
    }
  }

  /** curve a homing bullet toward the nearest living enemy (capped turn rate) */
  _steerHoming(b, dt, game) {
    let tx = null;
    let tz = null;
    let bd = Infinity;
    for (const e of game.enemies) {
      if (e.dead) continue;
      const d = (e.x - b.x) ** 2 + (e.z - b.z) ** 2;
      if (d < bd) {
        bd = d;
        tx = e.x;
        tz = e.z;
      }
    }
    if (tx === null) return;
    const v = turnRateHomingVelocity(
      { x: b.x, z: b.z },
      { x: b.vx, z: b.vz },
      { x: tx, z: tz },
      dt,
      { speed: b.speed, turnRate: b.turnRate },
    );
    b.vx = v.x;
    b.vz = v.z;
  }

  /** rocket area-of-effect: damage every enemy within the blast radius */
  _explode(b, game) {
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (circleVsCircle(b.x, b.z, b.explodeRadius, e.x, e.z, e.radius)) {
        e.hurt(b.damage, game, normalize(e.x - b.x, e.z - b.z)); // shove outward from the blast (B7)
      }
    }
    game.weaponfx?.impact(b.x, b.z, 'explode', b.fx, b.fxIntensity); // the orange blast burst
    game.juice.addTrauma(game.JUICE.traumaOnExplode);
    audio.play('explosion');
  }

  // a small spark burst where a (non-bouncing) bullet hits a wall — reuses the pooled
  // particle system; gated by config.GRAPHICS.vfx so it's free to turn off. Bloom (ADR-0025)
  // makes the warm spark pop. No-op when impactSparks is off.
  _wallSpark(b, game) {
    game.weaponfx?.impact(b.x, b.z, 'wall', b.fx, b.fxIntensity);
  }

  _kill(b) {
    b.active = false;
    b.mesh.visible = false;
    b.mesh.scale.setScalar(1);
  }

  _grab() {
    for (let i = 0; i < this.items.length; i++) {
      const idx = (this._next + i) % this.items.length;
      if (!this.items[idx].active) {
        this._next = (idx + 1) % this.items.length;
        return this.items[idx];
      }
    }
    const b = this.items[this._next];
    this._next = (this._next + 1) % this.items.length;
    return b;
  }
}
