# Worklog — Lostsouls

A running, **reverse-chronological** log of _what was done_ each work session — the build diary.
It complements, and is distinct from, its neighbours:

- [`docs/LEARNINGS.md`](LEARNINGS.md) — _what we learned_ (gotchas, fixes, API surprises).
- [`STATUS.md`](../STATUS.md) — _where the project stands_ (current lifecycle snapshot).
- [`docs/BACKLOG.md`](BACKLOG.md) / [`docs/ROADMAP.md`](ROADMAP.md) — _what's next_ (parking lot /
  curated plan).
- [`docs/adr/`](adr/) — _why_ (the decisions behind the work).

Each entry is dated and records the work, its PR, and the version it shipped under. This is the
interim home for the dedicated org-wide logging repo noted in [`BACKLOG.md`](BACKLOG.md)
(Cross-repo) — when that exists, these entries can feed it.

---

## 2026-07-02 — Doc tidy-up: STATUS refreshed to v0.8.16, ADR index 0028/0029, PR #64 backlog items closed (no version change)

Scott's laptop was wiped and rebuilt (Node 24, gh CLI, git identity restored); this session
re-synced the local checkout, merged the three PRs waiting since the last session, and swept up
the doc staleness that had built up since STATUS.md was last touched (2026-06-22, at v0.8.3).

**What was merged:**

- **#66** — full backstory structured, narrative system designed, 1950s tech table (docs-only).
- **#67** — dependabot npm dev-deps: `globals` 17.6.0→17.7.0, `playwright` 1.61.0→1.61.1,
  `vite` 8.0.16→8.1.0.
- **#68** — dependabot GitHub Actions: `actions/checkout` v6.0.3→v7.0.0 (major; verified no
  breaking-change exposure — this repo has no `pull_request_target`/`workflow_run` triggers),
  `actions/setup-python` v6.2.0→v6.3.0.

**What was tidied:**

- `STATUS.md` — version bumped v0.8.3 → v0.8.16, ADR count 28 → 29, era references corrected
  from "1940s" to the locked "1950s" canon (PR #65/#66), and eight missing "most recent work"
  bullets added covering everything shipped between v0.8.4 and v0.8.16.
- `docs/adr/README.md` — added the missing index rows for ADR-0028 (drop-and-offer system) and
  ADR-0029 (meta-progression-and-save).
- `docs/BACKLOG.md` — checked off the two survivor-spawn bugs fixed by PR #64.
- `docs/ROADMAP.md` — the Graphics "Atmospheric overhaul" item was stale (shipped as ADR-0026);
  split into a DONE line + the genuinely remaining scope (depth-of-field, volumetric fog, PBR on
  more than just the floor).

**Verification:** `npm ci` + `npm test` re-run clean after the dependency bumps landed —
44 files, 303/303 tests passing, 0 vulnerabilities.

**Deviations:** None.

---

## 2026-06-24 — Story lore session 2: full backstory structured, narrative system planned, 1950s tech table (no version change)

Continuation of the lore session from PR #65. Era was already locked (1950s); this session went deeper
into the full in-world canon and designed the narrative delivery approach.

**What was locked this session:**

- **Nukes fell in 1940** in this alternate timeline — the 1950s is ~15 years post-nuke, not post-WW2
  in the usual sense.
- **The experiment was in this specific city.** Not a generic government site — the resonance array was
  built here downtown, which is why the rift is at this city's center and nowhere else.
- **Tech progression documented:** small resonance devices (late 1940s) → small rifts that closed on
  their own (seemed harmless) → larger arrays (early 1950s) → this city's array (~1957) pulled enough
  to hold a portal permanently open.
- **The other world:** geographically similar to ours but untouched — no people, only demons,
  humanoid creatures, and animal/demon hybrids. Not invading; the portal was opened from our side.
  **We caused this.** That's the narrative reveal.
- **Implicit/environmental storytelling approach:** backstory is never stated — it lives in
  environmental objects, survivor hints, room names, item descriptions, and graffiti. Codified in
  a new `docs/STORY.md` section.
- **Reveal structure (floor-by-floor narrative map):** floors 1–2 = survival only; 3–4 = environmental
  clues start; 5 = experiment site itself; crossing = the full reveal.
- **Multiple endings concept:** three endings (A: Close It, B: The Truth, C: What We Are) based on
  cumulative `trustScore + loreFragmentsFound`. Design spec in session plan.
- **Choice engine recommendation: inkjs** (`npm install inkjs`). JS port of Ink, zero extra deps,
  Vite/browser-native. Deferred to a future PR + ADR.
- **Horror design principle confirmed:** suspense from staying alive (bullet hell), not jump scares.
- **1950s classified programs research:** Project Pluto, Operation Argus, Operation Plumbbob, Project
  1794, MK-ULTRA, SAGE network — weapon/lore name table added to `docs/STORY.md`.
- **3D models deferred** to this weekend. Track C (spider-wolf boss, Stalker boss) stays parked.

**Files updated:** `docs/STORY.md` (expanded experiment section, new Other World + Reveal Structure +
Implicit Storytelling sections, updated Open Questions, 1950s tech table), `docs/BACKLOG.md` (updated
story open questions, new Narrative System section with 7 deferred items).

**Deviations:** None.

---

## 2026-06-24 — Story lore session: era locked at 1950s, world history settled, backlog expanded (no version change)

Canon decisions locked from a lore session with Scott:

- **Era shifted from 1940s to mid-to-late 1950s.** Caden originally picked the 1940s; after discussing the Echo/nuclear origin, Cold War paranoia is a better era anchor. Weapons, atmosphere, and music prompts updated throughout docs.
- **World history resolved.** WW2 happened → the American government grew increasingly paranoid and cracked down → by the mid-1950s a **civil war** (people vs. government) had torn the country apart. This city was a battleground. The rift is a government experiment failure on top of all that.
- **Echo energy origin promoted to canon.** Government scientists were studying nuclear blast energy as a new kind of fuel/force. Their teleportation experiment went wrong. The rift is the result. "Echo" is not a word that exists in the game world at the start — it's earned at the end.
- **Files updated:** `STORY.md` (full rewrite of Setting + canon + removed "under discussion" section), `GAMEPLAY.md`, `AUDIO.md` (1940s → 1950s doom-jazz), `ROADMAP.md`, `BACKLOG.md` (added Story/narrative section with 5 deferred open questions), `LEARNINGS.md`, `docs/adr/0024-recorded-music-howler.md`.
- **Deferred to backlog:** Dad & Son names, what's across the rift, NPC/survivor flavor text, Living Weapons rules, survivor ally system design.

**Deviations:** None.

---

## 2026-06-24 — Quick-win bugs: hostile-survivor enemies now move + spawn at safe distance (no version change)

Two gameplay bugs fixed in `src/game.js`, no new gameplay systems.

- **Bug: survivor-spawned enemies stood still** — enemies added by `_resolveSurvivor` (SPAWN_ENEMIES outcome) while in `ROOM_CLEAR` state were never updated. The `e.update()` loop only ran inside `State.PLAYING`; ROOM_CLEAR had no enemy-update path. Fix: added a guarded enemy-update block to the ROOM_CLEAR branch — only runs when `this.enemies.length > 0` (zero overhead on normal clears). Also added dead-enemy filter and defeat check so a player killed by a hostile survivor reaches game-over correctly.
- **Bug: enemies spawned on top of the player** — spawn formula was `npc.x ± 2`, placing enemies within arm's reach of the NPC (and thus the player standing next to it). Fix: replaced with a ring of radius 3–4.5 units at a random angle from the NPC (`Math.cos/sin` of `rng.next() * 2π`). Same two rng calls per enemy; enemies now spawn with reaction distance.
- **Bug 3 (input gating in ROOM_CLEAR) — resolved as non-issue**: full player input was already correctly allowed in ROOM_CLEAR (player needs to walk to the door). After fixing Bug 1, enemies also actively chase in ROOM_CLEAR, so firing is necessary — no change made.

**Deviations:** None.

---

## 2026-06-23 — Testing kit ports: statistical RNG battery + config invariants + metamorphic tests (no version change)

Port of test patterns from [`Lost-secuirty/Demo-math-slot-test-only`](https://github.com/Lost-secuirty/Demo-math-slot-test-only) into the game's Vitest suite. No gameplay code changed; 22 new tests added, 303 total (up from 281).

- **`tests/helpers/stats.js`** (new) — 5 statistical helper functions ported from the slot-test harness: `chiSquareUniform`, `chiSquareCategorical`, `ksUniform` (Kolmogorov-Smirnov), `runsZ` (Wald-Wolfowitz runs test), `serialCorrelation` (lag-1). Pure math, no deps. Now available to any future test.
- **`tests/rng-stats.test.js`** (new) — Statistical battery for `makeRng` (mulberry32): chi-square, KS, runs, serial correlation — all seeded and deterministic. Proves the PRNG is actually uniform and independent, not just "seems random." The existing `rng.test.js` only covered basic determinism/range.
- **`tests/config-weapons.test.js`** (new) — Config invariant tests for `WEAPONS` and `PROGRESSION`. Every weapon entry is checked for: positive damage, positive cooldown (non-orbital), ≥1 pellet + positive bullet speed (non-orbital), spreadDeg in [0,360), explosive → positive explodeRadius, homing → positive turnRate, orbital → positive radius/spin/hitCooldown. Charge cannon inner config validated (minDamage < maxDamage, positive maxTime). Progression: roomsPerFloor is a positive integer, all floors have name + boss, no two floors share a boss type.
- **`tests/metamorphic.test.js`** (new) — Metamorphic tests for the balance math (ported pattern from the slot-test harness): (1) `statBonus` linearity in maxBonus (scaling m by k must scale output by k — catches hardcoded-scale bugs); (2) `floorScale` consecutive-ratio invariance (ratio must be 1+growth regardless of floor index — catches off-by-one or table-lookup bugs); (3) `marginalBonus` telescoping identity tested across a wider parameter grid than the existing `scaling.test.js` regression pin.

**Deviations:** `chiSquareCategorical` was ported from helpers even though there's no current test that calls it — included because it's the natural companion to `chiSquareUniform` and needed for any future weighted-drop fairness test.

---

## 2026-06-23 — FPS-1: perf A/B tooling + safe dial-backs (v0.8.16)

First plan filed under the new [`docs/plans/`](plans/) archive
([0001](plans/0001-fps-instrumentation.md)). The game sat at ~33fps on the RTX 5060 laptop with **no way
to measure why**. Instead of guess-fixing: make the bottleneck measurable, then ship the two
lowest-risk dial-backs.

- **Measure:** extended the debug **Performance** folder with **Frame ms** + **Triangles** (it already
  showed FPS + draw calls). New **Graphics (A/B perf)** folder flips each fill-rate suspect live and
  _independently_ — pixel-ratio cap, MSAA samples, shadows + map-size, post-FX, bloom, AO quality,
  vignette, and camera-follow (standalone) — so the real cost is read off the readout, not guessed.
- **Live finding (owner, mid-build):** toggling the whole post-FX composer + shadows off jumped
  **30 → 165fps** (refresh-capped, RTX 5060). Camera-follow is welded to that same "reduced effects"
  switch via `config.calmCamera`, but a ±5-unit pan can't cost frames — so the bottleneck is the
  **post-FX pipeline + shadows, not draw calls**. Top suspect: 4× MSAA on the HDR buffer + N8AO. The A/B
  folder isolates the exact sub-pass; the targeted cut is the data-gated follow-up PR.
- **Dial-backs (defaults, reversible):** `GRAPHICS.shadows.mapSize` 2048 → **1024**;
  `GRAPHICS.pixelRatioCap` 2 → **1.5** (only bites on hi-DPI panels, DPR > 1.5). Both A/B-able live.
- **Plumbing:** new pure [`core/graphics.js`](../src/core/graphics.js) (`effectivePixelRatio` + option
  arrays, unit-tested); runtime setters in `scene.js` (`setPixelRatioCap`, `setShadowMapSize` — disposes
  the old shadow map to avoid a GPU leak) wired via `game.gfx`; `postfx.rebuild()` so AO/vignette changes
  re-apply live.
- **Deviation from plan:** dropped the planned standalone `ui/perfHud.js` overlay — the debug menu
  already had a live FPS/draw-call readout, so a separate HUD would have duplicated it. Extended that
  folder instead (less code, no duplication).
- **A/B measurement results (Nitro RTX 5060, mobs on screen, all inputs active):**
  - Shadow map 2048 → 55fps; 1024 or 512 → ~60fps (≈+5fps, already fixed above)
  - AO Performance → ~60fps; Low → ~55fps; Medium → ~53fps; High/Ultra → ~50fps (≈+5fps per step up)
  - MSAA: no measurable impact at any setting — not the bottleneck (prime-suspect prediction was wrong)
  - Everything else (bloom, vignette, pixelRatioCap, camera-follow): negligible, stable ~60fps
- **Follow-up fix (added to this PR):** `ao.quality` 'Low' → **'Performance'** (+5fps, negligible visual
  diff at halfRes; the config already had a note: _"Dial-back if it ever costs frames: keep halfRes →
  quality 'Performance'"_).

## 2026-06-23 — Fix SonarCloud exclusions: add `.sonarcloud.properties` (no version change)

Root-cause fix for a long-latent config bug, found while unblocking the B10 PR's quality gate.

- **The bug:** SonarCloud **Automatic Analysis** (this repo's setup — GitHub App, no CI scanner step)
  **ignores `sonar-project.properties`**. It reads **`.sonarcloud.properties`** instead, and only from
  the **default branch**. So the repo's CPD/coverage exclusions never actually applied — exposed when
  B10's `META_UPGRADES` (6 same-shape data objects) pushed new-code duplication to 3.3% on `src/config.js`
  (a file that was _supposed_ to be excluded).
- **New `.sonarcloud.properties`** — same `sonar.cpd.exclusions` (bosses, config.js, tests) +
  `sonar.coverage.exclusions` the dead properties file carried.
- **`sonar-project.properties`** — header corrected: kept only as the CI-analysis fallback; notes
  `.sonarcloud.properties` is the live config and to keep them in sync.
- **`docs/OPERATIONS.md`** — corrected the SonarCloud section + added the API recipe to find flagged
  files/lines. **`docs/LEARNINGS.md`** — full write-up (incl. the `period`-field API gotcha).

## 2026-06-23 — Ops reference + tooling hygiene (no version change)

A process/tooling PR (no gameplay change, no version bump): give the repo a single home for "what must
pass and what's installed," and close a few small drift gaps found in an audit.

- **New [`docs/OPERATIONS.md`](OPERATIONS.md)** — the canonical in-repo reference for the required CI
  checks (+ the external SonarCloud/CodeRabbit gates), the exact local gauntlet to reproduce CI before
  pushing, the installed toolchain/pinned-tool versions, and the deferred tooling backlog.
- **Auto-format pre-commit hook** — `.githooks/pre-commit` now Prettier-formats staged files and
  re-stages them before the existing secret/PII scan, so `format:check` stops failing CI on style
  (kills a push/fix/re-push round-trip). The custom-script invocation path is unchanged.
- **Node pin aligned** — `.node-version` 22 → 24 to match `.nvmrc` and CI (all on Node 24); added
  `engines.node: ">=24"` so the requirement is declared in one authoritative place.
- **Stale doc fix** — `STATUS.md` footer "25 ADRs (0001–0025)" → "28 ADRs (0001–0028)".

---

## 2026-06-23 — B10: Meta-progression (Echoes + Resonance screen) (v0.8.15)

Permanent progression layer gated behind the first full win. (ADR-0029.)

- **New `src/core/saves.js`** — versioned localStorage save (mirrors `settings.js`): schema `v:1`,
  `normalizeSave` + `migrate` (never-throw, safe-reset on corrupt/unknown version), `Save` singleton
  with `get/addEchoes/recordWin/recordRun/recordBossKill/canBuy/buy/reset`. Pure exported helpers
  (`normalizeSave`, `migrate`, `nodeById`, `costOf`, `canAfford`, `purchase`, `baselineStacks`) are
  unit-tested (43 tests in `tests/saves.test.js`).
- **`src/config.js`** — `SAVES` (earn rates) + `META_UPGRADES` (6 nodes: vitality/sharpness/swiftness/
  rapid/toughHide/aegis).
- **New `src/ui/metaProgress.js`** — native `<dialog>` Resonance panel (mirrors `ui/credits.js`): locked
  banner pre-beat, node grid + Buy buttons post-beat, re-renders on each purchase.
- **`index.html`** — `#meta` dialog + `.meta-*` CSS + `🌀 Resonance` start-menu button.
- **`src/game.js`** — `recordBossKill` on boss death (bumps stat + awards Echoes post-beat), `recordWin`
  on win, `recordRun` on GAMEOVER, `consumeForge()` → `openMetaPanel()` from DEAD/WIN state,
  `baselineStacks` computed once in `startRun` and passed as `baseline` to each Player.
- **`src/entities/player.js`** — `baseline` option in constructor; `reset()` seeds `_up`,
  `maxHearts`, `guardCharges` from it (all-zero pre-beat → identical to today).
- **`src/systems/input.js`** — `consumeForge()` (F key + Select/btn 8 on gamepad).
- **`src/debug/menu.js`** — "Meta" folder: live echoes/gameBeaten readout + 🏆 Mark game beaten +
  +100 Echoes + ↺ Reset save.
- **`src/main.js`** — `initMetaPanel()` on boot, `window.__saves = saves` for the drive.
- **`docs/adr/0029-meta-progression-and-save.md`** (new), **`docs/GAMEPLAY.md`** (economy row),
  **`docs/BACKLOG.md`** (B10 ticked).

**Deviations:** none — shipped as planned.

---

## 2026-06-22 — B9b: Offer screen go-live (room-clear pick-1-of-3) (v0.8.14)

The second half of the B9 redesign — the B9a offer engine is now **wired live**. Normal room clears open
a paused **pick-1-of-3 upgrade OFFER** (replacing ground stat-drops); boss rooms still drop a HEAL +
weapon chest. (ADR-0028.)

- **New `src/ui/offer.js`** — the modal card screen (modeled on `ui/humanchoice.js`): tier-colored
  cards, keyboard 1-3 / arrows+Enter / click / gamepad (`moveOfferFocus`/`confirmOffer`), a solo `[R]`
  ally-weapon reroll, headless auto-resolve, never-throws. `index.html` gains the `#offer` overlay + the
  tier-colored card CSS.
- **New `src/core/defense.js`** (pure) — `resolveIncoming(dmg, {guardCharges, reduction, carry})`: guard
  charges block whole hits first; damage reduction is a deterministic % via a **carry accumulator** so
  whole-heart HP feels a true fraction with no RNG and never goes fractional.
- **`src/states.js` + `src/game.js`** — a paused `OFFER` state; normal room clear → `_beginOffers` (one
  pick per living player, co-op **sequential**) → `_finishRoomClear` opens the door + `ROOM_CLEAR` (the
  door stays CLOSED during the offer). Removed `_dropRoomReward` + the B8 ground-drop `commonStreak`.
- **`src/entities/player.js`** — per-player `maxHearts`; `applyOfferCard` (stat / damage-reduction /
  heal / max-life / guard / weapon-mod / weapon); `hurt()` resolves guard + damage-reduction
  (core/defense.js) before any heart comes off, with a distinct "shield" cue on a block; weapon mods
  merged into `_fireWeapon`/`_releaseCharge`; per-player offer ctx (owned/recent/stacks/pity).
- **`src/entities/ally.js`** — the ally passively gets **20%** of the player's bonuses (`allyShare`),
  carries a real gun, and the solo player can **reroll** it (`rerollWeapon`).
- **Config retune (small per pick — Scott):** kept the power ceilings + `CAPS`, only stretched the ramp
  (`UPGRADES.*.half` 5/6→12, `DAMAGE_REDUCTION.half` 4→8) so each every-room pick is a small nudge;
  added `CAPS.maxHearts` (12). Documented the two separate tier ladders (offer `ultra` vs B8
  `PICKUPS.rarity`).
- **Tests:** `tests/defense.test.js` (guard + carry-DR invariants — integer / ≤dmg / long-run %), a
  weapons-only **no-drift** test in `tests/items.test.js` (items.js ↔ `PICKUPS.rarity.itemRarity`). 231
  tests pass; coverage 54.7% (gate 40%).
- **Deviations from plan:** None. (Per Scott's answers this session: damage-reduction = deterministic
  carry, ally reroll included, retune = stretch-the-ramp / keep-ceilings. The bigger meta systems he
  listed — luck, permanent upgrades, unlockable weapons/characters, achievements, challenge/endless/
  random modes — are parked in `BACKLOG.md`.)
- **Verified:** lint clean, format:check clean, 231 tests pass, build clean, prod-health + browser smoke
  exit 0, and a Playwright `window.__game` drive (offer modal appears → pick applies the effect → door
  opens → co-op shows two sequential P1/P2 offers → 0 page errors).

## 2026-06-22 — B9a: Offer-engine foundation (item registry + offers + scaling) (v0.8.13)

First half of the B9 redesign (room-clear "pick 1 of 3" upgrade offers replacing ground stat-drops).
**Pure foundation only — NO gameplay change yet; nothing is wired live (B9b flips it on).**

- **New `src/core/items.js`** — the canonical offerable-item registry (one source of truth). 20 items
  across 3 categories: **player upgrades** (damage/fire-rate/move-speed/heal/max-life/damage-reduction/
  guard), **weapon mods** (pierce/bounce/bullet-speed/blast — reuse existing BULLET flags), **weapons**
  (the 8 guns). Each `{id, name, category, tier, tags, effect}`; tiers `common/rare/epic/ultra` (adds
  `ultra` for the guard). `blurbFor(item, {stacks})` renders the card's exact line — the **marginal %**
  of the next pick for stacking stats (honest "+12%" early → "+2%" deep), fixed text otherwise.
- **New `src/core/offers.js`** — pure `generateOffer(rng, ctx)` → 3 distinct cards: roll a tier per
  card (weighted, with a soft/hard **pity** floor on the first card), pick an item of that tier,
  **anti-repeat** (down-weight recently-offered items + owned weapons) and a **category-variety** guard
  (never 3-of-a-kind — the variety card spans all tiers to always reach another category). Seeded →
  reproducible. `pityFloorTier(streak)` exposed + tested.
- **`src/core/scaling.js`** — `marginalBonus(n, maxBonus, half)` (per-pick delta, telescopes to
  `statBonus`) + `allyShare(bonus, share)` (the AI ally's 20% cut).
- **Config (additive, not read by live code):** `OFFERS` (card count, tier weights incl. ultra,
  anti-repeat decay, soft/hard pity), `GUARD` (1-hit rare / 3-hit ultra), `DAMAGE_REDUCTION` (curve),
  `WEAPON_MODS` (mod amounts), `ALLY.upgradeShare = 0.2`.
- **Tests:** `tests/items.test.js` (registry integrity + blurbs), `tests/offers.proof.test.js` (distinct
  cards, variety guard, chi-square tier distribution, pity floors, anti-repeat), extended
  `tests/scaling.test.js` (marginal + allyShare). 221 tests pass (+38); coverage 55% (offers.js 98%).
- **Deviations from plan:** (1) the `UPGRADES`/`CAPS` **retune** and the `PICKUPS.rarity` **ultra-tier**
  change are deferred to **B9b**, so B9a stays genuinely non-behavioral (a live retune would change the
  still-active ground drops). (2) `offers.js` is **self-contained** (its own tier ladder) rather than
  reusing `core/drops.js` — this avoids coupling to B8's `PICKUPS.rarity.tiers` and keeps all B8 tests
  untouched. B9b will reconcile the registry as the single source when ground drops are removed.
- **Verified:** lint clean, format clean, 221 tests pass, build clean, prod-health + browser smoke
  (fresh build) exit 0.

## 2026-06-22 — B8: Drop rarity tiers + hard pity (v0.8.12)

Research report (4) progression: the flat 12-entry drop table becomes **rarity-tiered** with
floor-scaled odds + a **hard-pity** safety net, so deeper floors feel richer and a run can never go
"mean" on a kid. **Honest, not slot-machine:** rewards are still earned by clearing rooms; pity only
prevents a frustrating dry streak (no variable-ratio craving loops — matches the design ethics).

- **New pure `src/core/drops.js`** (no THREE → unit-testable): `rarityOf`, `typesByTier` (derived
  from config so they can't drift), `rarityBand(floor)`, `pityMinTier(streak)`, and `rollDrop(rng,
weights, {minTier})` — pick a TIER by weight, then a uniform TYPE within it; `minTier` removes
  tiers below the pity floor. Seeded (ADR-0013) → chi-square provable, like the old table.
- **`config.js PICKUPS.rarity`:** `tiers:[common,rare,epic]`, `itemRarity` (heal+gems=common,
  shotgun/mg/bouncer=rare, rocket/homing/railgun/charge/orbital=epic), `bandEdges:[2,4]`,
  `regularChestWeights` (3 bands, descending falloff), `bossChestWeights` (no commons, leans epic),
  `hardPity:{commonStreakMax:4, minTier:rare}`. The old flat `dropTable` is **removed**.
- **`game.js`:** `commonStreak` counter (reset each run); normal clears roll the floor-banded reward
  with the pity floor and advance/reset the streak; boss chests roll `bossChestWeights` (always a
  weapon). `pickups.js` keeps only the THREE-backed `Pickup` (drop selection moved out).
- **Tests:** `rarity.proof.test.js` (tagging consistency, chi-square distribution, boss-never-common,
  determinism); `pity.test.js` (the floor decision, `rollDrop` honoring the floor, and a streak-loop
  proving a rare+ is guaranteed within `commonStreakMax+1`). `determinism.test.js` updated to drive the
  new seam. drops.js coverage 97%; overall 48.8%.
- **Docs:** `GAMEPLAY.md` Economy pillar + tuning note. **No ADR** here — the drop+offer system ADR
  (ADR-0028) lands with B9 (soft pity + the pick-1-of-3 offer screen), which builds on this.
- **Deviation from plan:** plan said put the rarity logic in `pickups.js`; I put it in a **pure
  `core/drops.js`** instead so the THREE-free selection logic stays unit-testable + counts toward the
  scoped coverage gate (matches the repo's "pure logic separate" rule). No visual rarity treatment
  yet — items already read by their distinct color/label; explicit rarity UI comes with B9's offer
  screen.
- **Tune at the table:** tier assignments + band weights + pity cap are all in `PICKUPS.rarity` —
  Scott + Caden's to feel in `npm run dev`. (Balance note: normal rooms now drop heal/stat commons
  more often early; weapons concentrate at rare/epic + boss chests.)
- **Verified:** lint clean, format clean, 199 tests pass (+13 net; `input.proof` hook-timeout flake is
  pre-existing + passes isolated), build clean, prod-health + browser smoke (fresh build) exit 0.

## 2026-06-22 — B7: Knockback impulse + decay (v0.8.11)

Research report (5) feel layer: a hit now **shoves an enemy back a little**, and the shove decays
smoothly. Adds weight to every shot without changing balance much (enemies still close the gap).

- **New pure `knockbackStep(vel, dt, {drag})`** in `math2d.js`: exponentially-decaying impulse;
  the returned displacement is the **exact integral** of the decay over `dt`, so it's frame-rate
  independent (one big step == many small steps — no tunneling-by-framerate). Degrades to `v·dt` as
  `drag→0`.
- **`collision.js advanceKnockback(entity, dt, walls)`**: steps + decays `entity.knock`, moves it,
  then re-runs the existing `slideOutOfWalls`/`clampToArena` so a shove **never tunnels a wall**.
  No-op when not knocked (free to call every tick). Shared by Enemy + Boss.
- **`enemies.js` / `boss.js`:** `this.knock` velocity + `_applyKnock(dir)` (normalizes the hit dir,
  adds the per-type impulse, clamps stacked impulses to `maxSpeed`). `hurt()` gains an optional
  `knockDir`. **Bosses ignore knockback by default** (`bossDefault: 0`) — a shove would wreck their
  telegraph cadence (kid-fairness); a boss opts in only via `BOSS[type].knockback`.
- **Hit sources pass a direction:** bullets shove along travel; explosions shove **outward from the
  blast**; the orbital weapon shoves **away from the player** (`bullets.js`, `player.js`).
- **Config `FEEL.knockback`:** `enabled, drag:9, maxSpeed:14, bossDefault:0, impulse:{chaser:7,
shooter:5.5}`. Pure gameplay → **not** gated by `reducedEffects`; `enabled:false` = the old
  no-shove combat exactly.
- **Tests** (`tests/knockback.test.js`): 7 — decay-to-rest, direction, **frame-rate independence**
  (1 big step == 60 small, to 6 digits), settling distance = `v0/drag`, `drag→0` fallback, zero-vel
  no-op, higher-drag-shorter-shove.
- **Docs:** `GAMEPLAY.md` Feel pillar + tuning note (no ADR — it's a config-gated feel knob, fully
  reversible). **Tune at the table:** `impulse`/`drag` are Scott+Caden's to feel in `npm run dev`.
- **Verified:** lint clean, format clean, 191 tests all pass (+7), coverage 47.3%, build clean,
  prod-health + browser smoke (re-run against the **fresh** B7 build) exit 0.

## 2026-06-22 — B6: Parametric pattern library + homing extraction (v0.8.10)

Research report (5): extend the pure emitter library and extract homing into a testable module.
**No live-boss change** — the new generators are pure library primitives that **no boss calls yet**.
A later PR will debut one on a low-stakes boss behind a B4 fairness check (and a gating flag)
before it goes live; the live debut and the `PATTERNS`/`HOMING` config block are deferred to that PR
(see _Deviation_ below).

- **`multiArmSpiral(arms, perArm, phase, step)`** in `emitters.js`: N rotating spiral arms, each
  `perArm` bullets `step` rad apart, arms evenly distributed. Fire repeatedly while advancing `phase`
  → classic danmaku spiral. `max(1, arms)` guards divide-by-zero.
- **`layeredFlower(layers, baseCount, phaseStep, countStep)`**: concentric rings with growing petal
  count per layer, each phase-offset so petals interleave — keep counts modest for kid-fair gaps.
- **`src/core/homingMath.js`** (new pure module): `turnRateHomingVelocity(pos, vel, target, dt,
{speed, turnRate})` — clamped heading turn (at most `turnRate*dt` per tick), re-sped to `speed`.
  A perpendicular juke still loses it — fair for a young dodger (instant correction feels unfair).
- **`bullets.js _steerHoming`** now delegates to `turnRateHomingVelocity` — behavior identical,
  now unit-testable and reusable for future seeker-minion boss threats.
- **Tests** (`tests/patterns.test.js`): 7 tests — arm count/spacing/step, divide-by-zero guard,
  layer total (8+10+12=30), pure reproducibility, speed preservation, turn clamping, curve convergence.
- **Verified:** lint clean, format clean, 184 tests all pass (+7), coverage 47%, build clean,
  smoke:prod + smoke:browser exit 0.
- **Deviation from plan:** B6 planned to also debut one pattern on a live boss (gated by a per-boss
  `complexityTier`) + add `PATTERNS`/`HOMING` config. Held back to keep this PR a pure, reversible
  library addition — wiring a live attack is a gameplay change that needs the B4 fairness check on the
  real telegraph + a perf pass, so it earns its own PR. No `complexityTier` flag or new config ships
  here. (The new generators' `step`/`countStep` defaults stay inline as function-signature defaults,
  matching the existing `arc(count, phase, step=0.25)` style — no feel-numbers are live to tune yet.)

## 2026-06-22 — B5: "Twice as hard" difficulty knob (v0.8.9, ADR-0027)

Scott's headline ask. A single master `DIFFICULTY.hardnessMul` (default **2** = twice as hard)
distributed across difficulty facets by `0..1` weights, so 2× total doesn't compound to ~8× brutal.
Stays kid-fair (B4 guards it).

- **New pure `hardnessFacet(mul, weight)`** in `core/scaling.js` = `1 + (max(1,mul)-1)*weight`.
- **Config `DIFFICULTY`:** `hardnessMul:2, hpWeight:1.0, countWeight:0.35`. Shipped flavor: enemy +
  boss HP **×2** (boss.js, enemies.js + summoned minions) and **~1.35×** enemies per room (spawner.js).
  **Ring density + contact damage untouched** (weight 0) — bullet gaps stay fair, no new one-shots.
  Bullet speed never scales (unchanged repo rule).
- **Tests** (`tests/scaling.test.js`): golden values on `hardnessFacet` + the shipped config doubles
  HP / crowds rooms. Fairness regression (B4) still green → harder, not unfair.
- **Docs:** [ADR-0027](adr/0027-difficulty-and-scaling.md); `docs/COMBAT_CORRIDOR.md` (TTK reference).
- **Caveat / tune-me:** HP ×2 **compounds with the per-floor ramp** (a floor-4 boss ≈ 5× base HP), so
  boss fights are longer — `hardnessMul` (or `hpWeight`) is the one knob to dial at the table with
  Caden. Log reactions in `docs/playtest/kid-feedback-log.md`.
- **Verified:** lint clean, tests pass (+10 scaling), build clean, smoke:prod + smoke:browser exit 0.

## 2026-06-22 — B4: Kid-fairness telegraph & gap math (guard rail) (v0.8.8)

Codifies the research's fairness equations as pure helpers + a CI regression so the upcoming "twice
as hard" pass (B5) can't silently make a boss unfair. **No gameplay change** — it only measures.

- **New `src/core/fairnessCalc.js`** (pure): `timeToImpactSec`, `gapWidthAtRadius(radius, ringCount,
gapSlots)`, `minimumTelegraphMs(moveDistance, playerSpeed, {childMode, choices})` — the
  recognize + choose + move + margin model (slower child reaction model by default).
- **Config:** `FAIRNESS_TARGETS { telegraphMinMs:{easy:400,hard:250}, gapMinMul:1.5, childMode:true }`
  - `DEBUG_FAIRNESS { warnOnInit:false }`.
- **`boss.js`:** dev-only `console.warn` on init if a boss telegraph is under the easy target (off by
  default; flip `DEBUG_FAIRNESS.warnOnInit` on while tuning B5 in `npm run dev`).
- **Tests** (`tests/fairness.test.js`): helper math + a **living regression** — every shipped
  telegraphed boss meets the easy target (cat is the tightest, exactly 400ms) and mushroom's 2-slot
  ring gap clears 1.5× the player hurt-diameter at engagement range.
- **Deferred:** the opt-in in-overlay gap/telegraph **visualizer** — the CI test + dev warn already
  give the guarantee + feedback; the visual lane renderer can follow if wanted.
- **Verified:** lint clean, tests pass (+6), build clean, smoke:prod + smoke:browser exit 0.

## 2026-06-22 — B3: Subtle camera spring-follow + co-op recenter (v0.8.7)

Gameplay-feel (research report (5)). The static full-room camera (ADR-0020) gains a **subtle**
spring-follow toward the live-player centroid — bounded so the whole room stays readable. **Amends
ADR-0020** (which chose static framing over a follow-cam); Scott opted into a default-ON follow.

- **New `src/core/camera.js`** (pure): `cameraTarget(players, {maxPan, splitInner, splitOuter})` —
  centroid, hard-clamped to ±maxPan; in co-op it eases the pan back to center as the pair separates so
  both stay on the one shared screen (quadInOut feather on `splitWeight`).
- **`game.js`:** `camPan`/`camVel` state; `_updateCamera(dt)` springs the pan toward the target
  (`springCritDampedXZ`, B1) each tick; `render()` adds the pan to `baseCam` + the B2 shake and looks
  at the panned point. Pinned to center under `reducedEffects` + `calmCamera`.
- **Config:** `CAMERA.followEnabled:true, followOmega:6, followMaxPan:5, coopSplitInner:14,
coopSplitOuter:28, calmCamera:true` — all tunable; `followEnabled:false` = exactly the old static cam.
- **Determinism:** the pan derives from player positions (no `Math.random`) — seeded runs stay
  reproducible (ADR-0013).
- **Verified:** lint clean, tests pass (+5 `camerafollow.test.js`), build clean, smokes green.
  Default-ON + subtle — tune `followMaxPan`/`followOmega` live in `npm run dev`.

## 2026-06-22 — B2: Trauma-based shake + screen-flash, determinism fix (v0.8.6)

The gameplay-feel "punch" pass (research report (5), "game-feel math"). Upgrades the scalar
screen-shake to a trauma model and adds a config-gated impact screen-flash — AND fixes a real
**determinism bug**: `game.render()` used `Math.random()` for camera shake, so a "seeded" run
(ADR-0013) never rendered the same. Shake now comes from coherent value-noise (B1's `smoothNoise1D`),
so it's reproducible.

- **`juice.js`:** scalar `shakeMag` → `trauma` (0..1); shake magnitude = trauma², linear decay
  (`JUICE.decayPerSec`). `addTrauma()` scales by `reducedEffectsTraumaMul` when reducedEffects is on.
  `shakeOffsetXZ(now)` samples coherent noise (no `Math.random`) → seeded-run reproducible. `hitStop`
  unchanged.
- **`game.render()`:** `Math.random()` camera offset → `juice.shakeOffsetXZ(performance.now()/1000)`.
- **Screen-flash:** new `#screenflash` overlay (`index.html`) + `hud.flashScreen(peak,color,ms)`,
  gated OFF by `reducedEffects`. Wired to player hurt (subtle red, atop the blood splatter) + boss
  death (white pop).
- **Config discipline:** every shake magnitude now lives in config — `JUICE.trauma*` knobs + new
  `FEEL` block; the old hardcoded `1.2` (boss death) / `0.4` (explosion) / `0.12` (cat) literals are
  gone.
- **Call sites:** `juice.shake()` → `juice.addTrauma()` across player / enemies / boss / bullets /
  cat / patterns.
- **Deferred (deviation):** per-mesh hit-flash tint on character GLB groups — finicky/risky on
  animated groups, and hurt already has splatter + screen-flash + shake; pushed to `docs/ROADMAP.md`.
- **Verified:** lint clean, 160 tests pass (+5 `juice.test.js`; coverage 44.31% lines, gate 40), build
  clean, smoke:prod + smoke:browser exit 0. Determinism fix proven by `tests/juice.test.js`
  (`shakeOffsetXZ` pure/identical for the same inputs). Feel values are deliberately SUBTLE starting
  points — tune live in `npm run dev`.

## 2026-06-22 — B1: Feel-math foundation (pure utils) (v0.8.5)

Prereq for the gameplay-feel pass (research report (5), "game-feel math"). Pure, frame-rate-independent
helpers added to `src/core/math2d.js` (ONE pure-math module — no duplicate clamp/lerp, no THREE import).
**No gameplay change yet** — these are the primitives B2 (trauma shake), B3 (camera spring), and B7
(knockback) build on.

- **Added** (`src/core/math2d.js`): `lerp`; `cubicOut`/`quadInOut`/`backOut` (t clamped); `hashNoise1D`/
  `smoothNoise1D` (deterministic coherent value noise — NO `Math.random`, so camera shake can be made
  reproducible under seeded runs, ADR-0013); `springCritDamped`/`springCritDampedXZ` (Juckett
  critically-damped — converges with no overshoot); `asymptoticFollowXZ` (cheap follow fallback);
  `splitWeight` (raw co-op merge↔split ramp, feathered at the call site).
- **Tests** (`tests/feelmath.test.js`): deterministic — eases pinned/monotonic, noise reproducible +
  in-range + continuous + integer-exact, spring converges without overshoot, follow never overshoots,
  splitWeight boundaries + degenerate guard.
- **Verified:** lint clean, 155 tests pass (+12), coverage 44.31% lines (up from 41.16%, gate 40), build
  clean, smoke:prod + smoke:browser exit 0.

## 2026-06-22 — A1: Codacy `.gitignore` defense (v0.8.4)

Repo-hygiene quick win (process-tightening Track A, from research report (3) on low-drift solo+AI
dev). The Codacy VS Code extension auto-injects `.github/instructions/codacy.instructions.md` — an
AI-behavior rules file that is **not** project policy. A blanket ignore stops it (or any IDE-injected
instruction file) from ever being committed as if it were repo doctrine — exactly the phantom-rules /
context-bloat failure mode the research warns against.

- **`.gitignore`:** added `/.github/instructions/` (anchored to root, so `.github/workflows/` +
  `pull_request_template.md` stay tracked). Grouped with the other agent/IDE auto-injection carriers
  (`.claude/logs/`).
- **Verified:** `git check-ignore -v` matches the path; a throwaway
  `.github/instructions/codacy.instructions.md` did not appear in `git status` (then deleted). No such
  file existed in the repo — purely preventive.
- **Note for Scott:** also disable the Codacy extension's rule-generation in VS Code so the file isn't
  recreated locally; the ignore is the repo-side safety net regardless.

## 2026-06-21 — Phase D: N8AO ambient occlusion (v0.8.3, ADR-0026) — overhaul complete

Final atmospheric phase — soft contact shading for depth. Completes the ADR-0026 overhaul
(IBL → shadows → PBR floor → AO). Config-gated, own fallback, drops with `reducedEffects`.

- **Dep:** `npm install n8ao@^1.10.2` (peers satisfied: postprocessing ≥6.30, three ≥0.137).
- **Pass** (`src/core/postfx.js`): `N8AOPostPass` (NOT `N8AOPass`) added **between** the `RenderPass`
  and the bloom/tone-mapping `EffectPass`, gated on `GRAPHICS.ao.enabled` inside its **own inner
  try/catch** so an AO failure skips only AO — the composer still renders bloom (the outer catch that
  nulls the whole composer is never hit). `gammaCorrection` forced off mid-pipeline (the final
  EffectPass owns color); depth is auto-wired by the composer (no DepthDownsamplingPass needed).
- **Config:** `GRAPHICS.ao = { enabled, quality:'Low', halfRes:true, radius:2.0, distanceFalloff:1.0,
intensity:1.5, color:0x000000, gammaCorrection:'auto' }`. `aoRadius` is WORLD units — 2.0 for our
  ~1–3 unit entities (n8ao's default 5 muddies our scale). `reducedEffects` already drops the whole
  composer, so AO turns off with it (no extra wiring). The render studio shares `createPostFX`, so AO
  flows into portraits too.
- **Verified:** lint clean, 143 tests pass, coverage 41.2% lines (gate 40); build bundles n8ao
  (+~144 KB); browser smoke clean; headless boss-room screenshot shows soft contact shading at wall
  bases/rubble/corners — subtle, readability intact, world stays dark, `window.__postfx.active=true`,
  0 page errors.
- **Perf:** halfRes + 'Low' ≈ 1–3 ms/frame on a mid laptop iGPU (well within 60 fps on the Nitro's
  5060). Dial-back: keep halfRes → quality 'Performance' → smaller `radius` → `enabled:false`.

## 2026-06-21 — Phase C: CC0 PBR floor texture + normal map (v0.8.2, ADR-0026)

Third atmospheric phase — the "ruined street" floor now reacts to the new IBL + shadows. Scott's pick:
**wet asphalt**. Config-gated, never-break-the-render (missing file → flat color).

- **Asset:** dark, wet **CC0 asphalt** (ambientCG **Asphalt025C**, tagged dark/rain/wet) — Color +
  OpenGL normal + roughness, 1K PNG (~7.7 MB) in `public/textures/floor/`, credited in `ASSETS.md`.
  Skipped AO (negligible on a uniform tiled plane) + displacement (no tessellation). Dark so it never
  crosses `bloom.threshold` and glows.
- **Loader:** new `src/core/textures.js` — `loadTextures(paths)` (preload, never-throws; a missing
  map is warned + skipped) + `getTexture(path, {srgb, repeat, anisotropy})` (mirrors `assets.js` for
  GLBs). `srgb` only for albedo; normal/roughness stay `NoColorSpace` (the r152+ `.colorSpace` API).
- **Wiring** (`scene.js`): the ground `MeshStandardMaterial` takes `map`/`normalMap`/`roughnessMap`
  when loaded (white albedo tint so it isn't double-darkened; `metalness:0`), else the flat
  `PALETTE.ground`. `RepeatWrapping`, `repeat:8`, max anisotropy. `main.js` preloads the maps **before**
  `createScene` (the ground is built there). `GridHelper` stays on top as the readability cue.
- **Config:** `GRAPHICS.floor = { enabled, map, normalMap, roughnessMap, repeat:8, normalScale:0.6,
roughness:1, metalness:0, tint:null, anisotropy:'max' }`.
- **Verified:** full gauntlet green; build copies `public/textures/` into `dist/`; headless boss-room
  screenshot shows the dark wet floor tiling cleanly under the grid, world stays dark, threats still
  glow, `map`/`normalMap`/`roughnessMap` all bound, 0 page errors.
- **Perf:** negligible — the floor is one draw call; just switches the shader to its textured branch.
  VRAM ~16 MB for 3×1K w/ mips. Dial-back: drop roughnessMap → drop normalMap → `enabled:false`.

## 2026-06-21 — Phase B: real-time shadow maps (v0.8.1, ADR-0026)

Second atmospheric-overhaul phase — the highest-perf-risk one, greenlit now that the target device is
confirmed (Scott's Nitro V15 / RTX 5060). Real-time shadows, config-gated, never-break-the-render.

- **Renderer/light** (`src/core/scene.js`): `renderer.shadowMap.type = PCFShadowMap` set once at init
  (avoids a mid-run recompile); `enabled` from `GRAPHICS.shadows.enabled`. The warm **key**
  DirectionalLight is the **sole** caster — a tight orthographic shadow frustum fit to the static
  `ARENA` (not entity bounds — skinned-GLB boxes lie), `mapSize`/`bias`/`normalBias`/`radius` from
  config, `updateProjectionMatrix()` after. The fill light never casts (perf).
- **Casters/receivers:** new `src/core/shadows.js` `castShadows(root)` helper traverses an entity's
  meshes (incl. GLB hierarchies) and sets `castShadow`. Applied at the three chokepoints — `Enemy` and
  `Boss` constructors and `makeCharacter()` — so every monster/boss/minion/player/ally/survivor casts,
  in one line each. Walls + rubble (`rooms.js boxMesh`) cast **and** receive; the ground receives. The
  glowing `MeshBasic` bullets/eyes/door never call the helper, so they never cast.
- **reducedEffects:** `createScene` returns `setShadowsEnabled(on)`; `main.js` calls it alongside
  `postfx.setEnabled` (init + the settings `onChange`), so the one toggle drops shadows + post-FX
  together. Toggling `shadowMap.enabled` mid-run forces a one-time material recompile so it takes
  effect.
- **Config:** `GRAPHICS.shadows = { enabled, mapSize:2048, frustumMargin:4, near:1, far:80,
normalBias:0.02, bias:-0.0005, radius:2 }`.
- **Verified:** full gauntlet green; browser smoke clean; drove the game to the **floor-1 spider boss
  room** headlessly (`startRun` + `loadRoom(9)`) and screenshotted — walls + rubble cast clean soft
  shadows on the floor, no acne/peter-panning, dark identity + glowing threats intact,
  `shadowMap.enabled = true`, 0 page errors.
- **Perf:** one extra depth pass/frame; worst case ~15–25 casters (boss + minions + walls), well under
  the ~50 best-practice cap (bullets excluded). Dial-back ladder: `mapSize` 2048→1024 → `radius` down →
  `frustumMargin` tighter → `enabled:false`. Live-FPS confirmation on a packed boss room is Scott's to
  eyeball on the Nitro; the knobs are ready.

## 2026-06-21 — Phase A: in-game IBL + richer fog (v0.8.0, ADR-0026)

First graphics phase of the atmospheric overhaul (ADR-0026), preceded by a deep research sweep
(5 parallel threads + synthesis, every claim verified against the live `three@0.184.0` +
`postprocessing@6.39.1` source). Verdict: **GO** — run A→B→C→D all-out, each a perf-gated PR; the
overhaul is safe because every feature is config-gated, additive, and degrades gracefully. Scott's
calls: subtle mood, perf target = his Nitro V15 laptop, single `reducedEffects` toggle, wet-asphalt
floor (Phase C).

- **IBL** (`src/core/scene.js`): after the lights, a one-time `PMREMGenerator.fromScene(new
RoomEnvironment(), sigma)` bake sets `scene.environment` (the render studio's proven recipe, now
  shared). `scene.environmentIntensity` is set **explicitly** to `LIGHTING.ibl.intensity` (0.30) — it
  defaults to **1**, which washes the pale bone-white human/skeleton to white (the #1 trap). Wrapped
  in try/catch: any failure drops the env and the key/fill/hemi/ambient rig still lights everything
  (never breaks boot). IBL only touches `MeshStandardMaterial` — the `MeshBasic` glowing bullets/
  eyes/door (and their bloom) are unchanged.
- **Color contract:** `renderer.outputColorSpace = SRGBColorSpace` set explicitly (the composer
  follows the renderer) — cheap insurance against a future three default shift.
- **Fog** (`config.LIGHTING.fog`): now mode-driven — `linear` (near/far, default, keeps the far wall
  readable; identical math to before when `nearMul=1`) or `exp2` (density, a parked moodier
  experiment). New knobs: `mode`, `nearMul`, `density`.
- **Config:** added `LIGHTING.ibl = { enabled, intensity:0.30, sigma:0.04 }`; enriched `LIGHTING.fog`.
- **Render studio** (`tools/render-studio/studio.js`): dropped its local `STUDIO.iblIntensity` and
  repointed the env bake at `LIGHTING.ibl.{intensity,sigma}`, so portraits == game (the plan's "align
  IBL to config" deliverable).
- **Perf:** effectively free — a one-time PMREM bake at boot, zero per-frame cost beyond the texture
  taps `MeshStandardMaterial` already does. Dial-back ladder: lower `ibl.intensity` → `enabled:false`.
- Docs: ADR-0026 (the full four-phase plan), GRAPHICS.md (IBL now in-game; fog modes), LEARNINGS.

## 2026-06-21 — Audit bot: drift auditor ported from Codex-Speed-Test (v0.7.3, PR #42)

Kicks off the atmospheric-overhaul run (next: IBL → shadows → floor texture → AO). Scott asked for
the codex repo's **audit bot** set up here first, so it watches every graphics PR.

- **`scripts/audit-drift.mjs` + `scripts/audit-lib.mjs`** (pure, unit-tested — `tests/audit-lib.test.js`,
  15 tests) — deterministic, no API key. Diffs the branch vs `main`, reads the **logged intent**
  (commits, PR body, WORKLOG, LEARNINGS) and flags **drift**: lint suppressions, `.skip/.only` tests,
  `console.log`/`debugger` in src, sensitive-path changes, deep nesting, src-growth-without-tests,
  stale docs, oversized LEARNINGS, unlogged files, and a missing PR "Deviations" section. `--fix`
  applies only `prettier --write` (formatting) — never edits logic to pass.
- **`.github/workflows/audit.yml`** — runs on every PR and **posts the report as a comment**.
  `GITHUB_TOKEN` only; **comment-only (no push)** — the repo's control policy (`tools/control_audit.py`)
  forbids the writable-head-checkout / persisted-credentials / fork-skip that codex's auto-fix-push
  needs, and I won't waive a security control. Auto-format is redundant anyway (`ci.yml`'s
  `format:check` already gates it); `--fix`/`--history` stay available for local runs. Informational,
  not a required merge-blocker.
- **`docs/DRIFT-AUDIT.md`** — the design doc. Adapted from codex: biome→prettier, TS→JS, codex
  paths/rules → lostsouls. `npm run audit`.
- **Deferred:** the local `.claude/` `auditor` agent + `/audit` command (the pre-push _semantic_
  layer). A safety guard flagged adding a `.claude/` agent as agent-self-config beyond Scott's
  approval — correct call; it needs his explicit OK. The **CI bot (the part that audits every PR) is
  fully shipped**; the local agent is a convenience to add later.
- **Status:** built + verified (15 lib tests, full gauntlet green); PR open, awaiting checks + the
  bot's first self-report.

## 2026-06-21 — Retro fix: centralize lighting/fog into config (v0.7.2, PR #41)

A retro with Scott flagged the recurring config-discipline slip: feel-numbers in files I _edit_
(not just my new block) staying hardcoded. Concrete fix:

- **New `config.LIGHTING`** — the game's lights (hemisphere/ambient/key/fill colors, intensities,
  positions), fog (color + far multiplier), and background. Added `CAMERA.near/far` and
  `GRAPHICS.pixelRatioCap`. `scene.js` now reads all of it (was hardcoded at `scene.js:37-43/23`).
- **Render studio reuses `config.LIGHTING`** (was a copy-paste of the same lights → now matches the
  game automatically) + its own `STUDIO` knob block (fov, IBL fill, pose time, framing, ground/grid)
  and a `CONTACT` block in the driver — no more scattered magic numbers in the tool.
- Verified: game renders identically (same values), studio re-rendered 6/6 + contact sheet, 0 errors,
  full gauntlet + both smokes green.
- **Process change (logged in memory):** sweep adjacent feel-numbers in any file I touch, default to
  "when in doubt → config," and grep the diff for numeric literals + `0x` hexes before committing.

## 2026-06-21 — Phase 5: render studio harness (v0.7.1, PR #40)

The "photo harness" — salvaged the boss-portrait harness from the closed PR #35 and upgraded it.

- **`tools/render-studio/`** (`index.html`, `studio.js`, `README.md`) + **`scripts/render-studio.mjs`**
  (`npm run render:studio`). Renders each boss's **real in-game mesh** (GLB or procedural fallback)
  via the actual `Boss` shell.
- **Upgrades over PR #35's harness:** renders through the **same post-FX pipeline as the game**
  (`createPostFX` — bloom + ACES, so portraits match the live look); **IBL** (`RoomEnvironment`, kept
  to a 0.35 fill so pale/untextured models don't bloom-blow to white); **deterministic frozen pose**
  (`mixer.setTime` + fixed procedural `t`); a **per-subject facing table** (replaces hardcoded
  FACING); **SSAA** via 2× device scale; a **contact sheet** (box-downsampled grid via `pngjs`); and a
  `STUDIO_TRANSPARENT=1` cutout mode. Kept the three solved traps (root-relative model paths,
  world-space union bounds for skinned meshes, per-subject yaw).
- Re-added `pngjs` (contact sheet). Closed **PR #35** (superseded).
- **Produced** portraits + a contact sheet of all 6 bosses (spider, mushroom, Fang, Whisker,
  Rattlebones, the Survivor) for Caden — caught + fixed an IBL over-bright on the white human model.
- Docs: `GRAPHICS.md` render-studio section + `tools/render-studio/README.md`.
- **Status:** built + verified (6/6 bosses + contact sheet render, 0 errors); PR open, awaiting checks.

## 2026-06-21 — Phase 4: in-game graphics overhaul — post-FX (v0.7.0, PR #39, ADR-0025)

The headline visual upgrade. The game rendered raw (no tone mapping, no post-processing); now it
runs a real pipeline.

- **`src/core/postfx.js`** (new) — a pmndrs `postprocessing` `EffectComposer`:
  `RenderPass → EffectPass( BloomEffect + VignetteEffect + ToneMappingEffect(ACES_FILMIC) )` on a
  `HalfFloatType` HDR buffer with WebGL2 **MSAA**. **Luminance-gated bloom** (only bright/emissive
  pixels glow → the dark world's threats pop, scene stays dark + readable). Tone mapping owned by the
  composer (renderer stays `NoToneMapping`).
- **Wiring:** `scene.js` builds + returns `postfx` (resize → `postfx.setSize`); `game.render()` calls
  `postfx.render()`; `main.js` passes it in + binds the `reducedEffects` setting.
- **`config.GRAPHICS`** — all knobs: `enabled`, `toneMapping`, `aaSamples`, `bloom{}`, `vignette{}`,
  `vfx{}`. **Impact sparks** on bullet→wall hits via the existing pooled particles (`bullets.js`).
- **Accessibility:** a ✨ "reduced effects" toggle in the `#settings` panel (extends ADR-0023) flips
  post-FX off → raw render, persisted.
- **Fallback contract:** composer init failure OR a throwing frame → raw `renderer.render`. Never a
  black screen. Hardened `browser-smoke.mjs` to fail on any uncaught page error.
- **ADR-0025** + GRAPHICS.md completed (pipeline + config reference). Bundle +72 KB (gzip +16 KB) for
  postprocessing — a one-time download, no runtime bloat.
- **Verified:** Playwright drive confirmed `window.__postfx = {enabled:true, active:true}` at boot and
  in the boss room, the toggle flips it to `{false,false}` (raw render), **0 console/page errors**.
  Bloom + vignette visibly working (boss room screenshots). Full gauntlet + both smokes green.
- **Deviation:** muzzle flash deferred (per-bullet flash = rapid-fire noise; bloom already glows
  muzzles) → parked in ROADMAP. Threshold bloom instead of `SelectiveBloomEffect` (robustness; ADR-0025).
- **Status:** built + verified locally; PR open, awaiting CodeRabbit + checks.

## 2026-06-21 — Phase 3: dependency audit + bump (v0.6.10, PR #38)

Honest audit pass — **`npm audit` = 0 vulnerabilities**, and the **runtime stack is already on the
latest** (three r184, vite 8, express 5, howler 2.2.4, lil-gui). Only **dev tooling** had newer
releases (all minor/patch, same major); bumped to latest:

- `eslint` 10.4.1 → **10.5.0**, `eslint-plugin-security` 4.0.0 → **4.0.1**
- `vitest` + `@vitest/coverage-v8` 4.1.8 → **4.1.9**
- `playwright` 1.60.0 → **1.61.0** (re-ran `npx playwright install chromium` to match the bundled
  browser — Chrome Headless Shell 149).

No runtime code changed. Full gauntlet + both smokes green on the new tooling (lint · format · test
115 · coverage · build · prod smoke · browser smoke). npm rewrote the lockfile; package.json `^`
floors moved up to the new versions.

- **Status:** built + verified locally; PR open, awaiting CodeRabbit + checks.

## 2026-06-21 — Phase 2: decision docs (v0.6.9, PR #37)

Added three "single home for decisions" docs, mirroring the structure of the existing
[`AUDIO.md`](AUDIO.md) / [`STORY.md`](STORY.md):

- **`docs/GAMEPLAY.md`** — design & balance: principles (kid-fair, skill-honest, pistol-weak-by-design,
  the shared anti-addiction ethics), the core loop, the pillars (progression / combat / enemies /
  bosses / economy / difficulty / feel) with a config-block + ADR map, and "adding content inside the
  canon." Numbers stay in `config.js` (no duplication / no drift).
- **`docs/GRAPHICS.md`** — visual & render decisions: the **honest current baseline** (raw render, no
  post-FX, two-key lighting, emissive-glow identity, fog, the VFX/juice map) plus the **planned**
  post-FX pipeline (bloom + ACES, ADR-0025) and render-studio sections marked as upcoming.
- **`docs/ROADMAP.md`** — the curated later-scope plan (graphics / audio / gameplay / tooling / tech-
  perf / cross-repo), each item with why-deferred + a trigger. Distinct from `BACKLOG.md` (parking
  lot, now noted as feeding the roadmap).
- Wired into `README.md` (doc index), `BACKLOG.md` (pointer), `STATUS.md` (v0.6.9).
- **Status:** docs-only; full gauntlet green; PR open, awaiting CodeRabbit + checks.

## 2026-06-21 — Full Package Upgrade kickoff + Phase 1: audio studio + OGG (v0.6.8, PR #36)

**The effort.** "Full package upgrade for everything" — graphics, tooling, dependencies, and a set of
decision docs — delivered in **phases**, each its own PR, merged only when CodeRabbit and every check
clear (no rushing). Plan locked with Scott: tasteful in-game graphics polish via the pmndrs
`postprocessing` library (selective bloom + ACES tone mapping + a little VFX juice), a full dependency
bump + audit pass, new decision docs (`GRAPHICS.md`, `GAMEPLAY.md`, `ROADMAP.md`), and this worklog.

**Phase 1 — audio studio + OGG migration.**

- New **`scripts/audio-studio.mjs`** dev harness (`npm run audio:report` / `audio:process`):
  per-track **LUFS / true-peak / duration** table + **waveform PNGs** (→ gitignored
  `artifacts/audio/`), and **EBU-R128 loudness-normalize** to −16 LUFS + **MP3→OGG** transcode
  (libvorbis). ffmpeg/ffprobe resolved from `$FFMPEG`/`$FFPROBE` → PATH → the winget install glob.
- Migrated the 7 placeholder tracks **MP3 → OGG**, loudness-normalized to ≈−16 LUFS (they had an 11 LU
  spread, −24…−12.6 LUFS — some ~4× louder than others). Repo audio **58 MB → 33 MB**.
  `config.MUSIC.tracks` now point at the `.ogg` files; MP3s removed.
- Docs: `docs/AUDIO.md` (added the audio-studio section + OGG/−16 LUFS status), `ASSETS.md` (OGG
  filenames + the normalization note), `docs/LEARNINGS.md` (ffmpeg-writes-to-stderr-exits-0 gotcha;
  Howler `html5:true` ranged-stream `ERR_ABORTED` gotcha).
- Removed `pixelmatch`/`pngjs` from this PR (they belong to the Phase 5 render studio).
- Started this worklog.
- **Status:** built + verified locally — OGGs serve HTTP 200 and play, the synth fallback contract is
  intact, full gauntlet green. PR open; awaiting CodeRabbit + checks before merge.
