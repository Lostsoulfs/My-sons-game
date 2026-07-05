# ADR-0040: Boss HP-gated phase flips (wire the shelved emitters)

- **Status:** Proposed
- **Date:** 2026-07-05

## Context

A 6-persona design review ("6-MoE" brainstorm, captured in
`docs/design/2026-07-05-six-moe-panel.md`) surfaced one finding almost every expert
reached independently, and it checked out in the code: three fully-written,
unit-tested bullet-pattern generators — `multiArmSpiral`, `layeredFlower`, and `arc`
in `src/entities/bosses/emitters.js` — are fired by **no boss**. Only `gapRing`,
`jitterRing`, and `nWay` are wired. The panel's #1 gap for the game was also the
genre's most-clipped beat: **boss multi-phase transitions** ("wait, it has a phase 2?!").
Today bosses only speed up (the `rage` getter ramps timers at 50%/25% HP) — there is
no visible gear-shift, no pattern change.

The two are the same fix: an HP-gated **phase flip** that, on crossing a breakpoint,
plays a one-time cinematic beat and swaps the boss's telegraphed barrage to a denser,
authored shape drawn from the shelved emitters.

Constraints: keep it **kid-fair** (the `fairness.test.js` dodgeability bar), keep it
**config-first** and **seed-deterministic** (ADR-0013), and don't rip out the existing
tested patterns.

## Decision

Add an **opt-in phase-flip system to the generic `Boss` shell**, driven by config.

- **Pure core:** `src/core/phaseFlip.js` `pendingFlips(frac, breakpoints, passed)` —
  THREE-free crossing detection over a DESCENDING breakpoint list (e.g. `[0.5, 0.25]`),
  returning the indices newly crossed this tick (catches both if one big hit skips a
  band). Unit-tested.
- **Shell:** `Boss` tracks `ragePhase` + `_flipsPassed` (monotonic — a heal can't
  un-flip). Each tick `_checkPhaseFlips` consults `cfg.phaseFlips`; on a crossing it runs
  `_onPhaseFlip`: cancel any mid-telegraph, **`clearEnemyBullets()`** (a fair screen-wipe
  breather, not a free hit), trauma + hit-stop + an atomic-orange screen flash + roar, a
  scale pop, then a per-boss `behavior.onPhaseFlip(boss, game, idx)` hook.
- **Behaviors read `boss.ragePhase`** inside their existing _telegraphed_ fire function
  and pick the shape — so every flipped volley still gets its full wind-up (fairness is
  automatic; no new fairness surface):
  - **The Enforcer "overheats":** gap-ring → rotating `multiArmSpiral` at 50%; at 25% it
    "comes apart" (spiral gains an arm + a counter-rotating `arc` layered under it). Eye
    recolors orange→red.
  - **The Mushroom King "blooms":** gapped spore ring → rotating `layeredFlower` at 50%.
    Cap flushes red (procedural mesh).
- **Floor-1 Spider stays gentle** (no `phaseFlips`) — the intro fight is unchanged for
  new/young players. Other bosses can opt in later by adding a `phaseFlips` block.

All tunables (`phaseFlips`, spiral/arc/flower params, flip juice + flash) live in
`config.js`. Densities stay modest and speeds slow (`spiralBulletSpeed <= ringBulletSpeed`);
a config test guards bounds + descending order, and `fairness.test.js` stays green (no new
`BOSS` entry, every boss keeps its telegraph).

## Consequences

- **Easier:** any boss gets a real "phase 2" with one config block + a `ragePhase` branch
  in its fire function; the three shelved emitters are now live and reusable; the flip beat
  (wipe + flash + roar) is centralized and consistent.
- **Payoff:** the single highest-agreement, lowest-cost item from the panel — a clippable,
  genre-standard escalation — using code we'd already written and tested.
- **Harder / watch:** authored shapes (spiral/flower) have no _guaranteed_ gap like
  `gapRing`, so fairness rests on modest counts + slow speeds + the telegraph; tuned by
  feel and bounded by the config test. New bosses opting in must keep speeds slow.
- Real dodge feel is verified live (`window.__game`), not by the fairness helper — the
  helper proves gap width for _gapped rings_, not blooms.

## Alternatives considered

- **A continuous, un-telegraphed danmaku stream** (classic spiral): more authentic, but
  each volley loses the per-volley wind-up the fairness bar wants. Rejected — reusing the
  telegraphed-ring plumbing keeps every shot fair for free.
- **Replace the P-patterns wholesale at the flip:** more work, throws away tested shapes,
  and risks fairness regressions. The `ragePhase` branch inside the existing fire function
  is smaller and safer.
- **A brand-new `State.BOSS_PHASE` with a scripted invulnerable transition:** heavier, and
  an i-frame pause changes fight pacing. A same-frame beat + bullet-wipe reads as "phase 2"
  without stopping the fight.
- **Flip every boss now:** deferred — floor-1 must stay gentle, and each boss wants its own
  feel pass. Opt-in `phaseFlips` lets them land incrementally.
