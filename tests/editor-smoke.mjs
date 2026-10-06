import { Window } from "happy-dom";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import Matter from "../vendor/matter.js";
const window = new Window({ url: "http://localhost:3000" });
window.document.write(
  await readFile(new URL("../index.html", import.meta.url), "utf8"),
);
for (const key of ["document"]) globalThis[key] = window[key];
globalThis.window = window;
globalThis.Matter = Matter;
globalThis.setTimeout = window.setTimeout.bind(window);
globalThis.clearTimeout = window.clearTimeout.bind(window);
let next;
globalThis.requestAnimationFrame = (fn) => {
  next = fn;
};
const ctx = new Proxy(
  {},
  { get: (o, k) => o[k] || (() => {}), set: (o, k, v) => ((o[k] = v), true) },
);
window.HTMLCanvasElement.prototype.getContext = () => ctx;
window.HTMLCanvasElement.prototype.setPointerCapture = () => {};
window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
  left: 0,
  top: 0,
  width: 1000,
  height: 700,
});
await import("../src/app.js");
const $ = (id) => document.getElementById(id),
  canvas = $("canvas");
let now = 100;
const frames = (n) => {
  for (let i = 0; i < n; i++) {
    now += 1000 / 60;
    next(now);
  }
};
const tool = (name) => document.querySelector(`[data-tool=${name}]`).click();
const pointer = (type, x, y, ctrlKey = false, altKey = false) =>
  canvas.dispatchEvent(
    new window.PointerEvent(type, {
      clientX: x,
      clientY: y,
      button: 0,
      pointerId: 1,
      ctrlKey,
      altKey,
      bubbles: true,
    }),
  );
const click = (x, y) => {
  pointer("pointerdown", x, y);
  pointer("pointerup", x, y);
};
const menu = (x, y) => {
  const e = new window.MouseEvent("contextmenu", {
    clientX: x,
    clientY: y,
    button: 2,
    bubbles: true,
    cancelable: true,
  });
  canvas.dispatchEvent(e);
  return e;
};
frames(1);
assert.deepEqual(
  [...document.querySelectorAll("[data-tool]")].map((b) => b.dataset.tool),
  ["grab", "select", "ball", "block", "spring", "rod", "belt", "pulley"],
);
assert.equal(document.querySelector("#graph"), null);
assert.equal(document.querySelector("#properties"), null);
assert.equal($("pause").textContent, "Ⅱ Pause");
tool("ball");
click(500, 250);
assert.equal($("selection").hidden, false);
assert.equal($("selected-name").textContent, "Ball");
assert.equal(menu(500, 250).defaultPrevented, true);
assert.equal($("material-menu").hidden, false);
assert.deepEqual(
  [...$("constants").querySelectorAll("input[type=number]")].map(
    (i) => i.dataset.constant,
  ),
  ["mass", "friction", "restitution", "linearDamping", "angularDamping"],
);
assert.equal($("constants").querySelector('[aria-label="Position x"]'), null);
assert.equal($("constants").querySelector('[aria-label="Velocity x"]'), null);
let mass = $("constants").querySelector("[aria-label=Mass]");
mass.value = "2";
mass.dispatchEvent(new window.Event("change"));
assert.equal(mass.value, "2");
mass.value = "-1";
mass.dispatchEvent(new window.Event("change"));
assert.equal(mass.value, "2");
assert.equal($("pause").textContent, "Ⅱ Pause");
$("close-menu").click();
assert.equal($("material-menu").hidden, true);
const before = Number.parseFloat($("time").textContent);
pointer("pointerdown", 500, 250);
for (let i = 0; i < 30; i++) {
  pointer("pointermove", 500 + i * 4, 250);
  frames(1);
}
pointer("pointerup", 616, 250);
assert.equal($("pause").textContent, "Ⅱ Pause");
assert.ok(Number.parseFloat($("time").textContent) > before);
// Create a block and test lock controls and Ctrl-grab in a known view.
tool("block");
click(300, 250);
$("lock-position").checked = true;
$("lock-position").dispatchEvent(new window.Event("change"));
assert.equal($("lock-rotation").checked, false);
$("lock-position").checked = false;
$("lock-position").dispatchEvent(new window.Event("change"));
$("lock-rotation").checked = true;
$("lock-rotation").dispatchEvent(new window.Event("change"));
assert.equal($("lock-position").checked, false);
pointer("pointerdown", 300, 250);
pointer("pointermove", 350, 300, true);
frames(5);
assert.match($("snap-status").textContent, /SNAP/);
pointer("pointerup", 350, 300, true);
assert.equal($("pause").textContent, "Ⅱ Pause");
// Connect the known snapped block to a fixed point, edit spring constants.
tool("spring");
click(350, 100);
click(366.6667, 300);
assert.equal($("selected-name").textContent, "Spring");
assert.equal(menu(360, 200).defaultPrevented, true);
assert.equal(
  $("constants").querySelector('[aria-label="Spring stiffness"]').value,
  "20",
);
$("close-menu").click();
$("delete").click();
assert.equal($("selection").hidden, true);
$("clear").click();
assert.equal($("time").textContent === "NaN", false);
assert.equal($("selection").hidden, true);
assert.equal(menu(500, 250).defaultPrevented, false);
// Paused pointer input must immediately move and resize an actual rod.
$("pause").click();
tool("ball");
click(500, 400);
tool("rod");
click(500, 200);
click(500, 400);
pointer("pointerdown", 500, 400);
pointer("pointermove", 700, 400, false, true);
pointer("pointerup", 700, 400, false, true);
menu(600, 300);
const rodLength =
  $("constants").querySelector('[aria-label="Length"]') ||
  $("constants").querySelector("input");
assert.ok(Number(rodLength.value) > 4);
$("close-menu").click();
menu(700, 400);
assert.ok($("constants").querySelector('[aria-label="Mass"]'));
assert.equal($("pause").textContent.includes("Run"), true);
$("close-menu").click();
// Keyboard controls, new guide controls and direct resize input.
const key = (k, type = "keydown", extra = {}) =>
  canvas.dispatchEvent(
    new window.KeyboardEvent(type, {
      key: k,
      code: k === " " ? "Space" : undefined,
      bubbles: true,
      cancelable: true,
      ...extra,
    }),
  );
$("clear").click();
canvas.focus();
key(" ");
assert.equal($("pause").textContent, "Ⅱ Pause");
key(" ", "keydown", { repeat: true });
assert.equal($("pause").textContent, "Ⅱ Pause");
key(" ");
assert.equal($("pause").textContent, "▶ Run");
key("b");
click(500, 350);
key("r");
pointer("pointerdown", 520, 350);
pointer("pointermove", 550, 350, true);
pointer("pointerup", 550, 350, true);
key("r", "keyup");
assert.match($("dimensions").textContent, /1.50/);
key("v");
assert.equal($("vectors").checked, true);
key("s");
click(300, 350);
click(500, 350);
$("lock-angle").checked = true;
$("lock-angle").dispatchEvent(new window.Event("change"));
assert.equal($("lock-angle").parentElement.hidden, false);
assert.equal($("lock-angle").checked, true);
key("?");
assert.equal($("keys-panel").hidden, false);
key("Escape");
assert.equal($("keys-panel").hidden, true);
// A material input must keep keyboard shortcuts as text entry.
menu(500, 350);
mass = $("constants").querySelector('[aria-label="Mass"]');
mass.focus();
mass.dispatchEvent(
  new window.KeyboardEvent("keydown", {
    key: " ",
    code: "Space",
    bubbles: true,
    cancelable: true,
  }),
);
assert.equal($("pause").textContent, "▶ Run");
$("close-menu").click();
$("clear").click();
canvas.focus();
key("b");
click(350, 350);
key("b");
click(650, 350);
key("t");
click(350, 350);
click(650, 350);
assert.equal($("selected-name").textContent, "Belt");
assert.equal($("belt-speed-label").hidden, false);
$("crossed-belt").checked = true;
$("crossed-belt").dispatchEvent(new window.Event("change"));
assert.equal($("crossed-belt").checked, true);
$("belt-motor").checked = true;
$("belt-motor").dispatchEvent(new window.Event("change"));
key(" ");
frames(5);
key(" ");
key("Delete");
assert.equal($("selection").hidden, true);
// Resize a wheel and create a guided pulley through three actual clicks.
$("clear").click();
key("b");
click(500, 180);
key("r");
pointer("pointerdown", 520, 180);
pointer("pointermove", 600, 180);
pointer("pointerup", 600, 180);
key("r", "keyup");
key("n");
click(400, 400);
key("n");
click(600, 400);
key("u");
click(400, 400);
click(500, 180);
click(600, 400);
assert.equal($("selected-name").textContent, "Pulley");
frames(1);
// Build the reference layout: spring-guided horizontal block, angled cable,
// wheel, hanging block. Existing spring connections must remain acceptable.
$("clear").click();
canvas.focus();
key("n");
click(300, 260);
key("s");
click(160, 260);
click(300, 260);
$("lock-angle").checked = true;
$("lock-angle").dispatchEvent(new window.Event("change"));
key("b");
click(500, 290);
key("n");
click(530, 440);
key("u");
click(300, 260);
click(500, 290);
click(530, 440);
assert.equal($("selected-name").textContent, "Pulley");
assert.equal($("reverse-wrap").parentElement.hidden, false);
$("reverse-wrap").checked = true;
$("reverse-wrap").dispatchEvent(new window.Event("change"));
$("reverse-wrap").checked = false;
$("reverse-wrap").dispatchEvent(new window.Event("change"));
menu(300, 260);
assert.ok($("constants").querySelector('[aria-label="Mass"]'));
$("close-menu").click();
pointer("pointerdown", 530, 440);
pointer("pointermove", 600, 420);
pointer("pointerup", 600, 420);
menu(600, 420);
assert.ok($("constants").querySelector('[aria-label="Mass"]'));
$("close-menu").click();
click(500, 290);
assert.equal($("lock-position").checked, true);
$("lock-position").checked = false;
$("lock-position").dispatchEvent(new window.Event("change"));
assert.equal($("lock-position").checked, false);
key(" ");
frames(10);
key(" ");
// Marquee selects only enclosed/intersecting bodies; group movement and deletion.
$("clear").click();
canvas.focus();
key("b");
click(300, 300);
key("n");
click(500, 300);
key("b");
click(750, 300);
key("q");
pointer("pointerdown", 250, 250);
pointer("pointermove", 550, 350);
pointer("pointerup", 550, 350);
assert.equal($("selected-name").textContent, "2 objects selected");
pointer("pointerdown", 300, 300);
pointer("pointermove", 350, 350);
pointer("pointerup", 350, 350);
assert.equal($("selected-name").textContent, "2 objects selected");
menu(350, 350);
assert.ok($("constants").querySelector('[aria-label="Mass"]'));
const massRange = $("constants").querySelector('[aria-label="Mass slider"]');
massRange.value = "3";
massRange.dispatchEvent(new window.Event("input"));
assert.equal($("constants").querySelector('[aria-label="Mass"]').value, "3");
const massNumber = $("constants").querySelector('[aria-label="Mass"]');
massNumber.value = "4.5";
massNumber.dispatchEvent(new window.Event("change"));
assert.equal(massRange.value, "4.5");
$("close-menu").click();
menu(550, 350);
assert.ok($("constants").querySelector('[aria-label="Mass"]'));
$("close-menu").click();
key("q");
pointer("pointerdown", 250, 250);
pointer("pointermove", 600, 420);
pointer("pointerup", 600, 420);
key("Delete");
assert.equal($("selection").hidden, true);
menu(750, 300);
assert.ok($("constants").querySelector('[aria-label="Mass"]'));
$("close-menu").click();
$("settings-toggle").click();
assert.equal($("settings-panel").hidden, false);
$("range-gravity").value = "0";
$("range-gravity").dispatchEvent(new window.Event("input"));
assert.equal($("setting-gravity").value, "0");
$("setting-airResistance").value = "2";
$("setting-airResistance").dispatchEvent(new window.Event("change"));
assert.equal($("range-airResistance").value, "2");
$("setting-gravity").value = "-500";
$("setting-gravity").dispatchEvent(new window.Event("change"));
assert.equal($("setting-gravity").value, "0");
$("clear").click();
$("settings-toggle").click();
$("settings-toggle").click();
assert.equal($("setting-airResistance").value, "2");
$("reset-settings").click();
assert.equal($("setting-gravity").value, "9.81");
assert.equal($("setting-airResistance").value, "0");
$("close-settings").click();
console.log(
  "PASS: creation, live constants, locks, drag/throw, snapping, keyboard focus/repeat handling, resizing, spring guide, belt drive/crossing, pulley creation, spring–Atwood composition, angled cable drag, movable axle, box selection, group movement/deletion, paired sliders, live settings and defaults.",
);
await window.happyDOM.close();
