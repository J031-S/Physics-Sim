// Electric & magnetic fields page: canvas drawing, pointer and keyboard
// input, panels. All physics lives in model.js.
import { setupPreferences } from "../preferences.js";
import { setupNav } from "../nav.js";
import {
  FieldLab,
  KINDS,
  EPS0,
  MU0,
  electricFieldLines,
  equipotentialLines,
  magneticFieldLines,
  TestCharges,
} from "./model.js";
import { presets } from "./presets.js";

const $ = (id) => document.getElementById(id),
  canvas = $("canvas"),
  ctx = canvas.getContext("2d");
setupNav();
const prefs = setupPreferences($);
const lab = new FieldLab();

const BASE_SCALE = 100, // pixels per metre at 100% zoom
  GRID = 0.25,
  ROTATE_STEP = Math.PI / 12,
  SOURCE_RADIUS = 11;
const view = { scale: BASE_SCALE, x: 0, y: 0, width: 0, height: 0 };
const state = {
  mode: "electric",
  tool: "grab",
  selected: { electric: null, magnetic: null },
  snapping: false,
  density: 1,
  show: {
    lines: true,
    arrows: false,
    equipotentials: false,
    forces: false,
    labels: true,
  },
};
// Test charges live in the electric scene; they feel the field only.
// One that strays 150 m away is stopped, so the scene can come to rest.
const tests = new TestCharges(lab, { range: 150, limit: 1200 });
let lastFrame = 0,
  previewTheme = null;
let drag = null,
  computed = null,
  stale = true,
  queued = false,
  pointer = null,
  toastTimer;

const ADD = {
  positive: {
    kind: "charge",
    props: { charge: 1e-9 },
    name: "Positive charge",
    help: "Click the scene to place a positive point charge.",
  },
  negative: {
    kind: "charge",
    props: { charge: -1e-9 },
    name: "Negative charge",
    help: "Click the scene to place a negative point charge.",
  },
  plate: {
    kind: "plate",
    props: {},
    name: "Charged plate",
    help: "Click to place a plate, seen edge-on. Place a second with the opposite charge to make a uniform field.",
  },
  "wire-out": {
    kind: "wire",
    props: { current: 5 },
    name: "Wire, current out",
    help: "Click to place a straight wire carrying current out of the screen (⊙).",
  },
  "wire-in": {
    kind: "wire",
    props: { current: -5 },
    name: "Wire, current in",
    help: "Click to place a straight wire carrying current into the screen (⊗).",
  },
  magnet: {
    kind: "magnet",
    props: {},
    name: "Bar magnet / solenoid",
    help: "Click to place a bar magnet. It is also a solenoid seen in cross-section.",
  },
  test: {
    kind: "test",
    name: "Test charge",
    help: "Click to release a +1 nC, 1 µg test charge from rest. It moves in the field without changing it.",
  },
};
const TOOL_HELP = {
  grab: [
    "Grab",
    "Drag a source to move it; Ctrl-drag turns a plate or magnet. Click one to change its values.",
  ],
  pan: ["Pan", "Drag to move the view. Scroll to zoom."],
};

// Each quantity a source exposes: model key, display unit and the factor from
// SI to that unit. Ranges mirror LIMITS in model.js.
const FIELDS = {
  charge: [
    {
      key: "charge",
      label: "Charge",
      unit: "nC",
      factor: 1e9,
      min: -20,
      max: 20,
      step: 0.5,
    },
  ],
  plate: [
    {
      key: "density",
      label: "Charge density",
      unit: "nC/m²",
      factor: 1e9,
      min: -10,
      max: 10,
      step: 0.05,
    },
    {
      key: "length",
      label: "Length",
      unit: "m",
      factor: 1,
      min: 0.2,
      max: 20,
      step: 0.1,
    },
    { key: "angle", label: "Angle", angle: true },
  ],
  wire: [
    {
      key: "current",
      label: "Current",
      unit: "A",
      factor: 1,
      min: -100,
      max: 100,
      step: 0.5,
    },
  ],
  magnet: [
    {
      key: "sheetCurrent",
      label: "Coil current nI",
      unit: "A/m",
      factor: 1,
      min: -500,
      max: 500,
      step: 5,
    },
    {
      key: "length",
      label: "Length",
      unit: "m",
      factor: 1,
      min: 0.2,
      max: 20,
      step: 0.1,
    },
    {
      key: "width",
      label: "Width",
      unit: "m",
      factor: 1,
      min: 0.1,
      max: 10,
      step: 0.1,
    },
    { key: "angle", label: "Angle", angle: true },
  ],
};
const POSITION = [
  {
    key: "x",
    label: "Position x",
    unit: "m",
    factor: 1,
    min: -1000,
    max: 1000,
    step: 0.05,
    plain: true,
  },
  {
    key: "y",
    label: "Position y",
    unit: "m",
    factor: 1,
    min: -1000,
    max: 1000,
    step: 0.05,
    plain: true,
  },
];

// ---------------------------------------------------------------- helpers

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}
function attempt(fn) {
  try {
    fn();
    return true;
  } catch (error) {
    toast(error.message);
    return false;
  }
}
const screen = (x, y) => [view.x + x * view.scale, view.y - y * view.scale];
const world = (sx, sy) => ({
  x: (sx - view.x) / view.scale,
  y: (view.y - sy) / view.scale,
});
function eventPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { sx: e.clientX - r.left, sy: e.clientY - r.top };
}
// Keeps a drag alive when the pointer leaves the canvas. Capture is refused
// for a pointer that is no longer down; the drag then simply ends at the edge.
function capture(e) {
  try {
    canvas.setPointerCapture?.(e.pointerId);
  } catch {}
}
const snapTo = (v, step) => Math.round(v / step) * step;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const tidy = (v, places = 4) => String(Number(v.toFixed(places)));
const isDark = () => document.documentElement.dataset.theme === "dark";

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
function si(value, unit) {
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
// Angles are shown in (−180°, 180°], anticlockwise from the +x direction.
function angleText(radians) {
  if (radians <= -Math.PI + 1e-9) radians = Math.PI;
  if (prefs.angleUnit === "radians")
    return (radians.toFixed(2).replace("-", "−") + " rad").replace(
      "−0.00",
      "0.00",
    );
  return (
    String(Math.round((radians * 180) / Math.PI) + 0).replace("-", "−") + "°"
  );
}
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const signed = (v, unit) =>
  (v > 0 ? "+" : v < 0 ? "−" : "") + tidy(Math.abs(v), 2) + " " + unit;

function invalidate(recompute = true) {
  if (recompute) stale = true;
  if (queued) return;
  queued = true;
  requestAnimationFrame((now) => {
    queued = false;
    // Test charges move in real time while the electric scene is on show.
    const animate = state.mode === "electric" && tests.moving > 0;
    if (animate) {
      const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 1 / 30) : 0;
      tests.captureRadius = SOURCE_RADIUS / view.scale;
      tests.step(dt > 0 ? dt : 1 / 60);
      updateTests();
    }
    lastFrame = animate ? now : 0;
    draw();
    if (state.mode === "electric" && tests.moving > 0) invalidate(false);
  });
}

function updateTests() {
  const n = tests.items.length;
  $("test-row").hidden = state.mode !== "electric" || n === 0;
  $("test-status").textContent =
    `${n} test charge${n === 1 ? "" : "s"} · ${tests.moving} moving`;
}

const sources = () => lab.list(state.mode);
const selected = () => lab.get(state.selected[state.mode]);

// ---------------------------------------------------------------- geometry

function hitTest(sx, sy) {
  const list = sources();
  // Point sources first, then magnets, then plates; latest on top.
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    if (s.kind !== "charge" && s.kind !== "wire") continue;
    const [x, y] = screen(s.x, s.y);
    if (Math.hypot(sx - x, sy - y) <= SOURCE_RADIUS + 4) return s;
  }
  const p = world(sx, sy);
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    if (s.kind !== "magnet" && s.kind !== "plate") continue;
    const c = Math.cos(s.angle),
      n = Math.sin(s.angle),
      u = (p.x - s.x) * c + (p.y - s.y) * n,
      v = -(p.x - s.x) * n + (p.y - s.y) * c,
      slack = 7 / view.scale,
      half = s.kind === "magnet" ? s.width / 2 : 0;
    if (Math.abs(u) <= s.length / 2 + slack && Math.abs(v) <= half + slack)
      return s;
  }
  return null;
}

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

function recompute() {
  const px = 1 / view.scale,
    result = { lines: [], equipotentials: [], step: 0, shade: null, scale: 0 };
  if (state.mode === "electric") {
    if (state.show.lines)
      result.lines = electricFieldLines(
        lab,
        // Lines that leave the screen and come back are followed this far.
        viewBounds(0.4 * Math.max(view.width, view.height) * px),
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
      });
      result.equipotentials = e.lines;
      result.step = e.step;
      result.shade = potentialShade(e.grid, e.scale);
      result.scale = e.scale;
      $("potential-legend-text").textContent = e.scale
        ? `full at ±${si(e.scale, "V")}`
        : "";
    }
  } else if (state.show.lines)
    result.lines = magneticFieldLines(lab, viewBounds(10 * px), {
      cell: 5 * px,
      count: Math.round(16 * state.density),
      coreRadius: 14 * px,
    }).lines;
  $("equipotential-step").textContent =
    state.mode === "electric" && state.show.equipotentials && result.step
      ? "every " + tidy(result.step, 6) + " V"
      : "";
  $("potential-legend").hidden = !result.scale;
  return result;
}

// The potential as a picture, one pixel per sample: red where V is positive,
// blue where negative, and more opaque the larger |V| is, in proportion up
// to `scale` (beyond which it stays at full strength).
function potentialShade(grid, scale) {
  if (!(scale > 0)) return null;
  try {
    const c = palette(),
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

// ---------------------------------------------------------------- drawing

function palette() {
  const dark = isDark();
  return {
    dark,
    ink: dark ? "#ebe5d6" : "#354438",
    soft: dark ? "#bdb4a2" : "#6f7f63",
    panel: dark ? "#2a2722" : "#fffefa",
    gridMinor: dark ? "#2a2721" : "#dce1d4",
    gridMajor: dark ? "#3d3930" : "#c6cebf",
    electric: dark ? "#e0a94a" : "#ae7d24",
    magnetic: dark ? "#a891e0" : "#8060ae",
    equipotential: dark ? "#6fbfae" : "#3f8c7c",
    positive: dark ? "#e9826e" : "#c2503c",
    negative: dark ? "#6fa8ec" : "#3f76aa",
    neutral: dark ? "#8d8777" : "#9aa392",
    force: dark ? "#f2c14e" : "#b4530a",
    select: dark ? "#a9c49d" : "#4f7547",
    test: dark ? "#8fd3a4" : "#2f7d4f",
  };
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

// A field line with direction arrows every so often along its length.
function fieldLine(points, pointSources) {
  if (points.length < 2) return;
  const path = points.map((p) => screen(p[0], p[1]));
  strokePath(path);
  let travelled = 0,
    next = 80;
  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1],
      [x1, y1] = path[i],
      d = Math.hypot(x1 - x0, y1 - y0);
    while (d > 0 && travelled + d >= next) {
      const f = (next - travelled) / d,
        x = x0 + f * (x1 - x0),
        y = y0 + f * (y1 - y0);
      next += 190;
      if (x < -10 || y < -10 || x > view.width + 10 || y > view.height + 10)
        continue;
      if (pointSources.some((s) => Math.hypot(x - s[0], y - s[1]) < 22))
        continue;
      arrowHead(x, y, Math.atan2(y1 - y0, x1 - x0), 5.5);
    }
    travelled += d;
  }
}

function drawGrid(c) {
  const lo = world(0, view.height),
    hi = world(view.width, 0),
    step =
      GRID * 2 ** Math.max(0, Math.ceil(Math.log2(14 / (GRID * view.scale))));
  ctx.lineWidth = 1;
  for (let x = Math.ceil(lo.x / step) * step; x <= hi.x; x += step) {
    const major = Math.abs(x - Math.round(x)) < 1e-6 || step >= 1;
    ctx.strokeStyle = major ? c.gridMajor : c.gridMinor;
    const sx = Math.round(screen(x, 0)[0]) + 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, view.height);
    ctx.stroke();
  }
  for (let y = Math.ceil(lo.y / step) * step; y <= hi.y; y += step) {
    const major = Math.abs(y - Math.round(y)) < 1e-6 || step >= 1;
    ctx.strokeStyle = major ? c.gridMajor : c.gridMinor;
    const sy = Math.round(screen(0, y)[1]) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(view.width, sy);
    ctx.stroke();
  }
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
  ctx.strokeStyle = c.dark ? "#1c1a16" : "#f2f0e9";
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
    ctx.strokeStyle = "#fff";
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
    ctx.lineWidth = 2.5;
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
    if (x < -8 || y < -8 || x > view.width + 8 || y > view.height + 8) continue;
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

// A test charge at every grid intersection on screen, released together.
// The spacing is the drawn grid's, doubled until the points are at least
// 40 px apart, so they stay distinct at any zoom.
function fillTestGrid() {
  const spacing =
    GRID * 2 ** Math.max(0, Math.ceil(Math.log2(40 / (GRID * view.scale))));
  attempt(() => {
    tests.captureRadius = SOURCE_RADIUS / view.scale;
    // Trails are kept to about 1000 px each, a point every 4 px.
    tests.trailSpacing = 4 / view.scale;
    tests.trailLength = 250;
    const n = tests.fillGrid(viewBounds(0), spacing);
    toast(`${n} test charges released, ${tidy(spacing, 2)} m apart`);
  });
  lastFrame = 0;
  setTool("grab");
  updateTests();
  invalidate(false);
}

function draw() {
  const r = canvas.getBoundingClientRect(),
    dpr = window.devicePixelRatio || 1;
  if (view.width !== r.width || view.height !== r.height) {
    if (view.width) {
      view.x += (r.width - view.width) / 2;
      view.y += (r.height - view.height) / 2;
    } else {
      view.x = r.width / 2;
      view.y = r.height / 2 + 20;
    }
    view.width = r.width;
    view.height = r.height;
    stale = true;
  }
  if (
    canvas.width !== Math.round(r.width * dpr) ||
    canvas.height !== Math.round(r.height * dpr)
  ) {
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
  }
  if (stale || !computed) {
    computed = recompute();
    stale = false;
  }
  const c = palette(),
    electric = state.mode === "electric",
    list = sources(),
    pointSources = list
      .filter((s) => s.kind === "charge" || s.kind === "wire")
      .map((s) => screen(s.x, s.y));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, r.width, r.height);
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
  if (prefs.grid) drawGrid(c);
  if (computed.equipotentials.length) {
    ctx.strokeStyle = c.equipotential;
    ctx.lineWidth = 1.1;
    ctx.setLineDash([5, 4]);
    for (const line of computed.equipotentials) {
      // The zero-volt line is drawn solid, as the reference.
      ctx.setLineDash(line.level === 0 ? [] : [5, 4]);
      strokePath(line.points, true);
    }
    ctx.setLineDash([]);
  }
  for (const s of list) if (s.kind === "magnet") drawMagnetBody(s, c);
  const colour = electric ? c.electric : c.magnetic;
  ctx.strokeStyle = ctx.fillStyle = colour;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  for (const line of computed.lines) fieldLine(line, pointSources);
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
  $("zoom-level").textContent =
    Math.round((view.scale / BASE_SCALE) * 100) + "%";
}

// ---------------------------------------------------------------- panels

function updateProbe() {
  const electric = state.mode === "electric";
  if (!pointer) {
    for (const id of ["position", "field", "direction", "potential"])
      $("probe-" + id).textContent = "–";
    return;
  }
  const p = world(pointer.sx, pointer.sy),
    f = electric ? lab.electricField(p.x, p.y) : lab.magneticField(p.x, p.y),
    size = Math.hypot(f[0], f[1]);
  $("probe-position").textContent =
    `(${p.x.toFixed(2)}, ${p.y.toFixed(2)}) m`.replaceAll("-", "−");
  $("probe-field").textContent = si(size, electric ? "N/C" : "T");
  $("probe-direction").textContent =
    size > 0 ? angleText(Math.atan2(f[1], f[0])) : "–";
  if (electric)
    $("probe-potential").textContent = si(lab.potential(p.x, p.y), "V");
}

function fieldSpec(field) {
  if (!field.angle) return field;
  const radians = prefs.angleUnit === "radians";
  return {
    ...field,
    unit: radians ? "rad" : "°",
    factor: radians ? 1 : 180 / Math.PI,
    min: radians ? -3.14 : -180,
    max: radians ? 3.14 : 180,
    step: radians ? 0.01 : 1,
  };
}

function buildForm() {
  const s = selected(),
    form = $("source-form");
  $("selection").hidden = !s;
  form.replaceChildren();
  if (!s) return;
  $("selected-name").textContent = KINDS[s.kind].label;
  for (const raw of [...FIELDS[s.kind], ...POSITION]) {
    const field = fieldSpec(raw),
      row = document.createElement("div"),
      name = document.createElement("label"),
      value = document.createElement("span"),
      number = document.createElement("input"),
      unit = document.createElement("span"),
      id = "source-" + field.key;
    row.className = "prop-row";
    name.textContent = field.label;
    name.htmlFor = id;
    number.type = "number";
    number.id = id;
    number.min = field.min;
    number.max = field.max;
    number.step = "any";
    number.dataset.key = field.key;
    unit.className = "unit";
    unit.textContent = field.unit;
    value.className = "prop-value";
    value.append(number, unit);
    let range = document.createElement("span");
    if (!field.plain) {
      range = document.createElement("input");
      range.type = "range";
      range.min = field.min;
      range.max = field.max;
      range.step = field.step;
      range.dataset.key = field.key;
      range.setAttribute("aria-label", field.label + " slider");
    }
    // `typed` is the number box while it is being typed in: it is left as
    // the student wrote it until they finish.
    const apply = (text, typed) => {
      const ok =
        text !== "" &&
        attempt(() => {
          let v = Number(text) / field.factor;
          if (field.angle) v = wrapAngle(v);
          lab.update(s.id, { [field.key]: v });
        });
      if (ok || !typed) syncForm(ok ? typed : null);
      if (ok) invalidate();
    };
    number.addEventListener("input", () => apply(number.value, number));
    number.addEventListener("change", () => apply(number.value, null));
    if (!field.plain)
      range.addEventListener("input", () => apply(range.value, null));
    row.append(name, range, value);
    form.append(row);
  }
  syncForm();
}

// Refresh the form's values from the model, leaving alone the box being
// typed in.
function syncForm(skip) {
  const s = selected();
  if (!s) return;
  for (const input of $("source-form").querySelectorAll("input")) {
    if (input === skip) continue;
    const raw = [...FIELDS[s.kind], ...POSITION].find(
        (f) => f.key === input.dataset.key,
      ),
      field = fieldSpec(raw);
    input.value = tidy(s[field.key] * field.factor, field.angle ? 2 : 4);
  }
  $("source-note").textContent = sourceNote(s);
}

function sourceNote(s) {
  if (s.kind === "charge" || s.kind === "wire") {
    const f = lab.forceOn(s.id),
      size = Math.hypot(f.x, f.y),
      what = s.kind === "charge" ? "Force on it" : "Force on each metre of it";
    return size > 0
      ? `${what}: ${si(size, s.kind === "charge" ? "N" : "N/m")} at ${angleText(Math.atan2(f.y, f.x))}.`
      : `${what}: none, with no other source or background field.`;
  }
  if (s.kind === "plate")
    return `Seen edge-on; it runs straight into the screen. Close to its middle it gives E ≈ σ/2ε₀ = ${si(Math.abs(s.density) / (2 * EPS0), "N/C")} on each side.`;
  const b = lab.magneticField(s.x, s.y, 0),
    own = Math.hypot(b[0], b[1]);
  return `Also a solenoid in cross-section, running into the screen. A very long one has B = μ₀nI = ${si(MU0 * Math.abs(s.sheetCurrent), "T")} inside; the field at this one's centre is ${si(own, "T")}.`;
}

function select(id) {
  if (state.selected[state.mode] === id) return;
  state.selected[state.mode] = id;
  buildForm();
  invalidate(false);
}

function setTool(tool) {
  state.tool = tool;
  for (const b of document.querySelectorAll("[data-tool]")) {
    b.setAttribute("aria-pressed", String(b.dataset.tool === tool));
    b.classList.toggle("active", b.dataset.tool === tool);
  }
  for (const b of document.querySelectorAll("[data-add]"))
    b.setAttribute("aria-pressed", String(b.dataset.add === tool));
  const [name, help] = ADD[tool]
    ? [ADD[tool].name, ADD[tool].help]
    : TOOL_HELP[tool];
  $("tool-name").textContent = name;
  $("tool-help").textContent = help;
  canvas.style.cursor = ADD[tool] ? "crosshair" : tool === "pan" ? "grab" : "";
}

function status() {
  const n = sources().length;
  $("snap-status").textContent = state.snapping
    ? "Snap on · 0.25 m / 15°"
    : "Snap off · Z toggles 0.25 m / 15°";
  $("snap-status").classList.toggle("snapping", state.snapping);
  $("scene-status").textContent =
    `${state.mode === "electric" ? "Electric" : "Magnetic"} scene · ${n} source${n === 1 ? "" : "s"}`;
}

function setMode(mode) {
  state.mode = mode;
  drag = null;
  const electric = mode === "electric";
  for (const b of document.querySelectorAll("[data-mode]"))
    b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
  for (const b of document.querySelectorAll("[data-for]"))
    b.hidden = b.dataset.for !== mode;
  $("show-equipotentials-label").hidden = !electric;
  lastFrame = 0;
  updateTests();
  $("show-forces-text").textContent = electric
    ? "Forces on charges"
    : "Forces on wires";
  $("probe-field-name").textContent = electric ? "E" : "B";
  for (const el of document.querySelectorAll(".probe-potential"))
    el.hidden = !electric;
  setTool("grab");
  buildForm();
  updateProbe();
  status();
  invalidate();
}

function setSnapping(on) {
  state.snapping = on;
  $("snap-toggle").checked = $("setting-snapping").checked = on;
  status();
}

function syncUniform() {
  $("uniform-electric-x").value = tidy(lab.uniform.electric.x);
  $("uniform-electric-y").value = tidy(lab.uniform.electric.y);
  $("uniform-magnetic-x").value = tidy(lab.uniform.magnetic.x * 1e6);
  $("uniform-magnetic-y").value = tidy(lab.uniform.magnetic.y * 1e6);
}

function fit() {
  const list = sources();
  let scale = BASE_SCALE,
    cx = 0,
    cy = 0;
  if (list.length) {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const s of list) {
      const reach =
        s.kind === "plate" || s.kind === "magnet" ? s.length / 2 : 0;
      minX = Math.min(minX, s.x - reach);
      maxX = Math.max(maxX, s.x + reach);
      minY = Math.min(minY, s.y - reach);
      maxY = Math.max(maxY, s.y + reach);
    }
    cx = (minX + maxX) / 2;
    cy = (minY + maxY) / 2;
    scale = clamp(
      Math.min(
        view.width / (maxX - minX + 6),
        (view.height - 120) / (maxY - minY + 4),
      ),
      25,
      BASE_SCALE,
    );
  }
  view.scale = scale;
  view.x = view.width / 2 - cx * scale;
  view.y = view.height / 2 + 20 + cy * scale;
  invalidate();
}

function zoomAt(sx, sy, factor) {
  const p = world(sx, sy);
  view.scale = clamp(view.scale * factor, 25, 400);
  view.x = sx - p.x * view.scale;
  view.y = sy + p.y * view.scale;
  invalidate();
}

function loadPreset(preset) {
  lab.clear(preset.mode);
  if (preset.mode === "electric") tests.clear();
  preset.build(lab);
  state.selected[preset.mode] = null;
  setMode(preset.mode);
  syncUniform();
  fit();
}

const PANELS = {
  "settings-panel": "settings-toggle",
  "keys-panel": "shortcuts",
  "presets-panel": "presets-toggle",
  "clear-confirm": "clear",
};
function closePanels(except) {
  let closed = false;
  for (const [panel, toggle] of Object.entries(PANELS)) {
    if (panel === except || $(panel).hidden) continue;
    $(panel).hidden = true;
    $(toggle).setAttribute("aria-expanded", "false");
    closed = true;
  }
  return closed;
}
function togglePanel(panel) {
  closePanels(panel);
  const open = $(panel).hidden;
  $(panel).hidden = !open;
  $(PANELS[panel]).setAttribute("aria-expanded", String(open));
  return open;
}

// Switch the header to icon-only buttons when its full labels do not fit.
function fitHeader() {
  const header = document.querySelector("header");
  document.body.classList.remove("compact-header");
  if (header.scrollWidth > header.clientWidth)
    document.body.classList.add("compact-header");
}

// ---------------------------------------------------------------- input

function removeSelected() {
  const s = selected();
  if (!s) return;
  lab.remove(s.id);
  state.selected[state.mode] = null;
  buildForm();
  status();
  invalidate();
}

function moveSource(s, x, y) {
  if (state.snapping) {
    x = snapTo(x, GRID);
    y = snapTo(y, GRID);
  }
  if (attempt(() => lab.update(s.id, { x, y }))) {
    syncForm();
    invalidate();
  }
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.focus?.({ preventScroll: true });
  // A click on the scene closes an open panel and does nothing else.
  if (closePanels()) return;
  const { sx, sy } = eventPoint(e),
    p = world(sx, sy),
    pan = () => {
      drag = { type: "pan", sx, sy, x: view.x, y: view.y };
      capture(e);
    };
  if (e.button === 1 || (e.button === 0 && state.tool === "pan")) {
    e.preventDefault();
    return pan();
  }
  if (e.button !== 0) return;
  const adding = ADD[state.tool];
  if (adding) {
    const at = state.snapping
      ? { x: snapTo(p.x, GRID), y: snapTo(p.y, GRID) }
      : p;
    // As in the mechanics sandbox, placing something returns to Grab.
    if (adding.kind === "test") {
      if (
        attempt(() => {
          tests.captureRadius = SOURCE_RADIUS / view.scale;
          if (!tests.items.length) {
            tests.trailSpacing = 0.02;
            tests.trailLength = 4000;
          }
          tests.add(at.x, at.y);
        })
      ) {
        setTool("grab");
        updateTests();
        invalidate(false);
      }
      return;
    }
    attempt(() => {
      const id = lab.add(adding.kind, { ...adding.props, ...at });
      state.selected[state.mode] = id;
      setTool("grab");
      buildForm();
      status();
      invalidate();
    });
    return;
  }
  const hit = hitTest(sx, sy);
  if (!hit) {
    select(null);
    return pan();
  }
  select(hit.id);
  drag =
    e.ctrlKey && (hit.kind === "plate" || hit.kind === "magnet")
      ? {
          type: "rotate",
          id: hit.id,
          offset: hit.angle - Math.atan2(p.y - hit.y, p.x - hit.x),
        }
      : { type: "move", id: hit.id, dx: hit.x - p.x, dy: hit.y - p.y };
  capture(e);
});

canvas.addEventListener("pointermove", (e) => {
  const { sx, sy } = eventPoint(e),
    p = world(sx, sy);
  pointer = { sx, sy };
  if (drag?.type === "pan") {
    view.x = drag.x + sx - drag.sx;
    view.y = drag.y + sy - drag.sy;
    invalidate();
  } else if (drag) {
    const s = lab.get(drag.id);
    if (!s) drag = null;
    else if (drag.type === "move") moveSource(s, p.x + drag.dx, p.y + drag.dy);
    else {
      let angle = Math.atan2(p.y - s.y, p.x - s.x) + drag.offset;
      if (state.snapping) angle = snapTo(angle, ROTATE_STEP);
      if (attempt(() => lab.update(s.id, { angle: wrapAngle(angle) }))) {
        syncForm();
        invalidate();
      }
    }
  } else if (state.tool === "grab")
    canvas.style.cursor = hitTest(sx, sy) ? "move" : "";
  updateProbe();
});
function endDrag() {
  drag = null;
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("pointerleave", () => {
  if (drag) return;
  pointer = null;
  updateProbe();
});
canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const { sx, sy } = eventPoint(e),
    hit = hitTest(sx, sy);
  if (hit) select(hit.id);
});
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const { sx, sy } = eventPoint(e);
    zoomAt(sx, sy, Math.exp(-e.deltaY * 0.0015));
  },
  { passive: false },
);

function typing(e) {
  return (
    ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A", "SUMMARY"].includes(
      e.target.tagName,
    ) || e.target.isContentEditable
  );
}
const toggleShow = (id) => {
  $(id).checked = !$(id).checked;
  $(id).dispatchEvent(new window.Event("change", { bubbles: true }));
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    drag = null;
    closePanels();
    setTool("grab");
    return;
  }
  if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
  const key = e.key.toLowerCase(),
    s = selected();
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    return removeSelected();
  }
  if (e.key.startsWith("Arrow") && s) {
    e.preventDefault();
    const d = state.snapping ? GRID : 0.05,
      dx = e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0,
      dy = e.key === "ArrowDown" ? -d : e.key === "ArrowUp" ? d : 0;
    return moveSource(s, s.x + dx, s.y + dy);
  }
  if (e.repeat) return;
  if (key === "z") setSnapping(!state.snapping);
  else if (key === "g") setTool("grab");
  else if (key === "h") setTool("pan");
  else if (key === "e") setMode("electric");
  else if (key === "m") setMode("magnetic");
  else if (key === "l") toggleShow("show-lines");
  else if (key === "a") toggleShow("show-arrows");
  else if (key === "f") toggleShow("show-forces");
  else if (key === "t" && state.mode === "electric")
    e.shiftKey ? fillTestGrid() : setTool("test");
  else if (key === "?") togglePanel("keys-panel");
  else if (key === "+" || key === "=")
    zoomAt(view.width / 2, view.height / 2, 1.25);
  else if (key === "-") zoomAt(view.width / 2, view.height / 2, 0.8);
});

for (const b of document.querySelectorAll("[data-tool]"))
  b.addEventListener("click", () => setTool(b.dataset.tool));
for (const b of document.querySelectorAll("[data-add]"))
  b.addEventListener("click", () =>
    setTool(state.tool === b.dataset.add ? "grab" : b.dataset.add),
  );
for (const b of document.querySelectorAll("[data-mode]"))
  b.addEventListener("click", () => setMode(b.dataset.mode));

for (const [id, key] of [
  ["show-lines", "lines"],
  ["show-arrows", "arrows"],
  ["show-equipotentials", "equipotentials"],
  ["show-forces", "forces"],
  ["show-labels", "labels"],
])
  $(id).addEventListener("change", (e) => {
    state.show[key] = e.target.checked;
    invalidate();
  });
$("line-density").addEventListener("input", (e) => {
  state.density = Number(e.target.value);
  $("line-density-value").textContent = tidy(state.density, 2) + "×";
  invalidate();
});

$("zoom-in").addEventListener("click", () =>
  zoomAt(view.width / 2, view.height / 2, 1.25),
);
$("zoom-out").addEventListener("click", () =>
  zoomAt(view.width / 2, view.height / 2, 0.8),
);
$("fit-scene").addEventListener("click", fit);
$("snap-toggle").addEventListener("change", (e) =>
  setSnapping(e.target.checked),
);
$("setting-snapping").addEventListener("change", (e) =>
  setSnapping(e.target.checked),
);
$("delete").addEventListener("click", removeSelected);
$("source-form").addEventListener("submit", (e) => e.preventDefault());

$("settings-toggle").addEventListener("click", () =>
  togglePanel("settings-panel"),
);
$("close-settings").addEventListener("click", () => closePanels());
$("shortcuts").addEventListener("click", () => togglePanel("keys-panel"));
$("close-keys").addEventListener("click", () => closePanels());
$("presets-toggle").addEventListener("click", () => {
  if (togglePanel("presets-panel")) drawPresetPreviews();
});
$("close-presets").addEventListener("click", () => closePanels());
$("clear").addEventListener("click", () => {
  $("clear-confirm-text").textContent =
    state.mode === "electric"
      ? "Every charge, plate and test charge is removed from the electric scene, and its background field is set to zero. The magnetic scene is not affected."
      : "Every wire and magnet is removed from the magnetic scene, and its background field is set to zero. The electric scene is not affected.";
  if (togglePanel("clear-confirm")) $("clear-no").focus();
});
$("clear-no").addEventListener("click", () => closePanels());
$("test-grid").addEventListener("click", fillTestGrid);
$("clear-tests").addEventListener("click", () => {
  tests.clear();
  updateTests();
  invalidate(false);
});
$("clear-yes").addEventListener("click", () => {
  lab.clear(state.mode);
  if (state.mode === "electric") tests.clear();
  updateTests();
  state.selected[state.mode] = null;
  closePanels();
  syncUniform();
  buildForm();
  status();
  invalidate();
});

for (const mode of ["electric", "magnetic"])
  for (const axis of ["x", "y"])
    $(`uniform-${mode}-${axis}`).addEventListener("change", () => {
      const factor = mode === "electric" ? 1 : 1e-6,
        read = (a) => {
          const text = $(`uniform-${mode}-${a}`).value;
          return text === "" ? NaN : Number(text) * factor;
        };
      attempt(() => lab.setUniform(mode, { x: read("x"), y: read("y") }));
      syncUniform();
      syncForm();
      invalidate();
    });

const list = $("preset-list");
for (const mode of ["electric", "magnetic"]) {
  const heading = document.createElement("h3");
  heading.textContent = mode === "electric" ? "Electric" : "Magnetic";
  list.append(heading);
  for (const preset of presets.filter((p) => p.mode === mode)) {
    const button = document.createElement("button"),
      title = document.createElement("strong"),
      text = document.createElement("span"),
      expect = document.createElement("span");
    button.className = "preset";
    button.dataset.preset = preset.id;
    title.textContent = preset.title;
    text.textContent = preset.text;
    expect.className = "preset-expect";
    expect.textContent = "What to check: " + preset.expect;
    const preview = document.createElement("canvas"),
      words = document.createElement("span");
    preview.className = "preset-preview";
    preview.setAttribute("aria-hidden", "true");
    words.className = "preset-text";
    words.append(title, text, expect);
    button.append(preview, words);
    button.addEventListener("click", () => {
      closePanels();
      loadPreset(preset);
    });
    list.append(button);
  }
}

// Thumbnails of each preset, drawn from the preset itself (built in a
// throwaway scene), so they can never drift from what loads. Redrawn only
// when the theme changes.
function drawPresetPreviews() {
  const dark = isDark();
  if (previewTheme === dark) return;
  previewTheme = dark;
  for (const preset of presets)
    try {
      drawPreview(
        document.querySelector(`[data-preset="${preset.id}"] .preset-preview`),
        preset,
      );
    } catch {
      // A preview is decoration; the preset itself reports its own errors.
    }
}
function drawPreview(el, preset) {
  const g = el.getContext("2d"),
    dpr = window.devicePixelRatio || 1,
    w = 112,
    h = 72;
  if (!g?.setTransform) return;
  el.width = w * dpr;
  el.height = h * dpr;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const scene = new FieldLab();
  preset.build(scene);
  const list = scene.list(),
    c = palette(),
    // Half-extent of a source along x and along y.
    reach = (s, along, across) =>
      s.kind === "plate" || s.kind === "magnet"
        ? (Math.abs(along(s.angle)) * s.length +
            Math.abs(across(s.angle)) * (s.width || 0)) /
          2
        : 0,
    rx = (s) => reach(s, Math.cos, Math.sin),
    ry = (s) => reach(s, Math.sin, Math.cos),
    minX = Math.min(...list.map((s) => s.x - rx(s))),
    maxX = Math.max(...list.map((s) => s.x + rx(s))),
    minY = Math.min(...list.map((s) => s.y - ry(s))),
    maxY = Math.max(...list.map((s) => s.y + ry(s))),
    // Frame the sources with room for the field around them.
    k = Math.min(w / (maxX - minX + 3), h / (maxY - minY + 2.4)),
    cx = (minX + maxX) / 2,
    cy = (minY + maxY) / 2,
    at = (x, y) => [w / 2 + (x - cx) * k, h / 2 - (y - cy) * k],
    bounds = (margin) => ({
      minX: cx - w / 2 / k - margin,
      maxX: cx + w / 2 / k + margin,
      minY: cy - h / 2 / k - margin,
      maxY: cy + h / 2 / k + margin,
    }),
    electric = preset.mode === "electric",
    lines = electric
      ? electricFieldLines(scene, bounds(30 / k), {
          linesPerNC: 4,
          step: 3 / k,
          startRadius: 3 / k,
        })
      : magneticFieldLines(scene, bounds(2 / k), {
          cell: 2 / k,
          count: 9,
          coreRadius: 5 / k,
        }).lines;
  g.fillStyle = c.dark ? "#1c1a16" : "#f2f0e9";
  g.fillRect(0, 0, w, h);
  const sign = (v) => (v > 0 ? c.positive : v < 0 ? c.negative : c.neutral),
    magnet = (s, draw) => {
      g.save();
      g.translate(...at(s.x, s.y));
      g.rotate(-s.angle);
      draw((s.length / 2) * k, (s.width / 2) * k, s.sheetCurrent >= 0 ? 1 : -1);
      g.restore();
    };
  for (const s of list)
    if (s.kind === "magnet")
      magnet(s, (half, tall, north) => {
        g.globalAlpha = 0.55;
        g.fillStyle = c.negative;
        g.fillRect(north > 0 ? -half : 0, -tall, half, 2 * tall);
        g.fillStyle = c.positive;
        g.fillRect(north > 0 ? 0 : -half, -tall, half, 2 * tall);
        g.globalAlpha = 1;
      });
  g.strokeStyle = electric ? c.electric : c.magnetic;
  g.lineWidth = 0.9;
  g.lineJoin = "round";
  for (const line of lines) {
    g.beginPath();
    line.forEach((p, i) => {
      const [x, y] = at(p[0], p[1]);
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    g.stroke();
  }
  for (const s of list) {
    const [x, y] = at(s.x, s.y);
    if (s.kind === "magnet")
      magnet(s, (half, tall) => {
        g.strokeStyle = c.ink;
        g.lineWidth = 0.8;
        g.strokeRect(-half, -tall, 2 * half, 2 * tall);
      });
    else if (s.kind === "plate") {
      const dx = (Math.cos(s.angle) * s.length * k) / 2,
        dy = (Math.sin(s.angle) * s.length * k) / 2;
      g.strokeStyle = sign(s.density);
      g.lineWidth = 2.6;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(x - dx, y + dy);
      g.lineTo(x + dx, y - dy);
      g.stroke();
    } else {
      const charge = s.kind === "charge";
      g.beginPath();
      g.arc(x, y, 4, 0, 2 * Math.PI);
      g.fillStyle = charge ? sign(s.charge) : c.panel;
      g.fill();
      g.strokeStyle = charge ? "#fff" : c.ink;
      g.lineWidth = 1.1;
      g.lineCap = "round";
      if (!charge) g.stroke();
      g.beginPath();
      const value = charge ? s.charge : s.current;
      if (charge || value < 0) {
        // + and − for charges; × for current into the screen.
        const d = charge ? 2.2 : 1.9,
          tilt = charge ? [1, 0, 0, 1] : [1, 1, 1, -1];
        g.moveTo(x - d * tilt[0], y - d * tilt[1]);
        g.lineTo(x + d * tilt[0], y + d * tilt[1]);
        if (!charge || value > 0) {
          g.moveTo(x - d * tilt[2], y - d * tilt[3]);
          g.lineTo(x + d * tilt[2], y + d * tilt[3]);
        }
        g.stroke();
      } else {
        // A dot for current out of the screen.
        g.fillStyle = c.ink;
        g.arc(x, y, 1.4, 0, 2 * Math.PI);
        g.fill();
      }
    }
  }
}

prefs.onchange = () => {
  buildForm();
  updateProbe();
};
// Theme and grid are website preferences changed in the settings panel.
// (The potential shading uses theme colours, so it is rebuilt.)
$("settings-panel").addEventListener("change", () => invalidate());
window
  .matchMedia?.("(prefers-color-scheme: dark)")
  ?.addEventListener?.("change", () => invalidate(false));
window.addEventListener("resize", () => {
  fitHeader();
  invalidate();
});
$("ui-size").addEventListener("input", () => {
  fitHeader();
  invalidate();
});

// On a narrow screen the display panel starts folded, clear of the scene.
if (window.innerWidth < 820) $("display-panel").open = false;
// Start with one arrangement in each scene, so neither opens empty.
const starter = (id) => presets.find((p) => p.id === id).build(lab);
starter("dipole");
starter("parallel-currents");
syncUniform();
setSnapping(false);
setMode("electric");
fitHeader();
draw();
