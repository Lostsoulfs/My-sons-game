# Learnings

Running log of gotchas, fixes, and API surprises. Append (don't rewrite) with the date.
Referenced by the Working Agreement (`AGENTS.md` #2).

## 2026-06-07 — project bootstrapped

- Stack chosen and recorded in `docs/adr/0001`–`0005`.
- Three.js `CapsuleGeometry` exists in modern three (≥ r142) — used for the player/ally.
- Pure-logic modules (`core/rng.js`, `core/math2d.js`, `systems/npcDecision.js`) import
  **nothing** from `three`, so Vitest runs them in plain Node with no DOM/WebGL.
- Asset seam: the game must run with an empty `public/models` + `public/audio`. Always
  fall back to primitives/silence — never throw on a missing asset.

## 2026-06-07 — Expansion 1 (bosses, items, lives, sound, controller)

- v1 squash-merged to `main`; for the expansion PR, reset the feature branch to
  `origin/main` first so the diff is only the expansion (squash-merge diverges history).
- Web Audio is blocked until a user gesture — must `resume()` the AudioContext on the
  first click/keydown (`{ once: true }` listeners in `main.js`). Built a tiny in-code
  synth (`systems/sfx.js`) instead of shipping audio files; dropped the `howler` dep.
- Gamepad API: poll `navigator.getGamepads()` every tick (don't cache the object); the
  pad only appears after a button press. Edge-detect buttons for one-shot actions.
- The survivor "E does nothing" report: the path was fine — fix was UX (bigger interact
  radius 2.6→3.4, banner+hit-stop feedback, gamepad A) and it's now covered by a
  headless test that stands on a survivor, presses E, and asserts the outcome applied.
- Exposed `window.__game` as a debug handle — also lets the headless smoke test drive
  scenarios deterministically (spawn a pickup, jump to the boss room, etc.).
- Boss/enemies share one interface (`x,z,radius,hp,dead,update,hurt(dmg,game),die(game)`)
  so the existing pooled-bullet collision works on the boss with no special-casing.

## 2026-06-07 — Expansion 2 (the co-designer's boss patterns + polish)

- the co-designer beat the whole game first try (died twice); difficulty "medium = good", keep it.
- His terminology: **"P# = an attack pattern"**, not a health phase. Boss attacks rebuilt as
  P1 (aimed burst) / P2 (telegraphed bullet ring, scales by floor) / P3 (HP-gated spiderling
  spawns via the pure, tested `spiderlingTarget(hpFrac)`).
- Web research takeaway baked in: **telegraph attacks** (a wind-up before the ring) is the #1
  fairness rule — keep hit-stop tiny (~20–60ms), reserve big shake for explosions/boss death.
- "Starting weapon should be weak" is real design wisdom — slowed the pistol (cooldown
  0.16→0.26) so pickups feel powerful. Confirmed via roguelite-progression sources.
- More procedural SFX added in `sfx.js` (rocket launch/boom, door/room-clear, boss roar +
  attack cues, low-health heartbeat) and the drone music rises ~2 semitones per floor.
- Tag boss adds with `isSpiderling` so the boss can count its own live spawns to maintain
  the HP-gated target.

## 2026-06-07 — Expansion 3 (bug fixes, theming, debug menu, probability)

- **"E doesn't work" was real**: `_handleSurvivors` only ran in `State.PLAYING`, so you
  couldn't help survivors after clearing a room (when it's calm — exactly when you try). Fix:
  also run it in `ROOM_CLEAR`. (Combat-only help is now a future hard-mode toggle.)
- **"Stuck going up"**: a held key's `keyup` is lost when the window/tab loses focus (common
  in the VS Code Simple Browser), so the key stays in the Set. Fix: `input.clearKeys()` on
  window `blur` + `visibilitychange(hidden)`.
- Extracted `buildSpiderMesh` into `entities/spiderMesh.js` (palette + `simple` mode) so the
  boss AND themed mini-spider enemies share it without a boss↔enemies import cycle. Floor
  palette in `PROGRESSION.floors[].palette` is shared by the boss and its monsters.
- Pickups now carry a camera-facing canvas `Sprite` label (`core/textSprite.js`,
  `depthTest:false`) + distinct shapes — readable with no pickup key.
- Debug menu = `lil-gui`, lazy-loaded only on `?debug=1`/backtick (never in normal play);
  drives `window.__game`. God mode = a `game.godMode` flag checked in `Player.hurt`.
- Probability: `core/probability.js` `atLeastOne` (1−∏(1−p)) is from the project owner's Dokkan notes;
  `droprate.test.js` verifies the real drop table with seeded sampling + chi-square + ±10%
  (deterministic, no flake). Methodology ported from `testing-kits` harness patterns.
- Drive recon: the April Dokkan docs are mostly unit stats; only the RNG/probability section
  was useful (independent-probability formula, ±3% variance). Looked, used the bit that fit.

## 2026-06-07 — Expansion 4 (2-player co-op + start menu)

- **Stuck-key bug round 2:** the Exp-3 blur fix didn't catch clicking the lil-gui panel
  (window keeps focus, so the keyup is swallowed by the control). Real fix: capture-phase
  key listeners (see releases first), ignore keys when an editable element is the target, and
  release held keys on any `pointerdown` outside the canvas. Verified headlessly.
- Input is now **device-aware** (`'kb'|'pad'|'both'`) so two players share one Input; right-
  stick aim persists. `Player` takes `{color, modelKey, device}`; co-op uses the green "ally"
  mesh as P2 and skips the AI `Ally`.
- Co-op targeting via `game.nearestPlayer(x,z)`; enemies/boss/bullets/pickups/survivors all
  go through `game.players`. **Revive-on-room-clear**, full-wipe spends a shared life.
- Start menu = a plain DOM overlay (`#startmenu` + `ui/startmenu.js`); `game.init()` no longer
  auto-starts — the menu calls `game.startRun(coop)`. Clicking a button also unlocks audio.
- Gamepad rumble via `vibrationActuator.playEffect('dual-rumble', …)`, feature-detected.
  Confirmed W3C standard Xbox mapping is current (One S+/Series identical).
- Headless can't feed real gamepad input, so we verified the device split + co-op logic
  (players array, nearest-target, down/continue, revive, team-death) by driving `window.__game`.

## 2026-06-08 — Expansion 5 Stage 1 (weapon slots + caps)

- `Player` now carries weapons in `slots[]` (capacity `slotsUnlocked`, grows via bosses);
  pickups `addWeapon` (fill empty slot, else replace active); switch P1 `1/2/3`, P2 controller Y.
- All stat upgrades are capped in `config.CAPS` (lives 3→5, damage ×1.5, fire-rate floor 0.5,
  speed ×1.5; ~3 stacks each). Damage became a multiplier (`damageMul`); base weapon damage
  unchanged. Survivor DAMAGE_UP retuned to +20% to match.
- Full-health players skip HEAL pickups (left for a hurt teammate). `weaponSlotsForBosses` is a
  pure, unit-tested helper (unlock at 2/10/20, cap 3). Verified caps/slots/HEAL headlessly.
- Staging Expansion 5: this is Stage 1; next = human decision-boss, then data-driven endless.

## 2026-06-10 — maintenance pass (deps, ESLint 10, action pins, SECURITY.md)

- `npm update` won't cross minors on `^0.x` deps (semver treats `^0.x` like `~0.x`) —
  three needed an explicit range bump `^0.180.0 → ^0.184.0`. Game code needed zero changes
  for three r184; all 47 unit + 7 proof tests and the build pass unchanged.
- **ESLint 9 → 10 was a no-op here**: v10 requires flat config, which this repo already had,
  so `eslint@10.4.1` + `@eslint/js@10.0.1` lint clean with the existing `eslint.config.js`
  (no `globals` changes needed). ESLint 9.x is EOL 2026-08-06. Kept at ^10.
- Workflow action pins refreshed (Node-20-era v4 actions are deprecated; runners default to
  Node 24 from 2026-06-16): checkout v4→v6.0.3, setup-node v4→v6.4.0, upload-artifact
  v4→v7.0.1, codeql-action →v4.36.2, dependency-review-action v4.0.0→v5.0.0. Gotcha:
  `git ls-remote ... refs/tags/vX.Y.Z` may return an annotated tag object — pin the peeled
  `^{}` SHA when present (checkout, codeql-action); lightweight tags point at the commit
  directly (setup-node, upload-artifact, dependency-review).
- `uvx zizmor` flagged all three workflows for `artipacked` (checkout defaults to
  `persist-credentials: true`); fixed with `persist-credentials: false` — nothing here pushes
  back to the repo. Remaining zizmor findings only appear at auditor/pedantic personas
  (undocumented-permissions comments, unnamed jobs, one excessive-permissions) — left as-is.
- Vite chunk-size warning quieted via `build.chunkSizeWarningLimit: 1024` — the Three.js
  bundle (~604 kB / 157 kB gzip) is intentionally one chunk for a single-page game.
- Added `.node-version` (22) alongside `.nvmrc` (some tools only read one), and a minimal
  `SECURITY.md` (private vulnerability reporting via the Security tab; no-auth no-PII game).
- AGENTS.md still claimed howler.js for audio — stale since Expansion 1 dropped it for the
  procedural synth (`systems/sfx.js`, ADR-0006). Fixed; lesson: stack lists in AGENTS.md
  drift silently when deps change.
- Vitest coverage thresholds (40/40/30/40) came in with the proof-backed CI gate
  (PR #7, 2026-06-09) and only gate the pure-logic `include` list — documented in a comment.
  Current coverage sits just above the floors (42/35/50/42), so they're a real regression gate.

## 2026-06-10 — research fold-in: seeded runs + determinism (ADR-0013)

- Four Gemini "deep dive" docs were reviewed for useful additions. Three (AI-dev
  trustworthiness, solo-repo security, advanced testing) cite **unverifiable,
  future-dated sources** (`arXiv:2603.*`, "ICLR 2026", tools like _ClaimCheck/
  Lore_) — treated as **RESEARCH_ONLY**, judged by concept not citation. The
  gaming-math doc's sources are real (GLI-19, NIST, `scipy.stats.binomtest`).
- **The research mostly VALIDATED what's already here** — don't "rediscover" it:
  seeded `mulberry32` (`core/rng.js`); the drop-rate chi-square test with a
  **planted-bias proof control** (`droprate.proof.test.js`); a fixed-timestep,
  decoupled loop (`core/loop.js`). The genuine gaps were (a) no way to pin a
  run's seed and (b) no cross-system determinism check.
- Added: optional `seed` on `startRun` (default unchanged) so a run is replayable
  via `window.__game.startRun(false, N)`; and `tests/determinism.test.js` driving
  the real pure rng seams (`dropRandomPickup`, `resolveDecision`, spawn rolls)
  through one shared rng. `populateRoom` is render-coupled (builds Enemy/Boss/Npc
  with the scene), so the full `Game` step stays out of the headless test — the
  guarantee covers the random _logic_, which is what reproducibility needs.

## 2026-06-11 — secret/PII gate added (cross-repo hardening pass)

- This repo now carries the PII-blocking scanner variant (public-repo policy):
  `tools/scan_staged.py` + `.githooks/pre-commit` + `.github/workflows/scan.yml`.
  The SessionStart hook activates `core.hooksPath` on web sessions.
- Verified end-to-end, not just self-test: a planted AWS key staged in this
  repo was blocked by the real pre-commit hook (exit 1), then cleaned up.
- The scanner family diverges deliberately across repos: public repos BLOCK
  PII, private-tier repos WARN only — read the module docstring before
  "fixing" the difference.

## 2026-06-20 — Expansion 6 Stage 1 (data-driven bosses + 5 guns + 9-room floors)

- **Boss refactor (ADR-0014):** `boss.js` is now a generic, type-driven shell;
  per-boss logic lives in `entities/bosses/<type>.js` (spider extracted verbatim,
  plays identically). Add a boss = add `config.BOSS[type]` + a behavior module +
  register in `bosses/index.js`. `spawner.js` passes `info.def.boss`. The duo
  (two bosses) still needs `game.boss → game.bosses[]` — deferred to Stage 3.
- **New bullet flags (ADR-0015):** `pierce` (with a per-bullet hit-set so it never
  double-hits one enemy), `homing` + `turnRate` (steer via the new pure
  `turnAngle()` — capped turn = a perpendicular juke escapes it), `bounces`
  (axis-separated wall reflection), plus per-bullet `life`/`scale`/`color`. All in
  the one pooled `update()`. Color needs a tiny material cache (shared mats can't
  carry per-bullet color).
- **Charge + Orbital are player-side, not fire-on-cooldown.** Charge tracks hold
  time and auto-fires at full charge (kid can just hold). Orbital keeps contact
  blades with a per-enemy hit cooldown. KNOWN: orbital blade meshes are world-space
  scene children and aren't torn down on restart — minor leak, flagged for Stage 6.
- **Tests had to change with the design:** floors went `5+1 → 9+1`
  (`roomsPerFloor`), so the progression unit/proof tests and the determinism
  transcript were updated to `9+1`. The drop-table now has 12 categories (df=11) —
  bumped the χ² bound to 24.725 and N to 40000 for a stable seeded check. Exported
  `WEAPON_TYPES` from `pickups.js` so the boss-reward test + debug menu stop
  hand-copying the weapon list.
- **Pre-existing bug fixed:** opening `?debug=1` at boot crashed `initDebugMenu`
  (`game.player.weapon` read before `startRun` creates players). Guarded with
  `game.player?.weapon ?? 'pistol'`. Found via a Playwright drive of `window.__game`.
- **Verified:** lint/format clean; 54 unit tests; coverage 43/37/51/44 (> floor);
  build + prod smoke; a Playwright drive fired all 5 guns, ticked bullets, spawned
  the refactored spider, and confirmed zero console errors.

## 2026-06-20 — Expansion 6 Stage 2 (mushroom boss 🍄 + ground hazards + animated GLB models)

- **Mushroom boss (ADR-0014 pattern):** `bosses/mushroom.js` — P1 spore spit, P2
  spore ring with a seeded dodge gap (`game.rng.int(n)`), P3 telegraphed poison
  pools, P4 HP-gated puffballs via pure `puffballTarget()` (unit-tested) that pop
  into a pool on death (new generic `Enemy.onDeath` hook). New "The Fungal Depths"
  floor; mini-mushroom minions via `enemies.js` theme branch.
- **Ground hazards (ADR-0016):** `systems/hazards.js`, pooled like bullets;
  telegraph→lethal flat discs; owned by Game, cleared on room load/clear.
- **Animated GLB models (ADR-0017) — two non-obvious skinned-mesh gotchas, both
  found by DRIVING the real build with Playwright (not unit tests):**
  1. **Invisible #1 — frustum culling:** skinned meshes keep a bind-pose bounding
     sphere that doesn't follow the bones, so three.js culls them off-screen.
     Fix: `frustumCulled = false` on the model's meshes (in `AnimModel`).
  2. **Invisible #2 — `Box3.setFromObject` lies on skinned models:** it read the
     bind/bone extents as ~206 units, so `fitTo` shrank the mushroom to a
     **0.05-unit speck**. Fix: measure the union of MESH `geometry.boundingBox`
     transformed by world matrix instead. After both fixes the boss renders ~3–5
     units and minions ~1.9.
  - **Cloning:** animated/skinned GLBs MUST use `SkeletonUtils.clone`
    (`three/addons/utils/SkeletonUtils.js`), never `Object3D.clone` (the clone
    won't rebind to its own skeleton). Each instance needs its own mixer; clips
    come from the original `gltf.animations`. Quaternius clip names are prefixed
    `CharacterArmature|` — strip it.
  - Models: Quaternius **Mushroom King** + **Mushnub**, CC0, in `public/models/`,
    credited in `ASSETS.md` (committed; ~500 KB, under the 1 MB hook limit).
- **Verified:** lint/format; 61 unit tests (added `puffball`, `animmodel`);
  coverage 47/41/54/48; build + prod + browser smoke; a Playwright drive confirmed
  the mushroom boss + 6 themed minions render & animate, pools + puffballs spawn,
  spider unchanged, zero console errors; full security gauntlet green.

## 2026-06-20 — Expansion 6 Stage 3 (Dog/Cat duo 🐶🐱 — the first MULTI-boss)

- **Multi-boss refactor (ADR-0018):** `game.boss → game.bosses[]` (0/1/2 entries).
  Single-boss floors are just `bosses.length === 1`, so spider/mushroom are
  untouched (regression-checked: spider still shows one bar). Minion sweep + the
  room-clear gate now fire only when **every** boss is dead; `_countBossBeaten`
  still +1 per boss room, so the duo is one encounter for slot-unlock cadence.
- **`DuoController` (`bosses/duo.js`) is pure of three.js** (operates on boss-like
  objects), so the locked rules are unit-tested directly: alternating aggression
  (timer swap; each behavior gates its attack starts on `isAggressor(boss)`),
  enrage-on-partner-death (no revive; `boss.onPartnerDown(mul)` folds a permanent
  multiplier into the shared `rage` getter), and seeded co-op targeting
  (`chooseTarget(players)`, held until the next swap). Keeping it three-free is
  what makes it testable — same pattern as the `progression.js` helpers.
- **Two beasts, two rhythms:** Fang (dog) is a melee **pounce** state machine in
  `move()` (stalk→wind/telegraph lane→dash→recover); Whisker (cat) is a ranged
  **cross-swipe** zoner that summons a small kitten litter **while passive** (so
  one pressures while the other adds). Both override the shell `move()` and so must
  redo wall-slide + arena-clamp themselves (the shell only sets `mesh.position`).
- **HUD multi-bar:** `#bossbar` (one element) → `#bossbars` container with two
  `.bossbar` rows; `hud.setBossBars(bosses)` fills 1 or 2 (cat bar is cool-blue,
  dead boss greys at 0%). Names use `textContent` (no innerHTML).
- **GLB clip-prefix is NOT always `CharacterArmature|`:** the Quaternius animals use
  `AnimalArmature|Walk`, and the cat is even **triple-prefixed**
  (`AnimalArmature|AnimalArmature|AnimalArmature|Walk`). `AnimModel` already strips
  on the LAST `|` (`split('|').pop()`), so both resolve to `Walk` with no change —
  the generic split was the right call in Stage 2. Verified the real clip list by
  parsing the GLB JSON chunk (`readUInt32LE(12)` → JSON) before wiring.
- **Preview serves `dist/`, dev serves `public/`:** dropping the GLBs into
  `public/models/` after `npm run build` left the _built_ `dist/` without them, so a
  `vite preview` drive rendered the **procedural fallback** beasts (not a bug — the
  fallback working is the point). Rebuild after adding assets, or drive the dev
  server. Also: Chromium blocks "unsafe" ports (5060 = SIP) for `page.goto` — use
  4173/5173/8080.
- **Models:** Quaternius **Shiba Inu** (`dog.glb`) + **Cat** (`cat.glb`), CC0, in
  `public/models/`, credited in `ASSETS.md`. The duo doesn't have to _look_ like a
  cat/dog (co-designer's call) but recognizable animals delight the kid.
- **Verified:** lint/format; 66 unit tests (added `duo`); coverage 47/41/54/48
  (> floor); build + prod + browser smoke; a Playwright drive confirmed two bosses
  - two HP bars render with the real animated models, the cat summons a kitten,
    killing one beast enrages the survivor + greys its bar, spider single-boss
    unchanged, zero console errors.

## 2026-06-20 — Expansion 6 Stage 4 (skeleton boss 💀 "Rattlebones")

- **New boss on existing systems (no new ADR needed):** `bosses/skeleton.js` — P1
  aimed bone-bolt volley, P2 scatter ring (even ring + seeded per-bone jitter via
  `game.rng.next()` = a dodgeable "scatter"), P3 reassemble & relocate, P4 HP-gated
  bonelings via pure `skeletonWaveTarget()` (unit-tested; tops out at 4 — the skeleton
  is the summoner). New "The Catacombs" floor; bone-white minions via the `enemies.js`
  theme branch.
- **Reassemble/teleport = one reusable shell flag.** Added `boss.invuln` to the generic
  Boss shell: `hurt()` early-returns AND the contact-damage check is skipped while it's
  true. The skeleton sets it for its collapse→vanish→reform beat (a free breather +
  i-frames), reusing one `reassembleTimer` for both the interval-between and the
  gone-duration. Drove it headless: `hurt()` during the window did nothing, then it
  reformed far from the players.
- **Config-first this time (Scott's feedback):** every skeleton feel-number went into
  `config.BOSS.skeleton` from the START (timings, scatter jitter, teleport margin,
  boneling scale/hp, spawn ring) — no end-of-PR rework. Construction ratios
  (skeletonMesh.js) and the SFX recipe (`bossRattle`) stay inline by the established
  split (spiderMesh/mushroomMesh/sfx precedent). See the `config-tunables-upfront` note.
- **Quaternius GLB clip names can be DOUBLY mangled:** this skeleton's clips are
  `CharacterArmature|CharacterArmature|CharacterArmature|Walk|CharacterArmature|Walk`.
  `AnimModel`'s `split('|').pop()` still yields `Walk`, so it Just Worked — the
  strip-on-last-`|` choice keeps paying off across every model (mushroom
  `CharacterArmature|`, animals `AnimalArmature|`/tripled, skeleton this). Confirm clip
  names by parsing the GLB JSON chunk (`readUInt32LE(12)` → JSON) before wiring.
- **Models:** Quaternius **Skeleton** (Ultimate Monsters, CC0) in `public/models/`,
  credited in `ASSETS.md` (~791 KB).
- **Verified:** lint/format; 69 unit tests (added `skeletonwave`); build; a Playwright
  drive — boss renders + animates (sword in hand), P1/P2 fire, bonelings rise at ≤50%
  HP, the reassemble i-frames block damage then it reforms, single-boss bar unchanged,
  0 console errors.

## 2026-06-20 — SonarCloud duplication gate vs. a content-growing game (the fix-loop)

- **Symptom:** PR #25 failed SonarCloud's `new_duplicated_lines_density` (>3% on new
  code) repeatedly. Each extraction (GLB load → `loadAnimated`, minion top-up →
  `topUpMinions`) only dropped it a notch (3.7→3.6→3.4) because removing duplicated
  lines also shrinks the denominator — classic small-PR whack-a-mole.
- **Root cause, found by a full audit (not guessing):** the remaining blocks are
  DELIBERATE parallelism — each boss behavior module mirrors the last (P1 aimed
  burst, P2 telegraphed ring, etc.). That's a readability choice (each boss = a
  self-contained card), not a defect. The genuinely shared plumbing was already
  extracted into `loadAnimated`/`topUpMinions`; extracting further would over-DRY
  and hurt the modules.
- **Durable fix (config, not more extraction):** added `sonar-project.properties`
  with `sonar.cpd.exclusions=src/entities/bosses/**,src/config.js,tests/**` (+
  coverage exclusions). SonarCloud runs via **Automatic Analysis** (no CI scanner
  workflow — the GitHub App), which reads this file; it scopes DUPLICATION only
  (bugs/security/smells/complexity still apply everywhere). This is sanctioned
  Sonar config, not gaming the gate — duplication across intentional parallel
  content/data/tests isn't a real defect.
- **Optional dashboard belt-and-suspenders (Scott):** SonarCloud → project →
  Administration → enable "Ignore duplication and coverage on small changes" (the
  <20-new-line fudge factor) so genuinely tiny future PRs never trip it either.
- **Other 2026 gate pitfalls to pre-empt:** security hotspots fail the gate when
  UNREVIEWED (not when buggy) — mark them Safe/Acknowledged in the PR; the
  zero-fraction (`N.0`) and "prefer optional chain" smells are easy to avoid up
  front; fix all inline Sonar comments in ONE pass instead of push-fail-push.

## 2026-06-21 — Expansion 6 Stage 5 (the Human DECISION-boss 🚪 — the finale)

- **First "pause for a UI choice" boss (ADR-0019):** a nervous survivor; you pick an
  approach (A/B/C/D) before any fight. Added a real `State.HUMAN_CHOICE` — since
  `game.update` only ticks entities in `PLAYING`/`ROOM_CLEAR`, the fight pauses for
  free while the overlay is up (no scattered `if (paused)` checks). `loadRoom` enters
  it when `info.def.boss === 'human'` instead of the "KILL IT" banner.
- **The reward is the EXISTING boss-clear path — zero new slot logic.** A right read
  removes the un-fought boss and calls the unchanged `_onRoomClear` (→ `_countBossBeaten`
  → `weaponSlotsForBosses` → `setSlotsUnlocked`); a wrong read fights then funnels into
  the same path on death. The human counts as one boss either way, so the
  `CAPS.slotUnlockBosses` cadence can't drift. Verified the slot grant by driving both
  branches (slotsUnlocked 1→2) with `g.rng.chance` stubbed to force each outcome.
- **Seeded resolver, label is no tell (ADR-0013):** `systems/humanDecision.js` clones
  `npcDecision.js` — `resolveHuman(rng, choice)` consumes exactly one `rng.chance(rightChance)`
  (config knob, 0.25). Which choice is "right" is pure RNG, never tied to the label, so
  it can't be memorized — same spirit as the survivor help/leave gamble.
- **Config-first paid off — CodeRabbit/Sonar surface stayed tiny:** every feel-number
  in `config.HUMAN_BOSS` / `config.BOSS.human` from line one; the boss reuses the shared
  primitives (`aimedBurst`/`telegraphedRing`/`topUpMinions`/`loadAnimated` + procedural
  `makeCharacter` fallback) so there's no new duplication; the overlay reuses the
  start-menu DOM + button CSS. No end-of-PR rework loop this time.
- **Dev-server port gotcha (cost a wasted drive):** orphaned `vite` processes held
  5173/5174, so a fresh `npm run dev` silently moved to **5175** — the drive hit the
  stale 5173 (old `index.html`, no `#humanchoice`). Always confirm the port from the
  dev-server log (or `curl | grep` for a new element) before driving; kill orphans.
- **Final floor order set:** `spider → human → mushroom → duo → skeleton` (tight 5-floor
  run; dropped the 2nd/3rd spider floors per Scott+Caden). `tests/floors.test.js` locks
  the order + monotonic diff. Model: Quaternius **Animated Human** (CC0, `Human Armature|`
  prefix — `AnimModel`'s strip-on-last-`|` handles it).
- **Verified:** lint/format; 80 unit tests (added `humanDecision`, `humanrally`, `floors`);
  build; a Playwright drive of BOTH branches (overlay + labels, right→skip+slot+door,
  wrong→fight+lose-line, animated human renders) with 0 console errors.

## 2026-06-20 — Expansion 6 Stage 6 (polish: story bible, roomier arenas, scale pass, orbital fix)

- **Wrote the story down so the theme can't drift (`docs/STORY.md`).** Scott + Caden's
  canon: **mid-to-late 1950s ruined city** (Cold War paranoia + civil war), an **experiment-gone-wrong rift** at the center
  that keeps spawning (harder toward the core; you win by **crossing over**), distrustful
  **survivors who help only temporarily** (already realized as the Human decision-boss),
  WW2-era guns that fuse with rift-tech and can **come "alive,"** and a hard rule:
  **NO zombies** (other undead + demons only). Includes a roster→story table and an
  Open-Questions list (name of the other side, the "Living Weapons" rules, ally system).
- **Roomier arenas without changing the action (ADR-0020).** `ARENA` 40×30 → **64×48**
  (~2.56× area). The trick: **leave all speeds unchanged** — more space _relative to_
  movement/bullet speeds is what actually buys dodging room. Everything but the camera and
  entity sizes already derived from `ARENA` (walls/door/ground/grid/spawns), so it scaled
  for free. **Gotcha:** `scene.js` fog was hardcoded `45–90` and would've fogged out the
  bigger back wall — now derived from camera distance + arena span.
- **Camera fits the whole room (not a follow-cam).** `CAMERA.height/back` 30/18 → 48/29
  (same ×1.6 as the arena) keeps the entire room on screen — chosen over a follow-cam
  because **seeing every bullet is fairer for a kid**. Trade-off: sprites are a bit smaller
  on screen; offset by the size bumps + parked as a `config.js` feel-dial.
- **Size ladder (threat reads by size).** player/ally 0.7→0.85, chaser 0.85→1.05, shooter
  0.95→1.2; bosses untouched (Scott: fine). `tests/scale.test.js` locks player < chaser <
  shooter < every boss so it can't silently regress. `radius` is draw-size AND hitbox, so
  bumps stayed gentle.
- **Orbital-blade reset bug (Scott's report) fixed.** The blades are `scene.add`-ed but
  weapon-swap only `_hideOrbital()`-d them, so a full reset orphaned them in the scene at
  their last spot. Added `Player.dispose(scene)` (removes + disposes the blade meshes),
  called from `Game._teardownActors`. Same teardown gap as the parked AnimModel mixer leak.
- **Parked, NOT changed (Scott's call):** stat-cap scaling ramps too fast / some guns
  (machine gun, homing, rockets) feel OP — noted in `BACKLOG.md` to tune later, because
  changing balance mid-stream is how we'd rework twice. Pistol weak by design, shotgun fine.

## 2026-06-21 — Expansion 7 Stage 1 (emitter library + de-samey attacks + canon fix)

- **Pure pattern library `bosses/emitters.js` (ADR-0021).** Angle-array generators
  (`ring`/`gapRing`/`jitterRing`/`star`/`nWay`/`arc` + `dirsFromAngles`) — no THREE, no
  game state, so they unit-test trivially and a new attack is a one-liner. Folded the
  5–6 duplicate "fire a ring" closures (spider/mushroom/skeleton/human/cat + the basic
  enemy shooter) onto it via a new `patterns.fireAngles` spawn helper.
- **Behavior-preserving refactor — the key was the angle convention.** The whole game
  uses `dir = (sin a, cos a)` (a=0 → +z), so the generators return angles in THAT
  convention and the bullet directions came out byte-identical for spider/mushroom/
  skeleton/cat/shooter. The seeded seams matter: `jitterRing` calls its `rng` once per
  bullet in order (passed `game.rng.next`), and mushroom's gap still uses `game.rng.int(n)`
  first — so determinism tests stayed green with zero changes.
- **De-samey (Scott's ask).** The human boss's P2 was literally a copy of the spider's
  plain ring. Changed it to an aimed **panic-spray cone** (`nWay`, new config
  `BOSS.human.p2SprayDeg`) — dodged by strafing, not by threading a ring. The five ranged
  bosses now read distinctly: spider=rotating ring, mushroom=gap ring, skeleton=scatter,
  human=aimed spray, cat=cross/X.
- **Telegraph legibility, the cheap+safe slice.** Bumped the wind-up puff (1.25 → ~1.4 +
  a pulse) in the boss shell. Deliberately did NOT add a ground-ring telegraph yet: a new
  scene-mesh per boss would reintroduce the exact teardown-leak class the Stage-6 review
  caught (loadRoom only `scene.remove`s `e.mesh`). The leak-safe ground ring lands with the
  hitbox/danger overlay in Stage 3.
- **Carry-overs from the adversarial review, folded in:** orbital blades froze visible on
  _death_ (not just reset) — `Player.hurt()` now `_hideOrbital()`s on death (re-shows on
  revive); `package.json` ↔ STATUS version re-synced; size-ladder comment fixed to `2.0–3.0`
  (cat is the smallest boss at 2.0); noted minion size derives from `ENEMY.chaser.radius`.
- **Story canon fix (Scott corrected CodeRabbit).** CodeRabbit read "1940 + post-WW2" as a
  contradiction; at the time the intent was no WW2. Later expanded (2026-06-24): WW2 did
  happen → American government cracked down → **people-vs-government civil war** in the
  mid-1950s, era anchor now **1950s** (Cold War paranoia fits the nuclear origin better).
  Lesson: when a linter flags a "contradiction" in creative canon, confirm intent with the
  humans before "fixing" — and leave room for the canon to evolve.

## 2026-06-21 — Expansion 7 Stage 2 (scaling math: upgrades + difficulty)

- **Two pure curves in `core/scaling.js` (ADR-0022), all knobs in config.** The "feel
  math" Scott asked for, testable + tunable in one place.
- **Upgrades = diminishing returns, not a hard cap.** `statBonus(n, maxBonus, half)
= maxBonus*n/(n+half)`. Switched the player from running clamped values to STACK
  COUNTS (`_up.{damage,fireRate,speed}`) recomputed via `_recomputeUpgrades()`. So a
  pickup adds a stack and the stat eases toward the asymptote — verified in-browser:
  damage 3 stacks = ×1.375 (was a ×1.5 wall), still climbing to ×1.71 @12 → ×2.0.
  `CAPS` are now just safety backstops at the asymptotes; `PICKUPS.*Amount` step
  sizes deleted (stack-driven now). Survivor stat rewards add one stack each
  (magnitude-agnostic) — consistent with pickups.
- **Difficulty = one curve for the whole run.** `floorScale(i, {base, growth}) =
base*(1+growth)^i`. Removed the hand-set per-floor `diff` from `PROGRESSION.floors`
  and compute it in `floorInfo()` (× an optional per-floor `diffMul` spike). Gotcha:
  the spawner read `info.def.diff` — moved the source of truth to `info.diff`, so all
  three call sites (two boss spawns + the enemy-count formula) now read the computed
  value. Defaults base 1.0 / growth 0.26 → floors ≈ 1.0, 1.26, 1.59, 2.0, 2.52
  (finale clearly harder than the old 2.15; early floors ~unchanged).
- **Net feel = intentionally harder.** Early game is a touch tougher (you ramp slower)
  and late game is both stronger AND harder — the BoI/Gungeon/Doom target. Several
  levers move at once (upgrade ramp + difficulty + gun nerfs), so the numbers are
  _defaults for Scott's playtest tuning_, isolated behind config blocks so he can dial
  each independently.
- **Test seam:** floors.test.js used to assert each floor object had a numeric `diff`;
  now diff is curve-derived, so it asserts the ramp via `floorInfo(i*roomsPerFloor()).diff`
  instead. golden-value tests for both curves in scaling.test.js.

## 2026-06-21 — Expansion 7 Stage 3 (feel & dev tools: settings, overlays, perf HUD)

- **First localStorage in the repo (ADR-0023):** `systems/settings.js` is a tiny shared
  store ({volume, muted, showHitboxes}) with a subscribe hook, wrapped in try/catch so it
  degrades to defaults in private mode / headless (never throws). main.js subscribes and
  pushes volume/mute into audio; a bottom-right `#settings` DOM panel + `M`/`H` keys drive it.
- **Volume/mute the clean way:** sfx.js keeps `masterVolume`/`muted` module vars and an
  `applyGain()` (= 0 when muted else volume); `ensure()` calls it, so a volume/mute set
  BEFORE the first user-gesture unlock is honored once the AudioContext exists. Kept sfx
  decoupled from settings (main.js does the wiring) so the synth stays dependency-free.
- **Leak-safe ground rings (the Stage-1 deferral resolved):** `systems/overlays.js` pools
  ring meshes once (like hazards.js) and repositions them each frame in render() — boss
  telegraph rings (always on, pulsing) + opt-in hitbox rings. A per-boss child/scene mesh
  would have re-created the teardown-leak class the Stage-6 review caught; a game-lifetime
  pool never gets added/removed mid-play, so there's nothing to leak. Drew rings only for
  players/enemies/bosses, not bullets (a bullet basically IS its hitbox — hundreds of extra
  meshes for nothing).
- **Coverage gate is scoped (vitest.config include),** so render/DOM modules
  (overlays/settings/settingsPanel) don't move the % — verified by the Playwright drive
  instead. Good to remember before writing UI/render code: it won't sink the gate, but it
  also won't be unit-covered, so drive it.
- **Perf HUD:** extended the debug menu's FPS tick to also read `renderer.info.render.calls`
  (per-frame, no reset needed) + live bullet/enemy counts — the numbers Scott needs to feel
  out difficulty + when the deferred perf work (BACKLOG) actually becomes necessary.
- **Carry-overs cleared:** ally.range 16→22 (the bigger arena made the old bubble feel
  short); tightened scale.test's ARENA-area bound to the documented ~2.5x and made the
  camera-fit test's comment honest (coarse distance check, not a frustum proof).
- **Adversarial review of the feel layer (5 confirmed, all folded into PR #30):**
  - _"Never throws" needs a finite guard at the boundary._ `setMasterVolume` clamped with
    `Math.max/min`, but `Math.min(1, NaN)` is `NaN`, and a corrupt stored `{"volume":"loud"}`
    parses fine (so settings.js's try/catch doesn't catch it) → `gain.value = NaN` throws on
    a real AudioParam. Fix: `const n = Number(v); if (Number.isFinite(n)) ...`. JSON.parse
    success ≠ value sanity; coerce types where a value crosses into a strict API.
  - _A toggle bound to keydown must drop `e.repeat`,_ or holding the key strobes it at the OS
    auto-repeat rate (mute chatter / overlay flicker). Also reused input.js's `isEditable`
    (now exported) so M/H ignore keys typed into a focused control — matching the existing
    game-key convention instead of a second ad-hoc rule.
  - _An always-on DOM panel over a full-screen canvas eats clicks + can trap movement._ A
    focused `<input type=range>` makes input.js's editable guard swallow WASD (dead-zone), and
    input.js's off-canvas pointerdown drops held keys. Mitigation: `blur()` controls after
    use; the residual corner click-steal is inherent to an always-on overlay (accepted, minor).
  - _render() is per-RAF, not the fixed step:_ animating with `_t += 1/60` in `sync()` runs
    ~2× fast at 120 Hz. Drive any render-time animation from wall-clock (`performance.now()`),
    not a per-frame constant — only update(dt) gets the fixed 1/60.
  - _Hide overlays that sit above the boot splash_ until boot clears (`.ready` class), and keep
    doc/CSS comments truthful about placement (the panel was "top-right" in 3 docs but is
    bottom-right) — a linter/reviewer will (rightly) flag the mismatch.
- **CodeRabbit pass → tunables to config (the standing rule, enforced):** moved the
  hardcoded feel/defaults out of modules into `config.js` — a `SETTINGS` block (the
  persisted-store defaults; `settings.js` + `sfx.js` both source it, one source of truth)
  and an `OVERLAY` block (ring pool size, colors, opacities, telegraph pulse coefficients).
  Also normalize the persisted blob at the `settings.js` load boundary (the right layer:
  coerce `volume` to a finite 0..1 + flags to booleans) — belt-and-suspenders with the
  `sfx.setMasterVolume` finite-guard. Lesson: when adding a system, put its defaults in
  `config.js` from the start; a default hardcoded in a module reads as a smell to reviewers
  even when it's "just" a fallback.

## 2026-06-21 — Maintenance pass (v0.6.5): AnimModel mixer-leak fix

- **The leak (carried since Stage 6):** every animated boss/minion built via
  `loadAnimated()` owns its own `THREE.AnimationMixer` + cached clip-actions
  (`core/animModel.js`). All the removal paths only did `scene.remove(mesh)`, so the mixer +
  action cache (and the cloned Object3D graph they pin) survived every room change — ~5–10
  orphaned mixers across a full 5-floor run.
- **Fix:** added `AnimModel.dispose()` = `mixer.stopAllAction()` + `mixer.uncacheRoot(group)`
  (+ drop `actions`/`current`), called via `entity.anim?.dispose()` at EVERY mesh-removal site:
  `Boss.die`, `Enemy.die`, `loadRoom`'s actor sweep, the post-boss minion sweep,
  `_resolveHumanSkip`, and the debug kill-all. Mirrors the `Player.dispose()` precedent.
- **What NOT to free:** geometry/materials are shared across instances (`SkeletonUtils.clone`)
  and clips come from the original gltf — disposing those or `uncacheClip` would corrupt other
  live instances. Only the per-instance mixer + its action cache are ours to release.
- **Gotcha worth keeping:** bosses live in BOTH `game.bosses[]` and `game.enemies[]` (flagged
  `isBoss`), so `loadRoom`'s `this.enemies` sweep already covers boss meshes on room change; the
  death/skip paths are the ones that needed their own `dispose()` call.
- **Doc freshness:** a 24h check caught `STATUS.md` still saying "WW2 × rift-tech" (it
  contradicted both the corrected civil-war canon and its own neighboring line) — fixed to
  "civil-war-era arms". Reminder: re-grep the docs for retired facts after a canon change.

## 2026-06-21 — Audio overhaul, music engine (v0.6.6, ADR-0024)

- **Policy shift:** Scott superseded the zero-dependency posture (it was a learning-phase
  choice). Free libs are now allowed if they fit the other rules; crossing a specific ADR
  still means asking to supersede it. First use: **Howler.js** for music, superseding
  ADR-0006 for the MUSIC layer only (procedural SFX stay).
- **Two audio systems, one facade.** `sfx.js` (procedural, its own AudioContext) and
  `music.js` (Howler, its own context) are bridged ONLY through `audio.js`: the settings
  master-volume/mute (ADR-0023) now drives both (`Howler.volume()/mute()` + the synth), and
  the **synth drone is the fallback** — `audio.setStageMusic/​setBossMusic` mute the drone
  (`sfx.setSynthMusicMuted`, a new gain bus) when a recorded track plays, and un-mute it when
  a track is missing. So a `null`/missing file is never silent (offline/CI-safe).
- **Plug-and-play + no runtime bloat:** tracks are a `config.MUSIC` id→file map; `music.js`
  creates `Howl`s lazily with **`html5: true` (streaming)** so big files don't load into
  memory or stall boot. Swapping a track = drop a file + edit the filename; pure id→file
  helpers live in `core/musicMap.js` (Howler-free → unit-tested; the rest is drive-verified).
- **Where boss music triggers:** `loadRoom` picks stage-vs-boss music (boss only when
  `isBossRoom && def.boss !== 'human' && bosses.length`); the human **decision**-boss stays on
  the stage track until the fight actually starts (`_onHumanChoice` panic branch).
- **Verification gotcha:** drove music selection via `__game.loadRoom(n)` and exposed the
  active track on `__audio.currentMusicTrack()`. The spider boss room is global index **9**
  (roomsPerFloor=9 → 10/floor), NOT 5 — the old progression.js header comment was stale and
  said 5; fixed the comment too. Don't trust a comment for room math; use `floorInfo`.
- **Adversarial review caught the fallback contract holes (fixed before merge):** the synth-mute
  was driven off `crossfadeTo`'s SYNC return, which broke the music↔synth XOR once a track is
  mapped. (1) An UNMAPPED context after a recorded track returned false WITHOUT stopping the old
  track → recorded music + synth drone stacked. (2) Howler load failure is ASYNC (no throw) → a
  404/undecodable mapped file muted the synth into total silence. Fixes: `crossfadeTo` false-path
  now `stopCurrent()` (fade+stop+clear); a `loaderror`/`noAudio`/known-`failed` track returns null
  and fires an `onSilent` callback that un-mutes the synth; `playerror` (autoplay lock) retries on
  unlock instead of failing; `duck`'s restore captures its own howl so a crossfade mid-duck can't
  ramp the wrong track; crossfade fades from the howl's current volume (no click on a reused howl).
  Lesson: with an async loader, "did it start?" ≠ "is it playing?" — gate the fallback on real
  async state (events), not a synchronous return.

## 2026-06-21 — Audio: placeholder score + the audio bible (v0.6.7)

- **`docs/AUDIO.md` is now the single home for audio decisions** (track map, candidate swaps,
  feedback-cue map, boss prompts, how-to-swap) — Scott's request so it doesn't get lost.
- **Design principles grounded in Scott's Drive research** (horror/addiction + gambling docs):
  the satisfying part of horror is the **tension→release** (excitation transfer), a healthy
  skill→reward loop; the _avoid_ list is the gambling toolkit (variable-ratio reward sounds,
  near-miss / loss-disguised-as-win celebration, manipulative escalation). Rule of thumb baked
  into the doc: **reward earned progress, keep danger honest, never celebrate a loss.**
- **Wiring placeholders:** all 5 stages + menu play real CC-BY tracks; the 5 boss slots share one
  placeholder until the real themes are designed with Caden. Repo grew ~58 MB (Scott OK'd size;
  streams at runtime so no perf cost). CC-BY → required an in-game **Credits** panel (`ui/credits.js`,
  start menu) plus `ASSETS.md`.
- **Download-source reality (for future curation):** scripted download worked from
  **incompetech.com** (Kevin MacLeod, direct MP3 URLs, CC-BY) but **FreePD 404'd** its `.php` pages
  and **Pixabay's CDN 403'd** (both gated against `curl`). No `ffmpeg` on this machine, so no
  transcode — picked a shorter menu track instead of the 24 MB drone. For CC0/OGG finals, expect to
  download Pixabay/FreePD manually in a browser, or use OpenGameArt direct file URLs.

## 2026-06-21 — Harness upgrade pt.1: audio studio (ffmpeg)

- **Installed ffmpeg** (winget `Gyan.FFmpeg`) — unblocks transcode + loudness + waveforms. winget
  modifies PATH but only for NEW shells; this session's shells didn't see it, so scripts resolve the
  binary from `$FFMPEG`/`$FFPROBE` → PATH → the winget `…/Gyan.FFmpeg_*/ffmpeg-*/bin` glob.
- **`scripts/audio-studio.mjs`** (`npm run audio:report` / `audio:process`): per-track LUFS/peak via
  `ebur128`, waveform PNGs via `showwavespic`, two-pass `loudnorm` to −16 LUFS + libvorbis OGG.
- **Gotcha:** ffmpeg writes its `ebur128`/`loudnorm` summaries to **stderr and exits 0**, so a
  `try/catch` around `execFileSync` never sees them (no throw). Use `spawnSync` and read
  `stderr+stdout` regardless of exit code. (First pass returned all NaN because of this.)
- The placeholders had an **11 LU loudness spread** (−24 to −12.6 LUFS — some ~4× louder); normalizing
  to −16 brought them to ±0.4 LU with peaks < −1 dBFS. Also shrank 58 MB → 33 MB as OGG.
- **Drive gotcha:** Howler `html5:true` streams via ranged `<audio>` requests; a crossfade/stop
  aborts the in-flight stream → Playwright `requestfailed` fires with `net::ERR_ABORTED`. That's
  benign, NOT a 404 — confirm with the served status (HEAD = 200) + that the track didn't fall back.

## 2026-06-21 — Drift-audit bot port + a Windows execSync gotcha

- Ported the deterministic drift auditor from `Lost-secuirty/Codex-Speed-Test` (`scripts/audit-drift.mjs`
  - `audit-lib.mjs`, `.github/workflows/audit.yml`, `docs/DRIFT-AUDIT.md`). Compares logged intent vs
    the diff; `--fix` is prettier-only (never edits logic to pass). CI-only `--run-checks` skipped —
    `ci.yml` already gates lint/build (no doing it twice).
- **Windows `execSync` gotcha:** Node's `execSync(cmd-string)` uses **cmd.exe** on Windows even when
  you launched node from git-bash. cmd.exe treats `^` as an escape and `%` as a var, so
  `git rev-parse ...^{commit}` and `git log --format=%s%x00%b` get mangled → the script's ref-check
  failed locally (it works in CI/ubuntu/bash). Fix: run git via **`execFileSync('git', [args])`** (array
  args, no shell) — robust on cmd.exe AND bash, and removes the shell-injection surface. Keep `execSync`
  only for the few non-git commands that need a redirect (no `%`/`^` in those).
- **Safety guard caught agent self-config:** committing a new `.claude/agents/auditor.md` (a sub-agent
  with unrestricted Bash) + `.claude/commands/audit.md` was blocked as agent self-modification beyond
  the user's approval. Correct call — shipped the CI bot (the part that audits every PR) and deferred
  the local `.claude/` semantic layer pending explicit sign-off.
- **CodeQL `js/incomplete-multi-character-sanitization` (high) on the bot's own code:** stripping HTML
  comments from a PR body with a **single** `body.replace(/<!--[\s\S]*?-->/g, '')` is unsafe — removing
  one match can splice the surrounding text into a _fresh_ `<!--` opener (e.g. `<!-<!---->->` → `<!-->`),
  so a commented-out heading can survive one pass. Fix (now `stripHtmlComments()` in `audit-lib.mjs`):
  **loop the replace to a fixed point**, then drop any surviving _unclosed_ `<!--` to EOF (the loop only
  removes closed comments; an unclosed one runs to end-of-document in HTML anyway). After that no `<!--`
  survives, and pathological input errs to "missing" (a nag) — the safe direction. The auditor getting
  flagged by the security scanner on its first PR is the system working; we fixed it, didn't suppress it.

## 2026-06-21 — Phase A: in-game IBL + richer fog (v0.8.0, ADR-0026)

- **`scene.environmentIntensity` defaults to `1` (the #1 IBL trap):** setting `scene.environment`
  without also setting `environmentIntensity` hits the IBL at full strength and washes pale
  `MeshStandardMaterial` bodies (the bone-white human `0xe8e2d0` / skeleton) to white. Always set it
  explicitly — we use a low `0.30`. (Verified in `three/src/scenes/Scene.js`: `this.environmentIntensity = 1`.)
- **IBL does NOT touch `MeshBasicMaterial`:** `scene.environment` only feeds the PBR diffuse/specular
  path, so the unlit bullets/eyes/door are untouched — the glowing threats and their bloom are
  unchanged. Don't expect IBL to brighten them (and don't "fix" it).
- **r182 moved `RoomEnvironment`'s internal position**, so IBL "looks different now" vs older
  tutorials — any intensity copied from a pre-r182 blog post is miscalibrated. Our `0.30/0.35` were
  tuned on r184 (the render studio is the trustworthy reference). r181 also made rough PBR surfaces
  (roughness > 0.5) conserve energy better, so `roughness:1` ground/walls respond slightly darker —
  tune via config, don't fight it.
- **PMREM lifecycle:** `pmrem.fromScene(env, sigma).texture` stays valid after `pmrem.dispose()` +
  `env.dispose()` — the baked texture is independent of the generator. Dispose both right after the
  bake (createScene runs once at boot; no per-frame cost). `scene.environment` is independent of
  `scene.background`, so leaving the solid clear color is correct (no skybox).
- **`three/addons/*` is the canonical r184 import alias** for `examples/jsm/*` (verified in
  `three/package.json` exports) — `import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'`
  resolves cleanly under Vite.
- **postprocessing 6.39 peer range is `>=0.168 <0.185`** — r184 is in range; do NOT bump three to
  r185+ without bumping postprocessing too, or the composer's color pipeline can desync.

## 2026-06-21 — Phase B: real-time shadow maps (v0.8.1, ADR-0026)

- **Toggling `renderer.shadowMap.enabled` after the first render needs a material recompile** to take
  effect — set `material.needsUpdate = true` across the scene when flipping it (done in
  `setShadowsEnabled`). Conversely, set `renderer.shadowMap.type` **once at init** (before the first
  render) so you don't pay an unexpected recompile mid-run.
- **`shadow.camera.updateProjectionMatrix()` is REQUIRED** after editing a directional light's ortho
  shadow frustum (`left/right/top/bottom/near/far`). Skip it and the frustum silently keeps its
  defaults → shadows land in the wrong place or vanish.
- **Fit the shadow frustum to the static `ARENA` constants, NOT entity bounds.** Skinned-GLB
  bounding boxes lie (the render-studio learned this for framing); a Box3-fit frustum would jitter or
  clip. The arena is fixed, so a tight ortho box around it + a small margin is correct and stable.
- **One caster is enough.** Only the warm key DirectionalLight casts; the fill light stays shadowless
  (a 2nd caster doubles the depth-pass cost for no readability gain). `castShadow` set on hundreds of
  MeshBasic bullets would tank the pass — they're left untouched (they don't even use the helper).
- **`castShadow` is free while `shadowMap.enabled` is false**, so the `castShadows()` helper is called
  unconditionally at mesh creation (one line in the `Enemy`/`Boss` ctors + `makeCharacter`) — no need
  to thread the config flag through every mesh site. The master switch lives on the renderer + key
  light. Traversing the entity root covers GLB sub-meshes in one call.
- **Headless shadow verification:** drive the game past the menu with `window.__game.startRun(seed)` +
  `loadRoom(9)` (floor-1 boss room), then **hide the `#startmenu` DOM overlay** (`startRun` loads the
  room underneath but doesn't dismiss the menu) before screenshotting — otherwise you shoot the menu,
  not the game. `normalBias 0.02` + `bias -0.0005` gave clean soft shadows (no acne/peter-panning).
- **A traversing `castShadows(root)` catches sub-meshes you forgot about** — enemy/boss procedural
  groups embed glowing **MeshBasic eyes**, so a blanket "set castShadow on every mesh" made the eyes
  cast too, against the "glowing things don't cast" rule (CodeRabbit caught it). Fix: the helper skips
  `isMeshBasicMaterial` meshes (handles material arrays). PBR bodies cast; unlit glow parts don't.

## 2026-06-21 — Phase C: CC0 PBR floor texture + normal map (v0.8.2, ADR-0026)

- **The ground is built INSIDE `createScene` (synchronous), so floor textures must be preloaded
  BEFORE it** — not after, like `loadModels` (entities are built later, so models can load after the
  scene; the floor can't). Pattern: `await loadTextures([...])` in `main.js` ahead of `createScene`,
  then a synchronous `getTexture(path)` from the cache. (Setting `material.map` to a still-loading
  `TextureLoader.load()` result would show blank on a missing file instead of the color fallback —
  preloading lets us fall back cleanly.)
- **Color space is the PBR floor gotcha (r152+):** albedo must be `SRGBColorSpace`, normal/roughness/AO
  must be `NoColorSpace`. Use `texture.colorSpace` — the old `.encoding` API was removed in r152. Wrong
  color space = a washed floor or corrupted shading.
- **Tint the albedo white when textured** (`color: 0xffffff`) so the map isn't double-darkened by the
  base color; keep `metalness:0` (non-zero mirrors the env map and wrecks readability). Keep the
  texture itself DARK so the floor never crosses `bloom.threshold` and lights up the whole screen.
- **ambientCG has a JSON API + direct CC0 downloads:** `GET /api/v2/full_json?type=Material&q=asphalt&include=tagData`
  lists assets + tags (filter for `wet`/`dark`); `GET /get?file=<id>_1K-PNG.zip` 302-redirects to the
  download. Use **NormalGL** (OpenGL +Y), not NormalDX, for three.js. The bundled `<id>.png` is a sphere
  preview — handy for eyeballing the look before committing. Asphalt025C = the dark wet one we shipped.
- **Vite serves `public/` at root and copies it into `dist/` verbatim** — texture paths like
  `'textures/floor/asphalt_color.png'` resolve the same in dev + prod (same as the GLB model paths).

## 2026-06-21 — Phase D: N8AO ambient occlusion (v0.8.3, ADR-0026) — overhaul complete

- **`N8AOPostPass`, not `N8AOPass`, for the pmndrs `postprocessing` composer.** `N8AOPass` is for
  three's vanilla `EffectComposer` and replaces the RenderPass; `N8AOPostPass` slots into pmndrs'
  composer as a normal pass. n8ao@^1.10.2 exports both (`import { N8AOPostPass } from 'n8ao'`).
- **Config lives on `pass.configuration.*` (a sub-object), not the pass directly:** `aoRadius`,
  `distanceFalloff`, `intensity`, `halfRes`, `color` (a THREE.Color → `.set()`), plus `setQualityMode(preset)`.
  `aoRadius` is in **world units** — n8ao's default 5 is too big for ~1–3 unit entities; 2.0 reads right.
- **Pass ORDER + gamma:** AO must sit `RenderPass → N8AO → EffectPass(bloom/tonemapping)`. Keep AO's
  `gammaCorrection = false` mid-pipeline (the final EffectPass owns color) or you double-correct.
- **Per-feature fallback isolation:** wrap the AO construction in its OWN inner try/catch so an AO
  failure skips only AO — letting it bubble to the composer's outer catch would nuke the whole
  pipeline (bloom included). One feature failing must not take down the rest.
- **Coverage gate is global over the `include` set** (`src/core/**` + a couple files). Each browser-only
  render module added (scene/postfx/textures, all 0% under unit tests) drags the ratio down; budget a
  small unit test for any _pure_ seam you add (e.g. `castShadows`, `configureTexture`) to stay over the
  40% floor instead of weakening the gate.

## 2026-06-22 — B9b: offer screen go-live (v0.8.14, ADR-0028)

- **Keep the door CLOSED during the offer.** `_onRoomClear` used to open the door + set `ROOM_CLEAR`
  up front; doing that before the modal lets `_checkDoor` (which runs in the `ROOM_CLEAR` update arm)
  load the next room _mid-offer_. Fix: normal rooms enter a paused `OFFER` state and only
  `room.openDoor()` + `ROOM_CLEAR` in `_finishRoomClear`, after every living player has picked. The boss
  path keeps its original open-door-now flow.
- **The headless offer resolves synchronously and recurses.** With no `#offer` element `showOffer` calls
  `onPick(0)` immediately, so `_presentNextOffer → _onOfferPick → _presentNextOffer …` runs in one stack
  to completion. Guard `_finishRoomClear` with an idempotent `_offerActive` flag so the room transition
  can't double-fire — it's also why the browser smoke + the verification drive keep advancing.
- **Damage reduction + whole-heart HP needs a carry accumulator, not rounding.** `hud.setHearts` does
  `'❤️'.repeat(n)` — `n` MUST stay a non-negative integer (a negative fraction throws RangeError; a
  positive one silently floors). A flat "% off" a 1-damage hit can't come off cleanly, so
  `core/defense.js` banks the reduced amount and subtracts a whole heart only when it crosses 1 — a true
  deterministic % with no RNG (matches the "never chance" ethic) and integer hearts.
- **A blocked/reduced hit must still spend the i-frame window.** `hurt()` sets `invuln` even when a
  guard charge eats the hit (it _was_ a hit) — else the same volley would chew through every guard
  charge in one frame. The block just swaps the cue (gold spark + a new procedural `shield` SFX; no
  blood / music duck).
- **`offerContext().owned` must be UPPERCASE.** Player slots store lowercase weapon keys (`'shotgun'`)
  but `core/items.js` ids + `core/offers.js`'s owned-weapon down-weight are UPPERCASE (`'SHOTGUN'`) —
  pass `slots.map((s) => s.toUpperCase())` or the anti-repeat silently never fires for carried guns.
- **The blast weapon-mod must set BOTH `explosive:true` and `explodeRadius`.** `bullets.js` only runs
  the AoE when `b.explosive` is truthy; granting just a radius does nothing.
- **`maxHearts` is now per-player + persists across rooms.** It lives on the `Player` (grows via
  `MAX_HP_UP`, capped `CAPS.maxHearts`); `loadRoom` doesn't `reset()`, so it (and all upgrades) persist
  within a run and reset only on a new run. Every `PLAYER.maxHearts` read for a live player moved to
  `pl.maxHearts` (hud, full-health pickup skip, heal cap, debug full-heal).
- **`vitest run` cold-transforms THREE under coverage and can trip the 10s `beforeEach` hook** on
  `tests/input.proof.test.js` (it dynamic-imports `systems/input.js → three`). Environmental (warm cache
  → ~1s); a fresh `--coverage` run on a cold machine may need `--hookTimeout` headroom to report.

## 2026-06-23 — SonarCloud Automatic Analysis ignores `sonar-project.properties`

- **The big one:** this project uses SonarCloud **Automatic Analysis** (the GitHub App; there is no CI
  scanner step). Automatic Analysis **does not read `sonar-project.properties` at all** — it reads
  **`.sonarcloud.properties`**, and **only from the default branch**. So our duplication/coverage
  exclusions in `sonar-project.properties` had **never actually applied**; nobody noticed because no PR
  had added a big block of structurally-repetitive _new_ code until B10's `META_UPGRADES`. Fix: add
  `.sonarcloud.properties` (same keys) on `main`. (Official docs:
  https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/automatic-analysis)
- **PR analysis reads the config from the DEFAULT branch, not the PR branch.** Adding/editing
  `.sonarcloud.properties` on a feature branch does nothing for that PR's own gate — it must be merged to
  `main` first, then the PR re-analyzed. Plan exclusion changes as their own land-on-main-first PR.
- **To find WHICH file/lines Sonar flags for new-code duplication**, don't guess — ask the API:
  `curl "https://sonarcloud.io/api/measures/component_tree?component=Lost-secuirty_lostsouls-game&pullRequest=<N>&metricKeys=new_duplicated_lines_density&qualifiers=FIL"`.
  **Gotcha:** new-code metric values are under each measure's `period`/`periods` field, NOT `value` — read
  the wrong field and every file looks like `0`/`?`. This pinpointed config.js (45.9% of 74 new lines)
  after three wrong-file fix attempts.
- **`jscpd` is NOT a faithful proxy for Sonar's CPD here** — its HTML parser doesn't tokenize inline
  `<style>` CSS, and its default token threshold differs, so it found none of the real duplication.
  Trust the SonarCloud API for ground truth, not a local CPD tool.
- **To verify Sonar isn't just lagging**, check the analyzed commit:
  `curl ".../api/project_pull_requests/list?project=..."` → each PR's `commit.sha` + `analysisDate`.
  Confirm it equals your HEAD before concluding a fix "failed."

## 2026-06-23 — B10 meta-progression (Echoes + save schema)

- **Never-throw at the storage boundary requires TWO layers.** `load()` wraps `JSON.parse` + `localStorage.getItem` in try/catch (ReferenceError in Node, QuotaExceededError in storage-full browsers). `normalizeSave()` handles corrupt/partial blobs separately — a well-parsed JSON object can still have non-finite echoes, unknown upgrade ids, or negative stats. Both defenses are needed.
- **Triple-enforce the beat-the-game gate.** `addEchoes` (earn path), `canBuy` (spend path), and `baselineStacks` (apply path) all check `gameBeaten` independently. A caller that forgets to check cannot accidentally breach the gate — it's always enforced at the data layer.
- **Pass baseline into the Player constructor, not read localStorage inside Player.** Player decoupled from storage = Player is unit-testable without mocking localStorage, and the baseline is computed once per run (not once per frame). Co-op players both get the same account baseline automatically.
- **`normalizeSave` must be idempotent.** If `normalize(normalize(x))` differs from `normalize(x)`, something downstream double-normalizes and drifts. Test this explicitly — it caught a fractional echoes edge case where `Math.floor(Math.floor(12.9))` = 12 was fine but an `echoes: 12.1` → `12` → `12` was accidentally failing a string-coerce path.
- **`migrate` returns the SAME object for v === 1 (reference equality).** `normalizeSave(migrate(parsed))` always runs, so `migrate` is a cheap guard that only kicks in on version mismatch — it shouldn't copy the object unnecessarily.

## 2026-07-03 — perf red herring: Chrome was on the iGPU, not the dGPU

- **The earlier FPS drops were mostly a wrong-GPU problem, not a game bottleneck.** On Scott's
  laptop the GPU sat at ~0% while the CPU was pegged — Chrome was rendering on the **integrated**
  GPU, not the discrete RTX 5060. Fix (on his side): Windows **Settings → System → Display →
  Graphics** → add Chrome → **High performance**. (Also verify via Task Manager GPU% / `chrome://gpu`.)
- **This recalibrates the old perf figure:** the "post-FX + shadows off = 30→165 fps" note was
  **iGPU-measured**, so it OVERSTATED the cost of the effects. On the discrete card there's far more
  headroom — so the deferred **data-gated post-FX-cut** task (ROADMAP / perf section) drops in
  priority; it's a nice-to-have, not urgent. Don't let those numbers scare us off adding juice
  (weapon FX, atmosphere).
- **The right lever for genuinely weak hardware already exists:** the `reducedEffects` setting
  (drops post-FX + the new weapon-FX layer to raw). That's where the low-end path lives; we don't
  need to gut effects for everyone.
- **Lesson:** before treating a browser FPS number as a game/engine bottleneck, confirm **which GPU
  the browser is actually using**. Near-0 GPU% + high CPU = wrong adapter (or a software fallback),
  not a rendering-cost problem — chasing it in the game code would've been wasted work.

## 2026-07-04 — PR-audit sweep (#75-#78): the Sonar gate's real tripwires

- **This repo's SonarCloud quality gate fails a PR on ANY new MAJOR code smell (or vulnerability).**
  The live tripwires this sweep: **S3358** nested ternaries (one each failed #75 and #77), **S3776**
  cognitive complexity > 15 (`candidateEntries` at 22 failed #76), and **S2245 — Sonar now types
  `Math.random()` as a VULNERABILITY** (3 uses failed #77, even for visual-only jitter). Write-time
  rules: no nested ternaries, keep pure-engine loops flat, and use `core/rng.js` even for cosmetic
  randomness.
- **Sonar/Codacy PR findings are queryable without auth** — far more precise than the check-run
  summary: `curl "https://sonarcloud.io/api/issues/search?componentKeys=Lost-secuirty_lostsouls-game&pullRequest=N&resolved=false"`.
  Fix ALL findings in ONE push, not push-fail-push.
- **New-pickup-type checklist:** grep `game.js _handlePickups` for per-type gates — a new type
  silently bypasses them (exactly how HEART initially skipped the full-health leave-it-for-your-
  teammate gate that HEAL had).
- **ADR-0030 created a new bug class:** any pick that binds to the HELD gun is a dead pick on guns
  that don't consume that stat (Orbital Blade ignores mods), and any state keyed by weapon TYPE
  (`_weaponUpgrades`) must survive TWO slots holding the same gun (owned weapons are down-weighted
  in offers, never excluded — duplicates are reachable by design).
- **Game-lifetime FX objects (WeaponFX, particles) have no room-change clear hook** — `loadRoom`
  clears bullets/hazards only. Any new deferred/queued FX needs its own `clear()` wired into
  `loadRoom` or it leaks across rooms.
- **The post-boss minion sweep bypasses `Enemy.die()`** (marks dead + removes mesh), so on-death
  side effects (heart rolls, `onDeath` hooks) intentionally don't fire for swept minions.
