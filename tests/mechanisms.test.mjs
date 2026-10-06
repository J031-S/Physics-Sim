import test from "node:test";
import assert from "node:assert/strict";
import Matter from "../vendor/matter.js";
globalThis.Matter = Matter;
const { Sandbox, DT } = await import("../src/physics.js");
const near = (a, b, t = 1e-5) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b} ±${t}`);
const run = (s, t) => {
  for (let i = 0; i < Math.round(t / DT); i++) s.step();
};
const finite = (s) => {
  for (const id of s.objects.keys())
    for (const v of Object.values(s.state(id))) assert.ok(Number.isFinite(v));
};
test("horizontal spring angle lock supports gravity and gives the expected SHO period", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 3, y: 5 }),
    l = s.connect("spring", null, id, { x: 0, y: 5 }, s.state(id));
  s.updateLink(l, { k: 4, damping: 0, length: 2 });
  s.setSpringAngle(l, true);
  run(s, Math.PI);
  near(s.state(id).x, 3, 0.015);
  near(s.state(id).y, 5);
  near(s.state(id).vy, 0);
  s.beginGrab(id, s.state(id));
  s.moveGrab({ x: 4, y: 8 });
  near(s.state(id).y, 5);
  near(s.state(id).x, 4);
  s.endGrab(false);
  s.setSpringAngle(l, false);
  run(s, 0.2);
  assert.ok(s.state(id).y < 4.9);
  s.dispose();
});
test("two free spring endpoints retain a locked relative angle while falling", () => {
  const s = new Sandbox(),
    a = s.add("ball", { x: 0, y: 7 }),
    b = s.add("ball", { x: 3, y: 7 }),
    l = s.connect("spring", a, b, s.state(a), s.state(b));
  s.setSpringAngle(l, true);
  Matter.Body.setVelocity(s.objects.get(a).body, { x: 0, y: -2 });
  run(s, 0.4);
  near(s.state(a).y, s.state(b).y);
  near(s.state(a).vy, s.state(b).vy);
  s.dispose();
});
test("Ctrl pinned dragging snaps to 15 degree absolute angles without translation", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 5 });
  s.setLock(id, "position", true);
  s.beginGrab(id, { x: 0.3, y: 5 });
  s.moveGrab({ x: 0.3 * Math.cos(0.4), y: 5 + 0.3 * Math.sin(0.4) }, true);
  near(s.state(id).angle, Math.PI / 6);
  near(s.state(id).x, 0);
  near(s.state(id).y, 5);
  s.endGrab();
  near(s.state(id).omega, 0);
  s.dispose();
});
test("in-place resize snaps diameter, preserves mass and separate locks", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 5 }),
    o = s.objects.get(id),
    inertia = o.freeInertia;
  s.updateConstants(id, { mass: 2 });
  s.setLock(id, "position", true);
  s.setLock(id, "rotation", true);
  s.beginResize(id, { x: 0.4, y: 5 });
  s.moveResize({ x: 0.8, y: 5 }, true);
  run(s, 0.2);
  near(o.radius, 0.75);
  near(o.body.mass, 2);
  near(o.body.inverseMass, 0);
  near(o.body.inverseInertia, 0);
  near(s.state(id).x, 0);
  near(s.state(id).y, 5);
  assert.ok(o.freeInertia > inertia);
  s.endResize();
  s.setLock(id, "rotation", false);
  near(o.body.inertia, o.freeInertia);
  s.dispose();
});
test("rotated block resizes along its local axes and stays still while running", () => {
  const s = new Sandbox(),
    id = s.add("block", { x: 0, y: 5 });
  Matter.Body.setAngle(s.objects.get(id).body, -Math.PI / 2);
  s.beginResize(id, { x: -0.45, y: 5.45 });
  s.moveResize({ x: -0.7, y: 5.95 }, true);
  run(s, 0.2);
  near(s.objects.get(id).width, 2);
  near(s.objects.get(id).height, 1.5);
  near(s.state(id).y, 5);
  near(s.state(id).angle, Math.PI / 2);
  s.endResize();
  s.dispose();
});
function belt() {
  const s = new Sandbox(),
    a = s.add("ball", { x: -2, y: 4 }),
    b = s.add("ball", { x: 2, y: 4 });
  s.resizeBody(b, 1.6);
  const l = s.mechanisms.createBelt(a, b);
  return { s, a, b, l };
}
test("open and crossed belts transmit angular momentum using wheel radii", () => {
  const { s, a, b, l } = belt();
  s.updateConstants(a, { angularDamping: 0 });
  s.updateConstants(b, { angularDamping: 0 });
  Matter.Body.setAngularVelocity(s.objects.get(a).body, -0.1);
  run(s, 0.2);
  near(s.state(a).omega * 0.4, s.state(b).omega * 0.8);
  assert.ok(s.state(b).omega > 0);
  near(s.state(a).x, -2);
  s.mechanisms.configureBelt(l, { crossed: true });
  Matter.Body.setAngularVelocity(s.objects.get(a).body, -0.1);
  run(s, 0.2);
  near(s.state(a).omega * 0.4, -s.state(b).omega * 0.8);
  assert.ok(s.state(b).omega < 0);
  finite(s);
  s.dispose();
});
test("belt phase follows manual wheel rotation while paused; rotation lock is respected", () => {
  const { s, a, b, l } = belt();
  s.beginGrab(a, { x: -1.7, y: 4 });
  s.moveGrab({ x: -2, y: 4.3 });
  near(s.state(a).angle, Math.PI / 2);
  near(s.state(b).angle, Math.PI / 4);
  s.endGrab(false);
  s.setLock(b, "rotation", true);
  s.beginGrab(a, { x: -2, y: 4.3 });
  s.moveGrab({ x: -2.3, y: 4 });
  near(s.state(a).angle, Math.PI / 2);
  s.endGrab(false);
  assert.throws(() => s.setLock(a, "position", false));
  s.remove(l);
  s.setLock(a, "position", false);
  s.dispose();
});
test("driven conveyor supports and carries a block along its upper span", () => {
  const { s, l } = belt();
  s.mechanisms.configureBelt(l, { motor: true, speed: 1 });
  const block = s.add("block", { x: -0.5, y: 5.3 });
  s.updateConstants(block, { friction: 0.8, restitution: 0 });
  s.setLock(block, "rotation", true);
  run(s, 1.5);
  const p = s.state(block);
  assert.ok(p.x > 0.1, JSON.stringify(p));
  assert.ok(p.y > 4.7, JSON.stringify(p));
  finite(s);
  s.dispose();
});
function pulley() {
  const s = new Sandbox(),
    a = s.add("block", { x: -1.5, y: 5 }),
    b = s.add("block", { x: 1.5, y: 5 }),
    wheel = s.add("ball", { x: 0, y: 8 });
  s.resizeBody(wheel, 3);
  s.updateConstants(wheel, { angularDamping: 0 });
  const l = s.mechanisms.createPulley(a, wheel, b);
  return { s, a, b, wheel, l };
}
test("pulley acceleration agrees with Atwood including wheel rotational inertia", () => {
  const { s, a, b, wheel } = pulley();
  s.updateConstants(a, { mass: 2 });
  const I = s.objects.get(wheel).freeInertia / 10000,
    r = 1.5,
    acc = 9.81 / (3 + I / (r * r));
  run(s, 0.5);
  near(s.state(a).vy, -acc * 0.5, 0.01);
  near(s.state(b).vy, acc * 0.5, 0.01);
  near(s.state(a).y + s.state(b).y, 10);
  near(s.state(wheel).omega * r, s.state(b).vy, 0.01);
  finite(s);
  s.dispose();
});
test("pulley drag moves the other load, preserves rope, and stops at travel limits", () => {
  const { s, a, b, wheel, l } = pulley();
  s.beginGrab(a, s.state(a));
  s.moveGrab({ x: -3, y: 4 });
  near(s.state(a).x, -1.5);
  near(s.state(b).y, 6);
  s.endGrab(false);
  s.beginGrab(a, s.state(a));
  s.moveGrab({ x: -3, y: -10 });
  s.endGrab(false);
  run(s, 2);
  finite(s);
  assert.ok(s.state(a).y > 0.4);
  assert.ok(s.state(b).y < 8);
  s.remove(wheel);
  assert.equal(s.links.has(l), false);
  s.dispose();
});
test("resizing and deletion update belt geometry without leaking collider bodies", () => {
  const { s, a, b, l } = belt();
  assert.equal(s.engine.world.bodies.length, 5);
  s.resizeBody(a, 1.5);
  const g = s.mechanisms.beltGeometry(s.links.get(l));
  assert.ok(g.path.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
  assert.throws(() => s.resizeBody(a, 8));
  s.remove(a);
  assert.equal(s.links.size, 0);
  assert.equal(s.engine.world.bodies.length, 2);
  finite(s);
  s.dispose();
});
test("dragging an unrelated object does not stop a running pulley", () => {
  const { s, a, b } = pulley();
  s.updateConstants(a, { mass: 2 });
  run(s, 0.2);
  const before = s.state(b).vy;
  const other = s.add("ball", { x: 5, y: 5 });
  s.beginGrab(other, s.state(other));
  run(s, 0.1);
  assert.ok(s.state(b).vy > before);
  s.endGrab(false);
  s.dispose();
});
test("passive conveyor contact draws angular momentum from its wheels", () => {
  const { s, a, b } = belt();
  for (const id of [a, b]) s.updateConstants(id, { angularDamping: 0 });
  Matter.Body.setAngularVelocity(s.objects.get(a).body, 0.2);
  Matter.Body.setAngularVelocity(s.objects.get(b).body, 0.1);
  s.mechanisms.solveBelts();
  const before = Math.abs(s.state(a).omega),
    block = s.add("block", { x: 0, y: 5.1 });
  s.updateConstants(block, { friction: 0.8, restitution: 0 });
  s.setLock(block, "rotation", true);
  run(s, 1);
  assert.ok(Math.abs(s.state(a).omega) < before);
  assert.ok(s.state(block).vx > 0);
  s.dispose();
});
