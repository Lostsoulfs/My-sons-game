# Research — roguelite weapon-economy & map format (2026-07-03)

Web research (Nova Drift, Brotato, The Binding of Isaac, Enter the Gungeon, Risk of Rain 2)
to pressure-test Scott's Phase-5 design: per-weapon **per-stat** upgrades (0→9 each), no
ground weapon drops, offer rarity ramp, a Luck stat, connected map per boss, single fixed
difficulty. Sources are cited per game at the bottom. Figures are the source games' — treat
as precedent, not gospel. Feeds the weapon-economy ADR.

## 1. Our upgrade model (per-weapon, per-stat 0→9) — KEEP IT

No shipped reference binds upgrades **per weapon** the way we plan — every one either
globalizes stats (Brotato, Isaac, Gungeon) or keeps mods on swap (Nova Drift). Our
per-weapon binding is a genuine differentiator: it makes "which gun do I invest in" a real
decision and gives the strongest build identity. Closest precedent is **Nova Drift's
mod-tree**, but it **keeps mods on swap** — we DROP them on replace, a harsher bet, so the
loss must be **brutally legible in the UI** or players feel robbed.

Two weaknesses to fix:

- **Flat 0→9 goes stale once a gun caps.** Isaac/RoR2 get depth from _combinatorial_
  synergies, not deeper numbers. **Fix:** a post-cap sink so an offer is never null + a few
  terminal "capstone" upgrades gated behind several stat levels (this is where **fusion**
  slots in).
- **Linear chance-stats are degenerate.** Luck/crit/pierce-proc leveled linearly eventually
  hit 100%/screen-clear. **Fix:** curve per stat — damage/fire-rate ~linear, but
  chance/defensive stats **hyperbolic** so 0→9 asymptotes and never guarantees. This _is_
  our "nothing one-shots a screen," done principled.

## 2. Connected map vs linear — worth it; build the Isaac generator

Isaac shipped a connected, backtrackable map on a dead-simple **BFS + 50% reject** (reject a
cell with 2+ filled neighbours → naturally sparse tree). Boss at the **farthest dead-end**;
shop / mini-boss / curse rooms on other dead-ends. **Two-layer generation:** floorplan
(room graph) separate from contents (mob/template pools by difficulty tier) — so roaming
mobs, mini-bosses and luck-spawns are a content layer independent of map shape. Gungeon adds
**one-way loops** to gate premium loot behind a committed path. **Don't over-engineer** (skip
Dead Cells branching for v1). MVP: ~7–10-room grid, boss at farthest dead-end, one shop, one
mini-boss room, full backtracking + a minimap that hides special-room identity. Caveat
(RoR2): a backtrackable map invites safe farming — add a **gentle** rising-threat while
lingering, not a harsh clock.

## 3. Luck — TWO dials, not one axis (the key correction)

**Do NOT put reward-rarity and danger on the same axis.** Both Gungeon (Curse vs Coolness)
and Isaac (Luck vs Curse rooms) deliberately split them so they tune independently and the
player can reason about them. Our "high luck → richer / negative luck → ambush" sketch
collapses them — a one-axis luck snowballs into trivially-rich or unwinnable.

- **Reward dial (positive LUCK):** growing "ticket pools" per rarity; luck adds tickets to
  higher pools — biases rarity **up, capped, never guaranteed** (Isaac caps luck at 10).
- **Danger dial (a Curse-like track):** negative luck / cursed offers add ambush + elite
  spawns and fused/mimic caches — tuned separately, **upside capped, downside can climb.**
- Brotato diminishing denominator: `chance × (1 + Luck) / (1 + drops_this_room)` so one
  lucky spike can't flood a room.
- **Bake a baseline rarity ramp into depth** (rich even at 0 luck); luck only front-loads it,
  so non-luck builds aren't taxed. Add a **pity timer** so a keystone is guaranteed
  eventually. **Telegraph ambushes** or two-sided luck reads as unfair RNG.

## 4. Mini-bosses / elites / random spawns

- **Elites = recolor + stat recipe** (Isaac champions / Gungeon jammed): HP×, +move/fire
  speed, contact damage, one-heart hits. Any mob → mini-boss cheaply, no bespoke art.
- **Make elites the GUARANTEED top-tier loot path, decoupled from luck** (Brotato) so
  unlucky runs still progress. HP-threshold mutation phases add cheap difficulty texture.
- **Spawn Director with a rising credit budget** (RoR2): gates roaming mobs by a per-region
  budget that grows with depth and **auto-retires trash mobs late** — free rarity ramp.
- **Luck-flavored "chase" spawns** (Brotato Looters): rare roamers that guarantee rich drops
  / offer rerolls if killed in time. A **nemesis** at max-danger (Gungeon Lord of the Jammed)
  is a good anti-farm valve — edge case, not routine. On-screen enemy cap with **silent
  no-loot despawn** for perf.

## 5. Anti-stale & caps

1. **See-it-once offer depletion** (Isaac): when a weapon/mod is offered, drop it from the
   pool for the rest of the run — offers visibly narrow, never repeat. Cheapest, strongest
   anti-stale lever.
2. **Capstone / fusion mods** gated behind several stat levels — something to chase past 9.
3. **A curated 10–20 named synergies** (NOT 300 — balance debt) as a discovery topping.
4. **Depth ramps three things at once:** room count, mob difficulty, and rarer offer tiers.
5. **Fire-rate:** soft-cap via a diminishing **delay curve** (smoother than a wall). **Damage
   uncapped** but sanity-clamped; keep a definitive **run end** and endless as a separate
   mode (pure-endless _shrinks_ build variety — Nova Drift & RoR2 both prove it).
6. **Single fixed difficulty + modifier modes: CONFIRMED** by Isaac and RoR2. A selector
   fragments offer/luck tuning.

## Top recommendations (prioritized)

1. KEEP per-weapon 0→9; add a post-cap sink + capstone/fusion so a single-gun run never
   dead-ends. _(Isaac/Brotato)_
2. **Split luck into two independent dials** — reward-rarity (capped) vs Curse-danger
   (uncapped). Never one axis. _(Gungeon, Isaac)_
3. Rarity = growing ticket pools with a depth-baked baseline ramp; luck front-loads it.
   _(RoR2, Brotato)_
4. Ship the Isaac BFS+reject grid for the connected map; boss at farthest dead-end;
   two-layer floorplan/contents. Resist fancier generators. _(Isaac)_
5. See-it-once offer depletion. _(Isaac)_
6. Elites = recolor + stat recipe → guaranteed rare loot (luck-decoupled); gate spawns behind
   a rising credit budget. _(Brotato, Isaac, RoR2)_
7. Hyperbolic curves for chance/defensive stats; fire-rate delay curve; damage uncapped but
   clamped; hard run-end; endless separate. _(RoR2, Brotato, Isaac)_
8. Make the on-swap upgrade LOSS brutally legible; gate one-way-loop premium offers; add
   10–20 named synergies. _(Nova Drift, Gungeon)_

## Sources

- Nova Drift: novadrift.io dev blog (release, Wild Metamorphosis), Steam design discussions.
- Brotato: community wiki (Luck, Stats, Enemies), metabrotato scaling.
- Binding of Isaac: boristhebrave dungeon-generation writeup, Rebirth wiki (Level Generation,
  Luck, Item Pool, Treasure Room).
- Enter the Gungeon: Dodge Roll floor-flow generation notes, wiki (Curse, synergies).
- Risk of Rain 2: item stacking / Director / difficulty-scaling references.

_(Full per-game structured findings are in the session workflow output; this is the
decision-ready synthesis.)_
