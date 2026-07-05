# ADR-0035: Weapon downside — reload (ballistic) and overheat (energy)

- **Status:** Proposed
- **Date:** 2026-07-05

## Context

Playtest feedback (2026-07-05): weapon balance was "all about fire-rate and damage," and
power weapons (minigun, nukes) could be spammed with no cost. The owner wants every weapon to
carry a real **downside**, and for **flavor** (ballistic vs energy) to finally mean something
mechanically — but explicitly **no consumable ammo economy** (no pickups to manage). This is
CP2 of the weapon/economy redesign arc; it also lays the **duty-cycle** groundwork the CP3
power-budget model (ADR-0036) uses to make rarity ≈ power.

## Decision

Give every firing weapon one downside, keyed to its flavor:

- **Ballistic → magazine + reload.** Fire `clipSize` rounds, then a `reloadTime` downtime before
  the clip refills. `core/reload.js` — pure state `{ammo, reloading, reloadT}` with
  `initClip / tickReload / fireRound / canFireClip`.
- **Energy → overheat.** Each shot adds `heatPerShot`; the gauge bleeds `coolRatePerSec`
  continuously; at full heat it **overheats** (a forced cooldown) until it bleeds back under
  `resetHeat`. `core/heat.js` — pure state `{heat, overheated}` with
  `initHeat / coolHeat / addHeat / canFireHeat`. **Feathering never overheats** — only sustained
  hosing does (the skill seam).
- **Minigun** stays ballistic-flavored but uses **heat** (spin-up + overheat, no ammo).
- **Orbital** (a passive contact weapon) has **no** limiter.

All knobs live in **`config.WEAPON_LIMITS`** (one block, per-weapon `reload` or `heat`). The
`Player` holds per-weapon state maps (`_clip`, `_heatState`) keyed by weapon so it **persists
across weapon swaps** (no free reload by switching away and back). The firing seam
(`player.js` `update` + `_updateCharge`/`_releaseCharge`) ticks the limiter each frame and gates
firing on `canFire`. A bottom-centre HUD readout (`hud.setLimiter`, refreshed per-frame in
`render()` because heat bleeds continuously) shows ammo/reload or a heat bar.

Damage stays **type-agnostic** vs mobs/bosses for now — the ballistic/energy split is _only_
the reload-vs-overheat handling. (Damage-type interactions, e.g. energy-vs-shields, are a later
option.)

## Consequences

- **Easier:** flavor is now a real mechanical identity (magazine cadence vs heat management);
  power weapons self-limit (a hosed minigun overheats; the Davy Crockett reloads between nukes)
  without an ammo economy. The reload/overheat **duty cycle** becomes the single balance lever
  CP3 scores against.
- **Feel work moves to config:** `WEAPON_LIMITS` values are CP2 starting points; CP3 tunes each so
  a gun's _sustained_ DPS lands in its rarity band. Every number is a live `npm run dev` knob.
- **Determinism preserved (ADR-0013):** the state machines are pure and driven by the fixed-step
  `dt` (never wall-clock), so reload/overheat timing is identical per seed. No RNG added.
- **Not covered yet:** the AI ally keeps its own simple fire path (no limiter) — intentional, it
  becomes a pet in CP5. Co-op shows P1's limiter only for now. Both are follow-ups, not blockers.

## Alternatives considered

- **Consumable ammo (magazine + reserve, pickups).** Rejected by the owner — pickup
  micromanagement fights the fast twin-stick flow. Reload/overheat gives the "downside" without a
  resource economy.
- **A single unified limiter for all guns.** Rejected — reload vs overheat is exactly what makes
  ballistic and energy _feel_ different; one mechanic would flatten the flavor split.
- **Per-weapon `reload`/`heat` inline on each `WEAPONS` entry.** Rejected for a dedicated
  `WEAPON_LIMITS` block — one readable place to tune the whole roster, smaller diff, no bloat on
  the weapon stat rows.
