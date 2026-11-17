// Keyboard + mouse input. The world polls this each frame; clicks are
// queued and consumed once so a click never double-fires.
export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouse: { x: 0, y: 0, down: false },
    clicks: [], // {x, y} in canvas coordinates, consumed by the world
    pressedQueue: [], // edge-triggered key codes, drained once per frame
    tideHeld: false, // SPACE held, or the on-screen TIDE button held
    spaceHeld: false,
    tideButtonHeld: false,
  };

  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  }

  function refreshTide() {
    input.tideHeld = input.spaceHeld || input.tideButtonHeld;
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      input.spaceHeld = true;
      e.preventDefault();
    }
    // Queue edge presses: keyup must NOT remove them before the frame loop
    // drains them, or a quick tap is lost between frames.
    if (!e.repeat) input.pressedQueue.push(e.code);
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') input.spaceHeld = false;
    refreshTide();
  });
  window.addEventListener('blur', () => {
    input.spaceHeld = false;
    input.tideButtonHeld = false;
    input.mouse.down = false;
    refreshTide();
  });

  canvas.addEventListener('mousemove', (e) => {
    const p = canvasPos(e);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = canvasPos(e);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
    input.mouse.down = true;
    input.clicks.push(p);
  });
  canvas.addEventListener('mouseup', () => {
    input.mouse.down = false;
  });
  canvas.addEventListener('mouseleave', () => {
    input.mouse.down = false;
  });

  // The world calls these every frame.
  input.consumeClicks = () => {
    const out = input.clicks;
    input.clicks = [];
    return out;
  };
  // Edge-triggered keys pressed since the last frame (each exactly once).
  input.drainPressed = () => {
    const out = input.pressedQueue;
    input.pressedQueue = [];
    return out;
  };
  input.setTideButtonHeld = (held) => {
    input.tideButtonHeld = held;
    refreshTide();
  };
  input.refreshTide = refreshTide;

  return input;
}
