// Orbit lab: every result is checked against the textbook formula, not
// against what the model currently outputs. Measured values are printed as
// diagnostics (node --test shows them) so they can be read off a test run.
import test from "node:test";
import assert from "node:assert/strict";
import {
  OrbitLab,
  G,
  BODIES,
  LIMITS,
  SIDEREAL_DAY,
  orbitElements,
  orbitPath,
  predictImpact,
  timeBetween,
  circularSpeed,
  escapeSpeed,
} from "../src/orbitlab/model.js";
import { presets } from "../src/orbitlab/presets.js";

const km = 1e3,
  TAU = 2 * Math.PI,
  FRAME = 1 / 60,
  // The largest time warp the page offers (see WARPS in app.js).
  MAX_WARP = 1e7;
const close = (actual, expected, relative, message) =>
  assert.ok(
    Math.abs(actual - expected) <= relative * Math.abs(expected),
    `${message || "value"}: got ${actual}, expected ${expected} ± ${relative * 100}%`,
  );
const near = (actual, expected, absolute, message) =>
  assert.ok(
    Math.abs(actual - expected) <= absolute,
    `${message || "value"}: got ${actual}, expected ${expected} ± ${absolute}`,
  );
const pct = (v) => (100 * v).toExponential(2) + "%";
// Run for `seconds` in frames of `dt`, calling `each` after every frame.
function run(lab, seconds, dt, each) {
  let done = 0;
  while (done < seconds * (1 - 1e-12)) {
    const step = lab.advance(Math.min(dt, seconds - done));
    assert.ok(step > 0, "advance made progress");
    done += step;
    each?.();
  }
}
const preset = (id) => presets.find((p) => p.id === id);
// A lab set up for a preset, and the launch it describes.
function fromPreset(id) {
  const p = preset(id),
    lab = new OrbitLab();
  lab.setBody({ key: p.body, ...BODIES[p.body] });
  return { lab, launch: p.launch(lab.mu, lab.body.radius), quoted: p.quoted };
}
// Launch conditions at periapsis for an orbit of eccentricity e.
const atPeriapsis = (lab, radius, e) => ({
  radius,
  speed: circularSpeed(lab.mu, radius) * Math.sqrt(1 + e),
  angle: 0,
});

test("constants: G and the preset bodies", () => {
  assert.equal(G, 6.674e-11);
  // Surface gravity and escape speed from each mass and radius, against
  // the usual tabulated values.
  for (const [key, g, escape] of [
    ["earth", 9.82, 11.19 * km],
    ["moon", 1.62, 2.38 * km],
    ["mars", 3.73, 5.03 * km],
    ["jupiter", 25.9, 60.2 * km],
    ["sun", 274, 617.7 * km],
  ]) {
    const b = BODIES[key];
    close((G * b.mass) / b.radius ** 2, g, 0.005, `${key} surface g`);
    close(escapeSpeed(G * b.mass, b.radius), escape, 0.005, `${key} escape`);
  }
});

test("elements from the state vector recover a, e and the apsides", () => {
  const mu = G * BODIES.earth.mass;
  for (const [a, e, omega, nu, sense] of [
    [2e7, 0.3, 0.4, 1.1, 1],
    [5e7, 0.85, -2.0, -2.5, -1],
    [8e6, 0, 1.0, 0, 1],
    [-3e7, 1.6, 2.2, 0.7, 1], // hyperbola: a < 0
  ]) {
    // State at true anomaly ν on the conic with these elements.
    const p = a * (1 - e * e),
      r = p / (1 + e * Math.cos(nu)),
      angle = omega + sense * nu,
      h = sense * Math.sqrt(mu * p),
      radialSpeed = (mu / Math.abs(h)) * e * Math.sin(nu),
      around = h / r,
      state = {
        x: r * Math.cos(angle),
        y: r * Math.sin(angle),
        vx: radialSpeed * Math.cos(angle) - around * Math.sin(angle),
        vy: radialSpeed * Math.sin(angle) + around * Math.cos(angle),
      },
      el = orbitElements(mu, state);
    close(el.semiMajorAxis, a, 1e-10, "a");
    near(el.eccentricity, e, 1e-10, "e");
    close(el.periapsis, a * (1 - e), 1e-10, "periapsis");
    close(el.energy, -mu / (2 * a), 1e-10, "energy = −μ/2a");
    close(el.angularMomentum, h, 1e-10, "h");
    if (e > 0) {
      near(Math.cos(el.argument - omega), 1, 1e-10, "direction of periapsis");
      near(Math.cos(el.trueAnomaly - nu), 1, 1e-10, "true anomaly");
      near(Math.sin(el.trueAnomaly - nu), 0, 1e-8, "true anomaly sign");
    }
    if (e < 1) {
      close(el.apoapsis, a * (1 + e), 1e-10, "apoapsis");
      close(el.period, TAU * Math.sqrt(a ** 3 / mu), 1e-10, "period");
    } else {
      assert.equal(el.apoapsis, Infinity);
      assert.equal(el.period, Infinity);
      // v∞² = v² − v_esc² = −μ/a
      close(el.excessSpeed, Math.sqrt(-mu / a), 1e-10, "v∞");
    }
  }
});

test("orbit type follows the launch speed: impact, ellipse, circle, ellipse, escape", () => {
  const lab = new OrbitLab(),
    radius = lab.body.radius + 400 * km,
    vc = circularSpeed(lab.mu, radius),
    type = (factor, angle = 0) => {
      const el = lab.preview({ radius, speed: factor * vc, angle }).elements;
      return el.impact ? "impact" : el.shape;
    };
  assert.equal(type(0.5), "impact");
  assert.equal(type(0.99), "elliptical"); // launch point is the apoapsis
  assert.equal(type(1), "circular");
  assert.equal(type(1.2), "elliptical"); // launch point is the periapsis
  assert.equal(type(Math.SQRT2), "parabolic");
  assert.equal(type(1.6), "hyperbolic");
  assert.equal(type(1, Math.PI / 2), "impact"); // straight up, below escape
  // Below circular speed the launch point is the highest point of the
  // orbit; above it, the lowest.
  close(
    lab.preview({ radius, speed: 0.99 * vc, angle: 0 }).elements.apoapsis,
    radius,
    1e-12,
  );
  close(
    lab.preview({ radius, speed: 1.2 * vc, angle: 0 }).elements.periapsis,
    radius,
    1e-12,
  );
});

test("low Earth orbit: 7.67 km/s, 92.4 min, radius constant over 100 orbits", (t) => {
  const { lab, launch, quoted } = fromPreset("low-earth-orbit"),
    radius = BODIES.earth.radius + 400 * km,
    period = TAU * Math.sqrt(radius ** 3 / lab.mu);
  close(launch.radius, radius, 1e-12, "400 km up");
  close(launch.speed, 7.67 * km, 0.001, "speed");
  close(period, 92.4 * 60, 0.001, "period");
  close(launch.speed, quoted.speed, 0.001, "speed quoted in the preset");
  close(period, quoted.period, 0.001, "period quoted in the preset");
  const el = lab.preview(launch).elements;
  assert.equal(el.shape, "circular");
  close(el.period, period, 1e-12, "period from the state vector");

  for (const [warp, label] of [
    [1000, "×1000"],
    [MAX_WARP, "highest warp"],
  ]) {
    lab.clear();
    const id = lab.launch(launch),
      s = lab.get(id);
    let lo = Infinity,
      hi = 0;
    run(lab, 100 * period, warp * FRAME, () => {
      const r = Math.hypot(s.x, s.y);
      lo = Math.min(lo, r);
      hi = Math.max(hi, r);
    });
    assert.ok(s.orbits >= 99, `${s.orbits} orbits completed`);
    const spread = Math.max(hi / radius - 1, 1 - lo / radius);
    t.diagnostic(
      `${label}: speed ${(launch.speed / km).toFixed(4)} km/s, period ${(period / 60).toFixed(3)} min (measured ${(s.measuredPeriod / 60).toFixed(3)}), radius varies by ${pct(spread)} over 100 orbits`,
    );
    assert.ok(spread < 1e-3, `radius constant to 0.1%: ${pct(spread)}`);
    close(s.measuredPeriod, period, 0.005, "measured period");
  }
});

test("geostationary orbit: about 42 164 km, 3.07 km/s, 23.93 h", (t) => {
  const { lab, launch, quoted } = fromPreset("geostationary"),
    el = lab.preview(launch).elements;
  t.diagnostic(
    `radius ${(launch.radius / km).toFixed(1)} km, speed ${(launch.speed / km).toFixed(4)} km/s, period ${(el.period / 3600).toFixed(4)} h`,
  );
  close(launch.radius, 42164 * km, 0.001, "radius");
  close(launch.speed, 3.07 * km, 0.002, "speed");
  close(el.period, 23.93 * 3600, 0.001, "period");
  close(el.period, SIDEREAL_DAY, 1e-12, "one sidereal day");
  close(launch.radius, quoted.radius, 0.001, "radius quoted");
  close(launch.speed, quoted.speed, 0.002, "speed quoted");
  close(el.period, quoted.period, 0.001, "period quoted");
  lab.launch(launch);
  run(lab, 1.5 * el.period, 5000 * FRAME);
  close(lab.satellites[0].measuredPeriod, 23.93 * 3600, 0.001, "measured");
});

test("the Moon's orbit round a fixed Earth: 1.02 km/s, 27.45 days", (t) => {
  const { lab, launch, quoted } = fromPreset("moon-orbit"),
    el = lab.preview(launch).elements,
    days = el.period / 86400;
  close(launch.speed, 1.02 * km, 0.005, "speed");
  // T = 2π√(r³/GM) with the Earth held still.
  close(days, 27.45, 0.001, "period, fixed Earth");
  close(el.period, quoted.period, 0.005, "period quoted");
  close(launch.speed, quoted.speed, 0.005, "speed quoted");
  // With both bodies moving, T = 2π√(r³/G(M+m)), which is shorter: this
  // is the gap the preset's text describes.
  const twoBody =
    (TAU *
      Math.sqrt(
        launch.radius ** 3 / (G * (BODIES.earth.mass + BODIES.moon.mass)),
      )) /
    86400;
  t.diagnostic(
    `fixed Earth ${days.toFixed(3)} d; both bodies moving ${twoBody.toFixed(3)} d; observed 27.32 d`,
  );
  close(twoBody, 27.3, 0.002, "two-body period");
  lab.launch(launch);
  run(lab, 1.2 * el.period, 200000 * FRAME);
  close(lab.satellites[0].measuredPeriod / 86400, 27.45, 0.001, "measured");
});

test("energy and angular momentum over 100 orbits at e = 0.7, highest warp", (t) => {
  const lab = new OrbitLab(),
    launch = atPeriapsis(lab, BODIES.earth.radius + 400 * km, 0.7),
    id = lab.launch(launch),
    s = lab.get(id),
    start = lab.measure(id);
  near(s.elements.eccentricity, 0.7, 1e-12, "e");
  let energy = 0,
    momentum = 0,
    frames = 0;
  run(lab, 100 * s.elements.period, MAX_WARP * FRAME, () => {
    const m = lab.measure(id);
    energy = Math.max(energy, Math.abs(m.total / start.total - 1));
    momentum = Math.max(
      momentum,
      Math.abs(m.angularMomentum / start.angularMomentum - 1),
    );
    frames++;
  });
  assert.ok(s.orbits >= 99);
  // The same at a low warp, where it is sampled all the way round the
  // orbit (several thousand frames) rather than a few times an orbit.
  const fine = new OrbitLab(),
    fid = fine.launch(launch),
    fstart = fine.measure(fid);
  let fineEnergy = 0,
    fineMomentum = 0;
  run(fine, 100 * s.elements.period, 20000 * FRAME, () => {
    const m = fine.measure(fid);
    fineEnergy = Math.max(fineEnergy, Math.abs(m.total / fstart.total - 1));
    fineMomentum = Math.max(
      fineMomentum,
      Math.abs(m.angularMomentum / fstart.angularMomentum - 1),
    );
  });
  t.diagnostic(
    `highest warp (${frames} frames): energy changes by at most ${pct(energy)}, angular momentum by ${pct(momentum)}; at ×20000: ${pct(fineEnergy)}, ${pct(fineMomentum)}`,
  );
  for (const [value, name] of [
    [energy, "energy"],
    [momentum, "angular momentum"],
    [fineEnergy, "energy (×20000)"],
    [fineMomentum, "angular momentum (×20000)"],
  ])
    assert.ok(value < 1e-3, `${name} conserved to 0.1%: ${pct(value)}`);
  // The orbit has not turned or changed shape either.
  const now = orbitElements(lab.mu, s);
  near(now.eccentricity, 0.7, 1e-9, "eccentricity after 100 orbits");
  near(now.argument, s.elements.argument, 1e-9, "periapsis has not moved");
});

test("measured periods of ellipses match T = 2π√(a³/GM)", (t) => {
  const lab = new OrbitLab(),
    R = lab.body.radius,
    cases = [
      [R + 300 * km, 0.1],
      [R + 400 * km, 0.4],
      [R + 2000 * km, 0.7],
      [R + 20000 * km, 0.25],
      [R + 500 * km, 0.9],
    ],
    lines = [];
  for (const [radius, e] of cases) lab.launch(atPeriapsis(lab, radius, e));
  const longest = Math.max(...lab.list().map((s) => s.elements.period));
  run(lab, 2.2 * longest, longest / 400);
  for (const s of lab.list()) {
    const a = s.elements.semiMajorAxis,
      theory = TAU * Math.sqrt(a ** 3 / lab.mu);
    assert.ok(s.orbits >= 2);
    close(s.measuredPeriod, theory, 0.005, `period at a = ${a}`);
    lines.push(
      `e = ${s.elements.eccentricity.toFixed(2)}: measured ${s.measuredPeriod.toFixed(2)} s, theory ${theory.toFixed(2)} s (${pct(s.measuredPeriod / theory - 1)})`,
    );
  }
  t.diagnostic(lines.join("; "));
  // Each completed orbit is one point of the third-law plot, and they lie
  // on the line T² = (4π²/GM) a³.
  assert.equal(lab.thirdLaw.length, cases.length);
  for (const point of lab.thirdLaw)
    close(
      point.period ** 2 / point.semiMajorAxis ** 3,
      (4 * Math.PI ** 2) / lab.mu,
      0.01,
      "T²/a³",
    );
  lab.clearThirdLaw();
  assert.equal(lab.thirdLaw.length, 0);
});

test("escape speed: zero total energy and no return; just below, it returns", (t) => {
  const lab = new OrbitLab(),
    radius = lab.body.radius + 400 * km,
    ve = escapeSpeed(lab.mu, radius),
    tau = TAU * Math.sqrt(radius ** 3 / lab.mu);
  close(ve, Math.SQRT2 * circularSpeed(lab.mu, radius), 1e-12, "√2 × circular");
  const id = lab.launch({ radius, speed: ve, angle: 0 }),
    s = lab.get(id),
    m = lab.measure(id);
  assert.equal(s.elements.shape, "parabolic");
  assert.equal(s.elements.energy, 0);
  assert.equal(s.elements.period, Infinity);
  assert.ok(
    Math.abs(m.total) < 1e-9 * m.kinetic,
    `total energy ${m.total} J against kinetic ${m.kinetic} J`,
  );
  // It only ever gets further away, and its speed tends to zero as √(2μ/r).
  let last = radius,
    receding = true;
  run(lab, 3000 * tau, tau, () => {
    const r = Math.hypot(s.x, s.y);
    if (s.status === "flying" && r <= last) receding = false;
    last = r;
  });
  assert.ok(receding, "distance always increases");
  assert.equal(s.status, "escaped");
  assert.equal(s.orbits, 0);
  const end = lab.measure(id);
  close(end.speed, escapeSpeed(lab.mu, end.radius), 1e-9, "v = √(2μ/r)");
  assert.ok(Math.abs(end.total) < 1e-9 * m.kinetic, "energy still zero");
  t.diagnostic(
    `at escape speed ${(ve / km).toFixed(4)} km/s: total energy ${m.total.toExponential(2)} J (kinetic ${m.kinetic.toExponential(3)} J); followed out to ${(end.radius / radius).toFixed(0)} launch radii, speed ${end.speed.toFixed(1)} m/s and falling`,
  );

  // 0.5% slower: a long ellipse that comes back to where it started.
  const slow = new OrbitLab(),
    sid = slow.launch({ radius, speed: 0.995 * ve, angle: 0 }),
    back = slow.get(sid);
  assert.equal(back.elements.shape, "elliptical");
  assert.ok(back.elements.energy < 0);
  run(slow, 1.001 * back.elements.period, back.elements.period / 500);
  assert.equal(back.status, "flying");
  assert.equal(back.orbits, 1);
  close(back.measuredPeriod, back.elements.period, 0.005, "it returns on time");
  t.diagnostic(
    `at 0.995 × escape speed: e = ${back.elements.eccentricity.toFixed(4)}, apoapsis ${(back.elements.apoapsis / radius).toFixed(1)} launch radii, back after ${(back.measuredPeriod / 86400).toFixed(3)} days (theory ${(back.elements.period / 86400).toFixed(3)})`,
  );

  // Faster than escape: a hyperbola that keeps v∞ = √(v² − v_esc²).
  const fast = new OrbitLab(),
    hid = fast.launch({ radius, speed: 1.5 * ve, angle: 0.3 }),
    away = fast.get(hid);
  assert.equal(away.elements.shape, "hyperbolic");
  run(fast, 2000 * tau, tau);
  assert.equal(away.status, "escaped");
  const far = fast.measure(hid);
  close(
    far.speed ** 2,
    (1.5 * ve) ** 2 - ve ** 2 + (2 * fast.mu) / far.radius,
    1e-9,
    "energy conserved on the way out",
  );
  close(away.elements.excessSpeed, ve * Math.sqrt(1.25), 1e-12, "v∞");
});

test("Kepler's second law: equal areas in equal times", (t) => {
  const lab = new OrbitLab(),
    id = lab.launch(atPeriapsis(lab, BODIES.earth.radius + 400 * km, 0.7)),
    s = lab.get(id);
  run(lab, 1.05 * s.elements.period, s.elements.period / 300);
  const areas = s.sweep.sectors.map((sector) => sector.area),
    largest = Math.max(...areas),
    smallest = Math.min(...areas);
  assert.equal(areas.length, 12);
  close(s.sweep.interval, s.elements.period / 12, 1e-12, "interval");
  t.diagnostic(
    `12 sectors of ${(s.sweep.interval / 60).toFixed(2)} min: areas ${(smallest / 1e12).toFixed(4)} to ${(largest / 1e12).toFixed(4)} ×10⁶ km², spread ${pct(largest / smallest - 1)}; ½·h·Δt = ${(s.sweep.expected / 1e12).toFixed(4)} ×10⁶ km²`,
  );
  assert.ok(largest / smallest - 1 < 0.01, "areas match to 1%");
  // Each is ½·h·Δt, and together they make the ellipse, πab.
  for (const area of areas)
    close(
      area,
      (Math.abs(s.elements.angularMomentum) * s.sweep.interval) / 2,
      0.01,
    );
  const a = s.elements.semiMajorAxis;
  close(
    areas.reduce((sum, v) => sum + v, 0),
    Math.PI * a * a * Math.sqrt(1 - 0.7 ** 2),
    0.001,
    "total area πab",
  );
  // The sectors are far from the same shape: the one at periapsis spans a
  // much larger angle than the one at apoapsis.
  const angle = (sector) => {
    const p = sector.points,
      n = p.length;
    return Math.abs(
      Math.atan2(
        p[0] * p[n - 1] - p[1] * p[n - 2],
        p[0] * p[n - 2] + p[1] * p[n - 1],
      ),
    );
  };
  assert.ok(angle(s.sweep.sectors[0]) > 5 * angle(s.sweep.sectors[5]));
});

test("the integrated path lies on the conic predicted at launch", () => {
  const lab = new OrbitLab(),
    R = lab.body.radius;
  for (const launch of [
    atPeriapsis(lab, R + 400 * km, 0.7),
    { radius: R + 5000 * km, speed: 6500, angle: 0.5 },
    { radius: R + 1000 * km, speed: 7000, angle: 0.5 }, // lands
    { radius: R + 400 * km, speed: 13000, angle: -0.2 }, // hyperbola
  ]) {
    lab.clear();
    const id = lab.launch(launch),
      s = lab.get(id),
      el = s.elements,
      tau = TAU * Math.sqrt(launch.radius ** 3 / lab.mu);
    let worst = 0;
    run(lab, 3 * tau, tau / 200, () => {
      const r = Math.hypot(s.x, s.y),
        nu = Math.atan2(s.y, s.x) - el.argument,
        conic = el.semiLatusRectum / (1 + el.eccentricity * Math.cos(nu));
      worst = Math.max(worst, Math.abs(r / conic - 1));
    });
    assert.ok(worst < 1e-9, `off the conic by ${worst}`);
    // The drawn prediction is that same conic, starting at the satellite.
    const path = orbitPath(el, { maxRadius: 50 * launch.radius });
    near(path[0][0], 0, 1e-6 * launch.radius);
    close(path[0][1], launch.radius, 1e-12);
    for (const [x, y] of path) {
      const nu = Math.atan2(y, x) - el.argument;
      close(
        Math.hypot(x, y),
        el.semiLatusRectum / (1 + el.eccentricity * Math.cos(nu)),
        1e-9,
        "prediction on the conic",
      );
    }
    if (el.impact) {
      close(Math.hypot(...path.at(-1)), R, 1e-9, "drawn as far as the surface");
      assert.equal(s.status, "impact");
      near(s.x, path.at(-1)[0], 1e-3, "and that is where it lands");
      near(s.y, path.at(-1)[1], 1e-3);
    } else if (el.bound) {
      close(path.at(-1)[1], launch.radius, 1e-9, "closed curve");
      const radii = path.map(([x, y]) => Math.hypot(x, y));
      close(Math.max(...radii), el.apoapsis, 1e-3, "reaches apoapsis");
      close(Math.min(...radii), el.periapsis, 1e-3, "reaches periapsis");
    } else close(Math.hypot(...path.at(-1)), 50 * launch.radius, 1e-6);
  }
});

test("the same flight at any frame length or time warp", (t) => {
  const launch = (lab) =>
      lab.launch(atPeriapsis(lab, BODIES.earth.radius + 400 * km, 0.7)),
    reference = new OrbitLab(),
    rid = launch(reference),
    period = reference.get(rid).elements.period,
    span = 10.37 * period,
    lines = [];
  run(reference, span, span);
  const ref = reference.get(rid);
  for (const warp of [1e3, 1e5, MAX_WARP]) {
    const lab = new OrbitLab(),
      s = lab.get(launch(lab));
    run(lab, span, warp * FRAME);
    const apart =
      Math.hypot(s.x - ref.x, s.y - ref.y) / Math.hypot(ref.x, ref.y);
    lines.push(`×${warp}: ${apart.toExponential(1)}`);
    // Ten orbits on, the two runs are at the same place to a few parts in
    // a million of the distance from the centre.
    assert.ok(apart < 1e-5, `warp ${warp}: positions differ by ${apart}`);
    near(s.time, span, 1e-6 * span, "clock");
  }
  t.diagnostic(
    `position after 10.37 orbits, relative to one long advance: ${lines.join(", ")}`,
  );
  // More satellites than one advance can finish: it reports the shortfall
  // instead of taking longer steps.
  const busy = new OrbitLab({ maxSteps: 2000 }),
    id = launch(busy),
    done = busy.advance(MAX_WARP * FRAME);
  assert.ok(done > 0 && done < MAX_WARP * FRAME);
  near(busy.get(id).time, done, 1e-6 * done, "clock agrees with what was done");
  near(busy.time, done, 1e-9 * done);
});

test("Newton's cannon: lands on the surface, where and when Kepler says", (t) => {
  const { lab, launch, quoted } = fromPreset("newtons-cannon"),
    R = lab.body.radius,
    el = lab.preview(launch).elements,
    hit = predictImpact(el);
  assert.equal(el.impact, true);
  close(hit.swept * R, quoted.range, 0.005, "range quoted in the preset");
  close(circularSpeed(lab.mu, launch.radius), quoted.circular, 0.002);
  close(escapeSpeed(lab.mu, launch.radius), quoted.escape, 0.002);
  const id = lab.launch(launch),
    s = lab.get(id);
  let lowest = Infinity;
  run(lab, 3 * hit.time, hit.time / 200, () => {
    lowest = Math.min(lowest, Math.hypot(s.x, s.y));
  });
  assert.equal(s.status, "impact");
  // It stops on the surface (to a millimetre) and never goes below it.
  near(Math.hypot(s.x, s.y), R, 1e-3, "stopped at r = R");
  assert.ok(lowest >= R - 1e-3, "never inside the body");
  const frozen = [s.x, s.y, s.time];
  lab.advance(1000);
  assert.deepEqual([s.x, s.y, s.time], frozen, "stays where it landed");
  // Range: the angle between launch and landing from the conic,
  // cos ν = (p/r − 1)/e at each end. Time: Kepler's equation.
  const nu = (r) => Math.acos((el.semiLatusRectum / r - 1) / el.eccentricity),
    // (It is launched from the top of its ellipse, ν = 180°.)
    swept = nu(launch.radius) - nu(R);
  close(s.impact.swept, swept, 1e-6, "angle round the Earth");
  close(s.impact.range, swept * R, 1e-6, "distance along the ground");
  close(s.impact.time, hit.time, 1e-5, "time of flight");
  // Energy conservation gives the landing speed: v² = v₀² + 2μ(1/R − 1/r₀).
  close(
    s.impact.speed,
    Math.sqrt(launch.speed ** 2 + 2 * lab.mu * (1 / R - 1 / launch.radius)),
    1e-9,
    "landing speed",
  );
  t.diagnostic(
    `6 km/s from 100 km: lands ${(s.impact.range / km).toFixed(1)} km away (theory ${((swept * R) / km).toFixed(1)}) after ${s.impact.time.toFixed(2)} s (Kepler ${hit.time.toFixed(2)} s) at ${(s.impact.speed / km).toFixed(4)} km/s; final r − R = ${(Math.hypot(s.x, s.y) - R).toExponential(1)} m`,
  );
  // Faster launches land further round, until the circular speed.
  let previous = 0;
  for (const speed of [3000, 5000, 7000, 7800]) {
    const range = predictImpact(
      lab.preview({ ...launch, speed }).elements,
    ).swept;
    assert.ok(range > previous);
    previous = range;
  }
  assert.equal(
    lab.preview({ ...launch, speed: quoted.circular + 20 }).elements.impact,
    false,
  );
});

test("straight up: rises to the height energy allows, then lands at launch speed", () => {
  const lab = new OrbitLab(),
    R = lab.body.radius,
    speed = 5000,
    id = lab.launch({ altitude: 0, speed, angle: Math.PI / 2 }),
    s = lab.get(id),
    // ½v² − μ/R = −μ/r_top
    top = 1 / (1 / R - speed ** 2 / (2 * lab.mu));
  assert.equal(s.elements.radial, true);
  assert.equal(s.elements.impact, true);
  close(s.elements.apoapsis, top, 1e-12, "top of the flight");
  let highest = 0;
  run(lab, 4000, 1, () => {
    highest = Math.max(highest, s.y);
    near(s.x, 0, 1e-3, "stays on the vertical line");
  });
  close(highest, top, 1e-5, "height reached");
  assert.equal(s.status, "impact");
  near(Math.hypot(s.x, s.y), R, 1e-3);
  close(s.impact.speed, speed, 1e-9, "lands at the speed it left with");
  near(s.impact.descent, Math.PI / 2, 1e-6, "straight down");
  // Straight up at escape speed never comes back.
  lab.clear();
  const up = lab.get(
    lab.launch({
      altitude: 0,
      speed: escapeSpeed(lab.mu, R),
      angle: Math.PI / 2,
    }),
  );
  assert.equal(up.elements.impact, false);
  run(lab, 1e6, 1e4);
  assert.ok(up.status !== "impact" && up.y > 50 * R);
});

test("a launch into the ground is an impact at once; a skimming orbit is not", () => {
  const lab = new OrbitLab(),
    R = lab.body.radius,
    down = lab.get(
      lab.launch({ altitude: 0, speed: 100, angle: -Math.PI / 2 }),
    );
  lab.advance(10);
  assert.equal(down.status, "impact");
  near(Math.hypot(down.x, down.y), R, 1e-3);
  // A circular orbit exactly at the surface (no air, no hills) keeps going.
  lab.clear();
  const skim = lab.get(
    lab.launch({ altitude: 0, speed: circularSpeed(lab.mu, R), angle: 0 }),
  );
  assert.equal(skim.elements.impact, false);
  run(lab, 3.01 * skim.elements.period, 30);
  assert.equal(skim.status, "flying");
  assert.equal(skim.orbits, 3);
});

test("time of flight from Kepler's equation", () => {
  const mu = G * BODIES.earth.mass,
    lab = new OrbitLab(),
    el = lab.preview(atPeriapsis(lab, 1e7, 0.5)).elements;
  close(timeBetween(el, 0, TAU), el.period, 1e-12, "once round");
  close(
    timeBetween(el, 0, Math.PI),
    el.period / 2,
    1e-12,
    "periapsis to apoapsis",
  );
  // The quarter of the orbit nearest periapsis takes less than a quarter
  // of the period: for e = 0.5, (π/3 − (√3/4)) / 2π of it.
  close(
    timeBetween(el, 0, Math.PI / 2),
    ((Math.PI / 3 - Math.sqrt(3) / 4) / TAU) * el.period,
    1e-12,
  );
  // Hyperbola: check against integrating the motion.
  const fast = new OrbitLab(),
    id = fast.launch({
      radius: 1e7,
      speed: 1.3 * escapeSpeed(mu, 1e7),
      angle: 0,
    }),
    s = fast.get(id);
  run(fast, 5000, 5);
  const now = orbitElements(mu, s);
  close(timeBetween(s.elements, 0, now.trueAnomaly), 5000, 1e-5, "hyperbola");
});

test("energies, angular momentum and force for the satellite's mass", () => {
  const lab = new OrbitLab(),
    radius = lab.body.radius + 400 * km,
    v = circularSpeed(lab.mu, radius),
    id = lab.launch({ radius, speed: v, angle: 0 }),
    m = lab.measure(id);
  close(m.kinetic, 0.5 * 1000 * v * v, 1e-12, "½mv²");
  close(m.potential, (-G * BODIES.earth.mass * 1000) / radius, 1e-12, "−GMm/r");
  // Circular orbit: KE = −PE/2, so the total is −KE.
  close(m.total, -m.kinetic, 1e-12, "E = −KE on a circle");
  close(Math.abs(m.angularMomentum), 1000 * radius * v, 1e-12, "mvr");
  close(m.force, (1000 * v * v) / radius, 1e-12, "GMm/r² = mv²/r");
  close(m.altitude, 400 * km, 1e-9);
  // A heavier satellite has more energy but follows the same path.
  lab.setSatelliteMass(5000);
  close(lab.measure(id).kinetic, 5 * m.kinetic, 1e-12);
  assert.throws(
    () => lab.setSatelliteMass(0),
    /Satellite mass must be between/,
  );
});

test("other central bodies: low orbits of the Moon and the Sun's planets", () => {
  const lab = new OrbitLab();
  lab.setBody({ key: "moon", ...BODIES.moon });
  // 100 km above the Moon: 1.63 km/s, about 118 minutes.
  const low = lab.preview({ altitude: 100 * km, speed: 0, angle: 0 });
  close(low.circularSpeed, 1.63 * km, 0.005);
  close(
    TAU * Math.sqrt((BODIES.moon.radius + 100 * km) ** 3 / lab.mu),
    118 * 60,
    0.005,
  );
  lab.setBody({ key: "sun", ...BODIES.sun });
  // The Earth: 1 au from the Sun, 29.8 km/s, one year.
  const au = 1.496e11,
    id = lab.launch({ radius: au, speed: circularSpeed(lab.mu, au), angle: 0 }),
    s = lab.get(id);
  close(s.launch.speed, 29.8 * km, 0.002);
  close(s.elements.period / 86400, 365.25, 0.002);
  run(lab, 1.1 * s.elements.period, s.elements.period / 300);
  close(s.measuredPeriod / 86400, 365.25, 0.002);
});

test("changing the body removes its satellites; bad values are refused whole", () => {
  const lab = new OrbitLab();
  lab.launch({ altitude: 400 * km, speed: 7700, angle: 0 });
  lab.advance(100);
  assert.throws(
    () => lab.setBody({ mass: 1e40, radius: 5e6 }),
    /Mass must be between/,
  );
  // Refused: nothing changed, the satellite is still there.
  assert.equal(lab.body.mass, BODIES.earth.mass);
  assert.equal(lab.body.radius, BODIES.earth.radius);
  assert.equal(lab.list().length, 1);
  assert.throws(() => lab.setBody({ radius: 0 }), /Radius must be between/);
  assert.throws(() => lab.setBody({ mass: 1e32, radius: 1e3 }), /too compact/);
  lab.setBody({ mass: 2 * BODIES.earth.mass });
  assert.equal(lab.body.key, "custom");
  assert.equal(lab.list().length, 0);
  assert.equal(lab.time, 0);
  // Twice the mass: circular speed up by √2 at the same radius.
  close(
    lab.preview({ altitude: 0, speed: 0, angle: 0 }).circularSpeed,
    Math.SQRT2 * circularSpeed(G * BODIES.earth.mass, BODIES.earth.radius),
    1e-12,
  );
  assert.throws(
    () => lab.launch({ altitude: -10, speed: 100, angle: 0 }),
    /on or above the surface/,
  );
  assert.throws(
    () => lab.launch({ altitude: 0, speed: -1, angle: 0 }),
    /Launch speed must be between/,
  );
  assert.throws(
    () => lab.launch({ altitude: 0, speed: 4e7, angle: 0 }),
    /Launch speed must be between/,
  );
  assert.throws(
    () => lab.launch({ altitude: 0, speed: 100, angle: 7 }),
    /Launch angle/,
  );
  assert.throws(
    () => lab.launch({ altitude: NaN, speed: 100, angle: 0 }),
    /on or above the surface/,
  );
  for (let i = 0; i < LIMITS.satellites; i++)
    lab.launch({ altitude: 1e6 * (i + 1), speed: 9000, angle: 0 });
  assert.throws(
    () => lab.launch({ altitude: 1e6, speed: 9000, angle: 0 }),
    /already 8 satellites/,
  );
  // Each has its own colour, and a removed one's colour is used again.
  assert.deepEqual(
    lab.list().map((s) => s.colour),
    [0, 1, 2, 3, 4, 5, 6, 7],
  );
  lab.remove(lab.list()[2].id);
  assert.equal(
    lab.get(lab.launch({ altitude: 1e6, speed: 9000, angle: 0 })).colour,
    2,
  );
});

test("trails and graph history are bounded and can be cleared", () => {
  const lab = new OrbitLab(),
    id = lab.launch(atPeriapsis(lab, BODIES.earth.radius + 400 * km, 0.5)),
    s = lab.get(id),
    period = s.elements.period;
  // A closed orbit retraces itself, so its trail is one turn: it ends where
  // it began and stops growing.
  run(lab, 1.5 * period, period / 50);
  const turn = s.trail.length,
    last = turn - 1;
  assert.ok(turn > 300 && turn < s.trail.capacity, `${turn} trail points`);
  near(s.trail.get(last, 0), s.trail.get(0, 0), 0.02 * s.launch.radius);
  near(s.trail.get(last, 1), s.trail.get(0, 1), 0.02 * s.launch.radius);
  run(lab, 30 * period, period / 50);
  assert.equal(s.trail.length, turn);
  assert.equal(s.history.length, s.history.capacity);
  // History rows are (time, distance, speed) in order of time, and each
  // satisfies the vis-viva equation v² = μ(2/r − 1/a).
  for (let i = 1; i < s.history.length; i += 37) {
    assert.ok(s.history.get(i, 0) > s.history.get(i - 1, 0));
    close(
      s.history.get(i, 2) ** 2,
      lab.mu * (2 / s.history.get(i, 1) - 1 / s.elements.semiMajorAxis),
      1e-9,
      "vis-viva",
    );
  }
  // Clearing starts the trail again from where the satellite is now, for
  // one more turn.
  lab.clearTrails();
  assert.equal(s.trail.length, 1);
  assert.deepEqual([s.trail.get(0, 0), s.trail.get(0, 1)], [s.x, s.y]);
  run(lab, 3 * period, period / 50);
  assert.ok(Math.abs(s.trail.length - turn) < 0.05 * turn);
  // An escaping satellite's trail keeps growing, more slowly as it goes.
  const away = lab.get(
    lab.launch({ altitude: 400 * km, speed: 12000, angle: 0 }),
  );
  run(lab, 20 * period, period / 50);
  assert.ok(away.trail.length > 100 && away.trail.length < away.trail.capacity);
});

test("presets: every one launches and matches the numbers it quotes", () => {
  assert.deepEqual(
    presets.map((p) => p.id),
    [
      "low-earth-orbit",
      "geostationary",
      "moon-orbit",
      "newtons-cannon",
      "eccentric-ellipse",
    ],
  );
  for (const p of presets) {
    const { lab, launch, quoted } = fromPreset(p.id),
      el = lab.preview(launch).elements;
    assert.ok(p.title && p.text && p.expect && p.warp > 0, p.id);
    assert.ok(lab.launch(launch) > 0);
    if (quoted.speed) close(launch.speed, quoted.speed, 0.005, p.id + " speed");
    if (quoted.period) close(el.period, quoted.period, 0.005, p.id + " period");
    if (quoted.eccentricity)
      near(el.eccentricity, quoted.eccentricity, 1e-9, p.id + " e");
    if (quoted.apoapsis)
      close(el.apoapsis, quoted.apoapsis, 0.001, p.id + " apoapsis");
  }
  // Newton's cannon launches from just above the surface, horizontally.
  const cannon = fromPreset("newtons-cannon").launch;
  assert.equal(cannon.angle, 0);
  close(cannon.radius - BODIES.earth.radius, 100 * km, 1e-9);
});
