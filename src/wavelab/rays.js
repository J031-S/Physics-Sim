// Rays view of the waves, light & sound tool: geometric optics by exact ray
// tracing. Every surface refracts by Snell's law in vector form (never the
// small-angle approximation), so real lenses and mirrors show spherical
// aberration; Fresnel's equations (unpolarised average) give the share of
// light reflected at each refracting surface, and Cauchy's equation the
// index at each wavelength. No DOM.
//
// SI throughout: metres, radians anticlockwise from +x, wavelengths in
// metres. y is up.
//
// Sign convention (real is positive), used for every readout:
//   - object distance u is positive for a real object (in front of the first
//     element, on the side the light comes from);
//   - image distance v is positive for a real image (on the side the light
//     leaves by: beyond a lens, in front of a mirror) and negative for a
//     virtual one;
//   - focal length f is positive for a converging lens or a concave mirror;
//   - a surface radius is positive when its centre of curvature is on the
//     side the light leaves by (R₁ > 0, R₂ < 0 for a biconvex lens; R > 0
//     for a concave mirror);
//   - magnification m = −v/u is negative for an inverted image.
// With it the thin-lens and mirror equations are both 1/f = 1/u + 1/v.
import { checkFormat, listOf } from "../scene-format.js";

export const FORMAT = "physium-rays";

// Cauchy's equation n = A + B/λ², λ in micrometres, fitted to each
// material's index at the sodium D line (589.3 nm) and its Abbe number
// (the spread between the hydrogen F and C lines, 486.1 and 656.3 nm).
// Typical values: crown is BK7 (n_d 1.5168, V 64.2), flint is F2 (1.620,
// 36.4), water at 20 °C (1.333, 55.7), acrylic is PMMA (1.4917, 57.4).
export const MATERIALS = {
  crown: { name: "Crown glass", A: 1.50466, B: 0.004217 },
  flint: { name: "Flint glass", A: 1.59432, B: 0.008917 },
  water: { name: "Water", A: 1.32399, B: 0.00313 },
  acrylic: { name: "Acrylic", A: 1.47878, B: 0.004485 },
};
export const cauchy = ({ A, B }, wavelength) => {
  const um = wavelength * 1e6;
  return A + B / (um * um);
};
// The wavelengths that make up "white" light: seven rays across the visible.
export const WHITE = [400e-9, 450e-9, 500e-9, 550e-9, 600e-9, 650e-9, 700e-9];
export const GREEN = 550e-9;

// Snell's law at a boundary: the angle of refraction for an angle of
// incidence (radians, from the normal), or null beyond the critical angle.
export function snellAngle(n1, n2, incidence) {
  const s = (n1 / n2) * Math.sin(incidence);
  return Math.abs(s) > 1 ? null : Math.asin(s);
}
export const criticalAngle = (n1, n2) => (n1 > n2 ? Math.asin(n2 / n1) : null);

// Fresnel's equations for the reflected share of the power: s and p
// polarisations and their average, which is what unpolarised light
// reflects. Beyond the critical angle everything is reflected.
export function fresnel(n1, n2, incidence) {
  const ci = Math.cos(incidence),
    st = (n1 / n2) * Math.sin(incidence);
  if (st >= 1) return { Rs: 1, Rp: 1, R: 1, tir: true };
  const ct = Math.sqrt(1 - st * st),
    rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct),
    rp = (n1 * ct - n2 * ci) / (n1 * ct + n2 * ci);
  const Rs = rs * rs,
    Rp = rp * rp;
  return { Rs, Rp, R: (Rs + Rp) / 2, tir: false };
}

// ---------------------------------------------------------------- kinds

// `angle` is always the element's axis: the direction its front faces (a
// mirror, screen or stop) or the direction light is meant to go through it
// (a lens). A refracting element has a `material` (a key of MATERIALS, or
// "fixed" with an `index` that is the same at every wavelength).
const deg = Math.PI / 180;
const L = { min: 1e-4, max: 100 };
export const LIMITS = {
  position: { min: -100, max: 100 },
  length: L,
  radius: { min: 1e-3, max: 100 }, // |R|; 0 means flat
  focal: { min: 1e-3, max: 100 }, // |f|
  index: { min: 1, max: 3 },
  wavelength: { min: 380e-9, max: 750e-9 },
  count: { min: 1, max: 101 },
  spread: { min: 0, max: Math.PI },
  apex: { min: 5 * deg, max: 150 * deg },
  thickness: { min: 0, max: 10 },
  medium: { min: 1, max: 3 },
};
const OPTICS = ["mirror", "sphericalMirror", "parabolicMirror", "block", "prism", "lens", "thinLens", "screen", "stop"];
const SOURCES = ["ray", "beam", "point", "object"];
export const KINDS = [...OPTICS, ...SOURCES];
const REFRACTING = new Set(["block", "prism", "lens"]);

const DEFAULTS = {
  mirror: { x: 0, y: 0, angle: Math.PI, length: 0.2 },
  sphericalMirror: { x: 0, y: 0, angle: Math.PI, radius: 0.4, aperture: 0.15 },
  parabolicMirror: { x: 0, y: 0, angle: Math.PI, f: 0.2, aperture: 0.3 },
  block: { x: 0, y: 0, angle: 0, width: 0.2, height: 0.1, material: "crown", index: 1.5 },
  prism: { x: 0, y: 0, angle: 0, apex: 60 * deg, side: 0.12, material: "crown", index: 1.5 },
  lens: { x: 0, y: 0, angle: 0, R1: 0.2, R2: -0.2, thickness: 0.01, aperture: 0.08, material: "crown", index: 1.5 },
  thinLens: { x: 0, y: 0, angle: 0, f: 0.1, aperture: 0.1 },
  screen: { x: 0, y: 0, angle: Math.PI, length: 0.2 },
  stop: { x: 0, y: 0, angle: 0, opening: 0.03, length: 0.15 },
  ray: { x: 0, y: 0, angle: 0, wavelength: GREEN },
  beam: { x: 0, y: 0, angle: 0, width: 0.05, count: 9, wavelength: GREEN },
  point: { x: 0, y: 0, angle: 0, spread: 30 * deg, count: 13, wavelength: GREEN },
  object: { x: 0, y: 0, angle: 0, height: 0.02, spread: 16 * deg, count: 9, wavelength: GREEN },
};
// What may be changed on each kind, and how it is checked.
const FIELDS = {
  x: "position",
  y: "position",
  angle: "angle",
  length: "length",
  width: "length",
  height: "signedLength",
  aperture: "length",
  side: "length",
  opening: "length",
  radius: "radius",
  R1: "radius",
  R2: "radius",
  f: "focal",
  thickness: "thickness",
  apex: "apex",
  index: "index",
  material: "material",
  wavelength: "wavelength",
  count: "count",
  spread: "spread",
};
const NAMES = {
  mirror: "Plane mirror",
  sphericalMirror: "Spherical mirror",
  parabolicMirror: "Parabolic mirror",
  block: "Block",
  prism: "Prism",
  lens: "Lens",
  thinLens: "Ideal thin lens",
  screen: "Screen",
  stop: "Aperture stop",
  ray: "Ray",
  beam: "Parallel beam",
  point: "Point source",
  object: "Object",
};
export const kindName = (kind) => NAMES[kind];
export const isSource = (kind) => SOURCES.includes(kind);

function checkValue(key, value, kind) {
  const type = FIELDS[key],
    bad = (text) => {
      throw new Error(text);
    },
    number = () => {
      if (typeof value !== "number" || !Number.isFinite(value))
        bad(`The ${key} must be a number.`);
    },
    range = (lim, text) => {
      if (value < lim.min || value > lim.max) bad(text);
    };
  switch (type) {
    case "position":
      number();
      return range(LIMITS.position, "Keep everything within 100 m of the middle.");
    case "angle":
      number();
      return;
    case "length":
      number();
      return range(L, `The ${key} must be between 0.1 mm and 100 m.`);
    case "signedLength":
      number();
      if (Math.abs(value) < L.min || Math.abs(value) > L.max)
        bad("The object's height must be between 0.1 mm and 100 m (either way up).");
      return;
    case "radius":
      number();
      if (value !== 0 && (Math.abs(value) < LIMITS.radius.min || Math.abs(value) > LIMITS.radius.max))
        bad("A radius of curvature must be between 1 mm and 100 m either way, or 0 for a flat surface.");
      if (kind === "sphericalMirror" && value === 0)
        bad("A spherical mirror needs a radius; use the plane mirror for a flat one.");
      return;
    case "focal":
      number();
      if (Math.abs(value) < LIMITS.focal.min || Math.abs(value) > LIMITS.focal.max)
        bad("The focal length must be between 1 mm and 100 m, either sign (not zero).");
      if (kind === "parabolicMirror" && value < 0)
        bad("A parabolic mirror here is concave: its focal length is positive.");
      return;
    case "thickness":
      number();
      return range(LIMITS.thickness, "The thickness must be between 0 and 10 m.");
    case "apex":
      number();
      return range(LIMITS.apex, "The apex angle must be between 5° and 150°.");
    case "index":
      number();
      return range(LIMITS.index, "A refractive index must be between 1.00 and 3.00.");
    case "material":
      if (value !== "fixed" && !Object.hasOwn(MATERIALS, value))
        bad("Choose one of the listed materials.");
      return;
    case "wavelength":
      if (value === "white") return;
      number();
      return range(LIMITS.wavelength, "A wavelength must be between 380 nm and 750 nm, or white light.");
    case "count":
      if (!Number.isInteger(value)) bad("The number of rays must be a whole number.");
      return range(LIMITS.count, "Use between 1 and 101 rays.");
    case "spread":
      number();
      return range(LIMITS.spread, "The spread must be between 0° and 180°.");
  }
}

// ---------------------------------------------------------------- geometry

const EPS = 1e-9; // metres: how far along a ray the next hit must be
const NUDGE = 1e-9; // metres: how far off a surface the two media are sampled
const FAR = 1000; // metres: how far a ray that hits nothing is drawn
const unit = (a) => ({ x: Math.cos(a), y: Math.sin(a) });
const add = (p, d, t = 1) => ({ x: p.x + d.x * t, y: p.y + d.y * t });
const dot = (a, b) => a.x * b.x + a.y * b.y;
// The frame of an element: origin, axis a and its left-hand perpendicular p.
function frame(el) {
  const a = unit(el.angle);
  return { o: { x: el.x, y: el.y }, a, p: { x: -a.y, y: a.x } };
}
const toWorld = (f, u, v) => ({ x: f.o.x + f.a.x * u + f.p.x * v, y: f.o.y + f.a.y * u + f.p.y * v });
const toLocal = (f, q) => {
  const dx = q.x - f.o.x,
    dy = q.y - f.o.y;
  return { u: dx * f.a.x + dy * f.a.y, v: dx * f.p.x + dy * f.p.y };
};
// Sag of a spherical surface of signed radius R at height v from its axis:
// how far the surface lies along the axis from its vertex (0 if flat).
const sag = (R, v) => (R === 0 ? 0 : R - Math.sign(R) * Math.sqrt(R * R - v * v));

function polygonOf(el) {
  const f = frame(el);
  if (el.kind === "block") {
    const w = el.width / 2,
      h = el.height / 2;
    return [
      [-w, -h],
      [w, -h],
      [w, h],
      [-w, h],
    ].map(([u, v]) => toWorld(f, u, v));
  }
  // Prism: isosceles, apex towards +p (up when angle is 0), the centroid at
  // (x, y).
  const b = el.side * Math.sin(el.apex / 2),
    H = el.side * Math.cos(el.apex / 2);
  return [
    [0, (2 * H) / 3],
    [-b, -H / 3],
    [b, -H / 3],
  ].map(([u, v]) => toWorld(f, u, v));
}
// The lens's front and back vertices along its axis, and its edge.
function lensShape(el) {
  const half = el.aperture / 2,
    front = -el.thickness / 2,
    back = el.thickness / 2;
  return {
    half,
    front,
    back,
    frontEdge: front + sag(el.R1, half),
    backEdge: back + sag(el.R2, half),
  };
}

// The surfaces of an element: line segments, spherical caps and parabolas,
// each with what it does to a ray (`role`).
function surfacesOf(el) {
  const f = frame(el),
    seg = (a, b, role) => ({ type: "segment", a, b, role, el });
  switch (el.kind) {
    case "mirror":
    case "screen": {
      const h = el.length / 2;
      return [seg(toWorld(f, 0, -h), toWorld(f, 0, h), el.kind === "mirror" ? "mirror" : "absorb")];
    }
    case "stop": {
      const g = el.opening / 2,
        h = el.length / 2;
      return [seg(toWorld(f, 0, g), toWorld(f, 0, h), "absorb"), seg(toWorld(f, 0, -h), toWorld(f, 0, -g), "absorb")];
    }
    case "thinLens": {
      const h = el.aperture / 2;
      return [seg(toWorld(f, 0, -h), toWorld(f, 0, h), "thin")];
    }
    case "sphericalMirror":
      return [{ type: "cap", f, R: el.radius, u0: 0, half: el.aperture / 2, role: "mirror", el }];
    case "parabolicMirror":
      return [{ type: "parabola", f, focal: el.f, half: el.aperture / 2, role: "mirror", el }];
    case "block":
    case "prism": {
      const pts = polygonOf(el);
      return pts.map((p, i) => seg(p, pts[(i + 1) % pts.length], "refract"));
    }
    case "lens": {
      const s = lensShape(el),
        face = (R, u0) =>
          R === 0
            ? seg(toWorld(f, u0, -s.half), toWorld(f, u0, s.half), "refract")
            : { type: "cap", f, R, u0, half: s.half, role: "refract", el };
      const out = [face(el.R1, s.front), face(el.R2, s.back)];
      if (s.backEdge - s.frontEdge > 1e-12)
        for (const v of [s.half, -s.half])
          out.push(seg(toWorld(f, s.frontEdge, v), toWorld(f, s.backEdge, v), "refract"));
      return out;
    }
  }
  return [];
}

// Is the point inside a refracting element?
function contains(el, q) {
  if (el.kind === "lens") {
    const f = frame(el),
      { u, v } = toLocal(f, q),
      s = lensShape(el);
    if (Math.abs(v) > s.half) return false;
    return u >= s.front + sag(el.R1, v) && u <= s.back + sag(el.R2, v);
  }
  const pts = polygonOf(el);
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i],
      b = pts[j];
    if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}

// The nearest crossing of a ray (origin o, unit direction d) with a
// surface beyond EPS: { t, normal } or null. The normal is a unit vector,
// either way round.
function intersect(s, o, d) {
  if (s.type === "segment") {
    const ex = s.b.x - s.a.x,
      ey = s.b.y - s.a.y,
      den = d.x * ey - d.y * ex;
    if (den === 0) return null;
    const wx = s.a.x - o.x,
      wy = s.a.y - o.y,
      t = (wx * ey - wy * ex) / den,
      k = (wx * d.y - wy * d.x) / den;
    if (t <= EPS || k < 0 || k > 1) return null;
    const len = Math.hypot(ex, ey);
    return { t, normal: { x: -ey / len, y: ex / len } };
  }
  const f = s.f,
    lo = toLocal(f, o),
    du = dot(d, f.a),
    dv = dot(d, f.p);
  if (s.type === "cap") {
    // Circle of radius |R| centred R along the axis from the vertex at u0;
    // the cap is the part with |v| ≤ half on the vertex's side of the centre.
    const cu = s.u0 + s.R,
      pu = lo.u - cu,
      pv = lo.v,
      b = pu * du + pv * dv,
      c = pu * pu + pv * pv - s.R * s.R,
      disc = b * b - c;
    if (disc < 0) return null;
    const r = Math.sqrt(disc),
      // The two roots, computed without cancellation.
      q = b > 0 ? -b - r : -b + r,
      roots = [q, q !== 0 ? c / q : -b].sort((x, y) => x - y);
    for (const t of roots) {
      if (!(t > EPS)) continue;
      const u = lo.u + t * du - cu,
        v = lo.v + t * dv;
      if (Math.abs(v) <= s.half && u * s.R < 0) {
        const nu = u / Math.abs(s.R),
          nv = v / Math.abs(s.R);
        return { t, normal: { x: f.a.x * nu + f.p.x * nv, y: f.a.y * nu + f.p.y * nv } };
      }
    }
    return null;
  }
  // Parabola u = v²/4F: (lo.v + t dv)² − 4F (lo.u + t du) = 0.
  const F = s.focal,
    A = dv * dv,
    B = 2 * lo.v * dv - 4 * F * du,
    C = lo.v * lo.v - 4 * F * lo.u;
  let roots;
  if (Math.abs(A) < 1e-300) roots = B === 0 ? [] : [-C / B];
  else {
    const disc = B * B - 4 * A * C;
    if (disc < 0) return null;
    const r = Math.sqrt(disc),
      q = -0.5 * (B + (B >= 0 ? r : -r));
    roots = [q / A, q !== 0 ? C / q : -B / (2 * A)].sort((x, y) => x - y);
  }
  for (const t of roots) {
    if (!(t > EPS)) continue;
    const v = lo.v + t * dv;
    if (Math.abs(v) > s.half) continue;
    // Gradient of v² − 4F u.
    const nu = -4 * F,
      nv = 2 * v,
      len = Math.hypot(nu, nv);
    return { t, normal: { x: (f.a.x * nu + f.p.x * nv) / len, y: (f.a.y * nu + f.p.y * nv) / len } };
  }
  return null;
}

const reflect = (d, n) => {
  const k = 2 * dot(d, n);
  return { x: d.x - k * n.x, y: d.y - k * n.y };
};

// ---------------------------------------------------------------- the lab

export class RayLab {
  constructor() {
    this.items = new Map();
    this.nextId = 1;
    this.medium = 1; // refractive index of the surroundings (air)
  }

  // -------------------------------------------------------------- editing

  add(kind, props = {}) {
    if (!KINDS.includes(kind)) throw new Error(`There is no "${kind}" in the rays view.`);
    const item = this.#checked({ kind, ...structuredClone(DEFAULTS[kind]) }, props);
    item.id = this.nextId++;
    this.items.set(item.id, item);
    return item.id;
  }
  update(id, patch) {
    const item = this.items.get(id);
    if (!item) throw new Error("That item is no longer in the scene.");
    const next = this.#checked({ ...item }, patch);
    this.items.set(id, next);
  }
  remove(id) {
    this.items.delete(id);
  }
  clear() {
    this.items.clear();
    this.nextId = 1;
  }
  get(id) {
    return this.items.get(id) ?? null;
  }
  list() {
    return [...this.items.values()];
  }
  setMedium(n) {
    if (typeof n !== "number" || !(n >= LIMITS.medium.min && n <= LIMITS.medium.max))
      throw new Error("The surrounding medium's index must be between 1.00 and 3.00.");
    this.medium = n;
  }

  // Applies a patch to a copy and checks the result as a whole, so that a
  // refused change leaves the item as it was.
  #checked(item, patch) {
    for (const [key, value] of Object.entries(patch)) {
      if (key === "id" || key === "kind" || key === "name") continue;
      if (!Object.hasOwn(DEFAULTS[item.kind], key))
        throw new Error(`A ${NAMES[item.kind].toLowerCase()} has no ${key}.`);
      checkValue(key, value, item.kind);
      item[key] = value;
    }
    if (item.kind === "lens") {
      const half = item.aperture / 2;
      for (const R of [item.R1, item.R2])
        if (R !== 0 && half >= Math.abs(R))
          throw new Error("The lens's aperture must be smaller than twice each radius of curvature.");
      const s = lensShape(item);
      if (s.backEdge - s.frontEdge < 0)
        throw new Error("The two surfaces cross inside the aperture: make the lens thicker or the aperture smaller.");
      if (s.backEdge - s.frontEdge === 0 && item.thickness === 0)
        throw new Error("A lens needs some thickness.");
    }
    if (item.kind === "sphericalMirror" && item.aperture / 2 >= Math.abs(item.radius))
      throw new Error("The mirror's aperture must be smaller than twice its radius.");
    if (item.kind === "stop" && item.opening >= item.length)
      throw new Error("The opening must be narrower than the stop.");
    return item;
  }

  // -------------------------------------------------------------- optics

  // The refractive index at a point: that of the refracting element it is
  // in (the last one listed, if they overlap), or of the surroundings.
  indexAt(q, wavelength) {
    let n = this.medium;
    for (const el of this.items.values())
      if (REFRACTING.has(el.kind) && contains(el, q)) n = indexOf(el, wavelength);
    return n;
  }

  #surfaces() {
    const out = [];
    for (const el of this.items.values()) if (!isSource(el.kind)) out.push(...surfacesOf(el));
    return out;
  }

  // The rays a source sends out: { o, d, wavelength }.
  emitted(src) {
    const a = unit(src.angle),
      p = { x: -a.y, y: a.x },
      at = { x: src.x, y: src.y },
      waves = src.wavelength === "white" ? WHITE : [src.wavelength],
      out = [],
      fan = (from, centre, spread, count) => {
        for (let i = 0; i < count; i++) {
          const k = count === 1 ? 0 : i / (count - 1) - 0.5;
          out.push({ o: from, d: unit(centre + k * spread) });
        }
      };
    if (src.kind === "ray") out.push({ o: at, d: a });
    else if (src.kind === "beam")
      for (let i = 0; i < src.count; i++) {
        const k = src.count === 1 ? 0 : i / (src.count - 1) - 0.5;
        out.push({ o: add(at, p, k * src.width), d: a });
      }
    else if (src.kind === "point") fan(at, src.angle, src.spread, src.count);
    // An object's rays leave its tip.
    else fan(add(at, p, src.height), src.angle, src.spread, src.count);
    return out.flatMap((r) => waves.map((wavelength) => ({ ...r, wavelength })));
  }

  // Follows one ray to its next surface: { t, normal, s } or null.
  #nearest(surfaces, o, d) {
    let best = null;
    for (const s of surfaces) {
      const hit = intersect(s, o, d);
      if (hit && (!best || hit.t < best.t)) best = { ...hit, s };
    }
    return best;
  }

  // What happens to a ray at a surface: the rays that leave it.
  // [{ d, intensity, event }]
  #interact(hit, q, d, wavelength) {
    const { s } = hit;
    if (s.role === "absorb") return [];
    let n = hit.normal;
    // Turn the normal to face the incoming ray.
    if (dot(n, d) > 0) n = { x: -n.x, y: -n.y };
    if (s.role === "mirror") return [{ d: reflect(d, n), share: 1, event: "reflect" }];
    if (s.role === "thin") {
      // The ideal thin lens: in its own frame, with the ray travelling in
      // the +axis direction, the slope dv/du drops by h/f, which sends every
      // ray from one point through the one image point, by 1/f = 1/u + 1/v.
      const f = frame(s.el),
        h = toLocal(f, q).v,
        du = dot(d, f.a),
        dv = dot(d, f.p);
      if (du === 0) return [{ d, share: 1, event: "pass" }];
      const sense = Math.sign(du),
        slope = dv / Math.abs(du) - h / s.el.f,
        len = Math.hypot(1, slope);
      return [
        {
          d: { x: (f.a.x * sense + f.p.x * slope) / len, y: (f.a.y * sense + f.p.y * slope) / len },
          share: 1,
          event: "lens",
        },
      ];
    }
    // Refraction: the media on the incoming and outgoing sides.
    const n1 = this.indexAt(add(q, n, NUDGE), wavelength),
      n2 = this.indexAt(add(q, n, -NUDGE), wavelength);
    if (n1 === n2) return [{ d, share: 1, event: "pass" }];
    const ci = -dot(d, n),
      eta = n1 / n2,
      k = 1 - eta * eta * (1 - ci * ci);
    if (k < 0) return [{ d: reflect(d, n), share: 1, event: "tir" }];
    const ct = Math.sqrt(k),
      t = { x: eta * d.x + (eta * ci - ct) * n.x, y: eta * d.y + (eta * ci - ct) * n.y },
      len = Math.hypot(t.x, t.y),
      R = fresnel(n1, n2, Math.acos(Math.min(1, ci))).R;
    return [
      { d: { x: t.x / len, y: t.y / len }, share: 1 - R, event: "refract" },
      { d: reflect(d, n), share: R, event: "partial" },
    ];
  }

  /**
   * Traces every source. Returns { segments, hits, truncated }:
   * segments  { x1, y1, x2, y2, wavelength, intensity, source, parent,
   *             depth, event, end, element } in tracing order; `parent` is
   *             the index of the segment this one continues (−1 for one
   *             leaving a source), `event` how it began (source, refract,
   *             partial, tir, reflect, lens, pass) and `end` how it ended
   *             (escape, absorb, mirror, refract, thin, limit).
   * hits      { element, s, wavelength, intensity } where rays met a screen
   *           (s along the screen from its middle, towards its +p end).
   * Partial reflections weaker than minIntensity (of the source ray's 1)
   * are not followed.
   */
  trace({ minIntensity = 0.01, maxSegments = 20000, maxDepth = 400 } = {}) {
    const surfaces = this.#surfaces(),
      segments = [],
      hits = [],
      stack = [];
    for (const src of this.items.values())
      if (isSource(src.kind))
        for (const r of this.emitted(src).reverse())
          stack.push({ ...r, intensity: 1, source: src.id, parent: -1, depth: 0, event: "source" });
    let truncated = false;
    while (stack.length) {
      if (segments.length >= maxSegments) {
        truncated = true;
        break;
      }
      const ray = stack.pop(),
        hit = this.#nearest(surfaces, ray.o, ray.d),
        end = hit ? add(ray.o, ray.d, hit.t) : add(ray.o, ray.d, FAR);
      const seg = {
        x1: ray.o.x,
        y1: ray.o.y,
        x2: end.x,
        y2: end.y,
        wavelength: ray.wavelength,
        intensity: ray.intensity,
        source: ray.source,
        parent: ray.parent,
        depth: ray.depth,
        event: ray.event,
        end: hit ? hit.s.role : "escape",
        element: hit ? hit.s.el.id : null,
      };
      segments.push(seg);
      if (!hit) continue;
      if (hit.s.role === "absorb" && hit.s.el.kind === "screen") {
        const f = frame(hit.s.el);
        hits.push({ element: hit.s.el.id, s: toLocal(f, end).v, wavelength: ray.wavelength, intensity: ray.intensity });
      }
      if (ray.depth >= maxDepth) {
        seg.end = "limit";
        continue;
      }
      const index = segments.length - 1,
        out = this.#interact(hit, end, ray.d, ray.wavelength);
      // Pushed in reverse so that the main ray is followed first.
      for (const o of out.reverse()) {
        const intensity = ray.intensity * o.share;
        if (o.event === "partial" && intensity < minIntensity) continue;
        if (intensity <= 0) continue;
        stack.push({
          o: end,
          d: o.d,
          wavelength: ray.wavelength,
          intensity,
          source: ray.source,
          parent: index,
          depth: ray.depth + 1,
          event: o.event,
        });
      }
    }
    return { segments, hits, truncated };
  }

  // The main path of one ray (transmitted or totally reflected at every
  // surface, no partial reflections): its final origin and direction, the
  // elements it met and whether it was stopped.
  #follow(o, d, wavelength, surfaces) {
    const met = [];
    for (let i = 0; i < 400; i++) {
      const hit = this.#nearest(surfaces, o, d);
      if (!hit) return { o, d, met, stopped: false };
      const q = add(o, d, hit.t);
      if (hit.s.role === "absorb") return { o, d, met, stopped: true, end: q };
      const out = this.#interact(hit, q, d, wavelength);
      if (!met.includes(hit.s.el)) met.push(hit.s.el);
      o = q;
      d = out[0].d;
    }
    return { o, d, met, stopped: true };
  }

  /**
   * The image formed by each object, and the angular magnification of each
   * parallel beam, found from paraxial rays: a few rays close to the
   * object's axis, followed through every element and intersected (their
   * backward extensions, for a virtual image). For each object:
   *   { source, distance (v, real is positive), magnification, real,
   *     upright, base, tip (where the image of the object's base and tip
   *     lie), objectDistance (u), last (the element v is measured from),
   *     formula: { focalLength, distance, magnification } or null }
   * `formula` is given when the rays meet exactly one lens or mirror, with
   * u measured from it: the thin-lens or mirror equation's prediction. An
   * image at infinity has distance Infinity and an angular magnification.
   * For a beam: { source, angularMagnification } (output angle over input
   * angle, both from the beam's own direction... measured from the axis of
   * the first element it meets).
   */
  images() {
    const surfaces = this.#surfaces(),
      out = [];
    for (const src of this.items.values()) {
      if (src.kind === "object") out.push(this.#objectImage(src, surfaces));
      if (src.kind === "beam") out.push(this.#beamReading(src, surfaces));
    }
    return out.filter(Boolean);
  }

  #objectImage(src, surfaces) {
    const a = unit(src.angle),
      p = { x: -a.y, y: a.x },
      base = { x: src.x, y: src.y },
      wavelength = src.wavelength === "white" ? GREEN : src.wavelength,
      eps = 1e-6,
      spread = 1e-6;
    // Two rays from a point, a little either side of the axis direction,
    // and where their final lines meet.
    const meet = (from) => {
      const r = [-1, 1].map((k) => this.#follow(from, unit(src.angle + k * spread), wavelength, surfaces));
      if (r.some((x) => x.stopped)) return null;
      const [A, B] = r,
        den = A.d.x * B.d.y - A.d.y * B.d.x,
        wx = B.o.x - A.o.x,
        wy = B.o.y - A.o.y;
      const centre = this.#follow(from, a, wavelength, surfaces);
      if (Math.abs(den) < 1e-14) return { infinite: true, d: centre.d, met: centre.met, from: centre };
      const t = (wx * B.d.y - wy * B.d.x) / den;
      return { point: add(A.o, A.d, t), real: t > 0, met: A.met, d: centre.d, from: centre };
    };
    const atBase = meet(base),
      atTip = meet(add(base, p, eps));
    if (!atBase || !atTip) return { source: src.id, blocked: true };
    if (!atBase.met.length) return null;
    const first = atBase.met[0],
      last = atBase.met.at(-1),
      u = dot({ x: refPoint(first).x - base.x, y: refPoint(first).y - base.y }, a);
    let formula = null;
    if (atBase.met.length === 1 && focalLength(first) !== null) {
      const f = focalLength(first),
        v = 1 / (1 / f - 1 / u);
      formula = { focalLength: f, distance: v, magnification: -v / u };
    }
    if (atBase.infinite || atTip.infinite) {
      // Parallel rays leave the system: the image is at infinity. Its
      // angular size against that of the object seen from the first
      // element (an eyepiece used this way).
      const theta = Math.atan2(dot(atTip.d, p) - dot(atBase.d, p), dot(atBase.d, a));
      return {
        source: src.id,
        distance: Infinity,
        magnification: null,
        angularSize: theta / eps,
        real: false,
        upright: theta > 0,
        objectDistance: u,
        last: last.id,
        formula,
      };
    }
    const out = atBase.d,
      v = dot({ x: atBase.point.x - refPoint(last).x, y: atBase.point.y - refPoint(last).y }, out),
      m = dot({ x: atTip.point.x - atBase.point.x, y: atTip.point.y - atBase.point.y }, p) / eps;
    return {
      source: src.id,
      distance: atBase.real ? Math.abs(v) : -Math.abs(v),
      magnification: m,
      real: atBase.real,
      upright: m > 0,
      base: atBase.point,
      tip: add(atBase.point, p, m * src.height),
      objectDistance: u,
      last: last.id,
      formula,
    };
  }

  #beamReading(src, surfaces) {
    const wavelength = src.wavelength === "white" ? GREEN : src.wavelength,
      start = { x: src.x, y: src.y },
      // The axis: that of the first element the beam's central ray meets.
      centre = this.#follow(start, unit(src.angle), wavelength, surfaces);
    if (!centre.met.length || centre.stopped) return null;
    const axis = centre.met[0].angle,
      d = 1e-6,
      // A ray along the axis and one at a small angle to it, both through
      // the first element's reference point.
      through = (theta) => {
        const dir = unit(axis + theta),
          r = refPoint(centre.met[0]);
        return this.#follow(add(r, dir, -1), dir, wavelength, surfaces);
      };
    const along = through(0),
      tilted = through(d);
    if (along.stopped || tilted.stopped) return null;
    const angleOf = (v) => Math.atan2(v.y, v.x);
    let out = angleOf(tilted.d) - angleOf(along.d);
    out = Math.atan2(Math.sin(out), Math.cos(out));
    return { source: src.id, angularMagnification: out / d };
  }

  // -------------------------------------------------------------- files

  exportScene() {
    return {
      format: FORMAT,
      version: 1,
      medium: this.medium,
      items: this.list().map(({ id, ...rest }) => rest),
    };
  }
  static fromScene(data) {
    checkFormat(data, FORMAT);
    const lab = new RayLab();
    if (data.medium !== undefined) lab.setMedium(data.medium);
    for (const { kind, ...props } of listOf(data.items)) {
      if (!KINDS.includes(kind)) throw new Error("This scene file is damaged.");
      lab.add(kind, props);
    }
    return lab;
  }
  loadScene(data) {
    const lab = RayLab.fromScene(data);
    this.items = lab.items;
    this.nextId = lab.nextId;
    this.medium = lab.medium;
  }
}

export function indexOf(el, wavelength) {
  return el.material === "fixed" ? el.index : cauchy(MATERIALS[el.material], wavelength);
}
// The point an element's distances are measured from: a mirror's vertex, a
// lens's centre.
function refPoint(el) {
  return { x: el.x, y: el.y };
}
// The focal length the textbook formula gives an element, or null.
export function focalLength(el, wavelength = GREEN) {
  switch (el.kind) {
    case "thinLens":
    case "parabolicMirror":
      return el.f;
    case "sphericalMirror":
      return el.radius / 2;
    case "lens": {
      const n = indexOf(el, wavelength),
        c1 = el.R1 === 0 ? 0 : 1 / el.R1,
        c2 = el.R2 === 0 ? 0 : 1 / el.R2,
        power = (n - 1) * (c1 - c2 + ((n - 1) * el.thickness * c1 * c2) / n);
      return power === 0 ? null : 1 / power;
    }
  }
  return null;
}
// Outline of an element for drawing: closed polygons and open polylines in
// world coordinates, sampled finely enough for curves.
export function outlineOf(el, samples = 48) {
  const f = frame(el);
  if (el.kind === "block" || el.kind === "prism") return { closed: true, points: polygonOf(el) };
  if (el.kind === "lens") {
    const s = lensShape(el),
      pts = [];
    for (let i = 0; i <= samples; i++) {
      const v = -s.half + (2 * s.half * i) / samples;
      pts.push(toWorld(f, s.front + sag(el.R1, v), v));
    }
    for (let i = samples; i >= 0; i--) {
      const v = -s.half + (2 * s.half * i) / samples;
      pts.push(toWorld(f, s.back + sag(el.R2, v), v));
    }
    return { closed: true, points: pts };
  }
  if (el.kind === "sphericalMirror" || el.kind === "parabolicMirror") {
    const pts = [],
      h = el.aperture / 2;
    for (let i = 0; i <= samples; i++) {
      const v = -h + (2 * h * i) / samples,
        u = el.kind === "sphericalMirror" ? sag(el.radius, v) : (v * v) / (4 * el.f);
      pts.push(toWorld(f, u, v));
    }
    return { closed: false, points: pts };
  }
  if (el.kind === "stop") {
    const g = el.opening / 2,
      h = el.length / 2;
    return { closed: false, parts: [[toWorld(f, 0, g), toWorld(f, 0, h)], [toWorld(f, 0, -g), toWorld(f, 0, -h)]] };
  }
  const h = (el.kind === "thinLens" ? el.aperture : el.length) / 2;
  return { closed: false, points: [toWorld(f, 0, -h), toWorld(f, 0, h)] };
}
export { frame, unit };
