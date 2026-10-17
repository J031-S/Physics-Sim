// Resizing, turning and snapping on the waves page: the patches they make,
// checked by putting them through the models' own update.
import { test } from "node:test";
import assert from "node:assert/strict";
import { startResize, resizePatch, turnAngle, resizable, snapTo, ROTATE_STEP } from "../src/wavelab/edit.js";
import { RayLab } from "../src/wavelab/rays.js";
import { WaveLab } from "../src/wavelab/waves.js";

const deg = Math.PI / 180;
const close = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} against ${b}`);
// Drags a resize from `from` to `to` on an item of a model, and returns the item.
function drag(model, view, id, from, to, opts = { min: 1e-3 }) {
  const g = startResize(view, model.get(id), from, opts);
  model.update(id, resizePatch(g, to));
  return model.get(id);
}

test("a block resizes about its centre along its own axes, turned or not", () => {
  const lab = new RayLab();
  const id = lab.add("block", { x: 1, y: 2, angle: 30 * deg, width: 0.2, height: 0.1 });
  // Its corner, then a point 0.3 along its axis and 0.15 across it.
  const at = (u, v) => ({ x: 1 + u * Math.cos(30 * deg) - v * Math.sin(30 * deg), y: 2 + u * Math.sin(30 * deg) + v * Math.cos(30 * deg) });
  const b = drag(lab, "rays", id, at(0.1, 0.05), at(0.3, 0.15));
  close(b.width, 0.6, 1e-12, "width");
  close(b.height, 0.3, 1e-12, "height");
  assert.equal(b.x, 1);
  assert.equal(b.y, 2);
});

test("crossing the centre takes the size to its minimum, not inside out", () => {
  const lab = new RayLab();
  const id = lab.add("mirror", { x: 0, y: 0, angle: Math.PI, length: 0.2 });
  // The mirror's p axis points down (angle π); start at its top end.
  const m = drag(lab, "rays", id, { x: 0, y: 0.1 }, { x: 0, y: -0.3 }, { min: 0.004 });
  close(m.length, 0.004, 1e-12, "minimum");
});

test("snapping takes sizes to whole steps either side of the centre", () => {
  const lab = new RayLab();
  const id = lab.add("thinLens", { x: 0, y: 0, angle: 0, f: 0.1, aperture: 0.1 });
  const t = drag(lab, "rays", id, { x: 0, y: 0.05 }, { x: 0.003, y: 0.0737 }, { min: 1e-3, step: 0.01 });
  close(t.aperture, 0.14, 1e-12, "aperture");
});

test("a lens widens with its edge thickness kept, so its surfaces never cross", () => {
  const lab = new RayLab();
  const id = lab.add("lens", { x: 0, y: 0, angle: 0, R1: 0.2, R2: -0.2, thickness: 0.004, aperture: 0.05, material: "crown" });
  const sag = (R, h) => R - Math.sign(R) * Math.sqrt(R * R - h * h);
  const edge = (l) => l.thickness + sag(l.R2, l.aperture / 2) - sag(l.R1, l.aperture / 2);
  const before = edge(lab.get(id));
  const l = drag(lab, "rays", id, { x: 0, y: 0.025 }, { x: 0, y: 0.06 });
  close(l.aperture, 0.12, 1e-12, "aperture");
  close(edge(l), before, 1e-12, "edge thickness");
  assert.ok(l.thickness > 0.004);
});

test("an object grows from its base the way it points; a point source's fan follows the pointer", () => {
  const lab = new RayLab();
  const id = lab.add("object", { x: 0, y: 0, angle: 0, height: 0.02 });
  close(drag(lab, "rays", id, { x: 0, y: 0.02 }, { x: 0.01, y: 0.05 }).height, 0.05, 1e-12, "height");
  const down = lab.add("object", { x: 0, y: 0, angle: 0, height: -0.02 });
  close(drag(lab, "rays", down, { x: 0, y: -0.02 }, { x: 0, y: -0.07 }).height, -0.07, 1e-12, "inverted");
  const fan = lab.add("point", { x: 0, y: 0, angle: 0, spread: 30 * deg });
  close(drag(lab, "rays", fan, { x: 1, y: 0.2 }, { x: 1, y: 1 }).spread, 90 * deg, 1e-12, "spread");
});

test("waves: walls lengthen along themselves, lens regions keep their shape rule", () => {
  const lab = new WaveLab({ width: 20, height: 20 });
  const wall = lab.add("wall", { x: 0, y: 0, angle: 90 * deg, length: 6 });
  close(drag(lab, "waves", wall, { x: 0, y: 3 }, { x: 0.4, y: 5 }).length, 10, 1e-12, "wall");
  const lens = lab.add("medium", { shape: "lens", x: 0, y: 0, radius: 6, thickness: 2.4, index: 1.5 });
  const m = drag(lab, "waves", lens, { x: 1, y: 2 }, { x: 1.5, y: 4 });
  close(m.thickness, 3, 1e-12, "thickness");
  // The faces' radius is the one whose lens is 8 high and 3 thick.
  const off = m.radius - m.thickness / 2;
  close(Math.sqrt(m.radius ** 2 - off ** 2), 4, 1e-12, "half-height");
  const disc = lab.add("medium", { shape: "circle", x: 0, y: 0, radius: 2, index: 1.2 });
  close(drag(lab, "waves", disc, { x: 2, y: 0 }, { x: 3, y: 4 }).radius, 5, 1e-12, "radius");
  assert.equal(resizable("waves", { kind: "probe" }), false);
  assert.equal(resizable("rays", { kind: "ray" }), false);
});

test("a resize the model cannot take is refused and changes nothing", () => {
  const lab = new WaveLab({ width: 20, height: 20 });
  lab.add("point", { x: 0, y: 0, frequency: 1 });
  // A tank cell of 0.05 m: index 1.5 there would leave 13 cells per λ.
  const id = lab.add("medium", { shape: "circle", x: 5, y: 5, radius: 1, index: 1 });
  lab.update(id, { index: 1 });
  const g = startResize("waves", lab.get(id), { x: 6, y: 5 }, { min: 0.05 });
  assert.throws(() => lab.update(id, { ...resizePatch(g, { x: 5, y: 5 + 1e8 }) }), Error);
  assert.equal(lab.get(id).radius, 1);
});

test("turning goes in 15° steps with snapping", () => {
  const item = { x: 0, y: 0 };
  close(turnAngle(item, { x: 1, y: 0.3 }, 0, true), 15 * deg, 1e-12, "snapped");
  close(turnAngle(item, { x: 1, y: 0.3 }, 0, false), Math.atan2(0.3, 1), 1e-12, "free");
  close(snapTo(0.37, 0.25), 0.25, 1e-12, "snapTo");
  close(ROTATE_STEP, 15 * deg, 1e-15, "15°");
});
