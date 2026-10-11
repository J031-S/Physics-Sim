import test from "node:test";
import assert from "node:assert/strict";
import Matter from "../vendor/matter.js";
globalThis.Matter = Matter;
const { Sandbox, DT } = await import("../src/physics.js");
const near = (a, b, t = 0.001) =>
  assert.ok(Math.abs(a - b) < t, `${a} expected ${b} ±${t}`);
const run = (s, t, each) => {
  for (let i = 0; i < Math.round(t / DT); i++) {
    s.step();
    each?.();
  }
};
const g = 9.81;
// A bob on a rod of length L hung from (0, 8), released from `degrees`.
function pendulum(degrees, L = 2) {
  const s = new Sandbox(),
    a = (degrees * Math.PI) / 180,
    id = s.add("ball", { x: L * Math.sin(a), y: 8 - L * Math.cos(a) });
  s.updateConstants(id, { angularDamping: 0 });
  s.connect("rod", null, id, { x: 0, y: 8 }, null);
  return { s, id, angle: () => Math.atan2(s.state(id).x, 8 - s.state(id).y) };
}
// Exact period of a pendulum: 2π√(L/g) / AGM(1, cos(θ₀/2)).
function period(degrees, L = 2) {
  let a = 1,
    b = Math.cos((degrees * Math.PI) / 360);
  for (let i = 0; i < 30; i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
  return (2 * Math.PI * Math.sqrt(L / g)) / a;
}
test("a pendulum keeps its amplitude and energy at any swing angle", () => {
  for (const degrees of [10, 45, 90, 150]) {
    const { s, angle } = pendulum(degrees),
      start = s.energy().total;
    let widest = 0;
    run(s, 60);
    run(s, period(degrees) * 1.2, () => {
      widest = Math.max(widest, Math.abs(angle()));
    });
    near((widest * 180) / Math.PI, degrees, 0.3); // still swinging as wide
    near(s.energy().total, start, Math.abs(start) * 2e-3);
    s.dispose();
  }
});
test("pendulum period matches the exact large-angle result", () => {
  for (const degrees of [5, 30, 90, 150]) {
    const { s, id } = pendulum(degrees),
      crossings = [];
    let previous = s.state(id).x;
    run(s, 40, () => {
      const x = s.state(id).x;
      if (previous > 0 && x <= 0) crossings.push(s.time);
      previous = x;
    });
    near(
      (crossings.at(-1) - crossings[0]) / (crossings.length - 1),
      period(degrees),
      0.005,
    );
    s.dispose();
  }
});
test("a rod holds its length exactly and circular motion keeps its speed", () => {
  const s = new Sandbox();
  s.updateSettings({ gravity: 0 });
  const id = s.add("ball", { x: 2, y: 30 });
  s.updateConstants(id, { angularDamping: 0 });
  s.connect("rod", null, id, { x: 0, y: 30 }, null);
  s.setVelocity(id, { vy: 4 });
  let worst = 0;
  run(s, 60, () => {
    const p = s.state(id);
    worst = Math.max(worst, Math.abs(Math.hypot(p.x, p.y - 30) - 2));
  });
  near(worst, 0, 1e-6);
  const p = s.state(id);
  near(Math.hypot(p.vx, p.vy), 4, 0.01);
  // Tension supplies the centripetal force m v² / r towards the pivot.
  const f = s.netForce(id);
  near(Math.hypot(f.x, f.y), 16 / 2, 0.05);
  s.dispose();
});
test("a kicked pendulum goes over the top only above √(4gL)", () => {
  // A rigid rod (not a string) reaches the top when ½v² ≥ 2gL.
  for (const [speed, over] of [
    [8.6, false],
    [9.1, true],
  ]) {
    const s = new Sandbox(),
      id = s.add("ball", { x: 0, y: 6 });
    s.updateConstants(id, { angularDamping: 0 });
    s.connect("rod", null, id, { x: 0, y: 8 }, null);
    s.setVelocity(id, { vx: speed });
    let turned = 0,
      previous = 0;
    run(s, 12, () => {
      const p = s.state(id),
        a = Math.atan2(p.x, 8 - p.y);
      let d = a - previous;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      turned += d;
      previous = a;
    });
    assert.equal(Math.abs(turned) > 2 * Math.PI, over, `v = ${speed}`);
    s.dispose();
  }
});
test("two bodies joined by a rod spin freely about their centre of mass", () => {
  const s = new Sandbox();
  s.updateSettings({ gravity: 0 });
  const a = s.add("ball", { x: -1, y: 40 }),
    b = s.add("ball", { x: 1, y: 40 });
  s.updateConstants(a, { angularDamping: 0 });
  s.updateConstants(b, { mass: 3, angularDamping: 0 });
  s.connect("rod", a, b);
  s.setVelocity(a, { vx: 1, vy: 3 });
  s.setVelocity(b, { vx: 1, vy: -1 });
  const before = s.energy().kinetic;
  run(s, 30);
  const p = s.state(a),
    q = s.state(b);
  near(Math.hypot(p.x - q.x, p.y - q.y), 2, 1e-6);
  near(s.energy().kinetic, before, before * 2e-3);
  // Linear momentum: (1)(1, 3) + (3)(1, −1) = (4, 0).
  near(p.vx + 3 * q.vx, 4, 1e-6);
  near(p.vy + 3 * q.vy, 0, 1e-6);
  // The centre of mass moves in a straight line at 1 m/s.
  near((p.x + 3 * q.x) / 4, 0.5 + 30, 1e-3);
  s.dispose();
});
test("a double pendulum conserves energy", () => {
  const s = new Sandbox(),
    a = s.add("ball", { x: 1.5, y: 8 }),
    b = s.add("ball", { x: 3, y: 8 });
  for (const id of [a, b]) {
    s.resizeBody(id, 0.3);
    s.updateConstants(id, { angularDamping: 0 });
  }
  s.connect("rod", null, a, { x: 0, y: 8 }, null);
  s.connect("rod", a, b);
  const start = s.energy().total;
  run(s, 30);
  near(s.energy().total, start, Math.abs(start) * 5e-3);
  near(Math.hypot(s.state(a).x, s.state(a).y - 8), 1.5, 1e-5);
  near(
    Math.hypot(s.state(b).x - s.state(a).x, s.state(b).y - s.state(a).y),
    1.5,
    1e-5,
  );
  s.dispose();
});
test("a rod still hangs a body at rest and holds a body resting on the floor", () => {
  const s = new Sandbox(),
    hanging = s.add("block", { x: 0, y: 4 }),
    grounded = s.add("ball", { x: 5, y: 0.4 });
  s.connect("rod", null, hanging, { x: 0, y: 7 }, null);
  s.connect("rod", null, grounded, { x: 5, y: 3 }, null);
  run(s, 5);
  near(s.state(hanging).y, 4, 1e-6);
  near(Math.hypot(s.state(hanging).vx, s.state(hanging).vy), 0, 1e-6);
  near(s.state(grounded).y, 0.4, 2e-3);
  near(s.state(grounded).x, 5, 2e-3);
  s.dispose();
});
