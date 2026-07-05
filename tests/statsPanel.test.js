import { describe, it, expect } from 'vitest';
import { statRows } from '../src/core/statsPanel.js';

// CP-A: the pause-menu stats readout is a PURE transform of a Player.statsSnapshot(). These lock the
// contract: every tracked stat is surfaced, values are RAW tokens (no prose / no "what luck does"
// hand-holding), and a missing/partial snapshot degrades to zeros instead of throwing.

const FULL = {
  character: 'dad',
  weapon: 'Pistol',
  hearts: 4,
  maxHearts: 6,
  guardCharges: 2,
  damageMul: 1.35,
  fireRateMul: 0.82,
  speedMul: 1.1,
  globalDamageFlat: 2,
  luck: 3,
  baseline: { damage: 0.1, fireRate: 0.05, speed: 0.2, guard: 1, luck: 1.5 },
  weaponStacks: { damage: 2, fireRate: 1, pierce: 0, bounces: 0, bulletSpeed: 1, explodeRadius: 0 },
};

const findRow = (sections, title, label) =>
  sections.find((s) => s.title === title)?.rows.find((r) => r.label === label)?.value;

describe('statRows — pure pause-menu stats formatter', () => {
  it('surfaces the expected sections', () => {
    const titles = statRows(FULL).map((s) => s.title);
    expect(titles).toEqual([
      'Vitals',
      'Offense',
      'Mobility & fortune',
      'Weapon — Pistol',
      'Permanent (Resonance)',
    ]);
  });

  it('renders derived, in-run, per-weapon, and permanent values as raw tokens', () => {
    const s = statRows(FULL);
    expect(findRow(s, 'Vitals', 'Hearts')).toBe('4 / 6');
    expect(findRow(s, 'Vitals', 'Guard')).toBe('2');
    expect(findRow(s, 'Offense', 'Damage')).toBe('×1.35');
    expect(findRow(s, 'Offense', 'Fire rate')).toBe('×0.82');
    expect(findRow(s, 'Offense', 'Flat damage')).toBe('+2');
    expect(findRow(s, 'Mobility & fortune', 'Move speed')).toBe('×1.10');
    expect(findRow(s, 'Mobility & fortune', 'Luck')).toBe('3');
    expect(findRow(s, 'Weapon — Pistol', 'Damage stacks')).toBe('2');
    expect(findRow(s, 'Weapon — Pistol', 'Bullet speed')).toBe('1');
    expect(findRow(s, 'Permanent (Resonance)', 'Damage')).toBe('+10%');
    expect(findRow(s, 'Permanent (Resonance)', 'Guard')).toBe('+1');
    expect(findRow(s, 'Permanent (Resonance)', 'Luck')).toBe('1.5');
  });

  it('every value is a compact numeric token — no explanatory prose (no hand-holding)', () => {
    // number | ×N.NN | +N | +N% | N.N | "N / N" — nothing with letters/words.
    const token = /^(×?[+-]?\d+(\.\d+)?%?|\d+ \/ \d+)$/;
    for (const section of statRows(FULL)) {
      for (const row of section.rows) {
        expect(row.value, `${section.title} · ${row.label} = "${row.value}"`).toMatch(token);
      }
    }
  });

  it('degrades an empty/partial snapshot to zeros instead of throwing', () => {
    const s = statRows({});
    expect(() => statRows({})).not.toThrow();
    expect(findRow(s, 'Vitals', 'Hearts')).toBe('0 / 0');
    expect(findRow(s, 'Offense', 'Damage')).toBe('×0.00');
    expect(findRow(s, 'Permanent (Resonance)', 'Luck')).toBe('0.0');
    expect(s.find((x) => x.title.startsWith('Weapon'))?.title).toBe('Weapon — —');
  });
});
