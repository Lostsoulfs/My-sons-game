// =====================================================================
// game.js — the conductor. Owns the world, runs the state machine, wires
// every system together each tick, and renders (with camera shake).
//
//   BOOT -> (start menu) -> PLAYING -> ROOM_CLEAR -> ... -> WIN
//                                  \-> DEAD (out of lives -> start over)
//
// Single-player: you (blue) + an AI ally (green). Co-op: P1 = you (keyboard,
// blue), P2 = the ally (Xbox controller, green). In co-op a downed player
// revives when the room is cleared; Game Over only on a full wipe.
// =====================================================================

import {
  CAMERA,
  JUICE,
  FEEL,
  ARENA,
  CAPS,
  PALETTE,
  MENU_CURSOR,
  SAVES,
  PICKUPS,
} from './config.js';
import { State } from './states.js';
import { makeRng } from './core/rng.js';
import { floorInfo, nextIsBoss, resolveDeath, weaponSlotsForBosses } from './core/progression.js';
import { Player } from './entities/player.js';
import { Ally } from './entities/ally.js';
import { Enemy } from './entities/enemies.js';
import { Bullets } from './entities/bullets.js';
import { Hazards } from './systems/hazards.js';
import { Overlays } from './systems/overlays.js';
import { Pickup } from './entities/pickups.js';
import { generateOffer } from './core/offers.js';
import { Particles } from './systems/particles.js';
import { WeaponFX } from './systems/weaponfx.js';
import { Juice } from './systems/juice.js';
import { buildRoom } from './systems/rooms.js';
import { populateRoom } from './systems/spawner.js';
import { resolveDecision } from './systems/npcDecision.js';
import { resolveHuman } from './systems/humanDecision.js';
import { circleVsBox, circleVsCircle, springCritDampedXZ } from './core/math2d.js';
import { cameraTarget } from './core/camera.js';
import { settings } from './systems/settings.js';
import { hud } from './ui/hud.js';
import { prompts } from './ui/prompts.js';
import { showHumanChoice, moveChoiceFocus, confirmChoice } from './ui/humanchoice.js';
import { showOffer, moveOfferFocus, confirmOffer } from './ui/offer.js';
import * as audio from './systems/audio.js';
import { saves, baselineStacks } from './core/saves.js';
import { openMetaPanel } from './ui/metaProgress.js';

export class Game {
  constructor({ renderer, scene, camera, baseCam, input, postfx }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.baseCam = baseCam;
    this.postfx = postfx; // post-processing pipeline (ADR-0025); may be undefined in tests
    this.input = input;
    this.JUICE = JUICE;
    this.FEEL = FEEL;
    // B3 camera spring-follow: a small pan offset from arena center (XZ) + its velocity.
    this.camPan = { x: 0, z: 0 };
    this.camVel = { x: 0, z: 0 };

    this.enemies = [];
    this.npcs = [];
    this.pickups = [];
    this.walls = [];
    this.activeNpc = null;
    this.bosses = []; // 0, 1, or 2 bosses in a boss room (the duo = 2)
    this.duo = null; // DuoController when a multi-boss floor is loaded
    this.room = null;
    this.roomIndex = 0;
    this.lives = CAPS.lives.start;
    this.checkpointRoom = 0;
    this.bossesBeaten = 0; // drives weapon-slot unlocks
    // B9b room-clear offer flow (a paused pick-1-of-3 modal, one per living player)
    this._offerActive = false; // an offer sequence is in progress (guards _finishRoomClear)
    this._offerQueue = []; // players still to pick this room
    this._offerPlayer = null; // the player currently choosing (drives the gamepad arm)
    this._offerLatch = false; // gamepad focus-move debounce (mirrors _choiceLatch)
    this.godMode = false; // debug menu toggle

    this.coop = false;
    this.players = []; // [p1] or [p1, p2]
    this.player = null; // = players[0]
    this.player2 = null;
    this.ally = null; // AI ally (single-player only)
    this.state = State.BOOT;
  }

  init() {
    audio.registerDefaultSounds();
    this.particles = new Particles(this.scene);
    this.juice = new Juice();
    this.bullets = new Bullets(this.scene);
    this.weaponfx = new WeaponFX(this.scene, this.particles); // pooled muzzle/trail/impact FX
    this.hazards = new Hazards(this.scene);
    this.overlays = new Overlays(this.scene); // boss telegraph rings + opt-in hitbox overlay
    // players are created in startRun (which the start menu calls)
  }

  startRun(coop = false, seed = (Math.random() * 1e9) | 0) {
    this.coop = coop;
    // Seed defaults to random per run; pass a fixed seed to make a run
    // reproducible (e.g. window.__game.startRun(false, 12345)) — ADR-0013.
    this.rng = makeRng(seed);
    this.lives = CAPS.lives.start;
    this.checkpointRoom = 0;
    this.bossesBeaten = 0;
    // reset the camera pan so a new run starts centered (no carry-over from a prior run)
    this.camPan.x = this.camPan.z = 0;
    this.camVel.x = this.camVel.z = 0;

    this._teardownActors();
    const baseline = baselineStacks(saves.get());
    this.player = new Player(this.scene, {
      color: PALETTE.player,
      modelKey: 'player',
      device: coop ? 'kb' : 'both',
      baseline,
    });
    if (coop) {
      this.player2 = new Player(this.scene, {
        color: PALETTE.ally,
        modelKey: 'ally',
        device: 'pad',
        baseline,
      });
      this.players = [this.player, this.player2];
    } else {
      this.ally = new Ally(this.scene);
      this.players = [this.player];
    }
    hud.setCoop(coop);
    this.loadRoom(0);
  }

  _teardownActors() {
    if (this.player) {
      this.player.dispose(this.scene); // also clears scene-attached orbital blades
      this.scene.remove(this.player.mesh);
    }
    if (this.player2) {
      this.player2.dispose(this.scene);
      this.scene.remove(this.player2.mesh);
    }
    if (this.ally) this.scene.remove(this.ally.mesh);
    this.player = null;
    this.player2 = null;
    this.ally = null;
  }

  /** closest living player to a point (null if everyone is down) */
  nearestPlayer(x, z) {
    let best = null;
    let bd = Infinity;
    for (const p of this.players) {
      if (!p.alive) continue;
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  loadRoom(index) {
    this.roomIndex = index;
    this.bosses = [];
    this.duo = null; // re-created by the spawner if this is a multi-boss room
    this._bossHandled = false;
    hud.hideBossBars();

    // clear out the previous room's actors (dispose anim mixers so they don't leak)
    for (const e of this.enemies) {
      e.anim?.dispose();
      this.scene.remove(e.mesh);
    }
    this.enemies = [];
    for (const n of this.npcs) {
      this.scene.remove(n.mesh);
      this.scene.remove(n.marker);
    }
    this.npcs = [];
    for (const p of this.pickups) this.scene.remove(p.mesh);
    this.pickups = [];
    this.activeNpc = null;
    this.bullets.clearAll();
    this.hazards.clearAll();
    this.weaponfx?.clear(); // drop queued secondary bursts — no FX leaking into the next room
    if (this.room) this.room.dispose();

    this.room = buildRoom(this.scene, this.rng);
    this.walls = this.room.walls;

    // place players at the bottom entrance (spread out in co-op)
    this.players.forEach((pl, i) => {
      pl.x = this.players.length > 1 ? (i === 0 ? -2.5 : 2.5) : 0;
      pl.z = ARENA.depth / 2 - 4;
      pl.mesh.position.set(pl.x, 0, pl.z);
      pl.mesh.visible = true;
    });
    if (this.ally) this.ally.reset(2, ARENA.depth / 2 - 3);

    populateRoom(this, index);
    this.bosses = this.enemies.filter((e) => e.isBoss);

    this.state = State.PLAYING;
    hud.hideBanner();
    prompts.hide();
    this.refreshHud();

    const info = floorInfo(index);
    // music: a boss theme in a (non-decision) boss room, else the stage track. The
    // human decision-boss keeps the stage track until the fight actually starts.
    if (info.isBossRoom && info.def.boss !== 'human' && this.bosses.length) {
      audio.setBossMusic(info.def.boss);
    } else {
      audio.setStageMusic(info.floorIndex);
    }
    if (info.isBossRoom && info.def.boss === 'human') {
      // decision-boss: pause for the A/B/C/D approach choice BEFORE any fight
      this.state = State.HUMAN_CHOICE;
      showHumanChoice((choice) => this._onHumanChoice(choice));
    } else if (info.isBossRoom && this.bosses.length) {
      const names = this.bosses.map((b) => b.name).join(' & ');
      hud.banner(`${names.toUpperCase()} — ${this.bosses.length > 1 ? 'KILL THEM' : 'KILL IT'}`);
      setTimeout(() => hud.hideBanner(), 1600);
    }
  }

  refreshHud() {
    const info = floorInfo(this.roomIndex);
    hud.setHearts(this.player.hearts, this.player.maxHearts);
    if (this.coop && this.player2) hud.setHearts2(this.player2.hearts, this.player2.maxHearts);
    hud.setLives(this.lives);
    hud.setRoom(info, this._weaponLabel(this.player));
  }

  _weaponLabel(p) {
    return p.slotsUnlocked > 1
      ? `${p.weaponName} [${p.slotIndex + 1}/${p.slotsUnlocked}]`
      : p.weaponName;
  }

  addEnemy(e) {
    this.enemies.push(e);
  }

  /** spawn a pickup a player can walk over to grab */
  spawnPickup(type, x, z) {
    this.pickups.push(new Pickup(this.scene, type, x, z));
  }

  update(dt) {
    this.input.update(); // poll gamepad once per tick

    // restart from a finished run
    if ((this.state === State.DEAD || this.state === State.WIN) && this.input.consumeRestart()) {
      this.startRun(this.coop);
      return;
    }
    if ((this.state === State.DEAD || this.state === State.WIN) && this.input.consumeForge()) {
      openMetaPanel();
      return;
    }

    if (this.state === State.PLAYING) {
      for (const pl of this.players) if (pl.alive) pl.update(dt, this);
      if (this.ally) this.ally.update(dt, this);
      if (this.duo) this.duo.update(dt); // alternating aggression + enrage-on-death
      for (const e of this.enemies) e.update(dt, this);
      this.bullets.update(dt, this);
      this.hazards.update(dt, this);
      this._handlePickups();
      this._handleSurvivors(dt);

      // ALL bosses dead -> sweep their minions so the room finishes cleanly
      if (this.bosses.length && this.bosses.every((b) => b.dead) && !this._bossHandled) {
        this._bossHandled = true;
        for (const e of this.enemies) {
          if (!e.isBoss && !e.dead) {
            e.anim?.dispose();
            this.scene.remove(e.mesh);
            e.dead = true;
          }
        }
      }
      this.enemies = this.enemies.filter((e) => !e.dead);

      if (this.bosses.length && this.bosses.some((b) => !b.dead)) hud.setBossBars(this.bosses);

      const wipe = !this.players.some((p) => p.alive);
      if (this.coop ? wipe : !this.player.alive) this._onDefeat();
      else if (this.enemies.length === 0) this._onRoomClear();
    } else if (this.state === State.ROOM_CLEAR) {
      for (const pl of this.players) if (pl.alive) pl.update(dt, this);
      if (this.ally) this.ally.update(dt, this);
      this.bullets.update(dt, this);
      this._handlePickups();
      this._handleSurvivors(dt); // survivors stay helpable after the fight is over
      this._checkDoor();
      // _checkDoor() may call loadRoom() or _onWin(), changing state this tick — only
      // update enemies when we're still in ROOM_CLEAR (hostile-survivor spawn case).
      if (this.state === State.ROOM_CLEAR && this.enemies.length) {
        for (const e of this.enemies) e.update(dt, this);
        this.enemies = this.enemies.filter((e) => !e.dead);
        const wipe = !this.players.some((p) => p.alive);
        if (this.coop ? wipe : !this.player.alive) this._onDefeat();
      }
    } else if (this.state === State.HUMAN_CHOICE) {
      // fight is paused while the overlay is up; just drive the gamepad cursor
      // (mouse + keyboard are handled inside ui/humanchoice.js)
      const mv = this.input.move('pad');
      if (mv.x > MENU_CURSOR.move && !this._choiceLatch) {
        moveChoiceFocus(1);
        this._choiceLatch = true;
      } else if (mv.x < -MENU_CURSOR.move && !this._choiceLatch) {
        moveChoiceFocus(-1);
        this._choiceLatch = true;
      } else if (Math.abs(mv.x) < MENU_CURSOR.settle) {
        this._choiceLatch = false;
      }
      if (this.input.consumeHelp('pad')) confirmChoice();
    } else if (this.state === State.OFFER) {
      // paused while the card modal is up; drive the picking player's gamepad (mouse + keyboard live
      // in ui/offer.js). Only a pad-using picker (solo 'both', co-op P2 'pad') is driven here.
      if (this._offerPlayer && this._offerPlayer.device !== 'kb') {
        const mv = this.input.move('pad');
        if (mv.x > MENU_CURSOR.move && !this._offerLatch) {
          moveOfferFocus(1);
          this._offerLatch = true;
        } else if (mv.x < -MENU_CURSOR.move && !this._offerLatch) {
          moveOfferFocus(-1);
          this._offerLatch = true;
        } else if (Math.abs(mv.x) < MENU_CURSOR.settle) {
          this._offerLatch = false;
        }
        if (this.input.consumeHelp('pad')) confirmOffer();
      }
    }

    this.particles.update(dt);
    this.weaponfx.update(dt);
    this.juice.update(dt);
    this._updateCamera(dt);
  }

  /**
   * Advance the subtle camera pan toward the live-player centroid (B3, ADR-0026; amends
   * ADR-0020's static framing). Hard-clamped to ±followMaxPan so the whole room stays
   * readable; pinned to center when reducedEffects + calmCamera (motion-sensitive play).
   */
  _updateCamera(dt) {
    const c = CAMERA;
    const follow = c.followEnabled && !(c.calmCamera && settings.get('reducedEffects'));
    const target = follow
      ? cameraTarget(this.players, {
          maxPan: c.followMaxPan,
          splitInner: c.coopSplitInner,
          splitOuter: c.coopSplitOuter,
        })
      : { x: 0, z: 0 };
    springCritDampedXZ(this.camPan, this.camVel, target, dt, { omega: c.followOmega });
  }

  _handlePickups() {
    for (const item of this.pickups) {
      if (item.dead) continue;
      item.update(1 / 60);
      for (const pl of this.players) {
        if (!pl.alive) continue;
        // a full-health player can't pick up a heart (leave it for a hurt teammate)
        if ((item.type === 'HEAL' || item.type === 'HEART') && pl.hearts >= pl.maxHearts) continue;
        if (circleVsCircle(pl.x, pl.z, pl.radius, item.x, item.z, item.radius)) {
          item.collect(this, pl);
          break;
        }
      }
    }
    this.pickups = this.pickups.filter((i) => !i.dead);
  }

  _handleSurvivors(dt) {
    let near = null;
    for (const n of this.npcs) {
      n.update(dt);
      if (!near && this.players.some((p) => p.alive && n.inRange(p))) near = n;
    }
    this.activeNpc = near;

    if (near) {
      prompts.show(`${near.name} is trapped!   [E] Help   ·   [Q] Leave`);
      if (this.input.consumeHelp('both')) this._resolveSurvivor(near, 'HELP');
      else if (this.input.consumeLeave('both')) this._resolveSurvivor(near, 'LEAVE');
    } else {
      prompts.hide();
      this.input.consumeHelp('both'); // drop stray presses
      this.input.consumeLeave('both');
    }
  }

  _resolveSurvivor(npc, choice) {
    const outcome = resolveDecision(this.rng, choice);
    npc.markUsed();
    this.activeNpc = null;
    prompts.hide();

    if (outcome.effect === 'SPAWN_ENEMIES') {
      for (let i = 0; i < outcome.magnitude; i++) {
        // Spawn on a ring so enemies don't land on the player standing next to the NPC.
        const angle = this.rng.next() * Math.PI * 2;
        const ringR =
          FEEL.survivorSpawnRing.min +
          this.rng.next() * (FEEL.survivorSpawnRing.max - FEEL.survivorSpawnRing.min);
        const ox = npc.x + Math.cos(angle) * ringR;
        const oz = npc.z + Math.sin(angle) * ringR;
        this.addEnemy(new Enemy(this.scene, 'chaser', ox, oz));
      }
    } else {
      const pl = this.nearestPlayer(npc.x, npc.z) || this.player;
      pl.applyEffect(outcome.effect, outcome.magnitude, this);
    }

    // big, lingering feedback so the choice never goes unnoticed
    const label = (choice === 'HELP' ? 'HELPED: ' : 'LEFT THEM: ') + outcome.message;
    hud.banner(label);
    setTimeout(() => hud.hideBanner(), 1500);
    this.juice.hitStop(0.08);
    audio.play(outcome.good ? 'good' : 'bad');
    this.refreshHud();
  }

  _onRoomClear() {
    // co-op: a teammate who was DOWN when the room cleared FORFEITS this room's upgrade — you
    // can't suicide to skim offers off your partner's kills (anti-farm, keeps 2P honest). Capture
    // who was down BEFORE reviving, so the revive restores their health but not the reward.
    this._forfeitOffer = new Set();
    if (this.coop) {
      for (const pl of this.players) {
        if (!pl.alive) {
          this._forfeitOffer.add(pl);
          pl.revive(pl.x, pl.z);
        }
      }
      this.refreshHud();
    }

    this.bullets.clearEnemyBullets();
    this.hazards.clearAll();
    prompts.hide();
    const info = floorInfo(this.roomIndex);

    if (info.isBossRoom) {
      hud.hideBossBars();
      audio.play('bossDie');
      this.input.rumble(0.8, 0.6, 300); // boss-down rumble
      this._countBossBeaten();
      // checkpoint: respawn at the next floor if you die from here on
      if (!info.isLastRoom) this.checkpointRoom = this.roomIndex + 1;
      hud.banner(info.isLastRoom ? 'BOSS DOWN — FINAL EXIT!' : 'BOSS DOWN — CHECKPOINT SAVED!');
      // a boss always heals you — NO more ground weapon chest (ADR-0030); spot is config-tunable
      this.spawnPickup('HEAL', PICKUPS.bossHealSpawn.x, PICKUPS.bossHealSpawn.z);
      if (info.isLastRoom) {
        // final boss: open the exit straight away, no offer (the run is ending)
        this.room.openDoor();
        audio.play('doorOpen');
        this.state = State.ROOM_CLEAR;
      } else {
        // boss reward is now a GUARANTEED boss-tier OFFER — weapons come only from the tree (ADR-0030)
        audio.play('roomClear');
        this._beginOffers({ boss: true });
      }
    } else {
      // normal room: open the pick-1-of-3 OFFER screen INSTEAD of a ground stat-drop. The door stays
      // CLOSED + the room stays paused until every living player has picked (_finishRoomClear).
      audio.play('roomClear');
      this._beginOffers();
    }
  }

  // ---- B9b: room-clear OFFER flow (replaces the old ground stat-drop) ----

  /** open the offer queue: one pick-1-of-3 per living player (solo = [p1]; co-op = [p1, p2]). */
  _beginOffers({ boss = false } = {}) {
    this._offerActive = true;
    this._offerBoss = boss; // boss clears guarantee a rare+ card (ADR-0030)
    // only players who were alive at room-clear get an offer (a downed co-op teammate is revived
    // but forfeits this room's pick — see _onRoomClear).
    this._offerQueue = this.players.filter((p) => p.alive && !this._forfeitOffer?.has(p));
    if (this.coop && this._forfeitOffer?.size) {
      for (const pl of this._forfeitOffer) {
        hud.toast(`${pl === this.player ? 'P1' : 'P2'} was down — no upgrade this room`, false);
      }
    }
    this.state = State.OFFER;
    this.input.consumeRestart(); // drop any stray R (the offer reuses R for the ally reroll)
    this._presentNextOffer();
  }

  /** show the next queued player's offer, or finish the room clear when the queue is empty. */
  _presentNextOffer() {
    const pl = this._offerQueue.shift();
    if (!pl) {
      this._finishRoomClear();
      return;
    }
    this._offerPlayer = pl;
    // seeded (ADR-0013) → reproducible; bossTier guarantees a rare+ card on boss clears (ADR-0030)
    const cards = generateOffer(this.rng, { ...pl.offerContext(), bossTier: this._offerBoss });
    pl.noteOffered(cards.map((c) => c.id));
    let playerTag = null;
    if (this.coop) playerTag = pl === this.player ? 'P1' : 'P2';
    showOffer(cards, {
      onPick: (i) => this._onOfferPick(pl, cards, i),
      solo: !this.coop,
      playerTag,
      allyWeaponName: !this.coop && this.ally ? this.ally.weaponName : null,
      onReroll: !this.coop && this.ally ? () => this.ally.rerollWeapon(this.rng) : null,
    });
  }

  /** apply a player's pick, then move on to the next player (or finish the room). */
  _onOfferPick(pl, cards, index) {
    pl.applyOfferCard(cards[index] ?? cards[0], this);
    this.refreshHud();
    this._presentNextOffer();
  }

  /** all picks done: open the door + drop into ROOM_CLEAR (the normal-room equivalent of the boss path). */
  _finishRoomClear() {
    if (!this._offerActive) return; // idempotent guard (the headless auto-resolve recurses)
    this._offerActive = false;
    this._offerPlayer = null;
    this.room.openDoor();
    audio.play('doorOpen');
    this.state = State.ROOM_CLEAR;
    this.input.consumeRestart(); // drain any reroll-R before ROOM_CLEAR / DEAD can read it
    prompts.hide();
    hud.banner(nextIsBoss(this.roomIndex) ? '⚠  BOSS AHEAD  ⚠' : 'ROOM CLEAR — RUN!');
  }

  /** the player picked an approach at the human decision-boss (A/B/C/D) */
  _onHumanChoice(choice) {
    const outcome = resolveHuman(this.rng, choice); // seeded (ADR-0013)
    hud.toast(outcome.message, outcome.right);
    audio.play(outcome.right ? 'good' : 'bad');
    if (outcome.right) {
      this._resolveHumanSkip(); // he waves you through — skip the fight, keep the reward
    } else {
      this.state = State.PLAYING; // he panics — the fight is on
      audio.play(this.bosses[0]?.behavior?.roar ?? 'bossRoar');
      audio.setBossMusic('human'); // now the fight is real, swap to his theme
    }
  }

  /** right read: clear the un-fought human and run the normal boss-clear reward */
  _resolveHumanSkip() {
    for (const b of this.bosses) {
      if (!b.dead) {
        b.anim?.dispose();
        this.scene.remove(b.mesh);
        b.dead = true;
      }
    }
    this._bossHandled = true; // boss is gone; don't let any PLAYING sweep re-fire
    this.enemies = this.enemies.filter((e) => !e.dead);
    this._onRoomClear(); // grants the weapon slot + checkpoint + open door, like any boss clear
  }

  _checkDoor() {
    const atDoor =
      this.room.door.active &&
      this.players.some((p) => p.alive && circleVsBox(p.x, p.z, p.radius, this.room.door.box));
    if (atDoor) {
      if (floorInfo(this.roomIndex).isLastRoom) this._onWin();
      else this.loadRoom(this.roomIndex + 1);
    }
  }

  /** a player went down (1P) or the whole team wiped (co-op) */
  _onDefeat() {
    const result = resolveDeath(this.lives, this.checkpointRoom);
    this.lives = result.lives;
    if (result.action === 'GAMEOVER') audio.stingerGameOver();
    else audio.play('lifeLost');

    if (result.action === 'RESPAWN') {
      hud.banner(`${this.coop ? 'TEAM DOWN' : 'LIFE LOST'} — ${this.lives} left`);
      setTimeout(() => hud.hideBanner(), 1400);
      this._respawnAtCheckpoint(result.room);
    } else {
      this.state = State.DEAD;
      const floorIdx = floorInfo(this.roomIndex).floorIndex;
      saves.recordRun({ floor: floorIdx });
      hud.banner('GAME OVER  —  press R  ·  [F] Resonance');
      prompts.hide();
    }
    this.refreshHud();
  }

  _respawnAtCheckpoint(room) {
    for (const pl of this.players) pl.revive(0, 0);
    this.loadRoom(room);
  }

  /** a boss fell — bump the count, unlock a weapon slot at the right milestones, award Echoes post-beat */
  _countBossBeaten() {
    this.bossesBeaten += 1;
    const slots = weaponSlotsForBosses(this.bossesBeaten);
    if (slots > this.player.slotsUnlocked) {
      for (const pl of this.players) pl.setSlotsUnlocked(slots);
      hud.toast(`WEAPON SLOT UNLOCKED! (${slots})`, true);
    }
    const floorIdx = floorInfo(this.roomIndex).floorIndex;
    saves.recordBossKill(floorIdx);
    if (saves.get().gameBeaten) {
      const earned = SAVES.echoesPerBoss + SAVES.echoesFloorBonus * floorIdx;
      hud.toast(`+${earned} Echoes`, false);
    }
  }

  _onWin() {
    this.state = State.WIN;
    saves.recordWin();
    audio.stingerWin();
    hud.banner('YOU ESCAPED THE CITY!  —  press R  ·  [F] Resonance');
    prompts.hide();
  }

  render() {
    this.overlays.sync(this); // boss telegraph rings + (opt-in) hitbox overlay
    // trauma-driven shake from COHERENT noise (juice.js) — no Math.random, so a seeded run
    // renders identical camera motion (ADR-0013) — composed with the B3 spring-follow pan.
    const sh = this.juice.shakeOffsetXZ(performance.now() / 1000);
    const pan = this.camPan;
    this.camera.position.set(
      this.baseCam.x + pan.x + sh.x,
      this.baseCam.y + sh.y,
      this.baseCam.z + pan.z + sh.z,
    );
    this.camera.lookAt(pan.x, CAMERA.lookAtY, pan.z);
    // post-FX pipeline if present (it self-falls-back to raw render); else raw render.
    if (this.postfx) this.postfx.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
