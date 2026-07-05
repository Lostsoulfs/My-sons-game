# ADR-0043: Run modes — Story / Endless (post-win, scaffolded)

- **Status:** Proposed
- **Date:** 2026-07-05

## Context

Plan [0003](../plans/0003-ui-first-legibility-arc.md)'s CP-E — the arc's last checkpoint.
Confirmed direction: **Story-first, Endless scaffolded/tuned later** ("as we figure out
boss patterns/phases"), and the standing difficulty stance (memory): a **single fixed
difficulty; modes add modifiers** — difficulty never forks. Endless ramp tuning and
boss-phase authoring are explicitly design-on-arrival; CP-E ships plumbing + a basic loop.

## Decision

- **Pure core:** `core/progression.js` gains `mode` ('story' | 'endless'):
  - `resolveMode(requested, gameBeaten)` — endless is a **post-first-win reward**; anything
    else (pre-win, junk input, typos) resolves to story. Called again inside
    `game.startRun` (belt-and-suspenders with the menu), so a pre-win console call can't
    sneak in.
  - `floorDef(i, mode)` — story **clamps** to the last floor (unchanged); endless **cycles**
    the roster (`i % floorCount`), so bosses rotate every loop instead of Enforcer-forever.
  - `floorMeta(i, mode)` — in endless `isLastFloor` is **always false** (the exit descends
    forever; there is no win — the loop is the mode) and past the story floors the diff
    takes an EXTRA per-floor ramp (`MODES.endless.rampMul`, 1.12) on top of `floorScale`'s
    own growth. **Story is bit-identical to the pre-mode game** (locked by test:
    `floorMeta(i) === floorMeta(i,'story')` on every floor).
- **One seam in game.js:** `_checkDoor`'s exit branch already keys on `isLastFloor` — with
  endless never reporting a last floor, the whole loop needs no new state, no new win
  path, no `_onWin` changes. `startRun(coop, character, seed, mode)` threads `this.mode`
  into the three `floorMeta` call sites; both restart paths (R-restart, debug menu)
  preserve mode (the startRun-signature-ripple lesson, applied proactively this time).
- **Start menu:** a Story/Endless toggle row **hidden until `gameBeaten`** — Endless is a
  post-win _discovery_, not a locked/greyed tease (the no-hand-holding rule extends to
  menus). Selection resets to Story on every menu open; `onChoose` gains the mode arg.
- **What endless inherits for free:** checkpoints keep advancing (every boss floor is a
  "non-last" floor), Echoes keep dropping (post-win by definition), `bestFloor` keeps
  recording (an endless depth stat with zero new code), boss entrance cinematics
  skip-after-seen, and the demon companion comes along.

## Consequences

- **Easier:** the endless ramp is one config number (`MODES.endless.rampMul`); boss-phase
  authoring per loop (harder phase-2s deeper in) can hook `floorMeta`'s diff or
  `phaseFlips` later without touching the mode plumbing.
- **Scaffold, explicitly:** deep-loop balance is untuned by design — damage is uncapped for
  NG+/endless per the standing meta rules, and fire-rate stays hard-capped; whether the
  curve holds up past loop 2 is a playtest question, not a plumbing one.
- **Watch:** the human decision-boss recurs every loop (def cycling) — its choice scene
  re-runs each visit. Fine for now (the choice is seeded per run), worth a feel pass later.
- Live-verified end-to-end through the real menu: post-win row appears, toggle flips,
  1P→Dad launches `mode:'endless'`; floor 7 builds with the cycled def (human at 7%6=1),
  diff 6.32 vs 3.18 at story-end, `isLastFloor:false`; pre-win an explicit
  `startRun(...,'endless')` falls back to story and the row stays hidden; story's last
  floor still wins.

## Alternatives considered

- **A locked/greyed Endless button pre-win:** teases content and invites "how do I unlock
  it" questions — hiding it entirely matches the discovery-first design (Isaac-style).
- **A separate endless difficulty curve:** violates the one-difficulty stance; a single
  extra ramp multiplier on the existing curve keeps one source of truth.
- **Enforcer-forever past the end (clamping defs):** monotonous; cycling the roster gives
  every loop the full boss variety and lets future per-loop escalation key off loop count.
- **A `State.ENDLESS` / separate win state:** unnecessary — endless simply never reaches
  the win branch; fewer states, same behavior.
