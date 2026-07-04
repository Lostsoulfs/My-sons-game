# ADR-0030: Weapon economy — per-weapon per-stat upgrades, no ground weapon drops, two-dial luck

- **Status:** Proposed
- **Date:** 2026-07-03

## Context

The run economy (ADR-0028 offers, ADR-0022 scaling, ADR-0029 meta) applies **all** stat
upgrades **globally**: an offered DAMAGE_UP raises `player.damageMul` for every gun. Weapons
also drop on the ground (boss chests via `PICKUPS.rarity.bossChestWeights`), so the same guns
recur and damage is a flat multiplier. Scott wants the run to be about **which gun you invest
in**: weapons earned only through the upgrade tree, and stat upgrades bound to the gun you're
holding. A live web study (`docs/research/2026-07-03-roguelite-economy.md`; Nova Drift,
Brotato, Isaac, Gungeon, Risk of Rain 2) confirmed per-weapon binding is a genuine
differentiator (no shipped roguelite does it) and surfaced concrete guardrails so it doesn't
go stale or degenerate.

Design intent (Scott, 2026-07-03; see memory `weapon-economy-redesign`):

- Weapons come **only** from the offer tree — **no ground weapon drops at all**.
- Upgrades bind **per weapon, per stat**, each stat 0→9 (NOT a freeform total — that caps too
  fast). ~6–7 stats × 9 ≈ a full run of picks per gun, so a single-weapon "challenge" run
  never dead-ends early. Config-driven so it scales as bosses are added.
- **Keep-on-cycle, lose-on-replace:** cycling between guns you hold keeps each gun's stack;
  dropping/replacing a gun for a new one wipes that gun's upgrades. The loss must be legible.
- **Offer rarity ramps** with progression; new-weapon offers get rarer after the first pick.
- **Mod gating:** explosive tips are rare, never on already-explosive or fast-firing guns and
  never stacked on an explosive weapon; pierce is weapon-specific/balanced — nothing one-shots
  a whole screen. "OP should feel OP, not cheap."
- A rare **global max-damage** reward (applies across weapons) as a top-tier offer.
- **Luck** as a two-dial system (Scott + research): a positive **Luck** dial biases offer/drop
  rarity **up (capped)**, and a **separate Curse/danger dial** where bad luck spawns ambushes
  **(uncapped)** — never one +/- axis (Isaac/Gungeon both split them so they tune independently
  and can't snowball into trivially-rich or unwinnable).

## Decision

Rework the in-run economy in a **first slice** (this ADR's core), then layer the rest:

**Slice B1 (this change):**

1. **No ground weapon drops.** Boss clears stop rolling a ground weapon chest; a boss clear
   instead grants a guaranteed **boss-tier offer** (rare+). Normal rooms already offer.
2. **Per-weapon per-stat upgrades.** `player._weaponUpgrades[weaponKey] = { damage, fireRate,
mods:{pierce,bounces,bulletSpeed,explodeRadius} }`. `damage`/`fireRate`/mods are **per
   weapon**; `speed`/`damageReduction`/`luck`/`maxHearts`/`guard` stay **global** (they buff
   the body/run, not the gun). The Echoes meta baseline stays a global passive added on top.
   `_recomputeUpgrades()` derives `damageMul`/`fireRateMul` from the **current** weapon's
   stacks and is re-run on every weapon switch. Each stat caps at `CAPS.upgradesPerStat = 9`.
   Cycling keeps entries; **replacing** a gun deletes its entry (lose-on-replace).
3. **Offer rarity ramp + weapon-offer down-weight** after the first weapon, and **mod gating**
   (explosive rare + excluded on explosive/fast guns; pierce weapon-specific) in the offer
   generator, keyed by the current weapon.
4. A rare ultra-tier **global max-damage** offer item (applies to all weapons).

**Fast-follows (layered PRs, tracked):** the two-dial **Luck + Curse** system; **see-it-once**
offer depletion; the permanent-upgrade **diminishing-returns + breakpoint** meta curve;
hyperbolic curves for chance stats + a fire-rate delay soft-cap; the **connected map** and
**fusion** system (both backlogged, own ADRs).

## Consequences

**Easier:** each run has real build identity; the same guns stop recurring; balance levers are
per-weapon and config-driven; "no screen-clearing one-shot" is enforceable via mod gating +
(later) hyperbolic chance curves; the research's guardrails are captured for the layered work.

**Harder / trade-offs accepted:**

- **Save/HUD surface.** `_weaponUpgrades` replaces the global `_up` for damage/fireRate; the
  HUD must show upgrades are gun-specific, and the on-replace loss must be visible or players
  feel robbed. Old saves migrate by unfolding the global baseline onto every weapon.
- **Boss flow change.** Boss clears now route through an offer instead of a ground chest —
  small surgery on the boss room-clear path.
- **Offer generator gains weapon context.** `generateOffer` now reads the current weapon (its
  stat levels + flags) to gate mods and skip maxed stats; the pure tests widen accordingly.
- **Deterministic seeds shift** (ADR-0013): changing the offer/drop pools changes which items a
  given seed rolls — acceptable (runs are seeded per-playthrough, not replayed room-by-room).
- **Ally.** The AI ally reads the player's current-weapon stacks (simplest); noted for tuning.

## Alternatives considered

- **Freeform total-9 per weapon** — rejected by Scott (caps out too fast; the whole point is a
  deep single-weapon run).
- **Keep global stats, just remove ground weapon drops** — simpler, but loses the build-identity
  payoff and the "invest in your gun" decision that motivated the rework.
- **One-axis luck (+/- one number)** — rejected: research shows it snowballs into trivially-rich
  or unwinnable and is hard to balance; two independent dials (Isaac/Gungeon) tune cleanly.
- **Nova-Drift-style keep-mods-on-swap** — rejected: keeping upgrades on swap removes the
  weapon-commitment decision; lose-on-replace is the intended cost (made legible in UI).
