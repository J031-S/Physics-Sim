// Waves view of the waves, light & sound tool: the 2D scalar wave equation
// on a grid, checked against the formulas for speed, standing waves,
// refraction, interference, diffraction, absorption, Doppler, shock cones
// and energy. Lengths are in wavelengths of a 1 Hz wave at 1 m/s (λ = 1 m),
// which is how the page sets its tank up; the grid is scale-free.
import { test } from "node:test";
import assert from "node:assert/strict";
import { WaveLab } from "../src/wavelab/waves.js";

const deg = Math.PI / 180;
const within = (actual, expected, allowed, what) =>
  assert.ok(
    Math.abs(actual - expected) <= allowed,
    `${what}: measured ${actual}, expected ${expected} ± ${allowed}`,
  );

// Complex amplitude of the field at each point at frequency f, over a whole
// number of periods (a lock-in amplifier): [re, im] with u ≈ re cos ωt +
// im sin ωt.
function lockIn(lab, points, f, periods) {
  const w = 2 * Math.PI * f,
    per = Math.round(1 / f / lab.dt);
  assert.ok(Math.abs(per * lab.dt * f - 1) < 1e-9, "whole steps per period");
  const sums = points.map(() => [0, 0]),
    n = per * periods;
  for (let k = 0; k < n; k++) {
    lab.step();
    const c = Math.cos(w * lab.time),
      s = Math.sin(w * lab.time);
    points.forEach((p, i) => {
      const u = lab.value(p.x, p.y);
      sums[i][0] += (2 * u * c) / n;
      sums[i][1] += (2 * u * s) / n;
    });
  }
  return sums;
}
const phaseOf = ([re, im]) => Math.atan2(im, re);
// Unwrapped phase along a list of complex amplitudes.
function unwrap(list) {
  const out = [phaseOf(list[0])];
  for (let i = 1; i < list.length; i++) {
    let d = phaseOf(list[i]) - phaseOf(list[i - 1]);
    d -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
    out.push(out[i - 1] + d);
  }
  return out;
}
const slope = (xs, ys) => {
  const n = xs.length,
    mx = xs.reduce((a, b) => a + b) / n,
    my = ys.reduce((a, b) => a + b) / n;
  let sxy = 0,
    sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  return sxy / sxx;
};
// Wavelength along a direction from the phase of a plane wave.
function measuredWavelength(lab, from, dir, length, f) {
  const xs = [],
    pts = [];
  for (let s = 0; s <= length; s += 0.05) {
    xs.push(s);
    pts.push({ x: from.x + dir.x * s, y: from.y + dir.y * s });
  }
  const k = Math.abs(slope(xs, unwrap(lockIn(lab, pts, f, 2))));
  return (2 * Math.PI) / k;
}
// Position of the extreme of a sampled curve near index i, by a parabola
// through it and its neighbours.
const vertex = (xs, ys, i) => {
  const a = ys[i - 1],
    b = ys[i],
    c = ys[i + 1],
    h = xs[i + 1] - xs[i];
  return xs[i] + (h * (a - c)) / (2 * (a - 2 * b + c));
};

test("10. Measured wave speed equals the set speed within 1% (along the grid and diagonally)", (t) => {
  for (const angle of [0, 45 * deg]) {
    const lab = new WaveLab({ width: 24, height: 24, cell: 0.05, speed: 1 });
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    lab.add("line", { x: -8 * dir.x, y: -8 * dir.y, angle, length: 20, frequency: 1, amplitude: 1 });
    lab.advance(14);
    const lambda = measuredWavelength(lab, { x: -4 * dir.x, y: -4 * dir.y }, dir, 8, 1);
    const speed = lambda * 1; // v = fλ
    within(speed, 1, 0.01, `speed at ${angle / deg}° to the grid`);
    t.diagnostic(`v at ${angle / deg}°: ${speed.toFixed(5)} m/s (set 1 m/s)`);
  }
});

test("11. Standing waves between two walls: node spacing λ/2 within 2%", (t) => {
  // Light damping (0.3 per second, the page's labelled damping control)
  // lets the channel's own ringing die away, leaving the driven pattern.
  const lab = new WaveLab({ width: 10, height: 14, cell: 0.05, speed: 1, damping: 0.3 });
  lab.add("wall", { x: -3, y: 0, angle: 90 * deg, length: 14, thickness: 0.2 });
  lab.add("wall", { x: 3, y: 0, angle: 90 * deg, length: 14, thickness: 0.2 });
  lab.add("line", { x: 0.27, y: 0, angle: 0, length: 14, frequency: 1, amplitude: 1 });
  lab.advance(30);
  lab.startAverage();
  lab.advance(2);
  const xs = [],
    ys = [];
  for (let x = -2.8; x <= 2.8; x += 0.01) {
    xs.push(x);
    ys.push(lab.averageAt(x, 0));
  }
  const nodes = [];
  for (let i = 1; i < xs.length - 1; i++)
    if (ys[i] < ys[i - 1] && ys[i] <= ys[i + 1] && ys[i] < 0.2 * Math.max(...ys)) nodes.push(vertex(xs, ys, i));
  // Each side of the source has nodes counted from its own wall, so the
  // two sides are measured separately (the gap across the source depends
  // on where it is).
  for (const side of [nodes.filter((x) => x < 0.27), nodes.filter((x) => x > 0.27)]) {
    assert.ok(side.length >= 4, `found ${side.length} nodes on one side`);
    const spacing = slope(side.map((_, i) => i), side);
    within(spacing, 0.5, 0.5 * 0.02, "node spacing");
    t.diagnostic(`node spacing ${spacing.toFixed(5)} m from ${side.length} nodes`);
  }
});

test("12. Plane wave from speed c into c/2 at 30° incidence refracts at 14.48° within 1°", (t) => {
  const expected = Math.asin(0.5 * Math.sin(30 * deg)) / deg; // 14.4775°
  // 20 cells per wavelength in the slow medium (λ = 0.5 there).
  const lab = new WaveLab({ width: 24, height: 16, cell: 0.025, speed: 1 });
  lab.add("medium", { shape: "rect", x: 20, y: 0, width: 40, height: 40, index: 2 });
  lab.add("line", { x: -5, y: -5 * Math.tan(30 * deg), angle: 30 * deg, length: 9, frequency: 1, amplitude: 1 });
  lab.advance(12);
  const centre = { x: 2, y: 2 * Math.tan(expected * deg) },
    pts = [],
    d = 0.05;
  for (let i = -3; i <= 3; i++)
    for (let j = -3; j <= 3; j++) pts.push({ x: centre.x + i * 0.2, y: centre.y + j * 0.2 });
  const shifted = pts.flatMap((p) => [p, { x: p.x + d, y: p.y }, { x: p.x, y: p.y + d }]);
  const a = lockIn(lab, shifted, 1, 2);
  let kx = 0,
    ky = 0;
  for (let i = 0; i < pts.length; i++) {
    const [p, px, py] = [a[3 * i], a[3 * i + 1], a[3 * i + 2]],
      arg = (q, r) => Math.atan2(q[1] * r[0] - q[0] * r[1], q[0] * r[0] + q[1] * r[1]);
    kx += arg(px, p) / d;
    ky += arg(py, p) / d;
  }
  // u ∝ cos(k·r − ωt) has phase (of re + i·im) k·r.
  const angle = Math.atan2(ky, kx) / deg;
  within(angle, expected, 1, "angle of refraction");
  t.diagnostic(`refracted at ${angle.toFixed(3)}° (formula ${expected.toFixed(3)}°)`);
});

// Intensity averaged over two periods along an arc of radius R about a
// point, from −span to +span degrees.
function arc(lab, centre, R, span, stepDeg = 0.05) {
  const angles = [],
    values = [];
  for (let a = -span; a <= span + 1e-9; a += stepDeg) {
    angles.push(a);
    values.push(lab.averageAt(centre.x + R * Math.cos(a * deg), centre.y + R * Math.sin(a * deg)));
  }
  return { angles, values };
}

test("13. Double slit, separation 10λ: first bright fringe at 5.74° within 0.3°", (t) => {
  const expected = Math.asin(1 / 10) / deg; // 5.739°
  const lab = new WaveLab({ width: 46, height: 26, cell: 0.05, speed: 1 });
  lab.add("wall", { x: -15, y: 0, angle: 90 * deg, length: 40, thickness: 0.2, slits: 2, slitWidth: 1, separation: 10 });
  lab.add("line", { x: -18, y: 0, angle: 0, length: 40, frequency: 1, amplitude: 1 });
  lab.advance(40);
  lab.startAverage();
  lab.advance(2);
  const { angles, values } = arc(lab, { x: -15, y: 0 }, 34, 9);
  let best = -1;
  for (let i = 1; i < angles.length - 1; i++)
    if (angles[i] > 2 && angles[i] < 9 && (best < 0 || values[i] > values[best])) best = i;
  const angle = vertex(angles, values, best);
  within(angle, expected, 0.3, "first bright fringe");
  t.diagnostic(`first bright fringe at ${angle.toFixed(3)}° (formula ${expected.toFixed(3)}°)`);
});

test("14. Single slit of width 5λ: first minimum at 11.54° within 0.5°", (t) => {
  const expected = Math.asin(1 / 5) / deg; // 11.537°
  const lab = new WaveLab({ width: 50, height: 30, cell: 0.05, speed: 1 });
  lab.add("wall", { x: -20, y: 0, angle: 90 * deg, length: 50, thickness: 0.2, slits: 1, slitWidth: 5 });
  lab.add("line", { x: -23, y: 0, angle: 0, length: 50, frequency: 1, amplitude: 1 });
  lab.advance(46);
  lab.startAverage();
  lab.advance(2);
  const { angles, values } = arc(lab, { x: -20, y: 0 }, 40, 18);
  let best = -1;
  for (let i = 1; i < angles.length - 1; i++)
    if (angles[i] > 6 && angles[i] < 17 && (best < 0 || values[i] < values[best])) best = i;
  const angle = vertex(angles, values, best);
  within(angle, expected, 0.5, "first minimum");
  t.diagnostic(`first minimum at ${angle.toFixed(3)}° (formula ${expected.toFixed(3)}°)`);
});

test("15. Absorbing boundary: reflected amplitude below 2% of incident", (t) => {
  // The same source in a small tank and in one so large that nothing comes
  // back from its edges in the time run: the difference is what the small
  // tank's edges reflect, compared at points one wavelength inside them
  // with the wave arriving there (straight on and at 45°).
  const run = (size) => {
    const lab = new WaveLab({ width: size, height: size, cell: 0.05, speed: 1 });
    lab.add("point", { x: 1, y: 1, frequency: 1, amplitude: 1 });
    lab.advance(16);
    return lab;
  };
  const small = run(10),
    big = run(40);
  const points = [
    { x: 4, y: 1 }, // straight on to the right edge
    { x: 1, y: 4 }, // straight on to the top edge
    { x: 4, y: 4 }, // corner, at 45°
    { x: -4, y: 1 },
    { x: 1, y: -4 },
    { x: -4, y: -4 },
  ];
  const a = lockIn(small, points, 1, 2),
    b = lockIn(big, points, 1, 2);
  let worst = 0;
  points.forEach((p, i) => {
    const diff = Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]),
      incident = Math.hypot(...b[i]);
    worst = Math.max(worst, diff / incident);
  });
  assert.ok(worst < 0.02, `reflected ${(worst * 100).toFixed(2)}% of incident`);
  t.diagnostic(`largest reflection ${(worst * 100).toFixed(3)}%`);
});

// Positions along y = 0 where the field crosses zero going up, between a
// and b.
function crossings(lab, a, b) {
  const out = [];
  let prev = lab.value(a, 0);
  for (let x = a + 0.002; x <= b; x += 0.002) {
    const u = lab.value(x, 0);
    if (prev < 0 && u >= 0) out.push(x - (0.002 * u) / (u - prev));
    prev = u;
  }
  return out;
}
// Mean spacing of a list of positions.
const spacing = (list) => (list.at(-1) - list[0]) / (list.length - 1);

test("16. Moving source at 0.5c: wavelength λ/2 ahead and 1.5λ behind, frequencies 2f and 2f/3", (t) => {
  // 40 cells per wavelength at rest, so 20 in the shortened waves ahead.
  const lab = new WaveLab({ width: 34, height: 10, cell: 0.025, speed: 1 });
  lab.add("moving", { x: -10, y: 0, angle: 0, speed: 0.5, frequency: 1, amplitude: 1 });
  // Waves from the source's first two seconds (while it is switched on
  // gently) are left out: they lie beyond x = 5 ahead at the end, and pass
  // the probes before the times used.
  const ahead = lab.add("probe", { x: 0.5, y: 0 }),
    behind = lab.add("probe", { x: -14, y: 0 });
  lab.advance(16); // the source is at x = −2
  const front = crossings(lab, 0, 4.5),
    back = crossings(lab, -14, -4);
  within(spacing(front), 0.5, 0.5 * 0.02, "wavelength ahead");
  within(spacing(back), 1.5, 1.5 * 0.02, "wavelength behind");
  // Frequencies heard by fixed probes, from upward zero crossings in time.
  const frequency = (id, after) => {
    const { t, u } = lab.history(id),
      times = [];
    for (let i = 1; i < t.length; i++)
      if (t[i] > after && u[i - 1] < 0 && u[i] >= 0) times.push(t[i] - ((t[i] - t[i - 1]) * u[i]) / (u[i] - u[i - 1]));
    return 1 / spacing(times);
  };
  within(frequency(ahead, 11.6), 2, 2 * 0.02, "frequency ahead");
  within(frequency(behind, 9), 2 / 3, (2 / 3) * 0.02, "frequency behind");
  t.diagnostic(
    `λ ahead ${spacing(front).toFixed(4)}, behind ${spacing(back).toFixed(4)}; f ahead ${frequency(ahead, 11.6).toFixed(4)}, behind ${frequency(behind, 9).toFixed(4)}`,
  );
});

test("17. Source at 2c: shock cone half-angle 30° within 1°", (t) => {
  const expected = Math.asin(1 / 2) / deg;
  // Near the cone the arriving crests are squeezed without limit, far
  // below 20 cells per wavelength, and short waves travel slower on the
  // grid. At 20 cells per (unsqueezed) wavelength the cone measures about
  // 28.5°; the shock-cone preset uses 40, as this check does.
  const lab = new WaveLab({ width: 40, height: 18, cell: 0.025, speed: 1 });
  lab.add("moving", { x: -18, y: 0, angle: 0, speed: 2, frequency: 1, amplitude: 1 });
  lab.advance(14); // the source is at x = 10
  const tip = 10,
    D = [],
    Y = [];
  // The outermost point the disturbance has reached (1% of the largest
  // value on the line), on lines 3 to 14 behind the tip, above and below.
  for (let d = 3; d <= 14; d += 0.25)
    for (const sign of [1, -1]) {
      let peak = 0;
      for (let y = 0; y <= 8.5; y += 0.005) peak = Math.max(peak, Math.abs(lab.value(tip - d, sign * y)));
      let edge = 0;
      for (let y = 8.5; y >= 0; y -= 0.005)
        if (Math.abs(lab.value(tip - d, sign * y)) > 0.01 * peak) {
          edge = y;
          break;
        }
      D.push(d);
      Y.push(edge);
    }
  const angle = Math.atan(slope(D, Y)) / deg;
  within(angle, expected, 1, "half-angle");
  t.diagnostic(`cone half-angle ${angle.toFixed(3)}°`);
});

test("18. Closed reflecting box, no damping: energy constant within 0.5% over 100 periods", (t) => {
  const lab = new WaveLab({ width: 10, height: 10, cell: 0.05, speed: 1, edges: "wall" });
  // A region of other speed too, which the energy must allow for.
  lab.add("medium", { shape: "circle", x: 2, y: 1, radius: 1.5, index: 1.4 });
  lab.pulse({ x: -1, y: 0.5, width: 0.4, amplitude: 1 });
  lab.step();
  const start = lab.energy();
  let worst = 0;
  while (lab.time < 100) {
    lab.advance(1);
    worst = Math.max(worst, Math.abs(lab.energy() / start - 1));
  }
  assert.ok(start > 0);
  assert.ok(worst < 0.005, `energy changed by ${(worst * 100).toFixed(4)}%`);
  t.diagnostic(`largest change in energy ${(worst * 100).toExponential(2)}%`);
});

test("the grid refuses settings with fewer than 20 cells per wavelength", (t) => {
  const lab = new WaveLab({ width: 10, height: 10, cell: 0.05, speed: 1 });
  assert.equal(lab.cellsPerWavelength(), Infinity, "no source, no wavelength");
  // λ = 1/1.1 m is 18.2 cells of 5 cm.
  assert.throws(() => lab.add("point", { x: 0, y: 0, frequency: 1.1 }), /20 cells/);
  lab.add("point", { x: 0, y: 0, frequency: 1 });
  within(lab.cellsPerWavelength(), 20, 1e-9, "cells per wavelength");
  // In glass of index 1.5 the wavelength is 2/3 m: 13.3 cells.
  assert.throws(() => lab.add("medium", { shape: "circle", x: 0, y: 0, radius: 1, index: 1.5 }), /20 cells/);
  // Ahead of a source moving at c/2 the wavelength is halved: 10 cells.
  assert.throws(() => lab.add("moving", { x: 0, y: 0, speed: 0.5, frequency: 1 }), /20 cells/);
  assert.equal(lab.list().length, 1, "nothing else was added");
});

test("the timestep is within the stability limit and independent of frame rate", (t) => {
  const a = new WaveLab({ width: 6, height: 6, cell: 0.05, speed: 1 }),
    b = new WaveLab({ width: 6, height: 6, cell: 0.05, speed: 1 });
  assert.ok(a.dt * 1 * Math.SQRT2 <= 0.05, "CFL: c dt √2 ≤ h");
  for (const lab of [a, b]) lab.add("point", { x: 0, y: 0, frequency: 1 });
  for (let i = 0; i < 60; i++) a.advance(1 / 60);
  for (let i = 0; i < 25; i++) b.advance(1 / 25);
  for (let i = 0; i < 5; i++) b.advance(1 / 25); // 1.2 s
  for (let i = 0; i < 12; i++) a.advance(1 / 60);
  within(a.time, b.time, 1e-12, "same simulated time");
  assert.equal(a.value(1, 0.5), b.value(1, 0.5));
});

test("a point source's amplitude falls as 1/√r in 2D (amplitude A one wavelength away)", (t) => {
  const lab = new WaveLab({ width: 30, height: 30, cell: 0.05, speed: 1 });
  lab.add("point", { x: 0, y: 0, frequency: 1, amplitude: 1 });
  lab.advance(20);
  const radii = [2, 4, 8],
    a = lockIn(lab, radii.map((r) => ({ x: r * Math.SQRT1_2, y: r * Math.SQRT1_2 })), 1, 2).map((p) => Math.hypot(...p));
  for (let i = 0; i < radii.length; i++) within(a[i] * Math.sqrt(radii[i]), 1, 0.05, `A√r at r = ${radii[i]}`);
});

test("scene files round-trip", (t) => {
  const lab = new WaveLab({ width: 12, height: 8, cell: 0.05, speed: 1 });
  lab.add("wall", { x: 0, y: 0, angle: 90 * deg, length: 8, thickness: 0.2, slits: 2, slitWidth: 0.5, separation: 2 });
  lab.add("point", { x: -3, y: 0, frequency: 1, amplitude: 2, phase: 1 });
  lab.add("screen", { x: 5, y: 0, angle: 180 * deg, length: 6 });
  const copy = WaveLab.fromScene(JSON.parse(JSON.stringify(lab.exportScene())));
  assert.deepEqual(copy.exportScene(), lab.exportScene());
  lab.advance(3);
  copy.advance(3);
  assert.equal(copy.value(2, 1), lab.value(2, 1));
});

test("probe readings: measured frequency and amplitude, as the page shows them", (t) => {
  // As check 16: what fixed probes ahead of and behind a source at c/2
  // receive is 2f and 2f/3, measured from the probe's own record.
  const lab = new WaveLab({ width: 34, height: 10, cell: 0.025, speed: 1 });
  lab.add("moving", { x: -10, y: 0, angle: 0, speed: 0.5, frequency: 1, amplitude: 1 });
  const ahead = lab.add("probe", { x: 0.5, y: 0 }),
    behind = lab.add("probe", { x: -14, y: 0 });
  lab.advance(16);
  within(lab.probeReading(ahead).frequency, 2, 2 * 0.02, "ahead");
  within(lab.probeReading(behind).frequency, 2 / 3, (2 / 3) * 0.02, "behind");
  // A plane wave of amplitude 1 from a line source: long, and read before
  // the waves from its ends arrive (they interfere with it by about ±9% at
  // 6λ from an 18λ line, Fresnel diffraction from the ends).
  const plane = new WaveLab({ width: 12, height: 62, cell: 0.05, speed: 1 });
  plane.add("line", { x: -2, y: 0, angle: 0, length: 60, frequency: 1, amplitude: 1 });
  const p = plane.add("probe", { x: 0, y: 0 });
  plane.advance(10);
  const r = plane.probeReading(p);
  within(r.frequency, 1, 0.01, "frequency");
  within(r.amplitude, 1, 0.03, "amplitude");
  t.diagnostic(`plane-wave amplitude ${r.amplitude.toFixed(4)} (set 1); f ${r.frequency.toFixed(4)}`);
  // Too short a record gives no reading rather than a wrong one.
  assert.equal(new WaveLab({ width: 4, height: 4 }).probeReading(99), null);
});
