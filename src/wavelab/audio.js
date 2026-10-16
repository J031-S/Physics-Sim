// Sound playback for the sound view, through the Web Audio API. Nothing here
// is physics: it plays what the model describes (src/wavelab/sound.js).
//
// Safety for headphones:
// - nothing plays until the student presses Play (the audio context is made
//   on that first press, as browsers also require);
// - the volume control starts low (20%);
// - every voice is normalised so that its samples never exceed ±1, the
//   master gain is at most MAX_GAIN, and a hard clipper after it holds the
//   output within ±MAX_GAIN of full scale whatever the voices do.
export const MAX_GAIN = 0.25;
export const START_VOLUME = 0.2; // of the control's range

export function createPlayer() {
  let ctx = null,
    master = null,
    voice = null, // { nodes, stop }
    volume = START_VOLUME;

  function setup() {
    if (ctx) return;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) throw new Error("This browser cannot play sound.");
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume * MAX_GAIN;
    const clip = ctx.createWaveShaper(),
      curve = new Float32Array(1025);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.max(-MAX_GAIN, Math.min(MAX_GAIN, x));
    }
    clip.curve = curve;
    master.connect(clip);
    clip.connect(ctx.destination);
  }
  const now = () => ctx.currentTime;
  function ramp(gain, to, at, time = 0.03) {
    gain.setValueAtTime(gain.value, at);
    gain.linearRampToValueAtTime(to, at + time);
  }
  // A voice: an envelope gain into the master, which fades in and out
  // over 30 ms (no clicks).
  function start(build) {
    stop();
    setup();
    if (ctx.state === "suspended") ctx.resume();
    const env = ctx.createGain();
    env.gain.value = 0;
    env.connect(master);
    const nodes = build(env);
    ramp(env.gain, 1, now());
    voice = {
      env,
      nodes,
      stop() {
        const t = now();
        ramp(env.gain, 0, t);
        for (const n of nodes) n.stop?.(t + 0.05);
        setTimeout(() => env.disconnect(), 200);
      },
    };
  }
  function stop() {
    voice?.stop();
    voice = null;
  }
  // A periodic tone from harmonics [{ frequency, amplitude }] whose
  // amplitudes add to at most 1, so the wave never exceeds ±1. All must be
  // whole multiples of the first; `decay` (s) fades it as the model does.
  function harmonics(list, decay = 0) {
    start((env) => {
      const f0 = list[0].frequency,
        n = list.map((h) => Math.round(h.frequency / f0)),
        size = Math.max(...n) + 1,
        real = new Float32Array(size),
        imag = new Float32Array(size);
      list.forEach((h, i) => (imag[n[i]] += h.amplitude));
      const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: true }),
        osc = ctx.createOscillator();
      osc.setPeriodicWave(wave);
      osc.frequency.value = f0;
      let out = osc;
      if (decay > 0) {
        const g = ctx.createGain();
        g.gain.setValueAtTime(1, now());
        g.gain.setTargetAtTime(0, now(), decay);
        osc.connect(g);
        out = g;
      }
      out.connect(env);
      osc.start();
      return [osc];
    });
  }
  // Sine tones, each at 1/count of `scale` (at most 1), so their sum stays
  // within ±1.
  function tones(frequencies, scale = 1) {
    start((env) =>
      frequencies.map((f) => {
        const osc = ctx.createOscillator(),
          g = ctx.createGain();
        osc.frequency.value = f;
        g.gain.value = Math.max(0, Math.min(1, scale)) / frequencies.length;
        osc.connect(g);
        g.connect(env);
        osc.start();
        return osc;
      }),
    );
  }
  // A sine whose frequency and relative amplitude (0 to 1) follow curves
  // sampled every `dt` seconds of real time, then stops.
  function sweep(frequencies, amplitudes, dt) {
    start((env) => {
      const osc = ctx.createOscillator(),
        g = ctx.createGain(),
        t = now() + 0.02,
        duration = dt * (frequencies.length - 1);
      osc.frequency.setValueAtTime(frequencies[0], t);
      osc.frequency.setValueCurveAtTime(Float32Array.from(frequencies), t, duration);
      g.gain.setValueAtTime(amplitudes[0], t);
      g.gain.setValueCurveAtTime(Float32Array.from(amplitudes.map((a) => Math.max(0, Math.min(1, a)))), t, duration);
      osc.connect(g);
      g.connect(env);
      osc.start(t);
      osc.stop(t + duration + 0.05);
      return [osc];
    });
    return dt * (frequencies.length - 1);
  }
  return {
    harmonics,
    tones,
    sweep,
    stop,
    get playing() {
      return !!voice;
    },
    // 0 to 1 of the control; the master gain is that times MAX_GAIN.
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (master) ramp(master.gain, volume * MAX_GAIN, now(), 0.05);
    },
    get volume() {
      return volume;
    },
    get gain() {
      return volume * MAX_GAIN;
    },
  };
}
