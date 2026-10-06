import test from "node:test";
import assert from "node:assert/strict";
import Matter from "../vendor/matter.js";
globalThis.Matter = Matter;
const { Sandbox, DT, snap } = await import("../src/physics.js");
const close = (a, b, t = 0.001) =>
  assert.ok(Math.abs(a - b) < t, `${a} expected ${b} ±${t}`);
const run = (s, t) => {
  for (let i = 0; i < Math.round(t / DT); i++) s.step();
};
const finite = (s) => {
  for (const id of s.objects.keys())
    for (const v of Object.values(s.state(id)))
      assert.ok(Number.isFinite(v), id);
};
test("only balls and blocks can be created; floor is static and not selectable", () => {
  const s = new Sandbox();
  assert.throws(() => s.add("ring", { x: 0, y: 3 }));
  assert.equal(s.floor.isStatic, true);
  assert.equal(s.hit({ x: 0, y: -0.2 }), null);
  s.dispose();
});
test("free-fall velocity agrees with g*t; shapes settle above the floor", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 10 });
  run(s, 1);
  close(s.state(id).vy, -9.81);
  run(s, 15);
  assert.ok(s.state(id).y > 0.35);
  finite(s);
  close(s.floor.position.y, 25);
  s.dispose();
});
test("mouse grabbing does not reset time; release preserves motion for throwing", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 5 });
  s.beginGrab(id, { x: 0, y: 5 });
  for (let i = 0; i < 60; i++) {
    s.moveGrab({ x: i * DT * 5, y: 5 });
    s.step();
  }
  const time = s.time,
    v = s.state(id).vx,
    x = s.state(id).x;
  assert.ok(v > 2);
  s.endGrab();
  close(s.state(id).vx, v);
  run(s, 0.2);
  assert.ok(s.time > time);
  assert.ok(s.state(id).x > x + 0.3);
  s.dispose();
});
test("off-centre mouse grab applies torque", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 5 });
  s.setLock(id, "position", true);
  s.beginGrab(id, { x: 0.35, y: 5 });
  s.moveGrab({ x: 0.35, y: 6 });
  run(s, 0.25);
  assert.ok(Math.abs(s.state(id).omega) > 0.1);
  close(s.state(id).x, 0);
  close(s.state(id).y, 5);
  s.dispose();
});
test("position lock preserves existing spin without freezing angle", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 5 });
  Matter.Body.setAngularVelocity(s.objects.get(id).body, -0.03);
  s.setLock(id, "position", true);
  const a = s.state(id).angle;
  run(s, 1);
  close(s.state(id).x, 0);
  close(s.state(id).y, 5);
  assert.ok(Math.abs(s.state(id).angle - a) > 1);
  finite(s);
  s.dispose();
});
test("rotation lock holds angle while translation and throwing continue", () => {
  const s = new Sandbox(),
    id = s.add("block", { x: 0, y: 8 });
  s.setLock(id, "rotation", true);
  s.beginGrab(id, { x: 0.4, y: 8 });
  s.moveGrab({ x: 2, y: 9 });
  run(s, 0.5);
  s.endGrab();
  assert.ok(s.state(id).x > 0.4);
  close(s.state(id).angle, 0);
  close(s.state(id).omega, 0);
  run(s, 0.5);
  close(s.state(id).angle, 0);
  finite(s);
  s.dispose();
});
test("independent locks survive mass changes and unlock correctly", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 5 });
  s.setLock(id, "position", true);
  s.setLock(id, "rotation", true);
  s.updateConstants(id, { mass: 4 });
  run(s, 1);
  close(s.state(id).y, 5);
  close(s.state(id).omega, 0);
  assert.equal(s.objects.get(id).body.inverseMass, 0);
  assert.equal(s.objects.get(id).body.inverseInertia, 0);
  s.setLock(id, "position", false);
  run(s, 0.2);
  assert.ok(s.state(id).y < 5);
  close(s.state(id).omega, 0);
  s.setLock(id, "rotation", false);
  assert.ok(s.objects.get(id).body.inverseInertia > 0);
  finite(s);
  s.dispose();
});
test("pinned overlapping bodies and floor do not produce invalid impulses", () => {
  const s = new Sandbox(),
    a = s.add("ball", { x: 0, y: 0.4 }),
    b = s.add("block", { x: 0.2, y: 0.45 });
  for (const id of [a, b]) {
    s.setLock(id, "position", true);
    s.setLock(id, "rotation", true);
  }
  run(s, 3);
  finite(s);
  s.setLock(b, "position", false);
  run(s, 2);
  finite(s);
  s.dispose();
});
test("Ctrl placement snaps centre exactly and releases without throwing", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 5 });
  s.beginGrab(id, { x: 0.2, y: 5 });
  s.moveGrab({ x: 2.32, y: 4.17 }, true);
  run(s, 0.1);
  const target = { ...s.grab.snapCentre };
  s.endGrab();
  close(s.state(id).x, target.x);
  close(s.state(id).y, target.y);
  close(s.state(id).vx, 0);
  close(s.state(id).vy, 0);
  close(target.x / 0.5, Math.round(target.x / 0.5));
  assert.equal(snap(-0.7), -0.5);
  s.dispose();
});
test("Ctrl placement respects position lock and floor clearance", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 5 });
  s.setLock(id, "position", true);
  s.beginGrab(id, { x: 0, y: 5 });
  s.moveGrab({ x: 3, y: -2 }, true);
  s.endGrab();
  close(s.state(id).y, 5);
  s.setLock(id, "position", false);
  s.beginGrab(id, { x: 0, y: 5 });
  s.moveGrab({ x: 0, y: -2 }, true);
  s.endGrab();
  assert.ok(s.state(id).y >= 0.5);
  s.dispose();
});
test("rod keeps its length; pinning both ends is safe and unlocking reattaches it", () => {
  const s = new Sandbox(),
    a = s.add("ball", { x: 0, y: 6 }),
    b = s.add("ball", { x: 2, y: 6 }),
    id = s.connect("rod", a, b, s.state(a), s.state(b));
  s.setLock(a, "position", true);
  run(s, 2);
  close(
    Math.hypot(s.state(a).x - s.state(b).x, s.state(a).y - s.state(b).y),
    2,
    0.04,
  );
  s.setLock(b, "position", true);
  run(s, 1);
  finite(s);
  assert.equal(s.links.get(id).attached, false);
  s.setLock(b, "position", false);
  assert.equal(s.links.get(id).attached, true);
  run(s, 1);
  finite(s);
  s.dispose();
});
test("spring pulls its endpoints; deleting a body removes its connections", () => {
  const s = new Sandbox(),
    a = s.add("ball", { x: 0, y: 5 }),
    b = s.add("ball", { x: 3, y: 5 }),
    id = s.connect("spring", a, b, s.state(a), s.state(b));
  s.updateLink(id, { length: 1 });
  run(s, 0.1);
  assert.ok(s.state(a).vx > 0 && s.state(b).vx < 0);
  s.remove(a);
  assert.equal(s.links.size, 0);
  assert.equal(s.objects.size, 1);
  s.dispose();
});
test("constants apply live without disturbing state; invalid and nonconstant edits rejected", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 5 });
  run(s, 0.1);
  const before = s.state(id),
    t = s.time;
  s.updateConstants(id, { mass: 2, friction: 0.2, restitution: 0.9 });
  close(s.time, t);
  for (const key of Object.keys(before)) close(s.state(id)[key], before[key]);
  assert.throws(() => s.updateConstants(id, { mass: -1 }));
  assert.throws(() => s.updateConstants(id, { vx: 10 }));
  assert.throws(() => s.updateConstants(id, { charge: 1 }));
  close(s.objects.get(id).mass, 2);
  s.dispose();
});
