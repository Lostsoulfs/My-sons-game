// =====================================================================
// hud.js — the on-screen stuff drawn with plain HTML over the 3D canvas:
// hearts, the room counter, the big banner, the outcome toast, and the
// red blood-splatter flash.
// =====================================================================

import { MINIMAP, GUARD } from '../config.js';
import { settings } from '../systems/settings.js';

const $ = (id) => document.getElementById(id);

let _toastTimer = null;

// CP-B: guard charges render as ATOMIC ARMOR plates trailing the hearts. Charges are hard-capped at
// GUARD.maxCharges (config), so the plate count is always the TRUTH — no hidden armor. Each hit strips
// a plate before a heart (core/defense.js), so the plate popping off IS the block cue. `armor` defaults
// to 0 so old callers keep working.
const platesFor = (armor) => {
  const p = Math.min(GUARD.maxCharges, Math.max(0, Math.floor(armor || 0)));
  return p ? ' ' + '🛡️'.repeat(p) : '';
};

export const hud = {
  setHearts(n, max, armor = 0) {
    const el = $('hearts');
    if (!el) return;
    el.textContent =
      '❤️'.repeat(Math.max(0, n)) + '🖤'.repeat(Math.max(0, max - n)) + platesFor(armor);
  },

  // Player 2 (co-op) hearts — green
  setHearts2(n, max, armor = 0) {
    const el = $('hearts2');
    if (!el) return;
    el.textContent =
      'P2 ' + '💚'.repeat(Math.max(0, n)) + '🖤'.repeat(Math.max(0, max - n)) + platesFor(armor);
  },

  // show/hide the co-op (P2) HUD bits
  setCoop(on) {
    const el = $('hearts2');
    if (el) el.style.display = on ? 'block' : 'none';
  },

  setLives(n) {
    const el = $('lives');
    if (el) el.textContent = `LIVES ${'🔺'.repeat(Math.max(0, n))}`;
  },

  // info = { floorIndex, isBossRoom, explored, total } (ADR-0032 connected map)
  setRoom(info, weaponName) {
    const el = $('room');
    if (!el) return;
    const floor = info.floorIndex + 1;
    const where = info.isBossRoom ? 'BOSS' : `EXPLORED ${info.explored}/${info.total}`;
    el.textContent = `FLOOR ${floor} · ${where}${weaponName ? ` · ${weaponName}` : ''}`;
  },

  // CP2: the active weapon's reload (ballistic) / overheat (energy) readout — bottom-centre.
  // Called per-frame from render() since the heat gauge bleeds continuously. `info` is
  // Player.limiterHud() (or null for a limiter-less weapon).
  setLimiter(info) {
    const el = $('ammo');
    if (!el) return;
    if (!info) {
      el.textContent = '';
      el.className = '';
      return;
    }
    if (info.kind === 'reload') {
      el.classList.toggle('reloading', info.reloading);
      el.classList.remove('overheated');
      el.textContent = info.reloading ? '⟳ RELOADING…' : `⦿ ${info.ammo} / ${info.clipSize}`;
    } else {
      const n = Math.max(0, Math.min(10, Math.round(info.heat * 10)));
      const bar = '▮'.repeat(n) + '▯'.repeat(10 - n);
      el.classList.remove('reloading');
      el.classList.toggle('overheated', info.overheated);
      el.textContent = info.overheated ? `⚠ OVERHEAT ${bar}` : `HEAT ${bar}`;
    }
  },

  // the connected-floor minimap (ADR-0032): a pooled grid of absolutely-positioned
  // cells painted from the PURE minimapView model — explored rooms + adjacent
  // unknowns, special-room identity hidden. Event-driven via refreshHud, never per-tick.
  setMinimap(view, elId = 'minimap') {
    const el = $(elId);
    if (!el || !view) return;
    const { cell, gap } = MINIMAP;
    // grow the cell pool as needed (rooms only ever get revealed within a floor;
    // floor changes shrink the count — extras just hide)
    while (el.children.length < view.cells.length) {
      const div = document.createElement('div');
      div.className = 'mm-cell';
      el.appendChild(div);
    }
    for (let i = 0; i < el.children.length; i++) {
      const div = el.children[i];
      const c = view.cells[i];
      if (!c) {
        div.style.display = 'none';
        continue;
      }
      div.style.display = 'block';
      div.className = `mm-cell mm-${c.kind}`;
      // size AND position from config.MINIMAP.cell (single source of truth — the CSS no
      // longer hardcodes a width/height that could silently drift from the layout math)
      div.style.width = `${cell}px`;
      div.style.height = `${cell}px`;
      div.style.left = `${c.gx * (cell + gap)}px`;
      div.style.top = `${c.gy * (cell + gap)}px`;
    }
    el.style.width = `${view.w * (cell + gap) - gap}px`;
    el.style.height = `${view.h * (cell + gap) - gap}px`;
  },

  // Render 1 or 2 boss HP bars (the dog/cat duo uses two). Each row shows the
  // boss's name + a fill; a dead boss's row greys out at 0% (clear "you got one!").
  setBossBars(bosses) {
    const wrap = $('bossbars');
    if (!wrap) return;
    wrap.classList.add('show');
    const rows = wrap.querySelectorAll('.bossbar');
    rows.forEach((row, i) => {
      const b = bosses[i];
      if (!b) {
        row.classList.add('hidden');
        return;
      }
      row.classList.remove('hidden');
      const frac = Math.max(0, Math.min(1, b.hp / b.maxHp));
      row.querySelector('.bossbar-fill').style.width = `${frac * 100}%`;
      row.querySelector('.bossbar-name').textContent = b.name;
      row.classList.toggle('dead', !!b.dead || b.hp <= 0);
    });
  },

  hideBossBars() {
    $('bossbars')?.classList.remove('show');
  },

  banner(text) {
    const el = $('banner');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
  },

  hideBanner() {
    $('banner')?.classList.remove('show');
  },

  // the boss ENTRANCE name card (ADR-0033): big name + epithet, CSS fade/scale-in. Distinct
  // from the transient #banner and the persistent HP-bar name. textContent = XSS-safe convention.
  nameCard(name, subtitle = '') {
    const el = $('namecard');
    if (!el) return;
    const n = $('namecard-name');
    const s = $('namecard-sub');
    if (n) n.textContent = name;
    if (s) s.textContent = subtitle;
    el.classList.add('show');
  },

  hideNameCard() {
    $('namecard')?.classList.remove('show');
  },

  toast(text, good = true) {
    const el = $('toast');
    if (!el) return;
    el.textContent = text;
    el.style.color = good ? '#7cff9b' : '#ff5a5a';
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  },

  flashSplatter() {
    const el = $('splatter');
    if (!el) return;
    el.style.opacity = '0.9';
    setTimeout(() => (el.style.opacity = '0'), 80);
  },

  /**
   * Brief full-screen impact flash (config.FEEL). `peak` opacity in a `color`, fading to 0
   * over `ms`. Skipped entirely when reducedEffects is on (accessibility / motion-sensitive).
   * Distinct from flashSplatter (which is the red blood overlay on hurt).
   */
  flashScreen(peak, color, ms) {
    if (settings.get('reducedEffects')) return;
    const el = $('screenflash');
    if (!el) return;
    el.style.transition = 'none';
    el.style.background = color;
    el.style.opacity = String(peak);
    // next frame: enable the transition and fade to 0 (a frame gap so it actually animates)
    requestAnimationFrame(() => {
      el.style.transition = `opacity ${ms}ms ease`;
      el.style.opacity = '0';
    });
  },
};
