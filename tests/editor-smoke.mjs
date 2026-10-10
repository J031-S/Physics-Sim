import { Window } from "happy-dom";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import Matter from "../vendor/matter.js";
import { presets } from "../src/presets.js";
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
const clearScene = () => {
  $("clear").click();
  $("clear-yes").click();
};
const pointer = (
  type,
  x,
  y,
  ctrlKey = false,
  altKey = false,
  shiftKey = false,
) =>
  canvas.dispatchEvent(
    new window.PointerEvent(type, {
      clientX: x,
      clientY: y,
      button: 0,
      pointerId: 1,
      ctrlKey,
      altKey,
      shiftKey,
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
  [
    "grab",
    "select",
    "impulse",
    "pan",
    "ball",
    "block",
    "wedge",
    "spring",
    "rod",
    "belt",
    "pulley",
    "electric",
    "magnetic",
  ],
);
assert.ok($("graph-canvas"), "graph panel exists");
assert.equal(document.querySelector("#properties"), null);
assert.equal($("pause").textContent, "Pause");
tool("ball");
click(500, 250);
assert.equal($("selection").hidden, false);
assert.equal($("selected-name").textContent, "Ball");
// Compact panel: icon buttons in the header, lock toggles on one row.
assert.ok($("delete").closest(".selection-header"));
assert.equal($("delete").dataset.iconOnly, "true");
assert.equal($("lock-position").parentElement.hidden, false);
assert.equal($("lock-caption").hidden, false);
assert.equal(document.querySelector(".selection-row").hidden, false);
assert.equal(menu(500, 250).defaultPrevented, true);
assert.equal($("material-menu").hidden, false);
// Compact rows: label, slider and number on one row; help as a description.
{
  const mass = $("constants").querySelector('[data-constant="mass"]'),
    row = mass.closest(".prop-row");
  assert.ok(row.querySelector('[data-slider="mass"]'));
  assert.equal(row.querySelector("label").htmlFor, mass.id);
  assert.equal(row.querySelector("label").title, "Inertial mass.");
  assert.equal(
    document.getElementById(mass.getAttribute("aria-describedby")).textContent,
    "Inertial mass.",
  );
  assert.equal($("constants").querySelector("small"), null);
  const charge = $("constants").querySelector('[data-slider="charge"]');
  assert.ok(charge.closest(".zero-slider"));
  assert.equal(row.querySelector(".zero-slider"), null);
  charge.value = "3";
  charge.dispatchEvent(new window.Event("input"));
  assert.equal(
    $("constants").querySelector('[data-constant="charge"]').value,
    "0",
  );
}
assert.deepEqual(
  [...$("constants").querySelectorAll("input[type=number]")].map(
    (i) => i.dataset.constant,
  ),
  [
    "mass",
    "charge",
    "friction",
    "restitution",
    "linearDamping",
    "angularDamping",
  ],
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
assert.equal($("pause").textContent, "Pause");
$("close-menu").click();
assert.equal($("material-menu").hidden, true);
const before = Number.parseFloat($("time").textContent);
pointer("pointerdown", 500, 250);
for (let i = 0; i < 30; i++) {
  pointer("pointermove", 500 + i * 4, 250);
  frames(1);
}
pointer("pointerup", 616, 250);
assert.equal($("pause").textContent, "Pause");
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
canvas.dispatchEvent(
  new window.KeyboardEvent("keydown", { key: "z", bubbles: true }),
);
pointer("pointerdown", 300, 250);
pointer("pointermove", 350, 300);
frames(5);
assert.match($("snap-status").textContent, /SNAP/);
pointer("pointerup", 350, 300);
canvas.dispatchEvent(
  new window.KeyboardEvent("keydown", { key: "z", bubbles: true }),
);
assert.equal($("pause").textContent, "Pause");
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
clearScene();
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
// Edit tools on the left bar; other categories behind drop-downs.
assert.deepEqual(
  [...document.querySelectorAll(".edit-tools [data-tool]")].map(
    (b) => b.dataset.tool,
  ),
  ["grab", "select", "impulse", "pan"],
);
for (const b of document.querySelectorAll("[data-tool]"))
  assert.ok(["true", "false"].includes(b.getAttribute("aria-pressed")));
$("category-bodies").click();
assert.equal($("menu-bodies").hidden, false);
assert.equal($("category-bodies").getAttribute("aria-expanded"), "true");
$("category-fields").click();
assert.equal($("menu-bodies").hidden, true, "one drop-down at a time");
assert.equal($("menu-fields").hidden, false);
document.querySelector('[data-tool="magnetic"]').click();
assert.equal($("menu-fields").hidden, true, "choosing a tool closes it");
assert.ok($("category-fields").classList.contains("active"));
assert.equal($("category-fields").dataset.icon, "magnetic");
assert.equal(
  document.querySelector('[data-tool="magnetic"]').getAttribute("aria-pressed"),
  "true",
);
$("category-connections").click();
document.activeElement.dispatchEvent(
  new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
);
assert.equal($("menu-connections").hidden, true);
assert.ok(
  $("category-fields").classList.contains("active"),
  "Escape keeps tool",
);
$("category-connections").click();
document.activeElement.dispatchEvent(
  new window.KeyboardEvent("keydown", { key: "s", bubbles: true }),
);
assert.ok(
  $("category-connections").classList.contains("active"),
  "shortcuts work while a drop-down is open",
);
assert.equal($("menu-connections").hidden, true);
assert.ok(!$("category-fields").classList.contains("active"));
key("g");
clearScene();
canvas.focus();
key(" ");
assert.equal($("pause").textContent, "Pause");
key(" ", "keydown", { repeat: true });
assert.equal($("pause").textContent, "Pause");
key(" ");
assert.equal($("pause").textContent, "Run");
key("b");
click(500, 350);
key("z");
key("r");
pointer("pointerdown", 520, 350);
pointer("pointermove", 550, 350);
pointer("pointerup", 550, 350);
key("r", "keyup");
assert.match($("dimensions").textContent, /1.50/);
key("z");
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
assert.equal($("pause").textContent, "Run");
$("close-menu").click();
clearScene();
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
clearScene();
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
clearScene();
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
clearScene();
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
// Clear restores default settings as well as emptying the scene.
clearScene();
$("settings-toggle").click();
$("settings-toggle").click();
assert.equal($("setting-airResistance").value, "0");
$("setting-airResistance").value = "2";
$("setting-airResistance").dispatchEvent(new window.Event("change"));
$("reset-settings").click();
assert.equal($("setting-gravity").value, "9.81");
assert.equal($("setting-airResistance").value, "0");
$("close-settings").click();
// Z is a persistent toggle, composes with modifiers, and does not steal reload.
canvas.focus();
key("z");
assert.equal($("setting-snapping").checked, true);
key("z", "keydown", { repeat: true });
assert.equal($("setting-snapping").checked, true);
key("z", "keydown", { ctrlKey: true });
assert.equal($("setting-snapping").checked, false);
assert.equal($("snap-toggle").checked, false);
// The view-cluster snapping toggle drives the same setting as Z.
$("snap-toggle").checked = true;
$("snap-toggle").dispatchEvent(new window.Event("change"));
assert.equal($("setting-snapping").checked, true);
assert.match($("snap-status").textContent, /SNAP ON/);
key("z");
assert.equal($("snap-toggle").checked, false);
assert.ok($("vectors").closest(".camera-controls"));
assert.ok($("force-vectors").closest(".camera-controls"));
const reload = new window.KeyboardEvent("keydown", {
  key: "r",
  ctrlKey: true,
  bubbles: true,
  cancelable: true,
});
canvas.dispatchEvent(reload);
assert.equal(reload.defaultPrevented, false);
$("settings-toggle").click();
$("range-gravity").value = ".23";
$("range-gravity").dispatchEvent(new window.Event("input"));
assert.equal($("setting-gravity").value, "0");
assert.equal($("range-gravity").value, "0");
$("setting-gravity").value = ".23";
$("setting-gravity").dispatchEvent(new window.Event("change"));
assert.equal($("setting-gravity").value, "0.23");
$("setting-walls").checked = true;
$("setting-walls").dispatchEvent(new window.Event("change"));
frames(1);
assert.equal($("setting-walls").checked, true);
$("setting-snapping").checked = true;
$("setting-snapping").dispatchEvent(new window.Event("change"));
assert.match($("snap-status").textContent, /SNAP ON/);
$("reset-settings").click();
$("close-settings").click();
// Shift manually repositions a paused pin; Ctrl rotates without translating.
clearScene();
canvas.focus();
key("b");
click(400, 350);
$("lock-position").checked = true;
$("lock-position").dispatchEvent(new window.Event("change"));
pointer("pointerdown", 400, 350, false, false, true);
pointer("pointermove", 500, 350, false, false, true);
pointer("pointerup", 500, 350, false, false, true);
menu(500, 350);
assert.ok($("constants").querySelector('[aria-label="Mass"]'));
$("close-menu").click();
$("lock-rotation").checked = true;
$("lock-rotation").dispatchEvent(new window.Event("change"));
pointer("pointerdown", 520, 350, true);
pointer("pointermove", 500, 330, true);
pointer("pointerup", 500, 330, true);
assert.equal($("lock-position").checked, true);
assert.equal($("lock-rotation").checked, true);
key(" ");
pointer("pointerdown", 500, 350, false, false, true);
pointer("pointermove", 600, 350, false, false, true);
pointer("pointerup", 600, 350, false, false, true);
frames(3);
key(" ");
menu(500, 350);
assert.ok($("constants").querySelector('[aria-label="Mass"]'));
$("close-menu").click();
// Fields can be edited, moved, rotated, resized and removed without pausing.
clearScene();
canvas.focus();
key("e");
click(500, 300);
assert.equal($("selected-name").textContent, "Electric field");
assert.equal(document.querySelector(".selection-row").hidden, true);
menu(500, 300);
const change = (node, value, event = "change") => {
  node.value = value;
  node.dispatchEvent(new window.Event(event));
};
change($("constants").querySelector('[aria-label="Field shape"]'), "ellipse");
change(
  $("constants").querySelector('[aria-label="Strength slider"]'),
  "-8",
  "input",
);
assert.equal(
  $("constants").querySelector('[aria-label="Strength"]').value,
  "-8",
);
$("close-menu").click();
pointer("pointerdown", 500, 300);
pointer("pointermove", 550, 350);
pointer("pointerup", 550, 350);
key("r");
pointer("pointerdown", 620, 350);
pointer("pointermove", 650, 350);
pointer("pointerup", 650, 350);
key("r", "keyup");
menu(550, 350);
assert.ok(
  Number($("constants").querySelector('[aria-label="Width"]').value) > 4,
);
$("close-menu").click();
pointer("pointerdown", 600, 350, true);
pointer("pointermove", 550, 300, true);
pointer("pointerup", 550, 300, true);
menu(550, 350);
assert.ok(
  Math.abs(
    Number($("constants").querySelector('[aria-label="Angle"]').value) - 90,
  ) < 0.01,
);
change($("constants").querySelector('[aria-label="Field shape"]'), "circle");
assert.ok($("constants").querySelector('[aria-label="Diameter"]'));
assert.equal($("constants").querySelector('[aria-label="Height"]'), null);
$("close-menu").click();
key("Delete");
assert.equal(menu(550, 350).defaultPrevented, false);
key("m");
click(500, 300);
menu(500, 300);
assert.equal(
  $("constants").querySelector('[aria-label="Field shape"]').value,
  "circle",
);
$("close-menu").click();
frames(1);
$("settings-toggle").click();
change($("range-electricX"), "3", "input");
assert.equal($("setting-electricX").value, "0", "centred sliders snap to 0");
change($("range-electricX"), "8", "input");
assert.equal($("setting-electricX").value, "8");
change($("setting-magneticZ"), "-2");
assert.equal($("range-magneticZ").value, "-2");
change($("range-gravity"), "2.4", "input");
assert.equal($("setting-gravity").value, "0");
change($("range-gravity"), "-2.4", "input");
assert.equal($("setting-gravity").value, "0");
// Every slider centred on zero gets the tick; others do not.
for (const key of ["gravity", "electricX", "electricY", "magneticZ"])
  assert.ok($("range-" + key).closest(".zero-slider"), key);
assert.equal($("range-airResistance").closest(".zero-slider"), null);
// Arrow keys leave the detent in exact steps.
change($("range-magneticZ"), "0", "input");
$("range-magneticZ").dispatchEvent(
  new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
);
assert.equal($("setting-magneticZ").value, "0.1");
change($("range-magneticZ"), "0", "input");
{
  const sections = [...document.querySelectorAll(".settings-section")];
  assert.deepEqual(
    sections.map((d) => d.querySelector("summary").textContent),
    ["Simulation", "Fields", "Charge interactions", "Scene", "Website"],
  );
  assert.deepEqual(
    sections.map((d) => d.open),
    [true, false, false, false, false],
  );
  assert.ok(
    $("range-gravity").closest(".prop-row").contains($("setting-gravity")),
  );
  assert.match($("help-gravity").textContent, /Positive pulls down/);
}
$("range-gravity").dispatchEvent(
  new window.KeyboardEvent("keydown", {
    key: "ArrowRight",
    bubbles: true,
    cancelable: true,
  }),
);
assert.equal($("setting-gravity").value, "0.1");
$("reset-settings").click();
assert.equal($("setting-electricX").value, "0");
assert.equal($("setting-magneticZ").value, "0");
$("close-settings").click();
// Gradient controls, mixed selection, impulse options, camera and website preferences.
clearScene();
frames(1);
canvas.focus();
if ($("pause").textContent.includes("Pause")) key(" ");
key("e");
click(350, 300);
menu(350, 300);
change($("constants").querySelector('[aria-label="Falloff"]'), "inverseSquare");
change(
  $("constants").querySelector('[aria-label="Gradient shape"]'),
  "elliptical",
);
change($("constants").querySelector('[aria-label="Gradient X scale"]'), "3");
assert.equal(
  $("constants").querySelector('[aria-label="Gradient X scale"]').value,
  "3",
);
change(
  $("constants").querySelector('[aria-label="Field direction"]'),
  "radial",
);
$("close-menu").click();
key("b");
click(650, 300);
key("q");
assert.equal($("select-options").hidden, false);
assert.equal($("impulse-options").hidden, true);
$("select-fields").checked = true;
pointer("pointerdown", 180, 180);
pointer("pointermove", 720, 450);
pointer("pointerup", 720, 450);
assert.equal($("selected-name").textContent, "2 objects selected");
pointer("pointerdown", 650, 300);
pointer("pointermove", 650, 350);
pointer("pointerup", 650, 350);
menu(350, 350);
assert.equal(
  $("constants").querySelector('[aria-label="Falloff"]').value,
  "inverseSquare",
);
$("close-menu").click();
key("i");
assert.equal($("impulse-options").hidden, false);
assert.equal($("select-options").hidden, true);
change($("impulse-mode"), "velocity");
change($("impulse-gain"), "2");
pointer("pointerdown", 650, 350);
pointer("pointermove", 700, 350);
frames(1);
pointer("pointerup", 700, 350);
assert.equal($("pause").textContent, "Run");
$("settings-toggle").click();
const originalWidth = $("scene-width").value,
  originalHeight = $("scene-height").value;
$("setting-chargeInteractions").checked = true;
$("setting-chargeInteractions").dispatchEvent(new window.Event("change"));
change($("setting-coulombConstant"), "2");
assert.equal($("setting-coulombConstant").value, "2");
change($("ui-theme"), "dark");
assert.equal(document.documentElement.dataset.theme, "dark");
change($("ui-size"), "125", "input");
assert.equal($("ui-size-value").textContent, "125%");
assert.equal(
  JSON.parse(window.localStorage.getItem("physics-sim-ui")).size,
  125,
);
$("close-settings").click();
const priorZoom = $("zoom-level").textContent;
$("zoom-out").click();
frames(1);
assert.notEqual($("zoom-level").textContent, priorZoom);
key("h");
pointer("pointerdown", 500, 500);
pointer("pointermove", 560, 540);
pointer("pointerup", 560, 540);
frames(1);
$("settings-toggle").click();
assert.equal($("scene-width").value, originalWidth);
assert.equal($("scene-height").value, originalHeight);
change($("scene-width"), "30");
change($("scene-height"), "20");
$("apply-scene").click();
assert.equal($("scene-width").value, "30");
assert.equal($("scene-height").value, "20");
$("close-settings").click();
$("fit-scene").click();
frames(1);
assert.ok(Number.parseInt($("zoom-level").textContent) > 0);
// Each new scene fits initial screen bounds but retains website preferences.
clearScene();
frames(1);
$("settings-toggle").click();
assert.equal($("setting-walls").checked, true);
assert.equal($("scene-width").value, originalWidth);
assert.equal(document.documentElement.dataset.theme, "dark");
change($("ui-theme"), "light");
change($("ui-size"), "100", "input");
$("close-settings").click();
// Wedge creation and live icon previews retain controls, simulation and labels.
clearScene();
frames(1);
canvas.focus();
if ($("pause").textContent === "Pause") key(" ");
key("w");
click(500, 300);
assert.equal($("selected-name").textContent, "Wedge");
assert.equal($("lock-position").checked, true);
assert.equal($("lock-rotation").checked, true);
assert.match($("dimensions").textContent, /slope 26.6/);
menu(500, 300);
assert.match($("menu-title").textContent, /Wedge/);
change(
  $("constants").querySelector('[aria-label="Surface friction slider"]'),
  ".7",
  "input",
);
assert.equal(
  $("constants").querySelector('[aria-label="Surface friction"]').value,
  "0.7",
);
$("close-menu").click();
$("settings-toggle").click();
const wedgeButton = document.querySelector('[data-tool="wedge"]');
const initialIcon = wedgeButton.querySelector("svg").innerHTML;
for (const name of ["lucide", "tabler", "material"]) {
  change($("ui-icons"), name);
  assert.equal(wedgeButton.dataset.iconSet, name);
  assert.equal(wedgeButton.textContent, "Wedge");
  assert.equal($("pause").textContent, "Run");
  assert.ok($("pause").querySelector("svg"));
  assert.equal(
    JSON.parse(window.localStorage.getItem("physics-sim-ui")).iconSet,
    name,
  );
  for (const button of document.querySelectorAll("[data-icon]"))
    assert.ok(
      button.querySelector("svg"),
      "missing icon " + button.dataset.icon,
    );
  if (name !== "material")
    assert.notEqual(wedgeButton.querySelector("svg").innerHTML, initialIcon);
}
$("close-settings").click();
key(" ");
assert.equal($("pause").textContent, "Pause");
assert.equal($("pause").dataset.icon, "pause");
frames(2);
key(" ");
assert.equal($("pause").dataset.icon, "play");
assert.equal($("selected-name").textContent, "Wedge");
// A scene press closes open panels without placing anything.
for (const open of [
  () => $("settings-toggle").click(),
  () => $("shortcuts").click(),
  () => $("category-bodies").click(),
]) {
  clearScene();
  key("b");
  open();
  click(500, 250);
  assert.equal($("settings-panel").hidden, true);
  assert.equal($("keys-panel").hidden, true);
  assert.equal($("menu-bodies").hidden, true);
  assert.equal($("selection").hidden, true, "closing press placed nothing");
  click(500, 250);
  assert.equal($("selected-name").textContent, "Ball", "next press places");
}
// Presets, Reset, Save and Load.
{
  $("presets-toggle").click();
  assert.equal($("presets-panel").hidden, false);
  assert.equal(
    $("preset-list").querySelectorAll("button.preset").length,
    presets.length,
  );
  assert.deepEqual(
    [...$("preset-list").querySelectorAll("h3")].map((h) => h.textContent),
    [...new Set(presets.map((p) => p.group))],
  );
  assert.match(
    document.querySelector('[data-preset="free-fall"]').textContent,
    /What to look for: All three reach the floor/,
  );
  document.querySelector('[data-preset="free-fall"]').click();
  assert.equal($("presets-panel").hidden, true);
  assert.equal($("pause").textContent, "Run", "presets load paused");
  assert.equal($("reset").disabled, false);
  frames(3);
  assert.equal($("time").textContent, "0.00 s");
  key(" ");
  frames(60);
  assert.notEqual($("time").textContent, "0.00 s");
  key(" ");
  $("reset").click();
  frames(1);
  assert.equal($("time").textContent, "0.00 s", "Reset restores the start");
  assert.equal($("pause").textContent, "Run");
  // Save goes through a Blob download.
  let saved;
  const createObjectURL = URL.createObjectURL;
  URL.createObjectURL = (blob) => ((saved = blob), "blob:test");
  $("save-scene").click();
  URL.createObjectURL = createObjectURL;
  const sceneText = await saved.text();
  assert.equal(JSON.parse(sceneText).format, "physics-sim-scene");
  assert.equal(JSON.parse(sceneText).bodies.length, 3);
  // A bad file shows a readable message and leaves the scene alone.
  const load = async (text) => {
    Object.defineProperty($("scene-file"), "files", {
      configurable: true,
      value: [new File([text], "scene.json", { type: "application/json" })],
    });
    $("scene-file").dispatchEvent(new window.Event("change"));
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  key(" ");
  frames(30);
  key(" ");
  const before = $("time").textContent;
  await load("not json");
  assert.equal($("toast").textContent, "This file is not a Physics Sim scene.");
  await load(JSON.stringify({ format: "something-else" }));
  assert.equal($("toast").textContent, "This file is not a Physics Sim scene.");
  frames(1);
  assert.equal($("time").textContent, before, "bad file left scene untouched");
  await load(sceneText);
  assert.match($("toast").textContent, /Scene loaded/);
  frames(1);
  assert.equal($("time").textContent, "0.00 s");
  // The panel closes on a scene press and on Escape.
  $("presets-toggle").click();
  click(500, 250);
  assert.equal($("presets-panel").hidden, true);
  $("presets-toggle").click();
  $("preset-list")
    .querySelector("button")
    .dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  assert.equal($("presets-panel").hidden, true);
  // Reset returns to the scene as loaded, not to the last Run.
  key(" ");
  frames(30);
  key(" ");
  key(" ");
  frames(30);
  key(" ");
  $("reset").click();
  frames(1);
  assert.equal($("time").textContent, "0.00 s");
  // Clear asks first; Cancel keeps the scene.
  document.querySelector('[data-preset="cyclotron"]').click();
  $("clear").click();
  assert.equal($("clear-confirm").hidden, false);
  $("clear-no").click();
  assert.equal($("clear-confirm").hidden, true);
  assert.equal($("reset").disabled, false, "cancel kept the scene");
  // Clear forgets the reset point and restores default settings.
  assert.equal($("setting-gravity").value, "0");
  clearScene();
  assert.equal($("reset").disabled, true);
  assert.equal($("setting-gravity").value, "9.81");
  assert.equal($("setting-walls").checked, true);
}
// Net force arrows: a freely falling 1 kg ball is labelled m·g = 9.81 N.
{
  clearScene();
  if ($("pause").textContent === "Run") key(" ");
  key("b");
  click(500, 150);
  assert.equal($("selected-name").textContent, "Ball");
  for (const id of ["vectors", "force-vectors"]) {
    $(id).checked = false;
    $(id).dispatchEvent(new window.Event("change"));
  }
  assert.equal($("vector-legend").hidden, true);
  key("f");
  assert.equal($("force-vectors").checked, true);
  assert.equal($("vector-legend").hidden, false);
  assert.equal($("legend-velocity").hidden, true);
  assert.equal($("force-scale-label").hidden, false);
  const labels = [];
  ctx.fillText = (text) => labels.push(text);
  frames(8);
  assert.ok(labels.includes("9.81 N"), labels.join(", "));
  key("v");
  labels.length = 0;
  frames(1);
  assert.ok(labels.some((t) => / m\/s$/.test(t)));
  assert.equal($("legend-velocity").hidden, false);
  key("f");
  key("v");
  assert.equal($("vector-legend").hidden, true);
  delete ctx.fillText;
}
// Right-clicking the ground opens the floor material menu.
{
  clearScene();
  frames(1);
  assert.equal(menu(500, 680).defaultPrevented, true);
  assert.equal($("menu-title").textContent, "Floor");
  assert.match($("menu-note").textContent, /walls share/);
  assert.match(
    $("menu-note").textContent,
    /lower friction.*higher restitution/,
  );
  assert.equal($("selection").hidden, true, "the floor is not selected");
  const friction = $("constants").querySelector('[data-constant="friction"]'),
    restitution = $("constants").querySelector('[data-constant="restitution"]');
  assert.equal(friction.value, "0.5");
  assert.equal(restitution.value, "0");
  change(friction, "0.2");
  change(restitution, "0.9");
  $("close-menu").click();
  menu(300, 690);
  assert.equal(
    $("constants").querySelector('[data-constant="friction"]').value,
    "0.2",
  );
  assert.equal(
    $("constants").querySelector('[data-constant="restitution"]').value,
    "0.9",
  );
  // Out-of-range input is rejected and the old value restored.
  change($("constants").querySelector('[data-constant="friction"]'), "3");
  assert.equal(
    $("constants").querySelector('[data-constant="friction"]').value,
    "0.2",
  );
  $("close-menu").click();
  // Above the ground with nothing there, no menu opens.
  assert.equal(menu(500, 300).defaultPrevented, false);
}
// Readouts for the selected body and scene energy totals.
{
  clearScene();
  frames(1);
  assert.equal($("energy-panel").hidden, true, "hidden for an empty scene");
  if ($("pause").textContent === "Run") key(" ");
  key("b");
  click(500, 150);
  frames(10);
  assert.equal($("readout").hidden, false);
  assert.equal($("energy-panel").hidden, false);
  // A free-falling ball: ax = 0, ay = −g, and the units are shown.
  assert.equal($("readout-acceleration-0").textContent, "0.00");
  assert.equal($("readout-acceleration-1").textContent, "-9.81");
  assert.match($("readout-grid").textContent, /m\/s²/);
  assert.ok(Number($("readout-velocity-1").textContent) < 0);
  const ke = Number($("readout-kinetic-0").textContent),
    pe = Number($("readout-gravitational-0").textContent);
  assert.ok(
    // Each shown value is rounded to three significant figures.
    Math.abs(Number($("energy-total").textContent.split(" ")[0]) - (ke + pe)) <
      0.1,
  );
  assert.equal($("energy-elastic").textContent, "0.00");
  // Values keep three significant figures.
  for (const id of ["readout-position-0", "readout-speed-0"])
    assert.match($(id).textContent, /^-?(\d\.\d\d|\d\d\.\d|\d{3,}|0\.\d+)$/);
  // Nothing selected: the body readout hides, the scene totals stay.
  key("Escape");
  click(900, 100);
  frames(1);
  assert.equal($("readout").hidden, true);
  assert.equal($("energy-panel").hidden, false);
}
// Graph of the selected body: samples sim time, freezes when paused,
// clears when the selection changes.
{
  clearScene();
  if ($("pause").textContent === "Run") key(" ");
  key("b");
  click(500, 150);
  $("graph-panel").open = true;
  change($("graph-quantity"), "vy");
  const labels = [];
  ctx.fillText = (text) => labels.push(text);
  frames(30);
  labels.length = 0;
  frames(1);
  assert.equal($("graph-panel").hidden, false);
  assert.ok(labels.includes("Velocity vy (m/s)"));
  assert.ok(labels.includes("m/s"));
  assert.ok(labels.includes("t (s)"));
  assert.ok(!labels.includes("Run the simulation to plot."));
  // Paused: the graph keeps its data.
  key(" ");
  labels.length = 0;
  frames(5);
  assert.ok(!labels.includes("Run the simulation to plot."));
  // A new selection starts an empty graph.
  key("b");
  click(300, 150);
  labels.length = 0;
  frames(2);
  assert.ok(labels.includes("Run the simulation to plot."));
  delete ctx.fillText;
  key(" ");
  $("graph-panel").open = false;
}
// Electric energy: rows appear only with a charged body; field-region work
// is reported separately and total − supplied stays constant.
{
  clearScene();
  key("b");
  click(500, 150);
  frames(1);
  for (const el of document.querySelectorAll(
    '[data-row="electric"], .electric-row, .electric-option',
  ))
    assert.equal(el.hidden, true, "mechanics scenes hide electric rows");
  assert.equal($("field-work").hidden, true);
  $("presets-toggle").click();
  document.querySelector('[data-preset="velocity-selector"]').click();
  frames(1);
  assert.equal($("energy-electric").hidden, false);
  assert.equal($("field-work").hidden, true, "no work done yet");
  const start = Number($("energy-total").textContent.split(" ")[0]);
  key(" ");
  frames(60);
  key(" ");
  frames(1);
  assert.equal($("field-work").hidden, false);
  assert.notEqual($("energy-field-work").textContent, "0.00");
  assert.ok(
    Math.abs(Number($("energy-conserved").textContent) - start) < 0.05,
    `${$("energy-conserved").textContent} vs ${start}`,
  );
  $("presets-toggle").click();
  document.querySelector('[data-preset="coulomb-orbit"]').click();
  frames(1);
  assert.ok(Number($("energy-electric").textContent) < 0, "attraction");
  assert.equal(document.querySelector(".electric-option").hidden, false);
  assert.equal(document.querySelector('[data-row="electric"]').hidden, false);
}
// Right-clicking another object while the constants menu is open opens that
// object's menu directly (the right press is not swallowed).
{
  clearScene();
  key("b");
  click(400, 150);
  key("n");
  click(650, 150);
  const rightClick = (x, y) => {
    canvas.dispatchEvent(
      new window.PointerEvent("pointerdown", {
        clientX: x,
        clientY: y,
        button: 2,
        pointerId: 1,
        bubbles: true,
      }),
    );
    canvas.dispatchEvent(
      new window.PointerEvent("pointerup", {
        clientX: x,
        clientY: y,
        button: 2,
        pointerId: 1,
        bubbles: true,
      }),
    );
    return menu(x, y);
  };
  rightClick(400, 150);
  assert.match($("menu-title").textContent, /^Ball/);
  rightClick(650, 150);
  assert.equal($("material-menu").hidden, false);
  assert.match($("menu-title").textContent, /^Block/);
  rightClick(500, 680);
  assert.equal($("menu-title").textContent, "Floor");
  $("close-menu").click();
}
console.log(
  "PASS: gradients, mixed field/body selection, impulse controls, camera-independent bounds, persistent appearance preferences, creation, live constants, locks, drag/throw, snapping, keyboard focus/repeat handling, resizing, spring guide, belt drive/crossing, pulley creation, spring–Atwood composition, angled cable drag, movable axle, box selection, group movement/deletion, paired sliders, live settings and defaults.",
);
await window.happyDOM.close();
