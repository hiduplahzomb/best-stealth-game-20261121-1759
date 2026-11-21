// Screenshot scenes behind ?shot=cover|title|spotted|cleared. Each one plays
// the real rules forward from a fresh world, steered by a small autopilot
// that walks the player along waypoints and waits when a guard's cone covers
// the way ahead — so every frame is what a real game looks like, and the same
// seed always gives the same frame.
import { TILE } from './config.js';
import { coneTest, lineOfSightClear } from './vision.js';
import { STATUS_PLAY } from './world.js';

const STEP = 1 / 60;

// Is the straight path from the player toward (tx, ty) watched right now?
// Samples points along the segment and checks each against every guard's
// cone — angle, range, and a clear line of sight, since a cone behind a
// wall is no threat to anyone walking on this side of it.
function pathWatched(world, tx, ty) {
  const p = world.player;
  const dx = tx - p.x;
  const dy = ty - p.y;
  const dist = Math.hypot(dx, dy);
  const samples = Math.max(2, Math.ceil(dist / (TILE / 2)));
  for (let i = 1; i <= samples; i += 1) {
    const x = p.x + (dx * i) / samples;
    const y = p.y + (dy * i) / samples;
    for (const g of world.guards) {
      if (coneTest(g, x, y) !== null && lineOfSightClear(world.level, g.x, g.y, x, y)) {
        return true;
      }
    }
  }
  return false;
}

// Drive the player along tile waypoints. Steps the world at a fixed rate.
// The player sneaks whenever a guard is within earshot and runs in the
// clear; it waits when a guard's cone covers the way ahead (and pushes
// through after twenty seconds, a whole patrol cycle, since the cone will
// have moved on); and if a guard gets onto it — seeking, chasing, or the
// meter climbing — it runs away from that guard, then stands still and
// waits for the guard to give up before resuming the route.
// Returns true when every waypoint was reached.
function followWaypoints(world, waypoints, maxSeconds) {
  let wi = 0;
  let waitTimer = 0;
  let pushing = false;
  let fleeTimer = 0;
  let hideTimer = 0;
  const maxSteps = Math.floor(maxSeconds / STEP);
  for (let i = 0; i < maxSteps; i += 1) {
    if (world.status !== STATUS_PLAY) return false;
    if (wi >= waypoints.length) return true;
    const [wtx, wty] = waypoints[wi];
    const tx = (wtx + 0.5) * TILE;
    const ty = (wty + 0.5) * TILE;
    const p = world.player;
    const dist = Math.hypot(tx - p.x, ty - p.y);
    if (dist < TILE * 0.3) {
      wi += 1;
      pushing = false;
      waitTimer = 0;
      continue;
    }
    // Flee, then hide: a guard onto the player — seeking, chasing, or the
    // meter climbing — means run away from the guard with the highest
    // detection for two seconds, then stand still and wait for the guard
    // to give up and go back to its patrol before resuming the route.
    let threat = null;
    let threatDetection = 0;
    for (const g of world.guards) {
      const d = Math.hypot(g.x - p.x, g.y - p.y);
      if (d < 6 * TILE && g.detection > threatDetection) {
        threat = g;
        threatDetection = g.detection;
      }
    }
    const hunted =
      (threat && (threat.state !== 'patrol' || threatDetection > 0.25)) || world.detection > 0.3;
    if (hunted) {
      if (fleeTimer < 2) {
        fleeTimer += STEP;
        // Run away from the guard — but never into a wall: try the away
        // direction first, then directions rotated off it, and take the
        // first one with open floor ahead.
        const from = threat ?? world.guards[0];
        const away = Math.atan2(p.y - from.y, p.x - from.x);
        let dir = away;
        for (const off of [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, (3 * Math.PI) / 4, (-3 * Math.PI) / 4, Math.PI]) {
          const a = away + off;
          const px = p.x + Math.cos(a) * TILE * 1.5;
          const py = p.y + Math.sin(a) * TILE * 1.5;
          const tx = Math.floor(px / TILE);
          const ty = Math.floor(py / TILE);
          const row = world.level.tiles[ty];
          if (row && tx >= 0 && tx < row.length && !['#', 'C', 'P'].includes(row[tx])) {
            dir = a;
            break;
          }
        }
        world.step(STEP, { mx: Math.cos(dir), my: Math.sin(dir), sneak: false, click: null });
      } else {
        hideTimer += STEP;
        world.step(STEP, { mx: 0, my: 0, sneak: true, click: null });
        if (hideTimer > 12) {
          fleeTimer = 0;
          hideTimer = 0;
        }
      }
      continue;
    }
    fleeTimer = 0;
    hideTimer = 0;
    const watched = pathWatched(world, tx, ty);
    if (watched && !pushing) {
      waitTimer += STEP;
      if (waitTimer > 20) {
        // Waited through a whole patrol cycle: the cone will have moved
        // on by the time the player gets there. Push through and stop
        // re-waiting for this leg.
        pushing = true;
        waitTimer = 0;
      } else {
        world.step(STEP, { mx: 0, my: 0, sneak: true, click: null });
        continue;
      }
    } else {
      waitTimer = 0;
      if (!watched) pushing = false;
    }
    const nearGuard = world.guards.some((g) => Math.hypot(g.x - p.x, g.y - p.y) < 4.5 * TILE);
    const mx = (tx - p.x) / dist;
    const my = (ty - p.y) / dist;
    world.step(STEP, { mx, my, sneak: nearGuard, click: null });
  }
  return wi >= waypoints.length;
}

// Step the world with the player standing still (sneaking) until `until`
// returns true, or the time cap runs out.
function idleUntil(world, until, maxSeconds) {
  const maxSteps = Math.floor(maxSeconds / STEP);
  for (let i = 0; i < maxSteps; i += 1) {
    if (world.status !== STATUS_PLAY) return false;
    if (until(world)) return true;
    world.step(STEP, { mx: 0, my: 0, sneak: true, click: null });
  }
  return until(world);
}

// The cover: the player sneaking behind the crates on the ground floor while
// a guard's cone sweeps past toward the relic ahead.
function stageCover(world) {
  world.loadLevel(0);
  // Wait out of sight, then slip in beside the guard as it walks its east
  // leg: the player crouched at the edge of the cone, unseen.
  followWaypoints(world, [[5, 16], [5, 13], [2, 11]], 90);
  idleUntil(
    world,
    (w) => {
      const g = w.guards[2];
      return g.x > 5.5 * TILE && Math.cos(g.angle) > 0.5;
    },
    40,
  );
  followWaypoints(world, [[5, 11]], 30);
  return { screen: 'play' };
}

// The title screen over a living floor: guards on patrol, relics glowing.
// The player waits in the far corner while the floor runs, so no guard's
// cone finds it standing at the door before the game has even begun.
function stageTitle(world) {
  world.loadLevel(0);
  world.player.x = 28.5 * TILE;
  world.player.y = 16.5 * TILE;
  for (let i = 0; i < 7 / STEP; i += 1) {
    world.step(STEP, { mx: 0, my: 0, sneak: false, click: null });
  }
  return { screen: 'title' };
}

// The near miss: the player dips into a guard's cone, the meter climbs, and
// ducks behind the wall — the guard comes looking, marked with a '?'.
function stageSpotted(world) {
  world.loadLevel(0);
  // Get to the staging point below the north guard's patrol, wait for the
  // guard to turn south, then dash across its cone, freezing the moment
  // the meter climbs past half — caught in the open, the guard turning.
  followWaypoints(world, [[5, 16], [5, 13], [5, 9], [8, 9], [8, 6], [9, 6]], 120);
  idleUntil(
    world,
    (w) => {
      const g = w.guards[0];
      return g.x > 11.5 * TILE && g.y < 3.6 * TILE && Math.sin(g.angle) > 0.9;
    },
    40,
  );
  const dashTarget = { x: 13.5 * TILE, y: 6.5 * TILE };
  const maxSteps = Math.floor(6 / STEP);
  for (let i = 0; i < maxSteps; i += 1) {
    if (world.status !== STATUS_PLAY) break;
    if (world.detection > 0.55) break;
    const p = world.player;
    const dx = dashTarget.x - p.x;
    const dy = dashTarget.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    world.step(STEP, { mx: dx / d, my: dy / d, sneak: false, click: null });
  }
  return { screen: 'play' };
}

// The payoff: every relic taken, the exit reached, the floor cleared. The
// route goes around the wall blocks — along the bottom corridor, up the
// east edge — and waits for the top guard to be on its south leg before
// the dash across the top floor to the last relic.
function stageCleared(world) {
  world.loadLevel(0);
  // First relic: along the bottom, up the gap, in from the east.
  followWaypoints(world, [[5, 16], [12, 16], [12, 13], [11, 12], [12, 13]], 120);
  // Second relic: back down, east along the bottom, then up the gap west
  // of the relic's pocket — the pocket opens west, not south.
  followWaypoints(world, [[12, 16], [16, 16], [16, 12], [18, 12], [16, 12], [16, 16]], 150);
  // Third relic: east along the bottom, then up the far edge while the
  // top guard is on its west leg — its cone sweeps the east edge when it
  // turns south, so the climb starts only while the guard walks west.
  followWaypoints(world, [[24, 16], [28, 16]], 90);
  idleUntil(
    world,
    (w) => {
      const g = w.guards[1];
      return g.y > 2.5 * TILE && g.x < 22 * TILE && Math.cos(g.angle) < -0.5;
    },
    20,
  );
  followWaypoints(world, [[28, 6]], 30);
  // Wait at the top of the edge until the guard is back at its east end
  // starting west again, then dash north and west along the top floor.
  idleUntil(world, (w) => w.guards[1].x > 23 * TILE && w.guards[1].y > 2.5 * TILE, 20);
  followWaypoints(world, [[28, 2], [18, 2], [17, 2]], 60);
  // The exit, back down the far edge.
  followWaypoints(world, [[28, 2], [28, 16], [26, 16]], 90);
  return { screen: world.status === 'complete' ? 'complete' : 'play' };
}

const SCENES = {
  cover: stageCover,
  title: stageTitle,
  spotted: stageSpotted,
  cleared: stageCleared,
};

// Set `world` to the named scene (any other name is the cover) and return
// the screen to draw over it.
export function stageShot(name, world) {
  const stage = SCENES[name] ?? SCENES.cover;
  return stage(world);
}

export function sceneNames() {
  return Object.keys(SCENES);
}
