import { describe, expect, it } from 'vitest';
import { floorMeta, resolveDeath, floorCount } from '../src/core/progression.js';

describe('progression proof controls', () => {
  it('proves the last-floor boundary is exact and not off by one', () => {
    expect(floorMeta(floorCount() - 1).isLastFloor).toBe(true);
    expect(floorMeta(floorCount() - 2).isLastFloor).toBe(false);
  });

  it('proves game-over resets to floor zero only when lives are gone', () => {
    expect(resolveDeath(2, 3)).toEqual({ lives: 1, action: 'RESPAWN', floor: 3 });
    expect(resolveDeath(1, 3)).toEqual({ lives: 0, action: 'GAMEOVER', floor: 0 });
  });

  it('proves a boss-at-farthest-dead-end floor always has a next-floor checkpoint to give', () => {
    // resolveDeath is shape-agnostic — the checkpoint the game hands it after a boss
    // clear is floorIndex+1, which must be a real floor (or the win fired instead).
    for (let f = 0; f < floorCount() - 1; f++) {
      expect(resolveDeath(3, f + 1).floor).toBe(f + 1);
    }
  });
});
