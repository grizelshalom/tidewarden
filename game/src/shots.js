// Deterministic screenshot scenes: ?shot=start|play|surge|victory&seed=N.
// Each scene builds a fixed world so the screenshots are real renders of the
// game itself, reproducible byte for byte from the same seed.
import { LANES, PLOT_COLS, ENEMIES } from './config.js';

function addTower(w, type, col, lane) {
  w.towers.push({
    type, lane, col, x: PLOT_COLS[col], y: LANES[lane],
    cooldown: 0, angle: -Math.PI / 2, flash: 0, level: 1,
  });
}

function addEnemy(w, type, lane, x, hpFrac) {
  const def = ENEMIES[type];
  const hp = Math.round(def.hp * (hpFrac ?? 1));
  w.enemies.push({
    type, lane, def,
    x, y: LANES[lane] + (lane % 2 === 0 ? 12 : -10),
    hp, maxHp: def.hp,
    speed: def.speed, reward: def.reward, hearts: def.hearts,
    flying: def.flying, drownMul: def.drownMul, r: def.r,
    slowUntil: 0, slowMul: 1, wob: lane * 1.7, bob: 0,
  });
}

export function buildShotScene(world, shot) {
  world.frozen = true; // the scene never advances: the screenshot is the scene
  world.enemies = [];
  world.towers = [];
  world.projectiles = [];
  world.particles = [];
  world.floats = [];
  world.banner = null;

  if (shot === 'start') {
    world.state = 'title';
    world.demo = true;
    world.tide = 42;
    world.best = 1240;
    addTower(world, 'harpoon', 1, 0);
    addTower(world, 'tidepool', 2, 1);
    addTower(world, 'mortar', 1, 2);
    addEnemy(world, 'crab', 0, 980, 1);
    addEnemy(world, 'crab', 1, 1120, 0.6);
    addEnemy(world, 'gull', 1, 900, 1);
    addEnemy(world, 'turtle', 2, 1060, 0.8);
    return;
  }

  if (shot === 'play') {
    world.state = 'playing';
    world.wave = 3;
    world.waveActive = true;
    world.tide = 55;
    world.hearts = 8;
    world.shells = 120;
    world.score = 340;
    world.kills = 31;
    world.drowned = 12;
    world.buildTimer = 0;
    addTower(world, 'harpoon', 1, 0);
    addTower(world, 'harpoon', 2, 1);
    addTower(world, 'tidepool', 3, 2);
    addTower(world, 'mortar', 1, 2);
    addEnemy(world, 'crab', 0, 760, 1);
    addEnemy(world, 'crab', 0, 900, 0.7);
    addEnemy(world, 'crab', 1, 640, 0.5);
    addEnemy(world, 'gull', 1, 820, 1);
    addEnemy(world, 'gull', 2, 980, 0.8);
    addEnemy(world, 'turtle', 2, 1080, 0.9);
    addEnemy(world, 'crab', 2, 700, 1);
    world.banner = { text: 'WAVE 3', sub: '12 enemies march in', t: 0.8, dur: 2.4 };
    return;
  }

  if (shot === 'surge') {
    world.state = 'playing';
    world.wave = 6;
    world.waveActive = true;
    world.tide = 86;
    world.leakFlash = 0.4;
    world.hearts = 6;
    world.shells = 90;
    world.score = 890;
    world.kills = 74;
    world.drowned = 38;
    world.buildTimer = 0;
    addTower(world, 'harpoon', 1, 0);
    addTower(world, 'mortar', 2, 1);
    addTower(world, 'tidepool', 1, 2);
    // a crowd of crabs caught in the rising water (water edge at tide 86 is ~x=350)
    addEnemy(world, 'crab', 0, 420, 0.4);
    addEnemy(world, 'crab', 0, 520, 0.6);
    addEnemy(world, 'crab', 1, 460, 0.3);
    addEnemy(world, 'crab', 1, 600, 0.7);
    addEnemy(world, 'crab', 2, 500, 0.5);
    addEnemy(world, 'crab', 2, 660, 0.8);
    addEnemy(world, 'gull', 0, 780, 1);
    addEnemy(world, 'turtle', 1, 880, 0.6);
    for (let i = 0; i < 14; i++) {
      world.particles.push({
        x: 380 + Math.random() * 420, y: 150 + Math.random() * 380,
        vx: 0, vy: -30, r: 2 + Math.random() * 4,
        color: '#bdefff', t: Math.random() * 0.5, dur: 1.2, kind: 'bubble',
      });
    }
    world.banner = { text: 'SURGE!', sub: 'The tide drowns them — but the village leaks', t: 0.9, dur: 2.4 };
    return;
  }

  // victory (default)
  world.state = 'victory';
  world.wave = 10;
  world.score = 4860;
  world.best = 4860;
  world.newBest = true;
  world.hearts = 4;
  world.kills = 214;
  world.drowned = 87;
  world.shells = 160;
  addTower(world, 'harpoon', 1, 0);
  addTower(world, 'mortar', 2, 1);
  addTower(world, 'tidepool', 3, 2);
  world.tide = 30;
}
