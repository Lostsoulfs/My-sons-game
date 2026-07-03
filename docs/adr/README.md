# Architecture Decision Records

Short notes on the significant technical choices and _why_ we made them. Scaffold a
new one with `/adr <title>` (copies `0000-template.md`, bumps the number, adds a row
below).

| #                                                  | Title                                                      | Status   |
| -------------------------------------------------- | ---------------------------------------------------------- | -------- |
| [0001](0001-threejs-vite-express-stack.md)         | Three.js + Vite + Express stack                            | Accepted |
| [0002](0002-topdown-singleplayer-first.md)         | Top-down camera, single-player first (ally as AI ally)     | Accepted |
| [0003](0003-custom-collision-no-physics-engine.md) | Custom collision, no physics engine                        | Accepted |
| [0004](0004-primitive-first-assets.md)             | Primitive-first art with CC0 download seam                 | Accepted |
| [0005](0005-hybrid-vibe-plus-rules.md)             | Hybrid: fast vibe-coding + the rules                       | Accepted |
| [0006](0006-procedural-audio.md)                   | Procedural audio (no files, no library)                    | Accepted |
| [0007](0007-floors-lives-checkpoints.md)           | Floors, lives, and checkpoints                             | Accepted |
| [0008](0008-gamepad-input.md)                      | Basic gamepad (Xbox controller) input                      | Accepted |
| [0009](0009-boss-attack-patterns.md)               | Spider boss attack patterns (the co-designer's card)       | Accepted |
| [0010](0010-debug-menu-and-probability.md)         | Debug menu (lil-gui) + probability verification            | Accepted |
| [0011](0011-coop-and-start-menu.md)                | 2-player local co-op + start menu                          | Accepted |
| [0012](0012-weapon-slots-and-caps.md)              | Weapon slots + global stat caps                            | Accepted |
| [0013](0013-seeded-runs.md)                        | Seeded runs + cross-system determinism                     | Accepted |
| [0014](0014-data-driven-bosses.md)                 | Data-driven bosses (behavior modules)                      | Accepted |
| [0015](0015-weapon-behaviors-and-floors.md)        | New bullet behaviors, 5 new guns, 9-room floors            | Accepted |
| [0016](0016-ground-hazards.md)                     | Ground hazards system (telegraphed poison pools)           | Accepted |
| [0017](0017-animated-models.md)                    | Animated CC0 GLB models + animation system                 | Accepted |
| [0018](0018-multi-boss-duo.md)                     | Multi-boss fights (`game.bosses[]`) + the Dog/Cat duo      | Accepted |
| [0019](0019-human-decision-boss.md)                | Human decision-boss + the `HUMAN_CHOICE` state             | Accepted |
| [0020](0020-arena-scale-and-camera-fit.md)         | Roomier arenas + camera fit + entity size ladder           | Accepted |
| [0021](0021-emitter-pattern-library.md)            | Pure bullet-pattern (emitter) library + de-samey bosses    | Accepted |
| [0022](0022-scaling-math.md)                       | Scaling math: diminishing-returns upgrades + diff curve    | Accepted |
| [0023](0023-settings-and-overlays.md)              | Persisted settings + readability overlay (a11y/feel)       | Accepted |
| [0024](0024-recorded-music-howler.md)              | Recorded music layer (Howler) + deps-allowed policy        | Accepted |
| [0025](0025-postprocessing-pipeline.md)            | Post-processing pipeline (bloom + ACES) via postprocessing | Accepted |
| [0026](0026-atmospheric-rendering.md)              | Atmospheric rendering (IBL, shadows, PBR floor, AO)        | Accepted |
| [0027](0027-difficulty-and-scaling.md)             | "Twice as hard" master difficulty knob + fair weights      | Accepted |
| [0028](0028-drop-and-offer-system.md)              | Room-clear upgrade OFFER screen (drops → pick-1-of-3)      | Accepted |
| [0029](0029-meta-progression-and-save.md)          | Meta-progression: Echoes + versioned localStorage save     | Accepted |
