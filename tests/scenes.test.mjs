import test from "node:test";
import assert from "node:assert/strict";
import Matter from "../vendor/matter.js";
globalThis.Matter = Matter;
const { Sandbox, DT } = await import("../src/physics.js");
const { presets } = await import("../src/presets.js");
const near = (a, b, t = 0.001) =>
  assert.ok(Math.abs(a - b) < t, `${a} expected ${b} ±${t}`);
const run = (s, t, each) => {
  for (let i = 0; i < Math.round(t / DT); i++) {
    s.step();
    each?.();
  }
};
const g = 9.81;
const load = (id) => {
  const s = new Sandbox();
  presets.find((p) => p.id === id).setup(s);
  return { s, ids: [...s.objects.keys()] };
};
const finite = (s) => {
  for (const id of s.objects.keys())
    for (const v of Object.values(s.state(id))) assert.ok(Number.isFinite(v));
};
test("floor material is editable, validated, and shared with the walls", () => {
  const s = new Sandbox();
  s.updateSettings({ walls: true });
  s.setViewport({ minX: -5, maxX: 5, minY: 0, maxY: 8 });
  assert.throws(() => s.updateFloor({ friction: 2 }));
  assert.throws(() => s.updateFloor({ colour: 1 }));
  assert.throws(() => s.updateFloor({ friction: 0.2, restitution: -1 }));
  assert.equal(s.floorMaterial.friction, 0.5); // rejected patches change nothing
  // Friction: the pair uses the lower coefficient, so the floor now limits it.
  s.updateFloor({ friction: 0.1 });
  const block = s.add("block", { x: -3, y: 0.45 });
  s.updateConstants(block, { friction: 1, restitution: 0 });
  s.setLock(block, "rotation", true);
  run(s, 0.2);
  s.setVelocity(block, { vx: 2 });
  run(s, 1);
  near(s.state(block).vx, 2 - 0.1 * g, 0.01);
  // Restitution: the pair uses the higher value, so a dead ball now bounces.
  s.updateFloor({ restitution: 0.8 });
  const ball = s.add("ball", { x: 3, y: 2.4 });
  s.updateConstants(ball, { restitution: 0 });
  let peak = 0,
    landed = false;
  run(s, 2, () => {
    const p = s.state(ball);
    if (p.y < 0.45) landed = true;
    if (landed) peak = Math.max(peak, p.y - 0.4);
  });
  near(peak, 0.64 * 2, 0.03);
  assert.equal(s.walls[0].restitution, 0.8);
  s.dispose();
});
test("a fully locked body ignores drags while running and is edited freely while paused", () => {
  const s = new Sandbox(),
    id = s.add("block", { x: 0, y: 3 });
  s.setLock(id, "position", true);
  s.setLock(id, "rotation", true);
  for (const mode of ["auto", "move", "rotate"]) {
    s.beginGrab(id, { x: 0.3, y: 3.2 }, 0, { mode, paused: false });
    s.moveGrab({ x: 2, y: 5 }, false, false, 50, { mode, paused: false });
    run(s, 0.1);
    s.endGrab(true, 60);
    near(s.state(id).x, 0);
    near(s.state(id).y, 3);
    near(s.state(id).angle, 0);
  }
  // Paused, a plain drag moves it (it does not rotate about its pin) ...
  s.beginGrab(id, { x: 0.3, y: 3.2 }, 0, { mode: "auto", paused: true });
  s.moveGrab({ x: 2.3, y: 5.2 }, false, false, 50, {
    mode: "auto",
    paused: true,
  });
  s.endGrab(false);
  near(s.state(id).x, 2);
  near(s.state(id).y, 5);
  near(s.state(id).angle, 0);
  // ... Ctrl rotates it ...
  s.beginGrab(id, { x: 2.3, y: 5 }, 0, { mode: "rotate", paused: true });
  s.moveGrab({ x: 2, y: 5.3 }, false, false, 50, {
    mode: "rotate",
    paused: true,
  });
  s.endGrab(false);
  near(s.state(id).angle, Math.PI / 2);
  // ... and both locks hold the new pose once the simulation resumes.
  run(s, 1);
  near(s.state(id).x, 2);
  near(s.state(id).y, 5);
  near(s.state(id).angle, Math.PI / 2);
  // A ball pinned in position only still spins about its pin when dragged.
  const wheel = s.add("ball", { x: -3, y: 3 });
  s.setLock(wheel, "position", true);
  s.beginGrab(wheel, { x: -2.7, y: 3 }, 0, { mode: "auto", paused: true });
  s.moveGrab({ x: -3, y: 3.3 }, false, false, 50, {
    mode: "auto",
    paused: true,
  });
  s.endGrab(false);
  near(s.state(wheel).x, -3);
  near(s.state(wheel).angle, Math.PI / 2);
  s.dispose();
});
test("net force reports weight, support, friction and tension", () => {
  const s = new Sandbox(),
    falling = s.add("ball", { x: -4, y: 50 }),
    resting = s.add("block", { x: 0, y: 0.45 }),
    sliding = s.add("block", { x: 3, y: 0.45 });
  s.updateConstants(falling, { mass: 2 });
  s.updateConstants(sliding, { mass: 4, friction: 0.25, restitution: 0 });
  s.setLock(sliding, "rotation", true);
  run(s, 0.3);
  s.setVelocity(sliding, { vx: 5 });
  run(s, 0.2);
  near(s.netForce(falling).y, -2 * g, 1e-6); // weight only
  near(s.netForce(falling).x, 0, 1e-6);
  near(Math.hypot(...Object.values(s.netForce(resting))), 0, 1e-3); // N = mg
  near(s.netForce(sliding).x, -0.25 * 4 * g, 1e-3); // kinetic friction μN
  near(s.netForce(sliding).y, 0, 1e-3);
  assert.equal(s.netForce("nothing"), null);
  s.dispose();
  // Whirled on a rod in zero gravity: centripetal force m v² / r inward.
  const w = new Sandbox();
  w.updateSettings({ gravity: 0 });
  const bob = w.add("ball", { x: 2, y: 20 });
  w.connect("rod", null, bob, { x: 0, y: 20 }, null);
  w.setVelocity(bob, { vy: 3 });
  run(w, 0.05);
  const p = w.state(bob),
    f = w.netForce(bob),
    v2 = p.vx * p.vx + p.vy * p.vy;
  near(Math.hypot(f.x, f.y), v2 / 2, 0.05);
  assert.ok(f.x * p.x + f.y * (p.y - 20) < 0); // towards the pivot
  w.dispose();
});
test("energy and momentum readouts match the textbook expressions", () => {
  const s = new Sandbox(),
    id = s.add("ball", { x: 0, y: 6 }),
    spring = s.connect("spring", null, id, { x: 0, y: 8 }, null);
  s.updateConstants(id, { mass: 2, angularDamping: 0 });
  s.updateLink(spring, { k: 50, damping: 0 });
  s.setVelocity(id, { vx: 1, vy: -2, omega: 3 });
  const m = s.measure(id),
    inertia = 0.5 * 2 * 0.4 ** 2;
  near(m.translational, 0.5 * 2 * 5, 1e-9);
  near(m.rotational, 0.5 * inertia * 9, 1e-9);
  near(m.momentum.x, 2, 1e-9);
  near(m.momentum.y, -4, 1e-9);
  // Potential energy is taken half a step back, where the velocity applies.
  near(m.gravitational, 2 * g * (6 + 2 / 240), 1e-9);
  const before = s.energy();
  near(before.elastic, 0, 0.01); // endpoints taken half a step back
  run(s, 5);
  const after = s.energy();
  assert.ok(after.elastic > 0);
  // Spring, gravity and kinetic energy trade off; the total is conserved.
  near(after.total, before.total, before.total * 2e-3);
  s.dispose();
});
test("scenes survive export and reload, including through JSON", () => {
  const s = new Sandbox();
  s.setViewport({ minX: -8, maxX: 8, minY: 0, maxY: 9 });
  s.updateSettings({ walls: true, gravity: 7, airResistance: 0.1 });
  s.updateFloor({ friction: 0.2, restitution: 0.3 });
  const ball = s.add("ball", { x: -4, y: 3 }),
    block = s.add("block", { x: -1, y: 4 }),
    wedge = s.add("wedge", { x: 4, y: 1 }),
    wheel = s.add("ball", { x: 2, y: 7 }),
    left = s.add("block", { x: 1.6, y: 4 }),
    right = s.add("block", { x: 2.4, y: 4 }),
    w1 = s.add("ball", { x: -6, y: 6 }),
    w2 = s.add("ball", { x: -3, y: 6 });
  s.resizeBody(ball, 0.5);
  s.resizeBody(block, 1.2, 0.4);
  s.resizeBody(wedge, 2, 1);
  for (const id of [left, right]) s.resizeBody(id, 0.3, 0.3);
  for (const id of [w1, w2]) s.resizeBody(id, 0.6);
  s.updateConstants(ball, { mass: 2.5, charge: -3, restitution: 0.9 });
  s.updateConstants(right, { mass: 2 });
  s.setLock(block, "rotation", true);
  const spring = s.connect("spring", null, ball, { x: -4, y: 6 }, null);
  s.updateLink(spring, { k: 35, damping: 0.1, length: 2.5 });
  s.setSpringAngle(spring, true);
  s.connect("rod", null, block, { x: -1, y: 6 }, null);
  s.mechanisms.createPulley(left, wheel, right);
  const belt = s.mechanisms.createBelt(w1, w2);
  s.mechanisms.configureBelt(belt, { crossed: true, motor: true, speed: 2 });
  const field = s.fields.add("electric", { x: 0, y: 3 });
  s.fields.update(field, {
    shape: "ellipse",
    width: 6,
    height: 2,
    angle: 30,
    strength: -4,
    gradient: "linear",
  });
  run(s, 0.7);
  const saved = JSON.parse(JSON.stringify(s.exportScene())),
    copy = Sandbox.fromScene(saved);
  assert.deepEqual(copy.settings, s.settings);
  assert.deepEqual(copy.floorMaterial, s.floorMaterial);
  assert.deepEqual(copy.viewport, s.viewport);
  near(copy.time, s.time, 1e-12);
  assert.equal(copy.objects.size, s.objects.size);
  assert.equal(copy.links.size, s.links.size);
  // Reloading gives the same description back.
  const again = copy.exportScene(),
    strip = (scene) =>
      JSON.parse(
        JSON.stringify(scene, (key, value) =>
          typeof value === "number" ? Number(value.toFixed(6)) : value,
        ),
      );
  assert.deepEqual(strip(again).bodies, strip(saved).bodies);
  assert.deepEqual(strip(again).fields, strip(saved).fields);
  assert.deepEqual(
    strip(again).links.map(({ a, b, wheel, ...rest }) => rest),
    strip(saved).links.map(({ a, b, wheel, ...rest }) => rest),
  );
  // ... and the copy then evolves like the original.
  run(s, 1);
  run(copy, 1);
  const originals = [...s.objects.keys()],
    copies = [...copy.objects.keys()];
  originals.forEach((id, i) => {
    const p = s.state(id),
      q = copy.state(copies[i]);
    near(q.x, p.x, 0.02);
    near(q.y, p.y, 0.02);
  });
  finite(copy);
  s.dispose();
  copy.dispose();
});
test("damaged or foreign scene files are refused with a readable message", () => {
  const good = new Sandbox().exportScene();
  for (const bad of [
    null,
    {},
    { ...good, version: 2 },
    { ...good, bodies: "many" },
    { ...good, bodies: [{ id: "a", shape: "ring", width: 1, height: 1 }] },
    {
      ...good,
      bodies: [{ id: "a", shape: "ball", width: 1, height: 1, x: 0, y: 2 }],
      links: [{ type: "rod", a: "a", b: "missing", length: 1 }],
    },
    { ...good, settings: { gravity: 9000 } },
    { ...good, bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 } },
  ])
    assert.throws(() => Sandbox.fromScene(bad), Error);
  const full = new Sandbox();
  full.add("ball", { x: 0, y: 2 });
  assert.throws(() => full.loadScene(good), /empty/);
  full.dispose();
});
test("every preset builds, runs, and reloads from its exported scene", () => {
  assert.ok(presets.length >= 10);
  assert.equal(new Set(presets.map((p) => p.id)).size, presets.length);
  for (const preset of presets) {
    for (const key of ["id", "group", "title", "description", "expect"])
      assert.equal(typeof preset[key], "string", `${preset.id}.${key}`);
    const s = new Sandbox();
    preset.setup(s);
    assert.ok(s.viewport, preset.id);
    const copy = Sandbox.fromScene(JSON.parse(JSON.stringify(s.exportScene())));
    run(s, 4);
    run(copy, 4);
    finite(s);
    finite(copy);
    const a = [...s.objects.keys()],
      b = [...copy.objects.keys()];
    a.forEach((id, i) => {
      near(copy.state(b[i]).x, s.state(id).x, 0.05);
      near(copy.state(b[i]).y, s.state(id).y, 0.05);
    });
    s.dispose();
    copy.dispose();
  }
});
test("presets show the results they claim", () => {
  {
    const { s, ids } = load("free-fall");
    run(s, 1);
    for (const id of ids) near(s.state(id).vy, -g, 1e-6);
    near(s.state(ids[0]).y, s.state(ids[2]).y, 1e-9);
    s.dispose();
  }
  {
    const { s, ids } = load("projectile");
    let peak = 0;
    run(s, (2 * 7) / g - 0.02, () => (peak = Math.max(peak, s.state(ids[0]).y)));
    near(peak - 0.2, 49 / (2 * g), 0.04);
    near(s.state(ids[0]).x + 6, (2 * 49) / g, 0.25);
    s.dispose();
  }
  {
    const { s, ids } = load("bouncing");
    const peaks = ids.map(() => 0),
      landed = ids.map(() => false);
    run(s, 2.2, () =>
      ids.forEach((id, i) => {
        const y = s.state(id).y - 0.3;
        if (y < 0.02) landed[i] = true;
        if (landed[i]) peaks[i] = Math.max(peaks[i], y);
      }),
    );
    [0.5, 0.8, 1].forEach((e, i) => near(peaks[i], 4 * e * e, 0.04));
    s.dispose();
  }
  {
    const { s, ids } = load("elastic-collision");
    run(s, 2);
    near(s.state(ids[0]).vx, -1.5, 0.01);
    near(s.state(ids[1]).vx, 1.5, 0.01);
    s.dispose();
  }
  {
    const { s, ids } = load("inelastic-collision");
    run(s, 2);
    near(s.state(ids[0]).vx, 2, 0.01);
    near(s.state(ids[1]).vx, 2, 0.01);
    near(s.energy().kinetic, 6, 0.05);
    s.dispose();
  }
  {
    const { s, ids } = load("incline-friction");
    run(s, 0.3);
    const v0 = Math.hypot(s.state(ids[1]).vx, s.state(ids[1]).vy);
    run(s, 1);
    const v1 = Math.hypot(s.state(ids[1]).vx, s.state(ids[1]).vy),
      theta = (25 * Math.PI) / 180,
      a = g * (Math.sin(theta) - 0.3 * Math.cos(theta));
    near(v1 - v0, a, 0.01);
    // The net force arrow: 4 kg × a ≈ 5.9 N, pointing down the slope.
    const f = s.netForce(ids[1]);
    near(Math.hypot(f.x, f.y), 4 * a, 0.02);
    near(Math.atan2(-f.y, -f.x), theta, 0.01);
    s.dispose();
    // The fix the description suggests really does hold the block.
    const again = load("incline-friction");
    again.s.updateConstants(again.ids[1], { friction: 0.5 });
    const start = again.s.state(again.ids[1]);
    run(again.s, 3);
    const end = again.s.state(again.ids[1]);
    near(Math.hypot(end.x - start.x, end.y - start.y), 0, 2e-3);
    again.s.dispose();
  }
  {
    const { s, ids } = load("rolling");
    run(s, 0.3);
    const v0 = Math.hypot(s.state(ids[1]).vx, s.state(ids[1]).vy);
    run(s, 1);
    const v1 = Math.hypot(s.state(ids[1]).vx, s.state(ids[1]).vy);
    near(v1 - v0, (2 / 3) * g * Math.sin((15 * Math.PI) / 180), 0.01);
    s.dispose();
  }
  {
    const { s, ids } = load("balance-beam");
    run(s, 3);
    near(s.state(ids[1]).angle, 0, 2e-3);
    s.dispose();
  }
  {
    const { s, ids } = load("spring-mass");
    let low = 9;
    const crossings = [];
    let previous = s.state(ids[0]).y;
    const centre = 5 - g / 20;
    run(s, 6, () => {
      const y = s.state(ids[0]).y;
      low = Math.min(low, y);
      if (previous > centre && y <= centre) crossings.push(s.time);
      previous = y;
    });
    near(5 - low, (2 * g) / 20, 0.01);
    near(
      (crossings.at(-1) - crossings[0]) / (crossings.length - 1),
      2 * Math.PI * Math.sqrt(1 / 20),
      0.01,
    );
    s.dispose();
  }
  {
    const { s, ids } = load("pendulum");
    const crossings = [];
    let previous = s.state(ids[0]).x;
    run(s, 12, () => {
      const x = s.state(ids[0]).x;
      if (previous > 0 && x <= 0) crossings.push(s.time);
      previous = x;
    });
    near(
      (crossings.at(-1) - crossings[0]) / (crossings.length - 1),
      2 * Math.PI * Math.sqrt(3 / g),
      0.02,
    );
    s.dispose();
  }
  {
    const { s, ids } = load("atwood");
    run(s, 1);
    const a = (0.5 * g) / (2.5 + 0.5);
    near(s.state(ids[2]).vy, -a, 0.02);
    near(s.state(ids[1]).vy, a, 0.02);
    s.dispose();
  }
  {
    const { s, ids } = load("cyclotron");
    // The field is a placed region, not the global field.
    assert.equal(s.settings.magneticZ, 0);
    assert.equal(s.fields.regions.size, 1);
    let minX = 9,
      maxX = -9,
      minY = 99,
      maxY = -99;
    run(s, Math.PI, () => {
      const p = s.state(ids[0]);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
    near((maxX - minX) / 2, 2, 0.01);
    near((maxY - minY) / 2, 2, 0.01);
    const p = s.state(ids[0]);
    near(Math.hypot(p.vx, p.vy), 4, 1e-6);
    near(p.x, 0, 0.05); // back where it started after one period
    s.dispose();
  }
  {
    const { s, ids } = load("velocity-selector");
    run(s, 3);
    const [slow, matched, fast] = ids.map((id) => s.state(id));
    near(matched.y, 4.5, 1e-6);
    near(matched.vx, 3, 1e-6);
    assert.ok(slow.y > 5.5 + 0.3);
    assert.ok(fast.y < 3.5 - 0.3);
    s.dispose();
  }
  {
    const { s, ids } = load("coulomb-orbit");
    let near_ = 9,
      far = 0;
    run(s, 20, () => {
      const p = s.state(ids[1]),
        r = Math.hypot(p.x, p.y - 4.5);
      near_ = Math.min(near_, r);
      far = Math.max(far, r);
    });
    near(near_, 3, 0.02);
    near(far, 3, 0.02);
    s.dispose();
  }
});
test("electric potential energy balances the books for uniform fields and Coulomb pairs", () => {
  // Uniform global field: K + U stays constant, with U = −qE·r.
  const s = new Sandbox();
  s.updateSettings({ gravity: 0, electricX: 4, electricY: -3 });
  const id = s.add("ball", { x: -2, y: 6 });
  s.updateConstants(id, { charge: 0.5, mass: 2, angularDamping: 0 });
  s.setVelocity(id, { vx: 1, vy: 2 });
  const p0 = s.state(id),
    before = s.energy();
  near(
    before.electric,
    -0.5 * (4 * (p0.x - 1 / 240) - 3 * (p0.y - 2 / 240)),
    1e-9,
  );
  near(s.measure(id).electric, before.electric, 1e-9);
  run(s, 2);
  const after = s.energy();
  assert.ok(Math.abs(after.kinetic - before.kinetic) > 1); // energy moved
  near(after.total, before.total, 0.03);
  near(after.fieldWork, 0, 1e-12); // no regions: nothing supplied from outside
  s.dispose();
  // Two repelling charges released from rest: U = kq₁q₂/√(r² + ε²) → K.
  const c = new Sandbox();
  c.updateSettings({
    gravity: 0,
    chargeInteractions: true,
    coulombConstant: 2,
    chargeSoftening: 0.1,
  });
  const a = c.add("ball", { x: -1.5, y: 50 }),
    b = c.add("ball", { x: 1.5, y: 50 });
  c.updateConstants(a, { charge: 2, angularDamping: 0 });
  c.updateConstants(b, { charge: 3, mass: 4, angularDamping: 0 });
  const start = c.energy();
  near(start.electric, (2 * 2 * 3) / Math.hypot(3, 0.1), 1e-9);
  near(start.kinetic, 0, 1e-12);
  // Each body holds half of the pair's energy.
  near(c.measure(a).electric + c.measure(b).electric, start.electric, 1e-9);
  run(c, 5);
  const end = c.energy();
  assert.ok(end.kinetic > 1);
  near(end.total, start.total, 0.01);
  // With interactions switched off there is no mutual energy to report.
  c.updateSettings({ chargeInteractions: false });
  near(c.energy().electric, 0, 1e-12);
  c.dispose();
});
test("work done by field regions is reported, so total minus that work is conserved", () => {
  const s = new Sandbox();
  s.updateSettings({ gravity: 0 });
  const region = s.fields.add("electric", { x: 0, y: 20 });
  s.fields.update(region, { width: 4, height: 6, strength: 5 }); // +x, 5 N/C
  const id = s.add("ball", { x: -4, y: 20 });
  s.resizeBody(id, 0.2);
  s.updateConstants(id, { charge: 0.4, angularDamping: 0 });
  s.setVelocity(id, { vx: 2 });
  const before = s.energy();
  run(s, 3); // crosses the whole 4 m region
  const after = s.energy();
  assert.ok(s.state(id).x > 2);
  // W = qEd = 0.4 × 5 × 4 = 8 J, all of it appearing as kinetic energy.
  near(after.fieldWork, 8, 0.1);
  near(after.kinetic - before.kinetic, after.fieldWork, 1e-9);
  near(after.electric, 0, 1e-12); // regions carry no potential energy
  near(after.total - after.fieldWork, before.total, 1e-9);
  // The running total survives save and reload.
  const copy = Sandbox.fromScene(JSON.parse(JSON.stringify(s.exportScene())));
  near(copy.energy().fieldWork, after.fieldWork, 1e-12);
  copy.dispose();
  s.dispose();
  // A magnetic region does no work, alone or crossed with an electric one.
  const { s: v, ids } = load("velocity-selector");
  const start = v.energy();
  run(v, 3);
  const finish = v.energy();
  near(finish.total - finish.fieldWork, start.total, 0.02);
  near(v.measure(ids[1]).kinetic, 0.5 * 9, 1e-6); // the matched charge
  v.dispose();
  const m = new Sandbox();
  m.updateSettings({ gravity: 0, magneticZ: 3 });
  const q = m.add("ball", { x: 0, y: 30 });
  m.updateConstants(q, { charge: 1, angularDamping: 0 });
  m.setVelocity(q, { vx: 2 });
  run(m, 3);
  near(m.energy().fieldWork, 0, 1e-12);
  near(m.energy().kinetic, 2, 1e-9);
  m.dispose();
});
