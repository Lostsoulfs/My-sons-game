// =====================================================================
// states.js — the handful of "modes" the game can be in.
// =====================================================================

export const State = {
  BOOT: 'BOOT', // before the first frame
  PLAYING: 'PLAYING', // fighting monsters
  OFFER: 'OFFER', // room cleared → pick 1 of 3 upgrade cards (fight paused, B9b)
  ROOM_CLEAR: 'ROOM_CLEAR', // room cleared, walk to the glowing door
  BOSS_INTRO: 'BOSS_INTRO', // boss entrance cinematic: camera push + name card (fight paused, ADR-0033)
  HUMAN_APPROACH: 'HUMAN_APPROACH', // walk up to the human decision-boss before the choice (ADR-0033)
  HUMAN_CHOICE: 'HUMAN_CHOICE', // the human decision-boss: picking A/B/C/D (fight paused)
  PAUSED: 'PAUSED', // ESC / Start: frozen overlay — pause menu (map + options + stats), no sim tick
  DEAD: 'DEAD', // you died — press R
  WIN: 'WIN', // you escaped the city — press R
};
