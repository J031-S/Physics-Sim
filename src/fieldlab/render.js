// Drawing of the electric & magnetic fields scene, shared by the fields page
// and the minitool mini simulations so both look the same. It is given a
// canvas context and a view, and for each frame the model, the scene state
// (mode, what to show, density, selection) and a few display options; it looks
// nothing up in the page. Placing and dragging, panels and the probe stay
// with the page.
import {
  electricFieldLines,
  equipotentialLines,
  magneticFieldLines,
} from "./model.js";
import { arrowFeatures, lineArrows } from "./arrows.js";
import { paletteOf } from "../site/theme.js";
import {
  arrowheadScale,
  endGrid,
  fieldLineWeight,
  gridDash,
  vectorWeight,
} from "../site/canvas-style.js";

export const GRID = 0.25,
  SOURCE_RADIUS = 11;

// Canvas colours, by key, from the theme tokens (src/site/theme.js).
export const FIELD_COLOURS = {
  ink: "ink",
  soft: "canvas-soft",
  panel: "panel",
  back: "canvas-bg",
  gridMinor: "canvas-grid-minor",
  gridMajor: "canvas-grid-major",
  electric: "field-electric",
  magnetic: "field-magnetic",
  equipotential: "field-equipotential",
  positive: "charge-positive",
  negative: "charge-negative",
  neutral: "field-neutral",
  force: "field-force",
  select: "canvas-select",
  test: "field-test-charge",
  glyph: "charge-glyph",
};
export const fieldPalette = (dark) => ({
  dark,
  ...paletteOf(FIELD_COLOURS, dark),
});

// Three significant figures with an SI prefix: 0.0000123 T → "12.3 µT".
const PREFIXES = [
  [1e9, "G"],
  [1e6, "M"],
  [1e3, "k"],
  [1, ""],
  [1e-3, "m"],
  [1e-6, "µ"],
  [1e-9, "n"],
  [1e-12, "p"],
];
export function si(value, unit) {
  if (!Number.isFinite(value)) return "–";
  const size = Math.abs(value);
  if (size < 1e-15) return "0 " + unit;
  for (const [factor, prefix] of PREFIXES)
    if (size >= factor * 0.9995)
      return (
        (value / factor).toPrecision(3).replace("-", "−") + " " + prefix + unit
      );
  return (value / 1e-12).toPrecision(2).replace("-", "−") + " p" + unit;
}
export const tidy = (v, places = 4) => String(Number(v.toFixed(places)));
export const signed = (v, unit) =>
  (v > 0 ? "+" : v < 0 ? "−" : "") + tidy(Math.abs(v), 2) + " " + unit;

// `view` is { x, y, scale, width, height }: the screen position (CSS px) of
// the world origin, pixels per metre (y up) and the canvas size. The page may
// change it between frames.
export function createFieldRenderer(ctx, view) {
  // The scene being drawn; set by compute() and drawScene().
  let lab = null,
    state = null,
    tests = null,
    dark = false;
  const screen = (x, y) => [view.x + x * view.scale, view.y - y * view.scale],
    world = (sx, sy) => ({
      x: (sx - view.x) / view.scale,
      y: (view.y - sy) / view.scale,
    }),
    sources = () => lab.list(state.mode);

  function viewBounds(margin) {
    const lo = world(0, view.height),
      hi = world(view.width, 0);
    return {
      minX: lo.x - margin,
      maxX: hi.x + margin,
      minY: lo.y - margin,
      maxY: hi.y + margin,
    };
  }
  // Regions that do not move with the view, so that panning redraws the same
  // lines. `anchoredBounds` surrounds the sources by `margin` and takes in
  // whatever is on screen; `referenceBounds` is the sources with half a screen
  // round them, used to choose contour steps.
  function sourceBox(margin) {
    const list = sources();
    if (!list.length) return null;
    const reach = (s) =>
      s.kind === "plate" || s.kind === "magnet" ? s.length / 2 : 0;
    return {
      minX: Math.min(...list.map((s) => s.x - reach(s))) - margin,
      maxX: Math.max(...list.map((s) => s.x + reach(s))) + margin,
      minY: Math.min(...list.map((s) => s.y - reach(s))) - margin,
      maxY: Math.max(...list.map((s) => s.y + reach(s))) + margin,
    };
  }
  // Lines are followed this far past the edge of the screen: two arrows that
  // fall close together become one, so a line must be known a little beyond
  // any arrow that can be seen (see arrows.js).
  function arrowMargin() {
    return 0.5 * arrowSpacing() + 12 / view.scale;
  }
  function snappedView() {
    // The view, widened outwards to a coarse lattice (512 px).
    const v = viewBounds(arrowMargin()),
      lattice = 512 / view.scale;
    return {
      minX: Math.floor(v.minX / lattice) * lattice,
      maxX: Math.ceil(v.maxX / lattice) * lattice,
      minY: Math.floor(v.minY / lattice) * lattice,
      maxY: Math.ceil(v.maxY / lattice) * lattice,
    };
  }
  function anchoredBounds() {
    const v = snappedView(),
      box = sourceBox((1.2 * Math.max(view.width, view.height)) / view.scale);
    return box
      ? {
          minX: Math.min(v.minX, box.minX),
          maxX: Math.max(v.maxX, box.maxX),
          minY: Math.min(v.minY, box.minY),
          maxY: Math.max(v.maxY, box.maxY),
        }
      : v;
  }
  function referenceBounds() {
    return (
      sourceBox((0.5 * Math.max(view.width, view.height)) / view.scale) ||
      snappedView()
    );
  }
  function compute(model, sceneState) {
    lab = model;
    state = sceneState;
    const px = 1 / view.scale,
      result = {
        lines: [],
        equipotentials: [],
        step: 0,
        shade: null,
        scale: 0,
      };
    if (state.mode === "electric") {
      if (state.show.lines)
        result.lines = electricFieldLines(
          lab,
          // Lines that leave the screen and come back are followed this far.
          anchoredBounds(),
          {
            linesPerNC: Math.max(1, Math.round(8 * state.density)),
            step: 7 * px,
            startRadius: 9 * px,
          },
        );
      if (state.show.equipotentials) {
        const e = equipotentialLines(lab, viewBounds(12 * px), {
          cell: 6 * px,
          count: Math.round(14 * state.density),
          reference: referenceBounds(),
        });
        result.equipotentials = e.lines;
        result.step = e.step;
        result.shade = potentialShade(e.grid, e.scale);
        result.scale = e.scale;
        result.legendText = e.scale ? `full at ±${si(e.scale, "V")}` : "";
      }
    } else if (state.show.lines)
      result.lines = magneticFieldLines(lab, viewBounds(arrowMargin()), {
        cell: 5 * px,
        count: Math.round(16 * state.density),
        coreRadius: 14 * px,
        reference: referenceBounds(),
      }).lines;
    // A line that stops short of the edge of the traced region runs from one
    // source to another, and always carries an arrow.
    const features = arrowFeatures(lab.compiled(), state.mode),
      spacing = arrowSpacing(),
      traced = state.mode === "electric" ? anchoredBounds() : null,
      inside = (p) =>
        p[0] > traced.minX + 8 * px &&
        p[0] < traced.maxX - 8 * px &&
        p[1] > traced.minY + 8 * px &&
        p[1] < traced.maxY - 8 * px;
    result.arrows = result.lines.map((line) =>
      lineArrows(line, features, spacing, {
        whole: !!traced && inside(line[0]) && inside(line[line.length - 1]),
      }),
    );
    result.stepText =
      state.mode === "electric" && state.show.equipotentials && result.step
        ? "every " + tidy(result.step, 6) + " V"
        : "";
    return result;
  }
  // The potential as a picture, one pixel per sample: red where V is positive,
  // blue where negative, and more opaque the larger |V| is, in proportion up
  // to `scale` (beyond which it stays at full strength).
  function potentialShade(grid, scale) {
    if (!(scale > 0)) return null;
    try {
      const c = fieldPalette(dark),
        rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
        red = rgb(c.positive),
        blue = rgb(c.negative),
        image = document.createElement("canvas"),
        g = image.getContext("2d"),
        pixels = g.createImageData(grid.nx, grid.ny);
      image.width = grid.nx;
      image.height = grid.ny;
      for (let j = 0; j < grid.ny; j++)
        for (let i = 0; i < grid.nx; i++) {
          const v = grid.values[j * grid.nx + i],
            colour = v > 0 ? red : blue,
            // Image rows run down the screen; grid rows run up.
            k = 4 * ((grid.ny - 1 - j) * grid.nx + i);
          pixels.data[k] = colour[0];
          pixels.data[k + 1] = colour[1];
          pixels.data[k + 2] = colour[2];
          pixels.data[k + 3] = 165 * Math.min(1, Math.abs(v) / scale);
        }
      g.putImageData(pixels, 0, 0);
      return {
        image,
        // Each pixel is centred on its sample.
        x: grid.minX - grid.cell / 2,
        y: grid.minY + (grid.ny - 0.5) * grid.cell,
        width: grid.nx * grid.cell,
        height: grid.ny * grid.cell,
      };
    } catch {
      return null; // no canvas pixels here (the DOM test)
    }
  }
  function strokePath(points, toScreen) {
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const [x, y] = toScreen ? screen(points[i][0], points[i][1]) : points[i];
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  function arrowHead(x, y, angle, size) {
    size *= arrowheadScale();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.7, size * 0.62);
    ctx.lineTo(-size * 0.7, -size * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // A field line with its direction arrows. Where the arrows sit is worked out
  // in arrows.js from the line and the sources alone, so they stay on the same
  // spot of the line however the view is moved.
  function arrowSpacing() {
    return GRID * 2 ** Math.round(Math.log2(170 / (GRID * view.scale)));
  }
  function fieldLine(points, arrows, pointSources) {
    if (points.length < 2) return;
    const width = ctx.lineWidth;
    ctx.lineWidth = width * fieldLineWeight();
    strokePath(points, true);
    ctx.lineWidth = width;
    for (const a of arrows) {
      const [x, y] = screen(a.x, a.y);
      if (x < -10 || y < -10 || x > view.width + 10 || y > view.height + 10)
        continue;
      if (pointSources.some((s) => Math.hypot(x - s[0], y - s[1]) < 22))
        continue;
      arrowHead(x, y, Math.atan2(-a.dy, a.dx), 5.5);
    }
  }
  function drawGrid(c) {
    const lo = world(0, view.height),
      hi = world(view.width, 0),
      step =
        GRID * 2 ** Math.max(0, Math.ceil(Math.log2(14 / (GRID * view.scale))));
    ctx.lineWidth = 1;
    const px = step * view.scale;
    gridDash(ctx, px, (screen(0, Math.ceil(lo.y / step) * step)[1] + 0.5) % px);
    for (let x = Math.ceil(lo.x / step) * step; x <= hi.x; x += step) {
      const major = Math.abs(x - Math.round(x)) < 1e-6 || step >= 1;
      ctx.strokeStyle = major ? c.gridMajor : c.gridMinor;
      const sx = Math.round(screen(x, 0)[0]) + 0.5;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, view.height);
      ctx.stroke();
    }
    gridDash(ctx, px, (screen(Math.ceil(lo.x / step) * step, 0)[0] + 0.5) % px);
    for (let y = Math.ceil(lo.y / step) * step; y <= hi.y; y += step) {
      const major = Math.abs(y - Math.round(y)) < 1e-6 || step >= 1;
      ctx.strokeStyle = major ? c.gridMajor : c.gridMinor;
      const sy = Math.round(screen(0, y)[1]) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(view.width, sy);
      ctx.stroke();
    }
    endGrid(ctx);
  }
  function drawScaleBar(c) {
    let length = 1;
    for (const candidate of [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50]) {
      length = candidate;
      if (candidate * view.scale >= 70) break;
    }
    const w = length * view.scale,
      x = Math.round(view.width / 2 - w / 2) + 0.5,
      y = view.height - 30.5;
    ctx.strokeStyle = ctx.fillStyle = c.soft;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y - 4);
    ctx.stroke();
    ctx.font = "10px ui-monospace,monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(length + " m", x + w / 2, y + 4);
  }
  function drawFieldArrows(c, colour, field, pointSources) {
    const step =
        GRID * 2 ** Math.max(0, Math.ceil(Math.log2(44 / (GRID * view.scale)))),
      lo = world(0, view.height),
      hi = world(view.width, 0),
      out = [0, 0],
      arrows = [];
    for (let x = Math.ceil(lo.x / step) * step; x <= hi.x; x += step)
      for (let y = Math.ceil(lo.y / step) * step; y <= hi.y; y += step) {
        const [sx, sy] = screen(x, y);
        if (pointSources.some((s) => Math.hypot(sx - s[0], sy - s[1]) < 16))
          continue;
        field(x, y, out);
        const size = Math.hypot(out[0], out[1]);
        if (size > 0) arrows.push([sx, sy, Math.atan2(-out[1], out[0]), size]);
      }
    if (!arrows.length) return;
    // Length and opacity grow with the square root of the field relative to
    // the strongest tenth on screen: a guide to strength, not a scale.
    const sizes = arrows.map((a) => a[3]).sort((a, b) => a - b),
      reference = sizes[Math.floor(0.9 * (sizes.length - 1))] || 1;
    ctx.strokeStyle = ctx.fillStyle = colour;
    ctx.lineWidth = 1.4;
    for (const [sx, sy, angle, size] of arrows) {
      const t = Math.min(1, Math.sqrt(size / reference)),
        half = (7 + 15 * t) / 2,
        dx = Math.cos(angle) * half,
        dy = Math.sin(angle) * half;
      ctx.globalAlpha = 0.3 + 0.7 * t;
      ctx.beginPath();
      ctx.moveTo(sx - dx, sy - dy);
      ctx.lineTo(sx + dx * 0.5, sy + dy * 0.5);
      ctx.stroke();
      arrowHead(sx + dx * 0.55, sy + dy * 0.55, angle, 4);
    }
    ctx.globalAlpha = 1;
  }
  function label(text, x, y, c, align = "center") {
    ctx.font = "600 10.5px system-ui,sans-serif";
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = c.back;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = c.ink;
    ctx.fillText(text, x, y);
  }
  function drawSource(s, c, isSelected) {
    const [x, y] = screen(s.x, s.y),
      signColour = (v) => (v > 0 ? c.positive : v < 0 ? c.negative : c.neutral);
    ctx.save();
    if (s.kind === "charge") {
      ctx.fillStyle = signColour(s.charge);
      ctx.beginPath();
      ctx.arc(x, y, SOURCE_RADIUS, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = c.glyph;
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      if (s.charge !== 0) {
        ctx.moveTo(x - 5, y);
        ctx.lineTo(x + 5, y);
      }
      if (s.charge > 0) {
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x, y + 5);
      }
      ctx.stroke();
      if (state.show.labels)
        label(signed(s.charge * 1e9, "nC"), x, y + SOURCE_RADIUS + 10, c);
    } else if (s.kind === "wire") {
      ctx.fillStyle = c.panel;
      ctx.strokeStyle = c.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, SOURCE_RADIUS, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.ink;
      ctx.lineCap = "round";
      ctx.beginPath();
      if (s.current > 0) {
        ctx.arc(x, y, 3.2, 0, 2 * Math.PI);
        ctx.fill();
      } else if (s.current < 0) {
        ctx.moveTo(x - 4.5, y - 4.5);
        ctx.lineTo(x + 4.5, y + 4.5);
        ctx.moveTo(x + 4.5, y - 4.5);
        ctx.lineTo(x - 4.5, y + 4.5);
        ctx.stroke();
      }
      if (state.show.labels)
        label(
          tidy(Math.abs(s.current), 2) +
            " A " +
            (s.current > 0 ? "out" : s.current < 0 ? "in" : ""),
          x,
          y + SOURCE_RADIUS + 10,
          c,
        );
    } else {
      // Plates and magnets are drawn in their own frame: x along the length.
      ctx.translate(x, y);
      ctx.rotate(-s.angle);
      const half = (s.length / 2) * view.scale;
      if (s.kind === "plate") {
        ctx.strokeStyle = signColour(s.density);
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-half, 0);
        ctx.lineTo(half, 0);
        ctx.stroke();
        if (isSelected) {
          ctx.strokeStyle = c.select;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(-half - 6, -7, 2 * half + 12, 14);
        }
      } else {
        const h = (s.width / 2) * view.scale,
          north = s.sheetCurrent >= 0 ? 1 : -1;
        ctx.strokeStyle = c.ink;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-half, -h, 2 * half, 2 * h);
        if (s.sheetCurrent !== 0 && half > 16 && h > 7) {
          ctx.fillStyle = c.ink;
          ctx.font = "700 12px system-ui,sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          for (const [letter, side] of [
            ["N", north],
            ["S", -north],
          ]) {
            ctx.save();
            ctx.translate(side * Math.max(half - 11, half / 2), 0);
            ctx.rotate(s.angle);
            ctx.fillText(letter, 0, 0.5);
            ctx.restore();
          }
        }
        if (isSelected) {
          ctx.strokeStyle = c.select;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(-half - 5, -h - 5, 2 * half + 10, 2 * h + 10);
        }
      }
      ctx.restore();
      if (state.show.labels) {
        // Label beside the middle, on the screen-lower side.
        const nx = Math.sin(s.angle),
          ny = Math.cos(s.angle),
          flip = ny < 0 ? -1 : 1,
          off = (s.kind === "magnet" ? (s.width / 2) * view.scale : 0) + 14;
        label(
          s.kind === "plate"
            ? signed(s.density * 1e9, "nC/m²")
            : "nI = " + tidy(Math.abs(s.sheetCurrent), 1) + " A/m",
          x + flip * nx * off,
          y + flip * ny * off,
          c,
        );
      }
      return;
    }
    if (isSelected) {
      ctx.strokeStyle = c.select;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(x, y, SOURCE_RADIUS + 5, 0, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Magnet bodies go under the field lines, so the field inside stays visible.
  function drawMagnetBody(s, c) {
    const [x, y] = screen(s.x, s.y),
      half = (s.length / 2) * view.scale,
      h = (s.width / 2) * view.scale,
      // The north pole is the end the field leaves from.
      north = s.sheetCurrent >= 0 ? 1 : -1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-s.angle);
    ctx.globalAlpha = c.dark ? 0.5 : 0.42;
    ctx.fillStyle = s.sheetCurrent === 0 ? c.neutral : c.negative;
    ctx.fillRect(north > 0 ? -half : 0, -h, half, 2 * h);
    ctx.fillStyle = s.sheetCurrent === 0 ? c.neutral : c.positive;
    ctx.fillRect(north > 0 ? 0 : -half, -h, half, 2 * h);
    ctx.restore();
  }
  function drawForces(c) {
    const unit = state.mode === "electric" ? "N" : "N/m",
      forces = [];
    for (const s of sources()) {
      const f = lab.forceOn(s.id);
      if (f) forces.push([s, f, Math.hypot(f.x, f.y)]);
    }
    const largest = Math.max(0, ...forces.map((f) => f[2]));
    if (!(largest > 0)) return;
    ctx.strokeStyle = ctx.fillStyle = c.force;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    for (const [s, f, size] of forces) {
      // Arrow lengths are in proportion to each other; the longest is 80 px.
      const length = (80 * size) / largest;
      if (length < 3) continue;
      const [x, y] = screen(s.x, s.y),
        ux = f.x / size,
        uy = -f.y / size,
        x0 = x + ux * (SOURCE_RADIUS + 2),
        y0 = y + uy * (SOURCE_RADIUS + 2),
        x1 = x0 + ux * length,
        y1 = y0 + uy * length;
      ctx.strokeStyle = ctx.fillStyle = c.force;
      ctx.lineWidth = 2.5 * vectorWeight();
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      arrowHead(x1 + ux * 5, y1 + uy * 5, Math.atan2(uy, ux), 7);
      // Label beside the middle of the arrow, on its upper side.
      const side = ux > 0 ? -1 : 1,
        mx = (x0 + x1) / 2 + side * -uy * 11,
        my = (y0 + y1) / 2 + side * ux * 11;
      label(si(size, unit), mx, my, c, Math.abs(ux) < 0.5 ? "left" : "center");
    }
  }
  // Test charges and the paths they have taken.
  function drawTests(c) {
    const many = tests.items.length > 12;
    ctx.lineJoin = "round";
    ctx.strokeStyle = c.test;
    // All the trails in one path: a grid of test charges has hundreds.
    ctx.lineWidth = many ? 1 : 1.6;
    ctx.globalAlpha = many ? 0.55 : 0.75;
    ctx.setLineDash(many ? [] : [2, 3]);
    ctx.beginPath();
    for (const t of tests.items)
      for (let i = 0; i < t.trail.length; i++) {
        const [x, y] = screen(t.trail[i][0], t.trail[i][1]);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    for (const t of tests.items) {
      const [x, y] = screen(t.x, t.y);
      if (x < -8 || y < -8 || x > view.width + 8 || y > view.height + 8)
        continue;
      ctx.strokeStyle = c.test;
      ctx.beginPath();
      ctx.arc(x, y, many ? 3.2 : 5.5, 0, 2 * Math.PI);
      ctx.fillStyle = t.moving ? c.test : c.panel;
      ctx.fill();
      ctx.lineWidth = many ? 1.2 : 1.5;
      ctx.stroke();
      if (many) continue;
      ctx.strokeStyle = t.moving ? c.panel : c.test;
      ctx.beginPath();
      ctx.moveTo(x - 3, y);
      ctx.lineTo(x + 3, y);
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x, y + 3);
      ctx.stroke();
      if (state.show.labels && t.moving)
        label(si(Math.hypot(t.vx, t.vy), "m/s"), x, y - 15, c);
    }
  }

  // Field lines, equipotentials and the potential shading for the current
  // view; slow, so the page keeps the result until the scene or view changes.
  // Options of drawScene: computed (from compute), tests (TestCharges or
  // null), grid (default true), dark.
  function drawScene(model, sceneState, options) {
    lab = model;
    state = sceneState;
    tests = options.tests || { items: [] };
    dark = !!options.dark;
    const computed = options.computed;
    const c = fieldPalette(dark),
      electric = state.mode === "electric",
      list = sources(),
      pointSources = list
        .filter((s) => s.kind === "charge" || s.kind === "wire")
        .map((s) => screen(s.x, s.y));
    ctx.setLineDash([]);
    if (computed.shade) {
      const [sx, sy] = screen(computed.shade.x, computed.shade.y);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(
        computed.shade.image,
        sx,
        sy,
        computed.shade.width * view.scale,
        computed.shade.height * view.scale,
      );
    }
    if (options.grid !== false) drawGrid(c);
    if (computed.equipotentials.length) {
      ctx.strokeStyle = c.equipotential;
      // Solid, not dashed: dashes would crawl along the line as the view
      // moves. The zero-volt line is heavier, as the reference.
      for (const line of computed.equipotentials) {
        ctx.lineWidth = line.level === 0 ? 1.8 : 0.9;
        strokePath(line.points, true);
      }
    }
    for (const s of list) if (s.kind === "magnet") drawMagnetBody(s, c);
    const colour = electric ? c.electric : c.magnetic;
    ctx.strokeStyle = ctx.fillStyle = colour;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    computed.lines.forEach((line, i) =>
      fieldLine(line, computed.arrows[i], pointSources),
    );
    if (state.show.arrows)
      drawFieldArrows(
        c,
        colour,
        electric
          ? (x, y, out) => lab.electricField(x, y, 0, out)
          : (x, y, out) => lab.magneticField(x, y, 0, out),
        pointSources,
      );
    const chosen = state.selected[state.mode];
    for (const kind of ["magnet", "plate", "wire", "charge"])
      for (const s of list)
        if (s.kind === kind) drawSource(s, c, s.id === chosen);
    if (state.show.forces) drawForces(c);
    if (electric) drawTests(c);
    drawScaleBar(c);
  }

  return {
    compute: (model, sceneState, options = {}) => {
      dark = !!options.dark;
      return compute(model, sceneState);
    },
    drawScene,
    viewBounds,
    screen,
    world,
  };
}
