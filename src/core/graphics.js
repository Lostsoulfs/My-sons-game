// =====================================================================
// graphics.js — pure helpers for the graphics / perf-tuning knobs (FPS-1).
//
// No THREE import on purpose, so this stays unit-testable (AGENTS.md: keep pure
// logic separate from render code). scene.js uses these for the renderer setup
// and the live A/B setters; the debug menu uses the option arrays for its dropdowns.
// =====================================================================

/**
 * The effective device pixel ratio to render at: the panel's own ratio, clamped
 * to `cap`, with safe fallbacks for missing/garbage inputs (headless, odd panels).
 * @param {number} deviceRatio typically window.devicePixelRatio
 * @param {number} cap GRAPHICS.pixelRatioCap
 * @returns {number} a finite ratio >= the smaller of the two sane values
 */
export function effectivePixelRatio(deviceRatio, cap) {
  const dr = Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
  const c = Number.isFinite(cap) && cap > 0 ? cap : dr;
  return Math.min(dr, c);
}

// ---- graphics QUALITY tier (FPS-2): a boot-time low path so weak/headless GPUs don't choke ----
// The full pipeline (MSAA + 2048 shadows + N8AO + bloom) is tuned for a discrete GPU. On a
// SOFTWARE renderer (SwiftShader/llvmpipe, i.e. CI/headless) it can crawl and even time out a
// screenshot. `resolveGraphicsTier` picks 'low' | 'high' at boot; scene.js/postfx.js read the
// (possibly-downgraded) GRAPHICS. The player's own machine is never touched: only an EXPLICIT
// override or a genuine software renderer drops the tier — a real GPU (incl. an Intel iGPU via
// ANGLE) always stays 'high'. Restore any time with `?gfx=high` or the in-game reduced-effects ✨.

/**
 * True only for UNAMBIGUOUS software/offscreen GL renderers (never a real GPU, incl. ANGLE-on-iGPU).
 * Keyed on the WEBGL_debug_renderer_info UNMASKED_RENDERER_WEBGL string.
 * @param {string} str renderer string (may be '' / undefined when the ext is unavailable)
 */
export function isSoftwareRenderer(str) {
  if (typeof str !== 'string' || !str) return false;
  return /swiftshader|llvmpipe|softpipe|mesa offscreen|microsoft basic render|software adapter/i.test(
    str,
  );
}

/**
 * Resolve the graphics tier at boot. Precedence: an explicit `?gfx=low|high` param ALWAYS wins,
 * then a webdriver/software-renderer auto-downgrade, else the full 'high' default.
 * Pure so it unit-tests without a GL context (the caller probes the renderer string).
 * @param {{param?:string, renderer?:string, webdriver?:boolean}} inputs
 * @returns {'low'|'high'}
 */
export function resolveGraphicsTier({ param, renderer, webdriver } = {}) {
  const p = typeof param === 'string' ? param.trim().toLowerCase() : '';
  if (p === 'low' || p === 'high') return p; // explicit override always wins (headless uses ?gfx=low)
  if (webdriver === true) return 'low'; // automated/headless browser: default to the light path
  if (isSoftwareRenderer(renderer)) return 'low'; // CI/software GL can't run the full pipeline
  return 'high';
}

/**
 * Deep-merge a preset onto a target config object IN PLACE (mirrors the existing runtime mutation
 * of GRAPHICS by setPixelRatioCap/setShadowMapSize). Plain-object values recurse; everything else
 * (numbers, booleans, arrays, null) overwrites. Returns the mutated target.
 * @param {object} target the GRAPHICS object to downgrade
 * @param {object} preset the sparse override (e.g. GRAPHICS.lowPreset)
 */
export function applyGraphicsPreset(target, preset) {
  if (!preset || typeof preset !== 'object') return target;
  for (const key of Object.keys(preset)) {
    const val = preset[key];
    if (isPlainObject(val) && isPlainObject(target[key])) applyGraphicsPreset(target[key], val);
    else target[key] = val;
  }
  return target;
}

function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}
