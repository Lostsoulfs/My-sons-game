# ADR-0042: The Demon companion — permanent-buff inheritance, Echoes unlock

- **Status:** Proposed
- **Date:** 2026-07-05

## Context

Plan [0003](../plans/0003-ui-first-legibility-arc.md)'s CP-C: revive the dormant `Ally`
(removed from play in CP5/ADR-0038) as a portal-**demon** companion — not a pet, not cute;
a sealed monster who didn't want the war (STORY.md's hidden layer). Design constraints from
the plan + memory: it makes **no picks**, gets **no reroll** (that died with CP5), carries
no real weapon, and inherits a **% of PERMANENT (meta) buffs only** — so it strengthens
when Resonance does, never from the run. Unlock/slot was design-on-arrival: the standing
note is "not free, not automatic."

The CP-D art panel already gave the demon its visual identity: a **containment specimen**
(asymmetric body, one oversized bound limb in a riveted 1950s restraint harness, welded
faceplate, Cherenkov-blue glow leaking from seams) — not a fantasy imp.

## Decision

1. **Unlock = a premium Resonance node** (`demon`, "Broken Seal", 😈, maxLevel 1,
   150 Echoes). Buying it IS the opt-in — no new UI, no start-menu toggle; the meta shop
   renders it like any node. The unlock **rides `baselineStacks` itself**
   (`effect: { stat: 'demon', perLevel: 1 }` + a `demon: 0` key in the zero-object), so
   `baseline.demon > 0` is the single spawn condition and the **first-win all-zero gate
   covers it for free** — even a hand-edited save can't field a demon pre-first-win.
2. **1P only.** `game.startRun` spawns it solely in the solo branch — 2P already fields
   Dad + Son, which sidesteps the co-op power-cap question entirely for now.
3. **NOT in `game.players`** — deliberately. That array drives offers (it would queue
   picks), co-op revives, wipe detection, and enemy targeting (`nearestPlayer`). Keeping
   the demon a separate `game.demon` makes it untargetable, offer-less, and
   revive-irrelevant _by construction_ rather than by scattered special-cases. (A scout
   suggested appending it to `players` for convenience — rejected for exactly this reason.)
4. **Inheritance = `share × permanent baseline` only** (`core/demonInherit.js`, pure +
   unit-tested): mirrors the `bl.*` terms of `player._recomputeUpgrades` at
   `DEMON.inheritShare` (0.5), locked at spawn. It is fed the **raw** `baselineStacks`
   result, NOT the player's merged copy — the merged one carries the Dad/Son ±trait, and
   a character trait is not a permanent meta buff. Pre-first-win it is exact identity.
5. **Outside the weapon economy.** The demon spits a bespoke Cherenkov bolt
   (`DEMON.bolt`, damage 1 / cd 0.55) — not a `WEAPONS` entry, so there is no reroll
   surface, no upgrade surface, no offer interaction, and no power-budget/rarity coupling.
   `allyShare` (the old in-run 20% share) and `config.ALLY` + `entities/ally.js` are
   deleted — `demonInherit` is a different contract, not a rename.
6. **Untargetable + unkillable, modest DPS.** Like the old Ally, nothing aims at it and it
   has no HP (no babysitting). Its damage trickle is bounded by config
   (`bolt.damage ≤ 1`, `cooldown ≥ 0.4`, locked by test).
7. **Mesh:** `entities/demonMesh.js` — the panel's containment specimen, procedural
   (hunched capsule torso, oversized bound arm with riveted harness rings, welded
   faceplate with an averted eye-slit, glow seams). GLB seam: `MODELS.demon` (replacing
   the reserved `MODELS.ally` slot) through the same `loadAnimated`-first pattern as
   every boss and the CP-D players.
8. **Legibility (CP-A rule):** the pause menu's Stats view gains a slim "😈 Demon" column
   (`core/statsPanel.js demonRows`, a separate export so the locked `statRows` contract
   never drifts) — the three inherited multipliers, raw tokens, no hand-holding.

## Consequences

- **Easier:** the demon's power can only be tuned in two places (`DEMON` config +
  the Resonance curve it inherits from) — no cross-system balance surface. A real GLB
  is a one-line `MODELS.demon` change. A future co-op demon or pet system reuses
  `demonInherit` unchanged.
- **The progression hook:** pre-first-win players never see it; the first Echoes purchase
  that matters is a _companion_, not a stat — a strong reason to win once.
- **Watch:** demon kills count as player-team kills (bullets are team `player`) — boss
  last-hits credit the team, which is intended (it's your demon) but worth a playtest
  eye. Its sustained fire draws from the shared 600-bullet pool (one bolt in flight per
  0.55s is negligible). Inheritance locks at spawn: a mid-run Resonance purchase (not
  currently reachable mid-run) would apply next run.
- Live-verified (`window.__game`): spawns only when bought + 1P; absent in 2P; rebuilt
  fresh across runs; heels; fires at range 22 at the configured cadence; damage lands at
  exactly `1 × inherited` (hp 3.991 → 1.982 = two 1.0045 hits); pause column renders.

## Alternatives considered

- **A start-menu toggle** for bringing the demon: more UI, and "bought = active" is
  simpler and matches "not free, not automatic" (the purchase is the choice). A toggle can
  be added later if Caden wants to bench it.
- **Inheriting in-run bonuses at a smaller share** (the old B9 `allyShare` model):
  explicitly rejected by the plan — the demon must grow with _long-term_ progression only.
- **Adding it to `game.players`:** see Decision 3 — every downstream system would need a
  "but not the demon" carve-out.
- **A real `WEAPONS` gun (old Ally style):** couples it to the power-budget/rarity model
  and reopens the reroll question; the bespoke bolt keeps the economy sealed and fits the
  fiction (it isn't _allowed_ a weapon).
- **HP + revives for the demon:** babysitting is anti-fun in a bullet-hell; a companion
  that can't die also can't be power-crept via survivability. Kept invulnerable-but-modest.
