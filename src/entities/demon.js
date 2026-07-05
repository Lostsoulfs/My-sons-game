// =====================================================================
// demon.js — the DEMON companion (CP-C, ADR-0042). 😈 The old AI Ally, reborn.
//
// A sealed portal-monster that didn't want the war (STORY.md). It heels the SOLO
// player, spits a leashed Cherenkov bolt at the nearest enemy, and inherits a
// SHARE of the player's PERMANENT (Resonance) baseline only (core/demonInherit.js)
// — locked at spawn, nothing from the run. It makes no picks, holds no weapon,
// and is OUTSIDE the weapon economy entirely (no reroll — that died with CP5).
//
// Untargetable by construction: it is deliberately NOT in game.players, so
// enemies/bosses (which aim via game.nearestPlayer / iterate players) never see
// it, offers never queue for it, and co-op revive logic never touches it.
// GLB seam: loadAnimated('demon') first (config.MODELS.demon), procedural
// containment-specimen fallback (demonMesh.js) otherwise.
// =====================================================================

import { DEMON } from '../config.js';
import { demonInherit } from '../core/demonInherit.js';
import { loadAnimated } from '../core/animModel.js';
import { buildDemonMesh } from './demonMesh.js';
import { castShadows } from '../core/shadows.js';
import { deriveWeaponFx } from '../core/weaponFxDerive.js';
import { slideOutOfWalls, clampToArena } from '../systems/collision.js';
import { normalize, dist } from '../core/math2d.js';

export class Demon {
  /**
   * @param {THREE.Scene} scene
   * @param {object} baseline RAW permanent baseline (core/saves.js baselineStacks) — NOT the
   *   player's merged copy: that one carries the Dad/Son ±trait, which is not a meta buff.
   */
  constructor(scene, baseline) {
    const built = loadAnimated('demon', DEMON.height);
    if (built) {
      this.mesh = built.wrap;
      this.anim = built.anim;
      this.parts = null;
    } else {
      const b = buildDemonMesh(DEMON.radius);
      this.mesh = b.group;
      this.anim = null;
      this.parts = b; // { eye, arm } — driven in _animate below
    }
    castShadows(this.mesh);
    scene.add(this.mesh);
    this.radius = DEMON.radius; // visual/positioning only — nothing ever collides with it
    // inheritance is locked at spawn from the PERMANENT baseline (identity pre-first-win)
    this.inherit = demonInherit(baseline, DEMON.inheritShare, DEMON.rateFloor);
    this._boltFx = deriveWeaponFx({ color: DEMON.bolt.color }); // bright+cool → energy bolt
    this.t = 0;
    this.reset(0, 0);
  }

  reset(x, z) {
    this.x = x;
    this.z = z;
    this.fireTimer = 0;
    this.mesh.position.set(x, 0, z);
  }

  update(dt, game) {
    const p = game.player;
    if (!p) return;
    this.t += dt;

    // --- heel: shamble toward the player, stopping at followDist ---
    const spd = DEMON.speed * this.inherit.speedMul;
    const d = dist(this.x, this.z, p.x, p.z);
    const moving = d > DEMON.followDist;
    if (moving) {
      const dir = normalize(p.x - this.x, p.z - this.z);
      this.x += dir.x * spd * dt;
      this.z += dir.z * spd * dt;
      let q = slideOutOfWalls(this.x, this.z, this.radius, game.walls);
      q = clampToArena(q.x, q.z, this.radius);
      this.x = q.x;
      this.z = q.z;
    }

    // --- the leashed bolt: nearest enemy in range, on an inherited-rate cooldown ---
    this.fireTimer -= dt;
    const target = this._nearestEnemy(game);
    if (target) {
      const aim = normalize(target.x - this.x, target.z - this.z);
      this.mesh.rotation.y = Math.atan2(aim.x, aim.z);
      if (this.fireTimer <= 0) this._fire(game, aim);
    } else {
      this.mesh.rotation.y = p.mesh.rotation.y; // idle: faces where its keeper faces
    }

    this._animate(moving);
    this.anim?.play(moving ? 'Walk' : 'Idle');
    this.anim?.update(dt);
    this.mesh.position.set(this.x, 0, this.z);
  }

  /** procedural idle: the bound arm drags/sways, the eye-slit pulses (GLB plays its own clips) */
  _animate(moving) {
    const parts = this.parts;
    if (!parts) return;
    parts.arm.rotation.x = moving ? Math.sin(this.t * 5) * 0.18 : Math.sin(this.t * 1.2) * 0.05;
    const pulse = 1 + 0.25 * Math.sin(this.t * 2.4); // slow containment throb, not an alarm
    parts.eye.scale.set(pulse, 1, 1);
  }

  _fire(game, aim) {
    const b = DEMON.bolt;
    game.weaponfx?.muzzle(this.x, this.z, aim, this._boltFx, 1);
    game.bullets.spawnPlayer(this.x, this.z, aim.x, aim.z, {
      damage: b.damage * this.inherit.damageMul,
      speed: b.bulletSpeed,
      color: b.color,
      fx: this._boltFx,
      fxIntensity: 1,
    });
    this.fireTimer = b.cooldown * this.inherit.fireRateMul;
  }

  _nearestEnemy(game) {
    let best = null;
    let bestD = DEMON.range;
    for (const e of game.enemies) {
      // skip invuln too (adversarial-review find): the inert human boss during the ADR-0033
      // walk-up and the skeleton mid-reassemble are alive-but-untouchable — without this the
      // demon strafes the nervous survivor through the whole parley (FX land, damage no-ops)
      // and dumps bolts at an invisible skeleton. Fair targets only.
      if (e.dead || e.invuln) continue;
      const d = dist(this.x, this.z, e.x, e.z);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** the pause menu's read of what the seal is feeding it (CP-A panel, raw numbers only) */
  statsSnapshot() {
    return { ...this.inherit };
  }

  /** free the GLB mixer (if any) — the mesh itself is removed by the caller (game teardown) */
  dispose() {
    this.anim?.dispose();
    this.anim = null;
  }
}
