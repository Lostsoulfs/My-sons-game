// =====================================================================
// weighted.js — PURE weighted random choice (no imports). Shared by the drop (core/drops.js) and
// offer (core/offers.js) systems so the "roll a weighted bucket" logic lives in exactly one place.
// =====================================================================

/**
 * Pick one `value` from `[{value, weight}]` with probability proportional to weight. Falls back to a
 * uniform pick when every weight is 0, and returns null for an empty list. Seeded via `rng` (the
 * project's mulberry32 — ADR-0013) so callers stay reproducible/testable.
 * @param {{next:()=>number, int:(n:number)=>number}} rng
 * @param {Array<{value:*, weight:number}>} entries
 * @returns {*} the chosen value (or null if entries is empty)
 */
export function weightedChoice(rng, entries) {
  if (!entries.length) return null;
  const total = entries.reduce((s, e) => s + e.weight, 0);
  // `!(total > 0)` (not `total <= 0`) so a NaN total ALSO routes here — a degenerate/NaN weight
  // set degrades to a benign uniform pick instead of silently falling through to the last (highest)
  // entry. Defence-in-depth for any upstream that hands in a bad weight.
  if (!(total > 0)) return entries[rng.int(entries.length)].value;
  let roll = rng.next() * total;
  for (const e of entries) {
    roll -= e.weight;
    if (roll <= 0) return e.value;
  }
  return entries[entries.length - 1].value; // float-drift fallback
}
