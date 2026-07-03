// =====================================================================
// enforcerMesh.js — a procedural 1950s "Atomic-Age" government WAR-MACHINE
// (the Enforcer boss). Boxy, riveted, single glowing cyclops eye + arm cannons
// — the retro-robot aesthetic suits primitives, so this reads well without a GLB.
// The eye/vent/muzzle glows are MeshBasic so the post-FX bloom (ADR-0025) catches
// them. Colors come from the floor palette so it matches its arena.
// =====================================================================

import * as THREE from 'three';

const DEFAULT_PALETTE = {
  body: 0x4a4e57, // gunmetal steel
  emissive: 0x20242b, // cold shadow
  leg: 0x33363d, // dark iron
  legEmissive: 0x1a1c22,
  eye: 0xff3b30, // red-alert authoritarian eye
};

/**
 * @param {number} radius overall size (the boss collision radius)
 * @param {object} palette {body, emissive, leg, legEmissive, eye}
 * @returns {{group: THREE.Group, turret: THREE.Group, eye: THREE.Mesh, arms: THREE.Mesh[]}}
 */
export function buildEnforcerMesh(radius, palette = {}) {
  const p = { ...DEFAULT_PALETTE, ...palette };
  const R = radius;
  const group = new THREE.Group();

  const steel = new THREE.MeshStandardMaterial({
    color: p.body,
    emissive: p.emissive,
    emissiveIntensity: 0.4,
    roughness: 0.55,
    metalness: 0.35,
    flatShading: true,
  });
  const iron = new THREE.MeshStandardMaterial({
    color: p.leg,
    emissive: p.legEmissive,
    emissiveIntensity: 0.3,
    roughness: 0.7,
    metalness: 0.25,
    flatShading: true,
  });
  const glow = new THREE.MeshBasicMaterial({ color: p.eye }); // bloom-catching

  // --- legs + heavy hip base ---
  const hip = new THREE.Mesh(new THREE.BoxGeometry(R * 1.3, R * 0.5, R * 0.9), iron);
  hip.position.y = R * 0.55;
  group.add(hip);
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(R * 0.4, R * 0.6, R * 0.5), iron);
    leg.position.set(sx * R * 0.45, R * 0.25, 0);
    group.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(R * 0.5, R * 0.18, R * 0.8), iron);
    foot.position.set(sx * R * 0.45, R * 0.09, R * 0.1);
    group.add(foot);
  }

  // --- armored torso + a glowing chest vent ---
  const torso = new THREE.Mesh(new THREE.BoxGeometry(R * 1.15, R * 0.95, R * 0.75), steel);
  torso.position.y = R * 1.25;
  group.add(torso);
  const vent = new THREE.Mesh(new THREE.BoxGeometry(R * 0.5, R * 0.12, R * 0.05), glow);
  vent.position.set(0, R * 1.3, R * 0.4);
  group.add(vent);

  // --- shoulders + forward-facing arm cannons ---
  const arms = [];
  for (const sx of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(R * 0.45, R * 0.5, R * 0.5), steel);
    shoulder.position.set(sx * R * 0.8, R * 1.5, 0);
    group.add(shoulder);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.13, R * 0.16, R * 0.9, 8), iron);
    barrel.rotation.x = Math.PI / 2; // point along +z (forward)
    barrel.position.set(sx * R * 0.8, R * 1.45, R * 0.6);
    group.add(barrel);
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.1, R * 0.1, R * 0.06, 8), glow);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(sx * R * 0.8, R * 1.45, R * 1.05);
    group.add(muzzle);
    arms.push(barrel);
  }

  // --- head / turret (rotates), single cyclops eye + antenna ---
  const turret = new THREE.Group();
  turret.position.y = R * 1.95;
  group.add(turret);
  const head = new THREE.Mesh(new THREE.BoxGeometry(R * 0.7, R * 0.55, R * 0.6), steel);
  turret.add(head);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(R * 0.16, 12, 12), glow);
  eye.position.set(0, 0, R * 0.32);
  turret.add(eye);
  const brow = new THREE.Mesh(new THREE.BoxGeometry(R * 0.72, R * 0.1, R * 0.05), iron);
  brow.position.set(0, R * 0.16, R * 0.31);
  turret.add(brow);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.03, R * 0.03, R * 0.6, 6), iron);
  antenna.position.set(R * 0.25, R * 0.55, 0);
  turret.add(antenna);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(R * 0.07, 8, 8), glow);
  tip.position.set(R * 0.25, R * 0.88, 0);
  turret.add(tip);

  return { group, turret, eye, arms };
}
