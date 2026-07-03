---
lifecycle: growing
frozen: false
visibility: public
maturity: active-development
updated: 2026-07-02
---

# Status — Lostsouls

**This project is GROWING, not frozen.** It is a co-designed game (Scott + son), fun-first and
**light by design** (ADR-0005). It will keep gaining expansions and polish until it is explicitly
marked `frozen: true` in the front-matter above. Treat anything here as a current snapshot of an
in-progress build, not a final release.

This file is the lifecycle source-of-truth for the repo. The build diary (what was done, per
session) lives in [`docs/WORKLOG.md`](docs/WORKLOG.md); the detailed running history of gotchas in
[`docs/LEARNINGS.md`](docs/LEARNINGS.md); the "why" behind decisions lives in
[`docs/adr/`](docs/adr/).

## Lifecycle

- **lifecycle:** `growing` — actively developed; expect change.
- **frozen:** `false` — no freeze declared.
- **visibility:** `public`.

## Current state (v0.8.16)

A browser 3D bullet-hell shooter (Three.js + Vite + Express): solo with an AI ally and local
two-player co-op (keyboard/mouse/gamepad). Most recent work:

- **Story canon locked: 1950s + full backstory (#65, #66)** — era moved to mid-to-late 1950s
  (WW2 happened, then a people-vs-government civil war); world history, the experiment-gone-wrong
  rift, and the "Echo" energy origin are canon. Full backstory structured with a floor-by-floor
  reveal map, a three-ending concept, and an implicit/environmental storytelling approach
  (`docs/STORY.md`); an `inkjs` choice engine is a deferred future ADR.
- **FPS instrumentation + safe dial-backs (v0.8.16)** — A/B perf tooling
  (`docs/plans/0001-fps-instrumentation.md`) found post-FX + shadows off take an RTX 5060 from
  30→165 fps; shipped the safe wins now (shadow map 2048→1024, `pixelRatioCap` 2→1.5), with a
  data-gated post-FX cut PR still to come.
- **Bug fixes + test hardening (#63, #64)** — hostile-survivor enemies now move during
  `ROOM_CLEAR` and spawn on a safe-distance ring instead of on top of the player; ported a
  statistical RNG battery, config invariants, and metamorphic tests from the testing kits
  (303 tests total).
- **B10 — meta-progression: Echoes + Resonance (v0.8.15, ADR-0029, #58)** — a versioned
  `localStorage` save, an Echoes currency, and a Resonance screen for permanent upgrades, gated
  behind a first full win.
- **B9a/B9b — room-clear OFFER screen (v0.8.13–v0.8.14, ADR-0028, #56, #57)** — a pick-1-of-3
  upgrade offer on room clear, backed by an item registry + offer engine + scaling.
- **B5–B8 — difficulty, patterns, knockback, drop rarity (v0.8.9–v0.8.12, ADR-0027, #52–#55)** —
  a "twice as hard" master difficulty knob with fair weights, a parametric bullet-pattern library
  with homing extraction, knockback impulse + exponential decay, and drop rarity tiers with hard
  pity.
- **B1–B4 — feel & kid-fairness foundation (v0.8.4–v0.8.8, #47–#51)** — feel-math foundation,
  trauma shake + screen-flash, camera spring-follow, and kid-fairness telegraph/gap math with a
  CI guard rail; plus a Codacy-injection `.gitignore` defense.
- **Housekeeping (#59, #60)** — `docs/OPERATIONS.md` + an auto-format pre-commit hook, Node pin
  alignment, and a `.sonarcloud.properties` fix so exclusions actually apply.
- **Atmospheric overhaul COMPLETE (ADR-0026)** — the four-phase visual upgrade is done: in-game
  image-based lighting with richer fog (A), **real-time shadows** (B), a **wet-asphalt PBR floor** (C),
  and **N8AO ambient occlusion** (D, v0.8.3). The dark world now has real depth — image-based fill,
  grounded contact shadows, a textured floor, and soft occlusion — while keeping readability and the
  glowing-threats identity, all config-gated with graceful fallbacks and behind the `reducedEffects`
  toggle.
- **Atmospheric overhaul — Phase C: CC0 PBR floor texture (v0.8.2, ADR-0026)** — the ground now uses a
  dark, wet **CC0 asphalt** PBR set (albedo + normal + roughness, ambientCG Asphalt025C) so it reacts to
  the IBL + shadows. Loaded via the never-throw `core/textures.js` (missing map → flat color fallback),
  tunable in `GRAPHICS.floor`, dark enough to not bloom. Phase 3 of 4; D = N8AO ambient occlusion next.
- **Atmospheric overhaul — Phase B: real-time shadow maps (v0.8.1, ADR-0026)** — `PCFShadowMap` with
  the warm key light as the sole caster (tight ortho frustum fit to the arena, ~2048 map). Entities +
  walls cast, ground + walls receive; the glowing `MeshBasic` bullets/eyes/door never cast. Config in
  `GRAPHICS.shadows`; the `reducedEffects` toggle drops shadows with the rest. Verified via a headless
  boss-room screenshot (clean soft shadows, no acne). Phase 2 of 4; C = CC0 PBR floor, D = N8AO next.
- **Atmospheric overhaul — Phase A: in-game IBL + richer fog (v0.8.0, ADR-0026)** — a subtle
  image-based-lighting fill (`PMREMGenerator` + `RoomEnvironment` → `scene.environment`, intensity
  kept low so pale models don't wash out; glowing `MeshBasic` threats untouched) plus config-driven
  fog modes (linear/exp2) and an explicit sRGB output color space. The render studio shares the same
  IBL knobs, so portraits match. First of four phased, perf-gated graphics PRs (B = shadows, C = CC0
  PBR floor, D = N8AO ambient occlusion next), each backed by a verified deep-research spec.
- **Drift-audit bot (v0.7.3)** — a deterministic PR auditor (`scripts/audit-drift.mjs`; design in
  [`docs/DRIFT-AUDIT.md`](docs/DRIFT-AUDIT.md), ported from the codex repo) that checks **logged intent
  vs the actual diff** (phantom claims, scope creep, weakened gates, skipped tests, lint suppressions,
  missing PR "Deviations") and posts the report as a comment on same-repo PRs via
  `.github/workflows/audit.yml` (no API key; comment-only — the control policy forbids the push-back
  pattern, and fork PRs get a read-only token so the audit still runs but can't comment). (A local
  `auditor` agent / `/audit`
  for the semantic layer is
  deferred pending sign-off — agent self-config.) First step of the atmospheric-overhaul run
  (IBL → shadows → textures → AO next).
- **Config cleanup (v0.7.2)** — centralized the game's **lighting + fog** into a new `config.LIGHTING`
  block (plus `CAMERA.near/far`, `GRAPHICS.pixelRatioCap`); `scene.js` and the render studio now read
  it (the studio's copy-pasted lights are gone, so portraits track the game). A retro fix for the
  "feel-numbers should live in config" rule.
- **Render studio harness (v0.7.1)** — a dev tool ([`tools/render-studio/`](tools/render-studio/),
  `npm run render:studio`) that renders each boss's real in-game mesh through the **same post-FX
  pipeline** (so portraits match the game), with IBL, a deterministic pose, auto camera-fit, and a
  combined **contact sheet** of all bosses. Salvaged + upgraded from the closed boss-shots PR;
  produces clean boss portraits without playing to each room.
- **In-game graphics overhaul — post-FX (v0.7.0, ADR-0025)** — the game now renders through a
  **post-processing pipeline** ([`src/core/postfx.js`](src/core/postfx.js), pmndrs `postprocessing`):
  **luminance-gated bloom** so the dark world's emissive threats (bullets/enemies/pickups/door) glow,
  **ACES tone mapping**, vignette, and WebGL2 MSAA — plus impact sparks on wall hits. All knobs in
  `config.GRAPHICS`; a ✨ "reduced effects" toggle (`#settings`) and an automatic raw-render fallback
  mean it never breaks. Big visual jump, readability preserved.
- **Dependency audit + bump (v0.6.10)** — honest maintenance pass: `npm audit` clean (0 vulns), the
  runtime stack already on latest (three r184, vite 8, express 5, howler), only dev tooling bumped
  (eslint 10.5.0, vitest/coverage 4.1.9, playwright 1.61.0). Full gauntlet + smokes green on the new
  tooling. No runtime code changed.
- **Decision docs (v0.6.9)** — added three "single home for decisions" docs alongside the existing
  [`AUDIO.md`](docs/AUDIO.md)/[`STORY.md`](docs/STORY.md): [`docs/GAMEPLAY.md`](docs/GAMEPLAY.md)
  (design & balance), [`docs/GRAPHICS.md`](docs/GRAPHICS.md) (visual/render decisions + the current
  baseline), and [`docs/ROADMAP.md`](docs/ROADMAP.md) (the curated later-scope plan, distinct from the
  `BACKLOG.md` parking lot). Part of the phased full package upgrade ([`docs/WORKLOG.md`](docs/WORKLOG.md)).
- **Audio studio + OGG migration (v0.6.8)** — kicked off a phased **full package upgrade** (graphics,
  tooling, deps, decision docs; see [`docs/WORKLOG.md`](docs/WORKLOG.md)). First phase: a dev
  **audio studio** ([`scripts/audio-studio.mjs`](scripts/audio-studio.mjs), `npm run audio:report` /
  `audio:process`) that reports per-track LUFS/peak + waveform PNGs and loudness-normalizes (EBU R128,
  −16 LUFS) + transcodes the placeholder score **MP3 → OGG** (58 MB → 33 MB, consistent volume).
  Plug-and-play music contract unchanged; synth fallback intact.
- **Audio — placeholder score wired + audio bible (v0.6.7)** — every stage now has real looping
  music and the bosses share a placeholder theme (CC-BY, Kevin MacLeod), all swappable with no code
  change. New [`docs/AUDIO.md`](docs/AUDIO.md) is the single home for audio decisions — track map,
  candidate swaps, and **research-backed design principles** (engaging via horror's tension→release,
  while deliberately avoiding gambling-style reward manipulation). Added an in-game **Credits** panel
  (start menu → ♪ Credits) for the CC-BY attribution. Boss themes get designed with Caden later.
- **Audio overhaul — music engine (v0.6.6, ADR-0024)** — a recorded-music layer via **Howler.js**
  ([`music.js`](src/systems/music.js)): a distinct looping track per stage, a crossfade to each boss
  theme, a menu theme, and music-ducking on hits — driven from game state through the existing
  [`audio.js`](src/systems/audio.js) facade. The procedural **SFX synth stays**; the synth drone is
  now the **fallback** so a missing track is never silent. Tracks are **plug-and-play**
  (`config.MUSIC` id→file map; stream + lazy-load so big files don't bloat runtime). This run's
  identity: "**1950s × Doom**" (doom-jazz), distinct genre per stage. **Engine ships now; track files
  (curated stages + AI boss themes) come next.** This ADR also records Scott **superseding the
  zero-dependency posture** (free libs allowed if they fit the other rules).
- **Maintenance pass (v0.6.5)** — fixed the carried-forward **AnimModel mixer leak**: animated
  bosses/minions ([`animModel.js`](src/core/animModel.js)) now `dispose()` their `AnimationMixer`
  (+ action cache) when removed, so a multi-floor run no longer orphans mixers. Plus doc-freshness
  fixes. The **Exp7 #31 follow-up** had consolidated the last feel-knobs into config
  (`config.SETTINGS`/`OVERLAY`/`DIFFICULTY`/`PICKUPS`).
- **Expansion 7 Stage 3 (feel & dev tools)** — the accessibility/feel layer (ADR-0023). Persisted
  **settings** ([`settings.js`](src/systems/settings.js), the first `localStorage` use): a
  bottom-right panel + `M`/`H` keys for **volume / mute** and a **hitbox overlay**. A pooled, leak-safe
  [`overlays.js`](src/systems/overlays.js) draws an always-on **boss telegraph ring** (the
  ground-ring telegraph deferred from Stage 1) and the opt-in hitbox rings. The debug menu gained a
  **perf HUD** (draw calls / live bullet + enemy counts) for tuning. Carry-overs: `ally.range` 16→22
  for the bigger arena; tightened the Stage-6 `scale.test` nits. Completes the Foundation & Feel pass.
- **Expansion 7 Stage 2 (scaling math)** — the balance rework (ADR-0022). A pure
  [`scaling.js`](src/core/scaling.js): **diminishing-returns upgrades** (`statBonus`, config
  `UPGRADES`) so power ramps over a whole run instead of capping in ~3 pickups, and a single
  **difficulty curve** (`floorScale`, config `DIFFICULTY`) that shapes the whole run (finale ≈ 2.52×
  vs the old 2.15×) toward a real BoI/Gungeon/Doom challenge. Gentle nerfs to the OP guns (machine
  gun / homing / rocket); pistol stays weak, shotgun unchanged. All knobs are Scott's to fine-tune.
- **Expansion 7 Stage 1 (foundation)** — a pure **bullet-pattern (emitter) library**
  ([`emitters.js`](src/entities/bosses/emitters.js): `ring`/`gapRing`/`jitterRing`/`star`/`nWay`/
  `arc`), so a new attack is "pick a generator + config numbers" (ADR-0021). The 5–6 duplicate ring
  closures were refactored onto it (behavior-identical), and the **human** boss was **de-samey'd**
  from a spider-clone ring into an aimed **panic-spray cone**; telegraphs read clearer. Also fixed
  the **orbital-blade-freezes-on-death** residual and corrected the **story canon** (nameless place,
  a post-WW2 **civil war** (people vs. government), the 1950s as the era anchor — no anachronistic
  weapons). First of the
  research-led "Foundation & Feel" pass (scaling math + accessibility follow in later stages).
- **Expansion 6 Stage 6 (polish)** — wrote the **story bible** ([`docs/STORY.md`](docs/STORY.md):
  Caden's mid-to-late-1950s civil-war-torn ruined city, the experiment-gone-wrong rift, temporary survivors,
  civil-war-era arms × rift-tech "living weapons", **no zombies**), then a **scale pass**
  (ADR-0020): arenas ~2.5×
  bigger (40×30 → 64×48) with the **camera sized to fit** the whole room and a documented **size
  ladder** (player < basic mob < boss). Fixed the **orbital-blade-survives-reset** bug
  (`Player.dispose`). Balance/stat-cap tuning is deliberately **parked** in `BACKLOG.md`.
- **Expansion 6 Stage 5 (finale)** — the **Human decision-boss** 🚪 "The Survivor". Before the
  fight you pick how to approach (A/B/C/D); a seeded "right" read skips the fight AND grants the
  weapon slot, a wrong read means you fight him for it (new `HUMAN_CHOICE` state + overlay,
  pure `resolveHuman`, ADR-0019). This sets the **final 5-floor order**:
  spider → human → mushroom → duo → skeleton. Expansion 6's boss roster is complete.
- **Expansion 6 Stage 4** — the **skeleton boss** 💀 "Rattlebones" (aimed bone throws, a seeded
  scatter ring, a reassemble-and-teleport escape with i-frames, and HP-gated boneling summons)
  with an animated CC0 skeleton (Quaternius). Reuses the data-driven boss + animated-model +
  hazard systems — no new ADR.
- **Expansion 6 Stage 3** — the **Dog/Cat duo** 🐶🐱, the first **multi-boss** fight
  (`game.bosses[]`, two separate HP bars, a pure `DuoController` with alternating aggression +
  enrage-on-partner-death, ADR-0018). Fang pounces, Whisker zones with cross-swipes and summons
  kittens; animated CC0 beasts (Quaternius Shiba + Cat).
- **Expansion 6 Stage 2** — the **mushroom boss** 🍄 (spore ring with a dodge gap, telegraphed
  poison pools via a new ground-hazard system ADR-0016, HP-gated puffballs) with **animated
  CC0 GLB monsters** (Quaternius Mushroom King + Mushnub minions) and an animation system
  (ADR-0017). The spider stays procedural.
- **Expansion 6 Stage 1** — data-driven bosses (behavior modules, ADR-0014), 5 new guns with
  pierce/homing/bounce/charge/orbital behaviors, and 9-room floors (ADR-0015). First of a
  staged expansion adding the human/mushroom/duo/skeleton bosses + animated CC0 models.
- **Expansion 5 Stage 1** — weapon slots + global stat caps (ADR-0012).
- **Seeded runs + determinism** — optional replayable seed on `startRun`, plus a cross-system
  determinism test over the pure RNG seams (ADR-0013).
- **Cross-repo hardening** — secret/PII pre-commit + CI scanner (public-repo BLOCK policy),
  ESLint 10, pinned actions.

29 ADRs (0001–0029). Verification: probability/proof tests, coverage gate, production smoke +
browser smoke, OpenSSF scorecard, dependency review, control audit.

## Scope (unchanged)

A static single-page game. **No accounts, no payments, no real wagering, no PII, no backend
beyond the static Express server + `/healthz`.** Light by design — it is not a governance
showcase; it is a game built for fun and learning (ADR-0005).

## Backlog

Deferred ideas and known gaps are parked in [`docs/BACKLOG.md`](docs/BACKLOG.md).
