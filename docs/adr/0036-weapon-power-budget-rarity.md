# ADR-0036: Weapon power-budget model — rarity ≈ power, strict pyramid, no pity

- **Status:** Proposed
- **Date:** 2026-07-05

## Context

Playtest (2026-07-05): rarity didn't track power. A power-budget scoring pass on the 22-gun
roster confirmed it — the Browning (a no-real-downside belt gun) was the #1-scoring weapon yet
tagged _epic_; the Laser Pistol (a _common_) out-scored most rares; the Davy Crockett tactical
nuke (an _ultra_) scored **below commons**. Tier counts were an inverted **7 / 7 / 9 / 2**
(more epics than rares). Owner asks, verbatim: "make the guns' math match," fewer epics/ultras,
Luck must matter, and every power weapon (minigun, nukes) must carry a real cost. CP2 (ADR-0035)
already gave every gun a reload/overheat **duty cycle** — the lever this ADR scores against.

## Decision

**A single power scalar decides rarity.** `core/powerScore.js` (PURE, no THREE):

```
PowerScore = burstDPS · dutyCycle · accuracy(spread,pellets) · range(bulletSpeed)
           · scenario(targetCount) · alpha(AoE burst)
```

- **dutyCycle** (`core/duty.js`) is the sole _subtracted_ term — a high-burst gun pays its raw
  DPS back in reload/overheat downtime, which is what lets rarity ≈ sustained power. Derived from
  the same `config.WEAPON_LIMITS` the live mechanic uses, so the scored number == what you feel.
- **effectiveCooldown** scores a gun at its _real_ cadence: a full **charge** costs charge-time +
  cooldown (not the base cooldown); a spun-up **minigun** is valued at its wound-up end cadence.
- **scenario** blends single-target + a small crowd so pierce/AoE archetypes score on what they hit
  (capped at `CROWD_N`).
- **alpha** is an **AoE-only** burst credit: a nuke that deletes a cluster in one shot (Davy
  Crockett) is worth more than its sustained DPS says. Reach is the _uncapped_ blast area, so a
  room-nuke (r8) dwarfs a small blast; pierce lines earn nothing here (already credited via
  scenario). This is what finally scores the nuke as a true ultra without an absurd one-shot damage.

**Tiers are score bands** (`config.TIER_BANDS`), tuned to the roster into a strict **8 / 7 / 5 / 2**
pyramid (common/rare/epic/ultra) with **strictly increasing per-tier medians**. Notable re-tiers:
bouncer/thompson/homing/railgun → common; rocket/orbital → rare; the epic pool cut from 9 → 5.
**ULTRA = offer-only** (minigun + Davy Crockett): tagged `ultra` in `core/items.js` but absent from
the ground-drop table, and both out-score every epic. Energy heat params were re-tuned so every
energy gun **actually overheats** under sustained fire (before, most had `duty 1` — no downside).

**No pity.** Dry-streak pity (offers _and_ drops) is disabled behind `pityEnabled: false`; a run can
go all-common (harsh, by request). The **boss-clear rare+ floor stays** — it's a separate mechanism.
Epic weights tightened (Scott: "too many epic/ultra"). Helpers kept behind the flag for future use.

`tests/weaponEconomy.test.js` (roster contract: every gun in-band, pyramid counts, medians increase,
every gun has a downside, ultra offer-only) + `tests/powerScore.test.js` (the pure model) lock it.

## Consequences

- **Easier:** rarity now _means_ power — a golden test fails loudly if any future stat/limit edit
  drifts a gun out of its band, so balance can't silently rot. The model is a live design tool
  (a scratch harness reads real config and prints the tier table).
- **Harder / accepted:** the sustained-DPS model needed the explicit **alpha** term to value burst
  room-clear — one more knob to reason about, but it isolates cleanly to explosives. Bands are
  tuned to _this_ roster; adding a gun means placing it in a band + giving it a downside (the test
  enforces both). Removing pity makes early runs swingier — intended; the boss floor is the backstop.
- **Determinism (ADR-0013) preserved:** all new logic is pure and config-driven; no RNG, no
  wall-clock. Luck/curse math and the HP/soak upgrade rework are **CP4** (next), not here.

## Alternatives considered

- **Sort-and-slice into the pyramid, no alpha term.** Rejected — it buried the Davy Crockett nuke in
  _common_ (its value is alpha, not sustained DPS). The AoE-only alpha credit fixes that honestly.
- **Cranking nuke base damage until it sustained-scores ultra.** Rejected — it would one-shot bosses
  and violate the "no one-shots" cap. Alpha rewards burst without inflating raw damage.
- **Keeping pity as a safety net.** Rejected by the owner — the pyramid is meant to be harsh; Luck
  (CP4) becomes the _earned_ dial instead of a guaranteed floor. Boss clears still always pay.
- **A minigun that never overheats (duty ~1) to top the chart.** Rejected — Scott explicitly wants a
  cooldown on rapid/nuke guns; it now has a lenient (~13 s sustained) overheat and still scores ultra.
