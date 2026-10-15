import test from "node:test";
import assert from "node:assert/strict";
import Matter from "../vendor/matter.js";
globalThis.Matter = Matter;
const { Sandbox, DT } = await import("../src/physics.js");
const { FieldDrag } = await import("../src/field-view.js");
const near = (a, b, t = 1e-7) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
const make = () => {
  const s = new Sandbox();
  s.updateSettings({ gravity: 0 });
  return s;
};
const run = (s, t) => {
  for (let i = 0; i < Math.round(t / DT); i++) s.step();
};
test("electric acceleration follows charge polarity and mass; neutral bodies stay still", () => {
  for (const q of [-2, 0, 2]) {
    const s = make(),
      id = s.add("ball", { x: 0, y: 20 });
    s.updateSettings({ electricX: 3, electricY: 2 });
    s.updateConstants(id, { charge: q, mass: 2 });
    run(s, 1);
    near(s.state(id).vx, (q * 3) / 2);
    near(s.state(id).vy, q);
    near(s.state(id).omega, 0);
    s.dispose();
  }
});
test("magnetic force turns moving charge with correct sign and conserves speed", () => {
  for (const q of [-1, 1]) {
    const s = make(),
      id = s.add("ball", { x: 0, y: 20 });
    s.updateConstants(id, { charge: q });
    s.updateSettings({ magneticZ: 2 });
    Matter.Body.setVelocity(s.objects.get(id).body, {
      x: (5 * 100) / 60,
      y: 0,
    });
    run(s, 0.5);
    near(s.state(id).vx, 5 * Math.cos(1));
    near(s.state(id).vy, -q * 5 * Math.sin(1));
    run(s, 20);
    near(Math.hypot(s.state(id).vx, s.state(id).vy), 5, 1e-6);
    s.dispose();
  }
});
test("a stationary charge stays stationary in a magnetic field", () => {
  const s = make(),
    id = s.add("block", { x: 0, y: 20 });
  s.updateConstants(id, { charge: 2 });
  s.updateSettings({ magneticZ: -10 });
  run(s, 1);
  near(s.state(id).vx, 0);
  near(s.state(id).vy, 0);
  s.dispose();
});
test("crossed E and B preserve the E cross B drift velocity", () => {
  const s = make(),
    id = s.add("ball", { x: 0, y: 20 });
  s.updateConstants(id, { charge: 2 });
  s.updateSettings({ electricX: 6, magneticZ: 3 });
  Matter.Body.setVelocity(s.objects.get(id).body, { x: 0, y: (2 * 100) / 60 });
  run(s, 1);
  near(s.state(id).vx, 0);
  near(s.state(id).vy, -2);
  s.dispose();
});
test("regions superpose with global fields and respect rotated shape boundaries", () => {
  const s = make();
  s.updateSettings({ electricX: 1, electricY: 2, magneticZ: 3 });
  const e = s.fields.add("electric", { x: 0, y: 10 }),
    b = s.fields.add("magnetic", { x: 0, y: 10 });
  s.fields.update(e, { angle: 90, width: 4, height: 2, strength: 4 });
  s.fields.update(b, { strength: -3 });
  let f = s.fields.at({ x: 0, y: 10 });
  near(f.ex, 1);
  near(f.ey, 6);
  near(f.bz, 0);
  f = s.fields.at({ x: 1.5, y: 10 });
  near(f.ey, 2);
  near(f.bz, 0);
  s.fields.update(e, { shape: "ellipse", angle: 0 });
  assert.equal(
    s.fields.contains(s.fields.regions.get(e), { x: 1.8, y: 10.8 }),
    false,
  );
  s.fields.update(e, { shape: "circle", width: 2 });
  near(s.fields.regions.get(e).height, 2);
  s.remove(b);
  near(s.fields.at({ x: 0, y: 10 }).bz, 3);
  s.dispose();
});
test("field force starts and stops when body centre crosses region boundary", () => {
  const s = make(),
    id = s.add("ball", { x: 0, y: 20 }),
    e = s.fields.add("electric", { x: 0, y: 20 });
  s.updateConstants(id, { charge: 1 });
  s.fields.update(e, { width: 1, strength: 6 });
  s.step();
  assert.ok(s.state(id).vx > 0);
  Matter.Body.setPosition(s.objects.get(id).body, { x: 300, y: -2000 });
  const vx = s.state(id).vx;
  run(s, 0.2);
  near(s.state(id).vx, vx);
  s.dispose();
});
test("fields respect position locks, allow unlocked translation and validate edits atomically", () => {
  const s = make(),
    id = s.add("ball", { x: 0, y: 20 });
  s.updateConstants(id, { charge: 1 });
  s.updateSettings({ electricX: 5 });
  s.setLock(id, "position", true);
  run(s, 0.2);
  near(s.state(id).x, 0);
  s.setLock(id, "position", false);
  s.setLock(id, "rotation", true);
  run(s, 0.2);
  assert.ok(s.state(id).x > 0);
  near(s.state(id).angle, 0);
  const e = s.fields.add("electric", { x: 0, y: 20 });
  assert.throws(() => s.fields.update(e, { strength: 7, width: 0 }));
  near(s.fields.regions.get(e).strength, 5);
  assert.throws(() => s.updateSettings({ electricX: NaN }));
  s.dispose();
});
test("field movement, rotation and resizing obey Z snapping with a fixed resize centre", () => {
  const s = make(),
    id = s.fields.add("electric", { x: 0, y: 10 });
  let d = new FieldDrag(s.fields, id, { x: 0, y: 10 }, "move");
  d.move({ x: 0.74, y: 10.26 }, "move", true);
  let f = s.fields.regions.get(id);
  near(f.x, 0.5);
  near(f.y, 10.5);
  d = new FieldDrag(s.fields, id, { x: 1.5, y: 10.5 }, "rotate");
  d.move({ x: 1.2, y: 11.2 }, "rotate", true);
  near(f.angle, 45);
  const centre = { x: f.x, y: f.y };
  d = new FieldDrag(s.fields, id, centre, "resize");
  d.move({ x: centre.x + 1, y: centre.y + 1 }, "resize", true);
  near(f.x, centre.x);
  near(f.y, centre.y);
  near(f.width / 0.5, Math.round(f.width / 0.5));
  s.dispose();
});

test("circular field resizing can shrink as well as grow without moving its centre", () => {
  const s = make(),
    id = s.fields.add("magnetic", { x: 0, y: 10 });
  const d = new FieldDrag(s.fields, id, { x: 2, y: 10 }, "resize");
  d.move({ x: 1, y: 10 }, "resize", true);
  const f = s.fields.regions.get(id);
  near(f.width, 2);
  near(f.height, 2);
  near(f.x, 0);
  near(f.y, 10);
  s.dispose();
});

// ---------------------------------------------------------------------------
// The edge of a field region. A body is in a region for part of a step when
// it crosses the edge, so the textbook results below (work = qEL across a
// gap, a half-turn of diameter 2mv/qB, a parabola across plates) only come
// out if the field acts for that part of the step alone.

const regionOf = (s, type, patch) => {
  const id = s.fields.add(type, { x: patch.x, y: patch.y });
  s.fields.update(id, { shape: "rectangle", ...patch });
  return id;
};
const charge = (s, { x, y, vx = 0, vy = 0, q = 1, m = 1 }) => {
  const id = s.add("ball", { x, y });
  s.updateConstants(id, {
    charge: q,
    mass: m,
    linearDamping: 0,
    angularDamping: 0,
  });
  s.setPose(id, { x, y });
  if (vx || vy) s.setVelocity(id, { vx, vy });
  return id;
};
export const exitSpeed = (E, { q = 1, m = 1, L = 1, start = 0.3 } = {}) => {
  // From rest, `start` inside the left edge of a region L wide.
  const s = make(),
    left = 2;
  regionOf(s, "electric", {
    x: left + L / 2,
    y: 20,
    width: L,
    height: 4,
    strength: E,
  });
  const id = charge(s, { x: left + start, y: 20, q, m });
  for (let i = 0; i < 100000 && s.state(id).x < left + L + 0.5; i++) s.step();
  const v = s.state(id).vx;
  s.dispose();
  return v;
};
test("a charge crossing a gap gains qEd of kinetic energy, whatever the field", () => {
  // ½mv² = qE × (distance travelled in the field)
  for (const [E, q, m, L, start] of [
    [8, 1, 1, 1, 0],
    [7, 1, 1, 1, 0],
    [3.3, 2, 5, 1, 0.3],
    [64, 1, 1, 1, 0.21],
    [90, 3, 0.7, 2.5, 0.4],
    [0.9, 1, 12, 0.6, 0.05],
  ]) {
    const expected = Math.sqrt((2 * q * E * (L - start)) / m),
      got = exitSpeed(E, { q, m, L, start });
    assert.ok(
      Math.abs(got - expected) <= 2e-3 * expected,
      `E=${E} q=${q} m=${m} L=${L}: speed ${got}, expected ${expected} (${(((got - expected) / expected) * 100).toFixed(2)}%)`,
    );
  }
});
export const halfTurn = (v, B, { q = 1, m = 1 } = {}) => {
  // Enters a magnetic region through its left edge, turns through half a
  // circle and leaves through the same edge, 2r from where it came in.
  const s = make(),
    r = (m * v) / (q * B);
  regionOf(s, "magnetic", {
    x: 5 + 12,
    y: 30,
    width: 24,
    height: 48,
    strength: B,
  });
  const id = charge(s, { x: 5 - 0.37, y: 30, vx: v, q, m });
  let before = s.potentialPoint(id),
    entered = false,
    out = null;
  for (let i = 0; i < 200000 && out === null; i++) {
    s.step();
    const now = s.potentialPoint(id);
    if (now.x > 5) entered = true;
    if (entered && now.x <= 5) {
      const f = (5 - before.x) / (now.x - before.x);
      out = before.y + f * (now.y - before.y);
    }
    before = now;
  }
  s.dispose();
  return { diameter: Math.abs(out - 30), expected: 2 * r };
};
test("a charge entering a magnetic region leaves 2mv/qB from where it came in", () => {
  for (const [v, B, q, m] of [
    [4, 2, 1, 1],
    [3.3, 0.7, 2, 5],
    [11, 1.3, 1, 1.1],
    [0.8, 4, 0.5, 3],
  ]) {
    const { diameter, expected } = halfTurn(v, B, { q, m });
    assert.ok(
      Math.abs(diameter - expected) <= 2e-3 * expected,
      `v=${v} B=${B} q=${q} m=${m}: ${diameter}, expected ${expected} (${(((diameter - expected) / expected) * 100).toFixed(2)}%)`,
    );
  }
});
export const deflection = (E, L, u, { q = 1, m = 1 } = {}) => {
  // Crosses a region L long at speed u, with the field across its path.
  const s = make();
  regionOf(s, "electric", {
    x: 3 + L / 2,
    y: 30,
    width: 30,
    height: L,
    angle: 90,
    strength: E,
  });
  const id = charge(s, { x: 3 - 0.41, y: 30, vx: u, q, m });
  let before = s.potentialPoint(id),
    out = null;
  for (let i = 0; i < 200000 && out === null; i++) {
    s.step();
    const now = s.potentialPoint(id);
    if (now.x >= 3 + L) {
      const f = (3 + L - before.x) / (now.x - before.x);
      out = before.y + f * (now.y - before.y) - 30;
    }
    before = now;
  }
  s.dispose();
  return out;
};
test("a charge crossing a field region is deflected by qEL²/2mu²", () => {
  for (const [E, L, u, q, m] of [
    [2, 4, 4, 1, 1],
    [5, 3, 7.3, 1, 2],
    [12, 1.5, 9.1, 2, 3],
    [0.6, 6, 2.2, 1, 1],
  ]) {
    const expected = (q * E * L * L) / (2 * m * u * u),
      got = deflection(E, L, u, { q, m });
    assert.ok(
      Math.abs(got - expected) <= 3e-3 * expected,
      `E=${E} L=${L} u=${u}: ${got}, expected ${expected} (${(((got - expected) / expected) * 100).toFixed(2)}%)`,
    );
  }
});

test("damping does not weaken an electric force: a damped charge on a spring rests at kx = qE", () => {
  // The same balance as a damped weight on a spring (kx = mg). The field's
  // push must not be damped away within the step that it is given.
  for (const [where, setup] of [
    ["global field", (s) => s.updateSettings({ electricX: 10 })],
    [
      "field region",
      (s) =>
        regionOf(s, "electric", {
          x: 3,
          y: 20,
          width: 6,
          height: 4,
          strength: 10,
        }),
    ],
  ]) {
    const s = make();
    setup(s);
    const id = s.add("ball", { x: 1, y: 20 });
    s.updateConstants(id, { charge: 1, mass: 1, linearDamping: 9 });
    s.setPose(id, { x: 1, y: 20 });
    const spring = s.connect("spring", null, id, { x: 0, y: 20 }, null);
    s.updateLink(spring, { k: 20, damping: 0 });
    run(s, 6);
    // Expected extension qE/k = 10/20 = 0.5 m beyond the 1 m natural length.
    near(s.state(id).x - 1, 0.5, 1e-6);
    s.dispose();
  }
});

test("a field region turned through a right angle pushes exactly along its direction", () => {
  // cos 90° in floating point is 6e-17, which gave a charge held by an
  // upward field a sideways push of about 1e-16 N.
  for (const [angle, ux, uy] of [
    [90, 0, 1],
    [180, -1, 0],
    [-90, 0, -1],
    [270, 0, -1],
  ]) {
    const s = make();
    regionOf(s, "electric", { x: 0, y: 20, width: 4, height: 4, angle, strength: 5 });
    const id = charge(s, { x: 0, y: 20 });
    run(s, 0.5);
    // Across the field: exactly nothing. Along it: qEt/m = 2.5 m/s.
    const v = s.state(id);
    if (ux === 0) assert.equal(Math.abs(v.vx), 0);
    else near(v.vx, ux * 2.5, 1e-9);
    if (uy === 0) assert.equal(Math.abs(v.vy), 0);
    else near(v.vy, uy * 2.5, 1e-9);
    s.dispose();
  }
});
