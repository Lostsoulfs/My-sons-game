// =====================================================================
// debug/menu.js — the project owner's dev menu (lil-gui). Lazy-loaded only when asked
// (?debug=1 or the backtick key), so it never loads during normal play.
//
// Everything drives the live game via window.__game, reusing existing methods
// (loadRoom, setWeapon, spawnPickup, startRun, etc.).
// =====================================================================

import GUI from 'lil-gui';
import {
  WEAPONS,
  CAPS,
  GRAPHICS,
  CAMERA,
  PIXEL_RATIO_CAPS,
  SHADOW_MAP_SIZES,
  MSAA_SAMPLES,
  AO_QUALITIES,
} from '../config.js';
import { floorCount } from '../core/progression.js';
import { WEAPON_TYPES } from '../entities/pickups.js';
import { saves } from '../core/saves.js';

const PICKUP_TYPES = ['HEAL', 'DAMAGE_UP', 'FIRE_RATE_UP', 'SPEED_UP', ...WEAPON_TYPES];

export function initDebugMenu(game) {
  const gui = new GUI({ title: '🛠 Debug (the project owner)' });

  const state = {
    godMode: false,
    floor: 0,
    room: 0,
    // the menu can open on the start screen (?debug=1) before a run exists, so
    // fall back to 'pistol' until startRun() creates the players.
    weapon: game.player?.weapon ?? 'pistol',
    pickup: 'HEAL',
    fps: 0,
    frameMs: 0,
    drawCalls: 0,
    triangles: 0,
    bullets: 0,
    enemies: 0,
  };

  // ---- World (ADR-0032: floors are room graphs — jump by floor/boss, not index) ----
  const world = gui.addFolder('World');
  world.add(state, 'floor', 0, floorCount() - 1, 1).name('Floor');
  world
    .add(
      {
        go() {
          game._startFloor(state.floor); // fresh connected map for that floor
        },
      },
      'go',
    )
    .name('▶ Go to floor');
  world
    .add(
      {
        boss() {
          game.loadNode(game.floorplan.bossId, null); // straight to this floor's boss den
        },
      },
      'boss',
    )
    .name('Jump to boss');
  world
    .add(
      {
        killAll() {
          _killAll(game);
        },
      },
      'killAll',
    )
    .name('💀 Kill all enemies');
  world
    .add(
      {
        offer() {
          if (game.room && game.players.length) game._beginOffers();
        },
      },
      'offer',
    )
    .name('🎁 Open offer (ends room)');
  world
    .add(
      {
        restart() {
          game.startRun(game.coop);
        },
      },
      'restart',
    )
    .name('↺ Restart run');

  // ---- Player ----
  const pl = gui.addFolder('Player');
  pl.add(state, 'godMode')
    .name('God mode')
    .onChange((v) => {
      game.godMode = v;
    });
  pl.add(
    {
      heal() {
        game.player.hearts = game.player.maxHearts;
        game.refreshHud();
      },
    },
    'heal',
  ).name('Full heal');
  pl.add(
    {
      life() {
        game.lives = Math.min(CAPS.lives.max, game.lives + 1);
        game.refreshHud();
      },
    },
    'life',
  ).name('+1 life');
  pl.add(state, 'weapon', Object.keys(WEAPONS))
    .name('Weapon')
    .onChange((v) => {
      game.player.setWeapon(v);
      game.refreshHud();
    });

  // ---- Spawn ----
  const sp = gui.addFolder('Spawn');
  sp.add(state, 'pickup', PICKUP_TYPES).name('Pickup type');
  sp.add(
    {
      drop() {
        game.spawnPickup(state.pickup, game.player.x, game.player.z + 2);
      },
    },
    'drop',
  ).name('🎁 Drop pickup');

  // ---- Performance (FPS + the counts that matter for tuning difficulty/perf) ----
  // NOTE: when Post-FX is ON, draw calls + triangles will show as ~1 (the composer's
  // final blit to screen), not the scene's actual geometry. Turn Post-FX OFF to see
  // true scene complexity. The scene complexity is unchanged; you're just seeing
  // the *final render pass* to screen when Post-FX is active.
  const perf = gui.addFolder('Performance');
  const fpsCtrl = perf.add(state, 'fps').name('FPS').disable().listen();
  const msCtrl = perf.add(state, 'frameMs').name('Frame ms').disable().listen();
  const dcCtrl = perf.add(state, 'drawCalls').name('Draw calls').disable().listen();
  const triCtrl = perf.add(state, 'triangles').name('Triangles').disable().listen();
  const blCtrl = perf.add(state, 'bullets').name('Bullets (live)').disable().listen();
  const enCtrl = perf.add(state, 'enemies').name('Enemies (live)').disable().listen();
  let last = performance.now();
  let frames = 0;
  let acc = 0;
  function tick(now) {
    frames++;
    acc += now - last;
    last = now;
    if (acc >= 500) {
      state.fps = Math.round((frames * 1000) / acc);
      state.frameMs = Math.round((acc / frames) * 10) / 10;
      state.drawCalls = game.renderer?.info?.render?.calls ?? 0;
      state.triangles = game.renderer?.info?.render?.triangles ?? 0;
      state.bullets = game.bullets ? game.bullets.items.filter((b) => b.active).length : 0;
      state.enemies = game.enemies.filter((e) => !e.dead).length;
      fpsCtrl.updateDisplay();
      msCtrl.updateDisplay();
      dcCtrl.updateDisplay();
      triCtrl.updateDisplay();
      blCtrl.updateDisplay();
      enCtrl.updateDisplay();
      frames = 0;
      acc = 0;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // ---- Graphics (A/B perf) — flip ONE lever, watch the Performance numbers above ----
  // Unlike the "reduced effects" setting (which couples post-FX + shadows + camera-follow
  // via config.calmCamera), each toggle here is independent — so the real fill-rate cost
  // can be isolated, not guessed. Camera-follow is separate so it can be ruled out alone.
  const gfx = gui.addFolder('Graphics (A/B perf)');
  const gfxState = {
    pixelRatioCap: GRAPHICS.pixelRatioCap,
    msaa: GRAPHICS.aaSamples,
    shadows: GRAPHICS.shadows.enabled,
    shadowMapSize: GRAPHICS.shadows.mapSize,
    postFX: GRAPHICS.enabled,
    bloom: GRAPHICS.bloom.enabled !== false,
    aoQuality: GRAPHICS.ao.enabled ? GRAPHICS.ao.quality : 'off',
    vignette: GRAPHICS.vignette.enabled,
    cameraFollow: CAMERA.followEnabled,
  };
  gfx
    .add(gfxState, 'pixelRatioCap', PIXEL_RATIO_CAPS)
    .name('Pixel ratio cap')
    .onChange((v) => game.gfx?.setPixelRatioCap(v));
  gfx
    .add(gfxState, 'msaa', MSAA_SAMPLES)
    .name('MSAA samples')
    .onChange((v) => {
      GRAPHICS.aaSamples = v;
      game.postfx?.rebuild();
    });
  gfx
    .add(gfxState, 'shadows')
    .name('Shadows')
    .onChange((v) => game.gfx?.setShadowsEnabled(v));
  gfx
    .add(gfxState, 'shadowMapSize', SHADOW_MAP_SIZES)
    .name('Shadow map')
    .onChange((v) => game.gfx?.setShadowMapSize(v));
  gfx
    .add(gfxState, 'postFX')
    .name('Post-FX (whole composer)')
    .onChange((v) => game.postfx?.setEnabled(v));
  gfx
    .add(gfxState, 'bloom')
    .name('Bloom')
    .onChange((v) => {
      GRAPHICS.bloom.enabled = v;
      game.postfx?.rebuild();
    });
  gfx
    .add(gfxState, 'aoQuality', AO_QUALITIES)
    .name('AO quality')
    .onChange((v) => {
      GRAPHICS.ao.enabled = v !== 'off';
      if (v !== 'off') GRAPHICS.ao.quality = v;
      game.postfx?.rebuild();
    });
  gfx
    .add(gfxState, 'vignette')
    .name('Vignette')
    .onChange((v) => {
      GRAPHICS.vignette.enabled = v;
      game.postfx?.rebuild();
    });
  gfx
    .add(gfxState, 'cameraFollow')
    .name('Camera follow')
    .onChange((v) => {
      CAMERA.followEnabled = v;
    });

  // ---- Meta (Echoes / Resonance) — lets Scott test the post-beat loop ----
  const meta = gui.addFolder('Meta');
  const metaState = {
    echoes: 0,
    gameBeaten: false,
  };
  const echoesCtrl = meta.add(metaState, 'echoes').name('Echoes').disable().listen();
  const beatenCtrl = meta.add(metaState, 'gameBeaten').name('Game beaten').disable().listen();

  function refreshMeta() {
    const s = saves.get();
    metaState.echoes = s.echoes;
    metaState.gameBeaten = s.gameBeaten;
    echoesCtrl.updateDisplay();
    beatenCtrl.updateDisplay();
  }
  refreshMeta();

  meta
    .add(
      {
        markBeaten: () => {
          saves.recordWin();
          refreshMeta();
        },
      },
      'markBeaten',
    )
    .name('🏆 Mark game beaten');
  meta
    .add(
      {
        addEchoes: () => {
          saves.addEchoes(100);
          refreshMeta();
        },
      },
      'addEchoes',
    )
    .name('+100 Echoes');
  meta
    .add(
      {
        resetSave: () => {
          saves.reset();
          refreshMeta();
        },
      },
      'resetSave',
    )
    .name('↺ Reset save');

  return gui;
}

function _killAll(game) {
  for (const e of game.enemies) {
    if (!e.dead) {
      e.dead = true;
      e.anim?.dispose();
      game.scene.remove(e.mesh);
    }
  }
}
