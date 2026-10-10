// Orbit lab model: satellites of negligible mass moving round one fixed
// central body under Newtonian gravity, F = GMm/r². SI units throughout
// (m, kg, s), y up, angles anticlockwise in radians. No DOM: everything here
// is testable from Node.
//
// The central body does not move. That is exact in the limit m ≪ M, which is
// the case this tool is for; it is not exact for the Moon (see the README).

export const G = 6.674e-11; // N·m²/kg²
export const SIDEREAL_DAY = 86164.0905; // s, one turn of the Earth

// Mass (kg) and mean radius (m) of each preset central body.
export const BODIES = {
  earth: { name: "Earth", mass: 5.972e24, radius: 6.371e6 },
  moon: { name: "Moon", mass: 7.342e22, radius: 1.7374e6 },
  mars: { name: "Mars", mass: 6.4171e23, radius: 3.3895e6 },
  jupiter: { name: "Jupiter", mass: 1.8982e27, radius: 6.9911e7 },
  sun: { name: "Sun", mass: 1.9885e30, radius: 6.957e8 },
};

// Allowed range of every editable quantity (SI). The forms in app.js mirror
// these; change both together.
export const LIMITS = {
  mass: [1e15, 1e32],
  radius: [1e3, 1e10],
  orbitRadius: 1e14,
  speed: 3e7, // a tenth of the speed of light: Newtonian gravity only
  satelliteMass: [1e-3, 1e12],
  satellites: 8,
};

const TAU = 2 * Math.PI;
// Below this fraction of GM/r the total energy counts as zero (a parabola),
// and below this fraction of √(GMr) the angular momentum counts as zero
// (straight up or down). Both are rounding-level.
const ZERO = 1e-12;
// A satellite counts as inside the body only when it is this fraction of the
// radius below the surface, so an orbit that skims r = R does not "land"
// through rounding.
const SKIM = 1e-9;

export const circularSpeed = (mu, r) => Math.sqrt(mu / r);
export const escapeSpeed = (mu, r) => Math.sqrt((2 * mu) / r);

const text = (v) => String(Number(v.toPrecision(4))).replace("-", "−");
function inRange(name, value, lo, hi, unit, factor = 1) {
  if (!Number.isFinite(value) || value < lo || value > hi)
    throw new Error(
      `${name} must be between ${text(lo * factor)} and ${text(hi * factor)} ${unit}.`,
    );
}

// ---------------------------------------------------------------------------
// Orbital elements from the state vector.
//
// Everything follows from three conserved quantities, each per kilogram of
// satellite:
//   energy            ε = v²/2 − μ/r
//   angular momentum  h = x·vy − y·vx          (anticlockwise positive)
//   eccentricity      e = ((v² − μ/r) r − (r·v) v) / μ   (vector, points from
//                                               the centre to periapsis)
// with μ = GM. Then a = −μ/2ε, p = h²/μ, r = p / (1 + e cos ν).
export function orbitElements(mu, state, bodyRadius = 0) {
  const { x, y, vx, vy } = state,
    r = Math.hypot(x, y),
    v2 = vx * vx + vy * vy,
    rv = x * vx + y * vy,
    rawEnergy = v2 / 2 - mu / r,
    parabolic = Math.abs(rawEnergy) <= (ZERO * mu) / r,
    energy = parabolic ? 0 : rawEnergy,
    bound = energy < 0,
    h = x * vy - y * vx,
    radial = Math.abs(h) <= ZERO * Math.sqrt(mu * r),
    sense = h < 0 ? -1 : 1,
    ex = ((v2 - mu / r) * x - rv * vx) / mu,
    ey = ((v2 - mu / r) * y - rv * vy) / mu,
    e = radial ? 1 : Math.hypot(ex, ey),
    p = radial ? 0 : (h * h) / mu,
    a = parabolic ? Infinity : -mu / (2 * energy),
    periapsis = radial ? 0 : p / (1 + e),
    apoapsis = bound ? 2 * a - periapsis : Infinity,
    period = bound ? TAU * Math.sqrt((a * a * a) / mu) : Infinity,
    round = !radial && e < 1e-10,
    // Direction of periapsis. A circle has none, so its "periapsis" is put
    // where the satellite is now.
    argument = radial
      ? Math.atan2(-y, -x)
      : round
        ? Math.atan2(y, x)
        : Math.atan2(ey, ex),
    // True anomaly ν: angle from periapsis, measured the way the satellite
    // goes round, so it always increases.
    trueAnomaly =
      radial || round
        ? 0
        : Math.atan2(sense * (ex * y - ey * x), ex * x + ey * y),
    shape = radial
      ? "radial"
      : parabolic
        ? "parabolic"
        : !bound
          ? "hyperbolic"
          : e < 1e-3
            ? "circular"
            : "elliptical",
    // It reaches the surface if periapsis is inside the body and it is either
    // bound (so it comes back to periapsis) or already heading inward.
    impact =
      bodyRadius > 0 &&
      periapsis < bodyRadius * (1 - SKIM) &&
      (bound || rv < 0);
  return {
    mu,
    energy,
    angularMomentum: h,
    sense,
    eccentricity: e,
    ex,
    ey,
    semiMajorAxis: a,
    semiLatusRectum: p,
    periapsis,
    apoapsis,
    period,
    argument,
    trueAnomaly,
    bound,
    radial,
    shape,
    impact,
    outward: rv >= 0,
    // Speed left over far from the body, for an escaping satellite.
    excessSpeed: energy > 0 ? Math.sqrt(2 * energy) : 0,
    radius: r,
    bodyRadius,
  };
}

// Time taken to go from true anomaly ν0 forward to ν1, from Kepler's
// equation (M = E − e sin E for an ellipse, M = e sinh F − F for a
// hyperbola). Returns null for the cases that need other formulae.
export function timeBetween(el, nu0, nu1) {
  const e = el.eccentricity;
  if (el.radial || el.shape === "parabolic") return null;
  if (el.bound) {
    const mean = (nu) => {
        const E =
          2 *
          Math.atan2(
            Math.sqrt(1 - e) * Math.sin(nu / 2),
            Math.sqrt(1 + e) * Math.cos(nu / 2),
          );
        return E - e * Math.sin(E);
      },
      whole = Math.floor((nu1 - nu0) / TAU),
      part = (((mean(nu1) - mean(nu0)) % TAU) + TAU) % TAU;
    return ((whole * TAU + part) / TAU) * el.period;
  }
  const mean = (nu) => {
      const F = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu / 2));
      return e * Math.sinh(F) - F;
    },
    rate = Math.sqrt(el.mu / Math.abs(el.semiMajorAxis) ** 3);
  return (mean(nu1) - mean(nu0)) / rate;
}

// Where and when the orbit meets the surface, or null if it does not.
export function predictImpact(el) {
  if (!el.impact) return null;
  const R = el.bodyRadius,
    speed = Math.sqrt(2 * (el.energy + el.mu / R));
  if (el.radial) return { anomaly: 0, swept: 0, time: null, speed };
  // r = R on the way in: ν = −acos((p/R − 1)/e), taken forward of now.
  let anomaly = -Math.acos(
    Math.max(-1, Math.min(1, (el.semiLatusRectum / R - 1) / el.eccentricity)),
  );
  if (anomaly < el.trueAnomaly) anomaly += TAU;
  return {
    anomaly,
    swept: anomaly - el.trueAnomaly,
    time: timeBetween(el, el.trueAnomaly, anomaly),
    speed,
  };
}

// The path ahead of the satellite as a list of [x, y], straight from the
// conic r = p / (1 + e cos ν): once round a closed orbit, as far as the
// surface for one that lands, and out to `maxRadius` for one that escapes.
export function orbitPath(el, options = {}) {
  const segments = options.segments ?? 360,
    maxRadius = options.maxRadius ?? 200 * el.radius,
    R = el.bodyRadius,
    e = el.eccentricity;
  if (el.radial) {
    // Straight up and/or down the line through the centre.
    const c = -Math.cos(el.argument),
      s = -Math.sin(el.argument),
      at = (r) => [r * c, r * s],
      top = el.bound ? el.apoapsis : maxRadius,
      points = [at(el.radius)];
    if (el.outward) points.push(at(top));
    if (el.bound || !el.outward) points.push(at(R));
    return points;
  }
  const hit = predictImpact(el),
    p = el.semiLatusRectum,
    nu0 = el.trueAnomaly;
  let nu1;
  if (hit) nu1 = hit.anomaly;
  else if (el.bound) nu1 = nu0 + TAU;
  else {
    // ν where r reaches maxRadius (always short of the asymptote).
    nu1 = Math.acos(Math.max(-1, Math.min(1, (p / maxRadius - 1) / e)));
    // Already beyond maxRadius and leaving: nothing more to draw.
    if (nu1 < nu0) nu1 = nu0;
  }
  const n = Math.max(8, Math.ceil((segments * (nu1 - nu0)) / TAU)),
    points = [];
  for (let i = 0; i <= n; i++) {
    const nu = nu0 + ((nu1 - nu0) * i) / n,
      r = p / (1 + e * Math.cos(nu)),
      angle = el.argument + el.sense * nu;
    points.push([r * Math.cos(angle), r * Math.sin(angle)]);
  }
  return points;
}

// ---------------------------------------------------------------------------
// Fixed-size record of the latest `capacity` rows of `width` numbers.
class Ring {
  constructor(capacity, width) {
    this.capacity = capacity;
    this.width = width;
    this.data = new Float64Array(capacity * width);
    this.start = 0;
    this.length = 0;
  }
  push(a, b = 0, c = 0) {
    let at;
    if (this.length < this.capacity)
      at = (this.start + this.length++) % this.capacity;
    else {
      at = this.start;
      this.start = (this.start + 1) % this.capacity;
    }
    const i = at * this.width;
    this.data[i] = a;
    if (this.width > 1) this.data[i + 1] = b;
    if (this.width > 2) this.data[i + 2] = c;
  }
  // Value `column` of row `index` (0 is the oldest).
  get(index, column = 0) {
    return this.data[
      ((this.start + index) % this.capacity) * this.width + column
    ];
  }
  clear() {
    this.start = this.length = 0;
  }
}

// ---------------------------------------------------------------------------

export class OrbitLab {
  constructor(options = {}) {
    this.body = { key: "earth", ...BODIES.earth };
    this.satelliteMass = 1000;
    this.satellites = [];
    this.nextId = 1;
    // Seconds of simulated time since the scene was last reset.
    this.time = 0;
    // The furthest a satellite may move in one step, as a fraction of its
    // distance from the centre.
    this.stepFraction = options.stepFraction ?? 0.002;
    // Most integration steps taken by one advance() call.
    this.maxSteps = options.maxSteps ?? 60000;
    // An escaping satellite is no longer followed beyond this many launch
    // radii.
    this.rangeFactor = options.rangeFactor ?? 200;
    // Equal-time sectors recorded for Kepler's second law.
    this.sectorCount = options.sectorCount ?? 12;
    // One point per satellite that has completed an orbit: Kepler's third.
    this.thirdLaw = [];
  }

  get mu() {
    return G * this.body.mass;
  }

  // Change the central body. Satellites in flight are removed: their orbits
  // belong to the old body.
  setBody(patch) {
    const next = { ...this.body, ...patch };
    inRange("Mass", next.mass, ...LIMITS.mass, "kg");
    inRange("Radius", next.radius, ...LIMITS.radius, "km", 1e-3);
    if (escapeSpeed(G * next.mass, next.radius) > LIMITS.speed)
      throw new Error(
        "That body is too compact: its escape speed would be more than a tenth of the speed of light, where Newton's gravity no longer holds.",
      );
    if (
      patch.key === undefined &&
      (patch.mass !== undefined || patch.radius !== undefined)
    )
      next.key = "custom";
    if (next.key === "custom" && patch.name === undefined)
      next.name = "Custom body";
    this.body = next;
    this.clear();
  }

  setSatelliteMass(mass) {
    inRange("Satellite mass", mass, ...LIMITS.satelliteMass, "kg");
    this.satelliteMass = mass;
  }

  // Launch conditions → state vector. The launch point is straight above
  // the centre (on +y); `angle` is the direction of the velocity above the
  // local horizontal, which there points along +x. Give `radius` (from the
  // centre) or `altitude` (above the surface).
  launchState(params) {
    const radius = params.radius ?? this.body.radius + params.altitude,
      { speed, angle } = params;
    if (!Number.isFinite(radius) || radius < this.body.radius * (1 - SKIM))
      throw new Error("The launch point must be on or above the surface.");
    if (radius > LIMITS.orbitRadius)
      throw new Error(
        `The launch point must be within ${text(LIMITS.orbitRadius / 1e3)} km of the centre.`,
      );
    inRange("Launch speed", speed, 0, LIMITS.speed, "km/s", 1e-3);
    if (!Number.isFinite(angle) || Math.abs(angle) > Math.PI + 1e-9)
      throw new Error("Launch angle must be between −180° and 180°.");
    // Exact components for the common directions, so that "horizontal" and
    // "straight up" are not spoiled by cos(90°) ≠ 0 in floating point.
    const quarter = angle / (Math.PI / 2),
      exact = Math.abs(quarter - Math.round(quarter)) < 1e-12,
      k = ((Math.round(quarter) % 4) + 4) % 4,
      c = exact ? [1, 0, -1, 0][k] : Math.cos(angle),
      s = exact ? [0, 1, 0, -1][k] : Math.sin(angle);
    return { x: 0, y: radius, vx: speed * c, vy: speed * s };
  }

  // What a launch would do, without launching: the state, the orbit it
  // would follow and the two reference speeds at that radius.
  preview(params) {
    const state = this.launchState(params),
      mu = this.mu;
    return {
      state,
      elements: orbitElements(mu, state, this.body.radius),
      circularSpeed: circularSpeed(mu, state.y),
      escapeSpeed: escapeSpeed(mu, state.y),
    };
  }

  launch(params) {
    const state = this.launchState(params);
    if (this.satellites.length >= LIMITS.satellites)
      throw new Error(
        `There are already ${LIMITS.satellites} satellites. Remove one, or press Reset.`,
      );
    const mu = this.mu,
      R = this.body.radius,
      el = orbitElements(mu, state, R),
      r0 = el.radius,
      used = new Set(this.satellites.map((s) => s.colour));
    let colour = 0;
    while (used.has(colour)) colour++;
    // Step size (see #advance). The fastest the satellite will ever go is
    // at its lowest point outside the body.
    const lowest = Math.max(el.periapsis, R),
      fastest = Math.max(
        Math.sqrt(Math.max(0, 2 * (el.energy + mu / lowest))),
        circularSpeed(mu, lowest),
      ),
      v2 = state.vx * state.vx + state.vy * state.vy,
      hit = predictImpact(el),
      // The natural length of time for this flight: the time to landing,
      // else the period, else (escaping) the period of a circular orbit at
      // the launch radius.
      span =
        hit?.time ??
        (el.bound ? el.period : TAU * Math.sqrt((r0 * r0 * r0) / mu)),
      // Equal time intervals for the swept areas.
      interval = span / this.sectorCount,
      s = {
        id: this.nextId++,
        colour,
        launch: { radius: r0, speed: Math.sqrt(v2), angle: params.angle },
        launchedAt: this.time,
        ...state,
        // Seconds since launch, and the time it is due to have reached.
        time: 0,
        due: 0,
        status: "flying",
        elements: el,
        // −ε with no rounding to zero: the integrator's own constant.
        binding: mu / r0 - v2 / 2,
        step: (this.stepFraction * mu) / fastest,
        range: this.rangeFactor * r0,
        swept: 0,
        orbits: 0,
        lastCrossing: 0,
        measuredPeriod: null,
        impact: null,
        // The path so far. A closed orbit retraces itself exactly, so its
        // trail is recorded for one turn only (again after clearTrails).
        trail: new Ring(6000, 2),
        trailMark: [state.x, state.y],
        trailEnd: TAU,
        // Time, distance and speed, for the graphs.
        history: new Ring(1500, 3),
        historyInterval: span / (el.bound ? 400 : 100),
        sweep: {
          interval,
          // Each sector of a Kepler orbit has area ½·h·Δt.
          expected: (Math.abs(el.angularMomentum) * interval) / 2,
          next: interval,
          sectors: [],
          current: { index: 0, area: 0, points: [state.x, state.y] },
        },
      };
    s.trail.push(s.x, s.y);
    s.history.push(0, r0, s.launch.speed);
    this.satellites.push(s);
    return s.id;
  }

  get(id) {
    return this.satellites.find((s) => s.id === id) ?? null;
  }

  list() {
    return this.satellites;
  }

  remove(id) {
    this.satellites = this.satellites.filter((s) => s.id !== id);
  }

  // Remove every satellite and set the clock back to zero.
  clear() {
    this.satellites = [];
    this.time = 0;
  }

  clearTrails() {
    for (const s of this.satellites) {
      s.trail.clear();
      s.trail.push(s.x, s.y);
      s.trailMark = [s.x, s.y];
      s.trailEnd = Math.abs(s.swept) + TAU;
    }
  }

  clearThirdLaw() {
    this.thirdLaw = [];
  }

  // Readouts for one satellite, in SI. Energies and angular momentum are
  // for a satellite of `satelliteMass`; the path does not depend on it.
  measure(id) {
    const s = this.get(id);
    if (!s) return null;
    const m = this.satelliteMass,
      mu = this.mu,
      r = Math.sqrt(s.x * s.x + s.y * s.y),
      v2 = s.vx * s.vx + s.vy * s.vy,
      kinetic = 0.5 * m * v2,
      potential = (-mu * m) / r,
      start = -s.binding * m;
    return {
      time: s.time,
      radius: r,
      altitude: r - this.body.radius,
      speed: Math.sqrt(v2),
      kinetic,
      potential,
      total: kinetic + potential,
      // The same total at the moment of launch.
      totalAtLaunch: start,
      angularMomentum: m * (s.x * s.vy - s.y * s.vx),
      // Gravitational force on the satellite, newtons, towards the centre.
      force: (mu * m) / (r * r),
    };
  }

  // Advance every satellite by `dt` seconds. Returns the seconds actually
  // advanced, which is less than `dt` only when that would take more than
  // `maxSteps` integration steps.
  advance(dt) {
    if (!(dt > 0)) return 0;
    const flying = this.satellites.filter((s) => s.status === "flying"),
      mu = this.mu;
    let estimate = 0;
    for (const s of flying)
      estimate += (dt * mu) / (Math.sqrt(s.x * s.x + s.y * s.y) * s.step);
    const slices = Math.max(1, Math.ceil((8 * estimate) / this.maxSteps)),
      slice = dt / slices;
    let steps = 0,
      done = 0;
    for (let i = 0; i < slices; i++) {
      for (const s of flying) {
        s.due += slice;
        steps += this.#advance(s);
      }
      done += slice;
      this.time += slice;
      if (steps >= this.maxSteps) break;
    }
    return done;
  }

  // Leapfrog (drift–kick–drift) for one satellite up to its due time.
  //
  // The step is not a fixed number of seconds: it is a fixed amount `σ` of
  // the variable s defined by dt = (r/μ) ds, so each step lasts σ·r/μ
  // seconds — short when the satellite is close to the body and moving
  // fast, long when it is far away and slow. In that variable the equations
  // of motion are
  //     dr/ds = v / (v²/2 − ε)        dv/ds = −r̂ / r        dt/ds = 1 / (v²/2 − ε)
  // (v²/2 − ε equals μ/r on the true path). Leapfrogging them is symplectic
  // and time-reversible, so energy and angular momentum do not drift, and
  // for a single attracting body it has a special property: every step ends
  // exactly on the true conic, whatever its length. The only error is a
  // small one in *when* the satellite gets there. (Mikkola & Tanikawa 1999;
  // Preto & Tremaine 1999.)
  //
  // σ is the same for every step of a flight, set at launch so that the
  // satellite never moves more than `stepFraction` of its distance from the
  // centre in one step. A step is shortened only to land on the due time,
  // which is what happens at low time warp, where a frame is shorter than a
  // step; a shorter step is also on the conic, so the path does not depend
  // on the frame rate.
  #advance(s) {
    const R = this.body.radius,
      floor = R * (1 - SKIM);
    let count = 0;
    while (s.status === "flying") {
      const w = 0.5 * (s.vx * s.vx + s.vy * s.vy) + s.binding,
        need = (s.due - s.time) * w;
      if (need <= 1e-9 * s.step) break;
      const sigma = need < s.step ? need : s.step,
        x0 = s.x,
        y0 = s.y,
        vx0 = s.vx,
        vy0 = s.vy,
        t0 = s.time;
      leap(s, sigma);
      count++;
      if (Math.sqrt(s.x * s.x + s.y * s.y) < floor) {
        // It has gone below the surface. Find the length of step that ends
        // on the surface instead, and stop there.
        let lo = 0,
          hi = sigma;
        for (let i = 0; i < 80 && hi - lo > 1e-15 * sigma; i++) {
          const mid = (lo + hi) / 2;
          s.x = x0;
          s.y = y0;
          s.vx = vx0;
          s.vy = vy0;
          s.time = t0;
          leap(s, mid);
          if (Math.sqrt(s.x * s.x + s.y * s.y) < R) hi = mid;
          else lo = mid;
        }
        s.x = x0;
        s.y = y0;
        s.vx = vx0;
        s.vy = vy0;
        s.time = t0;
        if (lo > 0) leap(s, lo);
        s.status = "impact";
      }
      this.#record(s, x0, y0, t0);
      const r = Math.sqrt(s.x * s.x + s.y * s.y);
      if (s.status === "impact") {
        const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        s.impact = {
          time: s.time,
          speed,
          // Angle of the path below the local horizontal on arrival.
          descent: Math.asin(
            Math.max(
              -1,
              Math.min(1, -(s.x * s.vx + s.y * s.vy) / (r * speed || 1)),
            ),
          ),
          // Angle travelled round the body, and the same along the ground.
          swept: Math.abs(s.swept),
          range: Math.abs(s.swept) * R,
        };
        s.sweep.current = null;
      } else if (!s.elements.bound && r > s.range) {
        s.status = "escaped";
        s.sweep.current = null;
      }
    }
    return count;
  }

  // Bookkeeping after a step from (x0, y0, t0) to the satellite's new state.
  #record(s, x0, y0, t0) {
    const cross = x0 * s.y - y0 * s.x,
      before = Math.abs(s.swept);
    s.swept += Math.atan2(cross, x0 * s.x + y0 * s.y);
    const after = Math.abs(s.swept),
      turns = Math.floor(after / TAU);
    if (turns > s.orbits) {
      // A whole turn was completed during this step: the moment is found
      // by interpolating the angle, and the time since the last one is the
      // measured period.
      const crossing =
        t0 + ((turns * TAU - before) / (after - before)) * (s.time - t0);
      s.measuredPeriod = crossing - s.lastCrossing;
      s.lastCrossing = crossing;
      s.orbits = turns;
      if (turns === 1)
        this.thirdLaw.push({
          id: s.id,
          colour: s.colour,
          mu: this.mu,
          body: this.body.name,
          semiMajorAxis: s.elements.semiMajorAxis,
          period: s.measuredPeriod,
        });
    }

    // Area swept: the triangle centre → old position → new position, split
    // where an equal-time interval ends part-way along the step.
    const sweep = s.sweep;
    let xa = x0,
      ya = y0,
      ta = t0;
    while (sweep.current && s.time >= sweep.next) {
      const f = (sweep.next - ta) / (s.time - ta || 1),
        xb = xa + f * (s.x - xa),
        yb = ya + f * (s.y - ya),
        sector = sweep.current;
      sector.area += Math.abs(xa * yb - ya * xb) / 2;
      sector.points.push(xb, yb);
      sweep.sectors.push(sector);
      sweep.current =
        sweep.sectors.length < this.sectorCount
          ? { index: sector.index + 1, area: 0, points: [xb, yb] }
          : null;
      xa = xb;
      ya = yb;
      ta = sweep.next;
      sweep.next += sweep.interval;
    }
    if (sweep.current) {
      const pts = sweep.current.points,
        n = pts.length;
      sweep.current.area += Math.abs(xa * s.y - ya * s.x) / 2;
      if (
        Math.hypot(s.x - pts[n - 2], s.y - pts[n - 1]) >=
        0.01 * Math.sqrt(s.x * s.x + s.y * s.y)
      )
        pts.push(s.x, s.y);
    }

    const r = Math.sqrt(s.x * s.x + s.y * s.y),
      ended = s.status !== "flying",
      closing = before < s.trailEnd && after >= s.trailEnd;
    if (
      ended ||
      closing ||
      (after < s.trailEnd &&
        Math.hypot(s.x - s.trailMark[0], s.y - s.trailMark[1]) >= 0.01 * r)
    ) {
      s.trail.push(s.x, s.y);
      s.trailMark[0] = s.x;
      s.trailMark[1] = s.y;
    }
    const h = s.history;
    if (ended || s.time - h.get(h.length - 1, 0) >= s.historyInterval)
      h.push(s.time, r, Math.sqrt(s.vx * s.vx + s.vy * s.vy));
  }
}

// One drift–kick–drift step of length σ (see OrbitLab.#advance).
function leap(s, sigma) {
  let d = (0.5 * sigma) / (0.5 * (s.vx * s.vx + s.vy * s.vy) + s.binding);
  s.x += s.vx * d;
  s.y += s.vy * d;
  s.time += d;
  const k = sigma / (s.x * s.x + s.y * s.y);
  s.vx -= k * s.x;
  s.vy -= k * s.y;
  d = (0.5 * sigma) / (0.5 * (s.vx * s.vx + s.vy * s.vy) + s.binding);
  s.x += s.vx * d;
  s.y += s.vy * d;
  s.time += d;
}
