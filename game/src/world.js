// The simulation: the player, the guards, detection, noise, relics and the
// exit. Pure logic — no drawing, no sound, no DOM — so the screenshot scenes
// can run it forward headlessly and the game loop just calls step().
// Coordinates are pixels inside the field (the HUD offset is the renderer's
// business). The player and the guards are circles of radius 11.
import {
  CATCH_RADIUS,
  CHASE_GIVE_UP,
  COLS,
  DETECT_BASE,
  DETECT_CLOSE_BONUS,
  DETECT_DECAY,
  DETECT_RUN_MULT,
  DETECT_SHADOW_MULT,
  DETECT_SNEAK_MULT,
  GUARD_CHASE_SPEED,
  GUARD_PATROL_SPEED,
  GUARD_SEEK_SPEED,
  NOISE_RADIUS_TILES,
  NOISE_STEP_SECONDS,
  ROWS,
  SCORE_GHOST,
  SCORE_LEVEL,
  SCORE_RELIC,
  SEEK_LOOK_AROUND,
  SNEAK_SPEED,
  START_LIVES,
  SUSPICION_THRESHOLD,
  TILE,
  WALK_SPEED,
  WAYPOINT_PAUSE,
} from './config.js';
import { LEVELS, parseLevel } from './levels.js';
import { guardSeesPlayer, tileCentre } from './vision.js';

export const STATUS_PLAY = 'play';
export const STATUS_CAUGHT = 'caught';
export const STATUS_COMPLETE = 'complete';
export const STATUS_OVER = 'over';
export const STATUS_WIN = 'win';

const PLAYER_RADIUS = 11;
const GUARD_RADIUS = 12;

function clampAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

// Turn `from` toward `to` by at most `maxStep` radians, the short way round.
function turnToward(from, to, maxStep) {
  const diff = clampAngle(to - from);
  if (Math.abs(diff) <= maxStep) return to;
  return from + Math.sign(diff) * maxStep;
}

// Move a circle against the tile grid: axis by axis, so it slides along walls.
function moveCircle(level, body, dx, dy, radius) {
  const hit = (x, y) => {
    const minTx = Math.floor((x - radius) / TILE);
    const maxTx = Math.floor((x + radius) / TILE);
    const minTy = Math.floor((y - radius) / TILE);
    const maxTy = Math.floor((y + radius) / TILE);
    for (let ty = minTy; ty <= maxTy; ty += 1) {
      for (let tx = minTx; tx <= maxTx; tx += 1) {
        if (!level.walkable(tx, ty)) return true;
      }
    }
    return false;
  };
  if (dx !== 0 && !hit(body.x + dx, body.y)) body.x += dx;
  if (dy !== 0 && !hit(body.x, body.y + dy)) body.y += dy;
}

function makeGuard(def, level) {
  const first = tileCentre(def.waypoints[0][0], def.waypoints[0][1]);
  const second = tileCentre(def.waypoints[1][0], def.waypoints[1][1]);
  return {
    x: first.x,
    y: first.y,
    angle: Math.atan2(second.y - first.y, second.x - first.x),
    waypoints: def.waypoints.map(([tx, ty]) => tileCentre(tx, ty)),
    wpIndex: 1,
    pauseTimer: 0,
    state: 'patrol',
    target: null,
    lookTimer: 0,
    lookDir: 1,
    chaseTimer: 0,
    detection: 0,
    seesPlayer: false,
    lastSeen: null,
    stepTimer: 0,
    stuckTimer: 0,
    lastDist: Infinity,
    pauseAngle: 0,
    swaySeed: Math.random() * Math.PI * 2,
  };
}

export class World {
  constructor(seed = 1) {
    this.seed = seed;
    this.levelIndex = 0;
    this.lives = START_LIVES;
    this.score = 0;
    this.time = 0;
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = parseLevel(LEVELS[index]);
    this.def = LEVELS[index];
    const start = tileCentre(this.level.playerStart.tx, this.level.playerStart.ty);
    this.player = {
      x: start.x,
      y: start.y,
      angle: -Math.PI / 2,
      sneaking: false,
      moving: false,
      onRug: false,
      inShadow: false,
    };
    this.guards = this.def.guards.map((g) => makeGuard(g, this.level));
    this.status = STATUS_PLAY;
    this.statusTimer = 0;
    this.message = '';
    this.messageTimer = 0;
    this.collected = 0;
    this.alertedThisLevel = false;
    this.noiseTimer = 0;
    this.noiseRings = [];
    this.footsteps = [];
    this.caughtFlash = 0;
    this.levelTime = 0;
    this.events = [];
  }

  get relicTotal() {
    return this.level.relics.length;
  }

  get exitOpen() {
    return this.collected >= this.relicTotal;
  }

  get detection() {
    return Math.max(0, ...this.guards.map((g) => g.detection));
  }

  showMessage(text, seconds = 2.4) {
    this.message = text;
    this.messageTimer = seconds;
  }

  // One fixed step. input: { mx, my } a move direction (each -1..1, not
  // necessarily normalised), { sneak } true while the sneak key is held, and
  // { click } a field position to walk toward (or null).
  step(dt, input) {
    this.events = [];
    if (this.status !== STATUS_PLAY) {
      this.statusTimer += dt;
      this.updateFx(dt);
      return;
    }
    this.time += dt;
    this.levelTime += dt;
    this.stepPlayer(dt, input);
    this.stepGuards(dt);
    this.stepDetection(dt);
    this.stepNoise(dt);
    this.stepPickups();
    this.updateFx(dt);
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.caughtFlash > 0) this.caughtFlash -= dt;
  }

  stepPlayer(dt, input) {
    const p = this.player;
    let mx = input.mx;
    let my = input.my;
    if (input.click) {
      const dx = input.click.x - p.x;
      const dy = input.click.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        mx = dx / d;
        my = dy / d;
      } else {
        mx = 0;
        my = 0;
      }
    }
    const len = Math.hypot(mx, my);
    p.moving = len > 0.01;
    p.sneaking = Boolean(input.sneak);
    if (p.moving) {
      const speed = p.sneaking ? SNEAK_SPEED : WALK_SPEED;
      const nx = (mx / len) * speed * dt;
      const ny = (my / len) * speed * dt;
      moveCircle(this.level, p, nx, ny, PLAYER_RADIUS);
      p.angle = Math.atan2(ny, nx);
    }
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor(p.y / TILE);
    p.onRug = this.level.isRug(tx, ty);
    p.inShadow = this.level.isShadow(tx, ty);
    if (p.moving && !p.sneaking) {
      this.footstepTimer = (this.footstepTimer ?? 0) + dt;
      if (this.footstepTimer > 0.22) {
        this.footstepTimer = 0;
        this.footsteps.push({ x: p.x, y: p.y, life: 0.7, who: 'player' });
        this.events.push({ type: 'footstep', x: p.x, y: p.y });
      }
    }
  }

  stepGuards(dt) {
    for (const g of this.guards) {
      g.seesPlayer = guardSeesPlayer(this.level, g, this.player) !== null;
      if (g.seesPlayer) {
        g.lastSeen = { x: this.player.x, y: this.player.y };
      }
      if (g.state === 'patrol') this.stepPatrol(g, dt);
      else if (g.state === 'seek') this.stepSeek(g, dt);
      else this.stepChase(g, dt);
      // A walking guard's own footsteps: visible rings, and a sound cue.
      g.stepTimer += dt;
      const interval = g.state === 'chase' ? 0.26 : 0.5;
      if (g.stepTimer > interval && this.guardMoving(g)) {
        g.stepTimer = 0;
        this.footsteps.push({ x: g.x, y: g.y, life: 0.55, who: 'guard' });
        this.events.push({ type: 'guardstep', x: g.x, y: g.y });
      }
    }
  }

  guardMoving(g) {
    return g.state !== 'patrol' || g.pauseTimer <= 0;
  }

  moveGuardToward(g, tx, ty, speed, dt) {
    const dx = tx - g.x;
    const dy = ty - g.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) return true;
    const step = Math.min(d, speed * dt);
    const nx = (dx / d) * step;
    const ny = (dy / d) * step;
    moveCircle(this.level, g, nx, ny, GUARD_RADIUS);
    g.angle = turnToward(g.angle, Math.atan2(dy, dx), 5 * dt);
    return d <= step + 1;
  }

  stepPatrol(g, dt) {
    if (g.pauseTimer > 0) {
      g.pauseTimer -= dt;
      // Idle sway: a slow scan around the heading the guard arrived with.
      g.angle = g.pauseAngle + Math.sin(this.time * 0.9) * 0.3;
      return;
    }
    const wp = g.waypoints[g.wpIndex];
    const dist = Math.hypot(wp.x - g.x, wp.y - g.y);
    if (this.moveGuardToward(g, wp.x, wp.y, GUARD_PATROL_SPEED, dt)) {
      g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
      g.pauseTimer = WAYPOINT_PAUSE;
      g.pauseAngle = g.angle;
      g.stuckTimer = 0;
      g.lastDist = Infinity;
      return;
    }
    // Safety net: a waypoint that cannot be reached (a blocked leg) must
    // never freeze a guard forever — after three seconds without progress,
    // skip to the next waypoint. A patrolling guard closes about 0.9 px
    // per step, so anything under 0.1 px of progress means it is stuck.
    if (dist > g.lastDist - 0.1) {
      g.stuckTimer += dt;
      if (g.stuckTimer > 3) {
        g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
        g.stuckTimer = 0;
        g.lastDist = Infinity;
      }
    } else {
      g.stuckTimer = 0;
    }
    g.lastDist = dist;
  }

  stepSeek(g, dt) {
    if (g.target) {
      if (this.moveGuardToward(g, g.target.x, g.target.y, GUARD_SEEK_SPEED, dt)) {
        g.target = null;
        g.lookTimer = SEEK_LOOK_AROUND;
      }
      return;
    }
    // Arrived: look around, then give up and go back to the patrol.
    g.lookTimer -= dt;
    g.angle += g.lookDir * 1.4 * dt;
    if (g.lookTimer < SEEK_LOOK_AROUND / 2) g.lookDir = -1;
    if (g.lookTimer <= 0) {
      g.state = 'patrol';
      g.lookDir = 1;
      g.detection = Math.min(g.detection, SUSPICION_THRESHOLD);
    }
  }

  stepChase(g, dt) {
    if (g.seesPlayer) {
      g.chaseTimer = 0;
      this.moveGuardToward(g, this.player.x, this.player.y, GUARD_CHASE_SPEED, dt);
    } else {
      g.chaseTimer += dt;
      if (g.lastSeen) this.moveGuardToward(g, g.lastSeen.x, g.lastSeen.y, GUARD_CHASE_SPEED, dt);
      if (g.chaseTimer > CHASE_GIVE_UP) {
        g.state = 'seek';
        g.target = g.lastSeen ? { ...g.lastSeen } : null;
        g.detection = 0.55;
      }
    }
    const d = Math.hypot(this.player.x - g.x, this.player.y - g.y);
    if (d < CATCH_RADIUS) this.caught(g);
  }

  stepDetection(dt) {
    for (const g of this.guards) {
      const seen = guardSeesPlayer(this.level, g, this.player);
      if (seen !== null && this.status === STATUS_PLAY) {
        const closeness = 1 - seen / 5.6;
        let rate = DETECT_BASE + DETECT_CLOSE_BONUS * closeness;
        if (!this.player.sneaking && this.player.moving) rate *= DETECT_RUN_MULT;
        if (this.player.sneaking) rate *= DETECT_SNEAK_MULT;
        if (this.player.inShadow) rate *= DETECT_SHADOW_MULT;
        g.detection = Math.min(1, g.detection + rate * dt);
        if (g.detection >= 1 && g.state !== 'chase') {
          g.state = 'chase';
          g.chaseTimer = 0;
          if (!this.alertedThisLevel) {
            this.alertedThisLevel = true;
            this.showMessage('Spotted! Run or hide!', 2.2);
            this.events.push({ type: 'alarm' });
          }
        } else if (g.detection >= SUSPICION_THRESHOLD && g.state === 'patrol') {
          g.state = 'seek';
          g.target = { x: this.player.x, y: this.player.y };
        }
      } else {
        g.detection = Math.max(0, g.detection - DETECT_DECAY * dt);
        if (g.detection > SUSPICION_THRESHOLD && g.state === 'patrol' && g.lastSeen) {
          // Glimpsed, then lost: go and look where the player was.
          g.state = 'seek';
          g.target = { ...g.lastSeen };
        }
      }
    }
  }

  stepNoise(dt) {
    const p = this.player;
    if (p.moving && !p.sneaking && !p.onRug) {
      this.noiseTimer += dt;
      if (this.noiseTimer > NOISE_STEP_SECONDS) {
        this.noiseTimer = 0;
        this.noiseRings.push({ x: p.x, y: p.y, r: 6, life: 0.8 });
        const radius = NOISE_RADIUS_TILES * TILE;
        for (const g of this.guards) {
          if (g.state === 'chase') continue;
          const d = Math.hypot(g.x - p.x, g.y - p.y);
          if (d < radius) {
            g.state = 'seek';
            g.target = { x: p.x, y: p.y };
            g.detection = Math.max(g.detection, SUSPICION_THRESHOLD);
          }
        }
      }
    } else {
      this.noiseTimer = 0;
    }
  }

  stepPickups() {
    const p = this.player;
    for (const relic of this.level.relics) {
      if (relic.taken) continue;
      const c = tileCentre(relic.tx, relic.ty);
      if (Math.hypot(p.x - c.x, p.y - c.y) < TILE * 0.7) {
        relic.taken = true;
        this.collected += 1;
        this.score += SCORE_RELIC;
        this.events.push({ type: 'pickup', x: c.x, y: c.y });
        this.showMessage(
          this.collected >= this.relicTotal
            ? 'All relics taken — the exit is open!'
            : `Relic ${this.collected} of ${this.relicTotal}`,
          2.2,
        );
      }
    }
    if (this.exitOpen) {
      const c = tileCentre(this.level.exit.tx, this.level.exit.ty);
      if (Math.hypot(p.x - c.x, p.y - c.y) < TILE * 0.7) {
        this.completeLevel();
      }
    }
  }

  completeLevel() {
    this.score += SCORE_LEVEL;
    if (!this.alertedThisLevel) this.score += SCORE_GHOST;
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.status = STATUS_WIN;
      this.events.push({ type: 'win' });
    } else {
      this.status = STATUS_COMPLETE;
      this.events.push({ type: 'level' });
    }
    this.statusTimer = 0;
  }

  nextLevel() {
    this.loadLevel(this.levelIndex + 1);
  }

  caught(guard) {
    if (this.status !== STATUS_PLAY) return;
    this.lives -= 1;
    this.caughtFlash = 0.9;
    this.events.push({ type: 'caught' });
    if (this.lives <= 0) {
      this.status = STATUS_OVER;
      this.statusTimer = 0;
      return;
    }
    this.status = STATUS_CAUGHT;
    this.statusTimer = 0;
    this.showMessage(`Caught! ${this.lives} ${this.lives === 1 ? 'life' : 'lives'} left`, 2.4);
  }

  // After the caught banner, put the player back at the start of this level
  // with the guards back on patrol. Relics already taken stay taken.
  respawn() {
    const taken = this.level.relics.map((r) => r.taken);
    const collected = this.collected;
    const levelIndex = this.levelIndex;
    this.loadLevel(levelIndex);
    this.level.relics.forEach((r, i) => {
      r.taken = taken[i];
    });
    this.collected = collected;
  }

  restart() {
    this.lives = START_LIVES;
    this.score = 0;
    this.time = 0;
    this.loadLevel(0);
  }

  updateFx(dt) {
    for (const ring of this.noiseRings) {
      ring.r += 90 * dt;
      ring.life -= dt;
    }
    this.noiseRings = this.noiseRings.filter((r) => r.life > 0);
    for (const f of this.footsteps) f.life -= dt;
    this.footsteps = this.footsteps.filter((f) => f.life > 0);
  }
}

export { COLS, ROWS };
