// Drawing: the museum at night, on one canvas. Everything is drawn in code
// — no images, no fonts from the network. The field is drawn with the HUD
// above it and a hint line below; the screens (title, caught, floor cleared,
// game over, victory) are overlays on the same picture.
import {
  CANVAS_H,
  CANVAS_W,
  COLORS,
  COLS,
  FIELD_Y,
  FOOT_H,
  HUD_H,
  ROWS,
  TILE,
} from './config.js';
import { conePolygon, tileCentre } from './vision.js';

function mmss(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function drawFloor(ctx, level, time) {
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      const ch = level.tiles[ty][tx];
      const x = tx * TILE;
      const y = ty * TILE;
      if (ch === '#') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, TILE, 5);
        ctx.fillStyle = COLORS.wallEdge;
        ctx.fillRect(x, y + TILE - 3, TILE, 3);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        continue;
      }
      ctx.fillStyle = (tx + ty) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = COLORS.floorLine;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      if (ch === 'R') {
        ctx.fillStyle = COLORS.rug;
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = COLORS.rugTrim;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 5.5, y + 5.5, TILE - 11, TILE - 11);
        ctx.lineWidth = 1;
      } else if (ch === 'S') {
        ctx.fillStyle = COLORS.shadow;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = 'rgba(120, 140, 220, 0.05)';
        ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
      }
    }
  }
}

function drawCover(ctx, level) {
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      const ch = level.tiles[ty][tx];
      const x = tx * TILE;
      const y = ty * TILE;
      if (ch === 'C') {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x + 3, y + 5, TILE - 4, TILE - 4);
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = COLORS.crateEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4);
        ctx.lineTo(x + TILE - 4, y + TILE - 4);
        ctx.moveTo(x + TILE - 4, y + 4);
        ctx.lineTo(x + 4, y + TILE - 4);
        ctx.stroke();
        ctx.lineWidth = 1;
      } else if (ch === 'P') {
        ctx.fillStyle = COLORS.plantPot;
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 18);
        ctx.lineTo(x + 24, y + 18);
        ctx.lineTo(x + 21, y + 29);
        ctx.lineTo(x + 11, y + 29);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = COLORS.plantLeafDark;
        ctx.beginPath();
        ctx.arc(x + 16, y + 12, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.plantLeaf;
        ctx.beginPath();
        ctx.arc(x + 12, y + 9, 7, 0, Math.PI * 2);
        ctx.arc(x + 20, y + 8, 7, 0, Math.PI * 2);
        ctx.arc(x + 16, y + 14, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawExit(ctx, level, open, time) {
  const { tx, ty } = level.exit;
  const x = tx * TILE;
  const y = ty * TILE;
  if (open) {
    const pulse = 0.75 + 0.25 * Math.sin(time * 3);
    const glow = ctx.createRadialGradient(x + 16, y + 16, 4, x + 16, y + 16, 44);
    glow.addColorStop(0, `rgba(255, 223, 138, ${0.5 * pulse})`);
    glow.addColorStop(1, 'rgba(255, 223, 138, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 28, y - 28, TILE + 56, TILE + 56);
    ctx.fillStyle = COLORS.exitOpen;
    ctx.fillRect(x + 6, y + 2, TILE - 12, TILE - 4);
    ctx.fillStyle = '#2a1f08';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', x + 16, y + 17);
  } else {
    ctx.fillStyle = COLORS.exitLocked;
    ctx.fillRect(x + 6, y + 2, TILE - 12, TILE - 4);
    ctx.strokeStyle = '#8a7a52';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 8);
    ctx.lineTo(x + TILE - 8, y + TILE - 8);
    ctx.moveTo(x + TILE - 8, y + 8);
    ctx.lineTo(x + 8, y + TILE - 8);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawRelics(ctx, level, time) {
  for (const relic of level.relics) {
    if (relic.taken) continue;
    const c = tileCentre(relic.tx, relic.ty);
    const pulse = 0.7 + 0.3 * Math.sin(time * 2.4 + relic.tx);
    const glow = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 30);
    glow.addColorStop(0, `rgba(255, 215, 106, ${0.45 * pulse})`);
    glow.addColorStop(1, 'rgba(255, 215, 106, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(c.x - 30, c.y - 30, 60, 60);
    ctx.fillStyle = COLORS.relic;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - 9);
    ctx.lineTo(c.x + 7, c.y);
    ctx.lineTo(c.x, c.y + 9);
    ctx.lineTo(c.x - 7, c.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - 5);
    ctx.lineTo(c.x + 3.5, c.y);
    ctx.lineTo(c.x, c.y + 5);
    ctx.lineTo(c.x - 3.5, c.y);
    ctx.closePath();
    ctx.fill();
  }
}

function coneColor(guard) {
  if (guard.state === 'chase') return COLORS.coneAlert;
  if (guard.state === 'seek') return COLORS.coneSeek;
  return COLORS.coneCalm;
}

function drawCones(ctx, level, guards) {
  for (const g of guards) {
    const poly = conePolygon(level, g);
    ctx.fillStyle = coneColor(g);
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = COLORS.coneCalmEdge;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawGuards(ctx, guards, time) {
  for (const g of guards) {
    // Detection ring under a guard that is onto something.
    if (g.detection > 0.02) {
      ctx.strokeStyle = g.detection > 0.85 ? COLORS.danger : '#ffcf5e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 17, -Math.PI / 2, -Math.PI / 2 + g.detection * Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.fillStyle = COLORS.guard;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.guardCap;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 12, g.angle - 1.1, g.angle + 1.1);
    ctx.lineTo(g.x, g.y);
    ctx.closePath();
    ctx.fill();
    // Facing wedge.
    ctx.fillStyle = '#dfe8f5';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.angle) * 7, g.y + Math.sin(g.angle) * 7, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // State marker.
    if (g.state === 'chase') {
      ctx.fillStyle = COLORS.danger;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 20);
    } else if (g.state === 'seek') {
      ctx.fillStyle = '#ffb347';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 20);
    }
  }
}

function drawPlayer(ctx, player, time) {
  const crouch = player.sneaking ? 0.82 : 1;
  const r = 11 * crouch;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 9, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.playerHood;
  ctx.beginPath();
  ctx.arc(player.x, player.y, r * 0.7, player.angle - 1.2, player.angle + 1.2);
  ctx.lineTo(player.x, player.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.angle) * r * 0.45, player.y + Math.sin(player.angle) * r * 0.45, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawFx(ctx, world) {
  for (const ring of world.noiseRings) {
    ctx.strokeStyle = `rgba(255, 220, 140, ${Math.max(0, ring.life)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  for (const f of world.footsteps) {
    ctx.fillStyle = f.who === 'guard' ? `rgba(190, 205, 235, ${f.life * 0.5})` : `rgba(140, 220, 190, ${f.life * 0.5})`;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud(ctx, world, muted) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, CANVAS_W, HUD_H);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Floor ${world.levelIndex + 1} · ${world.level.name}`, 12, HUD_H / 2);
  // Relics.
  ctx.textAlign = 'center';
  const rx = 380;
  for (let i = 0; i < world.relicTotal; i += 1) {
    const taken = i < world.collected;
    ctx.fillStyle = taken ? COLORS.relic : '#5a5344';
    ctx.beginPath();
    ctx.moveTo(rx + i * 24, 12);
    ctx.lineTo(rx + i * 24 + 6, 20);
    ctx.lineTo(rx + i * 24, 28);
    ctx.lineTo(rx + i * 24 - 6, 20);
    ctx.closePath();
    ctx.fill();
  }
  // Lives.
  ctx.fillStyle = '#ff7d6e';
  ctx.font = '16px sans-serif';
  ctx.fillText('♥'.repeat(world.lives) + '♡'.repeat(3 - world.lives), 480, HUD_H / 2 + 1);
  // Detection meter.
  const det = world.detection;
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '13px sans-serif';
  ctx.fillText('👁', 560, HUD_H / 2 + 1);
  ctx.fillStyle = '#3a3428';
  ctx.fillRect(580, 14, 120, 12);
  ctx.fillStyle = det > 0.85 ? COLORS.danger : det > 0.3 ? '#ffcf5e' : '#7ddb8a';
  ctx.fillRect(580, 14, 120 * det, 12);
  // Timer and score.
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(mmss(world.time), CANVAS_W - 150, HUD_H / 2);
  ctx.fillText(`${world.score} pts`, CANVAS_W - 12, HUD_H / 2);
  if (muted) {
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🔇', CANVAS_W - 132, HUD_H / 2 + 1);
  }
}

function drawFooter(ctx, world) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, CANVAS_H - FOOT_H, CANVAS_W, FOOT_H);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const hint = world.exitOpen
    ? 'The exit is open — reach the glowing door unseen'
    : 'WASD / arrows to move · Shift to sneak · click to walk · M sound · R restart';
  ctx.fillText(hint, CANVAS_W / 2, CANVAS_H - FOOT_H / 2);
}

function drawMessage(ctx, world) {
  if (world.messageTimer <= 0 || !world.message) return;
  const alpha = Math.min(1, world.messageTimer);
  ctx.fillStyle = `rgba(8, 10, 14, ${0.85 * alpha})`;
  const w = ctx.measureText(world.message).width + 36;
  ctx.fillRect((CANVAS_W - w) / 2, HUD_H + 10, w, 30);
  ctx.fillStyle = `rgba(232, 224, 200, ${alpha})`;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(world.message, CANVAS_W / 2, HUD_H + 26);
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(6, 8, 12, 0.72)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, CANVAS_W / 2, CANVAS_H / 2 - 90);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '16px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS_W / 2, CANVAS_H / 2 - 30 + i * 26);
  });
}

function drawTitle(ctx, world) {
  overlay(
    ctx,
    'NIGHTSHADE',
    [
      'The Ashen Museum — three floors, nine relics, twelve guards.',
      '',
      'Steal every relic, then slip out through the exit — unseen.',
      'Guards patrol with vision cones. Crouch behind cover,',
      'sneak through the shadows, and walk the rugs in silence.',
      'A half-seen guard comes looking. A full alarm gives chase.',
      '',
      'WASD / arrows — move      Shift — sneak      Click — walk there',
      'M — sound      R — restart the floor',
      '',
      'Press Enter or click to begin',
    ],
    '#ffd76a',
  );
}

function drawCaught(ctx, world) {
  ctx.fillStyle = `rgba(160, 20, 10, ${Math.min(0.45, world.caughtFlash)})`;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  overlay(ctx, 'CAUGHT!', [`The night watch found you.`, `${world.lives} ${world.lives === 1 ? 'life' : 'lives'} left — back to the door…`], COLORS.danger);
}

function drawComplete(ctx, world) {
  const ghost = !world.alertedThisLevel ? `Ghost bonus +${150} — never spotted on this floor.` : 'Spotted once — no ghost bonus this floor.';
  overlay(
    ctx,
    'FLOOR CLEARED',
    [
      `${world.level.name} — all ${world.relicTotal} relics stolen.`,
      ghost,
      `Score: ${world.score} pts`,
      '',
      'Press Enter for the next floor',
    ],
    COLORS.ok,
  );
}

function drawOver(ctx, world) {
  overlay(
    ctx,
    'THE WATCH WINS',
    [
      'Three times caught — the museum keeps its relics tonight.',
      `Score: ${world.score} pts · Time: ${mmss(world.time)}`,
      '',
      'Press Enter to try again',
    ],
    COLORS.danger,
  );
}

function drawWin(ctx, world) {
  overlay(
    ctx,
    'THE MUSEUM SLEEPS',
    [
      'All nine relics, all three floors — and nobody saw a thing.',
      `Score: ${world.score} pts · Time: ${mmss(world.time)}`,
      '',
      'Press Enter to play again',
    ],
    '#ffd76a',
  );
}

// Draw the whole frame: the field, the HUD, the message, and the screen's
// overlay when the game is not in plain play.
export function draw(ctx, world, screen, muted, time) {
  ctx.fillStyle = COLORS.page;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.save();
  ctx.translate(0, FIELD_Y);
  drawFloor(ctx, world.level, time);
  drawCones(ctx, world.level, world.guards);
  drawCover(ctx, world.level);
  drawExit(ctx, world.level, world.exitOpen, time);
  drawRelics(ctx, world.level, time);
  drawFx(ctx, world);
  drawGuards(ctx, world.guards, time);
  drawPlayer(ctx, world.player, time);
  ctx.restore();
  // A soft vignette, so the room feels lit from within.
  const vg = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.35, CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawHud(ctx, world, muted);
  drawFooter(ctx, world);
  drawMessage(ctx, world);
  if (screen === 'title') drawTitle(ctx, world);
  else if (screen === 'caught') drawCaught(ctx, world);
  else if (screen === 'complete') drawComplete(ctx, world);
  else if (screen === 'over') drawOver(ctx, world);
  else if (screen === 'win') drawWin(ctx, world);
}
