# ADR-0044: Choice rooms — the breather dead-end becomes a survivor pick

- **Status:** Proposed
- **Date:** 2026-07-06

## Context

The project owner's standing direction (2026-07-05): **replace the empty heal/breather
room with probabilistic "choice rooms" — random survivors + a pick** (shop seam later).
The interim step was a heal room granting one +1 HEART at (0,0); its own code comment
marked this exact replacement as NEXT. Everything the feature needs already existed:
the special dead-end slot (`floorplan.js assignSpecials`, ADR-0032), the survivor NPC +
proximity-prompt economy (`Npc`, `_handleSurvivors`, `resolveDecision`), per-node layout
seeds for path-independent determinism, and the offer economy's tier weights + luck
curve (ADR-0030/0036/0037).

## Decision

- **Room type:** the next-farthest spare dead end tags `'choice'` (was `'heal'`). Same
  slot logic; Phase 6b still hangs shop/mini-boss/curse types here. The minimap keeps
  special-room identity hidden (the fog is the exploration hook — unchanged).
- **Pure core** (`core/choiceRoom.js`):
  - `rollChoiceSurvivors(rng, {gameBeaten})` — a weighted, **no-repeat** draw of
    `CHOICE_ROOM.count` (3) roles from `CHOICE_ROOM.pool`, placed on a seeded ring
    (one base angle + even spacing — never stacked). The **scavenger (Echoes) only
    enters the pool post-win**: `saves.addEchoes` no-ops pre-beat, and a reward that
    silently does nothing is worse than no reward.
  - `rollGunsmithWeapon(rng, {owned, luck, permLuck, curse})` — tier via the **same
    `OFFERS.tierWeights` × luck⊖curse `goodMul`** as offers (bias, never a guarantee;
    ultras stay in at their sliver), then a gun within the tier with owned-weapon decay.
- **Roles** (all knobs in `config.CHOICE_ROOM`): Medic (+1 heart — the +1-everywhere
  rule holds), Gunsmith (a gun), Tinkerer (+1 random stat stack — the ADR-0022 curve
  sets strength), Scavenger (+20 Echoes, post-win only; less than a boss's 30),
  Stranger (**the classic help-gamble**, same `resolveDecision` outcome table — the
  risk pick, wearing a coat).
- **The pick is in-world, one verb:** walk up, `[E] Choose` (reuses the survivor prompt
  loop; Q is dropped — walking away is the "no"). On commit: the reward lands on the
  choosing player, the unpicked survivors **slip away** (a puff each), the node is
  spent. One pick per room, no take-backs.
- **Cleared semantics:** the node is **NOT marked cleared until the pick** — leaving
  early and returning re-offers the _same trio_ (rolled from `node.layoutSeed`,
  path-independent per ADR-0032). After the pick, the standard cleared-re-entry path
  serves an empty breather. No new game state; the room lives in `ROOM_CLEAR` (doors
  open, no combat, stranger-spawned chasers use the existing post-clear hostile path).
- **No hand-holding:** the role name + a tinted "!" marker are the only tells. What a
  "Tinkerer" does, you learn by picking one once.

## Consequences

- The guaranteed heal-room heart is gone; healing is now **a choice against greed** —
  the room's whole point. Medic still appears at the highest weight band.
- Determinism split (documented seam): the survivor **set** is layout-seeded; the
  **pick-time rolls** (gunsmith tier, tinkerer stat, stranger outcome) ride the run
  rng in event order — exactly the seam offers already use (ADR-0013 holds).
- Pre-win vs post-win pools differ (scavenger) — same seed can differ across save
  states. Inherent and intended: the save is an input, not a leak.
- In 2P the reward goes to the **choosing** (nearest) player — one pick per room total,
  so co-op splits the value socially, not mechanically. No anti-farm rule needed (the
  room grants once, ever).

## Alternatives considered

- **Offer-overlay pick (reuse `showOffer` cards):** rejected — the room's fantasy is
  walking up to a _person_, and the in-world survivor loop already existed; a modal
  would flatten it into "another card screen."
- **Unknown rewards (pick blind):** rejected — a choice between unknowns is a gamble,
  and the help/leave survivor gamble already owns that verb. The Stranger carries the
  gamble INTO the pool as one legible option instead.
- **Keeping a guaranteed heal room alongside:** rejected — two special dead-ends per
  floor dilutes both; the Medic keeps healing available at a cost (the other picks).
