// Gamepad aim coverage — the axis-detection that fixes "Player 2 only turns a
// bit in front" on non-standard controllers. Pure gamepadMap tests + headless
// Input integration (a fake navigator.getGamepads feeds stub pads).
import { beforeEach, describe, expect, it } from 'vitest';
import { rightStickAxes, padAimFromAxes } from '../src/core/gamepadMap.js';

function installGlobals() {
  const listeners = {};
  const state = { pads: [] };
  globalThis.addEventListener = (type, handler) => {
    (listeners[type] ||= []).push(handler);
  };
  Object.defineProperty(globalThis, 'navigator', {
    value: { getGamepads: () => state.pads },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'window', {
    value: { innerWidth: 800, innerHeight: 600 },
    configurable: true,
  });
  return {
    state,
    fire(type, event) {
      for (const h of listeners[type] || []) h(event);
    },
  };
}

function makeDom() {
  const listeners = {};
  return {
    addEventListener(type, h) {
      (listeners[type] ||= []).push(h);
    },
    contains() {
      return false;
    },
  };
}

// a stub gamepad; `axes` layout is [leftX, leftY, rightX, rightY, ...]
const pad = (axes, { id = 'Test Pad', mapping = 'standard' } = {}) => ({
  id,
  mapping,
  axes,
  buttons: [],
});
const stdAxes = (rx, ry) => [0, 0, rx, ry];

describe('gamepadMap.rightStickAxes', () => {
  it('uses axes[2],[3] for W3C standard pads', () => {
    expect(rightStickAxes({ mapping: 'standard', axes: [0, 0, 0, 0] })).toEqual({ ix: 2, iy: 3 });
  });

  it('detects a non-standard right stick from observed motion peaks', () => {
    const gp = { id: 'Weird', mapping: '', axes: [0, 0, 0, 0, 0] };
    const peaks = [];
    peaks[2] = 0.05; // an idle/trigger axis
    peaks[3] = 1.8;
    peaks[4] = 1.9; // the real stick swung the most
    expect(rightStickAxes(gp, { peaks })).toEqual({ ix: 3, iy: 4 });
  });

  it('defaults to axes[2],[3] before there is enough motion evidence', () => {
    const gp = { id: 'Weird', mapping: '', axes: [0, 0, 0, 0, 0] };
    expect(rightStickAxes(gp, { peaks: [] })).toEqual({ ix: 2, iy: 3 });
  });

  it('honors an explicit remap keyed by an id substring', () => {
    const gp = { id: 'Acme Retro Pad 9000', mapping: 'standard', axes: [0, 0, 0, 0, 0, 0] };
    expect(rightStickAxes(gp, { remap: { 'Retro Pad': [4, 5] } })).toEqual({ ix: 4, iy: 5 });
  });
});

describe('gamepadMap.padAimFromAxes', () => {
  it('pins the aim sign convention (stick up = -z, matching mouse/W)', () => {
    expect(padAimFromAxes(0, -1)).toEqual({ x: 0, z: -1 }); // up → away from camera
    expect(padAimFromAxes(0, 1)).toEqual({ x: 0, z: 1 }); // down → toward camera
    expect(padAimFromAxes(1, 0)).toEqual({ x: 1, z: 0 }); // right
    expect(padAimFromAxes(-1, 0)).toEqual({ x: -1, z: 0 }); // left
  });
});

describe('Input gamepad aim', () => {
  let g;
  let Input;

  beforeEach(async () => {
    g = installGlobals();
    Input = (await import('../src/systems/input.js')).Input;
  });

  function makeInput(gp) {
    const input = new Input(makeDom());
    input._padIndex = 0; // pretend a controller connected (skips hud.toast)
    g.state.pads = [gp];
    return input;
  }

  it('aims a full 360° from the four cardinal right-stick pushes (standard pad)', () => {
    const input = makeInput(pad(stdAxes(0, 0)));
    for (const [name, rx, ry] of [
      ['up', 0, -1],
      ['right', 1, 0],
      ['down', 0, 1],
      ['left', -1, 0],
    ]) {
      g.state.pads = [pad(stdAxes(rx, ry))];
      input.update();
      const aim = input.aim('pad', null, 0, 0);
      expect(aim.x, `${name} x`).toBeCloseTo(rx, 5);
      expect(aim.z, `${name} z`).toBeCloseTo(ry, 5);
    }
  });

  it('ignores sub-deadzone jitter and keeps the last aim', () => {
    const input = makeInput(pad(stdAxes(1, 0)));
    input.update();
    expect(input.aim('pad', null, 0, 0)).toEqual({ x: 1, z: 0 });

    g.state.pads = [pad(stdAxes(0.1, 0.1))]; // within the 0.15 deadzone
    input.update();
    expect(input.pad.aiming).toBe(false);
    expect(input.aim('pad', null, 0, 0)).toEqual({ x: 1, z: 0 }); // persisted
  });

  it('recovers a non-standard pad whose right stick is on axes[3],[4]', () => {
    const raw = (a3, a4) => [{ id: 'NoName', mapping: '', axes: [0, 0, 0, a3, a4], buttons: [] }];
    const input = makeInput(raw(0, 0)[0]);
    input.update();
    // swing the real stick across its range while the move stick stays idle
    for (const [a3, a4] of [
      [-1, -1],
      [1, 1],
      [0, 0],
    ]) {
      g.state.pads = raw(a3, a4);
      input.update();
    }
    g.state.pads = raw(1, -1); // push up-right on the real stick
    input.update();

    expect(input._rightAxes).toEqual({ ix: 3, iy: 4 });
    const aim = input.aim('pad', null, 0, 0);
    expect(aim.x).toBeGreaterThan(0);
    expect(aim.z).toBeLessThan(0);
  });

  it('never throws on a short axes array (out-of-range guard)', () => {
    const input = makeInput({ id: 'Stub', mapping: 'standard', axes: [0, 0], buttons: [] });
    expect(() => input.update()).not.toThrow();
    expect(input.aim('pad', null, 0, 0)).toEqual({ x: 0, z: -1 }); // default persists
  });
});
