# Design panel — "6-MoE" brainstorm (2026-07-05)

A 6-persona design review Scott runs for ideation: a code **scout** reads the current
boss/pattern/emitter/config, then six loud in-character experts brainstorm, then a
show-runner synthesizes. Aim (Scott's brief): use the **last few years of the genre**,
find **what these games DON'T have**, prioritize **retention + discoverability over lore**
("keep playing + get found"), and treat **attack patterns** as common / rare / invent-new —
"whatever can be done now, backlog the rest."

Panel: 🎮 Riley (15, viral/clippable) · 🕹️ "Coin-Op" Sal (danmaku/dodge) · ☢️ Dr. Vera
Kellerman (1950s atomic-age tech) · 💀 Mort (horror/ARG) · 📈 The Accountant (retention math)
· 🃏 Glitch (chaos wildcard).

## Headline (verified in code)

**We built the danmaku toy and put it back in the box.** `multiArmSpiral`, `layeredFlower`,
and `arc` are exported + unit-tested in `entities/bosses/emitters.js` and fired by **no boss**.
The curse dial's math ships (CP4) but has **no source** (reads 0). Enemy homing exists but is
gated to the player team. Three systems built and switched off. Five of six experts flagged the
dead emitters independently.

## What the genre (last few years) does NOT have — the whitespace

- Authored bullet-hell geometry (rotating spirals, breathing flower-blooms, marching gap-walls)
  in a sub-genre that's ~95% auto-battler swarm (VS / Brotato / Halls of Torment / Death Must Die).
- **Grazing / near-miss reward** (DoDonPachi) — nobody rewards dancing _into_ danger.
- **A boss that predicts YOU** — fires where you've been dodging _to_.
- **Atomic dread as a mechanic, not a skin** — an invisible killer read through an instrument
  (Geiger click-track), a whole-arena duck-and-cover flash, a government newsreel that gaslights
  you between floors. The genre does gross-out, never fear/paranoia.
- **Delayed / two-stage / cascading fire** (held bullets that snap, airbursts that bloom).
- **Enemy bullets that DO something** — accel-snap, capped homing, mid-flight bloom.
- **Moving hazards** — drifting fallout plumes / arena-shrink vs the drop-and-sit poison pool.
- **A run-end artifact built to be screenshotted** — receipt / dose-card + copyable seed (how VS
  and Balatro were _found_).

## Do-now shortlist (reuses code we already have)

1. **Boss phase-flips wiring the dead emitters** — ✅ **SHIPPING** (this PR / ADR-0040).
   Unanimous pick; verified near-free.
2. **Turn on the curse dial with glowing "hot" elites** + guaranteed reward (CP4 math done; source
   is pending task #23 / Phase 6b). Re-skin a mob with one affix via the hazards system.
3. **Enemy bullets that do something** — extend `_steerHoming` past `team==='player'` (capped turn),
   plus accel-snap and mid-flight bloom.
4. **The Nuke Test** — whole-screen whiteout → silhouette → `gapRing` shockwave with one safe wedge.
5. **Score + a 1950s adding-machine receipt** with a copyable seed.
6. Grazing meter · living weapon that backtalks · cheap horror creep (skeleton reassembles _wrong_;
   elites flicker human on death).

## Patterns

- **Common we lack:** boss HP phase-flips (✅ shipping) · rotating spiral · elite variants.
- **Rare gems:** layered flower-bloom (✅ shipping on the Mushroom) · accel/homing/bloom bullets ·
  drift-plume hazard · delayed airburst.
- **Novel (invented):**
  - **The Fallout Curtain** — a wall marches across the arena with a scrolling safe-gap you _walk
    with_, not dodge across. Signature Enforcer move.
  - **Mirror-Lane** — final-phase boss fires where you've been dodging _to_; counter by breaking
    your rhythm.
  - **Argus Airburst** — a shot freezes mid-air, then detonates into a second ring (real 1958 test).
  - **Suspended Volley** — a ring of still bullets hangs, then snaps toward where you _were_.
  - **Contamination Creep** — a rot-zone grows outward all fight, shrinking the safe arena.

## Backlog (bigger swings)

Fusion super-guns (#24) · Geiger dose-meter _(wants audio)_ · gaslighting newsreel _(wants audio)_ ·
daily-seed leaderboard · the "Room That Lies" _(rides the choice-room plan)_ · auto-cut clip card ·
rewind/palindrome room.

## Retention hooks (highest-leverage)

One clippable moment per run · score + shareable receipt + seed · visible curse push-your-luck ·
boss mastery via phase tells (✅ started) · grazing depth ceiling · **audio (#17) is a retention
_multiplier_** that unlocks the Geiger click / newsreel / dodge-whoosh · dig-for-it horror mystery ·
co-op shared-combo meter.

_Full transcript of the run lives in the session; this is the durable digest so the ideas survive
the ephemeral container._
