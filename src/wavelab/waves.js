// Waves view of the waves, light & sound tool: the 2D scalar wave equation
//   ∂²u/∂t² + γ ∂u/∂t = c(x, y)² ∇²u + s(x, y, t)
// on a square grid, stepped by the standard second-order (leapfrog)
// finite-difference scheme. No DOM.
//
// SI throughout (m, s, m/s, Hz). The page sets its tank up in wavelengths
// of a 1 Hz wave at 1 m/s (so 1 m is one wavelength); the scheme itself is
// scale-free, so the same run stands for light or sound at any scale.
//
// - Each cell has its own speed c = c₀/n (n the refractive index of the
//   medium region it is in), so regions of other speed refract waves.
// - Walls are cells held at u = 0: a rigid wall for sound (u is the air's
//   displacement), a conductor for light. They reflect, with the phase
//   reversed.
// - The tank's edges absorb: a layer outside the tank damps the waves
//   gradually (a quadratic profile of γ) and the outermost row applies
//   Mur's first-order absorbing condition. Or `edges: "wall"` reflects.
// - The timestep is half the 2D stability (CFL) limit for the fastest
//   medium, fixed for a given grid, so results never depend on frame rate.
// - At least 20 cells per wavelength everywhere (MIN_CELLS): anything
//   coarser is refused, because the grid then makes waves travel slower.
import { checkFormat, listOf } from "../scene-format.js";

export const FORMAT = "physium-waves";
export const MIN_CELLS = 20; // cells per wavelength
export const COURANT = 0.5; // c dt / h; stable up to 1/√2 in 2D
export const RAMP = 2; // periods over which a source is switched on
const MAX_CELLS = 3e6;
const HISTORY = 24000; // samples kept per probe
const SPREAD = 3; // cells either side covered by a point source
const WEIGHTS = new Float64Array((2 * SPREAD + 1) ** 2);

const deg = Math.PI / 180;
export const LIMITS = {
  size: { min: 1, max: 200 }, // tank width and height
  cell: { min: 1e-3, max: 1 },
  speed: { min: 1e-3, max: 1e9 },
  frequency: { min: 1e-3, max: 1e9 },
  amplitude: { min: 0, max: 100 },
  index: { min: 1, max: 4 },
  damping: { min: 0, max: 10 }, // γ, per second
  sourceSpeed: { min: 0, max: 4 }, // multiples of the wave speed
};

const SOURCES = ["point", "line", "moving"];
const KINDS = [...SOURCES, "wall", "medium", "probe", "screen"];
const DEFAULTS = {
  point: { x: 0, y: 0, frequency: 1, amplitude: 1, phase: 0 },
  line: { x: 0, y: 0, angle: 0, length: 6, frequency: 1, amplitude: 1, phase: 0 },
  // `speed` as a multiple of the wave speed c₀; `angle` its direction.
  moving: { x: 0, y: 0, angle: 0, speed: 0.5, frequency: 1, amplitude: 1, phase: 0 },
  // `angle` is the direction the wall runs in. Slits are centred on the
  // wall's middle, `separation` apart (centre to centre).
  wall: { x: 0, y: 0, angle: 90 * deg, length: 6, thickness: 0.2, slits: 0, slitWidth: 1, separation: 3 },
  // shape "rect" (width × height, turned by angle), "circle" (radius) or
  // "lens" (two arcs of `radius`, `thickness` at the middle, axis along
  // angle).
  medium: { shape: "rect", x: 0, y: 0, angle: 0, width: 4, height: 4, radius: 2, thickness: 1, index: 1.5 },
  probe: { x: 0, y: 0 },
  // A line along which the time-averaged intensity is read; `angle` is the
  // direction it faces (its normal), as for a mirror in the rays view.
  screen: { x: 0, y: 0, angle: 180 * deg, length: 6 },
};
export const isSource = (kind) => SOURCES.includes(kind);
const NAMES = {
  point: "Point source",
  line: "Line source",
  moving: "Moving source",
  wall: "Wall",
  medium: "Medium",
  probe: "Probe",
  screen: "Screen",
};
export const kindName = (kind) => NAMES[kind];

function check(key, value) {
  const bad = (t) => {
      throw new Error(t);
    },
    num = () => {
      if (typeof value !== "number" || !Number.isFinite(value)) bad(`The ${key} must be a number.`);
    };
  switch (key) {
    case "x":
    case "y":
    case "angle":
    case "phase":
      return num();
    case "length":
    case "width":
    case "height":
    case "radius":
    case "slitWidth":
    case "separation":
      num();
      if (!(value > 0 && value <= 1000)) bad(`The ${key} must be more than 0 and at most 1000 m.`);
      return;
    case "thickness":
      num();
      if (!(value >= 0 && value <= 1000)) bad("The thickness must be between 0 and 1000 m.");
      return;
    case "frequency":
      num();
      if (value < LIMITS.frequency.min || value > LIMITS.frequency.max) bad("The frequency is out of range.");
      return;
    case "amplitude":
      num();
      if (value < LIMITS.amplitude.min || value > LIMITS.amplitude.max) bad("The amplitude must be between 0 and 100.");
      return;
    case "index":
      num();
      if (value < LIMITS.index.min || value > LIMITS.index.max)
        bad("The refractive index must be between 1.00 and 4.00 (the tank's own medium is 1).");
      return;
    case "speed":
      num();
      if (value < LIMITS.sourceSpeed.min || value > LIMITS.sourceSpeed.max)
        bad("The source's speed must be between 0 and 4 times the wave speed.");
      return;
    case "slits":
      if (!Number.isInteger(value) || value < 0 || value > 10) bad("Use between 0 and 10 slits.");
      return;
    case "shape":
      if (!["rect", "circle", "lens"].includes(value)) bad("The shape must be a rectangle, circle or lens.");
      return;
  }
  bad(`Nothing called ${key} can be set here.`);
}

const unit = (a) => ({ x: Math.cos(a), y: Math.sin(a) });

// Is a point inside a medium region?
function inMedium(m, x, y) {
  const a = unit(m.angle),
    dx = x - m.x,
    dy = y - m.y,
    u = dx * a.x + dy * a.y,
    v = -dx * a.y + dy * a.x;
  if (m.shape === "rect") return Math.abs(u) <= m.width / 2 && Math.abs(v) <= m.height / 2;
  if (m.shape === "circle") return dx * dx + dy * dy <= m.radius * m.radius;
  // Lens: inside both circles, whose centres lie R − t/2 either side.
  const off = m.radius - m.thickness / 2;
  return (u - off) ** 2 + v * v <= m.radius ** 2 && (u + off) ** 2 + v * v <= m.radius ** 2;
}
// The slits of a wall: offsets of their centres along it.
export function slitOffsets(w) {
  const out = [];
  for (let k = 0; k < w.slits; k++) out.push((k - (w.slits - 1) / 2) * (w.slits > 1 ? w.separation : 0));
  return out;
}
function inWall(w, x, y, minHalf) {
  const a = unit(w.angle),
    dx = x - w.x,
    dy = y - w.y,
    along = dx * a.x + dy * a.y,
    across = -dx * a.y + dy * a.x;
  if (Math.abs(along) > w.length / 2 || Math.abs(across) > Math.max(w.thickness / 2, minHalf)) return false;
  for (const o of slitOffsets(w)) if (Math.abs(along - o) < w.slitWidth / 2) return false;
  return true;
}

// The waveform of a source: switched on smoothly over RAMP periods, then a
// steady sine. g(t) and its time derivative.
function waveform(src, t) {
  const w = 2 * Math.PI * src.frequency,
    ramp = RAMP / src.frequency,
    ph = w * t + src.phase;
  let e = 1,
    de = 0;
  if (t <= 0) return { g: 0, dg: 0 };
  if (t < ramp) {
    e = 0.5 * (1 - Math.cos((Math.PI * t) / ramp));
    de = ((0.5 * Math.PI) / ramp) * Math.sin((Math.PI * t) / ramp);
  }
  return { g: e * Math.sin(ph), dg: de * Math.sin(ph) + e * w * Math.cos(ph) };
}

export class WaveLab {
  constructor({ width = 30, height = 20, cell = 0.05, speed = 1, edges = "absorb", damping = 0, absorber = 2 } = {}) {
    this.items = new Map();
    this.nextId = 1;
    this.#setTank({ width, height, cell, speed, edges, damping, absorber });
  }

  // -------------------------------------------------------------- the tank

  get tank() {
    const { width, height, cell, speed, edges, damping, absorber } = this;
    return { width, height, cell, speed, edges, damping, absorber };
  }
  setTank(patch) {
    const next = { ...this.tank, ...patch };
    // Checked against every source and medium before anything changes.
    this.#cells(next, this.list());
    this.#setTank(next);
  }
  #setTank({ width, height, cell, speed, edges, damping, absorber }) {
    const bad = (t) => {
      throw new Error(t);
    };
    for (const [v, lim, name] of [
      [width, LIMITS.size, "width"],
      [height, LIMITS.size, "height"],
    ])
      if (!(v >= lim.min && v <= lim.max)) bad(`The tank's ${name} must be between 1 and 200 m.`);
    if (!(cell >= LIMITS.cell.min && cell <= LIMITS.cell.max)) bad("The cell size must be between 1 mm and 1 m.");
    if (!(speed >= LIMITS.speed.min && speed <= LIMITS.speed.max)) bad("The wave speed is out of range.");
    if (!["absorb", "wall"].includes(edges)) bad("The tank's edges either absorb or reflect.");
    if (!(damping >= LIMITS.damping.min && damping <= LIMITS.damping.max)) bad("The damping must be between 0 and 10 per second.");
    if (!(absorber >= 0.5 && absorber <= 20)) bad("The absorbing layer must be between 0.5 and 20 m thick.");
    const pad = edges === "absorb" ? Math.max(8, Math.round(absorber / cell)) : 1,
      nx = Math.round(width / cell) + 2 * pad,
      ny = Math.round(height / cell) + 2 * pad;
    if (nx * ny > MAX_CELLS) bad("That grid would have too many cells: make the tank smaller or the cells larger.");
    Object.assign(this, { width, height, cell, speed, edges, damping, absorber, pad, nx, ny });
    this.dt = (COURANT * cell) / speed;
    const n = nx * ny;
    this.u0 = new Float32Array(n);
    this.u1 = new Float32Array(n);
    this.u2 = new Float32Array(n);
    this.avg = new Float32Array(n);
    this.sum = new Float32Array(n);
    this.c2 = new Float32Array(n);
    this.keep = new Float32Array(n); // 1/(1 + γdt/2), 0 in walls
    this.back = new Float32Array(n); // 1 − γdt/2
    this.steps = 0;
    this.carry = 0;
    this.samples = 0;
    this.tracking = true;
    this.sources = [];
    this.histories = new Map();
    this.#build();
  }
  get time() {
    return this.steps * this.dt;
  }
  // Whether the running mean of u² (the intensity view and the screens) is
  // kept up to date; it costs a third of each step. Turning it back on
  // starts it afresh.
  trackIntensity(on) {
    if (on && !this.tracking) this.avg.fill(0);
    this.tracking = !!on;
  }
  // Left edge and bottom edge of the grid (the tank and its absorbing
  // layer), in metres.
  get x0() {
    return -this.width / 2 - this.pad * this.cell;
  }
  get y0() {
    return -this.height / 2 - this.pad * this.cell;
  }

  // -------------------------------------------------------------- items

  add(kind, props = {}) {
    if (!KINDS.includes(kind)) throw new Error(`There is no "${kind}" in the waves view.`);
    const item = { kind, ...structuredClone(DEFAULTS[kind]) };
    for (const [k, v] of Object.entries(props)) {
      if (k === "id" || k === "kind") continue;
      if (!Object.hasOwn(DEFAULTS[kind], k)) throw new Error(`A ${NAMES[kind].toLowerCase()} has no ${k}.`);
      check(k, v);
      item[k] = v;
    }
    this.#cells(this.tank, [...this.list(), item]);
    item.id = this.nextId++;
    item.start = this.time; // when its clock (ramp, motion) began
    this.items.set(item.id, item);
    if (kind === "probe") this.histories.set(item.id, { t: [], u: [] });
    this.#build();
    return item.id;
  }
  update(id, patch) {
    const item = this.items.get(id);
    if (!item) throw new Error("That item is no longer in the tank.");
    const next = { ...item };
    for (const [k, v] of Object.entries(patch)) {
      if (k === "id" || k === "kind" || k === "start") continue;
      if (!Object.hasOwn(DEFAULTS[item.kind], k)) throw new Error(`A ${NAMES[item.kind].toLowerCase()} has no ${k}.`);
      check(k, v);
      next[k] = v;
    }
    this.#cells(this.tank, this.list().map((i) => (i.id === id ? next : i)));
    this.items.set(id, next);
    if (next.kind === "probe") this.histories.set(id, { t: [], u: [] });
    this.#build();
  }
  remove(id) {
    this.items.delete(id);
    this.histories.delete(id);
    this.#build();
  }
  clear() {
    this.items.clear();
    this.histories.clear();
    this.nextId = 1;
    this.reset();
  }
  get(id) {
    return this.items.get(id) ?? null;
  }
  list() {
    return [...this.items.values()];
  }

  // The shortest wavelength anywhere in the tank, in cells. A moving source
  // shortens the waves ahead of it to (c − v)/f in each medium slower than
  // it. (On a shock cone they are squeezed without limit: see the README.)
  cellsPerWavelength(tank = this.tank, items = this.list()) {
    const speeds = [tank.speed, ...items.filter((i) => i.kind === "medium").map((m) => tank.speed / m.index)];
    let shortest = Infinity;
    for (const s of items) {
      if (!isSource(s.kind)) continue;
      for (const c of speeds) {
        const v = s.kind === "moving" ? s.speed * tank.speed : 0;
        // At or above a medium's speed there is no wave ahead; the waves
        // left behind are (c + v)/f long.
        shortest = Math.min(shortest, (v >= c ? c + v : c - v) / s.frequency);
      }
    }
    return shortest / tank.cell;
  }
  #cells(tank, items) {
    const n = this.cellsPerWavelength(tank, items);
    if (n < MIN_CELLS - 1e-9)
      throw new Error(
        `That would leave only ${n.toFixed(1)} cells per wavelength somewhere in the tank; at least ${MIN_CELLS} cells are needed, or waves travel at the wrong speed. Lower the frequency, or use smaller cells.`,
      );
  }

  // Lays the walls, media, sponge and sources onto the grid.
  #build() {
    const { nx, ny, cell: h, pad, dt } = this,
      walls = this.list().filter((i) => i.kind === "wall"),
      media = this.list().filter((i) => i.kind === "medium");
    const base = (COURANT * COURANT * this.speed * this.speed) / (this.speed * this.speed);
    // Damping in the absorbing layer: γ rises as the square of the depth,
    // to 13.8 c/L (an amplitude e^−9.2 for a wave through and back).
    const depth = pad * h,
      sigmaMax = (13.8 * this.speed) / Math.max(depth, h);
    for (let j = 0; j < ny; j++) {
      const y = this.y0 + (j + 0.5) * h;
      for (let i = 0; i < nx; i++) {
        const x = this.x0 + (i + 0.5) * h,
          k = j * nx + i;
        let n = 1;
        for (const m of media) if (inMedium(m, x, y)) n = m.index;
        this.c2[k] = base / (n * n);
        let gamma = this.damping;
        if (this.edges === "absorb") {
          const d = Math.max(pad - i - 0.5, i + 0.5 - (nx - pad), pad - j - 0.5, j + 0.5 - (ny - pad), 0) / pad;
          gamma += sigmaMax * d * d;
        }
        const s = (gamma * dt) / 2;
        let wall = false;
        if (this.edges === "wall" && (i === 0 || j === 0 || i === nx - 1 || j === ny - 1)) wall = true;
        for (const w of walls) if (!wall && inWall(w, x, y, 0.71 * h)) wall = true;
        this.keep[k] = wall ? 0 : 1 / (1 + s);
        this.back[k] = 1 - s;
        if (wall) this.u0[k] = this.u1[k] = 0;
      }
    }
    this.sources = this.list().filter((i) => isSource(i.kind));
  }

  // -------------------------------------------------------------- stepping

  // Clears the waves and the clock; the tank is kept.
  reset() {
    this.u0.fill(0);
    this.u1.fill(0);
    this.avg.fill(0);
    this.sum.fill(0);
    this.samples = 0;
    this.steps = 0;
    this.carry = 0;
    for (const i of this.items.values()) i.start = 0;
    for (const h of this.histories.values()) {
      h.t.length = 0;
      h.u.length = 0;
    }
  }
  // A still Gaussian bump of displacement (for the energy check and for a
  // pulse to watch).
  pulse({ x, y, width = 0.5, amplitude = 1 }) {
    const { nx, ny, cell: h } = this;
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        if (!this.keep[k]) continue;
        const dx = this.x0 + (i + 0.5) * h - x,
          dy = this.y0 + (j + 0.5) * h - y,
          v = amplitude * Math.exp(-(dx * dx + dy * dy) / (2 * width * width));
        this.u0[k] += v;
        this.u1[k] += v;
      }
  }

  // Adds the source terms for this step, times dt² and each cell's damping
  // factor, to u2.
  #inject(t) {
    const h = this.cell,
      dt2 = this.dt * this.dt,
      put = (x, y, s) => {
        // Bilinear spreading of a term over the four nearest cells.
        const fx = (x - this.x0) / h - 0.5,
          fy = (y - this.y0) / h - 0.5,
          i = Math.floor(fx),
          j = Math.floor(fy),
          a = fx - i,
          b = fy - j;
        if (i < 1 || j < 1 || i >= this.nx - 2 || j >= this.ny - 2) return false;
        const k = j * this.nx + i;
        const K = this.keep;
        this.u2[k] += s * (1 - a) * (1 - b) * K[k];
        this.u2[k + 1] += s * a * (1 - b) * K[k + 1];
        this.u2[k + this.nx] += s * (1 - a) * b * K[k + this.nx];
        this.u2[k + this.nx + 1] += s * a * b * K[k + this.nx + 1];
        return true;
      },
      // A point term spread as a Gaussian one cell wide (normalised over
      // the cells it covers). A source moving across the grid with only
      // bilinear weights radiates at the rate it crosses cells, a wave two
      // cells long; the Gaussian leaves almost nothing at that scale.
      blob = (x, y, s) => {
        const fx = (x - this.x0) / h - 0.5,
          fy = (y - this.y0) / h - 0.5,
          ci = Math.round(fx),
          cj = Math.round(fy),
          R = SPREAD;
        if (ci - R < 1 || cj - R < 1 || ci + R > this.nx - 2 || cj + R > this.ny - 2) return false;
        let total = 0;
        const w = WEIGHTS;
        for (let dj = -R, q = 0; dj <= R; dj++)
          for (let di = -R; di <= R; di++, q++) {
            const ex = ci + di - fx,
              ey = cj + dj - fy;
            w[q] = Math.exp(-(ex * ex + ey * ey) / 2);
            total += w[q];
          }
        for (let dj = -R, q = 0; dj <= R; dj++)
          for (let di = -R; di <= R; di++, q++) {
            const k = (cj + dj) * this.nx + ci + di;
            this.u2[k] += ((s * w[q]) / total) * this.keep[k];
          }
        return true;
      };
    for (const src of this.sources) {
      const local = t - src.start,
        { dg } = waveform(src, local);
      if (src.amplitude === 0) continue;
      const w = 2 * Math.PI * src.frequency;
      if (src.kind === "line") {
        // 1D: u_tt = c²u_xx + K g'(t) δ(x) radiates (K/2c) g(t ∓ x/c) each
        // way, so K = 2cA gives waves of amplitude A.
        const c = this.speed / this.indexAt(src.x, src.y),
          K = 2 * c * src.amplitude,
          a = unit(src.angle),
          p = { x: -a.y, y: a.x },
          n = Math.max(1, Math.round((2 * src.length) / h)),
          ds = src.length / n;
        for (let q = 0; q < n; q++) {
          const s = -src.length / 2 + (q + 0.5) * ds;
          put(src.x + p.x * s, src.y + p.y * s, (dt2 * K * dg * ds) / (h * h));
        }
        continue;
      }
      // A point source radiates (K ω / 4c²)|H₀(kr)| ≈ (K ω / 4c²)√(2/πkr);
      // K = 4πc²A/ω makes that A at r = λ (falling as √(λ/r)).
      let x = src.x,
        y = src.y;
      if (src.kind === "moving") {
        const a = unit(src.angle),
          v = src.speed * this.speed;
        x += a.x * v * local;
        y += a.y * v * local;
      }
      const c = this.speed / this.indexAt(x, y),
        K = (4 * Math.PI * c * c * src.amplitude) / w;
      blob(x, y, (dt2 * K * dg) / (h * h));
    }
  }
  // The refractive index of the medium at a point (1 outside every region).
  indexAt(x, y) {
    let n = 1;
    for (const m of this.items.values()) if (m.kind === "medium" && inMedium(m, x, y)) n = m.index;
    return n;
  }

  // One timestep: u2 = (2u1 − (1 − γdt/2)u0 + (c dt/h)² ∇²u1 + dt² s)
  // / (1 + γdt/2), walls held at zero, Mur's condition on the outer rows.
  // The running mean of u² is updated in the same pass (memory, not
  // arithmetic, is what limits this loop).
  step() {
    const { nx, ny, u0, u1, u2, c2, keep, back, avg, sum } = this;
    let f = Infinity;
    for (const s of this.sources) f = Math.min(f, s.frequency);
    // Running mean of u² over about two periods of the slowest source.
    const alpha = Math.min(1, this.dt / (2 / (Number.isFinite(f) ? f : 1))),
      averaging = !!this.averaging;
    if (this.tracking || averaging)
      for (let j = 1; j < ny - 1; j++) {
        let k = j * nx + 1;
        for (let i = 1; i < nx - 1; i++, k++) {
          const c = u1[k],
            v = (2 * c - back[k] * u0[k] + c2[k] * (u1[k - 1] + u1[k + 1] + u1[k - nx] + u1[k + nx] - 4 * c)) * keep[k];
          u2[k] = v;
          avg[k] += (v * v - avg[k]) * alpha;
          if (averaging) sum[k] += v * v;
        }
      }
    else
      // The same without the running mean, when nothing shows it.
      for (let j = 1; j < ny - 1; j++) {
        let k = j * nx + 1;
        for (let i = 1; i < nx - 1; i++, k++) {
          const c = u1[k];
          u2[k] = (2 * c - back[k] * u0[k] + c2[k] * (u1[k - 1] + u1[k + 1] + u1[k - nx] + u1[k + nx] - 4 * c)) * keep[k];
        }
      }
    // Source terms: the update is linear, so they are added afterwards,
    // with the same damping factor.
    this.#inject(this.time);
    if (this.edges === "absorb") {
      // Mur: u_t = ±c u_n at each edge, to first order.
      const C = COURANT,
        m = (C - 1) / (C + 1);
      for (let i = 0; i < nx; i++) {
        const top = (ny - 1) * nx + i;
        u2[i] = u1[i + nx] + m * (u2[i + nx] - u1[i]);
        u2[top] = u1[top - nx] + m * (u2[top - nx] - u1[top]);
      }
      for (let j = 0; j < ny; j++) {
        const left = j * nx,
          right = left + nx - 1;
        u2[left] = u1[left + 1] + m * (u2[left + 1] - u1[left]);
        u2[right] = u1[right - 1] + m * (u2[right - 1] - u1[right]);
      }
    }
    // Rotate the three time levels.
    this.u0 = u1;
    this.u1 = u2;
    this.u2 = u0;
    this.steps++;
    if (averaging) this.samples++;
    for (const [id, h] of this.histories) {
      const p = this.items.get(id);
      h.t.push(this.time);
      h.u.push(this.value(p.x, p.y));
      if (h.t.length > HISTORY) {
        h.t.splice(0, h.t.length - HISTORY);
        h.u.splice(0, h.u.length - HISTORY);
      }
    }
  }
  /**
   * Advances by `seconds` in whole timesteps, carrying any remainder to the
   * next call, at most `maxSteps` steps. Returns the seconds advanced.
   */
  advance(seconds, { maxSteps = Infinity } = {}) {
    this.carry += seconds / this.dt;
    const wanted = Math.floor(this.carry + 1e-9),
      n = Math.min(wanted, maxSteps);
    this.carry = n < wanted ? 0 : this.carry - wanted;
    for (let i = 0; i < n; i++) this.step();
    return n * this.dt;
  }

  // -------------------------------------------------------------- reading

  #sample(field, x, y) {
    const h = this.cell,
      fx = (x - this.x0) / h - 0.5,
      fy = (y - this.y0) / h - 0.5,
      i = Math.floor(fx),
      j = Math.floor(fy);
    if (i < 0 || j < 0 || i >= this.nx - 1 || j >= this.ny - 1) return 0;
    const a = fx - i,
      b = fy - j,
      k = j * this.nx + i;
    return (
      field[k] * (1 - a) * (1 - b) +
      field[k + 1] * a * (1 - b) +
      field[k + this.nx] * (1 - a) * b +
      field[k + this.nx + 1] * a * b
    );
  }
  // The field at a point, interpolated between cell centres.
  value(x, y) {
    return this.#sample(this.u1, x, y);
  }
  // The running mean of u² (about two periods), as the intensity view shows.
  intensityAt(x, y) {
    return this.#sample(this.avg, x, y);
  }
  // The exact mean of u² since startAverage().
  startAverage() {
    this.sum.fill(0);
    this.samples = 0;
    this.averaging = true;
  }
  averageAt(x, y) {
    return this.samples ? this.#sample(this.sum, x, y) / this.samples : 0;
  }
  history(id) {
    return this.histories.get(id) ?? { t: [], u: [] };
  }
  // Is the cell at a point a wall?
  wallAt(x, y) {
    const h = this.cell,
      i = Math.floor((x - this.x0) / h),
      j = Math.floor((y - this.y0) / h);
    if (i < 0 || j < 0 || i >= this.nx || j >= this.ny) return false;
    return this.keep[j * this.nx + i] === 0;
  }
  // Where a source is now (a moving one moves).
  sourcePosition(src) {
    if (src.kind !== "moving") return { x: src.x, y: src.y };
    const a = unit(src.angle),
      t = this.time - src.start,
      v = src.speed * this.speed;
    return { x: src.x + a.x * v * t, y: src.y + a.y * v * t };
  }

  /**
   * The discrete energy that the leapfrog scheme conserves exactly when
   * there is no damping, no source and the edges are walls:
   *   ½ Σ (1/c²)((u¹ − u⁰)/dt)² + ½ Σ_edges (Δu¹)(Δu⁰)/h²
   * per unit density, summed over the grid (walls are u = 0).
   */
  energy() {
    const { nx, ny, u0, u1, dt, cell: h } = this;
    let kinetic = 0,
      strain = 0;
    const cdt = COURANT; // c₀ dt / h
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i,
          v = (u1[k] - u0[k]) / dt;
        // 1/c² = (dt/h)² / c2 with c2 = (c dt/h)²; in units of c₀ = 1 after
        // dividing by (c₀dt/h)².
        if (this.keep[k]) kinetic += (v * v * cdt * cdt) / this.c2[k];
        if (i < nx - 1) strain += (u1[k + 1] - u1[k]) * (u0[k + 1] - u0[k]);
        if (j < ny - 1) strain += (u1[k + nx] - u1[k]) * (u0[k + nx] - u0[k]);
      }
    const c0 = this.speed;
    return 0.5 * (kinetic / (c0 * c0) + strain / (h * h)) * h * h;
  }

  /**
   * The intensity along a screen, from the running mean: { s, intensity }
   * at `count` points from one end (s = −length/2) to the other.
   */
  screenReading(id, count = 240) {
    const sc = this.items.get(id),
      a = unit(sc.angle),
      p = { x: -a.y, y: a.x },
      s = [],
      intensity = [];
    for (let q = 0; q < count; q++) {
      const t = -sc.length / 2 + (sc.length * q) / (count - 1);
      s.push(t);
      intensity.push(this.intensityAt(sc.x + p.x * t, sc.y + p.y * t));
    }
    return { s, intensity };
  }

  /**
   * Where theory puts the fringes on a screen, as positions s along it:
   * - two or more slits in a wall between the sources and the screen:
   *   bright fringes where the paths from neighbouring slit centres differ
   *   by a whole number of wavelengths (exact geometry, narrow slits);
   * - one slit: dark fringes where a sin θ = mλ (far field, θ from the slit
   *   centre);
   * - two or more point sources of one frequency and no wall: bright where
   *   r₁ − r₂ − (φ₁ − φ₂)λ/2π is a whole number of wavelengths (first two).
   * Returns { kind: "bright" | "dark", list: [{ s, m }], rule } or null.
   */
  fringes(id) {
    const sc = this.items.get(id);
    if (!sc) return null;
    const a = unit(sc.angle),
      p = { x: -a.y, y: a.x },
      at = (t) => ({ x: sc.x + p.x * t, y: sc.y + p.y * t }),
      sources = this.sources.filter((s) => s.kind !== "moving");
    if (!sources.length) return null;
    const lambda = this.speed / this.indexAt(sc.x, sc.y) / sources[0].frequency,
      wall = this.list().find((w) => w.kind === "wall" && w.slits > 0);
    // Zero crossings of f(t) − m along the screen, for each whole m.
    const solve = (f) => {
      const out = [],
        n = 2000;
      let prev = f(-sc.length / 2);
      for (let q = 1; q <= n; q++) {
        const t = -sc.length / 2 + (sc.length * q) / n,
          v = f(t);
        const lo = Math.ceil(Math.min(prev, v)),
          hi = Math.floor(Math.max(prev, v));
        for (let m = lo; m <= hi; m++)
          if (m !== prev || q === 1) {
            const t0 = t - sc.length / n,
              r = v === prev ? 0 : (m - prev) / (v - prev);
            out.push({ s: t0 + r * (sc.length / n), m });
          }
        prev = v;
      }
      return out;
    };
    if (wall) {
      const wa = unit(wall.angle),
        centres = slitOffsets(wall).map((o) => ({ x: wall.x + wa.x * o, y: wall.y + wa.y * o }));
      if (centres.length >= 2) {
        const [c1, c2] = centres,
          f = (t) => {
            const q = at(t);
            return (Math.hypot(q.x - c1.x, q.y - c1.y) - Math.hypot(q.x - c2.x, q.y - c2.y)) / lambda;
          };
        return { kind: "bright", list: solve(f), rule: "d sin θ = mλ (exact path difference from the slit centres)" };
      }
      // Single slit: θ measured from the wall's normal at the slit.
      const c = centres[0],
        normal = { x: -wa.y, y: wa.x },
        f = (t) => {
          const q = at(t),
            dx = q.x - c.x,
            dy = q.y - c.y,
            sin = (dx * wa.x + dy * wa.y) / Math.hypot(dx, dy);
          return (Math.abs(dx * normal.x + dy * normal.y) > 0 ? sin : 0) * (wall.slitWidth / lambda);
        };
      return { kind: "dark", list: solve(f).filter((r) => r.m !== 0), rule: "a sin θ = mλ (far field)" };
    }
    if (sources.length >= 2 && sources[0].kind === "point" && sources[1].kind === "point") {
      const [s1, s2] = sources;
      if (s1.frequency !== s2.frequency) return null;
      const f = (t) => {
        const q = at(t);
        return (
          (Math.hypot(q.x - s1.x, q.y - s1.y) - Math.hypot(q.x - s2.x, q.y - s2.y)) / lambda -
          (s1.phase - s2.phase) / (2 * Math.PI)
        );
      };
      return { kind: "bright", list: solve(f), rule: "r₁ − r₂ = mλ (exact path difference)" };
    }
    return null;
  }

  // -------------------------------------------------------------- files

  exportScene() {
    return {
      format: FORMAT,
      version: 1,
      tank: this.tank,
      items: this.list().map(({ id, start, ...rest }) => rest),
    };
  }
  static fromScene(data) {
    checkFormat(data, FORMAT);
    if (!data.tank || typeof data.tank !== "object") throw new Error("This scene file is damaged.");
    const lab = new WaveLab(data.tank);
    for (const { kind, ...props } of listOf(data.items)) {
      if (!KINDS.includes(kind)) throw new Error("This scene file is damaged.");
      lab.add(kind, props);
    }
    lab.reset();
    return lab;
  }
  loadScene(data) {
    const lab = WaveLab.fromScene(data);
    Object.assign(this, lab);
    for (const key of Object.getOwnPropertyNames(lab)) this[key] = lab[key];
  }
}
