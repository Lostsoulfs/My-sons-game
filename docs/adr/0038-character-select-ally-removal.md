# ADR-0038: Dad/Son character select + AI-ally removal (1P is solo)

- **Status:** Proposed
- **Date:** 2026-07-05

## Context

CP5, the last checkpoint of the weapon/economy redesign. Owner direction (2026-07-05 playtest):
the permanent AI ally in single-player is unsatisfying — it either trivialises the fight or adds
noise, and its "reroll the ally's weapon" offer control is a half-feature. Instead, **let the player
pick who they are** — **Dad** or **Son** — and make 1P genuinely _solo_. In the fiction Dad and Son
are together; mechanically they're both on screen only in **2-player co-op**. The AI companion idea
moves to a future **pet** system (Caden's idea), so the `Ally` class should survive as a dormant
reference, not be deleted.

## Decision

- **Two playable characters** (`config.CHARACTERS`): **Dad** (blue, starter = ballistic `pistol`) and
  **Son** (green, starter = energy `laserpistol`). The ballistic-vs-energy **flavor comes for free**
  from the starter weapon — Dad's pistol reloads, Son's laser overheats (CP2 `WEAPON_LIMITS`), no
  special-casing. Each also carries a small permanent **`trait`** (Dad +10% damage / −5% speed; Son
  −5% damage / +10% speed / +5% fire-rate) merged onto the Echoes baseline in `game.startRun`, so it
  flows through `player._recomputeUpgrades` like any Resonance bonus. Trait numbers are first-pass —
  tuned in playtest.
- **Start menu is two-step** (`ui/startmenu.js` + `index.html`): 1P → a Dad/Son pick; 2P skips it
  (always Dad = P1/kb, Son = P2/pad). Callback widened to `onChoose(coop, character)` →
  `game.startRun(coop, character)`. `Player` gains `startWeapon` + `character` constructor args.
- **AI ally removed from play.** `game.startRun` no longer constructs `new Ally` in the 1P branch;
  every `this.ally` reference (teardown, room reset, the two update sites, the offer-screen weapon
  reroll incl. its `[R]` key handler) is gone. **The `Ally` class file stays intact but unreferenced**
  — the dormant seam for the future pet system. **2P is unchanged**: it already spawned two full
  `Player` instances (the green "ally-colored" P2 was never the `Ally` class), so co-op is untouched.
- **Restart preserves the character** (`this.player?.character ?? 'dad'`) on both the in-game restart
  and the debug-menu restart, so a Son run doesn't respawn as Dad.

## Consequences

- **Easier:** 1P is a clean solo experience with a chosen identity; the flavor split (reload vs
  overheat) is emergent from the weapon, not bespoke character code. Removing the ally is surgical —
  it was never wired into collision/targeting/minimap, only update/render/offer. `config.CHARACTERS`
  is the one tuning seam; `tests/characters.test.js` locks the starters + flavor.
- **Harder / accepted:** the `Ally` class + `config.ALLY` are now dead weight until the pet system
  lands — kept deliberately (the pet will likely reuse the follow/fire pattern). The character pick is
  mouse/click only (like the existing menu) — a pad-only 1P player can't navigate it, a pre-existing
  menu limitation not addressed here.
- **Determinism (ADR-0013) preserved:** `startRun(coop, character, seed)` keeps the seed arg; the
  character only changes starter weapon + baseline, all deterministic.

## Alternatives considered

- **Keep the AI ally, just improve it.** Rejected by the owner — the companion belongs in a dedicated
  pet system with its own unlocks/variety, not as a permanent 1P crutch.
- **Delete the `Ally` class outright.** Rejected — it's the natural starting point for the pet's
  follow/fire behavior; keeping it dormant costs nothing and saves a rewrite later.
- **Bake ballistic/energy differences into the character (not the weapon).** Rejected — the starter
  weapon already carries that flavor via `WEAPON_LIMITS`; duplicating it on the character would be two
  sources of truth. Traits stay as generic stat nudges.
- **A separate character-select screen/module.** Rejected as overkill — a second step inside the
  existing `#startmenu` DOM overlay is the smallest change that ships the feature.
