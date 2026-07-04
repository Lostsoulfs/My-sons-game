// =====================================================================
// pickups.js — items you grab by walking over them (no key press needed).
//
// Stat gems (heal / damage / fire-rate / speed) and weapon pickups
// (shotgun / machine gun / rocket). They float and spin so they're easy to
// spot. Collection is handled in game.js via a circle-vs-circle check.
// =====================================================================

import * as THREE from 'three';
import { PICKUPS } from '../config.js';
import { makeTextSprite } from '../core/textSprite.js';
import { hud } from '../ui/hud.js';
import * as audio from '../systems/audio.js';

/** a distinct shape per pickup type, so you can read it at a glance */
function shapeFor(type, weapon) {
  if (weapon) return new THREE.BoxGeometry(0.7, 0.4, 0.9);
  switch (type) {
    case 'HEAL':
      return new THREE.TetrahedronGeometry(0.55);
    case 'HEART':
      return new THREE.TetrahedronGeometry(0.4); // a smaller heal-shape reads as "+1"
    case 'DAMAGE_UP':
      return new THREE.OctahedronGeometry(0.5);
    case 'FIRE_RATE_UP':
      return new THREE.DodecahedronGeometry(0.45);
    case 'SPEED_UP':
      return new THREE.ConeGeometry(0.45, 0.9, 6);
    default:
      return new THREE.OctahedronGeometry(0.5);
  }
}

// every weapon pickup type (also the boss-reward pool). Exported so tests +
// the debug menu stay in lockstep instead of hand-copying the list.
export const WEAPON_TYPES = [
  'SHOTGUN',
  'MACHINEGUN',
  'ROCKET',
  'HOMING',
  'RAILGUN',
  'BOUNCER',
  'CHARGE',
  'ORBITAL',
  // 1950s matrix — ground-droppable tiers only (ULTRA minigun/davycrockett are offer-only)
  'UZI',
  'CARBINE',
  'LASERPISTOL',
  'GARAND',
  'THOMPSON',
  'PPSH',
  'BAR',
  'BROWNING',
  'MASER',
  'RAYGUN',
  'PLASMA',
];

const LOOK = {
  HEAL: { color: 0xff3b6b, label: '+2 HEARTS', weapon: false },
  HEART: { color: 0xff6b8f, label: '+1 HEART', weapon: false },
  DAMAGE_UP: { color: 0xff8a3b, label: 'DAMAGE UP', weapon: false },
  FIRE_RATE_UP: { color: 0xffe24a, label: 'FASTER SHOTS', weapon: false },
  SPEED_UP: { color: 0x49b3ff, label: 'SPEED UP', weapon: false },
  SHOTGUN: { color: 0xff5a2a, label: 'SHOTGUN!', weapon: true },
  MACHINEGUN: { color: 0xc0c0ff, label: 'MACHINE GUN!', weapon: true },
  ROCKET: { color: 0xff2a2a, label: 'ROCKET LAUNCHER!', weapon: true },
  HOMING: { color: 0xff8800, label: 'HOMING MISSILES!', weapon: true },
  RAILGUN: { color: 0x66e0ff, label: 'RAILGUN!', weapon: true },
  BOUNCER: { color: 0x9b7bff, label: 'BOUNCER!', weapon: true },
  CHARGE: { color: 0xffd23a, label: 'CHARGE CANNON!', weapon: true },
  ORBITAL: { color: 0x66ffd0, label: 'ORBITAL BLADE!', weapon: true },
  // 1950s matrix — ground-droppable guns (energy guns get their bright bullet color)
  UZI: { color: 0xc8c8b0, label: 'GREASE GUN!', weapon: true },
  CARBINE: { color: 0xd8c090, label: 'M1 CARBINE!', weapon: true },
  LASERPISTOL: { color: 0x66ff9e, label: 'LASER PISTOL!', weapon: true },
  GARAND: { color: 0xe8d8a0, label: 'M1 GARAND!', weapon: true },
  THOMPSON: { color: 0xd0b070, label: 'THOMPSON!', weapon: true },
  PPSH: { color: 0xd0a860, label: 'PPSh-41!', weapon: true },
  BAR: { color: 0xc0b080, label: 'BAR!', weapon: true },
  BROWNING: { color: 0xd8c080, label: 'BROWNING M1919!', weapon: true },
  MASER: { color: 0x8ad0ff, label: 'MASER BEAM!', weapon: true },
  RAYGUN: { color: 0x9effc0, label: 'ATOMIC RAY GUN!', weapon: true },
  PLASMA: { color: 0x7effd0, label: 'PLASMA LAUNCHER!', weapon: true },
};

// Drop SELECTION (rarity tiers + hard pity) now lives in the pure, THREE-free core/drops.js so it
// stays unit-testable; this file owns only the THREE-backed Pickup an actual drop becomes.

export class Pickup {
  constructor(scene, type, x, z) {
    this.scene = scene;
    this.type = type;
    this.x = x;
    this.z = z;
    this.radius = PICKUPS.radius;
    this.dead = false;
    this._t = Math.random() * 10;

    const look = LOOK[type] || LOOK.HEAL;
    // group = a spinning shape + a floating name label (so you know what it is)
    const group = new THREE.Group();
    this.shape = new THREE.Mesh(
      shapeFor(type, look.weapon),
      new THREE.MeshStandardMaterial({
        color: look.color,
        emissive: look.color,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        flatShading: true,
      }),
    );
    group.add(this.shape);

    const label = makeTextSprite(look.label, look.color);
    label.position.set(0, 1.4, 0);
    group.add(label);

    group.position.set(x, 1, z);
    this.mesh = group;
    scene.add(group);
  }

  update(dt) {
    this._t += dt;
    this.mesh.position.y = 1 + Math.sin(this._t * 3) * 0.2;
    this.shape.rotation.y += dt * 2.5;
  }

  collect(game, player = game.player) {
    if (this.dead) return;
    this.dead = true;
    this.scene.remove(this.mesh);

    const look = LOOK[this.type] || LOOK.HEAL;
    if (look.weapon) {
      player.addWeapon(this.type.toLowerCase());
      audio.play('weapon');
    } else {
      // the two heal types carry a magnitude; the stat UPs add a stack (see player.js)
      const HEAL_MAG = { HEAL: PICKUPS.healAmount, HEART: PICKUPS.mobHeartAmount };
      player.applyEffect(this.type, HEAL_MAG[this.type] ?? 0, game);
      audio.play('pickup');
    }
    hud.toast(look.label, true);
    game.refreshHud();
  }
}
