// Field lab model: static electric and magnetic fields of simple sources, in
// SI units, y up. No DOM: everything here is testable from Node.
//
// The screen is a plane cut through a three-dimensional arrangement.
//   charge  point charge in the plane                    E = kq/r²
//   plate   charged strip, infinitely long into the screen, uniform σ
//   wire    long straight wire perpendicular to the screen, current I
//           (positive = out of the screen)               B = μ₀I/2πr
//   magnet  uniformly magnetised bar, infinitely long into the screen. It is
//           exactly equivalent to two current sheets on its long faces, which
//           is also an ideal solenoid seen in cross-section (K = nI).
// Every source is mirror-symmetric about the screen, so E and B at points on
// the screen lie in the screen and can be drawn there.

export const K_E = 8.9875517923e9; // N·m²/C²
export const EPS0 = 8.8541878128e-12; // F/m
export const MU0 = 1.25663706212e-6; // T·m/A

export const KINDS = {
  charge: { mode: "electric", label: "Point charge" },
  plate: { mode: "electric", label: "Charged plate" },
  wire: { mode: "magnetic", label: "Straight wire" },
  magnet: { mode: "magnetic", label: "Bar magnet / solenoid" },
};

// Allowed range of every editable quantity (SI). The menus in app.js mirror
// these; change both together.
export const LIMITS = {
  position: 1000,
  charge: 20e-9,
  density: 10e-9,
  current: 100,
  sheetCurrent: 500,
  length: [0.2, 20],
  width: [0.1, 10],
  uniformElectric: 1000,
  uniformMagnetic: 1000e-6,
  sources: 40,
};

const DEFAULTS = {
  charge: { charge: 1e-9 },
  plate: { length: 3, angle: 0, density: 0.2e-9 },
  wire: { current: 5 },
  magnet: { length: 2, width: 0.6, angle: 0, sheetCurrent: 50 },
};

const NAMES = {
  x: "Position x",
  y: "Position y",
  charge: "Charge",
  density: "Surface charge density",
  current: "Current",
  sheetCurrent: "Surface current",
  length: "Length",
  width: "Width",
  angle: "Angle",
};

function check(key, value) {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`${NAMES[key] || key} must be a number.`);
  let lo, hi;
  if (key === "x" || key === "y")
    [lo, hi] = [-LIMITS.position, LIMITS.position];
  else if (key === "angle") return value;
  else if (Array.isArray(LIMITS[key])) [lo, hi] = LIMITS[key];
  else [lo, hi] = [-LIMITS[key], LIMITS[key]];
  if (value < lo || value > hi)
    throw new Error(
      `${NAMES[key]} must be between ${formatLimit(key, lo)} and ${formatLimit(key, hi)}.`,
    );
  return value;
}

function formatLimit(key, v) {
  const shown = (x) => String(Number(x.toPrecision(6))).replace("-", "−");
  if (key === "charge") return shown(v * 1e9) + " nC";
  if (key === "density") return shown(v * 1e9) + " nC/m²";
  if (key === "current") return shown(v) + " A";
  if (key === "sheetCurrent") return shown(v) + " A/m";
  return shown(v) + " m";
}

// G = ∫ (r − r′)/|r − r′|² ds along a straight segment, and
// P = ∫ ln|r − r′|² ds (less a constant), so that ∇P = 2G. A strip of charge
// has E = σG/2πε₀ and V = −σP/4πε₀; a sheet of current has A_z = −μ₀KP/4π and
// B = μ₀K ẑ×G/2π.
const TINY = 1e-18;
function kernelG(px, py, s, out) {
  const dx = px - s.x,
    dy = py - s.y,
    u = dx * s.cos + dy * s.sin,
    v = -dx * s.sin + dy * s.cos,
    p = u + s.a,
    m = u - s.a,
    gu = 0.5 * Math.log((p * p + v * v + TINY) / (m * m + v * v + TINY)),
    av = Math.abs(v),
    gv = v === 0 ? 0 : Math.sign(v) * (Math.atan(p / av) - Math.atan(m / av));
  out[0] = gu * s.cos - gv * s.sin;
  out[1] = gu * s.sin + gv * s.cos;
}
function kernelP(px, py, s) {
  const dx = px - s.x,
    dy = py - s.y,
    u = dx * s.cos + dy * s.sin,
    v = -dx * s.sin + dy * s.cos,
    f = (w) =>
      w * Math.log(w * w + v * v + TINY) +
      (v === 0 ? 0 : 2 * v * Math.atan(w / v));
  return f(u + s.a) - f(u - s.a);
}

function segment(id, x, y, angle, length, strength) {
  return {
    id,
    x,
    y,
    cos: Math.cos(angle),
    sin: Math.sin(angle),
    a: length / 2,
    strength,
  };
}

export class FieldLab {
  constructor() {
    this.sources = [];
    this.nextId = 1;
    this.uniform = { electric: { x: 0, y: 0 }, magnetic: { x: 0, y: 0 } };
    this.cache = null;
  }

  list(mode) {
    return this.sources.filter((s) => !mode || KINDS[s.kind].mode === mode);
  }

  get(id) {
    return this.sources.find((s) => s.id === id) || null;
  }

  add(kind, props = {}) {
    if (!KINDS[kind]) throw new Error("Unknown kind of source.");
    const mode = KINDS[kind].mode;
    if (this.list(mode).length >= LIMITS.sources)
      throw new Error(
        `This scene already has ${LIMITS.sources} sources. Delete one first.`,
      );
    const source = { kind, x: 0, y: 0, ...DEFAULTS[kind] };
    for (const key of Object.keys(props)) {
      if (!(key in source)) throw new Error(`A ${kind} has no "${key}".`);
      source[key] = check(key, props[key]);
    }
    source.id = this.nextId++;
    this.sources.push(source);
    this.cache = null;
    return source.id;
  }

  // Atomic: every value is checked before any is applied.
  update(id, patch) {
    const source = this.get(id);
    if (!source) throw new Error("That source no longer exists.");
    const next = {};
    for (const key of Object.keys(patch)) {
      if (key === "id" || key === "kind" || !(key in source))
        throw new Error(`A ${source.kind} has no "${key}".`);
      next[key] = check(key, patch[key]);
    }
    Object.assign(source, next);
    this.cache = null;
  }

  remove(id) {
    this.sources = this.sources.filter((s) => s.id !== id);
    this.cache = null;
  }

  clear(mode) {
    this.sources = this.sources.filter((s) => KINDS[s.kind].mode !== mode);
    this.uniform[mode] = { x: 0, y: 0 };
    this.cache = null;
  }

  setUniform(mode, { x, y }) {
    const limit =
        mode === "electric" ? LIMITS.uniformElectric : LIMITS.uniformMagnetic,
      unit = mode === "electric" ? " N/C" : " µT",
      shown = mode === "electric" ? limit : limit * 1e6;
    for (const v of [x, y]) {
      if (typeof v !== "number" || !Number.isFinite(v))
        throw new Error("The background field must be a number.");
      if (Math.abs(v) > limit)
        throw new Error(
          `The background field must be between −${shown} and ${shown}${unit}.`,
        );
    }
    this.uniform[mode] = { x, y };
    this.cache = null;
  }

  // Sources flattened into the primitives the kernels work on.
  compiled() {
    if (this.cache) return this.cache;
    const c = { charges: [], strips: [], wires: [], sheets: [] };
    for (const s of this.sources) {
      if (s.kind === "charge")
        c.charges.push({ id: s.id, x: s.x, y: s.y, q: s.charge });
      else if (s.kind === "plate")
        c.strips.push(segment(s.id, s.x, s.y, s.angle, s.length, s.density));
      else if (s.kind === "wire")
        c.wires.push({ id: s.id, x: s.x, y: s.y, i: s.current });
      else {
        // Bound surface current K = M × n̂: out of the screen on the face to
        // the left of the magnetisation (which points S → N), into it on the
        // right. Inside, the two sheets add to B = μ₀K along the axis.
        const nx = -Math.sin(s.angle),
          ny = Math.cos(s.angle),
          h = s.width / 2;
        c.sheets.push(
          segment(
            s.id,
            s.x + nx * h,
            s.y + ny * h,
            s.angle,
            s.length,
            s.sheetCurrent,
          ),
          segment(
            s.id,
            s.x - nx * h,
            s.y - ny * h,
            s.angle,
            s.length,
            -s.sheetCurrent,
          ),
        );
      }
    }
    return (this.cache = c);
  }

  // E in N/C. `exclude` leaves one source out (for the force on it).
  electricField(x, y, exclude = 0, out = [0, 0]) {
    const c = this.compiled(),
      g = [0, 0];
    let ex = this.uniform.electric.x,
      ey = this.uniform.electric.y;
    for (const p of c.charges) {
      if (p.id === exclude) continue;
      const dx = x - p.x,
        dy = y - p.y,
        r2 = dx * dx + dy * dy + TINY,
        f = (K_E * p.q) / (r2 * Math.sqrt(r2));
      ex += f * dx;
      ey += f * dy;
    }
    for (const s of c.strips) {
      if (s.id === exclude) continue;
      kernelG(x, y, s, g);
      const f = s.strength / (2 * Math.PI * EPS0);
      ex += f * g[0];
      ey += f * g[1];
    }
    out[0] = ex;
    out[1] = ey;
    return out;
  }

  // Potential in volts. Point charges are measured from infinity. A plate is
  // infinitely long, so its potential has no zero at infinity: it is taken
  // as zero about 1 m away (the far field is −(λ/2πε₀) ln(r / 1 m)).
  potential(x, y) {
    const c = this.compiled();
    let v = -(this.uniform.electric.x * x + this.uniform.electric.y * y);
    for (const p of c.charges)
      v += (K_E * p.q) / Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2 + TINY);
    for (const s of c.strips)
      v -= (s.strength / (4 * Math.PI * EPS0)) * kernelP(x, y, s);
    return v;
  }

  // B in tesla.
  magneticField(x, y, exclude = 0, out = [0, 0]) {
    const c = this.compiled(),
      g = [0, 0];
    let bx = this.uniform.magnetic.x,
      by = this.uniform.magnetic.y;
    for (const w of c.wires) {
      if (w.id === exclude) continue;
      const dx = x - w.x,
        dy = y - w.y,
        f = (MU0 * w.i) / (2 * Math.PI * (dx * dx + dy * dy + TINY));
      bx -= f * dy;
      by += f * dx;
    }
    for (const s of c.sheets) {
      if (s.id === exclude) continue;
      kernelG(x, y, s, g);
      const f = (MU0 * s.strength) / (2 * Math.PI);
      bx -= f * g[1];
      by += f * g[0];
    }
    out[0] = bx;
    out[1] = by;
    return out;
  }

  // A_z in T·m, with B = (∂A/∂y, −∂A/∂x). Its contours are the field lines,
  // and the difference in A between two lines is the flux between them per
  // metre of depth.
  vectorPotential(x, y) {
    const c = this.compiled();
    let a = this.uniform.magnetic.x * y - this.uniform.magnetic.y * x;
    for (const w of c.wires)
      a -=
        ((MU0 * w.i) / (4 * Math.PI)) *
        Math.log((x - w.x) ** 2 + (y - w.y) ** 2 + TINY);
    for (const s of c.sheets)
      a -= ((MU0 * s.strength) / (4 * Math.PI)) * kernelP(x, y, s);
    return a;
  }

  // Force on a point charge (N), or force per metre on a wire (N/m), from
  // every other source and the background field. Null for plates and magnets.
  forceOn(id) {
    const s = this.get(id);
    if (!s) return null;
    if (s.kind === "charge") {
      const e = this.electricField(s.x, s.y, id);
      return { x: s.charge * e[0], y: s.charge * e[1] };
    }
    if (s.kind === "wire") {
      // F/L = I ẑ × B
      const b = this.magneticField(s.x, s.y, id);
      return { x: -s.current * b[1], y: s.current * b[0] };
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Electric field lines: integrate along E from the sources.

function gapFill(angles, total, reference) {
  // Directions for the lines still missing at a charge that already has some
  // arriving: spread them through the widest empty sectors.
  const need = total - angles.length;
  if (need <= 0) return [];
  if (!angles.length)
    return Array.from(
      { length: total },
      (_, k) => reference + (2 * Math.PI * k) / total,
    );
  const sorted = angles
    .map((a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI))
    .sort((a, b) => a - b);
  const gaps = sorted.map((a, i) => ({
    start: a,
    size:
      i + 1 < sorted.length ? sorted[i + 1] - a : sorted[0] + 2 * Math.PI - a,
    extra: 0,
  }));
  for (let n = 0; n < need; n++) {
    let best = gaps[0];
    for (const g of gaps)
      if (g.size / (g.extra + 1) > best.size / (best.extra + 1)) best = g;
    best.extra++;
  }
  const result = [];
  for (const g of gaps)
    for (let k = 1; k <= g.extra; k++)
      result.push(g.start + (g.size * k) / (g.extra + 1));
  return result;
}

// Starting points along a sampled boundary, one per `quantum` of flux through
// it: the flux is divided into equal shares and a line starts at the middle
// of each, so a symmetric boundary gets a symmetric set of lines.
function fluxSeeds(flux, quantum, limit) {
  let total = 0;
  for (const f of flux) total += f;
  const count = Math.min(limit, Math.round(total / quantum)),
    seeds = [];
  if (count < 1) return seeds;
  const share = total / count;
  let sum = 0,
    next = share / 2;
  for (let i = 0; i < flux.length && seeds.length < count; i++) {
    const before = sum;
    sum += flux[i];
    while (sum >= next && seeds.length < count) {
      seeds.push(i + (flux[i] > 0 ? (next - before) / flux[i] : 0.5));
      next += share;
    }
  }
  return seeds;
}

/**
 * Field lines of the electric scene inside `bounds` ({minX, maxX, minY, maxY}).
 * Each line is an array of [x, y] ordered along E.
 *
 * Lines leave each positive charge evenly in angle, `linesPerNC` per
 * nanocoulomb, and the same number arrive at each negative charge. Plates and
 * the background field are seeded by flux, so equal fields give equal spacing.
 */
export function electricFieldLines(lab, bounds, options = {}) {
  const {
      linesPerNC = 8,
      step = 0.08,
      startRadius = 0.05,
      maxLines = 500,
      maxSteps = 6000,
    } = options,
    c = lab.compiled(),
    e = [0, 0],
    hMin = step / 50,
    // Flux per line and per metre of depth, for plates and background field.
    quantum = 1e-9 / (EPS0 * linesPerNC * 2),
    lines = [],
    chargeArrivals = new Map(c.charges.map((p) => [p.id, []])),
    plateArrivals = new Map();

  const unit = (x, y, dir) => {
    lab.electricField(x, y, 0, e);
    const m = Math.hypot(e[0], e[1]);
    if (!(m > 1e-14)) return null;
    return [(dir * e[0]) / m, (dir * e[1]) / m];
  };

  function trace(x, y, dir, first) {
    const points = first ? [first, [x, y]] : [[x, y]];
    let end = { type: "steps" };
    for (let n = 0; n < maxSteps; n++) {
      let h = step;
      for (const p of c.charges)
        h = Math.min(h, 0.3 * Math.hypot(x - p.x, y - p.y));
      for (const s of c.strips) {
        const u = (x - s.x) * s.cos + (y - s.y) * s.sin,
          v = -(x - s.x) * s.sin + (y - s.y) * s.cos,
          d = Math.hypot(Math.max(0, Math.abs(u) - s.a), v);
        h = Math.min(h, Math.max(0.5 * d, hMin));
      }
      h = Math.max(h, hMin);
      const k1 = unit(x, y, dir);
      if (!k1) return { points, end: { type: "null" } };
      // About to reach a plate: finish the approach in a straight line, so
      // that no sample of the step below lands beyond the plate, where the
      // field is different.
      let hit = null;
      for (const s of c.strips) {
        const v0 = -(x - s.x) * s.sin + (y - s.y) * s.cos,
          kn = -k1[0] * s.sin + k1[1] * s.cos;
        if (v0 === 0 || v0 * kn >= 0 || 1.5 * h * Math.abs(kn) < Math.abs(v0))
          continue;
        const f = Math.abs(v0 / kn),
          hx = x + k1[0] * f,
          hy = y + k1[1] * f,
          u = (hx - s.x) * s.cos + (hy - s.y) * s.sin;
        if (Math.abs(u) > s.a) continue;
        if (!hit || f < hit.f) hit = { f, hx, hy, u, s, side: Math.sign(v0) };
      }
      let nx = 0,
        ny = 0;
      if (!hit) {
        // Fourth-order Runge–Kutta along the unit field direction.
        const k2 = unit(x + (h / 2) * k1[0], y + (h / 2) * k1[1], dir);
        if (!k2) return { points, end: { type: "null" } };
        const k3 = unit(x + (h / 2) * k2[0], y + (h / 2) * k2[1], dir);
        if (!k3) return { points, end: { type: "null" } };
        const k4 = unit(x + h * k3[0], y + h * k3[1], dir);
        if (!k4) return { points, end: { type: "null" } };
        nx = x + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
        ny = y + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
        for (const s of c.strips) {
          const v0 = -(x - s.x) * s.sin + (y - s.y) * s.cos,
            v1 = -(nx - s.x) * s.sin + (ny - s.y) * s.cos;
          if (v0 === 0 || v0 * v1 > 0) continue;
          const f = v0 / (v0 - v1),
            hx = x + f * (nx - x),
            hy = y + f * (ny - y),
            u = (hx - s.x) * s.cos + (hy - s.y) * s.sin;
          if (Math.abs(u) > s.a) continue;
          if (!hit || f < hit.f) hit = { f, hx, hy, u, s, side: Math.sign(v0) };
        }
      }
      // At a plate the normal field jumps by σ/ε₀. The line ends there
      // unless the field carries it on through.
      if (hit) {
        const s = hit.s,
          // Unit normal pointing to the far side of the plate.
          fx = s.sin * hit.side,
          fy = -s.cos * hit.side;
        points.push([hit.hx, hit.hy]);
        lab.electricField(hit.hx + fx * 1e-6, hit.hy + fy * 1e-6, 0, e);
        if (dir * (e[0] * fx + e[1] * fy) > 0) {
          x = hit.hx + fx * hMin * 0.5;
          y = hit.hy + fy * hMin * 0.5;
          continue;
        }
        return {
          points,
          end: {
            type: "plate",
            id: s.id,
            side: hit.side,
            t: hit.u / (2 * s.a) + 0.5,
          },
        };
      }

      for (const p of c.charges) {
        if (p.q * dir >= 0) continue;
        const d = Math.hypot(nx - p.x, ny - p.y);
        if (d < startRadius) {
          const angle = Math.atan2(ny - p.y, nx - p.x);
          points.push([
            p.x + startRadius * Math.cos(angle),
            p.y + startRadius * Math.sin(angle),
          ]);
          return { points, end: { type: "charge", id: p.id, angle } };
        }
      }
      x = nx;
      y = ny;
      points.push([x, y]);
      if (
        x < bounds.minX ||
        x > bounds.maxX ||
        y < bounds.minY ||
        y > bounds.maxY
      ) {
        end = { type: "bounds" };
        break;
      }
    }
    return { points, end };
  }

  function launch(x, y, dir, first) {
    if (lines.length >= maxLines) return;
    const { points, end } = trace(x, y, dir, first);
    if (end.type === "charge") chargeArrivals.get(end.id).push(end.angle);
    if (end.type === "plate") {
      const key = end.id + ":" + end.side;
      if (!plateArrivals.has(key)) plateArrivals.set(key, []);
      plateArrivals.get(key).push({ t: end.t, used: false });
    }
    if (points.length > 1) lines.push(dir > 0 ? points : points.reverse());
  }

  const wanted = (p) =>
    Math.min(64, Math.max(1, Math.round((linesPerNC * Math.abs(p.q)) / 1e-9)));
  const reference = (p, sign) => {
    lab.electricField(p.x, p.y, p.id, e);
    return Math.hypot(e[0], e[1]) > 1e-12
      ? Math.atan2(sign * e[1], sign * e[0])
      : 0;
  };

  // Net flux leaving each face of a plate, sampled just off its surface.
  const SAMPLES = 160;
  function faceFlux(s, side, sign) {
    const flux = new Array(SAMPLES);
    for (let i = 0; i < SAMPLES; i++) {
      const u = ((i + 0.5) / SAMPLES - 0.5) * 2 * s.a,
        x = s.x + u * s.cos - side * 1e-6 * s.sin,
        y = s.y + u * s.sin + side * 1e-6 * s.cos;
      lab.electricField(x, y, 0, e);
      const outward = side * (-e[0] * s.sin + e[1] * s.cos);
      flux[i] = Math.max(0, sign * outward) * ((2 * s.a) / SAMPLES);
    }
    return flux;
  }
  function launchFromFace(s, side, dir, skip) {
    const seeds = fluxSeeds(faceFlux(s, side, dir), quantum, 80),
      arrivals = plateArrivals.get(s.id + ":" + side) || [];
    seeds.forEach((seed, k) => {
      const t = seed / SAMPLES;
      if (skip) {
        // A line from elsewhere already ends here.
        const spacing = Math.min(
            k > 0 ? seed - seeds[k - 1] : Infinity,
            k + 1 < seeds.length ? seeds[k + 1] - seed : Infinity,
            SAMPLES,
          ),
          match = arrivals.find(
            (a) => !a.used && Math.abs(a.t - t) < (0.5 * spacing) / SAMPLES,
          );
        if (match) {
          match.used = true;
          return;
        }
      }
      const u = (t - 0.5) * 2 * s.a,
        fx = s.x + u * s.cos,
        fy = s.y + u * s.sin,
        off = side * hMin * 0.5;
      launch(fx - off * s.sin, fy + off * s.cos, dir, [fx, fy]);
    });
  }

  // 1. Lines entering through the edge of the region, when a background
  //    field brings them in from far away.
  const uniform = lab.uniform.electric;
  if (uniform.x || uniform.y) {
    const N = 120,
      w = bounds.maxX - bounds.minX,
      hgt = bounds.maxY - bounds.minY,
      edges = [
        [bounds.minX, bounds.minY, 0, hgt, 1, 0],
        [bounds.maxX, bounds.minY, 0, hgt, -1, 0],
        [bounds.minX, bounds.minY, w, 0, 0, 1],
        [bounds.minX, bounds.maxY, w, 0, 0, -1],
      ],
      flux = [],
      at = [];
    for (const [x0, y0, dx, dy, nx, ny] of edges)
      for (let i = 0; i < N; i++) {
        const f = (i + 0.5) / N,
          x = x0 + dx * f + nx * hMin,
          y = y0 + dy * f + ny * hMin;
        lab.electricField(x, y, 0, e);
        flux.push(
          Math.max(0, e[0] * nx + e[1] * ny) * (Math.hypot(dx, dy) / N),
        );
        at.push([x0, y0, dx, dy, nx, ny]);
      }
    for (const seed of fluxSeeds(flux, quantum, 160)) {
      const i = Math.min(flux.length - 1, Math.floor(seed)),
        [x0, y0, dx, dy, nx, ny] = at[i],
        f = ((i % N) + (seed - i)) / N;
      launch(x0 + dx * f + nx * hMin, y0 + dy * f + ny * hMin, 1);
    }
  }
  // 2. Out of every positive charge.
  for (const p of c.charges) {
    if (!(p.q > 0)) continue;
    const n = wanted(p),
      ref = reference(p, 1);
    for (let k = 0; k < n; k++) {
      const a = ref + (2 * Math.PI * k) / n;
      launch(
        p.x + startRadius * Math.cos(a),
        p.y + startRadius * Math.sin(a),
        1,
      );
    }
  }
  // 3. Out of plate faces the field leaves.
  for (const s of c.strips)
    for (const side of [1, -1]) launchFromFace(s, side, 1, false);
  // 4. Into every negative charge: trace backwards wherever too few of the
  //    lines above arrived.
  for (const p of c.charges) {
    if (!(p.q < 0)) continue;
    const ref = reference(p, -1);
    for (const a of gapFill(chargeArrivals.get(p.id), wanted(p), ref))
      launch(
        p.x + startRadius * Math.cos(a),
        p.y + startRadius * Math.sin(a),
        -1,
      );
  }
  // 5. Into plate faces the field enters, likewise.
  for (const s of c.strips)
    for (const side of [1, -1]) launchFromFace(s, side, -1, true);
  return lines;
}

// ---------------------------------------------------------------------------
// Contours (marching squares), for equipotentials and magnetic field lines.

/**
 * Contours of a sampled function at `level`. `values` is row-major, nx by ny.
 * Returns polylines in grid coordinates ([column, row], fractional).
 */
export function contourLines(values, nx, ny, level) {
  const segments = [],
    byEdge = new Map();
  const add = (a, b) => {
    const index = segments.length;
    segments.push([a, b, false]);
    for (const edge of [a, b]) {
      const list = byEdge.get(edge);
      if (list) list.push(index);
      else byEdge.set(edge, [index]);
    }
  };
  for (let j = 0; j < ny - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const k = j * nx + i,
        a = values[k],
        b = values[k + 1],
        c = values[k + nx + 1],
        d = values[k + nx];
      if (!Number.isFinite(a + b + c + d)) continue;
      const mask =
        (a > level ? 8 : 0) |
        (b > level ? 4 : 0) |
        (c > level ? 2 : 0) |
        (d > level ? 1 : 0);
      if (mask === 0 || mask === 15) continue;
      const T = 2 * k,
        B = 2 * (k + nx),
        L = 2 * k + 1,
        R = 2 * (k + 1) + 1;
      switch (mask) {
        case 1:
        case 14:
          add(L, B);
          break;
        case 2:
        case 13:
          add(B, R);
          break;
        case 3:
        case 12:
          add(L, R);
          break;
        case 4:
        case 11:
          add(T, R);
          break;
        case 6:
        case 9:
          add(T, B);
          break;
        case 7:
        case 8:
          add(L, T);
          break;
        default: {
          // Saddle: the cell centre decides which corners are joined.
          const high = (a + b + c + d) / 4 > level;
          if ((mask === 5) === high) {
            add(L, T);
            add(B, R);
          } else {
            add(T, R);
            add(L, B);
          }
        }
      }
    }
  const point = (edge) => {
    const k = edge >> 1,
      i = k % nx,
      j = (k - i) / nx;
    if (edge & 1) {
      const v0 = values[k],
        v1 = values[k + nx];
      return [i, j + (level - v0) / (v1 - v0)];
    }
    const v0 = values[k],
      v1 = values[k + 1];
    return [i + (level - v0) / (v1 - v0), j];
  };
  const lines = [];
  const extend = (edge, chain, push) => {
    for (;;) {
      const next = byEdge.get(edge).find((s) => !segments[s][2]);
      if (next === undefined) return;
      const seg = segments[next];
      seg[2] = true;
      edge = seg[0] === edge ? seg[1] : seg[0];
      push.call(chain, edge);
    }
  };
  for (const seg of segments) {
    if (seg[2]) continue;
    seg[2] = true;
    const chain = [seg[0], seg[1]];
    extend(seg[1], chain, chain.push);
    extend(seg[0], chain, chain.unshift);
    lines.push(chain.map(point));
  }
  return lines;
}

function sample(fn, bounds, cell) {
  const nx = Math.max(2, Math.ceil((bounds.maxX - bounds.minX) / cell) + 1),
    ny = Math.max(2, Math.ceil((bounds.maxY - bounds.minY) / cell) + 1),
    values = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++)
      values[j * nx + i] = fn(bounds.minX + i * cell, bounds.minY + j * cell);
  return { nx, ny, values };
}

const toWorld = (bounds, cell) => (p) => [
  bounds.minX + p[0] * cell,
  bounds.minY + p[1] * cell,
];

/**
 * Equipotentials at equal steps of potential, so close lines mean a strong
 * field. The step is a round number of volts chosen to give about `count`
 * lines; the few percent of the region closest to the charges, where the
 * lines would merge, is left clear.
 */
export function equipotentialLines(lab, bounds, options = {}) {
  const { cell = 0.06, count = 14 } = options,
    grid = sample((x, y) => lab.potential(x, y), bounds, cell),
    sorted = Float64Array.from(grid.values).sort(),
    lo = sorted[Math.floor(0.03 * (sorted.length - 1))],
    hi = sorted[Math.ceil(0.97 * (sorted.length - 1))],
    scale = Math.max(Math.abs(lo), Math.abs(hi));
  if (!(hi - lo > 1e-9 * scale) || !(scale > 1e-12))
    return { lines: [], step: 0 };
  // Round the step to 1, 2 or 5 × 10ⁿ volts.
  const raw = (hi - lo) / count,
    power = 10 ** Math.floor(Math.log10(raw)),
    step =
      power *
      (raw / power < 1.5
        ? 1
        : raw / power < 3.5
          ? 2
          : raw / power < 7.5
            ? 5
            : 10),
    lines = [],
    map = toWorld(bounds, cell);
  for (let n = Math.ceil(lo / step); n <= Math.floor(hi / step); n++)
    for (const line of contourLines(grid.values, grid.nx, grid.ny, n * step))
      lines.push({ level: n * step, points: line.map(map) });
  return { lines, step };
}

/**
 * Magnetic field lines as contours of A_z at equal steps, ordered along B.
 * Adjacent lines enclose equal flux, so their spacing is inversely
 * proportional to |B| everywhere. The step is rescaled to give about `count`
 * lines across the region outside `coreRadius` of each wire.
 */
export function magneticFieldLines(lab, bounds, options = {}) {
  const { cell = 0.06, count = 14, coreRadius = 0.15 } = options,
    wires = lab.compiled().wires,
    grid = sample((x, y) => lab.vectorPotential(x, y), bounds, cell);
  let lo = Infinity,
    hi = -Infinity;
  for (let j = 0; j < grid.ny; j++)
    for (let i = 0; i < grid.nx; i++) {
      const x = bounds.minX + i * cell,
        y = bounds.minY + j * cell;
      if (wires.some((w) => Math.hypot(x - w.x, y - w.y) < coreRadius))
        continue;
      const v = grid.values[j * grid.nx + i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  const scale = Math.max(Math.abs(lo), Math.abs(hi));
  if (!(hi - lo > 1e-9 * scale) || !(scale > 1e-18))
    return { lines: [], step: 0 };
  // Step from a ladder of ten values per decade, so the picture does not
  // jump while a source is dragged.
  const step = 10 ** (Math.ceil(10 * Math.log10((hi - lo) / count)) / 10),
    lines = [],
    map = toWorld(bounds, cell),
    b = [0, 0];
  for (let n = Math.ceil(lo / step - 0.5); (n + 0.5) * step <= hi; n++) {
    const level = (n + 0.5) * step;
    if (level < lo) continue;
    for (const line of contourLines(grid.values, grid.nx, grid.ny, level)) {
      if (line.length < 2) continue;
      const points = line.map(map),
        k = Math.floor((points.length - 1) / 2),
        p = points[k],
        q = points[k + 1];
      lab.magneticField((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, 0, b);
      if (b[0] * (q[0] - p[0]) + b[1] * (q[1] - p[1]) < 0) points.reverse();
      lines.push(points);
    }
  }
  return { lines, step };
}
