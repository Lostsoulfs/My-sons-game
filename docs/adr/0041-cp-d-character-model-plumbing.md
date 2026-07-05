# ADR-0041: CP-D character-model plumbing — GLB-ready + a code-only silhouette fix

- **Status:** Proposed
- **Date:** 2026-07-05

## Context

Plan [0003](../plans/0003-ui-first-legibility-arc.md)'s CP-D is "real GLB models (Dad, Son,
Demon)." The mesh factory already supports GLB-with-procedural-fallback
(`entities/characterMesh.js` → `getModel`), and five bosses already use the richer
_animated_ version of that pattern (`core/animModel.js loadAnimated`). Picking the actual
CC0 asset pack is explicitly **owner-gated** (the plan says so) — that's a real decision
only Scott can make (which pack, what it looks like, whether to recolor the established
Dad=blue/Son=green identity).

A 6-persona design-panel pass (round 2, focused on CP-D) reviewed the current state — Dad
and Son are both a plain capsule + cone, differing ONLY by tint — and converged on: _"two
capsules with a paint swatch is a co-op skin slot, not a family."_ Its concrete, buildable
recommendation: diverge silhouette **proportion** (not just hue) and add one procedural
prop per character, using the same GLB+fallback plumbing already proven on bosses.

While reading the code to act on this, a real (if latent) bug surfaced: `CHARACTERS.son
.modelKey` was `'ally'` — the SAME key the dormant `Ally` class uses. CP-C's plan is to
revive `Ally` as the demon companion. The moment anyone pointed `MODELS.ally` at a real GLB
to give Son a face, the future demon would have silently loaded Son's model too — a shared
asset slot with no warning.

Also surfaced: `radius` is dual-purpose in this codebase (mesh visual size AND the actual
collision hit-circle — true for bosses too). The panel's silhouette idea, if applied
naively, would have made Dad's and Son's hitboxes different sizes: a real 2P **balance**
change (easier/harder to hit each character), not a cosmetic one — not something to
decide solo.

## Decision

Ship the parts that are safe, buildable now, and don't require picking real art:

1. **Fix the modelKey collision.** `CHARACTERS.dad.modelKey`/`son.modelKey` are now `'dad'`/
   `'son'` — their OWN keys. `MODELS.dad`/`MODELS.son` (renamed/added, both still `null` =
   procedural) are their GLB slots. `MODELS.ally` stays reserved, untouched, for CP-C's
   future demon.
2. **Animation-ready plumbing in `player.js`**, mirroring every boss: try
   `loadAnimated(modelKey, meshHeight)` FIRST; fall back to the existing procedural
   `makeCharacter` path if no GLB is loaded (which is always, today — `MODELS.dad/son` are
   null, so this is a **no-op**, zero visual change). `this.anim` drives Walk/Idle off
   actual movement each frame and is disposed on teardown (mirrors `AnimModel.dispose()`'s
   use across bosses — same orphaned-mixer leak class).
3. **A code-only silhouette fix, no balance risk.** `CHARACTERS.dad/son` gain
   `meshRadius`/`meshHeight` — **visual-only** knobs feeding the mesh's capsule size,
   deliberately decoupled from `PLAYER.radius` (`player.js` still sets
   `this.radius = PLAYER.radius` for both, unchanged — the real hit-circle stays IDENTICAL
   for fairness). Dad is broader/shorter (a "planted" read); Son is leaner/taller (a
   "quick" read). Each also gets one procedural prop (`characterMesh.js`
   `PROP_BUILDERS`): a brim disc for Dad, a goggle ring for Son — a top-down silhouette tell
   beyond color, attached ONLY on the procedural fallback (skipped once a real GLB loads —
   we can't predict how it'd sit on an unknown future rig).
4. **Left alone, pending Scott's call:** the panel also recommended recoloring Dad from
   blue to a warm brass/copper "ballistic-era" palette (Son stays cool/cyan for the energy
   era) and named specific CC0 packs (Kenney Mini/Blocky Characters for a same-day ship;
   Quaternius modular packs for a higher-fidelity, cosmetic-swap-ready path later). Both are
   real, visible identity/asset decisions — not made here. The full panel writeup +
   recommendation lives in `docs/design/2026-07-05-six-moe-panel-cp-d.md`.

## Consequences

- **Easier:** dropping a real animated GLB into `public/models/` + setting `MODELS.dad`/
  `son`/(later)`demon` now "just works" with a walk cycle, identical to how bosses already
  work — no further engineering needed to finish CP-D once art is picked.
- **Payoff now, before any art lands:** Dad and Son already read as more than a palette
  swap (distinct capsule proportions + a prop), and the modelKey collision that would have
  quietly broken CP-C is fixed before it could bite.
- **Fairness preserved:** the collision hit-circle (`PLAYER.radius`) is untouched and
  identical for both characters — verified live (`window.__game`, both solo and 2P).
- **Harder / watch:** the procedural prop is skipped on a real GLB by design; once art
  lands, decide per-pack whether a prop-equivalent should be re-added (may already be part
  of the chosen model).
- Real silhouette feel (does it actually read at bullet-hell zoom?) is a judgment call for
  Scott + Caden in play, not something a test can assert — verified via geometry/color
  inspection (`window.__game`), not a screenshot (this machine's headless preview hangs on
  screenshots — a known iGPU/hidden-tab throttle, not a rendering problem; see
  `docs/LEARNINGS.md`).

## Alternatives considered

- **Vary `PLAYER.radius` per character directly:** simplest code, but changes the actual
  hit-circle — a real 2P balance decision. Rejected for this pass; the visual-only
  `meshRadius` gets the same silhouette read with zero fairness risk.
- **Attach the prop unconditionally (even over a real GLB):** the panel's own pitch allowed
  this ("falls back gracefully... since it's a separate child object"), but an unknown
  future rig's scale/pose could make an unconditional prop clip or float oddly. Restricting
  it to the procedural fallback is the safer default; revisit once a pack is chosen.
- **Recolor Dad/Son now to the panel's suggested warm/cool palette:** deferred — this
  repaints an identity Scott and Caden already associate with actual play sessions
  (blue=Dad, green=Son); a visible brand change like that is exactly the kind of call this
  ADR flags for Scott rather than deciding unilaterally.
- **Build the Demon's procedural mesh now:** the panel suggested prototyping it so Scott
  has something to look at, but no `Demon` entity exists yet (CP-C, its own checkpoint) —
  building a mesh function with nothing to attach it to is dead code by this project's own
  no-premature-abstraction rule. `MODELS.ally` stays reserved for it.
