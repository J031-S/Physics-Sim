import test from "node:test";
import assert from "node:assert/strict";
import Matter from "../vendor/matter.js";
globalThis.Matter = Matter;
const { Sandbox, DT } = await import("../src/physics.js");
const near = (a, b, t = 1e-6) =>
  assert.ok(Math.abs(a - b) < t, `${a} expected ${b}`);
const run = (s, t) => {
  for (let i = 0; i < Math.round(t / DT); i++) s.step();
};
test("wedge is a convex triangular ramp with grounded base and independent locks", () => {
  const s = new Sandbox(),
    id = s.add("wedge", { x: 0, y: 0 }),
    o = s.objects.get(id);
  assert.equal(o.body.vertices.length, 3);
  near(Math.max(...o.body.vertices.map((v) => v.y)), 0);
  assert.equal(o.lockPosition, true);
  assert.equal(o.lockRotation, true);
  near(s.state(id).y, 0.5);
  assert.equal(s.hit({ x: -1.8, y: 1 }), null);
  assert.equal(s.hit({ x: 0.8, y: 0.2 }), id);
  s.setLock(id, "position", false);
  assert.equal(o.lockRotation, true);
  near(o.body.inverseMass, 1);
  s.dispose();
});
test("wedge dimensions and slope can change without shifting the centroid or losing inertia", () => {
  const s = new Sandbox(),
    id = s.add("wedge", { x: 0, y: 5 }),
    o = s.objects.get(id);
  s.resizeBody(id, 6, 3);
  near(s.state(id).x, 0);
  near(s.state(id).y, 5);
  near(o.width, 6);
  near(o.height, 3);
  near(Math.max(...o.body.vertices.map((v) => v.y)), -400);
  assert.ok(Number.isFinite(o.freeInertia) && o.freeInertia > 0);
  assert.equal(o.body.inverseInertia, 0);
  s.setLock(id, "rotation", false);
  assert.ok(o.body.inverseInertia > 0);
  s.dispose();
});
test("asymmetric wedge resize clearance uses actual vertices at any angle", () => {
  const s = new Sandbox(),
    id = s.add("wedge", { x: 0, y: 1.01 }),
    o = s.objects.get(id);
  s.resizeBody(id, 6, 3); // base is 1 m below centroid, not the rectangle's 1.5 m.
  assert.throws(() => s.resizeBody(id, 6, 4));
  Matter.Body.setAngle(o.body, Math.PI);
  o.angleAnchor = o.body.angle;
  assert.throws(() => s.resizeBody(id, 6, 3));
  s.dispose();
});
function slope(friction) {
  const s = new Sandbox(),
    r = s.add("wedge", { x: 0, y: 3 });
  s.resizeBody(r, 8, 4);
  s.updateConstants(r, { friction, restitution: 0 });
  const theta = Math.atan(0.5),
    id = s.add("block", {
      x: -1 - 0.45 * Math.sin(theta),
      y: 23 / 6 + 0.45 * Math.cos(theta) + 0.001,
    });
  Matter.Body.setAngle(s.objects.get(id).body, -theta);
  s.setLock(id, "rotation", true);
  s.updateConstants(id, { friction, restitution: 0 });
  return { s, r, id };
}
test("frictionless block accelerates down the wedge by g sin(theta)", () => {
  const { s, r, id } = slope(0);
  run(s, 0.5);
  const state = s.state(id),
    theta = Math.atan(0.5);
  near(state.vx, -9.81 * Math.sin(theta) * Math.cos(theta) * 0.5, 0.06);
  near(state.vy, -9.81 * Math.sin(theta) ** 2 * 0.5, 0.06);
  near(s.state(r).x, 0);
  near(s.state(r).y, 3);
  s.dispose();
});
test("live wedge friction changes sliding while the ramp stays pinned", () => {
  const { s, r, id } = slope(1);
  const x = s.state(id).x;
  run(s, 0.5);
  assert.ok(Math.abs(s.state(id).x - x) < 0.05);
  s.updateConstants(r, { friction: 0 });
  run(s, 0.5);
  assert.ok(s.state(id).x < x - 0.3);
  near(s.state(r).y, 3);
  s.dispose();
});
