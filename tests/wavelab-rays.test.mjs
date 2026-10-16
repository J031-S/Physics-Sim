// Rays view of the waves, light & sound tool: exact ray tracing checked
// against the textbook formulas. Expected values are written from the
// formulas, never from the model's output.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RayLab,
  MATERIALS,
  cauchy,
  fresnel,
  criticalAngle,
  WHITE,
} from "../src/wavelab/rays.js";

const deg = Math.PI / 180;
const close = (actual, expected, rel, what) =>
  assert.ok(
    Math.abs(actual - expected) <= rel * Math.abs(expected),
    `${what}: ${actual} against ${expected} (allowed ${rel * 100}%)`,
  );
// Angle of a segment's direction to a normal (both unit vectors), in degrees.
const angleTo = (seg, nx, ny) => {
  const dx = seg.x2 - seg.x1,
    dy = seg.y2 - seg.y1,
    len = Math.hypot(dx, dy);
  return Math.acos(Math.abs(dx * nx + dy * ny) / len) / deg;
};
const dirOf = (seg) => {
  const dx = seg.x2 - seg.x1,
    dy = seg.y2 - seg.y1,
    len = Math.hypot(dx, dy);
  return { x: dx / len, y: dy / len };
};
// The segments of the main path of the first ray of a source: the one that
// is transmitted (or totally reflected) at every surface, not partial
// reflections.
function mainPath(trace, source) {
  const out = [];
  let seg = trace.segments.find((s) => s.source === source && s.parent < 0);
  while (seg) {
    out.push(seg);
    const index = trace.segments.indexOf(seg);
    seg = trace.segments.find((s) => s.parent === index && s.event !== "partial");
  }
  return out;
}
// Where a segment's line crosses y = 0.
const axisCrossing = (seg) => {
  const d = dirOf(seg);
  return seg.x1 - (seg.y1 * d.x) / d.y;
};

test("1. Snell: n = 1.00 to 1.50 at 30° incidence refracts at 19.47°", () => {
  const lab = new RayLab();
  lab.add("block", { x: 0, y: -0.5, width: 2, height: 1, material: "fixed", index: 1.5 });
  // Down onto the top face (y = 0), 30° from the normal.
  lab.add("ray", { x: -Math.tan(30 * deg) * 0.5, y: 0.5, angle: -90 * deg + 30 * deg });
  const path = mainPath(lab.trace(), lab.list().at(-1).id);
  const expected = Math.asin(Math.sin(30 * deg) / 1.5) / deg; // 19.4712°
  close(angleTo(path[0], 0, 1), 30, 1e-9, "incidence");
  close(angleTo(path[1], 0, 1), expected, 1e-9, "refraction");
  assert.equal(path[1].event, "refract");
});

test("2. Critical angle 41.81° from n = 1.50; at 42° the ray is totally reflected", () => {
  const expected = Math.asin(1 / 1.5) / deg; // 41.8103°
  close(criticalAngle(1.5, 1) / deg, expected, 1e-12, "critical angle");
  for (const [incidence, tir] of [
    [41.7, false],
    [42, true],
  ]) {
    const lab = new RayLab();
    lab.add("block", { x: 0, y: -0.5, width: 4, height: 1, material: "fixed", index: 1.5 });
    // Inside the glass, up towards the top face at the given angle.
    lab.add("ray", { x: 0, y: -0.5, angle: 90 * deg - incidence * deg });
    const t = lab.trace(),
      first = t.segments.findIndex((s) => s.parent < 0),
      after = t.segments.filter((s) => s.parent === first);
    const refracted = after.filter((s) => s.event === "refract"),
      reflected = after.filter((s) => s.event === "tir");
    assert.equal(refracted.length, tir ? 0 : 1, `${incidence}°: refracted rays`);
    assert.equal(reflected.length, tir ? 1 : 0, `${incidence}°: totally reflected rays`);
    if (tir) {
      assert.equal(reflected[0].intensity, t.segments[first].intensity);
      close(angleTo(reflected[0], 0, 1), incidence, 1e-9, "reflection angle");
    }
  }
});

test("3. Ideal thin lens f = 0.100 m: real image of an object at 0.300 m, virtual of one at 0.050 m", () => {
  // 1/v = 1/f − 1/u (real is positive), m = −v/u.
  for (const [u, v, m, real] of [
    [0.3, 1 / (1 / 0.1 - 1 / 0.3), -(1 / (1 / 0.1 - 1 / 0.3)) / 0.3, true],
    [0.05, 1 / (1 / 0.1 - 1 / 0.05), -(1 / (1 / 0.1 - 1 / 0.05)) / 0.05, false],
  ]) {
    const lab = new RayLab();
    lab.add("thinLens", { x: 0, y: 0, angle: 0, f: 0.1, aperture: 0.1 });
    const object = lab.add("object", { x: -u, y: 0, angle: 0, height: 0.01 });
    const image = lab.images().find((i) => i.source === object);
    close(image.distance, v, 1e-3, `u = ${u}: image distance`);
    close(image.magnification, m, 1e-3, `u = ${u}: magnification`);
    assert.equal(image.real, real);
    assert.equal(image.upright, m > 0);
    // The image is on the outgoing side (real) or the object side (virtual).
    close(image.base.x, v, 1e-3, `u = ${u}: image position`);
    close(image.formula.distance, v, 1e-12, "thin-lens equation");
    close(image.formula.magnification, m, 1e-12, "thin-lens magnification");
  }
  // The values the check states.
  const lab = new RayLab();
  lab.add("thinLens", { x: 0, y: 0, angle: 0, f: 0.1, aperture: 0.1 });
  const a = lab.add("object", { x: -0.3, y: 0, angle: 0, height: 0.01 });
  const b = lab.add("object", { x: -0.05, y: 0.0, angle: 0, height: 0.01 });
  const [ia, ib] = [a, b].map((id) => lab.images().find((i) => i.source === id));
  close(ia.distance, 0.15, 1e-3, "0.150 m");
  close(ia.magnification, -0.5, 1e-3, "−0.500");
  close(ib.distance, -0.1, 1e-3, "0.100 m on the object side");
  close(ib.magnification, 2, 1e-3, "+2.00");
});

test("ideal thin lens obeys 1/f = 1/u + 1/v for every ray, not only paraxial ones", () => {
  const lab = new RayLab();
  lab.add("thinLens", { x: 0, y: 0, angle: 0, f: 0.1, aperture: 0.4 });
  lab.add("point", { x: -0.3, y: 0.02, angle: 0, spread: 60 * deg, count: 25 });
  // Image of (−0.3, 0.02): v = 0.15 and height −0.5 × 0.02 = −0.01.
  for (const seg of lab.trace().segments.filter((s) => s.event === "lens")) {
    const d = dirOf(seg),
      t = (0.15 - seg.x1) / d.x;
    assert.ok(Math.abs(seg.y1 + t * d.y + 0.01) < 1e-12, "every ray meets at the image");
  }
});

test("4. Concave mirror R = 0.400 m, object at 0.600 m: image at 0.300 m, m = −0.500", () => {
  const lab = new RayLab();
  // Vertex at the origin, facing −x, where the object is.
  lab.add("sphericalMirror", { x: 0, y: 0, angle: Math.PI, radius: 0.4, aperture: 0.2 });
  const object = lab.add("object", { x: -0.6, y: 0, angle: 0, height: 0.01 });
  const image = lab.images().find((i) => i.source === object);
  const f = 0.4 / 2,
    v = 1 / (1 / f - 1 / 0.6);
  close(v, 0.3, 1e-12, "mirror equation");
  close(image.distance, v, 1e-3, "image distance");
  close(image.magnification, -v / 0.6, 1e-3, "magnification");
  close(image.base.x, -v, 1e-3, "image in front of the mirror");
  assert.equal(image.real, true);
  assert.equal(image.upright, false);
});

test("convex mirror: virtual, upright, diminished image behind the mirror", () => {
  const lab = new RayLab();
  lab.add("sphericalMirror", { x: 0, y: 0, angle: Math.PI, radius: -0.4, aperture: 0.2 });
  const object = lab.add("object", { x: -0.6, y: 0, angle: 0, height: 0.01 });
  const image = lab.images().find((i) => i.source === object);
  const v = 1 / (1 / -0.2 - 1 / 0.6); // −0.15
  close(image.distance, v, 1e-3, "image distance");
  close(image.magnification, -v / 0.6, 1e-3, "magnification");
  assert.equal(image.real, false);
  assert.equal(image.upright, true);
});

// The thick-lens (lensmaker's) formula for the effective focal length.
const thickLens = (n, R1, R2, d) =>
  1 / ((n - 1) * (1 / R1 - 1 / R2 + ((n - 1) * d) / (n * R1 * R2)));

test("5. Spherical lens n = 1.50, R₁ = 0.200 m, R₂ = −0.200 m, 1 mm thick: paraxial focal length matches the thick-lens formula", () => {
  const f = thickLens(1.5, 0.2, -0.2, 0.001); // 0.200167 m
  const lab = new RayLab();
  lab.add("lens", { x: 0, y: 0, angle: 0, R1: 0.2, R2: -0.2, thickness: 0.001, aperture: 0.028, material: "fixed", index: 1.5 });
  const h = 1e-5;
  const ray = lab.add("ray", { x: -0.5, y: h, angle: 0 });
  const out = mainPath(lab.trace(), ray).at(-1),
    d = dirOf(out);
  // Effective focal length: height in over the angle out.
  close(h / -(d.y / d.x), f, 1e-3, "effective focal length");
  close(f, 0.2, 1e-2, "about 0.200 m");
});

test("6. Spherical aberration has the right sign; a parabolic mirror focuses a parallel beam at one point", () => {
  const lab = new RayLab();
  // With R = ±0.2 m and 1 mm at the centre, the faces meet at a diameter
  // of 2√(2R·0.5 mm − (0.5 mm)²) ≈ 28.3 mm: the marginal ray is at 13 mm.
  lab.add("lens", { x: 0, y: 0, angle: 0, R1: 0.2, R2: -0.2, thickness: 0.001, aperture: 0.028, material: "fixed", index: 1.5 });
  const paraxial = lab.add("ray", { x: -0.5, y: 1e-5, angle: 0 }),
    marginal = lab.add("ray", { x: -0.5, y: 0.013, angle: 0 });
  const t = lab.trace(),
    xp = axisCrossing(mainPath(t, paraxial).at(-1)),
    xm = axisCrossing(mainPath(t, marginal).at(-1));
  assert.ok(xm < xp - 1e-4, `marginal focus ${xm} m is closer than paraxial ${xp} m`);

  const f = 0.25,
    mirror = new RayLab();
  // Vertex at the origin facing +x; the focus is at (0.25, 0).
  mirror.add("parabolicMirror", { x: 0, y: 0, angle: 0, f, aperture: 0.4 });
  mirror.add("beam", { x: 1, y: 0, angle: Math.PI, width: 0.38, count: 21 });
  const reflected = mirror.trace().segments.filter((s) => s.event === "reflect");
  assert.equal(reflected.length, 21);
  for (const seg of reflected) {
    if (Math.abs(seg.y1) < 1e-12) continue; // along the axis: no crossing
    assert.ok(Math.abs(axisCrossing(seg) - f) < 1e-9, `crossing ${axisCrossing(seg)} m`);
  }
});

test("7. Prism with apex 60°, n = 1.50: minimum deviation 37.18°", () => {
  const expected = (2 * Math.asin(1.5 * Math.sin(30 * deg)) - 60 * deg) / deg; // 37.1808°
  const deviation = (incidence) => {
    const lab = new RayLab();
    lab.add("prism", { x: 0, y: 0, angle: 0, apex: 60 * deg, side: 0.1, material: "fixed", index: 1.5 });
    // The left face's outward normal is 30° above −x. The ray arrives from
    // below-left at `incidence` to that normal, aimed at the face's middle.
    const H = 0.1 * Math.cos(30 * deg),
      mid = { x: -0.025, y: H / 6 },
      normal = { x: -Math.cos(30 * deg), y: Math.sin(30 * deg) },
      inward = Math.atan2(-normal.y, -normal.x) + incidence;
    const id = lab.add("ray", { x: mid.x - 0.2 * Math.cos(inward), y: mid.y - 0.2 * Math.sin(inward), angle: inward });
    const path = mainPath(lab.trace(), id),
      a = dirOf(path[0]),
      b = dirOf(path.at(-1));
    return Math.acos(a.x * b.x + a.y * b.y) / deg;
  };
  // Golden-section search over the angle of incidence.
  let lo = 30 * deg,
    hi = 70 * deg;
  const g = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i < 80; i++) {
    const m1 = hi - g * (hi - lo),
      m2 = lo + g * (hi - lo);
    if (deviation(m1) < deviation(m2)) hi = m2;
    else lo = m1;
  }
  close(deviation((lo + hi) / 2), expected, 1e-7, "minimum deviation");
  close(expected, 37.18, 1e-4, "37.18°");
});

test("8. Refracting telescope f_o = 0.500 m, f_e = 0.050 m: angular magnification 10.0", () => {
  const lab = new RayLab();
  lab.add("thinLens", { x: 0, y: 0, angle: 0, f: 0.5, aperture: 0.1 });
  lab.add("thinLens", { x: 0.55, y: 0, angle: 0, f: 0.05, aperture: 0.04 });
  const theta = 1e-3;
  const id = lab.add("ray", { x: -0.2, y: 0.2 * Math.tan(theta) + 0.003, angle: -theta });
  const out = dirOf(mainPath(lab.trace(), id).at(-1));
  close(Math.atan2(out.y, out.x) / theta, 0.5 / 0.05, 1e-3, "angular magnification (inverted)");
  // The same from the readout of a parallel beam.
  const beam = lab.add("beam", { x: -0.2, y: 0, angle: theta, width: 0.02, count: 5 });
  const reading = lab.images().find((i) => i.source === beam);
  close(reading.angularMagnification, -10, 1e-3, "readout");
});

test("9. Fresnel: at normal incidence from air to n = 1.50 the reflected fraction is 0.0400", () => {
  close(fresnel(1, 1.5, 0).R, ((1.5 - 1) / (1.5 + 1)) ** 2, 1e-12, "formula");
  close(((1.5 - 1) / (1.5 + 1)) ** 2, 0.04, 1e-12, "0.0400");
  const lab = new RayLab();
  lab.add("block", { x: 0, y: -0.5, width: 2, height: 1, material: "fixed", index: 1.5 });
  lab.add("ray", { x: 0, y: 0.5, angle: -90 * deg });
  const t = lab.trace(),
    partial = t.segments.find((s) => s.event === "partial" && s.depth === 1),
    refracted = t.segments.find((s) => s.event === "refract" && s.depth === 1);
  close(partial.intensity, 0.04, 1e-12, "partial reflection");
  close(refracted.intensity, 0.96, 1e-12, "transmitted");
  // Unpolarised average at oblique incidence: Brewster's angle has no p part.
  const brewster = Math.atan(1.5);
  const at = fresnel(1, 1.5, brewster);
  assert.ok(at.Rp < 1e-20);
  close(at.R, at.Rs / 2, 1e-12, "half of s at Brewster's angle");
});

test("dispersion: Cauchy indices, and violet bends more than red", () => {
  for (const [key, nd] of [
    ["crown", 1.5168],
    ["flint", 1.62],
    ["water", 1.333],
    ["acrylic", 1.4917],
  ])
    close(cauchy(MATERIALS[key], 589.3e-9), nd, 5e-4, key + " at the sodium D line");
  assert.ok(cauchy(MATERIALS.crown, 400e-9) > cauchy(MATERIALS.crown, 700e-9));
  const lab = new RayLab();
  lab.add("prism", { x: 0, y: 0, angle: 0, apex: 60 * deg, side: 0.1, material: "flint" });
  lab.add("ray", { x: -0.2, y: -0.05, angle: 20 * deg, wavelength: "white" });
  const t = lab.trace(),
    // Through both faces: depth 2 on the main path.
    out = t.segments.filter((s) => s.depth === 2 && s.event === "refract");
  assert.equal(new Set(out.map((s) => s.wavelength)).size, WHITE.length);
  const angle = (s) => Math.atan2(dirOf(s).y, dirOf(s).x);
  const red = out.find((s) => s.wavelength === Math.max(...WHITE)),
    violet = out.find((s) => s.wavelength === Math.min(...WHITE));
  assert.ok(angle(violet) < angle(red), "violet deviated further (downwards)");
});

test("optical fibre: total internal reflection carries the ray to the far end", () => {
  const lab = new RayLab();
  lab.add("block", { x: 0.5, y: 0, width: 1, height: 0.01, material: "fixed", index: 1.5 });
  lab.add("screen", { x: 1.1, y: 0, angle: Math.PI, length: 0.1 });
  lab.add("ray", { x: -0.002, y: 0, angle: 20 * deg });
  const t = lab.trace({ minIntensity: 1 });
  const hit = t.hits.find((h) => h.intensity > 0.9);
  assert.ok(hit, "most of the light reaches the screen");
  // Fresnel losses only at the two end faces.
  close(hit.intensity, (1 - fresnel(1, 1.5, 20 * deg).R) * (1 - fresnel(1.5, 1, Math.asin(Math.sin(20 * deg) / 1.5)).R), 1e-9, "transmitted");
});

test("an aperture stop blocks rays outside its opening; screens record hits", () => {
  const lab = new RayLab();
  lab.add("stop", { x: 0, y: 0, angle: 0, opening: 0.025, length: 0.2 });
  lab.add("screen", { x: 0.1, y: 0, angle: Math.PI, length: 0.4 });
  lab.add("beam", { x: -0.1, y: 0, angle: 0, width: 0.1, count: 11 });
  const hits = lab.trace().hits;
  assert.equal(hits.length, 3, "only the rays within ±1.25 cm get through");
});

test("validation: a lens whose surfaces cross is refused, and nothing changes", () => {
  const lab = new RayLab();
  const id = lab.add("lens", { x: 0, y: 0, R1: 0.2, R2: -0.2, thickness: 0.004, aperture: 0.05, material: "crown" });
  assert.throws(() => lab.update(id, { aperture: 0.3 }), /aperture/);
  assert.equal(lab.get(id).aperture, 0.05);
  assert.throws(() => lab.add("thinLens", { f: 0 }), /focal length/);
});

test("scene files round-trip", () => {
  const lab = new RayLab();
  lab.add("lens", { x: 0.1, y: 0, R1: 0.3, R2: 0, thickness: 0.004, aperture: 0.05, material: "flint" });
  lab.add("beam", { x: -0.3, y: 0, angle: 0, width: 0.04, count: 7, wavelength: "white" });
  const copy = RayLab.fromScene(JSON.parse(JSON.stringify(lab.exportScene())));
  assert.deepEqual(copy.exportScene(), lab.exportScene());
  assert.deepEqual(copy.trace().segments, lab.trace().segments);
  assert.throws(() => RayLab.fromScene({ format: "physics-sim-circuit", version: 1 }), /circuits/i);
});

test("angle readouts come from the trace: incidence, refraction and deviation", () => {
  const lab = new RayLab();
  lab.add("block", { x: 0, y: -0.5, width: 2, height: 1, material: "fixed", index: 1.5 });
  const id = lab.add("ray", { x: -Math.tan(30 * deg) * 0.5, y: 0.5, angle: -60 * deg });
  const [r] = lab.readings(lab.trace(), id);
  close(r.events[0].incidence / deg, 30, 1e-9, "incidence");
  close(r.events[0].leaving / deg, Math.asin(Math.sin(30 * deg) / 1.5) / deg, 1e-9, "refraction");
  assert.equal(r.events[0].n1, 1);
  assert.equal(r.events[0].n2, 1.5);
  // Through the far face of a parallel-sided block it leaves parallel to
  // how it came in.
  assert.ok(Math.abs(r.deviation) < 1e-7, `deviation ${r.deviation} rad`);
  assert.equal(r.events.length, 2);
});

test("an object at the focal point of a magnifier: upright image at infinity, angular size h/f", () => {
  const lab = new RayLab();
  lab.add("thinLens", { x: 0, y: 0, angle: 0, f: 0.1, aperture: 0.1 });
  const id = lab.add("object", { x: -0.1, y: 0, angle: 0, height: 0.01 });
  const image = lab.images().find((i) => i.source === id);
  assert.equal(image.distance, Infinity);
  assert.equal(image.upright, true);
  close(image.angularSize, 1 / 0.1, 1e-3, "h/f per metre of height");
});
