# ADR-0032: Connected floor map — Isaac-grid rooms, backtracking, minimap

- **Status:** Proposed
- **Date:** 2026-07-04

## Context

The run has always been a straight line: `roomIndex` 0..59, ten rooms per floor,
one door at the top of each arena, `roomIndex + 1` on walk-through
(`core/progression.js floorInfo`, `game.js _checkDoor`). Scott's long-standing
vision (backlog "Full floor layout"): _one whole interconnected floor you can
move between, with secrets, hidden areas, and shortcuts_. The roguelite research
(`docs/research/2026-07-03-roguelite-economy.md` §2) picked the generator: the
Binding-of-Isaac recipe — BFS + ~50% reject on a sparse grid (reject any cell
with 2+ filled neighbours → a tree), boss at the farthest dead end, floorplan
generated separately from room contents, full backtracking, a minimap that hides
special-room identity. Explicitly rejected there: fancier graph generators and
Dead-Cells-style authored branching (over-engineering for v1).

A 5-reader understand-pass mapped the integration surface and found three traps
that drive the design:

1. **rng-order coupling.** `buildRoom` + `populateRoom` consume the shared run
   rng in _visit order_. With backtracking, visit order is player-controlled —
   layouts would reshuffle on re-entry and the seeded run (ADR-0013) would stop
   reproducing.
2. **The clear path is inferred, not evented.** In `State.PLAYING`,
   `enemies.length === 0` fires `_onRoomClear` every tick — a cleared room
   re-entered in PLAYING would re-run offers, `_countBossBeaten` (weapon slots +
   Echoes!), and the human-boss overlay.
3. **Boss-at-dead-end conflicts with walk-to-next-floor.** The boss room's only
   neighbour link points _back into_ the floor.

## Decision

**One connected floor per boss region, replacing the linear sequence entirely.**

1. **Pure generator** (`core/floorplan.js`, already landed with 15 proof tests):
   `generateFloorplan(rng, opts)` → a sparse **tree** of rooms `{id, x, y, type,
neighbours{N/S/E/W}, dist}` — boss at the farthest dead end, one `heal` room
   on a spare dead end, `roomCountForFloor` ramps 7 → 16 rooms across the six
   floors. `type` ('start'|'normal'|'heal'|'boss') is the seam Phase 6b extends
   (curse/mini-boss/shop rooms) without touching the generator. Additionally the
   generator tags a seeded **survivor quota** (replaces `ROOMS.survivorRoomsInFloor`
   — index-based whitelists don't survive variable room counts) and assigns every
   node a **`layoutSeed`** (drawn from the run rng once, in node order).
2. **Per-node sub-rngs kill the rng-order trap.** `buildRoom`/`populateRoom`
   draw from `makeRng(node.layoutSeed)`, never the shared run rng — a room's
   layout/spawns are identical on every entry, and run reproducibility is
   independent of the path the player walks.
3. **Cleared-state protocol.** `node.cleared` is set in `_onRoomClear`.
   Re-entering a cleared node skips `populateRoom`, skips banners/HUMAN_CHOICE/
   duo setup, opens every door, and enters `State.ROOM_CLEAR` directly — it can
   never reach PLAYING, which structurally kills the double-offer/double-slot
   landmine. Offers/pity remain first-clear-only for free.
4. **Doors.** `buildRoom(scene, rng, sides)` cuts a gap per neighboured side
   (N/S/E/W), each with its own trigger box + glow; `door.active` stays the lock
   (triggers only run in ROOM_CLEAR — the state machine remains the fence).
   Rubble keeps clear of every doorway. Entry placement is side-aware: crossing
   A's north door drops you at B's south edge.
5. **Floor exit = the post-boss door** (Isaac's trapdoor). Clearing the boss
   opens a dedicated EXIT gap on a wall with no neighbour: non-final floors
   descend (`checkpointFloor = floorIndex + 1`, next floor generated fresh from
   the run rng), the final floor's exit is the WIN walk-through — preserving
   today's grab-your-rewards-then-leave feel.
6. **Checkpoints become floors.** `checkpointRoom` (a linear index) →
   `checkpointFloor`; death respawns at that floor's start node with a freshly
   generated floor (today's behaviour — respawn already regenerates — kept
   deliberately: a death costs you the explored map, the floor is new).
   `resolveDeath` keeps its pure shape; its `room` field now carries a floor.
7. **Minimap**: a DOM widget in the HUD (`#minimap`, pooled cell divs), fed by a
   pure `minimapView(plan, currentId, options)` (unit-tested) on the existing
   event-driven `refreshHud` cadence — never per-tick. Shows current / explored /
   cleared / adjacent-unexplored; **special-room identity hidden** (research:
   the fog is the exploration hook). Always-on v1; a toggle key can come later
   (M and Select are already taken).
8. **`floorInfo` retires.** Floor identity (`def`, `diff`, `floorCount`) stays in
   pure progression helpers; room-level facts (`isBossRoom`, depth) now come from
   the node. `nextIsBoss` (a `+1` question) dies; the BOSS-AHEAD hint moves to
   the minimap's boss-adjacency later.

## Consequences

**Easier:** exploration + backtracking (the design goal); Phase 6b lands as
content types on existing dead-end slots; depth (`node.dist`) is a better
difficulty/rarity key than `roomInFloor`; per-node seeds make room layout
testable in isolation.

**Harder / accepted:**

- **game.js surgery.** `loadRoom(index)` → `loadNode(node, entrySide)`,
  `_checkDoor` becomes a door loop, win/floor-exit re-route. The biggest single
  rewiring since B9b; mitigated by the state machine staying untouched.
- **Test rewrites.** `progression(.proof).test.js` lock the linear math and are
  rewritten against floor-level helpers; `determinism.test.js` must be extended
  deliberately (it would stay green while modelling the dead linear cadence —
  flagged by the understand-pass as a false-green trap).
- **Unclaimed pickups still vanish on room exit** (today's teardown, kept for
  v1) — an uncollected boss HEAL doesn't survive backtracking. Noted for a
  per-node pickup store later.
- **Debug menu room-jump** re-keys from index to node.
- Deferred (backlogged, per research): secret rooms, one-way loops, shop rooms,
  minimap toggle key, in-arena door indicators, gentle linger-threat.

## Alternatives considered

- **Keep linear, add optional side rooms** — rejected: doesn't deliver the
  exploration vision; nearly the same door/cleared-state work for a fraction of
  the payoff.
- **Loops/braids in the graph (Gungeon flows)** — rejected for v1: the tree is
  what makes backtracking trivially safe (one path home) and it's the
  battle-tested minimum; one-way premium loops are a designed Phase 6b+ feature.
- **Persist live room state (enemies mid-fight, pickups) across exits** —
  rejected: today's teardown semantics are simpler and match player expectations
  (you clear a room, it stays cleared; you leave a fight, it resets), and the
  cleared-flag protocol needs no entity serialization.
- **THREE-overlay minimap** — rejected: the HUD is DOM-over-canvas by
  convention; a DOM grid is cheaper, crisper, and testable via the pure view fn.
