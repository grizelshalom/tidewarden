// TIDEWARDEN renderer: every pixel on the canvas. Pure drawing — it reads
// the world and the input (for hover states) and draws the whole scene.
import {
  VIEW, LANES, PLOT_COLS, PLOT_R, TIDE, TOWERS, TOWER_ORDER, ENEMIES,
  PALETTE, UI, FIELD_TOP, FIELD_BOTTOM, FIELD_LEFT,
} from './config.js';
import { waterEdge } from './world.js';

function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align, weight) {
  ctx.fillStyle = color;
  ctx.font = `${weight || 'bold'} ${size}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawBackground(w) {
    // sand
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(0, FIELD_TOP, VIEW.w, FIELD_BOTTOM - FIELD_TOP);
    // sand speckles (deterministic hash so they never shimmer)
    ctx.fillStyle = 'rgba(180,140,70,0.25)';
    for (let gx = 0; gx < 64; gx++) {
      for (let gy = 0; gy < 32; gy++) {
        const x = gx * 20 + hash2(gx, gy) * 14;
        const y = FIELD_TOP + gy * 18 + hash2(gy, gx) * 12;
        ctx.fillRect(x, y, 3, 2);
      }
    }
    // lane paths
    for (const ly of LANES) {
      ctx.fillStyle = 'rgba(217,169,92,0.35)';
      ctx.fillRect(FIELD_LEFT, ly - 46, VIEW.w - FIELD_LEFT, 92);
      ctx.strokeStyle = 'rgba(217,169,92,0.6)';
      ctx.setLineDash([10, 14]);
      ctx.beginPath();
      ctx.moveTo(FIELD_LEFT + 8, ly);
      ctx.lineTo(VIEW.w - 8, ly);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // village strip
    ctx.fillStyle = PALETTE.village;
    ctx.fillRect(0, FIELD_TOP, FIELD_LEFT, FIELD_BOTTOM - FIELD_TOP);
    ctx.fillStyle = PALETTE.sandDark;
    ctx.fillRect(FIELD_LEFT - 6, FIELD_TOP, 6, FIELD_BOTTOM - FIELD_TOP);
    drawLighthouse(w);
  }

  function drawLighthouse(w) {
    const cx = 62;
    const top = 150;
    const bot = 560;
    // tower
    ctx.fillStyle = '#fff8e7';
    ctx.fillRect(cx - 26, top, 52, bot - top);
    ctx.fillStyle = '#ef476f';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(cx - 26, top + i * 82, 52, 26);
    }
    // lamp room
    ctx.fillStyle = '#06283d';
    ctx.fillRect(cx - 20, top - 34, 40, 34);
    ctx.fillStyle = '#ffe66d';
    ctx.beginPath();
    ctx.arc(cx, top - 17, 12, 0, Math.PI * 2);
    ctx.fill();
    // rotating beam
    const a = w.time * 0.7;
    const bx = cx + Math.cos(a) * 200;
    const by = top - 17 + Math.sin(a) * 90;
    const grad = ctx.createLinearGradient(cx, top - 17, bx, by);
    grad.addColorStop(0, 'rgba(255,230,109,0.35)');
    grad.addColorStop(1, 'rgba(255,230,109,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, top - 17);
    ctx.lineTo(bx + 26, by + 10);
    ctx.lineTo(bx - 26, by - 10);
    ctx.closePath();
    ctx.fill();
    // little houses
    drawHouse(58, 96, '#e07a9a');
    drawHouse(58, 620, '#4cc9f0');
  }

  function drawHouse(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - 22, y, 44, 30);
    ctx.fillStyle = '#7b2cbf';
    ctx.beginPath();
    ctx.moveTo(x - 26, y);
    ctx.lineTo(x, y - 18);
    ctx.lineTo(x + 26, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3d6';
    ctx.fillRect(x - 6, y + 12, 12, 18);
  }

  function drawPlots(w, input) {
    for (let li = 0; li < LANES.length; li++) {
      for (let ci = 0; ci < PLOT_COLS.length; ci++) {
        const x = PLOT_COLS[ci];
        const y = LANES[li];
        const tower = w.towers.find((t) => t.lane === li && t.col === ci);
        const hovered = Math.hypot(input.mouse.x - x, input.mouse.y - y) <= PLOT_R + 8;
        ctx.beginPath();
        ctx.arc(x, y, PLOT_R, 0, Math.PI * 2);
        ctx.fillStyle = tower ? 'rgba(120,90,40,0.35)' : 'rgba(255,255,255,0.25)';
        ctx.fill();
        ctx.strokeStyle = tower ? '#8a6d3b' : (hovered && w.selected ? '#ffb703' : 'rgba(120,90,40,0.55)');
        ctx.lineWidth = hovered && w.selected ? 3 : 2;
        ctx.setLineDash(tower ? [] : [6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
        if (!tower && hovered && w.selected) {
          text(ctx, TOWERS[w.selected].cost + ' 🐚', x, y - PLOT_R - 12, 13, '#06283d', 'center');
        }
      }
    }
  }

  function drawTower(t) {
    const def = TOWERS[t.type];
    ctx.save();
    if (t.submerged) ctx.globalAlpha = 0.45;
    ctx.translate(t.x, t.y);
    if (t.type === 'harpoon') {
      ctx.fillStyle = '#8a6d3b';
      ctx.fillRect(-16, -8, 32, 22);
      ctx.fillStyle = '#5d4a26';
      ctx.fillRect(-20, 10, 40, 8);
      ctx.save();
      ctx.rotate(t.angle);
      ctx.strokeStyle = '#3d2f16';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(26, -6);
      ctx.stroke();
      ctx.fillStyle = '#c0c0c0';
      ctx.beginPath();
      ctx.moveTo(32, -6);
      ctx.lineTo(22, -11);
      ctx.lineTo(22, -1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (t.flash > 0) {
        ctx.fillStyle = 'rgba(255,215,0,0.8)';
        ctx.beginPath();
        ctx.arc(30, -6, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (t.type === 'tidepool') {
      const pulse = 1 + Math.sin(Date.now() / 300) * 0.08;
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(76,201,240,0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-6, -4, 4, 0, Math.PI * 2);
      ctx.arc(7, 5, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#6c757d';
      ctx.beginPath();
      ctx.arc(0, 4, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#495057';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.rotate(t.angle);
      ctx.fillStyle = '#343a40';
      ctx.fillRect(0, -5, 26, 10);
      ctx.restore();
      if (t.flash > 0) {
        ctx.fillStyle = 'rgba(255,180,100,0.9)';
        ctx.beginPath();
        ctx.arc(28, 0, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    if (t.submerged) {
      text(ctx, '💧', t.x, t.y - PLOT_R - 8, 15, '#1b7fa8', 'center');
    }
  }

  function drawEnemy(e, w) {
    const y = e.y + e.bob;
    // shadow (flying enemies cast one on the sand)
    if (e.flying) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + 14, e.r, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(e.x, y);
    if (e.type === 'crab') {
      const wob = Math.sin(e.wob) * 0.12;
      ctx.rotate(wob);
      ctx.strokeStyle = '#c1440e';
      ctx.lineWidth = 3;
      for (let s = -1; s <= 1; s += 2) {
        for (let l = 0; l < 3; l++) {
          ctx.beginPath();
          ctx.moveTo(s * 10, -4 + l * 6);
          ctx.lineTo(s * 20, -10 + l * 8);
          ctx.stroke();
        }
      }
      ctx.fillStyle = e.def.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-6, -8, 4, 0, Math.PI * 2);
      ctx.arc(6, -8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#06283d';
      ctx.beginPath();
      ctx.arc(-6, -8, 2, 0, Math.PI * 2);
      ctx.arc(6, -8, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff8c42';
      ctx.beginPath();
      ctx.arc(-20, 4, 6, 0, Math.PI * 2);
      ctx.arc(20, 4, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'gull') {
      const flap = Math.sin(e.wob * 1.6) * 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.save();
      ctx.rotate(-flap);
      ctx.beginPath();
      ctx.ellipse(-8, -8, 14, 5, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.rotate(flap);
      ctx.beginPath();
      ctx.ellipse(-8, 6, 14, 5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#f8f9fa';
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.moveTo(-14, -2);
      ctx.lineTo(-22, 1);
      ctx.lineTo(-14, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#06283d';
      ctx.beginPath();
      ctx.arc(-9, -3, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'turtle') {
      ctx.fillStyle = '#2d6a4f';
      ctx.beginPath();
      ctx.ellipse(0, 2, 20, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = e.def.color;
      ctx.beginPath();
      ctx.arc(0, -2, 17, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#2d6a4f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -2, 11, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = '#80b918';
      ctx.beginPath();
      ctx.arc(-19, -2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#06283d';
      ctx.beginPath();
      ctx.arc(-20, -4, 1.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Tide King: big crowned crab
      ctx.fillStyle = '#5a189a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 34, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9d4edd';
      ctx.beginPath();
      ctx.ellipse(0, -4, 28, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.moveTo(-22, -22);
      ctx.lineTo(-16, -38);
      ctx.lineTo(-10, -24);
      ctx.lineTo(0, -42);
      ctx.lineTo(10, -24);
      ctx.lineTo(16, -38);
      ctx.lineTo(22, -22);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-11, -12, 6, 0, Math.PI * 2);
      ctx.arc(11, -12, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef476f';
      ctx.beginPath();
      ctx.arc(-11, -12, 3, 0, Math.PI * 2);
      ctx.arc(11, -12, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // hp bar
    if (e.hp < e.maxHp) {
      const bw = e.r * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(e.x - bw / 2, y - e.r - 12, bw, 5);
      ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#80b918' : '#ef476f';
      ctx.fillRect(e.x - bw / 2, y - e.r - 12, bw * Math.max(0, e.hp / e.maxHp), 5);
    }
  }

  function drawWater(w) {
    const edge = waterEdge(w.tide);
    if (edge >= VIEW.w) return;
    const grad = ctx.createLinearGradient(edge, 0, VIEW.w, 0);
    grad.addColorStop(0, 'rgba(94,196,220,0.85)');
    grad.addColorStop(0.4, 'rgba(27,127,168,0.88)');
    grad.addColorStop(1, 'rgba(11,61,92,0.92)');
    ctx.fillStyle = grad;
    ctx.fillRect(edge, FIELD_TOP, VIEW.w - edge, FIELD_BOTTOM - FIELD_TOP);
    // animated foam edge
    ctx.strokeStyle = PALETTE.foam;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let y = FIELD_TOP; y <= FIELD_BOTTOM; y += 12) {
      const x = edge + Math.sin(y / 26 + w.time * 2.2) * 7;
      if (y === FIELD_TOP) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // wave streaks inside the water
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const yy = FIELD_TOP + 70 + i * 130 + Math.sin(w.time + i * 2) * 8;
      ctx.beginPath();
      for (let x = edge + 30; x < VIEW.w - 10; x += 24) {
        const y = yy + Math.sin(x / 40 + w.time * 1.6 + i) * 5;
        if (x === edge + 30) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function drawProjectiles(w) {
    for (const p of w.projectiles) {
      if (p.kind === 'harpoon') {
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.lastX - p.x) * 0.02, p.y - (p.lastY - p.y) * 0.02);
        ctx.stroke();
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#e07a9a';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x - 2, p.y - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawParticles(w) {
    for (const p of w.particles) {
      const a = 1 - p.t / p.dur;
      if (p.kind === 'bubble') {
        ctx.strokeStyle = `rgba(189,239,255,${a})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * a + 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    for (const f of w.floats) {
      const a = 1 - f.t / f.dur;
      ctx.globalAlpha = a;
      text(ctx, f.text, f.x, f.y, 16, f.color, 'center');
      ctx.globalAlpha = 1;
    }
  }

  // ---- HUD -----------------------------------------------------------------
  function drawTopHud(w) {
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, VIEW.w, 64);
    ctx.fillStyle = PALETTE.panelLine;
    ctx.fillRect(0, 62, VIEW.w, 2);
    text(ctx, `❤ ${w.hearts}`, 20, 33, 24, w.hearts <= 3 ? '#ef476f' : '#ff8fa3');
    text(ctx, `🐚 ${w.shells}`, 130, 33, 24, '#ffb703');
    text(ctx, `⭐ ${w.score}`, 250, 33, 24, '#ffffff');
    text(ctx, `🏆 ${w.best}`, 380, 33, 18, '#c9d6df');

    // tide gauge — the mechanic, big and always visible
    const gx = 540, gw = 330, gy = 16, gh = 32;
    ctx.fillStyle = '#06283d';
    roundRect(ctx, gx, gy, gw, gh, 8);
    ctx.fill();
    const fillW = gw * (w.tide / 100);
    const tgrad = ctx.createLinearGradient(gx, 0, gx + gw, 0);
    tgrad.addColorStop(0, '#5ec4dc');
    tgrad.addColorStop(1, '#1b7fa8');
    ctx.fillStyle = tgrad;
    if (fillW > 4) {
      roundRect(ctx, gx + 2, gy + 2, fillW - 4, gh - 4, 6);
      ctx.fill();
    }
    // leak line at 85%
    const lx = gx + gw * (TIDE.leakAt / 100);
    ctx.strokeStyle = '#ef476f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, gy - 2);
    ctx.lineTo(lx, gy + gh + 2);
    ctx.stroke();
    const state = w.tideHeld ? 'RISING ▲' : (w.tide > TIDE.leakAt ? 'LEAK! ▼' : (w.tide > 55 ? 'HIGH' : (w.tide > 15 ? 'MID' : 'LOW')));
    const stateColor = w.tide > TIDE.leakAt ? '#ef476f' : '#ffffff';
    text(ctx, `🌊 TIDE ${Math.round(w.tide)}%`, gx + gw / 2, gy + gh / 2, 17, '#ffffff', 'center');
    text(ctx, state, gx + gw + 12, gy + gh / 2, 15, stateColor);

    // wave info, right side
    text(ctx, `WAVE ${Math.min(w.wave || 1, 10)}/10`, 1000, 24, 20, '#ffffff');
    const left = w.waveActive ? w.enemies.length + w.spawnQueue.length : 0;
    text(ctx, w.waveActive ? `👾 ${left} left` : (w.wave >= 10 ? 'FINAL' : `Next in ${Math.max(0, Math.ceil(w.buildTimer))}s`), 1000, 48, 15, '#c9d6df');
  }

  function drawBottomBar(w, input) {
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, VIEW.h - 80, VIEW.w, 80);
    ctx.fillStyle = PALETTE.panelLine;
    ctx.fillRect(0, VIEW.h - 80, VIEW.w, 2);
    // tower cards
    for (let i = 0; i < TOWER_ORDER.length; i++) {
      const type = TOWER_ORDER[i];
      const def = TOWERS[type];
      const cx = UI.cards.x + i * (UI.cards.w + UI.cards.gap);
      const cy = UI.cards.y;
      const hovered = input.mouse.x >= cx && input.mouse.x <= cx + UI.cards.w
        && input.mouse.y >= cy && input.mouse.y <= cy + UI.cards.h;
      const selected = w.selected === type;
      const afford = w.shells >= def.cost;
      ctx.fillStyle = selected ? '#1b7fa8' : (hovered ? '#123c55' : '#0a2e44');
      roundRect(ctx, cx, cy, UI.cards.w, UI.cards.h, 8);
      ctx.fill();
      ctx.strokeStyle = selected ? '#ffb703' : (afford ? def.color : '#555');
      ctx.lineWidth = selected ? 3 : 2;
      ctx.stroke();
      text(ctx, `[${def.key}] ${def.name}`, cx + 10, cy + 16, 15, afford ? '#ffffff' : '#888');
      text(ctx, `${def.cost} 🐚`, cx + 10, cy + 38, 14, afford ? '#ffb703' : '#ef476f');
      text(ctx, def.desc, cx + 10, cy + 52, 10, '#c9d6df');
    }
    // big tide button
    const tb = UI.tideButton;
    const tbHover = input.mouse.x >= tb.x && input.mouse.x <= tb.x + tb.w
      && input.mouse.y >= tb.y && input.mouse.y <= tb.y + tb.h;
    const held = w.tideHeld || tbHover;
    ctx.fillStyle = held ? '#1b7fa8' : '#0e4a6b';
    roundRect(ctx, tb.x, tb.y, tb.w, tb.h, 10);
    ctx.fill();
    ctx.strokeStyle = held ? '#ffffff' : '#5ec4dc';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, '🌊 HOLD TIDE', tb.x + tb.w / 2, tb.y + 24, 20, '#ffffff', 'center');
    text(ctx, 'hold mouse or SPACE', tb.x + tb.w / 2, tb.y + 48, 12, '#bdefff', 'center');
    // pause / mute / restart
    drawSmallBtn(UI.pauseBtn, w.state === 'paused' ? '▶' : '⏸', input);
    drawSmallBtn(UI.muteBtn, w.muted ? '🔇' : '🔊', input);
    drawSmallBtn(UI.restartBtn, '↻', input);
    // build-phase call to action
    if (w.state === 'playing' && !w.waveActive && w.wave < 10) {
      const pulse = 0.7 + Math.sin(w.time * 4) * 0.3;
      ctx.globalAlpha = pulse;
      text(ctx, 'Press N — send the next wave now', 640, 632, 15, '#ffb703', 'center');
      ctx.globalAlpha = 1;
    }
  }

  function drawSmallBtn(rect, label, input) {
    const hovered = input.mouse.x >= rect.x && input.mouse.x <= rect.x + rect.w
      && input.mouse.y >= rect.y && input.mouse.y <= rect.y + rect.h;
    ctx.fillStyle = hovered ? '#1b7fa8' : '#0a2e44';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#5ec4dc';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, 20, '#ffffff', 'center');
  }

  // ---- overlays -------------------------------------------------------------
  function dim(alpha) {
    ctx.fillStyle = `rgba(6,40,61,${alpha})`;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  }

  function panel(x, y, wpx, hpx) {
    ctx.fillStyle = 'rgba(10,46,68,0.94)';
    roundRect(ctx, x, y, wpx, hpx, 14);
    ctx.fill();
    ctx.strokeStyle = '#1b7fa8';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawTitle(w) {
    dim(0.45);
    panel(290, 96, 700, 500);
    text(ctx, '🌊 TIDEWARDEN 🌊', 640, 152, 52, '#5ec4dc', 'center');
    text(ctx, 'Hold the line against the sea', 640, 196, 22, '#ffb703', 'center');
    const lines = [
      'ONE MECHANIC: the tide. Hold SPACE (or the TIDE button) to raise it.',
      'Water drowns the crabs marching in — but it floods your towers too,',
      'and above 85% the village LEAKS a heart every 3 seconds.',
      '',
      '🦀 Crabs drown · 🕊 Gulls fly over water — shoot them down',
      '🐢 Turtles are tough · 👑 The Tide King cannot drown at all',
      '🖱 Click a tower card, then a sand plot to build. Click a tower to sell it.',
      'Survive all 10 waves. The lighthouse must stand.',
    ];
    lines.forEach((line, i) => {
      text(ctx, line, 640, 240 + i * 26, 16, line.startsWith('🦀') || line.startsWith('🖱') || line.startsWith('Survive') ? '#ffffff' : '#bdefff', 'center');
    });
    if (w.best > 0) text(ctx, `Best score: ${w.best}`, 640, 452, 18, '#ffb703', 'center');
    const b = UI.startBtn;
    ctx.fillStyle = '#ffb703';
    roundRect(ctx, b.x, b.y, b.w, b.h, 10);
    ctx.fill();
    text(ctx, '▶  START  (Enter)', b.x + b.w / 2, b.y + b.h / 2, 24, '#06283d', 'center');
    text(ctx, 'P pause · M mute · R restart · N send wave · 1/2/3 towers', 640, 566, 13, '#c9d6df', 'center');
  }

  function drawPaused(w) {
    dim(0.55);
    panel(440, 260, 400, 180);
    text(ctx, '⏸ PAUSED', 640, 310, 36, '#ffffff', 'center');
    text(ctx, 'Press P to resume · R to restart', 640, 360, 16, '#bdefff', 'center');
    text(ctx, `Wave ${w.wave}/10 · Score ${w.score}`, 640, 398, 16, '#ffb703', 'center');
  }

  function drawEnd(w, victory) {
    dim(0.6);
    panel(340, 150, 600, 420);
    if (victory) {
      text(ctx, '🏆 THE VILLAGE STANDS!', 640, 210, 40, '#ffb703', 'center');
      text(ctx, 'All 10 waves turned back. The sea retreats.', 640, 252, 18, '#bdefff', 'center');
    } else {
      text(ctx, '💔 THE TIDE TOOK THE VILLAGE', 640, 210, 34, '#ef476f', 'center');
      text(ctx, `The lighthouse fell on wave ${Math.max(1, w.wave)}.`, 640, 252, 18, '#bdefff', 'center');
    }
    text(ctx, `Score: ${w.score}`, 640, 310, 26, '#ffffff', 'center');
    text(ctx, `Best: ${w.best}${w.newBest ? '  ★ NEW BEST!' : ''}`, 640, 348, 20, '#ffb703', 'center');
    text(ctx, `Kills: ${w.kills}   Drowned: ${w.drowned}   Towers built: ${w.towers.length}`, 640, 388, 16, '#c9d6df', 'center');
    const b = UI.againBtn;
    ctx.fillStyle = '#ffb703';
    roundRect(ctx, b.x, b.y, b.w, b.h, 10);
    ctx.fill();
    text(ctx, '↻  PLAY AGAIN  (R)', b.x + b.w / 2, b.y + b.h / 2, 24, '#06283d', 'center');
  }

  function drawBanner(w) {
    if (!w.banner) return;
    const a = w.banner.t < 0.3 ? w.banner.t / 0.3 : (w.banner.t > w.banner.dur - 0.4 ? Math.max(0, (w.banner.dur - w.banner.t) / 0.4) : 1);
    ctx.globalAlpha = a;
    text(ctx, w.banner.text, 640, 130, 44, '#ffffff', 'center');
    if (w.banner.sub) text(ctx, w.banner.sub, 640, 168, 18, '#ffb703', 'center');
    ctx.globalAlpha = 1;
  }

  // ---- main draw -------------------------------------------------------------
  function draw(w, input) {
    ctx.save();
    if (w.shake > 0) {
      const s = w.shake * 8;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    ctx.clearRect(-20, -20, VIEW.w + 40, VIEW.h + 40);
    drawBackground(w);
    drawPlots(w, input);
    for (const t of w.towers) drawTower(t);
    drawWater(w);
    for (const e of w.enemies) drawEnemy(e, w);
    drawProjectiles(w);
    drawParticles(w);
    drawTopHud(w);
    drawBottomBar(w, input);
    if (w.flashRed > 0) {
      ctx.fillStyle = `rgba(239,71,111,${w.flashRed * 0.25})`;
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    }
    if (w.leakFlash > 0 && w.state === 'playing') {
      ctx.fillStyle = `rgba(239,71,111,${w.leakFlash * 0.18})`;
      ctx.fillRect(0, 0, VIEW.w, 64);
      text(ctx, '⚠ LEAK! Lower the tide! ⚠', 640, 100, 20, '#ef476f', 'center');
    }
    drawBanner(w);
    if (w.state === 'title') drawTitle(w);
    else if (w.state === 'paused') drawPaused(w);
    else if (w.state === 'gameover') drawEnd(w, false);
    else if (w.state === 'victory') drawEnd(w, true);
    ctx.restore();
  }

  return { draw };
}
