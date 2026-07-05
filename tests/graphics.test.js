import { describe, it, expect } from 'vitest';
import {
  effectivePixelRatio,
  isSoftwareRenderer,
  resolveGraphicsTier,
  applyGraphicsPreset,
} from '../src/core/graphics.js';
import { PIXEL_RATIO_CAPS, SHADOW_MAP_SIZES, GRAPHICS } from '../src/config.js';

describe('effectivePixelRatio', () => {
  it('clamps the device ratio down to the cap', () => {
    expect(effectivePixelRatio(3, 1.5)).toBe(1.5);
    expect(effectivePixelRatio(2, 1)).toBe(1);
  });

  it('uses the device ratio when it is below the cap', () => {
    expect(effectivePixelRatio(1, 1.5)).toBe(1);
    expect(effectivePixelRatio(1.25, 2)).toBe(1.25);
  });

  it('falls back to 1 for a missing/garbage device ratio', () => {
    expect(effectivePixelRatio(undefined, 2)).toBe(1);
    expect(effectivePixelRatio(0, 2)).toBe(1);
    expect(effectivePixelRatio(NaN, 2)).toBe(1);
    expect(effectivePixelRatio(-4, 2)).toBe(1);
  });

  it('falls back to the device ratio for a missing/garbage cap', () => {
    expect(effectivePixelRatio(1.25, undefined)).toBe(1.25);
    expect(effectivePixelRatio(2, 0)).toBe(2);
    expect(effectivePixelRatio(1.5, NaN)).toBe(1.5);
  });

  it('always returns a finite positive number', () => {
    for (const dr of [undefined, NaN, 0, -1, 1, 2, 5]) {
      for (const cap of [undefined, NaN, 0, 1, 1.5, 2]) {
        const r = effectivePixelRatio(dr, cap);
        expect(Number.isFinite(r)).toBe(true);
        expect(r).toBeGreaterThan(0);
      }
    }
  });
});

describe('graphics A/B option arrays', () => {
  it('expose the dropdown choices, including the dial-back defaults and the old values', () => {
    expect(PIXEL_RATIO_CAPS).toContain(1.5); // FPS-1 new default
    expect(PIXEL_RATIO_CAPS).toContain(2.0); // the old default, for A/B
    expect(SHADOW_MAP_SIZES).toContain(1024); // FPS-1 new default
    expect(SHADOW_MAP_SIZES).toContain(2048); // the old default, for A/B
  });

  it('are sorted ascending', () => {
    expect([...PIXEL_RATIO_CAPS].sort((a, b) => a - b)).toEqual(PIXEL_RATIO_CAPS);
    expect([...SHADOW_MAP_SIZES].sort((a, b) => a - b)).toEqual(SHADOW_MAP_SIZES);
  });
});

describe('isSoftwareRenderer', () => {
  it('flags unambiguous software / offscreen GL renderers', () => {
    expect(isSoftwareRenderer('Google SwiftShader')).toBe(true);
    expect(isSoftwareRenderer('ANGLE (Google, Vulkan 1.3 (SwiftShader Device))')).toBe(true);
    expect(isSoftwareRenderer('Mesa/X.org, llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true);
    expect(isSoftwareRenderer('Mesa OffScreen')).toBe(true);
    expect(isSoftwareRenderer('Microsoft Basic Render Driver')).toBe(true);
  });

  it('does NOT flag real GPUs — including an Intel iGPU via ANGLE', () => {
    // the exact string the headless preview reported (a real iGPU, must stay 'high')
    expect(
      isSoftwareRenderer('ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x0000A7A0) Direct3D11 ...)'),
    ).toBe(false);
    expect(
      isSoftwareRenderer('ANGLE (NVIDIA, NVIDIA GeForce RTX 5060 Direct3D11 vs_5_0 ps_5_0, D3D11)'),
    ).toBe(false);
    expect(isSoftwareRenderer('Apple M2')).toBe(false);
  });

  it('is safe on missing / non-string input', () => {
    expect(isSoftwareRenderer('')).toBe(false);
    expect(isSoftwareRenderer(undefined)).toBe(false);
    expect(isSoftwareRenderer(null)).toBe(false);
    expect(isSoftwareRenderer(42)).toBe(false);
  });
});

describe('resolveGraphicsTier', () => {
  it('honours an explicit ?gfx param above everything else', () => {
    // even a beastly GPU is forced low; even software is forced high — the param always wins
    expect(resolveGraphicsTier({ param: 'low', renderer: 'RTX 5060', webdriver: false })).toBe(
      'low',
    );
    expect(resolveGraphicsTier({ param: 'high', renderer: 'llvmpipe', webdriver: true })).toBe(
      'high',
    );
    expect(resolveGraphicsTier({ param: '  LOW  ' })).toBe('low'); // trimmed + case-insensitive
  });

  it('ignores a garbage param and falls through to detection', () => {
    expect(resolveGraphicsTier({ param: 'ultra', renderer: 'RTX 5060' })).toBe('high');
    expect(resolveGraphicsTier({ param: '', renderer: 'SwiftShader' })).toBe('low');
  });

  it('auto-downgrades webdriver + software renderers, keeps real GPUs high', () => {
    expect(resolveGraphicsTier({ webdriver: true })).toBe('low');
    expect(resolveGraphicsTier({ renderer: 'llvmpipe' })).toBe('low');
    expect(resolveGraphicsTier({ renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics)' })).toBe(
      'high',
    );
    expect(resolveGraphicsTier({})).toBe('high'); // no signal → full fidelity
    expect(resolveGraphicsTier()).toBe('high'); // no args at all
  });
});

describe('applyGraphicsPreset', () => {
  it('deep-merges the low preset without clobbering sibling keys', () => {
    const target = {
      pixelRatioCap: 2,
      aaSamples: 8,
      bloom: { enabled: true, intensity: 1.15 },
      shadows: { enabled: true, mapSize: 2048 },
    };
    const out = applyGraphicsPreset(target, {
      pixelRatioCap: 1,
      aaSamples: 0,
      bloom: { enabled: false },
      shadows: { enabled: false },
    });
    expect(out).toBe(target); // mutates in place, returns target
    expect(target.pixelRatioCap).toBe(1);
    expect(target.aaSamples).toBe(0);
    expect(target.bloom).toEqual({ enabled: false, intensity: 1.15 }); // intensity preserved
    expect(target.shadows).toEqual({ enabled: false, mapSize: 2048 }); // mapSize preserved
  });

  it('is a no-op for a missing preset', () => {
    const target = { pixelRatioCap: 2 };
    expect(applyGraphicsPreset(target, null)).toBe(target);
    expect(target.pixelRatioCap).toBe(2);
  });

  it('the real GRAPHICS.lowPreset actually turns the heavy knobs down', () => {
    const g = JSON.parse(JSON.stringify(GRAPHICS)); // clone so we never mutate the shared config
    applyGraphicsPreset(g, GRAPHICS.lowPreset);
    expect(g.pixelRatioCap).toBe(1);
    expect(g.aaSamples).toBe(0);
    expect(g.shadows.enabled).toBe(false);
    expect(g.ao.enabled).toBe(false);
    expect(g.bloom.enabled).toBe(false);
    expect(g.floor.enabled).toBe(false);
    // coherence: the postfx MASTER stays on (low = cheap pipeline, not raw render)
    expect(g.enabled).toBe(true);
  });
});
