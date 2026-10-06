import { Window } from "happy-dom";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import Matter from "../vendor/matter.js";
const window = new Window({ url: "http://localhost:3000" });
window.document.write(
  await readFile(new URL("../index.html", import.meta.url), "utf8"),
);
let nextFrame;
for (const key of ["document", "localStorage", "Option"])
  globalThis[key] = window[key];
globalThis.Option = function (text, value) {
  const o = document.createElement("option");
  o.textContent = text;
  o.value = value;
  return o;
};
globalThis.setTimeout = window.setTimeout.bind(window);
globalThis.clearTimeout = window.clearTimeout.bind(window);
globalThis.window = window;
globalThis.Matter = Matter;
globalThis.requestAnimationFrame = (fn) => {
  nextFrame = fn;
};
const noop = new Proxy(
  {},
  {
    get: (o, key) => o[key] || (() => {}),
    set: (o, key, value) => ((o[key] = value), true),
  },
);
window.HTMLCanvasElement.prototype.getContext = () => noop;
window.HTMLCanvasElement.prototype.setPointerCapture = () => {};
window.HTMLCanvasElement.prototype.getBoundingClientRect = function () {
  return {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width: 800,
    height: this.id === "graph" ? 122 : 450,
  };
};
Object.defineProperty(window.HTMLCanvasElement.prototype, "clientWidth", {
  get: () => 800,
});
Object.defineProperty(window.HTMLCanvasElement.prototype, "clientHeight", {
  get() {
    return this.id === "graph" ? 122 : 450;
  },
});
await import("../src/app.js");
const $ = (id) => document.getElementById(id);
const snapshot = () => JSON.parse(localStorage.getItem("physics-sim-scene-v1"));
const change = (el, value) => {
  el.value = value;
  el.dispatchEvent(new window.Event("change"));
};
let now = 100;
const frames = (n) => {
  for (let i = 0; i < n; i++) {
    now += 1000 / 60;
    nextFrame(now);
  }
};
$("speed").value = "1";
frames(1);
assert.equal($("selection").value, "ball");
assert.equal($("speed-readout").textContent, "10.00");
$("play").click();
frames(60);
assert.match($("time").textContent, /0\.9/);
assert.equal($("mode").textContent, "RUNNING");
assert.equal($("csv").disabled, false);
$("play").click();
const paused = $("time").textContent;
frames(20);
assert.equal($("time").textContent, paused);
$("reset").click();
frames(1);
assert.equal($("time").textContent, "0.00 s");
assert.equal($("csv").disabled, true);
change(document.querySelector('[aria-label="Mass"]'), "2");
assert.equal(snapshot().bodies[1].mass, 2);
$("undo").click();
assert.equal(snapshot().bodies[1].mass, 1);
$("redo").click();
assert.equal(snapshot().bodies[1].mass, 2);
change(document.querySelector('[aria-label="Mass"]'), "-1");
assert.equal(snapshot().bodies[1].mass, 2);
[...document.querySelectorAll("button")]
  .find((b) => b.textContent === "Duplicate")
  .click();
assert.equal(snapshot().bodies.length, 3);
[...document.querySelectorAll("button")]
  .find((b) => b.textContent === "Delete")
  .click();
assert.equal(snapshot().bodies.length, 2);
$("undo").click();
assert.equal(snapshot().bodies.length, 3);
document.querySelector('[data-preset="Pendulum"]').click();
assert.equal(snapshot().title, "Pendulum");
assert.equal(snapshot().links.length, 1);
change($("selection"), "pivot");
assert.ok(document.querySelector('[aria-label="Rest / max length"]'));
change(document.querySelector('[aria-label="Rest / max length"]'), "4");
assert.equal(snapshot().links[0].length, 4);
$("blank").click();
assert.equal(snapshot().bodies.length, 1);
document.querySelector('[data-tool="circle"]').click();
$("canvas").dispatchEvent(
  new window.PointerEvent("pointerdown", {
    button: 0,
    clientX: 400,
    clientY: 200,
    pointerId: 1,
  }),
);
$("canvas").dispatchEvent(
  new window.PointerEvent("pointerup", {
    button: 0,
    clientX: 400,
    clientY: 200,
    pointerId: 1,
  }),
);
assert.equal(snapshot().bodies.length, 2);
$("step").click();
frames(1);
assert.equal($("mode").textContent, "PAUSED");
assert.notEqual($("time").textContent, "0.00 s");
change($("gravity"), "0");
assert.equal(snapshot().gravity, 0);
frames(1);
assert.equal($("time").textContent, "0.01 s");
// Additional v0.2 interactions.
const pointer = (type, x, y) =>
  $("canvas").dispatchEvent(
    new window.PointerEvent(type, {
      button: 0,
      clientX: x,
      clientY: y,
      pointerId: 1,
    }),
  );
const selectTool = (name) =>
  document.querySelector('[data-tool="' + name + '"]').click();
const clickAt = (x, y) => {
  pointer("pointerdown", x, y);
  pointer("pointerup", x, y);
};
$("blank").click();
selectTool("circle");
clickAt(400, 200);
selectTool("select");
let before = snapshot().bodies.find((b) => !b.fixed);
pointer("pointerdown", 400, 200);
pointer("pointermove", 450, 175);
pointer("pointerup", 450, 175);
let after = snapshot().bodies.find((b) => !b.fixed);
assert.ok(after.x > before.x);
assert.ok(after.y > before.y);
$("undo").click();
assert.equal(snapshot().bodies.find((b) => !b.fixed).x, before.x);
selectTool("velocity");
pointer("pointerdown", 400, 200);
pointer("pointermove", 500, 200);
pointer("pointerup", 500, 200);
assert.ok(snapshot().bodies.find((b) => !b.fixed).vx > 0);
selectTool("resize");
const radius = snapshot().bodies.find((b) => !b.fixed).radius;
pointer("pointerdown", 410, 200);
pointer("pointermove", 420, 200);
pointer("pointerup", 420, 200);
assert.ok(snapshot().bodies.find((b) => !b.fixed).radius > radius);
$("play").click();
frames(30);
$("play").click();
$("capture").click();
frames(1);
assert.equal($("time").textContent, "0.00 s");
assert.ok(snapshot().bodies.find((b) => !b.fixed).x > before.x);
document.querySelector('[data-preset="Constant acceleration"]').click();
assert.ok(document.querySelector('[aria-label="Equation ax"]'));
const eq = document.querySelector('[aria-label="Equation ax"]');
eq.value = "3";
[...document.querySelectorAll("button")]
  .find((b) => b.textContent === "Apply equations")
  .click();
assert.equal(snapshot().bodies[0].motion.ax, "3");
document.querySelector('[aria-label="Equation ax"]').value = "window.alert(1)";
[...document.querySelectorAll("button")]
  .find((b) => b.textContent === "Apply equations")
  .click();
assert.equal(snapshot().bodies[0].motion.ax, "3");
$("toggle-graph").click();
assert.ok(document.body.classList.contains("show-graph"));
$("blank").click();
selectTool("ring");
clickAt(400, 200);
assert.equal(snapshot().bodies.at(-1).shape, "ring");
selectTool("stroke");
pointer("pointerdown", 300, 220);
pointer("pointermove", 350, 250);
pointer("pointermove", 400, 220);
pointer("pointerup", 400, 220);
assert.equal(snapshot().bodies.at(-1).shape, "stroke");
assert.ok(snapshot().bodies.at(-1).points.length >= 3);
selectTool("polygon");
pointer("pointerdown", 300, 150);
pointer("pointermove", 350, 180);
pointer("pointermove", 400, 150);
pointer("pointerup", 400, 150);
assert.equal(snapshot().bodies.at(-1).shape, "polygon");
// Context property menu: hit detection, edit persistence, dismissals and actions.
$("blank").click();
selectTool("circle");
clickAt(400, 200);
selectTool("select");
const rightClick = (x, y) => {
  const e = new window.MouseEvent("contextmenu", {
    clientX: x,
    clientY: y,
    button: 2,
    bubbles: true,
    cancelable: true,
  });
  $("canvas").dispatchEvent(e);
  return e;
};
const ctxMenu = () => document.getElementById("object-menu");
$("play").click();
frames(1);
assert.equal(rightClick(400, 200).defaultPrevented, true);
assert.equal(ctxMenu().hidden, false);
assert.equal($("play").textContent, "Ⅱ Pause");
assert.equal(ctxMenu().querySelector('[aria-label="Mass"]').value, "1");
change(ctxMenu().querySelector('[aria-label="Mass"]'), "4");
assert.equal(snapshot().bodies.find((b) => !b.fixed).mass, 4);
assert.equal(ctxMenu().hidden, false);
change(ctxMenu().querySelector('[aria-label="Mass"]'), "-2");
assert.equal(snapshot().bodies.find((b) => !b.fixed).mass, 4);
ctxMenu().querySelector('[aria-label="Object name"]').value =
  "Right-click ball";
ctxMenu()
  .querySelector('[aria-label="Object name"]')
  .dispatchEvent(new window.Event("change"));
assert.equal(
  document.getElementById("object-menu-title").textContent,
  "Right-click ball",
);
ctxMenu().dispatchEvent(
  new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
);
assert.equal(ctxMenu().hidden, true);
assert.equal(rightClick(10, 10).defaultPrevented, false);
assert.equal(ctxMenu().hidden, true);
rightClick(400, 200);
document.body.dispatchEvent(
  new window.PointerEvent("pointerdown", { bubbles: true }),
);
assert.equal(ctxMenu().hidden, true);
$("canvas").dispatchEvent(
  new window.KeyboardEvent("keydown", {
    key: "F10",
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  }),
);
assert.equal(ctxMenu().hidden, false);
[...ctxMenu().querySelectorAll("button")]
  .find((b) => b.textContent === "Duplicate")
  .click();
assert.equal(snapshot().bodies.length, 3);
assert.equal(ctxMenu().hidden, true);
$("undo").click();
rightClick(400, 200);
[...ctxMenu().querySelectorAll("button")]
  .find((b) => b.textContent === "Delete")
  .click();
assert.equal(snapshot().bodies.length, 1);
assert.equal(ctxMenu().hidden, true);
$("undo").click();
rightClick(400, 200);
document.body.classList.add("hide-inspector");
[...ctxMenu().querySelectorAll("button")]
  .find((b) => b.textContent === "Open in inspector ↗")
  .click();
assert.equal(document.body.classList.contains("hide-inspector"), false);
assert.equal(ctxMenu().hidden, true);
// Live edits preserve simulation time and keep recording.
document.querySelector('[data-preset="Uniform motion"]').click();
$("play").click();
frames(60);
const liveTime = $("time").textContent,
  liveX = Number($("x-readout").textContent);
change(document.querySelector('#properties [aria-label="Mass"]'), "3");
assert.equal($("play").textContent, "Ⅱ Pause");
frames(1);
assert.ok(
  Number.parseFloat($("time").textContent) >= Number.parseFloat(liveTime),
);
assert.ok(Number($("x-readout").textContent) >= liveX);
const nextTime = $("time").textContent;
change($("gravity"), "2");
assert.equal($("play").textContent, "Ⅱ Pause");
frames(1);
assert.ok(
  Number.parseFloat($("time").textContent) >= Number.parseFloat(nextTime),
);
change(document.querySelector('#properties [aria-label="Velocity x"]'), "0");
frames(1);
assert.equal($("speed-readout").textContent === "NaN", false);
assert.equal(snapshot().bodies[0].vx, 0);
assert.equal($("play").textContent, "Ⅱ Pause");
console.log(
  "PASS: real-time mass, gravity and velocity edits preserve playback and elapsed time.",
);
console.log(
  "PASS: context menu opens on body, preserves playback, edits properties, rejects invalid values, supports keyboard/outside dismissal, duplicate/delete, undo and inspector action.",
);
console.log(
  "PASS: original editor controls plus mouse move, undo move, velocity drag, resize, capture current state, motion equation apply/reject, graph toggle, hollow ring, drawn path and drawn solid.",
);
await window.happyDOM.close();
