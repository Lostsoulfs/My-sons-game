// =====================================================================
// spawner.js — decides what's in each room: the boss in boss rooms, otherwise
// monsters (more/tougher deeper into the floor) and the occasional survivor.
//
// ADR-0032: rooms come from the connected floorplan, so this reads a NODE
// DESCRIPTOR (floor identity + graph depth + type) instead of a linear index,
// and draws from the room's OWN layout rng (per-node seed) — a room re-entered
// is a room replayed, and run determinism is path-independent.
// =====================================================================

import { ARENA, ROOMS, ENEMY, NPC, DUO, DIFFICULTY } from '../config.js';
import { hardnessFacet } from '../core/scaling.js';
import { Enemy } from '../entities/enemies.js';
import { Boss } from '../entities/boss.js';
import { DuoController } from '../entities/bosses/duo.js';
import { Npc } from '../entities/npc.js';
import { circleVsBox } from '../core/math2d.js';

const SURVIVOR_NAMES = [
  'a player',
  'an old man',
  'a soldier',
  'a nurse',
  'a stranger',
  'a shopkeeper',
];

/** find a spot in the upper part of the arena that isn't inside a wall */
function findSpot(rng, walls, radius) {
  const hw = ARENA.width / 2 - 2;
  const hd = ARENA.depth / 2;
  for (let tries = 0; tries < 30; tries++) {
    const x = rng.range(-hw, hw);
    const z = rng.range(-hd + 3, 2); // upper / middle, away from the usual entry
    if (!walls.some((b) => circleVsBox(x, z, radius + 0.5, b))) return { x, z };
  }
  return { x: 0, z: 0 }; // dead center — never a door gap (ADR-0032 entries are at edges)
}

/**
 * Populate the room from its node descriptor: a boss in boss rooms, else
 * monsters + maybe a survivor.
 * @param {object} game
 * @param {{floorIndex:number, isBossRoom:boolean, depth:number, survivor?:boolean,
 *          def:object, diff:number}} desc built by game.js from the floorplan node
 * @param {{range,chance,pick,int}} rng the node's LAYOUT rng — never the run rng
 */
export function populateRoom(game, desc, rng) {
  // monsters reflect the floor's boss (theme + matching colors)
  const theme = { boss: desc.def.boss, palette: desc.def.palette };

  // ---- BOSS ROOM ----
  if (desc.isBossRoom) {
    const z = -ARENA.depth / 2 + DUO.spawnZOffset;
    if (desc.def.duo) {
      // multi-boss: spawn both beasts under one shared DuoController (alternating
      // aggression + enrage-on-partner-death). Spread them so two HP bars read.
      const ctrl = new DuoController(rng, DUO);
      desc.def.duo.forEach((type, i) => {
        const x = i === 0 ? -DUO.spawnX : DUO.spawnX;
        const boss = new Boss(game.scene, x, z, type, desc.diff, desc.def.palette);
        ctrl.add(boss);
        game.addEnemy(boss);
      });
      game.duo = ctrl;
    } else {
      game.addEnemy(new Boss(game.scene, 0, z, desc.def.boss, desc.diff, desc.def.palette));
    }
    return;
  }

  // ---- NORMAL ROOM ---- (graph DEPTH replaces the old room-in-floor ramp)
  const countMul = hardnessFacet(DIFFICULTY.hardnessMul, DIFFICULTY.countWeight);
  const count = Math.round(
    (ROOMS.baseEnemies + desc.depth * ROOMS.enemiesPerRoom) * desc.diff * countMul,
  );
  for (let i = 0; i < count; i++) {
    const useShooter = desc.depth + 1 >= ROOMS.shooterFromRoom && rng.chance(0.4);
    const type = useShooter ? 'shooter' : 'chaser';
    const spot = findSpot(rng, game.walls, ENEMY[type].radius);
    game.addEnemy(new Enemy(game.scene, type, spot.x, spot.z, theme));
  }

  // survivors live where the floorplan's seeded quota put them (ADR-0032 —
  // replaces the old fixed room-index whitelist)
  if (desc.survivor) {
    for (let i = 0; i < NPC.perRoom; i++) {
      const spot = findSpot(rng, game.walls, 1);
      const name = rng.pick(SURVIVOR_NAMES);
      game.npcs.push(new Npc(game.scene, spot.x, spot.z, name));
    }
  }
}
