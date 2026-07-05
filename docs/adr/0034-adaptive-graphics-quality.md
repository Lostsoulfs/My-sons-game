# ADR-0034: Adaptive graphics quality — measure the frame rate, don't guess the GPU

- **Status:** Proposed
- **Date:** 2026-07-04

## Context

FPS-2 (PR #82, `main` `b9733e4`) added a boot-time graphics tier: `resolveGraphicsTier`
picks `low` | `high` from a `?gfx=` param, `navigator.webdriver`, and the WebGL
`UNMASKED_RENDERER_WEBGL` string (via `isSoftwareRenderer`). The intent was that weak /
headless environments run a cheap pipeline while the owner's discrete GPU stays full-ultra.

**It didn't actually protect the environment that lags.** Live probe of the headless
Iris-Xe preview (the exact machine that chokes on MSAA 8 + 2048 shadows + N8AO):

```
gfxTier:   "high"          navigator.webdriver: false
renderer:  "ANGLE (Intel … Iris(R) Xe Graphics …)"   → isSoftwareRenderer = false
shadowMapEnabled: true     pixelRatio: 1
```

A real iGPU is **not** a software renderer, and `navigator.webdriver` is false in the
preview — so both auto-downgrade signals miss, and it boots `high`. The only "fix" was to
remember to type `?gfx=low` every time: a manual workaround, not a fix. A renderer string
can never tell you a GPU is _too slow for this scene_ — only the actual frame rate can.

## Decision

Add an **adaptive** guard that measures real frame-time and downgrades once when a machine
genuinely can't keep up, layered on top of (not replacing) the boot tier.

- **`core/graphics.js` `createPerfGuard(cfg)`** — a pure, DOM-free watchdog. Fed each
  frame's raw wall-clock `frameMs` and whether the tab is `visible`, it returns `true`
  exactly once (then latches) when visible FPS stays below `minFps` across a full
  `windowMs` window, after a `graceMs` warm-up. Three false-positive guards, each for a
  real hazard:
  - **hidden frames are ignored** — a backgrounded tab throttles rAF to ~1 Hz, which is
    the browser pausing, _not_ GPU lag (this is why FPS-2's screenshot timeouts were never
    a fidelity problem);
  - a **warm-up** skips the janky first frames (shader compile / asset decode);
  - a **single hitch** over `maxFrameMs` (tab-return, GC) is dropped and resets the window.
- **`core/loop.js`** gains an optional `onFrame(frameMs)` hook (raw, unclamped — the sim's
  0.25 s clamp still applies only to `dt`), keeping the loop free of any graphics knowledge.
- **`main.js`** wires the guard (skipped if already booted `low` or `GRAPHICS.autoLow`
  disabled). On fire it drops the heavy **live** knobs — `postfx.setEnabled(false)` (bloom +
  N8AO), `setShadowsEnabled(false)`, `setPixelRatioCap(1)` — **directly**, not through the
  persisted `reducedEffects` setting, so it never overwrites the player's saved preference.
- All knobs live in **`config.GRAPHICS.autoLow`** (`enabled, minFps 40, windowMs 2000,
graceMs 1500, maxFrameMs 500`).

## Consequences

- **Easier:** any weak machine (iGPU, old laptop, throttled CI when foregrounded) self-heals
  within ~`graceMs + windowMs` of actually rendering slowly — no GPU allow-list to maintain,
  no flag to remember. The owner's fast GPU never trips (165 fps ≫ 40), so it's untouched.
- **The downgrade is silent and one-way per session.** Accepted: it's a safety net, not a
  quality slider. It's observable (`window.__gfxTier = 'auto-low'` + a console line) and fully
  reversible with `?gfx=high` or the ✨ toggle. It never *up*grades on its own (no oscillation).
- **Does not affect the sim.** The guard only touches render knobs — no RNG, no `update(dt)`,
  no entity state — so seeded-run determinism (ADR-0013) is preserved.
- **Still doesn't make headless _screenshots_ work** — those time out on the hidden-tab rAF
  throttle, which is correct pause-when-backgrounded behavior we deliberately don't defeat
  (a real game should pause when tabbed away). Verify visuals via synchronous eval / inspect,
  not screenshots (see `docs/LEARNINGS.md`).

## Alternatives considered

- **Boot-time only, expand the heuristics** (treat hidden-at-boot or more renderer strings as
  low). Rejected: still a guess — it would mis-downgrade a real player who opens in a
  background tab, and can't see "this GPU is too slow for _this_ scene." Measurement is truth.
- **Graduated multi-step downgrade** (shadows → AO → pixel ratio → MSAA as FPS drops).
  Rejected for now: MSAA (`aaSamples`) and floor textures are set at renderer/scene
  construction and aren't live-changeable without a rebuild, so a full ladder needs more
  machinery. One decisive drop of the three heaviest _live_ knobs is simpler, testable, and
  enough. Revisit if a middle tier proves necessary.
- **Auto-set the persisted `reducedEffects` setting.** Rejected: it would silently rewrite the
  player's saved preference and stick across sessions. The guard applies the same renderer
  changes transiently instead.
