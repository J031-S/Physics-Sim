// Electric & magnetic fields page: canvas drawing, pointer and keyboard
// input, panels. All physics lives in model.js.
import { $, isDark, showToast } from "../site/dom.js";
import { setupSite } from "../site/shell.js";
import { styleCanvas } from "../site/canvas-style.js";
import {
  FieldLab,
  KINDS,
  EPS0,
  MU0,
  TestCharges,
  LIMITS,
  electricFieldLines,
  magneticFieldLines,
} from "./model.js";
import {
  createFieldRenderer,
  fieldPalette,
  GRID,
  SOURCE_RADIUS,
  si,
  signed,
  tidy,
} from "./render.js";
import { presets } from "./presets.js";
import { setupSceneFiles } from "../scene-file.js";
import { onSchemeChange, reportFrame } from "../site/dev-hooks.js";

const canvas = $("canvas"),
  ctx = styleCanvas(canvas.getContext("2d"));
const prefs = setupSite();
const lab = new FieldLab();

const BASE_SCALE = 100, // pixels per metre at 100% zoom
  ROTATE_STEP = Math.PI / 12;
const view = { scale: BASE_SCALE, x: 0, y: 0, width: 0, height: 0 };
const renderer = createFieldRenderer(ctx, view);
const viewBounds = renderer.viewBounds;
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
  // R held: dragging a plate or magnet resizes it about its centre.
  resizeHeld = false,
  computed = null,
  stale = true,
  queued = false,
  pointer = null;

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
    "Drag a source to move it; Ctrl-drag turns a plate or magnet; hold R and drag to resize one. Click one to change its values.",
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
  showToast(message, 3200);
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

function invalidate(recompute = true) {
  if (recompute) stale = true;
  if (queued) return;
  queued = true;
  requestAnimationFrame((now) => {
    const began = performance.now();
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
    reportFrame({ steps: animate ? 1 : 0, ms: performance.now() - began });
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

// ---------------------------------------------------------------- drawing

function palette() {
  return fieldPalette(isDark());
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
  updateReset();
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
    computed = renderer.compute(lab, state, { dark: isDark() });
    stale = false;
    if (computed.legendText !== undefined)
      $("potential-legend-text").textContent = computed.legendText;
    $("equipotential-step").textContent = computed.stepText;
    $("potential-legend").hidden = !computed.scale;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, r.width, r.height);
  renderer.drawScene(lab, state, {
    computed,
    tests,
    grid: prefs.grid,
    dark: isDark(),
  });
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
  $("equipotentials-toggle").hidden = !electric;
  lastFrame = 0;
  updateTests();
  // The forces toggle names what it shows in this field.
  const forces = electric ? "Forces on charges" : "Forces on wires",
    toggle = $("show-forces-label");
  toggle.title = `${forces} (F)`;
  toggle.querySelector("[data-icon]").dataset.iconLabel = forces;
  const spoken = toggle.querySelector(".sr-only");
  if (spoken) spoken.textContent = forces;
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

// What Reset returns each scene to: that scene as the last preset or file
// left it, with a name for the button's tooltip.
const start = { electric: null, magnetic: null };
function remember(mode, name) {
  start[mode] = { scene: lab.exportMode(mode), name };
}
function resetScene() {
  const saved = start[state.mode];
  if (!saved) return;
  lab.loadMode(saved.scene, state.mode);
  if (state.mode === "electric") tests.clear();
  state.selected[state.mode] = null;
  drag = null;
  syncUniform();
  buildForm();
  updateTests();
  status();
  invalidate();
}
// Reset is offered only once the scene on show differs from where it began.
function updateReset() {
  const saved = start[state.mode],
    button = $("reset");
  if (!button) return;
  const changed =
    saved &&
    (JSON.stringify(lab.exportMode(state.mode)) !==
      JSON.stringify(saved.scene) ||
      (state.mode === "electric" && tests.items.length > 0));
  button.disabled = !changed;
  button.title = saved
    ? `Reset this scene to “${saved.name}” as it was loaded`
    : "Reset this scene to the preset or file as it was loaded";
}

function loadPreset(preset) {
  lab.clear(preset.mode);
  if (preset.mode === "electric") tests.clear();
  preset.build(lab);
  remember(preset.mode, preset.title);
  state.selected[preset.mode] = null;
  setMode(preset.mode);
  syncUniform();
  fit();
}

// A saved file holds both scenes; it opens on the one that was showing.
setupSceneFiles({
  filename: "physics-sim-fields.json",
  toast,
  save: () => ({ ...lab.exportScene(), view: { mode: state.mode } }),
  load(data) {
    lab.loadScene(data);
    remember("electric", "the loaded file");
    remember("magnetic", "the loaded file");
    tests.clear();
    state.selected.electric = state.selected.magnetic = null;
    const saved = data.view?.mode;
    setMode(
      saved === "electric" || saved === "magnetic"
        ? saved
        : lab.list("electric").length || !lab.list("magnetic").length
          ? "electric"
          : "magnetic",
    );
    syncUniform();
    fit();
    toast("Scene loaded");
  },
});

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

// Resize a plate or magnet about its centre to reach the pointer: its length
// along its own axis, and a magnet's width across it. Snapping takes each to
// a whole number of grid steps either side of the centre.
function resizeSource(s, p) {
  const c = Math.cos(s.angle),
    n = Math.sin(s.angle),
    dx = p.x - s.x,
    dy = p.y - s.y,
    size = (half, [lo, hi]) => {
      let v = 2 * Math.abs(half);
      if (state.snapping) v = 2 * snapTo(v / 2, GRID);
      return Math.min(hi, Math.max(lo, v));
    },
    patch = { length: size(dx * c + dy * n, LIMITS.length) };
  if (s.kind === "magnet") patch.width = size(-dx * n + dy * c, LIMITS.width);
  if (attempt(() => lab.update(s.id, patch))) {
    syncForm();
    invalidate();
  }
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
  const long = hit.kind === "plate" || hit.kind === "magnet";
  drag =
    resizeHeld && long
      ? { type: "resize", id: hit.id }
      : e.ctrlKey && long
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
    else if (drag.type === "resize") resizeSource(s, p);
    else {
      let angle = Math.atan2(p.y - s.y, p.x - s.x) + drag.offset;
      if (state.snapping) angle = snapTo(angle, ROTATE_STEP);
      if (attempt(() => lab.update(s.id, { angle: wrapAngle(angle) }))) {
        syncForm();
        invalidate();
      }
    }
  } else if (state.tool === "grab") {
    const hit = hitTest(sx, sy);
    canvas.style.cursor = !hit
      ? ""
      : resizeHeld && (hit.kind === "plate" || hit.kind === "magnet")
        ? "nwse-resize"
        : "move";
  }
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
document.addEventListener("keyup", (e) => {
  if (e.key.toLowerCase() === "r") resizeHeld = false;
});
window.addEventListener("blur", () => (resizeHeld = false));
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r" && !typing(e) && !e.ctrlKey && !e.metaKey)
    resizeHeld = true;
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
    } catch (e) {
      // A preview is decoration and must not stop the panel opening, but a
      // broken one is a bug: say so in the console.
      console.error(`Preset preview "${preset.id}" failed:`, e);
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
  g.fillStyle = c.back;
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
      g.strokeStyle = charge ? c.glyph : c.ink;
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
remember("electric", presets.find((p) => p.id === "dipole").title);
remember("magnetic", presets.find((p) => p.id === "parallel-currents").title);
$("reset").addEventListener("click", resetScene);
syncUniform();
setSnapping(false);
setMode("electric");
fitHeader();
draw();
// A developer scheme changed the colours: redraw, and redraw the preset
// thumbnails when they are next shown.
onSchemeChange(() => {
  previewTheme = null;
  invalidate();
});
