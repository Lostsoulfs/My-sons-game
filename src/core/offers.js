// =====================================================================
// offers.js — PURE generation of the room-clear "pick 1 of 3" upgrade offer (B9). No THREE, no
// game state — just (rng, ctx) -> cards, so it's deterministic + unit-testable.
//
// Per card: roll a TIER (weighted by config.OFFERS.tierWeights, with a soft/hard PITY floor on the
// first card), then pick a distinct ITEM of that tier from the core/items.js registry — down-weighting
// items offered recently and weapons you already own, and steering toward CATEGORY VARIETY so you
// rarely see three of the same kind. Self-contained (its own tier ladder incl. `ultra`) so it never
// disturbs the B8 ground-drop rarity engine (core/drops.js / config.PICKUPS.rarity).
// =====================================================================

import { OFFERS } from '../config.js';
import { TIERS, itemsByTier, blurbFor } from './items.js';
import { weightedChoice } from './weighted.js';

function tierIndex(t) {
  return TIERS.indexOf(t);
}

/**
 * The guaranteed floor tier for one card given the dry common-streak (soft + hard pity). Returns the
 * highest tier any rule implies, or null for no floor. PURE — the streak is tracked by the caller.
 */
export function pityFloorTier(commonStreak) {
  const { softPity, hardPity } = OFFERS;
  let floor = null;
  const raise = (t) => {
    if (!floor || tierIndex(t) > tierIndex(floor)) floor = t;
  };
  if (commonStreak >= softPity.rareAfter) raise('rare');
  if (commonStreak >= softPity.epicAfter) raise('epic');
  if (commonStreak >= hardPity.commonStreakMax) raise(hardPity.minTier);
  return floor;
}

/** roll a tier by weight, never below `minTier`, skipping empty tiers. */
function rollTier(rng, minTier) {
  const minIdx = minTier ? Math.max(0, tierIndex(minTier)) : 0;
  const entries = TIERS.filter((t, i) => i >= minIdx && (itemsByTier[t]?.length ?? 0) > 0).map(
    (t) => ({ value: t, weight: OFFERS.tierWeights[t] ?? 0 }),
  );
  return weightedChoice(rng, entries);
}

/** anti-repeat pick weight for one item: down-weight recently-offered items + already-owned weapons. */
function itemWeight(it, baseWeight, recent, owned) {
  let w = baseWeight;
  if (recent.has(it.id)) w *= OFFERS.recentDecay;
  if (it.category === 'weapon' && owned.has(it.id)) w *= OFFERS.ownedWeaponDecay;
  return w;
}

/** build [{value, weight}] candidates across the given tier pools, optionally excluding a category. */
function candidateEntries({
  pools,
  spanning,
  chosen,
  recent,
  owned,
  avoidCat,
  blocked,
  weaponDecay = 1,
}) {
  const entries = [];
  for (const t of pools) {
    const tierW = spanning ? Math.max(OFFERS.tierWeights[t] ?? 0, 0.0001) : 1; // span → weight by rarity
    for (const it of itemsByTier[t] ?? []) {
      if (chosen.has(it.id)) continue;
      if (blocked?.has(it.id)) continue; // ADR-0030: maxed stats + gated mods are out of the pool
      if (avoidCat && it.category === avoidCat) continue;
      let w = itemWeight(it, tierW, recent, owned);
      if (it.category === 'weapon') w *= weaponDecay; // extra down-weight for a 2nd+ weapon (ADR-0030)
      entries.push({ value: it, weight: w });
    }
  }
  return entries;
}

/**
 * Pick a distinct item, anti-repeat-weighted. With `tier` set, picks within it; without, spans ALL
 * tiers (the variety card, so it can always reach another category). `avoidCat` is relaxed only if it
 * would otherwise empty the pool.
 */
function pickItem(
  rng,
  { tier = null, chosen, recent, owned, avoidCat = null, blocked, weaponDecay },
) {
  const pools = tier ? [tier] : TIERS;
  const opts = { pools, spanning: !tier, chosen, recent, owned, blocked, weaponDecay };
  let entries = candidateEntries({ ...opts, avoidCat });
  if (!entries.length) entries = candidateEntries({ ...opts, avoidCat: null });
  return weightedChoice(rng, entries);
}

/** the category that has filled cardCount-1 slots (so the next card should avoid it), else null. */
function overflowCategory(catCount) {
  if (!OFFERS.categoryVariety) return null;
  return Object.keys(catCount).find((c) => catCount[c] >= OFFERS.cardCount - 1) ?? null;
}

/** draw one card's item: variety-aware, with the pity floor applied to the first card. */
function drawCard(rng, { index, floor, chosen, catCount, recent, owned, blocked, weaponDecay }) {
  const avoidCat = overflowCategory(catCount);
  const gate = { blocked, weaponDecay };
  let item;
  if (avoidCat) {
    item = pickItem(rng, { chosen, recent, owned, avoidCat, ...gate }); // span tiers to reach another category
  } else {
    const tier = rollTier(rng, index === 0 ? floor : null) ?? rollTier(rng, null);
    item = tier ? pickItem(rng, { tier, chosen, recent, owned, ...gate }) : null;
  }
  return item ?? pickItem(rng, { chosen, recent, owned, ...gate }); // last-ditch: any not-chosen item
}

/**
 * Generate the offer: `OFFERS.cardCount` distinct cards. PURE + seeded (ADR-0013) → reproducible.
 * @param {{next:()=>number, int:(n:number)=>number}} rng
 * @param {{owned?: Iterable<string>, recent?: Iterable<string>, stacks?: Record<string,number>,
 *          commonStreak?: number}} [ctx]
 *   owned = weapon ids already carried; recent = recently-offered ids; stacks = id->count (for the
 *   marginal "+X%" blurb); commonStreak = dry-streak of commons taken (drives pity).
 * @returns {Array<{id:string, name:string, category:string, tier:string, blurb:string}>}
 */
export function generateOffer(rng, ctx = {}) {
  const owned = ctx.owned instanceof Set ? ctx.owned : new Set(ctx.owned ?? []);
  const recent = ctx.recent instanceof Set ? ctx.recent : new Set(ctx.recent ?? []);
  const stacksOf = ctx.stacks ?? {};
  let floor = pityFloorTier(ctx.commonStreak ?? 0);
  // boss clears guarantee at least a 'rare' floor card (ADR-0030 boss-tier reward)
  if (ctx.bossTier && (!floor || tierIndex(floor) < tierIndex('rare'))) floor = 'rare';

  // ADR-0030 weapon-aware gating — all opt-in via ctx; absent fields ⇒ no gating (back-compat):
  //   • drop a stat card once the HELD gun has maxed it (statCap),
  //   • withhold explosive tips on already-explosive or fast-firing guns,
  //   • down-weight weapon offers once you already carry more than one gun.
  const blocked = new Set();
  const cap = ctx.statCap ?? Infinity;
  const ws = ctx.weaponStat ?? {};
  if ((ws.DAMAGE_UP ?? 0) >= cap) blocked.add('DAMAGE_UP');
  if ((ws.FIRE_RATE_UP ?? 0) >= cap) blocked.add('FIRE_RATE_UP');
  if (ctx.weaponExplosive || ctx.weaponFast) blocked.add('MOD_BLAST');
  const weaponDecay = (ctx.ownedCount ?? 0) > 1 ? (OFFERS.extraWeaponDecay ?? 1) : 1;

  const chosen = new Set();
  const catCount = {};
  const cards = [];
  for (let i = 0; i < OFFERS.cardCount; i++) {
    const item = drawCard(rng, {
      index: i,
      floor,
      chosen,
      catCount,
      recent,
      owned,
      blocked,
      weaponDecay,
    });
    if (!item) break; // registry exhausted (won't happen at the current size)
    chosen.add(item.id);
    catCount[item.category] = (catCount[item.category] ?? 0) + 1;
    cards.push({
      id: item.id,
      name: item.name,
      category: item.category,
      tier: item.tier,
      blurb: blurbFor(item, { stacks: stacksOf[item.id] ?? 0 }),
    });
  }
  return cards;
}
