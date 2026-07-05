# 0002 — Weapon & Economy Redesign + Feel Fixes (CP1–CP5)

- **Status:** In flight — shipped as stacked PRs #84 → #85 → #86 → #87 (open, merge in order).
- **Date:** 2026-07-05
- **ADRs:** 0035 (reload/overheat), 0036 (power-budget), 0037 (luck/curse + upgrade rework),
  0038 (character select).

## Context

A playtest on `main` (`59637a3`) surfaced a batch of interlocking issues. Two were clear feel
bugs; the rest was a coordinated weapon/economy/character redesign whose headline is **"make the
weapon math match."** A power-budget scoring pass confirmed **rarity ≠ power**: Browning was a
no-downside _epic_ out-scoring everything; Laser Pistol was a _common_ out-scoring rares; Davy
Crockett was an _ultra_ below rares — an inverted **7/7/9/2** pyramid. Goal: a strict power
pyramid where every weapon pays a real downside, luck/curse are a tuned D2-magic-find curve,
HP/soak upgrades are gone, and the AI ally becomes a character-select (+ a future companion).

## Decision — five gated checkpoints

- **CP1 — Feel fixes** (no ADR): low hero-angle boss-intro camera (drop the "scalp shot"); human
  approach mini-scene gets camera focus + a distinguished, stepped-forward target vs civilians.
- **CP2 — Reload / Overheat downside** (ADR-0035): no consumable ammo. Ballistic → magazine +
  reload; energy → overheat; minigun → spin-up + overheat. `core/heat.js` + `core/duty.js` (pure,
  `dt`-driven). The reload/overheat **duty cycle** is the balance lever. HUD ammo/heat gauge.
- **CP3 — Power-budget model** (ADR-0036): `core/powerScore.js` = `burstDPS · dutyCycle ·
accuracy · range · scenario · alpha`. Re-tier all weapons to a strict **8/7/5/2** pyramid;
  medians strictly increase by tier; every weapon carries a downside; **no pity timers**. Locked
  by `tests/weaponEconomy.test.js`.
- **CP4 — Luck / Curse curve + upgrade rework** (ADR-0037): `core/luck.js` D2 magic-find shape
  (`statBonus`, asymptotes below the cap, never guarantees); curse = negative luck, partially
  offset on a curve (−25%-at-max-luck target); a permanent **Fortune** Echoes node. Cut HP growth
  (Vitality) and % damage soak (Tough Hide); keep Guard/Greater-Guard/Aegis. Global damage →
  flat +1, max 3 stacks. **Curse math is wired but the source (ambush/elite spawns) is Phase 6b.**
- **CP5 — Character select** (ADR-0038): 1P picks **Dad** (ballistic starter pistol) or **Son**
  (energy starter laserpistol), each with a small +/− trait. 1P is **solo**; the permanent AI ally
  is removed (the `Ally` class is kept **dormant** for a future companion). 2P = Dad(P1)+Son(P2).

## As-built notes

- Energy weapons initially never overheated (net heat ≤ 0); heat params were solved from target
  duty cycles. Davy Crockett's nuke scored below commons until an **AoE-only alpha** credit was
  added to the power score. Charge/minigun were mis-scored until `effectiveCooldown` handled
  charge-time and spin-up wound-up cadence.
- CP4 review caught a NaN `goodMul` → all-ultra offers (clamp + weighted-pick made finite-safe).
- CP5 review caught the seed arg moving 2→3 (`startRun(coop, character, seed)`); a numeric-2nd-arg
  back-compat preserves `startRun(false, 12345)` reproducibility (ADR-0013).
- All new logic is pure / THREE-free, uses `game.rng` only (no `Math.random`), and is `dt`-driven
  → ADR-0013 determinism preserved.

## Merge / follow-ups

- Merge **#84 → #85 → #86 → #87** in order (git stack; retarget each base to `main` after the
  prior merges). See the merge-gate flow (squash + linear history + resolved threads).
- Phase 6b (task #23): feed a real `curse` number into `player.offerContext` from ambush/elite
  spawns — the math already handles it.
- Dad/Son trait numbers are first-pass — a playtest-tune item.
