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
  PALETTE,
  CAPS,
  UPGRADES,
  DAMAGE_REDUCTION,
  OFFERS,
  GUARD,
  GRAPHICS,
  WEAPON_MODS,
} from '../config.js';
import { statBonus } from '../core/scaling.js';
import { itemById, weaponTier } from '../core/items.js';
import { deriveWeaponFx, rarityIntensity } from '../core/weaponFxDerive.js';
import { spinUpCooldown } from '../core/spinUp.js';
import { resolveIncoming } from '../core/defense.js';
import { makeCharacter } from './characterMesh.js';
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
    { color = PALETTE.player, modelKey = 'player', device = 'both', baseline = null } = {},
  ) {
    this.device = device; // 'kb' | 'pad' | 'both'
    this.mesh = makeCharacter(modelKey, {
      radius: PLAYER.radius,
      height: PLAYER.height,
      color,
    });
    scene.add(this.mesh);
    this.radius = PLAYER.radius;
    this._baseColor = new THREE.Color(color);
    this.slotsUnlocked = 1; // grows as bosses are beaten (set by game)
    // permanent baseline stacks from the Echoes meta-layer (B10 / ADR-0029); all-zero pre-beat
    this._baseline = baseline ?? {
      damage: 0,
      fireRate: 0,
      speed: 0,
      damageReduction: 0,
      hearts: 0,
      guard: 0,
    };
    this.reset(0, 0);
  }

  reset(x, z) {
    this.x = x;
    this.z = z;
    const bl = this._baseline;
    this.maxHearts = Math.min(CAPS.maxHearts, PLAYER.maxHearts + bl.hearts); // grows via offered MAX_HP_UP
    this.hearts = this.maxHearts;
    this.alive = true;
    this.fireTimer = 0;
    this.invuln = 0;
    this._beatTimer = 0;
    // upgrade STACKS — seeded from the permanent baseline (all-zero pre-beat), then each OFFER pick
    // (B9b) adds one; the derived stats come from the diminishing-returns curve (config.UPGRADES +
    // core/scaling.js) so power ramps over the run instead of capping early.
    // GLOBAL body/run stats live here; per-weapon damage/fireRate/mods live in _weaponUpgrades (ADR-0030).
    // Baseline speed/damageReduction are NOT seeded in as stacks (ADR-0031): the permanent Resonance
    // % is a standalone bonus applied in _recomputeUpgrades, kept separate from the in-run curve.
    this._up = {
      speed: 0,
      damageReduction: 0,
      luck: 0, // ADR-0030 positive dial — biases offer tiers up (capped in the offer engine)
    };
    this.guardCharges = bl.guard; // permanent guard charges from the meta-layer (added to offer charges)
    this._drCarry = 0; // banked fractional damage-reduction (core/defense.js carry accumulator)
    // per-weapon per-stat upgrade PICK-COUNTS (ADR-0030): key -> {damage,fireRate,pierce,bounces,
    // bulletSpeed,explodeRadius}, each capped at CAPS.upgradesPerStat. Kept on cycle, wiped on replace.
    this._weaponUpgrades = {};
    this._globalDmgMul = 1; // rare global max-damage reward (multiplies final shot damage, uncapped)
    this.offerRecent = []; // recently-offered item ids → anti-repeat (OFFERS.recentMemory)
    this.offerSeenWeapons = {}; // weapon id → times OFFERED this run (see-it-once decay, ADR-0030)
    this.offerCommonStreak = 0; // consecutive commons TAKEN → drives offer pity (per player)
    this.slots = ['pistol']; // weapons you carry; slotsUnlocked is the capacity
    this.slotIndex = 0;
    this._refreshWeapon(); // sets weapon + ensures its upgrade entry + recomputes derived stats
    this.mesh.position.set(x, 0, z);
    this.mesh.visible = true;
  }

  revive(x, z) {
    this.x = x;
    this.z = z;
    this.hearts = this.maxHearts; // upgrades (incl. max-life) persist through a life-loss
    this._drCarry = 0; // a full restore wipes banked reduced-damage (don't carry it past a revive)
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
    if (!this.weaponDef.orbital) this._hideOrbital(); // stash orbital blades
    this._wUp(this.weapon); // ensure this gun has a per-weapon upgrade entry
    this._recomputeUpgrades(); // derived damage/fire-rate follow the HELD gun (ADR-0030)
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

    // --- aim + shoot ---
    const aim = input.aim(this.device, camera, this.x, this.z);
    this.mesh.rotation.y = Math.atan2(aim.x, aim.z);

    if (this.weaponDef.orbital) {
      this._updateOrbital(dt, game);
    } else if (this.weaponDef.charge) {
      this.fireTimer -= dt;
      this._updateCharge(dt, game, aim);
    } else {
      this.fireTimer -= dt;
      const shooting = input.shoot(this.device) && (aim.x !== 0 || aim.z !== 0);
      // minigun spin-up: the fire cadence winds up while the trigger is held, resets on release
      if (this.weaponDef.spinUp) this._spin = shooting ? (this._spin || 0) + dt : 0;
      if (shooting && this.fireTimer <= 0) {
        this._fireWeapon(game, aim);
        const cd = this.weaponDef.spinUp
          ? spinUpCooldown(this._spin, this.weaponDef.spinUp)
          : this.weaponDef.cooldown;
        this.fireTimer = cd * this.fireRateMul;
        game.juice.addTrauma(game.JUICE.traumaOnShoot);
        audio.play(SHOOT_SFX[this.weapon] || 'shoot');
        if (this.device !== 'kb' && cd >= 0.15) input.rumble(0.12, 0.08, 50);
      }
    }

    // --- i-frames + hit flash ---
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
        damage: w.damage * this.damageMul * this._globalDmgMul, // capped mult × rare global max-damage
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

  // --- Orbital Blade: blades circle the player and hit on contact (no aiming) ---
  _updateOrbital(dt, game) {
    const def = this.weaponDef;
    if (!this._orbital) this._orbital = { blades: [], angle: 0, cd: new Map() };
    const orb = this._orbital;
    while (orb.blades.length < def.count) {
      const m = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.4, 0),
        new THREE.MeshBasicMaterial({ color: def.color ?? 0x66ffd0 }),
      );
      game.scene.add(m);
      orb.blades.push(m);
    }
    orb.angle += def.spin * dt;
    for (let i = 0; i < def.count; i++) {
      const a = orb.angle + (i / def.count) * Math.PI * 2;
      const bx = this.x + Math.sin(a) * def.radius;
      const bz = this.z + Math.cos(a) * def.radius;
      const m = orb.blades[i];
      m.position.set(bx, 1, bz);
      m.rotation.y += dt * 6;
      m.visible = true;
      for (const e of game.enemies) {
        if (e.dead || (orb.cd.get(e) || 0) > 0) continue;
        if (circleVsCircle(bx, bz, 0.5, e.x, e.z, e.radius)) {
          // global max-damage applies to blades too ("all weapons"); fire-rate speeds up the
          // per-enemy hit tick so FIRE_RATE_UP is a live pick on the orbital (ADR-0030 review)
          e.hurt(
            def.damage * this.damageMul * this._globalDmgMul,
            game,
            normalize(e.x - this.x, e.z - this.z), // shove away (B7)
          );
          game.weaponfx?.impact(bx, bz, 'enemy', this._weaponFx, this._fxIntensity);
          orb.cd.set(e, def.hitCooldown * this.fireRateMul);
        }
      }
    }
    for (const [e, t] of orb.cd) {
      const nt = t - dt;
      if (nt <= 0) orb.cd.delete(e);
      else orb.cd.set(e, nt);
    }
  }

  _hideOrbital() {
    if (this._orbital) for (const m of this._orbital.blades) m.visible = false;
  }

  /**
   * Tear down anything this player added to the scene BEYOND its own mesh.
   * Right now that's the orbital blades — they live directly in the scene (not
   * under `this.mesh`), so removing the mesh alone would orphan them. Without
   * this, resetting the game while the Orbital Blade is equipped left the blades
   * frozen in the scene at their last position. Call before dropping a player.
   */
  dispose(scene) {
    if (this._orbital) {
      for (const m of this._orbital.blades) {
        scene.remove(m);
        m.geometry?.dispose();
        m.material?.dispose();
      }
      this._orbital = null;
    }
  }

  // --- Charge Cannon: hold to charge, release a bigger/stronger cannonball ---
  _updateCharge(dt, game, aim) {
    const aiming = aim.x !== 0 || aim.z !== 0;
    if (this.fireTimer > 0) return; // respect the weapon cooldown between charge shots
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
      damage: lerp(c.minDamage, c.maxDamage) * this.damageMul * this._globalDmgMul,
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
    game.juice.addTrauma(game.JUICE.traumaOnShoot + game.JUICE.traumaChargeBonus * f);
    audio.play(f > 0.6 ? 'chargeShot' : 'shoot');
    if (this.device !== 'kb') game.input.rumble(0.2 + 0.4 * f, 0.1, 60 + f * 80);
  }

  hurt(dmg, game) {
    if (game.godMode || this.invuln > 0 || !this.alive) return;
    // guard charges + damage-reduction resolve BEFORE any heart comes off (core/defense.js, B9b)
    const res = resolveIncoming(dmg, {
      guardCharges: this.guardCharges,
      reduction: this.damageReductionFrac,
      carry: this._drCarry,
    });
    this.guardCharges = res.guardCharges;
    this._drCarry = res.carry;
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

    this.hearts -= res.heartsLost; // whole hearts only (damage reduction banks the remainder)
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
      this._hideOrbital(); // else orbital blades freeze visible at the death spot
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
    // move-speed + damage-reduction stay GLOBAL (they buff the body/run, not the gun)
    this.speed = Math.min(
      PLAYER.speed * CAPS.speedMul,
      PLAYER.speed *
        (1 + statBonus(this._up.speed, UPGRADES.speed.maxBonus, UPGRADES.speed.half) + bl.speed),
    );
    this.damageReductionFrac =
      statBonus(this._up.damageReduction, DAMAGE_REDUCTION.maxBonus, DAMAGE_REDUCTION.half) +
      bl.damageReduction;
  }

  /** apply a survivor outcome or pickup buff/debuff. The UPs add one stack each
   *  (magnitude-agnostic) and recompute from the curve; HEAL/TAKE_DAMAGE use it. */
  applyEffect(effect, magnitude, game) {
    switch (effect) {
      case 'HEAL':
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
        DMG_REDUCT: this._up.damageReduction,
      },
      // ADR-0030 weapon-aware gating: skip maxed stats + block explosive on explosive/fast guns.
      // weaponExplosive includes the gun's OWN blast picks so one MOD_BLAST stops further offers;
      // weaponMods lets maxed mod cards drop out; weaponOrbital blocks bullet-mods on the blades.
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
      weaponOrbital: !!def.orbital,
      ownedCount: this.slots.length,
      luck: this._up.luck, // positive dial (the engine clamps it)
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
      case 'damageReduction':
        this._up.damageReduction++;
        this._recomputeUpgrades();
        break;
      case 'heal':
        this.hearts = Math.min(this.maxHearts, this.hearts + e.amount);
        break;
      case 'maxLife':
        this.maxHearts = Math.min(CAPS.maxHearts, this.maxHearts + e.amount);
        this.hearts = Math.min(this.maxHearts, this.hearts + e.amount); // a new heart container fills
        break;
      case 'guard':
        this.guardCharges += e.charges;
        break;
      case 'mod': {
        // ADR-0030: weapon mods bind to the HELD gun, capped per stat
        const w = this._wUp();
        if ((w[e.flag] ?? 0) < CAPS.upgradesPerStat) w[e.flag]++;
        break;
      }
      case 'globalDamage': // rare top-tier: a permanent damage multiplier across ALL weapons
        this._globalDmgMul *= e.mult;
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
