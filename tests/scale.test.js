import { describe, it, expect } from 'vitest';
import { ARENA, CAMERA, PLAYER, DEMON, ENEMY, BOSS } from '../src/config.js';

// Stage 6 / ADR-0020 — locks the "scale pass" intent so a future edit can't quietly
// undo it: a roomier arena, a camera sized to fit it, and a clear size ladder
// (player < basic mob < boss). Pure config — no THREE.

describe('ARENA (Stage 6 roomier playfield)', () => {
  it('is meaningfully bigger than the old 40x30 floor (~2.5x the area)', () => {
    const area = ARENA.width * ARENA.depth;
    expect(area).toBeGreaterThanOrEqual(2.4 * (40 * 30)); // locks the documented ~2.5x intent
    expect(area).toBeLessThan(4 * (40 * 30)); // ...but not absurd
  });

  it('the door gap stays smaller than the wall it sits in', () => {
    expect(ARENA.doorWidth).toBeGreaterThan(0);
    expect(ARENA.doorWidth).toBeLessThan(ARENA.width);
  });
});

describe('CAMERA fits the arena', () => {
  it('sits far enough back to frame the whole room (scales with ARENA)', () => {
    const camDist = Math.hypot(CAMERA.back, CAMERA.height);
    // Coarse distance sanity-check, NOT a true frustum-containment proof (it ignores
    // fov + aspect): it just catches a camera that's obviously too close for the arena
    // (e.g. reverting the camera but not the arena). Real fit is verified by the
    // Playwright drive screenshots.
    expect(camDist).toBeGreaterThanOrEqual(Math.max(ARENA.width, ARENA.depth) * 0.7);
  });
});

describe('size ladder: player < basic mob < boss (threat reads by size)', () => {
  it('the demon companion reads bulkier than a player but stays under the mobs (CP-C)', () => {
    // (was: player === ally radius — the AI Ally became the Demon, ADR-0042. Its radius is
    // VISUAL-ONLY: nothing collides with it, but the size still has to read "companion, not threat".)
    expect(DEMON.radius).toBeGreaterThanOrEqual(PLAYER.radius);
    expect(DEMON.radius).toBeLessThan(ENEMY.chaser.radius);
  });

  it('basic mobs are at least as big as the player, chaser < shooter', () => {
    expect(ENEMY.chaser.radius).toBeGreaterThanOrEqual(PLAYER.radius);
    expect(ENEMY.shooter.radius).toBeGreaterThan(ENEMY.chaser.radius);
  });

  it('every boss is bigger than the biggest basic mob', () => {
    const biggestMob = Math.max(ENEMY.chaser.radius, ENEMY.shooter.radius);
    for (const [name, b] of Object.entries(BOSS)) {
      expect(b.radius, `${name} should out-size basic mobs`).toBeGreaterThan(biggestMob);
    }
  });
});
