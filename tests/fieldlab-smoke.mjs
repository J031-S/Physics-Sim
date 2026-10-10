// Drives the real fields.html through happy-dom with a stubbed canvas
// context. It checks controls and model state; it cannot see pixels.
import { Window } from "happy-dom";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const window = new Window({ url: "http://localhost:3000/fields.html" });
window.document.write(
  await readFile(new URL("../fields.html", import.meta.url), "utf8"),
);
globalThis.document = window.document;
globalThis.window = window;
globalThis.setTimeout = window.setTimeout.bind(window);
globalThis.clearTimeout = window.clearTimeout.bind(window);
let next = null;
globalThis.requestAnimationFrame = (fn) => {
  next = fn;
};
const frame = () => {
  const fn = next;
  next = null;
  fn?.(0);
};
const calls = [];
const ctx = new Proxy(
  {},
  {
    get: (o, k) => o[k] || ((...args) => void calls.push([k, args])),
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
await import("../src/fieldlab/app.js");
const $ = (id) => document.getElementById(id),
  canvas = $("canvas");
// ---- checks ----
// The 1000 × 700 view is centred at (500, 370) at 100 px per metre.
const origin = canvas.getBoundingClientRect();
const at = (x, y) => [origin.left + 500 + x * 100, origin.top + 370 - y * 100];
const pointer = (type, [x, y], init = {}) =>
  canvas.dispatchEvent(
    new window.PointerEvent(type, {
      clientX: x,
      clientY: y,
      button: 0,
      pointerId: 1,
      bubbles: true,
      ...init,
    }),
  );
const click = (p) => {
  pointer("pointerdown", p);
  pointer("pointerup", p);
};
const key = (k, init = {}) =>
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: k, bubbles: true, ...init }),
  );
const field = (name) => $("source-" + name);
const set = (el, value, type = "change") => {
  el.value = String(value);
  el.dispatchEvent(new window.Event(type, { bubbles: true }));
};
const count = () =>
  Number($("scene-status").textContent.match(/(\d+) source/)[1]);
const probe = (p) => {
  pointer("pointermove", p);
  return {
    field: $("probe-field").textContent,
    direction: $("probe-direction").textContent,
    potential: $("probe-potential").textContent,
  };
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
assert.equal(nav.getAttribute("aria-expanded"), "true");
const links = [...$("nav-menu").querySelectorAll("a")];
assert.deepEqual(
  links.map((a) => a.getAttribute("href")),
  ["./", "fields.html"],
);
assert.equal(links[1].getAttribute("aria-current"), "page");
nav.click();
assert.equal($("nav-menu").hidden, true);

// Starts on the electric scene with the dipole: +2 nC and −2 nC, 3 m apart.
frame();
assert.equal($("mode-electric").getAttribute("aria-pressed"), "true");
assert.equal(count(), 2);
assert.match($("scene-status").textContent, /Electric scene/);
assert.equal(document.querySelector('[data-add="wire-out"]').hidden, true);
assert.equal(document.querySelector('[data-add="positive"]').hidden, false);
assert.ok(
  calls.some(([k]) => k === "stroke"),
  "something was drawn",
);
// Midway: E = 2kq/r² = 16.0 N/C towards the negative charge, V = 0.
let reading = probe(at(0, 0));
assert.equal(reading.field, "16.0 N/C");
assert.equal(reading.direction, "0°");
assert.equal(reading.potential, "0 V");

// Select a charge by clicking it; its form shows and edits the model.
click(at(-1.5, 0));
assert.equal($("selection").hidden, false);
assert.equal($("selected-name").textContent, "Point charge");
assert.equal(field("charge").value, "2");
assert.equal(field("x").value, "-1.5");
assert.match($("source-note").textContent, /Force on it: 3\.99 nN at 0°/);
set(field("charge"), 4);
assert.match($("source-note").textContent, /7\.99 nN/);
// Out of range: refused with a message, and the box returns to the value.
set(field("charge"), 99);
assert.match($("toast").textContent, /Charge must be between −20 nC and 20 nC/);
assert.equal(field("charge").value, "4");
// The slider drives the same value.
const slider = document.querySelector('#source-form input[type="range"]');
set(slider, -3, "input");
assert.equal(field("charge").value, "-3");
set(field("charge"), 2);

// Drag it 1 m up; with snapping on it lands on the 0.25 m grid.
pointer("pointerdown", at(-1.5, 0));
pointer("pointermove", at(-1.5, 1));
pointer("pointerup", at(-1.5, 1));
assert.equal(field("y").value, "1");
key("z");
assert.equal($("snap-toggle").checked, true);
assert.match($("snap-status").textContent, /Snap on/);
pointer("pointerdown", at(-1.5, 1));
pointer("pointermove", at(-1.38, 0.09));
pointer("pointerup", at(-1.38, 0.09));
assert.equal(field("x").value, "-1.5");
assert.equal(field("y").value, "0");
key("ArrowRight");
assert.equal(field("x").value, "-1.25");
key("ArrowLeft");
key("z");
assert.equal($("snap-toggle").checked, false);

// Place a negative charge: it is selected and the tool returns to Grab, as
// in the mechanics sandbox. Then delete it with the keyboard.
document.querySelector('[data-add="negative"]').click();
assert.equal($("tool-name").textContent, "Negative charge");
click(at(0, 2));
assert.equal(count(), 3);
assert.equal(field("charge").value, "-1");
assert.equal($("tool-name").textContent, "Grab");
assert.equal(
  document.querySelector('[data-add="negative"]').getAttribute("aria-pressed"),
  "false",
);
// So a second click on the scene does not place another.
click(at(3, 2.5));
assert.equal(count(), 3);
click(at(0, 2));
key("Delete");
assert.equal(count(), 2);
assert.equal($("selection").hidden, true);

// A plate: place, rotate by Ctrl-drag and by its angle box.
document.querySelector('[data-add="plate"]').click();
click(at(0, -2));
assert.equal($("tool-name").textContent, "Grab");
assert.equal($("selected-name").textContent, "Charged plate");
assert.equal(field("angle").value, "0");
pointer("pointerdown", at(1, -2), { ctrlKey: true });
pointer("pointermove", at(0, -1), { ctrlKey: true });
pointer("pointerup", at(0, -1));
assert.equal(field("angle").value, "90");
set(field("angle"), 30);
assert.equal(field("angle").value, "30");
set($("ui-angle-unit"), "radians");
assert.equal(field("angle").value, "0.52");
set($("ui-angle-unit"), "degrees");
$("delete").click();
assert.equal(count(), 2);

// Display toggles and line density.
assert.equal($("potential-legend").hidden, true);
$("show-equipotentials").click();
frame();
assert.match($("equipotential-step").textContent, /^every [\d.]+ V$/);
// The shading's key says where it reaches full strength.
assert.equal($("potential-legend").hidden, false);
assert.match($("potential-legend-text").textContent, /full at ±[\d.]+ V/);
key("a");
assert.equal($("show-arrows").checked, true);
key("f");
assert.equal($("show-forces").checked, true);
set($("line-density"), 2, "input");
assert.equal($("line-density-value").textContent, "2×");
frame();

// Background field: 10 N/C to the right adds to the probe reading.
$("settings-toggle").click();
assert.equal($("settings-panel").hidden, false);
set($("uniform-electric-x"), 10);
$("close-settings").click();
assert.equal($("settings-panel").hidden, true);
reading = probe(at(0, 0));
assert.equal(reading.field, "26.0 N/C");
$("settings-toggle").click();
set($("uniform-electric-x"), 99999);
assert.match($("toast").textContent, /background field must be between/);
assert.equal($("uniform-electric-x").value, "10");
// A click on the scene closes the panel and does nothing else.
click(at(3, 3));
assert.equal($("settings-panel").hidden, true);
assert.equal(count(), 2);

// The magnetic scene is separate: two 10 A wires, 2 m apart.
key("m");
assert.equal($("mode-magnetic").getAttribute("aria-pressed"), "true");
assert.match($("scene-status").textContent, /Magnetic scene · 2 sources/);
assert.equal($("show-equipotentials-label").hidden, true);
assert.equal($("show-forces-text").textContent, "Forces on wires");
assert.equal(document.querySelector('[data-add="positive"]').hidden, true);
frame();
reading = probe(at(0, 1));
// Each wire gives μ₀I/2πr with r = √2 m; the vertical parts cancel.
assert.equal(reading.field, "2.00 µT");
assert.equal(reading.direction, "180°");
click(at(-1, 0));
assert.equal($("selected-name").textContent, "Straight wire");
assert.match($("source-note").textContent, /10\.0 µN\/m at 0°/);
set(field("current"), -10);
assert.match($("source-note").textContent, /10\.0 µN\/m at 180°/);
assert.equal(document.querySelector('[data-add="test"]').hidden, true);
document.querySelector('[data-add="magnet"]').click();
click(at(0, -2));
assert.equal($("tool-name").textContent, "Grab");
assert.equal($("selected-name").textContent, "Bar magnet / solenoid");
assert.match($("source-note").textContent, /μ₀nI = 62\.8 µT/);
assert.equal(count(), 3);

// Clear asks first, and only clears the scene on show.
$("clear").click();
assert.equal($("clear-confirm").hidden, false);
assert.match($("clear-confirm-text").textContent, /magnetic scene/);
$("clear-no").click();
assert.equal(count(), 3);
$("clear").click();
$("clear-yes").click();
assert.equal(count(), 0);
frame();
key("e");
assert.equal(count(), 2);
assert.equal($("uniform-electric-x").value, "10");

// Presets load into their own scene and switch to it.
$("presets-toggle").click();
const buttons = [...document.querySelectorAll("#preset-list .preset")];
assert.ok(buttons.length >= 12);
// Every preset has a preview picture beside its text.
for (const b of buttons) {
  assert.equal(b.firstElementChild.tagName, "CANVAS");
  assert.equal(b.firstElementChild.className, "preset-preview");
  assert.ok(b.querySelector(".preset-text strong").textContent);
}
document.querySelector('[data-preset="solenoid"]').click();
assert.equal($("presets-panel").hidden, true);
assert.match($("scene-status").textContent, /Magnetic scene · 1 source/);
frame();
document.querySelector('[data-preset="parallel-plates"]').click();
assert.match($("scene-status").textContent, /Electric scene · 2 sources/);
assert.equal($("uniform-electric-x").value, "0");
frame();

// Test charges: released from rest between the plates (6 m long, 1 m apart,
// E ≈ 20 N/C downwards), one falls 0.5 m onto the negative plate in
// √(2d/a) ≈ 0.22 s, with a = qE/m ≈ 20 m/s².
assert.equal($("test-row").hidden, true);
key("t");
assert.equal($("tool-name").textContent, "Test charge");
click(at(0, 0));
assert.equal($("tool-name").textContent, "Grab");
assert.equal(count(), 2, "a test charge is not a source");
assert.equal($("test-row").hidden, false);
assert.equal($("test-status").textContent, "1 test charge · 1 moving");
for (let i = 0; i < 10; i++) frame(); // 1/60 s each
assert.equal($("test-status").textContent, "1 test charge · 1 moving");
for (let i = 0; i < 8; i++) frame();
assert.equal($("test-status").textContent, "1 test charge · 0 moving");
// It may not be dropped onto a charge, and Clear removes them all.
document.querySelector('[data-add="test"]').click();
click(at(1, 0.2));
assert.equal($("test-status").textContent, "2 test charges · 1 moving");
key("m");
assert.equal($("test-row").hidden, true);
key("e");
assert.equal($("test-row").hidden, false);
$("clear-tests").click();
assert.equal($("test-row").hidden, true);
frame();
// Test grid: one at every grid intersection on screen, replacing any others
// and all released together. The view shows the 6 m plates fitted in.
document.querySelector('[data-add="test"]').click();
click(at(1, 0.2));
$("test-grid").click();
assert.match(
  $("toast").textContent,
  /^\d+ test charges released, [\d.]+ m apart$/,
);
const released = parseInt($("toast").textContent, 10);
assert.ok(released > 100, "a screenful");
assert.equal(
  $("test-status").textContent,
  `${released} test charges · ${released} moving`,
);
assert.equal($("tool-name").textContent, "Grab");
for (let i = 0; i < 30; i++) frame();
const still = Number($("test-status").textContent.match(/· (\d+) moving/)[1]);
assert.ok(still < released, "those between the plates have landed");
assert.match(
  $("test-status").textContent,
  new RegExp(`^${released} test charges`),
);
key("T", { shiftKey: true });
assert.equal(
  $("test-status").textContent,
  `${released} test charges · ${released} moving`,
);
key("m");
assert.equal($("test-grid").hidden, true);
key("e");
$("clear-tests").click();
frame();

// View controls.
const zoom = () => parseInt($("zoom-level").textContent, 10);
const fitted = zoom();
assert.ok(fitted < 100, "the 6 m plates are fitted into view");
$("zoom-in").click();
frame();
assert.ok(Math.abs(zoom() / fitted - 1.25) < 0.03);
$("fit-scene").click();
frame();
assert.equal(zoom(), fitted);
key("h");
assert.equal($("tool-name").textContent, "Pan");
key("?");
assert.equal($("keys-panel").hidden, false);
key("Escape");
assert.equal($("keys-panel").hidden, true);
assert.equal($("tool-name").textContent, "Grab");

console.log("field lab smoke test passed");
