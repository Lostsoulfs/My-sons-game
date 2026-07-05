// =====================================================================
// bosses/dog.js — FANG, the dog half of the duo. 🐶 A melee POUNCER.
//
// Fang has no bullets — its whole moveset is a telegraphed pounce cycle:
//   stalk  → slow, menacing approach (only readies a pounce while AGGRESSOR)
//   wind   → locks a lane toward you and rears back (the shell puffs its scale;
//            the danger lane lights up with sparks) = fair warning
//   dash   → a fast straight lunge along the locked lane (sidestep to dodge)
//   recover→ stands panting, wide open to hits (Whisker covers it with swipes)
//
// Pairs with bosses/cat.js under one DuoController (bosses/duo.js): only the
// aggressor starts a pounce; the survivor enrages if its partner falls.
// =====================================================================

import { loadAnimated } from '../../core/animModel.js';
import { buildBeastMesh } from '../beastMesh.js';
import { normalize } from '../../core/math2d.js';
import { slideOutOfWalls, clampToArena } from '../../systems/collision.js';
import * as audio from '../../systems/audio.js';

/** shared beast mesh builder (GLB if present, else procedural fallback) */
export function buildBeastBoss(boss, palette, kind, modelKey) {
  const a = loadAnimated(modelKey, boss.radius * 2.4);
  if (a) return { mesh: a.wrap, anim: a.anim };
  const built = buildBeastMesh(boss.radius, palette || {}, { kind });
  boss.beastParts = { head: built.head, tail: built.tail };
  return { mesh: built.group };
}

/** move the boss, sliding off walls and clamping to the arena (shell sets mesh pos) */
function step(boss, dir, speed, dt, game) {
  boss.x += dir.x * speed * dt;
  boss.z += dir.z * speed * dt;
  let q = slideOutOfWalls(boss.x, boss.z, boss.radius, game.walls);
  q = clampToArena(q.x, q.z, boss.radius);
  boss.x = q.x;
  boss.z = q.z;
}

function face(boss, dir) {
  if (dir.x || dir.z) boss.mesh.rotation.y = Math.atan2(dir.x, dir.z);
}

/** sparks along the locked lane so the pounce clearly reads as "get out of the way" */
function paintLane(boss, game) {
  const d = boss.dashDir;
  for (let i = 1; i <= boss.cfg.laneSparks; i++) {
    game.particles.burst(
      boss.x + d.x * boss.radius * (1 + i),
      boss.z + d.z * boss.radius * (1 + i),
      1,
      boss.cfg.laneColor,
    );
  }
}

export const dog = {
  name: 'Fang',
  title: 'Wardens of the Kennels',
  roar: 'bossRoar',

  buildMesh(boss, palette) {
    return buildBeastBoss(boss, palette, 'dog', 'dog');
  },

  init(boss) {
    boss.pounceState = 'stalk';
    boss.pounceTimer = boss.cfg.stalkTime;
    boss.dashDir = { x: 0, z: 1 };
    boss._laneTimer = 0;
  },

  // the pounce state machine (overrides the shell's default scuttle)
  move(boss, dt, game, p, rage) {
    const cfg = boss.cfg;
    const canPounce = boss.duo ? boss.duo.isAggressor(boss) : true;
    const target = boss.duo ? boss.duo.chooseTarget(game.players, p) : p;

    if (boss.pounceState === 'stalk') {
      const dir = normalize(target.x - boss.x, target.z - boss.z);
      step(boss, dir, cfg.speed * rage, dt, game);
      face(boss, dir);
      boss.pounceTimer -= dt;
      if (boss.pounceTimer <= 0 && canPounce) {
        boss.dashDir = normalize(target.x - boss.x, target.z - boss.z);
        boss.charge = cfg.telegraph; // rear back (the shell puffs the scale)
        boss._laneTimer = 0;
        boss.pounceState = 'wind';
        audio.play('bossPounce');
      }
    } else if (boss.pounceState === 'wind') {
      boss.charge -= dt;
      face(boss, boss.dashDir);
      boss._laneTimer -= dt;
      if (boss._laneTimer <= 0) {
        boss._laneTimer = cfg.laneRepaint;
        paintLane(boss, game);
      }
      if (boss.charge <= 0) {
        boss.charge = 0;
        boss.pounceState = 'dash';
        boss.dashTimer = cfg.dashTime;
      }
    } else if (boss.pounceState === 'dash') {
      step(boss, boss.dashDir, cfg.dashSpeed, dt, game);
      face(boss, boss.dashDir);
      boss.dashTimer -= dt;
      if (boss.dashTimer <= 0) {
        boss.pounceState = 'recover';
        boss.recoverTimer = cfg.recoverTime;
      }
    } else {
      // recover: vulnerable breather
      boss.recoverTimer -= dt;
      if (boss.recoverTimer <= 0) {
        boss.pounceState = 'stalk';
        boss.pounceTimer = cfg.stalkTime / rage;
      }
    }
  },

  animate(boss) {
    // procedural fallback idle (GLB plays its own Walk clip)
    if (boss.beastParts?.head) boss.beastParts.head.rotation.x = Math.sin(boss.t * 8) * 0.05;
  },
};
