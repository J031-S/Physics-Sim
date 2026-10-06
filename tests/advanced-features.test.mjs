import test from "node:test";
import assert from "node:assert/strict";
import Matter from "../vendor/matter.js";
globalThis.Matter = Matter;
const { Sandbox, DT } = await import("../src/physics.js");
const { FieldDrag, fieldSpacing, drawFields } = await import(
  "../src/field-view.js"
);
const near = (a, b, t = 1e-7) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
const make = () => {
  const s = new Sandbox();
  s.updateSettings({ gravity: 0 });
  return s;
};
test("gradient geometry is independent of boundary shape and has configurable axes and origin", () => {
  const s = make(),
    id = s.fields.add("electric", { x: 0, y: 10 }),
    f = s.fields.regions.get(id);
  s.fields.update(id, {
    shape: "rectangle",
    width: 20,
    height: 20,
    strength: 8,
    gradient: "linear",
    gradientShape: "radial",
    gradientScaleX: 4,
  });
  near(s.fields.sample(f, { x: 0, y: 10 }).ex, 8);
  near(s.fields.sample(f, { x: 2, y: 10 }).ex, 4);
  near(s.fields.sample(f, { x: 4, y: 10 }).ex, 0);
  s.fields.update(id, {
    gradientShape: "axial",
    gradientAngle: 90,
    gradientX: 1,
    gradientY: 1,
  });
  near(s.fields.sample(f, { x: 1, y: 13 }).ex, 4);
  near(s.fields.sample(f, { x: 1, y: 9 }).ex, 8);
  s.fields.update(id, {
    gradientShape: "elliptical",
    gradientScaleX: 2,
    gradientScaleY: 4,
    gradientAngle: 0,
  });
  near(s.fields.profile(f, { x: 1, y: 13 }), 0.5);
  s.fields.update(id, { gradientShape: "box" });
  near(s.fields.profile(f, { x: 2, y: 13 }), 0.5);
  s.dispose();
});
test("falloff laws remain finite at the origin and reverse sign without changing their profile", () => {
  const s = make(),
    id = s.fields.add("magnetic", { x: 0, y: 10 }),
    f = s.fields.regions.get(id);
  s.fields.update(id, { width: 20, gradientScaleX: 2, strength: -6 });
  for (const [gradient, expected] of [
    ["inverse", 1 / Math.sqrt(2)],
    ["inverseSquare", 0.5],
    ["exponential", Math.exp(-1)],
  ]) {
    s.fields.update(id, { gradient });
    near(s.fields.profile(f, { x: 0, y: 10 }), 1);
    near(s.fields.sample(f, { x: 2, y: 10 }).bz, -6 * expected);
  }
  s.fields.update(id, { gradient: "inverseSquare" });
  near(s.fields.profile(f, { x: 4, y: 10 }), 0.2);
  s.dispose();
});
test("radial electric directions point away from the configured origin and reverse for negative strength", () => {
  const s = make(),
    id = s.fields.add("electric", { x: 0, y: 10 }),
    f = s.fields.regions.get(id);
  s.fields.update(id, { direction: "radial", strength: 4 });
  near(s.fields.sample(f, { x: 0, y: 11 }).ey, 4);
  near(s.fields.sample(f, { x: 1, y: 10 }).ex, 4);
  s.fields.update(id, { strength: -4 });
  near(s.fields.sample(f, { x: 1, y: 10 }).ex, -4);
  near(s.fields.sample(f, { x: 0, y: 10 }).ex, 0);
  s.dispose();
});
test("like charges repel, opposite charges attract, with equal and opposite momentum", () => {
  for (const charge of [-2, 2]) {
    const s = make(),
      a = s.add("ball", { x: -2, y: 10 }),
      b = s.add("ball", { x: 2, y: 10 });
    s.updateConstants(a, { mass: 2, charge: 1 });
    s.updateConstants(b, { mass: 3, charge });
    s.updateSettings({
      chargeInteractions: true,
      coulombConstant: 5,
      chargeSoftening: 0.1,
    });
    s.step();
    const va = s.state(a).vx,
      vb = s.state(b).vx;
    assert.equal(Math.sign(va), -Math.sign(charge));
    near(2 * va + 3 * vb, 0);
    near(Math.abs(va), ((5 * 2 * 4) / 16.01 ** 1.5 / 2) * DT, 1e-6);
    s.dispose();
  }
});
test("charge interaction toggle, pinned sources and coincident charges stay safe", () => {
  const s = make(),
    a = s.add("ball", { x: -2, y: 10 }),
    b = s.add("ball", { x: 2, y: 10 });
  s.updateConstants(a, { charge: 1 });
  s.updateConstants(b, { charge: 1 });
  s.step();
  near(s.state(a).vx, 0);
  s.updateSettings({ chargeInteractions: true });
  s.setLock(a, "position", true);
  s.step();
  near(s.state(a).x, -2);
  assert.ok(s.state(b).vx > 0);
  Matter.Body.setPosition(s.objects.get(b).body, {
    ...s.objects.get(a).body.position,
  });
  s.step();
  assert.ok(Number.isFinite(s.state(b).vx));
  s.dispose();
});
test("impulse obeys J/m, velocity mode is mass independent, and position locks reject it", () => {
  const s = make(),
    id = s.add("block", { x: 0, y: 10 });
  s.updateConstants(id, { mass: 2 });
  s.impulse(id, { x: 4, y: 2 });
  near(s.state(id).vx, 2);
  near(s.state(id).vy, 1);
  near(s.state(id).omega, 0);
  s.impulse(id, { x: 3, y: -1 }, "velocity");
  near(s.state(id).vx, 5);
  near(s.state(id).vy, 0);
  s.setLock(id, "position", true);
  assert.equal(s.impulse(id, { x: 3, y: 0 }), false);
  near(s.state(id).vx, 0);
  s.dispose();
});
test("resize does not reverse when cursor crosses centre; returning restores the original size", () => {
  const s = make(),
    id = s.add("ball", { x: 0, y: 10 });
  s.beginResize(id, { x: 0.3, y: 10 });
  s.moveResize({ x: -0.3, y: 10 });
  near(s.objects.get(id).radius, 0.05);
  s.moveResize({ x: -0.6, y: 10 });
  near(s.objects.get(id).radius, 0.05);
  s.moveResize({ x: 0.3, y: 10 });
  near(s.objects.get(id).radius, 0.4);
  s.endResize();
  for (const type of ["electric", "magnetic"]) {
    const fId = s.fields.add(type, { x: 0, y: 10 }),
      f = s.fields.regions.get(fId),
      d = new FieldDrag(s.fields, fId, { x: 1, y: 11 }, "resize");
    d.move({ x: -1, y: 9 }, "resize", false);
    near(f.width, 0.1);
    d.move({ x: -2, y: 8 }, "resize", false);
    near(f.width, 0.1);
    d.move({ x: 1, y: 11 }, "resize", false);
    near(f.width, 4);
  }
  s.dispose();
});
test("mixed selection translates fields with connected bodies and preserves gradient parameters", () => {
  const s = make(),
    a = s.add("ball", { x: 0, y: 10 }),
    b = s.add("ball", { x: 2, y: 10 }),
    f = s.fields.add("electric", { x: 0, y: 10 });
  s.connect("rod", a, b);
  s.fields.update(f, { gradient: "inverseSquare", gradientX: 1 });
  const ids = s.beginGroup([a, f], { x: 0, y: 10 }, { paused: true });
  assert.ok(ids.includes(b) && ids.includes(f));
  s.moveGroup({ x: 2, y: 11 }, true);
  near(s.state(a).x, 2);
  near(s.state(b).x, 4);
  near(s.fields.regions.get(f).x, 2);
  near(s.fields.regions.get(f).gradientX, 1);
  s.endGroup();
  s.dispose();
});
test("field-only selection can move downward without being clamped to the floor", () => {
  const s = make(),
    f = s.fields.add("electric", { x: 0, y: 10 });
  s.beginGroup([f], { x: 0, y: 10 });
  s.moveGroup({ x: 0, y: 8 });
  near(s.fields.regions.get(f).y, 8);
  s.dispose();
});
test("scene size updates the world bounds without changing body positions", () => {
  const s = make(),
    id = s.add("ball", { x: 0, y: 5 });
  s.setViewport({ minX: -5, maxX: 5, minY: -1, maxY: 9 });
  s.updateSettings({ walls: true });
  s.setSceneSize(40, 20);
  assert.deepEqual(s.viewport, { minX: -20, maxX: 20, minY: -1, maxY: 19 });
  near(s.state(id).y, 5);
  assert.equal(s.walls.length, 4);
  assert.throws(() => s.setSceneSize(-1, 10));
  s.dispose();
});
test("stronger fields have denser indicators; magnetic rendering uses circles only as standalone dots", () => {
  assert.ok(fieldSpacing(10) < fieldSpacing(1));
  near(fieldSpacing(-10), fieldSpacing(10));
  const s = make();
  s.fields.add("magnetic", { x: 0, y: 10 });
  const labels = [];
  const ctx = new Proxy(
    { fillText: (t) => labels.push(t) },
    { get: (o, k) => o[k] || (() => {}), set: (o, k, v) => ((o[k] = v), true) },
  );
  drawFields(
    ctx,
    s.fields,
    (p) => ({ x: p.x * 65, y: -p.y * 65 }),
    65,
    () => false,
  );
  assert.ok(labels.every((t) => !/[⊙⊗]/.test(t)));
  s.dispose();
});

test('a nonuniform electric field drives actual body acceleration at its local strength',()=>{
 const s=make(),id=s.add('ball',{x:2,y:10}),f=s.fields.add('electric',{x:0,y:10});
 s.fields.update(f,{width:20,height:20,strength:8,gradient:'linear',gradientScaleX:4});s.updateConstants(id,{charge:1,mass:2});
 s.step();near(s.state(id).vx,2*DT);s.dispose();
});
