// =====================================================================
// startmenu.js — the title screen. Step 1: "1 Player" / "2 Players". In 1P, step 2 is a Dad/Son
// character pick; 2P skips it (always Dad P1 + Son P2). Calls back onChoose(coop, character) then
// hides itself. Plain DOM overlay (#startmenu in index.html) — no library. CP5 (ADR-0038).
// =====================================================================

export function showStartMenu(onChoose) {
  const menu = document.getElementById('startmenu');
  if (!menu) {
    onChoose(false, 'dad'); // headless / no-DOM: default to solo Dad so the game still starts
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

  const pick = (coop, character) => {
    menu.classList.remove('show');
    showChar(false); // reset so a later return to the menu starts fresh
    onChoose(coop, character);
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
