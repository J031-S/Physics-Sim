// Drives the real sims/Waves.html through happy-dom with a stubbed canvas
// context. It checks the views, panels, presets and readings as the page
// shows them, and that sound never starts by itself; it cannot see pixels
// or hear anything.
import { Window } from "happy-dom";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const window = new Window({ url: "http://localhost:3000/sims/Waves" });
window.document.write(await readFile(new URL("../sims/Waves.html", import.meta.url), "utf8"));
globalThis.document = window.document;
globalThis.window = window;
globalThis.setTimeout = window.setTimeout.bind(window);
globalThis.clearTimeout = window.clearTimeout.bind(window);
let next = null;
globalThis.requestAnimationFrame = (fn) => {
  next = fn;
};
let clock = 0;
// One redraw, a sixtieth of a second after the last.
const frame = async () => {
  const fn = next;
  next = null;
  clock += 1000 / 60;
  fn?.(clock);
};
const ctx = new Proxy({}, { get: (o, k) => o[k] || (() => {}), set: (o, k, v) => ((o[k] = v), true) });
window.HTMLCanvasElement.prototype.getContext = () => ctx;
window.HTMLCanvasElement.prototype.setPointerCapture = () => {};
window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 700 });
// Sound must never start by itself: count every audio context made.
let contexts = 0;
globalThis.AudioContext = class {
  constructor() {
    contexts++;
  }
};
await import("../src/wavelab/app.js");
// ---- checks ----
// Everything below uses only DOM calls, `assert`, `await frame()` and the
// `contexts` count (0 unless a test page provides it), so it can also be
// run inside a real browser.
{
  const $ = (id) => document.getElementById(id),
    text = (id) => $(id)?.textContent.replace(/\s+/g, " ").trim() ?? "",
    pressed = (el) => el.getAttribute("aria-pressed") === "true",
    loadPreset = async (id) => {
      $("presets-toggle").click();
      document.querySelector(`[data-preset="${id}"]`).click();
      for (let i = 0; i < 3; i++) await frame();
    };
  await frame();
  assert.equal(document.body.dataset.page, "waves");
  // The page opens on the rays view with the converging-lens preset.
  assert.ok(pressed($("mode-rays")));
  assert.equal(text("reading-v"), "0.15 m");
  assert.equal(text("reading-v-formula"), "0.15 m");
  assert.equal(text("reading-m"), "−0.5");
  assert.equal(text("reading-kind"), "real, inverted");
  // Time controls belong to the waves and sound views only.
  assert.ok($("pause").hidden && $("warp").hidden);
  assert.ok(!$("convention").hidden, "the sign convention is stated in the rays view");

  // Every preset loads in its own view, and the readings it names appear.
  const expected = {
    concave: ["reading-v", "0.3 m"],
    convex: ["reading-v", "−0.15 m"],
    magnifier: ["reading-v", "−0.1 m"],
    diverging: ["reading-m", "0.25"],
    telescope: ["reading-angular-magnification", "−10×"],
    microscope: ["reading-M", "−50×"],
    guitar: ["reading-f1", "203.5 Hz"],
    "open-pipe": ["reading-f1", "343.2 Hz, λ = 1 m"],
    "closed-pipe": ["reading-f1", "171.6 Hz, λ = 2 m"],
    beats: ["reading-beat", "4 Hz"],
    decibels: ["reading-beta", "89.01 dB"],
    approach: ["reading-approach", "547.9 Hz"],
    ambulance: ["reading-recede", "652.5 Hz"],
  };
  const ids = [...document.querySelectorAll("[data-preset]")].map((b) => b.dataset.preset);
  assert.ok(ids.length >= 30, `${ids.length} presets`);
  for (const id of ids) {
    await loadPreset(id);
    const mode = ["rays", "waves", "sound"].find((m) => pressed($("mode-" + m)));
    assert.ok(mode, id + ": a view is shown");
    if (expected[id]) assert.equal(text(expected[id][0]), expected[id][1], id);
    if (mode === "waves") assert.equal(text("reading-cells") !== "", true, id + ": cells per wavelength shown");
    // Loading a sound preset never plays it.
    assert.equal(text("audio-play"), "Play", id);
  }
  assert.equal(contexts, 0, "no audio context until Play is pressed");

  // The waves view: the tank, its resolution and the label switch.
  await loadPreset("double-slit");
  assert.ok(!$("tank-panel").hidden);
  assert.equal(text("reading-cells"), "20");
  assert.ok(text("tank-note").includes("500 nm"), "lengths as light");
  const lengths = [...document.querySelectorAll("#display-form select")].find((s) => [...s.options].some((o) => o.value === "sound"));
  lengths.value = "sound";
  lengths.dispatchEvent(new window.Event("change", { bubbles: true }));
  await frame();
  assert.ok(text("tank-note").includes("343 mm"), "lengths as sound: 1 λ = 343 mm at 1 kHz");
  // The 20-cells rule is enforced: 10 cells per wavelength is refused.
  const cells = [...document.querySelectorAll("#tank-form input")][2];
  cells.value = "10";
  cells.dispatchEvent(new window.Event("change", { bubbles: true }));
  await frame();
  assert.equal(text("reading-cells"), "20", "the coarser grid was refused");

  // Placing something returns to Grab and selects it.
  $("mode-rays").click();
  await frame();
  document.querySelector('[data-add="block"]').click();
  assert.equal(text("tool-name"), "Block");
  const canvas = $("canvas"),
    r = canvas.getBoundingClientRect();
  for (const type of ["pointerdown", "pointerup"])
    canvas.dispatchEvent(new window.PointerEvent(type, { clientX: r.left + 300, clientY: r.top + 400, button: 0, pointerId: 1, bubbles: true }));
  await frame();
  assert.equal(text("tool-name"), "Grab");
  assert.equal(text("selected-name"), "Block");
  assert.ok(!$("selection").hidden);

  // The volume control starts low.
  $("mode-sound").click();
  await frame();
  assert.equal($("volume").value, "20");
  assert.equal(text("audio-play"), "Play");
  assert.equal(contexts, 0);
}
console.log("wavelab smoke: ok");
