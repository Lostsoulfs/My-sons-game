import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/core/rng.js';
import { MAP, ROOMS } from '../src/config.js';
import { resolveDecision } from '../src/systems/npcDecision.js';
import { generateOffer } from '../src/core/offers.js';
import { generateFloorplan, roomCountForFloor } from '../src/core/floorplan.js';

// Cross-system determinism: the game's RANDOM LOGIC (not its rendering) must be
// reproducible from a single seed — that's what makes a seeded run replayable
// (startRun(seed) + window.__game, ADR-0013).
//
// ADR-0032 splits the rng into two streams, and this file tests them HONESTLY —
// i.e. against the seams production actually uses (an earlier draft modelled a
// dead `rollDrop` seam and resolved survivors on the room rng; neither matches the
// game, so those "proofs" certified properties the game didn't have):
//
//   • the RUN rng is consumed, in game order, by
//       - generateFloorplan(this.rng)  once per floor           (game.js _startFloor)
//       - generateOffer(this.rng)      once per room CLEAR       (game.js:623)
//       - resolveDecision(this.rng)    on a survivor interaction (game.js:514)
//     These are order/input-dependent BY DESIGN (a replay reproduces the inputs).
//
//   • room LAYOUT + SPAWNS never touch the run rng — buildRoom/populateRoom draw
//     from makeRng(node.layoutSeed) (spawner.js). So room CONTENT is a pure function
//     of the node's seed, independent of when/whether/in-what-order it's visited.
//     That decoupling is what makes backtracking safe, and it's proved on its own
//     below (NOT by folding run-rng draws into a path-independence claim).
//
// Note: populateRoom itself is render-coupled (builds Enemy/Boss with the scene), so
// we drive the pure, rng-consuming seams the run actually uses.

// One full run in canonical (graph) order, exercising every REAL run-rng seam.
function runTranscript(seed, { floors = 3 } = {}) {
  const rng = makeRng(seed);
  const log = [];
  for (let f = 0; f < floors; f++) {
    const plan = generateFloorplan(rng, {
      ...MAP,
      roomCount: roomCountForFloor(f, MAP),
      survivors: ROOMS.survivorsPerFloor,
    });
    log.push(`floor:${f}:${plan.rooms.map((r) => `${r.x},${r.y},${r.type}`).join('|')}`);

    for (const node of plan.rooms) {
      // room CONTENT rolls come from the node's OWN seed (the path-independent stream)
      const roomRng = makeRng(node.layoutSeed);
      if (node.type !== 'boss') {
        log.push(`spawn:${node.id}:${roomRng.chance(0.4) ? 'shooter' : 'chaser'}`);
      }
      // survivor HELP/LEAVE resolves on the RUN rng in production (game.js:514) — so it
      // rides the shared stream, and is order/input-dependent (not path-independent).
      if (node.survivor) {
        log.push(`npc:${node.id}:${JSON.stringify(resolveDecision(rng, 'HELP'))}`);
      }
      // every entered room clears into an OFFER — the real post-room run-rng draw (game.js:623)
      if (node.type !== 'start') {
        log.push(
          `offer:${node.id}:${generateOffer(rng, {})
            .map((c) => c.id)
            .join(',')}`,
        );
      }
    }
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

  it('the transcript is non-trivial — every real run-rng seam is exercised', () => {
    const t = runTranscript(2026);
    expect(t.length).toBeGreaterThan(10);
    expect(t.some((x) => x.startsWith('floor:'))).toBe(true); // generateFloorplan
    expect(t.some((x) => x.startsWith('spawn:'))).toBe(true); // per-node layout seed
    expect(t.some((x) => x.startsWith('offer:'))).toBe(true); // generateOffer (real, not rollDrop)
    expect(t.some((x) => x.startsWith('npc:'))).toBe(true); // resolveDecision on the run rng
  });
});

// The safe-backtracking property, proved on its own: a room's CONTENT is fixed by its
// layoutSeed, so it is identical no matter the visit order — and, critically, no matter
// what else draws from the run rng between entries. A regression that made room content
// draw from a shared/positional stream (the exact rng-order trap ADR-0032 was built to
// avoid) would make these maps diverge.
describe('room content is path-independent (ADR-0032 safe backtracking)', () => {
  const contentOf = (node) => {
    const r = makeRng(node.layoutSeed);
    return `${r.chance(0.4)}|${r.range(0, 10).toFixed(4)}|${r.int(4)}`;
  };

  it('visit order never changes a room’s layout/spawns', () => {
    const plan = generateFloorplan(makeRng(2026), {
      ...MAP,
      roomCount: roomCountForFloor(2, MAP),
      survivors: ROOMS.survivorsPerFloor,
    });
    const map = (nodes) => Object.fromEntries(nodes.map((n) => [n.id, contentOf(n)]));
    expect(map([...plan.rooms].reverse())).toEqual(map(plan.rooms));
  });

  it('run-rng draws happening BETWEEN entries cannot perturb a room’s content', () => {
    const plan = generateFloorplan(makeRng(7), {
      ...MAP,
      roomCount: roomCountForFloor(2, MAP),
      survivors: ROOMS.survivorsPerFloor,
    });
    const clean = Object.fromEntries(plan.rooms.map((n) => [n.id, contentOf(n)]));
    // now recompute while a junk stream advances arbitrarily between each room entry,
    // simulating offers / survivor rolls / other rooms firing in between.
    const junk = makeRng(999);
    const interleaved = {};
    for (const node of [...plan.rooms].reverse()) {
      junk.next();
      junk.int(9);
      interleaved[node.id] = contentOf(node);
    }
    expect(interleaved).toEqual(clean);
  });
});
