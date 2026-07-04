// =====================================================================
// bosses/index.js — registry of boss behavior modules, keyed by boss type.
//
// The generic Boss shell (boss.js) looks a behavior up by `bossType` (which
// comes from PROGRESSION.floors[].boss). Add a new boss = add a module here.
// =====================================================================

import { spider } from './spider.js';
import { mushroom } from './mushroom.js';
import { dog } from './dog.js';
import { cat } from './cat.js';
import { skeleton } from './skeleton.js';
import { human } from './human.js';
import { enforcer } from './enforcer.js';

export const BEHAVIORS = {
  spider,
  mushroom,
  dog, // Stage 3: Fang (melee pouncer)
  cat, // Stage 3: Whisker (ranged zoner) — paired via DuoController (bosses/duo.js)
  skeleton, // Stage 4: Rattlebones (bone throw / scatter ring / reassemble-teleport / summons)
  human, // Stage 5: The Survivor (decision-boss; only fought on a wrong pre-fight read)
  enforcer, // Final: the government war-machine (tracking cannon / sweeping barrage / strafe)
};
