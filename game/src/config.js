// Gobble Run — every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below depends
// on the screen size. The turkey runs right at a fixed x and the farm scrolls past.

export const FIELD = { width: 1280, height: 720, groundY: 620 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** How far the turkey must run, in metres, to reach the forest gate and escape. */
export const GOAL_METRES = 1200;
/** Pixels per metre of distance. */
export const PX_PER_METRE = 50;

export const TURKEY = {
  /** Fixed horizontal position of the turkey's feet-left corner. */
  x: 280,
  width: 64,
  height: 58,
  slideHeight: 32,
  jumpVelocity: -1150,
  gravity: 2600,
  slideSeconds: 0.55,
  invulnerableSeconds: 1.5,
};

export const RUN = {
  startSpeed: 420,
  maxSpeed: 780,
  /** Seconds of play for speed to reach its max. */
  rampSeconds: 75,
};

export const FARMER = {
  width: 74,
  height: 108,
  /** Gap (px) between the farmer's front and the turkey when a run starts. */
  startGap: 190,
  maxGap: 190,
  /** Gap lost on a hit; gap regained per clean second of running. */
  gapLostOnHit: 70,
  gapRegainPerSecond: 10,
  /** Caught when the gap closes to this. */
  catchGap: 30,
};

export const LIVES = 3;

export const SPAWN = {
  /** Seconds between obstacle spawns, from easy to hardest. */
  intervalStart: 1.15,
  intervalEnd: 0.85,
  intervalJitter: 0.5,
  /** Distance (m) after which ovens, then thrown knives, join the field. */
  ovenFromMetres: 150,
  knifeFromMetres: 300,
  featherFromMetres: 400,
};

export const OBSTACLES = {
  fence: { width: 46, height: 64 },
  hay: { width: 72, height: 78 },
  oven: { width: 92, height: 96 },
  knifeHigh: { width: 58, height: 14, extraSpeed: 220 },
  knifeLow: { width: 58, height: 14, extraSpeed: 180 },
};

export const PICKUP = {
  cornPoints: 10,
  featherPoints: 50,
  cornSize: 26,
  featherSize: 30,
};

export const PALETTE = {
  skyTop: '#2b1d4e',
  skyMid: '#7a3b6e',
  skyLow: '#e2703a',
  sun: '#ffd27a',
  sunGlow: 'rgba(255, 190, 90, 0.35)',
  cloud: 'rgba(255, 214, 180, 0.75)',
  hillFar: '#5d3a63',
  hillNear: '#43305c',
  barn: '#7c2f26',
  barnRoof: '#5d2119',
  barnTrim: '#f2e3c9',
  tree: '#2e4a2f',
  treeDark: '#223a26',
  ground: '#6b4a2f',
  groundTop: '#8a6a42',
  grass: '#7fae4c',
  fence: '#a97e50',
  turkeyBody: '#8a5230',
  turkeyDark: '#6e3f22',
  turkeyTail: ['#b85c28', '#d2691e', '#e8a33c', '#a03d2d', '#c97b2d'],
  turkeyHead: '#d9dee8',
  turkeyBeak: '#f2a541',
  turkeyWattle: '#e5534b',
  turkeyLeg: '#f2a541',
  farmerShirt: '#c94f3d',
  farmerOveralls: '#3d5a80',
  farmerSkin: '#e8b98a',
  farmerHat: '#d9b36a',
  farmerBeard: '#e8e0d0',
  ovenBody: '#2b2b30',
  ovenDoor: '#ff7a1a',
  ovenFire: '#ffb347',
  knifeBlade: '#d7dde6',
  knifeHandle: '#7a4a26',
  corn: '#f2c94c',
  cornHusk: '#5da24a',
  featherGold: '#ffd94a',
  panel: 'rgba(20, 16, 34, 0.82)',
  panelEdge: '#f2c94c',
  text: '#fdf6e3',
  muted: '#d8c9a8',
  danger: '#ff5a4e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'gobble-run.best';
