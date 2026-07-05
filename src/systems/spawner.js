// =====================================================================
// spawner.js — decides what's in each room: the boss in boss rooms, otherwise
// monsters (more/tougher deeper into the floor) and the occasional survivor.
//
// ADR-0032: rooms come from the connected floorplan, so this reads a NODE
// DESCRIPTOR (floor identity + graph depth + type) instead of a linear index,
// and draws from the room's OWN layout rng (per-node seed) — a room re-entered
// is a room replayed, and run determinism is path-independent.
// =====================================================================

import {
  ARENA,
  ROOMS,
  ENEMY,
  NPC,
  DUO,
  DIFFICULTY,
  BOSS_INTRO,
  HUMAN_APPROACH,
} from '../config.js';
import { hardnessFacet } from '../core/scaling.js';
import { Enemy } from '../entities/enemies.js';
import { Boss } from '../entities/boss.js';
import { DuoController } from '../entities/bosses/duo.js';
import { Npc } from '../entities/npc.js';
import { circleVsBox } from '../core/math2d.js';
import { bossSpawnForEntry } from '../core/bossPlacement.js';

const SURVIVOR_NAMES = [
  'a player',
  'an old man',
  'a soldier',
  'a nurse',
  'a stranger',
  'a shopkeeper',
];

/**
 * Find a spot that isn't inside a wall and isn't on top of the player's entry.
 * ADR-0032: rooms are entered from ANY side (N/S/E/W), so a spawn must clear the
 * `avoid` point (the entry) by `avoid.r` — otherwise a mob can materialise on a
 * player walking in and land a free contact hit before they can dodge.
 */
function findSpot(rng, walls, radius, avoid = null) {
  const hw = ARENA.width / 2 - 2;
  const hd = ARENA.depth / 2;
  const clear = (x, z) => {
    if (walls.some((b) => circleVsBox(x, z, radius + 0.5, b))) return false;
    if (avoid && Math.hypot(x - avoid.x, z - avoid.z) < avoid.r + radius) return false;
    return true;
  };
  for (let tries = 0; tries < 30; tries++) {
    const x = rng.range(-hw, hw);
    const z = rng.range(-hd + 3, hd - 3); // anywhere but the very edges (entries live there)
    if (clear(x, z)) return { x, z };
  }
  return { x: 0, z: 0 }; // dead center — never a door gap NOR an entry (they're all at edges)
}

/**
 * Populate the room from its node descriptor: a boss in boss rooms, else
 * monsters + maybe a survivor.
 * @param {object} game
 * @param {{floorIndex:number, isBossRoom:boolean, depth:number, survivor?:boolean,
 *          def:object, diff:number, entry?:{x:number,z:number}}} desc built by game.js
 *   from the floorplan node (`entry` = where the players walked in, kept spawn-clear)
 * @param {{range,chance,pick,int}} rng the node's LAYOUT rng — never the run rng
 */
export function populateRoom(game, desc, rng) {
  // keep spawns off the door the players walked in through (ADR-0032 spawn safety)
  const avoid = desc.entry ? { x: desc.entry.x, z: desc.entry.z, r: ROOMS.entryClearance } : null;
  // monsters reflect the floor's boss (theme + matching colors)
  const theme = { boss: desc.def.boss, palette: desc.def.palette };

  // ---- BOSS ROOM ----
  if (desc.isBossRoom) {
    // ADR-0033: the boss stands on the wall OPPOSITE the entry (you cross the room to it),
    // facing centre. Duo beasts spread along that wall's free axis so two HP bars read.
    const duoTypes = desc.def.duo;
    const { spots } = bossSpawnForEntry(desc.entrySide, ARENA, {
      inset: BOSS_INTRO.wallInset,
      spread: DUO.spawnX,
      count: duoTypes ? duoTypes.length : 1,
    });
    // ADR-0033: bosses spawn SILENT — game.js fires the roar on the entrance reveal beat
    // (combat bosses) or the human's wrong-read fight start, not here at spawn.
    const opts = { silentRoar: true };
    if (duoTypes) {
      const ctrl = new DuoController(rng, DUO);
      duoTypes.forEach((type, i) => {
        const s = spots[i];
        const boss = new Boss(game.scene, s.x, s.z, type, desc.diff, desc.def.palette, opts);
        boss.mesh.rotation.y = s.facing;
        ctrl.add(boss);
        game.addEnemy(boss);
      });
      game.duo = ctrl;
    } else {
      const s = spots[0];
      const boss = new Boss(game.scene, s.x, s.z, desc.def.boss, desc.diff, desc.def.palette, opts);
      boss.mesh.rotation.y = s.facing;
      game.addEnemy(boss);
    }
    // ADR-0033: the human decision-boss gets a few PASSIVE civilians huddled around him
    // (the mini-scene's crowd). They're in game.npcs but flagged passive → never interactable.
    if (desc.def.boss === 'human') {
      const c = spots[0];
      const hw = ARENA.width / 2 - 2;
      const hd = ARENA.depth / 2 - 2;
      for (let i = 0; i < HUMAN_APPROACH.civilians; i++) {
        const a = Math.PI * 2 * (i / HUMAN_APPROACH.civilians) + 0.6;
        const r = 3.5 + (i % 2);
        const cx = Math.max(-hw, Math.min(hw, c.x + Math.cos(a) * r));
        const cz = Math.max(-hd, Math.min(hd, c.z + Math.sin(a) * r));
        if (game.walls.some((b) => circleVsBox(cx, cz, 1, b))) continue; // skip a wall-clipped slot
        game.npcs.push(new Npc(game.scene, cx, cz, rng.pick(SURVIVOR_NAMES), { passive: true }));
      }
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
    const spot = findSpot(rng, game.walls, ENEMY[type].radius, avoid);
    game.addEnemy(new Enemy(game.scene, type, spot.x, spot.z, theme));
  }

  // survivors live where the floorplan's seeded quota put them (ADR-0032 —
  // replaces the old fixed room-index whitelist)
  if (desc.survivor) {
    for (let i = 0; i < NPC.perRoom; i++) {
      const spot = findSpot(rng, game.walls, 1, avoid);
      const name = rng.pick(SURVIVOR_NAMES);
      game.npcs.push(new Npc(game.scene, spot.x, spot.z, name));
    }
  }
}
