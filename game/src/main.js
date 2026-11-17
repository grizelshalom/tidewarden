// TIDEWARDEN entry: game loop, input wiring, state machine glue.
// The world holds the rules (world.js), the renderer draws it (render.js).
import { createWorld } from './world.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { buildShotScene } from './shots.js';
import { UI, TOWER_ORDER } from './config.js';

const canvas = document.getElementById('game');
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || '1337');
const shot = params.get('shot');

const audio = createAudio();
const input = createInput(canvas);
const world = createWorld(seed, audio);
const renderer = createRenderer(canvas);

world.muted = false;

if (shot) {
  buildShotScene(world, shot);
} else {
  world.demo = true; // lively scene behind the title screen
}

window.__tidewarden = { world, input, audio };

function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function onKey(code) {
  audio.unlock();
  if (code === 'Enter') {
    if (world.state === 'title') world.startGame();
    else if (world.state === 'gameover' || world.state === 'victory') world.restart();
  } else if (code === 'KeyP') {
    if (world.state === 'playing') world.state = 'paused';
    else if (world.state === 'paused') world.state = 'playing';
  } else if (code === 'KeyM') {
    world.muted = audio.toggleMute();
  } else if (code === 'KeyR') {
    if (world.state !== 'title') world.restart();
  } else if (code === 'KeyN') {
    world.sendNextWave();
  } else if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3') {
    const type = TOWER_ORDER[Number(code.slice(-1)) - 1];
    if (world.state === 'playing') {
      world.selected = world.selected === type ? null : type;
      audio.click();
    }
  } else if (code === 'Escape') {
    world.selected = null;
  }
}

function onClick(x, y) {
  audio.unlock();
  // title / end screens: big buttons
  if (world.state === 'title') {
    if (inRect(x, y, UI.startBtn)) world.startGame();
    return;
  }
  if (world.state === 'gameover' || world.state === 'victory') {
    if (inRect(x, y, UI.againBtn)) world.restart();
    return;
  }
  // bottom-bar buttons (always live while playing or paused)
  if (inRect(x, y, UI.pauseBtn)) {
    if (world.state === 'playing') world.state = 'paused';
    else if (world.state === 'paused') world.state = 'playing';
    audio.click();
    return;
  }
  if (inRect(x, y, UI.muteBtn)) {
    world.muted = audio.toggleMute();
    return;
  }
  if (inRect(x, y, UI.restartBtn)) {
    if (world.state !== 'title') world.restart();
    return;
  }
  // tide button: hold is handled per-frame; a click here does nothing else
  if (inRect(x, y, UI.tideButton)) return;
  world.handleClick(x, y);
}

let last = performance.now();
let firstFrame = true;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // edge-triggered keys
  for (const code of input.drainPressed()) onKey(code);

  // tide button hold (mouse held on the big TIDE button)
  const tb = UI.tideButton;
  const onTideBtn = input.mouse.down
    && input.mouse.x >= tb.x && input.mouse.x <= tb.x + tb.w
    && input.mouse.y >= tb.y && input.mouse.y <= tb.y + tb.h;
  input.setTideButtonHeld(onTideBtn);
  input.refreshTide();
  world.tideHeld = input.tideHeld;

  // clicks
  for (const c of input.consumeClicks()) onClick(c.x, c.y);

  world.update(dt);
  renderer.draw(world, input);

  if (firstFrame) {
    firstFrame = false;
    if (shot) window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
