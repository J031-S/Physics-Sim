// Drives the real orbits.html through happy-dom with a stubbed canvas
// context. It checks controls, readouts and model state as shown on the
// page; it cannot see pixels.
import { Window } from "happy-dom";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const window = new Window({ url: "http://localhost:3000/orbits.html" });
window.document.write(
  await readFile(new URL("../orbits.html", import.meta.url), "utf8"),
);
globalThis.document = window.document;
globalThis.window = window;
globalThis.setTimeout = window.setTimeout.bind(window);
globalThis.clearTimeout = window.clearTimeout.bind(window);
let next = null;
globalThis.requestAnimationFrame = (fn) => {
  next = fn;
};
// One redraw. No time passes, so the simulation only moves with Step.
const frame = async () => {
  const fn = next;
  next = null;
  fn?.(0);
};
const ctx = new Proxy(
  {},
  {
    get: (o, k) => o[k] || (() => {}),
    set: (o, k, v) => ((o[k] = v), true),
  },
);
window.HTMLCanvasElement.prototype.getContext = () => ctx;
window.HTMLCanvasElement.prototype.setPointerCapture = () => {};
window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
  left: 0,
  top: 0,
  width: 1000,
  height: 700,
});
await import("../src/orbitlab/app.js");
// ---- checks ----
// Everything below uses only DOM calls, `assert` and `await frame()`, so it
// can also be run inside a real browser (pause first: there, time passes).
const $ = (id) => document.getElementById(id),
  canvas = $("canvas");
const text = (id) => $(id).textContent.replace(/\s+/g, " ").trim();
const set = (el, value, type = "change") => {
  el.value = String(value);
  el.dispatchEvent(new window.Event(type, { bubbles: true }));
};
const field = (name) => $("launch-form-" + name);
const key = (k, init = {}) =>
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: k, bubbles: true, ...init }),
  );
const pointer = (type, [x, y], init = {}) => {
  const origin = canvas.getBoundingClientRect();
  canvas.dispatchEvent(
    new window.PointerEvent(type, {
      clientX: origin.left + x,
      clientY: origin.top + y,
      button: 0,
      pointerId: 1,
      bubbles: true,
      ...init,
    }),
  );
};
// Canvas position of the launch point or of the arrow's handle.
const spot = (name) => canvas.dataset[name].split(",").map(Number);
const steps = (n) => {
  for (let i = 0; i < n; i++) $("step").click();
};
const chips = () => document.querySelectorAll("#launch-list .ol-chip").length;
const number = (id) =>
  Number(
    text(id)
      .replace(/[^\d.−-]/g, "")
      .replace("−", "-"),
  );
// The pointer is placed to a tenth of a pixel, so dragged values are
// compared to 0.5%.
const about = (actual, expected) =>
  assert.ok(
    Math.abs(actual - expected) <= 0.005 * Math.abs(expected),
    `got ${actual}, expected about ${expected}`,
  );
const preset = async (id) => {
  $("presets-toggle").click();
  document.querySelector(`[data-preset="${id}"]`).click();
  // Presets launch and run; stop the clock and start again from rest.
  if (/Pause/.test($("pause").title)) $("pause").click();
  $("reset").click();
  await frame();
};

// Navigation: a drop-down of links at the left of the top bar.
const nav = $("nav-toggle");
assert.equal(
  document.querySelector("header").children[1].className,
  "site-nav",
);
assert.equal($("nav-menu").hidden, true);
nav.click();
assert.equal($("nav-menu").hidden, false);
const links = [...$("nav-menu").querySelectorAll("a")];
assert.deepEqual(
  links.map((a) => a.getAttribute("href")),
  ["./", "fields.html", "orbits.html"],
);
assert.equal(links[2].getAttribute("aria-current"), "page");
nav.click();
assert.equal($("nav-menu").hidden, true);

// Starts set up for a circular orbit 400 km above the Earth, not running.
await frame();
assert.equal($("body-preset").value, "earth");
assert.equal(field("altitude").value, "400");
assert.equal(field("radius").value, "6771");
assert.equal(field("speed").value, "7.6723");
assert.equal(field("angle").value, "0");
assert.equal(text("circular-speed"), "7.672 km/s");
assert.equal(text("escape-speed"), "10.85 km/s");
assert.match(text("speed-compare"), /1\.00 × the circular speed and 0\.707 ×/);
assert.match(text("body-note"), /Earth is held fixed at the centre/);
assert.equal(text("tool-name"), "This launch: Circular orbit");
assert.match(text("tool-help"), /Period 92\.42 min/);
assert.equal(text("readout-type"), "Circular");
assert.equal(text("readout-period"), "92.42");
assert.equal(text("readout-period-unit"), "min");
assert.equal(text("readout-radius"), "6 771.0");
assert.equal(text("readout-eccentricity"), "0.00000");
assert.equal($("reset").disabled, true);
assert.equal(chips(), 0);
assert.match($("pause").title, /Run/);
assert.match(text("scene-status"), /Earth fixed at the centre .* 0 satellites/);

// Speed decides the orbit: too slow lands, faster is an ellipse, the
// escape speed is a parabola with zero total energy.
set(field("speed"), 5, "input");
await frame();
assert.equal(text("tool-name"), "This launch: Impact");
assert.equal(text("readout-type"), "Impact (path: ellipse)");
set(field("speed"), 9, "input");
await frame();
assert.equal(text("tool-name"), "This launch: Elliptical orbit");
assert.match(text("tool-help"), /this is its lowest point/);
set(field("speed"), 7.6, "input");
await frame();
assert.match(text("tool-help"), /this is its highest point/);
$("use-escape").click();
await frame();
assert.equal(field("speed").value, "10.8503");
assert.equal(text("tool-name"), "This launch: Parabolic escape");
assert.equal(text("readout-total"), "0");
assert.equal(text("readout-period"), "none");
assert.equal(text("readout-eccentricity"), "1.00000");
set(field("speed"), 12, "input");
await frame();
assert.equal(text("tool-name"), "This launch: Hyperbolic escape");
assert.equal(text("readout-type"), "Hyperbolic (escape)");
$("use-circular").click();
await frame();
assert.equal(text("tool-name"), "This launch: Circular orbit");
// Straight up below the escape speed comes straight back down.
set(field("angle"), 90, "input");
await frame();
assert.equal(text("tool-name"), "This launch: Impact");
assert.match(text("tool-help"), /Straight up .* then straight back down/);
set(field("angle"), 0, "input");

// Out of range: refused with a message, and the box returns to the value.
set(field("speed"), -1);
assert.match(text("toast"), /Launch speed must be between 0 and 30000 km\/s/);
assert.equal(field("speed").value, "7.6723");
set(field("angle"), 200);
assert.match(text("toast"), /Launch angle must be between −180° and 180°/);
assert.equal(field("angle").value, "0");
set(field("altitude"), -5);
assert.match(text("toast"), /on or above the surface/);
assert.equal(field("altitude").value, "400");
// The sliders drive the same values.
set($("launch-form-angle-slider"), 30, "input");
assert.equal(field("angle").value, "30");
set($("launch-form-angle-slider"), 0, "input");

// Geostationary radius typed in: altitude follows, and the circular speed
// and period there are the textbook ones.
set(field("radius"), 42163.14);
assert.equal(field("altitude").value, "35792.14");
assert.equal(text("circular-speed"), "3.075 km/s");
$("use-circular").click();
await frame();
assert.equal(text("readout-period"), "23.93");
assert.equal(text("readout-period-unit"), "h");
set(field("altitude"), 400);
$("use-circular").click();

// Another central body: its own mass and radius, same altitude, and the
// launch stays circular.
set($("body-preset"), "moon");
await frame();
assert.equal($("body-form-mass").value, "7.342e+22");
assert.equal($("body-form-radius").value, "1737.4");
assert.equal(field("altitude").value, "400");
assert.equal(text("circular-speed"), "1.514 km/s");
assert.equal(text("tool-name"), "This launch: Circular orbit");
assert.match(
  text("body-note"),
  /Moon is held fixed .* Surface gravity 1\.62 m\/s²/,
);
// A typed mass makes it a custom body; a bad one is refused.
set($("body-form-mass"), 1.4684e23);
assert.equal($("body-preset").value, "custom");
assert.equal(text("circular-speed"), "2.141 km/s"); // √2 × 1.514
set($("body-form-mass"), 1e40);
assert.match(text("toast"), /Mass must be between/);
assert.equal($("body-form-mass").value, "1.4684e+23");
set($("body-preset"), "earth");
await frame();
assert.equal(text("circular-speed"), "7.672 km/s");
// (The launch speed kept its ratio to the circular speed, 1/√2 after the
// mass was doubled, so it is set back to circular here.)
assert.match(text("speed-compare"), /0\.707 × the circular speed/);
$("use-circular").click();

// Launch: a satellite appears and the clock runs. Pause, then reset.
$("launch").click();
await frame();
assert.equal(chips(), 1);
assert.equal($("reset").disabled, false);
assert.match($("pause").title, /Pause/);
assert.equal(text("readout-subject"), "· satellite 1");
assert.match(text("scene-status"), /1 satellite$/);
$("pause").click();
assert.match($("pause").title, /Run/);
$("reset").click();
await frame();
assert.equal(chips(), 0);
assert.equal($("reset").disabled, true);
assert.equal(text("readout-subject"), "· the launch that is set up");

// Step with nothing in flight launches and stays paused. Each step is one
// frame of simulated time: 500 × 1/60 s.
assert.equal($("warp").value, "500");
steps(6);
await frame();
assert.equal(chips(), 1);
assert.match($("pause").title, /Run/);
assert.equal(text("readout-time"), "50.00");
assert.equal(text("readout-time-unit"), "s");
assert.match(text("time"), /^t = 50\.00 s · 500×/);
assert.equal(text("tool-name"), "Satellite 2: Circular orbit");
assert.equal(text("readout-altitude"), "400.00");
assert.equal(text("readout-speed"), "7.672");
assert.equal(text("readout-kinetic"), "29.43");
assert.equal(text("readout-kinetic-unit"), "GJ");
assert.equal(text("readout-potential"), "−58.86");
assert.equal(text("readout-total"), "−29.43");
assert.equal(text("readout-drift"), "0.000000");
assert.equal(text("readout-measured"), "–");
// The time warp: the list, and [ and ] step through it.
set($("warp"), 1000);
key("]");
assert.equal($("warp").value, "2000");
key("[");
key("[");
assert.equal($("warp").value, "500");
// One whole orbit (92.42 min = 5545 s): the timed period appears, the
// radius has not changed, and the orbit is one point of the third-law plot.
set($("warp"), 5000);
steps(67);
await frame();
assert.equal(text("readout-measured"), "92.42");
assert.equal(text("readout-altitude"), "400.00");
assert.equal(text("readout-drift"), "0.000000");
$("kepler-panel").open = true;
await frame();
assert.match(
  text("third-law-note"),
  /^1 point\..*9\.905 × 10⁻¹⁴ s²\/m³.*9\.905 × 10⁻¹⁴/,
);

// A second, faster launch from the same place: two satellites, each with
// its own readouts.
set(field("speed"), 9, "input");
$("launch").click();
$("pause").click();
await frame();
assert.equal(chips(), 2);
assert.equal(text("readout-subject"), "· satellite 3");
assert.equal(text("readout-type"), "Elliptical");
document.querySelector('[data-satellite="2"]').click();
await frame();
assert.equal(text("readout-subject"), "· satellite 2");
assert.equal(text("readout-type"), "Circular");
document.querySelector('[aria-label="Remove satellite 2"]').click();
await frame();
assert.equal(chips(), 1);
assert.equal(text("readout-subject"), "· satellite 3");
// SI base units, and the satellite's mass (energies scale; the path does
// not).
const kinetic = number("readout-kinetic");
$("si-units").click();
await frame();
assert.equal(text("readout-radius-unit"), "m");
assert.equal(text("readout-speed-unit"), "m/s");
assert.equal(text("readout-kinetic-unit"), "J");
$("si-units").click();
set($("satellite-mass"), 2000);
await frame();
assert.ok(Math.abs(number("readout-kinetic") / kinetic - 2) < 1e-3);
set($("satellite-mass"), 0);
assert.match(text("toast"), /Satellite mass must be between/);
assert.equal($("satellite-mass").value, "2000");
set($("satellite-mass"), 1000);

// Newton's cannon: 6 km/s from 100 km lands 1341 km away after 3.75 min.
await preset("newtons-cannon");
assert.equal(field("altitude").value, "100");
assert.equal(field("speed").value, "6");
assert.equal($("warp").value, "50");
assert.equal(text("tool-name"), "This launch: Impact");
steps(300);
await frame();
assert.match(text("tool-name"), /^Satellite \d+: Impact$/);
assert.match(
  text("tool-help"),
  /3\.75 min after launch, 1.341 km round .* at 6\.159 km\/s/,
);
assert.equal(text("readout-altitude"), "0");
assert.equal(text("readout-type"), "Impact (path: ellipse)");
// It stays there: more steps do not move the clock on.
const landed = text("readout-time");
steps(20);
await frame();
assert.equal(text("readout-time"), landed);

// Dragging the arrow sets speed and direction. The arrow is 64 px long at
// the circular speed here (7.848 km/s at 100 km).
$("reset").click();
$("auto-fit").click();
assert.equal($("auto-fit").checked, false);
await frame();
let [px, py] = spot("launchPoint");
pointer("pointerdown", spot("aimHandle"));
pointer("pointermove", [px + 128, py]);
pointer("pointerup", [px + 128, py]);
await frame();
about(Number(field("speed").value), 15.7);
assert.equal(field("angle").value, "0");
assert.equal(text("tool-name"), "This launch: Hyperbolic escape");
pointer("pointerdown", spot("aimHandle"));
pointer("pointermove", [px, py - 64]);
pointer("pointerup", [px, py - 64]);
await frame();
about(Number(field("speed").value), 7.848);
assert.equal(field("angle").value, "90");
// With Shift the direction is kept and only the speed changes.
pointer("pointerdown", spot("aimHandle"));
pointer("pointermove", [px + 32, py], { shiftKey: true });
pointer("pointerup", [px + 32, py]);
await frame();
about(Number(field("speed").value), 3.924);
assert.equal(field("angle").value, "90");
// Dragging the launch point moves it up and down; it stops at the surface.
const before = Number(field("altitude").value);
pointer("pointerdown", spot("launchPoint"));
pointer("pointermove", [px, py - 40]);
pointer("pointerup", [px, py - 40]);
await frame();
assert.ok(Number(field("altitude").value) > before + 100);
pointer("pointerdown", spot("launchPoint"));
pointer("pointermove", [px, py + 300]);
pointer("pointerup", [px, py + 300]);
await frame();
assert.equal(field("altitude").value, "0");
// Arrow keys: 1% of the circular speed, and 1°.
set(field("altitude"), 400);
set(field("angle"), 0);
$("use-circular").click();
canvas.focus();
key("ArrowUp");
key("ArrowLeft");
assert.equal(field("speed").value, "7.749");
assert.equal(field("angle").value, "1");
$("auto-fit").click();

// Kepler's second law on an eccentric ellipse: twelve equal-time areas,
// all the same. One orbit is 9.374 h; a step at ×2000 is 33.3 s.
await preset("eccentric-ellipse");
assert.equal(field("speed").value, "10.0035");
key("k");
assert.equal($("show-areas").checked, true);
assert.equal($("kepler-panel").open, true);
steps(1020);
await frame();
assert.match(text("tool-name"), /Elliptical orbit$/);
assert.equal(text("readout-eccentricity"), "0.70000");
assert.equal(text("readout-measured"), "9.374");
assert.equal(text("readout-drift"), "0.000000");
const areas = [...document.querySelectorAll("#areas-list .num")].map(
  (el) => el.textContent,
);
assert.equal(areas.length, 12);
assert.ok(
  areas.every((a) => a === "9.52394"),
  areas.join(" "),
);
assert.match(text("areas-note"), /every 46\.9 min, a twelfth of its period/);
assert.match(text("areas-note"), /differ by 0\.0000%.*9\.52394 × 10⁷ km²/);
assert.match(text("third-law-note"), /^2 points\./);
$("clear-third-law").click();
await frame();
assert.match(text("third-law-note"), /Each adds one point/);

// Display toggles from the keyboard, and Space runs and pauses.
for (const [k, id] of [
  ["v", "show-velocity"],
  ["g", "show-force"],
  ["p", "show-prediction"],
  ["t", "show-trails"],
  ["a", "auto-fit"],
]) {
  const was = $(id).checked;
  key(k);
  assert.equal($(id).checked, !was, id);
  key(k);
}
key(" ");
assert.match($("pause").title, /Pause/);
key(" ");
assert.match($("pause").title, /Run/);
key("r");
await frame();
assert.equal(chips(), 0);
assert.match(text("time"), /^t = 0 s/);
// Panels open and close.
$("shortcuts").click();
assert.equal($("keys-panel").hidden, false);
key("Escape");
assert.equal($("keys-panel").hidden, true);
$("settings-toggle").click();
assert.equal($("settings-panel").hidden, false);
$("close-settings").click();
assert.equal($("settings-panel").hidden, true);
console.log("orbit lab smoke: ok");
