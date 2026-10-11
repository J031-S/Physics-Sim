// Drives the real circuits.html through happy-dom with a stubbed canvas
// context. It checks controls, panels and the readings as the page shows
// them; it cannot see pixels.
import { Window } from "happy-dom";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const window = new Window({ url: "http://localhost:3000/circuits.html" });
window.document.write(
  await readFile(new URL("../circuits.html", import.meta.url), "utf8"),
);
globalThis.document = window.document;
globalThis.window = window;
globalThis.setTimeout = window.setTimeout.bind(window);
globalThis.clearTimeout = window.clearTimeout.bind(window);
let next = null;
globalThis.requestAnimationFrame = (fn) => {
  next = fn;
};
// One redraw. No time passes, so the circuit's clock only moves with Step.
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
await import("../src/circuitlab/app.js");
// ---- checks ----
// Everything below uses only DOM calls, `assert` and `await frame()`, so it
// can also be run inside a real browser (the page starts paused, and these
// checks move its clock only with the Step button).
const $ = (id) => document.getElementById(id),
  canvas = $("canvas");
const text = (id) => $(id).textContent.replace(/\s+/g, " ").trim();
const set = (el, value, type = "change") => {
  el.value = String(value);
  el.dispatchEvent(new window.Event(type, { bubbles: true }));
};
const key = (k, init = {}) =>
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: k, bubbles: true, ...init }),
  );
// Canvas position of a grid point, from the view the page last drew with.
const at = (gx, gy) => {
  const [x, y, scale] = canvas.dataset.view.split(",").map(Number);
  return [x + gx * scale, y - gy * scale];
};
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
const click = async (gx, gy) => {
  pointer("pointerdown", at(gx, gy));
  pointer("pointerup", at(gx, gy));
  await frame();
};
const dragTo = async (from, to) => {
  const a = at(...from),
    b = at(...to);
  pointer("pointerdown", a);
  pointer("pointermove", [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  pointer("pointermove", b);
  pointer("pointerup", b);
  await frame();
};
const steps = async (n) => {
  for (let i = 0; i < n; i++) $("step").click();
  await frame();
};
// Components and wires, from the status line.
const counts = () => {
  const m = text("scene-status").match(/(\d+) components?, (\d+) wires?/);
  return [Number(m[1]), Number(m[2])];
};
const meter = (name) => text("meter-" + name);
const reading = (name) => text("reading-" + name);
const preset = async (id) => {
  $("presets-toggle").click();
  assert.equal($("presets-panel").hidden, false);
  document.querySelector(`[data-preset="${id}"]`).click();
  await frame();
  // A preset sets the circuit up and waits: paused, at t = 0.
  assert.equal($("presets-panel").hidden, true);
  assert.match($("pause").title, /Run/);
  assert.match(text("time"), /^t = 0 s · .* paused$/);
  assert.equal($("warning").hidden, true, id + ": no fault");
  assert.equal($("circuit-note").hidden, true, id + ": nothing to remark on");
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
  ["./", "fields.html", "orbits.html", "circuits.html"],
);
assert.equal(links[3].getAttribute("aria-current"), "page");
nav.click();
assert.equal($("nav-menu").hidden, true);

// One view so far, switched the way the fields page switches its two.
assert.equal($("mode-dc").getAttribute("aria-pressed"), "true");
const paletteButtons = [...document.querySelectorAll("[data-add]")];
assert.equal(paletteButtons.length, 10);
assert.ok(paletteButtons.every((b) => b.dataset.for === "dc" && !b.hidden));
$("mode-dc").click();
assert.equal($("mode-dc").getAttribute("aria-pressed"), "true");

// The presets: each meter shows the value its formula gives.
//   Series: I = 12/(4 + 8); V = IR.
await preset("series");
assert.deepEqual(counts(), [6, 12]);
assert.equal(meter("A1"), "1.000 A");
assert.equal(meter("V1"), "4.000 V");
assert.equal(meter("V2"), "8.000 V");
assert.equal(text("selected-name"), "Resistor R1");
assert.equal(reading("current"), "1.000 A →");
assert.equal(reading("voltage"), "4.000 V");
assert.equal(reading("power"), "4.000 W");
assert.equal(reading("potentials"), "12.00 V | 8.000 V");
assert.equal(text("graph-subject"), "· R1");
assert.match(text("graph-note"), /do not change with time/);
//   Parallel: 12/4, 12/12 and their sum.
await preset("parallel");
assert.equal(meter("A1"), "4.000 A");
assert.equal(meter("A2"), "3.000 A");
assert.equal(meter("A3"), "1.000 A");
assert.equal(reading("voltage"), "12.00 V");
//   Potential divider: 12 × 1/(2 + 1); I = 12/3000.
await preset("divider");
assert.equal(meter("V1"), "4.000 V");
assert.equal(meter("A1"), "4.000 mA");
assert.equal(text("selected-name"), "Variable resistor R2");
//   ... and with its slider at 2 kΩ, half the supply.
set(document.querySelector("[data-slider]"), 2000, "input");
await frame();
assert.equal(meter("V1"), "6.000 V");
assert.equal($("component-resistance").value, "2");
assert.equal(document.querySelector('[data-unit="resistance"]').value, "1000");
//   Internal resistance: I = 12/(5 + 1); V = 12 − 2 × 1.
await preset("internal-resistance");
assert.equal(meter("A1"), "2.000 A");
assert.equal(meter("V1"), "10.00 V");
assert.equal(text("selected-name"), "Cell E1");
assert.equal(reading("emf"), "12.00 V");
assert.equal(reading("current"), "2.000 A out of +");
assert.equal(reading("voltage"), "10.00 V");
assert.equal(reading("power"), "20.00 W");
assert.equal(reading("lost"), "4.000 W");
//   ... and with the switch opened by a click on it, the EMF.
await click(2, 5);
assert.equal(meter("A1"), "0 A");
assert.equal(meter("V1"), "12.00 V");
assert.equal($("circuit-note").hidden, false);
assert.match(text("circuit-note"), /^Open circuit: .* E1/);
assert.equal($("warning").hidden, true);
assert.equal(text("selected-name"), "Switch S1");
assert.equal(reading("state"), "open");
$("component-toggle").click();
await frame();
assert.equal(meter("A1"), "2.000 A");
//   Wheatstone bridge, balanced: exactly nothing through the bridge.
await preset("wheatstone");
assert.equal(meter("A1"), "0 A");
assert.equal(text("selected-name"), "Ammeter A1");
//   ... and unbalanced by typing a new value for the variable resistor.
await click(8, 1);
assert.equal(text("selected-name"), "Variable resistor R4");
set($("component-resistance"), 500, "input");
await frame();
// I = V_th/R_th with a zero-resistance bridge: 9(2/3 − 5/8)/(200/3 + 187.5).
assert.equal(meter("A1"), "1.475 mA");

// Capacitor: RC = 10 kΩ × 100 µF = 1 s.
await preset("rc");
assert.equal(meter("A1"), "1.000 mA");
assert.equal(meter("V1"), "0 V");
assert.equal(text("selected-name"), "Capacitor C1");
assert.equal(reading("tau"), "1.000 s");
assert.equal(reading("charge"), "0 C");
assert.equal(reading("current"), "1.000 mA charging");
assert.match(text("graph-note"), /^Time constant τ = 1\.000 s/);
assert.match(text("scene-status"), /time step 10\.0 ms \(τ\/100\)/);
assert.equal($("warp").value, "1");
// Sixty frames at 1× are one second: V = 10(1 − 1/e).
await steps(60);
assert.match(text("time"), /^t = 1\.000 s/);
assert.equal(meter("V1"), "6.321 V");
assert.equal(meter("A1"), "367.9 µA");
assert.equal(reading("charge"), "632.1 µC");
await steps(240);
assert.match(text("time"), /^t = 5\.000 s/);
assert.equal(meter("V1"), "9.933 V");
// A click on the two-way switch: the charge stays, the current reverses.
await click(4, 4);
assert.equal(meter("V1"), "9.933 V");
assert.equal(meter("A1"), "−993.3 µA");
assert.match(text("graph-note"), /last change \(t = 5\.000 s\)/);
await steps(60);
// 9.933 V × 1/e.
assert.equal(meter("V1"), "3.654 V");
// Space runs and pauses; Reset returns to t = 0 with the capacitor empty.
key(" ");
assert.match($("pause").title, /Pause/);
key(" ");
assert.match($("pause").title, /Run/);
$("reset").click();
await frame();
assert.match(text("time"), /^t = 0 s/);
assert.equal(meter("V1"), "0 V");
// The time scale: [ and ] step through it; Step follows it.
key("[");
assert.equal($("warp").value, "0.5");
key("]");
key("]");
assert.equal($("warp").value, "2");
set($("warp"), 1);

// Editing values. The number box is in the unit beside it.
await preset("series");
const box = () => $("component-resistance"),
  unit = () => document.querySelector('[data-unit="resistance"]');
assert.equal(box().value, "4");
assert.equal(unit().value, "1");
set(box(), 8, "input");
await frame();
// I = 12/(8 + 8).
assert.equal(meter("A1"), "750.0 mA");
assert.equal(meter("V2"), "6.000 V");
set(unit(), 1000);
assert.equal(box().value, "0.008");
assert.equal(meter("A1"), "750.0 mA", "a change of unit is not a change");
set(box(), 0.004, "input");
await frame();
assert.equal(meter("A1"), "1.000 A");
// A value outside the range is refused, with a reason, and nothing changes.
set(box(), -5, "input");
await frame();
assert.match(text("toast"), /Resistance must be between/);
assert.equal(meter("A1"), "1.000 A");
set(box(), -5);
assert.equal(box().value, "0.004");

// Building. A component chosen in the toolbar is placed with a click and
// the tool returns to Grab.
const resistor = document.querySelector('[data-add="resistor"]');
resistor.click();
assert.equal(resistor.getAttribute("aria-pressed"), "true");
assert.equal(text("tool-name"), "Resistor");
await click(5, -3);
assert.deepEqual(counts(), [7, 12]);
assert.equal(text("selected-name"), "Resistor R3");
assert.equal(text("tool-name"), "Grab");
assert.equal(resistor.getAttribute("aria-pressed"), "false");
assert.equal(reading("current"), "0 A");
// Dragging it moves it by whole grid squares; Delete removes it.
await dragTo([5, -3], [7, -4]);
assert.equal(text("selected-name"), "Resistor R3");
await click(7, -4);
assert.equal(text("selected-name"), "Resistor R3");
await click(5, -3);
assert.equal($("selection").hidden, true, "it is no longer where it was");
await click(7, -4);
key("Delete");
await frame();
assert.deepEqual(counts(), [6, 12]);
assert.equal($("selection").hidden, true);
// An ammeter dropped on a wire is put in series with it: the wire is cut
// in two and the meter reads the current. This one faces against it.
document.querySelector('[data-add="ammeter"]').click();
await click(5, 0);
assert.deepEqual(counts(), [7, 13]);
assert.equal(text("selected-name"), "Ammeter A2");
assert.equal(meter("A2"), "−1.000 A");
assert.equal(meter("A1"), "1.000 A", "and nothing else has changed");
assert.equal(meter("V2"), "8.000 V");
// Two quarter-turns reverse it.
$("rotate").click();
await frame();
assert.equal(meter("A2"), "0 A");
assert.match(text("circuit-note"), /^Open circuit/);
key("r");
await frame();
assert.equal(meter("A2"), "1.000 A");
assert.equal($("circuit-note").hidden, true);
// Dragging from a terminal draws a wire.
await dragTo([10, 4], [12, 4]);
assert.deepEqual(counts(), [7, 14]);
// A wire straight across the cell is a short circuit: said loudly, and the
// meters show no number at all.
await dragTo([0, 3], [0, 1]);
assert.deepEqual(counts(), [7, 15]);
assert.equal($("warning").hidden, false);
assert.equal(text("warning-title"), "Short circuit");
assert.match(text("warning-text"), /^E1 \(12 V\) has its terminals joined/);
assert.equal(meter("A1"), "–");
assert.equal(meter("V1"), "–");
// Giving the cell an internal resistance makes it a finite current, E/r;
// it is still a short circuit and still says so.
await click(0, 2);
assert.equal(text("selected-name"), "Cell E1");
set($("component-internal"), 0.5, "input");
await frame();
assert.equal(reading("current"), "24.00 A out of +");
assert.equal(meter("A1"), "0 A");
assert.equal($("warning").hidden, false);
assert.match(text("warning-text"), /terminals of E1 are joined/);

// A component dropped on a wire turns to lie along it and goes in series.
// Here a resistor (10 Ω) is put on the upright wire at the right-hand side:
// I = 12/(4 + 8 + 10).
await preset("series");
document.querySelector('[data-add="resistor"]').click();
await click(10, 2);
assert.deepEqual(counts(), [7, 13]);
assert.equal(text("selected-name"), "Resistor R3");
assert.equal(meter("A1"), "545.5 mA");
assert.equal(reading("current"), "545.5 mA ↓");
assert.equal(reading("voltage"), "5.455 V");
// It has two orientations only. A quarter-turn takes it off the wire; a
// second puts it back exactly as it was, not upside down.
key("r");
await frame();
assert.equal(meter("A1"), "0 A");
key("r");
await frame();
assert.equal(meter("A1"), "545.5 mA");
assert.equal(reading("current"), "545.5 mA ↓");

// Display toggles and their keys.
for (const [k, id] of [
  ["c", "show-current"],
  ["e", "electron-flow"],
  ["p", "show-potential"],
  ["v", "show-labels"],
]) {
  const was = $(id).checked;
  key(k);
  assert.equal($(id).checked, !was, id);
  await frame();
  if (id === "show-potential")
    assert.equal($("potential-legend").hidden, false);
  if (id === "electron-flow")
    assert.match(text("flow-note"), /electrons: − to \+/);
  key(k);
}
// Number keys choose components; Escape returns to Grab.
key("7");
assert.equal(text("tool-name"), "Capacitor");
key("w");
assert.equal(text("tool-name"), "Wire");
key("Escape");
assert.equal(text("tool-name"), "Grab");
// Panels open and close.
$("shortcuts").click();
assert.equal($("keys-panel").hidden, false);
key("Escape");
assert.equal($("keys-panel").hidden, true);
$("settings-toggle").click();
assert.equal($("settings-panel").hidden, false);
$("close-settings").click();
assert.equal($("settings-panel").hidden, true);
// Clear scene asks first.
$("clear").click();
assert.equal($("clear-confirm").hidden, false);
$("clear-no").click();
assert.equal($("clear-confirm").hidden, true);
assert.deepEqual(counts(), [7, 13]);
$("clear").click();
$("clear-yes").click();
await frame();
assert.deepEqual(counts(), [0, 0]);
assert.equal($("warning").hidden, true);
assert.match(text("meter-note"), /No meters yet/);
assert.match(text("time"), /^t = 0 s/);
console.log("circuit lab smoke: ok");
