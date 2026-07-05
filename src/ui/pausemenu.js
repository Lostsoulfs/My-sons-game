// =====================================================================
// pausemenu.js — the in-run pause overlay (CP-A). ESC / Start freezes the fight (game holds the
// State.PAUSED gate; the sim doesn't tick) and shows this: the connected-floor MAP, an OPTIONS
// strip (sound + FX, wired to the persisted settings store), and an opt-in STATS panel that lays
// out EVERY tracked stat as raw numbers.
//
// Design rule: NO hand-holding. The stats are there to discover, not to be taught — no tooltips,
// no "what luck does". Plain DOM overlay (#pausemenu in index.html), no library.
// =====================================================================

import { hud } from './hud.js';
import { settings } from '../systems/settings.js';
import { statRows } from '../core/statsPanel.js';

const $ = (id) => document.getElementById(id);

const cap = (s) => (typeof s === 'string' && s ? s[0].toUpperCase() + s.slice(1) : s);

export function showPauseMenu({ players = [], coop = false, mapView = null, onResume } = {}) {
  const menu = $('pausemenu');
  if (!menu) return; // headless / no DOM

  // MAP — reuse the exact HUD minimap paint into the pause overlay's own element
  hud.setMinimap(mapView, 'pause-map');

  // STATS — one column per player (P1, plus P2 in co-op)
  renderStats(players, coop);

  // OPTIONS — reflect current settings, then wire the toggles (idempotent per show)
  syncOptions();
  wireOptions();

  const resume = $('pause-resume');
  if (resume) resume.onclick = () => onResume && onResume();

  // the always-on bottom-right #settings widget is redundant here (we have our own Options) —
  // hide it while paused so it doesn't peek through the semi-transparent overlay.
  const s = $('settings');
  if (s) s.style.display = 'none';

  menu.classList.add('show');
}

export function hidePauseMenu() {
  $('pausemenu')?.classList.remove('show');
  const s = $('settings');
  if (s) s.style.display = ''; // let the .ready class control it again
}

function renderStats(players, coop) {
  const wrap = $('pause-stats');
  if (!wrap) return;
  wrap.innerHTML = '';
  players.forEach((p, i) => {
    const snap = p.statsSnapshot ? p.statsSnapshot() : {};
    const col = document.createElement('div');
    col.className = 'pause-statcol';

    const head = document.createElement('div');
    head.className = 'pause-statcol-head';
    const who = coop ? `P${i + 1} · ` : '';
    head.textContent = `${who}${cap(snap.character || 'Survivor')}`;
    col.appendChild(head);

    for (const section of statRows(snap)) {
      const sec = document.createElement('div');
      sec.className = 'pause-stat-section';
      const title = document.createElement('div');
      title.className = 'pause-stat-title';
      title.textContent = section.title;
      sec.appendChild(title);
      for (const row of section.rows) {
        const r = document.createElement('div');
        r.className = 'pause-stat-row';
        const l = document.createElement('span');
        l.className = 'pause-stat-label';
        l.textContent = row.label;
        const v = document.createElement('span');
        v.className = 'pause-stat-value';
        v.textContent = row.value;
        r.append(l, v);
        sec.appendChild(r);
      }
      col.appendChild(sec);
    }
    wrap.appendChild(col);
  });
}

function syncOptions() {
  const mute = $('pause-mute');
  if (mute) mute.textContent = settings.get('muted') ? '🔇 Sound: off' : '🔊 Sound: on';
  const vol = $('pause-vol');
  if (vol) vol.value = String(settings.get('volume'));
  const fx = $('pause-fx');
  if (fx) fx.textContent = settings.get('reducedEffects') ? '✨ Effects: low' : '✨ Effects: full';
}

function wireOptions() {
  const mute = $('pause-mute');
  if (mute)
    mute.onclick = () => {
      settings.toggle('muted');
      syncOptions();
    };
  const vol = $('pause-vol');
  if (vol) vol.oninput = () => settings.set('volume', Number(vol.value));
  const fx = $('pause-fx');
  if (fx)
    fx.onclick = () => {
      settings.toggle('reducedEffects');
      syncOptions();
    };
}
