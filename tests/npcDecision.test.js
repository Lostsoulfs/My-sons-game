import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/core/rng.js';
import { resolveDecision, _internals } from '../src/systems/npcDecision.js';
import { KARMA } from '../src/config.js';

const GOOD = new Set(_internals.GOOD_EFFECTS.map((e) => e.effect));
const BAD = new Set(_internals.BAD_EFFECTS.map((e) => e.effect));

// ADR-0045 (karma era): the two choices are no longer symmetric. HELP is a risky roll that always
// earns +karma; LEAVE is safe (no combat) but always costs karma.

describe('resolveDecision', () => {
  it('is deterministic for a given seed + choice', () => {
    expect(resolveDecision(makeRng(2026), 'HELP')).toEqual(resolveDecision(makeRng(2026), 'HELP'));
  });

  it('HELP: rolls a good/bad outcome and ALWAYS earns +karma (the deed, not the result)', () => {
    for (let seed = 0; seed < 200; seed++) {
      const r = resolveDecision(makeRng(seed), 'HELP');
      expect(r.choice).toBe('HELP');
      expect(r.karma).toBe(KARMA.helpGain); // +karma whether it went well or was a trap
      if (r.good) expect(GOOD.has(r.effect)).toBe(true);
      else expect(BAD.has(r.effect)).toBe(true);
    }
  });

  it('HELP leans BAD now — it is genuinely risky (more traps than rewards)', () => {
    let good = 0;
    const N = 2000;
    for (let seed = 0; seed < N; seed++) if (resolveDecision(makeRng(seed), 'HELP').good) good++;
    const rate = good / N;
    // near KARMA.helpGoodChance (< 0.5): helping hurts you more often than it helps
    expect(rate).toBeLessThan(0.5);
    expect(rate).toBeGreaterThan(0.2); // but not a guaranteed trap — the reward is real
    expect(Math.abs(rate - KARMA.helpGoodChance)).toBeLessThan(0.06);
  });

  it('LEAVE: always safe (no combat) and always costs karma', () => {
    for (let seed = 0; seed < 200; seed++) {
      const r = resolveDecision(makeRng(seed), 'LEAVE');
      expect(r.choice).toBe('LEAVE');
      expect(r.effect).toBe('NONE'); // never a trap, never a reward — you just walk away
      expect(r.karma).toBe(-KARMA.leaveLoss);
    }
  });

  it('the karma signs are opposed: helping builds it, leaving spends it', () => {
    expect(resolveDecision(makeRng(1), 'HELP').karma).toBeGreaterThan(0);
    expect(resolveDecision(makeRng(1), 'LEAVE').karma).toBeLessThan(0);
  });
});
