// TIDEWARDEN world: all game state and rules. No drawing here (render.js),
// no DOM here — main.js wires input and the loop around this.
import {
  VIEW, LANES, PLOT_COLS, PLOT_R, TIDE, ECONOMY, TOWERS, TOWER_ORDER,
  ENEMIES, WAVES, BUILD_SECONDS, SPAWN_INTERVAL, FIELD_LEFT,
} from './config.js';
import { makeRng, pick } from './random.js';
import { loadBest, saveBest } from './storage.js';

export function waterEdge(tide) {
  return 1280 - (tide / 100) * (1280 - 210);
}

export function createWorld(seed, audio) {
  const rng = makeRng(seed ?? 1337);
  const world = {
    state: 'title', // title | playing | paused | gameover | victory
    time: 0,
    tide: 35,
    tideHeld: false,
    leakAcc: 0,
    leakFlash: 0,
    hearts: ECONOMY.startHearts,
    shells: ECONOMY.startShells,
    score: 0,
    kills: 0,
    drowned: 0,
    wave: 0,
    waveActive: false,
    buildTimer: BUILD_SECONDS,
    spawnQueue: [],
    spawnTimer: 0,
    enemies: [],
    towers: [],
    projectiles: [],
    particles: [],
    floats: [],
    selected: null, // tower type key or null
    banner: null, // { text, sub, t, dur }
    shake: 0,
    flashRed: 0,
    best: loadBest(),
    newBest: false,
    rng,
    audio,
    // demo scene behind the title screen
    demo: false,
  };

  // ---- helpers -----------------------------------------------------------
  function addFloat(x, y, text, color) {
    world.floats.push({ x, y, text, color: color || '#ffffff', t: 0, dur: 1.1 });
  }

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      const s = (speed || 90) * (0.4 + rng() * 0.8);
      world.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30,
        r: 2 + rng() * 3.5, color, t: 0, dur: 0.5 + rng() * 0.5, kind: 'spark',
      });
    }
  }

  function bubbles(x, y, n) {
    for (let i = 0; i < n; i++) {
      world.particles.push({
        x: x + (rng() - 0.5) * 24, y: y + (rng() - 0.5) * 10,
        vx: (rng() - 0.5) * 12, vy: -(25 + rng() * 35),
        r: 2 + rng() * 4, color: '#bdefff', t: 0, dur: 0.8 + rng() * 0.7, kind: 'bubble',
      });
    }
  }

  function showBanner(text, sub, dur) {
    world.banner = { text, sub: sub || '', t: 0, dur: dur || 2.2 };
  }

  function plotAt(x, y) {
    for (let li = 0; li < LANES.length; li++) {
      for (let ci = 0; ci < PLOT_COLS.length; ci++) {
        const px = PLOT_COLS[ci];
        const py = LANES[li];
        if (Math.hypot(x - px, y - py) <= PLOT_R + 8) return { lane: li, col: ci, x: px, y: py };
      }
    }
    return null;
  }

  function towerAt(plot) {
    return world.towers.find((t) => t.lane === plot.lane && t.col === plot.col);
  }

  // ---- waves -------------------------------------------------------------
  function buildSpawnQueue(wave) {
    const comp = WAVES[wave - 1];
    const queue = [];
    const counts = comp.map(([type, n]) => ({ type, left: n }));
    let lane = Math.floor(rng() * 3);
    while (counts.some((c) => c.left > 0)) {
      const avail = counts.filter((c) => c.left > 0);
      const c = pick(rng, avail);
      c.left -= 1;
      queue.push({ type: c.type, lane });
      lane = (lane + Math.floor(rng() * 3)) % 3;
    }
    return queue;
  }

  function startWave(n) {
    world.wave = n;
    world.waveActive = true;
    world.spawnQueue = buildSpawnQueue(n);
    world.spawnTimer = 0.6;
    world.buildTimer = 0;
    showBanner(`WAVE ${n}`, n === 10 ? 'The Tide King rises!' : `${world.spawnQueue.length} enemies march in`, 2.4);
    audio.horn();
  }

  function spawnEnemy(type, lane) {
    const def = ENEMIES[type];
    const hpMul = 1 + 0.12 * (world.wave - 1);
    const spMul = 1 + 0.03 * (world.wave - 1);
    const y = LANES[lane] + (rng() - 0.5) * 44;
    world.enemies.push({
      type, lane, def,
      x: 1280 + 24 + rng() * 40, y,
      hp: Math.round(def.hp * hpMul), maxHp: Math.round(def.hp * hpMul),
      speed: def.speed * spMul, reward: def.reward, hearts: def.hearts,
      flying: def.flying, drownMul: def.drownMul, r: def.r,
      slowUntil: 0, slowMul: 1, wob: rng() * Math.PI * 2, bob: 0,
    });
  }

  function waveCleared() {
    const bonus = ECONOMY.waveClearBonus(world.wave);
    world.shells += bonus;
    world.score += bonus * 2;
    addFloat(640, 300, `WAVE ${world.wave} CLEAR  +${bonus} 🐚`, '#ffb703');
    audio.coin();
    if (world.wave >= 10) {
      winGame();
      return;
    }
    world.waveActive = false;
    world.buildTimer = BUILD_SECONDS;
    showBanner('BUILD PHASE', `Next wave in ${BUILD_SECONDS}s — press N to send it now`, 2.0);
  }

  function winGame() {
    world.state = 'victory';
    world.score += world.hearts * 50;
    if (world.score > world.best) {
      world.best = world.score;
      world.newBest = true;
      saveBest(world.score);
    }
    audio.victory();
  }

  function loseGame() {
    world.state = 'gameover';
    if (world.score > world.best) {
      world.best = world.score;
      world.newBest = true;
      saveBest(world.score);
    }
    audio.defeat();
  }

  // ---- combat ------------------------------------------------------------
  function fireTower(tower, target) {
    const def = TOWERS[tower.type];
    tower.cooldown = def.rate;
    tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
    tower.flash = 0.12;
    world.projectiles.push({
      x: tower.x, y: tower.y - 14,
      target, lastX: target.x, lastY: target.y,
      speed: 560, dmg: def.dmg, splash: def.splash,
      kind: tower.type === 'mortar' ? 'shell' : 'harpoon',
    });
    if (tower.type === 'harpoon') audio.harpoon();
    else if (tower.type === 'mortar') audio.mortar();
  }

  function damageEnemy(e, dmg, cause) {
    e.hp -= dmg;
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      world.kills += 1;
      world.shells += e.reward;
      world.score += 10 + e.reward;
      if (cause === 'drown') world.drowned += 1;
      addFloat(e.x, e.y - 18, `+${e.reward} 🐚`, '#ffb703');
      burst(e.x, e.y, e.def.color, e.type === 'king' ? 26 : 10, 110);
      if (e.type === 'king') {
        showBanner('THE TIDE KING FALLS!', '', 2.5);
        burst(e.x, e.y, '#e0aaff', 40, 160);
      }
      audio.coin();
    }
  }

  // ---- public actions ----------------------------------------------------
  function buildTower(type, plot) {
    const def = TOWERS[type];
    if (!def) return false;
    if (towerAt(plot)) return false;
    if (world.shells < def.cost) {
      addFloat(plot.x, plot.y - 30, 'Not enough shells!', '#ef476f');
      return false;
    }
    world.shells -= def.cost;
    world.towers.push({
      type, lane: plot.lane, col: plot.col, x: plot.x, y: plot.y,
      cooldown: 0, angle: -Math.PI / 2, flash: 0, level: 1,
    });
    burst(plot.x, plot.y, def.color, 12, 100);
    audio.build();
    return true;
  }

  function sellTower(tower) {
    const refund = Math.floor(TOWERS[tower.type].cost * ECONOMY.sellRefund);
    world.shells += refund;
    world.towers = world.towers.filter((t) => t !== tower);
    addFloat(tower.x, tower.y - 30, `+${refund} 🐚`, '#ffb703');
    audio.coin();
  }

  function sendNextWave() {
    if (world.state !== 'playing' || world.waveActive) return;
    if (world.wave >= 10) return;
    startWave(world.wave + 1);
  }

  function startGame() {
    world.state = 'playing';
    world.wave = 0;
    world.waveActive = false;
    world.buildTimer = 3;
    world.hearts = ECONOMY.startHearts;
    world.shells = ECONOMY.startShells;
    world.score = 0;
    world.kills = 0;
    world.drowned = 0;
    world.tide = 35;
    world.enemies = [];
    world.towers = [];
    world.projectiles = [];
    world.particles = [];
    world.floats = [];
    world.selected = null;
    showBanner('HOLD THE LINE', 'The sea is coming. Hold SPACE to raise the tide.', 2.6);
    audio.horn();
  }

  function restart() {
    startGame();
  }

  // ---- per-frame update --------------------------------------------------
  function update(dt) {
    world.time += dt;
    // particles and floats always animate (even on overlays)
    for (const p of world.particles) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'bubble') p.vy -= 20 * dt;
      else p.vy += 140 * dt;
    }
    world.particles = world.particles.filter((p) => p.t < p.dur);
    for (const f of world.floats) {
      f.t += dt;
      f.y -= 26 * dt;
    }
    world.floats = world.floats.filter((f) => f.t < f.dur);
    if (world.banner) {
      world.banner.t += dt;
      if (world.banner.t > world.banner.dur) world.banner = null;
    }
    if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 3);
    if (world.flashRed > 0) world.flashRed = Math.max(0, world.flashRed - dt * 2);
    if (world.leakFlash > 0) world.leakFlash = Math.max(0, world.leakFlash - dt);

    // frozen scenes (screenshots) never advance the simulation
    if (world.frozen) return;

    if (world.state === 'title' && world.demo) {
      // gentle tide drift behind the title
      world.tide = 42 + Math.sin(world.time * 0.4) * 12;
      return;
    }
    if (world.state !== 'playing') return;

    // --- the tide: the one mechanic ---
    const edge = waterEdge(world.tide);
    if (world.tideHeld) {
      world.tide = Math.min(100, world.tide + TIDE.risePerSec * dt);
    } else {
      world.tide = Math.max(0, world.tide - TIDE.ebbPerSec * dt);
    }
    audio.setTideLevel(world.tide / 100);

    // leak above 85%
    if (world.tide > TIDE.leakAt) {
      world.leakAcc += dt;
      world.leakFlash = Math.max(world.leakFlash, 0.4);
      if (world.leakAcc >= TIDE.leakEvery) {
        world.leakAcc = 0;
        world.hearts -= 1;
        world.flashRed = 0.7;
        world.shake = 0.5;
        addFloat(110, 200, 'LEAK! -1 ❤', '#ef476f');
        audio.leak();
        if (world.hearts <= 0) {
          world.hearts = 0;
          loseGame();
          return;
        }
      }
    } else {
      world.leakAcc = 0;
    }

    // --- build phase / spawning ---
    if (!world.waveActive) {
      world.buildTimer -= dt;
      if (world.buildTimer <= 0 && world.wave < 10) startWave(world.wave + 1);
    } else if (world.spawnQueue.length > 0) {
      world.spawnTimer -= dt;
      if (world.spawnTimer <= 0) {
        world.spawnTimer = SPAWN_INTERVAL;
        const next = world.spawnQueue.shift();
        spawnEnemy(next.type, next.lane);
      }
    }

    // --- enemies ---
    const nowEdge = waterEdge(world.tide);
    for (const e of world.enemies) {
      e.wob += dt * 6;
      e.bob = Math.sin(e.wob) * (e.flying ? 5 : 2);
      let slow = 1;
      if (e.slowUntil > world.time) slow = Math.min(slow, e.slowMul);
      const inWater = !e.flying && e.x > nowEdge;
      if (inWater) {
        slow *= TIDE.waterSlow;
        e.hp -= TIDE.drownPerSec * e.drownMul * dt;
        if (rng() < dt * 3) bubbles(e.x, e.y, 1);
        if (e.hp <= 0 && !e.dead) damageEnemy(e, 0, 'drown');
      }
      e.x -= e.speed * slow * dt;
      if (e.x < FIELD_LEFT + 8 && !e.dead) {
        e.dead = true;
        e.breached = true;
        world.hearts -= e.hearts;
        world.flashRed = 0.8;
        world.shake = 0.6;
        addFloat(150, e.y, `-${e.hearts} ❤`, '#ef476f');
        audio.hurt();
        if (world.hearts <= 0) {
          world.hearts = 0;
          loseGame();
          return;
        }
      }
    }
    world.enemies = world.enemies.filter((e) => !e.dead);

    // --- towers ---
    for (const t of world.towers) {
      if (t.flash > 0) t.flash -= dt;
      if (t.cooldown > 0) t.cooldown -= dt;
      const submerged = t.x > nowEdge;
      t.submerged = submerged;
      if (submerged) continue;
      const def = TOWERS[t.type];
      if (t.type === 'tidepool') {
        for (const e of world.enemies) {
          const d = Math.hypot(e.x - t.x, e.y - t.y);
          if (d < def.slowRadius) {
            e.slowUntil = world.time + 0.4;
            e.slowMul = def.slow;
          }
        }
        continue;
      }
      if (t.cooldown > 0) continue;
      // nearest-to-lighthouse enemy in range (harpoon may hit gulls)
      let bestTarget = null;
      let bestX = Infinity;
      for (const e of world.enemies) {
        if (e.flying && !def.canHitFlying) continue;
        const d = Math.hypot(e.x - t.x, e.y - t.y);
        if (d <= def.range && e.x < bestX) {
          bestX = e.x;
          bestTarget = e;
        }
      }
      if (bestTarget) fireTower(t, bestTarget);
    }

    // --- projectiles ---
    for (const p of world.projectiles) {
      if (p.target && !p.target.dead) {
        p.lastX = p.target.x;
        p.lastY = p.target.y;
      }
      const dx = p.lastX - p.x;
      const dy = p.lastY - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= step + 6) {
        if (p.splash > 0) {
          burst(p.lastX, p.lastY, '#e07a9a', 10, 90);
          for (const e of world.enemies) {
            if (e.flying) continue;
            if (Math.hypot(e.x - p.lastX, e.y - p.lastY) <= p.splash) damageEnemy(e, p.dmg, 'mortar');
          }
        } else if (p.target && !p.target.dead) {
          damageEnemy(p.target, p.dmg, 'harpoon');
          burst(p.lastX, p.lastY, '#ffd166', 5, 80);
        }
        p.done = true;
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }
    world.projectiles = world.projectiles.filter((p) => !p.done);
    world.enemies = world.enemies.filter((e) => !e.dead);

    // --- wave cleared? ---
    if (world.waveActive && world.spawnQueue.length === 0 && world.enemies.length === 0) {
      waveCleared();
    }
  }

  // ---- click handling ----------------------------------------------------
  function handleClick(x, y) {
    if (world.state === 'title') return 'title';
    if (world.state === 'gameover' || world.state === 'victory') return 'end';
    if (world.state === 'paused') return 'paused';
    // bottom bar: tower cards
    const cards = { x: 24, y: 648, w: 190, h: 60, gap: 12 };
    for (let i = 0; i < TOWER_ORDER.length; i++) {
      const cx = cards.x + i * (cards.w + cards.gap);
      if (x >= cx && x <= cx + cards.w && y >= cards.y && y <= cards.y + cards.h) {
        const type = TOWER_ORDER[i];
        world.selected = world.selected === type ? null : type;
        audio.click();
        return 'card';
      }
    }
    // tide button: hold is handled by input; a click here just toggles nothing
    // plots
    const plot = plotAt(x, y);
    if (plot) {
      const existing = towerAt(plot);
      if (existing) {
        if (!world.selected) {
          sellTower(existing);
          return 'sell';
        }
        return 'occupied';
      }
      if (world.selected) {
        const ok = buildTower(world.selected, plot);
        if (ok) world.selected = null;
        return ok ? 'build' : 'poor';
      }
      return 'plot';
    }
    return 'field';
  }

  // ---- test hooks (used by the headless driver only) ---------------------
  const test = {
    addShells(n) { world.shells += n; },
    hurt(n) {
      world.hearts -= n;
      if (world.hearts <= 0) { world.hearts = 0; loseGame(); }
    },
    startWave(n) { if (world.state === 'playing') startWave(n); },
    sendNextWave() { sendNextWave(); },
    killAll() {
      for (const e of [...world.enemies]) damageEnemy(e, 99999, 'test');
    },
    setTide(n) { world.tide = Math.max(0, Math.min(100, n)); },
    win() { world.wave = 10; winGame(); },
    state() {
      return {
        state: world.state, score: world.score, shells: world.shells,
        hearts: world.hearts, wave: world.wave, tide: Math.round(world.tide),
        enemies: world.enemies.length, towers: world.towers.length,
        kills: world.kills, drowned: world.drowned, best: world.best,
      };
    },
  };

  world.update = update;
  world.startGame = startGame;
  world.restart = restart;
  world.sendNextWave = sendNextWave;
  world.handleClick = handleClick;
  world.plotAt = plotAt;
  world.towerAt = towerAt;
  world.buildTower = buildTower;
  world.waterEdge = () => waterEdge(world.tide);
  world.test = test;

  return world;
}
