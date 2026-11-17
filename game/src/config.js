// TIDEWARDEN tuning: every number that shapes the game lives here.
// One mechanic rules the game: the tide. Hold SPACE (or the TIDE button) to
// raise the water; release to let it ebb. Water drowns what marches in it,
// but it also drowns your own towers and leaks the village above 85%.

export const VIEW = { w: 1280, h: 720 };
export const HUD_H = 64; // top bar height
export const BAR_H = 80; // bottom bar height (tower cards)
export const FIELD_TOP = HUD_H;
export const FIELD_BOTTOM = VIEW.h - BAR_H;
export const FIELD_LEFT = 130; // village / lighthouse strip
export const SEA_X = 1280; // enemies spawn at the right edge

export const LANES = [178, 338, 498]; // lane centre y
export const PLOT_COLS = [300, 460, 620, 780, 940]; // tower plot x
export const PLOT_R = 34;

// Tide: level 0..100. Water covers x > waterEdge(level).
// level 100 -> water edge at x=210 (just right of the village).
export const TIDE = {
  risePerSec: 26,
  ebbPerSec: 16,
  leakAt: 85, // above this the village leaks a heart every leakEvery seconds
  leakEvery: 3,
  drownPerSec: 5, // damage to enemies standing in water
  waterSlow: 0.5, // enemies in water move at half speed
};

export const ECONOMY = {
  startShells: 60,
  startHearts: 12,
  waveClearBonus: (wave) => 20 + wave * 5,
  sellRefund: 0.5,
};

// Towers. range in px, rate in seconds between shots, dmg per hit.
export const TOWERS = {
  harpoon: {
    name: 'Harpoon Tower', key: '1', cost: 40, range: 240, rate: 0.7, dmg: 8,
    color: '#ffb703', desc: 'Fast harpoons. Hits gulls too.',
    canHitFlying: true, splash: 0,
  },
  tidepool: {
    name: 'Tidepool', key: '2', cost: 30, range: 130, rate: 0, dmg: 0,
    color: '#4cc9f0', desc: 'Slows enemies 45% nearby.',
    canHitFlying: false, splash: 0, slow: 0.55, slowRadius: 130,
  },
  mortar: {
    name: 'Pearl Mortar', key: '3', cost: 60, range: 280, rate: 1.5, dmg: 15,
    color: '#e07a9a', desc: 'Splash damage. Ground only.',
    canHitFlying: false, splash: 75,
  },
};
export const TOWER_ORDER = ['harpoon', 'tidepool', 'mortar'];

// Enemies. hp scales with wave: hp * (1 + 0.12*(wave-1)), speed * (1 + 0.03*(wave-1)).
export const ENEMIES = {
  crab: {
    name: 'Crab', hp: 24, speed: 30, reward: 7, hearts: 1,
    color: '#ff6b35', r: 16, flying: false, drownMul: 1,
  },
  gull: {
    name: 'Gull', hp: 16, speed: 48, reward: 9, hearts: 1,
    color: '#f8f9fa', r: 13, flying: true, drownMul: 0,
  },
  turtle: {
    name: 'Turtle', hp: 75, speed: 18, reward: 15, hearts: 1,
    color: '#80b918', r: 20, flying: false, drownMul: 0.5,
  },
  king: {
    name: 'Tide King', hp: 450, speed: 15, reward: 100, hearts: 5,
    color: '#7b2cbf', r: 34, flying: false, drownMul: 0,
  },
};

// Wave compositions: [type, count] pairs, spawned ~1.1s apart, lanes rotate.
export const WAVES = [
  [['crab', 6]],
  [['crab', 8], ['gull', 2]],
  [['crab', 10], ['gull', 3], ['turtle', 1]],
  [['crab', 12], ['gull', 4], ['turtle', 2]],
  [['crab', 14], ['gull', 5], ['turtle', 3]],
  [['crab', 16], ['gull', 6], ['turtle', 4]],
  [['crab', 18], ['gull', 7], ['turtle', 5]],
  [['crab', 20], ['gull', 8], ['turtle', 6]],
  [['crab', 22], ['gull', 10], ['turtle', 7]],
  [['king', 1], ['crab', 6], ['gull', 4]],
];

export const BUILD_SECONDS = 12; // seconds to build between waves
export const SPAWN_INTERVAL = 1.1;

// Clickable UI rectangles (canvas coordinates). Render draws them; input
// and world hit-test against the same definitions.
export const UI = {
  // bottom bar: three tower cards, then the big tide button, then small buttons
  cards: { x: 24, y: 648, w: 190, h: 60, gap: 12 },
  tideButton: { x: 660, y: 644, w: 250, h: 68 },
  pauseBtn: { x: 940, y: 652, w: 76, h: 52 },
  muteBtn: { x: 1024, y: 652, w: 76, h: 52 },
  restartBtn: { x: 1108, y: 652, w: 76, h: 52 },
  startBtn: { x: 490, y: 470, w: 300, h: 64 }, // title screen START
  againBtn: { x: 490, y: 500, w: 300, h: 64 }, // game over / victory PLAY AGAIN
};

// Palette: one coherent coast — deep sea, bright shallows, warm sand.
export const PALETTE = {
  sand: '#f2d8a0',
  sandDark: '#e3bd72',
  sandLine: '#d9a95c',
  seaDeep: '#0b3d5c',
  sea: '#1b7fa8',
  seaShallow: '#5ec4dc',
  foam: '#eafcff',
  village: '#fff3d6',
  panel: '#0a2e44',
  panelLine: '#1b7fa8',
  gold: '#ffb703',
  ink: '#06283d',
  white: '#ffffff',
  red: '#ef476f',
  green: '#80b918',
};
