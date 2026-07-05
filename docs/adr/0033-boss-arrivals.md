# ADR-0033: Boss arrivals — entry-opposite spawn, a BOSS_INTRO cinematic, a human-boss approach

- **Status:** Proposed
- **Date:** 2026-07-04

## Context

Today a boss fight starts the instant you cross the door. `spawner.populateRoom`
pins every boss to the north/back wall (`z = -depth/2 + spawnZOffset`, x=0)
regardless of which door you used, so on ADR-0032's connected map you can walk in
on top of the boss (~28% of boss rooms are entered from the north — the
grace-covered overlap the ADR-0032 audit flagged). `Boss.update` fires attacks from
frame 1 (no idle/awaken state), and the whole "entrance" is a 1.6s `hud.banner`
("THE SPIDER — KILL IT") over an already-live fight. The human decision-boss is
worse: crossing the door instantly pops the A/B/C/D overlay with zero context.

Scott's direction (memory `boss-entrance-notes`): bosses should **arrive**, not just
appear. Confirmed scope: (1) boss spawns **across the room from your entry** so you
always get room to read it; (2) a **full cinematic** entrance — camera push-in, name +
epithet card, reveal beat, then the fight — **skippable once you've seen that boss**
(first encounter always plays; naturally covers NG+/endless); (3) the human boss gets a
**scripted mini-scene** — approach on foot, civilians around, a setup line, _then_ the
choice — instead of an instant menu.

A 5-reader understand-pass mapped the seams and the traps that shape the design.

## Decision

**1. Entry-opposite boss placement (pure).** A new `core/bossPlacement.js`
`bossSpawnForEntry(entrySide, arena, opts)` returns the spawn point(s) + facing on the
wall **opposite** the entry (mirror of `game.js`'s ENTRY table), and a duo's two beasts
spread along the wall's free axis (X for N/S walls, Z for E/W). `loadNode` threads
`entrySide` into `desc`; the spawner uses the helper instead of the hardcoded constant.
Boss bullet patterns already aim dynamically from `boss.x/z`, so relocation is safe.
This also retires the entry-overlap trap for free (boss and player now sit on opposite
walls). Deterministic: placement is a pure function of `entrySide`, and a cleared boss
room never re-populates (ADR-0032), so backtracking can't perturb it.

**2. `BOSS_INTRO` state (combat bosses).** A new non-ticking state (like
`HUMAN_CHOICE`) freezes the fight for free. Entered from `loadNode`'s **non-cleared**,
non-human boss branch (guarded on `bosses.length`; the cleared branch returns early, so
backtracking never replays it). A state-timer (advanced in the `BOSS_INTRO` update arm,
NOT `setTimeout`, so it respects pause) drives the timeline: camera push-in → name+epithet
card fades in → reveal beat (roar + `flashScreen(FEEL.screenFlash.bossReveal)` + trauma +
particle burst) → hand off to `PLAYING`. The boss's **constructor roar is suppressed**
for an intro boss and replayed on the reveal beat (no double-roar). Boss music starts on
the reveal, not at spawn.

**3. Camera push-in.** No new camera — the existing per-frame `render()` composition
(`baseCam + camPan + shake`, `lookAt(camPan)`) reads an intro factor. During `BOSS_INTRO`,
`_updateCamera` retargets the `camPan` spring to the boss's XZ (overriding the ±5 pan
clamp for the intro only) and an eased `introZoom` (0→1) lerps `baseCam` height/back down
toward the boss. Restored exactly on handoff. Camera/juice/particles already tick in every
state, so the move animates while the fight is frozen. Frame-rate-safe (eased off the
fixed-timestep state-timer, not a per-RAF constant).

**4. Skip-after-seen (persisted).** `saves` tracks a `seenBosses` set. First encounter
with a boss key: the intro plays **in full, unskippable**, then the key is recorded.
Later encounters (incl. all of NG+/endless, where everything is seen): a **skip prompt**
shows and any confirm input fast-forwards to `PLAYING`. Headless/no-DOM drives
short-circuit the intro immediately (the `showHumanChoice` escape-hatch precedent) so
smoke tests never stall.

**5. Human approach mini-scene.** A new `HUMAN_APPROACH` state that — unlike
`HUMAN_CHOICE` — **ticks players + camera + prompts but not the boss/enemies/bullets**
(a players-only arm mirroring `ROOM_CLEAR`), so you walk up on foot while the human
stands inert across the room (entry-opposite from decision 1). Ambient **civilians**
(reused `Npc`, flagged passive so `_handleSurvivors` skips them) stand around him; a
setup line reads as you approach. Reaching an `approachRadius` (or pressing interact)
calls the existing `showHumanChoice` → `HUMAN_CHOICE` → `_onHumanChoice` unchanged. Music
stays on the **stage track** through the buildup; the boss theme + roar fire only on the
existing wrong-read fight branch. A wrong read can disperse/panic the civilians for payoff.

**6. Name card + epithets.** A dedicated `#namecard` DOM overlay (name + epithet, CSS
fade/scale, `textContent` XSS convention) added to `hud` as `nameCard/hideNameCard` —
distinct from the transient `#banner` and the persistent HP-bar name. Each boss behavior
module gains a `title` (epithet), copied to `boss.title`; duos share one. Epithets:
Spider = "Warden of the Outskirts", Mushroom King = "Sovereign of the Fungal Depths",
Fang & Whisker = "Wardens of the Kennels", Rattlebones = "Marshal of the Catacombs",
Enforcer = "Government War-Machine". The human boss keeps no name-slam (the mini-scene is
his reveal).

**7. Config-first.** Every feel-number ships in `config.js` from line one: a `BOSS_INTRO`
block (push-in / hold / fade ms, camera zoom + lookAt bias, trauma, particle count, sting
id), `FEEL.screenFlash.bossReveal`, and `HUMAN_BOSS` approach knobs (radius, civilian
count, buildup ms), plus the boss wall inset.

## Consequences

**Easier:** every boss gets a real arrival for free once the state exists; the entry
overlap is gone; `type`/`title` are the seams Phase 6b (curse/mini-boss rooms) reuses.

**Harder / accepted:**

- Two new states + a camera director + a name-card overlay + a save field — the biggest
  `game.js` surgery since the connected map, but each state reuses the `HUMAN_CHOICE`
  pause precedent and the render-composition seam.
- `spawnSafe` **must be re-armed at every intro→PLAYING / approach→fight handoff** (the
  non-ticking-state grace-freeze trap the ADR-0032 audit caught — same fix).
- The boss-EXIT door (also keyed off `OPPOSITE[link]`) and the entry-opposite boss can
  land on the same wall — verified the exit still opens on a free side clear of the boss.
- Repeated-run drama vs. skip: solved by skip-after-seen; first view is always full.

## Alternatives considered

- **`introInert` flag on the boss instead of a new state** — rejected for combat bosses
  (a whole new state is cleaner and matches `HUMAN_CHOICE`), but the human _approach_
  needs a live player, so it uses a players-only tick with the boss left un-ticked.
- **A true camera/FOV zoom** — unnecessary; a framed push-in via the existing pan spring +
  base-distance lerp reads as a zoom and needs no post-FX/shadow-frustum changes.
- **3D name-card / spotlight meshes** — rejected: DOM overlay matches the HUD convention
  and dodges the mid-play mesh teardown-leak class.
- **Per-run (not persisted) skip** — rejected: a fresh player should see each boss once
  _ever_, and NG+/endless want everything skippable — that's a persisted `seenBosses`.
