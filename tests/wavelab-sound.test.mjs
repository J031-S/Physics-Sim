// Sound view of the waves, light & sound tool: exact formulas and modal
// sums, to 1e-9 relative error. Expected values are written from the
// formulas.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SoundString,
  pipeModes,
  pipePattern,
  speedOfSound,
  MEDIA,
  beatFrequency,
  soundLevel,
  pointIntensity,
  doppler,
  passing,
  I0,
} from "../src/wavelab/sound.js";

const exact = (actual, expected, what) =>
  assert.ok(
    Math.abs(actual - expected) <= 1e-9 * Math.abs(expected),
    `${what}: ${actual} against ${expected}`,
  );
// The rounded value the check states, to the figures given.
const rounds = (actual, stated, places, what) =>
  assert.equal(actual.toFixed(places), stated.toFixed(places), what);

test("19. String L = 0.650 m, T = 70.0 N, μ = 1.00 g/m: v = 264.6 m/s, f₁ = 203.5 Hz", () => {
  const s = new SoundString({ length: 0.65, tension: 70, density: 1e-3 });
  const v = Math.sqrt(70 / 1e-3);
  exact(s.speed, v, "v = √(T/μ)");
  exact(s.frequency(1), v / (2 * 0.65), "f₁ = v/2L");
  rounds(s.speed, 264.6, 1, "264.6 m/s");
  rounds(s.frequency(1), 203.5, 1, "203.5 Hz");
  for (let n = 1; n <= 10; n++) exact(s.frequency(n), (n * v) / (2 * 0.65), `f${n}`);
});

test("a plucked string built from its modes has the plucked shape and moves as the wave equation says", () => {
  const s = new SoundString({ length: 0.65, tension: 70, density: 1e-3, pluck: { kind: "pluck", position: 0.2, height: 0.004 }, modes: 400 });
  const L = 0.65,
    p = 0.2 * L;
  const triangle = (x) => (x <= p ? (0.004 * x) / p : (0.004 * (L - x)) / (L - p));
  // The truncated sum converges as 1/N² for a corner: within 0.2% of the
  // height at 400 modes (the corner itself is the worst point).
  for (let x = 0; x <= L + 1e-12; x += L / 50)
    assert.ok(Math.abs(s.shape(x, 0) - triangle(x)) < 0.002 * 0.004, `y(${x.toFixed(3)}, 0)`);
  // Half a fundamental period later every mode has turned over: the shape
  // is the starting one reflected end to end and upside down.
  const half = 1 / (2 * s.frequency(1));
  for (let x = 0; x <= L; x += L / 20) exact(s.shape(x, half) + 1, -s.shape(L - x, 0) + 1, `y(${x.toFixed(3)}, T/2)`);
  // The coefficients are the textbook ones: b_n = 2hL²/(n²π²p(L − p)) sin(nπp/L).
  for (const m of s.modes().slice(0, 6))
    exact(m.amplitude, ((2 * 0.004 * L * L) / (m.n ** 2 * Math.PI ** 2 * p * (L - p))) * Math.sin((m.n * Math.PI * p) / L), `b${m.n}`);
  // Plucked at a fifth of its length, the 5th, 10th, … harmonics are missing.
  assert.ok(Math.abs(s.modes()[4].amplitude) < 1e-18);
});

test("a struck string starts straight and moving", () => {
  const s = new SoundString({ length: 1, tension: 100, density: 0.01, pluck: { kind: "strike", position: 0.3, speed: 1, width: 0.05 }, modes: 2000 });
  for (let x = 0; x <= 1; x += 0.1) assert.ok(Math.abs(s.shape(x, 0)) < 1e-15);
  // Velocity at the hammer is the hammer's speed. A sum of N modes rings
  // across the 5 cm hammer (4% at N = 200); at N = 2000 it is within 1%.
  const dt = 1e-7;
  assert.ok(Math.abs(s.shape(0.3, dt) / dt - 1) < 0.01);
});

test("20. Air at 20 °C: v = 343.2 m/s; open pipe 0.500 m: 343 Hz and all harmonics; closed: 171.5 Hz, odd only", () => {
  const v = 331.3 * Math.sqrt(1 + 20 / 273.15);
  exact(speedOfSound(20), v, "v = 331.3√(1 + T/273.15)");
  rounds(speedOfSound(20), 343.2, 1, "343.2 m/s");
  const open = pipeModes({ length: 0.5, speed: 343, ends: "open", count: 5 }),
    closed = pipeModes({ length: 0.5, speed: 343, ends: "closed", count: 5 });
  assert.deepEqual(open.map((m) => m.n), [1, 2, 3, 4, 5]);
  open.forEach((m, i) => exact(m.frequency, ((i + 1) * 343) / (2 * 0.5), `open f${m.n}`));
  assert.deepEqual(closed.map((m) => m.n), [1, 3, 5, 7, 9]);
  closed.forEach((m) => exact(m.frequency, (m.n * 343) / (4 * 0.5), `closed f${m.n}`));
  exact(open[0].frequency, 343, "343 Hz");
  exact(closed[0].frequency, 171.5, "171.5 Hz");
  // The end correction is off unless asked for; when on, 0.6 r per open end.
  const corrected = pipeModes({ length: 0.5, speed: 343, ends: "closed", count: 1, radius: 0.02, endCorrection: true });
  exact(corrected[0].frequency, 343 / (4 * (0.5 + 0.6 * 0.02)), "closed, corrected");
  const both = pipeModes({ length: 0.5, speed: 343, ends: "open", count: 1, radius: 0.02, endCorrection: true });
  exact(both[0].frequency, 343 / (2 * (0.5 + 2 * 0.6 * 0.02)), "open, corrected");
  // Presets for other media are given.
  for (const key of ["water", "steel", "helium"]) assert.ok(MEDIA[key].speed > 343);
});

test("pipe patterns: displacement antinodes and pressure nodes at open ends, the reverse at a closed end", () => {
  const L = 0.5;
  for (let n = 1; n <= 4; n++) {
    const at = (x) => pipePattern({ length: L, ends: "open", n }, x);
    exact(Math.abs(at(0).displacement), 1, "open end: displacement antinode");
    exact(Math.abs(at(L).displacement), 1, "other open end");
    assert.ok(Math.abs(at(0).pressure) < 1e-15 && Math.abs(at(L).pressure) < 1e-12);
  }
  for (const n of [1, 3, 5]) {
    const at = (x) => pipePattern({ length: L, ends: "closed", n }, x);
    assert.ok(Math.abs(at(0).displacement) < 1e-15, "closed end: displacement node");
    exact(Math.abs(at(0).pressure), 1, "closed end: pressure antinode");
    exact(Math.abs(at(L).displacement), 1, "open end: displacement antinode");
    assert.ok(Math.abs(at(L).pressure) < 1e-12, "open end: pressure node");
  }
  assert.throws(() => pipePattern({ length: L, ends: "closed", n: 2 }, 0), /odd/);
});

test("21. Beats between 440 Hz and 444 Hz: 4 Hz", () => {
  exact(beatFrequency(440, 444), 4, "|f₁ − f₂|");
  exact(beatFrequency(444, 440), 4, "either order");
});

test("22. 10⁻⁶ W/m² is 60.0 dB; doubling intensity adds 3.01 dB; ten times the distance subtracts 20.0 dB", () => {
  exact(I0, 1e-12, "threshold of hearing");
  exact(soundLevel(1e-6), 60, "60 dB");
  exact(soundLevel(2e-6) - soundLevel(1e-6), 10 * Math.log10(2), "doubling");
  rounds(soundLevel(2e-6) - soundLevel(1e-6), 3.01, 2, "3.01 dB");
  const P = 0.01;
  exact(pointIntensity(P, 2), P / (4 * Math.PI * 4), "I = P/4πr²");
  exact(soundLevel(pointIntensity(P, 20)) - soundLevel(pointIntensity(P, 2)), -20, "ten times as far");
});

test("23. Doppler, v = 343 m/s, f = 500 Hz, source at 30 m/s: 547.9 Hz approaching, 459.8 Hz receding", () => {
  // f′ = f (v + v_o)/(v − v_s), each speed positive towards the other.
  exact(doppler({ frequency: 500, speed: 343, source: 30 }), (500 * 343) / (343 - 30), "approaching");
  exact(doppler({ frequency: 500, speed: 343, source: -30 }), (500 * 343) / (343 + 30), "receding");
  rounds(doppler({ frequency: 500, speed: 343, source: 30 }), 547.9, 1, "547.9 Hz");
  rounds(doppler({ frequency: 500, speed: 343, source: -30 }), 459.8, 1, "459.8 Hz");
  exact(doppler({ frequency: 500, speed: 343, observer: 20 }), (500 * (343 + 20)) / 343, "observer approaching");
  exact(doppler({ frequency: 500, speed: 343, source: 30, observer: 20 }), (500 * 363) / 313, "both");
  assert.throws(() => doppler({ frequency: 500, speed: 343, source: 343 }), /speed of sound/);
});

test("an ambulance passing: the heard pitch and level from the moment each sound left it", () => {
  const P = 1,
    run = { frequency: 500, speed: 343, sourceSpeed: 30, distance: 10, power: P };
  // Long before it passes, the plain approaching formula; long after, the
  // receding one.
  const early = passing(run, -60),
    late = passing(run, 60);
  assert.ok(Math.abs(early.frequency / ((500 * 343) / 313) - 1) < 2e-4);
  assert.ok(Math.abs(late.frequency / ((500 * 343) / 373) - 1) < 2e-4);
  // Exactly as the formula says for the direction the sound left in: the
  // source's speed towards the listener at the moment of emission.
  for (const t of [-3, -0.5, 0, 0.2, 4]) {
    const r = passing(run, t),
      x = 30 * r.emitted,
      towards = (30 * -x) / Math.hypot(x, 10);
    exact(r.frequency, (500 * 343) / (343 - towards), `f′ at t = ${t}`);
    // It took the sound the distance over the speed to arrive.
    exact(t - r.emitted, Math.hypot(x, 10) / 343, "delay");
    exact(r.level, soundLevel(pointIntensity(P, Math.hypot(x, 10))), "level from the emission distance");
  }
});
