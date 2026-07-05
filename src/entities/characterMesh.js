// =====================================================================
// characterMesh.js — builds a humanoid mesh (player / ally / survivor).
//
// If a real model is loaded for `modelKey`, we use it. Otherwise we build a
// simple capsule body with a little "nose" cone so you can tell which way it
// is facing. Returns a THREE.Group you can rotate to face an aim direction.
//
// CP-D (ADR-0041): an optional `prop` attaches ONE extra procedural silhouette
// tell (a hat-brim / goggle-ring) — a 6-MoE design-panel pick so Dad/Son don't
// read as a plain color-swap even before real GLB art lands. Procedural-only by
// design: we can't predict how it'd sit on an unknown future rig, so it's
// skipped the moment a real model loads (see the `model` branch below).
// =====================================================================

import * as THREE from 'three';
import { getModel } from '../core/assets.js';
import { castShadows } from '../core/shadows.js';

const PROP_BUILDERS = {
  // a flat brim disc atop the head — reads as a solid circle from top-down (Dad: "planted")
  brim(radius, height) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.35, radius * 1.35, radius * 0.18, 16),
      new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.7 }),
    );
    m.position.y = height * 0.98;
    return m;
  },
  // a small ring at head height — reads as a second silhouette lobe (Son: "gadget kid")
  goggles(radius, height) {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.5, radius * 0.14, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.3, metalness: 0.4 }),
    );
    m.rotation.x = Math.PI / 2;
    m.position.set(0, height * 0.9, radius * 0.5);
    return m;
  },
};

export function makeCharacter(modelKey, { radius, height, color, prop = null }) {
  const group = new THREE.Group();

  const model = getModel(modelKey);
  if (model) {
    group.add(model);
  } else {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(radius, Math.max(0.1, height - radius * 2), 6, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 }),
    );
    body.position.y = height / 2;
    group.add(body);

    // a white "nose" cone pointing forward (+z), so facing is readable
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(radius * 0.45, radius * 1.1, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
    );
    nose.rotation.x = Math.PI / 2; // tip points along +z
    nose.position.set(0, height * 0.55, radius * 0.95);
    group.add(nose);

    const build = prop && PROP_BUILDERS[prop];
    if (build) group.add(build(radius, height));
  }

  castShadows(group); // player / ally / survivor cast shadows (GLB or procedural)
  return group;
}
