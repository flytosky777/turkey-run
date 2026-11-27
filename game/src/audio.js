// All of Gobble Run's sounds, synthesised with WebAudio — no audio files, nothing to
// download. The context is created on the first user gesture (browsers block sound before
// one), and every call before that is a silent no-op.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    } catch {
      return null;
    }
    return context;
  }

  /** A short oscillator blip: frequency slides from `from` to `to` over `seconds`. */
  function blip({ type = 'sine', from = 440, to = null, seconds = 0.12, gain = 0.12, when = 0 }) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + seconds);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.02);
  }

  /** A burst of filtered noise, for thuds and feather bursts. */
  function noise({ seconds = 0.15, gain = 0.15, frequency = 800, when = 0 }) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(ctx.destination);
    source.start(t0);
  }

  return {
    /** Call from any user gesture so later sounds are allowed to play. */
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    click() {
      blip({ type: 'square', from: 660, seconds: 0.05, gain: 0.06 });
    },
    jump() {
      blip({ type: 'sine', from: 280, to: 620, seconds: 0.14, gain: 0.09 });
    },
    slide() {
      noise({ seconds: 0.12, gain: 0.05, frequency: 500 });
    },
    corn() {
      blip({ type: 'sine', from: 880, seconds: 0.07, gain: 0.1 });
      blip({ type: 'sine', from: 1320, seconds: 0.1, gain: 0.1, when: 0.07 });
    },
    feather() {
      blip({ type: 'triangle', from: 523, to: 784, seconds: 0.12, gain: 0.1 });
      blip({ type: 'triangle', from: 784, to: 1046, seconds: 0.14, gain: 0.1, when: 0.1 });
    },
    hit() {
      noise({ seconds: 0.2, gain: 0.2, frequency: 600 });
      blip({ type: 'sawtooth', from: 160, to: 60, seconds: 0.25, gain: 0.14 });
    },
    gobble() {
      // A turkey's gobble: four quick descending clucks.
      [520, 430, 360, 300].forEach((freq, i) => {
        blip({ type: 'square', from: freq, to: freq * 0.8, seconds: 0.07, gain: 0.07, when: i * 0.09 });
      });
    },
    farmerYell() {
      blip({ type: 'sawtooth', from: 220, to: 330, seconds: 0.18, gain: 0.08 });
      blip({ type: 'sawtooth', from: 330, to: 180, seconds: 0.22, gain: 0.08, when: 0.16 });
    },
    caught() {
      [392, 370, 349, 311].forEach((freq, i) => {
        blip({ type: 'triangle', from: freq, seconds: 0.22, gain: 0.11, when: i * 0.2 });
      });
    },
    escaped() {
      [523, 659, 784, 1046].forEach((freq, i) => {
        blip({ type: 'triangle', from: freq, seconds: 0.2, gain: 0.11, when: i * 0.13 });
      });
      blip({ type: 'sine', from: 1318, seconds: 0.4, gain: 0.08, when: 0.55 });
    },
  };
}
