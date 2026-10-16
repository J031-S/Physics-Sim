// The gravity sandbox (src/orbitlab/nbody.js) against the textbook: two-body
// circular and elliptical orbits, Kepler's third law with both masses, the
// figure-eight three-body orbit, conservation of momentum and energy,
// merging, validation and files.
import test from "node:test";
import assert from "node:assert/strict";
import { GravityLab, LIMITS } from "../src/orbitlab/nbody.js";
import { G } from "../src/orbitlab/model.js";
import { sandboxPresets } from "../src/orbitlab/presets.js";

const near = (actual, expected, tolerance, message) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message || "value"}: got ${actual}, expected ${expected} ± ${tolerance}`,
  );
const DAY = 86400;

test("an equal-mass binary goes round its centre of mass with T = 2π√(a³/G(m₁+m₂))", () => {
  const m = 1e30,
    a = 1e11,
    T = 2 * Math.PI * Math.sqrt(a ** 3 / (G * 2 * m)),
    // Each star moves on a circle of radius a/2 at half the relative speed.
    v = Math.sqrt((G * 2 * m) / a) / 2,
    lab = new GravityLab({ maxSteps: 1e7 });
  lab.add({ mass: m, radius: 1e8, x: -a / 2, y: 0, vx: 0, vy: -v });
  lab.add({ mass: m, radius: 1e8, x: a / 2, y: 0, vx: 0, vy: v });
  const e0 = lab.energy().total;
  assert.equal(lab.advance(10 * T), 10 * T);
  const [s1, s2] = lab.list();
  // Back where they started after ten orbits, to a few parts in a million
  // of the separation.
  near(s2.x, a / 2, 1e-5 * a, "x");
  near(s2.y, 0, 1e-5 * a, "y");
  near(s1.x, -a / 2, 1e-5 * a, "other x");
  // Energy is conserved to rounding on a circular orbit; momentum stays 0.
  near((lab.energy().total - e0) / e0, 0, 1e-10, "energy");
  near(lab.momentum().x, 0, 1e-12 * m * v);
  near(lab.momentum().y, 0, 1e-12 * m * v);
});

test("the Earth goes round the Sun in a year, by Kepler's third law with both masses", () => {
  const Ms = 1.989e30,
    Me = 5.972e24,
    r = 1.496e11,
    lab = new GravityLab({ maxSteps: 1e7 }),
    sun = lab.add({ mass: Ms, radius: 6.96e8, x: 0, y: 0 }),
    earth = lab.add({ mass: Me, radius: 6.371e6, x: r, y: 0 });
  // circularVelocity gives the Earth √(G(Ms+Me)/r) relative to the Sun; the
  // Sun gets the opposite momentum so that the centre of mass stays still.
  const c = lab.circularVelocity(earth, sun);
  lab.update(earth, { vx: c.vx, vy: (c.vy * Ms) / (Ms + Me) });
  lab.update(sun, { vy: (-c.vy * Me) / (Ms + Me) });
  const T = 2 * Math.PI * Math.sqrt(r ** 3 / (G * (Ms + Me)));
  near(T / DAY, 365.25, 0.1, "the formula's year");
  // Measure the period: the time at which the Earth next crosses the +x
  // axis going up, found between steps.
  let t = 0,
    prev = lab.get(earth).y,
    period = null;
  const h = DAY / 4;
  while (t < 1.2 * T && period === null) {
    lab.advance(h);
    t += h;
    const y = lab.get(earth).y;
    if (t > T / 2 && prev < 0 && y >= 0) period = t - (h * y) / (y - prev);
    prev = y;
  }
  near(period / DAY, T / DAY, 0.01, "measured year (days)");
});

test("an eccentric orbit keeps its energy to a few parts in a million over 100 orbits", () => {
  const Ms = 1.989e30,
    m = 5.972e24,
    rp = 4.5e10,
    e = 0.7,
    v = Math.sqrt((G * (Ms + m) * (1 + e)) / rp),
    a = rp / (1 - e),
    T = 2 * Math.PI * Math.sqrt(a ** 3 / (G * (Ms + m))),
    lab = new GravityLab({ maxSteps: 1e8 });
  lab.add({ mass: Ms, radius: 6.96e8, x: 0, y: 0 });
  lab.add({ mass: m, radius: 6.4e6, x: rp, y: 0, vy: v });
  const e0 = lab.energy().total,
    l0 = lab.angularMomentum(),
    p0 = lab.momentum();
  lab.advance(100 * T);
  near((lab.energy().total - e0) / e0, 0, 1e-5, "energy");
  near((lab.angularMomentum() - l0) / l0, 0, 1e-9, "angular momentum");
  near(lab.momentum().x - p0.x, 0, 1e-12 * m * v, "momentum x");
  near(lab.momentum().y - p0.y, 0, 1e-12 * m * v, "momentum y");
});

test("the figure-eight orbit of three equal masses comes back to itself", () => {
  // Chenciner and Montgomery (2000), in units with G = m = 1; period 6.3259.
  const L = 1e11,
    M = 1e30,
    T0 = Math.sqrt(L ** 3 / (G * M)),
    V = L / T0,
    p = [0.97000436, -0.24308753],
    v3 = [-0.93240737, -0.86473146],
    lab = new GravityLab({ maxSteps: 1e7 });
  const start = [
    [p[0], p[1], -v3[0] / 2, -v3[1] / 2],
    [-p[0], -p[1], -v3[0] / 2, -v3[1] / 2],
    [0, 0, v3[0], v3[1]],
  ];
  for (const [x, y, vx, vy] of start)
    lab.add({ mass: M, radius: 1e8, x: x * L, y: y * L, vx: vx * V, vy: vy * V });
  lab.advance(6.32591398 * T0);
  lab.list().forEach((b, i) => {
    near(b.x / L, start[i][0], 1e-4, `body ${i} x`);
    near(b.y / L, start[i][1], 1e-4, `body ${i} y`);
  });
});

test("bodies that touch merge, keeping mass and momentum and adding volumes", () => {
  const lab = new GravityLab(),
    a = lab.add({ mass: 6e24, radius: 6e6, x: 0, y: 0, vx: 1000 }),
    b = lab.add({ mass: 2e24, radius: 4e6, x: 3e7, y: 0, vx: -2000 });
  const p0 = lab.momentum();
  lab.advance(3600 * 5);
  assert.equal(lab.list().length, 1);
  const one = lab.list()[0];
  assert.equal(one.id, a, "the heavier one carries on");
  assert.equal(one.mass, 8e24);
  near(one.radius, Math.cbrt(6e6 ** 3 + 4e6 ** 3), 1e-6);
  near(lab.momentum().x, p0.x, 1e-9 * Math.abs(p0.x || 1e28));
  near(one.vx, (6e24 * 1000 - 2e24 * 2000) / 8e24, 5, "speed after (pulled together first)");
  assert.equal(lab.events.length, 1);
  assert.equal(lab.events[0].from, "Body " + b);
});

test("values are checked and a refused change changes nothing", () => {
  const lab = new GravityLab(),
    id = lab.add({ mass: 1e24, radius: 1e6, x: 0, y: 0 });
  assert.throws(() => lab.add({ mass: 0, radius: 1e6, x: 1e8, y: 0 }), /Mass/);
  assert.throws(() => lab.add({ mass: 1e24, radius: 1e6, x: 5e5, y: 0 }), /overlap/);
  assert.throws(() => lab.update(id, { mass: 2e24, radius: -1 }), /Radius/);
  assert.equal(lab.get(id).mass, 1e24);
  assert.throws(() => lab.update(id, { vx: 4e7 }), /tenth of the speed of light/);
  assert.throws(() => lab.update(id, { colour: 3 }), /Unknown/);
  for (let i = 1; i < LIMITS.bodies; i++)
    lab.add({ mass: 1e20, radius: 1e3, x: i * 1e7, y: 0 });
  assert.throws(() => lab.add({ mass: 1e20, radius: 1e3, x: 0, y: 1e9 }), /already/);
});

test("scenes save and load, and every preset is valid and keeps its momentum", () => {
  for (const preset of sandboxPresets) {
    const lab = new GravityLab({ maxSteps: 1e6 });
    preset.build(lab);
    const copy = GravityLab.fromScene(JSON.parse(JSON.stringify(lab.exportScene())));
    assert.deepEqual(copy.exportScene(), lab.exportScene(), preset.id);
    // A preset is set up with the centre of mass at rest.
    const p = lab.momentum(),
      scale = Math.max(...lab.list().map((b) => b.mass * Math.hypot(b.vx, b.vy)));
    near(Math.hypot(p.x, p.y), 0, 1e-9 * scale, preset.id + " momentum");
    const e0 = lab.energy().total;
    lab.advance(preset.check ?? 1e6);
    near((lab.energy().total - e0) / e0, 0, 1e-6, preset.id + " energy");
  }
  const lab = new GravityLab();
  lab.add({ mass: 1e24, radius: 1e6, x: 0, y: 0 });
  assert.throws(() => lab.loadScene({ format: "physium-gravity", version: 1, bodies: [{ mass: -1 }] }));
  assert.equal(lab.list().length, 1, "a bad file leaves the scene alone");
  assert.throws(() => lab.loadScene({ format: "physics-sim-orbits", version: 1 }), /Orbits/);
});
