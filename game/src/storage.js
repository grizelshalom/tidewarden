// Best-score persistence (localStorage, guarded for sandboxed contexts).
const KEY = 'tidewarden-best';

export function loadBest() {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  try {
    localStorage.setItem(KEY, String(Math.floor(score)));
  } catch {
    // storage unavailable (file:// in some browsers) — ignore.
  }
}
