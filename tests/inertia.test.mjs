import test from "node:test";
import assert from "node:assert/strict";
import Matter from "../vendor/matter.js";
globalThis.Matter = Matter;
const { Sandbox, DT } = await import("../src/physics.js");
const near = (a, b, t = 0.001) =>
  assert.ok(Math.abs(a - b) < t, `${a} expected ${b} ±${t}`);
const run = (s, t) => {
  for (let i = 0; i < Math.round(t / DT); i++) s.step();
};
// Engine inertia is kg·px²; SCALE = 100 px/m.
const inertia = (s, id) => s.objects.get(id).freeInertia / 1e4;
test("moments of inertia match the textbook values for each shape", () => {
  const s = new Sandbox(),
    ball = s.add("ball", { x: 0, y: 3 }),
    block = s.add("block", { x: 3, y: 3 }),
    wedge = s.add("wedge", { x: 8, y: 3 });
  near(inertia(s, ball), 0.5 * 1 * 0.4 ** 2, 1e-9); // disc: mr²/2
  near(inertia(s, block), (1 * (0.9 ** 2 + 0.9 ** 2)) / 12, 1e-9);
  near(inertia(s, wedge), (1 * (3 ** 2 + 1.5 ** 2)) / 18, 1e-9);
  near(s.objects.get(ball).body.inertia, s.objects.get(ball).freeInertia, 1e-6);
  s.dispose();
});
test("inertia stays correct after resizing and changing mass, in either order", () => {
  const s = new Sandbox(),
    ball = s.add("ball", { x: 0, y: 5 }),
    block = s.add("block", { x: 4, y: 5 }),
    wedge = s.add("wedge", { x: 10, y: 5 });
  s.resizeBody(ball, 1.6);
  s.updateConstants(ball, { mass: 3 });
  near(inertia(s, ball), 0.5 * 3 * 0.8 ** 2, 1e-9);
  s.updateConstants(block, { mass: 5 });
  s.resizeBody(block, 2, 0.5);
  near(inertia(s, block), (5 * (2 ** 2 + 0.5 ** 2)) / 12, 1e-9);
  s.resizeBody(wedge, 6, 3);
  s.updateConstants(wedge, { mass: 2 });
  near(inertia(s, wedge), (2 * (6 ** 2 + 3 ** 2)) / 18, 1e-9);
  // Rotation lock hides the finite value on the body but must not lose it.
  assert.equal(s.objects.get(wedge).body.inverseInertia, 0);
  s.setLock(wedge, "rotation", false);
  near(s.objects.get(wedge).body.inertia / 1e4, inertia(s, wedge), 1e-9);
  s.dispose();
});
test("Atwood machine with a disc pulley: a = (m2 − m1)g / (m1 + m2 + M/2)", () => {
  const s = new Sandbox(),
    wheel = s.add("ball", { x: 0, y: 8 }),
    a = s.add("block", { x: -0.4, y: 4 }),
    b = s.add("block", { x: 0.4, y: 4 });
  s.resizeBody(a, 0.3, 0.3);
  s.resizeBody(b, 0.3, 0.3);
  s.updateConstants(b, { mass: 3 });
  s.updateConstants(wheel, { angularDamping: 0 });
  s.mechanisms.createPulley(a, wheel, b);
  run(s, 0.5);
  const acc = ((3 - 1) * 9.81) / (1 + 3 + 1 / 2);
  near(s.state(b).vy, -acc * 0.5, 0.02);
  near(s.state(a).vy, acc * 0.5, 0.02);
  s.dispose();
});
test("a ball pushed without spin ends up rolling at 2/3 of its launch speed", () => {
  // Angular momentum about the contact point is conserved while friction
  // spins the disc up: m v0 r = (m r² + m r²/2) v / r.
  const s = new Sandbox(),
    id = s.add("ball", { x: -20, y: 0.4 });
  s.updateConstants(id, { angularDamping: 0, restitution: 0 });
  run(s, 0.3);
  s.impulse(id, { x: 3, y: 0 }, "velocity");
  run(s, 0.1);
  const st = s.state(id);
  near(st.vx, 2, 0.05);
  near(-st.omega * 0.4, st.vx, 0.06); // rolling without slipping
  s.dispose();
});
