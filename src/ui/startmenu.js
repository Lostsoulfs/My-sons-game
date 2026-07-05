// =====================================================================
// startmenu.js — the title screen. Step 1: "1 Player" / "2 Players". In 1P, step 2 is a Dad/Son
// character pick; 2P skips it (always Dad P1 + Son P2). Calls back onChoose(coop, character,
// runMode) then hides itself. Plain DOM overlay (#startmenu in index.html) — no library.
//
// CP-E (ADR-0043): a Story/Endless toggle sits above the player pick — but ONLY once the city
// has been beaten (saves.gameBeaten). Pre-win the row is hidden entirely: Endless is a
// post-win discovery (no locked/greyed tease — the no-hand-holding rule extends to menus).
// =====================================================================

import { saves } from '../core/saves.js';

export function showStartMenu(onChoose) {
  const menu = document.getElementById('startmenu');
  if (!menu) {
    onChoose(false, 'dad', 'story'); // headless / no-DOM: default to solo Dad, story
    return;
  }
  menu.classList.add('show');

  const modepick = document.getElementById('modepick');
  const charpick = document.getElementById('charpick');
  const showChar = (on) => {
    if (modepick) modepick.style.display = on ? 'none' : '';
    if (charpick) charpick.style.display = on ? '' : 'none';
  };
  showChar(false); // always open on the mode pick

  // ---- CP-E: Story/Endless toggle (post-win only) ----
  let runMode = 'story';
  const modeRow = document.getElementById('runmode');
  const btnStory = document.getElementById('btnStory');
  const btnEndless = document.getElementById('btnEndless');
  const paintMode = () => {
    btnStory?.classList.toggle('mode-on', runMode === 'story');
    btnEndless?.classList.toggle('mode-on', runMode === 'endless');
  };
  if (modeRow) {
    modeRow.style.display = saves.get().gameBeaten ? '' : 'none'; // a discovery, not a tease
    runMode = 'story'; // every menu open starts on story (endless is an explicit pick)
    paintMode();
    if (btnStory) btnStory.onclick = () => ((runMode = 'story'), paintMode());
    if (btnEndless) btnEndless.onclick = () => ((runMode = 'endless'), paintMode());
  }

  const pick = (coop, character) => {
    menu.classList.remove('show');
    showChar(false); // reset so a later return to the menu starts fresh
    onChoose(coop, character, runMode);
  };

  const on = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.onclick = fn;
  };
  on('btn1p', () => showChar(true)); // 1P → choose a character
  on('btn2p', () => pick(true, 'dad')); // 2P → Dad (P1) + Son (P2); the character arg is unused
  on('btnDad', () => pick(false, 'dad'));
  on('btnSon', () => pick(false, 'son'));
  on('btnCharBack', () => showChar(false)); // back to the mode pick
}
