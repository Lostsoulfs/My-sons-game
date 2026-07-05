# 0003 — UI-first legibility → combat cleanup → demon companion → models → modes

- **Status:** In progress — CP-A ✅ (#89), CP-B ✅ (ADR-0039), CP-D plumbing ✅ (ADR-0041,
  real art owner-gated), CP-C ✅ (ADR-0042, demon companion); CP-E (mode select) last.
- **Date:** 2026-07-05
- **Follows:** [0002 — Weapon & Economy Redesign](0002-weapon-economy-redesign.md).

## Context

A full-pause reflection surfaced the real tension: the game's **mechanical depth has outrun its
player-facing legibility**. The 0002 arc added a power-budget rarity economy, a luck/curse curve,
reload/overheat, and Dad/Son traits — and the HUD shows _none of it_ (only hearts / lives / room /
minimap / boss bars / the ammo-heat gauge). Owner's design stance (confirmed): **do NOT hand-hold.**
No persistent on-screen explainers, no "just luck all the way up" nudging. Bullet-hells teach by
exploration (Isaac / Gungeon / Nuclear Throne) — legibility should be **opt-in, in a pause menu**.

Confirmed scope decisions: **lead with the pause menu**; build the companion **after UI + combat**;
**source real GLB art** for models; **Story-first, Endless scaffolded/tuned later**.

## Decision — sequenced, gated checkpoints

Story-bible doc (doc-only, first) → **CP-A** → **CP-B** → **CP-C** → **CP-D** → **CP-E**. Each code
CP is one gated, feel-tested PR. Almost all of it is _assembly on systems that already exist_.

- **CP-A — Pause menu (leads).** New `State.PAUSED` (freezes the fight for free, like the offer
  screen); ESC + gamepad Start trigger; `ui/pausemenu.js` + `#pausemenu` overlay with three panels:
  **Map** (reuse `hud.setMinimap`), **Options** (sound/FX toggles wired to the existing persisted
  `settings.js`), and an opt-in **"show all stats"** panel reading live player fields (`damageMul`,
  `speed`, `_up.luck`, `_baseline.*`, `guardCharges`, `_globalDamageFlat`, per-weapon
  `_weaponUpgrades`). **Raw values, no explanatory tooltips** — numbers to discover, not be taught.
- **CP-B — Combat cleanup.** ✅ **Shipped (ADR-0039).** (1) Orbital Blade removed _as a weapon_ and
  re-added as the always-on **passive `BLADE_AURA`** upgrade — the `_updateAura` loop (renamed from
  `_updateOrbital`) ticks every frame off `_auraLevel`, stacks to 3, offer-gated at max; the rarity
  pyramid became `8/6/5/2`. (2) Guard → visible **Atomic Armor**: mechanic unchanged, item names
  reskinned ("Atomic Plating" / "Powered Exo-Armor"), `guardCharges` now **rendered as 🛡️ plates
  over the hearts**, capped at 3; stats panel relabels Guard → Armor. Live-verified via `window.__game`.
- **CP-C — Demon companion.** Revive the dormant `Ally` as a portal-**demon** (not a pet, not
  cute — a sealed monster who didn't want the war). No reroll (already gone), no new weapons; it
  inherits a **% of your PERMANENT (meta) buffs** (`player._baseline.*`), so it only strengthens
  when Resonance does. Unlock/slot + co-op power cap are design-on-arrival. ADR + adversarial
  review (balance invariant). Ships with a procedural demon mesh; real GLB in CP-D.
- **CP-D — Real GLB models (Dad, Son, Demon).** The mesh factory already supports GLB with a
  procedural fallback (`characterMesh.js` → `getModel`). Point `MODELS.dad/son/demon` at real
  assets. **Pre-scouted CC0 sources** (all glTF, no attribution): Kenney Mini/Blocky Characters
  (adult + kid skins on one rig — a matched Dad+Son family), Quaternius Ultimate Modular Men /
  Universal Base Characters (higher-fidelity Dad + scaled young Son on a shared rig), Poly Pizza
  "100 Avatars R1". Demon from Quaternius creature packs / Poly Pizza. Procedural stays as the
  guaranteed fallback. Art choice is owner-gated.
- **CP-E — Mode select.** Start-menu Story/Endless pick; thread `mode` into `startRun(coop,
character, seed, mode)` (keep the numeric-2nd-arg seed back-compat). Story = the current 6-floor
  run; Endless = a scaffold gated behind first win that loops past floor 5 with a steeper
  `floorScale` — ramp tuning + boss-phase authoring are design-on-arrival. ADR.

## Lore (captured in [STORY.md](../STORY.md) — the 2026-07-05 hidden-layer section; no mechanics committed)

Gov + monsters _secretly allied_ (betrayal endgame TBD); the war **manufactured via
mind-control-by-distrust** (humans can't do magic, so they engineer distrust); **Echoes = a
government substance** tested on subjects (leaders won't touch it; Dad+Son can use it un-deformed);
a father-son **tech lone-wolf duo** (not chosen heroes); portal entry (prior humans needed
rad-suits); a later **playable-monster** perspective flip; multi-playthrough **secret endings**.

## Open / design-on-arrival

- Companion unlock/slot + co-op power cap (with Caden).
- Endless ramp curve + boss phase/pattern authoring.
- Per-weapon "standout" identity — backlogged; folds into future weapon work.
- The conspiracy endgame ("IDK what yet") — intentionally open for NG+/secret endings.
