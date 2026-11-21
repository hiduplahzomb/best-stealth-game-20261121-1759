// Nightshade — The Ashen Museum. Shared constants: the board, the canvas, the
// tuning of movement, sight and sound. One place for every number the other
// modules agree on.
export const TILE = 32;
export const COLS = 30;
export const ROWS = 18;
export const HUD_H = 40;
export const FOOT_H = 24;
export const CANVAS_W = COLS * TILE;
export const CANVAS_H = HUD_H + ROWS * TILE + FOOT_H;

// Field origin in canvas pixels (the HUD sits above it).
export const FIELD_X = 0;
export const FIELD_Y = HUD_H;

// Movement, in pixels per second.
export const WALK_SPEED = 118;
export const SNEAK_SPEED = 62;
export const GUARD_PATROL_SPEED = 52;
export const GUARD_SEEK_SPEED = 84;
export const GUARD_CHASE_SPEED = 132;

// A guard's sight: how far it sees, in tiles, and how wide its cone is.
export const CONE_RANGE_TILES = 5.6;
export const CONE_HALF_ANGLE = 0.62; // radians, about 35 degrees each side
// How close a chasing guard must get to catch the player, in pixels.
export const CATCH_RADIUS = 26;

// Detection fills 0..1 while the player is seen. Rates are per second.
export const DETECT_BASE = 0.62;
export const DETECT_CLOSE_BONUS = 0.9; // extra at point-blank range
export const DETECT_RUN_MULT = 1.55;
export const DETECT_SNEAK_MULT = 0.55;
export const DETECT_SHADOW_MULT = 0.6;
export const DETECT_DECAY = 0.4;
// Past this, a guard that loses sight goes to investigate instead of patrolling.
export const SUSPICION_THRESHOLD = 0.3;

// Noise: running steps are heard this far (tiles); rugs and sneaking are silent.
export const NOISE_RADIUS_TILES = 4.5;
export const NOISE_STEP_SECONDS = 0.34;

// Guard behaviour timings, in seconds.
export const WAYPOINT_PAUSE = 1.1;
export const SEEK_LOOK_AROUND = 2.2;
export const CHASE_GIVE_UP = 3.0;

export const START_LIVES = 3;
export const SCORE_RELIC = 100;
export const SCORE_LEVEL = 200;
export const SCORE_GHOST = 150;

// Palette: a museum at night — deep blues, warm wood, lamplight gold.
export const COLORS = {
  page: '#0a0c10',
  floorA: '#2b2620',
  floorB: '#272219',
  floorLine: '#1d1912',
  rug: '#5d2323',
  rugTrim: '#8a6a3b',
  shadow: '#17141f',
  wall: '#3a3f4a',
  wallTop: '#565d6c',
  wallEdge: '#23262e',
  crate: '#7a5a33',
  crateEdge: '#543d20',
  plantPot: '#8a4a2e',
  plantLeaf: '#2e6b34',
  plantLeafDark: '#1f4d24',
  relic: '#ffd76a',
  relicGlow: 'rgba(255, 215, 106, 0.35)',
  exitLocked: '#4a4030',
  exitOpen: '#ffdf8a',
  guard: '#31435e',
  guardCap: '#1d2a3d',
  coneCalm: 'rgba(255, 214, 110, 0.20)',
  coneCalmEdge: 'rgba(255, 214, 110, 0.45)',
  coneSeek: 'rgba(255, 158, 66, 0.28)',
  coneAlert: 'rgba(255, 84, 66, 0.32)',
  player: '#2f7d6b',
  playerHood: '#1d5247',
  hudBg: 'rgba(8, 10, 14, 0.88)',
  hudText: '#e8e0c8',
  hudDim: '#9a917a',
  danger: '#ff6b5e',
  ok: '#7ddb8a',
};
