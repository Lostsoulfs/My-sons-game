// =====================================================================
// npc.js — a survivor you can HELP or LEAVE.
//
// Walk close and a prompt appears. Press E to help or Q to leave. What
// happens next is random (see systems/npcDecision.js) — and you won't know
// if it was a good idea until after. Each survivor can only be used once.
//
// ADR-0044: a CHOICE-room survivor carries a `role` ({kind, name, color}) —
// same body, but the prompt is a single [E] Choose and the marker is tinted
// per role (the tint is the only tell of WHAT they offer — discovery).
// =====================================================================

import * as THREE from 'three';
import { NPC, PALETTE } from '../config.js';
import { makeCharacter } from './characterMesh.js';
import { dist } from '../core/math2d.js';

export class Npc {
  constructor(scene, x, z, name, opts = {}) {
    this.x = x;
    this.z = z;
    this.radius = NPC.radius;
    this.name = name || 'a survivor';
    this.used = false;
    this.passive = !!opts.passive; // ADR-0033 ambient civilian: never interactable, no "!" marker
    this.role = opts.role ?? null; // ADR-0044 choice-room reward-carrier ({kind, name, color})

    this.mesh = makeCharacter('npc', {
      radius: NPC.radius,
      height: NPC.height,
      color: PALETTE.npc,
    });
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);

    // a bobbing "!" marker so they're easy to spot (role survivors tint it — their one tell)
    this.marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 10, 10),
      new THREE.MeshBasicMaterial({ color: this.role?.color ?? 0xffffff }),
    );
    this.marker.position.set(x, NPC.height + 0.8, z);
    this.marker.visible = !this.passive; // civilians have no "!" (they're scenery, not a choice)
    scene.add(this.marker);
    this._t = Math.random() * 10;
  }

  inRange(player) {
    if (this.passive) return false; // ambient civilians never trigger the help/leave prompt
    return !this.used && dist(this.x, this.z, player.x, player.z) <= NPC.interactRadius;
  }

  update(dt) {
    this._t += dt;
    this.marker.position.y = NPC.height + 0.8 + Math.sin(this._t * 3) * 0.2;
    this.marker.rotation.y += dt * 2;
  }

  markUsed() {
    this.used = true;
    this.marker.visible = false;
    // dim the survivor so it's clear they're done
    this.mesh.traverse((o) => {
      if (o.material && o.material.color) o.material.color.multiplyScalar(0.5);
    });
  }
}
