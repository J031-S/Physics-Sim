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
test("unsupported shapes are rejected; floor is static and not selectable", () => {
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
  s.beginGrab(id, { x: 0, y: 5 }, 0);
  for (let i = 0; i < 60; i++) {
    s.moveGrab({ x: i * DT * 5, y: 5 }, false, false, i * DT * 1000);
    s.step();
  }
  const time = s.time,
    v = 5,
    x = s.state(id).x;
  s.endGrab(true, 60 * DT * 1000);
  close(s.state(id).vx, v);
  run(s, 0.2);
  assert.ok(s.time > time);
  assert.ok(s.state(id).x > x + 0.3);
  s.dispose();
});
test("off-centre pinned grab rotates directly without moving the centre", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 5 });
  s.setLock(id, "position", true);
  s.beginGrab(id, { x: 0.35, y: 5 });
  s.moveGrab({ x: 0.35, y: 6 });
  run(s, 0.25);
  assert.ok(Math.abs(s.state(id).angle) > 0.1);
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
  // Both ends pinned: nothing for the rod to solve, and nothing moves.
  const pinned = s.state(b);
  run(s, 1);
  close(s.state(b).x, pinned.x, 1e-9);
  close(s.state(b).y, pinned.y, 1e-9);
  s.setLock(b, "position", false);
  run(s, 1);
  finite(s);
  // Unlocked again, the rod goes straight back to holding its length.
  close(
    Math.hypot(s.state(a).x - s.state(b).x, s.state(a).y - s.state(b).y),
    2,
    1e-6,
  );
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
  s.updateConstants(id, { charge: 1 });
  close(s.objects.get(id).charge, 1);
  assert.throws(() => s.updateConstants(id, { charge: NaN }));
  close(s.objects.get(id).mass, 2);
  s.dispose();
});

test("direct paused dragging preserves grab offset and needs no physics tick", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 5 });
  s.beginGrab(id, { x: 0.2, y: 5 }, 0);
  s.moveGrab({ x: 2.2, y: 4 }, false, false, 50);
  close(s.state(id).x, 2);
  close(s.state(id).y, 4);
  close(s.time, 0);
  s.endGrab(true, 200);
  close(s.state(id).vx, 0);
  s.dispose();
});
for (const running of [false, true])
  test(`rod dragging follows arc; Alt resizes persistently (${running ? "running" : "paused"})`, () => {
    const s = new Sandbox(),
      id = s.add("ball", { x: 0, y: 3 });
    const link = s.connect("rod", null, id, { x: 0, y: 6 }, s.state(id));
    s.beginGrab(id, { x: 0, y: 3 }, 0);
    s.moveGrab({ x: 4, y: 3 }, false, false, 50);
    if (running) run(s, 0.2);
    close(Math.hypot(s.state(id).x, s.state(id).y - 6), 3, 1e-6);
    s.moveGrab({ x: 4, y: 3 }, false, true, 100);
    close(s.links.get(link).length, 5);
    close(s.state(id).x, 4);
    close(s.state(id).y, 3);
    if (running) run(s, 0.2);
    s.endGrab(false);
    run(s, 0.4);
    close(Math.hypot(s.state(id).x, s.state(id).y - 6), 5, 0.01);
    finite(s);
    s.dispose();
  });
test("Ctrl does not override rod or floor constraints, including release", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 2 });
  s.connect("rod", null, id, { x: 0, y: 3 }, s.state(id));
  s.beginGrab(id, { x: 0, y: 2 });
  s.moveGrab({ x: 0.8, y: -3 }, true);
  s.endGrab();
  close(Math.hypot(s.state(id).x, s.state(id).y - 3), 1, 1e-6);
  assert.ok(s.state(id).y >= 0.4);
  s.dispose();
});
test("two rods preserve both lengths during direct manipulation", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 4 });
  s.connect("rod", null, id, { x: -1, y: 6 }, s.state(id));
  s.connect("rod", null, id, { x: 1, y: 6 }, s.state(id));
  s.beginGrab(id, { x: 0, y: 4 });
  s.moveGrab({ x: 3, y: 5 });
  close(s.state(id).x, 0);
  close(s.state(id).y, 4);
  run(s, 0.5);
  close(s.state(id).x, 0);
  close(s.state(id).y, 4);
  finite(s);
  s.dispose();
});
test("both locks defeat dragging and Alt resizing", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 4 });
  const l = s.connect("rod", null, id, { x: 0, y: 6 }, s.state(id));
  s.setLock(id, "position", true);
  s.setLock(id, "rotation", true);
  s.beginGrab(id, { x: 0.3, y: 4 });
  s.moveGrab({ x: 3, y: 5 }, false, true);
  run(s, 0.2);
  s.endGrab();
  close(s.state(id).x, 0);
  close(s.state(id).y, 4);
  close(s.state(id).angle, 0);
  close(s.links.get(l).length, 2);
  s.dispose();
});

test("with the floor off a body falls through y = 0 as in free fall; on again, it lands", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 2 });
  s.updateConstants(id, { linearDamping: 0, angularDamping: 0 });
  s.updateSettings({ floor: false });
  run(s, 1.5);
  // y = 2 − ½ g t² = 2 − 0.5 × 9.81 × 1.5² = −9.03625 m, well below the floor
  // (read at potentialPoint, the position that goes with the velocity).
  close(s.potentialPoint(id).y, 2 - 0.5 * 9.81 * 1.5 ** 2, 1e-6);
  close(s.state(id).vy, -9.81 * 1.5, 1e-6);
  // Placing and adding below the ground is allowed with no floor.
  const low = s.add("block", { x: 3, y: -5 });
  close(s.state(low).y, -5, 1e-9);
  // Files keep the setting.
  const copy = Sandbox.fromScene(s.exportScene());
  assert.equal(copy.settings.floor, false);
  copy.dispose();
  // Back on: a body put above it lands and rests on it.
  s.updateSettings({ floor: true });
  const again = s.add("ball", { x: 6, y: 1 });
  run(s, 2);
  close(s.state(again).y, 0.4, 0.01);
  assert.throws(() => s.updateSettings({ floor: "no" }));
  s.dispose();
});

// World vertices of a body, y up.
const corners = (s, id) =>
  s.objects
    .get(id)
    .body.vertices.map((v) => ({ x: v.x / 100, y: -v.y / 100 }));
const sameSet = (a, b, t = 1e-6) => {
  assert.equal(a.length, b.length);
  for (const p of a)
    assert.ok(
      b.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < t),
      `${JSON.stringify(p)} not in ${JSON.stringify(b)}`,
    );
};

test("reflecting a wedge gives its exact mirror image, either way", () => {
  for (const direction of ["horizontal", "vertical"]) {
    const s = new Sandbox(),
      id = s.add("wedge", { x: 0, y: 5 });
    s.setLock(id, "position", false);
    s.setLock(id, "rotation", false);
    s.resizeBody(id, 3, 1.2);
    s.setPose(id, { x: 1, y: 5, angle: 0.3 });
    const before = corners(s, id),
      c = s.state(id);
    s.reflect([id], direction);
    // Mirrored in the line through the wedge's own centroid.
    const mirror = (p) =>
      direction === "horizontal"
        ? { x: 2 * c.x - p.x, y: p.y }
        : { x: p.x, y: 2 * c.y - p.y };
    sameSet(corners(s, id), before.map(mirror));
    s.dispose();
  }
});

test("a reflected scene moves as the mirror image of the original", () => {
  const build = () => {
    const s = new Sandbox();
    s.updateSettings({ gravity: 0 });
    const a = s.add("ball", { x: -1, y: 5 }),
      b = s.add("block", { x: 2, y: 4 });
    for (const id of [a, b])
      s.updateConstants(id, { linearDamping: 0, angularDamping: 0 });
    s.setVelocity(a, { vx: 1, vy: 0.5, omega: 2 });
    s.setVelocity(b, { vx: -0.3, vy: 0.2, omega: -1 });
    const field = s.fields.add("magnetic", { x: 0, y: 5 });
    s.fields.update(field, { width: 10, height: 6, strength: 2 });
    s.updateConstants(a, { charge: 1 });
    return { s, a, b };
  };
  const one = build(),
    two = build();
  two.s.reflect([two.a, two.b, ...two.s.fields.regions.keys()], "horizontal");
  run(one.s, 1);
  run(two.s, 1);
  // The centre line is x = 0.5 (midway between −1 and 2).
  for (const key of ["a", "b"]) {
    const p = one.s.state(one[key]),
      q = two.s.state(two[key]);
    close(q.x, 1 - p.x, 1e-6);
    close(q.y, p.y, 1e-6);
    close(q.vx, -p.vx, 1e-6);
    close(q.vy, p.vy, 1e-6);
    close(q.omega, -p.omega, 1e-6);
  }
  one.s.dispose();
  two.s.dispose();
});

test("reflection refuses half an assembly or a body that would go into the floor", () => {
  const s = new Sandbox(),
    a = s.add("ball", { x: 0, y: 3 }),
    b = s.add("ball", { x: 2, y: 3 });
  s.connect("rod", a, b);
  const before = s.exportScene();
  assert.throws(() => s.reflect([a], "horizontal"), /whole assembly/);
  const w = s.add("wedge", { x: 6, y: 0 });
  assert.throws(() => s.reflect([w], "vertical"), /room above the floor/);
  assert.deepEqual(s.exportScene().bodies.slice(0, 2), before.bodies);
  s.dispose();
});

test("copy and paste: a part keeps its links and values, and is lifted clear of the floor", () => {
  const s = new Sandbox(),
    a = s.add("ball", { x: 0, y: 3 }),
    b = s.add("block", { x: 2, y: 3 }),
    other = s.add("ball", { x: 5, y: 3 });
  s.updateConstants(a, { mass: 3, charge: -2 });
  const rod = s.connect("rod", a, b),
    spring = s.connect("spring", b, other);
  s.updateLink(rod, { length: 2 });
  const part = s.exportPart([a, b]);
  // The rod between the two copied bodies comes too; the spring to a body
  // left behind does not.
  assert.equal(part.links.length, 1);
  const ids = s.addPart(part, { dx: 0, dy: -10 });
  assert.equal(ids.length, 3);
  const [na, nb, nrod] = ids;
  assert.equal(s.objects.get(na).mass, 3);
  assert.equal(s.objects.get(na).charge, -2);
  assert.equal(s.links.get(nrod).type, "rod");
  close(s.links.get(nrod).length, 2, 1e-9);
  // Asked for y = −7; lifted so the block's lowest point is on the floor.
  close(s.state(nb).y, 0.45, 1e-9);
  close(s.state(na).y, 0.45, 1e-9);
  assert.ok(s.links.has(spring));
  // A refused paste adds nothing.
  const count = s.objects.size;
  assert.throws(() =>
    s.addPart({ ...part, bodies: [{ ...part.bodies[0], mass: -1 }] }),
  );
  assert.equal(s.objects.size, count);
  s.dispose();
});
