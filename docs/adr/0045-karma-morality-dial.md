# ADR-0045: Karma — a signed morality dial feeding the drop curve

- **Status:** Proposed
- **Date:** 2026-07-06

## Context

CP4 (ADR-0037) shipped the luck **and curse** math — a D2 magic-find curve where luck biases
rare+ drops up and curse biases them down — but `curse` was hardcoded to `0`: the SOURCE was
deferred to "Phase 6b" (originally imagined as ambush/elite spawns keyed to the connected map,
backlog task #23). Scoping 6b, the project owner reframed it into something better: a **Karma
system**. Instead of curse being a spawn side-effect, it becomes the negative half of a _signed
morality dial_ the player moves through **choices** — and it ties straight into the story canon
(Echo corrupts everyone it touches; helping others in a paranoid, torn world is costly).

Owner's framing (verbatim intent): karma starts at 0; **helping people** gives a small boost
that "calcs into luck/curse"; **helping is hard because there's more chance they hurt you**;
and (future) **dosing Echo on yourself** for power "grows your connection" — i.e. costs karma.
"Luck can stay just luck; it's easy." So: rename the negative dial, keep luck, make the moral
choices matter.

## Decision

- **Karma is a signed, per-run, game-level dial** (`game.karma`, starts 0, resets each run,
  clamps to `±KARMA.max`). It is **not** a per-player field — it's the run's moral weight.
- **It feeds the SAME tested curve** (core/luck.js `goodDropMultiplier`), split by a tiny pure
  module `core/karma.js`:
  - positive karma → **`bonusLuck`** (summed into the permanent-luck side, so it rides the same
    asymptote as Fortune — helps, never guarantees),
  - negative karma → **`curse`** (the existing tested downward pressure, floored at `goodMulMin`).
  - `goodDropMultiplier` gains a `bonusLuck` param **defaulting to 0**, so every existing caller
    and `tests/luck.test.js` are bit-identical — the curve itself is untouched.
- **The source (this CP): the survivor Help/Leave choice, made asymmetric** (`systems/npcDecision.js`):
  - **Help** = the risky good deed. Its outcome now leans **bad** (`KARMA.helpGoodChance` 0.4,
    down from a 0.5 coin flip — "more chance they hurt you"), but the deed earns **+`helpGain`
    regardless of how it turns out**.
  - **Leave** = safe but corrosive. No combat roll at all (`effect: 'NONE'`), but it costs
    **−`leaveLoss`**. The safe path slowly darkens your luck.
  - The choice-room **Stranger** (ADR-0044) is a Help gamble, so it earns Help's karma too.
- **Karma is injected at the game level** where offers/gunsmith rolls happen (not inside
  `Player.offerContext`, which is per-player) — `generateOffer` and `rollGunsmithWeapon` receive
  `{ bonusLuck, curse }` from `karmaDropInputs(game.karma)`.
- **Pause-menu readout:** a raw signed **Karma** row (`core/statsPanel.js karmaRows`, a separate
  export like `demonRows`), shown once per run. No blurb — the no-hand-holding rule holds; what
  karma does to your luck is for the player to notice.

## Consequences

- The luck/curse economy is finally **two-sided from real play**: before, curse was inert;
  now every survivor is a standing decision that bends your drops for the rest of the run.
- **Helping is a genuine risk/reward**: brave the higher trap odds to build standing (better
  luck later), or play it safe and slowly sink. There is no free-lunch neutral choice.
- **Determinism holds (ADR-0013):** karma moves only on explicit player choices resolved through
  the seeded run rng; the drop split is pure. No new rng consumption in spawn paths.
- **Co-op:** karma is shared (one run, one standing) — both players' choices move the same dial,
  and it lands on whoever committed (per-device, inherited from ADR-0044). No per-player split.
- **Tuning is a playtest knob, flagged:** with the defaults, the _negative_ side saturates around
  −6 karma (curse ≈ 2 floors the multiplier at zero luck) while the range runs to −12. That's
  deliberate headroom for a future second negative source, but `KARMA.cursePerPoint` /
  `LUCK.curseWeight` are the dials if the low end should spread more gently. Owner tunes by feel.

## Alternatives / deferred

- **The Echo-boost vendor (the owner's other idea): DEFERRED to its own CP.** "Trade Echoes for
  a temp power spike; your connection to the Echo grows (−karma)." It's a whole shop system;
  this CP ships the dial + the _helping_ source (already two-sided via Help/Leave). `game.addKarma`
  is the ready hook the vendor will call.
- **Karma → danger (the original 'curse elites' idea):** low karma spawning elites/ambushes is a
  natural future manifestation — noted, not built. Karma's only downstream effect this CP is drops.
- **Karma → survivor trust feedback** (low karma = survivors distrust/attack you more): a strong
  future loop, deferred.
- **Per-player karma:** rejected — a shared run "standing" is simpler and matches the fiction
  (the run got darker), and avoids co-op divergence in the single offer curve.
- **Renaming "curse" everywhere:** the _player-facing_ concept is now Karma; `core/luck.js` keeps
  `curse` as its internal name for the low-level downward input (karma produces it). Keeping that
  term stable is what let the tested curve stay untouched.
