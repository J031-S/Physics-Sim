import test from "node:test";
import assert from "node:assert/strict";
import Matter from "../vendor/matter.js";
globalThis.Matter = Matter;
const { Sandbox, DT } = await import("../src/physics.js");
const { FieldDrag } = await import("../src/field-view.js");
const near = (a, b, t = 1e-7) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
const make = () => {
  const s = new Sandbox();
  s.updateSettings({ gravity: 0 });
  return s;
};
const run = (s, t) => {
  for (let i = 0; i < Math.round(t / DT); i++) s.step();
};
test("electric acceleration follows charge polarity and mass; neutral bodies stay still", () => {
  for (const q of [-2, 0, 2]) {
    const s = make(),
      id = s.add("ball", { x: 0, y: 20 });
    s.updateSettings({ electricX: 3, electricY: 2 });
    s.updateConstants(id, { charge: q, mass: 2 });
    run(s, 1);
    near(s.state(id).vx, (q * 3) / 2);
    near(s.state(id).vy, q);
    near(s.state(id).omega, 0);
    s.dispose();
  }
});
test("magnetic force turns moving charge with correct sign and conserves speed", () => {
  for (const q of [-1, 1]) {
    const s = make(),
      id = s.add("ball", { x: 0, y: 20 });
    s.updateConstants(id, { charge: q });
    s.updateSettings({ magneticZ: 2 });
    Matter.Body.setVelocity(s.objects.get(id).body, {
      x: (5 * 100) / 60,
      y: 0,
    });
    run(s, 0.5);
    near(s.state(id).vx, 5 * Math.cos(1));
    near(s.state(id).vy, -q * 5 * Math.sin(1));
    run(s, 20);
    near(Math.hypot(s.state(id).vx, s.state(id).vy), 5, 1e-6);
    s.dispose();
  }
});
test("a stationary charge stays stationary in a magnetic field", () => {
  const s = make(),
    id = s.add("block", { x: 0, y: 20 });
  s.updateConstants(id, { charge: 2 });
  s.updateSettings({ magneticZ: -10 });
  run(s, 1);
  near(s.state(id).vx, 0);
  near(s.state(id).vy, 0);
  s.dispose();
});
test("crossed E and B preserve the E cross B drift velocity", () => {
  const s = make(),
    id = s.add("ball", { x: 0, y: 20 });
  s.updateConstants(id, { charge: 2 });
  s.updateSettings({ electricX: 6, magneticZ: 3 });
  Matter.Body.setVelocity(s.objects.get(id).body, { x: 0, y: (2 * 100) / 60 });
  run(s, 1);
  near(s.state(id).vx, 0);
  near(s.state(id).vy, -2);
  s.dispose();
});
test("regions superpose with global fields and respect rotated shape boundaries", () => {
  const s = make();
  s.updateSettings({ electricX: 1, electricY: 2, magneticZ: 3 });
  const e = s.fields.add("electric", { x: 0, y: 10 }),
    b = s.fields.add("magnetic", { x: 0, y: 10 });
  s.fields.update(e, { angle: 90, width: 4, height: 2, strength: 4 });
  s.fields.update(b, { strength: -3 });
  let f = s.fields.at({ x: 0, y: 10 });
  near(f.ex, 1);
  near(f.ey, 6);
  near(f.bz, 0);
  f = s.fields.at({ x: 1.5, y: 10 });
  near(f.ey, 2);
  near(f.bz, 0);
  s.fields.update(e, { shape: "ellipse", angle: 0 });
  assert.equal(
    s.fields.contains(s.fields.regions.get(e), { x: 1.8, y: 10.8 }),
    false,
  );
  s.fields.update(e, { shape: "circle", width: 2 });
  near(s.fields.regions.get(e).height, 2);
  s.remove(b);
  near(s.fields.at({ x: 0, y: 10 }).bz, 3);
  s.dispose();
});
test("field force starts and stops when body centre crosses region boundary", () => {
  const s = make(),
    id = s.add("ball", { x: 0, y: 20 }),
    e = s.fields.add("electric", { x: 0, y: 20 });
  s.updateConstants(id, { charge: 1 });
  s.fields.update(e, { width: 1, strength: 6 });
  s.step();
  assert.ok(s.state(id).vx > 0);
  Matter.Body.setPosition(s.objects.get(id).body, { x: 300, y: -2000 });
  const vx = s.state(id).vx;
  run(s, 0.2);
  near(s.state(id).vx, vx);
  s.dispose();
});
test("fields respect position locks, allow unlocked translation and validate edits atomically", () => {
  const s = make(),
    id = s.add("ball", { x: 0, y: 20 });
  s.updateConstants(id, { charge: 1 });
  s.updateSettings({ electricX: 5 });
  s.setLock(id, "position", true);
  run(s, 0.2);
  near(s.state(id).x, 0);
  s.setLock(id, "position", false);
  s.setLock(id, "rotation", true);
  run(s, 0.2);
  assert.ok(s.state(id).x > 0);
  near(s.state(id).angle, 0);
  const e = s.fields.add("electric", { x: 0, y: 20 });
  assert.throws(() => s.fields.update(e, { strength: 7, width: 0 }));
  near(s.fields.regions.get(e).strength, 5);
  assert.throws(() => s.updateSettings({ electricX: NaN }));
  s.dispose();
});
test("field movement, rotation and resizing obey Z snapping with a fixed resize centre", () => {
  const s = make(),
    id = s.fields.add("electric", { x: 0, y: 10 });
  let d = new FieldDrag(s.fields, id, { x: 0, y: 10 }, "move");
  d.move({ x: 0.74, y: 10.26 }, "move", true);
  let f = s.fields.regions.get(id);
  near(f.x, 0.5);
  near(f.y, 10.5);
  d = new FieldDrag(s.fields, id, { x: 1.5, y: 10.5 }, "rotate");
  d.move({ x: 1.2, y: 11.2 }, "rotate", true);
  near(f.angle, 45);
  const centre = { x: f.x, y: f.y };
  d = new FieldDrag(s.fields, id, centre, "resize");
  d.move({ x: centre.x + 1, y: centre.y + 1 }, "resize", true);
  near(f.x, centre.x);
  near(f.y, centre.y);
  near(f.width / 0.5, Math.round(f.width / 0.5));
  s.dispose();
});

test("circular field resizing can shrink as well as grow without moving its centre", () => {
  const s=make(), id=s.fields.add("magnetic",{x:0,y:10});
  const d=new FieldDrag(s.fields,id,{x:2,y:10},"resize");
  d.move({x:1,y:10},"resize",true);
  const f=s.fields.regions.get(id);near(f.width,2);near(f.height,2);near(f.x,0);near(f.y,10);s.dispose();
});
