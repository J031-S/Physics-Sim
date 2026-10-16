// Waves, light & sound page: three views (rays, waves, sound) switched as on
// the fields and circuits pages, each with its own model, palette, panels
// (`data-for`) and presets. All physics lives in rays.js, waves.js and
// sound.js: every number shown here is read from them. Sound is played by
// audio.js, only when the student presses Play.
import { $, isDark, showToast } from "../site/dom.js";
import { setupSite } from "../site/shell.js";
import { styleCanvas } from "../site/canvas-style.js";
import { setPlaybackIcon } from "../site/icons.js";
import { onSchemeChange, reportFrame } from "../site/dev-hooks.js";
import { setupSceneFiles } from "../scene-file.js";
import { RayLab, MATERIALS, kindName as rayName, isSource as isRaySource, outlineOf, focalLength, indexOf, GREEN, FORMAT as RAYS_FORMAT } from "./rays.js";
import { WaveLab, kindName as waveName, MIN_CELLS, FORMAT as WAVES_FORMAT } from "./waves.js";
import { SoundLab, MEDIA, soundLevel, pointIntensity, doppler, passing, beatFrequency, FORMAT as SOUND_FORMAT } from "./sound.js";
import { presets } from "./presets.js";
import { createWaveRenderer, drawSound, wavePalette } from "./render.js";
import { createPlayer } from "./audio.js";

const canvas = $("canvas"),
  ctx = styleCanvas(canvas.getContext("2d"));
const prefs = setupSite();
const deg = Math.PI / 180;

// One model for each view, switched by `setMode` as on the circuits page.
const labs = { rays: new RayLab(), waves: new WaveLab(), sound: new SoundLab() };
const view = { x: 0, y: 0, scale: 1000, width: 0, height: 0 };
// Each view keeps its own camera.
const cameras = { rays: null, waves: null };
const state = {
  mode: "rays",
  tool: "grab",
  selected: null,
  running: false,
  warp: { waves: 1, sound: 0.002 },
  achieved: 1,
  show: { foci: true, partial: true, display: "wave", gain: 1.2, labels: "light" },
};
const renderer = createWaveRenderer(ctx, view),
  { screen, world } = renderer,
  player = createPlayer();
let last = 0,
  drag = null,
  budget = 400, // wave steps allowed in a frame, tuned to about 6 ms of work
  traceCache = null,
  soundTime = 0,
  soundStart = 0,
  fitted = false,
  levelMap = null,
  dirty = true,
  framing = null; // the region the current preset asked to show

const WARPS = {
  // Periods of the base wave (1 Hz) per real second.
  waves: [0.125, 0.25, 0.5, 1, 2, 4, 8],
  // Simulated seconds per real second: slow motion for strings and pipes.
  sound: [0.0005, 0.001, 0.002, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1],
};
const FRAME = 1 / 60;

// ---------------------------------------------------------------- helpers

const toast = (message, long) => showToast(message, long ? 9000 : 3200);
function attempt(fn) {
  try {
    fn();
    return true;
  } catch (error) {
    toast(error.message);
    return false;
  }
}
const lab = () => labs[state.mode];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const minus = (s) => s.replace(/^-/, "−").replace(/e-/, "e−");
// A number to `digits` significant figures, without a floating-point tail.
function fmt(v, digits = 4) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  if (!Number.isFinite(v)) return v > 0 ? "∞" : "−∞";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e6 || a < 1e-4) return minus(v.toExponential(digits - 1));
  return minus(String(Number(v.toPrecision(digits))));
}
const PREFIX = [
  [1e9, "G"],
  [1e6, "M"],
  [1e3, "k"],
  [1, ""],
  [1e-3, "m"],
  [1e-6, "µ"],
  [1e-9, "n"],
  [1e-12, "p"],
  [1e-15, "f"],
];
function si(v, unit, digits = 4) {
  if (!Number.isFinite(v)) return fmt(v) + " " + unit;
  const a = Math.abs(v);
  for (const [f, p] of PREFIX) if (a >= f * 0.9995) return `${fmt(v / f, digits)} ${p}${unit}`;
  return `${fmt(v, digits)} ${unit}`;
}
const angleText = (r, digits = 4) =>
  prefs.angleUnit === "radians" ? `${fmt(r, digits)} rad` : `${fmt(r / deg, digits)}°`;
// Lengths in the rays view, in metres to three decimal places' worth.
const metres = (m) => `${fmt(m, 4)} m`;
function put(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}
function changed() {
  traceCache = null;
  dirty = true;
}
const trace = () =>
  (traceCache ??= {
    trace: labs.rays.trace({ minIntensity: state.show.partial ? 0.01 : 1 }),
    images: labs.rays.images(),
  });

// Real-world sizes for the waves view's label switch: the tank is in
// wavelengths of its 1 Hz base wave, so one length unit is λ.
const EQUIVALENT = {
  light: { name: "green light", wavelength: 500e-9, speed: 2.998e8, word: "light" },
  sound: { name: "1 kHz sound in air", wavelength: 343 / 1000, speed: 343, word: "sound" },
};
const lengthText = (l) => {
  const e = EQUIVALENT[state.show.labels];
  return `${fmt(l, 3)} λ (${si(l * e.wavelength, "m", 3)} for ${e.name})`;
};

// ---------------------------------------------------------------- views

const PALETTES = {
  rays: [
    ["mirror", "Mirror", "Plane mirror"],
    ["sphericalMirror", "Curved mirror", "Spherical mirror: concave (radius > 0) or convex (radius < 0)"],
    ["parabolicMirror", "Parabolic", "Parabolic mirror: every ray parallel to its axis passes through its focus"],
    ["block", "Block", "Rectangular block of glass, water or acrylic"],
    ["prism", "Prism", "Triangular prism"],
    ["lens", "Lens", "Lens made from two spherical surfaces, traced exactly"],
    ["thinLens", "Ideal lens", "Ideal thin lens: obeys 1/f = 1/u + 1/v exactly for every ray (an idealisation)"],
    ["screen", "Screen", "Screen: absorbs rays and records where they land"],
    ["stop", "Stop", "Aperture stop: blocks rays outside its opening"],
    ["ray", "Ray", "A single ray"],
    ["beam", "Beam", "A parallel beam"],
    ["point", "Point", "Point source: a fan of rays"],
    ["object", "Object", "Object arrow: its image is found and drawn"],
  ],
  waves: [
    ["point", "Point source", "Point source: circular waves"],
    ["line", "Line source", "Line source: plane waves, both ways from the line"],
    ["moving", "Moving source", "Point source moving at a set speed (Doppler; a shock cone above the wave speed)"],
    ["wall", "Wall", "Wall: reflects waves"],
    ["slits", "Slits", "Wall with two slits"],
    ["medium", "Medium", "Region where waves travel slower (refractive index n = c₀/c)"],
    ["lensRegion", "Lens region", "Lens-shaped region of slower waves"],
    ["probe", "Probe", "Probe: records the displacement against time"],
    ["screen", "Screen", "Screen: the time-averaged intensity along a line, with theory's fringes marked"],
  ],
  sound: [
    ["string", "String", "A string fixed at both ends"],
    ["pipe", "Pipe", "A pipe, open at both ends or closed at one"],
    ["beats", "Beats", "Two tones of nearly the same frequency"],
    ["level", "Decibels", "Intensity and sound level from a point source"],
    ["doppler", "Doppler", "A moving source"],
  ],
};
const ADD_PROPS = {
  slits: ["wall", { slits: 2, slitWidth: 1, separation: 4, length: 12 }],
  lensRegion: ["medium", { shape: "lens", radius: 6, thickness: 2.4, index: 1.5 }],
  medium: ["medium", { shape: "rect", width: 6, height: 6, index: 1.5 }],
};
const TOOL_HELP = {
  rays: "Drag to move what is under the pointer, or the view. Click something to select it; R turns it.",
  waves: "Drag to move a source, wall or probe, or the view. Click something to select it; R turns it.",
  sound: "Choose an experiment in the toolbar; set its values on the right. Press Play to hear it.",
};

function buildPalette() {
  const bar = $("palette");
  bar.replaceChildren();
  for (const [key, text, title] of PALETTES[state.mode]) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.title = title;
    if (state.mode === "sound") {
      b.dataset.experiment = key;
      b.setAttribute("aria-pressed", String(labs.sound.state.mode === key));
      b.addEventListener("click", () => {
        labs.sound.setMode(key);
        player.stop();
        setAudioButton();
        restartSound();
        buildPalette();
        buildExperiment();
      });
    } else {
      b.dataset.add = key;
      b.setAttribute("aria-pressed", String(state.tool === key));
      b.addEventListener("click", () => setTool(state.tool === key ? "grab" : key));
    }
    bar.append(b);
  }
}
function setTool(tool) {
  state.tool = tool;
  for (const b of document.querySelectorAll("[data-add]")) b.setAttribute("aria-pressed", String(b.dataset.add === tool));
  const entry = PALETTES[state.mode].find(([k]) => k === tool);
  put($("tool-name"), entry ? entry[1] : state.mode === "sound" ? "Sound" : "Grab");
  put($("tool-help"), entry ? `${entry[2]}. Click the scene to place it.` : TOOL_HELP[state.mode]);
  canvas.style.cursor = entry ? "crosshair" : "";
}

function setMode(mode, keep) {
  const was = state.mode;
  if (was !== mode && cameras[was] !== undefined) cameras[was] = { x: view.x, y: view.y, scale: view.scale };
  state.mode = mode;
  drag = null;
  player.stop();
  for (const b of document.querySelectorAll("[data-mode]")) b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
  for (const el of document.querySelectorAll("[data-for]")) el.hidden = !el.dataset.for.split(" ").includes(mode);
  document.body.dataset.view = mode;
  state.selected = null;
  setRunning(false);
  buildPalette();
  setTool("grab");
  buildWarp();
  buildDisplay();
  buildForm();
  if (mode === "waves") buildTank();
  if (mode === "sound") buildExperiment();
  setAudioButton();
  if (keep || was === mode) return;
  if (mode === "sound") restartSound();
  else {
    if (cameras[mode]) Object.assign(view, cameras[mode]);
    else if (!lab().list().length) return loadPreset(presets.find((p) => p.mode === mode));
    else fit();
  }
  changed();
}

// ---------------------------------------------------------------- time

function buildWarp() {
  const select = $("warp");
  select.replaceChildren();
  if (state.mode === "rays") return;
  for (const w of WARPS[state.mode]) {
    const o = document.createElement("option");
    o.value = String(w);
    o.textContent =
      state.mode === "waves" ? `${fmt(w)} period${w === 1 ? "" : "s"}/s` : w === 1 ? "real time" : `${fmt(w)}× (slow)`;
    select.append(o);
  }
  select.value = String(state.warp[state.mode]);
}
function setWarp(w) {
  state.warp[state.mode] = w;
  $("warp").value = String(w);
}
function shiftWarp(by) {
  const list = WARPS[state.mode];
  if (!list) return;
  const i = list.indexOf(state.warp[state.mode]);
  setWarp(list[clamp(i + by, 0, list.length - 1)]);
}
function setRunning(on) {
  state.running = on && state.mode !== "rays";
  setPlaybackIcon(state.running, prefs.iconWeight);
  put($("pause"), state.running ? "Pause" : "Run");
  $("pause").title = state.running ? "Pause (Space)" : "Run (Space)";
}
function reset() {
  if (state.mode === "waves") labs.waves.reset();
  if (state.mode === "sound") restartSound();
  dirty = true;
}
function advance(seconds) {
  if (state.mode === "waves") {
    const done = labs.waves.advance(seconds * state.warp.waves, { maxSteps: Math.round(budget) });
    return done;
  }
  if (state.mode === "sound") {
    soundTime += seconds * state.warp.sound;
    // The Doppler pass starts again once the source has gone.
    if (labs.sound.state.mode === "doppler" && soundTime > -soundStart) soundTime = soundStart;
    return seconds * state.warp.sound;
  }
  return 0;
}
function stepOnce() {
  setRunning(false);
  advance(FRAME);
}

// ---------------------------------------------------------------- camera

function sceneBox() {
  if (state.mode === "waves") {
    const w = labs.waves;
    return { minX: -w.width / 2, maxX: w.width / 2, minY: -w.height / 2, maxY: w.height / 2 };
  }
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  const grow = (p) => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  };
  for (const item of labs.rays.list()) {
    if (isRaySource(item.kind)) {
      grow(item);
      if (item.kind === "object") grow({ x: item.x, y: item.y + item.height });
    } else {
      const o = outlineOf(item);
      for (const p of o.points ?? o.parts.flat()) grow(p);
    }
  }
  for (const im of trace().images)
    if (im.base && Number.isFinite(im.base.x) && Math.abs(im.base.x) < 50) {
      grow(im.base);
      grow(im.tip);
    }
  return minX <= maxX ? { minX, maxX, minY, maxY } : null;
}
// The part of the canvas the panels leave clear.
function clearArea() {
  const origin = canvas.getBoundingClientRect(),
    side = document.querySelector(".wl-side")?.getBoundingClientRect(),
    onRight = side && side.width > 0 && side.left > origin.left + view.width / 2;
  return {
    left: 24,
    right: onRight ? side.left - origin.left - 14 : view.width - 16,
    top: 110,
    bottom: view.height - 56,
  };
}
function fit(target) {
  const area = clearArea(),
    width = Math.max(area.right - area.left, 120),
    height = Math.max(area.bottom - area.top, 120);
  let box = sceneBox();
  if (target) box = { minX: target.x - target.width / 2, maxX: target.x + target.width / 2, minY: target.y, maxY: target.y };
  if (!box) {
    view.scale = state.mode === "waves" ? 20 : 1500;
    view.x = area.left + width / 2;
    view.y = area.top + height / 2;
    return;
  }
  const spanX = Math.max(box.maxX - box.minX, 1e-3),
    spanY = Math.max(box.maxY - box.minY, 1e-3),
    pad = state.mode === "waves" ? 1 : 1.25;
  view.scale = Math.min(width / (spanX * pad), height / (spanY * pad || 1));
  if (target) view.scale = width / (target.width * 1.05);
  const cx = (box.minX + box.maxX) / 2,
    cy = (box.minY + box.maxY) / 2;
  view.x = area.left + width / 2 - cx * view.scale;
  view.y = area.top + height / 2 + cy * view.scale;
}
function zoomAt(sx, sy, factor) {
  const p = world(sx, sy),
    [lo, hi] = state.mode === "waves" ? [2, 400] : [50, 2e5];
  view.scale = clamp(view.scale * factor, lo, hi);
  view.x = sx - p.x * view.scale;
  view.y = sy + p.y * view.scale;
}

// ---------------------------------------------------------------- forms

// Every editable value of each kind: key, label, unit, how to show it.
// `angle` fields follow the website's angle unit.
const L = { unit: "m", digits: 4 };
const RAY_FIELDS = {
  common: [
    { key: "x", label: "x", ...L },
    { key: "y", label: "y", ...L },
    { key: "angle", label: "Angle", angle: true, help: "The direction of its axis (a lens, a source) or the way its front faces (a mirror, a screen)" },
  ],
  mirror: [{ key: "length", label: "Length", ...L }],
  sphericalMirror: [
    { key: "radius", label: "Radius R", ...L, help: "Positive for a concave mirror, negative for a convex one; f = R/2" },
    { key: "aperture", label: "Aperture", ...L },
  ],
  parabolicMirror: [
    { key: "f", label: "Focal length", ...L },
    { key: "aperture", label: "Aperture", ...L },
  ],
  block: [
    { key: "width", label: "Width", ...L },
    { key: "height", label: "Height", ...L },
    "material",
  ],
  prism: [{ key: "apex", label: "Apex angle", angle: true }, { key: "side", label: "Side", ...L }, "material"],
  lens: [
    { key: "R1", label: "Radius R₁", ...L, help: "First surface. Positive when its centre of curvature is on the side the light leaves by; 0 for flat" },
    { key: "R2", label: "Radius R₂", ...L, help: "Second surface, same rule (negative for a biconvex lens); 0 for flat" },
    { key: "thickness", label: "Thickness", ...L, help: "At the centre" },
    { key: "aperture", label: "Aperture", ...L },
    "material",
  ],
  thinLens: [
    { key: "f", label: "Focal length", ...L, help: "Positive: converging. Negative: diverging" },
    { key: "aperture", label: "Aperture", ...L },
  ],
  screen: [{ key: "length", label: "Length", ...L }],
  stop: [
    { key: "opening", label: "Opening", ...L },
    { key: "length", label: "Length", ...L },
  ],
  ray: ["wavelength"],
  beam: [{ key: "width", label: "Width", ...L }, { key: "count", label: "Rays", step: 1 }, "wavelength"],
  point: [{ key: "spread", label: "Spread", angle: true }, { key: "count", label: "Rays", step: 1 }, "wavelength"],
  object: [
    { key: "height", label: "Height", ...L },
    { key: "spread", label: "Spread", angle: true },
    { key: "count", label: "Rays", step: 1 },
    "wavelength",
  ],
};
const W = { unit: "λ", digits: 4 };
const WAVE_FIELDS = {
  common: [
    { key: "x", label: "x", ...W },
    { key: "y", label: "y", ...W },
  ],
  point: [
    { key: "frequency", label: "Frequency", unit: "f₀" },
    { key: "amplitude", label: "Amplitude", unit: "", help: "At one wavelength from the source; it falls as 1/√r in a 2D tank" },
    { key: "phase", label: "Phase", angle: true },
  ],
  line: [
    { key: "angle", label: "Direction", angle: true, help: "The way the waves leave on the arrow's side (they also leave from the other side)" },
    { key: "length", label: "Length", ...W },
    { key: "frequency", label: "Frequency", unit: "f₀" },
    { key: "amplitude", label: "Amplitude", unit: "" },
    { key: "phase", label: "Phase", angle: true },
  ],
  moving: [
    { key: "angle", label: "Direction", angle: true },
    { key: "speed", label: "Speed", unit: "× c", help: "As a multiple of the wave speed c₀; above 1 the waves form a shock cone" },
    { key: "frequency", label: "Frequency", unit: "f₀" },
    { key: "amplitude", label: "Amplitude", unit: "" },
  ],
  wall: [
    { key: "angle", label: "Direction", angle: true },
    { key: "length", label: "Length", ...W },
    { key: "thickness", label: "Thickness", ...W },
    { key: "slits", label: "Slits", step: 1 },
    { key: "slitWidth", label: "Slit width", ...W },
    { key: "separation", label: "Separation", ...W, help: "Centre to centre" },
  ],
  medium: [
    { key: "index", label: "Index n", unit: "", help: "Wave speed c₀/n" },
    { key: "angle", label: "Angle", angle: true },
    { key: "width", label: "Width", ...W, shapes: ["rect"] },
    { key: "height", label: "Height", ...W, shapes: ["rect"] },
    { key: "radius", label: "Radius", ...W, shapes: ["circle", "lens"] },
    { key: "thickness", label: "Thickness", ...W, shapes: ["lens"] },
  ],
  probe: [],
  screen: [
    { key: "angle", label: "Faces", angle: true },
    { key: "length", label: "Length", ...W },
  ],
};
function fieldSpec(f) {
  if (!f.angle) return { factor: 1, unit: "", ...f };
  const rad = prefs.angleUnit === "radians";
  return { ...f, unit: rad ? "rad" : "°", factor: rad ? 1 : 1 / deg, digits: 5 };
}
function numberRow(form, label, value, unit, onValue, help, step) {
  const row = document.createElement("div"),
    name = document.createElement("label"),
    box = document.createElement("span"),
    input = document.createElement("input"),
    u = document.createElement("span"),
    id = "f-" + Math.random().toString(36).slice(2, 9);
  row.className = "prop-row";
  name.textContent = label;
  name.htmlFor = id;
  if (help) name.title = help;
  input.type = "number";
  input.id = id;
  input.step = step ? String(step) : "any";
  input.value = value;
  u.className = "unit";
  u.textContent = unit;
  box.className = "prop-value";
  box.append(input, u);
  const apply = (finished) => {
    const v = Number(input.value);
    if (input.value === "" || !Number.isFinite(v)) return;
    if (!onValue(v, finished) && finished) input.value = value;
  };
  input.addEventListener("input", () => apply(false));
  input.addEventListener("change", () => apply(true));
  row.append(name, document.createElement("span"), box);
  form.append(row);
  return input;
}
function selectRow(form, label, value, options, onValue, help) {
  const row = document.createElement("div"),
    name = document.createElement("label"),
    select = document.createElement("select"),
    id = "s-" + Math.random().toString(36).slice(2, 9);
  row.className = "prop-row";
  name.textContent = label;
  name.htmlFor = id;
  if (help) name.title = help;
  select.id = id;
  for (const [v, text] of options) {
    const o = document.createElement("option");
    o.value = String(v);
    o.textContent = text;
    select.append(o);
  }
  select.value = String(value);
  select.addEventListener("change", () => onValue(select.value));
  row.append(name, select, document.createElement("span"));
  form.append(row);
  return select;
}
function checkRow(form, label, checked, onValue, help) {
  const row = document.createElement("label"),
    box = document.createElement("input");
  row.className = "fl-check";
  box.type = "checkbox";
  box.checked = checked;
  if (help) row.title = help;
  box.addEventListener("change", () => onValue(box.checked));
  row.append(box, document.createTextNode(" " + label));
  form.append(row);
  return box;
}
const WAVELENGTHS = [
  ["white", "White light (7 colours)"],
  ...[400, 450, 500, 550, 589.3, 600, 650, 700].map((nm) => [nm * 1e-9, `${nm} nm`]),
];

function buildForm() {
  const form = $("item-form"),
    m = lab(),
    item = state.mode === "sound" ? null : m.get(state.selected);
  $("selection").hidden = !item;
  form.replaceChildren();
  if (!item) return;
  const rays = state.mode === "rays",
    name = rays ? rayName(item.kind) : waveName(item.kind);
  put($("selected-name"), item.kind === "medium" ? `Medium (${item.shape === "rect" ? "rectangle" : item.shape})` : name);
  const update = (patch) => {
    const ok = attempt(() => m.update(item.id, patch));
    if (ok) changed();
    return ok;
  };
  const fields = rays ? [...RAY_FIELDS.common, ...(RAY_FIELDS[item.kind] ?? [])] : [...WAVE_FIELDS.common, ...(WAVE_FIELDS[item.kind] ?? [])];
  for (const raw of fields) {
    if (raw === "material") {
      selectRow(
        form,
        "Material",
        item.material,
        [...Object.entries(MATERIALS).map(([k, v]) => [k, `${v.name} (n = ${fmt(indexOf({ material: k }, GREEN), 4)} at 550 nm)`]), ["fixed", "Fixed index, no dispersion"]],
        (v) => {
          if (update({ material: v })) buildForm();
        },
      );
      if (item.material === "fixed")
        numberRow(form, "Index n", item.index, "", (v, done) => (done || v >= 1 ? update({ index: v }) : false));
      continue;
    }
    if (raw === "wavelength") {
      selectRow(form, "Wavelength", item.wavelength, WAVELENGTHS, (v) => update({ wavelength: v === "white" ? "white" : Number(v) }));
      continue;
    }
    if (raw.shapes && !raw.shapes.includes(item.shape)) continue;
    const f = fieldSpec(raw);
    numberRow(
      form,
      f.label,
      Number((item[f.key] * f.factor).toPrecision(f.digits ?? 6)),
      f.unit,
      (v) => update({ [f.key]: v / f.factor }),
      f.help,
      f.step,
    );
  }
}

// The Display panel: what each view can show.
function buildDisplay() {
  const form = $("display-form");
  form.replaceChildren();
  if (state.mode === "rays") {
    checkRow(form, "Focal points (F) and centres (C)", state.show.foci, (v) => {
      state.show.foci = v;
    });
    checkRow(
      form,
      "Partial reflections (Fresnel)",
      state.show.partial,
      (v) => {
        state.show.partial = v;
        changed();
      },
      "At every refracting surface some light is reflected; its brightness is the Fresnel equations' share for unpolarised light. Reflections carrying less than 1% are not drawn.",
    );
  } else if (state.mode === "waves") {
    selectRow(form, "Show", state.show.display, [
      ["wave", "The wave (displacement)"],
      ["intensity", "Intensity (time-averaged)"],
    ], (v) => {
      state.show.display = v;
    });
    numberRow(form, "Full colour at", state.show.gain, "× A", (v) => {
      if (!(v > 0)) return false;
      state.show.gain = v;
      return true;
    }, "The displacement (as a multiple of the largest source amplitude) shown at full colour; intensity at its square");
    selectRow(form, "Lengths as", state.show.labels, [
      ["light", "Light (green, 500 nm)"],
      ["sound", "Sound (1 kHz in air)"],
    ], (v) => {
      state.show.labels = v;
      buildTank();
    }, "Changes only the wording and the real-world sizes shown: the tank is the same for both");
  } else {
    const p = document.createElement("p");
    p.className = "fl-note";
    p.textContent = "Time runs slowed down so the motion can be seen; the time scale is in the top bar.";
    form.append(p);
  }
}

// The Tank panel of the waves view.
function buildTank() {
  const form = $("tank-form"),
    w = labs.waves,
    set = (patch) => {
      const ok = attempt(() => w.setTank(patch));
      if (ok) {
        fit();
        changed();
      }
      return ok;
    };
  form.replaceChildren();
  numberRow(form, "Width", w.width, "λ", (v, done) => done && set({ width: v }));
  numberRow(form, "Height", w.height, "λ", (v, done) => done && set({ height: v }));
  numberRow(form, "Cells per λ", Number((1 / w.cell).toPrecision(4)), "", (v, done) => done && set({ cell: 1 / v }), `The grid's resolution for the base wave. At least ${MIN_CELLS} cells per wavelength are needed everywhere; finer is slower.`, 1);
  selectRow(form, "Edges", w.edges, [
    ["absorb", "Absorb (waves leave the tank)"],
    ["wall", "Reflect (a closed box)"],
  ], (v) => set({ edges: v }));
  numberRow(form, "Damping γ", w.damping, "s⁻¹", (v, done) => done && v >= 0 && set({ damping: v }), "Labelled damping: ∂²u/∂t² + γ∂u/∂t = c²∇²u. 0 is an ideal medium that loses no energy.");
  const e = EQUIVALENT[state.show.labels];
  put($("tank-note"), `1 λ is ${si(e.wavelength, "m", 3)} for ${e.name}; one period is ${si(e.wavelength / e.speed, "s", 3)}. The grid is ${w.nx - 2 * w.pad} × ${w.ny - 2 * w.pad} cells in the tank (${w.nx} × ${w.ny} with its absorbing layer).`);
}

// The Experiment panel of the sound view.
function buildExperiment() {
  const form = $("experiment-form"),
    s = labs.sound,
    mode = s.state.mode,
    part = s.state[mode],
    set = (patch, rebuild) => {
      const ok = attempt(() => s.set(mode, patch));
      if (ok) {
        dirty = true;
        if (player.playing) play();
        if (rebuild) buildExperiment();
        if (mode === "doppler") restartSound();
      }
      return ok;
    };
  form.replaceChildren();
  put($("experiment-title"), { string: "String", pipe: "Pipe", beats: "Beats", level: "Sound level", doppler: "Doppler effect" }[mode]);
  const num = (key, label, unit, factor = 1, help) =>
    numberRow(form, label, Number((part[key] * factor).toPrecision(6)), unit, (v) => set({ [key]: v / factor }), help);
  const media = Object.entries(MEDIA).map(([k, v]) => [k, v.speed ? `${v.name} (${v.speed} m/s)` : v.name]);
  if (mode === "string") {
    num("length", "Length L", "m");
    num("tension", "Tension T", "N");
    num("density", "Mass per metre μ", "g/m", 1000);
    selectRow(form, "Set going by", part.kind, [
      ["pluck", "Plucking"],
      ["strike", "Striking (a hammer)"],
    ], (v) => set({ kind: v }, true));
    num("position", part.kind === "pluck" ? "Plucked at" : "Struck at", "× L");
    if (part.kind === "pluck") num("height", "Pulled aside", "mm", 1000);
    else {
      num("speed", "Hammer speed", "m/s");
      num("width", "Hammer width", "mm", 1000);
    }
    num("damping", "Decay time τ", "s", 1, "Labelled damping: every mode dies away as e^(−t/τ). 0 is the ideal string, which rings for ever.");
    selectRow(form, "Show", part.harmonic, [[0, "The whole string"], ...Array.from({ length: 12 }, (_, i) => [i + 1, `Harmonic ${i + 1} alone`])], (v) => set({ harmonic: Number(v) }));
  } else if (mode === "pipe") {
    num("length", "Length L", "m");
    selectRow(form, "Ends", part.ends, [
      ["open", "Open at both ends"],
      ["closed", "Closed at one end"],
    ], (v) => set({ ends: v, harmonic: 1 }, true));
    selectRow(form, "Gas", part.medium, media.filter(([k]) => k !== "water" && k !== "steel"), (v) => set({ medium: v }, true));
    if (part.medium === "air") num("temperature", "Temperature", "°C");
    const odd = part.ends === "closed";
    selectRow(form, "Harmonic", part.harmonic, Array.from({ length: 8 }, (_, i) => (odd ? 2 * i + 1 : i + 1)).map((n) => [n, `n = ${n}`]), (v) => set({ harmonic: Number(v) }));
    checkRow(form, "End correction (0.6 r per open end)", part.endCorrection, (v) => set({ endCorrection: v }, true), "Off by default: the ideal pipe's open end is exactly at its mouth. A real pipe's antinode lies about 0.6 × its radius beyond.");
    if (part.endCorrection) num("radius", "Radius r", "mm", 1000);
  } else if (mode === "beats") {
    num("f1", "Tone 1", "Hz");
    num("f2", "Tone 2", "Hz");
  } else if (mode === "level") {
    num("power", "Source power", "W");
    num("distance", "Distance r", "m");
  } else if (mode === "doppler") {
    num("frequency", "Frequency f", "Hz");
    selectRow(form, "Medium", part.medium, media, (v) => set({ medium: v }, true));
    if (part.medium === "air") num("temperature", "Temperature", "°C");
    num("sourceSpeed", "Source speed v_s", "m/s", 1, "Positive towards the listener at first (it passes and then moves away).");
    num("observerSpeed", "Listener speed v_o", "m/s", 1, "Positive towards the source. Used in the formula readings; the listener stays still in the picture.");
    selectRow(form, "Path", part.layout, [
      ["line", "Straight through the listener"],
      ["pass", "Past the listener"],
    ], (v) => set({ layout: v }, true));
    if (part.layout === "pass") num("distance", "Closest distance", "m");
  }
}

// ---------------------------------------------------------------- readings

function readingsHtml(rows) {
  const box = $("readings"),
    key = JSON.stringify(rows);
  if (box.dataset.key === key) return;
  box.dataset.key = key;
  box.replaceChildren();
  for (const r of rows) {
    if (typeof r === "string") {
      const h = document.createElement("span");
      h.className = "heading";
      h.textContent = r;
      box.append(h);
      continue;
    }
    const a = document.createElement("span"),
      b = document.createElement("span");
    a.textContent = r[0];
    b.textContent = r[1];
    if (r[2]) b.id = "reading-" + r[2];
    box.append(a, b);
  }
}
function raysReadings() {
  const rows = [],
    { trace: t, images } = trace(),
    rl = labs.rays,
    chosen = rl.get(state.selected);
  for (const im of images) {
    const src = rl.get(im.source);
    if (!src || (chosen && chosen.id !== src.id && isRaySource(chosen.kind))) continue;
    if (src.kind === "object") {
      rows.push(`Object ${src.id}`);
      if (im.blocked) {
        rows.push(["Image", "rays blocked"]);
        continue;
      }
      rows.push(["Object distance u", metres(im.objectDistance), "u"]);
      if (im.distance === Infinity) {
        rows.push(["Image", "at infinity (rays leave parallel)", "v"]);
        rows.push(["Angular size", `${fmt(im.angularSize, 4)} rad per m of height`, "angular"]);
        rows.push(["Against the object at 25 cm", `${fmt(im.angularSize * 0.25, 4)}×`, "M"]);
      } else {
        rows.push(["Image distance v (measured)", metres(im.distance), "v"]);
        rows.push(["Magnification m (measured)", fmt(im.magnification, 4), "m"]);
        rows.push(["Image", `${im.real ? "real" : "virtual"}, ${im.upright ? "upright" : "inverted"}`, "kind"]);
      }
      if (im.formula) {
        rows.push(["f of the element", metres(im.formula.focalLength), "f"]);
        rows.push(["v from 1/f = 1/u + 1/v", metres(im.formula.distance), "v-formula"]);
        rows.push(["m from −v/u", fmt(im.formula.magnification, 4), "m-formula"]);
      }
    } else if (src.kind === "beam") {
      rows.push(`Beam ${src.id}`);
      if (im.afocal) rows.push(["Angular magnification", `${fmt(im.angularMagnification, 4)}×`, "angular-magnification"]);
      else {
        rows.push(["Focus (paraxial rays)", `${metres(im.distance)} from the last element`, "focus"]);
        if (im.marginal) rows.push(["Focus (outermost rays)", `${metres(im.marginal.distance)}`, "marginal"]);
        if (im.formula) rows.push(["f from the formula", metres(im.formula.focalLength), "f"]);
      }
    }
  }
  // Angles at each surface for single rays (or the selected source).
  for (const src of rl.list()) {
    if (src.kind !== "ray" && !(chosen && chosen.id === src.id && isRaySource(src.kind))) continue;
    if (chosen && isRaySource(chosen.kind) && chosen.id !== src.id) continue;
    const list = rl.readings(t, src.id);
    for (const r of list.slice(0, 7)) {
      rows.push(`${rayName(src.kind)} ${src.id}${list.length > 1 ? `, ${fmt(r.wavelength * 1e9, 4)} nm` : ""}`);
      for (const e of r.events.slice(0, 4)) {
        const name = rayName(rl.get(e.element)?.kind ?? "") ?? "surface";
        if (e.incidence === undefined) continue;
        if (e.event === "refract")
          rows.push([`${name}: n ${fmt(e.n1, 4)} → ${fmt(e.n2, 4)}`, `${angleText(e.incidence)} in, ${angleText(e.leaving)} out`]);
        else if (e.event === "tir") rows.push([`${name}: total internal reflection`, `at ${angleText(e.incidence)}`]);
        else rows.push([`${name}: reflected`, `at ${angleText(e.incidence)}`]);
      }
      rows.push(["Total deviation", angleText(r.deviation)]);
    }
  }
  if (chosen && !isRaySource(chosen.kind)) {
    rows.push(rayName(chosen.kind));
    const f = focalLength(chosen);
    if (f !== null) rows.push([chosen.kind === "lens" ? "f (thick-lens formula, 550 nm)" : "Focal length f", metres(f)]);
    if (chosen.material) {
      const n = indexOf(chosen, GREEN);
      rows.push(["Index at 550 nm", fmt(n, 5)]);
      rows.push(["Critical angle into air", angleText(Math.asin(1 / n))]);
    }
  }
  const hits = t.hits.length;
  if (hits) rows.push(["Rays on screens", String(hits)]);
  readingsHtml(rows);
  put($("readings-note"), t.truncated ? "Too many rays to follow them all: some are not shown." : "Readouts use paraxial rays (close to the axis); the rays drawn are traced exactly.");
}
function wavesReadings() {
  const w = labs.waves,
    rows = [],
    chosen = w.get(state.selected),
    e = EQUIVALENT[state.show.labels];
  rows.push(["Time", `${fmt(w.time, 4)} periods (${si(w.time * (e.wavelength / e.speed), "s", 3)} for ${e.word})`, "time"]);
  rows.push(["Cells per wavelength (shortest)", fmt(w.cellsPerWavelength(), 3), "cells"]);
  rows.push(["Timestep", `${fmt(w.dt, 3)} periods (c dt/h = 0.5)`]);
  if (chosen) {
    rows.push(waveName(chosen.kind));
    if (chosen.kind === "point" || chosen.kind === "line" || chosen.kind === "moving") {
      const at = w.sourcePosition(chosen),
        n = w.indexAt(at.x, at.y);
      rows.push(["Wavelength here", lengthText(1 / chosen.frequency / n)]);
      if (chosen.kind === "moving") {
        const v = chosen.speed;
        if (v < 1) {
          rows.push(["λ ahead, (1 − v/c)λ", lengthText((1 - v) / chosen.frequency)]);
          rows.push(["λ behind, (1 + v/c)λ", lengthText((1 + v) / chosen.frequency)]);
          rows.push(["f ahead, f/(1 − v/c)", `${fmt(chosen.frequency / (1 - v), 4)} f₀`]);
          rows.push(["f behind, f/(1 + v/c)", `${fmt(chosen.frequency / (1 + v), 4)} f₀`]);
        } else if (v > 1) rows.push(["Cone half-angle sin⁻¹(c/v)", angleText(Math.asin(1 / v))]);
        else rows.push(["At the wave speed", "the waves pile up in front of it"]);
      }
    }
    if (chosen.kind === "wall" && chosen.slits) {
      rows.push(["Slit width a", lengthText(chosen.slitWidth)]);
      if (chosen.slits > 1) rows.push(["Separation d", lengthText(chosen.separation)]);
      const f = sourceFrequency();
      if (f) {
        const lam = 1 / f;
        if (chosen.slits > 1 && lam < chosen.separation) rows.push(["First bright fringe, sin⁻¹(λ/d)", angleText(Math.asin(lam / chosen.separation))]);
        if (lam < chosen.slitWidth) rows.push(["First dark (one slit), sin⁻¹(λ/a)", angleText(Math.asin(lam / chosen.slitWidth))]);
      }
    }
    if (chosen.kind === "medium") {
      rows.push(["Wave speed c₀/n", `${fmt(1 / chosen.index, 4)} c₀`]);
      rows.push(["Wavelength inside, λ/n", lengthText(1 / chosen.index / (sourceFrequency() || 1))]);
      if (chosen.index > 1) rows.push(["Critical angle into n = 1", angleText(Math.asin(1 / chosen.index))]);
    }
    if (chosen.kind === "screen") {
      const fr = w.fringes(chosen.id);
      if (fr) rows.push(["Marks", `${fr.kind} fringes, ${fr.rule}`]);
    }
  }
  // Every probe: what it measures, beside what the formula says for a
  // moving source (the Doppler shift) where there is one.
  const mover = w.list().find((i) => i.kind === "moving" && i.speed < 1);
  for (const p of w.list().filter((i) => i.kind === "probe")) {
    if (chosen && chosen.id !== p.id && chosen.kind === "probe") continue;
    const r = w.probeReading(p.id);
    rows.push(`Probe at (${fmt(p.x, 3)}, ${fmt(p.y, 3)}) λ`);
    rows.push(["Frequency (measured)", r ? `${fmt(r.frequency, 4)} f₀` : "waiting for waves", `probe-${p.id}-f`]);
    rows.push(["Amplitude (measured)", r ? fmt(r.amplitude, 3) : "—", `probe-${p.id}-a`]);
    if (mover) {
      // Ahead of the source (the probe on the side it is heading for) or
      // behind it, along its line of motion.
      const at = w.sourcePosition(mover),
        a = { x: Math.cos(mover.angle), y: Math.sin(mover.angle) },
        ahead = (p.x - at.x) * a.x + (p.y - at.y) * a.y > 0;
      rows.push([ahead ? "Formula ahead, f/(1 − v/c)" : "Formula behind, f/(1 + v/c)", `${fmt(mover.frequency / (ahead ? 1 - mover.speed : 1 + mover.speed), 4)} f₀`]);
    }
  }
  readingsHtml(rows);
  put($("readings-note"), "A 2D tank: a point source's waves spread over circles, so their amplitude falls as 1/√r (not 1/r as in 3D); no inverse-square readings here. Scalar waves only. The grid makes waves of 20 cells per wavelength travel about 0.3% slow along the grid (0.06% diagonally).");
}
function sourceFrequency() {
  const s = labs.waves.list().find((i) => i.kind === "point" || i.kind === "line");
  return s ? s.frequency : null;
}
const LADDER = [
  [0, "threshold of hearing"],
  [20, "rustling leaves"],
  [30, "whisper"],
  [40, "quiet library"],
  [60, "conversation"],
  [80, "busy street"],
  [90, "lawnmower"],
  [110, "rock concert"],
  [120, "threshold of pain"],
  [140, "jet engine at 30 m"],
];
function soundReadings() {
  const s = labs.sound,
    st = s.state,
    rows = [];
  if (st.mode === "string") {
    const str = s.string();
    rows.push(["Wave speed v = √(T/μ)", si(str.speed, "m/s"), "v"]);
    rows.push(["Fundamental f₁ = v/2L", si(str.frequency(1), "Hz"), "f1"]);
    rows.push(["Wavelength λ₁ = 2L", si(2 * st.string.length, "m")]);
    rows.push("Harmonics f_n = n f₁ (relative amplitude)");
    const modes = str.modes(),
      top = Math.max(...modes.slice(0, 8).map((m) => Math.abs(m.amplitude)));
    for (const m of modes.slice(0, 8))
      rows.push([`n = ${m.n}`, `${si(m.frequency, "Hz")} (${fmt(Math.abs(m.amplitude) / top, 2)})`]);
  } else if (st.mode === "pipe") {
    const v = s.speedOf("pipe"),
      modes = s.pipe(6);
    rows.push([st.pipe.medium === "air" ? "v = 331.3√(1 + T/273.15)" : "Speed of sound", si(v, "m/s"), "v"]);
    rows.push(st.pipe.ends === "open" ? "Open at both ends: f = nv/2L, every n" : "Closed at one end: f = nv/4L, odd n only");
    for (const m of modes) rows.push([`n = ${m.n}${m.n === st.pipe.harmonic ? " (shown)" : ""}`, `${si(m.frequency, "Hz")}, λ = ${si(m.wavelength, "m")}`, m.n === 1 ? "f1" : undefined]);
    if (st.pipe.endCorrection) rows.push(["End correction", `${si(0.6 * st.pipe.radius * (st.pipe.ends === "open" ? 2 : 1), "m")} added to L`]);
  } else if (st.mode === "beats") {
    const { f1, f2 } = st.beats,
      fb = beatFrequency(f1, f2);
    rows.push(["Beat frequency |f₁ − f₂|", si(fb, "Hz"), "beat"]);
    rows.push(["Time between beats", fb > 0 ? si(1 / fb, "s") : "no beats"]);
    rows.push(["Pitch heard (f₁ + f₂)/2", si((f1 + f2) / 2, "Hz")]);
  } else if (st.mode === "level") {
    const { power, distance } = st.level,
      I = pointIntensity(power, distance),
      b = soundLevel(I);
    rows.push(["Intensity I = P/4πr²", si(I, "W/m²"), "I"]);
    rows.push(["Level β = 10 log₁₀(I/I₀)", `${fmt(b, 4)} dB`, "beta"]);
    rows.push(["Twice as far", `${fmt(soundLevel(pointIntensity(power, 2 * distance)) - b, 4)} dB`]);
    rows.push(["Ten times as far", `${fmt(soundLevel(pointIntensity(power, 10 * distance)) - b, 4)} dB`]);
    rows.push("Ladder (typical levels)");
    for (const [level, what] of [...LADDER].reverse()) rows.push([`${level} dB`, what + (Math.abs(level - b) < 5 ? "  ◀ about here" : "")]);
  } else if (st.mode === "doppler") {
    const d = st.doppler,
      v = s.speedOf("doppler"),
      vs = Math.abs(d.sourceSpeed),
      vo = d.observerSpeed;
    rows.push(["Speed of sound v", si(v, "m/s"), "v"]);
    rows.push("f′ = f (v + v_o)/(v − v_s), speeds positive towards each other");
    rows.push(["Approaching", si(doppler({ frequency: d.frequency, speed: v, source: vs, observer: vo }), "Hz"), "approach"]);
    rows.push(["Receding", si(doppler({ frequency: d.frequency, speed: v, source: -vs, observer: -vo }), "Hz"), "recede"]);
    const r = passing(passRun(), soundTime);
    rows.push("Heard now (listener still)");
    rows.push(["Frequency", si(r.frequency, "Hz"), "heard"]);
    rows.push(["Emitted", `${fmt(soundTime - r.emitted, 3)} s ago, ${fmt(r.distance, 3)} m away`]);
    rows.push(["Level (for 1 W of sound)", `${fmt(r.level, 3)} dB`]);
  }
  readingsHtml(rows);
  put($("readings-note"), st.mode === "doppler" ? "Still air; the waves are drawn from the formula (each circle centred where the source was when it left)." : st.mode === "string" || st.mode === "pipe" ? "Ideal: no stiffness and no losses unless a decay time is set." : "");
}

// ---------------------------------------------------------------- sound view

function passRun() {
  const d = labs.sound.state.doppler;
  return {
    frequency: d.frequency,
    speed: labs.sound.speedOf("doppler"),
    sourceSpeed: Math.max(Math.abs(d.sourceSpeed), 1e-6),
    distance: d.layout === "pass" ? d.distance : 0.1,
    power: 1,
  };
}
const span = () => {
  const d = labs.sound.state.doppler;
  return d.layout === "pass" ? Math.max(60, 8 * d.distance) : 60;
};
function restartSound() {
  const st = labs.sound.state;
  soundStart = st.mode === "doppler" ? -span() / 2 / Math.max(Math.abs(st.doppler.sourceSpeed), 1e-6) : 0;
  soundTime = soundStart;
  if (st.mode === "doppler") setWarp(state.warp.sound > 0.5 ? state.warp.sound : 0.25);
  dirty = true;
}
function play() {
  const st = labs.sound.state;
  try {
    if (st.mode === "string") {
      const str = labs.sound.string();
      if (st.string.harmonic) player.harmonics([{ frequency: str.frequency(st.string.harmonic), amplitude: 1 }], st.string.damping);
      else {
        const v = str.voice();
        player.harmonics(v.harmonics, v.decay);
      }
    } else if (st.mode === "pipe") {
      const m = labs.sound.pipe(8).find((q) => q.n === st.pipe.harmonic);
      player.harmonics([{ frequency: m.frequency, amplitude: 1 }]);
    } else if (st.mode === "beats") player.tones([st.beats.f1, st.beats.f2]);
    else if (st.mode === "level") {
      // A 1 kHz tone whose amplitude falls by ten for every 20 dB: relative
      // loudness only (100 dB is full scale), never the real level.
      const b = soundLevel(pointIntensity(st.level.power, st.level.distance));
      player.tones([1000], clamp(10 ** ((b - 100) / 20), 0, 1));
    } else if (st.mode === "doppler") {
      // The whole pass in real time, its pitch and loudness from the model.
      const run = passRun(),
        t0 = soundStart,
        dt = 0.01,
        f = [],
        a = [];
      for (let t = t0; t <= -t0; t += dt) {
        const r = passing(run, t);
        f.push(r.frequency);
        a.push(r.level);
      }
      const top = Math.max(...a),
        amps = a.map((l) => 10 ** ((l - top) / 20));
      const duration = player.sweep(f, amps, dt);
      setTimeout(() => setAudioButton(), duration * 1000 + 300);
      soundTime = soundStart;
      setWarp(1);
      setRunning(true);
    }
  } catch (error) {
    toast(error.message);
  }
  setAudioButton();
}
function setAudioButton() {
  const b = $("audio-play");
  b.setAttribute("aria-pressed", String(player.playing));
  put(b, player.playing ? "Stop" : "Play");
}

// ---------------------------------------------------------------- drawing

const palette = () => wavePalette(isDark());
function soundArea() {
  const area = clearArea();
  return { left: area.left, top: area.top, width: area.right - area.left, height: area.bottom - area.top };
}
function draw() {
  const r = canvas.getBoundingClientRect(),
    dpr = window.devicePixelRatio || 1;
  if (view.width !== r.width || view.height !== r.height) {
    view.width = r.width;
    view.height = r.height;
    if (!fitted && r.width) {
      fit(state.mode === "rays" ? framing : undefined);
      fitted = true;
    }
  }
  if (canvas.width !== Math.round(r.width * dpr) || canvas.height !== Math.round(r.height * dpr)) {
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
  }
  const c = palette();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, r.width, r.height);
  if (state.mode === "rays") {
    const t = trace(),
      out = renderer.drawRays(labs.rays, { colours: c, grid: prefs.grid, trace: t.trace, images: t.images, selected: state.selected, foci: state.show.foci });
    put($("scene-status"), `Grid ${metres(out.step)} · ${t.trace.segments.length} ray segments`);
    put($("time"), "");
  } else if (state.mode === "waves") {
    const w = labs.waves,
      readings = new Map(),
      fringes = new Map();
    for (const sc of w.list().filter((i) => i.kind === "screen")) {
      readings.set(sc.id, w.screenReading(sc.id));
      const f = w.fringes(sc.id);
      if (f) fringes.set(sc.id, f);
    }
    // The running mean is kept only while something shows it.
    w.trackIntensity(state.show.display === "intensity" || readings.size > 0);
    let amp = 0;
    for (const s of w.list()) if (s.kind === "point" || s.kind === "line" || s.kind === "moving") amp = Math.max(amp, s.amplitude);
    renderer.drawWaves(w, { colours: c, grid: prefs.grid, display: state.show.display, gain: state.show.gain * (amp || 1), selected: state.selected, readings, fringes });
    put($("scene-status"), `${w.nx - 2 * w.pad} × ${w.ny - 2 * w.pad} cells · ${fmt(state.achieved, 3)} periods/s`);
    put($("time"), ` · t = ${fmt(w.time, 4)} periods`);
    drawProbe(c);
  } else {
    const s = labs.sound,
      st = s.state,
      area = soundArea(),
      options = { colours: c, area, time: soundTime };
    if (st.mode === "string") options.string = s.string();
    if (st.mode === "pipe") options.frequency = s.pipe(8).find((m) => m.n === st.pipe.harmonic).frequency;
    if (st.mode === "level") {
      options.hit = (name, x, y, rad) => (levelMap = { ...levelMap, handle: { x, y, rad } });
      options.mapLevel = (fn) => (levelMap = { ...levelMap, toDistance: fn });
    }
    if (st.mode === "doppler") {
      const run = passRun(),
        dir = Math.sign(st.doppler.sourceSpeed) || 1,
        sourceAt = (t) => ({ x: dir * run.sourceSpeed * t, y: 0 });
      Object.assign(options, {
        speed: run.speed,
        span: span(),
        source: sourceAt(soundTime),
        sourceAt,
        listener: { x: 0, y: -run.distance },
        start: soundStart,
      });
    }
    drawSound(ctx, s, options);
    put($("scene-status"), st.mode === "level" ? "" : `slowed ${fmt(1 / state.warp.sound, 3)} times`);
    put($("time"), st.mode === "level" ? "" : ` · t = ${si(soundTime, "s", 4)}`);
  }
  put($("zoom-level"), state.mode === "sound" ? "" : `${si(view.scale, "px/" + (state.mode === "waves" ? "λ" : "m"), 3)}`);
  canvas.dataset.view = [view.x, view.y, view.scale].map((v) => +v.toFixed(3)).join(",");
}
function drawProbe(c) {
  const el = $("probe-graph"),
    w = labs.waves,
    probe = w.get(state.selected)?.kind === "probe" ? w.get(state.selected) : w.list().find((i) => i.kind === "probe");
  put($("graph-subject"), probe ? `at (${fmt(probe.x, 3)}, ${fmt(probe.y, 3)}) λ` : "none placed");
  if ($("graph-panel").hidden || !$("graph-panel").open) return;
  const g = el.getContext("2d"),
    rect = el.getBoundingClientRect(),
    dpr = window.devicePixelRatio || 1;
  if (!g?.setTransform || !rect.width) return;
  el.width = Math.round(rect.width * dpr);
  el.height = Math.round(rect.height * dpr);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, rect.width, rect.height);
  g.strokeStyle = c.line;
  g.beginPath();
  g.moveTo(0, rect.height / 2);
  g.lineTo(rect.width, rect.height / 2);
  g.stroke();
  if (!probe) {
    put($("graph-note"), "Place a probe to see the displacement there against time.");
    return;
  }
  const { t, u } = w.history(probe.id),
    windowT = 6, // periods across
    now = w.time;
  let peak = 1e-9;
  for (let i = 0; i < t.length; i++) if (t[i] > now - windowT) peak = Math.max(peak, Math.abs(u[i]));
  g.strokeStyle = c.probe;
  g.lineWidth = 1.5;
  g.beginPath();
  let first = true;
  for (let i = 0; i < t.length; i++) {
    if (t[i] < now - windowT) continue;
    const x = ((t[i] - (now - windowT)) / windowT) * rect.width,
      y = rect.height / 2 - (u[i] / peak) * (rect.height / 2 - 4);
    if (first) g.moveTo(x, y);
    else g.lineTo(x, y);
    first = false;
  }
  g.stroke();
  put($("graph-note"), `Last ${windowT} periods; the scale is ±${fmt(peak, 3)}.`);
}

function updatePanels() {
  if (state.mode === "rays") raysReadings();
  else if (state.mode === "waves") wavesReadings();
  else soundReadings();
  const note = $("view-note");
  if (state.mode === "waves") {
    const moving = labs.waves.list().find((i) => i.kind === "moving" && i.speed >= 1);
    note.hidden = !moving;
    put(note, moving ? "Near the cone the waves arriving are squeezed without limit, far below the grid's resolution, so the cone's edge is softened (40 cells per wavelength gives it to within 1°)." : "");
  } else note.hidden = true;
}

// ---------------------------------------------------------------- loop

function frame(now) {
  const elapsed = last ? Math.min((now - last) / 1000, 0.05) : 0;
  last = now;
  const began = performance.now();
  let simulated = 0;
  if (state.running && elapsed > 0 && !(drag && drag.moved)) {
    const t0 = performance.now(),
      wanted = elapsed * (state.mode === "waves" ? state.warp.waves : state.warp.sound);
    simulated = advance(elapsed);
    const took = performance.now() - t0;
    if (state.mode === "waves") {
      // The model stops short rather than take longer steps; how many it may
      // take in a frame is set to what this computer does in about 9 ms,
      // which leaves time to draw within a 60 Hz frame on most machines.
      if (took > 10 || simulated < 0.5 * wanted) budget = clamp(budget * clamp(9 / Math.max(took, 0.5), 0.7, 1.3), 1, 20000);
      state.achieved += (simulated / elapsed - state.achieved) * 0.1;
    }
  }
  draw();
  if (dirty || state.running || state.mode !== "rays") {
    updatePanels();
    dirty = false;
  }
  reportFrame({ steps: state.mode === "waves" ? Math.round(simulated / labs.waves.dt) : 0, simulated, ms: performance.now() - began });
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- input

function eventPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { sx: e.clientX - r.left, sy: e.clientY - r.top };
}
const distToSeg = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax,
    dy = by - ay,
    l2 = dx * dx + dy * dy,
    t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};
// The item under a point on the screen, sources first, a medium region only
// near its outline or its label.
function hitTest(sx, sy) {
  const tol = 9,
    near = (pts, closed) => {
      const s = pts.map((p) => screen(p.x, p.y));
      for (let i = 0; i < s.length - (closed ? 0 : 1); i++) {
        const a = s[i],
          b = s[(i + 1) % s.length];
        if (distToSeg(sx, sy, a[0], a[1], b[0], b[1]) < tol) return true;
      }
      return false;
    },
    insidePoly = (pts) => {
      let inside = false;
      const s = pts.map((p) => screen(p.x, p.y));
      for (let i = 0, j = s.length - 1; i < s.length; j = i++)
        if (s[i][1] > sy !== s[j][1] > sy && sx < ((s[j][0] - s[i][0]) * (sy - s[i][1])) / (s[j][1] - s[i][1]) + s[i][0]) inside = !inside;
      return inside;
    };
  const items = [...lab().list()].reverse();
  if (state.mode === "rays") {
    for (const it of items.filter((i) => isRaySource(i.kind))) {
      const a = { x: Math.cos(it.angle), y: Math.sin(it.angle) },
        p = { x: -a.y, y: a.x };
      if (it.kind === "object" && near([it, { x: it.x + p.x * it.height, y: it.y + p.y * it.height }], false)) return it;
      if (it.kind === "beam" && near([{ x: it.x - (p.x * it.width) / 2, y: it.y - (p.y * it.width) / 2 }, { x: it.x + (p.x * it.width) / 2, y: it.y + (p.y * it.width) / 2 }], false)) return it;
      const [x, y] = screen(it.x, it.y);
      if (Math.hypot(sx - x, sy - y) < tol + 2) return it;
    }
    for (const it of items.filter((i) => !isRaySource(i.kind))) {
      const o = outlineOf(it);
      if (o.parts ? o.parts.some((part) => near(part, false)) : near(o.points, o.closed) || (o.closed && insidePoly(o.points))) return it;
    }
    return null;
  }
  const w = labs.waves;
  for (const it of items) {
    if (it.kind === "point" || it.kind === "moving" || it.kind === "probe") {
      const at = it.kind === "moving" ? w.sourcePosition(it) : it,
        [x, y] = screen(at.x, at.y);
      if (Math.hypot(sx - x, sy - y) < tol + 3) return it;
    }
  }
  for (const it of items) {
    if (it.kind === "line" || it.kind === "screen" || it.kind === "wall") {
      const a = { x: Math.cos(it.angle), y: Math.sin(it.angle) },
        dir = it.kind === "wall" ? a : { x: -a.y, y: a.x },
        h = it.length / 2;
      if (near([{ x: it.x - dir.x * h, y: it.y - dir.y * h }, { x: it.x + dir.x * h, y: it.y + dir.y * h }], false)) return it;
    }
  }
  for (const it of items) {
    if (it.kind !== "medium") continue;
    const [x, y] = screen(it.x, it.y);
    if (Math.hypot(sx - x, sy - y) < 16) return it;
  }
  return null;
}
function select(id) {
  state.selected = id;
  buildForm();
  dirty = true;
}
function place(kind, at) {
  const [model, extra] = ADD_PROPS[kind] ?? [kind, {}];
  let id = null;
  if (!attempt(() => (id = lab().add(model, { ...extra, x: at.x, y: at.y })))) return;
  setTool("grab");
  select(id);
  changed();
}
function removeSelected() {
  if (state.selected === null || state.mode === "sound") return;
  lab().remove(state.selected);
  select(null);
  changed();
}
function turnSelected(by) {
  const item = lab().get?.(state.selected);
  if (!item || item.angle === undefined) return;
  if (attempt(() => lab().update(item.id, { angle: item.angle + by }))) {
    changed();
    buildForm();
  }
}
function nudge(dx, dy) {
  const item = lab().get?.(state.selected);
  if (!item) return;
  const step = state.mode === "waves" ? labs.waves.cell * 2 : gridStepNow();
  if (attempt(() => lab().update(item.id, { x: item.x + dx * step, y: item.y + dy * step }))) {
    changed();
    buildForm();
  }
}
const gridStepNow = () => {
  const raw = 14 / view.scale,
    e = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * e).find((v) => v >= raw);
};

canvas.addEventListener("pointerdown", (e) => {
  canvas.focus();
  const { sx, sy } = eventPoint(e);
  try {
    canvas.setPointerCapture?.(e.pointerId);
  } catch {}
  if (state.mode === "sound") {
    const h = levelMap?.handle;
    if (labs.sound.state.mode === "level" && h && Math.hypot(sx - h.x, sy - h.y) < h.rad) drag = { type: "listener" };
    return;
  }
  const at = world(sx, sy);
  if (state.tool !== "grab") {
    place(state.tool, at);
    return;
  }
  const item = hitTest(sx, sy);
  if (item) {
    select(item.id);
    drag = { type: "move", id: item.id, from: at, start: { x: item.x, y: item.y }, moved: false };
  } else {
    if (state.selected !== null) select(null);
    drag = { type: "pan", sx, sy, x: view.x, y: view.y };
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const { sx, sy } = eventPoint(e);
  if (drag.type === "pan") {
    view.x = drag.x + sx - drag.sx;
    view.y = drag.y + sy - drag.sy;
    return;
  }
  if (drag.type === "listener") {
    const r = levelMap?.toDistance?.(sx);
    if (r && attempt(() => labs.sound.set("level", { distance: clamp(r, 0.01, 1e4) }))) {
      buildExperiment();
      dirty = true;
      if (player.playing) play();
    }
    return;
  }
  const at = world(sx, sy),
    x = drag.start.x + at.x - drag.from.x,
    y = drag.start.y + at.y - drag.from.y;
  drag.moved = true;
  try {
    lab().update(drag.id, { x, y });
    changed();
  } catch {
    // Refused (out of range): it stays where it last was.
  }
});
const endDrag = () => {
  if (drag?.type === "move" && drag.moved) buildForm();
  drag = null;
};
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener(
  "wheel",
  (e) => {
    if (state.mode === "sound") return;
    e.preventDefault();
    const { sx, sy } = eventPoint(e);
    zoomAt(sx, sy, Math.exp(-e.deltaY * 0.0015));
  },
  { passive: false },
);

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
function fitHeader() {
  const header = document.querySelector("header");
  document.body.classList.remove("compact-header");
  if (header.scrollWidth > header.clientWidth) document.body.classList.add("compact-header");
}
const typing = (e) => {
  const t = e.target;
  return t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA");
};
window.addEventListener("keydown", (e) => {
  if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (key === "Escape") {
    if (!closePanels()) setTool("grab");
    return;
  }
  if (key === " ") {
    e.preventDefault();
    setRunning(!state.running);
  } else if (key === ".") stepOnce();
  else if (key === "0") reset();
  else if (key === "[") shiftWarp(-1);
  else if (key === "]") shiftWarp(1);
  else if (key === "1") setMode("rays");
  else if (key === "2") setMode("waves");
  else if (key === "3") setMode("sound");
  else if (key === "r") turnSelected((e.shiftKey ? -15 : 15) * deg);
  else if (key === "Delete" || key === "Backspace") removeSelected();
  else if (key === "ArrowLeft") nudge(-1, 0);
  else if (key === "ArrowRight") nudge(1, 0);
  else if (key === "ArrowUp") nudge(0, 1);
  else if (key === "ArrowDown") nudge(0, -1);
  else if (key === "f") fit();
  else if (key === "?") togglePanel("keys-panel");
  else if (key === "+" || key === "=") zoomAt(view.width / 2, view.height / 2, 1.25);
  else if (key === "-") zoomAt(view.width / 2, view.height / 2, 0.8);
  else return;
  if (key.startsWith("Arrow")) e.preventDefault();
});

for (const b of document.querySelectorAll("[data-mode]")) b.addEventListener("click", () => setMode(b.dataset.mode));
$("pause").addEventListener("click", () => setRunning(!state.running));
$("step").addEventListener("click", stepOnce);
$("reset").addEventListener("click", reset);
$("warp").addEventListener("change", (e) => setWarp(Number(e.target.value)));
$("zoom-in").addEventListener("click", () => zoomAt(view.width / 2, view.height / 2, 1.25));
$("zoom-out").addEventListener("click", () => zoomAt(view.width / 2, view.height / 2, 0.8));
$("fit-scene").addEventListener("click", () => fit());
$("delete").addEventListener("click", removeSelected);
$("item-form").addEventListener("submit", (e) => e.preventDefault());
$("settings-toggle").addEventListener("click", () => togglePanel("settings-panel"));
$("close-settings").addEventListener("click", () => closePanels());
$("shortcuts").addEventListener("click", () => togglePanel("keys-panel"));
$("close-keys").addEventListener("click", () => closePanels());
$("presets-toggle").addEventListener("click", () => togglePanel("presets-panel"));
$("close-presets").addEventListener("click", () => closePanels());
$("clear").addEventListener("click", () => {
  if (togglePanel("clear-confirm")) $("clear-no").focus();
});
$("clear-no").addEventListener("click", () => closePanels());
$("clear-yes").addEventListener("click", () => {
  lab().clear();
  closePanels();
  select(null);
  changed();
});
$("audio-play").addEventListener("click", () => {
  if (player.playing) {
    player.stop();
    setAudioButton();
  } else play();
});
$("volume").addEventListener("input", (e) => {
  const v = Number(e.target.value) / 100;
  player.setVolume(v);
  put($("volume-value"), `${Math.round(v * 100)}%`);
});

// ---------------------------------------------------------------- files

setupSceneFiles({
  filename: () => `physium-${state.mode}.json`,
  toast,
  save: () => ({
    ...lab().exportScene(),
    view: state.mode === "waves" ? { display: state.show.display, gain: state.show.gain, labels: state.show.labels } : undefined,
  }),
  load(data) {
    const target = { [RAYS_FORMAT]: "rays", [WAVES_FORMAT]: "waves", [SOUND_FORMAT]: "sound" }[data?.format];
    // Checked first by the model of the view the file names (or the open
    // one, which then says whose file it is), so a bad file changes nothing.
    const Model = { rays: RayLab, waves: WaveLab, sound: SoundLab }[target ?? state.mode];
    Model.fromScene(data);
    setMode(target, true);
    lab().loadScene(data);
    if (target === "waves" && data.view) {
      if (["wave", "intensity"].includes(data.view.display)) state.show.display = data.view.display;
      if (data.view.gain > 0) state.show.gain = data.view.gain;
      if (EQUIVALENT[data.view.labels]) state.show.labels = data.view.labels;
      buildDisplay();
      buildTank();
    }
    if (target === "sound") {
      buildPalette();
      buildExperiment();
      restartSound();
    } else fit();
    select(null);
    changed();
    toast("Scene loaded");
  },
});

// ---------------------------------------------------------------- presets

function loadPreset(p) {
  setMode(p.mode, true);
  if (p.mode === "rays") {
    labs.rays.clear();
    p.build(labs.rays);
    framing = p.view;
    fit(p.view);
  } else if (p.mode === "waves") {
    const w = new WaveLab({ speed: 1, edges: "absorb", damping: 0, ...p.tank });
    p.build(w);
    labs.waves = w;
    state.show.display = p.display ?? "wave";
    buildDisplay();
    buildTank();
    fit();
    setRunning(true);
  } else {
    const s = new SoundLab();
    s.setMode(p.set.mode);
    for (const [part, values] of Object.entries(p.set)) if (part !== "mode") s.set(part, values);
    labs.sound = s;
    buildPalette();
    buildExperiment();
    restartSound();
    if (p.warp) setWarp(p.warp);
    setRunning(p.set.mode !== "level");
  }
  select(null);
  changed();
}
{
  const list = $("preset-list");
  for (const [mode, title] of [
    ["rays", "Rays"],
    ["waves", "Waves"],
    ["sound", "Sound"],
  ]) {
    const heading = document.createElement("h3");
    heading.textContent = title;
    list.append(heading);
    for (const p of presets.filter((q) => q.mode === mode)) {
      const button = document.createElement("button"),
        name = document.createElement("strong"),
        text = document.createElement("span"),
        expect = document.createElement("span"),
        words = document.createElement("span");
      button.className = "preset";
      button.dataset.preset = p.id;
      name.textContent = p.title;
      text.textContent = p.text;
      expect.className = "preset-expect";
      expect.textContent = "What to check: " + p.expect;
      words.className = "preset-text";
      words.append(name, text, expect);
      button.append(words);
      button.addEventListener("click", () => {
        closePanels();
        loadPreset(p);
      });
      list.append(button);
    }
  }
}

prefs.onchange = () => {
  buildForm();
  dirty = true;
};
window.addEventListener("resize", fitHeader);
$("ui-size")?.addEventListener("input", fitHeader);
onSchemeChange(() => (dirty = true));
if (window.innerWidth < 900) for (const id of ["display-panel", "readings-panel"]) $(id).open = false;

// Start on the rays view with a scene, not an empty page.
setMode("rays", true);
loadPreset(presets.find((p) => p.id === "converging"));
fitHeader();
requestAnimationFrame(frame);
