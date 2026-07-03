# Backlog — Lostsouls

A running parking lot for deferred ideas, known gaps, and out-of-scope items, so the working repo
stays clean and nothing gets lost. Not a roadmap or a promise — just where things wait. Items that
become real intentions get **promoted to the curated [`ROADMAP.md`](ROADMAP.md)**; the running history
of _done_ work lives in [`docs/WORKLOG.md`](WORKLOG.md) / [`docs/LEARNINGS.md`](LEARNINGS.md) and
decisions in [`docs/adr/`](adr/).

> **Light by design (ADR-0005).** This is a fun-first co-designed game; keep the backlog short and
> honest. Don't pad it with process for its own sake.

## Gameplay notes (2026-06-23, Scott — raw observations, not prioritized)

> Dated raw notes from Scott. Overlaps with existing items are noted inline. Promote to ROADMAP when
> scoped. Figures and percentages below are Scott's starting intuitions — treat as tunable, not final.

### Balance / weapon feel

- [ ] **Pierce + bounce combo is too strong.** Bounce should **cancel pierce** by default.
      Later: an upgrade path milestone (e.g., 7 upgrades deep) unlocks a "Combo" tier where they
      work together — scaled and/or capped. Design the unlock trigger when the upgrade path exists.
- [ ] **Homing stops tracking on kill.** When a homing round's target dies, the missile should
      **stop locking and fly straight** until it hits a wall or expires. The next fired homing round
      picks a new target fresh. Current behavior (auto-switch to next target on kill) is too strong.
- [ ] **Homing / rockets / AOE should NOT bounce** — they should explode on contact.
      Railgun should never bounce either. Bounce is for physical projectiles, not explosive/guided.
- [ ] **OP weapons tuned WAY down and made unlockable.** Rocket launcher, homing, heavy AOE
      weapons: low/zero chance to spawn in early runs — locked behind progress/achievements by default.
      Caden loves OP, but he should earn it. _(See existing "Unlockable weapons" item below.)_
- [ ] **Echoes should be WAY lower from boss clears.** First full playthrough should yield ~100
      Echoes total, which is already a LOT — normal bosses should only have a small chance to drop
      them (score-based system to be designed). Design the math when the full economy is scoped.
- [ ] **Perm upgrades (Resonance) are STEEP by intent.** Confirm this is intentional before tuning —
      Scott's design intent is that they're very hard to get. Math to scale TBD once more of the
      economy is built.

### Rarity system rework (upgrade clear screen)

- [ ] **Rarity tiers + correct stat ranges per tier.** Current clear-screen values too high (e.g.,
      15% fire rate on a Common). Scott's proposed ladder (starting point, not final):

  | Tier        | Example bonus | Spawn weight                                     |
  | ----------- | ------------- | ------------------------------------------------ |
  | Common      | ~0.5%         | High                                             |
  | Uncommon    | ~2%           | Medium                                           |
  | Rare        | ~5%           | Low                                              |
  | Ultra Rare  | ~7%           | Very low                                         |
  | Secret Rare | ~20%          | ~0.04% — **never mentioned anywhere in game UI** |

  Secret Rare should be **hinted at indirectly via "luck" flavor** — the player thinks Ultra Rare
  is the ceiling, doesn't know Secret Rare exists until they find one. Do not surface it in tooltips,
  docs, or any UI.

- [ ] **Heal rarity fix.** "Heal two hearts" should NOT be a Common. Full heal → Ultra tier;
      max-HP-restore → Secret Rare tier. Health = the skill/dodge pillar; easy heals undermine it.

- [ ] **DR and HP items gated hard by rarity.** 50% damage reduction = Secret Rare.
      1-hit-invincibility = Ultra Rare. Rarity % should be code-driven by impact score, not static
      assignment. Design the impact scoring system when rarity is scoped.

- [ ] **Half hearts + max 3 hearts.** Add half-heart granularity. Lower max hearts to 3. Ties to
      the "dodge is the skill" design intent. _(Overlaps existing "Lives → %/HP-bar rework" item.)_

### Upgrade system

- [ ] **Per-run weapon material upgrades.** Weapons can be upgraded mid-run with materials (drops,
      rewards). Upgrades do NOT carry over on death — only Echoes and permanent Resonance nodes
      persist. Design the material drop system when weapon upgrade paths are scoped.
- [ ] **Upgrade persistence clarification.** Decide: do in-run upgrades (stat pickups from clear
      screen) reset on death? Document the answer as a design rule.
- [ ] **Stats/upgrade summary in pause menu.** Players should be able to see their current %
      bonuses and stacks mid-run. Add a stats tab to the pause menu.

### Weapons

- [ ] **AI (ally) weapon: limit or remove rerolling.** The AI buddy should not be able to reroll
      its weapon unlimited times at every clear. Options: keep it on pistol permanently with its own
      special abilities (feels distinct from the player), or gate rerolls. Decide when the AI system
      is touched next.
- [ ] **Co-op DPS scaling.** With two players the combined DPS (especially with fire-rate upgrades)
      outscales enemy HP. Tune difficulty to scale with co-op or gate certain weapon bonuses in co-op.
- [ ] **Weapon tiers concept.** Rocket and homing are roughly the same power tier — both exotic/rift-
      tech weapons. Design an explicit tier ladder (Common gun → Rare gun → Exotic/Rift tech) so
      spawn tables and unlock gates make sense.

### World / floor layout

- [ ] **Full floor layout (future big change).** Current: 9 rooms + 1 boss room (linear). Future
      vision: one whole interconnected floor you can move between, with **secrets, hidden areas, and
      shortcuts**. Not scoped yet — deferred until the run structure is revisited. _(Major scope.)_
- [ ] **Projectile variety per enemy type.** Bullets should have different colors, speeds, and
      attack patterns per enemy. Multi-mob enemy types should mirror (not mimic) boss patterns.
      3D model choices for enemy projectiles deferred to Track C asset work.

### NPC system

- [ ] **NPC rework — random spawn, more meaningful.** Current random NPCs feel under-used.
      Vision: each room has a random roll — spawn a Human survivor, a Monster (non-combat, odd),
      OR a Chest. Each has a distinct mini-interaction. _(See existing "Survivor-spawned enemies"
      playtest items above.)_
- [ ] **Future stable NPC characters.** As named characters found inside runs (not floor fixtures):
  - **Shopkeeper** — sells items/upgrades for Echoes mid-run.
  - **Echo Black Market Dealer** — offers a massive temp power spike (e.g., 100% damage boost for
    one floor) at a steep Echo cost (e.g., 100 Echoes). Temp only, expires at floor exit.
    The cost intentionally eats a significant chunk of your permanent-upgrade budget.

### UI / input

- [ ] **Pause menu with options.** Options shouldn't float on the HUD. Pause (P key; ESC to quit)
      opens a proper pause menu. Controller: Start button. _(Overlaps existing "Pause menu for
      options" playtest item — same fix.)_
- [ ] **Controller mapping UI.** In the options/pause menu: controller preset selection, remappable
      controls, keyboard + Xbox listed side-by-side. Current Xbox support is functional but not
      surfaced to the player.

### Game modes

- [ ] **Endless / Horde mode vision.** Floor-after-floor with no pre-set end. Each floor:
      random bosses + mobs, increasing chance of elite/boss-class enemies as floors climb.
      Max 3 bosses on any single floor. Scott's milestone vision:
  - **Floor 1000:** TRUE boss fight (caps the "Endless" climb).
  - **Floor 5000:** Secret ending (hidden goal — don't tell the player).
  - **Floor 10 000:** TRUE TEST — the hardest thing in the game. Unlocked only after 5000.
  - Endless scales stat caps to **999** instead of normal run caps.
  - Name: "Horde Mode" or keep "Endless" — TBD.
- [ ] **Memory-safe floor generation for Endless.** Only load/generate the current floor into
      memory; collapse completed floors. If memory allows, pre-load the next floor. Guard against
      overflow/leak from unbounded loops. _(Tie to the existing deferred "heavy engine perf" section
      when Endless is scoped.)_
- [ ] **Score-based end screen.** After any run: kills per player (P1, P2, AI), deaths, hits taken,
      floor reached, time. Later: speedrun leaderboard / category support.

---

## Playtest follow-ups (2026-06-22, from Scott — fix later)

- [x] ~~**Survivor-spawned enemies don't move** until they touch the player.~~ **FIXED (PR #64,
      2026-06-24).** The `ROOM_CLEAR` branch now runs a guarded enemy-update + dead-filter +
      defeat-check block, so enemies spawned mid-room via `game._resolveSurvivor` actively chase
      instead of reading as inert.
- [x] ~~**Survivor-spawned enemies spawn on top of you.**~~ **FIXED (PR #64, 2026-06-24).** They
      now spawn on a 3–4.5-unit ring at a random angle from the NPC instead of at `npc.x ± 2, npc.z
± 2`; tunables live in `FEEL.survivorSpawnRing` (`config.js`).
- [ ] **No movement OR firing while a "screen" is up.** Scott can still move + shoot while a clear
      screen shows. The B9b `OFFER` modal already fully pauses input; this is about the `ROOM_CLEAR`
      walk-to-door phase (currently movement-enabled by design so you can reach the door) and/or a
      general rule — decide the intended behavior and gate move + fire for every non-`PLAYING` "screen"
      state (may mean replacing walk-to-door with a prompt/auto-advance).
- [ ] **Pause menu for options.** Move the always-on-screen settings (`#settings` panel, bottom-right)
      into a proper **pause menu** (Esc / Start) — options live in the pause menu, not floating on the HUD.

## Known gaps / deferred

- [ ] **Full `Game` step is not in the headless determinism test** — `populateRoom` is
      render-coupled (it builds Enemy/Boss/Npc against the scene), so `tests/determinism.test.js`
      covers the pure RNG _logic_ seams only, not a full stepped game. Reproducibility of the random
      logic is guaranteed; a fuller headless harness is deferred. (Documented in LEARNINGS 2026-06-10.)

## Player-experience principles — parked ideas (2026-06-23)

> Source: a ChatGPT-generated research report (report 10). **Figures and statistics from that source
> were not verified and should not be cited** — the source did not cite its data. These principles
> are retained because they're independently sound game-design ideas, not because the report proved
> them with numbers.

- [ ] **Accessibility from the start, not bolted on.** Remappable controls (keyboard + gamepad),
      colorblind-safe palette check, text/subtitle scaling, multiple difficulty options. Design
      these as first-class concerns, not afterthoughts. _(Overlaps existing "Accessibility" section.)_
- [ ] **Save / cross-device UX.** If the game ever runs on iPad/Switch browser: seamless save
      continuity across devices, quick-resume from exactly where you left off. The `saves.js`
      localStorage schema is the right foundation — design cloud/export sync if/when ports happen.
- [ ] **Co-op polish.** Simultaneous not sequential offers, shared screen feel, clear shared HUD.
      _(Overlaps existing "Co-op simultaneous offers" item.)_
- [ ] **Authentic, human-made art.** Players respond to hand-crafted, unique art over polished
      generic assets. Lean into the Track C monster-design direction (Blender/Rodin, Scott + Caden
      designed) — the personal art beats the generic CC0 placeholder. _(Backs the GRAPHICS/ROADMAP
      Track C direction already in the plan.)_

## Upgrade / meta systems — deferred from B9b (Scott's vision, too big for the offer PR)

The B9b offer screen is intentionally a **small** per-pick nudge; the depth/excitement is meant to come
from a stack of bigger systems layered on later. Parked here so the offer PR stays focused — each
becomes an ADR when picked up.

- [ ] **Luck factor / stat** — biases offer tiers + drop rarity (an in-run and/or meta stat).
- [ ] **Other upgrade sources** beyond the room-clear offer (shops, shrines, events, …).
- [x] **Permanent / meta upgrades** — **DONE (B10, v0.8.15, ADR-0029)**. Echoes + Resonance screen, gated behind first full win. The bigger systems below build on this save schema.
- [ ] **Unlockable weapons** — guns gated behind progress/achievements (vs. all available from the start).
- [ ] **Unlockable characters** — alternate playables unlocked via **achievements**.
- [ ] **Achievements** — the unlock + tracking layer the above hang off.
- [ ] **Challenge / endless / random (modifier) modes** — alternate run rulesets. Endless is why the
      offer curve is "scales almost forever" (small steps that never hard-cap).

### B9b-specific small follow-ups

- [ ] **Co-op simultaneous offers** — B9b presents the two offers **sequentially** (P1 then P2); a
      side-by-side, device-routed version is a polish pass.
- [ ] **Gamepad ally-weapon reroll** — the solo reroll is keyboard/click (`R`) only for now.
- [ ] **Bespoke boss reward screens** — boss rooms still drop a ground HEAL + weapon chest (B8); a
      boss-specific reward/offer screen is later.
- [ ] **Lives → %/HP-bar rework** — the guard + carry damage-reduction work with whole hearts today; a
      finer HP model (half-hearts / a bar) is a bigger change (kept here so the carry-DR opacity is a
      conscious trade, not a gap).
- [ ] **Range upgrade** (bullets use lifetime, not range — not a mechanic yet) and **reload / finite
      ammo** (guns are infinite-ammo for now).
- [ ] **Level-up / XP cadence** as an alternative to the every-room offer.

## Future ideas (parking lot)

- [ ] **Rework the Orbital Blade (playtest feedback, 2026-06-20).** As a standalone weapon it
      "sucks": only 2 blades, doesn't fire, and forces you into contact range so you can't act
      without taking damage. Plan: demote it from a weapon to a **power-up / passive** that adds
      orbiting blades for extra contact damage _on top of_ a real gun — not a slot you're stuck
      with. (Remove from the weapon drop table / `WEAPON_TYPES` when it becomes a passive.)
- [x] ~~**Orbital blade survived a game reset / froze on death.**~~ **FIXED (Stage 6 + Exp 7
      Stage 1).** Reset: blades were `scene.add`-ed but only `_hideOrbital()`-d on weapon swap, so a
      full reset orphaned them — `Player.dispose(scene)` (called from `Game._teardownActors`) now
      removes them. Death: dying mid-run left the blades frozen visible (the adversarial review's
      catch) — `Player.hurt()` now `_hideOrbital()`s on death; they re-show on revive.
- [x] ~~**Dispose AnimModel mixers on room change (Stage 6 cleanup).**~~ **DONE (v0.6.5).**
      `AnimModel.dispose()` (`mixer.stopAllAction()` + `uncacheRoot`) now runs wherever an animated
      boss/minion mesh is removed — `Boss.die`, `Enemy.die`, `loadRoom`'s sweep, the post-boss minion
      sweep, the human-skip path, and the debug kill-all. Geometry/materials stay shared
      (`SkeletonUtils.clone`), clips come from the original gltf, so only the per-instance mixer +
      action cache are freed. (Found by the Stage 4 review, 2026-06-20.)
- [ ] Next-phase expansion content — tracked here as it comes up; promoted to an ADR when decided.

## Audio (ADR-0024 / docs/AUDIO.md — engine + placeholders shipped; finals to follow)

- [x] ~~**Stage tracks + menu wired.**~~ **DONE (v0.6.7, placeholders).** All 5 stages + menu play
      real looping music (CC-BY Kevin MacLeod placeholders); swappable via `config.MUSIC`. Finals
      (curate with Scott's ear, maybe CC0/OGG, distinct genre per stage) still a polish pass.
- [x] ~~**In-game credits surface.**~~ **DONE (v0.6.7).** Start menu → ♪ Credits panel
      (`ui/credits.js`) lists the CC-BY music attributions.
- [ ] **AI boss themes (5).** Bespoke "1950s doom-jazz × Doom" per boss (Stable Audio, full
      ownership) — designed with Caden. Prompts in `docs/AUDIO.md`. Currently the 5 boss slots share
      one placeholder; swap each `boss_*` in `config.MUSIC` when a theme exists.
- [ ] **Final stage-track curation.** Replace the Kevin MacLeod placeholders with the chosen score
      (genre-per-stage); update `ASSETS.md` + `ui/credits.js`.
- [ ] **Win/gameover music stingers** (synth for now) — optional.
- [ ] **Audio polish (deferred):** recorded SFX (currently procedural), adaptive intensity-layer
      stems (calm↔combat), a separate music-only volume slider (master governs both for now).

## Balance — REWORKED in Exp 7 Stage 2 (now Scott's to fine-tune)

- [x] ~~**Stat-cap scaling ramps too fast.**~~ **DONE (ADR-0022).** Upgrades are now a
      diminishing-returns curve (`core/scaling.js statBonus`, knobs in `config.UPGRADES`): each
      pickup adds a stack, power ramps over a whole run, no hard cap-in-3. `CAPS` kept as backstops.
- [x] ~~**Some guns are OP.**~~ **DONE (ADR-0022).** Gentle nerfs: machine gun cooldown 0.07→0.09,
      homing damage 3→2, rocket cooldown 0.8→1.0. Pistol stays weak, shotgun unchanged.
- [x] ~~**Difficulty too kid-fair.**~~ **DONE (ADR-0022).** One `DIFFICULTY` curve (`floorScale`)
      drives the whole run (finale ≈ 2.52× vs old 2.15×); tuned toward BoI/Gungeon/Doom challenge.
- [ ] **Final feel-tuning is Scott's.** The above are sensible _defaults_ — crank `UPGRADES` /
      `DIFFICULTY` / `WEAPONS` in `config.js` (live in `npm run dev`) to taste.

## Polish — entity scale (follow-up after the Stage 6 arena pass)

- [ ] **Fine-tune entity sizes by eye.** Stage 6 enlarged the arena ~2.5× and set a documented
      size ladder (player < basic mob < boss) with a camera that fits the bigger room
      (`docs/adr/0020-*`). The numbers are sensible defaults in `config.js` (`ARENA`, `CAMERA`,
      `PLAYER`, `ALLY`, `ENEMY`) — but final "feel" is Scott + Caden's eyes in `npm run dev`.
      Tweak radii/heights/camera there if anything reads too small or too big.

## Accessibility — easy adds (the store + panel exist now, ADR-0023)

- [ ] **Reduced-shake / "calm camera" toggle** and **high-contrast / colorblind palette** — both
      were offered but not picked this round. `systems/settings.js` + the `#settings` panel make
      them small: add a setting, guard `juice.shake()` (reduced) and swap `PALETTE` (high-contrast).

## Deferred — heavy engine perf (do it when bullets go hundreds → thousands)

> From the 2026 deep-research audit. The repo's bullet system does linear scans and one mesh per
> pooled bullet — fine at our current counts (hundreds), the **first** bottleneck only at thousands.
> Deliberately deferred (Exp 7) so we don't destabilize a working build for speed it doesn't need yet.

- [ ] **Data-oriented projectile store (SoA / typed arrays)** to cut per-bullet JS overhead.
- [ ] **Spatial-hash broad phase** for bullet↔actor and wall queries (replaces the linear scans).
- [ ] **Instanced bullet rendering** (`InstancedMesh`) to collapse draw calls.
- [ ] Optional: asset compression (glTF + KTX2/Draco), `OffscreenCanvas` worker — only if needed.
- **Trigger to revisit:** sustained on-screen bullets approaching the pool ceiling, or frame budget
  blowing past ~16 ms on a target device (watch via the Stage-3 perf HUD).

## Story / narrative (deferred open questions — 2026-06-24)

> These were parked during the lore-locking session that settled the era (1950s) and world history.
> Decide when the time is right; write the answer into `docs/STORY.md` when locked.

- [ ] **Dad & Son names + backstory.** Who are they, and why are they together in the worst place
      on earth? Names, a one-line reason. Caden's call especially.
- [ ] **Final zone / boss beyond the portal.** The other world is described in `STORY.md` — but
      the post-portal act (final zone name, what crossing over means for gameplay + endings) is TBD.
- [ ] **NPC / survivor flavor text.** Survivor names and distinct lines for the in-game interaction
      prompts (help/leave outcomes). Right now they're generic. Even 3–4 names + matching one-liners
      would add a lot of life.
- [ ] **"Living Weapons" rules.** How a weapon wakes up, what it does, is it good or a curse?
      Needed before building the Living Weapons arc.
- [ ] **Survivor ally system design.** Temp companions, escort/quest rooms, trade — the full version
      of the trust mechanic. Design before building.
- [ ] **"Argus Array" as the in-world experiment name.** Operation Argus (1958, real — nukes in
      space) is the best fit for the in-world name of the resonance array. Caden to confirm.

## Narrative system (deferred — design locked 2026-06-24)

> The design for choices, implicit storytelling, and multiple endings was locked in this session
> (see `docs/STORY.md` and the session plan). Implementation is deferred — each item below
> becomes an ADR when picked up.

- [ ] **inkjs integration.** `npm install inkjs` — JS port of Ink narrative scripting. Zero
      extra deps, Vite/browser-native, TypeScript support. API: `new inkjs.Story(compiled_json)`,
      `story.Continue()`, `story.currentChoices[]`. Ink source files (`.ink`) compile to JSON —
      the JSON is what ships. **New ADR required** (new dependency), superseding nothing (no prior
      choice-system ADR).
- [ ] **Persistent `storyState` store.** Small object in localStorage: `trustScore`,
      `loreFragmentsFound`, `runsCompleted`, `crossedOver`. Hook into the B10 meta-progression
      save schema (`saves.js`) once that's been in production long enough to trust.
- [ ] **Survivor dialogue: lore hint pass.** Per-floor survivor lines that hint at (not explain)
      the experiment. 3–4 lines per floor, written to the "survivors don't explain, they hint"
      rule in `STORY.md`.
- [ ] **Environmental lore objects.** Room decorations + prop types: scorched schematics,
      government crates with operation codenames, resonance device fragments. Mesh + placement
      system. Lore text (if any) is one line: a label, a warning, a stencil — never exposition.
- [ ] **Multiple endings: A / B / C.** Spec in the session plan. A (Close It — default),
      B (The Truth — `loreFragmentsFound >= threshold`), C (What We Are — trust + lore). Each
      ending is a different post-portal sequence. Requires inkjs + storyState.
- [ ] **Other world zone (post-portal gameplay).** Crossing the rift currently ends the run.
      A post-portal act — the final zone on the other side — is its own track. Scope separately.
- [ ] **Hades-style run progression.** Story advances every run (win or loss). NPCs reference
      previous runs. Requires inkjs + storyState `runsCompleted` counter.

## Cross-repo / org

- [ ] **Dedicated logging repo (org-wide idea).** Scott wants a single repo just for logs/history
      later, to keep the game and other repos clean. Out of scope here; logged so it isn't lost.
