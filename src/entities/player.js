// =====================================================================
// player.js — a player. Player 1 = keyboard/mouse (blue); Player 2 (co-op) =
// Xbox controller (green). Carries up to a few weapons in SLOTS (unlocked by
// beating bosses) and switches between them. Stat upgrades are capped (see
// config.CAPS) so power can't run away.
// =====================================================================

import * as THREE from 'three';
import {
  PLAYER,
  WEAPONS,
  WEAPON_LIMITS,
  PALETTE,
  CAPS,
  UPGRADES,
  OFFERS,
  GUARD,
  BLADE_AURA,
  GRAPHICS,
  WEAPON_MODS,
} from '../config.js';
import { statBonus } from '../core/scaling.js';
import { itemById, weaponTier } from '../core/items.js';
import { deriveWeaponFx, rarityIntensity } from '../core/weaponFxDerive.js';
import { spinUpCooldown } from '../core/spinUp.js';
import { initClip, tickReload, fireRound, canFireClip } from '../core/reload.js';
import { initHeat, coolHeat, addHeat, canFireHeat } from '../core/heat.js';
import { resolveIncoming } from '../core/defense.js';
import { makeCharacter } from './characterMesh.js';
import { loadAnimated } from '../core/animModel.js';
import { castShadows } from '../core/shadows.js';
import { slideOutOfWalls, clampToArena } from '../systems/collision.js';
import { spreadDirs, circleVsCircle, normalize } from '../core/math2d.js';
import * as audio from '../systems/audio.js';
import { hud } from '../ui/hud.js';

// which procedural sound a weapon's normal shot plays (default: 'shoot')
const SHOOT_SFX = {
  shotgun: 'shotgun',
  rocket: 'rocketLaunch',
  homing: 'rocketLaunch',
  railgun: 'railgun',
};

export class Player {
  constructor(
    scene,
    {
      color = PALETTE.player,
      modelKey = 'dad',
      meshRadius = PLAYER.radius, // CP-D: VISUAL-ONLY silhouette size — never the hit-circle below
      meshHeight = PLAYER.height,
      prop = null, // CP-D: procedural silhouette tell (see characterMesh.js PROP_BUILDERS)
      device = 'both',
      baseline = null,
      startWeapon = 'pistol', // CP5: per-character starter (Dad='pistol', Son='laserpistol')
      character = null, // CP5: 'dad' | 'son' | null — identity, for HUD/debug
    } = {},
  ) {
    this.device = device; // 'kb' | 'pad' | 'both'
    this._startWeapon = startWeapon;
    this.character = character;
    // CP-D (ADR-0041): try a real animated GLB first (same loadAnimated-first pattern every boss
    // uses), falling back to the procedural capsule+prop. `this.anim` drives Walk/Idle in update()
    // and is null on the procedural path (no-op there). MODELS.dad/son are null today, so this is a
    // no-op until real art lands — zero visual change now.
    const built = loadAnimated(modelKey, meshHeight);
    if (built) {
      this.mesh = built.wrap;
      this.anim = built.anim;
      castShadows(this.mesh);
    } else {
      this.mesh = makeCharacter(modelKey, { radius: meshRadius, height: meshHeight, color, prop });
      this.anim = null;
    }
    scene.add(this.mesh);
    this.radius = PLAYER.radius; // the REAL hit-circle — identical for Dad/Son, unaffected by meshRadius
    this._baseColor = new THREE.Color(color);
    this.slotsUnlocked = 1; // grows as bosses are beaten (set by game)
    // permanent baseline stacks from the Echoes meta-layer (B10 / ADR-0029); all-zero pre-beat.
    // CP4 (ADR-0037): `hearts` (Vitality) + `damageReduction` (Tough Hide) nodes were cut; `luck`
    // (Fortune) added — a permanent luck bonus fed into the offer roll.
    this._baseline = baseline ?? {
      damage: 0,
      fireRate: 0,
      speed: 0,
      guard: 0,
      luck: 0,
    };
    this.reset(0, 0);
  }

  reset(x, z) {
    this.x = x;
    this.z = z;
    const bl = this._baseline;
    this.maxHearts = PLAYER.maxHearts; // CP4: HP no longer grows (MAX_HP_UP + Vitality cut) — fixed pool
    this.hearts = this.maxHearts;
    this.alive = true;
    this.fireTimer = 0;
    this.invuln = 0;
    this.spawnSafe = 0; // ADR-0032 room-entry grace: damage-immune but NOT flickering (unlike invuln)
    this._beatTimer = 0;
    // upgrade STACKS — seeded from the permanent baseline (all-zero pre-beat), then each OFFER pick
    // (B9b) adds one; the derived stats come from the diminishing-returns curve (config.UPGRADES +
    // core/scaling.js) so power ramps over the run instead of capping early.
    // GLOBAL body/run stats live here; per-weapon damage/fireRate/mods live in _weaponUpgrades (ADR-0030).
    // Baseline speed is NOT seeded in as a stack (ADR-0031): the permanent Resonance % is a standalone
    // bonus applied in _recomputeUpgrades, kept separate from the in-run curve.
    this._up = {
      speed: 0,
      luck: 0, // positive dial — biases offer tiers up via the CP4 luck curve (capped in the engine)
    };
    this.guardCharges = bl.guard; // permanent guard charges from the meta-layer (added to offer charges)
    // per-weapon per-stat upgrade PICK-COUNTS (ADR-0030): key -> {damage,fireRate,pierce,bounces,
    // bulletSpeed,explodeRadius}, each capped at CAPS.upgradesPerStat. Kept on cycle, wiped on replace.
    this._weaponUpgrades = {};
    // CP2: per-weapon reload (ballistic) / heat (energy) limiter state, keyed by weapon key so it
    // PERSISTS across weapon swaps (no free reload by switching away and back). Lazily initialised.
    this._clip = {}; // key -> reload state {ammo, reloading, reloadT}  (core/reload.js)
    this._heatState = {}; // key -> heat state {heat, overheated}         (core/heat.js)
    this._globalDamageFlat = 0; // CP4: ultra reward — flat +add per shot across all guns, capped at 3
    this._auraLevel = 0; // CP-B: passive blade-aura level (0 = none); stacked by the BLADE_AURA pick
    this.offerRecent = []; // recently-offered item ids → anti-repeat (OFFERS.recentMemory)
    this.offerSeenWeapons = {}; // weapon id → times OFFERED this run (see-it-once decay, ADR-0030)
    this.offerCommonStreak = 0; // consecutive commons TAKEN → drives offer pity (per player)
    this.slots = [this._startWeapon]; // weapons you carry (CP5: per-character starter); slotsUnlocked is the capacity
    this.slotIndex = 0;
    this._refreshWeapon(); // sets weapon + ensures its upgrade entry + recomputes derived stats
    this.mesh.position.set(x, 0, z);
    this.mesh.visible = true;
  }

  revive(x, z) {
    this.x = x;
    this.z = z;
    this.hearts = this.maxHearts; // upgrades persist through a life-loss
    this.alive = true;
    this.invuln = 1.4;
    this.mesh.position.set(x, 0, z);
    this.mesh.visible = true;
  }

  _refreshWeapon() {
    this.weapon = this.slots[this.slotIndex];
    this.weaponDef = WEAPONS[this.weapon] || WEAPONS.pistol;
    this.weaponName = this.weaponDef.name;
    this._charge = 0; // drop any in-progress charge when the weapon changes
    this._spin = 0; // reset minigun spin-up on weapon change
    // weapon FX: flavor derived from the gun; intensity scaled by its rarity tier
    this._weaponFx = deriveWeaponFx(this.weaponDef);
    this._fxIntensity = rarityIntensity(weaponTier(this.weapon), GRAPHICS.vfx?.rarityScale);
    this._wUp(this.weapon); // ensure this gun has a per-weapon upgrade entry
    this._recomputeUpgrades(); // derived damage/fire-rate follow the HELD gun (ADR-0030)
  }

  // --- CP2: reload (ballistic) / overheat (energy) firing limiter ---

  /** the active weapon's limiter descriptor {kind:'reload'|'heat', cfg} — or null (exempt weapons). */
  _limiter() {
    const lim = WEAPON_LIMITS[this.weapon];
    if (lim?.reload) return { kind: 'reload', cfg: lim.reload };
    if (lim?.heat) return { kind: 'heat', cfg: lim.heat };
    return null; // no reload/heat limiter configured for this weapon
  }

  /** tick the active weapon's reload/heat by dt (lazy-init on first use); returns can-fire-now. */
  _tickLimiter(dt) {
    const lim = this._limiter();
    if (!lim) return true;
    const key = this.weapon;
    if (lim.kind === 'reload') {
      const st = this._clip[key] ?? (this._clip[key] = initClip(lim.cfg));
      this._clip[key] = tickReload(st, dt, lim.cfg);
      return canFireClip(this._clip[key]);
    }
    const st = this._heatState[key] ?? (this._heatState[key] = initHeat());
    this._heatState[key] = coolHeat(st, dt, lim.cfg);
    return canFireHeat(this._heatState[key]);
  }

  /** spend a shot on the active weapon's limiter (a round / a puff of heat). Call right after firing. */
  _consumeShot() {
    const lim = this._limiter();
    if (!lim) return;
    const key = this.weapon;
    if (lim.kind === 'reload') {
      const st = this._clip[key] ?? (this._clip[key] = initClip(lim.cfg)); // self-init if unticked
      this._clip[key] = fireRound(st, lim.cfg);
    } else {
      const st = this._heatState[key] ?? (this._heatState[key] = initHeat());
      this._heatState[key] = addHeat(st, lim.cfg);
    }
  }

  /** HUD read-out for the active weapon's limiter (null = no bar to show). */
  limiterHud() {
    const lim = this._limiter();
    if (!lim) return null;
    const key = this.weapon;
    if (lim.kind === 'reload') {
      const st = this._clip[key] ?? initClip(lim.cfg);
      return { kind: 'reload', ammo: st.ammo, clipSize: lim.cfg.clipSize, reloading: st.reloading };
    }
    const st = this._heatState[key] ?? initHeat();
    return { kind: 'heat', heat: st.heat, overheated: st.overheated };
  }

  /** get-or-create the per-weapon upgrade pick-count entry for a gun key (ADR-0030). */
  _wUp(key = this.weapon) {
    if (!this._weaponUpgrades[key]) {
      this._weaponUpgrades[key] = {
        damage: 0,
        fireRate: 0,
        pierce: 0,
        bounces: 0,
        bulletSpeed: 0,
        explodeRadius: 0,
      };
    }
    return this._weaponUpgrades[key];
  }

  /** bump a per-weapon stat pick-count (damage/fireRate), capped, then recompute derived stats. */
  _bumpWeaponStat(stat) {
    const w = this._wUp();
    if ((w[stat] ?? 0) < CAPS.upgradesPerStat) w[stat]++;
    this._recomputeUpgrades();
  }

  /** capacity for carried weapons (bumped by the game as bosses fall) */
  setSlotsUnlocked(n) {
    this.slotsUnlocked = Math.min(CAPS.maxWeaponSlots, n);
  }

  /** debug/explicit: set the active slot's weapon */
  setWeapon(type) {
    this.slots[this.slotIndex] = type;
    this._refreshWeapon();
  }

  /** a weapon pickup: fill the next empty slot (and equip it), else replace the active one */
  addWeapon(type) {
    if (this.slots.length < this.slotsUnlocked) {
      this.slots.push(type);
      this.slotIndex = this.slots.length - 1;
    } else {
      const old = this.slots[this.slotIndex];
      // lose-on-replace (cycling KEEPS each gun's stack) — but only wipe when NO other slot still
      // holds this gun: duplicates are reachable (owned weapons are down-weighted in offers, not
      // excluded) and two slots of the same gun share one upgrade entry.
      const heldElsewhere = this.slots.some((s, i) => i !== this.slotIndex && s === old);
      if (old !== type && !heldElsewhere) delete this._weaponUpgrades[old];
      this.slots[this.slotIndex] = type;
    }
    this._refreshWeapon();
  }

  switchTo(i) {
    if (i >= 0 && i < this.slots.length) {
      this.slotIndex = i;
      this._refreshWeapon();
    }
  }

  cycleWeapon() {
    if (this.slots.length > 1) {
      this.slotIndex = (this.slotIndex + 1) % this.slots.length;
      this._refreshWeapon();
    }
  }

  update(dt, game) {
    if (!this.alive) return;
    const { input, camera } = game;

    // --- weapon switching ---
    const sw = input.consumeWeaponSwitch(this.device);
    if (sw) {
      if (sw.cycle) this.cycleWeapon();
      else this.switchTo(sw.slot);
      game.refreshHud();
    }

    // --- move ---
    const m = input.move(this.device);
    this.x += m.x * this.speed * dt;
    this.z += m.z * this.speed * dt;
    let p = slideOutOfWalls(this.x, this.z, this.radius, game.walls);
    p = clampToArena(p.x, p.z, this.radius);
    this.x = p.x;
    this.z = p.z;

    // CP-D: drive the GLB's Walk/Idle clip off actual movement (no-op on the procedural fallback —
    // `this.anim` is only set when a real animated model loaded, see the constructor).
    if (this.anim) {
      this.anim.play(Math.hypot(m.x, m.z) > 0.05 ? 'Walk' : 'Idle');
      this.anim.update(dt);
    }

    // --- aim + shoot ---
    const aim = input.aim(this.device, camera, this.x, this.z);
    this.mesh.rotation.y = Math.atan2(aim.x, aim.z);

    if (this.weaponDef.charge) {
      this.fireTimer -= dt;
      this._updateCharge(dt, game, aim, this._tickLimiter(dt)); // CP2: reload gates the charge shot
    } else {
      this.fireTimer -= dt;
      const shooting = input.shoot(this.device) && (aim.x !== 0 || aim.z !== 0);
      // minigun spin-up: the fire cadence winds up while the trigger is held, resets on release
      if (this.weaponDef.spinUp) this._spin = shooting ? (this._spin || 0) + dt : 0;
      const canFire = this._tickLimiter(dt); // CP2: reload/overheat ticks each frame + gates firing
      if (shooting && this.fireTimer <= 0 && canFire) {
        this._fireWeapon(game, aim);
        this._consumeShot(); // spend a round / add heat
        const cd = this.weaponDef.spinUp
          ? spinUpCooldown(this._spin, this.weaponDef.spinUp)
          : this.weaponDef.cooldown;
        this.fireTimer = cd * this.fireRateMul;
        game.juice.addTrauma(game.JUICE.traumaOnShoot);
        audio.play(SHOOT_SFX[this.weapon] || 'shoot');
        if (this.device !== 'kb' && cd >= 0.15) input.rumble(0.12, 0.08, 50);
      }
    }

    // CP-B: the passive blade aura spins + shears every frame, independent of the held weapon.
    if (this._auraLevel > 0) this._updateAura(dt, game);

    // --- i-frames + hit flash ---
    if (this.spawnSafe > 0) this.spawnSafe -= dt; // silent entry grace (no flicker)
    if (this.invuln > 0) {
      this.invuln -= dt;
      this.mesh.visible = Math.floor(this.invuln * 20) % 2 === 0;
    } else {
      this.mesh.visible = true;
    }

    // --- low-health heartbeat ---
    if (this.hearts <= 1) {
      this._beatTimer -= dt;
      if (this._beatTimer <= 0) {
        audio.play('lowHealth');
        this._beatTimer = 0.9;
      }
    } else {
      this._beatTimer = 0;
    }

    this.mesh.position.set(this.x, 0, this.z);
  }

  _fireWeapon(game, aim) {
    const w = this.weaponDef;
    const m = this._wUp(); // per-weapon mod PICK-COUNTS (ADR-0030), scaled by the WEAPON_MODS amounts
    game.weaponfx?.muzzle(this.x, this.z, aim, this._weaponFx, this._fxIntensity);
    const dirs = spreadDirs(aim.x, aim.z, w.pellets, w.spreadDeg);
    for (const d of dirs) {
      game.bullets.spawnPlayer(this.x, this.z, d.x, d.z, {
        damage: (w.damage + this._globalDamageFlat) * this.damageMul, // CP4: flat global +dmg, then mult
        speed: w.bulletSpeed * (1 + m.bulletSpeed * WEAPON_MODS.bulletSpeed), // + bullet-speed mod
        explosive: w.explosive || m.explodeRadius > 0, // the blast mod makes any gun explode
        explodeRadius: (w.explodeRadius ?? 0) + m.explodeRadius * WEAPON_MODS.explodeRadius,
        pierce: (w.pierce ?? 0) + m.pierce * WEAPON_MODS.pierce,
        homing: w.homing,
        turnRate: w.turnRate,
        bounces: (w.bounces ?? 0) + m.bounces * WEAPON_MODS.bounces,
        life: w.life,
        scale: w.scale,
        color: w.color,
        fx: this._weaponFx,
        fxIntensity: this._fxIntensity,
      });
    }
  }

  // --- CP-B: passive blade aura — blades circle the player and shear on contact (no aiming).
  //     Always on once unlocked (_auraLevel > 0), INDEPENDENT of the held weapon. The blade count
  //     scales with the aura level; global flat +dmg and damageMul still apply, so it rides your build.
  _updateAura(dt, game) {
    const cfg = BLADE_AURA;
    const level = Math.min(this._auraLevel, cfg.maxLevel);
    const count = cfg.baseCount + (level - 1) * cfg.countPerLevel;
    if (!this._aura) this._aura = { blades: [], angle: 0, cd: new Map() };
    const aura = this._aura;
    while (aura.blades.length < count) {
      const m = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.4, 0),
        new THREE.MeshBasicMaterial({ color: cfg.color }),
      );
      game.scene.add(m);
      aura.blades.push(m);
    }
    aura.angle += cfg.spin * dt;
    for (let i = 0; i < aura.blades.length; i++) {
      const m = aura.blades[i];
      if (i >= count) {
        m.visible = false; // extra blades from a shrunk level (defensive — level only grows)
        continue;
      }
      const a = aura.angle + (i / count) * Math.PI * 2;
      const bx = this.x + Math.sin(a) * cfg.radius;
      const bz = this.z + Math.cos(a) * cfg.radius;
      m.position.set(bx, 1, bz);
      m.rotation.y += dt * 6;
      m.visible = true;
      for (const e of game.enemies) {
        if (e.dead || (aura.cd.get(e) || 0) > 0) continue;
        if (circleVsCircle(bx, bz, 0.5, e.x, e.z, e.radius)) {
          // global flat +dmg applies to blades too ("all weapons"); fire-rate speeds up the
          // per-enemy hit tick so FIRE_RATE_UP still buffs the aura (ADR-0030 review).
          e.hurt(
            (cfg.damage + this._globalDamageFlat) * this.damageMul,
            game,
            normalize(e.x - this.x, e.z - this.z), // shove away (B7)
          );
          game.weaponfx?.impact(bx, bz, 'enemy', this._weaponFx, this._fxIntensity);
          aura.cd.set(e, cfg.hitCooldown * this.fireRateMul);
        }
      }
    }
    for (const [e, t] of aura.cd) {
      const nt = t - dt;
      if (nt <= 0) aura.cd.delete(e);
      else aura.cd.set(e, nt);
    }
  }

  _hideAura() {
    if (this._aura) for (const m of this._aura.blades) m.visible = false;
  }

  /**
   * Tear down anything this player added to the scene BEYOND its own mesh.
   * Right now that's the blade-aura blades — they live directly in the scene (not
   * under `this.mesh`), so removing the mesh alone would orphan them. Without this,
   * resetting the game with the aura active left the blades frozen in the scene at
   * their last position. Call before dropping a player.
   */
  dispose(scene) {
    if (this._aura) {
      for (const m of this._aura.blades) {
        scene.remove(m);
        m.geometry?.dispose();
        m.material?.dispose();
      }
      this._aura = null;
    }
    // CP-D: free the GLB's AnimationMixer (no-op on the procedural fallback) — mirrors
    // AnimModel.dispose()'s use across bosses (core/animModel.js) to avoid the same
    // orphaned-mixer leak across room/run resets.
    this.anim?.dispose();
    this.anim = null;
  }

  // --- Charge Cannon: hold to charge, release a bigger/stronger cannonball ---
  _updateCharge(dt, game, aim, canFire = true) {
    const aiming = aim.x !== 0 || aim.z !== 0;
    if (this.fireTimer > 0) return; // respect the weapon cooldown between charge shots
    if (!canFire) return; // CP2: mid-reload — can't charge or fire until the clip is back
    if (game.input.shoot(this.device) && aiming) {
      this._charge = Math.min(this.weaponDef.charge.maxTime, (this._charge || 0) + dt);
      // auto-fire at full charge so a kid who just holds it still shoots
      if (this._charge >= this.weaponDef.charge.maxTime) this._releaseCharge(game, aim);
    } else if (this._charge > 0) {
      this._releaseCharge(game, aim);
    }
  }

  _releaseCharge(game, aim) {
    const c = this.weaponDef.charge;
    const f = Math.min(1, (this._charge || 0) / c.maxTime);
    this._charge = 0;
    if (aim.x === 0 && aim.z === 0) return;
    const lerp = (a, b) => a + (b - a) * f;
    const m = this._wUp(); // per-weapon mod PICK-COUNTS (ADR-0030) stack onto the charged shot too
    game.weaponfx?.muzzle(this.x, this.z, aim, this._weaponFx, this._fxIntensity * (0.8 + 0.6 * f));
    game.bullets.spawnPlayer(this.x, this.z, aim.x, aim.z, {
      damage: (lerp(c.minDamage, c.maxDamage) + this._globalDamageFlat) * this.damageMul,
      speed: lerp(c.minSpeed, c.maxSpeed) * (1 + m.bulletSpeed * WEAPON_MODS.bulletSpeed),
      pierce: Math.round(lerp(0, c.pierce)) + m.pierce * WEAPON_MODS.pierce,
      bounces: m.bounces * WEAPON_MODS.bounces,
      explosive: m.explodeRadius > 0,
      explodeRadius: m.explodeRadius * WEAPON_MODS.explodeRadius,
      scale: lerp(1, c.maxScale),
      color: c.color,
      fx: this._weaponFx,
      fxIntensity: this._fxIntensity,
    });
    this.fireTimer = this.weaponDef.cooldown * this.fireRateMul; // cap charge cadence
    this._consumeShot(); // CP2: a charged shot spends a round (charge uses a small magazine)
    game.juice.addTrauma(game.JUICE.traumaOnShoot + game.JUICE.traumaChargeBonus * f);
    audio.play(f > 0.6 ? 'chargeShot' : 'shoot');
    if (this.device !== 'kb') game.input.rumble(0.2 + 0.4 * f, 0.1, 60 + f * 80);
  }

  hurt(dmg, game) {
    if (game.godMode || this.invuln > 0 || this.spawnSafe > 0 || !this.alive) return;
    // a guard charge (if any) blocks the WHOLE hit first (core/defense.js). CP4: % soak removed.
    const res = resolveIncoming(dmg, { guardCharges: this.guardCharges });
    this.guardCharges = res.guardCharges;
    this.invuln = PLAYER.invuln; // a blocked hit still spends the i-frame window (it WAS a hit)

    if (res.blocked) {
      // a guard charge ate the hit: distinct, lighter cue (config.GUARD.block) — no blood / duck / loss
      const fx = GUARD.block;
      game.juice.addTrauma(game.JUICE.traumaOnShoot);
      game.particles.burst(this.x, this.z, fx.sparkCount, fx.sparkColor); // gold spark = shielded
      audio.play('shield');
      if (this.device !== 'kb') game.input.rumble(fx.rumble.strong, fx.rumble.weak, fx.rumble.ms);
      game.refreshHud();
      return;
    }

    this.hearts -= res.heartsLost; // whole hearts (a hit that isn't guard-blocked lands in full)
    game.juice.addTrauma(game.JUICE.traumaOnHurt);
    game.juice.hitStop(game.JUICE.hitStopOnHurt);
    game.particles.burst(this.x, this.z, 10, this._baseColor.getHex());
    hud.flashSplatter();
    const sf = game.FEEL.screenFlash.hurt;
    hud.flashScreen(sf.peak, sf.color, sf.ms);
    audio.play('hurt');
    audio.duckMusic(); // dip the music for a beat when you get hit
    if (this.device !== 'kb') game.input.rumble(0.6, 0.4, 200);
    if (this.hearts <= 0) {
      this.hearts = 0;
      this.alive = false;
      this.mesh.visible = false;
      this._hideAura(); // else the aura blades freeze visible at the death spot
    }
    game.refreshHud();
  }

  /**
   * Recompute the three derived stats from the upgrade STACK counts via the
   * diminishing-returns curve (config.UPGRADES). CAPS are a safety backstop only.
   */
  _recomputeUpgrades() {
    const w = this._wUp(this.weapon || this.slots?.[this.slotIndex] || 'pistol');
    const bl = this._baseline; // ADR-0031: a standalone % from Resonance, ADDED on top — not a stack
    // damage + fire-rate come from the HELD gun's in-run stacks (ADR-0030); the permanent Resonance
    // % (bl.damage/bl.fireRate) tops it up directly, independent of any per-weapon/in-run curve.
    this.damageMul = Math.min(
      CAPS.damageMul,
      1 + statBonus(w.damage, UPGRADES.damage.maxBonus, UPGRADES.damage.half) + bl.damage,
    );
    this.fireRateMul = Math.max(
      CAPS.fireRateMin,
      1 - statBonus(w.fireRate, UPGRADES.fireRate.maxBonus, UPGRADES.fireRate.half) - bl.fireRate,
    );
    // move-speed stays GLOBAL (it buffs the body/run, not the gun). CP4: damage-reduction soak cut.
    this.speed = Math.min(
      PLAYER.speed * CAPS.speedMul,
      PLAYER.speed *
        (1 + statBonus(this._up.speed, UPGRADES.speed.maxBonus, UPGRADES.speed.half) + bl.speed),
    );
  }

  /**
   * A flat, display-ready read of every stat the pause menu surfaces (CP-A). Raw values only —
   * no explanations (the no-hand-holding rule lives in the UI). One seam so the panel never
   * reaches into private fields; `core/statsPanel.js` turns this into display rows.
   */
  statsSnapshot() {
    const w = this._wUp();
    return {
      character: this.character,
      weapon: this.weaponName,
      hearts: this.hearts,
      maxHearts: this.maxHearts,
      guardCharges: this.guardCharges,
      bladeAura: this._auraLevel, // CP-B: passive blade-aura level (0 = none)
      // derived multipliers (what actually reaches the sim)
      damageMul: this.damageMul,
      fireRateMul: this.fireRateMul,
      speedMul: this.speed / PLAYER.speed,
      globalDamageFlat: this._globalDamageFlat,
      // in-run positive dial
      luck: this._up.luck,
      // permanent (Resonance / Fortune) baseline
      baseline: { ...this._baseline },
      // the HELD gun's per-weapon stacks + mods (ADR-0030)
      weaponStacks: {
        damage: w.damage ?? 0,
        fireRate: w.fireRate ?? 0,
        pierce: w.pierce ?? 0,
        bounces: w.bounces ?? 0,
        bulletSpeed: w.bulletSpeed ?? 0,
        explodeRadius: w.explodeRadius ?? 0,
      },
    };
  }

  /** apply a survivor outcome or pickup buff/debuff. The UPs add one stack each
   *  (magnitude-agnostic) and recompute from the curve; HEAL/TAKE_DAMAGE use it. */
  applyEffect(effect, magnitude, game) {
    switch (effect) {
      case 'HEAL':
      case 'HEART': // rare mob drop (+1); shares the heal clamp, magnitude set by the pickup
        this.hearts = Math.min(this.maxHearts, this.hearts + magnitude);
        break;
      case 'FIRE_RATE_UP':
        this._bumpWeaponStat('fireRate'); // ADR-0030: binds to the held gun
        break;
      case 'DAMAGE_UP':
        this._bumpWeaponStat('damage'); // ADR-0030: binds to the held gun
        break;
      case 'SPEED_UP':
        this._up.speed++; // move-speed stays global
        this._recomputeUpgrades();
        break;
      case 'TAKE_DAMAGE':
        this.invuln = 0;
        this.spawnSafe = 0; // forced damage must LAND — clear entry grace too, else hurt() swallows it (ADR-0032)
        this.hurt(magnitude, game);
        break;
      // SPAWN_ENEMIES is handled by the game (it owns spawning)
    }
    game.refreshHud();
  }

  // ---- B9b: room-clear OFFER integration (the engine is pure core/offers.js + core/items.js) ----

  /**
   * Context for core/offers.js generateOffer(). `owned` weapon ids are UPPERCASED to match the
   * registry ids (slots store lowercase keys) so the owned-weapon down-weight actually fires; `stacks`
   * drives the marginal "+X%" blurb; `commonStreak` drives this player's offer pity.
   */
  offerContext() {
    const w = this._wUp();
    const def = this.weaponDef || {};
    return {
      owned: this.slots.map((s) => s.toUpperCase()),
      recent: this.offerRecent,
      stacks: {
        DAMAGE_UP: w.damage, // per-weapon → the marginal "+X%" blurb reflects THIS gun (ADR-0030)
        FIRE_RATE_UP: w.fireRate,
        SPEED_UP: this._up.speed,
      },
      // ADR-0030 weapon-aware gating: skip maxed stats + block explosive on explosive/fast guns.
      // weaponExplosive includes the gun's OWN blast picks so one MOD_BLAST stops further offers;
      // weaponMods lets maxed mod cards drop out; auraLevel gates the Blade Aura once maxed (CP-B).
      statCap: CAPS.upgradesPerStat,
      weaponStat: { DAMAGE_UP: w.damage, FIRE_RATE_UP: w.fireRate },
      weaponMods: {
        MOD_PIERCE: w.pierce,
        MOD_BOUNCE: w.bounces,
        MOD_BULLET_SPEED: w.bulletSpeed,
        MOD_BLAST: w.explodeRadius,
      },
      weaponExplosive: !!def.explosive || w.explodeRadius > 0,
      weaponFast: (def.cooldown ?? 1) <= OFFERS.fastWeaponCd,
      auraLevel: this._auraLevel, // CP-B: gate the Blade Aura pick once it hits max level
      guardCharges: this.guardCharges, // CP-B: gate armor picks once plates are maxed (no dead cards)
      ownedCount: this.slots.length,
      luck: this._up.luck, // in-run positive dial (the engine clamps it)
      permLuck: this._baseline.luck, // CP4: permanent Fortune luck → the D2 offer curve
      // ADR-0045: curse + bonusLuck are KARMA-derived and injected by the GAME at the offer roll
      // (karma is a per-run, game-level dial, not a per-player field), so offerContext omits them.
      globalDamageFlat: this._globalDamageFlat, // CP4: gate GLOBAL_DAMAGE once its flat stacks max out
      seenWeapons: this.offerSeenWeapons, // see-it-once weapon decay
      commonStreak: this.offerCommonStreak,
    };
  }

  /** remember the ids just offered (anti-repeat ring buffer, capped at OFFERS.recentMemory).
   *  Weapons ALSO get a permanent see-it-once count — each sighting halves their future weight. */
  noteOffered(ids) {
    this.offerRecent.push(...ids);
    if (this.offerRecent.length > OFFERS.recentMemory) {
      this.offerRecent.splice(0, this.offerRecent.length - OFFERS.recentMemory);
    }
    for (const id of ids) {
      if (itemById(id)?.category === 'weapon') {
        this.offerSeenWeapons[id] = (this.offerSeenWeapons[id] ?? 0) + 1;
      }
    }
  }

  /**
   * Apply a chosen offer card. The card carries only id/name/tier/category/blurb, so we look the full
   * item up in the registry and run its `effect`. Updates this player's offer pity streak.
   */
  applyOfferCard(card, game) {
    const item = itemById(card.id);
    if (!item) return;
    const e = item.effect;
    switch (e.kind) {
      case 'stat': // ADR-0030: damage / fireRate bind to the HELD gun; speed stays global
        if (e.stat === 'speed') {
          this._up.speed++;
          this._recomputeUpgrades();
        } else {
          this._bumpWeaponStat(e.stat);
        }
        break;
      case 'heal':
        this.hearts = Math.min(this.maxHearts, this.hearts + e.amount);
        break;
      case 'guard': // CP-B: armor plates are hard-capped so the HUD count is never a lie ("3 max")
        this.guardCharges = Math.min(GUARD.maxCharges, this.guardCharges + e.charges);
        break;
      case 'bladeAura': // CP-B: stack the passive blade aura, capped at its max level
        this._auraLevel = Math.min(e.maxStacks ?? Infinity, this._auraLevel + e.add);
        break;
      case 'mod': {
        // ADR-0030: weapon mods bind to the HELD gun, capped per stat
        const w = this._wUp();
        if ((w[e.flag] ?? 0) < CAPS.upgradesPerStat) w[e.flag]++;
        break;
      }
      case 'globalDamageFlat': // CP4 ultra: flat +add per shot across ALL weapons, capped at maxStacks
        this._globalDamageFlat = Math.min(e.maxStacks, this._globalDamageFlat + e.add);
        break;
      case 'luck': // ADR-0030 positive dial (global, like speed — it buffs the run, not the gun)
        this._up.luck++;
        break;
      case 'weapon':
        this.addWeapon(e.weapon);
        break;
    }
    // offer pity: a common TAKEN extends the dry streak; anything rarer resets it
    this.offerCommonStreak = card.tier === 'common' ? this.offerCommonStreak + 1 : 0;
    game?.refreshHud();
  }
}
