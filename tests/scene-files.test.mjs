// Saving and loading in the fields, orbits, circuits and waves tools: a saved file
// must bring back the same physics, and a bad file must be refused with a
// readable message and leave the current scene alone.
import test from "node:test";
import assert from "node:assert/strict";
import { FieldLab } from "../src/fieldlab/model.js";
import { presets as fieldPresets } from "../src/fieldlab/presets.js";
import { OrbitLab, BODIES, circularSpeed } from "../src/orbitlab/model.js";
import { presets as orbitPresets } from "../src/orbitlab/presets.js";
import { GravityLab } from "../src/orbitlab/nbody.js";
import { sandboxPresets } from "../src/orbitlab/presets.js";
import { CircuitLab } from "../src/circuitlab/model.js";
import { presets as circuitPresets } from "../src/circuitlab/presets.js";
import { RayLab } from "../src/wavelab/rays.js";
import { WaveLab } from "../src/wavelab/waves.js";
import { SoundLab } from "../src/wavelab/sound.js";
import { presets as wavePresets } from "../src/wavelab/presets.js";

const viaFile = (scene) => JSON.parse(JSON.stringify(scene));
const close = (a, b, relative, message) =>
  assert.ok(
    Math.abs(a - b) <= relative * Math.max(Math.abs(a), Math.abs(b), 1e-300),
    `${message || ""} ${a} expected ${b}`,
  );
const OTHERS = {
  sandbox: { format: "physics-sim-scene", version: 1 },
  fields: new FieldLab().exportScene(),
  orbits: new OrbitLab().exportScene(),
  gravity: new GravityLab().exportScene(),
  circuits: new CircuitLab().exportScene(),
  rays: new RayLab().exportScene(),
  waves: new WaveLab({ width: 4, height: 4 }).exportScene(),
  sound: new SoundLab().exportScene(),
};
// Files that are not ours, or are damaged.
const JUNK = [null, 7, "text", [], {}, { format: "something-else" }];

test("fields: every preset survives a save and load with the same field", () => {
  for (const preset of fieldPresets) {
    const lab = new FieldLab();
    preset.build(lab);
    const saved = viaFile(lab.exportScene()),
      copy = FieldLab.fromScene(saved);
    assert.deepEqual(copy.exportScene(), saved, preset.id);
    for (const [x, y] of [
      [0.37, 0.81],
      [-2.2, 1.4],
      [3.1, -0.6],
    ]) {
      assert.deepEqual(copy.electricField(x, y), lab.electricField(x, y));
      assert.deepEqual(copy.magneticField(x, y), lab.magneticField(x, y));
      assert.equal(copy.potential(x, y), lab.potential(x, y));
    }
  }
});
test("fields: both scenes and their background fields are kept", () => {
  const lab = new FieldLab();
  lab.add("charge", { x: 1, y: 2, charge: -3e-9 });
  lab.add("plate", { x: 0, y: -1, length: 4, angle: 0.3, density: 1e-9 });
  lab.add("wire", { x: -2, y: 0, current: -7 });
  lab.add("magnet", { x: 2, y: 1, length: 3, width: 0.5, angle: 1.1 });
  lab.setUniform("electric", { x: 40, y: -25 });
  lab.setUniform("magnetic", { x: 0, y: 3e-5 });
  const saved = viaFile(lab.exportScene()),
    target = new FieldLab();
  target.add("charge", { x: 9, y: 9 });
  target.loadScene(saved);
  assert.deepEqual(target.exportScene(), saved);
  assert.equal(target.list("electric").length, 2);
  assert.equal(target.list("magnetic").length, 2);
  // Ids stay unique in the lab that loaded the file.
  const ids = target.list().map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  // E = kq/r² from the loaded charge, less the background, at 1 m from it.
  const alone = new FieldLab();
  alone.loadScene(
    viaFile({ ...saved, sources: [saved.sources[0]], uniform: undefined }),
  );
  close(Math.hypot(...alone.electricField(2, 2)), 8.9875517923 * 3, 1e-12);
});

test("orbits: a saved flight comes back on the same orbit at the same moment", () => {
  for (const preset of orbitPresets) {
    const lab = new OrbitLab();
    lab.setBody({ key: preset.body, ...BODIES[preset.body] });
    const id = lab.launch(preset.launch(lab.mu, lab.body.radius)),
      period = lab.get(id).elements.period;
    // Part of the way round (or out, for an escape).
    const span = Number.isFinite(period) ? 0.37 * period : 4000;
    for (let t = 0; t < span; ) t += lab.advance(span - t);
    const saved = viaFile(lab.exportScene()),
      copy = OrbitLab.fromScene(saved),
      a = lab.list()[0],
      b = copy.list()[0];
    assert.deepEqual(copy.exportScene(), saved, preset.id);
    assert.deepEqual(copy.body, lab.body);
    close(copy.time, lab.time, 1e-12, preset.id);
    assert.equal(b.status, a.status, preset.id);
    // Same conic exactly; the same place on it to within the integrator's
    // timing error (different step boundaries on the way there).
    close(b.elements.energy, a.elements.energy, 1e-12, preset.id);
    close(
      b.elements.eccentricity + 1,
      a.elements.eccentricity + 1,
      1e-12,
      preset.id,
    );
    const r = Math.hypot(a.x, a.y);
    assert.ok(
      Math.hypot(b.x - a.x, b.y - a.y) < 2e-3 * r,
      `${preset.id}: ${Math.hypot(b.x - a.x, b.y - a.y)} m apart`,
    );
  }
});
test("orbits: several satellites keep their spacing; settings are kept", () => {
  const lab = new OrbitLab();
  lab.setBody({ mass: 3e24, radius: 5e6 });
  lab.setSatelliteMass(250);
  const r = 9e6,
    v = circularSpeed(lab.mu, r),
    T = (2 * Math.PI * r) / v;
  lab.launch({ radius: r, speed: v, angle: 0 });
  for (let t = 0; t < T / 4; ) t += lab.advance(T / 4 - t);
  lab.launch({ radius: r, speed: v, angle: 0 });
  for (let t = 0; t < T / 8; ) t += lab.advance(T / 8 - t);
  const saved = viaFile(lab.exportScene());
  assert.equal(saved.satellites.length, 2);
  const copy = OrbitLab.fromScene(saved),
    [first, second] = copy.list(),
    angle = (s) => Math.atan2(s.x, s.y); // from the launch point
  assert.equal(copy.body.key, "custom");
  assert.equal(copy.satelliteMass, 250);
  // A quarter of a turn apart, as launched; the first is 3/8 of the way.
  close(angle(first) - angle(second), Math.PI / 2, 1e-3);
  close(angle(first), (3 * Math.PI) / 4, 1e-3);
  close(Math.hypot(first.x, first.y), r, 1e-9);
  // Loading into a lab in use replaces what was there.
  const target = new OrbitLab();
  target.launch({ altitude: 4e5, speed: 7600, angle: 0 });
  const report = target.loadScene(saved);
  assert.equal(report.complete, true);
  assert.deepEqual(target.exportScene(), saved);
});
test("orbits: a flight too long to replay still loads, from its launches", () => {
  const lab = new OrbitLab(),
    r = lab.body.radius + 4e5,
    v = circularSpeed(lab.mu, r);
  lab.launch({ radius: r, speed: v, angle: 0 });
  const saved = { ...viaFile(lab.exportScene()), time: 3e9 }; // ≈ 95 years
  const copy = new OrbitLab(),
    report = copy.loadScene(saved, { budget: 2e5 });
  assert.equal(report.complete, false);
  assert.equal(copy.list().length, 1);
  close(Math.hypot(copy.list()[0].x, copy.list()[0].y), r, 1e-9);
});

const readings = (lab) =>
  Object.fromEntries(
    lab
      .list()
      .filter((i) => i.kind !== "wire")
      .map((i) => {
        const r = lab.solve().of(i.id);
        return [i.name, [r.flow, r.voltage, r.power]];
      }),
  );
test("gravity sandbox: a saved system carries on exactly as the original", () => {
  for (const preset of sandboxPresets) {
    const lab = new GravityLab();
    preset.build(lab);
    lab.advance(preset.check / 10);
    const saved = viaFile(lab.exportScene()),
      copy = GravityLab.fromScene(saved);
    assert.deepEqual(copy.exportScene(), saved, preset.id);
    // Same state, same integrator: the two must stay identical.
    lab.advance(preset.check / 10);
    copy.advance(preset.check / 10);
    assert.deepEqual(copy.exportScene(), lab.exportScene(), preset.id);
  }
});

test("circuits: every preset survives a save and load with the same readings", () => {
  for (const preset of circuitPresets) {
    const lab = new CircuitLab();
    preset.build(lab);
    const saved = viaFile(lab.exportScene()),
      copy = CircuitLab.fromScene(saved);
    assert.deepEqual(copy.exportScene(), saved, preset.id);
    assert.equal(copy.solve().status, lab.solve().status, preset.id);
    assert.deepEqual(readings(copy), readings(lab), preset.id);
    // ... and it then runs the same way.
    const span = preset.time ?? 0.5;
    lab.advance(span);
    copy.advance(span);
    assert.deepEqual(readings(copy), readings(lab), preset.id + " later");
    close(copy.time + 1, lab.time + 1, 1e-12);
  }
});
test("circuits: names, switch positions and starting charge are kept", () => {
  const lab = new CircuitLab();
  lab.add("cell", { x: 0, y: 2, rot: 3, emf: 9, internal: 0.5 });
  const gone = lab.add("resistor", { x: 9, y: 9, resistance: 1 });
  lab.wire([0, 3], [0, 4], [1, 4]);
  lab.add("resistor", { x: 2, y: 4, resistance: 33 });
  lab.add("switch", { x: 4, y: 4, closed: true });
  lab.add("capacitor", {
    x: 6,
    y: 4,
    capacitance: 2e-6,
    initialVoltage: 3,
  });
  lab.wire([7, 4], [8, 4], [8, 0], [0, 0], [0, 1]);
  lab.remove(gone); // leaves R2 as the only resistor
  const names = lab
      .list()
      .filter((i) => i.kind !== "wire")
      .map((i) => i.name),
    saved = viaFile(lab.exportScene()),
    copy = CircuitLab.fromScene(saved),
    byName = (l, name) => l.list().find((i) => i.name === name);
  assert.deepEqual(names, ["E1", "R2", "S1", "C1"]);
  assert.deepEqual(
    copy
      .list()
      .filter((i) => i.kind !== "wire")
      .map((i) => i.name),
    names,
  );
  assert.equal(byName(copy, "S1").closed, true);
  assert.equal(byName(copy, "C1").voltage, 3);
  assert.equal(copy.time, 0);
  // At the first instant the capacitor still holds 3 V:
  // I = (9 − 3) / (33 + 0.5).
  close(copy.solve().of(byName(copy, "R2").id).flow, 6 / 33.5, 1e-12);
  // A part added after loading does not reuse a name.
  const added = copy.add("resistor", { x: 20, y: 20 });
  assert.equal(copy.get(added).name, "R3");
  // A file saved part-way through a run loads at its start.
  lab.advance(1e-4);
  assert.notEqual(byName(lab, "C1").voltage, 3);
  assert.equal(
    byName(CircuitLab.fromScene(viaFile(lab.exportScene())), "C1").voltage,
    3,
  );
});

test("a file from another tool, or not ours at all, is refused readably", () => {
  const tools = {
    fields: (data) => new FieldLab().loadScene(data),
    orbits: (data) => new OrbitLab().loadScene(data),
    gravity: (data) => new GravityLab().loadScene(data),
    circuits: (data) => new CircuitLab().loadScene(data),
  };
  for (const [tool, load] of Object.entries(tools)) {
    for (const junk of JUNK)
      assert.throws(() => load(junk), /not a Physium scene/, tool);
    for (const [other, file] of Object.entries(OTHERS)) {
      if (other === tool) continue;
      assert.throws(() => load(file), /saved from the .+ tool/, tool);
    }
    assert.throws(
      () => load({ ...OTHERS[tool], version: 2 }),
      /newer version/,
      tool,
    );
  }
});
test("a damaged file changes nothing in the scene that was open", () => {
  const fields = new FieldLab();
  fields.add("charge", { x: 1, y: 1 });
  const fieldsBefore = fields.exportScene();
  for (const bad of [
    { sources: "many" },
    { sources: [{ kind: "charge", x: 0, y: 0 }, { kind: "antenna" }] },
    { sources: [{ kind: "charge", x: 0, y: 0, charge: 5 }] },
    { sources: [null] },
    { uniform: { electric: { x: 1e9, y: 0 } } },
  ]) {
    assert.throws(() => fields.loadScene({ ...fieldsBefore, ...bad }), Error);
    assert.deepEqual(fields.exportScene(), fieldsBefore);
  }
  const gravity = new GravityLab();
  gravity.add({ name: "Sun", mass: 2e30, radius: 7e8, x: 0, y: 0 });
  gravity.add({
    name: "Earth",
    mass: 6e24,
    radius: 6.4e6,
    x: 1.5e11,
    y: 0,
    vy: 3e4,
  });
  const gravityBefore = gravity.exportScene();
  for (const bad of [
    { bodies: "many" },
    { bodies: [gravityBefore.bodies[0], { mass: -1, radius: 1, x: 0, y: 0 }] },
    { bodies: [gravityBefore.bodies[0], { ...gravityBefore.bodies[0] }] },
    { bodies: [null] },
    { time: -5 },
  ]) {
    assert.throws(() => gravity.loadScene({ ...gravityBefore, ...bad }), Error);
    assert.deepEqual(gravity.exportScene(), gravityBefore);
  }
  const orbits = new OrbitLab();
  orbits.launch({ altitude: 4e5, speed: 7600, angle: 0 });
  const orbitsBefore = orbits.exportScene(),
    sat = orbitsBefore.satellites[0];
  for (const bad of [
    { body: null },
    { body: { mass: 5, radius: 6e6 } },
    { satelliteMass: -1 },
    { satellites: {} },
    { satellites: [{ ...sat, speed: 9e9 }] },
    { satellites: [{ ...sat, radius: 10 }] },
    { satellites: [{ ...sat, launchedAt: -5 }] },
    { satellites: Array(20).fill(sat) },
    { time: "soon" },
  ]) {
    assert.throws(() => orbits.loadScene({ ...orbitsBefore, ...bad }), Error);
    assert.deepEqual(orbits.exportScene(), orbitsBefore);
  }
  const circuit = new CircuitLab();
  circuitPresets[0].build(circuit);
  const circuitBefore = circuit.exportScene();
  for (const bad of [
    { items: 3 },
    { items: [{ kind: "transistor" }] },
    { items: [{ kind: "resistor", x: 0, y: 0, resistance: -4 }] },
    { items: [{ kind: "resistor", x: 0.5, y: 0 }] },
    { items: [undefined] },
  ]) {
    assert.throws(() => circuit.loadScene({ ...circuitBefore, ...bad }), Error);
    assert.deepEqual(circuit.exportScene(), circuitBefore);
  }
});

// The waves, light & sound page saves one file per view, each in its own
// format.
const buildWave = (p) => {
  if (p.mode === "rays") {
    const lab = new RayLab();
    p.build(lab);
    return lab;
  }
  if (p.mode === "waves") {
    const lab = new WaveLab(p.tank);
    p.build(lab);
    return lab;
  }
  const lab = new SoundLab();
  lab.setMode(p.set.mode);
  for (const [part, values] of Object.entries(p.set)) if (part !== "mode") lab.set(part, values);
  return lab;
};
const MODELS = { rays: RayLab, waves: WaveLab, sound: SoundLab };

test("waves tool: every preset survives a save and load with the same physics", () => {
  for (const p of wavePresets) {
    const lab = buildWave(p),
      saved = viaFile(lab.exportScene()),
      copy = MODELS[p.mode].fromScene(saved);
    assert.deepEqual(copy.exportScene(), saved, p.id);
    if (p.mode === "rays") {
      assert.deepEqual(copy.trace().segments, lab.trace().segments, p.id);
      assert.deepEqual(copy.images(), lab.images(), p.id);
    } else if (p.mode === "waves") {
      lab.reset();
      lab.advance(1);
      copy.advance(1);
      for (const [x, y] of [
        [0.37, 0.81],
        [-2.2, 1.4],
      ])
        assert.equal(copy.value(x, y), lab.value(x, y), p.id);
    } else assert.deepEqual(copy.state, lab.state, p.id);
  }
});

test("waves tool: files from other tools and views, junk and damage are refused, and the scene is kept", () => {
  for (const [mode, Model] of Object.entries(MODELS)) {
    const lab = buildWave(wavePresets.find((p) => p.mode === mode)),
      before = lab.exportScene();
    for (const [name, other] of Object.entries(OTHERS)) {
      if (name === mode) continue;
      assert.throws(() => lab.loadScene(other), Error, `${mode} refuses ${name}`);
    }
    for (const junk of JUNK) assert.throws(() => lab.loadScene(junk), Error);
    const damaged =
      mode === "rays"
        ? [{ items: 3 }, { items: [{ kind: "laser" }] }, { items: [{ kind: "lens", R1: 0.2, R2: -0.2, thickness: 0, aperture: 0.3 }] }, { medium: 0.5 }]
        : mode === "waves"
          ? [{ tank: null }, { tank: { ...before.tank, cell: 0.2 } }, { items: [{ kind: "medium", index: 9 }] }, { items: [{ kind: "point", frequency: 3 }] }]
          : [{ mode: "laser" }, { string: { tension: -1 } }, { pipe: { ends: "closed", harmonic: 2 } }, { beats: 4 }];
    for (const bad of damaged) {
      assert.throws(() => lab.loadScene({ ...before, ...bad }), Error, `${mode} ${JSON.stringify(bad)}`);
      assert.deepEqual(lab.exportScene(), before, `${mode} kept`);
    }
  }
  // A file from another view names it.
  assert.throws(() => new RayLab().loadScene(new SoundLab().exportScene()), /Sound view/);
});
