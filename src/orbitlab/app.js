// Orbits & gravitation page: canvas drawing, pointer and keyboard input,
// panels, the frame loop. All physics lives in model.js.
import { setupPreferences } from "../preferences.js";
import { setupNav } from "../nav.js";
import { setPlaybackIcon } from "../icons.js";
import {
  OrbitLab,
  BODIES,
  LIMITS,
  orbitPath,
  predictImpact,
  circularSpeed,
  escapeSpeed,
} from "./model.js";
import { presets } from "./presets.js";

const $ = (id) => document.getElementById(id),
  canvas = $("canvas"),
  ctx = canvas.getContext("2d");
setupNav();
const prefs = setupPreferences($);
const lab = new OrbitLab();

const TAU = 2 * Math.PI,
  km = 1e3,
  FRAME = 1 / 60, // seconds of real time that one Step stands for
  // Simulated seconds per real second.
  WARPS = [
    1, 2, 5, 10, 20, 50, 100, 200, 500, 1e3, 2e3, 5e3, 1e4, 2e4, 5e4, 1e5, 2e5,
    5e5, 1e6, 2e6, 5e6, 1e7,
  ],
  // The launch arrow is this long, in pixels, at the circular orbit speed
  // for the launch radius; velocity arrows on satellites use the same scale.
  ARROW = 64,
  HANDLE = 11,
  SATELLITE = 5;
// The next launch, in SI: distance from the centre, speed, and angle of the
// velocity above the local horizontal.
const aim = {
  radius: lab.body.radius + 400 * km,
  speed: circularSpeed(lab.mu, lab.body.radius + 400 * km),
  angle: 0,
};
// Pixels per metre and the screen position of the body's centre.
const view = { scale: 1e-5, x: 0, y: 0, width: 0, height: 0 };
const state = {
  running: false,
  warp: 500,
  // Simulated seconds per real second actually achieved over recent frames.
  achieved: 0,
  selected: null,
  autoFit: true,
  si: false,
  thirdLine: false,
  show: {
    velocity: true,
    force: false,
    prediction: true,
    trails: true,
    areas: false,
    labels: true,
  },
};
let last = 0,
  drag = null,
  toastTimer,
  ghost = null, // preview of the next launch, rebuilt when it changes
  fitted = false,
  previewTheme = null;
const paths = new Map(); // predicted path of each satellite, by id
const rows = []; // form rows, each with a sync()

// ---------------------------------------------------------------- helpers

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3600);
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
function capture(e) {
  try {
    canvas.setPointerCapture?.(e.pointerId);
  } catch {}
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const tidy = (v, places = 4) => String(Number(v.toFixed(places)));
const isDark = () => document.documentElement.dataset.theme === "dark";
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function put(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const power = (n) =>
  "10" +
  (n < 0 ? "⁻" : "") +
  [...String(Math.abs(n))].map((d) => SUPERSCRIPT[d]).join("");
// A number to `sig` significant figures: digits in groups of three for
// ordinary sizes, and m × 10ⁿ for very large or very small ones.
function num(value, sig = 4) {
  if (Number.isNaN(value)) return "–";
  if (!Number.isFinite(value)) return value > 0 ? "∞" : "−∞";
  const size = Math.abs(value);
  if (size === 0) return "0";
  let out;
  if (size >= 1e9 || size < 1e-3) {
    const [mantissa, exponent] = value.toExponential(sig - 1).split("e");
    out = mantissa + " × " + power(Number(exponent));
  } else {
    const fixed = value.toPrecision(sig),
      plain = fixed.includes("e") ? String(Number(fixed)) : fixed,
      [whole, fraction] = plain.split(".");
    out =
      whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ") +
      (fraction ? "." + fraction : "");
  }
  return out.replace("-", "−");
}
// A duration in the unit that suits its size.
function timeUnit(seconds) {
  const t = Math.abs(seconds);
  if (t < 120) return [1, "s"];
  if (t < 7200) return [60, "min"];
  if (t < 172800) return [3600, "h"];
  if (t < 3 * 365.25 * 86400) return [86400, "days"];
  return [365.25 * 86400, "years"];
}
function duration(seconds, sig = 4) {
  if (!Number.isFinite(seconds)) return ["∞", ""];
  if (state.si) return [num(seconds, sig), "s"];
  const [size, unit] = timeUnit(seconds);
  return [num(seconds / size, sig), unit];
}
const PREFIXES = ["", "k", "M", "G", "T", "P", "E"];
// A quantity with an SI prefix: 2.94e10 J → ["29.40", "GJ"].
function prefixed(value, unit, sig = 4) {
  if (state.si || value === 0 || !Number.isFinite(value))
    return [num(value, sig), unit];
  const step = Math.floor(Math.log10(Math.abs(value)) / 3);
  if (step < 0 || step >= PREFIXES.length) return [num(value, sig), unit];
  return [num(value / 1000 ** step, sig), PREFIXES[step] + unit];
}
const distance = (metres, sig = 5) =>
  state.si ? [num(metres, sig), "m"] : [num(metres / km, sig), "km"];
const speedText = (v, sig = 4) =>
  state.si ? [num(v, sig), "m/s"] : [num(v / km, sig), "km/s"];
const joined = (pair) => (pair[1] ? pair[0] + " " + pair[1] : pair[0]);
function angleText(radians) {
  if (prefs.angleUnit === "radians") return num(radians, 3) + " rad";
  return num((radians * 180) / Math.PI, 3) + "°";
}

const selected = () => lab.get(state.selected);

// ---------------------------------------------------------------- launch

// The next launch as the model sees it. Throws a readable error if `patch`
// would make it invalid, and changes nothing then.
function setAim(patch) {
  const next = { ...aim, ...patch };
  lab.preview(next);
  Object.assign(aim, next);
  ghost = null;
}
function preview() {
  if (!ghost) {
    const p = lab.preview(aim);
    ghost = {
      ...p,
      hit: predictImpact(p.elements),
      path: orbitPath(p.elements, {
        maxRadius: lab.rangeFactor * aim.radius,
      }),
    };
  }
  return ghost;
}

// What an orbit will do (or did), as a heading and a sentence.
function describe(el, s) {
  const R = lab.body.radius,
    hit = predictImpact(el);
  if (s?.status === "impact")
    return [
      "Impact",
      `It reached the surface ${joined(duration(s.impact.time, 3))} after launch, ${joined(distance(s.impact.range, 4))} round from the launch point, at ${joined(speedText(s.impact.speed))}.`,
    ];
  if (s?.status === "escaped")
    return [
      "Escaped",
      `Its total energy is ${el.energy > 0 ? "positive" : "zero"}, so it never comes back. It is no longer followed beyond ${lab.rangeFactor} launch radii.`,
    ];
  if (el.impact) {
    if (el.radial)
      return [
        "Impact",
        el.outward && el.apoapsis > el.radius * (1 + 1e-9)
          ? `Straight up to ${joined(distance(el.apoapsis - R, 4))} above the surface, then straight back down.`
          : "Straight down to the surface.",
      ];
    return [
      "Impact",
      `Too slow to stay up: its path meets the surface ${joined(distance(hit.swept * R, 4))} round from the launch point${hit.time ? ", " + joined(duration(hit.time, 3)) + " after launch" : ""}.`,
    ];
  }
  if (el.shape === "circular")
    return [
      "Circular orbit",
      `Distance and speed stay constant. Period ${joined(duration(el.period))}.`,
    ];
  if (el.shape === "elliptical") {
    const lowHere = el.radius < el.semiMajorAxis;
    return [
      "Elliptical orbit",
      `${lowHere ? "Faster than the circular speed here, so this is its lowest point" : "Slower than the circular speed here, so this is its highest point"}: between ${joined(distance(el.periapsis, 4))} and ${joined(distance(el.apoapsis, 4))} from the centre. Period ${joined(duration(el.period))}.`,
    ];
  }
  if (el.shape === "parabolic")
    return [
      "Parabolic escape",
      "Exactly the escape speed: total energy is zero. It never returns, and slows towards rest far away.",
    ];
  if (el.radial)
    return [
      "Escape",
      "Straight up, faster than the escape speed: it never returns.",
    ];
  return [
    "Hyperbolic escape",
    `Faster than the escape speed: total energy is positive. It never returns, and far away still has ${joined(speedText(el.excessSpeed))}.`,
  ];
}
function typeText(el, s) {
  const conic = {
    circular: "circle",
    elliptical: "ellipse",
    parabolic: "parabola",
    hyperbolic: "hyperbola",
    radial: "straight line",
  }[el.shape];
  if (s?.status === "impact" || el.impact) return `Impact (path: ${conic})`;
  return {
    circular: "Circular",
    elliptical: "Elliptical",
    parabolic: "Parabolic (escape)",
    hyperbolic: "Hyperbolic (escape)",
    radial: "Straight up (escape)",
  }[el.shape];
}

function launch() {
  let id;
  if (!attempt(() => (id = lab.launch(aim)))) return false;
  const s = lab.get(id);
  paths.set(id, orbitPath(s.elements, { maxRadius: s.range }));
  state.selected = id;
  setRunning(true);
  buildList();
  return true;
}
function removeSatellite(id) {
  lab.remove(id);
  paths.delete(id);
  if (state.selected === id) state.selected = lab.list().at(-1)?.id ?? null;
  if (!lab.list().length) setRunning(false);
  buildList();
}
function reset() {
  lab.clear();
  paths.clear();
  state.selected = null;
  state.achieved = 0;
  setRunning(false);
  buildList();
  fitted = false;
}
function setRunning(on) {
  state.running = on;
  state.achieved = state.warp;
  last = 0;
  setPlaybackIcon(on, prefs.iconSet);
  $("pause").title = on ? "Pause (Space)" : "Run (Space)";
}
function toggleRunning() {
  if (state.running) return setRunning(false);
  // Run with nothing in flight (none launched yet, or all of them landed
  // or gone) launches the satellite that is set up.
  if (!lab.list().some((s) => s.status === "flying")) return void launch();
  setRunning(true);
}
// One frame's worth of simulated time at the current warp, while paused.
function stepOnce() {
  if (state.running) setRunning(false);
  if (!lab.list().length) {
    if (!launch()) return;
    setRunning(false);
  }
  lab.advance(state.warp * FRAME);
}
function setWarp(warp) {
  state.warp = state.achieved = warp;
  $("warp").value = String(warp);
  $("step").title =
    `Advance ${joined(duration(warp * FRAME, 3))} of simulated time: one frame at this time warp (.)`;
}
function shiftWarp(by) {
  const at = WARPS.indexOf(state.warp);
  setWarp(WARPS[clamp(at + by, 0, WARPS.length - 1)]);
}

// Satellites in flight: a chip each, to select or remove.
function buildList() {
  const list = $("launch-list"),
    colours = palette().satellites;
  list.replaceChildren();
  for (const s of lab.list()) {
    const chip = document.createElement("span"),
      pick = document.createElement("button"),
      dot = document.createElement("span"),
      remove = document.createElement("button");
    chip.className = "ol-chip";
    dot.className = "dot";
    dot.style.background = colours[s.colour];
    pick.append(dot, `Satellite ${s.id}`);
    pick.dataset.satellite = s.id;
    pick.title = "Show this satellite in the readouts and graphs";
    pick.setAttribute("aria-pressed", String(s.id === state.selected));
    pick.addEventListener("click", () => {
      state.selected = s.id;
      buildList();
    });
    remove.className = "remove";
    remove.textContent = "×";
    remove.title = `Remove satellite ${s.id}`;
    remove.setAttribute("aria-label", `Remove satellite ${s.id}`);
    remove.addEventListener("click", () => removeSatellite(s.id));
    chip.append(pick, remove);
    list.append(chip);
  }
  $("reset").disabled = !lab.list().length;
}

// ---------------------------------------------------------------- forms

// One row of a form: a label, a slider (optional) and a number box with its
// unit. `spec.read()` gives the value shown and `spec.write(v)` applies a
// typed one; the slider has its own pair so that it can be non-linear.
function addRow(form, spec) {
  const row = document.createElement("div"),
    name = document.createElement("label"),
    value = document.createElement("span"),
    number = document.createElement("input"),
    unit = document.createElement("span"),
    id = form.id + "-" + spec.key;
  row.className = "prop-row";
  name.textContent = spec.label;
  name.htmlFor = id;
  if (spec.title) name.title = spec.title;
  number.type = "number";
  number.id = id;
  number.step = "any";
  unit.className = "unit";
  value.className = "prop-value";
  value.append(number, unit);
  let range = document.createElement("span");
  if (spec.slider) {
    range = document.createElement("input");
    range.type = "range";
    range.id = id + "-slider";
    range.setAttribute("aria-label", spec.label + " slider");
  }
  const entry = {
    sync(skip) {
      const live = typeof spec.unit === "function" ? spec.unit() : spec.unit;
      unit.textContent = live;
      if (spec.slider) {
        const s = spec.slider();
        range.min = s.min;
        range.max = s.max;
        range.step = s.step;
        range.value = s.value;
      }
      if (number !== skip) number.value = spec.read();
    },
  };
  // `typed` is the number box while it is being typed in: it is left as the
  // student wrote it until they finish.
  const apply = (run, typed) => {
    const ok = attempt(run);
    if (ok || !typed) syncForms(ok ? typed : null);
  };
  number.addEventListener("input", () => {
    if (number.value !== "")
      apply(() => spec.write(Number(number.value)), number);
  });
  number.addEventListener("change", () =>
    apply(() => {
      if (number.value === "") throw new Error(`${spec.label} needs a number.`);
      spec.write(Number(number.value));
    }, null),
  );
  if (spec.slider)
    range.addEventListener("input", () =>
      apply(() => spec.slide(Number(range.value)), null),
    );
  row.append(name, range, value);
  form.append(row);
  rows.push(entry);
}
function syncForms(skip) {
  for (const row of rows) row.sync(skip);
  updateLaunchPanel();
}

// Change the central body, keeping the launch altitude. `keepRatio` also
// keeps the launch speed the same multiple of the circular speed, so that
// a circular orbit stays circular when a different body is chosen.
function changeBody(patch, keepRatio, quiet) {
  const altitude = aim.radius - lab.body.radius,
    ratio = aim.speed / circularSpeed(lab.mu, aim.radius),
    had = lab.list().length;
  lab.setBody(patch);
  const radius = Math.min(lab.body.radius + altitude, LIMITS.orbitRadius);
  Object.assign(aim, {
    radius,
    speed: Math.min(
      keepRatio ? ratio * circularSpeed(lab.mu, radius) : aim.speed,
      LIMITS.speed,
    ),
  });
  ghost = null;
  paths.clear();
  state.selected = null;
  setRunning(false);
  buildList();
  fitted = false;
  if (had && !quiet)
    toast(
      "The satellites in flight were removed: their orbits belonged to the old central body.",
    );
}

function buildForms() {
  rows.length = 0;
  $("body-form").replaceChildren();
  $("launch-form").replaceChildren();
  const log = (lo, hi, read, write) => ({
    slider: () => ({
      min: Math.log10(lo),
      max: Math.log10(hi),
      step: 0.01,
      value: Math.log10(read()),
    }),
    slide: (v) => write(Number((10 ** v).toPrecision(3))),
  });
  addRow($("body-form"), {
    key: "mass",
    label: "Mass",
    title: "Mass of the central body. Type it as, for example, 5.972e24.",
    unit: "kg",
    read: () => String(Number(lab.body.mass.toPrecision(6))),
    write: (v) => changeBody({ mass: v }),
    ...log(
      1e20,
      1e31,
      () => lab.body.mass,
      (v) => changeBody({ mass: v }),
    ),
  });
  addRow($("body-form"), {
    key: "radius",
    label: "Radius",
    title: "Radius of the central body: where its surface is.",
    unit: "km",
    read: () => tidy(lab.body.radius / km, 3),
    write: (v) => changeBody({ radius: v * km }),
    ...log(
      100 * km,
      1e6 * km,
      () => lab.body.radius,
      (v) => changeBody({ radius: v }),
    ),
  });
  // Altitude slider: logarithmic in distance from the centre, from the
  // surface out to 1000 radii, so low orbits and the Moon's both fit.
  addRow($("launch-form"), {
    key: "altitude",
    label: "Altitude",
    title: "Height of the launch point above the surface.",
    unit: "km",
    read: () => tidy((aim.radius - lab.body.radius) / km, 3),
    write: (v) => setAim({ radius: lab.body.radius + v * km }),
    slider: () => ({
      min: 0,
      max: 3,
      step: 0.0005,
      value: Math.log10(aim.radius / lab.body.radius),
    }),
    slide: (v) =>
      setAim({
        radius:
          lab.body.radius +
          (v <= 0
            ? 0
            : Number((lab.body.radius * (10 ** v - 1)).toPrecision(3))),
      }),
  });
  addRow($("launch-form"), {
    key: "radius",
    label: "Orbital radius",
    title: "Distance of the launch point from the centre of the body.",
    unit: "km",
    read: () => tidy(aim.radius / km, 3),
    write: (v) => setAim({ radius: v * km }),
  });
  addRow($("launch-form"), {
    key: "speed",
    label: "Launch speed",
    title: "Speed of the satellite at launch.",
    unit: "km/s",
    read: () => tidy(aim.speed / km, 4),
    write: (v) => setAim({ speed: v * km }),
    // Up to twice the escape speed here, which is 2.83 × circular.
    slider: () => {
      const top = Math.max(2 * escapeSpeed(lab.mu, aim.radius), aim.speed);
      return {
        min: 0,
        max: top / km,
        step: top / km / 2000,
        value: aim.speed / km,
      };
    },
    slide: (v) => setAim({ speed: v * km }),
  });
  const radians = prefs.angleUnit === "radians",
    perUnit = radians ? 1 : Math.PI / 180;
  addRow($("launch-form"), {
    key: "angle",
    label: "Launch angle",
    title:
      "Direction of the launch above the local horizontal: 0 is horizontal, 90° straight up, negative below the horizontal.",
    unit: radians ? "rad" : "°",
    read: () => tidy(aim.angle / perUnit, 2),
    write: (v) => {
      if (!Number.isFinite(v) || Math.abs(v * perUnit) > Math.PI + 1e-9)
        throw new Error(
          `Launch angle must be between ${radians ? "−3.14 rad and 3.14 rad" : "−180° and 180°"}.`,
        );
      setAim({ angle: wrapAngle(v * perUnit) });
    },
    slider: () => ({
      min: radians ? -3.14 : -180,
      max: radians ? 3.14 : 180,
      step: radians ? 0.01 : 1,
      value: aim.angle / perUnit,
    }),
    slide: (v) => setAim({ angle: wrapAngle(v * perUnit) }),
  });
  syncForms();
}

// Everything in the launch panel that follows from the launch values.
function updateLaunchPanel() {
  const p = preview(),
    key = lab.body.key in BODIES ? lab.body.key : "custom";
  $("body-preset").querySelector('[value="custom"]').hidden = key !== "custom";
  $("body-preset").value = key;
  put($("circular-speed"), joined(speedText(p.circularSpeed)));
  put($("escape-speed"), joined(speedText(p.escapeSpeed)));
  $("circular-speed").title =
    `v = √(GM/r) = ${p.circularSpeed.toPrecision(7)} m/s`;
  $("escape-speed").title =
    `v = √(2GM/r) = ${p.escapeSpeed.toPrecision(7)} m/s`;
  put(
    $("speed-compare"),
    `Your launch speed is ${num(aim.speed / p.circularSpeed, 3)} × the circular speed and ${num(aim.speed / p.escapeSpeed, 3)} × the escape speed.`,
  );
  const g = lab.mu / lab.body.radius ** 2,
    share = lab.satelliteMass / lab.body.mass;
  put(
    $("body-note"),
    `${lab.body.name} is held fixed at the centre, which is accurate while the satellite's mass is negligible beside it. Surface gravity ${num(g, 3)} m/s².` +
      (share > 1e-6
        ? ` At ${num(lab.satelliteMass, 3)} kg the satellite is not negligible: a real body would be pulled about noticeably.`
        : ""),
  );
  put(
    $("mass-note"),
    "The energies, angular momentum and force are for a satellite of this mass. The path does not depend on it.",
  );
  $("satellite-mass").value = String(lab.satelliteMass);
}

// ---------------------------------------------------------------- view

// The part of the canvas not covered by the open panels, in canvas pixels.
function clearArea() {
  const origin = canvas.getBoundingClientRect(),
    area = {
      left: 16,
      right: view.width - 16,
      top: 60,
      bottom: view.height - 70,
    };
  if (view.width >= 900) {
    const left = document.querySelector(".ol-left").getBoundingClientRect(),
      side = document.querySelector(".ol-side").getBoundingClientRect();
    if (left.width) area.left = left.right - origin.left + 16;
    if (side.width) area.right = side.left - origin.left - 16;
  } else {
    // Narrow screen: the panels are stacked across the top.
    let bottom = 0;
    for (const el of document.querySelectorAll(".ol-top > *"))
      bottom = Math.max(bottom, el.getBoundingClientRect().bottom - origin.top);
    area.top = Math.min(bottom, view.height / 2) + 30;
  }
  if (area.right - area.left < 160) {
    area.left = 16;
    area.right = view.width - 16;
  }
  if (area.bottom - area.top < 160) {
    area.top = 16;
    area.bottom = view.height - 16;
  }
  return area;
}
// The box that holds the body, the next launch's orbit and every
// satellite's orbit (or, for one that is leaving, where it has got to).
function sceneBox() {
  const R = lab.body.radius,
    box = { minX: -R, maxX: R, minY: -R, maxY: R },
    add = (x, y) => {
      if (x < box.minX) box.minX = x;
      if (x > box.maxX) box.maxX = x;
      if (y < box.minY) box.minY = y;
      if (y > box.maxY) box.maxY = y;
    },
    addPath = (path, limit) => {
      for (const [x, y] of path) if (x * x + y * y <= limit * limit) add(x, y);
    },
    p = preview();
  add(0, aim.radius);
  // An escaping path is shown out to three launch radii before launch, and
  // then for as far as the satellite has gone.
  addPath(p.path, p.elements.bound ? Infinity : 3 * aim.radius);
  for (const s of lab.list()) {
    const r = Math.hypot(s.x, s.y);
    add(s.x, s.y);
    addPath(
      paths.get(s.id) ?? [],
      s.elements.bound ? Infinity : Math.max(1.3 * r, 3 * s.launch.radius),
    );
  }
  return box;
}
function fitTarget() {
  const box = sceneBox(),
    area = clearArea(),
    w = box.maxX - box.minX,
    h = box.maxY - box.minY,
    scale = Math.min(
      (area.right - area.left) / (1.16 * w),
      (area.bottom - area.top) / (1.16 * h),
    );
  return {
    scale,
    x: (area.left + area.right) / 2 - ((box.minX + box.maxX) / 2) * scale,
    y: (area.top + area.bottom) / 2 + ((box.minY + box.maxY) / 2) * scale,
  };
}
// Move the view to hold the whole scene: at once, or part of the way each
// frame so that it glides.
function fit(glide) {
  if (!view.width) return;
  const t = fitTarget(),
    k = glide ? 0.18 : 1;
  view.scale *= (t.scale / view.scale) ** k;
  view.x += (t.x - view.x) * k;
  view.y += (t.y - view.y) * k;
}
function setAutoFit(on) {
  state.autoFit = on;
  $("auto-fit").checked = on;
}
function zoomAt(sx, sy, factor) {
  const p = world(sx, sy);
  view.scale = clamp(view.scale * factor, 1e-13, 1);
  view.x = sx - p.x * view.scale;
  view.y = sy + p.y * view.scale;
  setAutoFit(false);
}

// ---------------------------------------------------------------- drawing

function palette() {
  const dark = isDark();
  return {
    dark,
    ink: dark ? "#ebe5d6" : "#354438",
    soft: dark ? "#bdb4a2" : "#6f7f63",
    panel: dark ? "#2a2722" : "#fffefa",
    paper: dark ? "#1c1a16" : "#f2f0e9",
    gridMinor: dark ? "#2a2721" : "#dce1d4",
    gridMajor: dark ? "#3d3930" : "#c6cebf",
    body: dark ? "#5d6b5c" : "#9fb39a",
    bodyEdge: dark ? "#a9c49d" : "#4f7547",
    velocity: dark ? "#6fa8ec" : "#497caa",
    force: dark ? "#ef8a6f" : "#c2410c",
    kinetic: dark ? "#3987e5" : "#497caa",
    potential: dark ? "#199e70" : "#6d8f5f",
    axis: dark ? "#4a453b" : "#dfe4d9",
    // One colour per satellite, in launch order.
    satellites: dark
      ? [
          "#e0a94a",
          "#6fa8ec",
          "#e9826e",
          "#8fd3a4",
          "#a891e0",
          "#6fbfae",
          "#e58bb0",
          "#bdb4a2",
        ]
      : [
          "#ae7d24",
          "#3f76aa",
          "#c2503c",
          "#2f7d4f",
          "#8060ae",
          "#3f8c7c",
          "#b0577f",
          "#6f7f63",
        ],
  };
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
// An arrow from (x, y) along the screen direction (dx, dy), `length` pixels
// long. Returns its tip.
function arrow(x, y, dx, dy, length, colour, width = 2.2) {
  const x1 = x + dx * length,
    y1 = y + dy * length;
  ctx.strokeStyle = ctx.fillStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  if (length > 3) arrowHead(x1 + dx * 4, y1 + dy * 4, Math.atan2(dy, dx), 6);
  return [x1 + dx * 4, y1 + dy * 4];
}
function label(text, x, y, c, align = "center") {
  ctx.font = "600 10.5px system-ui,sans-serif";
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.strokeStyle = c.paper;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = c.ink;
  ctx.fillText(text, x, y);
}
function strokePoints(points) {
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const [x, y] = screen(points[i][0], points[i][1]);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
}
// Round step (1, 2 or 5 × 10ⁿ) giving about `count` intervals over `range`.
function niceStep(range, count) {
  const raw = range / count,
    size = 10 ** Math.floor(Math.log10(raw)),
    unit = raw / size;
  return (unit < 1.5 ? 1 : unit < 3.5 ? 2 : unit < 7.5 ? 5 : 10) * size;
}

function drawGrid(c) {
  const lo = world(0, view.height),
    hi = world(view.width, 0),
    step = niceStep(90 / view.scale, 1);
  ctx.lineWidth = 1;
  ctx.strokeStyle = c.gridMinor;
  ctx.beginPath();
  for (let x = Math.ceil(lo.x / step) * step; x <= hi.x; x += step) {
    const sx = Math.round(screen(x, 0)[0]) + 0.5;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, view.height);
  }
  for (let y = Math.ceil(lo.y / step) * step; y <= hi.y; y += step) {
    const sy = Math.round(screen(0, y)[1]) + 0.5;
    ctx.moveTo(0, sy);
    ctx.lineTo(view.width, sy);
  }
  ctx.stroke();
}
function drawScaleBar(c) {
  const length = niceStep(80 / view.scale, 1),
    w = length * view.scale,
    area = clearArea(),
    x = Math.round((area.left + area.right) / 2 - w / 2) + 0.5,
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
  ctx.fillText(joined(distance(length, 3)), x + w / 2, y + 4);
}

function drawBody(c) {
  const [x, y] = screen(0, 0),
    true_ = lab.body.radius * view.scale,
    r = Math.max(true_, 3);
  ctx.fillStyle = c.body;
  ctx.strokeStyle = c.bodyEdge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  if (state.show.labels)
    label(
      lab.body.name + (true_ < 3 ? " (drawn larger than scale)" : ""),
      x,
      true_ > 40 ? y : y + r + 11,
      c,
    );
}

// Velocity and force arrows share one scale across the scene: ARROW pixels
// for the circular speed, and for the weight, at the launch radius.
function drawVectors(x, y, vx, vy, r, c, withLabels) {
  const p = preview(),
    [sx, sy] = screen(x, y),
    // Unit vector pointing away from the centre, on screen.
    d = Math.hypot(x, y) || 1,
    ox = x / d,
    oy = -y / d;
  if (state.show.force) {
    const size = ARROW * (aim.radius / r) ** 2,
      length = Math.min(size, 190),
      tip = arrow(sx, sy, -ox, -oy, length, c.force);
    if (withLabels && state.show.labels)
      label(
        joined(prefixed((lab.mu * lab.satelliteMass) / (r * r), "N", 3)) +
          (size > length ? " (arrow shortened)" : ""),
        tip[0] - ox * 16,
        tip[1] - oy * 16,
        c,
      );
  }
  if (state.show.velocity) {
    const v = Math.hypot(vx, vy);
    if (v > 0) {
      const length = Math.min((ARROW * v) / p.circularSpeed, 400),
        tip = arrow(sx, sy, vx / v, -vy / v, length, c.velocity);
      if (withLabels && state.show.labels)
        label(
          joined(speedText(v, 3)),
          tip[0] + (vx / v) * 14 + ox * 16,
          tip[1] - (vy / v) * 14 + oy * 16,
          c,
        );
    }
  }
}

// The swept areas of Kepler's second law for one satellite: alternate
// equal-time sectors shaded, each numbered.
function drawAreas(s, colour, c) {
  const [ox, oy] = screen(0, 0),
    sectors = [...s.sweep.sectors];
  if (s.sweep.current) sectors.push(s.sweep.current);
  for (const sector of sectors) {
    const pts = sector.points,
      open = sector === s.sweep.current;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    for (let i = 0; i < pts.length; i += 2)
      ctx.lineTo(...screen(pts[i], pts[i + 1]));
    if (open) ctx.lineTo(...screen(s.x, s.y));
    ctx.closePath();
    ctx.fillStyle = colour;
    ctx.globalAlpha = sector.index % 2 ? 0.1 : 0.3;
    ctx.fill();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (open || !state.show.labels) continue;
    // Number it part-way out along the middle of its arc.
    const mid = 2 * Math.floor(pts.length / 4),
      [mx, my] = screen(0.62 * pts[mid], 0.62 * pts[mid + 1]);
    label(String(sector.index + 1), mx, my, c);
  }
}

function drawSatellite(s, c) {
  const colour = c.satellites[s.colour],
    [x, y] = screen(s.x, s.y),
    chosen = s.id === state.selected;
  if (s.status === "flying")
    drawVectors(s.x, s.y, s.vx, s.vy, Math.hypot(s.x, s.y), c, chosen);
  ctx.beginPath();
  ctx.arc(x, y, SATELLITE, 0, TAU);
  ctx.fillStyle = s.status === "flying" ? colour : c.panel;
  ctx.fill();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (s.status === "impact") {
    // A cross where it landed.
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 6);
    ctx.lineTo(x + 6, y + 6);
    ctx.moveTo(x + 6, y - 6);
    ctx.lineTo(x - 6, y + 6);
    ctx.stroke();
  }
  if (chosen) {
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, SATELLITE + 5, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (state.show.labels && s.status !== "flying")
    label(s.status === "impact" ? "Impact" : "Escaped", x, y - 16, c);
}

// The launch that is set up: its point, the local horizontal, the velocity
// arrow with its drag handle, and the path it would follow.
function ghostGeometry() {
  const p = preview(),
    [x, y] = screen(0, aim.radius),
    length = (ARROW * aim.speed) / p.circularSpeed;
  return {
    x,
    y,
    length,
    tipX: x + Math.cos(aim.angle) * length,
    tipY: y - Math.sin(aim.angle) * length,
  };
}
function drawGhost(c) {
  const p = preview(),
    g = ghostGeometry();
  if (state.show.prediction) {
    ctx.strokeStyle = c.ink;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 4]);
    strokePoints(p.path);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  // Local horizontal through the launch point, and the altitude below it.
  ctx.strokeStyle = c.soft;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(g.x - 46, g.y);
  ctx.lineTo(g.x + 46, g.y);
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(...screen(0, lab.body.radius));
  ctx.stroke();
  ctx.setLineDash([]);
  if (Math.abs(aim.angle) > 0.02 && g.length > 24) {
    ctx.beginPath();
    ctx.arc(g.x, g.y, 20, 0, -aim.angle, aim.angle > 0);
    ctx.stroke();
    if (state.show.labels)
      label(
        angleText(aim.angle),
        g.x + 34 * Math.cos(aim.angle / 2),
        g.y - 34 * Math.sin(aim.angle / 2),
        c,
      );
  }
  arrow(
    g.x,
    g.y,
    Math.cos(aim.angle),
    -Math.sin(aim.angle),
    g.length,
    c.velocity,
    2.6,
  );
  // Handle at the tip of the arrow, and the launch point itself.
  ctx.beginPath();
  ctx.arc(g.tipX, g.tipY, 5.5, 0, TAU);
  ctx.fillStyle = c.panel;
  ctx.fill();
  ctx.strokeStyle = c.velocity;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(g.x, g.y, SATELLITE, 0, TAU);
  ctx.fillStyle = c.panel;
  ctx.fill();
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  if (state.show.labels && !lab.list().length)
    label(joined(speedText(aim.speed, 3)), g.tipX, g.tipY - 15, c);
}

function draw() {
  const r = canvas.getBoundingClientRect(),
    dpr = window.devicePixelRatio || 1;
  if (view.width !== r.width || view.height !== r.height) {
    view.x += (r.width - view.width) / 2;
    view.y += (r.height - view.height) / 2;
    view.width = r.width;
    view.height = r.height;
  }
  if (
    canvas.width !== Math.round(r.width * dpr) ||
    canvas.height !== Math.round(r.height * dpr)
  ) {
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
  }
  if (!fitted) {
    fit(false);
    fitted = true;
  } else if (state.autoFit && !drag) fit(true);
  const c = palette();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, r.width, r.height);
  ctx.setLineDash([]);
  ctx.lineJoin = "round";
  if (prefs.grid) drawGrid(c);
  drawBody(c);
  for (const s of lab.list()) {
    const colour = c.satellites[s.colour];
    if (state.show.prediction && paths.has(s.id)) {
      ctx.strokeStyle = colour;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      strokePoints(paths.get(s.id));
      ctx.globalAlpha = 1;
    }
    if (state.show.areas && s.id === state.selected) drawAreas(s, colour, c);
    if (state.show.trails) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < s.trail.length; i++) {
        const [x, y] = screen(s.trail.get(i, 0), s.trail.get(i, 1));
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      // The trail of a closed orbit stops after one turn (it would only
      // retrace itself); until then it runs up to the satellite.
      if (Math.abs(s.swept) < s.trailEnd) ctx.lineTo(...screen(s.x, s.y));
      ctx.stroke();
    }
  }
  drawGhost(c);
  for (const s of lab.list()) drawSatellite(s, c);
  // Where the launch point and the arrow's handle are, in canvas pixels,
  // for tests/orbitlab-smoke.mjs (which cannot see the picture).
  const g = ghostGeometry(),
    at = (x, y) => x.toFixed(1) + "," + y.toFixed(1);
  if (canvas.dataset.launchPoint !== at(g.x, g.y))
    canvas.dataset.launchPoint = at(g.x, g.y);
  if (canvas.dataset.aimHandle !== at(g.tipX, g.tipY))
    canvas.dataset.aimHandle = at(g.tipX, g.tipY);
  drawScaleBar(c);
  updatePanels(c);
}

// ---------------------------------------------------------------- panels

// Rows of the readout panel: key, label. A row without a key is a heading.
const READOUTS = [
  ["time", "Time since launch"],
  ["radius", "Distance from centre"],
  ["altitude", "Altitude"],
  ["speed", "Speed"],
  ["kinetic", "Kinetic energy"],
  ["potential", "Gravitational PE"],
  ["total", "Total energy"],
  ["drift", "Total energy change"],
  ["momentum", "Angular momentum"],
  [null, "Orbit, from position and velocity"],
  ["type", "Orbit type"],
  ["semiMajor", "Semi-major axis a"],
  ["eccentricity", "Eccentricity e"],
  ["period", "Period T = 2π√(a³/GM)"],
  ["measured", "Period, timed"],
  ["periapsis", "Periapsis (closest)"],
  ["apoapsis", "Apoapsis (furthest)"],
];
{
  const grid = $("readout-grid");
  for (const [key, text] of READOUTS) {
    const name = document.createElement("span");
    name.textContent = text;
    if (!key) {
      name.className = "heading";
      grid.append(name);
      continue;
    }
    const value = document.createElement("span"),
      unit = document.createElement("span");
    name.id = `readout-${key}-label`;
    value.className = "num";
    value.id = `readout-${key}`;
    unit.className = "unit";
    unit.id = `readout-${key}-unit`;
    if (key === "type") {
      value.className = "wide";
      grid.append(name, value);
    } else grid.append(name, value, unit);
  }
}
// One readout: the value in its display unit, with the SI value on hover.
function readout(key, pair, si) {
  put($(`readout-${key}`), pair[0]);
  if ($(`readout-${key}-unit`)) put($(`readout-${key}-unit`), pair[1] ?? "");
  const title = si === undefined ? "" : si;
  if ($(`readout-${key}`).title !== title) $(`readout-${key}`).title = title;
}
const exact = (value, unit) =>
  Number.isFinite(value) ? `${value.toExponential(6)} ${unit}` : "";

function updateReadouts() {
  const s = selected(),
    p = preview(),
    R = lab.body.radius,
    m = lab.satelliteMass,
    el = s ? s.elements : p.elements,
    // Before launch the readouts describe the launch that is set up.
    now = s
      ? lab.measure(s.id)
      : (() => {
          const kinetic = 0.5 * m * aim.speed ** 2,
            potential = (-lab.mu * m) / aim.radius;
          return {
            time: 0,
            radius: aim.radius,
            altitude: aim.radius - R,
            speed: aim.speed,
            kinetic,
            potential,
            total: kinetic + potential,
            totalAtLaunch: kinetic + potential,
            angularMomentum: m * el.angularMomentum,
          };
        })();
  put(
    $("readout-subject"),
    s ? `· satellite ${s.id}` : "· the launch that is set up",
  );
  if (!$("readout").open) return;
  readout("time", duration(now.time), exact(now.time, "s"));
  readout("radius", distance(now.radius), exact(now.radius, "m"));
  // On the surface the altitude is zero, not the rounding left over.
  const altitude = Math.abs(now.altitude) < 1e-9 * R ? 0 : now.altitude;
  readout("altitude", distance(altitude), exact(altitude, "m"));
  readout("speed", speedText(now.speed), exact(now.speed, "m/s"));
  readout("kinetic", prefixed(now.kinetic, "J"), exact(now.kinetic, "J"));
  readout("potential", prefixed(now.potential, "J"), exact(now.potential, "J"));
  // A total that is zero to rounding (launch at the escape speed) reads 0.
  const total = Math.abs(now.total) < 1e-9 * now.kinetic ? 0 : now.total;
  readout("total", prefixed(total, "J"), exact(total, "J"));
  // Relative to the launch total, or to the kinetic energy when that total
  // is zero.
  const base =
      Math.abs(now.totalAtLaunch) > 1e-9 * now.kinetic
        ? Math.abs(now.totalAtLaunch)
        : now.kinetic,
    drift = base ? (100 * (now.total - now.totalAtLaunch)) / base : 0;
  readout("drift", [
    Math.abs(drift) < 5e-7 ? "0.000000" : drift.toFixed(6).replace("-", "−"),
    "%",
  ]);
  readout(
    "momentum",
    [num(Math.abs(now.angularMomentum), 4), "kg·m²/s"],
    Math.abs(now.angularMomentum) > 0
      ? `${now.angularMomentum > 0 ? "anticlockwise" : "clockwise"}; ${exact(Math.abs(now.angularMomentum), "kg·m²/s")}`
      : "",
  );
  put($("readout-type"), typeText(el, s));
  const hyperbola = el.semiMajorAxis < 0;
  readout(
    "semiMajor",
    distance(el.semiMajorAxis),
    hyperbola
      ? "Negative for a hyperbola: a = −GM/2ε with ε > 0"
      : exact(el.semiMajorAxis, "m"),
  );
  readout("eccentricity", [
    el.eccentricity < 5e-7 ? "0.00000" : el.eccentricity.toFixed(5),
    "",
  ]);
  readout(
    "period",
    el.bound ? duration(el.period) : ["none", ""],
    el.bound ? exact(el.period, "s") : "It does not come back",
  );
  readout(
    "measured",
    s?.measuredPeriod ? duration(s.measuredPeriod) : ["–", ""],
    s?.measuredPeriod
      ? `${exact(s.measuredPeriod, "s")}; ${s.orbits} orbit${s.orbits === 1 ? "" : "s"} completed`
      : "Shown once an orbit has been completed",
  );
  const below = el.periapsis < R * (1 - 1e-9);
  put(
    $("readout-periapsis-label"),
    below
      ? "Periapsis (inside the body)"
      : `Periapsis (${joined(distance(el.periapsis - R, 4))} up)`,
  );
  readout("periapsis", distance(el.periapsis), exact(el.periapsis, "m"));
  put(
    $("readout-apoapsis-label"),
    el.bound
      ? `Apoapsis (${joined(distance(el.apoapsis - R, 4))} up)`
      : "Apoapsis (furthest)",
  );
  readout(
    "apoapsis",
    el.bound ? distance(el.apoapsis) : ["none", ""],
    el.bound ? exact(el.apoapsis, "m") : "It escapes",
  );
}

// Axes for a small graph. Returns the drawing context and the functions
// that place a data point, or null when the canvas cannot be drawn on.
function graphFrame(el, c, o) {
  const g = el.getContext("2d"),
    dpr = window.devicePixelRatio || 1,
    w = el.clientWidth || 270,
    h = el.clientHeight || 92;
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
  if (!(x1 > x0)) x1 = x0 + 1;
  // A nearly constant quantity is given a range of at least a tenth of its
  // size, so that it reads as flat instead of magnifying rounding.
  const size = Math.max(Math.abs(y0), Math.abs(y1)),
    least = size > 0 ? 0.1 * size : 1;
  if (y1 - y0 < least) {
    const mid = (y0 + y1) / 2;
    y0 = mid - least / 2;
    y1 = mid + least / 2;
  }
  if (!o.tight) {
    const pad = (y1 - y0) * 0.08;
    y0 -= pad;
    y1 += pad;
  }
  const X = (v) => left + ((v - x0) / (x1 - x0)) * (w - left - right),
    Y = (v) => top + ((y1 - v) / (y1 - y0)) * (h - top - bottom),
    places = (step) => clamp(-Math.floor(Math.log10(step) + 1e-9), 0, 12),
    yStep = niceStep(y1 - y0, h > 110 ? 4 : 3),
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
    // The zero line, where it is in range.
    g.globalAlpha = 0.5;
    g.beginPath();
    g.moveTo(left, Math.round(Y(0)) + 0.5);
    g.lineTo(w - right, Math.round(Y(0)) + 0.5);
    g.stroke();
    g.globalAlpha = 1;
  }
  return { g, X, Y };
}
// Power-of-a-thousand scale for an axis whose largest value is `size`.
function axisScale(size) {
  const step = size > 0 ? Math.floor(Math.log10(size) / 3) : 0;
  return [1000 ** step, step];
}

// Distance, speed and the three energies of the selected satellite against
// time since its launch. The record covers its last few orbits.
function drawGraphs(c) {
  if (!$("graph-panel").open) return;
  const s = selected(),
    canvases = {
      energy: $("energy-graph"),
      distance: $("distance-graph"),
      speed: $("speed-graph"),
    },
    n = s ? s.history.length + 1 : 0,
    empty = n < 3 ? "Launch a satellite to plot." : null;
  if (empty) {
    graphFrame(canvases.energy, c, { title: "Energy", xTitle: "t", empty });
    graphFrame(canvases.distance, c, {
      title: "Distance from centre",
      xTitle: "t",
      empty,
    });
    graphFrame(canvases.speed, c, { title: "Speed", xTitle: "t", empty });
    return;
  }
  const h = s.history,
    m = lab.satelliteMass,
    mu = lab.mu,
    t = new Float64Array(n),
    r = new Float64Array(n),
    v = new Float64Array(n);
  for (let i = 0; i < n - 1; i++) {
    t[i] = h.get(i, 0);
    r[i] = h.get(i, 1);
    v[i] = h.get(i, 2);
  }
  // The record is kept at intervals; the last point is now.
  t[n - 1] = s.time;
  r[n - 1] = Math.hypot(s.x, s.y);
  v[n - 1] = Math.hypot(s.vx, s.vy);
  const [tSize, tUnit] = state.si ? [1, "s"] : timeUnit(t[n - 1]),
    xTitle = `t (${tUnit})`,
    x0 = t[0] / tSize,
    x1 = t[n - 1] / tSize,
    line = (frame, value, colour, width = 1.5) => {
      frame.g.beginPath();
      for (let i = 0; i < n; i++) {
        const x = frame.X(t[i] / tSize),
          y = frame.Y(value(i));
        if (i) frame.g.lineTo(x, y);
        else frame.g.moveTo(x, y);
      }
      frame.g.strokeStyle = colour;
      frame.g.lineWidth = width;
      frame.g.lineJoin = "round";
      frame.g.stroke();
    },
    range = (value) => {
      let lo = Infinity,
        hi = -Infinity;
      for (let i = 0; i < n; i++) {
        const y = value(i);
        if (y < lo) lo = y;
        if (y > hi) hi = y;
      }
      return [lo, hi];
    };

  // Energies: kinetic above zero, potential below, and their sum.
  const kinetic = (i) => 0.5 * m * v[i] * v[i],
    potential = (i) => (-mu * m) / r[i],
    [, kHi] = range(kinetic),
    [pLo] = range(potential),
    [eSize, eStep] = axisScale(Math.max(kHi, -pLo)),
    eUnit =
      eStep >= 0 && eStep < PREFIXES.length
        ? PREFIXES[eStep] + "J"
        : power(3 * eStep) + " J",
    energy = graphFrame(canvases.energy, c, {
      title: `Energy (${eUnit})`,
      xTitle,
      x0,
      x1,
      y0: pLo / eSize,
      y1: kHi / eSize,
    });
  if (energy) {
    line(energy, (i) => kinetic(i) / eSize, c.kinetic);
    line(energy, (i) => potential(i) / eSize, c.potential);
    line(energy, (i) => (kinetic(i) + potential(i)) / eSize, c.ink, 2);
  }
  const [rLo, rHi] = range((i) => r[i]),
    [rSize, rStep] = state.si ? axisScale(rHi) : axisScale(rHi / km),
    rUnit = state.si
      ? rStep
        ? power(3 * rStep) + " m"
        : "m"
      : rStep
        ? power(3 * rStep) + " km"
        : "km",
    rFactor = state.si ? rSize : rSize * km,
    dist = graphFrame(canvases.distance, c, {
      title: `Distance from centre (${rUnit})`,
      xTitle,
      x0,
      x1,
      y0: rLo / rFactor,
      y1: rHi / rFactor,
    });
  if (dist) line(dist, (i) => r[i] / rFactor, c.satellites[s.colour]);
  const [vLo, vHi] = range((i) => v[i]),
    kms = !state.si && vHi >= 100,
    vFactor = kms ? km : 1,
    speed = graphFrame(canvases.speed, c, {
      title: `Speed (${kms ? "km/s" : "m/s"})`,
      xTitle,
      x0,
      x1,
      y0: vLo / vFactor,
      y1: vHi / vFactor,
    });
  if (speed) line(speed, (i) => v[i] / vFactor, c.velocity);
}

// Kepler's second law: the areas swept in equal times by the selected
// satellite, listed so they can be compared.
function updateAreas() {
  if (!$("kepler-panel").open) return;
  const s = selected(),
    list = $("areas-list");
  if (!s) {
    put(
      $("areas-note"),
      "Launch a satellite, then turn on Equal areas in the Display panel to shade them.",
    );
    if (list.childElementCount) list.replaceChildren();
    return;
  }
  const sectors = s.sweep.sectors,
    areas = sectors.map((x) => x.area),
    // Shown in km² (m² in SI mode) with a common power of ten.
    unit = state.si ? 1 : km * km,
    size = areas.length
      ? 10 ** Math.floor(Math.log10(Math.max(...areas) / unit))
      : 1,
    scale = `${size === 1 ? "" : power(Math.round(Math.log10(size))) + " "}${state.si ? "m²" : "km²"}`,
    times = size === 1 ? " " : " × ";
  let note = `The line from the centre to satellite ${s.id} sweeps out one area every ${joined(duration(s.sweep.interval, 3))}`;
  note +=
    s.elements.bound && !s.elements.impact ? ", a twelfth of its period." : ".";
  if (areas.length > 1) {
    const spread = Math.max(...areas) / Math.min(...areas) - 1;
    note += ` Largest and smallest differ by ${(100 * spread).toFixed(4)}%. Theory: each is ½·(L/m)·Δt = ${num(s.sweep.expected / unit / size, 6)}${times}${scale}.`;
  }
  if (areas.length) note += ` The areas so far, in ${scale}:`;
  else if (!state.show.areas)
    note += " Turn on Equal areas in the Display panel to shade them.";
  put($("areas-note"), note);
  if (list.childElementCount !== 2 * areas.length) {
    list.replaceChildren();
    for (let i = 0; i < areas.length; i++) {
      const name = document.createElement("span"),
        value = document.createElement("span");
      name.textContent = String(i + 1);
      name.title = `Area ${i + 1}`;
      value.className = "num";
      value.id = `area-${i + 1}`;
      list.append(name, value);
    }
  }
  areas.forEach((area, i) => {
    const el = $(`area-${i + 1}`);
    put(el, num(area / unit / size, 6));
    el.title = `${area.toExponential(6)} m²`;
  });
}

// Kepler's third law: T² against a³, one point per completed orbit.
function drawThirdLaw(c) {
  if (!$("kepler-panel").open) return;
  const points = lab.thirdLaw,
    el = $("third-law-graph");
  if (!points.length) {
    graphFrame(el, c, {
      title: "T² against a³",
      xTitle: "a³",
      empty: "A point is added for each completed orbit.",
    });
    put(
      $("third-law-note"),
      "Launch satellites into closed orbits of different sizes. Each adds one point when it completes its first orbit: its timed period squared against its semi-major axis cubed.",
    );
    return;
  }
  const xs = points.map((p) => p.semiMajorAxis ** 3),
    ys = points.map((p) => p.period ** 2),
    xPower = Math.floor(Math.log10(Math.max(...xs))),
    yPower = Math.floor(Math.log10(Math.max(...ys))),
    xSize = 10 ** xPower,
    ySize = 10 ** yPower,
    frame = graphFrame(el, c, {
      title: `T² (${power(yPower)} s²)`,
      xTitle: `a³ (${power(xPower)} m³)`,
      x0: 0,
      x1: (1.12 * Math.max(...xs)) / xSize,
      y0: 0,
      y1: (1.12 * Math.max(...ys)) / ySize,
      tight: true,
    }),
    theory = (4 * Math.PI ** 2) / lab.mu,
    // Best straight line through the origin, for this central body's points.
    mine = points.filter((p) => p.mu === lab.mu),
    slope =
      mine.reduce((sum, p) => sum + p.semiMajorAxis ** 3 * p.period ** 2, 0) /
      (mine.reduce((sum, p) => sum + p.semiMajorAxis ** 6, 0) || 1);
  if (frame) {
    const { g, X, Y } = frame;
    if (state.thirdLine) {
      const end = (1.12 * Math.max(...xs)) / xSize;
      g.strokeStyle = c.ink;
      g.globalAlpha = 0.6;
      g.setLineDash([4, 3]);
      g.beginPath();
      g.moveTo(X(0), Y(0));
      g.lineTo(X(end), Y((theory * end * xSize) / ySize));
      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
    }
    points.forEach((p, i) => {
      g.beginPath();
      g.arc(X(xs[i] / xSize), Y(ys[i] / ySize), 3.5, 0, TAU);
      g.fillStyle = c.satellites[p.colour];
      g.fill();
      g.strokeStyle = c.ink;
      g.lineWidth = 0.8;
      g.stroke();
    });
  }
  const other = points.length - mine.length;
  put(
    $("third-law-note"),
    `${points.length} point${points.length === 1 ? "" : "s"}.` +
      (mine.length
        ? ` Best line through the origin: T²/a³ = ${num(slope, 4)} s²/m³. Newton's gravity predicts 4π²/GM = ${num(theory, 4)} s²/m³ for ${lab.body.name}.`
        : "") +
      (other
        ? ` ${other} ${other === 1 ? "is" : "are"} from a different central mass, which has a different line.`
        : ""),
  );
}

function updatePanels(c) {
  const s = selected(),
    el = s ? s.elements : preview().elements,
    [heading, sentence] = describe(el, s);
  put($("tool-name"), (s ? `Satellite ${s.id}: ` : "This launch: ") + heading);
  put($("tool-help"), sentence);
  updateReadouts();
  drawGraphs(c);
  updateAreas();
  drawThirdLaw(c);
  const flying = lab.list().filter((x) => x.status === "flying").length,
    count = lab.list().length,
    behind =
      state.running && flying && state.achieved < 0.8 * state.warp
        ? ` (running at about ${num(state.achieved, 2)}×: the most this computer can keep accurate)`
        : "";
  put(
    $("time"),
    `t = ${joined(duration(lab.time))} · ${num(state.warp, 3)}×${behind}`,
  );
  put(
    $("scene-status"),
    `${lab.body.name} fixed at the centre · Newtonian gravity, no atmosphere · ${count} satellite${count === 1 ? "" : "s"}`,
  );
  put($("zoom-level"), "↔ " + joined(distance(view.width / view.scale, 3)));
}

// ---------------------------------------------------------------- loop

function frame(now) {
  const elapsed = last ? Math.min((now - last) / 1000, 0.05) : 0;
  last = now;
  if (state.running && elapsed > 0) {
    const began = performance.now(),
      done = lab.advance(elapsed * state.warp),
      took = performance.now() - began;
    // The model stops short rather than take longer steps. How many steps
    // it may take in a frame is set to what this computer does in about
    // 6 ms, so that the picture stays smooth at the highest time warps.
    if (took > 7 || done < elapsed * state.warp)
      lab.maxSteps = clamp(
        lab.maxSteps * clamp(6 / Math.max(took, 0.5), 0.7, 1.3),
        4000,
        200000,
      );
    state.achieved += (done / elapsed - state.achieved) * 0.1;
    // Nothing left in flight: stop the clock.
    if (!lab.list().some((s) => s.status === "flying")) setRunning(false);
  }
  draw();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- input

function hitTest(sx, sy) {
  const g = ghostGeometry();
  if (Math.hypot(sx - g.tipX, sy - g.tipY) <= HANDLE) return { type: "aim" };
  for (const s of [...lab.list()].reverse()) {
    const [x, y] = screen(s.x, s.y);
    if (Math.hypot(sx - x, sy - y) <= SATELLITE + 6)
      return { type: "satellite", id: s.id };
  }
  if (Math.hypot(sx - g.x, sy - g.y) <= SATELLITE + 6) return { type: "point" };
  return null;
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.focus?.({ preventScroll: true });
  // A click on the scene closes an open panel and does nothing else.
  if (closePanels()) return;
  if (e.button !== 0 && e.button !== 1) return;
  const { sx, sy } = eventPoint(e),
    hit = e.button === 0 ? hitTest(sx, sy) : null;
  if (hit?.type === "satellite") {
    state.selected = hit.id;
    buildList();
    return;
  }
  drag = hit ?? { type: "pan", sx, sy, x: view.x, y: view.y, moved: false };
  e.preventDefault();
  capture(e);
});
canvas.addEventListener("pointermove", (e) => {
  const { sx, sy } = eventPoint(e);
  if (!drag) {
    const hit = hitTest(sx, sy);
    canvas.style.cursor = hit
      ? hit.type === "point"
        ? "ns-resize"
        : "pointer"
      : "";
    return;
  }
  if (drag.type === "pan") {
    if (Math.hypot(sx - drag.sx, sy - drag.sy) > 3) drag.moved = true;
    if (drag.moved) {
      view.x = drag.x + sx - drag.sx;
      view.y = drag.y + sy - drag.sy;
      setAutoFit(false);
    }
  } else if (drag.type === "aim") {
    // The arrow runs from the launch point to the pointer.
    const g = ghostGeometry(),
      dx = sx - g.x,
      dy = g.y - sy,
      speed = Math.min(
        (Math.hypot(dx, dy) / ARROW) * preview().circularSpeed,
        LIMITS.speed,
      ),
      patch = { speed: Number(speed.toPrecision(4)) };
    if (!e.shiftKey && Math.hypot(dx, dy) > 2) {
      // Whole degrees, so that horizontal is easy to find again.
      patch.angle =
        (Math.round((Math.atan2(dy, dx) * 180) / Math.PI) * Math.PI) / 180;
    }
    if (attempt(() => setAim(patch))) syncForms();
  } else if (drag.type === "point") {
    const radius = Math.max(lab.body.radius, world(sx, sy).y),
      altitude = Number((radius - lab.body.radius).toPrecision(4));
    if (attempt(() => setAim({ radius: lab.body.radius + altitude })))
      syncForms();
  }
});
function endDrag() {
  drag = null;
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener(
  "wheel",
  (e) => {
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
    return;
  }
  if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (e.key.startsWith("Arrow")) {
    e.preventDefault();
    const p = preview(),
      patch =
        e.key === "ArrowUp" || e.key === "ArrowDown"
          ? {
              speed: clamp(
                aim.speed +
                  (e.key === "ArrowUp" ? 0.01 : -0.01) * p.circularSpeed,
                0,
                LIMITS.speed,
              ),
            }
          : {
              angle: wrapAngle(
                aim.angle + ((e.key === "ArrowLeft" ? 1 : -1) * Math.PI) / 180,
              ),
            };
    if (attempt(() => setAim(patch))) syncForms();
    return;
  }
  if (e.key === " ") {
    e.preventDefault();
    if (!e.repeat) toggleRunning();
    return;
  }
  if (key === ".") return stepOnce();
  if (key === "[") return shiftWarp(-1);
  if (key === "]") return shiftWarp(1);
  if (key === "+" || key === "=")
    return zoomAt(view.width / 2, view.height / 2, 1.25);
  if (key === "-") return zoomAt(view.width / 2, view.height / 2, 0.8);
  if (e.repeat) return;
  if (key === "l") launch();
  else if (key === "r") reset();
  else if (key === "c") lab.clearTrails();
  else if (key === "v") toggleShow("show-velocity");
  else if (key === "g") toggleShow("show-force");
  else if (key === "p") toggleShow("show-prediction");
  else if (key === "t") toggleShow("show-trails");
  else if (key === "k") toggleShow("show-areas");
  else if (key === "a") toggleShow("auto-fit");
  else if (key === "?") togglePanel("keys-panel");
});

for (const [id, key] of [
  ["show-velocity", "velocity"],
  ["show-force", "force"],
  ["show-prediction", "prediction"],
  ["show-trails", "trails"],
  ["show-areas", "areas"],
  ["show-labels", "labels"],
])
  $(id).addEventListener("change", (e) => {
    state.show[key] = e.target.checked;
    // Shading the areas is explained, and listed, in the Kepler panel.
    if (key === "areas" && e.target.checked) $("kepler-panel").open = true;
  });
$("auto-fit").addEventListener("change", (e) => setAutoFit(e.target.checked));
$("si-units").addEventListener("change", (e) => {
  state.si = e.target.checked;
  setWarp(state.warp);
  syncForms();
});
$("show-third-line").addEventListener("change", (e) => {
  state.thirdLine = e.target.checked;
});
$("clear-third-law").addEventListener("click", () => lab.clearThirdLaw());

// After a click with the mouse, the keyboard goes back to the scene, so
// that Space runs and pauses instead of pressing the same button again.
document.addEventListener("click", (e) => {
  if (
    e.detail > 0 &&
    e.target.closest?.(
      ".playback button, .ol-top button, .camera-controls button",
    )
  )
    canvas.focus?.({ preventScroll: true });
});
$("launch").addEventListener("click", launch);
$("clear-trails").addEventListener("click", () => lab.clearTrails());
$("use-circular").addEventListener("click", () => {
  // The exact value, not the rounded one shown, so the orbit is a circle.
  if (attempt(() => setAim({ speed: circularSpeed(lab.mu, aim.radius) })))
    syncForms();
});
$("use-escape").addEventListener("click", () => {
  if (attempt(() => setAim({ speed: escapeSpeed(lab.mu, aim.radius) })))
    syncForms();
});
$("body-preset").addEventListener("change", (e) => {
  const key = e.target.value;
  if (BODIES[key]) attempt(() => changeBody({ key, ...BODIES[key] }, true));
  syncForms();
});
for (const form of ["body-form", "launch-form"])
  $(form).addEventListener("submit", (e) => e.preventDefault());
$("satellite-mass").addEventListener("change", (e) => {
  attempt(() => {
    if (e.target.value === "")
      throw new Error("Satellite mass needs a number.");
    lab.setSatelliteMass(Number(e.target.value));
  });
  updateLaunchPanel();
});

$("pause").addEventListener("click", toggleRunning);
$("step").addEventListener("click", stepOnce);
$("reset").addEventListener("click", reset);
for (const warp of WARPS) {
  const option = document.createElement("option");
  option.value = String(warp);
  option.textContent = num(warp, 3) + "×";
  $("warp").append(option);
}
$("warp").addEventListener("change", (e) => setWarp(Number(e.target.value)));

$("zoom-in").addEventListener("click", () =>
  zoomAt(view.width / 2, view.height / 2, 1.25),
);
$("zoom-out").addEventListener("click", () =>
  zoomAt(view.width / 2, view.height / 2, 0.8),
);
$("fit-scene").addEventListener("click", () => fit(false));

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

// Sets up a preset's launch and leaves it paused, ready for Run.
function loadPreset(preset) {
  attempt(() => {
    changeBody({ key: preset.body, ...BODIES[preset.body] }, false, true);
    setAim(preset.launch(lab.mu, lab.body.radius));
    setWarp(preset.warp);
    setAutoFit(true);
    syncForms();
  });
}
{
  const list = $("preset-list");
  for (const preset of presets) {
    const button = document.createElement("button"),
      title = document.createElement("strong"),
      text = document.createElement("span"),
      expect = document.createElement("span"),
      picture = document.createElement("canvas"),
      words = document.createElement("span");
    button.className = "preset";
    button.dataset.preset = preset.id;
    title.textContent = preset.title;
    text.textContent = preset.text;
    expect.className = "preset-expect";
    expect.textContent = "What to check: " + preset.expect;
    picture.className = "preset-preview";
    picture.setAttribute("aria-hidden", "true");
    words.className = "preset-text";
    words.append(title, text, expect);
    button.append(picture, words);
    button.addEventListener("click", () => {
      closePanels();
      loadPreset(preset);
    });
    list.append(button);
  }
}
// Thumbnails of each preset, drawn from the preset's own launch through
// the model, so they can never drift from what loads.
function drawPresetPreviews() {
  const dark = isDark();
  if (previewTheme === dark) return;
  previewTheme = dark;
  const c = palette();
  for (const preset of presets)
    try {
      const el = document.querySelector(
          `[data-preset="${preset.id}"] .preset-preview`,
        ),
        g = el.getContext("2d"),
        dpr = window.devicePixelRatio || 1,
        w = 112,
        h = 72,
        scene = new OrbitLab();
      if (!g?.setTransform) continue;
      el.width = w * dpr;
      el.height = h * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      scene.setBody({ key: preset.body, ...BODIES[preset.body] });
      const R = scene.body.radius,
        launched = preset.launch(scene.mu, R),
        path = orbitPath(scene.preview(launched).elements),
        xs = [...path.map((p) => p[0]), -R, R],
        ys = [...path.map((p) => p[1]), -R, R],
        minX = Math.min(...xs),
        maxX = Math.max(...xs),
        minY = Math.min(...ys),
        maxY = Math.max(...ys),
        k = Math.min((w - 14) / (maxX - minX), (h - 14) / (maxY - minY)),
        at = (x, y) => [
          w / 2 + (x - (minX + maxX) / 2) * k,
          h / 2 - (y - (minY + maxY) / 2) * k,
        ];
      g.fillStyle = c.paper;
      g.fillRect(0, 0, w, h);
      g.beginPath();
      g.arc(...at(0, 0), Math.max(R * k, 1.5), 0, TAU);
      g.fillStyle = c.body;
      g.fill();
      g.strokeStyle = c.bodyEdge;
      g.lineWidth = 0.8;
      g.stroke();
      g.beginPath();
      path.forEach((p, i) =>
        i ? g.lineTo(...at(p[0], p[1])) : g.moveTo(...at(p[0], p[1])),
      );
      g.strokeStyle = c.satellites[0];
      g.lineWidth = 1.4;
      g.stroke();
      g.beginPath();
      g.arc(...at(0, launched.radius), 2.4, 0, TAU);
      g.fillStyle = c.satellites[0];
      g.fill();
    } catch {
      // A preview is decoration; the preset itself reports its own errors.
    }
}

prefs.onchange = buildForms;
// Theme is a website preference changed in the settings panel: the chips
// take their colours from it.
$("settings-panel").addEventListener("change", buildList);
window
  .matchMedia?.("(prefers-color-scheme: dark)")
  ?.addEventListener?.("change", buildList);
window.addEventListener("resize", fitHeader);
$("ui-size").addEventListener("input", fitHeader);

// On a narrow screen the panels start folded, clear of the scene.
if (window.innerWidth < 900)
  for (const id of ["launch-panel", "display-panel", "readout", "graph-panel"])
    $(id).open = false;
setWarp(state.warp);
setRunning(false);
buildForms();
buildList();
fitHeader();
draw();
requestAnimationFrame(frame);
