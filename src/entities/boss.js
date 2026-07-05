// =====================================================================
// boss.js — the generic BOSS shell. Data-driven: a `bossType` selects a
// behavior module (entities/bosses/*) and a stat block (config.BOSS[type]).
//
// The shell owns the shared parts every boss needs — HP, movement, contact
// damage, the telegraph "puff up" scale, hurt/die — and delegates the unique
// parts to the behavior: buildMesh / init / move? / attacks / spawns / animate.
// (P# = an ATTACK PATTERN, not a health phase — the co-designer's card.)
//
// Conforms to the bullet/collision interface (x, z, radius, hp, dead, hurt(),
// die(), update()) so pooled-bullet collision works on bosses with no special
// casing.
// =====================================================================

import {
  BOSS,
  PALETTE,
  PARTICLES,
  DUO,
  DIFFICULTY,
  FAIRNESS_TARGETS,
  DEBUG_FAIRNESS,
  FEEL,
  JUICE,
} from '../config.js';
import { hardnessFacet } from '../core/scaling.js';
import { pendingFlips } from '../core/phaseFlip.js';
import { BEHAVIORS } from './bosses/index.js';
import { hud } from '../ui/hud.js';
import { castShadows } from '../core/shadows.js';
import {
  slideOutOfWalls,
  clampToArena,
  advanceKnockback,
  applyKnockImpulse,
} from '../systems/collision.js';
import { normalize, circleVsCircle } from '../core/math2d.js';
import * as audio from '../systems/audio.js';

export class Boss {
  constructor(scene, x, z, bossType = 'spider', diff = 1, palette = null, opts = {}) {
    this.scene = scene;
    this.isBoss = true;
    this.bossType = bossType;
    this.behavior = BEHAVIORS[bossType] || BEHAVIORS.spider;
    this.cfg = BOSS[bossType] || BOSS.spider;
    this.name = this.behavior.name;
    this.title = this.behavior.title || ''; // ADR-0033 name-card epithet (may be empty)
    // dev-only kid-fairness audit (flip DEBUG_FAIRNESS.warnOnInit on while tuning difficulty)
    if (DEBUG_FAIRNESS.warnOnInit && this.cfg.telegraph != null) {
      const ms = this.cfg.telegraph * 1000;
      if (ms < FAIRNESS_TARGETS.telegraphMinMs.easy) {
        console.warn(
          `[fairness] boss "${bossType}" telegraph ${ms}ms < easy target ${FAIRNESS_TARGETS.telegraphMinMs.easy}ms`,
        );
      }
    }
    this.palette = palette; // per-floor colors (shared with this boss's minions)
    this.theme = { boss: bossType, palette };
    this.diff = diff;
    this.x = x;
    this.z = z;
    this.radius = this.cfg.radius;
    this.maxHp = Math.round(
      this.cfg.hp * diff * hardnessFacet(DIFFICULTY.hardnessMul, DIFFICULTY.hpWeight),
    );
    this.hp = this.maxHp;
    this.speed = this.cfg.speed * (0.9 + diff * 0.1);
    this.dead = false;
    this.knock = { x: 0, z: 0 }; // knockback velocity (B7); stays 0 unless this.cfg.knockback opts in
    this.contactTimer = 0;
    this.charge = 0; // >0 while telegraphing (drives the puff-up scale)
    this.phase = 0;
    this.ragePhase = 0; // 0 until an HP breakpoint flips it (cfg.phaseFlips); behaviors read it
    this._flipsPassed = 0; // how many phase-flip breakpoints have fired (monotonic)
    this.t = 0;
    this.enraged = false; // duo: set when a partner falls (no revive)
    this.enrageMul = 1; // permanent rage bump folded into `rage` once enraged
    this.invuln = false; // skeleton: true during reassemble i-frames (unhittable + intangible)

    this.behavior.init?.(this);

    const built = this.behavior.buildMesh(this, palette);
    this.mesh = built.mesh;
    this.legs = built.legs || []; // spider leg joints (procedural animate)
    this.cap = built.cap || null; // mushroom procedural cap (pulsed in animate)
    this.anim = built.anim || null; // animated GLB model (plays its own clip)
    castShadows(this.mesh); // the boss casts a shadow (covers procedural + GLB meshes)
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
    // ADR-0033: an entrance-cinematic boss defers its roar to the reveal beat (game.js
    // fires boss.roar() then), so it doesn't fire at spawn behind the name card.
    if (!opts.silentRoar) this.roar();
  }

  /** the boss's roar/growl sting — deferred to the entrance reveal for intro bosses (ADR-0033) */
  roar() {
    audio.play(this.behavior.roar || 'bossRoar');
  }

  /** speeds up as it weakens (50%/25% gates), then again if enraged — every boss */
  get rage() {
    const f = this.hp / this.maxHp;
    const base = f <= 0.25 ? 1.5 : f <= 0.5 ? 1.2 : 1;
    return base * this.enrageMul;
  }

  /** duo: this beast's partner fell — rage permanently and fight solo (no revive) */
  onPartnerDown(mul = DUO.enrageMul) {
    if (this.dead) return;
    this.enraged = true;
    this.enrageMul = mul;
    this.mesh.scale.setScalar(DUO.enrageScale); // a visible "I'm angry now" pop
    audio.play('bossRoar');
  }

  /**
   * Opt-in HP-breakpoint phase flips (cfg.phaseFlips, DESCENDING e.g. [0.5, 0.25]). On each
   * crossing, run one cinematic beat and hand the behavior an `onPhaseFlip(boss, game, idx)`
   * so it can escalate its pattern set. Monotonic via `_flipsPassed` (a heal can't un-flip).
   */
  _checkPhaseFlips(game) {
    const bps = this.cfg.phaseFlips;
    if (!bps || this._flipsPassed >= bps.length) return;
    const frac = this.hp / this.maxHp;
    for (const idx of pendingFlips(frac, bps, this._flipsPassed)) {
      this._flipsPassed = idx + 1;
      this.ragePhase = idx + 1;
      this._onPhaseFlip(game, idx);
    }
  }

  /** the shared "phase 2!" beat: a fair screen-wipe + tell, then the boss-specific escalation */
  _onPhaseFlip(game, idx) {
    this.charge = 0; // cancel any mid-telegraph so the flip reads cleanly (fair)
    game.bullets?.clearEnemyBullets?.(); // wipe the screen — a breathing beat, not a free hit
    game.juice.addTrauma(JUICE.traumaOnPhaseFlip);
    game.juice.hitStop(JUICE.hitStopOnPhaseFlip);
    const sf = FEEL.screenFlash.phaseFlip;
    hud.flashScreen(sf.peak, sf.color, sf.ms);
    this.mesh.scale.setScalar(1.5); // a visible "I'm changing" pop (settles in update)
    audio.play(this.behavior.roar || 'bossRoar');
    this.behavior.onPhaseFlip?.(this, game, idx); // boss-specific recolor / pattern swap
  }

  update(dt, game) {
    if (this.dead) return;
    const p = game.nearestPlayer(this.x, this.z) || game.player;
    this.t += dt;
    this.contactTimer -= dt;
    const rage = this.rage;

    // HP-gated PHASE FLIP: as it crosses a breakpoint it does a one-time "phase 2" beat
    // (screen wipe + roar) and bumps ragePhase, which its behavior reads to escalate patterns.
    this._checkPhaseFlips(game);

    if (this.behavior.move) {
      this.behavior.move(this, dt, game, p, rage);
    } else {
      // default movement: scuttle toward the nearest player
      const dir = normalize(p.x - this.x, p.z - this.z);
      this.x += dir.x * this.speed * rage * dt;
      this.z += dir.z * this.speed * rage * dt;
      let q = slideOutOfWalls(this.x, this.z, this.radius, game.walls);
      q = clampToArena(q.x, q.z, this.radius);
      this.x = q.x;
      this.z = q.z;
      this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    }

    // apply + decay any knockback (no-op for bosses unless cfg.knockback opts in — telegraphs stay
    // on-beat by default), re-resolving walls so a shove can't tunnel
    advanceKnockback(this, dt, game.walls);

    // contact damage (intangible while reforming -> no touch damage)
    if (
      this.contactTimer <= 0 &&
      !this.invuln &&
      p.alive &&
      circleVsCircle(this.x, this.z, this.radius, p.x, p.z, p.radius)
    ) {
      p.hurt(this.cfg.contactDamage, game);
      this.contactTimer = this.cfg.contactCooldown;
    }

    if (p.alive) {
      this.behavior.attacks?.(this, dt, game, p, rage);
      this.behavior.spawns?.(this, dt, game);
    }

    this.behavior.animate?.(this, rage);
    this.anim?.update(dt); // advance the GLB animation clip, if any

    // settle the hit-pop / telegraph scale back toward 1. While telegraphing
    // (charge > 0) the boss puffs up AND pulses, so the incoming attack reads
    // clearly = fair warning (the full ground-ring telegraph lands in a later stage).
    const target = this.charge > 0 ? 1.4 + 0.08 * Math.sin(this.t * 30) : 1;
    const s = this.mesh.scale.x;
    this.mesh.scale.setScalar(s + (target - s) * Math.min(1, dt * 12));
    this.mesh.position.set(this.x, 0, this.z);
  }

  hurt(dmg, game, knockDir = null) {
    if (this.dead || this.invuln) return; // can't be hit mid-reassemble
    this.hp -= dmg;
    // bosses ignore knockback by default (telegraph protection); opt in via cfg.knockback
    applyKnockImpulse(this, knockDir, this.cfg.knockback ?? FEEL.knockback.bossDefault);
    game.particles.burst(this.x, this.z, PARTICLES.perHit, PALETTE.blood);
    this.mesh.scale.setScalar(1.15);
    audio.play('bossHit');
    if (this.hp <= 0) this.die(game);
  }

  die(game) {
    this.dead = true;
    game.particles.burst(this.x, this.z, PARTICLES.perDeath * 3, PALETTE.blood);
    game.juice.addTrauma(game.JUICE.traumaOnBossDeath);
    game.juice.hitStop(game.JUICE.hitStopOnBossDeath);
    const sf = game.FEEL.screenFlash.bossDeath;
    hud.flashScreen(sf.peak, sf.color, sf.ms);
    this.anim?.dispose(); // free the GLB AnimationMixer (no leak across rooms)
    this.scene.remove(this.mesh);
  }
}
