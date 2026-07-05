# ADR-0037: Luck/curse magic-find curve + survival-upgrade rework

- **Status:** Proposed
- **Date:** 2026-07-05

## Context

CP4 of the weapon/economy redesign. Playtest direction from the owner: **Luck must matter** (and
tie to a **Curse** dial), and the **survival upgrades are wrong** — incremental HP growth
(`MAX_HP_UP` + the permanent **Vitality** node) and a percentage **damage-reduction soak**
(`DMG_REDUCT` "Tough Hide" + the permanent **Tough Hide** node + `core/defense.js` carry) both
_flatten the danger_: a bullet-hell wants legible, all-or-nothing defense, not a slowly-rising damage
sponge. Global damage was also a runaway **×1.3 multiplier** (1.3 → 1.69 → 2.2 …). Luck was a flat
`1 + stacks·0.12` with a hard cap — linear, no diminishing feel, and no curse.

## Decision

**Luck/curse = a D2 "magic find" curve** (`core/luck.js`, PURE, over `core/scaling.js statBonus`):

- `luckBonus(inRunLuck, permLuck)` sums the two dials and runs them through the diminishing curve
  (`config.LUCK.max = 0.9`, `half = 6`): strong early value that asymptotes below the ceiling, so
  luck **always helps but never guarantees** a rare+.
- `goodDropMultiplier({inRunLuck, permLuck, curse})` → the multiplier on the **rare+** offer-tier
  weights (commons ×1). **Curse is negative luck, only PARTIALLY offset by luck** on a curve:
  `offset = curse · curseWeight · (1 − curseLuckDamp · luckBonus/max)`. So more luck softens each
  curse point but never cancels it — at the luck ceiling a point of curse still costs **≈0.25** of
  the good-drop bonus (the design target). Floored at `goodMulMin` (heavy curse thins drops, never
  zeroes them). Wired into `core/offers.js rollTier` (replaces the flat `1 + luck·0.12`).
- **Fortune** — a new premium `META_UPGRADES` node: permanent `+0.5` luck "stacks" per level (a
  `LUCK_UP` pick = 1), expensive (≈1.5× ramp), capped at level 10 → +5, which stays below the curve's
  shoulder so it enriches offers without ever dominating the roll. Feeds `luckBonus` as `permLuck`
  via `saves.baselineStacks` → `player._baseline.luck` → `offerContext`.
- **Curse SOURCE** (ambush/elite spawns) is Phase 6b; CP4 ships the MATH + the dial with `curse`
  defaulting to 0, so 6b just feeds it a number.

**Survival-upgrade rework:**

- **Cut HP growth:** delete `MAX_HP_UP` + the **Vitality** node + `CAPS.maxHearts`. Hearts are a
  fixed pool (`PLAYER.maxHearts`).
- **Cut the % soak:** delete `DMG_REDUCT` + the **Tough Hide** node + `config.DAMAGE_REDUCTION` +
  the `core/defense.js` reduction/carry path. `resolveIncoming` is now **guard-only** (a charge
  blocks a WHOLE hit; otherwise the hit lands in full). **Guard / Greater Guard / Aegis stay** —
  block-charge defense is the skill-legible survivability that remains.
- **Global damage → bounded flat:** `GLOBAL_DAMAGE` becomes `{kind:'globalDamageFlat', add:1,
maxStacks:3}`, applied `(base + flat)·damageMul` at every fire site, gated out of the offer pool
  once maxed. A rare, bounded spike instead of an exponential snowball.

## Consequences

- **Easier:** danger stays sharp (no HP sponge, no creeping soak); Luck is a real, tunable dial with
  a curse counter-dial, all in one pure curve with golden tests (`tests/luck.test.js`). Removing two
  meta nodes + one CAPS field is safe — `saves.js` iterates `META_UPGRADES`, so old saves' dropped
  keys normalize away without corrupting.
- **Harder / accepted:** old saves that spent Echoes on Vitality/Tough Hide lose that value silently
  (the nodes are gone) — acceptable for a pre-release father-son build. Curse has no in-game source
  yet (Phase 6b) — the math ships dormant behind a `curse: 0` default.
- **Determinism (ADR-0013) preserved:** all new logic is pure and seeded; no `Math.random`, no
  wall-clock. Defense stayed integer-hearts (the epsilon-floor is retained for the guard-less path).

## Alternatives considered

- **Keep a small HP/soak trickle "for kids."** Rejected by the owner — it's exactly what flattened
  the danger; Guard (earned, legible) is the survivability that stays.
- **Luck as a linear `1 + k·stacks` (the old model).** Rejected — no diminishing feel, and it made
  Fortune either trivial or a guaranteed-rare button. The magic-find curve gives strong early value
  that tapers, so both dials matter without ever guaranteeing.
- **One combined luck⊖curse stat (a single ± axis).** Rejected — the design wants curse to be its
  own dial (a danger source in 6b) that luck can only _partially_ offset, not a symmetric slider.
- **Fortune as a percent-breakpoint node (like Sharpness).** Rejected — luck wants a small linear
  per-level accrual capped below the asymptote, not the steep breakpoint curve tuned for combat stats.
