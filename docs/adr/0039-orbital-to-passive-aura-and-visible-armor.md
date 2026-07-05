# ADR-0039: Orbital Blade → passive Blade Aura, and Guard → visible Atomic Armor

- **Status:** Accepted
- **Date:** 2026-07-05

## Context

Two brainstorm asks from the UI-first legibility arc (`docs/plans/0003-ui-first-legibility-arc.md`,
CP-B):

1. **The Orbital Blade was awkward _as a weapon_.** It occupied a weapon slot, fired no bullets, took
   no reload/overheat downside (the sole limiter-less weapon), and needed special-casing in five
   places (`config.WEAPONS`, `POWER_SCORE.ORBITAL_TARGETS`, the offer bullet-mod gate, four
   `core/powerScore.js` branches, and its own tests). Scott wanted the _blades themselves_ kept but
   as an always-on **passive AoE**, not a gun you have to hold.

2. **Guard was mechanically good but invisible.** `core/defense.js` already blocks a whole hit per
   `guardCharges` (rare "Guard" = 1, ultra "Greater Guard" = 3), but nothing on the HUD showed it —
   the block just silently happened. Scott's framing: give it a diegetic home as **1950s / atomic
   armor tech** — a plate that sits over your last heart(s) and is _stripped_ instead of a heart,
   capped at 3.

## Decision

**B1 — Orbital Blade removed as a weapon; re-added as the passive `BLADE_AURA` upgrade.**

- Deleted `config.WEAPONS.orbital`, `POWER_SCORE.ORBITAL_TARGETS`, the `ORBITAL` entries in
  `core/items.js` / `PICKUPS.rarity.itemRarity` / `entities/pickups.js` (`WEAPON_TYPES` + `LOOK`),
  and the four orbital branches in `core/powerScore.js`. The Orbital Blade is gone from every
  weapon/drop/offer registry.
- Added `config.BLADE_AURA` (baseCount 2, +1 blade/level, maxLevel 3, radius/spin/damage/hitCooldown).
- Added a `BLADE_AURA` **offer upgrade** (`effect.kind: 'bladeAura'`, `add: 1`,
  `maxStacks: BLADE_AURA.maxLevel`). Player carries `_auraLevel`; `_updateAura` (the old
  `_updateOrbital` render/hit loop, renamed) now ticks **every frame independent of the held weapon**
  when `_auraLevel > 0`. Blade hits still take the global flat `+damage` and `damageMul`, so the aura
  rides your build. `core/offers.js` gates the pick once maxed (mirrors `GLOBAL_DAMAGE`).

**B2 — Guard reskinned as visible Atomic Armor. Mechanic unchanged.**

- `resolveIncoming` and `guardCharges` are untouched — a charge still soaks one whole hit.
- Item **names** reskinned: `GUARD` → "Atomic Plating", `GREATER_GUARD` → "Powered Exo-Armor",
  Aegis meta node desc → "+1 armor plate". IDs and the effect blurb ("Block the next hit") are
  **stable** (saves + `tests/items.test.js` depend on them).
- `hud.setHearts` / `setHearts2` now render `guardCharges` as 🛡️ armor plates trailing the hearts.
  Each hit strips a plate before a heart, so the plate popping off _is_ the block cue. The pause-menu
  stats panel (`core/statsPanel.js`) relabels "Guard" → "Armor" and adds a "Blade aura" row.
- **Charges are HARD-capped at `GUARD.maxCharges` (3)** — not just visually. Before CP-B, `guardCharges`
  was unbounded (Aegis +2, Guard +1, Greater Guard +3 could reach 6); the visual cap would then _hide_
  real armor and read as a lie. Now the apply path clamps to the cap, `core/offers.js` withholds both
  armor picks once you're full (no dead cards), and the HUD reads the same `GUARD.maxCharges`. This
  makes Scott's "3 max" literally true and the plate count always the truth.

## Consequences

- **Easier:** every weapon now pays a real downside (the limiter-less exception is gone); the rarity
  pyramid is a clean `8/6/5/2` (was `8/7/5/2` — the removed rare shifted the rare median 7.5 → 7.75,
  re-pinned in `tests/weaponEconomy.test.js`). Guard finally _reads_ on screen. The aura is a build
  buff you can stack on top of any gun, which feels good with the CP-A "discover your stats" ethos.
- **Trade-off:** the aura's contact FX reuses the _held_ weapon's spark style (no bespoke aura FX yet)
  — acceptable for a contact tick; can get its own look later. Armor plates are appended emoji, not a
  true CSS overlay "on" the heart; it reads clearly and stays in the existing all-emoji HUD paradigm.
- **Balance:** the aura is deliberately modest (dmg 1/blade, 0.4 s per-enemy cooldown, ≤ 4 blades).
  If it over/under-performs it's a one-line `config.BLADE_AURA` tune.

## Alternatives considered

- **Keep the Orbital Blade as a weapon but give it a limiter.** Rejected — it never fit the "hold a
  gun and aim" model, and Scott explicitly wanted it as a passive.
- **A meta (Resonance) node instead of an offer upgrade** for the aura. Deferred — an in-run offer is
  self-contained and testable now; a permanent node can be layered later if wanted.
- **A true CSS-overlay armor plate rendered on top of the heart glyph.** Rejected for CP-B — more DOM
  churn than the felt benefit; the trailing-plate glyph already delivers "you have N plates, they pop
  off when hit." Revisit if the HUD gets a visual pass.
