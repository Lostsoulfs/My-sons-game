# Roadmap — Lostsouls (later scope)

The **curated, forward-looking plan**: the things we _intend_ to do later, grouped by theme, each with
_why it's deferred_ and _what would trigger doing it_. This is deliberately distinct from its
neighbours:

- [`BACKLOG.md`](BACKLOG.md) — the raw **parking lot** (unsorted ideas, known gaps). Items get
  **promoted from BACKLOG into this roadmap** once they're real intentions, and into an **ADR** once
  decided.
- [`WORKLOG.md`](WORKLOG.md) — what's **already done** (the build diary).
- The decision docs ([`AUDIO.md`](AUDIO.md), [`GRAPHICS.md`](GRAPHICS.md), [`GAMEPLAY.md`](GAMEPLAY.md),
  [`STORY.md`](STORY.md)) — the _why_ behind current choices and each area's own open items.

> **Light by design (ADR-0005).** Not a promise or a schedule — a snapshot of where the game is
> heading. Fun-first; we pull from here when it's the right time, not to burn down a list.

---

## Graphics

- [x] ~~**Atmospheric overhaul**~~ — **DONE (ADR-0026, v0.8.0–v0.8.3).** IBL/environment
      lighting + richer fog, real-time shadows, a wet-asphalt PBR floor, and N8AO ambient occlusion
      all shipped. Remaining scope, still open:
- [ ] **Depth-of-field + volumetric fog + broader PBR** — the atmosphere items ADR-0026 didn't
      cover (PBR is floor-only today; no DoF or volumetric fog). _Deferred:_ same reasoning as
      before — risks readability + perf, wants Scott's eye. _Trigger:_ a dedicated mood pass.
- [ ] **WebGPU renderer** — Three's WebGPU path is maturing. _Deferred:_ no concrete need; WebGL2 is
      plenty for our scene. _Trigger:_ a feature that needs compute/instancing WebGPU unlocks.
- [ ] **Per-mesh hit-flash tint** — brief emissive/color pop on a hurt entity's mesh. _Deferred from
      B2 (v0.8.6):_ finicky/risky to tint animated GLB character groups without leaving a stuck tint,
      and hurt already reads via blood splatter + screen-flash + trauma shake. _Trigger:_ if hit
      feedback still feels weak in playtest, do it defensively (store + restore material state).

## Audio

- [ ] **Real boss themes (5)** — bespoke "1950s doom-jazz × Doom" per boss, designed **with Caden**
      (Stable Audio, full ownership; prompts in [`AUDIO.md`](AUDIO.md)). _Deferred:_ creative call +
      Caden time; the 5 boss slots share one placeholder, swappable with no code change. _Trigger:_ a
      theme-making session.
- [ ] **Curated final stage tracks** — replace the Kevin MacLeod placeholders with the chosen score
      (distinct genre per stage), maybe CC0. _Trigger:_ a curation pass with Scott's ear.
- [ ] **Audio studio Phase 2** — an audition page (browser preview of every track/cue),
      OfflineAudioContext SFX snapshots, loop-point detection. _Deferred:_ the core studio (report +
      normalize/transcode) already covers the current need. _Trigger:_ curating finals at volume.
- [ ] **Win/gameover music stingers** (synth for now) and **recorded SFX** (currently procedural).
- [ ] **Adaptive intensity layers** (calm ↔ combat stems) + a **music-only volume slider** (master
      governs both today).

## Gameplay & story

- [ ] **"Living Weapons" arc** — fused guns that wake up over a run (grow/talk/change how they fire);
      a `STORY.md` pillar. _Deferred:_ a meaty new system; needs design (the story open questions).
- [ ] **Survivor ally system** — temporary companions, escort/quest rooms, trade, area mini-games —
      all under the story's **trust** pillar (the human decision-boss is the seed). _Trigger:_ design
      lock on how temp allies join/leave.
- [ ] **More floors / bosses** — slot new bosses along the edge → core gradient (`STORY.md`).
- [ ] **Orbital Blade → passive power-up** rework (playtest feedback) + **final balance tuning**
      (the `UPGRADES`/`DIFFICULTY`/`WEAPONS` defaults are Scott + Caden's to crank).
- [ ] **Accessibility adds** — reduced-shake / "calm camera" toggle, high-contrast/colorblind palette
      (the settings panel + store from ADR-0023 make these small).

## Tooling

- [ ] **CI visual regression** — wire the render studio's `pixelmatch` diff into CI. _Deferred:_
      SwiftShader renders differ across machines (cross-machine pixel variance), so it stays a **local**
      check for now. _Trigger:_ a stable reference-render environment (pinned container/GPU).
- [ ] **Audio audition page** — see Audio studio Phase 2 above.

## Tech / performance (deferred until the counts demand it)

> From the 2026 perf audit. The bullet system does linear scans + one mesh per pooled bullet — fine at
> our current hundreds; the first bottleneck only at thousands. Deliberately deferred so we don't
> destabilize a working build for speed it doesn't need yet.

- [ ] **Data-oriented projectile store** (SoA / typed arrays) — cut per-bullet JS overhead.
- [ ] **Spatial-hash broad phase** — replace the linear bullet↔actor / wall scans.
- [ ] **Instanced bullet rendering** (`InstancedMesh`) — collapse draw calls.
- [ ] Optional: glTF compression (KTX2/Draco), `OffscreenCanvas` worker.
- **Trigger:** sustained on-screen bullets approaching the pool ceiling, or frame budget past ~16 ms
  on a target device (watch the Stage-3 perf HUD).

## Cross-repo / org

- [ ] **Dedicated logging repo** (org-wide) — a single repo for logs/history across Scott's repos.
      [`WORKLOG.md`](WORKLOG.md) is the interim home; its entries can feed the dedicated repo when it
      exists.
