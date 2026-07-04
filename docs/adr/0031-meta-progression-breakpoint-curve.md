# ADR-0031: Resonance permanent-upgrade curve — breakpoints, not stacks

- **Status:** Proposed
- **Date:** 2026-07-03

## Context

ADR-0029 shipped four percent-based Resonance nodes (Sharpness/Swiftness/Rapid/Tough
Hide) that fed the permanent baseline in as extra STACKS: `player._up[stat] = bl[stat]`,
then in-run offer picks added more stacks to the same pool, all run through the same
diminishing-returns curve (`config.UPGRADES`, `core/scaling.js statBonus`). `maxLevel`
was small (2-3) and `cost` a short flat array.

Two things broke this model:

1. **Scott's spec for how permanent upgrades should feel** (2026-07-03): "permanent
   upgrades to damage, fire rate, luck etc. should be diminishing returns until certain
   break points. So something like first point in damage is a .5% increase, then the
   next until 10 are .1%. 10 becomes a 1% perm upgrade with twice the cost. I don't want
   perm upgrades to be able to be stacked on in a matter of a few playthroughs." This is
   a distinct SHAPE (big first pick → small flat fillers → periodic breakpoint spike)
   that the shared asymptotic `statBonus` curve cannot produce — its curve is smooth and
   saturating, not stepped.
2. **ADR-0030 made damage/fireRate PER-WEAPON.** A global permanent baseline can no
   longer be "extra stacks" fed into ONE weapon's stack count — the same Resonance level
   has to apply no matter which gun is in hand. The old seed-as-stacks model doesn't even
   make sense against a per-weapon store.

## Decision

Give permanent (Resonance) percent-nodes their **own standalone curve**, decoupled from
the in-run stat curve entirely — applied as an ADDITIVE top-up on the final derived stat,
not mixed into any stack count:

1. **`core/scaling.js`** — three new pure functions:
   - `metaLevelBonus(n, cfg)` — one level's own contribution: level 1 = `cfg.first`
     (+0.5%), levels not a multiple of `every` = `cfg.small` (+0.1%), levels that ARE a
     multiple of `every` = `cfg.breakpoint` (+1%). Repeats every `every` levels forever
     (20, 30… all breakpoints) — never caps.
   - `metaBreakpointBonus(level, cfg)` — Σ `metaLevelBonus(1..level)`, the cumulative %
     stored in the save and applied to the derived stat.
   - `metaLevelCost(n, cfg)` — geometric growth per level (steep by design), with the
     breakpoint's `breakpointMul` (2x) **compounding forward** (level 11+ stays 2x, level
     20+ becomes 4x, …). A one-time (non-compounding) toll would let the level right
     after a breakpoint cost LESS than the breakpoint itself — a discount where Scott
     wants a wall. Caught by a "strictly increasing" test before it shipped.
2. **`config.js`** — `META_CURVE = { first: 0.005, small: 0.001, breakpoint: 0.01, every:
10, breakpointCostMul: 2 }`, shared by all percent nodes. Sharpness / Swiftness /
   Rapid / Tough Hide switch from `{maxLevel: 2-3, cost: [...], effect:{perLevel}}` to
   `{maxLevel: 10, costBase, costGrowth, effect:{curve:'percent'}}`. Vitality and Aegis
   (flat +1 heart / +1 guard per level) are **unchanged** — this ADR only touches the
   four stats Scott named ("damage fire rate ... etc").
3. **`core/saves.js`** — `costOf`/`baselineStacks` branch on `node.effect.curve ===
'percent'`: percent nodes compute `metaLevelCost`/`metaBreakpointBonus`; flat nodes
   keep the original array/`perLevel` math untouched.
4. **`entities/player.js`** — `_recomputeUpgrades()` adds the permanent % directly:
   `damageMul = 1 + statBonus(weaponStack) + bl.damage` (and symmetrically for
   fireRate/speed/damageReduction), instead of folding `bl.stat` into the stack count
   that feeds `statBonus`. `_up.speed`/`_up.damageReduction` no longer seed from baseline
   in `reset()` — the baseline is applied once, live, in `_recomputeUpgrades`.

At level 10 the total permanent bonus is a deliberately small **+2.3%** total (0.5 +
8×0.1 + 1, all percent) — this is flavor and a long-haul reward, not a power fantasy;
the in-run per-weapon curve (up to +100% damage) is where a single run's power comes
from. Maxing ONE node to level 10 costs ~3.6-4k Echoes against a ~330-Echo/run post-beat
income — roughly a dozen runs, matching "not stackable in a matter of a few playthroughs."
Live-verified at exactly these numbers (see PR).

## Consequences

**Easier:** the permanent curve now has the exact shape Scott specified and is
independently tunable from the in-run curve; a Resonance level means the same thing
no matter which gun is equipped (fixes the ADR-0030 conflict); the UI (`ui/metaProgress.js`)
needed zero changes — it already reads through `costOf`/`node.maxLevel`.

**Harder / trade-offs accepted:**

- **Two node "kinds" in one array** (`curve:'percent'` vs `perLevel`) — `saves.js` now
  branches on `node.effect.curve`. Kept to two kinds (not a bigger taxonomy) since only
  two shapes exist today.
- **Save compatibility:** old saves with `sharpness`/`swiftness`/`rapid`/`toughHide` at
  level 2-3 stay valid (levels 1-3 are a strict prefix of the new 1-10 curve); their
  Echoes are unaffected. No version bump needed — the save schema itself didn't change,
  only how `META_UPGRADES` interprets a level.
- **Luck is out of scope here.** Scott's example list included "luck," but the existing
  in-run Luck dial (ADR-0030 B1b) is a small integer stack count with no natural "%"
  meaning, and no permanent Luck node exists yet — adding one is a real new feature
  (new node, new baseline field), not a curve fix. Deferred as a fast-follow.

## Alternatives considered

- **Keep feeding baseline into the shared per-weapon/global stack count** — rejected:
  can't produce Scott's stepped shape, and conflicts architecturally with ADR-0030's
  per-weapon binding (a global baseline can't be "stacks in one gun's counter").
- **One-time (non-compounding) breakpoint cost toll** — rejected: produces a cost DIP at
  the level right after a breakpoint (caught by a test), reading as a discount instead
  of the intended wall.
- **Extend `statBonus`'s asymptotic curve with a bigger `half`** — rejected: still smooth
  and saturating, can't produce a first-pick spike + flat fillers + periodic breakpoint;
  the mechanic Scott described is a stepped curve, not a slower asymptote.
