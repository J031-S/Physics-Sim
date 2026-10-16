// Sound view of the waves, light & sound tool: exact formulas and sums of
// modes, not a grid. No DOM, and no audio: the page plays what `voice()`
// and the readings describe through the Web Audio API (src/wavelab/audio.js).
//
// SI throughout: m, s, Hz, N, kg/m, W, W/m², °C for temperature (as the
// formula is written), dB for sound level.
//
// Stated limits: ideal strings (no stiffness) and ideal pipes (no losses,
// unless the labelled damping is set); the sound played is synthesised from
// the modes, not recorded.
import { checkFormat } from "../scene-format.js";

export const FORMAT = "physium-sound";
export const I0 = 1e-12; // W/m², the threshold of hearing

// Speed of sound in air at a temperature in °C: v = 331.3 √(1 + T/273.15).
export const speedOfSound = (celsius) => 331.3 * Math.sqrt(1 + celsius / 273.15);
// Typical speeds in other media (longitudinal waves; steel in bulk, not a
// thin rod, which is about 5100 m/s), at about 20 °C.
export const MEDIA = {
  air: { name: "Air (from its temperature)", speed: null },
  helium: { name: "Helium", speed: 1007 },
  water: { name: "Water", speed: 1482 },
  steel: { name: "Steel", speed: 5960 },
};

export const beatFrequency = (f1, f2) => Math.abs(f1 - f2);
// Sound level in decibels: β = 10 log₁₀(I / I₀).
export const soundLevel = (intensity) => 10 * Math.log10(intensity / I0);
// A point source in 3D spreads its power over a sphere: I = P / 4πr².
export const pointIntensity = (power, r) => power / (4 * Math.PI * r * r);

/**
 * The Doppler effect along the line joining source and observer:
 *   f′ = f (v + v_o) / (v − v_s)
 * with v_s the source's speed towards the observer and v_o the observer's
 * speed towards the source (each negative if moving away), in still air.
 */
export function doppler({ frequency, speed, source = 0, observer = 0 }) {
  if (source >= speed) throw new Error("The source must move slower than the speed of sound towards the listener.");
  if (observer <= -speed) throw new Error("The listener must move away slower than the speed of sound.");
  return (frequency * (speed + observer)) / (speed - source);
}

/**
 * A source moving in a straight line past a still listener: the source is
 * at (sourceSpeed · t, 0), passing x = 0 at t = 0, and the listener at
 * (0, distance). What is heard at time t left the source at the moment
 * `emitted` that makes the delay the distance over the speed of sound, and
 * has the Doppler shift and the level for where the source was then.
 * Returns { emitted, frequency, level, distance, towards } (towards: the
 * source's speed towards the listener as it emitted).
 */
export function passing({ frequency, speed, sourceSpeed, distance, power }, t) {
  if (!(sourceSpeed < speed)) throw new Error("The source must be slower than sound.");
  const v2 = speed * speed,
    a = v2 - sourceSpeed * sourceSpeed,
    // (t − t_e)² v² = (v_s t_e)² + d², the root before t.
    b = v2 * t,
    disc = b * b - a * (v2 * t * t - distance * distance),
    emitted = (b - Math.sqrt(disc)) / a,
    x = sourceSpeed * emitted,
    r = Math.hypot(x, distance),
    towards = (sourceSpeed * -x) / r;
  return {
    emitted,
    frequency: doppler({ frequency, speed, source: towards }),
    level: soundLevel(pointIntensity(power, r)),
    distance: r,
    towards,
  };
}

// ---------------------------------------------------------------- strings

/**
 * A string fixed at both ends, built from its modes:
 *   y(x, t) = Σ sin(nπx/L) [b_n cos ω_n t + c_n sin ω_n t] e^(−t/τ)
 * with v = √(T/μ), f_n = n v / 2L, ω_n = 2π f_n. Plucked (a triangle of
 * `height` at `position`, as a fraction of L, let go from rest) or struck
 * (a hammer `width` wide at `position` giving that stretch `speed`, from
 * straight). `damping` is a decay time τ in seconds (0: none, the default
 * ideal string). The sum is exact apart from stopping at `modes` terms.
 */
export class SoundString {
  constructor({ length = 0.65, tension = 70, density = 1e-3, pluck = { kind: "pluck", position: 0.2, height: 0.004 }, modes = 60, damping = 0 } = {}) {
    const bad = (t) => {
      throw new Error(t);
    };
    if (!(length > 0 && length <= 100)) bad("The string's length must be more than 0 and at most 100 m.");
    if (!(tension > 0 && tension <= 1e5)) bad("The tension must be more than 0 and at most 100 kN.");
    if (!(density > 0 && density <= 10)) bad("The mass per unit length must be more than 0 and at most 10 kg/m.");
    if (!(pluck.position > 0 && pluck.position < 1)) bad("Pluck the string somewhere between its ends.");
    if (!Number.isInteger(modes) || modes < 1 || modes > 2000) bad("Use between 1 and 2000 modes.");
    if (!(damping >= 0)) bad("The decay time cannot be negative.");
    Object.assign(this, { length, tension, density, pluck: { ...pluck }, modeCount: modes, damping });
    this.speed = Math.sqrt(tension / density);
    this.#coefficients();
  }
  frequency(n) {
    return (n * this.speed) / (2 * this.length);
  }
  #coefficients() {
    const L = this.length,
      p = this.pluck.position * L,
      out = [];
    for (let n = 1; n <= this.modeCount; n++) {
      const k = (n * Math.PI) / L,
        w = 2 * Math.PI * this.frequency(n);
      let b = 0,
        c = 0;
      if (this.pluck.kind === "pluck") {
        // (2/L) ∫ triangle · sin(kx) dx.
        b = ((2 * this.pluck.height * L * L) / (n * n * Math.PI * Math.PI * p * (L - p))) * Math.sin(k * p);
      } else {
        // (2/(L ω)) ∫ hammer speed · sin(kx) dx over the hammer.
        const half = this.pluck.width / 2,
          a = Math.max(0, p - half),
          e = Math.min(L, p + half);
        c = ((2 * this.pluck.speed) / (L * w * k)) * (Math.cos(k * a) - Math.cos(k * e));
      }
      out.push({ n, k, w, b, c });
    }
    this.terms = out;
  }
  // Displacement at x (0 to L) and time t.
  shape(x, t) {
    let y = 0;
    for (const m of this.terms) y += Math.sin(m.k * x) * (m.b * Math.cos(m.w * t) + m.c * Math.sin(m.w * t));
    return this.damping > 0 ? y * Math.exp(-t / this.damping) : y;
  }
  // Each mode: n, frequency and displacement amplitude (signed, as at t = 0
  // for a pluck; the peak for a strike).
  modes() {
    return this.terms.map((m) => ({
      n: m.n,
      frequency: m.w / (2 * Math.PI),
      amplitude: this.pluck.kind === "pluck" ? m.b : m.c,
    }));
  }
  // What the page plays: the force the string puts on its end support,
  // T ∂y/∂x at x = 0, which is the sum of mode n's amplitude times n. Given
  // as harmonics with relative amplitudes adding to 1 (so the sum never
  // exceeds 1), and the decay time.
  voice(count = 24) {
    const list = this.terms.slice(0, count).map((m) => ({ frequency: m.w / (2 * Math.PI), weight: Math.abs(m.n * (m.b || m.c)) }));
    const total = list.reduce((s, h) => s + h.weight, 0) || 1;
    return { harmonics: list.map((h) => ({ frequency: h.frequency, amplitude: h.weight / total })), decay: this.damping };
  }
}

// ---------------------------------------------------------------- pipes

/**
 * Resonances of a pipe open at both ends (all harmonics, f = n v / 2L) or
 * closed at one end (odd harmonics only, f = n v / 4L). With
 * `endCorrection`, each open end adds 0.6 × radius to the length the air
 * vibrates over (off by default: it is an approximation for a flanged-free
 * end, not part of the ideal pipe).
 */
export function pipeModes({ length, speed, ends, count = 6, radius = 0.02, endCorrection = false }) {
  if (!(length > 0)) throw new Error("The pipe's length must be more than 0.");
  if (!(speed > 0)) throw new Error("The speed of sound must be more than 0.");
  if (!["open", "closed"].includes(ends)) throw new Error("A pipe is open at both ends or closed at one.");
  const open = ends === "open" ? 2 : 1,
    effective = length + (endCorrection ? 0.6 * radius * open : 0),
    out = [];
  for (let i = 1; i <= count; i++) {
    const n = ends === "open" ? i : 2 * i - 1;
    out.push({ n, frequency: ends === "open" ? (n * speed) / (2 * effective) : (n * speed) / (4 * effective), wavelength: ends === "open" ? (2 * effective) / n : (4 * effective) / n });
  }
  return out;
}

/**
 * The shape of harmonic n along the pipe (x from 0 to length; a closed
 * pipe is closed at x = 0): displacement and pressure, each with peak 1.
 * Open ends are displacement antinodes and pressure nodes; a closed end is
 * a displacement node and a pressure antinode. Ideal pipe, no end
 * correction in the drawing.
 */
export function pipePattern({ length, ends, n }, x) {
  if (ends === "open") {
    const k = (n * Math.PI) / length;
    return { displacement: Math.cos(k * x), pressure: Math.sin(k * x) };
  }
  if (n % 2 === 0) throw new Error("A pipe closed at one end has odd harmonics only.");
  const k = (n * Math.PI) / (2 * length);
  return { displacement: Math.sin(k * x), pressure: Math.cos(k * x) };
}

// ---------------------------------------------------------------- the view

// Everything the sound view shows, as plain values, so that it can be saved
// and loaded like the other tools' scenes. `mode` is the experiment on show.
export const SOUND_MODES = ["string", "pipe", "beats", "level", "doppler"];
const DEFAULT_SOUND = {
  mode: "string",
  string: { length: 0.65, tension: 70, density: 1e-3, kind: "pluck", position: 0.2, height: 0.004, speed: 1, width: 0.02, damping: 0, harmonic: 0 },
  pipe: { length: 0.5, ends: "open", temperature: 20, medium: "air", harmonic: 1, endCorrection: false, radius: 0.02 },
  beats: { f1: 440, f2: 444 },
  level: { power: 0.01, distance: 1 },
  doppler: { frequency: 500, temperature: 20, medium: "air", sourceSpeed: 30, observerSpeed: 0, distance: 10, layout: "line" },
};
export class SoundLab {
  constructor() {
    this.state = structuredClone(DEFAULT_SOUND);
  }
  set(part, patch) {
    if (!Object.hasOwn(DEFAULT_SOUND, part) || part === "mode") throw new Error("There is no such part of the sound view.");
    const next = { ...this.state[part], ...patch };
    for (const k of Object.keys(patch)) if (!Object.hasOwn(DEFAULT_SOUND[part], k)) throw new Error(`Nothing called ${k} can be set here.`);
    SoundLab.check(part, next);
    this.state[part] = next;
  }
  setMode(mode) {
    if (!SOUND_MODES.includes(mode)) throw new Error("There is no such experiment.");
    this.state.mode = mode;
  }
  // Throws a readable error if a part's values are out of range.
  static check(part, s) {
    const bad = (t) => {
        throw new Error(t);
      },
      num = (v, lo, hi, text) => {
        if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi) bad(text);
      };
    if (part === "string") {
      num(s.length, 0.05, 10, "The string's length must be between 5 cm and 10 m.");
      num(s.tension, 0.1, 5000, "The tension must be between 0.1 N and 5000 N.");
      num(s.density, 1e-5, 0.1, "The mass per metre must be between 0.01 g/m and 100 g/m.");
      num(s.position, 0.01, 0.99, "Pluck the string between 1% and 99% of the way along.");
      num(s.height, 1e-4, 0.05, "The pluck height must be between 0.1 mm and 5 cm.");
      num(s.speed, 0.01, 20, "The hammer speed must be between 0.01 and 20 m/s.");
      num(s.width, 1e-3, 0.5, "The hammer width must be between 1 mm and 50 cm.");
      num(s.damping, 0, 60, "The decay time must be between 0 (none) and 60 s.");
      if (!["pluck", "strike"].includes(s.kind)) bad("The string is plucked or struck.");
      if (!Number.isInteger(s.harmonic) || s.harmonic < 0 || s.harmonic > 12) bad("Show the whole string (0) or one of its first 12 harmonics.");
    } else if (part === "pipe") {
      num(s.length, 0.02, 20, "The pipe's length must be between 2 cm and 20 m.");
      num(s.temperature, -50, 100, "The temperature must be between −50 °C and 100 °C.");
      num(s.radius, 1e-3, 0.5, "The radius must be between 1 mm and 50 cm.");
      if (!["open", "closed"].includes(s.ends)) bad("A pipe is open at both ends or closed at one.");
      if (!Object.hasOwn(MEDIA, s.medium)) bad("Choose one of the listed media.");
      if (!Number.isInteger(s.harmonic) || s.harmonic < 1 || s.harmonic > 15) bad("Choose a harmonic from 1 to 15.");
      if (s.ends === "closed" && s.harmonic % 2 === 0) bad("A pipe closed at one end has odd harmonics only.");
    } else if (part === "beats") {
      num(s.f1, 20, 5000, "Each tone must be between 20 Hz and 5000 Hz.");
      num(s.f2, 20, 5000, "Each tone must be between 20 Hz and 5000 Hz.");
    } else if (part === "level") {
      num(s.power, 1e-12, 1e6, "The power must be between 1 pW and 1 MW.");
      num(s.distance, 0.01, 1e5, "The distance must be between 1 cm and 100 km.");
    } else if (part === "doppler") {
      num(s.frequency, 20, 5000, "The frequency must be between 20 Hz and 5000 Hz.");
      num(s.temperature, -50, 100, "The temperature must be between −50 °C and 100 °C.");
      if (!Object.hasOwn(MEDIA, s.medium)) bad("Choose one of the listed media.");
      const v = s.medium === "air" ? speedOfSound(s.temperature) : MEDIA[s.medium].speed;
      num(s.sourceSpeed, -0.95 * v, 0.95 * v, "The source must move at less than 95% of the speed of sound.");
      num(s.observerSpeed, -0.95 * v, 0.95 * v, "The listener must move at less than 95% of the speed of sound.");
      num(s.distance, 0.1, 1000, "The closest distance must be between 0.1 m and 1 km.");
      if (!["line", "pass"].includes(s.layout)) bad("The source moves along the line to the listener or past it.");
    }
  }
  // The speed of sound for a part with a medium and temperature.
  speedOf(part) {
    const s = this.state[part];
    return s.medium === "air" ? speedOfSound(s.temperature) : MEDIA[s.medium].speed;
  }
  string() {
    const s = this.state.string;
    return new SoundString({
      length: s.length,
      tension: s.tension,
      density: s.density,
      pluck: s.kind === "pluck" ? { kind: "pluck", position: s.position, height: s.height } : { kind: "strike", position: s.position, speed: s.speed, width: s.width },
      modes: 80,
      damping: s.damping,
    });
  }
  pipe(count = 8) {
    const s = this.state.pipe;
    return pipeModes({ length: s.length, speed: this.speedOf("pipe"), ends: s.ends, count, radius: s.radius, endCorrection: s.endCorrection });
  }
  exportScene() {
    return { format: FORMAT, version: 1, ...structuredClone(this.state) };
  }
  static fromScene(data) {
    checkFormat(data, FORMAT);
    const lab = new SoundLab();
    if (!SOUND_MODES.includes(data.mode)) throw new Error("This scene file is damaged.");
    for (const part of Object.keys(DEFAULT_SOUND)) {
      if (part === "mode") continue;
      if (data[part] === undefined) continue;
      if (!data[part] || typeof data[part] !== "object") throw new Error("This scene file is damaged.");
      const picked = {};
      for (const k of Object.keys(DEFAULT_SOUND[part])) if (data[part][k] !== undefined) picked[k] = data[part][k];
      lab.set(part, picked);
    }
    lab.setMode(data.mode);
    return lab;
  }
  loadScene(data) {
    this.state = SoundLab.fromScene(data).state;
  }
}
