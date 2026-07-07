// =====================================================================
// pausemenu.js — the in-run pause HUB (CP-A). ESC / Start freezes the run (game holds the
// State.PAUSED gate; the sim doesn't tick) and opens this: a short list of buttons —
// Map · Stats · Gear · Unlocks · Options — each opening its OWN view (Back returns to the hub).
//
// Design rule: NO hand-holding. Stats/gear are raw numbers, no tooltips, no "what luck does".
// Plain DOM overlay (#pausemenu in index.html), no library.
// =====================================================================

import { hud } from './hud.js';
import { settings } from '../systems/settings.js';
import { statRows, demonRows, karmaRows } from '../core/statsPanel.js';
import { karmaTitle } from '../core/karma.js';
import { saves } from '../core/saves.js';
import { META_UPGRADES, WEAPONS } from '../config.js';

const $ = (id) => document.getElementById(id);
const cap = (s) => (typeof s === 'string' && s ? s[0].toUpperCase() + s.slice(1) : s);
const weaponName = (key) => WEAPONS[key]?.name || cap(key);

let _ctx = null; // { players, coop, demon?, karma?, mapView, onResume } — demon = its statsSnapshot (CP-C)

export function showPauseMenu(ctx = {}) {
  _ctx = ctx;
  const menu = $('pausemenu');
  if (!menu) return; // headless / no DOM
  wireHub();
  showHub();
  const s = $('settings');
  if (s) s.style.display = 'none'; // hide the always-on widget while paused (our Options covers it)
  menu.classList.add('show');
}

export function hidePauseMenu() {
  $('pausemenu')?.classList.remove('show');
  const s = $('settings');
  if (s) s.style.display = '';
  _ctx = null;
}

function wireHub() {
  const resume = $('pause-resume');
  if (resume) resume.onclick = () => _ctx?.onResume?.();
  for (const b of document.querySelectorAll('#pause-hub [data-view]')) {
    b.onclick = () => openView(b.dataset.view);
  }
  const back = $('pause-back');
  if (back) back.onclick = showHub;
}

function showHub() {
  const hub = $('pause-hub');
  const view = $('pause-view');
  if (hub) hub.style.display = 'flex'; // explicit (matches the CSS) so a stray inline '' can't fight it
  if (view) view.style.display = 'none';
}

const VIEWS = {
  map: { title: 'Map', render: renderMap },
  stats: { title: 'Stats', render: renderStats },
  gear: { title: 'Gear', render: renderGear },
  unlocks: { title: 'Unlocks', render: renderUnlocks },
  options: { title: 'Options', render: renderOptions },
};

function openView(key) {
  const v = VIEWS[key];
  if (!v) return;
  const title = $('pause-view-title');
  const body = $('pause-view-body');
  if (title) title.textContent = v.title;
  if (body) {
    body.innerHTML = '';
    v.render(body);
  }
  const hub = $('pause-hub');
  const view = $('pause-view');
  if (hub) hub.style.display = 'none';
  if (view) view.style.display = 'flex'; // NOT '' — the CSS default is display:none, so '' would re-hide it
}

// ---- tiny DOM helpers -------------------------------------------------------

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function row(label, value, active) {
  const r = el('div', 'pause-stat-row' + (active ? ' active' : ''));
  r.append(el('span', 'pause-stat-label', label), el('span', 'pause-stat-value', value));
  return r;
}

function section(title, rows) {
  const sec = el('div', 'pause-stat-section');
  sec.appendChild(el('div', 'pause-stat-title', title));
  for (const r of rows) sec.appendChild(r);
  return sec;
}

function eachPlayer(fn) {
  const players = _ctx?.players || [];
  const coop = _ctx?.coop;
  players.forEach((p, i) => {
    const who = cap(p.character || 'Survivor');
    fn(p, coop ? `P${i + 1} · ${who}` : who);
  });
}

// ---- views ------------------------------------------------------------------

function renderMap(body) {
  const map = el('div');
  map.id = 'pause-map';
  body.appendChild(map);
  hud.setMinimap(_ctx?.mapView, 'pause-map');
}

function renderStats(body) {
  const cols = el('div', 'pause-cols');
  eachPlayer((p, label) => {
    const snap = p.statsSnapshot ? p.statsSnapshot() : {};
    const col = el('div', 'pause-statcol');
    col.appendChild(el('div', 'pause-statcol-head', label));
    for (const sec of statRows(snap)) {
      col.appendChild(
        section(
          sec.title,
          sec.rows.map((r) => row(r.label, r.value)),
        ),
      );
    }
    cols.appendChild(col);
  });
  // CP-C (ADR-0042): the demon companion's slim column — the multipliers the seal feeds it.
  // Raw numbers only (no-hand-holding rule); present only when a demon is out this run.
  if (_ctx?.demon) {
    const col = el('div', 'pause-statcol');
    col.appendChild(el('div', 'pause-statcol-head', '😈 Demon'));
    for (const sec of demonRows(_ctx.demon)) {
      col.appendChild(
        section(
          sec.title,
          sec.rows.map((r) => row(r.label, r.value)),
        ),
      );
    }
    cols.appendChild(col);
  }
  // ADR-0045: the run's karma — a single game-level column (help +, leave/dose −). Raw, no blurb.
  if (_ctx?.karma != null) {
    const col = el('div', 'pause-statcol');
    col.appendChild(el('div', 'pause-statcol-head', '☯ Standing'));
    for (const sec of karmaRows(_ctx.karma, karmaTitle(_ctx.karma))) {
      col.appendChild(
        section(
          sec.title,
          sec.rows.map((r) => row(r.label, r.value)),
        ),
      );
    }
    cols.appendChild(col);
  }
  body.appendChild(cols);
}

function renderGear(body) {
  const cols = el('div', 'pause-cols');
  eachPlayer((p, label) => {
    const snap = p.statsSnapshot ? p.statsSnapshot() : {};
    const w = snap.weaponStacks || {};
    const slots = Array.isArray(p.slots) ? p.slots : [];
    const col = el('div', 'pause-statcol');
    col.appendChild(el('div', 'pause-statcol-head', label));

    // carried weapons — active one marked
    const weaponRows = slots.map((key, i) => {
      const active = i === p.slotIndex;
      return row((active ? '▶ ' : '') + weaponName(key), active ? 'equipped' : '', active);
    });
    col.appendChild(
      section(`Weapons (${slots.length}/${p.slotsUnlocked ?? slots.length})`, weaponRows),
    );

    // the ACTIVE weapon's mod stacks (raw)
    const mods = [
      ['Damage', w.damage],
      ['Fire-rate', w.fireRate],
      ['Pierce', w.pierce],
      ['Bounce', w.bounces],
      ['Bullet speed', w.bulletSpeed],
      ['Blast', w.explodeRadius],
    ].map(([lab, v]) => row(lab, String(v ?? 0)));
    col.appendChild(section(`${snap.weapon || 'weapon'} · mods`, mods));
    cols.appendChild(col);
  });
  body.appendChild(cols);
}

function renderUnlocks(body) {
  const save = saves.get ? saves.get() : {};
  const st = save.stats || {};
  const col = el('div', 'pause-statcol');
  col.appendChild(
    section('Progress', [
      row('City beaten', save.gameBeaten ? '✓' : '—'),
      row('Echoes', String(save.echoes ?? 0)),
      row('Runs', String(st.runs ?? 0)),
      row('Wins', String(st.wins ?? 0)),
      row('Deepest floor', st.bestFloor ? `#${st.bestFloor + 1}` : '—'),
      row('Bosses beaten', String(st.bossesBeaten ?? 0)),
    ]),
  );
  col.appendChild(
    section(
      'Resonance',
      META_UPGRADES.map((node) =>
        row(
          `${node.icon ?? ''} ${node.name}`.trim(),
          `${save.upgrades?.[node.id] ?? 0}/${node.maxLevel}`,
        ),
      ),
    ),
  );
  body.appendChild(col);
}

function renderOptions(body) {
  const wrap = el('div');
  wrap.id = 'pause-options';
  const mute = el('button', 'pause-opt');
  mute.id = 'pause-mute';
  const vol = document.createElement('input');
  vol.id = 'pause-vol';
  vol.type = 'range';
  vol.min = '0';
  vol.max = '1';
  vol.step = '0.05';
  vol.setAttribute('aria-label', 'Volume');
  const fx = el('button', 'pause-opt');
  fx.id = 'pause-fx';
  wrap.append(mute, vol, fx);
  body.appendChild(wrap);

  syncOptions();
  mute.onclick = () => {
    settings.toggle('muted');
    syncOptions();
  };
  vol.oninput = () => settings.set('volume', Number(vol.value));
  fx.onclick = () => {
    settings.toggle('reducedEffects');
    syncOptions();
  };
}

function syncOptions() {
  const mute = $('pause-mute');
  if (mute) mute.textContent = settings.get('muted') ? '🔇 Sound: off' : '🔊 Sound: on';
  const vol = $('pause-vol');
  if (vol) vol.value = String(settings.get('volume'));
  const fx = $('pause-fx');
  if (fx) fx.textContent = settings.get('reducedEffects') ? '✨ Effects: low' : '✨ Effects: full';
}
