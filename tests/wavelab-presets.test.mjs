// Every preset of the waves, light & sound page builds, and shows the
// reading its "What to check" names, computed here from the formula.
import { test } from "node:test";
import assert from "node:assert/strict";
import { presets } from "../src/wavelab/presets.js";
import { RayLab, cauchy, MATERIALS, GREEN } from "../src/wavelab/rays.js";
import { WaveLab } from "../src/wavelab/waves.js";
import { SoundLab, speedOfSound, soundLevel, pointIntensity, doppler, passing } from "../src/wavelab/sound.js";

const deg = Math.PI / 180;
const close = (a, b, rel, what) => assert.ok(Math.abs(a - b) <= rel * Math.abs(b), `${what}: ${a} against ${b}`);
const preset = (id) => presets.find((p) => p.id === id);
const rays = (id) => {
  const lab = new RayLab();
  preset(id).build(lab);
  return lab;
};
const imageOf = (lab) => lab.images().find((i) => lab.get(i.source).kind === "object");
const beamsOf = (lab) => lab.images().filter((i) => lab.get(i.source).kind === "beam");

test("presets have ids, titles, a text and what to check, in one of the three views", () => {
  const ids = new Set();
  for (const p of presets) {
    assert.ok(!ids.has(p.id), p.id);
    ids.add(p.id);
    assert.ok(["rays", "waves", "sound"].includes(p.mode), p.id);
    for (const key of ["title", "text", "expect"]) assert.ok(p[key]?.length > 5, `${p.id} ${key}`);
  }
  for (const mode of ["rays", "waves", "sound"]) assert.ok(presets.some((p) => p.mode === mode));
});

test("rays presets: angles", () => {
  let lab = rays("block");
  const [b] = lab.readings(lab.trace(), lab.list().find((i) => i.kind === "ray").id);
  close(b.events[0].incidence / deg, 30, 1e-9, "block incidence");
  close(b.events[0].leaving / deg, Math.asin(Math.sin(30 * deg) / 1.5) / deg, 1e-9, "19.47°");
  assert.ok(b.deviation < 1e-7, "leaves parallel");

  lab = rays("critical");
  const t = lab.trace(),
    [r41, r43] = lab.list().filter((i) => i.kind === "ray").map((r) => lab.readings(t, r.id)[0]);
  // Into the curved face along a radius: no bending there.
  close(r41.events[0].incidence + 1, 1, 1e-9, "radial entry");
  assert.equal(r41.events[1].event, "refract");
  close(r41.events[1].incidence / deg, 41, 1e-9, "41° at the flat face");
  close(r41.events[1].leaving / deg, Math.asin(1.5 * Math.sin(41 * deg)) / deg, 1e-9, "79.8°");
  assert.equal(r43.events[1].event, "tir");
  close(r43.events[1].incidence / deg, 43, 1e-9, "43° at the flat face");
  // And out again along a radius, undeviated by the curved face.
  assert.equal(r43.events[2].event, "refract");
  close(r43.events[2].incidence + 1, 1, 1e-9, "radial exit");

  lab = rays("prism-deviation");
  const [p] = lab.readings(lab.trace(), lab.list().find((i) => i.kind === "ray").id);
  close(p.deviation / deg, (2 * Math.asin(0.75) - 60 * deg) / deg, 1e-9, "37.18°");

  lab = rays("fibre");
  const fibre = lab.trace();
  for (const r of lab.list().filter((i) => i.kind === "ray")) {
    const [reading] = lab.readings(fibre, r.id);
    assert.ok(reading.stopped, "reaches the screen");
    const n = cauchy(MATERIALS.acrylic, GREEN),
      sides = reading.events.filter((e) => e.event === "tir");
    assert.ok(sides.length >= 3, "bounces along the rod");
    for (const e of sides) assert.ok(e.incidence > Math.asin(1 / n), "beyond the critical angle");
  }
});

test("rays preset: dispersion spreads white light, violet most", () => {
  const lab = rays("dispersion"),
    t = lab.trace(),
    hits = t.hits.filter((h) => h.intensity > 0.5);
  assert.equal(new Set(hits.map((h) => h.wavelength)).size, 7, "every colour reaches the screen");
  const ray = lab.list().find((i) => i.kind === "ray"),
    readings = lab.readings(t, ray.id),
    dev = (w) => readings.find((r) => r.wavelength === w).deviation;
  assert.ok(dev(400e-9) > dev(550e-9) && dev(550e-9) > dev(700e-9));
  close(cauchy(MATERIALS.flint, 400e-9), 1.65, 1e-3, "flint at 400 nm");
  close(cauchy(MATERIALS.flint, 700e-9), 1.613, 1e-3, "flint at 700 nm");
});

test("rays presets: images and their formulas", () => {
  for (const [id, v, m, real] of [
    ["converging", 0.15, -0.5, true],
    ["diverging", -0.075, 0.25, false],
    ["concave", 0.3, -0.5, true],
    ["convex", -0.15, 0.25, false],
    ["magnifier", -0.1, 2, false],
  ]) {
    const im = imageOf(rays(id));
    close(im.distance, v, 1e-3, `${id}: v`);
    close(im.magnification, m, 1e-3, `${id}: m`);
    assert.equal(im.real, real, `${id}: real`);
    close(im.formula.distance, v, 1e-9, `${id}: formula v`);
    close(im.formula.magnification, m, 1e-9, `${id}: formula m`);
  }
});

test("rays presets: real lens focal length, telescope, microscope, mirrors", () => {
  let lab = rays("real-lens");
  const n = cauchy(MATERIALS.crown, GREEN),
    f = 1 / ((n - 1) * (1 / 0.2 + 1 / 0.2 - ((n - 1) * 0.012) / (n * 0.04)));
  close(f, 0.195, 3e-3, "0.195 m");
  const [beam] = beamsOf(lab),
    lens = lab.list().find((i) => i.kind === "lens");
  close(beam.formula.focalLength, f, 1e-12, "formula");
  // The paraxial focus lies f beyond the second principal plane, which for
  // this equiconvex lens is h₂ = −f(n − 1)d/(nR₁) from the back vertex.
  const h2 = (-f * (n - 1) * 0.012) / (n * 0.2);
  close(beam.focus.x, lens.x + 0.006 + h2 + f, 1e-3, "back focus");
  assert.ok(beam.marginal.point.x < beam.focus.x - 1e-3, "marginal focus nearer the lens");

  lab = rays("telescope");
  close(beamsOf(lab)[0].angularMagnification, -10, 1e-3, "telescope");

  lab = rays("microscope");
  const objective = new RayLab();
  objective.add("thinLens", { x: 0, y: 0, angle: 0, f: 0.02, aperture: 0.016 });
  objective.add("object", { x: -0.022, y: 0, angle: 0, height: 0.0015 });
  const first = imageOf(objective);
  close(first.distance, 1 / (1 / 0.02 - 1 / 0.022), 1e-3, "objective image 0.220 m");
  close(first.magnification, -10, 1e-3, "objective −10");
  const final = imageOf(lab);
  assert.equal(final.distance, Infinity);
  close(final.angularSize * 0.25, -50, 1e-3, "angular magnification against 25 cm");

  lab = rays("aberration");
  const [sphere, parabola] = beamsOf(lab);
  close(parabola.focus.x, -0.3, 1e-6, "parabola focus");
  close(parabola.marginal.point.x, -0.3, 1e-9, "parabola: marginal rays meet there too");
  close(sphere.focus.x, -0.3, 1e-4, "sphere's paraxial focus R/2");
  assert.ok(sphere.marginal.point.x > -0.3 + 1e-3, "sphere's marginal rays cross nearer the mirror");
});

test("waves presets build and run without blowing up; fringe marks follow the formulas", () => {
  for (const p of presets.filter((q) => q.mode === "waves")) {
    const lab = new WaveLab(p.tank);
    p.build(lab);
    lab.advance(2);
    let worst = 0;
    for (let k = 0; k < lab.u1.length; k += 97) worst = Math.max(worst, Math.abs(lab.u1[k]));
    assert.ok(Number.isFinite(worst) && worst < 50, `${p.id}: field stays finite (${worst})`);
  }
  const lab = new WaveLab(preset("double-slit").tank);
  preset("double-slit").build(lab);
  const screen = lab.list().find((i) => i.kind === "screen"),
    marks = lab.fringes(screen.id);
  assert.equal(marks.kind, "bright");
  // s runs from the screen's −p end; this screen faces −x, so +s is −y.
  const first = marks.list.filter((m) => Math.abs(m.m) === 1).map((m) => Math.abs(m.s));
  close(first[0], 17 * Math.tan(Math.asin(1 / 5)), 0.02, "first fringe ≈ 3.5λ up");
  const single = new WaveLab(preset("single-slit").tank);
  preset("single-slit").build(single);
  const dark = single.fringes(single.list().find((i) => i.kind === "screen").id);
  assert.equal(dark.kind, "dark");
  close(Math.abs(dark.list.find((m) => Math.abs(m.m) === 1).s), 17 * Math.tan(Math.asin(1 / 3)), 1e-6, "first dark fringe");
});

test("sound presets: readings", () => {
  const lab = (id) => {
    const s = new SoundLab(),
      set = preset(id).set;
    s.setMode(set.mode);
    for (const [part, values] of Object.entries(set)) if (part !== "mode") s.set(part, values);
    return s;
  };
  const guitar = lab("guitar").string();
  close(guitar.speed, 264.575, 1e-5, "264.6 m/s");
  close(guitar.frequency(1), 203.519, 1e-5, "203.5 Hz");
  assert.ok(Math.abs(guitar.modes()[4].amplitude) < 1e-18, "5th harmonic missing");
  const open = lab("open-pipe").pipe(3),
    closed = lab("closed-pipe").pipe(3);
  close(open[0].frequency, speedOfSound(20), 1e-12, "open f₁ = v/2L");
  close(closed[0].frequency, speedOfSound(20) / 2, 1e-12, "closed f₁ = v/4L");
  assert.deepEqual(closed.map((m) => m.n), [1, 3, 5]);
  const level = lab("decibels").state.level;
  close(soundLevel(pointIntensity(level.power, level.distance)), 89.0079, 1e-5, "89.0 dB at 1 m");
  const a = lab("approach");
  close(a.speedOf("doppler"), 343, 1e-12, "343.0 m/s");
  close(doppler({ frequency: 500, speed: a.speedOf("doppler"), source: 30 }), 547.92, 1e-4, "547.9 Hz");
  close(doppler({ frequency: 500, speed: a.speedOf("doppler"), source: -30 }), 459.79, 1e-4, "459.8 Hz");
  const amb = lab("ambulance"),
    d = amb.state.doppler,
    run = { frequency: d.frequency, speed: amb.speedOf("doppler"), sourceSpeed: d.sourceSpeed, distance: d.distance, power: 1 };
  close(passing(run, -100).frequency, 755.0, 2e-4, "755.0 Hz approaching");
  close(passing(run, 100).frequency, 652.5, 2e-4, "652.5 Hz receding");
});
