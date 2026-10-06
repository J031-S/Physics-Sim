import test from "node:test";
import assert from "node:assert/strict";
import Matter from "../vendor/matter.js";
globalThis.Matter = Matter;
const { Sandbox, DT } = await import("../src/physics.js");
const near = (a, b, t = 1e-4) =>
  assert.ok(Math.abs(a - b) < t, `${a} expected ${b} ±${t}`);
const run = (s, t) => {
  for (let i = 0; i < Math.round(t / DT); i++) s.step();
};
function apparatus(springFirst = true) {
  const s = new Sandbox(),
    a = s.add("block", { x: -3, y: 6 }),
    w = s.add("ball", { x: 0, y: 5.5 }),
    b = s.add("block", { x: 0.5, y: 3 });
  s.resizeBody(w, 1);
  s.updateConstants(w, { angularDamping: 0 });
  const spring = () => {
    const id = s.connect("spring", null, a, { x: -6, y: 6 }, s.state(a));
    s.setSpringAngle(id, true);
    s.updateLink(id, { damping: 0, k: 20 });
    return id;
  };
  let k = springFirst ? spring() : null;
  const id = s.mechanisms.createPulley(a, w, b);
  if (!springFirst) k = spring();
  return { s, a, w, b, id, k };
}
test("spring Atwood setup accepts a horizontal endpoint and preserves all creation positions", () => {
  for (const before of [true, false]) {
    const { s, a, w, b, id } = apparatus(before);
    near(s.state(a).x, -3);
    near(s.state(a).y, 6);
    near(s.state(b).x, 0.5);
    near(s.state(b).y, 3);
    const g = s.mechanisms.cables.geometry(s.links.get(id));
    near(g.A.point.x, 0);
    near(g.A.point.y, 6);
    near(g.B.point.x, 0.5);
    near(g.B.point.y, 5.5);
    near(g.wrap, Math.PI / 2);
    s.dispose();
  }
});
test("spring Atwood acceleration and oscillation agree with its effective inertia", () => {
  const { s, a, w, b, id } = apparatus();
  const I = s.objects.get(w).freeInertia / 10000,
    r = 0.5,
    m = 2 + I / (r * r),
    omega = Math.sqrt(20 / m);
  run(s, 0.5);
  near(s.state(a).x, -3 + (9.81 / 20) * (1 - Math.cos(omega * 0.5)), 0.012);
  near(s.state(a).y, 6);
  near(s.state(b).vy, (-9.81 / 20) * omega * Math.sin(omega * 0.5), 0.025);
  near(
    s.mechanisms.cables.geometry(s.links.get(id)).length,
    s.links.get(id).length,
    0.002,
  );
  run(s, (2 * Math.PI) / omega - 0.5);
  near(s.state(a).x, -3, 0.025);
  near(s.state(a).y, 6);
  s.dispose();
});
test("angled drag retains cable length while a spring endpoint stays on its guide", () => {
  const { s, a, b, id } = apparatus();
  s.beginGrab(b, s.state(b));
  s.moveGrab({ x: 2, y: 3 });
  near(s.state(b).x, 2, 0.002);
  near(s.state(a).y, 6);
  assert.ok(s.state(a).x > -3);
  near(
    s.mechanisms.cables.geometry(s.links.get(id)).length,
    s.links.get(id).length,
    0.002,
  );
  s.endGrab(false);
  run(s, 0.5);
  near(s.state(a).y, 6);
  s.dispose();
});
test("pulley axle can be unlocked and moved; cable adjusts connected endpoints", () => {
  const { s, w, id } = apparatus();
  s.setLock(w, "position", false);
  s.beginGrab(w, s.state(w));
  s.moveGrab({ x: 0.5, y: 5.2 });
  near(s.state(w).x, 0.5, 0.002);
  near(s.state(w).y, 5.2, 0.002);
  assert.ok(s.mechanisms.cables.error() < 0.002);
  s.endGrab(false);
  run(s, 0.1);
  assert.ok(s.state(w).y < 5.2);
  s.dispose();
});
test("Alt dragging refits cable length explicitly, regular dragging does not", () => {
  const { s, b, id } = apparatus(),
    l = s.links.get(id),
    length = l.length;
  s.beginGrab(b, s.state(b));
  s.moveGrab({ x: 2, y: 2 }, false, true);
  assert.ok(l.length > length + 0.5);
  near(s.state(b).x, 2);
  near(s.state(b).y, 2);
  s.endGrab(false);
  run(s, 0.3);
  near(s.mechanisms.cables.geometry(l).length, l.length, 0.003);
  s.dispose();
});
test("reverse wrap updates the route without moving endpoints", () => {
  const { s, a, b, id } = apparatus(),
    beforeA = s.state(a),
    beforeB = s.state(b);
  s.mechanisms.cables.reverse(id, true);
  near(s.state(a).x, beforeA.x);
  near(s.state(b).y, beforeB.y);
  assert.ok(s.mechanisms.cables.error() < 1e-5);
  assert.ok(
    s.mechanisms.cables
      .path(s.links.get(id))
      .every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
  );
  s.dispose();
});
test("pinned endpoints prevent impossible wheel drags instead of stretching the cable", () => {
  const { s, a, b, w, id } = apparatus();
  s.setLock(a, "position", true);
  s.setLock(b, "position", true);
  s.setLock(w, "position", false);
  s.beginGrab(w, s.state(w));
  s.moveGrab({ x: 3, y: 7 });
  assert.ok(s.mechanisms.cables.error() < 0.003);
  near(s.state(a).x, -3);
  near(s.state(b).y, 3);
  s.endGrab(false);
  s.dispose();
});
test("wheel resizing works beside angled connected loads and keeps the new route", () => {
  const { s, w, id } = apparatus();
  s.resizeBody(w, 1.2);
  const l = s.links.get(id);
  assert.ok(s.mechanisms.cables.error() < 1e-5);
  run(s, 0.3);
  near(s.mechanisms.cables.geometry(l).length, l.length, 0.003);
  s.dispose();
});
test("a pulley endpoint can also carry a rod without stretching it during paused dragging", () => {
  const { s, a, b } = apparatus();
  const rod = s.connect("rod", null, b, { x: 2.5, y: 3 }, s.state(b));
  s.beginGrab(a, s.state(a));
  s.moveGrab({ x: -2.8, y: 6 });
  const l = s.links.get(rod),
    p = s.state(b);
  near(Math.hypot(p.x - 2.5, p.y - 3), l.length, 0.002);
  assert.ok(s.mechanisms.cables.error() < 0.0021);
  s.endGrab(false);
  s.dispose();
});
