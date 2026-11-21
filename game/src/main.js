// Nightshade — the boot and the game loop. In normal play this runs the
// world at a fixed 60 steps a second, turns key presses and clicks into the
// player's moves, and moves between the screens (title, play, caught, floor
// cleared, game over, victory). With ?shot=<scene> it stages one screenshot
// scene instead and holds the finished frame still.
import { CANVAS_H, CANVAS_W, FIELD_Y, TILE } from './config.js';
import { Input } from './input.js';
import { draw } from './render.js';
import { stageShot } from './shots.js';
import { Sound } from './audio.js';
import { World, STATUS_CAUGHT, STATUS_COMPLETE, STATUS_OVER, STATUS_PLAY, STATUS_WIN } from './world.js';

const STEP = 1 / 60;
const CAUGHT_WAIT = 1.6;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;
const shot = params.get('shot');

const world = new World(seed);
const input = new Input(canvas);
const sound = new Sound();

let screen = 'title';
let screenTimer = 0;
let scoreAtLevelStart = 0;
let livesAtLevelStart = 3;
let time = 0;
let last = performance.now();
let acc = 0;

function announce(text) {
  if (statusLine) statusLine.textContent = text;
}

function playEvents() {
  for (const e of world.events) {
    if (e.type === 'footstep') sound.footstep();
    else if (e.type === 'guardstep') {
      const d = Math.hypot(e.x - world.player.x, e.y - world.player.y);
      if (d < 6 * TILE) sound.guardStep();
    } else if (e.type === 'pickup') sound.pickup();
    else if (e.type === 'alarm') sound.alarm();
    else if (e.type === 'caught') sound.caught();
    else if (e.type === 'level') sound.level();
    else if (e.type === 'win') sound.win();
  }
}

function beginRun() {
  sound.ensure();
  sound.click();
  world.restart();
  scoreAtLevelStart = 0;
  livesAtLevelStart = 3;
  screen = 'play';
  announce('The Grand Hall. Steal three relics, then reach the exit unseen.');
}

function handleKeys() {
  if (input.pressed('m')) {
    const muted = sound.toggleMute();
    announce(muted ? 'Sound off' : 'Sound on');
  }
  if (screen === 'title') {
    if (input.pressed('enter') || input.pressed(' ') || input.pressed('click')) beginRun();
    return;
  }
  if (screen === 'play') {
    if (input.pressed('r')) {
      world.score = scoreAtLevelStart;
      world.lives = livesAtLevelStart;
      world.loadLevel(world.levelIndex);
      announce('Floor restarted.');
    }
    return;
  }
  if (screen === 'complete') {
    if (input.pressed('enter') || input.pressed(' ') || input.pressed('click')) {
      sound.click();
      scoreAtLevelStart = world.score;
      livesAtLevelStart = world.lives;
      world.nextLevel();
      screen = 'play';
      announce(`${world.level.name}. Steal three relics, then reach the exit unseen.`);
    }
    return;
  }
  if (screen === 'over' || screen === 'win') {
    if (input.pressed('enter') || input.pressed(' ') || input.pressed('click')) {
      screen = 'title';
    }
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  time += dt;
  handleKeys();
  if (screen === 'play') {
    const { mx, my } = input.moveVector();
    let click = input.takeClick();
    if (click) {
      // Clicks land in canvas pixels; the world lives below the HUD.
      click = { x: click.x, y: click.y - FIELD_Y };
      if (click.y < 0) click = null;
    }
    if (mx !== 0 || my !== 0) click = null;
    acc += dt;
    while (acc >= STEP) {
      world.step(STEP, { mx, my, sneak: input.sneaking, click });
      playEvents();
      acc -= STEP;
      if (world.status === STATUS_CAUGHT) {
        screen = 'caught';
        screenTimer = 0;
        announce('Caught by a guard.');
        break;
      }
      if (world.status === STATUS_COMPLETE) {
        screen = 'complete';
        announce('Floor cleared.');
        break;
      }
      if (world.status === STATUS_OVER) {
        screen = 'over';
        announce('Game over. The night watch wins.');
        break;
      }
      if (world.status === STATUS_WIN) {
        screen = 'win';
        announce('You stole every relic. The museum sleeps.');
        break;
      }
    }
  } else if (screen === 'caught') {
    screenTimer += dt;
    if (screenTimer > CAUGHT_WAIT) {
      world.respawn();
      screen = 'play';
    }
  }
  draw(ctx, world, screen, sound.muted, time);
}

if (shot) {
  // Screenshot mode: stage the scene, draw it once, and hold it still.
  const staged = stageShot(shot, world);
  screen = staged.screen;
  time = 1.2;
  draw(ctx, world, screen, sound.muted, time);
  document.title = `Nightshade — shot ${shot}`;
} else {
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  requestAnimationFrame(frame);
}
