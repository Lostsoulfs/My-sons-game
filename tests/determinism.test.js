import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/core/rng.js';
import { rollDrop, rarityBand, pityMinTier } from '../src/core/drops.js';
import { MAP, PICKUPS, ROOMS } from '../src/config.js';
import { resolveDecision } from '../src/systems/npcDecision.js';
import { generateFloorplan, roomCountForFloor } from '../src/core/floorplan.js';

// Cross-system determinism: the game's RANDOM LOGIC (not its rendering) must be
// fully reproducible from a single seed. Per-system tests already cover drops,
// floorplans, and survivor outcomes in isolation; this drives the REAL production
// functions through ONE shared rng, in game order, and checks the whole run is
// stable. That stability is what makes a seeded run replayable (startRun(seed) +
// window.__game) — ADR-0013.
//
// ADR-0032 shape: a run is floors of CONNECTED maps. Per floor, the run rng is
// consumed by generateFloorplan (layout + per-node layoutSeeds + survivor tags);
// each ROOM then consumes only its own makeRng(layoutSeed) — so the transcript
// below also PROVES path-independence: visiting rooms in any order cannot shift
// the run stream, because rooms never touch it.
//
// Note: room *population* (populateRoom) is render-coupled (it builds Enemy/
// Boss/Npc with the scene), so it can't run headless. We exercise the pure,
// rng-consuming production seams the run actually uses.

function runTranscript(seed, { floors = 3, visitOrder = 'forward' } = {}) {
  const rng = makeRng(seed);
  const log = [];
  let commonStreak = 0; // mirrors game.js hard-pity counter
  for (let f = 0; f < floors; f++) {
    // the ONLY run-rng draw per floor: the connected map (ADR-0032)
    const plan = generateFloorplan(rng, {
      ...MAP,
      roomCount: roomCountForFloor(f, MAP),
      survivors: ROOMS.survivorsPerFloor,
    });
    log.push(`floor:${f}:${plan.rooms.map((r) => `${r.x},${r.y},${r.type}`).join('|')}`);

    // rooms consume their OWN layout seeds — in whatever order the player walks.
    // Reversing the visit order must not change anything downstream.
    const order = [...plan.rooms];
    if (visitOrder === 'reverse') order.reverse();
    for (const node of order) {
      const roomRng = makeRng(node.layoutSeed);
      if (node.type === 'boss') continue; // boss spawns draw from roomRng in-game
      log.push(`room:${node.id}:spawn:${roomRng.chance(0.4) ? 'shooter' : 'chaser'}`);
      if (node.survivor) {
        const choice = roomRng.chance(0.5) ? 'HELP' : 'LEAVE';
        log.push(`npc:${node.id}:${choice}:${JSON.stringify(resolveDecision(roomRng, choice))}`);
      }
    }

    // post-boss reward roll still rides the run rng (drop engine, floor-banded + pity)
    const weights = PICKUPS.rarity.regularChestWeights[rarityBand(f)];
    const drop = rollDrop(rng, weights, { minTier: pityMinTier(commonStreak) });
    commonStreak = drop.tier === PICKUPS.rarity.tiers[0] ? commonStreak + 1 : 0;
    log.push(`drop:${drop.type}`);
  }
  return log;
}

describe('seeded run determinism (cross-system, connected-map shape)', () => {
  it('the same seed reproduces an identical run transcript', () => {
    expect(runTranscript(2026)).toEqual(runTranscript(2026));
  });

  it('different seeds produce different runs', () => {
    expect(runTranscript(2026)).not.toEqual(runTranscript(2027));
  });

  it('PATH-INDEPENDENCE: visiting rooms in reverse order yields the same run stream (ADR-0032)', () => {
    // sort both transcripts because room lines interleave differently by order —
    // the CONTENT of every room + every run-rng draw must be identical.
    const a = [...runTranscript(2026, { visitOrder: 'forward' })].sort();
    const b = [...runTranscript(2026, { visitOrder: 'reverse' })].sort();
    expect(a).toEqual(b);
  });

  it('the transcript is non-trivial (every system actually consumed the rng)', () => {
    const t = runTranscript(2026);
    expect(t.length).toBeGreaterThan(10);
    expect(t.some((x) => x.startsWith('floor:'))).toBe(true);
    expect(t.some((x) => x.startsWith('room:'))).toBe(true);
    expect(t.some((x) => x.startsWith('drop:'))).toBe(true);
    expect(t.some((x) => x.startsWith('npc:'))).toBe(true);
  });
});
