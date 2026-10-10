import test from "node:test";
import assert from "node:assert/strict";
import Matter from "../vendor/matter.js";
globalThis.Matter = Matter;
const { Sandbox, DT } = await import("../src/physics.js");
const near = (a, b, t = 1e-5) =>
  assert.ok(Math.abs(a - b) < t, `${a} expected ${b}`);
const run = (s, t) => {
  for (let i = 0; i < Math.round(t / DT); i++) s.step();
};
test("gravity changes apply live without resetting state or time, including reversal", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 10 });
  s.updateSettings({ gravity: 2 });
  run(s, 0.5);
  near(s.state(id).vy, -1);
  const state = s.state(id),
    time = s.time;
  s.updateSettings({ gravity: -2 });
  assert.deepEqual(s.state(id), state);
  near(s.time, time);
  run(s, 0.5);
  near(s.state(id).vy, 0);
  s.dispose();
});
test("air drag is exponential, combines with body damping and damps spin", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 10 }),
    b = s.objects.get(id).body;
  s.updateSettings({ gravity: 0, airResistance: 1 });
  s.updateConstants(id, { linearDamping: 1, angularDamping: 0 });
  Matter.Body.setVelocity(b, { x: (10 * 100) / 60, y: 0 });
  Matter.Body.setAngularVelocity(b, -2 / 60);
  run(s, 1);
  near(s.state(id).vx, 10 * Math.exp(-2));
  near(s.state(id).omega, 2 * Math.exp(-1));
  s.dispose();
});
test("invalid global settings are rejected atomically", () => {
  const s = new Sandbox();
  assert.throws(() => s.updateSettings({ gravity: 0, airResistance: -1 }));
  near(s.settings.gravity, 9.81);
  assert.throws(() => s.updateSettings({ gravity: Infinity }));
  assert.throws(() => s.updateSettings({ electricField: 2 }));
  s.dispose();
});
test("group placement translates pins, rod anchors and relative positions while running", () => {
  const s = new Sandbox(),
    a = s.add("ball", { x: 0, y: 5 }),
    b = s.add("block", { x: 2, y: 5 }),
    other = s.add("ball", { x: 8, y: 8 });
  s.setLock(a, "position", true);
  s.connect("rod", a, b, s.state(a), s.state(b));
  const spring = s.connect("spring", null, a, { x: -3, y: 5 }, s.state(a));
  assert.deepEqual(new Set(s.beginGroup([b], { x: 2, y: 5 })), new Set([a, b]));
  s.moveGroup({ x: 3.1, y: 6.1 }, true);
  run(s, 0.2);
  near(s.state(a).x, 1);
  near(s.state(a).y, 6);
  near(s.state(b).x, 3);
  near(s.state(b).y, 6);
  near(s.links.get(spring).aPoint.x, -2);
  near(s.links.get(spring).aPoint.y, 6);
  assert.ok(s.state(other).y < 8);
  s.endGroup();
  run(s, 0.1);
  near(s.state(a).x, 1);
  near(s.state(a).y, 6);
  s.dispose();
});
test("group translation moves world rod constraint points and prevents floor penetration", () => {
  const s = new Sandbox(),
    a = s.add("ball", { x: 0, y: 3 }),
    l = s.connect("rod", null, a, { x: 0, y: 5 }, s.state(a));
  s.beginGroup([a], { x: 0, y: 3 });
  s.moveGroup({ x: 2, y: -10 }, true);
  near(s.state(a).y, 0.5);
  near(s.links.get(l).aPoint.y, 2.5);
  s.endGroup();
  run(s, 0.2);
  assert.ok(s.state(a).y > 0.35);
  s.dispose();
});
test("group translation preserves pulley tangent geometry and cable length", () => {
  const s = new Sandbox(),
    a = s.add("ball", { x: -2, y: 3 }),
    w = s.add("ball", { x: 0, y: 5 }),
    b = s.add("ball", { x: 2, y: 3 }),
    l = s.mechanisms.createPulley(a, w, b);
  const length = s.links.get(l).length;
  s.beginGroup([a], { x: -2, y: 3 });
  s.moveGroup({ x: 0, y: 4 });
  run(s, 0.1);
  near(s.state(w).x, 2);
  near(s.state(w).y, 6);
  near(s.mechanisms.cables.geometry(s.links.get(l)).length, length);
  s.endGroup();
  run(s, 0.1);
  assert.ok(s.mechanisms.cables.error() < 0.003);
  s.dispose();
});
test("group translation carries conveyor collider geometry with pinned wheels", () => {
  const s = new Sandbox(),
    a = s.add("ball", { x: -2, y: 3 }),
    b = s.add("ball", { x: 2, y: 3 }),
    l = s.mechanisms.createBelt(a, b),
    old = s.links.get(l).surfaces[0].position.x;
  s.beginGroup([a], { x: -2, y: 3 });
  s.moveGroup({ x: -1, y: 4 });
  near(s.links.get(l).surfaces[0].position.x, old + 100);
  near(s.state(b).x, 3);
  s.endGroup();
  s.dispose();
});
