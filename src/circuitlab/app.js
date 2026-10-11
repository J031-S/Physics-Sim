// Electric circuits page: canvas drawing, pointer and keyboard input,
// panels, graphs, the frame loop. All physics lives in model.js: every
// number shown here is read from `lab.solve()`.
import { setupPreferences } from "../preferences.js";
import { setupNav } from "../nav.js";
import { setPlaybackIcon } from "../icons.js";
import {
  CircuitLab,
  KINDS,
  LIMITS,
  STEPS_PER_TAU,
  turnsOf,
} from "./model.js";
import { presets } from "./presets.js";

const $ = (id) => document.getElementById(id),
  canvas = $("canvas"),
  ctx = canvas.getContext("2d");
setupNav();
const prefs = setupPreferences($);

// One circuit for each view of the page. There is one view so far, "dc";
// an AC view would add its own circuit, palette buttons (`data-for`) and
// presets (`view`), and be switched to by `setMode`, as on the fields page.
const labs = { dc: new CircuitLab() };
let lab = labs.dc;

const BASE_SCALE = 44, // pixels per grid square at 100% zoom
  FRAME = 1 / 60, // seconds of real time that one Step stands for
  // Simulated seconds per real second.
  WARPS = [
    0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 60,
  ],
  TERMINAL = 9, // pixels within which a terminal is picked up
  DOT_SPACING = 0.8, // grid squares between current dots
  DOT_SPEED = 3.2, // grid squares per second at the largest current seen
  SAMPLES = 1600; // graph samples kept for each component
const view = { scale: BASE_SCALE, x: 0, y: 0, width: 0, height: 0 };
const state = {
  mode: "dc",
  tool: "grab",
  selected: null,
  watched: null, // the component whose graph is drawn
  running: false,
  warp: 1,
  achieved: 1, // simulated seconds per real second actually reached
  placeRot: 0, // quarter-turns given to the next component placed
  electrons: false,
  show: { current: true, potential: false, labels: true },
};
let last = 0,
  drag = null,
  hover = null, // grid point of the terminal under the pointer
  ghost = null, // where the component about to be placed would go
  paletteDrag = null,
  suppressClick = false,
  toastTimer,
  fitted = false,
  previewTheme = null,
  budget = 2000, // time steps allowed in one frame
  mark = 0, // time of the last change to the circuit, for the τ marker
  peak = 0; // largest current seen, which sets the speed of the dots
const traces = new Map(), // id → { t, v, i } arrays for the graphs
  phase = new Map(), // id → how far along its path the first dot is
  units = new Map(); // "id:key" → unit factor chosen in the form

const ADD = {
  cell: {
    name: "Cell",
    help: "Click the grid to place a cell. Its long plate is the + terminal.",
  },
  resistor: { name: "Resistor", help: "Click the grid to place a resistor." },
  variable: {
    name: "Variable resistor",
    help: "Click the grid to place a variable resistor; its slider appears when it is selected.",
  },
  lamp: {
    name: "Lamp",
    help: "Click the grid to place a lamp. It glows in proportion to its power.",
  },
  switch: {
    name: "Switch",
    help: "Click the grid to place a switch. Click the switch itself to open or close it.",
  },
  switch2: {
    name: "Two-way switch",
    help: "Click the grid to place a two-way switch. Clicking it moves it to its other contact.",
  },
  capacitor: {
    name: "Capacitor",
    help: "Click the grid to place a capacitor. It starts uncharged unless you give it a starting p.d.",
  },
  ammeter: {
    name: "Ammeter",
    help: "Click to place an ammeter. Drop it on a wire to put it in series.",
  },
  voltmeter: {
    name: "Voltmeter",
    help: "Click to place a voltmeter, then wire its terminals across the component to be measured.",
  },
  wire: {
    name: "Wire",
    help: "Drag from one grid point to another. Hold Shift for a straight diagonal. Esc or G returns to Grab.",
  },
};
const TOOL_HELP = {
  grab: [
    "Grab",
    "Drag a component to move it, or drag from a terminal to draw a wire. Click a component for its values and readings; click a switch to work it.",
  ],
  pan: ["Pan", "Drag to move the view. Scroll to zoom."],
};
const HOTKEYS = [
  "cell",
  "resistor",
  "variable",
  "lamp",
  "switch",
  "switch2",
  "capacitor",
  "ammeter",
  "voltmeter",
];

// Editable quantities of each kind. `units` lists [factor, symbol] choices
// for the number box; ranges are LIMITS in model.js.
const OHMS = [
    [1, "Ω"],
    [1e3, "kΩ"],
    [1e6, "MΩ"],
  ],
  FARADS = [
    [1e-12, "pF"],
    [1e-9, "nF"],
    [1e-6, "µF"],
    [1e-3, "mF"],
    [1, "F"],
  ],
  FIELDS = {
    cell: [
      {
        key: "emf",
        label: "EMF",
        units: [[1, "V"]],
        limit: LIMITS.emf,
        slider: [0, 24, 0.5],
      },
      {
        key: "internal",
        label: "Internal resistance",
        units: OHMS,
        limit: LIMITS.internal,
        help: "0 makes the cell ideal.",
      },
    ],
    resistor: [
      {
        key: "resistance",
        label: "Resistance",
        units: OHMS,
        limit: LIMITS.resistance,
      },
    ],
    variable: [
      {
        key: "resistance",
        label: "Resistance",
        units: OHMS,
        limit: LIMITS.resistance,
        slider: (item) => [0, item.maximum, item.maximum / 200],
      },
      {
        key: "maximum",
        label: "Maximum",
        units: OHMS,
        limit: LIMITS.maximum,
      },
    ],
    lamp: [
      {
        key: "resistance",
        label: "Resistance",
        units: OHMS,
        limit: LIMITS.lampResistance,
      },
      {
        key: "ratedPower",
        label: "Rated power",
        units: [
          [1e-3, "mW"],
          [1, "W"],
        ],
        limit: LIMITS.ratedPower,
        help: "The power at which the lamp is drawn fully bright.",
      },
    ],
    capacitor: [
      {
        key: "capacitance",
        label: "Capacitance",
        units: FARADS,
        limit: LIMITS.capacitance,
      },
      {
        key: "initialVoltage",
        label: "Starting p.d.",
        units: [[1, "V"]],
        limit: LIMITS.initialVoltage,
        help: "Sets the p.d. now, and what Reset returns it to.",
      },
    ],
  };

// ---------------------------------------------------------------- helpers

function toast(message, long) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(
    () => el.classList.remove("show"),
    long ? 9000 : 3200,
  );
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
// Grid point (x right, y up) to canvas pixels and back.
const screen = (x, y) => [view.x + x * view.scale, view.y - y * view.scale];
const world = (sx, sy) => ({
  x: (sx - view.x) / view.scale,
  y: (view.y - sy) / view.scale,
});
function eventPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { sx: e.clientX - r.left, sy: e.clientY - r.top };
}
function capture(e) {
  try {
    canvas.setPointerCapture?.(e.pointerId);
  } catch {}
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const tidy = (v, places = 6) => String(Number(v.toPrecision(places)));
const isDark = () => document.documentElement.dataset.theme === "dark";
function put(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

// Four significant figures with an SI prefix: 0.001875 A → "1.875 mA".
// A reading that does not exist (a short circuit, a floating meter) is "–".
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
function si(value, unit, sig = 4) {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "–";
  if (value === 0) return "0 " + unit;
  const size = Math.abs(value),
    round = 1 - 0.5 * 10 ** -sig;
  for (const [factor, prefix] of PREFIXES)
    if (size >= factor * round)
      return (
        (value / factor).toPrecision(sig).replace("-", "−") +
        " " +
        prefix +
        unit
      );
  return (value / 1e-12).toPrecision(2).replace("-", "−") + " p" + unit;
}
// The factor and prefix that suit a quantity of this size, for an axis.
function axisUnit(size) {
  for (const [factor, prefix] of PREFIXES)
    if (size >= factor * 0.9995) return [factor, prefix];
  return size > 0 ? [1e-12, "p"] : [1, ""];
}

// A value that was set, not measured: as short as it can be written.
function given(value, unit) {
  if (typeof value !== "number") return "varies";
  if (value === 0) return "0 " + unit;
  const size = Math.abs(value),
    [factor, prefix] =
      PREFIXES.find(([f]) => size >= f * 0.9999995) || PREFIXES.at(-1);
  return (
    String(Number((value / factor).toPrecision(6))).replace("-", "−") +
    " " +
    prefix +
    unit
  );
}

const selected = () => lab.get(state.selected);
const placed = (item) => item && !item.explicit;

// A point given along and across a component (in grid squares, before it
// is turned) as a grid point.
function local(item, lx, ly) {
  let x = lx,
    y = ly;
  for (let i = 0; i < (item.rot & 3); i++) [x, y] = [-y, x];
  return [item.x + x, item.y + y];
}
// The line the current follows through a component, terminal to terminal.
function pathOf(item) {
  if (item.kind === "wire")
    return [
      [item.x1, item.y1],
      [item.x2, item.y2],
    ];
  if (item.kind === "switch2") {
    const side = item.position === "a" ? 1 : -1;
    return [
      local(item, -1, 0),
      local(item, -0.45, 0),
      local(item, 0.5, 0.5 * side),
      local(item, 1, side),
    ];
  }
  return [local(item, -1, 0), local(item, 1, 0)];
}
const valueText = (item) =>
  ({
    cell:
      given(item.emf, "V") +
      (item.internal > 0 ? ", r = " + given(item.internal, "Ω") : ""),
    resistor: given(item.resistance, "Ω"),
    variable: given(item.resistance, "Ω"),
    lamp: given(item.resistance, "Ω"),
    capacitor: given(item.capacitance, "F"),
  })[item.kind] || "";

// ---------------------------------------------------------------- playback

// Called after anything that changes the circuit: the τ marker restarts
// from here and the graphs get a point at this instant.
function changed() {
  mark = lab.time;
  for (const event of lab.takeEvents()) toast(event.message, true);
  record(true);
}
function record(force) {
  const s = lab.solve(),
    t = lab.time;
  for (const item of lab.list()) {
    if (item.kind === "wire") continue;
    const r = s.of(item.id);
    let h = traces.get(item.id);
    if (!h) traces.set(item.id, (h = { t: [], v: [], i: [] }));
    const n = h.t.length;
    if (!force && n && t <= h.t[n - 1]) continue;
    h.t.push(t);
    h.v.push(r.voltage);
    h.i.push(r.current);
    if (h.t.length > SAMPLES)
      // Thin the record to every second point; the latest is kept.
      for (const key of ["t", "v", "i"])
        h[key] = h[key].filter((_, k) => k % 2 === 1);
  }
  for (const id of traces.keys()) if (!lab.get(id)) traces.delete(id);
}
function restart() {
  traces.clear();
  phase.clear();
  mark = 0;
  peak = 0;
  state.achieved = state.warp;
  lab.takeEvents();
  record(true);
}
function reset() {
  lab.reset();
  restart();
}
function setRunning(on) {
  state.running = on;
  state.achieved = state.warp;
  last = 0;
  setPlaybackIcon(on, prefs.iconSet);
  $("pause").title = on ? "Pause (Space)" : "Run (Space)";
}
function advance(seconds) {
  const done = lab.advance(seconds, {
    maxSteps: Math.round(budget),
    // At least two steps to a frame, so slow circuits still move smoothly.
    resolution: (state.warp * FRAME) / 2,
  });
  for (const event of lab.takeEvents()) toast(event.message, true);
  record();
  return done;
}
// One frame's worth of simulated time at the current time scale.
function stepOnce() {
  if (state.running) setRunning(false);
  advance(state.warp * FRAME);
}
const warpText = (w) => (w >= 1 ? tidy(w) : tidy(w, 3)) + "×";
function setWarp(warp) {
  state.warp = state.achieved = warp;
  $("warp").value = String(warp);
  $("step").title =
    `Advance ${si(warp * FRAME, "s", 3)} of simulated time: one frame at this time scale (.)`;
}
function shiftWarp(by) {
  const at = WARPS.indexOf(state.warp);
  setWarp(WARPS[clamp(at + by, 0, WARPS.length - 1)]);
}

// ---------------------------------------------------------------- geometry

function terminalAt(sx, sy) {
  let best = null,
    range = TERMINAL;
  for (const item of lab.list())
    for (const t of lab.terminals(item)) {
      const [x, y] = screen(t.x, t.y),
        d = Math.hypot(sx - x, sy - y);
      if (d <= range) {
        range = d;
        best = { x: t.x, y: t.y, item };
      }
    }
  return best;
}
function hitTest(sx, sy) {
  const p = world(sx, sy),
    list = lab.list();
  for (let i = list.length - 1; i >= 0; i--) {
    const item = list[i];
    if (!placed(item) || item.kind === "wire") continue;
    // Along and across the component, undoing its turn.
    let x = p.x - item.x,
      y = p.y - item.y;
    for (let k = 0; k < (item.rot & 3); k++) [x, y] = [y, -x];
    const tall = item.kind === "switch2" ? 1.1 : 0.48;
    if (Math.abs(x) <= 0.78 && Math.abs(y) <= tall) return item;
  }
  const slack = 6 / view.scale;
  for (let i = list.length - 1; i >= 0; i--) {
    const w = list[i];
    if (w.kind !== "wire" || !placed(w)) continue;
    const dx = w.x2 - w.x1,
      dy = w.y2 - w.y1,
      t = clamp(
        ((p.x - w.x1) * dx + (p.y - w.y1) * dy) / (dx * dx + dy * dy),
        0,
        1,
      );
    if (Math.hypot(p.x - w.x1 - t * dx, p.y - w.y1 - t * dy) <= slack)
      return w;
  }
  return null;
}
function sceneBox() {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const item of lab.list())
    for (const t of lab.terminals(item)) {
      minX = Math.min(minX, t.x);
      maxX = Math.max(maxX, t.x);
      minY = Math.min(minY, t.y);
      maxY = Math.max(maxY, t.y);
    }
  return minX <= maxX ? { minX, maxX, minY, maxY } : null;
}
// The part of the canvas that the panels leave clear.
function clearArea() {
  const origin = canvas.getBoundingClientRect(),
    side = document.querySelector(".cl-side")?.getBoundingClientRect(),
    onRight =
      side && side.width > 0 && side.left > origin.left + view.width / 2;
  return {
    left: 64,
    right: onRight ? side.left - origin.left - 14 : view.width - 16,
    top: 118,
    bottom: view.height - 64,
  };
}
function fit() {
  const box = sceneBox(),
    area = clearArea(),
    width = Math.max(area.right - area.left, 120),
    height = Math.max(area.bottom - area.top, 120);
  let scale = BASE_SCALE,
    cx = 0,
    cy = 0;
  if (box) {
    cx = (box.minX + box.maxX) / 2;
    cy = (box.minY + box.maxY) / 2;
    scale = clamp(
      Math.min(
        width / (box.maxX - box.minX + 3),
        height / (box.maxY - box.minY + 2.4),
      ),
      14,
      BASE_SCALE * 1.25,
    );
  }
  view.scale = scale;
  view.x = area.left + width / 2 - cx * scale;
  view.y = area.top + height / 2 + cy * scale;
}
function zoomAt(sx, sy, factor) {
  const p = world(sx, sy);
  view.scale = clamp(view.scale * factor, 12, 140);
  view.x = sx - p.x * view.scale;
  view.y = sy + p.y * view.scale;
}

// ---------------------------------------------------------------- drawing

function palette() {
  const dark = isDark();
  return {
    dark,
    ink: dark ? "#ebe5d6" : "#354438",
    soft: dark ? "#bdb4a2" : "#6f7f63",
    panel: dark ? "#2a2722" : "#fffefa",
    back: dark ? "#1c1a16" : "#f2f0e9",
    gridMinor: dark ? "#2a2721" : "#dce1d4",
    gridMajor: dark ? "#3d3930" : "#c6cebf",
    positive: dark ? "#e9826e" : "#c2503c",
    negative: dark ? "#6fa8ec" : "#3f76aa",
    current: dark ? "#f2c14e" : "#b4530a",
    electron: dark ? "#6fa8ec" : "#3f76aa",
    // The moving dots. Chosen against the wire they sit on as well as the
    // page: wires are near-black on the light theme and cream on the dark
    // one, so the dots are a saturated colour with a ring of the page
    // colour round them.
    dot: dark ? "#ff4d2e" : "#ff7a00",
    dotElectron: dark ? "#1f8bff" : "#00a3ff",
    voltage: dark ? "#8fd3a4" : "#2f7d4f",
    glow: dark ? "#ffd866" : "#f5b700",
    danger: dark ? "#ff8f7d" : "#b3261e",
    select: dark ? "#a9c49d" : "#4f7547",
    axis: dark ? "#3d3930" : "#dce1d4",
  };
}
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
function mix(a, b, t) {
  const p = rgb(a),
    q = rgb(b);
  return `rgb(${p.map((v, i) => Math.round(v + (q[i] - v) * t)).join(",")})`;
}
// Lowest and highest potential in the circuit, for the colour scale.
function potentialRange(s) {
  let lo = Infinity,
    hi = -Infinity;
  for (const node of s.nodes.values())
    if (node.potential !== null) {
      lo = Math.min(lo, node.potential);
      hi = Math.max(hi, node.potential);
    }
  return hi > lo ? [lo, hi] : null;
}

// Draws a circuit with context `g`. `o` gives the mapping from grid to
// pixels (`at`, `scale`), the colours `c`, and what to show; the scene and
// the preset thumbnails both come through here.
function drawCircuit(g, circuit, s, o) {
  const { c, scale: u, at } = o,
    range = o.potential ? potentialRange(s) : null,
    colourAt = (key, fallback) => {
      const v = range && s.potential(key);
      return v === null || v === undefined || !range
        ? fallback
        : mix(c.negative, c.positive, (v - range[0]) / (range[1] - range[0]));
    },
    faulty = new Set(s.problems.flatMap((p) => p.ids)),
    thin = Math.max(1, u * 0.045),
    count = new Map();
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const item of circuit.list()) {
    if (!placed(item)) continue;
    for (const t of circuit.terminals(item))
      count.set(t.key, (count.get(t.key) || 0) + 1);
  }
  // Wires first, so that components sit on top of them.
  for (const item of circuit.list()) {
    if (item.kind !== "wire" || !placed(item)) continue;
    const [x1, y1] = at(item.x1, item.y1),
      [x2, y2] = at(item.x2, item.y2);
    if (item.id === o.selected) {
      g.strokeStyle = c.select;
      g.globalAlpha = 0.35;
      g.lineWidth = thin + 7;
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
      g.globalAlpha = 1;
    }
    g.strokeStyle = faulty.has(item.id)
      ? c.danger
      : colourAt(item.nodes[0], c.ink);
    g.lineWidth = thin * (range ? 1.5 : 1);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }
  for (const item of circuit.list()) {
    if (item.kind === "wire" || !placed(item)) continue;
    drawComponent(g, item, s.of(item.id), {
      ...o,
      thin,
      ink: faulty.has(item.id) ? c.danger : c.ink,
      leads: item.nodes.map((key) =>
        faulty.has(item.id) ? c.danger : colourAt(key, c.ink),
      ),
    });
  }
  // A dot where three or more ends meet, as on a circuit diagram; a small
  // open ring on an end that is joined to nothing.
  for (const [key, n] of count) {
    const [gx, gy] = key.split(",").map(Number),
      [x, y] = at(gx, gy);
    g.beginPath();
    if (n >= 3) {
      g.fillStyle = colourAt(key, c.ink);
      g.arc(x, y, thin * 2.1, 0, 2 * Math.PI);
      g.fill();
    } else if (n === 1 && !o.preview) {
      g.strokeStyle = c.soft;
      g.lineWidth = 1;
      g.fillStyle = c.back;
      g.arc(x, y, thin * 2, 0, 2 * Math.PI);
      g.fill();
      g.stroke();
    }
  }
}

// One component. Drawn about its centre with +x towards terminal 1, then
// labelled upright.
function drawComponent(g, item, reading, o) {
  const { c, scale: u, at, thin, ink } = o,
    [cx, cy] = at(item.x, item.y),
    line = (points, colour, width = thin) => {
      g.strokeStyle = colour;
      g.lineWidth = width;
      g.beginPath();
      points.forEach(([x, y], i) =>
        i ? g.lineTo(x * u, -y * u) : g.moveTo(x * u, -y * u),
      );
      g.stroke();
    },
    circle = (x, y, r, fill, stroke) => {
      g.beginPath();
      g.arc(x * u, -y * u, r * u, 0, 2 * Math.PI);
      if (fill) {
        g.fillStyle = fill;
        g.fill();
      }
      if (stroke) {
        g.strokeStyle = stroke;
        g.lineWidth = thin;
        g.stroke();
      }
    },
    // The leads, each in the colour of its own terminal.
    leads = (reach) => {
      line(
        [
          [-1, 0],
          [-reach, 0],
        ],
        o.leads[0],
      );
      line(
        [
          [reach, 0],
          [1, 0],
        ],
        o.leads[1],
      );
    },
    plus = (x, y) => {
      if (u < 20) return;
      line(
        [
          [x - 0.08, y],
          [x + 0.08, y],
        ],
        ink,
        Math.max(1, thin * 0.7),
      );
      line(
        [
          [x, y - 0.08],
          [x, y + 0.08],
        ],
        ink,
        Math.max(1, thin * 0.7),
      );
    };
  g.save();
  g.translate(cx, cy);
  g.rotate((-item.rot * Math.PI) / 2);
  if (item.id === o.selected) {
    g.fillStyle = c.select;
    g.globalAlpha = 0.18;
    const tall = item.kind === "switch2" ? 1.15 : 0.52;
    g.beginPath();
    g.roundRect?.(-0.82 * u, -tall * u, 1.64 * u, 2 * tall * u, 0.14 * u);
    g.fill();
    g.globalAlpha = 1;
  }
  switch (item.kind) {
    case "cell":
      leads(0.1);
      // Long thin plate: positive. Short thick plate: negative.
      line(
        [
          [-0.1, -0.42],
          [-0.1, 0.42],
        ],
        ink,
      );
      line(
        [
          [0.1, -0.21],
          [0.1, 0.21],
        ],
        ink,
        thin * 2.6,
      );
      plus(-0.32, 0.3);
      break;
    case "resistor":
    case "variable":
      leads(0.5);
      g.fillStyle = c.back;
      g.fillRect(-0.5 * u, -0.17 * u, u, 0.34 * u);
      line(
        [
          [-0.5, -0.17],
          [0.5, -0.17],
          [0.5, 0.17],
          [-0.5, 0.17],
          [-0.5, -0.17],
        ],
        ink,
      );
      if (item.kind === "variable") {
        line(
          [
            [-0.42, -0.42],
            [0.42, 0.42],
          ],
          ink,
        );
        line(
          [
            [0.2, 0.42],
            [0.42, 0.42],
            [0.42, 0.2],
          ],
          ink,
        );
      }
      break;
    case "lamp": {
      leads(0.34);
      const b = reading?.brightness;
      if (b > 0) {
        // The glow grows and brightens with power, up to the rated power.
        const level = clamp(b, 0, 1),
          reach = (0.5 + 0.5 * level) * u,
          halo = g.createRadialGradient?.(0, 0, 0.2 * u, 0, 0, reach);
        if (halo?.addColorStop) {
          halo.addColorStop(0, c.glow);
          halo.addColorStop(1, "rgba(245,183,0,0)");
          g.globalAlpha = 0.25 + 0.65 * level;
          g.fillStyle = halo;
          g.beginPath();
          g.arc(0, 0, reach, 0, 2 * Math.PI);
          g.fill();
        }
        g.globalAlpha = 0.2 + 0.8 * level;
        circle(0, 0, 0.34, c.glow);
        g.globalAlpha = 1;
      } else circle(0, 0, 0.34, c.back);
      circle(0, 0, 0.34, null, ink);
      line(
        [
          [-0.24, -0.24],
          [0.24, 0.24],
        ],
        ink,
      );
      line(
        [
          [-0.24, 0.24],
          [0.24, -0.24],
        ],
        ink,
      );
      break;
    }
    case "switch":
      leads(0.42);
      line(
        [
          [-0.42, 0],
          item.closed ? [0.42, 0] : [0.34, 0.36],
        ],
        ink,
        thin * 1.4,
      );
      circle(-0.42, 0, 0.07, ink);
      circle(0.42, 0, 0.07, ink);
      break;
    case "switch2": {
      const side = item.position === "a" ? 1 : -1;
      line(
        [
          [-1, 0],
          [-0.45, 0],
        ],
        o.leads[0],
      );
      line(
        [
          [0.5, 0.5],
          [1, 1],
        ],
        o.leads[1],
      );
      line(
        [
          [0.5, -0.5],
          [1, -1],
        ],
        o.leads[2],
      );
      line(
        [
          [-0.45, 0],
          [0.5, 0.5 * side],
        ],
        ink,
        thin * 1.4,
      );
      circle(-0.45, 0, 0.07, ink);
      circle(0.5, 0.5, 0.07, ink);
      circle(0.5, -0.5, 0.07, ink);
      break;
    }
    case "capacitor":
      leads(0.1);
      for (const x of [-0.1, 0.1])
        line(
          [
            [x, -0.38],
            [x, 0.38],
          ],
          ink,
          thin * 1.5,
        );
      plus(-0.32, 0.3);
      break;
    default: {
      // Ammeter or voltmeter.
      leads(0.37);
      circle(0, 0, 0.37, c.back, ink);
      plus(-0.56, 0.2);
      g.restore();
      g.save();
      g.fillStyle = ink;
      g.font = `600 ${Math.max(7, 0.4 * u)}px system-ui, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(item.kind === "ammeter" ? "A" : "V", cx, cy + 0.02 * u);
    }
  }
  g.restore();
  if (!o.labels) return;
  // Name and value, beside the component and always upright. A meter shows
  // its reading there instead.
  const meter = item.kind === "ammeter" || item.kind === "voltmeter",
    text = meter
      ? item.kind === "ammeter"
        ? si(reading?.current, "A")
        : si(reading?.voltage, "V")
      : valueText(item),
    upright = item.rot % 2 !== 0,
    reach = item.kind === "switch2" ? 1.2 : 0.56,
    size = clamp(0.27 * u, 9, 12);
  g.textBaseline = "alphabetic";
  g.textAlign = upright ? "left" : "center";
  const x = upright ? cx + reach * u + 3 : cx,
    y = upright ? cy - 2 : cy - reach * u - size - 3;
  g.font = `${size}px system-ui, sans-serif`;
  g.fillStyle = c.soft;
  g.fillText(item.name, x, y);
  g.font = `${meter ? "600 " : ""}${size}px ui-monospace, monospace`;
  g.fillStyle = meter ? (item.kind === "ammeter" ? c.current : c.voltage) : ink;
  g.fillText(text, x, y + size + 2);
}

// Dots along every branch that carries current. Their speed is in
// proportion to the current; `phase` holds how far each branch's dots have
// travelled.
function drawDots(c, s) {
  if (!state.show.current) return;
  ctx.fillStyle = state.electrons ? c.dotElectron : c.dot;
  ctx.strokeStyle = c.back;
  ctx.lineWidth = 1.5;
  const r = clamp(view.scale * 0.09, 2.4, 4.4);
  for (const item of lab.list()) {
    if (!placed(item)) continue;
    const flow = s.of(item.id)?.flow;
    if (!flow) continue;
    const path = pathOf(item),
      // Dots run along the leads and stop at the symbol itself.
      body = item.kind === "wire" || item.kind === "switch2" ? 0 : 0.5;
    let offset = (phase.get(item.id) || 0) % DOT_SPACING;
    if (offset < 0) offset += DOT_SPACING;
    for (let k = 1; k < path.length; k++) {
      const [x1, y1] = path[k - 1],
        [x2, y2] = path[k],
        length = Math.hypot(x2 - x1, y2 - y1);
      let d = offset;
      for (; d < length; d += DOT_SPACING) {
        if (Math.abs(d - length / 2) < body) continue;
        const [x, y] = screen(
          x1 + ((x2 - x1) * d) / length,
          y1 + ((y2 - y1) * d) / length,
        );
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
      offset = d - length;
    }
  }
}
function moveDots(s, seconds) {
  for (const item of lab.list()) {
    const flow = s.of(item.id)?.flow;
    if (flow) peak = Math.max(peak, Math.abs(flow));
  }
  if (!(peak > 0)) return;
  const sense = state.electrons ? -1 : 1;
  for (const item of lab.list()) {
    const flow = s.of(item.id)?.flow;
    if (flow)
      phase.set(
        item.id,
        (phase.get(item.id) || 0) +
          (sense * DOT_SPEED * seconds * flow) / peak,
      );
  }
}

function drawGrid(c) {
  const lo = world(0, view.height),
    hi = world(view.width, 0),
    step = 2 ** Math.max(0, Math.ceil(Math.log2(12 / view.scale)));
  ctx.lineWidth = 1;
  for (let x = Math.ceil(lo.x / step) * step; x <= hi.x; x += step) {
    ctx.strokeStyle = x % (step * 5) === 0 ? c.gridMajor : c.gridMinor;
    const sx = Math.round(screen(x, 0)[0]) + 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, view.height);
    ctx.stroke();
  }
  for (let y = Math.ceil(lo.y / step) * step; y <= hi.y; y += step) {
    ctx.strokeStyle = y % (step * 5) === 0 ? c.gridMajor : c.gridMinor;
    const sy = Math.round(screen(0, y)[1]) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(view.width, sy);
    ctx.stroke();
  }
}

// The corner of a wire being drawn: along the direction the drag set off
// in, then across. Shift gives one straight wire.
function wirePoints(d) {
  const { from, to } = d;
  if (d.straight || from.x === to.x || from.y === to.y) return [from, to];
  return [
    from,
    d.horizontal ? { x: to.x, y: from.y } : { x: from.x, y: to.y },
    to,
  ];
}

function draw() {
  const r = canvas.getBoundingClientRect(),
    dpr = window.devicePixelRatio || 1;
  if (view.width !== r.width || view.height !== r.height) {
    if (view.width) {
      view.x += (r.width - view.width) / 2;
      view.y += (r.height - view.height) / 2;
    }
    view.width = r.width;
    view.height = r.height;
    if (!fitted) {
      fit();
      fitted = true;
    }
  }
  if (
    canvas.width !== Math.round(r.width * dpr) ||
    canvas.height !== Math.round(r.height * dpr)
  ) {
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
  }
  const c = palette(),
    s = lab.solve();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, r.width, r.height);
  ctx.setLineDash([]);
  if (prefs.grid) drawGrid(c);
  drawCircuit(ctx, lab, s, {
    c,
    scale: view.scale,
    at: screen,
    selected: state.selected,
    labels: state.show.labels && view.scale >= 24,
    potential: state.show.potential,
  });
  drawDots(c, s);
  // The ends of a selected wire can be dragged.
  const chosen = selected();
  if (chosen?.kind === "wire" && placed(chosen))
    for (const t of lab.terminals(chosen)) {
      const [x, y] = screen(t.x, t.y);
      ctx.fillStyle = c.panel;
      ctx.strokeStyle = c.select;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
  if (hover && !drag) {
    const [x, y] = screen(hover.x, hover.y);
    ctx.strokeStyle = c.select;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, 2 * Math.PI);
    ctx.stroke();
  }
  if (drag?.type === "wire") {
    const points = wirePoints(drag).map((p) => screen(p.x, p.y));
    ctx.strokeStyle = c.select;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (ghost) {
    // A faint copy of the component about to be placed.
    ctx.globalAlpha = 0.45;
    drawComponent(
      ctx,
      { ...ghost, id: 0, name: "", position: "a", closed: false },
      null,
      {
        c,
        scale: view.scale,
        at: screen,
        thin: Math.max(1, view.scale * 0.045),
        ink: c.select,
        leads: [c.select, c.select, c.select],
        labels: false,
      },
    );
    ctx.globalAlpha = 1;
  }
  // Lets a test (or a script in the browser console) find a grid point.
  canvas.dataset.view = [view.x, view.y, view.scale]
    .map((v) => +v.toFixed(3))
    .join(",");
  put($("zoom-level"), Math.round((view.scale / BASE_SCALE) * 100) + "%");
  return { c, s };
}

// ---------------------------------------------------------------- panels

// Which way conventional current goes through a component on the screen.
function direction(item, flow) {
  if (!flow || !placed(item) || item.kind === "switch2") return "";
  if (item.kind === "wire") {
    const dx = (item.x2 - item.x1) * Math.sign(flow),
      dy = (item.y2 - item.y1) * Math.sign(flow);
    const across = Math.abs(dx) >= Math.abs(dy);
    return " " + (across ? (dx > 0 ? "→" : "←") : dy > 0 ? "↑" : "↓");
  }
  return " " + "→↑←↓"[((item.rot & 3) + (flow > 0 ? 0 : 2)) % 4];
}

// [key, label, text] for each line of the selected component's readout.
function readingsOf(item, r) {
  const rows = [],
    add = (key, label, text) => rows.push([key, label, text]),
    size = (v) => (v === null ? null : Math.abs(v)),
    ends = () =>
      add(
        "potentials",
        item.kind === "wire" ? "Potential" : "Potential at each end",
        [...new Set(r.potentials.map((v) => si(v, "V")))].join(" | "),
      );
  if (item.kind === "cell") {
    add("emf", "EMF, E", si(r.emf, "V"));
    add(
      "current",
      "Current, I",
      si(size(r.current), "A") +
        (r.current > 0
          ? " out of +"
          : r.current < 0
            ? " into + (being charged)"
            : ""),
    );
    add("voltage", "Terminal p.d., V = E − Ir", si(r.voltage, "V"));
    add(
      "power",
      r.power > 0 ? "Power taken from the circuit" : "Power to the circuit, VI",
      si(size(r.power), "W"),
    );
    add("lost", "Power lost in the cell, I²r", si(r.lost, "W"));
    add("supplied", "Energy supplied so far", si(r.supplied, "J"));
    ends();
  } else if (item.kind === "capacitor") {
    const charging = r.current * r.voltage >= 0;
    add(
      "current",
      "Current",
      si(size(r.current), "A") +
        (r.current ? (charging ? " charging" : " discharging") : ""),
    );
    add("voltage", "P.d. across it, V", si(r.voltage, "V"));
    add("charge", "Charge, Q = CV", si(r.charge, "C"));
    add("energy", "Energy stored, ½CV²", si(r.energy, "J"));
    const taus = lab.timeConstants(item.id);
    add(
      "tau",
      taus.length > 1 ? "Time constants" : "Time constant, τ = RC",
      taus.length ? taus.map((t) => si(t, "s")).join(", ") : "none",
    );
    ends();
  } else if (item.kind === "ammeter")
    add("current", "Reading", si(r.current, "A") + direction(item, r.flow));
  else if (item.kind === "voltmeter")
    add("voltage", "Reading", si(r.voltage, "V"));
  else {
    if (item.kind === "switch")
      add("state", "Switch", item.closed ? "closed" : "open");
    add(
      "current",
      "Current, I",
      si(size(r.current), "A") + direction(item, r.flow),
    );
    if (item.kind === "switch2")
      add("voltage", "P.d. across the open contact", si(size(r.voltage), "V"));
    else if (item.kind !== "wire")
      add("voltage", "P.d. across it, V", si(size(r.voltage), "V"));
    if (["resistor", "variable", "lamp"].includes(item.kind)) {
      add("power", "Power, P = VI", si(r.power, "W"));
      add("heat", "Energy dissipated so far", si(r.heat, "J"));
    }
    if (item.kind === "lamp")
      add(
        "brightness",
        "Brightness",
        r.brightness === null
          ? "–"
          : tidy(100 * r.brightness, 3) + "% of rated power",
      );
    ends();
  }
  return rows;
}

// Fills a two-column grid with [key, label, text] rows, rebuilding it only
// when the set of rows changes.
function fillGrid(grid, prefix, rows) {
  const keys = rows.map((r) => r[0]).join("|");
  if (grid.dataset.keys !== keys) {
    grid.dataset.keys = keys;
    grid.replaceChildren(
      ...rows.flatMap(([key]) => {
        const label = document.createElement("span"),
          value = document.createElement("span");
        value.className = "num";
        value.id = prefix + key;
        return [label, value];
      }),
    );
  }
  rows.forEach(([, label, text], i) => {
    put(grid.children[2 * i], label);
    put(grid.children[2 * i + 1], text);
  });
}

function unitOf(item, field) {
  const key = item.id + ":" + field.key;
  if (!units.has(key)) {
    const size = Math.abs(item[field.key]),
      fitting = field.units.filter(([f]) => f <= size * 1.0000001),
      [factor] =
        fitting[fitting.length - 1] ||
        // Nothing to go on (a value of zero): ohms, microfarads, volts.
        field.units.find(([f]) => f === 1e-6 && field.units === FARADS) ||
        field.units.find(([f]) => f === 1) ||
        field.units[0];
    units.set(key, factor);
  }
  return units.get(key);
}

function buildForm() {
  const item = selected(),
    form = $("component-form");
  $("selection").hidden = !item;
  form.replaceChildren();
  $("reading-grid").dataset.keys = "";
  if (!item) return;
  put(
    $("selected-name"),
    item.kind === "wire" ? "Wire" : `${KINDS[item.kind].label} ${item.name}`,
  );
  $("rotate").disabled = item.kind === "wire" || !placed(item);
  for (const field of FIELDS[item.kind] || []) {
    if (typeof item[field.key] !== "number") continue;
    const row = document.createElement("div"),
      name = document.createElement("label"),
      value = document.createElement("span"),
      number = document.createElement("input"),
      id = "component-" + field.key;
    row.className = "prop-row";
    name.textContent = field.label;
    name.htmlFor = id;
    if (field.help) name.title = field.help;
    number.type = "number";
    number.id = id;
    number.step = "any";
    number.dataset.key = field.key;
    value.className = "prop-value";
    let unit;
    if (field.units.length > 1) {
      unit = document.createElement("select");
      unit.setAttribute("aria-label", field.label + " unit");
      unit.dataset.unit = field.key;
      for (const [factor, symbol] of field.units) {
        const option = document.createElement("option");
        option.value = String(factor);
        option.textContent = symbol;
        unit.append(option);
      }
      unit.value = String(unitOf(item, field));
      // Choosing another unit re-expresses the value; it does not change it.
      unit.addEventListener("change", () => {
        units.set(item.id + ":" + field.key, Number(unit.value));
        syncForm();
      });
    } else {
      unit = document.createElement("span");
      unit.className = "unit";
      unit.textContent = field.units[0][1];
    }
    value.append(number, unit);
    let range = document.createElement("span");
    if (field.slider) {
      range = document.createElement("input");
      range.type = "range";
      range.dataset.key = field.key;
      range.dataset.slider = "true";
      range.setAttribute("aria-label", field.label + " slider");
    }
    // `typed` is the number box while it is being typed in: it is left as
    // the student wrote it until they finish.
    const apply = (amount, typed) => {
      const ok =
        Number.isFinite(amount) &&
        attempt(() => lab.update(item.id, { [field.key]: amount }));
      if (ok) changed();
      if (ok || !typed) syncForm(ok ? typed : null);
    };
    const typedValue = () =>
      number.value === "" ? NaN : Number(number.value) * unitOf(item, field);
    number.addEventListener("input", () => apply(typedValue(), number));
    number.addEventListener("change", () => apply(typedValue(), null));
    if (field.slider)
      range.addEventListener("input", () => apply(Number(range.value), null));
    row.append(name, range, value);
    form.append(row);
  }
  if (item.kind === "switch" || item.kind === "switch2") {
    const row = document.createElement("div"),
      button = document.createElement("button");
    row.className = "prop-row";
    button.type = "button";
    button.id = "component-toggle";
    button.addEventListener("click", () => work(item.id));
    row.append(button);
    form.append(row);
  }
  syncForm();
}

// Refresh the form from the model, leaving alone the box being typed in.
function syncForm(skip) {
  const item = selected();
  if (!item) return;
  for (const input of $("component-form").querySelectorAll("input")) {
    if (input === skip) continue;
    const field = FIELDS[item.kind].find((f) => f.key === input.dataset.key);
    if (input.dataset.slider) {
      const [min, max, step] =
        typeof field.slider === "function" ? field.slider(item) : field.slider;
      input.min = min;
      input.max = max;
      input.step = step;
      input.value = item[field.key];
    } else {
      const factor = unitOf(item, field);
      input.min = field.limit[0] / factor;
      input.max = field.limit[1] / factor;
      input.value = tidy(item[field.key] / factor);
    }
  }
  const toggle = $("component-toggle");
  if (toggle)
    toggle.textContent =
      item.kind === "switch2"
        ? "Switch over"
        : item.closed
          ? "Open the switch"
          : "Close the switch";
}

function select(id) {
  if (state.selected === id) return;
  state.selected = id;
  // The graphs follow the selection, except onto a wire or a switch:
  // working a switch should not take the graph off the capacitor.
  const item = lab.get(id);
  if (item && !["wire", "switch", "switch2"].includes(item.kind))
    state.watched = id;
  buildForm();
}

// Opens or closes a switch.
function work(id) {
  if (attempt(() => lab.toggle(id))) {
    changed();
    syncForm();
  }
}

function setTool(tool) {
  state.tool = tool;
  ghost = null;
  for (const b of document.querySelectorAll("[data-tool]")) {
    b.setAttribute("aria-pressed", String(b.dataset.tool === tool));
    b.classList.toggle("active", b.dataset.tool === tool);
  }
  for (const b of document.querySelectorAll("[data-add]"))
    b.setAttribute("aria-pressed", String(b.dataset.add === tool));
  const [name, help] = ADD[tool]
    ? [ADD[tool].name, ADD[tool].help]
    : TOOL_HELP[tool];
  put($("tool-name"), name);
  put(
    $("tool-help"),
    ADD[tool] && tool !== "wire" ? help + " R turns it first." : help,
  );
  canvas.style.cursor = ADD[tool] ? "crosshair" : tool === "pan" ? "grab" : "";
}

// Switches between the page's views (one so far), as the fields page does.
function setMode(mode) {
  state.mode = mode;
  lab = labs[mode];
  drag = null;
  for (const b of document.querySelectorAll("[data-mode]"))
    b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
  for (const b of document.querySelectorAll("[data-for]"))
    b.hidden = b.dataset.for !== mode;
  state.selected = state.watched = null;
  setTool("grab");
  buildForm();
}

// The time constant to mark on the graphs: that of the watched capacitor,
// or the circuit's own if it has just one.
function timeConstantOf(item) {
  const taus =
    item?.kind === "capacitor"
      ? lab.timeConstants(item.id)
      : lab.timeConstants();
  return { taus, tau: taus.length === 1 ? taus[0] : null };
}

function updatePanels(c, s) {
  const item = selected();
  if (state.selected !== null && !item) select(null);
  if (item) {
    fillGrid($("reading-grid"), "reading-", readingsOf(item, s.of(item.id)));
    const r = s.of(item.id);
    put(
      $("component-note"),
      r.flow === null
        ? "No reading: this section of the circuit has a fault (see the warning)."
        : item.kind === "voltmeter" && r.voltage === null
          ? "No reading: its two terminals are on sections that are not joined."
          : item.kind === "lamp" && r.brightness > 1
            ? "Above its rated power: drawn fully bright. A real lamp would be overrun."
            : item.kind === "wire"
              ? "Ideal wire: no resistance, so no p.d. along it and no power lost in it."
              : "",
    );
  }
  // Every meter, as text: the same strings that are drawn beside them.
  const meters = lab
    .list()
    .filter((i) => i.kind === "ammeter" || i.kind === "voltmeter");
  fillGrid(
    $("meter-list"),
    "meter-",
    meters.map((m) => [
      m.name,
      (m.kind === "ammeter" ? "Ammeter " : "Voltmeter ") + m.name,
      m.kind === "ammeter"
        ? si(s.of(m.id).current, "A")
        : si(s.of(m.id).voltage, "V"),
    ]),
  );
  put(
    $("meter-note"),
    meters.length
      ? ""
      : "No meters yet. Put an ammeter in series, or a voltmeter in parallel.",
  );
  // Faults, loudly; other remarks, quietly.
  const fault = s.problems[0],
    shorted = s.notices.find((n) => n.type === "shorted-cell"),
    loud = fault || shorted;
  $("warning").hidden = !loud;
  if (loud) {
    put(
      $("warning-title"),
      !fault || fault.type === "short"
        ? "Short circuit"
        : fault.type === "conflict"
          ? "Cells disagree"
          : "Not solved",
    );
    put($("warning-text"), loud.message.replace(/^Short circuit: /, ""));
  }
  const quiet = s.notices
    .filter((n) => n.type !== "shorted-cell")
    .map((n) => n.message);
  $("circuit-note").hidden = !quiet.length;
  put($("circuit-note"), quiet.join(" "));
  const range = state.show.potential ? potentialRange(s) : null;
  $("potential-legend").hidden = !state.show.potential;
  put(
    $("potential-legend-text"),
    range
      ? `${si(range[0], "V", 3)} to ${si(range[1], "V", 3)}`
      : "all at one potential",
  );
  drawGraphs(c, s);
  const parts = lab.list().filter((i) => i.kind !== "wire").length,
    wires = lab.list().length - parts,
    step = lab.timestep,
    behind =
      state.running && state.achieved < 0.8 * state.warp
        ? ` (running at about ${tidy(state.achieved, 2)}×: the most this computer can keep accurate)`
        : "";
  put(
    $("scene-status"),
    `DC circuit · ${parts} component${parts === 1 ? "" : "s"}, ${wires} wire${wires === 1 ? "" : "s"} · ideal components` +
      (Number.isFinite(step)
        ? ` · time step ${si(step, "s", 3)} (τ/${STEPS_PER_TAU})`
        : ""),
  );
  put(
    $("time"),
    `t = ${si(lab.time, "s")} · ${warpText(state.warp)}${behind}${state.running ? "" : " · paused"}`,
  );
}

// ---------------------------------------------------------------- graphs

function niceStep(range, count) {
  const raw = range / count,
    power = 10 ** Math.floor(Math.log10(raw)),
    lead = raw / power;
  return (lead > 5 ? 10 : lead > 2 ? 5 : lead > 1 ? 2 : 1) * power;
}
// Axes, grid and labels of one graph; returns the mapping to pixels.
function graphFrame(el, c, o) {
  const g = el.getContext("2d"),
    dpr = window.devicePixelRatio || 1,
    w = el.clientWidth || 270,
    h = el.clientHeight || 96;
  if (!g?.setTransform) return null;
  if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
    el.width = Math.round(w * dpr);
    el.height = Math.round(h * dpr);
  }
  const left = 40,
    right = 8,
    top = 15,
    bottom = 18;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  g.font = "9px ui-monospace, monospace";
  g.fillStyle = c.ink;
  g.textAlign = "left";
  g.fillText(o.title, left, 9);
  g.textAlign = "right";
  g.fillText(o.xTitle, w - right, h - 2);
  g.textAlign = "left";
  if (o.empty) {
    g.fillText(o.empty, left, h / 2);
    return null;
  }
  let { x0, x1, y0, y1 } = o;
  // A nearly constant quantity is given a range of at least a tenth of its
  // size, so that it reads as flat instead of magnifying rounding.
  const size = Math.max(Math.abs(y0), Math.abs(y1)),
    least = size > 0 ? 0.1 * size : 1;
  if (y1 - y0 < least) {
    const mid = (y0 + y1) / 2;
    y0 = mid - least / 2;
    y1 = mid + least / 2;
  }
  const pad = (y1 - y0) * 0.08;
  y0 -= pad;
  y1 += pad;
  const X = (v) => left + ((v - x0) / (x1 - x0)) * (w - left - right),
    Y = (v) => top + ((y1 - v) / (y1 - y0)) * (h - top - bottom),
    places = (step) => clamp(-Math.floor(Math.log10(step) + 1e-9), 0, 12),
    yStep = niceStep(y1 - y0, 3),
    xStep = niceStep(x1 - x0, 4);
  g.strokeStyle = c.axis;
  g.lineWidth = 1;
  g.textAlign = "right";
  for (let v = Math.ceil(y0 / yStep) * yStep; v <= y1; v += yStep) {
    g.beginPath();
    g.moveTo(left, Math.round(Y(v)) + 0.5);
    g.lineTo(w - right, Math.round(Y(v)) + 0.5);
    g.stroke();
    g.fillText(
      (Math.abs(v) < yStep / 1e6 ? 0 : v).toFixed(places(yStep)),
      left - 4,
      Y(v) + 3,
    );
  }
  g.textAlign = "center";
  for (let v = Math.ceil(x0 / xStep) * xStep; v <= x1; v += xStep) {
    g.beginPath();
    g.moveTo(Math.round(X(v)) + 0.5, top);
    g.lineTo(Math.round(X(v)) + 0.5, h - bottom);
    g.stroke();
    if (X(v) < w - right - (g.measureText(o.xTitle)?.width ?? 60) - 12)
      g.fillText(
        (Math.abs(v) < xStep / 1e6 ? 0 : v).toFixed(places(xStep)),
        X(v),
        h - 6,
      );
  }
  g.strokeStyle = c.ink;
  g.strokeRect(
    left + 0.5,
    top + 0.5,
    w - left - right - 1,
    h - top - bottom - 1,
  );
  if (y0 < 0 && y1 > 0) {
    g.globalAlpha = 0.5;
    g.beginPath();
    g.moveTo(left, Math.round(Y(0)) + 0.5);
    g.lineTo(w - right, Math.round(Y(0)) + 0.5);
    g.stroke();
    g.globalAlpha = 1;
  }
  return { g, X, Y, top, bottom: h - bottom };
}

// P.d. and current of the watched component against time since the last
// reset, with the time constant marked from the last change to the circuit.
function drawGraphs(c) {
  if (!$("graph-panel").open) return;
  const item = lab.get(state.watched),
    record = item && traces.get(item.id),
    { taus, tau } = timeConstantOf(item);
  put($("graph-subject"), item ? "· " + item.name : "");
  put(
    $("graph-note"),
    !item
      ? ""
      : tau
        ? `Time constant τ = ${si(tau, "s")}, marked from the last change (t = ${si(mark, "s")}). In one τ a charging p.d. covers 63% of the way to its final value; a discharging one falls to 37%.`
        : taus.length > 1
          ? `This circuit has ${taus.length} time constants (${taus.map((t) => si(t, "s")).join(", ")}), so its curves are sums of exponentials and no single τ is marked.`
          : "Nothing here charges or discharges through a resistance, so the readings do not change with time.",
  );
  const span = Math.max(lab.time, tau ? mark + 5 * tau : 0) || 1,
    [tFactor, tPrefix] = axisUnit(span);
  for (const [el, key, unit, name, colour] of [
    [$("voltage-graph"), "v", "V", "p.d.", c.voltage],
    [$("current-graph"), "i", "A", "current", c.current],
  ]) {
    const values = record ? record[key].filter((v) => v !== null) : [],
      lo = Math.min(0, ...values),
      hi = Math.max(0, ...values),
      [factor, prefix] = axisUnit(Math.max(-lo, hi)),
      frame = graphFrame(el, c, {
        title: `${name} / ${prefix}${unit}`,
        xTitle: `t / ${tPrefix}s`,
        empty: !item
          ? "Select a component to plot it"
          : !values.length
            ? "No reading to plot"
            : "",
        x0: 0,
        x1: span / tFactor,
        y0: lo / factor,
        y1: hi / factor,
      });
    if (!frame) continue;
    const { g, X, Y } = frame;
    if (tau) {
      // One time constant after the last change.
      const x = Math.round(X((mark + tau) / tFactor)) + 0.5;
      g.strokeStyle = g.fillStyle = c.soft;
      g.setLineDash([4, 3]);
      g.beginPath();
      g.moveTo(x, frame.top);
      g.lineTo(x, frame.bottom);
      g.stroke();
      g.setLineDash([]);
      g.textAlign = "center";
      g.fillText("τ", x, frame.top - 3);
    }
    g.strokeStyle = colour;
    g.lineWidth = 1.6;
    g.lineJoin = "round";
    g.beginPath();
    let pen = false;
    for (let k = 0; k < record.t.length; k++) {
      const v = record[key][k];
      if (v === null) {
        pen = false;
        continue;
      }
      const x = X(record.t[k] / tFactor),
        y = Y(v / factor);
      if (pen) g.lineTo(x, y);
      else g.moveTo(x, y);
      pen = true;
    }
    g.stroke();
    // The present value, as a dot at the end of the trace.
    const now = record[key][record.t.length - 1];
    if (now !== null && now !== undefined) {
      g.fillStyle = colour;
      g.beginPath();
      g.arc(X(lab.time / tFactor), Y(now / factor), 2.6, 0, 2 * Math.PI);
      g.fill();
    }
  }
}

// ---------------------------------------------------------------- loop

function frame(now) {
  const elapsed = last ? Math.min((now - last) / 1000, 0.05) : 0;
  last = now;
  // The clock waits while something is being dragged about.
  const dragging = drag?.type === "move" || drag?.type === "end";
  if (state.running && elapsed > 0 && !dragging) {
    const began = performance.now(),
      wanted = elapsed * state.warp,
      done = advance(wanted),
      took = performance.now() - began;
    // The model stops short rather than take longer steps. How many it may
    // take in a frame is set to what this computer does in about 6 ms.
    if (took > 7 || done < 0.5 * wanted)
      budget = clamp(
        budget * clamp(6 / Math.max(took, 0.5), 0.7, 1.3),
        5,
        100000,
      );
    state.achieved += (done / elapsed - state.achieved) * 0.1;
    moveDots(lab.solve(), elapsed);
  }
  const { c, s } = draw();
  updatePanels(c, s);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- input

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

function place(kind, x, y) {
  let id = null;
  if (
    !attempt(() => {
      id = lab.add(kind, { x, y, rot: facing(kind, state.placeRot, x, y) });
    })
  )
    return;
  // As in the other tools, placing something returns to Grab.
  setTool("grab");
  select(id);
  changed();
}
function removeSelected() {
  const item = selected();
  if (!item) return;
  lab.remove(item.id);
  select(null);
  changed();
}
function rotateSelected() {
  const item = selected();
  if (!item || item.kind === "wire" || !placed(item)) return;
  if (attempt(() => lab.rotate(item.id))) changed();
}
function nudge(item, dx, dy) {
  attempt(() => {
    const carry = lab.attached(item.id),
      [x, y] = item.kind === "wire" ? [item.x1, item.y1] : [item.x, item.y];
    lab.move(item.id, x + dx, y + dy, carry);
    lab.settle(item.kind === "wire" ? undefined : item.id, carry);
  });
  if (!lab.get(item.id)) select(null);
  changed();
}
// The way a component should face at a grid point: along the wire that
// runs straight through that point, if there is one, so that it drops into
// the wire in series. Otherwise as it is. Of the two ways along the wire, a
// component with a + terminal takes the one a quarter-turn from where it
// was (left ↔ top, right ↔ bottom).
function facing(kind, rot, x, y) {
  let across = false,
    up = false;
  for (const w of lab.list()) {
    if (w.kind !== "wire" || !placed(w)) continue;
    const between = (a, b, v) => v > Math.min(a, b) && v < Math.max(a, b);
    if (w.y1 === y && w.y2 === y && between(w.x1, w.x2, x)) across = true;
    if (w.x1 === x && w.x2 === x && between(w.y1, w.y2, y)) up = true;
  }
  rot = turnsOf(kind, rot);
  if (across === up || kind === "switch2") return rot;
  if (up === (rot % 2 === 1)) return rot;
  return turnsOf(kind, up ? [3, 1, 1, 3][rot] : [0, 2, 2, 0][rot]);
}
const gridPoint = (sx, sy) => {
  const p = world(sx, sy);
  return { x: Math.round(p.x), y: Math.round(p.y) };
};

canvas.addEventListener("pointerdown", (e) => {
  canvas.focus?.({ preventScroll: true });
  // A click on the scene closes an open panel and does nothing else.
  if (closePanels()) return;
  const { sx, sy } = eventPoint(e),
    p = world(sx, sy),
    at = gridPoint(sx, sy),
    pan = () => {
      drag = { type: "pan", sx, sy, x: view.x, y: view.y };
      capture(e);
    };
  if (e.button === 1 || (e.button === 0 && state.tool === "pan")) {
    e.preventDefault();
    return pan();
  }
  if (e.button !== 0) return;
  if (state.tool === "wire") {
    drag = { type: "wire", from: at, to: at, start: p };
    return capture(e);
  }
  if (ADD[state.tool]) return place(state.tool, at.x, at.y);
  // The ends of a selected wire are handles.
  const chosen = selected();
  if (chosen?.kind === "wire" && placed(chosen)) {
    const ends = lab.terminals(chosen),
      end = ends.findIndex((t) => {
        const [x, y] = screen(t.x, t.y);
        return Math.hypot(sx - x, sy - y) <= TERMINAL;
      });
    if (end >= 0) {
      drag = { type: "end", id: chosen.id, end: end + 1, moved: false };
      return capture(e);
    }
  }
  const hit = hitTest(sx, sy),
    terminal = terminalAt(sx, sy);
  if (terminal && (!hit || hit.kind === "wire")) {
    // Dragging from a terminal draws a wire.
    const from = { x: terminal.x, y: terminal.y };
    drag = { type: "wire", from, to: from, start: p };
    return capture(e);
  }
  if (!hit) {
    select(null);
    return pan();
  }
  select(hit.id);
  const [x, y] = hit.kind === "wire" ? [hit.x1, hit.y1] : [hit.x, hit.y];
  drag = {
    type: "move",
    id: hit.id,
    carry: lab.attached(hit.id),
    dx: x - p.x,
    dy: y - p.y,
    sx,
    sy,
    moved: false,
  };
  capture(e);
});

canvas.addEventListener("pointermove", (e) => {
  const { sx, sy } = eventPoint(e),
    p = world(sx, sy),
    at = gridPoint(sx, sy);
  if (drag?.type === "pan") {
    view.x = drag.x + sx - drag.sx;
    view.y = drag.y + sy - drag.sy;
  } else if (drag?.type === "move") {
    const item = lab.get(drag.id);
    if (!item) drag = null;
    else if (drag.moved || Math.hypot(sx - drag.sx, sy - drag.sy) > 4) {
      const x = Math.round(p.x + drag.dx),
        y = Math.round(p.y + drag.dy),
        [nowX, nowY] =
          item.kind === "wire" ? [item.x1, item.y1] : [item.x, item.y];
      drag.moved = true;
      if (x !== nowX || y !== nowY)
        try {
          // A component with no wires on it yet turns to lie along a wire
          // it is dragged onto.
          lab.move(
            item.id,
            x,
            y,
            drag.carry,
            item.kind === "wire" || drag.carry.length
              ? undefined
              : facing(item.kind, item.rot, x, y),
          );
        } catch {
          // Off the edge of the grid: it stays where it was.
        }
    }
  } else if (drag?.type === "end") {
    const item = lab.get(drag.id);
    if (!item) drag = null;
    else {
      const [kx, ky] = drag.end === 1 ? ["x1", "y1"] : ["x2", "y2"];
      if (item[kx] !== at.x || item[ky] !== at.y)
        try {
          lab.update(item.id, { [kx]: at.x, [ky]: at.y });
          drag.moved = true;
        } catch {}
    }
  } else if (drag?.type === "wire") {
    drag.to = at;
    drag.straight = e.shiftKey;
    // The first clear movement decides which way the corner goes.
    if (drag.horizontal === undefined) {
      const dx = Math.abs(p.x - drag.start.x),
        dy = Math.abs(p.y - drag.start.y);
      if (Math.max(dx, dy) > 0.3) drag.horizontal = dx >= dy;
    }
  } else if (ADD[state.tool] && state.tool !== "wire")
    ghost = {
      kind: state.tool,
      x: at.x,
      y: at.y,
      rot: facing(state.tool, state.placeRot, at.x, at.y),
    };
  else {
    hover = state.tool === "pan" ? null : terminalAt(sx, sy);
    const hit = state.tool === "grab" && !hover && hitTest(sx, sy);
    canvas.style.cursor =
      state.tool === "pan"
        ? "grab"
        : hover || state.tool === "wire"
          ? "crosshair"
          : hit
            ? hit.kind === "switch" || hit.kind === "switch2"
              ? "pointer"
              : "move"
            : "";
  }
});
function endDrag() {
  const d = drag;
  drag = null;
  if (!d) return;
  if (d.type === "move") {
    if (d.moved) {
      const wire = lab.get(d.id)?.kind === "wire";
      attempt(() => lab.settle(wire ? undefined : d.id, d.carry));
      if (!lab.get(d.id)) select(null);
      changed();
    } else {
      // A click: a switch is worked.
      const item = lab.get(d.id);
      if (item?.kind === "switch" || item?.kind === "switch2") work(d.id);
    }
  } else if (d.type === "end") {
    if (!d.moved) return;
    attempt(() => lab.settle());
    if (!lab.get(d.id)) select(null);
    changed();
  } else if (d.type === "wire") {
    const points = wirePoints(d);
    if (d.from.x === d.to.x && d.from.y === d.to.y) return;
    if (attempt(() => lab.wire(...points.map((q) => [q.x, q.y])))) changed();
  }
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("pointerleave", () => {
  hover = null;
  if (!paletteDrag) ghost = null;
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

// Dragging a component straight out of the toolbar onto the grid.
function overCanvas(e) {
  const r = canvas.getBoundingClientRect();
  return (
    e.clientX >= r.left &&
    e.clientX <= r.right &&
    e.clientY >= r.top &&
    e.clientY <= r.bottom &&
    (document.elementFromPoint?.(e.clientX, e.clientY) ?? canvas) === canvas
  );
}
for (const b of document.querySelectorAll("[data-add]")) {
  b.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || b.dataset.add === "wire") return;
    paletteDrag = {
      kind: b.dataset.add,
      button: b,
      x: e.clientX,
      y: e.clientY,
      active: false,
    };
    try {
      b.releasePointerCapture?.(e.pointerId);
    } catch {}
  });
  b.addEventListener("click", () => {
    if (suppressClick) return;
    setTool(state.tool === b.dataset.add ? "grab" : b.dataset.add);
  });
}
window.addEventListener("pointermove", (e) => {
  if (!paletteDrag) return;
  if (
    !paletteDrag.active &&
    Math.hypot(e.clientX - paletteDrag.x, e.clientY - paletteDrag.y) > 6
  )
    paletteDrag.active = true;
  if (!paletteDrag.active) return;
  const { sx, sy } = eventPoint(e);
  const at = gridPoint(sx, sy);
  ghost = overCanvas(e)
    ? {
        kind: paletteDrag.kind,
        ...at,
        rot: facing(paletteDrag.kind, state.placeRot, at.x, at.y),
      }
    : null;
});
window.addEventListener("pointerup", (e) => {
  const d = paletteDrag;
  paletteDrag = null;
  if (!d?.active) return;
  ghost = null;
  // Let go back on the button: not a click on it.
  suppressClick = true;
  setTimeout(() => (suppressClick = false), 0);
  if (!overCanvas(e)) return;
  const { sx, sy } = eventPoint(e),
    at = gridPoint(sx, sy);
  place(d.kind, at.x, at.y);
});

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
    item = selected();
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    return removeSelected();
  }
  if (e.key.startsWith("Arrow") && placed(item)) {
    e.preventDefault();
    return nudge(
      item,
      e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0,
      e.key === "ArrowDown" ? -1 : e.key === "ArrowUp" ? 1 : 0,
    );
  }
  if (key === " ") {
    e.preventDefault();
    if (!e.repeat) setRunning(!state.running);
    return;
  }
  if (key === ".") return stepOnce();
  if (e.repeat) return;
  if (key === "r") {
    // Turns the component about to be placed, or else the selected one.
    if (ADD[state.tool] && state.tool !== "wire") {
      state.placeRot = (state.placeRot + 1) & 3;
      if (ghost) ghost.rot = turnsOf(ghost.kind, state.placeRot);
    } else rotateSelected();
  } else if (key === "0") reset();
  else if (key === "[") shiftWarp(-1);
  else if (key === "]") shiftWarp(1);
  else if (key >= "1" && key <= "9") setTool(HOTKEYS[Number(key) - 1]);
  else if (key === "w") setTool("wire");
  else if (key === "g") setTool("grab");
  else if (key === "h") setTool("pan");
  else if (key === "f") fit();
  else if (key === "c") toggleShow("show-current");
  else if (key === "e") toggleShow("electron-flow");
  else if (key === "p") toggleShow("show-potential");
  else if (key === "v") toggleShow("show-labels");
  else if (key === "?") togglePanel("keys-panel");
  else if (key === "+" || key === "=")
    zoomAt(view.width / 2, view.height / 2, 1.25);
  else if (key === "-") zoomAt(view.width / 2, view.height / 2, 0.8);
});

for (const b of document.querySelectorAll("[data-tool]"))
  b.addEventListener("click", () => setTool(b.dataset.tool));
for (const b of document.querySelectorAll("[data-mode]"))
  b.addEventListener("click", () => setMode(b.dataset.mode));
for (const [id, key] of [
  ["show-current", "current"],
  ["show-potential", "potential"],
  ["show-labels", "labels"],
])
  $(id).addEventListener("change", (e) => {
    state.show[key] = e.target.checked;
  });
$("electron-flow").addEventListener("change", (e) => {
  state.electrons = e.target.checked;
  document.body.classList.toggle("electron-flow", state.electrons);
  put(
    $("flow-note"),
    state.electrons ? "electrons: − to +" : "conventional: + to −",
  );
});

$("pause").addEventListener("click", () => setRunning(!state.running));
$("step").addEventListener("click", stepOnce);
$("reset").addEventListener("click", reset);
for (const w of WARPS) {
  const option = document.createElement("option");
  option.value = String(w);
  option.textContent = warpText(w) + (w === 1 ? " real time" : "");
  $("warp").append(option);
}
$("warp").addEventListener("change", (e) => setWarp(Number(e.target.value)));
$("zoom-in").addEventListener("click", () =>
  zoomAt(view.width / 2, view.height / 2, 1.25),
);
$("zoom-out").addEventListener("click", () =>
  zoomAt(view.width / 2, view.height / 2, 0.8),
);
$("fit-scene").addEventListener("click", fit);
$("delete").addEventListener("click", removeSelected);
$("rotate").addEventListener("click", rotateSelected);
$("component-form").addEventListener("submit", (e) => e.preventDefault());

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
  if (togglePanel("clear-confirm")) $("clear-no").focus();
});
$("clear-no").addEventListener("click", () => closePanels());
$("clear-yes").addEventListener("click", () => {
  lab.clear();
  units.clear();
  closePanels();
  setRunning(false);
  state.selected = state.watched = null;
  buildForm();
  restart();
});

function loadPreset(preset) {
  setMode(preset.view);
  lab.clear();
  units.clear();
  preset.build(lab);
  // A preset sets the circuit up and waits for Run.
  setRunning(false);
  setWarp(preset.scale);
  restart();
  select(lab.list().find((i) => i.name === preset.watch)?.id ?? null);
  fit();
}

const list = $("preset-list");
for (const [mode, title] of [["dc", "DC circuits"]]) {
  const heading = document.createElement("h3");
  heading.textContent = title;
  list.append(heading);
  for (const preset of presets.filter((p) => p.view === mode)) {
    const button = document.createElement("button"),
      name = document.createElement("strong"),
      text = document.createElement("span"),
      expect = document.createElement("span"),
      preview = document.createElement("canvas"),
      words = document.createElement("span");
    button.className = "preset";
    button.dataset.preset = preset.id;
    name.textContent = preset.title;
    text.textContent = preset.text;
    expect.className = "preset-expect";
    expect.textContent = "What to check: " + preset.expect;
    preview.className = "preset-preview";
    preview.setAttribute("aria-hidden", "true");
    words.className = "preset-text";
    words.append(name, text, expect);
    button.append(preview, words);
    button.addEventListener("click", () => {
      closePanels();
      loadPreset(preset);
    });
    list.append(button);
  }
}

// Thumbnails drawn from the presets themselves (each built in a throwaway
// circuit), so they cannot drift from what loads. Redrawn only when the
// theme changes.
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
  const scene = new CircuitLab();
  preset.build(scene);
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const item of scene.list())
    for (const t of scene.terminals(item)) {
      minX = Math.min(minX, t.x);
      maxX = Math.max(maxX, t.x);
      minY = Math.min(minY, t.y);
      maxY = Math.max(maxY, t.y);
    }
  const c = palette(),
    k = Math.min(w / (maxX - minX + 1.6), h / (maxY - minY + 1.6)),
    cx = (minX + maxX) / 2,
    cy = (minY + maxY) / 2;
  g.fillStyle = c.back;
  g.fillRect(0, 0, w, h);
  drawCircuit(g, scene, scene.solve(), {
    c,
    scale: k,
    at: (x, y) => [w / 2 + (x - cx) * k, h / 2 - (y - cy) * k],
    labels: false,
    potential: false,
    preview: true,
  });
}

prefs.onchange = () => buildForm();
window.addEventListener("resize", fitHeader);
$("ui-size").addEventListener("input", fitHeader);

// On a narrow screen the panels start folded, clear of the circuit.
if (window.innerWidth < 900)
  for (const id of ["display-panel", "meters-panel", "graph-panel"])
    $(id).open = false;
// Start with a circuit on the page, not an empty grid.
setWarp(1);
loadPreset(presets[0]);
fitHeader();
requestAnimationFrame(frame);
