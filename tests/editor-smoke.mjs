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
const pointer = (type, x, y, ctrlKey = false) =>
  canvas.dispatchEvent(
    new window.PointerEvent(type, {
      clientX: x,
      clientY: y,
      button: 0,
      pointerId: 1,
      ctrlKey,
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
  ["grab", "ball", "block", "spring", "rod"],
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
  [...$("constants").querySelectorAll("input")].map((i) => i.dataset.constant),
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
console.log(
  "PASS: minimal tools; constants-only menu; live validation; grab does not pause; separate locks; Ctrl snapping; spring creation and properties; deletion and clear.",
);
await window.happyDOM.close();
