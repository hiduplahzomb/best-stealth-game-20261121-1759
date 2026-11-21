// Sight: what a guard can see. A guard sees the player when the player is
// inside its cone (range and angle) and the line between them crosses no
// wall or tall cover. The same raycast shapes the cone the renderer draws,
// so what you see is what the guard sees.
import { CONE_HALF_ANGLE, CONE_RANGE_TILES, TILE } from './config.js';

// Pixel position of a tile's centre.
export function tileCentre(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

// Does the straight line from (x0, y0) to (x1, y1) cross any sight-blocking
// tile? Steps along the line in quarter-tile hops and checks each sample.
export function lineOfSightClear(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (TILE / 4)));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const tx = Math.floor((x0 + dx * t) / TILE);
    const ty = Math.floor((y0 + dy * t) / TILE);
    if (level.blocksSight(tx, ty)) return false;
  }
  return true;
}

// Is (px, py) inside the guard's cone, ignoring cover? Returns the distance
// in tiles when inside, or null when outside the range or the angle.
export function coneTest(guard, px, py) {
  const dx = px - guard.x;
  const dy = py - guard.y;
  const dist = Math.hypot(dx, dy);
  const range = CONE_RANGE_TILES * TILE;
  if (dist > range) return null;
  if (dist < 1) return 0;
  const angle = Math.atan2(dy, dx);
  let diff = angle - guard.angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > CONE_HALF_ANGLE) return null;
  return dist / TILE;
}

// Can this guard see the player right now? Cone plus a clear line of sight.
// Returns the distance in tiles, or null when the player is unseen.
export function guardSeesPlayer(level, guard, player) {
  const distTiles = coneTest(guard, player.x, player.y);
  if (distTiles === null) return null;
  if (!lineOfSightClear(level, guard.x, guard.y, player.x, player.y)) return null;
  return distTiles;
}

// The cone as a polygon, clipped by walls: cast rays across the cone and
// stop each at the first blocking tile (or the range). The renderer fills
// this shape, so cones visibly stop at cover.
export function conePolygon(level, guard, rayCount = 24) {
  const range = CONE_RANGE_TILES * TILE;
  const points = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= rayCount; i += 1) {
    const a = guard.angle - CONE_HALF_ANGLE + (2 * CONE_HALF_ANGLE * i) / rayCount;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let hit = range;
    for (let d = TILE / 2; d < range; d += TILE / 4) {
      const tx = Math.floor((guard.x + dx * d) / TILE);
      const ty = Math.floor((guard.y + dy * d) / TILE);
      if (level.blocksSight(tx, ty)) {
        hit = d;
        break;
      }
    }
    points.push({ x: guard.x + dx * hit, y: guard.y + dy * hit });
  }
  return points;
}
