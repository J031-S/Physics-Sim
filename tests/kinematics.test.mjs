import test from "node:test";
import assert from "node:assert/strict";
import Matter from "../vendor/matter.js";
globalThis.Matter = Matter;
const { Simulation, DT } = await import("../src/physics.js");
const { object, preset, validateScene } = await import("../src/scenes.js");
const { compile } = await import("../src/expressions.js");
const run = (s, t) => {
  for (let i = 0; i < Math.round(t / DT); i++) s.step();
};
const close = (a, b, t = 0.03) => assert.ok(Math.abs(a - b) < t, `${a} ≈ ${b}`);
const blank = (b) => ({
  version: 1,
  title: "Test",
  gravity: 0,
  bodies: b,
  links: [],
});
test("math language supports precedence, exponentiation, functions and variables", () => {
  close(compile("-2^2+2^3^2")({}), 508, 0.001);
  close(compile("sin(pi/2)+sqrt(9)+max(2,4)")({}), 8, 0.001);
  close(compile("2*t+vx")({ t: 3, vx: 2 }), 8, 0.001);
  close(compile("2^-2")({}), 0.25, 0.001);
});
test("math language rejects code, implicit multiplication, unknown symbols and nonfinite results", () => {
  for (const s of [
    "window.location",
    "x=1",
    "constructor(1)",
    "2t",
    "Math.sin(t)",
    "sin(1,2)",
    "1;alert(1)",
    "sin(",
  ])
    assert.throws(() => compile(s));
  assert.throws(() => compile("1/0")({}), /undefined/);
  assert.throws(() => compile("sqrt(-1)")({}), /undefined/);
});
test("constant-acceleration equation produces analytical displacement and velocity", () => {
  const s = new Simulation(preset("Constant acceleration"));
  run(s, 2);
  close(s.state("mover").vx, 4, 0.001);
  close(s.state("mover").x, 5, 0.025);
  close(s.acceleration("mover").x, 2, 0.001);
  s.dispose();
});
test("per-object gravity option prevents double-counting gravity", () => {
  const p = blank([
    object("a", "circle", 0, 100, {
      motion: { type: "acceleration", ax: "0", ay: "-g", gravity: false },
    }),
  ]);
  p.gravity = 9.81;
  const s = new Simulation(p);
  run(s, 1);
  close(s.state("a").vy, -9.81, 0.001);
  s.dispose();
});
test("time-dependent acceleration integrates in SI units", () => {
  const p = blank([
      object("a", "circle", 0, 0, {
        motion: { type: "acceleration", ax: "2*t", ay: "0", gravity: false },
      }),
    ]),
    s = new Simulation(p);
  run(s, 1);
  close(s.state("a").vx, 1, 0.01);
  close(s.state("a").x, 1 / 3, 0.01);
  s.dispose();
});
test("circular-motion equations keep approximately constant radius for one orbit", () => {
  const s = new Simulation(preset("Circular motion"));
  run(s, 2 * Math.PI);
  const b = s.state("mover");
  close(Math.hypot(b.x - 6, b.y - 3), 2, 0.03);
  close(b.x, 8, 0.04);
  close(b.y, 3, 0.04);
  s.dispose();
});
test("hollow ring has collision walls and no solid centre", () => {
  const p = blank([
      object("ring", "ring", 6, 3, { radius: 2, thickness: 0.2, fixed: true }),
    ]),
    s = new Simulation(p);
  assert.equal(s.hit({ x: 6, y: 3 }), undefined);
  assert.equal(s.hit({ x: 7.9, y: 3 })?.id, "ring");
  s.dispose();
});
test("all new shapes produce finite bodies and survive scene round-trip", () => {
  for (const shape of [
    "triangle",
    "ring",
    "arc",
    "trough",
    "half-trough",
    "polygon",
    "stroke",
  ]) {
    const p = blank([
      object("shape", shape, 5, 3, {
        radius: 2,
        thickness: 0.15,
        sweep: 180,
        points: [
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 0 },
        ],
      }),
    ]);
    assert.deepEqual(validateScene(JSON.parse(JSON.stringify(p))), p);
    const s = new Simulation(p);
    run(s, 1);
    for (const n of Object.values(s.state("shape")))
      assert.ok(Number.isFinite(n), shape);
    assert.ok(Number.isFinite(s.bodies.get("shape").inertia));
    s.dispose();
  }
});
test("behaviour extension API adds force without changing integrator", () => {
  const p = blank([object("a", "circle", 0, 0, { mass: 2 })]);
  const s = new Simulation(p, [
    () => ({ id: "test-force", force: () => ({ x: 6, y: 0 }) }),
  ]);
  run(s, 1);
  close(s.state("a").vx, 3, 0.001);
  s.dispose();
});
test("validation rejects degenerate geometry, unsupported behaviours and invalid formulas", () => {
  const p = blank([object("r", "ring", 0, 0, { radius: 1, thickness: 2 })]);
  assert.throws(() => validateScene(p), /thickness/);
  p.bodies = [
    object("p", "polygon", 0, 0, {
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
    }),
  ];
  assert.throws(() => validateScene(p), /area/);
  p.bodies = [
    object("a", "circle", 0, 0, {
      motion: { type: "javascript", ax: "0", ay: "0", gravity: true },
    }),
  ];
  assert.throws(() => validateScene(p), /Unsupported/);
  p.bodies[0].motion = {
    type: "acceleration",
    ax: "evil",
    ay: "0",
    gravity: true,
  };
  assert.throws(() => validateScene(p), /Unknown/);
});
