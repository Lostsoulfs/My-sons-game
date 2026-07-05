// =====================================================================
// demonMesh.js — the procedural DEMON companion (CP-C, ADR-0042). 😈
//
// NOT a fantasy imp (no horns/wings/grin — the 6-MoE panel was unanimous). This
// is a government CONTAINMENT SPECIMEN that's still half-imprisoned: a hunched,
// asymmetric body dragging one OVERSIZED arm that's bound in a riveted 1950s
// restraint harness; a welded faceplate instead of a face; Cherenkov-blue glow
// leaking from the seams (the Echoes substance it's sealed with). It reads as a
// leashed hazard, not a pet — eyes-down, reluctant, dangerous if it slips.
//
// Glow parts are MeshBasic so the bloom pipeline (ADR-0025) catches them.
// Returns parts for the idle animation (entities/demon.js): the bound arm drags,
// the eye-slit pulses.
// =====================================================================

import * as THREE from 'three';

const DEFAULT_PALETTE = {
  hide: 0x3a3340, // bruised grey-violet monster hide
  hideEmissive: 0x1a1420,
  harness: 0x4d4438, // aged leather + brass restraint gear
  harnessEmissive: 0x201b12,
  seam: 0x66d8ff, // Cherenkov-blue containment glow (matches DEMON.bolt.color)
};

/**
 * @param {number} radius overall size (matches config.DEMON.radius)
 * @param {object} palette {hide, hideEmissive, harness, harnessEmissive, seam}
 * @returns {{group: THREE.Group, eye: THREE.Mesh, arm: THREE.Group}}
 */
export function buildDemonMesh(radius, palette = {}) {
  const p = { ...DEFAULT_PALETTE, ...palette };
  const R = radius;
  const group = new THREE.Group();

  const hide = new THREE.MeshStandardMaterial({
    color: p.hide,
    emissive: p.hideEmissive,
    emissiveIntensity: 0.4,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });
  const harness = new THREE.MeshStandardMaterial({
    color: p.harness,
    emissive: p.harnessEmissive,
    emissiveIntensity: 0.3,
    roughness: 0.6,
    metalness: 0.45,
    flatShading: true,
  });
  const glow = new THREE.MeshBasicMaterial({ color: p.seam }); // bloom-catching

  // --- hunched torso: pitched forward so the silhouette reads "reluctant", not proud ---
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.62, R * 0.9, 6, 10), hide);
  torso.position.y = R * 1.0;
  torso.rotation.x = 0.5; // the hunch
  group.add(torso);

  // a cracked containment seam across the chest, leaking glow
  const seam = new THREE.Mesh(new THREE.BoxGeometry(R * 0.66, R * 0.07, R * 0.05), glow);
  seam.position.set(0, R * 1.05, R * 0.5);
  seam.rotation.z = 0.35; // a crack, not a trim line
  group.add(seam);

  // --- head: low-set, faceplate welded over the face, a single averted eye-slit ---
  const head = new THREE.Mesh(new THREE.SphereGeometry(R * 0.4, 10, 8), hide);
  head.position.set(0, R * 1.55, R * 0.42); // pushed forward by the hunch
  group.add(head);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(R * 0.55, R * 0.42, R * 0.12), harness);
  plate.position.set(0, R * 1.52, R * 0.68); // welded over where the face should be
  group.add(plate);
  const eye = new THREE.Mesh(new THREE.BoxGeometry(R * 0.3, R * 0.05, R * 0.04), glow);
  eye.position.set(0, R * 1.45, R * 0.76); // a slit, set LOW on the plate — eyes-down, averted
  group.add(eye);

  // --- the BOUND arm (its whole silhouette hook): oversized, dragging, ringed in restraints ---
  const arm = new THREE.Group();
  arm.position.set(-R * 0.72, R * 1.15, 0.12 * R);
  group.add(arm);
  const limb = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.3, R * 1.05, 6, 10), hide);
  limb.position.y = -R * 0.55; // hangs from the shoulder pivot
  arm.add(limb);
  const fist = new THREE.Mesh(new THREE.SphereGeometry(R * 0.36, 8, 6), hide);
  fist.position.y = -R * 1.15; // knuckles at the floor — it DRAGS
  arm.add(fist);
  // riveted restraint rings clamped down the limb (the harness that's still holding)
  for (const [i, y] of [-R * 0.3, -R * 0.7, -R * 1.0].entries()) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(R * (0.34 - i * 0.01), R * 0.06, 6, 12),
      harness,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    arm.add(ring);
  }
  // one glowing hairline fracture in the topmost ring — the seal is NOT holding forever
  const crack = new THREE.Mesh(new THREE.BoxGeometry(R * 0.1, R * 0.05, R * 0.05), glow);
  crack.position.set(R * 0.3, -R * 0.3, 0);
  arm.add(crack);

  // --- the free arm: small, tucked in — the asymmetry that sells "specimen", not "soldier" ---
  const offArm = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.14, R * 0.55, 4, 8), hide);
  offArm.position.set(R * 0.6, R * 0.95, R * 0.1);
  offArm.rotation.z = -0.25;
  group.add(offArm);

  // --- stubby legs (the hunch does the walking work visually) ---
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.18, R * 0.35, 4, 8), hide);
    leg.position.set(sx * R * 0.3, R * 0.35, 0);
    group.add(leg);
  }

  return { group, eye, arm };
}
