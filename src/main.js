// =====================================================================
// main.js — boots everything and starts the game loop.
// =====================================================================

import { createScene } from './core/scene.js';
import { loadModels } from './core/assets.js';
import { loadTextures } from './core/textures.js';
import { Input, isEditable } from './systems/input.js';
import { Game } from './game.js';
import { startLoop } from './core/loop.js';
import { MODELS, GRAPHICS } from './config.js';
import { resolveGraphicsTier, applyGraphicsPreset, createPerfGuard } from './core/graphics.js';
import * as audio from './systems/audio.js';
import { showStartMenu } from './ui/startmenu.js';
import { settings } from './systems/settings.js';
import { initSettingsPanel } from './ui/settingsPanel.js';
import { initCredits } from './ui/credits.js';
import { initMetaPanel } from './ui/metaProgress.js';
import { saves } from './core/saves.js';

// Read the UNMASKED GL renderer string from a THROWAWAY context (never throws; '' if unavailable).
// Only used to auto-downgrade unambiguous software renderers — see core/graphics.js resolveGraphicsTier.
function probeRendererString() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const s = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext(); // free the probe context immediately
    return s;
  } catch {
    return '';
  }
}

(async () => {
  // FPS-2: resolve the graphics tier BEFORE anything reads GRAPHICS (textures + scene below). A
  // software/headless GL renderer — or an explicit `?gfx=low` — deep-merges the low preset onto
  // GRAPHICS; a real GPU (incl. an Intel iGPU via ANGLE) stays full. Force either way with ?gfx=.
  const gfxTier = resolveGraphicsTier({
    param: new URLSearchParams(location.search).get('gfx'),
    renderer: probeRendererString(),
    webdriver: typeof navigator !== 'undefined' && navigator.webdriver === true,
  });
  if (gfxTier === 'low') applyGraphicsPreset(GRAPHICS, GRAPHICS.lowPreset);
  window.__gfxTier = gfxTier; // observability (verification drive + debug menu)

  // preload the floor PBR maps BEFORE the scene (the ground is built in createScene);
  // never-throws, so a missing file just leaves the floor on its flat fallback color.
  if (GRAPHICS.floor.enabled) {
    await loadTextures([GRAPHICS.floor.map, GRAPHICS.floor.normalMap, GRAPHICS.floor.roughnessMap]);
  }

  const {
    renderer,
    scene,
    camera,
    baseCam,
    resize,
    postfx,
    setShadowsEnabled,
    setPixelRatioCap,
    setShadowMapSize,
  } = createScene(document.getElementById('app'));

  // try to load any configured models (no-op while config.MODELS are all null)
  await loadModels(MODELS);

  const input = new Input(renderer.domElement);
  const game = new Game({ renderer, scene, camera, baseCam, input, postfx });
  // FPS-1: scene-level graphics A/B setters for the debug "Graphics" folder (attached
  // here rather than threaded through the constructor — they live in the scene closure).
  game.gfx = { setShadowsEnabled, setPixelRatioCap, setShadowMapSize };
  game.init();

  // debug handle (poke the game from the dev console, e.g. window.__game._startFloor(2)
  // or window.__game.loadNode(id, null) — ADR-0032 replaced the linear loadRoom)
  window.__game = game;
  window.__audio = audio; // music/sfx facade (used by the verification drive)
  window.__saves = saves; // meta-progression save (used by the verification drive)

  // dev menu — lazy-loaded on `?debug=1` or the backtick key (never in normal play)
  let debugGui = null;
  let debugShown = false;
  const toggleDebug = () => {
    if (!debugGui) {
      import('./debug/menu.js').then((m) => {
        debugGui = m.initDebugMenu(game);
        debugShown = true;
      });
    } else {
      debugShown = !debugShown;
      debugGui.show(debugShown);
    }
  };
  // persisted settings (ADR-0023): apply volume/mute to audio + post-FX, keep in sync
  audio.setMasterVolume(settings.get('volume'));
  audio.setMuted(settings.get('muted'));
  // "reduced effects" = raw render + no shadows (accessibility / low-end, ADR-0023/0026)
  postfx?.setEnabled(!settings.get('reducedEffects'));
  setShadowsEnabled(!settings.get('reducedEffects'));
  settings.onChange((k, v) => {
    if (k === 'volume') audio.setMasterVolume(v);
    if (k === 'muted') audio.setMuted(v);
    if (k === 'reducedEffects') {
      postfx?.setEnabled(!v);
      setShadowsEnabled(!v);
    }
  });
  initSettingsPanel();
  initCredits();
  initMetaPanel();

  addEventListener('keydown', (e) => {
    // ignore OS key-repeat (holding a key shouldn't strobe a toggle) and keys typed
    // into a focused control (slider/menu) — matches input.js's game-key convention
    if (e.repeat || isEditable(e.target)) return;
    if (e.key === '`') toggleDebug();
    else if (e.key === 'm' || e.key === 'M')
      settings.toggle('muted'); // mute/unmute
    else if (e.key === 'h' || e.key === 'H') settings.toggle('showHitboxes'); // hitbox overlay
  });
  if (location.search.includes('debug')) toggleDebug();

  window.addEventListener('resize', resize);

  // if the window/tab loses focus mid-keypress, the keyup may never fire and the
  // player keeps moving ("stuck going up"). Drop all held inputs when that happens.
  addEventListener('blur', () => input.clearKeys());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) input.clearKeys();
  });

  // browsers block audio until a user gesture — unlock + start music on the first one.
  // if we're still on the start menu (no run yet), play the menu theme.
  const unlock = () => {
    audio.unlock();
    if (!game.players || game.players.length === 0) audio.setMenuMusic();
  };
  for (const ev of ['click', 'keydown', 'touchstart']) {
    addEventListener(ev, unlock, { once: true });
  }

  // hide the loading splash, then show the start menu (pick 1P or 2P)
  document.getElementById('boot')?.classList.add('hide');
  document.getElementById('settings')?.classList.add('ready'); // reveal once boot clears
  showStartMenu((coop) => game.startRun(coop));

  // FPS-3: adaptive auto-downgrade. If we booted 'high' but this machine can't actually sustain it
  // (a real iGPU/laptop the boot probe can't detect), MEASURE the frame rate and drop the heavy LIVE
  // knobs ONCE — no reload. Applied directly (not via the persisted `reducedEffects` setting) so it
  // never overwrites the player's saved preference; restore with `?gfx=high` or the ✨ toggle. Skipped
  // entirely when disabled or already booted low. Never trips on a fast GPU. See core/graphics.js.
  const autoLow = GRAPHICS.autoLow;
  let onFrame;
  if (autoLow?.enabled && gfxTier !== 'low') {
    const sample = createPerfGuard(autoLow);
    onFrame = (frameMs) => {
      if (sample(frameMs, document.visibilityState === 'visible')) {
        postfx?.setEnabled(false); // drop bloom + N8AO (the heaviest passes) → raw render
        setShadowsEnabled(false); // drop the shadow map
        setPixelRatioCap(GRAPHICS.lowPreset.pixelRatioCap); // drop to the low-tier ratio (config, not a magic 1)
        window.__gfxTier = 'auto-low';
        console.info('[gfx] sustained low FPS → auto-dropped graphics (restore: ?gfx=high or ✨)');
      }
    };
  }

  startLoop({
    step: 1 / 60,
    update: (dt) => game.update(dt),
    render: (alpha) => game.render(alpha),
    timeScale: () => game.juice.getTimeScale(),
    onFrame,
  });
})();
