import { describe, it, expect } from 'vitest';
import { CHOICE_ROOM, OFFERS } from '../src/config.js';
import { rollChoiceSurvivors, rollGunsmithWeapon } from '../src/core/choiceRoom.js';
import { makeRng } from '../src/core/rng.js';

// ADR-0044: the choice room. The survivor SET is layout-seeded (path-independent);
// these lock the draw's shape (no dupes, gate, ring) and the gunsmith's economy tie-in.

describe('rollChoiceSurvivors — the seeded draw', () => {
  it('same seed → the same trio in the same spots (re-entry shows the same room)', () => {
    const a = rollChoiceSurvivors(makeRng(1234), { gameBeaten: true });
    const b = rollChoiceSurvivors(makeRng(1234), { gameBeaten: true });
    expect(a).toEqual(b);
  });

  it('never repeats a role within one room', () => {
    for (let seed = 0; seed < 200; seed++) {
      const kinds = rollChoiceSurvivors(makeRng(seed), { gameBeaten: true }).map((s) => s.kind);
      expect(new Set(kinds).size).toBe(kinds.length);
    }
  });

  it('offers CHOICE_ROOM.count survivors (clamped to the pool)', () => {
    expect(rollChoiceSurvivors(makeRng(7), { gameBeaten: true })).toHaveLength(CHOICE_ROOM.count);
    // ask for more than exists → everyone shows up once, no crash
    const all = rollChoiceSurvivors(makeRng(7), { gameBeaten: true, count: 99 });
    expect(all).toHaveLength(Object.keys(CHOICE_ROOM.pool).length);
  });

  it('the scavenger (Echoes) NEVER appears pre-win — addEchoes would silently no-op', () => {
    for (let seed = 0; seed < 300; seed++) {
      const kinds = rollChoiceSurvivors(makeRng(seed), { gameBeaten: false }).map((s) => s.kind);
      expect(kinds).not.toContain('scavenger');
    }
  });

  it('the scavenger DOES appear post-win (the pool actually opens up)', () => {
    let seen = false;
    for (let seed = 0; seed < 300 && !seen; seed++) {
      seen = rollChoiceSurvivors(makeRng(seed), { gameBeaten: true }).some(
        (s) => s.kind === 'scavenger',
      );
    }
    expect(seen).toBe(true);
  });

  it('every survivor lands on the placement ring, carrying a name + marker color', () => {
    for (let seed = 0; seed < 50; seed++) {
      for (const s of rollChoiceSurvivors(makeRng(seed), { gameBeaten: true })) {
        const r = Math.hypot(s.x, s.z);
        expect(r).toBeGreaterThanOrEqual(CHOICE_ROOM.ring.min - 1e-9);
        expect(r).toBeLessThanOrEqual(CHOICE_ROOM.ring.max + 1e-9);
        expect(typeof s.name).toBe('string');
        expect(typeof s.color).toBe('number');
      }
    }
  });

  it('survivors never stack — even spacing keeps them apart', () => {
    for (let seed = 0; seed < 50; seed++) {
      const set = rollChoiceSurvivors(makeRng(seed), { gameBeaten: true });
      for (let i = 0; i < set.length; i++) {
        for (let j = i + 1; j < set.length; j++) {
          const d = Math.hypot(set[i].x - set[j].x, set[i].z - set[j].z);
          expect(d).toBeGreaterThan(2); // ring min 4.5 + 120° spacing → worst case ≈ 4.5·√3 ≈ 7.8
        }
      }
    }
  });
});

describe('rollGunsmithWeapon — the economy tie-in', () => {
  it('always returns a real weapon item from the registry', () => {
    for (let seed = 0; seed < 100; seed++) {
      const it = rollGunsmithWeapon(makeRng(seed));
      expect(it).toBeTruthy();
      expect(it.category).toBe('weapon');
      expect(typeof it.id).toBe('string');
    }
  });

  it('luck biases toward rare+ (the CP4 curve reaches the gunsmith too)', () => {
    const rareUp = (opts) => {
      let n = 0;
      for (let seed = 0; seed < 800; seed++) {
        const t = rollGunsmithWeapon(makeRng(seed), opts).tier;
        if (t !== 'common') n++;
      }
      return n;
    };
    const atCap = rareUp({ luck: OFFERS.luck.maxStacks });
    const atZero = rareUp({});
    expect(atCap).toBeGreaterThan(atZero); // more rare+ picks at luck cap — bias, never a guarantee
    expect(atZero).toBeGreaterThan(0); // commons never lock you out of a lucky roll entirely
  });

  it('owned guns are down-weighted, not banned (he can still re-offer your gun)', () => {
    // own EVERY weapon → the roll still returns one (weights shrink, pool never empties)
    const it0 = rollGunsmithWeapon(makeRng(5));
    const allOwned = [];
    for (let seed = 0; seed < 50; seed++) allOwned.push(rollGunsmithWeapon(makeRng(seed)).id);
    const owned = [...new Set(allOwned)];
    const it1 = rollGunsmithWeapon(makeRng(5), { owned });
    expect(it0).toBeTruthy();
    expect(it1).toBeTruthy();
    expect(it1.category).toBe('weapon');
  });
});
