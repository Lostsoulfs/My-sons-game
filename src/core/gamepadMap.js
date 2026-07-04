// =====================================================================
// gamepadMap.js — resolve WHICH axes carry the right (aim) stick, for any
// controller, and own the single aim sign-convention. Pure (no THREE), so it
// unit-tests in plain Node like math2d.js / homingMath.js.
//
// Why: the W3C "standard" mapping puts the right stick on axes[2]/axes[3], but
// non-standard pads (many third-party / DirectInput controllers) scatter it
// onto other indices — the game then reads a near-idle pair and Player 2 "only
// turns a bit." We detect the real aim axes from observed stick motion, with a
// per-id remap table as a deterministic escape hatch.
// =====================================================================

// Standalone default only, so this pure module stays self-contained for its unit
// tests. The live game injects the shared value via opts.deadzone (config.CONTROLLER
// .deadzone), so the tunable has ONE source of truth and can't drift from input.js.
const DEADZONE = 0.15;

/**
 * Resolve the right-stick axis indices for a gamepad.
 *
 * Order of precedence:
 *   1. an explicit `remap` entry whose key is a substring of `gp.id`
 *   2. the W3C layout (axes[2],axes[3]) when `gp.mapping === 'standard'`
 *   3. otherwise, the two most-active axes beyond the left stick — ranked by
 *      the caller-supplied `peaks` (observed motion range per axis, tracked
 *      only while the move stick is idle so movement can't masquerade as aim).
 * Falls back to {2,3} when there isn't enough evidence yet.
 *
 * @param {{id?:string, mapping?:string, axes?:number[]}} gp
 * @param {{peaks?:number[], remap?:Record<string,[number,number]>, deadzone?:number}} [opts]
 * @returns {{ix:number, iy:number}}
 */
export function rightStickAxes(gp, opts = {}) {
  const remap = opts.remap || {};
  const id = (gp && gp.id) || '';
  for (const key of Object.keys(remap)) {
    if (key && id.includes(key)) {
      const pair = remap[key];
      if (Array.isArray(pair) && pair.length === 2) return { ix: pair[0], iy: pair[1] };
    }
  }

  const axes = (gp && gp.axes) || [];
  if (gp && gp.mapping === 'standard' && axes.length >= 4) return { ix: 2, iy: 3 };

  // Non-standard: rank axes past the left stick by how far they've moved.
  const peaks = opts.peaks || [];
  const dzt = opts.deadzone ?? DEADZONE;
  const candidates = [];
  for (let i = 2; i < axes.length; i++) {
    if ((peaks[i] || 0) > dzt) candidates.push({ i, peak: peaks[i] || 0 });
  }
  if (candidates.length >= 2) {
    candidates.sort((a, b) => b.peak - a.peak);
    const pair = candidates.slice(0, 2).sort((a, b) => a.i - b.i);
    return { ix: pair[0].i, iy: pair[1].i };
  }
  return { ix: 2, iy: 3 };
}

/**
 * Convert resolved right-stick axis values to a world-space aim direction.
 * THE SIGN CONVENTION LIVES HERE AND NOWHERE ELSE, so one unit test pins it.
 * Gamepad up = negative Y (W3C); the world's "away from camera" is -z, matching
 * move()'s "W → -z". So z = y un-negated — verified against the working standard
 * pad (do not flip this without the cardinal-push test failing first).
 *
 * @param {number} x resolved right-stick X (already deadzoned by the caller)
 * @param {number} y resolved right-stick Y (already deadzoned by the caller)
 * @returns {{x:number, z:number}}
 */
export function padAimFromAxes(x, y) {
  return { x, z: y };
}
