# Story Bible — _City of Monsters_ (Lostsouls)

> **Why this file exists.** The game is built fast and fun-first, so the _story_ can drift if it
> isn't written down. This is the canon — the setting, the cast, the rules of the world, and the
> "why" behind the monsters and guns. Read it before adding new content so the theme stays whole.
> It's a **living doc**: when we lock a new story beat, add it here. Co-authored by Scott + Caden.
>
> Caden originally anchored it in the **1940s** (_"I know one thing — they had nukes."_). After a
> lore session (2026-06-24) we shifted the era to the **mid-to-late 1950s** — Cold War paranoia and
> nuclear anxiety are at their peak, and the Echo origin story (see Setting) fits naturally now.
> Weapons, names, and atmosphere are 1950s-period-correct. 🍄☢️

---

## Logline

A **father and his son** are trapped in a ruined city after an experiment tore open a **portal /
rift**. Demons, the undead, and stranger things pour out in **endless, worsening waves**. The only
way out is _through_: fight to the **center of the city**, reach the rift, and **cross over** to
whatever is on the other side.

## Setting

- **Era:** the **mid-to-late 1950s** — used as a **tech / era anchor** only (period weapons, names,
  atmosphere). Cold War paranoia, duck-and-cover drills, the bomb is real. Alternate history — some
  details differ from our timeline, but the _feel_ is authentic.
- **Place:** a **nameless, medium-sized city** — not a sprawling metropolis, and deliberately
  unnamed. Streets, barricades, rubble, ruined blocks; a war-torn town, not a skyline.
- **What broke it (history):**
  - **WW2 happened.** The bombs fell — **in 1940 in this timeline**, earlier than our history. The
    war ended differently. The world kept moving.
  - In the years after, the American government grew increasingly paranoid — about Soviet nuclear
    capability, about internal dissent, about its own people.
  - The crackdowns escalated. Distrust became law. **People pushed back.**
  - By the mid-1950s, the country had spiraled into a **civil war** — not a foreign one, but
    **people vs. government**. This city was one of the battlegrounds.
  - So even before the monsters arrived, **nobody trusted anybody.** Old wounds, old grudges, old
    fear.
- **The experiment:** Government scientists — working in secret — had been studying **nuclear energy
  as more than just a bomb**. They harvested something from the blast energy, something that
  behaved like a fuel and a force (no one has a name for it yet; the player may earn one by the
  end). The program scaled in stages:
  1. **Small resonance devices** (late 1940s) — barely enough to detect the signal. Tiny rifts
     opened and closed on their own in seconds. Harmless, they concluded.
  2. **Larger arrays** (early 1950s) — bigger devices, bigger rifts, longer durations. Still
     closed. Creatures from the other side appeared occasionally. Written off as anomalies.
  3. **This city's array** (~1957) — the largest yet, built in secret downtown. It pulled enough
     Echo energy to hold a portal **permanently open**. The team didn't know until it was too
     late. The experiment team is gone — dead, fled, or silenced. **The rift is their failure,
     sitting at the center of the city, and it does not close on its own.**
- **The mood:** paranoid, scavenged, desperate. Survivors hole up. Help is temporary and earned.
  The bomb already killed the old world; the rift is just the newest disaster on top of the old.

## The Rift (the engine of the game)

- A **portal** opened by an experiment-gone-wrong. It sits at the **center of the city**.
- It **keeps spitting out monsters**, and the spawns get **harder the closer you get to it.**
  Small things at the edges; nightmares at the core.
- **It does not stop on its own.** The waves only end when the heroes **reach inside it and cross
  over** — into the other world / zone / "warp field" (name TBD; see Open Questions).
- **Direction = difficulty.** Moving toward the center is moving toward the worst of it.

## The other world (through the portal)

The rift leads somewhere. The other side:

- **Geography:** structurally similar to ours — same topology, same rivers, same hills — but
  **untouched**. No ruins, no roads, no cities. Overgrown and strange. The same soil, a different
  history.
- **No people have ever lived there.** What lives there instead:
  - **Demons** — ancient, no analogue to any human category.
  - **Humanoid creatures** — bipedal, roughly human-shaped, but clearly not human; possibly the
    dominant species of their world.
  - **Animal/demon hybrids** — things that blur the line between creature and demon.
- **They are not invading.** They are not organized. The portal opening in their world is as
  disorienting to them as it is to ours — creatures fall through in both directions. **We punched
  the hole. This is on us.** That's the reveal.
- **The name:** player-earned. The Dad and Son have no name for it at the start. If the player
  finds enough lore fragments and crosses over, they may understand what it actually is. **Caden
  picks the final name.** Placeholder: "the other side" / "the zone."

## The heroes

- **The Dad** and **The Son** — the two playable characters (maps cleanly onto **solo + AI-ally**
  and **2-player co-op**). It's their story: stick together, push to the rift.
- They're survivors, not soldiers-by-trade. They scavenge weapons and keep moving.
- _Names + why they're together: see Open Questions._

## Humans & trust (this is a core mechanic, not just flavor)

- **No one trusts anyone.** A civil war's worth of paranoia plus the monsters. Survivors are scared
  and twitchy — to them, _you_ might be a monster wearing a face.
- A survivor **can be talked into helping you — temporarily.** They'll fight alongside you for a
  few floors, or hand something over, often after a **quest or a mini-game** in an area.
- This is already in the game as the **Human decision-boss** ("The Survivor", `bosses/human.js` +
  `systems/humanDecision.js`): you choose how to approach a cornered survivor; a good read means he
  helps and waves you through, a bad read means he panics and fights. **Trust is a gamble.**
- **Future:** temporary survivor allies, escort/quest rooms, trade, and area mini-games all live
  under this pillar.

## The bestiary (what comes out of the rift)

**Hard rule: NO zombies.** No shambling-corpse "zombie" enemies, ever. The undead here are
_other_ kinds of undead.

What's allowed out of the portal:

- **The undead** — skeletons, bound spirits, reanimated things (but **not** zombies).
- **Demons** — things that were never human.
- **Twisted nature & "other things"** — fungal horrors, beast-things, and whatever the rift warps
  on its way through. The further in, the less they make sense.

**Threat reads by size & distance from the rift** (see `docs/adr/0020-*` for the scale system):
small/weak at the city's edge → big/deadly at the core.

### Current roster → how it fits the story

The live 5-floor run is the journey from the city's edge toward the rift:

| Floor             | Boss                      | In-world read                                                |
| ----------------- | ------------------------- | ------------------------------------------------------------ |
| The Outskirts     | 🕷️ Spider                 | First things crawling out at the edge of the breach.         |
| The Barricade     | 🚪 The Survivor (human)   | A terrified survivor holding a checkpoint — _trust gamble._  |
| The Fungal Depths | 🍄 Mushroom King          | The rift warping the city's nature; spores choke the blocks. |
| The Kennels       | 🐶🐱 Fang & Whisker (duo) | Twisted beasts hunting in a pair, deeper in.                 |
| The Catacombs     | 💀 Rattlebones (skeleton) | The proper undead, near the core.                            |

_(Order/contents are tunable in `config.js`. As we add bosses we slot them along this edge → core
gradient.)_

## Weapons — and the "Living Weapons" arc

- **Base style: mid-to-late 1950s era.** Pistols, shotguns, machine guns, rockets — period
  silhouettes. **Keep it period-correct:** no anachronistic guns until rift-tech justifies it.
- **Mix with future / monster / demon tech.** Salvage from the rift fuses with old guns to make
  the exotic weapons (homing, railgun, charge cannon, the orbital blade, etc.).
- **Weapons can become "ALIVE."** Carry a fused gun long enough and the monster/demon tech in it
  **wakes up** — the weapon becomes part-creature. This is a deliberate future arc (a weapon that
  grows, talks, demands, or changes how it fires over a run). **Not built yet — see Open Questions.**
- **Design intent:** the pistol is **weak by design** (your fallback); other guns are scavenged
  upgrades. Balance/feel lives in `config.js` (`WEAPONS`).

## The energy source — "Echo" (background lore, not in-world terminology yet)

The energy that powers the rift came from nuclear experiments:

- Post-1940 (the bombs fell earlier in this timeline), government scientists found that nuclear
  blasts released **something beyond radiation** — a harvested force they couldn't fully categorize.
- The program escalated in stages: small resonance devices → small rifts that closed on their own
  → larger arrays → **this city's array** that held a portal permanently open. Each stage was
  treated as progress, not warning. See the full tech progression in _Setting > The experiment_.
- **"Echo" is not a word that exists in the game world at the start.** Players encounter the
  energy, see the monsters it unleashed, fight toward the source. The name is earned — if at all
  — by the end, when they understand what they've been dealing with.

## The reveal structure (narrative map, floor by floor)

The backstory is **not announced**. The player pieces it together through environmental clues
and survivor hints. The key reveal — **humans caused this** — should hit only near the end.

| Floor(s)                         | What the player experiences                                                                                                                                                                                                                                                   | What they don't know yet                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **1–2** (Outskirts, Barricade)   | Just monsters. Survival mode. A survivor might say "don't go toward the center" or "the ones who built that thing are long gone" — cryptic, nothing explained.                                                                                                                | Everything. They don't know about the experiment at all. |
| **3–4** (Fungal Depths, Kennels) | Environmental clues start: abandoned equipment in rooms, partially burned schematics, government crates with operation codenames stenciled on. Graffiti: "RESONANCE ARRAY — DO NOT APPROACH." Civil war damage and rift damage look the same — can't tell which caused which. | What the array was, or that this city was its test site. |
| **5** (Catacombs → core)         | The experiment site itself. The player is walking into ground zero. The final approach makes it undeniable: this wasn't cosmic bad luck — it was **built here**.                                                                                                              | Only the final piece: what's on the other side.          |
| **Crossing over**                | The portal. The other world. It's quiet. The creatures aren't attacking an invasion force — they're just there, in their world. The horror is retrospective: _we did this._                                                                                                   | Nothing — by here, they know.                            |

The **Dad and Son** are silent protagonists — _they_ don't know the lore. The player discovers it
ahead of them. That gap between player knowledge and character knowledge creates dread.

## Implicit storytelling — how to deliver the lore

The backstory is **never stated in dialogue or UI text**. Where it lives:

1. **Environmental objects.** Abandoned resonance equipment fragments, scorched schematics, government
   crates stamped with operation codenames. Players who explore find it; players who don't, miss it
   — that's the right trade.
2. **Survivor dialogue (handled carefully).** Survivors hint, they don't explain. Good: "the army
   ran _from_ the center, not toward it." Bad: "the government built a resonance array in 1957 that
   opened a portal." Let the player infer.
3. **Room names.** "The Array Approach." "Resonance Block." "Processing Site 4." These carry lore
   without a single word of exposition text.
4. **Weapon and item descriptions.** A found prototype might say "DO NOT OPERATE WITHOUT SHIELDING"
   — no explanation of what it does or why. The absence of explanation is the horror.
5. **Graffiti / wall detail.** Kilroy-style markings, civil war slogans ("PEOPLE OVER GOV"), and
   experiment warnings coexist on the same walls. The player pieces together two different
   disasters' worth of history from the same surface.

## Tone & canon rules (the guardrails)

Keep new content inside these so the theme doesn't get lost:

1. **Mid-to-late 1950s era, nameless ruined city; the war was a CIVIL war (people vs. government,
   post-WW2 collapse).** Scavenged, paranoid, Cold War atmosphere — the decade is a tech/era
   anchor, not real history.
2. **The rift is the center and the goal.** Everything pushes toward crossing over.
3. **Harder toward the center.** Spawns escalate as you approach the core.
4. **NO zombies.** Other undead + demons + warped "other things" only.
5. **Trust is temporary and earned.** Humans help for a while, or turn on you.
6. **Weapons: 1950s-era base × rift-tech, period-correct (no anachronisms), and they can come
   alive.**
7. **Fun-first, kid-fair** (ADR-0005): readable telegraphs, dodge gaps, nothing cheap.

## The hidden layer — engineered war, the Echo subjects, and the collusion (2026-07-05 lore session)

> **How to read this section.** Everything above is the **surface truth** — what an ordinary
> first playthrough shows: monsters poured out of an experiment gone wrong, the war was human
> paranoia, _we did this_. That reading stays true and complete on its own. This section is the
> **layer underneath it** — a deeper truth the game **never states on a first run**. It surfaces
> only through repeat playthroughs, secret rooms/endings, and NG+ (see _Multi-playthrough_ below).
> The two layers must not contradict: the surface tragedy is real; the hidden layer explains that
> _more of it was on purpose than anyone was meant to know._ Firmness is marked per beat.

### Engineered distrust — the war was manufactured _(locked)_

The civil war (people vs. government) reads on the surface as organic paranoia spiraling out of
control. The hidden truth: **it was engineered.** The government can't wield magic or literal
mind-control the way rift-things can — so instead it **manufactured distrust**, turning neighbors
and factions against each other until the country tore itself apart. The civil war wasn't a
failure of order; it was a **tool**. (This threads the existing MK-ULTRA and Echo-SAGE flavor —
those weren't just background paranoia, they were the delivery mechanism.)

### Echo is used on people — the subjects _(locked)_

Echo (the harvested nuclear force; see _The energy source_) is not only rift fuel. The government
**doses people with it** — test subjects — to make them stronger and to power exotic weapons.

- **It deforms or breaks almost everyone.** Most subjects mutate, lose their minds, or both. The
  program treats them as disposable.
- **The leaders never take it themselves.** Echo is for subjects and soldiers, never the people
  who order its use. That hypocrisy is a core piece of who the villains are.
- **The Dad and the Son can use Echo without deforming or going insane.** Why they're different
  is a mystery the player may earn late — but it's the reason they can keep getting stronger and
  keep pushing toward (and eventually into) the rift when others can't.
- **Mechanical tie-in:** the meta-currency the player grinds — **Echoes**, spent in **Resonance**
  to permanently level up — _is this substance_. Every permanent upgrade is the Dad and Son dosing
  themselves with the thing that ruins everyone else. The currency **is** the plot; nothing new to
  build, just name it with intent.

### The father-son tech duo — how they get through _(strong, tentative on specifics)_

The Dad and Son are **not** anti-government heroes or chosen ones. They're a **tech-savvy,
lone-wolf father-son duo** — scavengers and tinkerers who **gather and assemble the pieces** needed
to reach and enter the rift. Prior humans could only enter the rift in heavy rad-shielding suits;
the duo engineers their own way in. This answers the old open question _"why are they still
together in the worst place on earth"_: they're a team by trade and temperament, not by fate.
(Names still open — Caden + Scott pick.)

### The demon companion — a defector, not a pet _(locked concept; mechanics in plan 0003, CP-C)_

Not every rift-thing wants the war. **Some monsters were sealed off — cut out of any ability to
communicate with humans** — and among them are ones who never chose to fight. One such creature can
be brought along as a **companion in battle**: mechanically the demon ally (see plan
[0003](plans/0003-ui-first-legibility-arc.md)). It is **not a "pet," not cute** — it's a demon out
of the portal, kept at your side. It's the first crack in the surface story: if a monster can _not_
want the war, then the war was never simply "monsters vs. us." It's the on-ramp to the collusion
reveal and to the later playable-monster perspective.

### The collusion — gov and monsters, secretly _(direction only — deliberately unresolved)_

The deepest layer, revealed only very late (NG+ / secret endings / possible DLC): **elements of the
government and certain rift-powers are secretly in contact — working together toward some end,
while each plans to betray the other.** This does **not** mean a mass organized invasion (the
general monster population is still disoriented and un-organized, per _The other world_) — it's an
**elite-level collusion** hidden beneath the chaos. **What they're building toward is not yet
decided ("IDK what yet").** Capture the shape, not the specifics; lock the endgame later, on
purpose, so a first-time player never smells it.

### Playing the other side — the perspective flip _(direction only)_

At some point deep in the layered story, the player **crosses fully over and/or plays as a monster**
— or comes to understand the war from a rift-thing's point of view (the companion is the seed of
this). A tool the humans lack — the rift-things' capacity for something like mind-to-mind contact —
becomes legible from the inside. Late, secret, NG+ territory.

### Multi-playthrough, not just endless _(design intent)_

The **first run is a warm-up, not the ending.** Story mode is built for **multiple playthroughs**:
secret endings, hidden areas and rooms, and truths that only assemble across repeat runs — story
replayability comes from **grinding Echoes** (the substance) and peeling back the hidden layer, not
from an infinite treadmill. **Endless** is a separate, deliberately brutal mode that ramps fast and
hard (tuned as boss patterns/phases mature) — see plan [0003](plans/0003-ui-first-legibility-arc.md),
CP-E. The distinction: Story = _depth across runs_; Endless = _how far can you push one run._

## Open questions / placeholders (decide later, then write it here)

- **Name of the other side** — the world is described in _The other world_ section above, but it
  has no name yet. "The other side" / "the zone" are placeholders. **Caden picks.**
- **Final zone / boss beyond the portal** — crossing the rift ends the current run; what's the
  full post-portal act? A boss that lives in the other world? A way to destroy the array from
  the inside? TBD.
- **Multiple endings** — three-ending spec is in the session plan (A: Close It, B: The Truth, C:
  What We Are). Needs inkjs integration before implementation.
- **"Living Weapons" rules** — how a weapon wakes up, what it does, is it good or a curse?
  Needed before building the Living Weapons arc.
- **Survivor ally system** — temp companions, escort/quest rooms, trade, area mini-games. Design
  before building.
- **The dad & son** — names? a reason they're still together in the worst place on earth? **Caden
  and Scott pick.**
- **NPC/survivor flavor text** — names and distinct lines for the in-game survivor interaction
  prompts. Even 3–4 names + one-liners each would add a lot of life.

## Atmosphere & flavor sources (background research, not lore decisions)

Scott's 1940s–50s American folklore research. Relevant for art direction, room themes, and enemy
flavor:

- **Dark Watchers (Big Sur)** — shadowy tall figures in coastal mountains. Good enemy silhouette
  inspiration.
- **Foo Fighters / early UFO sightings** — glowing orbs trailing aircraft. Could be a projectile
  or enemy visual motif.
- **Phantom Hitchhiker** — ghost that appears human, then isn't. Maps well onto the Human boss /
  "trust is a gamble" pillar.
- **Kilroy Was Here** — veteran graffiti that spread everywhere. Good in-world detail for
  ruins/walls.
- **The Philadelphia Experiment** — ship turned invisible via military tech. Fits the "government
  experiments gone wrong" theme.

These are **atmosphere/flavor sources**, not canon decisions. Use them to inspire room names, wall
detail, enemy design — don't force them into plot.

### Real 1950s classified programs — weapon / lore name table

All declassified and public domain. Use for weapon names, operation codenames, room names, item
descriptions, and graffiti:

| Program                                  | Real context (brief)                                                                                                          | Game use                                                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Project Pluto** ("The Flying Crowbar") | Nuclear ramjet missile; unshielded reactor powering a supersonic cruise weapon — everything in its flight path was irradiated | Weapon name ("Pluto Drive"), enemy projectile type, room crate label                                                       |
| **Operation Argus**                      | 1958 — US detonated nukes in space to create an artificial radiation belt; "first time humans altered space weather"          | In-world name for the experiment: "the Argus Array" or "the Argus Event" — **Caden to confirm**                            |
| **Operation Plumbbob**                   | 30 nuclear test shots in 1957; individual shot names: Hood, Harry, John, Able, Diablo, Boltzmann, Wilson                      | Weapon names ("Hood Carbine," "Boltzmann Charge"), graffiti/crate stencils, operation codenames in abandoned files         |
| **Project 1794**                         | Flying-saucer-shaped aircraft contracted to shoot down Soviet bombers                                                         | A crate in a room stamped "PROJECT 1794 — TRANSIT PROTOTYPE"; a strange weapon silhouette                                  |
| **MK-ULTRA**                             | CIA mind-control program using LSD and BZ on unknowing subjects                                                               | Why some survivors act erratic; "government experiment" flavor in survivor dialogue; ties to the civil war paranoia pillar |
| **Philadelphia Experiment**              | Ship allegedly made invisible by military tech (already in this doc above)                                                    | The resonance experiment's cover story — it was publicly presented as a "transit" test                                     |
| **SAGE network**                         | Semi-Automatic Ground Environment — massive Cold War radar + computer net to detect Soviet bombers                            | "Echo-SAGE" as the in-world name for the detection system the government used to track rift energy before the public knew  |

**Weapon naming convention:** base name is 1950s-era hardware (M1, .45, carbine, launcher) +
operation codename when rift-fused. Examples: "Hood Carbine," "Argus Launcher," "Pluto Drive."

---

_Add to this file whenever a story beat gets locked. If a new monster, weapon, or area would
break a canon rule above, it doesn't go in — or the rule changes here first, on purpose._
