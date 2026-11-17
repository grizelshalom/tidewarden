// Tiny WebAudio synth: no audio files, everything generated. Created lazily
// on the first user gesture (browsers block audio before interaction).
export function createAudio() {
  const api = {
    ctx: null,
    muted: false,
    ambient: null,
    tideGain: null,
  };

  function ensure() {
    if (api.ctx) return api.ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      api.ctx = new AC();
      startAmbient(api.ctx);
    } catch {
      api.ctx = null;
    }
    return api.ctx;
  }

  // Quiet looping surf: brown noise through a low-pass, gain follows the tide.
  function startAmbient(ctx) {
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 420;
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    src.connect(filt).connect(gain).connect(ctx.destination);
    src.start();
    api.ambient = { gain, src };
  }

  function tone(freq, dur, type, vol, slideTo) {
    const ctx = ensure();
    if (!ctx || api.muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    const ctx = ensure();
    if (!ctx || api.muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filt).connect(gain).connect(ctx.destination);
    src.start();
  }

  return {
    unlock() { ensure(); },
    toggleMute() {
      api.muted = !api.muted;
      if (api.ambient) api.ambient.gain.gain.value = api.muted ? 0 : 0.035;
      return api.muted;
    },
    get muted() { return api.muted; },
    setTideLevel(level01) {
      if (api.ambient && !api.muted) {
        api.ambient.gain.gain.value = 0.02 + level01 * 0.05;
      }
    },
    click() { tone(660, 0.06, 'square', 0.05); },
    harpoon() { tone(880, 0.09, 'square', 0.045, 320); },
    mortar() { tone(140, 0.18, 'sine', 0.12, 60); noise(0.12, 0.06, 500); },
    coin() { tone(1320, 0.07, 'sine', 0.06); setTimeout(() => tone(1760, 0.09, 'sine', 0.05), 60); },
    splash() { noise(0.25, 0.08, 900); },
    build() { tone(520, 0.08, 'triangle', 0.07); setTimeout(() => tone(780, 0.1, 'triangle', 0.07), 80); },
    horn() { tone(220, 0.35, 'sawtooth', 0.07, 330); tone(277, 0.35, 'sawtooth', 0.05, 415); },
    leak() { tone(980, 0.12, 'square', 0.06, 700); },
    hurt() { tone(180, 0.25, 'sawtooth', 0.1, 90); },
    victory() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.09), i * 140));
    },
    defeat() {
      [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.08), i * 170));
    },
  };
}
