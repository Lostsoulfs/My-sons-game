// =====================================================================
// rooms.js — builds one arena "room" of the ruined city: four outer walls
// with a door gap on each CONNECTED side (ADR-0032), plus rubble to dodge
// around. On the connected map a room can have 1-4 link doors (N/S/E/W,
// one per floorplan neighbour) and boss rooms grow an extra EXIT door
// (the descend/win walk-through) on a free side after the kill.
//
// Returns collision boxes (AABBs) + the Three.js meshes, and per-side door
// triggers that light up once the room is cleared. dispose() removes it all.
// =====================================================================

import * as THREE from 'three';
import { ARENA, PALETTE, ROOMS } from '../config.js';

function boxMesh(box, height, color) {
  const w = box.maxX - box.minX;
  const d = box.maxZ - box.minZ;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, height, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }),
  );
  mesh.position.set((box.minX + box.maxX) / 2, height / 2, (box.minZ + box.maxZ) / 2);
  mesh.castShadow = true; // walls + rubble cast AND catch shadows (ADR-0026)
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Build a room with door gaps on the given sides.
 * @param {THREE.Scene} scene
 * @param {{range:(a,b)=>number}} rng the room's OWN layout rng (per-node seed, ADR-0032)
 * @param {{link?: string[], exit?: string|null}} sidesSpec which sides get doors:
 *   `link` = sides with a floorplan neighbour; `exit` = the boss descend/win side
 *   (kept separate — it only opens via openExit after the boss falls).
 * @returns {{walls, doors: Record<string,{box,active,kind}>, openDoors, openExit, dispose}}
 */
export function buildRoom(scene, rng, sidesSpec = { link: ['N'], exit: null }) {
  const group = new THREE.Group();
  scene.add(group);

  const hw = ARENA.width / 2;
  const hd = ARENA.depth / 2;
  const t = ARENA.wall;
  const dh = ARENA.doorWidth / 2;

  const walls = [];
  const wallH = 3;
  const doorSides = new Set(sidesSpec.link ?? []);
  if (sidesSpec.exit) doorSides.add(sidesSpec.exit);

  const add = (box) => {
    walls.push(box);
    group.add(boxMesh(box, wallH, PALETTE.wall));
  };

  // one wall per side; a doored side is split into two segments around the center gap
  const SIDE = {
    N: { solid: { minX: -hw, maxX: hw, minZ: -hd - t, maxZ: -hd }, axis: 'x' },
    S: { solid: { minX: -hw, maxX: hw, minZ: hd, maxZ: hd + t }, axis: 'x' },
    W: { solid: { minX: -hw - t, maxX: -hw, minZ: -hd - t, maxZ: hd + t }, axis: 'z' },
    E: { solid: { minX: hw, maxX: hw + t, minZ: -hd - t, maxZ: hd + t }, axis: 'z' },
  };
  for (const [side, def] of Object.entries(SIDE)) {
    const s = def.solid;
    if (!doorSides.has(side)) {
      add(s);
    } else if (def.axis === 'x') {
      add({ ...s, minX: s.minX, maxX: -dh });
      add({ ...s, minX: dh, maxX: s.maxX });
    } else {
      add({ ...s, minZ: s.minZ, maxZ: -dh });
      add({ ...s, minZ: dh, maxZ: s.maxZ });
    }
  }

  // rubble obstacles (also block bullets + movement) — keep clear of every doorway
  // (entry placement is door-side too, so this covers player entries as well)
  const { doorClearMargin: dm, doorClearDepth: dd, centerClear: CENTER_CLEAR } = ROOMS;
  const nearDoor = (cx, cz) =>
    (doorSides.has('N') && Math.abs(cx) < dh + dm && cz < -hd + dd) ||
    (doorSides.has('S') && Math.abs(cx) < dh + dm && cz > hd - dd) ||
    (doorSides.has('W') && Math.abs(cz) < dh + dm && cx < -hw + dd) ||
    (doorSides.has('E') && Math.abs(cz) < dh + dm && cx > hw - dd);
  // keep a small radius around dead-center clear: the heal room drops its guaranteed
  // HEAL at (0,0), and a walkable centre is a fair neutral space in every room (ADR-0032).
  const n = Math.round(rng.range(ROOMS.obstaclesMin, ROOMS.obstaclesMax + 1));
  for (let i = 0; i < n; i++) {
    const w = rng.range(2, 5);
    const d = rng.range(2, 5);
    const cx = rng.range(-hw + 4, hw - 4);
    const cz = rng.range(-hd + 5, hd - 7);
    if (nearDoor(cx, cz)) continue;
    const box = { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 };
    // reject any rubble whose footprint would intrude on the centre keep-clear zone
    if (
      box.minX < CENTER_CLEAR &&
      box.maxX > -CENTER_CLEAR &&
      box.minZ < CENTER_CLEAR &&
      box.maxZ > -CENTER_CLEAR
    )
      continue;
    walls.push(box);
    group.add(boxMesh(box, rng.range(1.2, 2.4), PALETTE.wallTop));
  }

  // per-side door trigger zones (in the gaps) + glowing markers (hidden until opened)
  const DOOR_GEO = {
    N: { box: { minX: -dh, maxX: dh, minZ: -hd - t, maxZ: -hd + 1.2 }, glow: [0, -hd + 0.2, 0] },
    S: { box: { minX: -dh, maxX: dh, minZ: hd - 1.2, maxZ: hd + t }, glow: [0, hd - 0.2, 0] },
    W: { box: { minX: -hw - t, maxX: -hw + 1.2, minZ: -dh, maxZ: dh }, glow: [-hw + 0.2, 0, 1] },
    E: { box: { minX: hw - 1.2, maxX: hw + t, minZ: -dh, maxZ: dh }, glow: [hw - 0.2, 0, 1] },
  };
  const doors = {};
  const glows = {};
  for (const side of doorSides) {
    const g = DOOR_GEO[side];
    const kind = sidesSpec.exit === side ? 'exit' : 'link';
    doors[side] = { box: g.box, active: false, kind };
    const vertical = g.glow[2] === 1; // E/W doors run along Z
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(
        vertical ? 1.2 : ARENA.doorWidth,
        0.2,
        vertical ? ARENA.doorWidth : 1.2,
      ),
      new THREE.MeshBasicMaterial({
        // the exit glows a distinct color — "this way down" reads at a glance
        color: kind === 'exit' ? PALETTE.doorExit : PALETTE.door,
        transparent: true,
        opacity: 0.9,
      }),
    );
    glow.position.set(g.glow[0], 0.15, g.glow[1]);
    glow.visible = false;
    group.add(glow);
    glows[side] = glow;
  }

  return {
    walls,
    doors,
    /** unlock every LINK door (room cleared) — the exit stays shut until openExit(). */
    openDoors() {
      for (const [side, d] of Object.entries(doors)) {
        if (d.kind !== 'link') continue;
        d.active = true;
        glows[side].visible = true;
      }
    },
    /** unlock the boss EXIT door (descend / win walk-through). */
    openExit() {
      for (const [side, d] of Object.entries(doors)) {
        if (d.kind !== 'exit') continue;
        d.active = true;
        glows[side].visible = true;
      }
    },
    dispose() {
      scene.remove(group);
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    },
  };
}
