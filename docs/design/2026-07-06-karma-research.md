# Karma / luck-economy — research digest & v2 direction (2026-07-06)

Deep-research pass (fan-out web search → source fetch → 3-vote adversarial verification →
synthesis) validating the KARMA system (ADR-0045) against how proven games do luck, loot, and
morality. All claims below are `high` confidence, verified 3-0 or 2-1. Raw output archived in the
session task log; this doc is the actionable digest.

## TL;DR

**The math is right — keep it. The design risks are coupling and legibility.** Two things to
change how we _think about_ the system, one thing to add:

1. **Don't let loot be the ONLY (or main) thing karma drives** — tying a morality meter directly
   to mechanical rewards is the single most-cited failure mode (it makes players min/max to one
   pole and kills authentic choice). Spread karma across **visible** systems.
2. **The "help = risky, leave = safe" split may punish the majority** — most players play good by
   default (~59% good, 90%+ Paragon in telemetry), so most players take the risky/self-harming
   path. The good path must _feel rewarding_, not corrosive.
3. **Add legible titles/flags** alongside the raw number — a hidden number alone reliably feels
   invisible (Isaac's Luck stat is a derided dump stat).

## What the research VALIDATED (keep as-is)

- **The DR luck curve is a sound, standard model.** `bonus = max·(stacks/(stacks+half))` is the
  same hyperbolic-saturation family as **Diablo 2 magic find** (`Effective MF = MF·k/(MF+k)`),
  which — like ours — applies diminishing returns only to higher rarities and leaves commons
  exempt. Ours just saturates toward a 1.9× cap instead of D2's hard per-rarity ceiling. [3-0]
- **Capping the loot-facing portion is correct.** Isaac clamps Luck to **0–10** for room-drop
  quality while leaving Luck uncapped for other effects — exactly our instinct (±12 clamp on the
  loot dial, other future karma effects open-ended). [3-0]
- **The floored curse (never below 0.15×, "drops thin but never vanish") has good precedent.**
  Enter the Gungeon's hidden **magnificence** stat silently lowers high-tier drop odds after you
  hoard power — a legit invisible anti-runaway companion mechanic. [3-0]
- **Pick-1-of-3 offers are best-practice.** Hades' boon draft (three random options per offer)
  is the modern shape; applying the luck multiplier to rare+ _weights behind a 3-choice draft_ —
  exactly what we do — is the right delivery vehicle. [3-0]
- **A graduated −12..+12 dial beats a binary good/evil split.** Isaac's Devil/Angel _path-lock_
  (one paid Devil Deal permanently blocks Angel Rooms) is the cautionary case; binary framing is
  the most-cited morality failure. Our graduated dial is the better structure — **keep it.** [3-0]
- **"Virtuous choice is risky" is a proven pattern.** It's the mirror of Isaac's Devil Deals
  (power costs your _own_ health — self-sacrifice-for-power). Coupling an alignment choice to a
  concrete resource cost is established and engaging. Ours is altruism-as-risk. [2-1]

## What the research FLAGGED (change our thinking)

- **Coupling morality → loot is the #1 failure mode.** Mass Effect 2's percentage Paragon/Renegade
  checks made the middle worthless and forced pole-specialization — BioWare _itself_ loosened it in
  the Legendary Edition. **The caution is aimed squarely at our core karma→loot link.** Fix isn't
  to drop the math — it's to make loot _one_ facet, not the whole payoff. [3-0]
- **Most players are good, so the "good = risky/self-harming" path is the majority experience.**
  Peer-reviewed (Lange 2014, n=1067): 59% good / 5% only-evil; 80% of repeat players pick their
  real morality first; BioWare telemetry ~90%+ good. If helping is both the default AND the
  painful choice, most players live in the corrosive half. **Helping must pay off perceptibly.** [3-0]
- **A hidden number feels invisible.** Isaac's Luck is "a dump stat, the display never seemed to
  move"; Isaac shipped ~14 years with no in-game item descriptions. Our raw-signed-number-no-tooltip
  pause readout risks the same fate. [2-1 / 3-0]
- **Breakpoints make luck _felt_.** Isaac's per-effect luck thresholds (Poop guaranteed at 5 Luck,
  etc.) let players chase a known target; a pure asymptote can't offer that. A visible milestone or
  two would make karma legible. [3-0]

## Structural options the research surfaced

- **Sticky titles / "Relevant Deeds" (Fallout).** Pair the scalar with a few human-readable flags
  ("Saint", "Forsaken", a Childkiller-style stain) that the world reacts to — legible without
  tooltips, and it stops the number from flattening every deed into "how much." [3-0]
- **Spread karma to VISIBLE systems (Darkest Dungeon II).** DD2 ties its relationship dial to
  _visible_ combat buffs/debuffs (Amorous heals + cleanses; Hateful causes friendly-fire &
  vulnerability), not loot. Effects you can SEE make a dial meaningful without a manual. [3-0]
- **Double axis (New Vegas Fame/Infamy).** Track good and evil _independently_ so good deeds don't
  silently cancel prior evil, yielding grey labels ("Soft-Hearted Devil"). More nuance, more work —
  noted as an option, likely overkill for v2. [3-0]

## Recommended v2 direction (for the father-son team to decide)

The story already wants this: **negative karma is Echo corruption** — it should be _felt and seen_,
not just "worse loot." So evolve karma from "a second luck dial" into **"your corruption / standing,
which the world responds to,"** with loot as one facet among several:

- **Keep** the DR luck math, the ±12 clamp, the floored curse, the 3-choice draft. All validated.
- **Demote loot to one facet.** Karma still nudges drops, but it's no longer the whole payoff.
- **Add visible karma effects** (pick a couple to start): survivors trust/fear you (help odds and
  prices shift with standing); at deep negative, enemies grow more aggressive / you visibly corrupt;
  a title on the pause screen and HUD; a karma-gated ending beat later.
- **Make helping pay perceptibly** so the majority-good path feels good: e.g. a _visible_ karma-up
  flourish, and a positive-karma perk that's felt (not just a hidden weight nudge) — or soften
  helping's immediate risk so the good deed isn't mostly punishment.
- **Add 1–2 legibility anchors**: a title band ("Saint / Marked / Forsaken") and/or a felt
  breakpoint, so the dial is discoverable without a tooltip wall.

None of this throws away ADR-0045 — the shipped dial is the correct _spine_. This is about what it
_drives_ and how the player _reads_ it.
