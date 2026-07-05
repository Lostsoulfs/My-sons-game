# Design panel — "6-MoE" round 2: CP-D character/art direction (2026-07-05)

Same 6-persona panel ([round 1](2026-07-05-six-moe-panel.md) covered genre gaps/patterns),
refocused on CP-D: what should Dad, Son, and the future Demon companion actually look
like? A scout first read the mesh factory (`characterMesh.js`, `MODELS` config, the
`loadAnimated`-first pattern every boss already uses) so the panel argued from what's
real, not guesses.

## Headline

**"Two capsules with a paint swatch is a co-op skin slot, not a family."** At bullet-hell
top-down zoom, nobody reads face detail — the eye reads silhouette proportion and
color-blocking. Today Dad and Son are the identical capsule+cone, differing only by tint.

## Direction — Dad/Son

Diverge **proportion**, not just hue: Dad reads broad/short/planted (heavier ballistic
gear); Son reads lean/tall/quick (lighter energy tech). Add ONE silhouette prop per
character that survives any future GLB swap — a brim/hat read for Dad (a disc from
top-down), a goggle/gadget read for Son (a second silhouette lobe) — so the "father-son"
identity lives in silhouette, not just color, and isn't lost if the base mesh changes later.

Real-world grounding (Dr. Kellerman): 1950s civil-defense workwear shapes — boxy coverall,
suspenders, a fedora brim for Dad; rolled sleeves, a newsboy cap or goggles for Son — beats
a generic default-adventurer look.

**On recoloring:** the panel was split. Several personas (Riley, Vera, Accountant, Glitch)
pitched a warm brass/copper (Dad) vs cold cyan (Son) "weapon-era" palette matching the
ballistic/energy split. "Coin-Op" Sal pushed back explicitly: _"Keep the blue/green
palette — it works, don't touch it."_ Since this repaints an identity Scott and Caden
already associate with real play sessions, it's left as an open call for Scott (see
ADR-0041) rather than decided by the panel majority.

## Direction — Demon (CP-C, not this pass)

Unanimous: **skip the fantasy-imp default** (horns/wings/grin — "every Poly Pizza
'demon' search result," "Diablo/Hades boilerplate"). Instead: a **sealed containment
specimen** — asymmetric body, one oversized limb bound in a riveted 1950s
hazmat/blast-suit restraint harness (leather straps, brass valve/dial motifs, a cracked
glass dome or welded faceplate), hunched/reluctant posture, face mostly obscured, eyes
averted — reads as "leashed hazard," not "pet." Mechanical hook for later: rivets visibly
pop / straps loosen as it's "freed" alongside Resonance meta-progression — a companion
whose silhouette literally tracks the player's long-term progress.

Source idea: a Quaternius creature-pack base (genuine asymmetric/non-humanoid anatomy)
dressed with a bespoke procedural harness overlay — same trick as the Enforcer boss's
fallback mesh. Ships fast on the body, bespoke where the brand identity actually lives.

## Fastest ship vs. wait-and-get-special

- **This week:** Kenney Mini/Blocky Characters — CC0, adult+kid skins on ONE shared rig
  (an out-of-the-box Dad+Son proportion gap), low-poly reads cleanly at small on-screen
  scale. Recolor/reprop per the direction above, wire through the already-proven
  `loadAnimated`-with-procedural-fallback pattern. Zero new engineering.
- **Worth waiting for:** Quaternius Ultimate Modular Men / Universal Base Characters —
  modular parts so a future cosmetic-unlock system can visibly swap coat/hat/gear per
  meta-progression tier (the "datamined and hyped" Deep Rock Galactic cosmetics angle).

## What shipped THIS pass (code-only, no art yet — ADR-0041)

- Fixed a real latent bug the panel's own code-scout surfaced: Son's `modelKey` was
  `'ally'` — the same key the dormant `Ally` class (CP-C's future demon) uses. Renamed to
  distinct `'dad'`/`'son'` keys; `MODELS.ally` stays reserved for the demon.
- Animation-ready plumbing in `player.js` (try `loadAnimated` first, exactly like every
  boss) — a no-op today (no GLB yet), but a real GLB will "just work" including its walk
  cycle the moment one is dropped in.
- A **visual-only** silhouette differentiator: distinct mesh proportions (NOT the
  collision hit-circle — that stays identical for 2P fairness) + one procedural prop each
  (a brim disc for Dad, a goggle ring for Son). Verified live via `window.__game`.

## Left for Scott (owner-gated, per the plan)

1. **Palette:** keep the established blue/green, or shift to the panel's warm/cool
   weapon-era split?
2. **Asset pack:** Kenney (ship this week) vs. Quaternius (higher fidelity, cosmetic-ready,
   slower)?
3. **CP-C timing:** the Demon direction above is ready to reference whenever CP-C starts.
