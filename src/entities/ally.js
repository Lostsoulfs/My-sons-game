// =====================================================================
// ally.js — Ally. An AI buddy who tags along and shoots nearby monsters.
// (Two-player co-op replaces this with a second Player.)
//
// B9b: the ally makes NO upgrade choices, but passively shares ALLY.upgradeShare (20%) of the
// player's accrued damage / fire-rate / move-speed bonuses (core/scaling.js allyShare) so it stays
// useful without being overpowered. It also carries a real gun (default pistol) that the SOLO player
// can reroll from the offer screen (game._rerollAlly → rerollWeapon).
// =====================================================================

import { ALLY, PALETTE, PLAYER, WEAPONS } from '../config.js';
import { makeCharacter } from './characterMesh.js';
import { slideOutOfWalls, clampToArena } from '../systems/collision.js';
import { normalize, dist, spreadDirs } from '../core/math2d.js';
import { allyShare } from '../core/scaling.js';
import { deriveWeaponFx } from '../core/weaponFxDerive.js';

export class Ally {
  constructor(scene) {
    this.mesh = makeCharacter('ally', {
      radius: ALLY.radius,
      height: ALLY.height,
      color: PALETTE.ally,
    });
    scene.add(this.mesh);
    this.radius = ALLY.radius;
    this.fireTimer = 0;
    this.setWeapon(ALLY.defaultWeapon); // a real gun (set in the ctor so a reroll persists across rooms)
    this.reset(0, 0);
  }

  reset(x, z) {
    // NOTE: does NOT touch the weapon — a rerolled gun persists across rooms (only a new run/new Ally
    // resets it to the pistol).
    this.x = x;
    this.z = z;
    this.fireTimer = 0;
    this.mesh.position.set(x, 0, z);
  }

  /** equip a weapon by config key (falls back to ALLY.defaultWeapon for an unknown key). */
  setWeapon(key) {
    const fallback = WEAPONS[ALLY.defaultWeapon] ? ALLY.defaultWeapon : Object.keys(WEAPONS)[0];
    this.weapon = WEAPONS[key] ? key : fallback;
    this.weaponDef = WEAPONS[this.weapon];
    this.weaponName = this.weaponDef.name;
  }

  /** solo only: reroll to a DIFFERENT random "simple" gun (excludes charge/orbital + the current one). */
  rerollWeapon(rng) {
    const simple = Object.keys(WEAPONS).filter((k) => !WEAPONS[k].charge && !WEAPONS[k].orbital);
    const pool = simple.filter((k) => k !== this.weapon); // avoid a no-op reroll
    const choices = pool.length ? pool : simple;
    this.setWeapon(choices[rng.int(choices.length)]);
    return this.weaponName;
  }

  update(dt, game) {
    const p = game.player;
    const share = ALLY.upgradeShare;

    // --- follow: walk toward the player but stop at followDist (gets 20% of the player's speed bonus) ---
    const spd = ALLY.speed * (1 + allyShare((p?.speed ?? PLAYER.speed) / PLAYER.speed - 1, share));
    const d = dist(this.x, this.z, p.x, p.z);
    if (d > ALLY.followDist) {
      const dir = normalize(p.x - this.x, p.z - this.z);
      this.x += dir.x * spd * dt;
      this.z += dir.z * spd * dt;
      let q = slideOutOfWalls(this.x, this.z, this.radius, game.walls);
      q = clampToArena(q.x, q.z, this.radius);
      this.x = q.x;
      this.z = q.z;
    }

    // --- shoot the nearest enemy in range with the ally's gun ---
    this.fireTimer -= dt;
    const target = this._nearestEnemy(game);
    if (target) {
      const aim = normalize(target.x - this.x, target.z - this.z);
      this.mesh.rotation.y = Math.atan2(aim.x, aim.z);
      if (this.fireTimer <= 0) this._fire(game, aim, p, share);
    } else {
      // face the way the player faces when idle
      this.mesh.rotation.y = p.mesh.rotation.y;
    }

    this.mesh.position.set(this.x, 0, this.z);
  }

  /** fire the ally's weapon (20% of the player's damage + fire-rate bonus; never faster than ALLY.fireCooldown). */
  _fire(game, aim, p, share) {
    const w = this.weaponDef;
    const dmgMul = 1 + allyShare((p?.damageMul ?? 1) - 1, share);
    const fx = deriveWeaponFx(w);
    game.weaponfx?.muzzle(this.x, this.z, aim, fx, 1);
    const dirs = spreadDirs(aim.x, aim.z, w.pellets ?? 1, w.spreadDeg ?? 0);
    for (const dir of dirs) {
      game.bullets.spawnPlayer(this.x, this.z, dir.x, dir.z, {
        damage: (w.damage ?? 1) * dmgMul,
        speed: w.bulletSpeed,
        explosive: w.explosive,
        explodeRadius: w.explodeRadius,
        pierce: w.pierce,
        homing: w.homing,
        turnRate: w.turnRate,
        bounces: w.bounces,
        life: w.life,
        scale: w.scale,
        color: w.color,
        fx,
        fxIntensity: 1,
      });
    }
    const rateBonus = allyShare(1 - (p?.fireRateMul ?? 1), share);
    this.fireTimer = Math.max(w.cooldown ?? 0, ALLY.fireCooldown) * (1 - rateBonus);
  }

  _nearestEnemy(game) {
    let best = null;
    let bestD = ALLY.range;
    for (const e of game.enemies) {
      if (e.dead) continue;
      const d = dist(this.x, this.z, e.x, e.z);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }
}
