// =====================================================================
// weaponFxDerive.js — derive a weapon's FX descriptor from its config (PURE:
// no THREE, no game state → unit-testable). Flavor (ballistic vs energy) plus
// trail / muzzle / impact shapes, so the existing guns get juice with ZERO
// config edits; an explicit `weapon.fx` overrides field-by-field.
//
//   kind:   'ballistic' (lead — warm tracer) | 'energy' (glowing bolt/beam)
//   trail:  'tracer' | 'bolt' | 'beam' | 'none'
//   muzzle: 'flash' | 'glow' | 'none'
//   impact: 'spark' | 'scorch' | 'burst' | 'none'
// =====================================================================

/** a bright, green/blue-leaning bullet color reads as "energy" (laser/plasma/ray). */
export function isEnergyColor(color) {
  if (color == null) return false;
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const bright = Math.max(r, g, b) >= 0xc0;
  const cool = g >= r || b >= r; // not warm-lead (red-dominant)
  return bright && cool;
}

/**
 * @param {object} w a config.WEAPONS entry (may carry an explicit `fx` override)
 * @returns {{kind:string, trail:string, muzzle:string, impact:string, color:(number|null)}}
 */
export function deriveWeaponFx(w) {
  const energy = isEnergyColor(w && w.color);
  const explosive = !!(w && w.explosive);
  const pierce = (w && w.pierce ? w.pierce : 0) > 0;
  const derived = {
    kind: energy ? 'energy' : 'ballistic',
    trail: energy ? (pierce ? 'beam' : 'bolt') : 'tracer',
    muzzle: energy ? 'glow' : 'flash',
    impact: explosive ? 'burst' : energy ? 'scorch' : 'spark',
    color: w && w.color != null ? w.color : null,
  };
  return { ...derived, ...(w && w.fx ? w.fx : {}) };
}

/** the rarity → FX-intensity multiplier (higher rarity = juicier); 1 when unknown. */
export function rarityIntensity(tier, scale) {
  return (scale && scale[tier]) || 1;
}
