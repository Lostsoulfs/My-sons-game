// =====================================================================
// config.js — EVERY tunable number in the game lives here.
//
// This is the fun file to mess with: change a value, save, and (in
// `npm run dev`) watch the game change instantly. Want to run faster?
// Shoot faster? More blood? More screen shake? It's all here.
// =====================================================================

// ---- the playfield (a flat arena on the XZ plane; y is "up") ----
// Roomy by design (Stage 6 / ADR-0020): ~2.5× the old floor area so there's space
// to dodge when a room is full of mobs firing. Walls, the door, ground/grid, and
// every spawn position derive from these two numbers — bump them and the whole
// arena (and the camera below) scales with it.
export const ARENA = {
  width: 64, // left-right size (X)  — was 40
  depth: 48, // near-far size (Z)    — was 30  (64×48 ≈ 2.56× the old 40×30 area)
  wall: 1.5, // wall thickness
  doorWidth: 6, // gap in the top wall to the next room
};

// ---- camera: tilted top-down, "Binding of Isaac" angle ----
// height/back are sized to FIT the whole ARENA on screen (the room is always fully
// visible — fairer for a young player who needs to see every bullet). They scale
// with ARENA: if you grow the arena, grow these by the same factor to keep the fit.
// Want to zoom IN (bigger sprites, but you may clip the room edges)? Lower both.
export const CAMERA = {
  fov: 55,
  height: 48, // how high above the arena (was 30; ×1.6 to fit the bigger arena)
  back: 29, // how far back (toward the player/camera) (was 18; ×1.6)
  lookAtY: 0,
  near: 0.1, // near clip plane
  far: 300, // far clip plane (well past the arena + fog)
  // ---- subtle spring-follow (ADR-0026 / B3 — amends ADR-0020's static framing) ----
  // The camera gently pans toward the live-player centroid, HARD-CLAMPED to ±followMaxPan so the
  // whole room stays readable (ADR-0020's "see every bullet" promise is preserved by the small
  // clamp). In co-op it eases back to center as the pair separates so both stay on the shared
  // screen. reducedEffects + calmCamera pins it to the static full-room view. Swap-and-see in dev.
  followEnabled: true, // false = exactly the old static framing
  followOmega: 6, // spring stiffness (higher = snappier, lower = floatier) — kept gentle
  followMaxPan: 5, // MAX world-unit pan from center (small, so the room stays framed)
  coopSplitInner: 14, // co-op: begin recentering once the two players are this far apart
  coopSplitOuter: 28, // ...fully recentered (whole-room) at this separation
  calmCamera: true, // pin the camera (no follow) when reducedEffects is on (motion-sensitive)
};

// ---- lighting + fog (scene.js) ----
// The game's MOOD lives here: a warm key light + a cool fill over a purple
// hemisphere/ambient, plus fog that fades the far wall. Tweak intensities/colors to make
// the world brighter, moodier, warmer, colder, etc. (Post-FX bloom/tone-mapping that sits
// on top of this is in GRAPHICS.) The render studio reuses this so portraits match the game.
export const LIGHTING = {
  background: 0x07060a, // scene clear color (matches fog so the far edge dissolves)
  hemisphere: { sky: 0x8a6b8a, ground: 0x241826, intensity: 0.9 },
  ambient: { color: 0x66556a, intensity: 0.6 },
  key: { color: 0xffb088, intensity: 1.3, pos: [10, 30, 12] }, // warm main light
  fill: { color: 0x6688ff, intensity: 0.5, pos: [-15, 20, -10] }, // cool backlight
  // image-based lighting (ADR-0026): a subtle RoomEnvironment fill so PBR surfaces
  // (ground/walls/characters) read with depth. `intensity` is scene.environmentIntensity
  // — KEEP IT LOW (the default is 1, which washes pale models to white). It does NOT
  // touch the glowing MeshBasic bullets/eyes/door. The render studio reads the same knob
  // so portraits match the game. `sigma` = PMREM blur (higher = softer/flatter fill).
  ibl: { enabled: true, intensity: 0.3, sigma: 0.04 },
  // fog fades the far wall so the world dissolves at its edge. `mode`:'linear' uses
  // near/far planes (recommended for this fit-the-room top-down arena — keeps the far
  // wall readable); 'exp2' uses `density` for a moodier closing-in haze (an experiment).
  //   linear near = camDist × nearMul ; linear far = camDist + max(arena) × farMul
  // Keep `color` === `background` so the far edge dissolves instead of showing a wall.
  fog: { color: 0x07060a, mode: 'linear', nearMul: 1.0, farMul: 1.6, density: 0.012 },
};

// ---- colors / palette ----
export const PALETTE = {
  ground: 0x1a1320,
  groundGrid: 0x3a2a40,
  wall: 0x2c2230,
  wallTop: 0x4a3a52,
  player: 0x49b3ff, // you = blue
  ally: 0x6cff8a, // ally = green
  enemyChaser: 0x8b1a1a, // dark red demon
  enemyShooter: 0x9b2fb0, // purple caster
  playerBullet: 0xffe24a, // yellow
  enemyBullet: 0xff4d4d, // red
  npc: 0xd8c47a, // survivor = tan
  blood: 0xb20000,
  door: 0x36e0c0,
};

// ---- the "size ladder" (Stage 6 / ADR-0020) ----
// Size reads as threat in a top-down game, so we keep a clear hierarchy:
//   player/ally (0.85) < chaser (1.05) < shooter (1.2) < bosses (2.0–3.0, below).
// `radius` is BOTH the drawn size and the collision circle, so these affect feel —
// tune gently. (Speeds are deliberately left alone: keeping them constant in the
// bigger arena is what actually buys "more room" to dodge.)
// NOTE: every HP-gated MINION sizes itself RELATIVE to ENEMY.chaser.radius (it is
// built as a 'chaser' then shrunk in enemies.js topUpMinions / cat.js), so a tweak
// to chaser.radius moves all the bonelings/puffballs/kittens/survivors too.

// ---- player (you) ----
export const PLAYER = {
  radius: 0.85, // was 0.7 — a touch bigger so it still reads in the roomier arena
  height: 2.2, // was 1.8 — taller silhouette (visual only; collision is on XZ)
  speed: 11, // units/sec
  maxHearts: 6, // 6 = 3 full hearts (2 halves each)... we use whole hearts here
  fireCooldown: 0.16, // seconds between shots (lower = faster)
  invuln: 0.8, // i-frames after a hit (seconds)
};

// ---- ally (AI ally) ----
export const ALLY = {
  radius: 0.85, // matches the player (size ladder)
  height: 2.2,
  speed: 9,
  followDist: 4.5, // tries to stay this close to you
  fireCooldown: 0.45,
  range: 22, // will shoot enemies within this distance (bumped for the bigger arena)
  defaultWeapon: 'pistol', // the ally's starting/fallback gun (solo player can reroll it — B9b)
  // B9: the AI ally makes no upgrade choices; it passively receives this fraction of the player's
  // accrued bonuses so it stays useful without being overpowered (player +10% dmg → ally +2%).
  upgradeShare: 0.2,
};

// ---- bullets (shared pool for player + enemies) ----
export const BULLET = {
  poolSize: 600,
  radius: 0.28,
  lifetime: 2.5, // seconds before it disappears
  player: { speed: 26, damage: 1 },
  enemy: { speed: 12, damage: 1 },
};

// ---- enemies ----
export const ENEMY = {
  chaser: {
    hp: 3,
    radius: 1.05, // was 0.85 — slightly bigger than the player (reads as a threat)
    speed: 6,
    contactDamage: 1,
    contactCooldown: 0.7, // how often it can hurt you by touching
  },
  shooter: {
    hp: 4,
    radius: 1.2, // was 0.95 — the bigger, ranged threat sits above the chaser
    speed: 3.2,
    preferredDist: 11, // keeps roughly this far from you
    fireInterval: 1.6, // seconds between bullet-hell volleys
    bulletsPerRing: 10, // bullets in a ring volley
    contactDamage: 1,
    contactCooldown: 0.9,
  },
};

// ---- survivors (NPCs you help or leave) ----
export const NPC = {
  radius: 0.7,
  height: 1.7,
  interactRadius: 3.4, // how close before "press E" shows (roomy so it's easy to trigger)
  perRoom: 1, // one survivor in survivor-rooms (clearer than two)
};

// ---- per-room tunables (counts/obstacles) ----
export const ROOMS = {
  baseEnemies: 3, // enemies in the first room of a floor
  enemiesPerRoom: 0.8, // extra enemies added per room deeper in the floor (9 rooms now)
  shooterFromRoom: 3, // shooters start appearing at this room-in-floor (1-based)
  obstaclesMin: 2, // rubble boxes
  obstaclesMax: 5,
  survivorRoomsInFloor: [2, 5, 7], // which normal rooms (0-based) hold a survivor
};

// ---- progression: floors of 9 rooms + 1 boss room each ----
export const PROGRESSION = {
  roomsPerFloor: 9, // normal rooms before the boss
  // each floor: a boss type + difficulty + a color palette shared by the boss
  // AND that floor's monsters (so the monsters "reflect" their boss).
  floors: [
    {
      // diff is now computed from the DIFFICULTY curve (scaling.floorScale) by
      // floorInfo() — set an optional `diffMul` here for a per-floor spike.
      name: 'The Outskirts',
      boss: 'spider',
      palette: {
        body: 0x2a0606,
        emissive: 0x6a0d0d,
        leg: 0x1a0303,
        legEmissive: 0x400808,
        eye: 0xffe000,
      },
    },
    {
      // Expansion 6 Stage 5 — the Human DECISION-boss (a nervous survivor). Before
      // the fight you pick how to approach (A/B/C/D, config.HUMAN_BOSS.labels); a
      // seeded "right" read skips the fight + grants the slot, a wrong read means you
      // fight him for it (systems/humanDecision.js + bosses/human.js).
      name: 'The Barricade',
      boss: 'human',
      palette: {
        body: 0x6a7280, // grey jacket
        emissive: 0x3a4250, // cold blue
        leg: 0x4a3a2a, // worn boots / pants
        legEmissive: 0x3a5a2a, // military-green webbing
        eye: 0xffd24a, // wary amber
      },
    },
    {
      // Expansion 6 Stage 2 — Caden's mushroom boss + matching fungal minions.
      // (Final boss order spider→human→mushroom→duo→skeleton is set in a later
      // stage once those bosses exist; for now the mushroom caps off the run.)
      name: 'The Fungal Depths',
      boss: 'mushroom',
      palette: {
        body: 0xb83a2a, // cap red
        emissive: 0xff6a4a, // cap glow
        leg: 0xe8d8a8, // stem / gills (pale)
        legEmissive: 0x6a8a2a, // spore green accent
        eye: 0xffe66a,
      },
    },
    {
      // Expansion 6 Stage 3 — the Dog/Cat duo (first multi-boss). `boss: 'duo'`
      // marks a multi-boss floor; `duo` lists the two boss types (see spawner.js).
      // (Final boss order spider→human→mushroom→duo→skeleton is set in a later
      // stage; for now the duo caps off the run.)
      name: 'The Kennels',
      boss: 'duo',
      duo: ['dog', 'cat'], // Fang (pounce) + Whisker (zoner)
      palette: {
        // shared kennel ambiance; minions pick warm (pups) / cool (kittens) by kind
        body: 0x6a5230,
        emissive: 0xc8923a,
        leg: 0x2a2018,
        legEmissive: 0x5a4020,
        eye: 0xffd23a,
      },
    },
    {
      // Expansion 6 Stage 4 — the skeleton boss + bone-white catacomb minions.
      // (Final boss order spider→human→mushroom→duo→skeleton is set in Stage 5;
      // for now the skeleton caps off the run.)
      name: 'The Catacombs',
      boss: 'skeleton',
      palette: {
        body: 0xe8e2d0, // bone white
        emissive: 0x8a8a6a, // dim bone glow
        leg: 0xb8b09a, // grey bone
        legEmissive: 0x4a6a3a, // sickly graveyard green accent
        eye: 0x9bff6a, // green eye-socket glow
      },
    },
    {
      // Final floor — the government's seat. The Enforcer war-machine makes the last
      // stand (people vs. government). Cold gunmetal arena with a red-alert glow.
      name: 'The Iron Capitol',
      boss: 'enforcer',
      palette: {
        body: 0x4a4e57, // gunmetal steel
        emissive: 0x20242b, // cold shadow
        leg: 0x33363d, // dark iron
        legEmissive: 0x1a1c22,
        eye: 0xff3b30, // red-alert authoritarian eye
      },
    },
  ],
};

// ---- lives + global stat caps (SAFETY BACKSTOPS, not the main shaper) ----
// The real upgrade ramp is the diminishing-returns curve in UPGRADES below; these
// caps just stop a mis-tuned curve from ever running away. Set at/above the curve
// asymptotes so the curve is what you feel.
export const CAPS = {
  lives: { start: 3, max: 5 }, // start with 3, can grow to 5
  maxHearts: 12, // hard ceiling on per-player hearts (the offered MAX_HP_UP grows it from PLAYER.maxHearts)
  damageMul: 2.0, // hard ceiling on the damage multiplier (curve asymptote = +100%)
  fireRateMin: 0.4, // cooldown floor (curve asymptote = -60% cooldown)
  speedMul: 1.6, // hard ceiling on move speed (curve asymptote = +60%)
  maxWeaponSlots: 3, // carry up to 3 weapons
  slotUnlockBosses: [2, 10, 20], // a slot unlocks after these boss counts
};

// ---- upgrade curves (diminishing returns — see core/scaling.js statBonus) ----
// Each pick adds ONE stack; the stat grows toward maxBonus but never hits a hard wall. Since B9b,
// offers appear EVERY room clear, so a single stat can be picked many times in a long/endless run.
// Design intent (Scott): each pick is a SMALL nudge — the excitement is the tier roll + (later) luck/
// meta systems, not a big per-pick jump. So `half` (the knee) is set HIGH for a gentle, slow ramp that
// climbs over a whole run without capping early. `maxBonus` (ceiling) + CAPS are unchanged from the
// ground-drop era (CAPS sit at the asymptotes as safety backstops). Tune per stat:
//   maxBonus = the eventual ceiling, half = how many stacks reach HALF of it
//   (higher half = slower, smaller-per-pick, longer ramp).
export const UPGRADES = {
  damage: { maxBonus: 1, half: 12 }, // damageMul = 1 + bonus  → asymptote ×2 damage (small per pick)
  fireRate: { maxBonus: 0.6, half: 12 }, // fireRateMul = 1 - bonus → asymptote cooldown ×0.4
  speed: { maxBonus: 0.6, half: 12 }, // speed = base × (1 + bonus) → asymptote +60%
};

// ---- difficulty curve (one knob for the whole run — see scaling.js floorScale) ----
// diff(floorIndex) = base × (1 + growth)^floorIndex, applied to the SAFE knobs only
// (boss HP, ring density, enemy counts — never bullet speed). Higher growth = a
// steeper, more challenging ramp. Defaults aim above the old kid-fair tuning:
//   floors ≈ 1.00, 1.26, 1.59, 2.00, 2.52 (vs the old 1.0, 1.3, 1.6, 1.9, 2.15).
// A floor may also set an optional `diffMul` for a per-floor spike (default ×1).
export const DIFFICULTY = {
  base: 1.0, // floor 0 (the tutorial floor)
  growth: 0.26, // per-floor ramp (~+26%/floor)
  // ---- "twice as hard" master knob (B5 / ADR-0027 — see core/scaling.js hardnessFacet) ----
  // ONE dial for overall challenge: 1 = the original game, 2 = "twice as hard" (Scott's ask).
  // It is NOT applied 1:1 to every facet (that compounds to brutal); each facet below takes a
  // 0..1 WEIGHT of it. Default flavor: enemies/bosses are ~2× tankier and rooms are ~1.35× more
  // crowded, while bullet DENSITY and CONTACT DAMAGE stay UNCHANGED (weight 0) — so the harder
  // game stays kid-fair (ring gaps + no new one-shots; guarded by tests/fairness.test.js).
  // Dial `hardnessMul` (or the weights, for a different flavor) live in `npm run dev`.
  hardnessMul: 2, // 1 = original, 2 = twice as hard
  hpWeight: 1, // enemy + boss HP absorb the full hardness (×2 at hardnessMul 2)
  countWeight: 0.35, // a little into enemy count (more mobs, perf-safe — not ×2)
};

// ---- kid-fairness targets (research report (5) — core/fairnessCalc.js) ----
// The guard rail for difficulty: a boss attack is fair if its telegraph window is long enough
// to recognize + react, and every ring leaves a gap a player body fits through. Asserted in
// tests/fairness.test.js so the "twice as hard" pass (B5) can't silently cross into unfair.
export const FAIRNESS_TARGETS = {
  telegraphMinMs: { easy: 400, hard: 250 }, // min boss wind-up (ms) before a ring/spray fires
  gapMinMul: 1.5, // a ring's safe lane must clear >= this × the player's hurt DIAMETER
  childMode: true, // use the slower child reaction model in minimumTelegraphMs
};
// Dev convenience: flip true to console.warn on boss init when a boss is below the easy target
// (handy while tuning B5 in `npm run dev`). Off by default so there's no console noise.
export const DEBUG_FAIRNESS = { warnOnInit: false };

// ---- the spider boss ----
// the co-designer's design card: P# = an ATTACK PATTERN (not a health phase).
//   P1 = base attack (pistol mimic)   P2 = dodgeable bullet ring
//   P3 = baby-spider spawns, HP-gated (see spiderlingTarget in progression.js)
export const BOSS = {
  spider: {
    hp: 60, // base HP (scaled by floor diff)
    radius: 2.7,
    speed: 4.5,
    contactDamage: 1,
    contactCooldown: 0.8,

    // P1 — base attack: a quick aimed burst, like a pistol
    p1Interval: 1.3, // seconds between bursts
    p1Burst: 3, // shots per burst
    p1Spread: 8, // degrees of spread across the burst
    p1BulletSpeed: 14,

    // P2 — bullet ring: "a circle of small dots", few on floor 1, denser later
    p2Interval: 3.6, // seconds between rings
    telegraph: 0.45, // wind-up (boss rears up) before the ring fires = fair warning
    ringBullets: 8, // base count on floor 1 (scaled by floor diff in code)
    ringBulletSpeed: 9, // slower so the ring is dodgeable

    // P3 — spiderling spawns (count gated by HP in spiderlingTarget())
    spawnInterval: 2.4, // how often it tops up toward the target count
  },

  // ---- the Enforcer (government war-machine) — the new FINAL boss ----
  // A slow, heavy Atomic-Age war-machine (the story's people-vs-government seed). Three
  // ATTACK PATTERNS: P1 tracking cannon burst · P2 telegraphed sweeping gap-ring barrage ·
  // P3 periodic suppressive strafe. Fair: a 500ms telegraph (the eye flares) + a rotating
  // 3-slot dodge lane in the ring. Menacing, not unfair.
  enforcer: {
    hp: 120, // base HP (scaled by floor diff) — the toughest boss, as the finale
    radius: 3.0,
    speed: 2.8, // slow, deliberate tank
    contactDamage: 1,
    contactCooldown: 0.9,

    // P1 — tracking chin cannon: a tight aimed burst
    p1Interval: 1.4,
    p1Burst: 3,
    p1Spread: 6,
    p1BulletSpeed: 15,

    // P2 — telegraphed sweeping barrage: a rotating ring with a guaranteed dodge lane
    p2Interval: 3.8,
    telegraph: 0.5, // wind-up (the eye flares) = fair warning
    ringBullets: 14, // base on this floor (scaled by floor diff in code)
    ringBulletSpeed: 8, // slow enough to read + dodge
    ringGap: 3, // guaranteed dodge lane (slots), walks around each volley

    // P3 — suppressive strafe: a wide directional fan you sidestep
    p3Interval: 2.6,
    p3Count: 5,
    p3SpreadRad: 0.8, // ~46° fan
    p3BulletSpeed: 12,
  },

  // ---- the mushroom boss (Caden's pick) — Expansion 6 Stage 2 ----
  // P1 = slow spore spit · P2 = spore ring with a guaranteed dodge GAP ·
  // P3 = lingering poison pools (telegraphed, see systems/hazards.js) ·
  // P4 = HP-gated puffball spawns (puffballTarget(); pop into a pool on death).
  mushroom: {
    hp: 80,
    radius: 3.0,
    speed: 3.2, // slow and chunky
    contactDamage: 1,
    contactCooldown: 0.9,

    // P1 — spore spit: a slow, fat aimed cone (reads as drifting gas)
    p1Interval: 1.6,
    p1Burst: 4,
    p1Spread: 16,
    p1BulletSpeed: 9,

    // P2 — spore ring: telegraphed, with `ringGap` adjacent slots left empty
    p2Interval: 4.2,
    telegraph: 0.55,
    ringBullets: 10, // base on floor 1 (scaled by floor diff in code)
    ringBulletSpeed: 7,
    ringGap: 2, // guaranteed dodge lane (seeded position)

    // P3 — lingering poison pools dropped at the player's feet
    poolInterval: 3.6,
    poolRadius: 3.0,
    poolWarn: 0.8, // harmless telegraph window (fair warning)
    poolLive: 2.6, // seconds the pool is dangerous
    poolDamage: 1,
    puffPoolRadius: 2.2, // smaller pool left by a dying puffball

    // P4 — puffball spawns (count gated by HP in puffballTarget())
    spawnInterval: 3.0,
  },

  // ---- the Dog/Cat DUO (first multi-boss) — Expansion 6 Stage 3 ----
  // Two bosses at once, SEPARATE HP bars, ALTERNATING aggression (only the
  // "aggressor" attacks; see DUO + bosses/duo.js). The survivor ENRAGES when its
  // partner dies (no revive). Fang (dog) is a melee pouncer; Whisker (cat) is a
  // ranged cross-swipe zoner that summons kittens while it's the passive partner.

  // Fang — the DOG: stalk → wind-up (rear back) → fast pounce dash → recover.
  dog: {
    hp: 70,
    radius: 2.2,
    speed: 2.6, // slow stalk between pounces
    contactDamage: 1,
    contactCooldown: 0.8,
    stalkTime: 2.8, // seconds stalking before it readies a pounce
    telegraph: 0.6, // wind-up; the danger lane lights up = fair warning
    dashSpeed: 24, // fast lunge along the locked lane
    dashTime: 0.42, // short, so a sidestep clears it
    recoverTime: 1.2, // stands panting, open to hits (Whisker covers it)
    laneSparks: 4, // telegraph sparks painted ahead along the locked pounce lane
    laneColor: 0xff5a2a, // warning-orange lane sparks
    laneRepaint: 0.07, // seconds between lane spark refreshes during the wind-up
  },

  // Whisker — the CAT: keeps its distance and fires telegraphed cross-swipes
  // (arms of slow bullets in a +, rotated to an X each volley).
  cat: {
    hp: 60,
    radius: 2.0,
    speed: 3.2,
    contactDamage: 1,
    contactCooldown: 0.9,
    preferredDist: 12, // zoner: holds roughly this far away
    preferredStrafe: 0.5, // how hard it circles sideways while holding range
    swipeInterval: 2.2, // seconds between cross-swipes
    telegraph: 0.4, // wind-up before a swipe
    swipeArms: 4, // 4 = a "+"; the pattern rotates 45° each volley (→ an X)
    swipeBullets: 5, // dots per arm (staggered speeds make a growing line)
    swipeBulletSpeed: 8, // slow so it's dodgeable
    swipeSpeedBase: 0.5, // per-bullet arm shaping: speed *= (base + i*step) → a growing line
    swipeSpeedStep: 0.14,
    kittenInterval: 3.4, // tops up its litter this often while passive
    kittenCap: 2, // small (kid-fair); +1 when enraged
  },

  // ---- the SKELETON boss — "Rattlebones" 💀 (Expansion 6 Stage 4) ----
  // P1 = bone throw (aimed bolt volley) · P2 = scatter ring + rattle wind-up ·
  // P3 = reassemble & relocate (collapses, i-frames, teleports away, free breather) ·
  // P4 = HP-gated boneling summons (skeletonWaveTarget() in progression.js).
  skeleton: {
    hp: 90,
    radius: 2.6,
    speed: 3.4,
    contactDamage: 1,
    contactCooldown: 0.85,

    // P1 — bone throw: a quick aimed volley of bone bolts
    p1Interval: 1.5,
    p1Burst: 3,
    p1Spread: 12, // degrees across the volley
    p1BulletSpeed: 13,

    // P2 — scatter ring: a rattle wind-up, then a ring of bones at seeded jittered angles
    p2Interval: 4,
    telegraph: 0.5, // rattle wind-up (fair warning)
    ringBullets: 14, // base count (scaled by floor diff in code)
    ringBulletSpeed: 8, // slow so the ring is dodgeable
    scatterJitter: 0.22, // radians of seeded angle wobble per bone (the "scatter")

    // P3 — reassemble & relocate: collapse (invulnerable), teleport away, reform
    reassembleInterval: 9, // seconds between disappear-and-reform tricks
    reassembleTime: 1.4, // invulnerable + gone this long = your free breather
    teleportMargin: 7, // reappears at least this far from the nearest player

    // P4 — bonelings (count gated by HP in skeletonWaveTarget())
    spawnInterval: 2.6,
    spawnDist: 1.6, // ring radius (× boss.radius) the bonelings rise from
    bonelingScale: 0.62, // boneling size + collision shrink
    bonelingHp: 1,
  },

  // ---- the HUMAN boss — a nervous survivor 🚪 (Expansion 6 Stage 5, decision-boss).
  // You only fight him on a WRONG pre-fight read (see HUMAN_BOSS + bosses/human.js).
  // P1 = panicked pistol bursts · P2 = telegraphed panic spray ring ·
  // P3 = rally armed survivors (HP-gated, humanRallyTarget()).
  human: {
    hp: 75,
    radius: 2.4,
    speed: 4, // panicked, quick on his feet
    contactDamage: 1,
    contactCooldown: 0.8,

    // P1 — aimed pistol burst
    p1Interval: 1.4,
    p1Burst: 3,
    p1Spread: 10, // degrees across the volley
    p1BulletSpeed: 15,

    // P2 — telegraphed "panic spray": a wide AIMED cone at you (not a tidy ring —
    // distinct from the spider; dodge it by strafing sideways). emitters.nWay.
    p2Interval: 3.8,
    telegraph: 0.5, // wind-up (fair warning)
    ringBullets: 12, // bullets in the spray (scaled by floor diff in code)
    ringBulletSpeed: 8, // slow so it's dodgeable
    p2SprayDeg: 60, // cone width of the panic spray (degrees)

    // P3 — rally armed survivors (count gated by HP in humanRallyTarget())
    spawnInterval: 2.8,
    spawnDist: 1.7, // ring radius (× boss.radius) the survivors rush in from
    minionScale: 0.7, // armed survivor size + collision shrink
    minionHp: 2, // tougher than other minions (they're armed)
  },
};

// ---- the DUO controller knobs (shared by both beasts) — Stage 3 ----
export const DUO = {
  switchInterval: 4.5, // seconds one beast stays the "aggressor" before they swap
  enrageMul: 1.4, // the survivor's permanent rage (speed/rate) bump when its partner falls
  enrageScale: 1.3, // the "I'm angry now" size pop when a partner falls
  spawnX: 5, // each beast spawns this far left/right of center
  spawnZOffset: 4, // ...and this far in front of the back wall
};

// ---- the HUMAN decision-boss pre-fight choice — Expansion 6 Stage 5 ----
// A nervous survivor blocks the gate; you pick how to approach (A/B/C/D). The
// outcome is SEEDED (game.rng), so you never know which read was right — a "right"
// read (rightChance) skips the fight AND still grants the weapon slot; a "wrong"
// read means you fight him, then get the slot anyway (the normal boss-clear reward).
// Resolver: systems/humanDecision.js. The labels are flavor only — never a tell.
export const HUMAN_BOSS = {
  rightChance: 0.25, // odds a read lands right (~1-in-4); the design's config knob
  choices: ['A', 'B', 'C', 'D'], // button keys + the resolver's domain
  labels: {
    A: 'Talk to him gently',
    B: 'Slowly step closer',
    C: 'Offer him a trade',
    D: 'Raise your weapon',
  },
  setupLine:
    'A trembling survivor blocks the gate, his weapon shaking. "S-stay back! ...or ' +
    "don't. I can't tell who's a monster anymore. What do you do?\"",
  winLine: 'His shoulders drop. "You\'re... real. Okay — take this, and go." He waves you through.',
  loseLine: 'He flinches — "MONSTER!" — and opens fire. Looks like we do this the hard way.',
};

// ---- ground hazards: lingering, telegraphed damage zones (spore/poison pools) ----
// A small pool mirroring BULLET/PARTICLES. Per-pool size/timings/damage come from
// the spawner (config.BOSS.mushroom.pool*), so one system serves many sources.
export const HAZARD = {
  poolSize: 24, // max simultaneous zones
  tickInterval: 0.5, // seconds between damage ticks while you stand in a live pool
  warnColor: 0xc8ff3a, // telegraph ring (harmless)
  liveColor: 0x66c000, // active poison
};

// ---- accessibility / feel settings (persisted-store defaults — systems/settings.js) ----
// Starting values for the persisted player settings. settings.js seeds its store from
// these (and clamps a loaded `volume` to a finite 0..1), and sfx.js uses them as the
// pre-unlock fallback — so there's ONE source of truth. (ADR-0023)
export const SETTINGS = {
  volume: 0.5, // master volume, 0..1
  muted: false,
  showHitboxes: false, // the opt-in hitbox/danger overlay (toggle with H)
  reducedEffects: false, // post-FX off (raw render) — accessibility / low-end (toggle in panel)
};

// ---- graphics / post-processing (ADR-0025 — src/core/postfx.js, docs/GRAPHICS.md) ----
// The look: a dark world where the THREATS GLOW. The post-FX pass adds bloom to the
// bright emissive bits (bullets, enemies, pickups, the door) + ACES tone mapping so
// colors don't blow out. Readability first — bloom is luminance-gated, so only bright
// things bloom, never the whole screen. All swap-and-see in `npm run dev`. `enabled:false`
// (or the in-game "reduced effects" toggle) drops to the raw renderer (the old look),
// and the pipeline auto-falls-back to raw render if post-FX can't initialize (never breaks).
export const GRAPHICS = {
  enabled: true, // master switch — false = raw renderer.render()
  pixelRatioCap: 1.5, // max devicePixelRatio (FPS-1 dial-back: was 2). Only bites on hi-DPI panels (DPR > 1.5); A/B live in the debug "Graphics" folder.
  toneMapping: 'aces', // filmic curve: 'aces' | 'agx' | 'neutral' | 'none'
  aaSamples: 4, // WebGL2 MSAA samples for the post-FX path (0 = off)
  bloom: {
    enabled: true, // FPS-1: A/B the bloom pass live in the debug "Graphics" folder
    intensity: 0.8, // glow strength
    threshold: 0.55, // only pixels brighter than this bloom (keeps the dark world dark)
    smoothing: 0.3, // soft knee around the threshold
    radius: 0.62, // glow spread (0..1)
  },
  vignette: {
    enabled: true,
    darkness: 0.5, // how dark the corners get
    offset: 0.3, // where the darkening starts (higher = smaller bright center)
  },
  vfx: {
    impactSparks: true, // a small spark burst when a bullet hits a wall (reuses the particle pool)
    sparkCount: 4,
    sparkColor: 0xffd27a, // warm spark; bloom makes it pop
  },
  // real-time shadow maps (ADR-0026 Phase B — src/core/scene.js). ONE shadow-casting
  // light (the warm key); a tight orthographic frustum fit to the ARENA. Bullets, eyes,
  // and the door (MeshBasic) never cast. The in-game "reduced effects" toggle turns this
  // off (with IBL + post-FX). Uses PCFShadowMap (soft; PCFSoftShadowMap is deprecated).
  // Dial-back ladder if a packed boss room ever drops frames: mapSize 2048→1024 →
  // radius down → frustumMargin tighter → enabled:false. Swap-and-see in `npm run dev`.
  shadows: {
    enabled: true, // master switch (also gated off by the reducedEffects setting)
    mapSize: 1024, // shadow-map resolution per side (FPS-1 dial-back: was 2048; 1024 = softer + cheaper). A/B live in the debug "Graphics" folder.
    frustumMargin: 4, // world-unit slack around the arena for the ortho shadow frustum
    near: 1, // shadow camera near plane
    far: 80, // shadow camera far plane (must exceed the key light → floor distance)
    normalBias: 0.02, // primary acne fix (offsets the sample along the surface normal)
    bias: -0.0005, // depth bias (fine-tunes acne vs peter-panning)
    radius: 2, // PCF soft-edge blur radius
  },
  // PBR floor texture (ADR-0026 Phase C — src/core/scene.js via core/textures.js).
  // A dark, wet CC0 asphalt (ambientCG Asphalt025C; credited in ASSETS.md) so the
  // "ruined street" floor catches the new IBL/shadows. Map paths are under public/.
  // A MISSING file falls back to the flat PALETTE.ground color (never-throw loader).
  // Keep the albedo DARK so the floor never crosses bloom.threshold and glows. Swap-
  // and-see in `npm run dev`. Dial-back: drop roughnessMap → drop normalMap → enabled:false.
  floor: {
    enabled: true, // false = flat PALETTE.ground color (exactly the pre-Phase-C look)
    map: 'textures/floor/asphalt_color.png', // albedo (loaded sRGB)
    normalMap: 'textures/floor/asphalt_normal.png', // OpenGL-style normals (linear)
    roughnessMap: 'textures/floor/asphalt_roughness.png', // wet/dry sheen variation (linear)
    repeat: 8, // how many times the set tiles across the ground plane
    normalScale: 0.6, // bump strength (0 = flat, 1 = full)
    roughness: 1.0, // multiplies the roughness map (1 = use the map as-is)
    metalness: 0.0, // keep 0 — non-zero mirrors the env map and wrecks readability
    tint: null, // optional 0xRRGGBB multiply over the albedo (null = texture as-is)
    anisotropy: 'max', // 'max' = renderer max (sharp at grazing angles) | a number | 1
  },
  // ambient occlusion (ADR-0026 Phase D — src/core/postfx.js, N8AO). Adds soft contact
  // shading where surfaces meet (wall bases, rubble, monster feet) for depth, WITHOUT
  // muddying readability. A screen-space pass that slots into the composer BETWEEN the
  // render and the bloom/tone-mapping pass; it has its OWN fallback (init failure → skip
  // AO, composer still renders), and the "reduced effects" toggle drops the whole composer
  // (so AO with it). aoRadius is in WORLD units — small for our ~1–3 unit entities.
  // Dial-back if it ever costs frames: keep halfRes → quality 'Performance' → smaller radius.
  ao: {
    enabled: true, // master switch (off here = composer renders without the AO pass)
    quality: 'Performance', // N8AO preset: 'Performance' | 'Low' | 'Medium' | 'High' | 'Ultra'
    halfRes: true, // sample AO at half resolution (the big perf win; fine for soft AO)
    radius: 2.0, // world-space sample radius (n8ao default 5 is too big for our scale)
    distanceFalloff: 1.0, // how quickly AO fades with distance
    intensity: 1.5, // AO strength (higher = darker contacts)
    color: 0x000000, // occlusion tint (black = neutral shadowing)
    gammaCorrection: 'auto', // 'auto' (mid-pipeline → off) | true | false override
  },
};

// ---- Graphics A/B debug option lists (FPS-1) ----
// Dropdown choices for the debug "Graphics (A/B perf)" folder.
// Kept here so all graphics tunables live in one place.
export const PIXEL_RATIO_CAPS = [1, 1.25, 1.5, 2.0];
export const SHADOW_MAP_SIZES = [512, 1024, 2048];
export const MSAA_SAMPLES = [0, 2, 4];
export const AO_QUALITIES = ['off', 'Performance', 'Low', 'Medium', 'High', 'Ultra'];

// ---- readability overlay rings (ADR-0023 — systems/overlays.js) ----
// Flat ground rings drawn over the action: an always-on boss TELEGRAPH ring (pulses
// while a boss winds up) + the opt-in HITBOX overlay. Pooled like HAZARD (meshes made
// once, repositioned each frame). The telegraph color comes from HAZARD.warnColor.
export const OVERLAY = {
  poolSize: 96, // ring meshes: players + a crowded room of enemies + a few telegraphs
  ring: { inner: 0.82, outer: 1.0, segments: 28 }, // unit ring geometry (scaled per entity)
  colors: { player: 0x6cff8a, enemy: 0xff4d4d, boss: 0xff3030 }, // green = you, red = threat
  hitboxOpacity: { player: 0.9, enemy: 0.85 },
  hitboxY: 0.06, // height above the ground for the hitbox rings
  telegraph: {
    radiusMul: 1.6, // telegraph ring size = boss.radius × this
    pulseBase: 0.3, // opacity = base + amp × (0..1 sine)
    pulseAmp: 0.28,
    pulseSpeed: 18, // rad/sec pulse cadence (wall-clock driven, so refresh-rate-stable)
    y: 0.04, // sits just under the hitbox rings
  },
};

// ---- music: recorded background tracks (Howler — ADR-0024) ----
// PLUG-AND-PLAY: drop an audio file in public/audio/ and point its track id at the
// filename below — no code change. A null/missing/undecodable file falls back to the
// procedural synth drone (sfx.js), so the game is never silent (offline/CI-safe).
// Files stream (html5) and load lazily, so big tracks don't bloat memory or stall boot.
export const MUSIC = {
  enabled: true,
  basePath: 'audio/', // under public/ (Vite base './' is prepended at runtime)
  crossfadeMs: 1500, // fade time when swapping tracks (stage <-> boss <-> menu)
  level: 0.7, // music volume relative to the master (0..1)
  duckTo: 0.4, // dip music to this fraction of `level` when the player is hit
  duckMs: 160, // fade-down time when the player is hit
  duckRecoverMul: 5, // music ramps back over duckMs × this after the dip
  duckRestoreDelayMs: 50, // wait this long after the dip before ramping back
  // track id -> filename in public/audio/  (null = use the synth fallback for now).
  // stageN = floor N exploration; boss_<key> = that boss's theme; win/gameover sting.
  // Current = CC-BY placeholders (Kevin MacLeod, credited in ASSETS.md + the in-game
  // credits panel). Boss themes share one placeholder until Scott + Caden design the real
  // ones — swap each `boss_*` to its own file then. See docs/AUDIO.md for the full plan.
  // OGG, loudness-normalized to -16 LUFS via scripts/audio-studio.mjs (consistent volume).
  tracks: {
    menu: 'menu.ogg', // Hush
    stage0: 'stage-outskirts.ogg', // The Outskirts — Darkest Child
    stage1: 'stage-barricade.ogg', // The Barricade — Anxiety
    stage2: 'stage-fungal.ogg', // The Fungal Depths — Echoes of Time
    stage3: 'stage-kennels.ogg', // The Kennels — Killers
    stage4: 'stage-catacombs.ogg', // The Catacombs — Dark Times
    boss_spider: 'boss-placeholder.ogg', // placeholder (Despair and Triumph) — swap per boss later
    boss_human: 'boss-placeholder.ogg',
    boss_mushroom: 'boss-placeholder.ogg',
    boss_duo: 'boss-placeholder.ogg',
    boss_skeleton: 'boss-placeholder.ogg',
    win: null, // synth stinger for now
    gameover: null, // synth stinger for now
  },
  // attribution — the SINGLE source of truth for in-game credits (ui/credits.js renders
  // this) AND ASSETS.md. CC-BY must be credited in-game, so update this list whenever you
  // swap a track in `tracks` above (keeps the legal credit in lockstep with the file).
  credits: [
    { slot: 'Menu', track: 'Hush', by: 'Kevin MacLeod', license: 'CC BY 4.0' },
    { slot: 'The Outskirts', track: 'Darkest Child', by: 'Kevin MacLeod', license: 'CC BY 4.0' },
    { slot: 'The Barricade', track: 'Anxiety', by: 'Kevin MacLeod', license: 'CC BY 4.0' },
    {
      slot: 'The Fungal Depths',
      track: 'Echoes of Time',
      by: 'Kevin MacLeod',
      license: 'CC BY 4.0',
    },
    { slot: 'The Kennels', track: 'Killers', by: 'Kevin MacLeod', license: 'CC BY 4.0' },
    { slot: 'The Catacombs', track: 'Dark Times', by: 'Kevin MacLeod', license: 'CC BY 4.0' },
    {
      slot: 'Boss themes (placeholder)',
      track: 'Despair and Triumph',
      by: 'Kevin MacLeod',
      license: 'CC BY 4.0',
    },
  ],
  creditsSource: 'incompetech.com', // where the current tracks come from
};

// ---- juice (the "feel good" knobs) ----
// Trauma-based screen shake (research report (5) "game-feel math"). Hits ADD trauma (0..1);
// the per-frame shake magnitude = trauma², so small hits barely shake and big ones punch.
// Trauma decays linearly (decayPerSec). The camera offset is sampled from coherent value-noise
// (core/math2d.smoothNoise1D) by wall-clock time — NO Math.random, so a seeded run renders the
// SAME shake every time (ADR-0013 determinism). Defaults are deliberately SUBTLE (kid-safe, no
// nausea for a young player) — crank them live in `npm run dev`.
export const JUICE = {
  traumaOnShoot: 0.05, // tiny kick per shot
  traumaChargeBonus: 0.2, // extra trauma scaled by the charge-cannon charge fraction
  traumaOnHurt: 0.5, // you took a hit
  traumaOnKill: 0.28, // an enemy died
  traumaOnExplode: 0.3, // rocket / explosive-bullet AoE
  traumaOnBossDeath: 0.45, // a boss died (trauma² keeps it punchy without nausea)
  traumaOnCatSwipe: 0.12, // Whisker's cross-swipe volley
  decayPerSec: 2, // trauma shed per second (higher = snappier, shorter shake)
  shakeMaxOffset: 0.35, // world-unit camera X/Z offset at trauma = 1
  shakeMaxY: 0.12, // smaller vertical kick (keeps the top-down read steady)
  shakeFrequency: 24, // Hz the coherent noise is sampled at
  shakeSeeds: { x: 11, y: 53, z: 29 }, // distinct noise streams per axis (decorrelation seeds)
  reducedEffectsTraumaMul: 0.4, // scale ALL trauma when reducedEffects is on (0 = no shake)
  hitStopOnKill: 0.06, // seconds the world freezes on a kill
  hitStopOnHurt: 0.09,
  hitStopOnBossDeath: 0.12, // a beat longer on a boss kill
};

// ---- screen flash (feel) — a brief full-screen alpha pulse for impact ----
// Distinct from the red #splatter on hurt: a short, low-alpha tint that NEVER whites out the
// dark world (peak stays well under 1). Skipped entirely when reducedEffects is on (ui/hud.js
// gates it). `ms` is the fade-out duration. Tune in `npm run dev`.
export const FEEL = {
  screenFlash: {
    hurt: { peak: 0.22, color: '#ff2a2a', ms: 90 }, // subtle red, on top of the blood splatter
    bossDeath: { peak: 0.4, color: '#ffffff', ms: 140 }, // white pop when a boss falls
  },
  // ---- knockback (research report (5)) — a hit shoves an enemy back a little, then it decays.
  // Pure GAMEPLAY (it moves enemies), so it is NOT gated by reducedEffects. Bosses are immovable by
  // default (knockback would wreck their telegraph cadence — kid-fairness); a boss opts in only via
  // BOSS[type].knockback. Every shove is resolved through the wall collision so it can't tunnel.
  knockback: {
    enabled: true, // master switch — false = exactly the old no-shove behavior
    drag: 9, // 1/sec exponential decay of the shove velocity (higher = shorter, snappier shove)
    maxSpeed: 14, // clamp stacked impulses (u/sec) so rapid fire can't fling an enemy across the room
    settleSpeedEpsilon: 0.05, // snap a residual shove speed below this (u/sec) to zero (the frame the shove "ends")
    bossDefault: 0, // bosses get NO knockback unless their BOSS cfg sets `knockback`
    impulse: {
      // initial shove SPEED (world u/sec) by enemy type — heavier shooter takes a bit less
      chaser: 7,
      shooter: 5.5,
    },
  },
  // ---- survivor spawn ring (units from NPC). Enemies from a hostile survivor spawn at a
  // ring so they don't land on the player who is standing right next to the NPC.
  survivorSpawnRing: { min: 3, max: 4.5 },
};

// ---- blood / particles ----
export const PARTICLES = {
  poolSize: 400,
  perHit: 8,
  perDeath: 22,
  lifetime: 0.6,
  speed: 9,
  gravity: 22,
  size: 0.22,
};

// ---- weapons (Doom-style). The pistol is the default. ----
// cooldown = seconds between shots; pellets = bullets per shot;
// spreadDeg = cone width for multi-pellet guns; explosive = rocket AoE.
export const WEAPONS = {
  pistol: { name: 'Pistol', cooldown: 0.26, damage: 1, pellets: 1, spreadDeg: 0, bulletSpeed: 24 },
  shotgun: {
    name: 'Shotgun',
    cooldown: 0.5,
    damage: 1,
    pellets: 6,
    spreadDeg: 40,
    bulletSpeed: 24,
  },
  machinegun: {
    name: 'Machine Gun',
    cooldown: 0.09, // was 0.07 — still the fastest hose, just less runaway (Exp7 Stage 2)
    damage: 1,
    pellets: 1,
    spreadDeg: 8,
    bulletSpeed: 30,
  },
  rocket: {
    name: 'Rocket',
    cooldown: 1.0, // was 0.8 — the big AoE nuke should be a slower, deliberate shot
    damage: 4,
    pellets: 1,
    spreadDeg: 0,
    bulletSpeed: 18,
    explosive: true,
    explodeRadius: 4.5,
  },

  // --- Expansion 6 guns ---
  // New bullet flags (handled in bullets.js): pierce (pass through N enemies),
  // homing + turnRate (curve toward nearest enemy), bounces (ricochet off walls
  // N times), plus per-bullet life/scale/color overrides. charge + orbital are
  // handled player-side (player.js) because they don't fire on a fixed cooldown.
  homing: {
    name: 'Homing Missiles',
    cooldown: 0.55,
    damage: 2, // was 3 — it already homes + explodes; 2 (×damageMul) is plenty (Exp7 Stage 2)
    pellets: 1,
    spreadDeg: 0,
    bulletSpeed: 18, // slow so the curve is visible/dramatic
    homing: true,
    turnRate: 5, // rad/sec — low enough that a perpendicular juke loses it
    explosive: true,
    explodeRadius: 3.2,
  },
  railgun: {
    name: 'Railgun',
    cooldown: 0.4,
    damage: 2,
    pellets: 1,
    spreadDeg: 0,
    bulletSpeed: 44, // fast bolt that reads as a beam
    pierce: 6, // punches through a whole line of monsters
    life: 2.6,
    color: 0x66e0ff,
    scale: 1.3,
  },
  bouncer: {
    name: 'Bouncer',
    cooldown: 0.26,
    damage: 1,
    pellets: 1,
    spreadDeg: 0,
    bulletSpeed: 26,
    bounces: 3, // ricochet off walls this many times
    life: 3.5, // live long enough for the bounces to matter
    color: 0x9b7bff,
  },
  charge: {
    name: 'Charge Cannon',
    cooldown: 0.12,
    damage: 1,
    pellets: 1,
    spreadDeg: 0,
    bulletSpeed: 24,
    // hold to charge; tap = weak fast shot, full = big slow piercing cannonball
    charge: {
      maxTime: 0.8,
      minDamage: 1,
      maxDamage: 7,
      minSpeed: 24,
      maxSpeed: 18,
      maxScale: 2.6,
      pierce: 3,
      color: 0xffd23a,
    },
  },
  orbital: {
    name: 'Orbital Blade',
    orbital: true, // player-side: blades circle you and hit on contact (no aiming)
    count: 2, // how many blades orbit
    radius: 2.6, // orbit radius
    spin: 3, // rad/sec
    damage: 1,
    hitCooldown: 0.4, // per-enemy seconds between hits from a blade
    color: 0x66ffd0,
  },
};

// ---- pickups you walk over to grab ----
export const PICKUPS = {
  radius: 0.7, // grab range
  // ---- drop rarity tiers + pity (B8, research report (4)) ----
  // The per-clear reward rolls a TIER (floor-scaled, descending falloff) then a uniform TYPE within
  // it; hard pity guarantees a rare+ after a dry run of commons so a kid never reads a run as "mean".
  // Boss chests skip commons (a hard fight always pays a weapon). All seeded (ADR-0013) → testable.
  rarity: {
    tiers: ['common', 'rare', 'epic'], // low → high
    // each pickup type's tier (anything unlisted falls back to the lowest tier)
    itemRarity: {
      HEAL: 'common',
      DAMAGE_UP: 'common',
      FIRE_RATE_UP: 'common',
      SPEED_UP: 'common',
      SHOTGUN: 'rare',
      MACHINEGUN: 'rare',
      BOUNCER: 'rare',
      ROCKET: 'epic',
      HOMING: 'epic',
      RAILGUN: 'epic',
      CHARGE: 'epic',
      ORBITAL: 'epic',
    },
    // floors at/after each edge bump up a band → rarer drops deeper in the run.
    // bandEdges [2,4] ⇒ floors 0–1 = band 0, 2–3 = band 1, 4 = band 2.
    bandEdges: [2, 4],
    // tier weights for a NORMAL room clear, one row per band (descending falloff deeper in)
    regularChestWeights: [
      { common: 70, rare: 25, epic: 5 }, // band 0 — early floors
      { common: 55, rare: 33, epic: 12 }, // band 1 — mid
      { common: 45, rare: 37, epic: 18 }, // band 2 — the finale stretch
    ],
    // boss chest: a hard fight always pays a weapon (no commons), leaning epic
    bossChestWeights: { common: 0, rare: 55, epic: 45 },
    // hard pity: after this many consecutive COMMON normal-room drops, force the next to rare+
    hardPity: { commonStreakMax: 4, minTier: 'rare' },
  },
  // DAMAGE_UP / FIRE_RATE_UP / SPEED_UP each add ONE stack; the stat is recomputed from the
  // diminishing-returns curve (UPGRADES + core/scaling.js), so there are no per-pickup step sizes.
  healAmount: 2, // hearts restored by a HEAL pickup
};

// ---- B9: room-clear upgrade OFFER screen (pick 1 of 3) ----
// Every NORMAL room clear shows `cardCount` cards drawn from the core/items.js registry: roll a TIER per
// card (weighted, with soft + hard pity), then an item of that tier. LIVE since B9b (replaces the old
// ground stat-drops; boss rooms still drop a ground HEAL + weapon chest). The offer engine
// (core/offers.js) reads these knobs. NOTE — two SEPARATE tier ladders by design:
//   • OFFERS.tiers (below) = common/rare/epic/ULTRA — the offer pool; `ultra` is the guard, offer-only.
//   • PICKUPS.rarity.tiers (above) = common/rare/epic — the ground/boss-chest drop engine (B8).
// items.js is the single registry; a no-drift test keeps its weapon tiers in lockstep with
// PICKUPS.rarity.itemRarity. The two ladders never need to merge (different pools).
export const OFFERS = {
  cardCount: 3, // cards shown per offer
  tiers: ['common', 'rare', 'epic', 'ultra'], // low → high (offer-only; adds `ultra` for the guard)
  tierWeights: { common: 58, rare: 28, epic: 12, ultra: 2 }, // base draw weights per card
  // anti-repeat: scale an item's pick weight when it was offered recently or is an owned weapon
  recentDecay: 0.35, // pick weight × this if the item was in the last few offers
  ownedWeaponDecay: 0.15, // pick weight × this for a weapon you already carry (low re-value)
  recentMemory: 6, // how many recently-offered item ids stay down-weighted (player.js ring buffer)
  categoryVariety: true, // avoid showing 3 cards of the same category when a 3rd category is available
  // soft pity ramps the guaranteed floor tier of the BEST card as rooms pass without taking a rare+;
  // hard pity forces a rare+ at the cap (mirrors B8's drop pity, applied to the offer).
  softPity: { rareAfter: 2, epicAfter: 5 }, // common-streak rooms → forced floor tier for one card
  hardPity: { commonStreakMax: 4, minTier: 'rare' },
};

// ---- B9: defensive upgrades (offered, not dropped) ----
export const GUARD = {
  rareCharges: 1, // "Guard" (rare) = block the next hit
  ultraCharges: 3, // "Greater Guard" (ultra, very rare) = block the next 3 hits
  // feedback when a charge BLOCKS a hit — a distinct, lighter cue (no blood / music duck / heart loss)
  block: {
    sparkCount: 8,
    sparkColor: 0xffe24a, // gold = shielded
    rumble: { strong: 0.25, weak: 0.15, ms: 90 },
  },
};
// damage reduction stacks on the same diminishing-returns curve as UPGRADES (core/scaling.js statBonus).
// Applied as a deterministic % with a CARRY accumulator (core/defense.js) so whole-heart HP still feels
// a true fraction without ever going fractional — no RNG (fits the "skill, never chance" design ethic).
export const DAMAGE_REDUCTION = {
  maxBonus: 0.4, // asymptotic ceiling — never exceeds −40% incoming damage
  half: 8, // stacks to reach half of maxBonus (high = small per pick, like UPGRADES)
};
// B9: weapon-mod amounts (applied to the player's guns via the existing BULLET behavior flags)
export const WEAPON_MODS = {
  pierce: 1, // +enemies a shot passes through, per pick
  bounces: 1, // +wall bounces, per pick
  bulletSpeed: 0.15, // +15% bullet speed, per pick
  explodeRadius: 2.5, // blast radius granted by the explosive mod
};

// ---- gamepad cursor sensitivity for the paused-menu selections (shared by the room-clear OFFER
// cards and the human-choice A/B/C/D buttons): push the left stick past `move` to nudge the selection;
// it re-arms once the stick returns inside `settle`. ----
export const MENU_CURSOR = { move: 0.5, settle: 0.3 };

// ---- B10: meta-progression save (ADR-0029) ----
// Versioned localStorage save for the Echoes economy + permanent upgrades.
// Echoes are residual boss life-force; they only START dropping after the first full win
// (see core/saves.js). `echoesPerBoss` + `echoesFloorBonus` × floorIndex = per-boss payout
// (post-beat only). `winBonus` is a one-time shot of Echoes granted on the win that sets
// `gameBeaten` — a gentle starter budget for the unlock screen.
export const SAVES = {
  key: 'lostsouls.save',
  echoesPerBoss: 30, // base Echoes for killing a boss (post-beat runs only)
  echoesFloorBonus: 10, // extra Echoes per floor depth (floorIndex × this)
  winBonus: 50, // Echoes granted on the win that sets gameBeaten (first win only)
};

// META_UPGRADES — the Resonance upgrade tree. Each node feeds an existing capped curve
// so per-pick power stays small (Scott's intent: breadth, not power creep).
// `cost` is an array with one entry per level (length === maxLevel).
// `effect` maps to a stat key used by core/saves.js baselineStacks().
export const META_UPGRADES = [
  {
    id: 'vitality',
    name: 'Vitality',
    desc: '+1 max heart',
    icon: '❤️',
    maxLevel: 2,
    cost: [60, 120],
    effect: { stat: 'hearts', perLevel: 1 },
  },
  {
    id: 'sharpness',
    name: 'Sharpness',
    desc: '+1 damage stack',
    icon: '⚔️',
    maxLevel: 3,
    cost: [50, 100, 160],
    effect: { stat: 'damage', perLevel: 1 },
  },
  {
    id: 'swiftness',
    name: 'Swiftness',
    desc: '+1 speed stack',
    icon: '💨',
    maxLevel: 3,
    cost: [50, 100, 160],
    effect: { stat: 'speed', perLevel: 1 },
  },
  {
    id: 'rapid',
    name: 'Rapid',
    desc: '+1 fire-rate stack',
    icon: '🔥',
    maxLevel: 3,
    cost: [50, 100, 160],
    effect: { stat: 'fireRate', perLevel: 1 },
  },
  {
    id: 'toughHide',
    name: 'Tough Hide',
    desc: '+1 damage-reduction stack',
    icon: '🛡️',
    maxLevel: 2,
    cost: [70, 140],
    effect: { stat: 'damageReduction', perLevel: 1 },
  },
  {
    id: 'aegis',
    name: 'Aegis',
    desc: 'Start each run with +1 guard charge',
    icon: '✨',
    maxLevel: 2,
    cost: [80, 160],
    effect: { stat: 'guard', perLevel: 1 },
  },
];

// ---- models: map a key -> a file under /models/ (.glb). ----
// null  => use a built-in primitive shape (always works).
// To use a real model: drop the .glb in public/models/ and set its path,
// e.g.  chaser: 'models/demon.glb'
export const MODELS = {
  player: null,
  ally: null,
  chaser: null,
  shooter: null,
  spider: null,
  spiderling: null,
  npc: null,
  // expansion 6: animated CC0 monster models (null => procedural fallback mesh)
  mushroom: 'models/mushroom-king.glb', // Quaternius "Mushroom King" (CC0)
  sporeling: 'models/mushnub.glb', // Quaternius "Mushnub" (CC0) — mushroom minions
  dog: 'models/dog.glb', // Stage 3: animated CC0 beast — Fang + pups (warm)
  cat: 'models/cat.glb', // Stage 3: animated CC0 beast — Whisker + kittens (cool)
  skeleton: 'models/skeleton.glb', // Stage 4: animated CC0 skeleton — Rattlebones + bonelings
  human: 'models/human.glb', // Stage 5: animated CC0 human — the Survivor + rallied survivors
  // Final boss: drop a CC0 war-machine/robot GLB here (e.g. 'models/enforcer.glb') and the
  // Enforcer swaps from its procedural mesh to the model automatically (loadAnimated in enforcer.js).
  enforcer: null,
};
