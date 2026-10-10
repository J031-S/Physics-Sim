// Field lab: every result is checked against the textbook formula, not
// against what the model currently outputs.
import test from "node:test";
import assert from "node:assert/strict";
import {
  FieldLab,
  K_E,
  EPS0,
  MU0,
  electricFieldLines,
  equipotentialLines,
  magneticFieldLines,
  contourLines,
} from "../src/fieldlab/model.js";
import { presets } from "../src/fieldlab/presets.js";

const nC = 1e-9;
const close = (actual, expected, relative, message) =>
  assert.ok(
    Math.abs(actual - expected) <= relative * Math.abs(expected),
    `${message || "value"}: got ${actual}, expected ${expected} ± ${relative * 100}%`,
  );
const near = (actual, expected, absolute, message) =>
  assert.ok(
    Math.abs(actual - expected) <= absolute,
    `${message || "value"}: got ${actual}, expected ${expected} ± ${absolute}`,
  );
const BOUNDS = { minX: -8, maxX: 8, minY: -6, maxY: 6 };

test("point charge: E = kq/r² radially, V = kq/r", () => {
  const lab = new FieldLab();
  lab.add("charge", { x: 1, y: -2, charge: 3 * nC });
  for (const [dx, dy] of [
    [2, 0],
    [0, -0.5],
    [-3, 4],
  ]) {
    const r = Math.hypot(dx, dy),
      e = lab.electricField(1 + dx, -2 + dy);
    close(Math.hypot(e[0], e[1]), (K_E * 3 * nC) / r ** 2, 1e-9, "|E|");
    // Radially outward from a positive charge.
    near((e[0] * dy - e[1] * dx) / Math.hypot(e[0], e[1]), 0, 1e-9, "radial");
    assert.ok(e[0] * dx + e[1] * dy > 0);
    close(lab.potential(1 + dx, -2 + dy), (K_E * 3 * nC) / r, 1e-9, "V");
  }
  // Inverse square: twice as far, a quarter of the field.
  const a = lab.electricField(2, -2)[0],
    b = lab.electricField(3, -2)[0];
  close(a / b, 4, 1e-9, "inverse square");
});

test("superposition: dipole midpoint, like-charge null, unequal-charge null", () => {
  const dipole = new FieldLab();
  dipole.add("charge", { x: -1.5, charge: 2 * nC });
  dipole.add("charge", { x: 1.5, charge: -2 * nC });
  const e = dipole.electricField(0, 0);
  close(e[0], (2 * K_E * 2 * nC) / 1.5 ** 2, 1e-9, "dipole midpoint");
  near(e[1], 0, 1e-12);
  near(dipole.potential(0, 0.7), 0, 1e-9, "V on the centre line");

  const like = new FieldLab();
  like.add("charge", { x: -1.5, charge: 2 * nC });
  like.add("charge", { x: 1.5, charge: 2 * nC });
  near(Math.hypot(...like.electricField(0, 0)), 0, 1e-12, "null point");
  close(like.potential(0, 0), (2 * K_E * 2 * nC) / 1.5, 1e-9, "V at null");

  // +4q and −q a distance d apart: E = 0 a further d beyond the −q.
  const unequal = new FieldLab();
  unequal.add("charge", { x: -1, charge: 4 * nC });
  unequal.add("charge", { x: 1, charge: -1 * nC });
  near(Math.hypot(...unequal.electricField(3, 0)), 0, 1e-12, "null point");
});

test("E = −∇V for charges, plates and a background field together", () => {
  const lab = new FieldLab();
  lab.add("charge", { x: -1, y: 0.5, charge: 2 * nC });
  lab.add("charge", { x: 2, y: -1, charge: -3 * nC });
  lab.add("plate", { x: 0.5, y: 2, length: 3, angle: 0.4, density: 0.5 * nC });
  lab.setUniform("electric", { x: 3, y: -2 });
  const h = 1e-5;
  for (const [x, y] of [
    [0.3, 0.2],
    [-2, -2],
    [1.1, 2.9],
    [3, 1],
  ]) {
    const e = lab.electricField(x, y),
      gx = (lab.potential(x + h, y) - lab.potential(x - h, y)) / (2 * h),
      gy = (lab.potential(x, y + h) - lab.potential(x, y - h)) / (2 * h);
    near(e[0], -gx, 1e-5 * Math.hypot(e[0], e[1]), "Ex");
    near(e[1], -gy, 1e-5 * Math.hypot(e[0], e[1]), "Ey");
  }
});

test("charged plate: σ/2ε₀ close to it, Gauss's law around it", () => {
  const lab = new FieldLab(),
    sigma = 0.4 * nC;
  lab.add("plate", { x: 0, y: 0, length: 20, density: sigma });
  // 1 cm from the middle of a 20 m plate is as good as infinite.
  close(lab.electricField(0, 0.01)[1], sigma / (2 * EPS0), 1e-3, "above");
  close(lab.electricField(0, -0.01)[1], -sigma / (2 * EPS0), 1e-3, "below");
  // Flux out of a box round a 2 m plate, per metre of depth: λ/ε₀ = σL/ε₀.
  const small = new FieldLab();
  small.add("plate", {
    x: 0.2,
    y: -0.1,
    length: 2,
    angle: 0.7,
    density: sigma,
  });
  let flux = 0;
  const n = 4000,
    box = 3;
  for (let i = 0; i < n; i++) {
    const t = -box + ((i + 0.5) / n) * 2 * box,
      d = (2 * box) / n;
    flux += small.electricField(box, t)[0] * d;
    flux -= small.electricField(-box, t)[0] * d;
    flux += small.electricField(t, box)[1] * d;
    flux -= small.electricField(t, -box)[1] * d;
  }
  close(flux, (sigma * 2) / EPS0, 1e-5, "Gauss");
});

test("parallel plates: uniform σ/ε₀ inside, cancelling outside, V = Ed", () => {
  const lab = new FieldLab(),
    sigma = 0.2 * nC,
    gap = 0.2;
  lab.add("plate", { x: 0, y: gap / 2, length: 20, density: sigma });
  lab.add("plate", { x: 0, y: -gap / 2, length: 20, density: -sigma });
  const ideal = sigma / EPS0;
  for (const [x, y] of [
    [0, 0],
    [1.5, 0.05],
    [-3, -0.08],
  ]) {
    const e = lab.electricField(x, y);
    close(e[1], -ideal, 0.01, "field between the plates");
    near(e[0], 0, 0.01 * ideal, "no sideways field");
  }
  near(Math.hypot(...lab.electricField(0, 0.5)), 0, 0.01 * ideal, "outside");
  close(
    lab.potential(0, gap / 2) - lab.potential(0, -gap / 2),
    ideal * gap,
    0.01,
    "V = Ed",
  );
});

test("straight wire: B = μ₀I/2πr, anticlockwise round current out of the screen", () => {
  const lab = new FieldLab();
  lab.add("wire", { x: 0.5, y: 1, current: 10 });
  for (const [dx, dy] of [
    [1, 0],
    [0, 2],
    [-0.3, -0.4],
  ]) {
    const r = Math.hypot(dx, dy),
      b = lab.magneticField(0.5 + dx, 1 + dy);
    close(Math.hypot(b[0], b[1]), (MU0 * 10) / (2 * Math.PI * r), 1e-9, "|B|");
    near(b[0] * dx + b[1] * dy, 0, 1e-18, "tangential");
    // Anticlockwise: r × B points out of the screen.
    assert.ok(dx * b[1] - dy * b[0] > 0);
  }
  close(lab.magneticField(1.5, 1)[1], 2e-6, 1e-6, "2 µT at 1 m from 10 A");
  lab.update(1, { current: -10 });
  assert.ok(
    lab.magneticField(1.5, 1)[1] < 0,
    "reversed current, reversed field",
  );
});

test("B = curl A, and Ampère's law for wires and a magnet", () => {
  const lab = new FieldLab();
  lab.add("wire", { x: -1, y: 0, current: 8 });
  lab.add("wire", { x: 5, y: 0, current: 30 });
  lab.add("magnet", {
    x: 0.5,
    y: 0.5,
    length: 2,
    width: 0.5,
    angle: 0.3,
    sheetCurrent: 40,
  });
  lab.setUniform("magnetic", { x: 2e-6, y: -1e-6 });
  const h = 1e-5;
  for (const [x, y] of [
    [0.2, -1],
    [0.5, 0.5],
    [2, 2],
  ]) {
    const b = lab.magneticField(x, y),
      ay =
        (lab.vectorPotential(x, y + h) - lab.vectorPotential(x, y - h)) /
        (2 * h),
      ax =
        (lab.vectorPotential(x + h, y) - lab.vectorPotential(x - h, y)) /
        (2 * h);
    near(b[0], ay, 1e-5 * Math.hypot(b[0], b[1]), "Bx = ∂A/∂y");
    near(b[1], -ax, 1e-5 * Math.hypot(b[0], b[1]), "By = −∂A/∂x");
  }
  // ∮B·dl anticlockwise round a box that holds the 8 A wire and the whole
  // magnet (whose two current sheets cancel), but not the 30 A wire.
  let circulation = 0;
  const n = 4000,
    box = 3;
  for (let i = 0; i < n; i++) {
    const t = -box + ((i + 0.5) / n) * 2 * box,
      d = (2 * box) / n;
    circulation += lab.magneticField(t, -box)[0] * d;
    circulation += lab.magneticField(box, t)[1] * d;
    circulation -= lab.magneticField(t, box)[0] * d;
    circulation -= lab.magneticField(-box, t)[1] * d;
  }
  close(circulation, MU0 * 8, 1e-5, "Ampère");
});

test("long solenoid: B = μ₀nI inside along the axis, half at the ends, none outside", () => {
  const lab = new FieldLab(),
    k = 100;
  lab.add("magnet", { x: 0, y: 0, length: 20, width: 0.2, sheetCurrent: k });
  for (const y of [0, 0.05, -0.08]) {
    const b = lab.magneticField(0, y);
    close(b[0], MU0 * k, 0.01, "interior field");
    near(b[1], 0, 0.01 * MU0 * k);
  }
  close(lab.magneticField(10, 0)[0], (MU0 * k) / 2, 0.01, "half at the end");
  near(Math.hypot(...lab.magneticField(0, 0.5)), 0, 0.01 * MU0 * k, "outside");
  // The field leaves the north end (+x for positive current) and reverses
  // with the current.
  assert.ok(lab.magneticField(10.5, 0)[0] > 0);
  lab.update(1, { sheetCurrent: -k });
  assert.ok(lab.magneticField(0, 0)[0] < 0);
});

test("forces: Coulomb's law and the force between parallel wires", () => {
  const e = new FieldLab();
  const a = e.add("charge", { x: 0, y: 0, charge: 2 * nC }),
    b = e.add("charge", { x: 3, y: 4, charge: -5 * nC });
  const fa = e.forceOn(a),
    fb = e.forceOn(b),
    expected = (K_E * 2 * nC * 5 * nC) / 25;
  close(Math.hypot(fa.x, fa.y), expected, 1e-9, "Coulomb");
  near(fa.x + fb.x, 0, 1e-20, "Newton's third law");
  near(fa.y + fb.y, 0, 1e-20);
  assert.ok(fa.x > 0 && fa.y > 0, "opposite charges attract");
  e.setUniform("electric", { x: 0, y: 50 });
  e.remove(b);
  close(e.forceOn(a).y, 2 * nC * 50, 1e-9, "F = qE");

  const m = new FieldLab();
  const w1 = m.add("wire", { x: -1, current: 10 }),
    w2 = m.add("wire", { x: 1, current: 10 });
  close(m.forceOn(w1).x, (MU0 * 100) / (2 * Math.PI * 2), 1e-9, "attract");
  close(m.forceOn(w2).x, -(MU0 * 100) / (2 * Math.PI * 2), 1e-9);
  m.update(w2, { current: -10 });
  assert.ok(m.forceOn(w1).x < 0, "opposite currents repel");
  // F/ℓ = BI, perpendicular to both: current out, field right, force up.
  const motor = new FieldLab();
  const w = motor.add("wire", { current: 10 });
  motor.setUniform("magnetic", { x: 2e-6, y: 0 });
  close(motor.forceOn(w).y, 20e-6, 1e-9, "BIℓ");
  near(motor.forceOn(w).x, 0, 1e-18);
});

test("electric field lines: count follows charge, and each line follows E", () => {
  const lab = new FieldLab();
  lab.add("charge", { x: 0, y: 0, charge: 2 * nC });
  let lines = electricFieldLines(lab, BOUNDS, { linesPerNC: 8 });
  assert.equal(lines.length, 16);
  for (const line of lines) {
    // Straight and radial for a lone charge.
    const [x0, y0] = line[0],
      [x1, y1] = line.at(-1),
      mid = line[Math.floor(line.length / 2)];
    near(x0 * y1 - y0 * x1, 0, 1e-9, "radial");
    near(mid[0] * y1 - mid[1] * x1, 0, 1e-9, "straight");
    assert.ok(Math.hypot(x1, y1) > Math.hypot(x0, y0), "ordered outwards");
  }
  lab.update(1, { charge: -2 * nC });
  lines = electricFieldLines(lab, BOUNDS, { linesPerNC: 8 });
  assert.equal(lines.length, 16);
  for (const line of lines)
    assert.ok(
      Math.hypot(...line.at(-1)) < Math.hypot(...line[0]),
      "ordered along E, into a negative charge",
    );

  // +4 nC and −1 nC: four times as many lines leave as arrive.
  const two = new FieldLab();
  two.add("charge", { x: -1, charge: 4 * nC });
  two.add("charge", { x: 1, charge: -1 * nC });
  lines = electricFieldLines(two, BOUNDS, { linesPerNC: 8, startRadius: 0.05 });
  const leaving = lines.filter(
      (l) => Math.hypot(l[0][0] + 1, l[0][1]) < 0.06,
    ).length,
    arriving = lines.filter(
      (l) => Math.hypot(l.at(-1)[0] - 1, l.at(-1)[1]) < 0.06,
    ).length;
  assert.equal(leaving, 32);
  // A quarter of the flux of +4 nC ends on −1 nC: the cone within 60° of the
  // line joining them, since (1 − cos 60°)/2 = 1/4. Lines leave every
  // 11.25°, so the ones at 0°, ±11.25°, … ±56.25° arrive: eleven.
  assert.equal(arriving, 11);
  // Every segment of every line is parallel to the local field.
  const e = [0, 0];
  let worst = 0;
  for (const line of lines)
    for (let i = 2; i < line.length - 2; i++) {
      const dx = line[i + 1][0] - line[i][0],
        dy = line[i + 1][1] - line[i][1];
      two.electricField(
        (line[i][0] + line[i + 1][0]) / 2,
        (line[i][1] + line[i + 1][1]) / 2,
        0,
        e,
      );
      const sine =
        (dx * e[1] - dy * e[0]) / (Math.hypot(dx, dy) * Math.hypot(e[0], e[1]));
      worst = Math.max(worst, Math.abs(sine));
      assert.ok(dx * e[0] + dy * e[1] > 0, "points along E");
    }
  assert.ok(worst < 0.02, `lines stay tangent to E (worst sine ${worst})`);
});

test("electric field lines: evenly spaced and straight between parallel plates", () => {
  const lab = new FieldLab(),
    sigma = 0.2 * nC;
  lab.add("plate", { x: 0, y: 0.5, length: 6, density: sigma });
  lab.add("plate", { x: 0, y: -0.5, length: 6, density: -sigma });
  const lines = electricFieldLines(lab, BOUNDS, { linesPerNC: 8 }),
    inside = lines
      .filter(
        (l) =>
          Math.abs(l[0][1] - 0.5) < 1e-9 &&
          Math.abs(l.at(-1)[1] + 0.5) < 1e-9 &&
          l.every((p) => Math.abs(p[1]) <= 0.5 + 1e-9),
      )
      .map((l) => l)
      .sort((a, b) => a[0][0] - b[0][0]);
  // Flux per line is 1 nC / (16 ε₀) per metre of depth, so the spacing in a
  // field E is that over E.
  const quantum = nC / (EPS0 * 16),
    field = Math.abs(lab.electricField(0, 0)[1]);
  assert.ok(inside.length >= 14, `lines between the plates: ${inside.length}`);
  const middle = inside.filter((l) => Math.abs(l[0][0]) < 1.5);
  for (let i = 1; i < middle.length; i++)
    close(
      middle[i][0][0] - middle[i - 1][0][0],
      quantum / field,
      0.05,
      "spacing",
    );
  for (const l of middle)
    near(l.at(-1)[0], l[0][0], 0.01, "vertical in the uniform region");
  // No line is drawn twice: starts on the positive plate are distinct.
  const starts = inside.map((l) => l[0][0]);
  for (let i = 1; i < starts.length; i++)
    assert.ok(starts[i] - starts[i - 1] > 0.5 * (quantum / field));
});

test("contours: a circle comes back as one closed loop of the right radius", () => {
  const nx = 81,
    ny = 81,
    values = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++)
      values[j * nx + i] = Math.hypot(i - 40, j - 40);
  const lines = contourLines(values, nx, ny, 25);
  assert.equal(lines.length, 1);
  const loop = lines[0];
  assert.deepEqual(loop[0], loop.at(-1), "closed");
  for (const [x, y] of loop) near(Math.hypot(x - 40, y - 40), 25, 0.02);
});

test("magnetic field lines: closed circles round a wire, equal flux between neighbours", () => {
  const lab = new FieldLab();
  lab.add("wire", { x: 0, y: 0, current: 10 });
  const { lines, step } = magneticFieldLines(lab, BOUNDS, {
    cell: 0.04,
    count: 12,
    coreRadius: 0.2,
  });
  const radii = [];
  for (const line of lines) {
    const r = line.map((p) => Math.hypot(p[0], p[1])),
      mean = r.reduce((a, b) => a + b) / r.length;
    if (mean > 5.5) continue; // cut by the edge of the region
    for (const v of r) close(v, mean, 0.01, "circular");
    assert.deepEqual(line[0], line.at(-1), "closed");
    // Anticlockwise round current out of the screen.
    let area = 0;
    for (let i = 1; i < line.length; i++)
      area += line[i - 1][0] * line[i][1] - line[i][0] * line[i - 1][1];
    assert.ok(area > 0, "anticlockwise");
    radii.push(mean);
  }
  assert.ok(radii.length >= 6);
  radii.sort((a, b) => a - b);
  // Flux between radii a and b per metre is (μ₀I/2π) ln(b/a) = one step.
  for (let i = 1; i < radii.length; i++)
    close(
      ((MU0 * 10) / (2 * Math.PI)) * Math.log(radii[i] / radii[i - 1]),
      step,
      0.03,
      "equal flux",
    );
});

test("magnetic field lines run north to south outside a magnet and back inside", () => {
  const lab = new FieldLab();
  lab.add("magnet", { x: 0, y: 0, length: 2, width: 0.6, sheetCurrent: 50 });
  const { lines } = magneticFieldLines(lab, BOUNDS, { cell: 0.04 }),
    b = [0, 0];
  assert.ok(lines.length > 5);
  for (const line of lines)
    for (let i = 0; i < line.length - 1; i++) {
      const dx = line[i + 1][0] - line[i][0],
        dy = line[i + 1][1] - line[i][1],
        mx = (line[i][0] + line[i + 1][0]) / 2,
        my = (line[i][1] + line[i + 1][1]) / 2;
      // B turns sharply across the magnet's two faces (the current sheets),
      // so a segment that straddles one has no single direction to match.
      if (Math.abs(Math.abs(my) - 0.3) < 0.05 && Math.abs(mx) < 1.05) continue;
      lab.magneticField(mx, my, 0, b);
      const cosine =
        (dx * b[0] + dy * b[1]) / (Math.hypot(dx, dy) * Math.hypot(b[0], b[1]));
      assert.ok(cosine > 0.95, `ordered along B (cosine ${cosine})`);
    }
  assert.ok(lab.magneticField(1.5, 0)[0] > 0, "out of the north end");
  assert.ok(lab.magneticField(0, 1)[0] < 0, "back along the outside");
  assert.ok(lab.magneticField(0, 0)[0] > 0, "south to north inside");
});

test("equipotentials: circles round a charge at round-number steps", () => {
  const lab = new FieldLab();
  lab.add("charge", { x: 0, y: 0, charge: 2 * nC });
  const { lines, step } = equipotentialLines(lab, BOUNDS, { cell: 0.04 });
  assert.ok(lines.length >= 5);
  const mantissa = step / 10 ** Math.floor(Math.log10(step));
  assert.ok(
    [1, 2, 5].some((m) => Math.abs(mantissa - m) < 1e-9),
    "round step",
  );
  for (const { level, points } of lines) {
    near(level / step, Math.round(level / step), 1e-9, "multiple of the step");
    const expected = (K_E * 2 * nC) / level;
    if (expected > 5.5) continue;
    for (const [x, y] of points)
      close(Math.hypot(x, y), expected, 0.01, "r = kq/V");
  }
});

test("validation is atomic and readable", () => {
  const lab = new FieldLab(),
    id = lab.add("plate", { x: 1, y: 2 });
  assert.throws(
    () => lab.update(id, { x: 5, length: 500 }),
    /Length must be between/,
  );
  assert.equal(lab.get(id).x, 1, "nothing applied from a rejected patch");
  assert.throws(() => lab.update(id, { density: NaN }), /must be a number/);
  assert.throws(() => lab.update(id, { current: 1 }), /has no "current"/);
  assert.throws(
    () => lab.add("charge", { charge: 1 }),
    /Charge must be between −20 nC and 20 nC/,
  );
  assert.throws(() => lab.setUniform("electric", { x: 5000, y: 0 }), /between/);
  assert.throws(() => lab.add("quark"), /Unknown/);
  assert.equal(lab.list().length, 1);
  // The two scenes are independent.
  lab.add("wire", {});
  assert.equal(lab.list("electric").length, 1);
  assert.equal(lab.list("magnetic").length, 1);
  lab.clear("electric");
  assert.equal(lab.list().length, 1);
});

test("presets build, and the numbers their descriptions quote are right", () => {
  const built = {};
  for (const preset of presets) {
    const lab = new FieldLab();
    preset.build(lab);
    assert.ok(lab.list(preset.mode).length > 0, preset.id);
    assert.equal(lab.list().length, lab.list(preset.mode).length, preset.id);
    built[preset.id] = lab;
  }
  const E = (id, x, y) => Math.hypot(...built[id].electricField(x, y)),
    B = (id, x, y) => Math.hypot(...built[id].magneticField(x, y));
  close(E("single-charge", 1, 0), 18, 0.005);
  close(E("single-charge", 0, 2), 4.5, 0.005);
  close(E("dipole", 0, 0), 16, 0.005);
  close(built["like-charges"].potential(0, 0), 24, 0.005);
  near(E("unequal-charges", 3, 0), 0, 1e-9);
  close(E("parallel-plates", 0, 0), 20, 0.02);
  close(
    built["parallel-plates"].potential(0, 0.5) -
      built["parallel-plates"].potential(0, -0.5),
    20,
    0.02,
  );
  close(E("parallel-plates", 0, 1.5), 2, 0.1);
  near(E("charge-in-field", -1.34, 0), 0, 0.05);
  near(E("quadrupole", 0, 0), 0, 1e-9);
  near(built.quadrupole.potential(0.4, 0), 0, 1e-9);
  close(B("single-wire", 1, 0), 2e-6, 1e-6);
  close(B("single-wire", 0, 2), 1e-6, 1e-6);
  near(B("parallel-currents", 0, 0), 0, 1e-15);
  close(Math.abs(built["parallel-currents"].forceOn(1).x), 10e-6, 1e-6);
  close(built["opposite-currents"].magneticField(0, 0)[1], 4e-6, 1e-6);
  close(B("solenoid", 0, 0), 58e-6, 0.01);
  close(B("solenoid", 4, 0), 30e-6, 0.02);
  close(B("solenoid", 0, 1), 5e-6, 0.1);
  close(built["wire-in-field"].forceOn(1).y, 20e-6, 1e-6);
});
