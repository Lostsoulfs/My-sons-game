# Architecture Decision Records

Short notes on the significant technical choices and _why_ we made them. Scaffold a
new one with `/adr <title>` (copies `0000-template.md`, bumps the number, adds a row
below).

| #                                                         | Title                                                                      | Status   |
| --------------------------------------------------------- | -------------------------------------------------------------------------- | -------- |
| [0001](0001-threejs-vite-express-stack.md)                | Three.js + Vite + Express stack                                            | Accepted |
| [0002](0002-topdown-singleplayer-first.md)                | Top-down camera, single-player first (ally as AI ally)                     | Accepted |
| [0003](0003-custom-collision-no-physics-engine.md)        | Custom collision, no physics engine                                        | Accepted |
| [0004](0004-primitive-first-assets.md)                    | Primitive-first art with CC0 download seam                                 | Accepted |
| [0005](0005-hybrid-vibe-plus-rules.md)                    | Hybrid: fast vibe-coding + the rules                                       | Accepted |
| [0006](0006-procedural-audio.md)                          | Procedural audio (no files, no library)                                    | Accepted |
| [0007](0007-floors-lives-checkpoints.md)                  | Floors, lives, and checkpoints                                             | Accepted |
| [0008](0008-gamepad-input.md)                             | Basic gamepad (Xbox controller) input                                      | Accepted |
| [0009](0009-boss-attack-patterns.md)                      | Spider boss attack patterns (the co-designer's card)                       | Accepted |
| [0010](0010-debug-menu-and-probability.md)                | Debug menu (lil-gui) + probability verification                            | Accepted |
| [0011](0011-coop-and-start-menu.md)                       | 2-player local co-op + start menu                                          | Accepted |
| [0012](0012-weapon-slots-and-caps.md)                     | Weapon slots + global stat caps                                            | Accepted |
| [0013](0013-seeded-runs.md)                               | Seeded runs + cross-system determinism                                     | Accepted |
| [0014](0014-data-driven-bosses.md)                        | Data-driven bosses (behavior modules)                                      | Accepted |
| [0015](0015-weapon-behaviors-and-floors.md)               | New bullet behaviors, 5 new guns, 9-room floors                            | Accepted |
| [0016](0016-ground-hazards.md)                            | Ground hazards system (telegraphed poison pools)                           | Accepted |
| [0017](0017-animated-models.md)                           | Animated CC0 GLB models + animation system                                 | Accepted |
| [0018](0018-multi-boss-duo.md)                            | Multi-boss fights (`game.bosses[]`) + the Dog/Cat duo                      | Accepted |
| [0019](0019-human-decision-boss.md)                       | Human decision-boss + the `HUMAN_CHOICE` state                             | Accepted |
| [0020](0020-arena-scale-and-camera-fit.md)                | Roomier arenas + camera fit + entity size ladder                           | Accepted |
| [0021](0021-emitter-pattern-library.md)                   | Pure bullet-pattern (emitter) library + de-samey bosses                    | Accepted |
| [0022](0022-scaling-math.md)                              | Scaling math: diminishing-returns upgrades + diff curve                    | Accepted |
| [0023](0023-settings-and-overlays.md)                     | Persisted settings + readability overlay (a11y/feel)                       | Accepted |
| [0024](0024-recorded-music-howler.md)                     | Recorded music layer (Howler) + deps-allowed policy                        | Accepted |
| [0025](0025-postprocessing-pipeline.md)                   | Post-processing pipeline (bloom + ACES) via postprocessing                 | Accepted |
| [0026](0026-atmospheric-rendering.md)                     | Atmospheric rendering (IBL, shadows, PBR floor, AO)                        | Accepted |
| [0027](0027-difficulty-and-scaling.md)                    | "Twice as hard" master difficulty knob + fair weights                      | Accepted |
| [0028](0028-drop-and-offer-system.md)                     | Room-clear upgrade OFFER screen (drops → pick-1-of-3)                      | Accepted |
| [0029](0029-meta-progression-and-save.md)                 | Meta-progression: Echoes + versioned localStorage save                     | Accepted |
| [0030](0030-weapon-economy-per-weapon-upgrades.md)        | Weapon economy: per-weapon per-stat upgrades, two-dial luck                | Proposed |
| [0031](0031-meta-progression-breakpoint-curve.md)         | Resonance permanent-upgrade curve — breakpoints, not stacks                | Proposed |
| [0032](0032-connected-floor-map.md)                       | Connected floor map — Isaac-grid rooms, backtracking, minimap              | Proposed |
| [0033](0033-boss-arrivals.md)                             | Boss arrivals — entry-opposite spawn, BOSS_INTRO cinematic, human approach | Proposed |
| [0034](0034-adaptive-graphics-quality.md)                 | Adaptive graphics quality — measure FPS, auto-downgrade weak machines      | Proposed |
| [0035](0035-weapon-reload-overheat.md)                    | Weapon downside — reload (ballistic) + overheat (energy)                   | Proposed |
| [0036](0036-weapon-power-budget-rarity.md)                | Weapon power-budget model — rarity ≈ power, strict pyramid, no pity        | Proposed |
| [0037](0037-luck-curse-curve-upgrade-rework.md)           | Luck/curse magic-find curve + survival-upgrade rework (cut HP/soak)        | Proposed |
| [0038](0038-character-select-ally-removal.md)             | Dad/Son character select + AI-ally removal (1P solo, ally→future pet)      | Proposed |
| [0039](0039-orbital-to-passive-aura-and-visible-armor.md) | Orbital Blade → passive Blade Aura; Guard → visible Atomic Armor plates    | Accepted |
| [0040](0040-boss-phase-flips.md)                          | Boss HP-gated phase flips — wire the shelved emitters (spiral/flower/arc)  | Proposed |
| [0041](0041-cp-d-character-model-plumbing.md)             | CP-D character-model plumbing — GLB-ready + a code-only silhouette fix     | Proposed |
| [0042](0042-demon-companion.md)                           | Demon companion — permanent-buff inheritance, Echoes unlock (Broken Seal)  | Proposed |
| [0043](0043-run-modes-story-endless.md)                   | Run modes — Story / Endless (post-win discovery, looping scaffold)         | Proposed |
