import test from "node:test";
import assert from "node:assert/strict";
import Matter from "../vendor/matter.js";
globalThis.Matter = Matter;
const { Sandbox, DT } = await import("../src/physics.js");
const near = (a, b, t = 1e-5) =>
  assert.ok(Math.abs(a - b) < t, `${a} expected ${b} ±${t}`);
const run = (s, t) => {
  for (let i = 0; i < Math.round(t / DT); i++) s.step();
};
function drag(s, id, p, mode, paused, alt = false, snap = false) {
  s.beginGrab(id, s.state(id), 0, { mode, paused });
  s.moveGrab(p, snap, alt, 50, { mode, paused });
  s.endGrab(false);
}
test("Shift moves position-locked objects only while paused and updates their pin", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 5 });
  s.setLock(id, "position", true);
  drag(s, id, { x: 2, y: 6 }, "move", false);
  near(s.state(id).x, 0);
  near(s.state(id).y, 5);
  near(s.state(id).angle, 0);
  drag(s, id, { x: 2, y: 6 }, "move", true);
  run(s, 0.2);
  near(s.state(id).x, 2);
  near(s.state(id).y, 6);
  assert.equal(s.objects.get(id).lockPosition, true);
  s.dispose();
});
test("Ctrl rotates around a free centre; rotation locks permit manual edits only paused", () => {
  const s = new Sandbox(),
    id = s.add("block", { x: 0, y: 5 });
  s.setLock(id, "rotation", true);
  for (const paused of [false, true]) {
    s.beginGrab(id, { x: 0.3, y: 5 }, 0, { mode: "rotate", paused });
    s.moveGrab({ x: 0, y: 5.3 }, false, false, 50, { mode: "rotate", paused });
    s.endGrab(false);
    near(s.state(id).angle, paused ? Math.PI / 2 : 0);
    near(s.state(id).x, 0);
    near(s.state(id).y, 5);
  }
  run(s, 0.2);
  near(s.state(id).angle, Math.PI / 2);
  s.dispose();
});
test("Shift follows a rod arc; Shift+Alt changes length and angle with optional length snap", () => {
  const s = new Sandbox(),
    id = s.add("block", { x: 0, y: 3 }),
    l = s.connect("rod", null, id, { x: 0, y: 6 }, s.state(id));
  drag(s, id, { x: 3, y: 3 }, "move", false);
  near(Math.hypot(s.state(id).x, s.state(id).y - 6), 3);
  drag(s, id, { x: 3, y: 2 }, "move", false, true);
  near(s.links.get(l).length, 5);
  near(s.state(id).x, 3);
  near(s.state(id).y, 2);
  drag(s, id, { x: 3, y: 1.8 }, "move", false, true, true);
  near(s.links.get(l).length / 0.5, Math.round(s.links.get(l).length / 0.5));
  s.dispose();
});
test("wall setting adds/removes four static colliders and tracks resized viewport", () => {
  const s = new Sandbox();
  s.setViewport({ minX: -4, maxX: 4, minY: -1, maxY: 8 });
  const base = s.engine.world.bodies.length;
  s.updateSettings({ walls: true });
  assert.equal(s.walls.length, 4);
  assert.equal(s.engine.world.bodies.length, base + 4);
  const id = s.add("ball", { x: 0, y: 4 });
  s.updateSettings({ gravity: 0 });
  Matter.Body.setVelocity(s.objects.get(id).body, { x: (20 * 100) / 60, y: 0 });
  run(s, 1);
  assert.ok(s.state(id).x < 3.65 && s.state(id).x > -3.65);
  s.setViewport({ minX: -5, maxX: 5, minY: -1, maxY: 9 });
  assert.equal(s.walls.length, 4);
  s.updateSettings({ walls: false });
  assert.equal(s.walls.length, 0);
  assert.equal(s.engine.world.bodies.length, base + 1);
  s.dispose();
});
test("running selection cannot bypass position locks; paused layout edits can", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 5 });
  s.setLock(id, "position", true);
  s.beginGroup([id], { x: 0, y: 5 }, { paused: false });
  s.moveGroup({ x: 2, y: 6 });
  near(s.state(id).x, 0);
  s.endGroup();
  s.beginGroup([id], { x: 0, y: 5 }, { paused: true });
  s.moveGroup({ x: 2, y: 6 });
  s.endGroup();
  run(s, 0.1);
  near(s.state(id).x, 2);
  s.dispose();
});
test("coupled belt, two pulley cables and a spring solve together during drag and release", () => {
  const s = new Sandbox();
  s.updateSettings({ gravity: 0 });
  const small = s.add("ball", { x: 0, y: 6 }),
    big = s.add("ball", { x: 3, y: 7 });
  s.resizeBody(big, 1.6);
  const a = s.add("block", { x: -2, y: 7.8 }),
    b = s.add("block", { x: 3.8, y: 3 }),
    c = s.add("block", { x: -0.4, y: 3 }),
    d = s.add("block", { x: 0.4, y: 4.5 });
  const spring = s.connect("spring", null, a, { x: -5, y: 7.8 }, s.state(a));
  s.setSpringAngle(spring, true);
  s.mechanisms.createBelt(small, big);
  s.mechanisms.createPulley(a, big, b);
  s.mechanisms.createPulley(c, small, d);
  s.beginGrab(b, s.state(b), 0, { mode: "move", paused: false });
  for (let i = 0; i < 60; i++) {
    s.moveGrab(
      { x: 3.8 + 0.5 * Math.sin(i / 20), y: 3 + 0.5 * Math.sin(i / 15) },
      false,
      false,
      i * 16,
      { mode: "move", paused: false },
    );
    s.step();
    assert.ok(
      s.mechanisms.cables.error() < 0.003,
      "network error " + s.mechanisms.cables.error(),
    );
  }
  s.endGrab(false);
  run(s, 2);
  assert.ok(
    s.mechanisms.cables.error() < 0.003,
    "released network error " + s.mechanisms.cables.error(),
  );
  for (const id of s.objects.keys())
    for (const v of Object.values(s.state(id))) assert.ok(Number.isFinite(v));
  s.dispose();
});
test("blocked manual movement does not freeze a pinned ball’s free spin", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 5 });
  s.setLock(id, "position", true);
  Matter.Body.setAngularVelocity(s.objects.get(id).body, -0.05);
  s.beginGrab(id, s.state(id), 0, { mode: "move", paused: false });
  s.moveGrab({ x: 2, y: 5 }, false, false, 50, { mode: "move", paused: false });
  run(s, 0.2);
  assert.ok(s.state(id).angle > 0.5);
  near(s.state(id).x, 0);
  s.endGrab(false);
  s.dispose();
});
test("Ctrl centre-grab supports manual rotation and 15 degree snapping", () => {
  const s = new Sandbox(),
    id = s.add("block", { x: 0, y: 5 });
  s.beginGrab(id, s.state(id), 0, { mode: "rotate", paused: true });
  s.moveGrab({ x: 0.2, y: 5 }, true, false, 50, {
    mode: "rotate",
    paused: true,
  });
  near(s.state(id).angle, -Math.PI / 6);
  near(s.state(id).x, 0);
  s.endGrab(false);
  s.dispose();
});
test("guided spring remains restoring when compressed through its anchor", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 1, y: 5 }),
    l = s.connect("spring", null, id, { x: 0, y: 5 }, s.state(id));
  s.setSpringAngle(l, true);
  s.updateSettings({ gravity: 0 });
  drag(s, id, { x: -0.5, y: 5 }, "move", true);
  s.step();
  assert.ok(s.state(id).vx > 0);
  s.dispose();
});
test("collapsed free spring uses its last direction instead of an undefined force", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 1, y: 5 });
  s.connect("spring", null, id, { x: 0, y: 5 }, s.state(id));
  s.updateSettings({ gravity: 0 });
  drag(s, id, { x: 0, y: 5 }, "move", true);
  s.step();
  assert.ok(s.state(id).vx > 0);
  assert.ok(Number.isFinite(s.state(id).vx));
  s.dispose();
});
