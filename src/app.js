import { createObjectMenu } from "./object-menu.js";
import { motionPanel } from "./motion-panel.js";
import { hull } from "./geometry.js";
import { Simulation, DT } from "./physics.js";
import { preset, object, validateScene, clone } from "./scenes.js";
const $ = (id) => document.getElementById(id);
const canvas = $("canvas"),
  ctx = canvas.getContext("2d"),
  graph = $("graph"),
  gx = graph.getContext("2d");
const STORAGE = "physics-sim-scene-v1";
let scene = preset("Projectile"),
  sim,
  running = false,
  selected = "ball",
  tool = "select",
  pending = null;
let undo = [],
  redo = [],
  samples = [],
  trails = new Map(),
  accumulator = 0,
  lastFrame = 0,
  frameCount = 0;
let ruler = null;
let view = { scale: 60, x: 70, y: 350 },
  pointer = null,
  drag = null,
  toastTimer,
  storageError = false;
try {
  const saved = localStorage.getItem(STORAGE);
  if (saved) {
    scene = validateScene(JSON.parse(saved));
    selected = scene.bodies.find((b) => !b.fixed)?.id || null;
  }
} catch {
  storageError = true;
}
const objectMenu = createObjectMenu({
  render: (root) => renderProperties(root, true),
  getSelected: () =>
    scene.bodies.find((b) => b.id === selected) ||
    scene.links.find((l) => l.id === selected),
  onInspector: () => {
    document.body.classList.remove("hide-inspector");
    $("toggle-inspector").setAttribute("aria-pressed", "true");
    $("selection").focus();
  },
});
function toast(text) {
  $("toast").textContent = text;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 3500);
}
function persist() {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(scene));
    $("save-state").textContent = "Saved on this device";
  } catch {
    $("save-state").textContent = "Local saving unavailable — use Save file";
  }
}
function setRunning(value) {
  running = value;
  accumulator = 0;
  $("play").textContent = running ? "Ⅱ Pause" : "▶ Run";
  $("mode").textContent = running
    ? "RUNNING"
    : sim?.time > 0
      ? "PAUSED"
      : "EDITING";
  $("step").disabled = running;
}
function rebuild() {
  sim?.dispose();
  sim = new Simulation(scene);
  setRunning(false);
  samples = [];
  trails.clear();
  frameCount = 0;
  refresh();
}
function commit(change) {
  const next = clone(scene);
  change(next);
  try {
    validateScene(next);
    const probe = new Simulation(next);
    probe.dispose();
  } catch (e) {
    toast(e.message);
    return false;
  }
  undo.push(clone(scene));
  if (undo.length > 80) undo.shift();
  redo = [];
  scene = next;
  rebuild();
  persist();
  return true;
}
function applyProperties(change, id = null, keys = []) {
  const next = clone(scene);
  change(next);
  let replacement;
  try {
    validateScene(next);
    replacement = sim.reconfigure(next, id, keys);
  } catch (error) {
    toast(error.message);
    return false;
  }
  const active = document.activeElement;
  const focusedLabel = $("properties").contains(active)
    ? active.getAttribute("aria-label")
    : null;
  undo.push(clone(scene));
  if (undo.length > 80) undo.shift();
  redo = [];
  scene = next;
  sim.dispose();
  sim = replacement;
  refresh();
  if (focusedLabel)
    [...$("properties").querySelectorAll("[aria-label]")]
      .find((el) => el.getAttribute("aria-label") === focusedLabel)
      ?.focus();
  persist();
  return true;
}
function history(direction) {
  const from = direction === "undo" ? undo : redo,
    to = direction === "undo" ? redo : undo;
  if (!from.length) return;
  to.push(clone(scene));
  scene = from.pop();
  pending = null;
  rebuild();
  persist();
}
function ensureEditing() {
  if (sim.time > 0 || running) {
    rebuild();
    toast("Returned to initial conditions for editing.");
  }
}
function chooseTool(value) {
  tool = value;
  pending = null;
  document.querySelectorAll("[data-tool]").forEach((b) => {
    b.classList.toggle("active", b.dataset.tool === tool);
    b.setAttribute("aria-pressed", b.dataset.tool === tool);
  });
  $("tool-hint").textContent = {
    select: "Drag an object to move it. A running scene pauses when grabbed.",
    pan: "Drag the canvas to explore your scene.",
    circle: "Click the canvas to place a ball.",
    box: "Click the canvas to place a block.",
    wall: "Click to place a fixed wall. Adjust size and angle in the inspector.",
    spring: "Click two objects, or an empty anchor point and an object.",
    rod: "Click two endpoints. An empty point creates a fixed pivot.",
    rope: "Click two endpoints. A rope goes slack when compressed.",
    triangle: "Click to place a right triangle.",
    ring: "Click to place a hollow ring. The centre remains empty.",
    arc: "Click to place a curved track. Edit its sweep and radius.",
    trough: "Click to place a U-shaped trough.",
    "half-trough": "Click to place an L-shaped trough.",
    stroke: "Drag to draw a fixed surface. Release to finish.",
    polygon: "Drag an outline. Release to create its convex hull.",
    rotate: "Drag around an object centre to rotate it.",
    resize: "Drag toward or away from an object centre to resize it.",
    velocity: "Drag from an object: each metre of arrow sets 1 m/s.",
    measure: "Drag between two points to measure displacement.",
  }[tool];
  canvas.style.cursor =
    tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair";
}
function refresh() {
  if (
    !scene.bodies.some((b) => b.id === selected) &&
    !scene.links.some((l) => l.id === selected)
  )
    selected = null;
  $("title").value = scene.title;
  $("gravity").value = scene.gravity;
  $("object-count").textContent = `${scene.bodies.length} objects`;
  $("stage-info").textContent = `GRAVITY · ${scene.gravity.toFixed(2)} m/s² ↓`;
  $("undo").disabled = !undo.length;
  $("redo").disabled = !redo.length;
  const sel = $("selection");
  sel.replaceChildren(new Option("Select an object…", ""));
  for (const b of scene.bodies)
    sel.add(new Option(`${b.fixed ? "▪" : "●"} ${b.name}`, b.id));
  for (const l of scene.links)
    sel.add(
      new Option(`↔ ${l.type[0].toUpperCase() + l.type.slice(1)}`, l.id),
    );
  sel.value = selected || "";
  renderProperties();
  objectMenu.refresh();
}
const fields = {
  thickness: ["Wall thickness", "m", 0.02, 10, 0.01],
  sweep: ["Arc sweep", "°", 10, 350, 1],
  x: ["Position x", "m", -10000, 10000, 0.1],
  y: ["Position y", "m", -10000, 10000, 0.1],
  vx: ["Velocity x", "m/s", -1000, 1000, 0.1],
  vy: ["Velocity y", "m/s", -1000, 1000, 0.1],
  mass: ["Mass", "kg", 0.01, 10000, 0.1],
  radius: ["Radius", "m", 0.05, 100, 0.05],
  width: ["Width", "m", 0.05, 100, 0.1],
  height: ["Height", "m", 0.05, 100, 0.1],
  angle: ["Angle ↺", "°", -1000, 1000, 1],
  omega: ["Angular speed ↺", "rad/s", -1000, 1000, 0.1],
  friction: ["Friction", "μ", 0, 1, 0.05],
  restitution: ["Restitution", "0–1", 0, 1, 0.05],
  fx: ["Constant force x", "N", -1000, 1000, 0.1],
  fy: ["Constant force y", "N", -1000, 1000, 0.1],
  length: ["Rest / max length", "m", 0.05, 1000, 0.1],
  k: ["Spring stiffness", "N/m", 0.1, 1000, 0.1],
  damping: ["Damping", "N·s/m", 0, 100, 0.1],
};
function renderProperties(root = $("properties"), popup = false) {
  root.replaceChildren();
  const b = scene.bodies.find((b) => b.id === selected),
    l = scene.links.find((l) => l.id === selected),
    target = b || l;
  if (!popup) {
    $("tracking").textContent = b ? b.name : "Select an object";
    $("readouts").replaceChildren();
  }
  if (!target) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent =
      "Select something on the canvas, or add an object to make this experiment your own.";
    root.append(p);
    return;
  }
  if (b) root.append(motionPanel(b, applyProperties));
  const grid = document.createElement("div");
  grid.className = "property-grid";
  root.append(grid);
  function field(key, label, unit, type = "number", range = []) {
    const el = document.createElement("label");
    el.className = "field" + (type === "text" ? " full" : "");
    el.append(document.createTextNode(label));
    const u = document.createElement("span");
    u.textContent = unit;
    el.append(u);
    const input = document.createElement("input");
    input.type = type;
    const liveKey = b && ["x", "y", "vx", "vy", "angle", "omega"].includes(key);
    input.value = liveKey ? sim.state(b.id)[key] : target[key];
    if (liveKey) {
      input.dataset.stateKey = key;
      input.dataset.bodyId = b.id;
    }
    input.setAttribute("aria-label", label);
    if (type === "text") input.maxLength = 100;
    if (type === "number") {
      input.min = range[0];
      input.max = range[1];
      input.step = "any";
    }
    input.addEventListener("change", () => {
      if (!input.checkValidity() || input.value === "") {
        toast("Please enter a value within the allowed range.");
        input.value = target[key];
        return;
      }
      const id = selected;
      applyProperties(
        (s) => {
          const t = (b ? s.bodies : s.links).find((v) => v.id === id);
          if (t.points && ["width", "height"].includes(key)) {
            const axis = key === "width" ? "x" : "y",
              factor = Number(input.value) / t[key];
            t.points = t.points.map((p) => ({
              ...p,
              [axis]: p[axis] * factor,
            }));
          }
          t[key] = type === "number" ? Number(input.value) : input.value;
          if (b && sim.time === 0 && ["x", "y"].includes(key))
            updateLinkLengths(s, t.id);
        },
        id,
        [key],
      );
    });
    el.append(input);
    grid.append(el);
  }
  if (b) {
    field("name", "Object name", "", "text");
    for (const key of [
      "x",
      "y",
      "vx",
      "vy",
      "mass",
      ...(["circle", "ring", "arc"].includes(b.shape)
        ? ["radius"]
        : ["width", "height"]),
      ...(["ring", "arc", "trough", "half-trough", "stroke"].includes(b.shape)
        ? ["thickness"]
        : []),
      ...(b.shape === "arc" ? ["sweep"] : []),
      "angle",
      "omega",
      "friction",
      "restitution",
      "fx",
      "fy",
    ]) {
      const [label, unit, ...range] = fields[key];
      field(key, label, unit, "number", range);
    }
    field("color", "Colour", "", "color");
    const label = document.createElement("label");
    label.className = "check-field";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = b.fixed;
    input.onchange = () =>
      applyProperties((s) => {
        s.bodies.find((v) => v.id === selected).fixed = input.checked;
      });
    label.append(input, document.createTextNode("Fixed in place"));
    grid.append(label);
    if (!popup)
      for (const [id, title] of [
        ["speed-readout", "SPEED · m/s"],
        ["energy-readout", "KINETIC ENERGY · J"],
        ["x-readout", "POSITION X · m"],
        ["y-readout", "POSITION Y · m"],
        ["ax-readout", "ACCELERATION X · m/s²"],
        ["ay-readout", "ACCELERATION Y · m/s²"],
      ]) {
        const div = document.createElement("div");
        div.className = "readout";
        const span = document.createElement("span");
        span.textContent = title;
        const strong = document.createElement("strong");
        strong.id = id;
        div.append(span, strong);
        $("readouts").append(div);
      }
  } else {
    for (const key of [
      "length",
      ...(l.type === "spring" ? ["k", "damping"] : []),
    ]) {
      const [label, unit, ...range] = fields[key];
      field(key, label, unit, "number", range);
    }
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent =
      l.type === "spring"
        ? "Hooke’s law: F = −kΔx. Damping opposes relative motion along the spring."
        : "Connects object centres. Rods hold a fixed distance; ropes only resist extension.";
    root.append(p);
  }
  const actions = document.createElement("div");
  actions.className = "property-actions";
  if (b) {
    const duplicate = document.createElement("button");
    duplicate.textContent = "Duplicate";
    duplicate.onclick = () => {
      const copy = clone(b);
      copy.id = crypto.randomUUID();
      copy.x += 0.6;
      copy.y += 0.6;
      copy.name += " copy";
      selected = copy.id;
      commit((s) => s.bodies.push(copy));
    };
    actions.append(duplicate);
  }
  const remove = document.createElement("button");
  remove.className = "danger";
  remove.textContent = "Delete";
  remove.onclick = deleteSelection;
  actions.append(remove);
  root.append(actions);
}
function deleteSelection() {
  if (!selected) return;
  const id = selected;
  commit((s) => {
    s.bodies = s.bodies.filter((b) => b.id !== id);
    s.links = s.links.filter((l) => l.id !== id && l.a !== id && l.b !== id);
  });
}
function select(id) {
  selected = id;
  samples = [];
  refresh();
}
function screen(p) {
  return { x: view.x + p.x * view.scale, y: view.y - p.y * view.scale };
}
function world(x, y) {
  return { x: (x - view.x) / view.scale, y: (view.y - y) / view.scale };
}
function locate(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function hit(p) {
  return sim.hit(p);
}
function currentSetup() {
  const next = clone(scene);
  for (const b of next.bodies) Object.assign(b, sim.state(b.id));
  return next;
}
function updateLinkLengths(s, movedId) {
  for (const l of s.links) {
    if (l.type === "spring" || (movedId && ![l.id, l.a, l.b].includes(movedId)))
      continue;
    const point = (side) =>
      l[side.toLowerCase()]
        ? s.bodies.find((b) => b.id === l[side.toLowerCase()])
        : l["anchor" + side];
    const a = point("A"),
      b = point("B"),
      length = Math.max(0.05, Math.hypot(b.x - a.x, b.y - a.y));
    l.length = l.type === "rope" ? Math.max(l.length, length) : length;
  }
}
function editCurrent(change) {
  const next = currentSetup();
  change(next);
  return commit((s) => Object.assign(s, next));
}
function fit() {
  const w = canvas.clientWidth,
    h = canvas.clientHeight;
  const bodies = scene.bodies.filter((b) => b.id !== "floor");
  let minX = 0,
    maxX = 12,
    minY = 0,
    maxY = 7;
  if (bodies.length) {
    minX = Math.min(0, ...bodies.map((b) => b.x - Math.max(b.width, b.radius)));
    maxX = Math.max(
      12,
      ...bodies.map((b) => b.x + Math.max(b.width, b.radius)),
    );
    minY = Math.min(0, ...bodies.map((b) => b.y - b.height));
    maxY = Math.max(
      7,
      ...bodies.map((b) => b.y + Math.max(b.height, b.radius)),
    );
  }
  for (const l of scene.links)
    for (const side of ["A", "B"])
      if (!l[side.toLowerCase()]) {
        const p = l["anchor" + side];
        minX = Math.min(minX, p.x - 1);
        maxX = Math.max(maxX, p.x + 1);
        minY = Math.min(minY, p.y - 1);
        maxY = Math.max(maxY, p.y + 1);
      }
  view.scale = Math.max(
    0.01,
    Math.min((w - 80) / (maxX - minX), (h - 90) / (maxY - minY)),
  );
  view.x = (w - (maxX + minX) * view.scale) / 2;
  view.y = (h + (maxY + minY) * view.scale) / 2;
  updateZoom();
}
function updateZoom() {
  $("zoom").textContent = Math.round((view.scale / 60) * 100) + "%";
}
function zoom(
  factor,
  at = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 },
) {
  const p = world(at.x, at.y);
  view.scale = Math.max(0.01, Math.min(600, view.scale * factor));
  view.x = at.x - p.x * view.scale;
  view.y = at.y + p.y * view.scale;
  updateZoom();
}
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    zoom(Math.exp(-e.deltaY * 0.001), locate(e));
  },
  { passive: false },
);
canvas.addEventListener("contextmenu", (e) => {
  const at = locate(e),
    object = hit(world(at.x, at.y));
  objectMenu.close();
  if (!object) return; // Keep the browser menu on empty canvas.
  e.preventDefault();
  drag = null;
  pending = null;
  select(object.id);
  objectMenu.open(e.clientX, e.clientY);
});
canvas.addEventListener("keydown", (e) => {
  if (e.key !== "ContextMenu" && !(e.shiftKey && e.key === "F10")) return;
  if (!sim.bodies.has(selected)) return;
  e.preventDefault();
  e.stopPropagation();
  const at = screen(sim.state(selected)),
    bounds = canvas.getBoundingClientRect();
  objectMenu.open(bounds.left + at.x, bounds.top + at.y);
});
canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 && e.button !== 1) return;
  canvas.focus();
  const at = locate(e);
  pointer = world(at.x, at.y);
  canvas.setPointerCapture(e.pointerId);
  if (tool === "pan" || e.button === 1) {
    e.preventDefault();
    drag = { type: "pan", at, view: { ...view } };
    return;
  }
  if (tool === "measure") {
    ruler = { a: { ...pointer }, b: { ...pointer } };
    drag = { type: "measure" };
    return;
  }
  if (tool === "select") {
    const anchor = scene.links
      .flatMap((l) =>
        ["A", "B"]
          .filter((side) => !l[side.toLowerCase()])
          .map((side) => ({ l, side, p: l["anchor" + side] })),
      )
      .find(
        (a) =>
          Math.hypot(pointer.x - a.p.x, pointer.y - a.p.y) * view.scale < 10,
      );
    if (anchor) {
      setRunning(false);
      select(anchor.l.id);
      drag = {
        type: "anchor",
        id: anchor.l.id,
        side: anchor.side,
        end: { ...pointer },
      };
      return;
    }
  }
  if (["select", "rotate", "resize", "velocity"].includes(tool)) {
    const b = hit(pointer);
    let link;
    if (!b && tool === "select")
      link = scene.links.find((l) => {
        const a = sim.endpoint(l, "A"),
          b = sim.endpoint(l, "B"),
          dx = b.x - a.x,
          dy = b.y - a.y,
          t = Math.max(
            0,
            Math.min(
              1,
              ((pointer.x - a.x) * dx + (pointer.y - a.y) * dy) /
                (dx * dx + dy * dy || 1),
            ),
          );
        return (
          Math.hypot(pointer.x - a.x - t * dx, pointer.y - a.y - t * dy) *
            view.scale <
          7
        );
      });
    select(b?.id || link?.id || null);
    if (b) {
      setRunning(false);
      const state = sim.state(b.id);
      drag = {
        type: tool === "select" ? "object" : tool,
        id: b.id,
        start: { ...pointer },
        original: state,
        end: { ...pointer },
        wasRun: sim.time > 0,
      };
    }
    return;
  }
  if (["stroke", "polygon"].includes(tool)) {
    ensureEditing();
    drag = { type: "drawing", shape: tool, points: [{ ...pointer }] };
    return;
  }
  ensureEditing();
  const b = hit(pointer);
  if (
    [
      "circle",
      "box",
      "wall",
      "triangle",
      "ring",
      "arc",
      "trough",
      "half-trough",
    ].includes(tool)
  ) {
    const id = crypto.randomUUID();
    const shape = tool === "wall" ? "box" : tool;
    selected = id;
    commit((s) =>
      s.bodies.push(
        object(
          id,
          shape,
          +pointer.x.toFixed(2),
          +pointer.y.toFixed(2),
          tool === "wall"
            ? {
                name: "Wall",
                fixed: true,
                width: 4,
                height: 0.25,
                color: "#84919e",
              }
            : ["ring", "arc", "trough", "half-trough"].includes(tool)
              ? {
                  name: tool,
                  radius: 2,
                  width: 4,
                  height: 2,
                  thickness: 0.15,
                  sweep: 180,
                  fixed: true,
                  color: "#84919e",
                }
              : {
                  name:
                    tool === "triangle"
                      ? "Triangle"
                      : tool === "circle"
                        ? "Ball"
                        : "Block",
                },
        ),
      ),
    );
    return;
  }
  const end = {
    id: b?.id || null,
    point: b ? { x: b.x, y: b.y } : { ...pointer },
  };
  if (!pending) {
    pending = end;
    toast("Now click the other endpoint. Escape cancels.");
  } else {
    if (pending.id === end.id) {
      toast(
        "Choose a different object; at least one endpoint must be an object.",
      );
      return;
    }
    const a = pending,
      id = crypto.randomUUID();
    selected = id;
    const ok = commit((s) =>
      s.links.push({
        id,
        type: tool,
        a: a.id,
        b: end.id,
        anchorA: a.point,
        anchorB: end.point,
        length: Math.max(
          0.05,
          Math.hypot(end.point.x - a.point.x, end.point.y - a.point.y),
        ),
        k: 20,
        damping: 0.2,
      }),
    );
    if (ok) pending = null;
  }
});
canvas.addEventListener("pointermove", (e) => {
  const at = locate(e);
  pointer = world(at.x, at.y);
  $("coordinates").textContent =
    `x ${pointer.x.toFixed(2)} m · y ${pointer.y.toFixed(2)} m`;
  if (drag?.type === "pan") {
    view.x = drag.view.x + at.x - drag.at.x;
    view.y = drag.view.y + at.y - drag.at.y;
  }
  if (drag && ["object", "rotate", "resize", "velocity"].includes(drag.type))
    drag.end = { ...pointer };
  if (drag?.type === "anchor") drag.end = { ...pointer };
  if (drag?.type === "measure") ruler.b = { ...pointer };
  if (drag?.type === "drawing") {
    const last = drag.points.at(-1);
    if (
      Math.hypot(pointer.x - last.x, pointer.y - last.y) * view.scale > 8 &&
      drag.points.length < 100
    )
      drag.points.push({ ...pointer });
  }
});
canvas.addEventListener("pointerup", () => {
  const d = drag;
  if (d && ["object", "rotate", "resize", "velocity"].includes(d.type)) {
    const dx = d.end.x - d.start.x,
      dy = d.end.y - d.start.y;
    if (Math.hypot(dx, dy) > 0.005)
      editCurrent((s) => {
        const b = s.bodies.find((b) => b.id === d.id);
        if (d.type === "object") {
          b.x = d.original.x + dx;
          b.y = d.original.y + dy;
          updateLinkLengths(s, b.id);
        }
        if (d.type === "velocity") {
          b.vx = d.end.x - d.original.x;
          b.vy = d.end.y - d.original.y;
        }
        if (d.type === "rotate")
          b.angle =
            d.original.angle +
            ((Math.atan2(d.end.y - d.original.y, d.end.x - d.original.x) -
              Math.atan2(d.start.y - d.original.y, d.start.x - d.original.x)) *
              180) /
              Math.PI;
        if (d.type === "resize") {
          const factor = Math.max(
            0.1,
            Math.min(
              10,
              Math.hypot(d.end.x - d.original.x, d.end.y - d.original.y) /
                Math.max(
                  0.1,
                  Math.hypot(
                    d.start.x - d.original.x,
                    d.start.y - d.original.y,
                  ),
                ),
            ),
          );
          for (const key of ["width", "height", "radius", "thickness"])
            if (b[key] !== undefined) b[key] *= factor;
          if (b.points)
            b.points = b.points.map((p) => ({
              x: p.x * factor,
              y: p.y * factor,
            }));
        }
      });
  }
  if (d?.type === "anchor")
    editCurrent((s) => {
      s.links.find((l) => l.id === d.id)["anchor" + d.side] = d.end;
      updateLinkLengths(s, d.id);
    });
  if (d?.type === "drawing" && d.points.length > 1) {
    const points = d.shape === "polygon" ? hull(d.points) : d.points;
    if (points.length >= (d.shape === "polygon" ? 3 : 2)) {
      const cx = points.reduce((n, p) => n + p.x, 0) / points.length,
        cy = points.reduce((n, p) => n + p.y, 0) / points.length;
      const id = crypto.randomUUID();
      selected = id;
      commit((s) =>
        s.bodies.push(
          object(id, d.shape, cx, cy, {
            name: d.shape === "polygon" ? "Drawn solid" : "Drawn path",
            width: Math.max(
              0.05,
              Math.max(...points.map((p) => p.x)) -
                Math.min(...points.map((p) => p.x)),
            ),
            height: Math.max(
              0.05,
              Math.max(...points.map((p) => p.y)) -
                Math.min(...points.map((p) => p.y)),
            ),
            points: points.map((p) => ({ x: p.x - cx, y: p.y - cy })),
            thickness: 0.12,
            fixed: d.shape === "stroke",
            color: "#8a71be",
          }),
        ),
      );
    } else toast("Draw a wider outline to create a solid.");
  }
  drag = null;
});
canvas.addEventListener("pointercancel", () => {
  drag = null;
});
function resizeCanvas(el, context) {
  const r = el.getBoundingClientRect(),
    dpr = window.devicePixelRatio || 1;
  if (
    el.width !== Math.round(r.width * dpr) ||
    el.height !== Math.round(r.height * dpr)
  ) {
    el.width = Math.round(r.width * dpr);
    el.height = Math.round(r.height * dpr);
  }
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return r;
}
function line(a, b, color, width = 1) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}
function arrow(p, v, color, label) {
  const start = screen(p),
    length = Math.hypot(v.x, v.y);
  if (length < 0.03) return;
  const factor = Math.min(16, 120 / length),
    end = { x: start.x + v.x * factor, y: start.y - v.y * factor },
    angle = Math.atan2(end.y - start.y, end.x - start.x);
  line(start, end, color, 1.5);
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - 7 * Math.cos(angle - 0.4),
    end.y - 7 * Math.sin(angle - 0.4),
  );
  ctx.lineTo(
    end.x - 7 * Math.cos(angle + 0.4),
    end.y - 7 * Math.sin(angle + 0.4),
  );
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (label) {
    ctx.font = "9px sans-serif";
    ctx.fillText(label, end.x + 6, end.y - 5);
  }
}
function draw() {
  const { width: w, height: h } = resizeCanvas(canvas, ctx);
  ctx.clearRect(0, 0, w, h);
  const bottom = world(0, h),
    top = world(w, 0);
  if ($("grid").checked) {
    const spacing = 10 ** Math.ceil(Math.log10(22 / view.scale));
    ctx.fillStyle = "#d7dfe9";
    for (
      let x = Math.ceil(bottom.x / spacing) * spacing;
      x <= top.x;
      x += spacing
    )
      for (
        let y = Math.ceil(bottom.y / spacing) * spacing;
        y <= top.y;
        y += spacing
      ) {
        const p = screen({ x, y });
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    line({ x: 0, y: view.y }, { x: w, y: view.y }, "#d7dfe9");
    line({ x: view.x, y: 0 }, { x: view.x, y: h }, "#d7dfe9");
    ctx.font = "8px monospace";
    ctx.fillStyle = "#a7b3c2";
    const tick = spacing * (view.scale * spacing < 45 ? 2 : 1);
    for (let x = Math.ceil(bottom.x / tick) * tick; x <= top.x; x += tick) {
      const p = screen({ x, y: 0 });
      ctx.fillText(
        +x.toFixed(3),
        p.x + 4,
        Math.max(46, Math.min(h - 37, p.y + 13)),
      );
    }
  }
  if ($("trails").checked)
    for (const [id, points] of trails) {
      if (points.length < 2) continue;
      ctx.beginPath();
      points.forEach((p, i) => {
        const q = screen(p);
        i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
      });
      ctx.strokeStyle =
        (scene.bodies.find((b) => b.id === id)?.color || "#5279dd") + "60";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  for (const l of scene.links) {
    const a = screen(
        drag?.type === "anchor" && drag.id === l.id && drag.side === "A"
          ? drag.end
          : sim.endpoint(l, "A"),
      ),
      b = screen(
        drag?.type === "anchor" && drag.id === l.id && drag.side === "B"
          ? drag.end
          : sim.endpoint(l, "B"),
      ),
      dx = b.x - a.x,
      dy = b.y - a.y,
      length = Math.hypot(dx, dy),
      nx = -dy / (length || 1),
      ny = dx / (length || 1);
    ctx.strokeStyle = selected === l.id ? "#426ac4" : "#93a2b7";
    ctx.lineWidth = selected === l.id ? 2.5 : 1.8;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    if (l.type === "spring") {
      for (let i = 1; i < 24; i++) {
        const t = i / 24,
          offset = i < 3 || i > 21 ? 0 : i % 2 ? 5 : -5;
        ctx.lineTo(a.x + t * dx + nx * offset, a.y + t * dy + ny * offset);
      }
    } else if (l.type === "rope" && length < l.length * view.scale) {
      const sag = Math.min(45, (l.length * view.scale - length) / 2);
      ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + sag, b.x, b.y);
    }
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    for (const [id, p] of [
      [l.a, a],
      [l.b, b],
    ])
      if (!id) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#506078";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.stroke();
      }
  }
  for (const b of scene.bodies) {
    const state = sim.state(b.id);
    if (drag?.type === "object" && drag.id === b.id) {
      state.x = drag.original.x + drag.end.x - drag.start.x;
      state.y = drag.original.y + drag.end.y - drag.start.y;
    }
    const p = screen(state),
      actual = sim.state(b.id),
      engineBody = sim.bodies.get(b.id);
    let angleOffset = 0,
      sizeFactor = 1;
    if (drag?.id === b.id && drag.type === "rotate")
      angleOffset =
        Math.atan2(drag.end.y - actual.y, drag.end.x - actual.x) -
        Math.atan2(drag.start.y - actual.y, drag.start.x - actual.x);
    if (drag?.id === b.id && drag.type === "resize")
      sizeFactor = Math.max(
        0.1,
        Math.min(
          10,
          Math.hypot(drag.end.x - actual.x, drag.end.y - actual.y) /
            Math.max(
              0.1,
              Math.hypot(drag.start.x - actual.x, drag.start.y - actual.y),
            ),
        ),
      );
    const parts =
      engineBody.parts.length > 1 ? engineBody.parts.slice(1) : [engineBody];
    ctx.fillStyle = b.color + (b.fixed ? "55" : "db");
    ctx.strokeStyle = b.id === selected ? "#263f6c" : b.color;
    ctx.lineWidth = b.id === selected ? 2 : 1;
    for (const part of parts) {
      ctx.beginPath();
      part.vertices.forEach((v, i) => {
        const dx = v.x / 100 - actual.x,
          dy = -v.y / 100 - actual.y;
        const q = screen({
          x:
            state.x +
            sizeFactor *
              (dx * Math.cos(angleOffset) - dy * Math.sin(angleOffset)),
          y:
            state.y +
            sizeFactor *
              (dx * Math.sin(angleOffset) + dy * Math.cos(angleOffset)),
        });
        i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    if (!["ring", "arc", "trough", "half-trough", "stroke"].includes(b.shape)) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffffbb";
      ctx.fill();
    }
    if (drag?.id === b.id && drag.type === "velocity")
      arrow(
        state,
        {
          x: ((drag.end.x - state.x) * view.scale) / 16,
          y: ((drag.end.y - state.y) * view.scale) / 16,
        },
        "#5279dd",
        Math.hypot(drag.end.x - state.x, drag.end.y - state.y).toFixed(2) +
          " m/s",
      );
    if (b.id !== "floor") {
      ctx.font = "10px sans-serif";
      ctx.fillStyle = "#74849a";
      ctx.textAlign = "center";
      ctx.fillText(
        b.name,
        p.x,
        p.y -
          (b.shape === "circle" ? b.radius : b.height / 2) * view.scale -
          13,
      );
      ctx.textAlign = "left";
    }
    if (!b.fixed && $("vectors").checked)
      arrow(
        state,
        { x: state.vx, y: state.vy },
        "#5279dd",
        b.id === selected
          ? `${Math.hypot(state.vx, state.vy).toFixed(1)} m/s`
          : "",
      );
    if (!b.fixed && $("accelerations").checked)
      arrow(
        state,
        sim.acceleration(b.id),
        "#9370ac",
        b.id === selected ? "a" : "",
      );
    if (!b.fixed && $("forces").checked)
      arrow(
        state,
        sim.forces.get(b.id),
        "#d38a50",
        b.id === selected ? "F applied + mg" : "",
      );
  }
  if (drag?.type === "drawing") {
    ctx.beginPath();
    drag.points.forEach((p, i) => {
      const q = screen(p);
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    });
    ctx.strokeStyle = "#8a71be";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  if (ruler) {
    const a = screen(ruler.a),
      b = screen(ruler.b);
    line(a, b, "#bd8254", 1.5);
    ctx.font = "11px monospace";
    ctx.fillStyle = "#986333";
    ctx.fillText(
      Math.hypot(ruler.b.x - ruler.a.x, ruler.b.y - ruler.a.y).toFixed(3) +
        " m",
      (a.x + b.x) / 2 + 5,
      (a.y + b.y) / 2 - 10,
    );
  }
  if (pending && pointer) {
    ctx.setLineDash([4, 4]);
    line(screen(pending.point), screen(pointer), "#8a71be", 2);
    ctx.setLineDash([]);
  }
  if (pointer && ["circle", "box", "wall"].includes(tool)) {
    const p = screen(pointer);
    ctx.strokeStyle = "#5279dd88";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    if (tool === "circle") ctx.arc(p.x, p.y, 0.4 * view.scale, 0, Math.PI * 2);
    else
      ctx.rect(
        p.x - (tool === "wall" ? 2 : 0.5) * view.scale,
        p.y - (tool === "wall" ? 0.125 : 0.5) * view.scale,
        (tool === "wall" ? 4 : 1) * view.scale,
        (tool === "wall" ? 0.25 : 1) * view.scale,
      );
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
function record() {
  for (const b of scene.bodies)
    if (!b.fixed) {
      const points = trails.get(b.id) || [];
      points.push(sim.state(b.id));
      if (points.length > 400) points.shift();
      trails.set(b.id, points);
    }
  if (sim.bodies.has(selected)) {
    const s = sim.state(selected),
      a = sim.acceleration(selected),
      initial = scene.bodies.find((b) => b.id === selected);
    samples.push({
      ax: a.x,
      ay: a.y,
      displacement: Math.hypot(s.x - initial.x, s.y - initial.y),
      time: sim.time,
      x: s.x,
      y: s.y,
      vx: s.vx,
      vy: s.vy,
      speed: Math.hypot(s.vx, s.vy),
      energy: sim.energy(selected),
    });
    if (samples.length > 400) samples.shift();
  }
}
function tick() {
  try {
    sim.step();
  } catch (e) {
    setRunning(false);
    toast(e.message + " Edit the equation or reset.");
    return;
  }
  frameCount++;
  if (frameCount % 6 === 0) record();
  for (const b of scene.bodies) {
    const s = sim.state(b.id);
    if (
      !Number.isFinite(s.x) ||
      !Number.isFinite(s.y) ||
      Math.abs(s.x) > 1e6 ||
      Math.abs(s.y) > 1e6
    ) {
      rebuild();
      toast(
        "Simulation exceeded its numerical limits. Try lower forces or a softer spring.",
      );
      break;
    }
  }
}
function drawGraph() {
  const { width: w, height: h } = resizeCanvas(graph, gx),
    left = 42,
    right = w - 8,
    top = 12,
    bottom = h - 18;
  gx.clearRect(0, 0, w, h);
  gx.font = "8px monospace";
  const metric = $("metric").value;
  const values = samples.map((s) => s[metric]);
  let min = Math.min(0, ...values),
    max = Math.max(1, ...values);
  if (max - min < 0.001) max = min + 1;
  gx.textAlign = "right";
  for (let i = 0; i <= 3; i++) {
    const y = top + ((bottom - top) * i) / 3;
    gx.strokeStyle = "#e8ecf2";
    gx.beginPath();
    gx.moveTo(left, y);
    gx.lineTo(right, y);
    gx.stroke();
    gx.fillStyle = "#a0adbd";
    gx.fillText((max - ((max - min) * i) / 3).toFixed(1), left - 9, y + 3);
  }
  $("graph-empty").style.display = samples.length < 2 ? "grid" : "none";
  if (samples.length > 1) {
    const start = samples[0].time,
      end = Math.max(start + 1, samples.at(-1).time);
    gx.beginPath();
    samples.forEach((s, i) => {
      const x = left + ((s.time - start) / (end - start)) * (right - left),
        y = bottom - ((s[metric] - min) / (max - min)) * (bottom - top);
      i ? gx.lineTo(x, y) : gx.moveTo(x, y);
    });
    gx.strokeStyle = "#6484cf";
    gx.lineWidth = 1.8;
    gx.stroke();
    gx.textAlign = "left";
    gx.fillText(start.toFixed(1) + " s", left, h - 3);
    gx.textAlign = "right";
    gx.fillText(end.toFixed(1) + " s", right, h - 3);
  }
  $("samples").textContent = samples.length + " samples";
  $("csv").disabled = !samples.length;
}
function readouts() {
  // Never overwrite a value while the user is typing into it.
  for (const input of document.querySelectorAll("[data-state-key]")) {
    if (
      input === document.activeElement ||
      !sim.bodies.has(input.dataset.bodyId)
    )
      continue;
    input.value = Number(
      sim.state(input.dataset.bodyId)[input.dataset.stateKey].toFixed(4),
    );
  }
  $("time").innerHTML = sim.time.toFixed(2) + " <small>s</small>";
  if ($("speed-readout") && sim.bodies.has(selected)) {
    const s = sim.state(selected);
    $("speed-readout").textContent = Math.hypot(s.vx, s.vy).toFixed(2);
    $("energy-readout").textContent = sim.energy(selected).toFixed(2);
    $("x-readout").textContent = s.x.toFixed(2);
    $("y-readout").textContent = s.y.toFixed(2);
    const a = sim.acceleration(selected);
    $("ax-readout").textContent = a.x.toFixed(2);
    $("ay-readout").textContent = a.y.toFixed(2);
  }
}
function frame(now) {
  const elapsed = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
  lastFrame = now;
  if (running) {
    accumulator += elapsed * Number($("speed").value);
    let steps = 0;
    while (accumulator >= DT && steps < 30 && running) {
      accumulator -= DT;
      tick();
      steps++;
    }
  }
  draw();
  readouts();
  drawGraph();
  requestAnimationFrame(frame);
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function filename() {
  return scene.title.replace(/[^a-z0-9_-]/gi, "-").slice(0, 70) || "experiment";
}
$("capture").onclick = () => {
  editCurrent(() => {});
  toast(
    "Current scene is now the starting setup. Undo restores the previous setup.",
  );
};
for (const [id, cls] of [
  ["toggle-tools", "hide-library"],
  ["toggle-inspector", "hide-inspector"],
  ["toggle-graph", "show-graph"],
])
  $(id).onclick = () => {
    document.body.classList.toggle(cls);
    $(id).setAttribute(
      "aria-pressed",
      id === "toggle-graph"
        ? document.body.classList.contains(cls)
        : !document.body.classList.contains(cls),
    );
  };
$("fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    toast("Full screen is unavailable in this browser.");
  }
};
$("play").onclick = () => {
  pending = null;
  setRunning(!running);
};
$("step").onclick = () => {
  tick();
  $("mode").textContent = "PAUSED";
};
$("reset").onclick = () => {
  pending = null;
  rebuild();
  toast("Initial conditions restored.");
};
$("undo").onclick = () => history("undo");
$("redo").onclick = () => history("redo");
$("gravity").onchange = (e) => {
  const n = Number(e.target.value);
  if (e.target.value === "" || !e.target.checkValidity()) {
    toast("Gravity must be between −100 and 100 m/s².");
    e.target.value = scene.gravity;
    return;
  }
  applyProperties((s) => {
    s.gravity = n;
  });
};
$("title").onchange = (e) =>
  applyProperties((s) => {
    s.title = e.target.value.trim().slice(0, 100) || "Untitled experiment";
  });
$("selection").onchange = (e) => select(e.target.value || null);
$("zoom-in").onclick = () => zoom(1.2);
$("zoom-out").onclick = () => zoom(1 / 1.2);
$("fit").onclick = fit;
$("export").onclick = () =>
  download(
    filename() + ".json",
    JSON.stringify(scene, null, 2),
    "application/json",
  );
$("import").onclick = () => $("file").click();
$("file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 1000000)
      throw new Error("Scene file must be smaller than 1 MB.");
    const loaded = validateScene(JSON.parse(await file.text()));
    commit((s) => Object.assign(s, loaded));
    fit();
    toast("Scene opened. Undo restores your previous scene.");
  } catch (error) {
    toast("Could not open scene: " + error.message);
  }
  e.target.value = "";
};
$("csv").onclick = () => {
  const keys = [
    "time",
    "x",
    "y",
    "vx",
    "vy",
    "ax",
    "ay",
    "displacement",
    "speed",
    "energy",
  ];
  download(
    filename() + "-measurements.csv",
    "time_s,x_m,y_m,vx_m_s,vy_m_s,ax_m_s2,ay_m_s2,displacement_m,speed_m_s,kinetic_energy_J\n" +
      samples.map((s) => keys.map((k) => s[k].toFixed(6)).join(",")).join("\n"),
    "text/csv",
  );
};
$("help").onclick = () => $("help-dialog").showModal();
document.querySelector(".close").onclick = () => $("help-dialog").close();
$("blank").onclick = () => {
  pending = null;
  selected = null;
  commit((s) => Object.assign(s, preset("Blank experiment")));
  fit();
};
document
  .querySelectorAll("[data-tool]")
  .forEach((b) => (b.onclick = () => chooseTool(b.dataset.tool)));
document.querySelectorAll("[data-preset]").forEach(
  (b) =>
    (b.onclick = () => {
      pending = null;
      const next = preset(b.dataset.preset);
      selected = next.bodies.find((v) => !v.fixed)?.id || null;
      commit((s) => Object.assign(s, next));
      fit();
      toast("Experiment loaded. Undo restores the previous scene.");
    }),
);
document.addEventListener("keydown", (e) => {
  if (
    ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName) ||
    $("help-dialog").open
  )
    return;
  if (e.code === "Space") {
    e.preventDefault();
    setRunning(!running);
  }
  if (e.key === "Escape") {
    drag = null;
    chooseTool("select");
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    history(e.shiftKey ? "redo" : "undo");
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    deleteSelection();
  }
  const tools = {
    v: "select",
    h: "pan",
    c: "circle",
    b: "box",
    w: "wall",
    r: "rotate",
  };
  if (tools[e.key]) chooseTool(tools[e.key]);
});
document.addEventListener("visibilitychange", () => {
  lastFrame = 0;
  accumulator = 0;
});
if (window.innerWidth < 700) {
  document.body.classList.add("hide-library", "hide-inspector");
  $("toggle-tools").setAttribute("aria-pressed", "false");
  $("toggle-inspector").setAttribute("aria-pressed", "false");
}
try {
  rebuild();
} catch {
  scene = preset("Projectile");
  rebuild();
  storageError = true;
}
chooseTool("select");
fit();
requestAnimationFrame(frame);
persist();
if (storageError)
  toast(
    "Previous local scene could not be restored. A fresh example is loaded.",
  );
