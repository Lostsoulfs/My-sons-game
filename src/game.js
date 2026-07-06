// =====================================================================
// game.js — the conductor. Owns the world, runs the state machine, wires
// every system together each tick, and renders (with camera shake).
//
//   BOOT -> (start menu) -> PLAYING -> ROOM_CLEAR -> ... -> WIN
//                                  \-> DEAD (out of lives -> start over)
//
// Single-player (CP5/ADR-0038): SOLO as the chosen character — Dad (blue, ballistic) or Son (green,
// energy), no AI ally. Co-op: P1 = Dad (keyboard, blue), P2 = Son (Xbox controller, green) — both are
// full Players. In co-op a downed player revives when the room is cleared; Game Over only on a full wipe.
// =====================================================================

import {
  CAMERA,
  JUICE,
  FEEL,
  ARENA,
  CAPS,
  CHARACTERS,
  MENU_CURSOR,
  SAVES,
  PICKUPS,
  MAP,
  ROOMS,
  BOSS_INTRO,
  HUMAN_APPROACH,
  CHOICE_ROOM,
} from './config.js';
import { State } from './states.js';
import { makeRng } from './core/rng.js';
import { floorMeta, resolveDeath, resolveMode, weaponSlotsForBosses } from './core/progression.js';
import {
  generateFloorplan,
  roomCountForFloor,
  minimapView,
  DIRS,
  OPPOSITE,
} from './core/floorplan.js';
import { Player } from './entities/player.js';
import { Demon } from './entities/demon.js'; // CP-C (ADR-0042): the old AI Ally, reborn — 1P companion
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
import { Npc } from './entities/npc.js'; // ADR-0044: choice-room reward-carriers
import { rollChoiceSurvivors, rollGunsmithWeapon } from './core/choiceRoom.js';
import { circleVsBox, circleVsCircle, springCritDampedXZ } from './core/math2d.js';
import { cameraTarget } from './core/camera.js';
import { settings } from './systems/settings.js';
import { hud } from './ui/hud.js';
import { prompts } from './ui/prompts.js';
import { showHumanChoice, moveChoiceFocus, confirmChoice } from './ui/humanchoice.js';
import { showOffer, moveOfferFocus, confirmOffer } from './ui/offer.js';
import { showPauseMenu, hidePauseMenu } from './ui/pausemenu.js';
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
    // ADR-0032 connected map: the run is floors of room GRAPHS, not a linear index
    this.floorIndex = 0;
    this.floorplan = null; // generateFloorplan result for the current floor
    this.nodeId = 0; // current room node id in the floorplan
    this.explored = new Set(); // node ids entered this floor (drives the minimap)
    this.lives = CAPS.lives.start;
    this.checkpointFloor = 0; // death respawns at this floor's start (regenerated)
    this.bossesBeaten = 0; // drives weapon-slot unlocks
    // B9b room-clear offer flow (a paused pick-1-of-3 modal, one per living player)
    this._offerActive = false; // an offer sequence is in progress (guards _finishRoomClear)
    this._offerQueue = []; // players still to pick this room
    this._offerPlayer = null; // the player currently choosing (drives the gamepad arm)
    this._offerLatch = false; // gamepad focus-move debounce (mirrors _choiceLatch)
    this.godMode = false; // debug menu toggle

    this.coop = false;
    this.mode = 'story'; // CP-E (ADR-0043): 'story' | 'endless' — set per run in startRun
    this.players = []; // [p1] or [p1, p2]
    this.player = null; // = players[0]
    this.player2 = null;
    // CP-C (ADR-0042): the demon companion — 1P only, spawned in startRun once its Resonance
    // node is bought. Deliberately NOT in this.players (that array drives offers, revives, and
    // enemy targeting — the demon takes part in none of those).
    this.demon = null;
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

  /** Build a Player from a CHARACTERS key: its color/model/starter weapon + the +/− trait merged
   *  onto the Echoes baseline (so the trait flows through player._recomputeUpgrades). CP5. */
  _makePlayer(charKey, device, baseline) {
    const c = CHARACTERS[charKey] ?? CHARACTERS.dad;
    const t = c.trait ?? {};
    const merged = {
      ...baseline,
      damage: (baseline.damage ?? 0) + (t.damage ?? 0),
      fireRate: (baseline.fireRate ?? 0) + (t.fireRate ?? 0),
      speed: (baseline.speed ?? 0) + (t.speed ?? 0),
    };
    return new Player(this.scene, {
      color: c.color,
      modelKey: c.modelKey,
      meshRadius: c.meshRadius, // CP-D: visual-only silhouette (collision stays PLAYER.radius)
      meshHeight: c.meshHeight,
      prop: c.prop,
      device,
      baseline: merged,
      startWeapon: c.starter,
      character: charKey,
    });
  }

  startRun(coop = false, character = 'dad', seed = (Math.random() * 1e9) | 0, mode = 'story') {
    this.coop = coop;
    // CP5 inserted `character` as arg 2, pushing the ADR-0013 seed to arg 3. Stay backward-compatible
    // with the old 2-arg seeded form: a NUMERIC 2nd arg is read as the seed (so a pasted/old-habit
    // `startRun(false, 12345)` still pins the run instead of silently going random). — ADR-0013/0038.
    if (typeof character === 'number') {
      seed = character;
      character = 'dad';
    }
    // CP-E (ADR-0043): run mode. resolveMode re-gates here (belt-and-suspenders with the start
    // menu): endless is post-first-win only — a direct console call pre-beat falls back to story.
    this.mode = resolveMode(mode, saves.get().gameBeaten);
    // Seed defaults to random per run; pass a fixed seed to make a run reproducible:
    //   window.__game.startRun(false, 'dad', 12345)  (or the back-compat window.__game.startRun(false, 12345))
    this.rng = makeRng(seed);
    this.lives = CAPS.lives.start;
    this.checkpointFloor = 0;
    this.bossesBeaten = 0;
    // reset the camera pan so a new run starts centered (no carry-over from a prior run)
    this.camPan.x = this.camPan.z = 0;
    this.camVel.x = this.camVel.z = 0;

    this._teardownActors();
    const baseline = baselineStacks(saves.get());
    // CP5: 1P is SOLO as the chosen character (no AI ally). 2P is always Dad (P1, kb) + Son (P2, pad).
    if (coop) {
      this.player = this._makePlayer('dad', 'kb', baseline);
      this.player2 = this._makePlayer('son', 'pad', baseline);
      this.players = [this.player, this.player2];
    } else {
      this.player = this._makePlayer(character, 'both', baseline);
      this.players = [this.player];
      // CP-C (ADR-0042): the demon companion — 1P only (2P already fields Dad + Son), and only
      // once the 'demon' Resonance node is bought (baseline.demon rides baselineStacks, so the
      // first-win all-zero gate covers it). Fed the RAW baseline — deliberately NOT the player's
      // merged copy, which carries the Dad/Son ±trait (a trait is not a permanent meta buff).
      // It stays OUT of this.players: that array drives offers/revives/enemy targeting.
      if ((baseline.demon ?? 0) > 0) this.demon = new Demon(this.scene, baseline);
    }
    hud.setCoop(coop);
    this._startFloor(0);
  }

  /** generate a floor's connected map (ADR-0032) and drop the team at its start room */
  _startFloor(floorIndex) {
    this.floorIndex = floorIndex;
    this.floorplan = generateFloorplan(this.rng, {
      ...MAP,
      roomCount: roomCountForFloor(floorIndex, MAP),
      survivors: ROOMS.survivorsPerFloor,
    });
    this.explored = new Set();
    this.loadNode(this.floorplan.startId, null);
  }

  /** the current floorplan node */
  _node() {
    return this.floorplan.rooms[this.nodeId];
  }

  _teardownActors() {
    if (this.player) {
      this.player.dispose(this.scene); // also clears scene-attached blade-aura blades
      this.scene.remove(this.player.mesh);
    }
    if (this.player2) {
      this.player2.dispose(this.scene);
      this.scene.remove(this.player2.mesh);
    }
    if (this.demon) {
      this.demon.dispose(); // frees the GLB mixer, if any (CP-C)
      this.scene.remove(this.demon.mesh);
    }
    this.player = null;
    this.player2 = null;
    this.demon = null;
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

  /**
   * Enter a floorplan node (ADR-0032 — replaces the linear loadRoom(index)).
   * @param {number} nodeId room node in this.floorplan
   * @param {'N'|'S'|'E'|'W'|null} entrySide which of THIS room's doors we came in
   *   through (null = floor start → bottom-center placement, like the old entrance)
   */
  loadNode(nodeId, entrySide) {
    this.nodeId = nodeId;
    const node = this._node();
    this.explored.add(nodeId);
    this.bosses = [];
    this.duo = null; // re-created by the spawner if this is a multi-boss room
    this._bossHandled = false;
    this._intro = null; // ADR-0033: drop any in-flight boss entrance (never leaks across rooms)
    hud.hideBossBars();
    hud.hideNameCard();

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

    // the room's OWN rng (per-node seed, ADR-0032): layout + spawns replay identically
    // on every re-entry, and run determinism is independent of the path walked
    const layoutRng = makeRng(node.layoutSeed);
    const link = DIRS.filter((d) => node.neighbours[d] != null);
    // boss rooms grow the floor-EXIT door on a free side (prefer opposite the way in)
    let exit = null;
    if (node.type === 'boss') {
      const free = DIRS.filter((d) => node.neighbours[d] == null);
      exit = free.includes(OPPOSITE[link[0]]) ? OPPOSITE[link[0]] : free[0];
    }
    this.room = buildRoom(this.scene, layoutRng, { link, exit });
    this.walls = this.room.walls;

    // side-aware entry: crossing A's north door drops you at B's south edge
    const hw = ARENA.width / 2;
    const hd = ARENA.depth / 2;
    const ENTRY = {
      N: { x: 0, z: -hd + 4, spread: 'x' },
      S: { x: 0, z: hd - 4, spread: 'x' },
      E: { x: hw - 4, z: 0, spread: 'z' },
      W: { x: -hw + 4, z: 0, spread: 'z' },
    };
    const at = ENTRY[entrySide] ?? ENTRY.S; // floor start = the classic bottom entrance
    this.players.forEach((pl, i) => {
      const off = this.players.length > 1 ? (i === 0 ? -2.5 : 2.5) : 0;
      pl.x = at.x + (at.spread === 'x' ? off : 0);
      pl.z = at.z + (at.spread === 'z' ? off : 0);
      pl.mesh.position.set(pl.x, 0, pl.z);
      pl.mesh.visible = pl.alive; // a downed co-op partner stays hidden until revived (ADR-0032)
      // brief spawn grace: no free contact hit if a mob/boss sits on the entry (ADR-0032)
      pl.spawnSafe = pl.alive ? ROOMS.entryGrace : 0;
    });
    // CP-C: the demon heels through the door too — reset just off the entry, behind its keeper
    this.demon?.reset(at.x + (at.spread === 'x' ? -3.5 : 0), at.z + (at.spread === 'z' ? -3.5 : 0));

    const meta = floorMeta(this.floorIndex, this.mode);

    // CLEARED RE-ENTRY (backtracking): no repopulation, doors open, straight to
    // ROOM_CLEAR — a cleared room must NEVER reach PLAYING (the empty-room sweep
    // there would re-fire the whole clear path: offers, slots, Echoes).
    if (node.cleared) {
      this.room.openDoors();
      if (node.type === 'boss') this.room.openExit();
      this.state = State.ROOM_CLEAR;
      hud.hideBanner();
      prompts.hide();
      audio.setStageMusic(this.floorIndex);
      this.refreshHud();
      return;
    }

    // CHOICE room (ADR-0044): the breather dead-end. A few survivors wait mid-room, each
    // carrying ONE reward — walk up to one, [E] Choose, and the rest slip away. No combat,
    // doors open. The node is NOT marked cleared until the pick lands, so leaving early and
    // coming back re-offers the SAME trio (layoutRng → path-independent, ADR-0032); after
    // the pick, the cleared re-entry path above serves an empty breather. Shop seam later.
    if (node.type === 'choice') {
      const set = rollChoiceSurvivors(layoutRng, { gameBeaten: saves.get().gameBeaten });
      for (const s of set) {
        this.npcs.push(new Npc(this.scene, s.x, s.z, s.name, { role: s }));
      }
      this.room.openDoors();
      this.state = State.ROOM_CLEAR;
      hud.hideBanner();
      prompts.hide();
      audio.setStageMusic(this.floorIndex);
      this.refreshHud();
      return;
    }

    const desc = {
      floorIndex: this.floorIndex,
      isBossRoom: node.type === 'boss',
      depth: node.dist,
      survivor: !!node.survivor,
      def: meta.def,
      diff: meta.diff,
      entry: { x: at.x, z: at.z }, // keep spawns clear of the door we walked in through
      entrySide, // ADR-0033: boss spawns on the wall OPPOSITE this (null = floor start = south)
    };
    populateRoom(this, desc, layoutRng);
    this.bosses = this.enemies.filter((e) => e.isBoss);

    this.state = State.PLAYING;
    hud.hideBanner();
    prompts.hide();
    this.refreshHud();
    // stage track by default; a combat-boss ENTRANCE swaps to the boss theme on its reveal beat,
    // and the human keeps the stage track until his fight actually starts (ADR-0033).
    audio.setStageMusic(this.floorIndex);

    if (desc.isBossRoom && desc.def.boss === 'human' && this.bosses.length) {
      // the human decision-boss: walk up to him (mini-scene) before the A/B/C/D choice
      this._startHumanApproach();
    } else if (desc.isBossRoom && this.bosses.length) {
      // a combat boss: play the entrance cinematic (camera push-in + name card), THEN the fight
      this._startBossIntro(desc);
    }
  }

  refreshHud() {
    hud.setHearts(this.player.hearts, this.player.maxHearts, this.player.guardCharges);
    if (this.coop && this.player2)
      hud.setHearts2(this.player2.hearts, this.player2.maxHearts, this.player2.guardCharges);
    hud.setLives(this.lives);
    hud.setRoom(
      {
        floorIndex: this.floorIndex,
        isBossRoom: this._node().type === 'boss',
        explored: this.explored.size,
        total: this.floorplan.rooms.length,
      },
      this._weaponLabel(this.player),
    );
    // event-driven minimap (never per-tick): explored + adjacent-unknown, identity hidden
    hud.setMinimap(
      minimapView(this.floorplan, { currentId: this.nodeId, explored: this.explored }),
    );
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

  // CP-A pause: remember the state we came from, freeze, and open the pause overlay (map + options
  // + all-stats). The overlay reads live fields via Player.statsSnapshot() and reuses the HUD
  // minimap paint. Resume returns to exactly the state we paused from.
  _pause() {
    this._pausedFrom = this.state;
    this.state = State.PAUSED;
    showPauseMenu({
      players: this.players,
      coop: this.coop,
      demon: this.demon ? this.demon.statsSnapshot() : null, // CP-C: the seal's inherited stats
      mapView: minimapView(this.floorplan, { currentId: this.nodeId, explored: this.explored }),
      onResume: () => this._resume(),
    });
  }

  _resume() {
    hidePauseMenu();
    this.state = this._pausedFrom ?? State.PLAYING;
    this.input.clearKeys(); // drop anything held while the menu was up — no stuck movement on resume
    // drain the one-shot interact edges too — an E pressed while paused must not auto-commit
    // a survivor/choice pick on the resume tick (adversarial review, ADR-0044)
    this.input.consumeHelp('both');
    this.input.consumeLeave('both');
  }

  update(dt) {
    this.input.update(); // poll gamepad once per tick

    // PAUSE (CP-A): a frozen overlay state. Nothing below runs — no entities, particles, or juice
    // advance — so it's deterministic (the pause lives OUTSIDE the seeded sim). ESC / Start toggles.
    if (this.state === State.PAUSED) {
      if (this.input.consumePause()) this._resume();
      return;
    }
    if (
      (this.state === State.PLAYING || this.state === State.ROOM_CLEAR) &&
      this.input.consumePause()
    ) {
      this._pause();
      return;
    }

    // restart from a finished run — keep the same mode + chosen character (CP5)
    if ((this.state === State.DEAD || this.state === State.WIN) && this.input.consumeRestart()) {
      // preserve character AND mode across the R-restart (the startRun-signature-ripple lesson)
      this.startRun(this.coop, this.player?.character ?? 'dad', undefined, this.mode ?? 'story');
      return;
    }
    if ((this.state === State.DEAD || this.state === State.WIN) && this.input.consumeForge()) {
      openMetaPanel();
      return;
    }

    if (this.state === State.PLAYING) {
      for (const pl of this.players) if (pl.alive) pl.update(dt, this);
      this.demon?.update(dt, this); // CP-C: heels + fires alongside its keeper
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
      this.demon?.update(dt, this); // CP-C: keeps heeling between fights (fires if stragglers spawn)
      this.bullets.update(dt, this);
      this._handlePickups();
      this._handleSurvivors(dt); // survivors stay helpable after the fight is over
      this._checkDoor();
      // _checkDoor() may call loadRoom() or _onWin(), changing state this tick — only
      // update enemies when we're still in ROOM_CLEAR (hostile-survivor spawn case).
      if (this.state === State.ROOM_CLEAR && this.enemies.length) {
        for (const e of this.enemies) e.update(dt, this);
        this.enemies = this.enemies.filter((e) => !e.dead);
      }
      // defeat can arrive WITHOUT live enemies here — a survivor/stranger TAKE_DAMAGE at
      // 1 heart kills in an empty room, and a check hidden behind enemies.length turns that
      // death into a silent softlock (adversarial review, ADR-0044). Check unconditionally.
      if (this.state === State.ROOM_CLEAR) {
        const wipe = !this.players.some((p) => p.alive);
        if (this.coop ? wipe : !this.player.alive) this._onDefeat();
      }
    } else if (this.state === State.BOSS_INTRO) {
      // ADR-0033 entrance cinematic: fight is frozen (entities untouched); advance the
      // camera push-in + name-card timeline, then hand off to PLAYING.
      this._updateBossIntro(dt);
    } else if (this.state === State.HUMAN_APPROACH) {
      // ADR-0033 walk-up: the PLAYERS + their bullets tick (you approach on foot, can even
      // fire) but the human boss does NOT — he stands inert + invuln until the choice resolves.
      // The demon heels through the approach too. NOTE: the human boss IS in game.enemies here
      // (spawner addEnemy; this.bosses is just a filtered view) — the demon holds fire only
      // because _nearestEnemy skips invuln targets (adversarial-review find, ADR-0042).
      for (const pl of this.players) if (pl.alive) pl.update(dt, this);
      this.demon?.update(dt, this);
      this.bullets.update(dt, this);
      this._updateHumanApproach(dt);
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
    for (const n of this.npcs) n.update(dt);

    // Per-PLAYER proximity, per-DEVICE commit (adversarial review, ADR-0044): each player
    // interacts with THEIR nearest survivor through THEIR OWN controls — in 2P a far player's
    // E can no longer commit a pick on a survivor only their partner is near (choice rooms
    // hold 3 interactable NPCs at once, a first). Solo keeps 'both' (kb + pad are one seat).
    let prompt = null;
    this.activeNpc = null;
    for (const p of this.players) {
      if (!p.alive) continue;
      let near = null;
      let bd = Infinity;
      for (const n of this.npcs) {
        if (!n.inRange(p)) continue;
        const d = (n.x - p.x) ** 2 + (n.z - p.z) ** 2;
        if (d < bd) {
          bd = d;
          near = n;
        }
      }
      if (!near) continue;
      if (!this.activeNpc) this.activeNpc = near;
      const dev = this.coop ? p.device : 'both';
      if (near.role) {
        if (near.role.kind === 'gunsmith' && !near.gun) {
          // roll the gun on FIRST approach and show its NAME — the stake (your active slot,
          // its upgrade stacks) is invisible, so this pick must be informed (ADR-0044 rejects
          // blind picks). One run-rng draw, cached on the npc — walking away never re-rolls.
          const c = p.offerContext();
          near.gun = rollGunsmithWeapon(this.rng, {
            owned: c.owned,
            luck: c.luck,
            permLuck: c.permLuck,
            curse: c.curse,
          });
        }
        prompt =
          prompt ??
          (near.role.kind === 'gunsmith'
            ? `${near.name} offers the ${near.gun.name}   [E] Take it`
            : `${near.name}   [E] Choose`);
        if (this.input.consumeHelp(dev)) return this._resolveChoiceSurvivor(near, p);
        this.input.consumeLeave(dev); // Q is not a verb here — drop it so it can't leak a LEAVE
      } else {
        prompt = prompt ?? `${near.name} is trapped!   [E] Help   ·   [Q] Leave`;
        if (this.input.consumeHelp(dev)) return this._resolveSurvivor(near, 'HELP', p);
        if (this.input.consumeLeave(dev)) return this._resolveSurvivor(near, 'LEAVE', p);
      }
    }

    if (prompt) {
      prompts.show(prompt);
    } else {
      prompts.hide();
      this.input.consumeHelp('both'); // drop stray presses
      this.input.consumeLeave('both');
    }
  }

  /** land a help/leave outcome on the world: hostile spawns ring the NPC, buffs hit `pl`. */
  _applyDecisionOutcome(npc, pl, outcome) {
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
      pl.applyEffect(outcome.effect, outcome.magnitude, this);
    }
  }

  _resolveSurvivor(npc, choice, pl = null) {
    const outcome = resolveDecision(this.rng, choice);
    npc.markUsed();
    this.activeNpc = null;
    prompts.hide();
    // the COMMITTING player takes the outcome (per-device, ADR-0044); nearest is the solo/legacy path
    this._applyDecisionOutcome(npc, pl ?? this.nearestPlayer(npc.x, npc.z) ?? this.player, outcome);

    // big, lingering feedback so the choice never goes unnoticed
    const label = (choice === 'HELP' ? 'HELPED: ' : 'LEFT THEM: ') + outcome.message;
    hud.banner(label);
    setTimeout(() => hud.hideBanner(), 1500);
    this.juice.hitStop(0.08);
    audio.play(outcome.good ? 'good' : 'bad');
    this.refreshHud();
  }

  /**
   * ADR-0044: commit to one choice-room survivor. Grant their reward to the choosing
   * player, then the unpicked ones slip away (a puff each — one pick per room) and the
   * node is spent. Pick-time rolls ride the RUN rng — the same seam as offers.
   */
  _resolveChoiceSurvivor(npc, pl = null) {
    pl = pl ?? this.nearestPlayer(npc.x, npc.z) ?? this.player; // per-device committer first (ADR-0044)
    npc.markUsed();
    this.activeNpc = null;
    prompts.hide();

    let msg = '';
    let good = true;
    switch (npc.role.kind) {
      case 'medic':
        pl.applyEffect('HEART', 1, this); // +1 everywhere except rare boss +2 (Scott's rule)
        msg = 'patches you up. +1 heart';
        break;
      case 'tinkerer': {
        // skip stats the HELD gun has maxed (offers gate these out of the pool too — a reward
        // that silently no-ops is a lie); SPEED_UP is global + uncapped, so the pool never empties
        const c = pl.offerContext();
        const pool = CHOICE_ROOM.tinkererStats.filter(
          (s) => s === 'SPEED_UP' || (c.weaponStat[s] ?? 0) < c.statCap,
        );
        const stat = pool[this.rng.int(pool.length)];
        pl.applyEffect(stat, 0, this); // one stack — the ADR-0022 curve sets the strength
        msg =
          stat === 'SPEED_UP'
            ? 'oils your boots. Faster feet'
            : stat === 'FIRE_RATE_UP'
              ? 'tunes your gun. Faster shots'
              : 'sharpens your rounds. More damage';
        break;
      }
      case 'gunsmith': {
        // the gun was rolled + named at first approach (_handleSurvivors) — an informed pick.
        // The lazy fallback only covers a direct/debug resolve that skipped the prompt.
        let item = npc.gun;
        if (!item) {
          const c = pl.offerContext();
          item = rollGunsmithWeapon(this.rng, {
            owned: c.owned,
            luck: c.luck,
            permLuck: c.permLuck,
            curse: c.curse,
          });
        }
        pl.applyOfferCard({ id: item.id, tier: item.tier }, this); // registry path → addWeapon
        msg = `hands you the ${item.name}!`;
        break;
      }
      case 'scavenger':
        // post-win-only role (the roller gates it) — addEchoes' own gate is the backstop
        saves.addEchoes(CHOICE_ROOM.scavengerEchoes);
        msg = `slips you ${CHOICE_ROOM.scavengerEchoes} Echoes`;
        break;
      case 'stranger': {
        // the classic gamble, wearing a coat — same outcome table as helping a survivor
        const outcome = resolveDecision(this.rng, 'HELP');
        this._applyDecisionOutcome(npc, pl, outcome);
        msg = outcome.message;
        good = outcome.good;
        break;
      }
    }

    // the ones you didn't choose slip away — one pick per room, no take-backs
    for (const n of this.npcs) {
      if (n.role && n !== npc) {
        this.particles.burst(n.x, n.z, 8, n.role.color);
        this.scene.remove(n.mesh);
        this.scene.remove(n.marker);
      }
    }
    this.npcs = this.npcs.filter((n) => !n.role || n === npc);
    this._node().cleared = true; // the room is spent — re-entry is an empty breather

    hud.banner(`${npc.role.name.toUpperCase()}: ${msg}`);
    setTimeout(() => hud.hideBanner(), 1500);
    this.juice.hitStop(0.08);
    audio.play(good ? 'good' : 'bad');
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
    const node = this._node();
    node.cleared = true; // backtracking: this room is done forever (ADR-0032)
    const { isLastFloor } = floorMeta(this.floorIndex, this.mode); // endless: never a last floor (CP-E)

    if (node.type === 'boss') {
      hud.hideBossBars();
      audio.play('bossDie');
      this.input.rumble(0.8, 0.6, 300); // boss-down rumble
      this._countBossBeaten();
      // checkpoint: respawn at the next floor if you die from here on
      if (!isLastFloor) this.checkpointFloor = this.floorIndex + 1;
      hud.banner(isLastFloor ? 'BOSS DOWN — FINAL EXIT!' : 'BOSS DOWN — CHECKPOINT SAVED!');
      // a boss always heals you — NO more ground weapon chest (ADR-0030); spot is config-tunable
      this.spawnPickup('HEAL', PICKUPS.bossHealSpawn.x, PICKUPS.bossHealSpawn.z);
      if (isLastFloor) {
        // final boss: open the WIN exit straight away, no offer (the run is ending)
        this.room.openDoors();
        this.room.openExit();
        audio.play('doorOpen');
        this.state = State.ROOM_CLEAR;
      } else {
        // boss reward is now a GUARANTEED boss-tier OFFER — weapons come only from the tree (ADR-0030)
        audio.play('roomClear');
        this._beginOffers({ boss: true });
      }
    } else {
      // normal room: open the pick-1-of-3 OFFER screen INSTEAD of a ground stat-drop. The doors stay
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
    this.input.consumeRestart(); // drop any stray restart-R so entering OFFER doesn't carry a queued restart
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
      playerTag,
      // CP5: the AI-ally weapon reroll is gone (no ally in 1P). A future pet may re-add its own control.
    });
  }

  /** apply a player's pick, then move on to the next player (or finish the room). */
  _onOfferPick(pl, cards, index) {
    pl.applyOfferCard(cards[index] ?? cards[0], this);
    this.refreshHud();
    this._presentNextOffer();
  }

  /** all picks done: open the doors + drop into ROOM_CLEAR (the normal-room equivalent of the boss path). */
  _finishRoomClear() {
    if (!this._offerActive) return; // idempotent guard (the headless auto-resolve recurses)
    this._offerActive = false;
    this._offerPlayer = null;
    this.room.openDoors();
    if (this._node().type === 'boss') this.room.openExit(); // post-offer boss room: the way down opens
    audio.play('doorOpen');
    this.state = State.ROOM_CLEAR;
    this.input.consumeRestart(); // drain any stray restart-R before ROOM_CLEAR / DEAD can consume it
    prompts.hide();
    hud.banner('ROOM CLEAR — EXPLORE!');
  }

  // ---- ADR-0033 boss ARRIVALS: entrance cinematic + human approach mini-scene ----

  /** Begin a combat boss's entrance: camera push-in + name card, THEN the fight. */
  _startBossIntro(desc) {
    const boss = this.bosses[0];
    // headless / no-DOM (smoke drives, tests): no cinematic — straight into the fight
    if (typeof document === 'undefined' || !document.getElementById('namecard')) {
      this._endBossIntro(desc);
      return;
    }
    this._intro = {
      t: 0,
      camProg: 0,
      revealed: false,
      ending: false, // set true when a SKIP starts the eased pull-back (see _updateBossIntro)
      focus: { x: boss.x, z: boss.z },
      faceY: boss.mesh.rotation.y, // the boss faces the ENTRY — orbit the intro cam to its front (not its back)
      names: this.bosses.map((b) => b.name).join(' & '),
      subtitle: boss.title || '',
      desc,
      seen: saves.hasSeenBoss(desc.def.boss), // seen this boss before → skippable
    };
    this.state = State.BOSS_INTRO;
    if (this._intro.seen) prompts.show('Press [E] / Ⓐ to skip');
    else prompts.hide();
  }

  /** Advance the entrance timeline (camera + name card + reveal beat), then hand off to PLAYING. */
  _updateBossIntro(dt) {
    const intro = this._intro;
    if (!intro) {
      this.state = State.PLAYING;
      return;
    }
    const ease = (x) => {
      const t = Math.max(0, Math.min(1, x));
      return t * t * (3 - 2 * t); // smoothstep
    };
    // SKIP pull-back (seen bosses): ease camProg from wherever the shot IS down to 0, THEN start
    // the fight — matches the natural fade tail so the camera never hard-cuts to the room framing.
    if (intro.ending) {
      intro.endU = Math.min(1, intro.endU + dt / (BOSS_INTRO.skipFadeMs / 1000));
      intro.camProg = intro.endFrom * (1 - ease(intro.endU));
      if (intro.endU >= 1) this._endBossIntro(intro.desc);
      return;
    }
    // once you've SEEN this boss, any confirm fast-forwards — begin the eased pull-back (no snap)
    if (intro.seen && this.input.consumeHelp('both')) {
      hud.hideNameCard();
      intro.ending = true;
      intro.endFrom = intro.camProg;
      intro.endU = 0;
      return;
    }
    intro.t += dt;
    const push = BOSS_INTRO.pushInMs / 1000;
    const hold = BOSS_INTRO.holdMs / 1000;
    const fade = BOSS_INTRO.fadeMs / 1000;
    // reveal beat (fires once): name card + roar + boss theme + flash + shake + burst
    if (!intro.revealed && intro.t >= push * BOSS_INTRO.revealAt) {
      intro.revealed = true;
      hud.nameCard(intro.names, intro.subtitle);
      this.bosses[0]?.roar();
      audio.setBossMusic(intro.desc.def.boss);
      this.juice.addTrauma(BOSS_INTRO.trauma);
      const f = FEEL.screenFlash.bossReveal;
      hud.flashScreen(f.peak, f.color, f.ms);
      this.particles.burst(intro.focus.x, intro.focus.z, BOSS_INTRO.particles, 0xffd18a);
    }
    // camera: 0→1 push-in, hold at 1, then 1→0 ease back to the room framing
    if (intro.t < push) intro.camProg = ease(intro.t / push);
    else if (intro.t < push + hold) intro.camProg = 1;
    else if (intro.t < push + hold + fade) {
      intro.camProg = 1 - ease((intro.t - push - hold) / fade);
      hud.hideNameCard(); // the card leaves as the camera pulls back
    } else {
      this._endBossIntro(intro.desc);
    }
  }

  /** Finish the entrance: mark the boss seen, re-arm spawn grace, drop into PLAYING. */
  _endBossIntro(desc) {
    const intro = this._intro;
    const d = desc || intro?.desc;
    if (intro) {
      saves.recordBossSeen(intro.desc.def.boss); // first view counts → later encounters can skip
      if (!intro.revealed && d) audio.setBossMusic(d.def.boss); // skipped/headless before the reveal
    } else if (d) {
      audio.setBossMusic(d.def.boss);
    }
    this._intro = null;
    hud.hideNameCard();
    prompts.hide();
    // re-arm entry grace at COMBAT start — it froze during the non-ticking intro (ADR-0032 trap)
    for (const pl of this.players) if (pl.alive) pl.spawnSafe = ROOMS.entryGrace;
    this.state = State.PLAYING;
    if (this.bosses.length) {
      const names = this.bosses.map((b) => b.name).join(' & ');
      hud.banner(`${names.toUpperCase()} — ${this.bosses.length > 1 ? 'KILL THEM' : 'KILL IT'}`);
      setTimeout(() => hud.hideBanner(), 1400);
    }
  }

  /** Begin the human decision-boss mini-scene: walk up to him (civilians around) before the choice. */
  _startHumanApproach() {
    const boss = this.bosses[0];
    if (boss) boss.invuln = true; // inert + unhittable until the fight actually starts
    // headless / no-DOM: skip the walk-up straight to the choice (keeps drives + tests moving)
    if (typeof document === 'undefined' || !document.getElementById('namecard')) {
      this._openHumanChoice();
      return;
    }
    this._approach = { t: 0, camProg: 0, boss, opened: false };
    this.state = State.HUMAN_APPROACH;
    prompts.show('A survivor waits beyond the crowd — walk up to him.');
  }

  /** Walk-up loop: open the A/B/C/D choice once you reach him (or press interact). */
  _updateHumanApproach(dt) {
    const ap = this._approach;
    if (!ap || ap.opened) return;
    ap.t += dt;
    const boss = ap.boss;
    if (!boss) return;
    // nearest live player's distance to the survivor
    let dist = Infinity;
    for (const p of this.players) {
      if (p.alive) dist = Math.min(dist, Math.hypot(p.x - boss.x, p.z - boss.z));
    }
    // ease a camera focus onto him as you close the gap — the "zoom + walk up" beat (CP1)
    const span = HUMAN_APPROACH.camFocusFrom - HUMAN_APPROACH.approachRadius;
    const t = span > 0 ? Math.max(0, Math.min(1, (HUMAN_APPROACH.camFocusFrom - dist) / span)) : 1;
    ap.camProg = t * t * (3 - 2 * t) * HUMAN_APPROACH.camMaxProg; // smoothstep × max
    // the choice opens only once you've actually reached him (after a short read beat)
    if (ap.t >= HUMAN_APPROACH.buildupMinMs / 1000 && dist <= HUMAN_APPROACH.approachRadius) {
      ap.opened = true;
      this._openHumanChoice();
    }
  }

  /** Show the A/B/C/D overlay (shared by the walk-up trigger and the headless fast-path). */
  _openHumanChoice() {
    this._approach = null;
    prompts.hide();
    this.state = State.HUMAN_CHOICE;
    showHumanChoice((choice) => this._onHumanChoice(choice));
  }

  /** Remove the ambient (passive) civilians from the human mini-scene — they scatter on the choice. */
  _clearCivilians() {
    this.npcs = this.npcs.filter((n) => {
      if (!n.passive) return true;
      this.scene.remove(n.mesh);
      this.scene.remove(n.marker);
      return false;
    });
  }

  /** the player picked an approach at the human decision-boss (A/B/C/D) */
  _onHumanChoice(choice) {
    this._clearCivilians(); // the survivors scatter the moment you commit to a read
    const boss = this.bosses[0];
    if (boss) boss.invuln = false; // he's fair game now (right read removes him; wrong read fights)
    const outcome = resolveHuman(this.rng, choice); // seeded (ADR-0013)
    hud.toast(outcome.message, outcome.right);
    audio.play(outcome.right ? 'good' : 'bad');
    if (outcome.right) {
      this._resolveHumanSkip(); // he waves you through — skip the fight, keep the reward
    } else {
      this.state = State.PLAYING; // he panics — the fight is on
      // re-arm spawn grace at COMBAT start: the entry grace froze during the (untimed)
      // choice overlay, and unlike other bosses the human fight has no banner-intro buffer
      // for it to drain through — so anchor the ~1s protection to when the fight actually
      // begins (he's standing on you), then it drains normally in PLAYING (ADR-0032).
      for (const pl of this.players) if (pl.alive) pl.spawnSafe = ROOMS.entryGrace;
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
    // per-side door triggers (ADR-0032): link doors walk the floor graph; the boss
    // EXIT door descends to the next floor — or wins the run on the last one.
    for (const [side, door] of Object.entries(this.room.doors)) {
      if (!door.active) continue;
      const hit = this.players.some((p) => p.alive && circleVsBox(p.x, p.z, p.radius, door.box));
      if (!hit) continue;
      if (door.kind === 'exit') {
        // CP-E: in endless isLastFloor is always false → the exit descends forever, diff climbing
        if (floorMeta(this.floorIndex, this.mode).isLastFloor) this._onWin();
        else this._startFloor(this.floorIndex + 1);
      } else {
        this.loadNode(this._node().neighbours[side], OPPOSITE[side]);
      }
      return; // one transition per tick
    }
  }

  /** a player went down (1P) or the whole team wiped (co-op) */
  _onDefeat() {
    const result = resolveDeath(this.lives, this.checkpointFloor);
    this.lives = result.lives;
    if (result.action === 'GAMEOVER') audio.stingerGameOver();
    else audio.play('lifeLost');

    if (result.action === 'RESPAWN') {
      hud.banner(`${this.coop ? 'TEAM DOWN' : 'LIFE LOST'} — ${this.lives} left`);
      setTimeout(() => hud.hideBanner(), 1400);
      this._respawnAtCheckpoint(result.floor);
    } else {
      this.state = State.DEAD;
      saves.recordRun({ floor: this.floorIndex });
      hud.banner('GAME OVER  —  press R  ·  [F] Resonance');
      prompts.hide();
    }
    this.refreshHud();
  }

  _respawnAtCheckpoint(floor) {
    for (const pl of this.players) pl.revive(0, 0);
    // the checkpoint floor regenerates fresh (ADR-0032): a death costs the explored map
    this._startFloor(floor);
  }

  /** a boss fell — bump the count, unlock a weapon slot at the right milestones, award Echoes post-beat */
  _countBossBeaten() {
    this.bossesBeaten += 1;
    const slots = weaponSlotsForBosses(this.bossesBeaten);
    if (slots > this.player.slotsUnlocked) {
      for (const pl of this.players) pl.setSlotsUnlocked(slots);
      hud.toast(`WEAPON SLOT UNLOCKED! (${slots})`, true);
    }
    saves.recordBossKill(this.floorIndex);
    if (saves.get().gameBeaten) {
      const earned = SAVES.echoesPerBoss + SAVES.echoesFloorBonus * this.floorIndex;
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

  /**
   * CP1 cinematic focus: ease the camera from the room framing toward (fx,fz), dropping it to
   * `cfg.camHeight` and raising the look-target to `cfg.lookAtY`, so it looks at the subject's
   * FRONT (not its top). `p` (0..1) drives the ease; `cfg.camZoom` pulls the distance in. Shared
   * by the boss entrance (low hero angle) and the human walk-up (gentler framing).
   */
  _focusCam(fx, fz, p, sh, pan, cfg, faceY = null) {
    const lx = pan.x + (fx - pan.x) * p;
    const lz = pan.z + (fz - pan.z) * p;
    const camY = this.baseCam.y + (cfg.camHeight - this.baseCam.y) * p;
    const bk = this.baseCam.z * (1 - p * cfg.camZoom);
    const lookY = CAMERA.lookAtY + (cfg.lookAtY - CAMERA.lookAtY) * p;
    // Orbit the camera from the default south (+z) framing around to the SUBJECT'S FRONT as we push in.
    // The boss/human faces the ENTRY, which is N/E/W for most rooms, so a fixed-south camera ends on
    // its back or side ("the spider's ass"). faceY = subject mesh.rotation.y; blend the offset ANGLE
    // 0→faceY along the SHORTEST arc (so it swings around the side, never over the top).
    let ox = 0;
    let oz = 1; // default: straight behind (+z)
    if (faceY != null) {
      let d = faceY;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      const a = d * p; // p=0 → 0 (south framing);  p=1 → the subject's facing angle (its front)
      ox = Math.sin(a);
      oz = Math.cos(a);
    }
    this.camera.position.set(lx + ox * bk + sh.x, camY + sh.y, lz + oz * bk + sh.z);
    this.camera.lookAt(lx, lookY, lz);
  }

  render() {
    this.overlays.sync(this); // boss telegraph rings + (opt-in) hitbox overlay
    if (this.player) hud.setLimiter(this.player.limiterHud()); // CP2: live reload/heat readout
    // trauma-driven shake from COHERENT noise (juice.js) — no Math.random, so a seeded run
    // renders identical camera motion (ADR-0013) — composed with the B3 spring-follow pan.
    const sh = this.juice.shakeOffsetXZ(performance.now() / 1000);
    const pan = this.camPan;
    const intro = this._intro;
    const ap = this._approach;
    if (intro && intro.camProg > 0) {
      // ADR-0033 boss entrance, CP1 low hero-angle: push in on the boss's FRONT (not its scalp).
      this._focusCam(
        intro.focus.x,
        intro.focus.z,
        intro.camProg,
        sh,
        pan,
        {
          camZoom: BOSS_INTRO.camZoom,
          camHeight: BOSS_INTRO.introCamHeight,
          lookAtY: BOSS_INTRO.introLookAtY,
        },
        intro.faceY,
      );
    } else if (ap && ap.camProg > 0 && ap.boss) {
      // CP1 human walk-up: ease a framed focus onto the survivor as you approach (gentler framing),
      // orbiting to the survivor's FRONT so you meet their face — same fix as the boss entrance.
      this._focusCam(
        ap.boss.x,
        ap.boss.z,
        ap.camProg,
        sh,
        pan,
        {
          camZoom: HUMAN_APPROACH.camZoom,
          camHeight: HUMAN_APPROACH.camHeight,
          lookAtY: HUMAN_APPROACH.camLookAtY,
        },
        ap.boss.mesh?.rotation.y ?? null,
      );
    } else {
      this.camera.position.set(
        this.baseCam.x + pan.x + sh.x,
        this.baseCam.y + sh.y,
        this.baseCam.z + pan.z + sh.z,
      );
      this.camera.lookAt(pan.x, CAMERA.lookAtY, pan.z);
    }
    // post-FX pipeline if present (it self-falls-back to raw render); else raw render.
    if (this.postfx) this.postfx.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
