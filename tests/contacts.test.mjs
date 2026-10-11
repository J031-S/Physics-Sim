import test from "node:test";
import assert from "node:assert/strict";
import Matter from "../vendor/matter.js";
globalThis.Matter = Matter;
const { Sandbox, DT } = await import("../src/physics.js");
const { Body } = Matter;
const near = (a, b, t = 0.001) =>
  assert.ok(Math.abs(a - b) < t, `${a} expected ${b} ±${t}`);
const run = (s, t, each) => {
  for (let i = 0; i < Math.round(t / DT); i++) {
    s.step();
    each?.();
  }
};
const g = 9.81;
const place = (s, id, x, y, angle = 0) => {
  const o = s.objects.get(id);
  Body.setAngle(o.body, -angle);
  Body.setPosition(o.body, { x: x * 100, y: -y * 100 });
  Body.setVelocity(o.body, { x: 0, y: 0 });
  o.positionAnchor = { ...o.body.position };
  o.angleAnchor = o.body.angle;
};
const kick = (s, id, vx, vy = 0) => s.impulse(id, { x: vx, y: vy }, "velocity");
// A pinned ramp with its lower corner at the origin, and a helper that rests a
// body of half-height `half` on the slope a fraction `t` of the way up.
function ramp(s, degrees, friction) {
  const theta = (degrees * Math.PI) / 180,
    width = 8,
    height = width * Math.tan(theta),
    id = s.add("wedge", { x: 0, y: 9 });
  s.resizeBody(id, width, height);
  place(s, id, (2 * width) / 3, height / 3);
  s.updateConstants(id, { friction, restitution: 0 });
  return {
    theta,
    rest(body, half, t = 0.9) {
      place(
        s,
        body,
        width * t - Math.sin(theta) * (half + 0.002),
        height * t + Math.cos(theta) * (half + 0.002),
        theta,
      );
    },
  };
}
function slab(s, friction, extra = {}) {
  const id = s.add("block", { x: 0, y: 3 });
  s.resizeBody(id, 0.6, 0.3);
  s.updateConstants(id, { friction, restitution: 0, ...extra });
  return id;
}
test("kinetic friction decelerates at μg, for any mass and gravity, down to rest", () => {
  for (const [mu, gravity, mass] of [
    [0.1, g, 1],
    [0.3, g, 1],
    [0.3, g, 10],
    [0.3, 2, 1],
    [0.5, 30, 0.1],
  ]) {
    const s = new Sandbox();
    s.updateSettings({ gravity });
    const id = slab(s, mu, { mass });
    place(s, id, -20, 0.15);
    run(s, 0.2);
    kick(s, id, 4);
    const x0 = s.state(id).x,
      t0 = s.time,
      a = mu * gravity,
      stop = 4 / a;
    // Speed falls linearly all the way to zero, with no early snap to rest.
    for (const fraction of [0.25, 0.5, 0.75, 0.95]) {
      run(s, fraction * stop - (s.time - t0));
      near(s.state(id).vx, 4 - a * (s.time - t0), 0.01);
    }
    run(s, 0.05 * stop + 0.5);
    near(s.state(id).vx, 0, 1e-6);
    near(s.state(id).x - x0, 16 / (2 * a), 0.03);
    s.dispose();
  }
});
test("a pushed block stays put until the force exceeds μmg, then a = F/m − μg", () => {
  for (const [field, expected] of [
    [2, 0],
    [2.9, 0],
    [4, 4 - 0.3 * g],
    [10, 10 - 0.3 * g],
  ]) {
    const s = new Sandbox(),
      id = slab(s, 0.3, { charge: 1 }); // 1 C in E N/C: a force of E newtons
    place(s, id, 0, 0.15);
    run(s, 0.2);
    s.updateSettings({ electricX: field });
    run(s, 1);
    near(s.state(id).vx, expected, 0.01);
    s.dispose();
  }
});
test("a block on an incline holds below tan θ = μ and slides at g(sin θ − μ cos θ) above", () => {
  for (const [mu, degrees] of [
    [0.3, 5],
    [0.3, 16],
    [0.3, 17],
    [0.3, 30],
    [0.1, 10],
    [1, 40],
    [0, 20],
  ]) {
    const s = new Sandbox(),
      r = ramp(s, degrees, 1),
      id = slab(s, mu);
    r.rest(id, 0.15);
    run(s, 0.3);
    const before = s.state(id);
    run(s, 0.5);
    const after = s.state(id),
      speed = (p) => Math.hypot(p.vx, p.vy),
      a = Math.max(0, g * (Math.sin(r.theta) - mu * Math.cos(r.theta)));
    near((speed(after) - speed(before)) / 0.5, a, 0.01);
    if (!a) {
      // Static friction: no creep at all, however long it sits.
      run(s, 20);
      const later = s.state(id);
      near(Math.hypot(later.x - after.x, later.y - after.y), 0, 1e-4);
    }
    s.dispose();
  }
});
test("default block rests on a shallow default ramp and slides on a steep one", () => {
  for (const [degrees, slides] of [
    [5, false],
    [12, false],
    [25, true],
  ]) {
    const s = new Sandbox(),
      theta = (degrees * Math.PI) / 180,
      wedge = s.add("wedge", { x: 0, y: 9 });
    s.resizeBody(wedge, 8, 8 * Math.tan(theta));
    place(s, wedge, 16 / 3, (8 * Math.tan(theta)) / 3);
    const id = s.add("block", { x: 0, y: 9 });
    place(
      s,
      id,
      7.2 - Math.sin(theta) * 0.452,
      7.2 * Math.tan(theta) + Math.cos(theta) * 0.452,
      theta,
    );
    run(s, 1);
    const start = s.state(id);
    run(s, 2);
    const end = s.state(id),
      moved = Math.hypot(end.x - start.x, end.y - start.y);
    if (slides) assert.ok(moved > 1, `expected sliding, moved ${moved}`);
    else near(moved, 0, 1e-4);
    s.dispose();
  }
});
test("collisions are elastic at any speed when restitution is 1", () => {
  for (const speed of [0.03, 0.3, 3, 20]) {
    const s = new Sandbox();
    s.updateSettings({ gravity: 0 });
    const a = s.add("ball", { x: -1, y: 5 }),
      b = s.add("ball", { x: 1, y: 5 });
    for (const id of [a, b])
      s.updateConstants(id, { restitution: 1, friction: 0 });
    s.updateConstants(b, { mass: 3 });
    kick(s, a, speed);
    run(s, 2 / speed + 1);
    // m1 = 1, m2 = 3: v1' = −v/2, v2' = +v/2.
    near(s.state(a).vx, -speed / 2, speed * 1e-3);
    near(s.state(b).vx, speed / 2, speed * 1e-3);
    near(s.state(a).omega, 0, 1e-9); // central impact: no spin
    s.dispose();
  }
});
test("head-on collisions follow the restitution law and conserve momentum", () => {
  for (const e of [0, 0.5, 1]) {
    const s = new Sandbox();
    s.updateSettings({ gravity: 0 });
    const a = s.add("ball", { x: -1, y: 5 }),
      b = s.add("ball", { x: 1, y: 5 });
    for (const id of [a, b])
      s.updateConstants(id, { restitution: e, friction: 0 });
    kick(s, a, 3);
    run(s, 2);
    near(s.state(a).vx, (3 * (1 - e)) / 2, 1e-3);
    near(s.state(b).vx, (3 * (1 + e)) / 2, 1e-3);
    s.dispose();
  }
});
test("a dropped ball rebounds to e² of its height and an elastic one keeps bouncing", () => {
  for (const e of [0.6, 0.9, 1]) {
    const s = new Sandbox(),
      id = s.add("ball", { x: 0, y: 5.4 }),
      peaks = [];
    s.updateConstants(id, { restitution: e });
    let rising = false;
    run(s, 8, () => {
      const vy = s.state(id).vy;
      if (rising && vy <= 0) peaks.push(s.state(id).y - 0.4);
      rising = vy > 0;
    });
    near(peaks[0] / 5, e * e, 0.01);
    near(peaks[1] / peaks[0], e * e, 0.01);
    s.dispose();
  }
});
test("a resting block does not jump, even with restitution 1 and rotation locked", () => {
  for (const speed of [0, 2]) {
    const s = new Sandbox(),
      id = s.add("block", { x: -5, y: 0.45 });
    s.updateConstants(id, { restitution: 1, friction: 0 });
    s.setLock(id, "rotation", true);
    // Drag it down against the floor, as a student would.
    s.beginGrab(id, s.state(id), 0);
    s.moveGrab({ x: -5, y: 0.2 }, false, false, 10);
    s.step();
    s.endGrab(false);
    if (speed) kick(s, id, speed);
    let highest = 0,
      fastest = 0;
    run(s, 20, () => {
      highest = Math.max(highest, s.state(id).y);
      fastest = Math.max(fastest, Math.abs(s.state(id).vy));
    });
    near(highest, 0.45, 1e-3);
    near(fastest, 0, 1e-3);
    near(s.state(id).vx, speed, 1e-3); // frictionless: keeps sliding
    s.dispose();
  }
});
test("a ball rolls without loss and down an incline at (2/3) g sin θ", () => {
  const flat = new Sandbox(),
    ball = flat.add("ball", { x: -40, y: 0.4 });
  flat.updateConstants(ball, { angularDamping: 0, restitution: 0 });
  run(flat, 0.2);
  kick(flat, ball, 3);
  Body.setAngularVelocity(flat.objects.get(ball).body, 3 / 0.4 / 60);
  run(flat, 20);
  near(flat.state(ball).vx, 3, 0.01);
  flat.dispose();
  for (const degrees of [10, 30]) {
    const s = new Sandbox(),
      r = ramp(s, degrees, 1),
      id = s.add("ball", { x: 0, y: 12 });
    s.resizeBody(id, 0.4);
    s.updateConstants(id, { friction: 1, restitution: 0, angularDamping: 0 });
    r.rest(id, 0.2);
    run(s, 0.3);
    const before = s.state(id);
    run(s, 0.5);
    const after = s.state(id),
      speed = (p) => Math.hypot(p.vx, p.vy);
    near(
      (speed(after) - speed(before)) / 0.5,
      (2 / 3) * g * Math.sin(r.theta),
      0.01,
    );
    near(Math.abs(after.omega) * 0.2, speed(after), 0.01);
    s.dispose();
  }
});
test("stacks rest without sinking, including a heavy block on a light one", () => {
  for (const [lower, upper] of [
    [1, 1],
    [1, 100],
    [0.05, 100],
  ]) {
    const s = new Sandbox(),
      a = s.add("block", { x: 0, y: 0.45 }),
      b = s.add("block", { x: 0, y: 1.35 });
    s.updateConstants(a, { mass: lower });
    s.updateConstants(b, { mass: upper });
    run(s, 10);
    near(s.state(a).y, 0.45, 3e-3);
    near(s.state(b).y, 1.35, 3e-3);
    // A 2000:1 ratio leaves millimetre-scale rattle; milder stacks are still.
    if (upper / lower <= 100)
      near(Math.hypot(s.state(b).vx, s.state(b).vy), 0, 1e-4);
    s.dispose();
  }
});
test("a beam on a pivot balances when the torques are equal and tips when they are not", () => {
  for (const [x, sign] of [
    [0.5, 0], // 1 kg × 1.5 m = 3 kg × 0.5 m
    [0.8, -1],
    [0.3, 1],
  ]) {
    const s = new Sandbox(),
      pivot = s.add("ball", { x: 0, y: 1 });
    s.resizeBody(pivot, 0.4);
    s.setLock(pivot, "position", true);
    s.setLock(pivot, "rotation", true);
    s.updateConstants(pivot, { friction: 1 });
    const beam = s.add("block", { x: 0, y: 3 });
    s.resizeBody(beam, 4, 0.2);
    place(s, beam, 0, 1.3005);
    s.updateConstants(beam, { mass: 2, friction: 1, restitution: 0 });
    const light = slab(s, 1),
      heavy = slab(s, 1, { mass: 3 });
    for (const id of [light, heavy]) s.resizeBody(id, 0.3, 0.3);
    place(s, light, -1.5, 1.5515);
    place(s, heavy, x, 1.5515);
    run(s, 0.5);
    const angle = s.state(beam).angle;
    if (sign) assert.ok(sign * angle > 0.05, `expected tipping, got ${angle}`);
    else near(angle, 0, 2e-3);
    s.dispose();
  }
});
