// =====================================================================
// statsPanel.js — PURE (no THREE / no DOM): turn a Player.statsSnapshot() into display-ready
// sections of { label, value } rows for the pause-menu stats panel (CP-A).
//
// Raw values ONLY — no explanations, no "what luck does" tooltips. The design rule is
// no hand-holding: the numbers are there to DISCOVER, not to be taught. Kept pure so the
// exact readout is unit-testable and can't silently drift into a walkthrough.
// =====================================================================

const n = (v) => (Number.isFinite(v) ? v : 0);
const mul = (v) => '×' + n(v).toFixed(2);
const pct = (v) => (n(v) >= 0 ? '+' : '') + Math.round(n(v) * 100) + '%';
const flat = (v) => (n(v) >= 0 ? '+' : '') + n(v);
const int = (v) => String(Math.trunc(n(v)));

/**
 * @param {object} s a Player.statsSnapshot()
 * @returns {Array<{title:string, rows:Array<{label:string,value:string}>}>}
 */
export function statRows(s = {}) {
  const b = s.baseline || {};
  const w = s.weaponStacks || {};
  return [
    {
      title: 'Vitals',
      rows: [
        { label: 'Hearts', value: `${int(s.hearts)} / ${int(s.maxHearts)}` },
        { label: 'Armor', value: int(s.guardCharges) }, // CP-B: guard charges = atomic armor plates
      ],
    },
    {
      title: 'Offense',
      rows: [
        { label: 'Damage', value: mul(s.damageMul) },
        { label: 'Fire rate', value: mul(s.fireRateMul) },
        { label: 'Flat damage', value: flat(s.globalDamageFlat) },
        { label: 'Blade aura', value: int(s.bladeAura) }, // CP-B: passive blade-aura level
      ],
    },
    {
      title: 'Mobility & fortune',
      rows: [
        { label: 'Move speed', value: mul(s.speedMul) },
        { label: 'Luck', value: int(s.luck) },
      ],
    },
    {
      title: `Weapon — ${s.weapon || '—'}`,
      rows: [
        { label: 'Damage stacks', value: int(w.damage) },
        { label: 'Fire-rate stacks', value: int(w.fireRate) },
        { label: 'Pierce', value: int(w.pierce) },
        { label: 'Bounce', value: int(w.bounces) },
        { label: 'Bullet speed', value: int(w.bulletSpeed) },
        { label: 'Blast radius', value: int(w.explodeRadius) },
      ],
    },
    {
      title: 'Permanent (Resonance)',
      rows: [
        { label: 'Damage', value: pct(b.damage) },
        { label: 'Fire rate', value: pct(b.fireRate) },
        { label: 'Speed', value: pct(b.speed) },
        { label: 'Armor', value: flat(b.guard) }, // CP-B: permanent guard/armor plates (Aegis)
        { label: 'Luck', value: n(b.luck).toFixed(1) },
      ],
    },
  ];
}

/**
 * CP-C (ADR-0042): the demon companion's pause-menu readout — what the seal is feeding it
 * (a Demon.statsSnapshot(): the three inherited multipliers). Same raw-token discipline as
 * statRows; a SEPARATE export so the locked statRows contract (tests/statsPanel.test.js)
 * never drifts. Missing snapshot → identity (a base-stats demon), never a throw.
 *
 * @param {{damageMul?:number, fireRateMul?:number, speedMul?:number}} d
 * @returns {Array<{title:string, rows:Array<{label:string,value:string}>}>}
 */
export function demonRows(d = {}) {
  const or1 = (v) => (Number.isFinite(v) ? v : 1); // identity, not zero — inheritance is a multiplier
  return [
    {
      title: 'Inherited (Resonance)',
      rows: [
        { label: 'Damage', value: mul(or1(d.damageMul)) },
        { label: 'Fire rate', value: mul(or1(d.fireRateMul)) },
        { label: 'Move speed', value: mul(or1(d.speedMul)) },
      ],
    },
  ];
}

/**
 * ADR-0045: the run's KARMA — a single signed number (help +, leave/dose −), shown raw. It's a
 * per-RUN, game-level value (not per-player), so it's its own tiny section rather than a player
 * column. No blurb (no-hand-holding): what it does to your luck is for the player to notice.
 * A SEPARATE export (like demonRows) so the locked statRows contract never drifts.
 *
 * @param {number} karma signed run karma
 * @returns {Array<{title:string, rows:Array<{label:string,value:string}>}>}
 */
export function karmaRows(karma = 0) {
  const k = Math.trunc(n(karma));
  const signed = k > 0 ? `+${k}` : String(k); // 0 → "0", never "+0"
  return [{ title: 'Standing', rows: [{ label: 'Karma', value: signed }] }];
}
