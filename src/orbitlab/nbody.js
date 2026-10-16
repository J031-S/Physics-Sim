// The gravity sandbox: any number of bodies (up to LIMITS.bodies), every one
// pulling on every other by Newton's law of gravitation, F = Gm₁m₂/r², and
// none held fixed. SI throughout (m, kg, s, J), y up. No DOM.
//
// Integration is the fourth-order symplectic scheme of Yoshida (1990): three
// leapfrog steps of lengths w₁h, w₀h, w₁h, whose errors cancel to fourth
// order. Each step's length h is chosen afresh from the bodies' closest
// approaches (see #step), so a close pass is taken in small steps and a wide
// orbit in large ones. Momentum is conserved exactly by every step (the
// forces come in equal and opposite pairs); energy is not exactly, and its
// drift is reported so that it can be seen to be small.
//
// Bodies that touch (centres closer than the sum of their radii) merge into
// one: mass and momentum are conserved, and the new body has the volume of
// the two (it keeps the density of neither exactly, but the radius of equal
// density). This is a perfectly inelastic collision: kinetic energy is lost
// to heat, as in a real impact.
import { G, orbitElements } from "./model.js";
import { checkFormat, listOf } from "../scene-format.js";

export const LIMITS = {
  bodies: 40,
  mass: [1, 1e33], // kg: a spacecraft to a hundred Suns
  radius: [1, 1e10], // m: a boulder to a giant star
  position: 1e14, // m from the origin, about 670 AU
  speed: 3e7, // m/s, a tenth of the speed of light
};
// How long a step may be, as a fraction of the shortest time scale of any
// pair (see #step). Energy errors grow as STEP⁴.
export const STEP = 0.02;

const W1 = 1 / (2 - Math.cbrt(2)),
  W0 = -Math.cbrt(2) / (2 - Math.cbrt(2)),
  // Drift and kick fractions of Yoshida's composition.
  DRIFTS = [W1 / 2, (W0 + W1) / 2, (W0 + W1) / 2, W1 / 2],
  KICKS = [W1, W0, W1];

const finite = (v) => typeof v === "number" && Number.isFinite(v);
function inRange(label, v, [lo, hi], unit) {
  if (!finite(v) || v < lo || v > hi)
    throw new Error(`${label} must be between ${lo} and ${hi} ${unit}.`);
}

export class GravityLab {
  constructor(options = {}) {
    this.bodies = [];
    this.nextId = 1;
    this.time = 0;
    this.step = options.step ?? STEP;
    // Most integration steps taken by one advance() call.
    this.maxSteps = options.maxSteps ?? 20000;
    // Points kept in each body's trail, and the distance a body moves
    // before the next is recorded (set by the page from the view).
    this.trailLength = options.trailLength ?? 2000;
    this.trailSpacing = options.trailSpacing ?? 0;
    // Merges since the page last looked: { time, into, from }.
    this.events = [];
    this.startEnergy = null;
  }

  // ---------------------------------------------------------------- bodies

  // Check a full description of a body; throws a readable Error.
  #check(b) {
    inRange("Mass", b.mass, LIMITS.mass, "kg");
    inRange("Radius", b.radius, LIMITS.radius, "m");
    for (const key of ["x", "y"])
      if (!finite(b[key]) || Math.abs(b[key]) > LIMITS.position)
        throw new Error(
          `Positions must be within ${LIMITS.position} m of the origin.`,
        );
    if (!finite(b.vx) || !finite(b.vy) || Math.hypot(b.vx, b.vy) > LIMITS.speed)
      throw new Error(
        `Speeds must be at most ${LIMITS.speed} m/s (a tenth of the speed of light).`,
      );
    if (typeof b.name !== "string") throw new Error("A body needs a name.");
  }
  // Add a body: { mass, radius, x, y, vx, vy, name? }. Returns its id. It
  // may not overlap another body.
  add(props) {
    if (this.bodies.length >= LIMITS.bodies)
      throw new Error(
        `There are already ${LIMITS.bodies} bodies. Remove one first.`,
      );
    const id = this.nextId,
      b = {
        vx: 0,
        vy: 0,
        name: `Body ${id}`,
        ...props,
      };
    b.name = String(b.name).trim().slice(0, 40) || `Body ${id}`;
    this.#check(b);
    this.#clear(b, null);
    this.nextId++;
    const body = {
      id,
      name: b.name,
      mass: b.mass,
      radius: b.radius,
      x: b.x,
      y: b.y,
      vx: b.vx,
      vy: b.vy,
      colour: this.#colour(),
      trail: [[b.x, b.y]],
    };
    this.bodies.push(body);
    this.startEnergy = null;
    return id;
  }
  // Change some of a body's values; all of the change or none of it.
  update(id, patch) {
    const body = this.get(id);
    if (!body) throw new Error("That body has gone.");
    for (const key of Object.keys(patch))
      if (!["mass", "radius", "x", "y", "vx", "vy", "name"].includes(key))
        throw new Error(`Unknown body value: ${key}.`);
    const next = { ...body, ...patch };
    if (patch.name !== undefined)
      next.name = String(patch.name).trim().slice(0, 40) || body.name;
    this.#check(next);
    this.#clear(next, id);
    const moved = next.x !== body.x || next.y !== body.y;
    Object.assign(body, {
      name: next.name,
      mass: next.mass,
      radius: next.radius,
      x: next.x,
      y: next.y,
      vx: next.vx,
      vy: next.vy,
    });
    if (moved) body.trail = [[body.x, body.y]];
    this.startEnergy = null;
  }
  // Refuse a body that would overlap another (it would merge at once).
  #clear(b, id) {
    for (const o of this.bodies)
      if (o.id !== id && Math.hypot(o.x - b.x, o.y - b.y) < o.radius + b.radius)
        throw new Error(
          `That would overlap ${o.name}: bodies that touch merge into one.`,
        );
  }
  #colour() {
    const used = new Set(this.bodies.map((b) => b.colour));
    let c = 0;
    while (used.has(c)) c++;
    return c;
  }
  get(id) {
    return this.bodies.find((b) => b.id === id) ?? null;
  }
  list() {
    return this.bodies;
  }
  remove(id) {
    this.bodies = this.bodies.filter((b) => b.id !== id);
    this.startEnergy = null;
  }
  clear() {
    this.bodies = [];
    this.time = 0;
    this.events = [];
    this.startEnergy = null;
  }
  clearTrails() {
    for (const b of this.bodies) b.trail = [[b.x, b.y]];
  }

  // ---------------------------------------------------------------- sums

  // Total mass and the centre of mass, with its velocity.
  centreOfMass() {
    let m = 0,
      x = 0,
      y = 0,
      vx = 0,
      vy = 0;
    for (const b of this.bodies) {
      m += b.mass;
      x += b.mass * b.x;
      y += b.mass * b.y;
      vx += b.mass * b.vx;
      vy += b.mass * b.vy;
    }
    return m
      ? { mass: m, x: x / m, y: y / m, vx: vx / m, vy: vy / m }
      : { mass: 0, x: 0, y: 0, vx: 0, vy: 0 };
  }
  momentum() {
    let x = 0,
      y = 0;
    for (const b of this.bodies) {
      x += b.mass * b.vx;
      y += b.mass * b.vy;
    }
    return { x, y };
  }
  // Kinetic, potential (−Gm₁m₂/r for every pair, zero when far apart) and
  // total energy, and the change in the total since the bodies were last
  // set up (the integration's error, plus any energy lost in merging).
  energy() {
    let kinetic = 0,
      potential = 0;
    const list = this.bodies;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      kinetic += 0.5 * a.mass * (a.vx * a.vx + a.vy * a.vy);
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        potential -= (G * a.mass * b.mass) / Math.hypot(a.x - b.x, a.y - b.y);
      }
    }
    const total = kinetic + potential;
    if (this.startEnergy === null) this.startEnergy = total;
    return { kinetic, potential, total, start: this.startEnergy };
  }
  // Angular momentum about the centre of mass (z, anticlockwise positive).
  angularMomentum() {
    const c = this.centreOfMass();
    let l = 0;
    for (const b of this.bodies)
      l += b.mass * ((b.x - c.x) * (b.vy - c.vy) - (b.y - c.y) * (b.vx - c.vx));
    return l;
  }
  // The pull of every other body on `id`, in newtons.
  force(id) {
    const a = this.get(id);
    if (!a) return null;
    let fx = 0,
      fy = 0;
    for (const b of this.bodies) {
      if (b === a) continue;
      const dx = b.x - a.x,
        dy = b.y - a.y,
        r = Math.hypot(dx, dy),
        f = (G * a.mass * b.mass) / (r * r);
      fx += (f * dx) / r;
      fy += (f * dy) / r;
    }
    return { x: fx, y: fy };
  }
  // The speed for a circular orbit of `id` round `about` (each body going
  // round their common centre of mass), and the velocity that gives it,
  // anticlockwise, on top of `about`'s own velocity.
  circularVelocity(id, about) {
    const a = this.get(id),
      b = this.get(about);
    if (!a || !b || a === b) return null;
    const dx = a.x - b.x,
      dy = a.y - b.y,
      r = Math.hypot(dx, dy),
      // Relative speed for a circular two-body orbit: √(G(m₁+m₂)/r).
      v = Math.sqrt((G * (a.mass + b.mass)) / r);
    return { speed: v, vx: b.vx - (v * dy) / r, vy: b.vy + (v * dx) / r };
  }

  // The body that `id` is going round, as far as one can say: of the bodies
  // at least as heavy as it, the one whose pull most outweighs the others'
  // tidal effect, i.e. with the largest m/r³ (the Moon goes round the Earth,
  // although the Sun pulls on it harder). Null for the heaviest body.
  reference(id) {
    const a = this.get(id);
    if (!a) return null;
    let best = null,
      most = 0;
    for (const b of this.bodies) {
      if (b === a || b.mass < a.mass) continue;
      const r = Math.hypot(b.x - a.x, b.y - a.y),
        k = b.mass / (r * r * r);
      if (k > most || (k === most && b.id < (best?.id ?? Infinity))) {
        most = k;
        best = b;
      }
    }
    return best ? best.id : null;
  }
  // How a body's velocity is shown and set on the page: relative to the
  // body it goes round, in units of the circular orbit speed there, so that
  // a circular orbit always has an arrow of the same length. The heaviest
  // body's velocity is relative to the centre of mass, in units of the
  // circular speed of the nearest body round it. Returns { ref, vx, vy,
  // unit } (velocity in m/s, unit in m/s).
  velocityFrame(id) {
    const a = this.get(id);
    if (!a) return null;
    const refId = this.reference(id);
    if (refId !== null) {
      const b = this.get(refId),
        r = Math.hypot(b.x - a.x, b.y - a.y);
      return {
        ref: refId,
        vx: a.vx - b.vx,
        vy: a.vy - b.vy,
        unit: Math.sqrt((G * (a.mass + b.mass)) / r),
      };
    }
    const c = this.centreOfMass();
    let unit = 0,
      nearest = Infinity;
    for (const b of this.bodies) {
      if (b === a) continue;
      const r = Math.hypot(b.x - a.x, b.y - a.y);
      if (r < nearest) {
        nearest = r;
        unit = Math.sqrt((G * (a.mass + b.mass)) / r);
      }
    }
    return { ref: null, vx: a.vx - c.vx, vy: a.vy - c.vy, unit: unit || 1000 };
  }
  // The orbit of `id` round its reference body as a two-body problem, from
  // the two bodies' relative position and velocity (orbitElements with
  // μ = G(m₁+m₂)). Other bodies disturb it, so it is what the orbit would
  // be if they were not there. Null for the heaviest body.
  orbitRound(id) {
    const ref = this.reference(id);
    if (ref === null) return null;
    const a = this.get(id),
      b = this.get(ref);
    return {
      ref,
      elements: orbitElements(
        G * (a.mass + b.mass),
        { x: a.x - b.x, y: a.y - b.y, vx: a.vx - b.vx, vy: a.vy - b.vy },
        b.radius + a.radius,
      ),
    };
  }

  // ---------------------------------------------------------------- time

  // Move every body on by `dt` seconds. Returns the seconds actually
  // advanced: less than `dt` if `maxSteps` steps were not enough (steps are
  // never lengthened to catch up).
  advance(dt) {
    if (!(dt > 0) || !this.bodies.length) return 0;
    this.energy();
    const end = this.time + dt;
    let steps = 0;
    while (this.time < end - 1e-12 * Math.abs(end) && steps < this.maxSteps) {
      const h = Math.min(this.#stepLength(), end - this.time);
      this.#step(h);
      this.time += h;
      steps++;
      this.#merge();
      this.#record();
    }
    this.stepsTaken = steps;
    return dt - Math.max(0, end - this.time);
  }
  // The shortest time scale of any pair: the time to fall together,
  // √(r³/G(m₁+m₂)) (a fraction of an orbit), and, for two approaching each
  // other, the time until their surfaces would meet.
  #stepLength() {
    const list = this.bodies;
    let shortest = Infinity;
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i],
          b = list[j],
          dx = b.x - a.x,
          dy = b.y - a.y,
          r = Math.hypot(dx, dy),
          fall = Math.sqrt((r * r * r) / (G * (a.mass + b.mass)));
        shortest = Math.min(shortest, fall);
        const closing = -((b.vx - a.vx) * dx + (b.vy - a.vy) * dy) / r;
        if (closing > 0)
          shortest = Math.min(
            shortest,
            Math.max(r - a.radius - b.radius, 0.01 * r) / closing,
          );
      }
    // One body alone moves in a straight line: any step will do.
    return Number.isFinite(shortest) ? this.step * shortest : 3600;
  }
  #accelerations() {
    const list = this.bodies,
      ax = new Float64Array(list.length),
      ay = new Float64Array(list.length);
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i],
          b = list[j],
          dx = b.x - a.x,
          dy = b.y - a.y,
          r2 = dx * dx + dy * dy,
          k = G / (r2 * Math.sqrt(r2));
        ax[i] += k * b.mass * dx;
        ay[i] += k * b.mass * dy;
        ax[j] -= k * a.mass * dx;
        ay[j] -= k * a.mass * dy;
      }
    return [ax, ay];
  }
  #step(h) {
    const list = this.bodies;
    for (let s = 0; s < 4; s++) {
      const c = DRIFTS[s] * h;
      for (const b of list) {
        b.x += c * b.vx;
        b.y += c * b.vy;
      }
      if (s === 3) break;
      const [ax, ay] = this.#accelerations(),
        d = KICKS[s] * h;
      list.forEach((b, i) => {
        b.vx += d * ax[i];
        b.vy += d * ay[i];
      });
    }
  }
  // Bodies that touch become one.
  #merge() {
    let again = true;
    while (again) {
      again = false;
      const list = this.bodies;
      for (let i = 0; i < list.length && !again; i++)
        for (let j = i + 1; j < list.length && !again; j++) {
          const a = list[i],
            b = list[j];
          if (Math.hypot(a.x - b.x, a.y - b.y) >= a.radius + b.radius)
            continue;
          const [big, small] = a.mass >= b.mass ? [a, b] : [b, a],
            m = a.mass + b.mass;
          big.x = (a.mass * a.x + b.mass * b.x) / m;
          big.y = (a.mass * a.y + b.mass * b.y) / m;
          big.vx = (a.mass * a.vx + b.mass * b.vx) / m;
          big.vy = (a.mass * a.vy + b.mass * b.vy) / m;
          big.mass = m;
          big.radius = Math.cbrt(a.radius ** 3 + b.radius ** 3);
          this.bodies = list.filter((x) => x !== small);
          this.events.push({ time: this.time, into: big.id, from: small.name });
          again = true;
        }
    }
  }
  #record() {
    for (const b of this.bodies) {
      const last = b.trail[b.trail.length - 1];
      if (Math.hypot(b.x - last[0], b.y - last[1]) < this.trailSpacing)
        continue;
      b.trail.push([b.x, b.y]);
      if (b.trail.length > this.trailLength) b.trail.shift();
    }
  }

  // ---------------------------------------------------------------- files

  exportScene() {
    return {
      format: "physium-gravity",
      version: 1,
      time: this.time,
      bodies: this.bodies.map((b) => ({
        name: b.name,
        mass: b.mass,
        radius: b.radius,
        x: b.x,
        y: b.y,
        vx: b.vx,
        vy: b.vy,
      })),
    };
  }
  static fromScene(data, options = {}) {
    const lab = new GravityLab(options);
    lab.loadScene(data);
    return lab;
  }
  // Replaces everything with the saved bodies. The file is checked in a
  // spare lab first, so a bad one throws a readable Error and changes nothing.
  loadScene(data) {
    new GravityLab().#apply(data);
    this.#apply(data);
  }
  #apply(data) {
    checkFormat(data, "physium-gravity");
    const bodies = listOf(data.bodies);
    if (bodies.length > LIMITS.bodies)
      throw new Error(`A scene can hold ${LIMITS.bodies} bodies at most.`);
    if (data.time !== undefined && (!finite(data.time) || data.time < 0))
      throw new Error("This scene file is damaged.");
    this.clear();
    this.nextId = 1;
    for (const b of bodies)
      this.add({
        name: b.name,
        mass: b.mass,
        radius: b.radius,
        x: b.x,
        y: b.y,
        vx: b.vx ?? 0,
        vy: b.vy ?? 0,
      });
    this.time = data.time ?? 0;
  }
}
