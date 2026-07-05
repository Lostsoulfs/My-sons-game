# ADR-0013: Seeded runs + cross-system determinism test

- **Status:** Accepted
- **Date:** 2026-06-10

## Context

The game's randomness already runs through a seeded `mulberry32`
(`core/rng.js`), and the loop is a fixed-timestep, decoupled update/render
(`core/loop.js`) — so the logic is deterministic in principle. But `startRun`
seeded the run from `Math.random()` with no way to pin it, and while drops and
survivor outcomes each have their own tests, nothing checked that the _whole
run's_ random logic is reproducible end-to-end. A research pass on testing
strategy (`docs/LEARNINGS.md`, 2026-06-10) called deterministic, seedable
randomness the foundation for replay and non-flaky tests.

`populateRoom` is render-coupled (it constructs `Enemy`/`Boss`/`Npc` with the
scene), so a full headless `Game` step isn't practical; the pure, rng-consuming
production seams (`dropRandomPickup`, `resolveDecision`, the spawn-type roll)
are.

## Decision

1. Give `startRun(coop = false, seed = (Math.random() * 1e9) | 0)` an optional
   `seed`. Default behavior is unchanged (random per run); passing a seed makes
   the run reproducible, including from the console via `window.__game`.
2. Add `tests/determinism.test.js`: drive the real pure rng seams through one
   shared seeded rng in game order and assert the run transcript is identical
   for the same seed and diverges for different seeds.

## Consequences

- Bugs can be reproduced by pinning a seed (`window.__game.startRun(false, 'dad', N)`; a numeric 2nd
  arg is also accepted as the seed for back-compat — CP5/ADR-0038 inserted `character` before `seed`).
- A regression that makes the run order- or state-dependent on something other
  than the seed fails the determinism test — deterministically, no flake.
- The full `Game.update` path stays render-coupled and is not headless-tested;
  the determinism guarantee covers the random _logic_, which is the part that
  matters for reproducibility.

## Alternatives considered

- **Seed the cosmetic `Math.random()` calls (particles/sfx/boss) + a Playwright
  visual-regression smoke** — deferred (the "fuller" option). Higher effort and
  ongoing VRT maintenance for a hobby repo; the cosmetic randomness doesn't
  affect game state, so it isn't needed for logic reproducibility.
- **Mock the scene to step a full `Game` headless** — rejected: large mock
  surface for little extra coverage over the pure-seam transcript.
