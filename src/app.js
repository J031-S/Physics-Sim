import { renderIcons, setPlaybackIcon } from "./icons.js";
import { Sandbox, DT, GRID, snap } from "./physics.js";
import { setupPreferences } from "./preferences.js";
import { drawFields, FieldDrag } from "./field-view.js";
let fieldDrag = null,
  impulseDrag = null,
  panDrag = null;
const settingKeys = [
  "gravity",
  "airResistance",
  "electricX",
  "electricY",
  "magneticZ",
];
const $ = (id) => document.getElementById(id),
  canvas = $("canvas"),
  ctx = canvas.getContext("2d");
let sim = new Sandbox(),
  running = true,
  tool = "grab",
  selected = null,
  selectionSet = new Set(),
  marquee = null,
  pending = null,
  pointer = null,
  ctrl = false,
  shift = false,
  alt = false,
  resizeHeld = false,
  accumulator = 0,
  last = 0,
  menuId = null,
  menuPoint = null,
  toastTimer;
sim.updateSettings({ walls: true });
const prefs = setupPreferences($);
const view = { scale: 65, x: 0, y: 0, width: 0, height: 0 };
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 3000);
}
function screen(p) {
  return { x: view.x + p.x * view.scale, y: view.y - p.y * view.scale };
}
function world(p) {
  return { x: (p.x - view.x) / view.scale, y: (view.y - p.y) / view.scale };
}
function locate(e) {
  const r = canvas.getBoundingClientRect();
  return world({ x: e.clientX - r.left, y: e.clientY - r.top });
}
function chooseTool(next) {
  fieldDrag = null;
  impulseDrag = null;
  sim.endResize();
  sim.endGroup();
  marquee = null;
  tool = next;
  pending = null;
  for (const b of document.querySelectorAll("[data-tool]")) {
    b.classList.toggle("active", b.dataset.tool === tool);
    b.setAttribute("aria-pressed", b.dataset.tool === tool);
  }
  closeCategories();
  for (const group of document.querySelectorAll(".tool-category")) {
    const toggle = group.querySelector(".category-toggle"),
      current = group.querySelector(`[data-tool="${tool}"]`);
    toggle.classList.toggle("active", !!current);
    if (current) toggle.dataset.icon = tool;
    toggle.title = current
      ? `${group.dataset.label}: ${current.dataset.iconLabel} active`
      : group.dataset.label;
  }
  renderIcons(prefs.iconSet);
  $("hint").textContent = {
    select:
      "Drag a box to select · Shift-box adds · drag a selected body to move its assembly · Z toggles snapping",
    grab: "Drag to move · Shift moves · Ctrl rotates · R resizes · Alt refits · Z snaps · ? shortcuts",
    resize:
      "Drag a body or field to resize around its centre. Z toggles dimension snapping. G returns to Grab.",
    belt: "Click two balls to wrap a belt around them. Their centres will be pinned. Escape cancels.",
    pulley:
      "Click endpoint → wheel ball → endpoint. Any angle; springs can share endpoints. Alt-drag refits cable length.",
    impulse:
      "Drag from a body to aim a kick. Choose impulse or velocity mode above.",
    pan: "Drag to pan. Scroll to zoom at the cursor. Fit scene restores the view.",
    electric:
      "Click to place an electric field. Drag to move · Ctrl rotates · R resizes · right-click to edit.",
    magnetic:
      "Click to place a magnetic field. Dots point out; crosses point in. Right-click to edit.",
    ball: "Click to add a ball. Z toggles grid snapping.",
    block: "Click to add a block. Z toggles grid snapping.",
    wedge:
      "Click to add a pinned ramp. Pause + Shift-drag to move; Ctrl rotates; R changes width and height. Right-click for friction.",
    spring:
      "Click two objects, or an empty anchor point and an object. Escape cancels.",
    rod: "Click two objects, or an empty anchor point and an object. Escape cancels.",
  }[tool];
  $("tool-name").textContent = tool[0].toUpperCase() + tool.slice(1);
  $("select-options").hidden = tool !== "select";
  $("impulse-options").hidden = tool !== "impulse";
  $("tool-help").hidden = ["select", "impulse"].includes(tool);
  $("tool-help").textContent = $("hint").textContent;
  canvas.style.cursor = ["grab", "pan"].includes(tool) ? "grab" : "crosshair";
}
function select(id) {
  selectionSet = new Set(id ? [id] : []);
  selected = id;
  const o = sim.objects.get(id),
    l = sim.links.get(id),
    f = sim.fields.regions.get(id);
  $("selection").hidden = !o && !l && !f;
  $("selected-name").textContent = f
    ? f.type === "electric"
      ? "Electric field"
      : "Magnetic field"
    : o
      ? o.shape === "ball"
        ? "Ball"
        : o.shape === "wedge"
          ? "Wedge"
          : "Block"
      : l
        ? l.type[0].toUpperCase() + l.type.slice(1)
        : "";
  $("lock-angle").parentElement.hidden = l?.type !== "spring";
  $("lock-angle").checked = !!l?.lockAngle;
  $("reverse-wrap").parentElement.hidden = l?.type !== "pulley";
  $("reverse-wrap").checked = !!l?.reverse;
  for (const id of ["crossed-belt", "belt-motor"])
    $(id).parentElement.hidden = l?.type !== "belt";
  $("crossed-belt").checked = !!l?.crossed;
  $("belt-motor").checked = !!l?.motor;
  $("belt-speed-label").hidden = l?.type !== "belt";
  $("belt-speed").value = l?.speed ?? 1;
  $("resize-object").hidden = !o && !f;
  $("dimensions").hidden = !o && !f;
  showDimensions();
  for (const [id, key] of [
    ["lock-position", "lockPosition"],
    ["lock-rotation", "lockRotation"],
  ]) {
    $(id).parentElement.hidden = !o;
    $(id).checked = !!o?.[key];
  }
  $("lock-caption").hidden = !o;
  const row = document.querySelector(".selection-row");
  row.hidden = ![...row.children].some((c) => !c.hidden);
}
function selectMany(ids) {
  const list = [...new Set(ids)].filter(
    (id) =>
      sim.objects.has(id) || sim.links.has(id) || sim.fields.regions.has(id),
  );
  select(list.length === 1 ? list[0] : null);
  selectionSet = new Set(list);
  if (list.length > 1) {
    $("selection").hidden = false;
    $("selected-name").textContent = `${list.length} objects selected`;
  }
}
function finishMarquee(p) {
  const box = marquee;
  if (!box) return;
  const minX = Math.min(box.start.x, p.x),
    maxX = Math.max(box.start.x, p.x),
    minY = Math.min(box.start.y, p.y),
    maxY = Math.max(box.start.y, p.y);
  const ids = [...sim.objects.values()]
    .filter(
      (o) =>
        $("select-bodies").checked &&
        o.body.bounds.max.x / 100 >= minX &&
        o.body.bounds.min.x / 100 <= maxX &&
        -o.body.bounds.min.y / 100 >= minY &&
        -o.body.bounds.max.y / 100 <= maxY,
    )
    .map((o) => o.id);
  if ($("select-fields").checked)
    for (const f of sim.fields.regions.values()) {
      const a = (f.angle * Math.PI) / 180,
        ex =
          (Math.abs(Math.cos(a)) * f.width + Math.abs(Math.sin(a)) * f.height) /
          2,
        ey =
          (Math.abs(Math.sin(a)) * f.width + Math.abs(Math.cos(a)) * f.height) /
          2;
      if (
        f.x + ex >= minX &&
        f.x - ex <= maxX &&
        f.y + ey >= minY &&
        f.y - ey <= maxY
      )
        ids.push(f.id);
    }
  selectMany([...box.base, ...ids]);
  marquee = null;
}
function highlighted(id) {
  if (selectionSet.has(id)) return true;
  const l = sim.links.get(id);
  return (
    l && [l.a, l.b, l.wheel].filter(Boolean).every((id) => selectionSet.has(id))
  );
}
function showDimensions() {
  const o = sim.objects.get(selected);
  const f = sim.fields.regions.get(selected);
  if (f)
    $("dimensions").textContent =
      `${f.width.toFixed(2)} × ${f.height.toFixed(2)} m`;
  if (o)
    $("dimensions").textContent =
      o.shape === "ball"
        ? `Ø ${(o.radius * 2).toFixed(2)} m`
        : `${o.width.toFixed(2)} × ${o.height.toFixed(2)} m${o.shape === "wedge" ? " · slope " + ((Math.atan2(o.height, o.width) * 180) / Math.PI).toFixed(1) + "°" : ""}`;
}
function linkPath(l) {
  if (l.type === "belt") return sim.mechanisms.beltGeometry(l).path;
  if (l.type === "pulley") return sim.mechanisms.pulleyPath(l);
  return [sim.endpoint(l, "a"), sim.endpoint(l, "b")];
}
function linkAt(p) {
  return [...sim.links.values()].reverse().find((l) => {
    const path = linkPath(l);
    return path.slice(1).some((b, i) => {
      const a = path[i],
        dx = b.x - a.x,
        dy = b.y - a.y;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
        ),
      );
      return (
        Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy) * view.scale < 8
      );
    });
  })?.id;
}
function closeMenu(focus = false) {
  $("material-menu").hidden = true;
  menuId = null;
  if (focus) canvas.focus();
}
function positionMenu() {
  const box = $("material-menu").getBoundingClientRect(),
    w = box.width || 330,
    h = box.height || 420;
  $("material-menu").style.left =
    Math.max(10, Math.min(menuPoint.x, window.innerWidth - w - 10)) /
      (prefs.size / 100) +
    "px";
  $("material-menu").style.top =
    Math.max(10, Math.min(menuPoint.y, window.innerHeight - h - 10)) /
      (prefs.size / 100) +
    "px";
}
// Sliders centred on zero (min = −max) snap to exactly zero within 2.5% of
// their span, marked by a centre tick. Arrow keys nudge by exact steps so the
// detent never traps keyboard users.
function centred(range) {
  return Number(range.max) > 0 && Number(range.min) === -Number(range.max);
}
function detent(range, value) {
  return centred(range) && Math.abs(value) <= 0.025 * (range.max - range.min)
    ? 0
    : value;
}
function addZeroDetent(range, step, nudge) {
  if (!centred(range)) return;
  const wrap = document.createElement("div"),
    tick = document.createElement("span");
  wrap.className = "zero-slider";
  tick.className = "zero-tick";
  tick.setAttribute("aria-hidden", "true");
  range.replaceWith(wrap);
  wrap.append(tick, range);
  range.addEventListener("keydown", (e) => {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const delta = ["ArrowRight", "ArrowUp"].includes(e.key) ? step : -step;
    nudge(
      Math.max(
        Number(range.min),
        Math.min(
          Number(range.max),
          Number((Number(range.value) + delta).toFixed(6)),
        ),
      ),
    );
  });
}
// One compact row: label (help as tooltip and description), slider, number
// input with its unit.
function propertyRow({ id, name, unit, min, max, help, value }) {
  const row = document.createElement("div"),
    label = document.createElement("label"),
    range = document.createElement("input"),
    input = document.createElement("input"),
    box = document.createElement("span"),
    units = document.createElement("span"),
    info = document.createElement("span");
  row.className = "prop-row";
  label.htmlFor = id;
  label.textContent = name;
  info.id = id + "-help";
  info.className = "sr-only";
  info.textContent = help;
  if (help) label.title = help;
  input.type = "number";
  input.id = id;
  input.min = min;
  input.max = max;
  input.step = "any";
  input.value = value;
  input.setAttribute("aria-label", name);
  range.type = "range";
  range.min = min;
  range.max = max;
  range.step = "any";
  range.value = value;
  range.setAttribute("aria-label", name + " slider");
  for (const control of [input, range])
    if (help) control.setAttribute("aria-describedby", info.id);
  units.className = "unit";
  units.textContent = unit;
  box.className = "prop-value";
  box.append(input, units);
  row.append(label, range, box, info);
  return { row, input, range };
}
function openMenu(id, x, y) {
  const o = sim.objects.get(id),
    l = sim.links.get(id),
    f = sim.fields.regions.get(id);
  if (!o && !l && !f) return;
  menuId = id;
  menuPoint = { x, y };
  select(id);
  $("menu-title").textContent = f
    ? f.type === "electric"
      ? "Electric field"
      : "Magnetic field"
    : o
      ? (o.shape === "ball"
          ? "Ball"
          : o.shape === "wedge"
            ? "Wedge"
            : "Block") + " · material constants"
      : l.type === "spring"
        ? "Spring constants"
        : l.type === "rod"
          ? "Rod constant"
          : l.type === "belt"
            ? "Belt"
            : "Pulley cable";
  $("menu-note").textContent = f
    ? "Uniform field inside this region; overlaps add. B is perpendicular to the screen: positive out, negative in. Electric direction follows the region angle."
    : l?.type === "belt"
      ? "Ideal no-slip belt. Crossed / drive controls are in the selected-item panel. Wheel mass and damping are edited on each ball."
      : l?.type === "pulley"
        ? "Taut cable with freely angled ends. Wheel mass and radius determine inertia. Alt-drag refits length; select the wheel to unlock its axle."
        : "Changes apply while the simulation runs.";
  const fields = f
    ? [
        [
          "strength",
          "Strength",
          f.type === "electric" ? "N/C" : "T",
          -100,
          100,
          0.1,
          "Negative reverses the field direction.",
        ],
        [
          "width",
          f.shape === "circle" ? "Diameter" : "Width",
          "m",
          0.1,
          50,
          0.1,
          "Resize with R + drag; Z snaps dimensions.",
        ],
        ...(f.shape === "circle"
          ? []
          : [
              [
                "height",
                "Height",
                "m",
                0.1,
                50,
                0.1,
                "Height of the field region.",
              ],
            ]),
        [
          "angle",
          "Angle",
          "°",
          -180,
          180,
          1,
          "Counterclockwise from right. Ctrl-drag to rotate.",
        ],
        [
          "gradientX",
          "Gradient origin X",
          "m",
          -50,
          50,
          0.1,
          "Offset from the region centre in world axes.",
        ],
        [
          "gradientY",
          "Gradient origin Y",
          "m",
          -50,
          50,
          0.1,
          "Offset from the region centre in world axes.",
        ],
        [
          "gradientAngle",
          "Gradient angle",
          "°",
          -180,
          180,
          1,
          "Independent of the region angle.",
        ],
        [
          "gradientScaleX",
          "Gradient X scale",
          "m",
          0.05,
          100,
          0.1,
          "Reference distance for falloff; circular profiles use this scale.",
        ],
        [
          "gradientScaleY",
          "Gradient Y scale",
          "m",
          0.05,
          100,
          0.1,
          "Second axis for ellipse and box profiles.",
        ],
      ]
    : o
      ? [
          ["mass", "Mass", "kg", 0.05, 100, 0.1, "Inertial mass."],
          [
            "charge",
            "Charge",
            "C",
            -100,
            100,
            0.1,
            "Signed point charge at the centre. Zero is neutral.",
          ],
          [
            "friction",
            "Surface friction",
            "μ",
            0,
            1,
            0.05,
            "Contact friction, not internal material hysteresis.",
          ],
          [
            "restitution",
            "Restitution",
            "e",
            0,
            1,
            0.05,
            "0: no bounce · 1: ideally elastic contact.",
          ],
          [
            "linearDamping",
            "Linear damping",
            "s⁻¹",
            0,
            20,
            0.1,
            "Velocity decays as exp(−damping × time).",
          ],
          [
            "angularDamping",
            "Angular damping",
            "s⁻¹",
            0,
            20,
            0.1,
            "Spin damping is independent of linear damping.",
          ],
        ]
      : l.type === "spring"
        ? [
            [
              "k",
              "Spring stiffness",
              "N/m",
              0.1,
              100,
              0.1,
              "Hooke’s law: F = −k × extension.",
            ],
            [
              "damping",
              "Spring damping",
              "N·s/m",
              0,
              5,
              0.1,
              "Damps relative motion along the spring.",
            ],
            [
              "length",
              "Rest length",
              "m",
              0.05,
              50,
              0.1,
              "Unstretched length.",
            ],
          ]
        : ["belt", "pulley"].includes(l.type)
          ? []
          : [
              [
                "length",
                "Length",
                "m",
                0.05,
                50,
                0.1,
                "The distance held by the rod.",
              ],
            ];
  const form = $("constants");
  form.replaceChildren();
  form.onsubmit = (e) => e.preventDefault();
  if (f) {
    const controls = [
      [
        "shape",
        "Field shape",
        [
          ["rectangle", "Rectangle"],
          ["ellipse", "Ellipse"],
          ["circle", "Circle"],
        ],
      ],
      [
        "gradient",
        "Falloff",
        [
          ["uniform", "Uniform"],
          ["linear", "Linear"],
          ["inverse", "Inverse r (smoothed)"],
          ["inverseSquare", "Inverse r² (smoothed)"],
          ["exponential", "Exponential"],
        ],
      ],
      [
        "gradientShape",
        "Gradient shape",
        [
          ["axial", "Along an axis"],
          ["radial", "Circular"],
          ["elliptical", "Elliptical"],
          ["box", "Box"],
        ],
      ],
      ...(f.type === "electric"
        ? [
            [
              "direction",
              "Field direction",
              [
                ["parallel", "Parallel"],
                ["radial", "Radial from gradient origin"],
              ],
            ],
          ]
        : []),
    ];
    for (const [key, name, options] of controls) {
      const label = document.createElement("label"),
        control = document.createElement("select");
      label.className = "select-row";
      label.textContent = name;
      control.setAttribute("aria-label", name);
      for (const [value, text] of options) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        control.append(option);
      }
      control.value = f[key];
      control.onchange = () => {
        sim.fields.update(id, { [key]: control.value });
        openMenu(id, x, y);
      };
      label.append(control);
      form.append(label);
    }
    $("menu-note").textContent =
      "Strength is the peak. Gradient origin/axes are independent of the boundary. Linear: max(0, 1−d); inverse: 1/√(1+d²); inverse-square: 1/(1+d²); exponential: exp(−d). Scales define d. Axial falloff starts at the origin and decreases along +axis.";
  }
  for (const [key, name, unit, min, max, step, help] of fields) {
    const { row, input, range } = propertyRow({
      id: "constant-" + key,
      name,
      unit,
      min,
      max,
      help,
      value: (o || l || f)[key],
    });
    input.dataset.constant = key;
    range.dataset.slider = key;
    input.onchange = () => {
      const current =
        sim.objects.get(id) || sim.links.get(id) || sim.fields.regions.get(id);
      if (!current) {
        closeMenu();
        return;
      }
      try {
        if (input.value === "" || !input.checkValidity())
          throw new Error(
            `Enter ${name.toLowerCase()} between ${min} and ${max}.`,
          );
        if (f) {
          sim.fields.update(id, { [key]: Number(input.value) });
          showDimensions();
        } else if (o) sim.updateConstants(id, { [key]: Number(input.value) });
        else sim.updateLink(id, { [key]: Number(input.value) });
      } catch (error) {
        toast(error.message);
        input.value = current[key];
      }
      range.value = current[key];
    };
    range.oninput = () => {
      input.value = String(
        Number(detent(range, Number(range.value)).toFixed(3)),
      );
      input.onchange();
    };
    addZeroDetent(range, step, (value) => {
      input.value = String(value);
      input.onchange();
    });
    form.append(row);
  }
  $("material-menu").hidden = false;
  positionMenu();
  $("close-menu").focus();
}
$("close-menu").onclick = () => closeMenu(true);
$("material-menu").addEventListener("keydown", (e) => {
  e.stopPropagation();
  if (e.key === "Escape") {
    e.preventDefault();
    closeMenu(true);
  }
  if (e.key === "Enter" && e.target.tagName === "INPUT") {
    e.preventDefault();
    e.target.blur();
  }
});
$("material-menu").addEventListener("contextmenu", (e) => e.preventDefault());
// A press outside an open panel closes it: the constants menu and category
// drop-downs on any outside press, Settings and Keys on a press on the scene.
// A scene press that closed something is swallowed (through its pointerup or
// context menu) so it does not also place an object or start a drag.
let swallowed = null;
document.addEventListener(
  "pointerdown",
  (e) => {
    swallowed = null;
    let closed = false;
    if (!$("material-menu").hidden && !$("material-menu").contains(e.target)) {
      if ($("material-menu").contains(document.activeElement))
        document.activeElement.blur();
      closeMenu();
      closed = true;
    }
    for (const group of document.querySelectorAll(".tool-category"))
      if (
        !group.querySelector(".category-menu").hidden &&
        !group.contains(e.target)
      ) {
        closeCategories();
        closed = true;
      }
    if (e.target === canvas)
      for (const panel of ["settings-panel", "keys-panel"])
        if (!$(panel).hidden) {
          if (panel === "settings-panel") closeSettings();
          else $(panel).hidden = true;
          closed = true;
        }
    if (closed && e.target === canvas) {
      e.stopPropagation();
      e.preventDefault();
      canvas.focus();
      swallowed = { id: e.pointerId, button: e.button };
    }
  },
  true,
);
document.addEventListener(
  "pointerup",
  (e) => {
    if (!swallowed || e.pointerId !== swallowed.id) return;
    e.stopPropagation();
    // A right-button press still has its context menu to come.
    if (swallowed.button !== 2) swallowed = null;
  },
  true,
);
document.addEventListener(
  "contextmenu",
  (e) => {
    if (!swallowed || e.target !== canvas) return;
    e.stopPropagation();
    e.preventDefault();
    swallowed = null;
  },
  true,
);
document.addEventListener("focusin", (e) => {
  if (!$("material-menu").hidden && !$("material-menu").contains(e.target))
    closeMenu();
});
function syncModifiers(e) {
  ctrl = !!e.ctrlKey;
  shift = !!e.shiftKey;
  alt = !!e.altKey;
}
function grabOptions() {
  return { mode: shift ? "move" : ctrl ? "rotate" : "auto", paused: !running };
}
function snapStatus() {
  const on = sim.settings.snapping;
  $("snap-status").textContent = on
    ? "SNAP ON · 0.5 m / 15° · Z toggles"
    : "Snap off · Z toggles 0.5 m / 15°";
  $("snap-status").classList.toggle("snapping", on);
  $("setting-snapping").checked = on;
  $("snap-toggle").checked = on;
}
function updateInteraction() {
  if (!pointer) return;
  if (fieldDrag) {
    fieldDrag.move(pointer, fieldMode(), sim.settings.snapping);
    showDimensions();
  }
  if (sim.grab)
    sim.moveGrab(
      pointer,
      sim.settings.snapping,
      alt,
      performance.now(),
      grabOptions(),
    );
  if (sim.group && ctrl && !shift) {
    const id = sim.group.handle;
    sim.endGroup();
    if (id && sim.objects.has(id)) {
      select(id);
      sim.beginGrab(id, pointer, performance.now(), grabOptions());
    } else if (id && sim.fields.regions.has(id)) {
      select(id);
      fieldDrag = new FieldDrag(sim.fields, id, pointer, fieldMode());
    }
  }
  if (sim.group) sim.moveGroup(pointer, sim.settings.snapping);
  if (sim.sizing) {
    try {
      sim.moveResize(pointer, sim.settings.snapping);
      showDimensions();
    } catch (error) {
      toast(error.message);
    }
  }
}
function fieldMode() {
  return resizeHeld || tool === "resize"
    ? "resize"
    : ctrl && !shift
      ? "rotate"
      : "move";
}
canvas.addEventListener("pointerdown", (e) => {
  if (e.button === 1 || (e.button === 0 && tool === "pan")) {
    e.preventDefault();
    cancelDrag();
    canvas.setPointerCapture(e.pointerId);
    panDrag = { x: e.clientX, y: e.clientY, viewX: view.x, viewY: view.y };
    return;
  }
  if (e.button !== 0) return;
  canvas.focus();
  pointer = locate(e);
  syncModifiers(e);
  canvas.setPointerCapture(e.pointerId);
  if (tool === "impulse") {
    const id = sim.hit(pointer);
    select(id);
    if (id) impulseDrag = { id, start: { ...pointer } };
    return;
  }
  if (["electric", "magnetic"].includes(tool)) {
    const p = sim.settings.snapping
      ? { x: snap(pointer.x), y: snap(pointer.y) }
      : pointer;
    select(sim.fields.add(tool, p));
    chooseTool("grab");
    return;
  }
  if (
    ["grab", "resize"].includes(tool) &&
    !sim.hit(pointer) &&
    !linkAt(pointer)
  ) {
    const id = sim.fields.hit(pointer);
    if (id) {
      select(id);
      fieldDrag = new FieldDrag(sim.fields, id, pointer, fieldMode());
      return;
    }
  }
  if (tool === "select") {
    const id =
      ($("select-bodies").checked && sim.hit(pointer)) ||
      ($("select-fields").checked && sim.fields.hit(pointer));
    if (id) {
      if (ctrl || resizeHeld) {
        select(id);
        if (sim.fields.regions.has(id))
          fieldDrag = new FieldDrag(sim.fields, id, pointer, fieldMode());
        else if (resizeHeld) sim.beginResize(id, pointer);
        else sim.beginGrab(id, pointer, performance.now(), grabOptions());
        return;
      }
      if (!selectionSet.has(id)) selectMany([id]);
      const before = selectionSet.size;
      selectMany(
        sim.beginGroup([...selectionSet], pointer, { paused: !running }),
      );
      sim.group.handle = id;
      if (sim.group.blocked)
        toast("Pause to reposition an assembly containing locked objects.");
      if (selectionSet.size > before)
        toast("Connected objects included to preserve the assembly.");
    } else {
      marquee = {
        start: { ...pointer },
        end: { ...pointer },
        base: e.shiftKey ? [...selectionSet] : [],
      };
      if (!e.shiftKey) selectMany([]);
    }
    return;
  }
  if (tool === "grab" || tool === "resize") {
    const id = sim.hit(pointer);
    select(id || linkAt(pointer) || null);
    if (id) {
      if (resizeHeld || tool === "resize") sim.beginResize(id, pointer);
      else sim.beginGrab(id, pointer, performance.now(), grabOptions());
    }
    return;
  }
  if (["ball", "block", "wedge"].includes(tool)) {
    const p = sim.settings.snapping
      ? { x: snap(pointer.x), y: Math.max(GRID, snap(pointer.y)) }
      : pointer;
    select(sim.add(tool, p));
    chooseTool("grab");
    return;
  }
  if (tool === "belt" || tool === "pulley") {
    const id = sim.hit(pointer);
    if (!id) {
      toast("Click an object.");
      return;
    }
    if (!pending) pending = { ids: [], point: { ...pointer } };
    if (pending.ids.includes(id)) {
      toast("Choose a different object.");
      return;
    }
    pending.ids.push(id);
    pending.point = { ...pointer };
    const count = tool === "belt" ? 2 : 3;
    if (pending.ids.length === count) {
      try {
        const result =
          tool === "belt"
            ? sim.mechanisms.createBelt(...pending.ids)
            : sim.mechanisms.createPulley(...pending.ids);
        select(result);
        chooseTool("grab");
        toast(
          "Axle pinned initially; rotation stays free. Pulley axles can be unlocked. Select the cable to reverse its wrap.",
        );
      } catch (error) {
        toast(error.message);
        pending = null;
      }
    } else
      toast(
        tool === "belt"
          ? "Choose the second wheel."
          : pending.ids.length === 1
            ? "Choose the pulley wheel ball."
            : "Choose the other endpoint.",
      );
    return;
  }
  const id = sim.hit(pointer),
    p = id
      ? sim.state(id)
      : sim.settings.snapping
        ? { x: snap(pointer.x), y: snap(pointer.y) }
        : { ...pointer };
  if (!pending) {
    pending = { id, point: { x: p.x, y: p.y } };
    toast("Choose the other endpoint.");
  } else {
    try {
      select(sim.connect(tool, pending.id, id, pending.point, p));
      chooseTool("grab");
    } catch (error) {
      toast(error.message);
    }
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (panDrag) {
    view.x = panDrag.viewX + e.clientX - panDrag.x;
    view.y = panDrag.viewY + e.clientY - panDrag.y;
    return;
  }
  pointer = locate(e);
  syncModifiers(e);
  if (marquee) marquee.end = { ...pointer };
  updateInteraction();
});
canvas.addEventListener("pointerup", (e) => {
  if (panDrag) {
    panDrag = null;
    if (canvas.hasPointerCapture?.(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
    return;
  }
  if (e.button !== 0) return;
  syncModifiers(e);
  pointer = locate(e);
  if (impulseDrag) {
    const v = impulseVector();
    if (!sim.impulse(impulseDrag.id, v, $("impulse-mode").value))
      toast("Unlock position to apply a kick.");
    impulseDrag = null;
  }
  if (fieldDrag) {
    fieldDrag.move(pointer, fieldMode(), sim.settings.snapping);
    fieldDrag = null;
    showDimensions();
  }
  if (marquee) finishMarquee(locate(e));
  if (sim.group) {
    sim.moveGroup(locate(e), sim.settings.snapping);
    sim.endGroup();
  }
  if (sim.grab) {
    pointer = locate(e);
    sim.moveGrab(
      pointer,
      sim.settings.snapping,
      e.altKey,
      performance.now(),
      grabOptions(),
    );
    sim.endGrab();
  }
  if (sim.sizing) {
    try {
      sim.moveResize(locate(e), sim.settings.snapping);
    } catch (error) {
      toast(error.message);
    }
    sim.endResize();
    showDimensions();
  }
  if (canvas.hasPointerCapture?.(e.pointerId))
    canvas.releasePointerCapture(e.pointerId);
});
canvas.addEventListener("pointercancel", cancelDrag);
canvas.addEventListener("lostpointercapture", cancelDrag);
function cancelDrag() {
  fieldDrag = null;
  impulseDrag = null;
  panDrag = null;
  marquee = null;
  sim.endGroup();
  sim.endGrab(false);
  sim.endResize();
}
canvas.addEventListener("contextmenu", (e) => {
  const p = locate(e),
    id = sim.hit(p) || linkAt(p) || sim.fields.hit(p);
  if (!id) {
    closeMenu();
    return;
  }
  e.preventDefault();
  cancelDrag();
  pending = null;
  openMenu(id, e.clientX, e.clientY);
});
canvas.addEventListener("keydown", (e) => {
  if (
    (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) &&
    selected
  ) {
    const o = sim.objects.get(selected),
      l = sim.links.get(selected),
      p = o
        ? sim.state(selected)
        : l
          ? sim.endpoint(l, "a")
          : sim.fields.regions.get(selected);
    if (!p) return;
    e.preventDefault();
    e.stopPropagation();
    const at = screen(p),
      r = canvas.getBoundingClientRect();
    openMenu(selected, at.x + r.left, at.y + r.top);
  }
});
$("lock-position").onchange = (e) => {
  try {
    sim.setLock(selected, "position", e.target.checked);
  } catch (error) {
    toast(error.message);
    select(selected);
  }
};
$("lock-rotation").onchange = (e) => {
  sim.setLock(selected, "rotation", e.target.checked);
};
$("reverse-wrap").onchange = (e) =>
  sim.mechanisms.cables.reverse(selected, e.target.checked);
$("lock-angle").onchange = (e) => {
  try {
    sim.setSpringAngle(selected, e.target.checked);
  } catch (error) {
    toast(error.message);
    select(selected);
  }
};
for (const [id, key] of [
  ["crossed-belt", "crossed"],
  ["belt-motor", "motor"],
  ["belt-speed", "speed"],
])
  $(id).onchange = (e) => {
    try {
      sim.mechanisms.configureBelt(selected, {
        [key]: key === "speed" ? Number(e.target.value) : e.target.checked,
      });
    } catch (error) {
      toast(error.message);
      select(selected);
    }
  };
$("resize-object").onclick = () => {
  sim.endGrab(false);
  chooseTool("resize");
  canvas.focus();
};
$("shortcuts").onclick = () => {
  $("keys-panel").hidden = !$("keys-panel").hidden;
};
$("close-keys").onclick = () => {
  $("keys-panel").hidden = true;
  canvas.focus();
};
function syncSettings() {
  $("setting-walls").checked = sim.settings.walls;
  $("setting-chargeInteractions").checked = sim.settings.chargeInteractions;
  for (const key of ["coulombConstant", "chargeSoftening"])
    $("setting-" + key).value = sim.settings[key];
  if (sim.viewport) {
    $("scene-width").value = Number(
      (sim.viewport.maxX - sim.viewport.minX).toFixed(3),
    );
    $("scene-height").value = Number(
      (sim.viewport.maxY - sim.viewport.minY).toFixed(3),
    );
  }
  snapStatus();
  for (const key of settingKeys) {
    $("setting-" + key).value = sim.settings[key];
    $("range-" + key).value = sim.settings[key];
  }
}
function closeSettings() {
  $("settings-panel").hidden = true;
  $("settings-toggle").setAttribute("aria-expanded", "false");
}
$("settings-toggle").onclick = () => {
  const hidden = !$("settings-panel").hidden;
  $("settings-panel").hidden = hidden;
  $("settings-toggle").setAttribute("aria-expanded", String(!hidden));
  syncSettings();
};
$("close-settings").onclick = () => {
  closeSettings();
  canvas.focus();
};
$("settings-panel").addEventListener("keydown", (e) => {
  e.stopPropagation();
  if (e.key === "Escape") {
    closeSettings();
    canvas.focus();
  }
});
for (const key of settingKeys) {
  const input = $("setting-" + key),
    range = $("range-" + key);
  input.onchange = () => {
    try {
      if (input.value === "" || !input.checkValidity())
        throw new Error("Enter a value within the displayed limits.");
      sim.updateSettings({ [key]: Number(input.value) });
    } catch (error) {
      toast(error.message);
    }
    syncSettings();
  };
  addZeroDetent(range, 0.1, (value) => {
    sim.updateSettings({ [key]: value });
    syncSettings();
  });
  range.oninput = () => {
    const value = detent(range, Number(range.value));
    sim.updateSettings({ [key]: value });
    range.value = value;
    input.value = sim.settings[key];
  };
}
$("snap-toggle").onchange = (e) => {
  sim.updateSettings({ snapping: e.target.checked });
  snapStatus();
  updateInteraction();
};
for (const key of ["snapping", "walls", "chargeInteractions"])
  $("setting-" + key).onchange = (e) => {
    sim.updateSettings({ [key]: e.target.checked });
    snapStatus();
    updateInteraction();
  };
for (const key of ["coulombConstant", "chargeSoftening"])
  $("setting-" + key).onchange = (e) => {
    try {
      if (e.target.value === "") throw new Error("Enter a number.");
      sim.updateSettings({ [key]: Number(e.target.value) });
    } catch (error) {
      toast(error.message);
    }
    syncSettings();
  };
$("reset-settings").onclick = () => {
  sim.updateSettings({
    gravity: 9.81,
    airResistance: 0,
    electricX: 0,
    electricY: 0,
    magneticZ: 0,
    snapping: false,
    walls: true,
    chargeInteractions: false,
    coulombConstant: 1,
    chargeSoftening: 0.1,
  });
  syncSettings();
};
function removeSelected() {
  if (selectionSet.size) {
    cancelDrag();
    for (const id of [...selectionSet]) sim.remove(id);
    select(null);
    closeMenu();
  }
}
$("delete").onclick = removeSelected;
$("pause").onclick = () => {
  cancelDrag();
  running = !running;
  accumulator = 0;
  setPlaybackIcon(running, prefs.iconSet);
  canvas.focus();
};
$("clear").onclick = () => {
  const settings = { ...sim.settings };
  sim.dispose();
  sim = new Sandbox();
  sim.updateSettings({ ...settings, walls: true });
  view.width = 0;
  view.height = 0;
  selected = null;
  pending = null;
  select(null);
  closeMenu();
  chooseTool("grab");
  accumulator = 0;
};
function closeCategories(except) {
  for (const group of document.querySelectorAll(".tool-category")) {
    if (group === except) continue;
    group.querySelector(".category-menu").hidden = true;
    group
      .querySelector(".category-toggle")
      .setAttribute("aria-expanded", "false");
  }
}
for (const group of document.querySelectorAll(".tool-category")) {
  const toggle = group.querySelector(".category-toggle"),
    menu = group.querySelector(".category-menu"),
    items = [...menu.querySelectorAll("[data-tool]")];
  toggle.onclick = () => {
    closeCategories(group);
    menu.hidden = !menu.hidden;
    toggle.setAttribute("aria-expanded", String(!menu.hidden));
    if (!menu.hidden)
      (items.find((b) => b.dataset.tool === tool) || items[0]).focus();
  };
  group.addEventListener("keydown", (e) => {
    if (menu.hidden) return;
    if (e.key === "Escape") {
      // Closing the drop-down should not also cancel the active tool.
      e.stopPropagation();
      closeCategories();
      toggle.focus();
    } else if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      const i = items.indexOf(document.activeElement),
        step = e.key === "ArrowDown" ? 1 : -1;
      items[(i + step + items.length) % items.length].focus();
    }
  });
  group.addEventListener("focusout", (e) => {
    if (e.relatedTarget && !group.contains(e.relatedTarget)) {
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}
for (const b of document.querySelectorAll("[data-tool]"))
  b.onclick = () => {
    sim.endGrab(false);
    chooseTool(b.dataset.tool);
    canvas.focus();
  };
function typing(e) {
  // Tool shortcuts keep working while focus is on a toolbar button or an
  // open drop-down; Space and Enter still activate the focused button.
  if (
    e.target.closest?.(".tools, .edit-tools") &&
    e.target.tagName === "BUTTON" &&
    ![" ", "Enter"].includes(e.key)
  )
    return false;
  return (
    ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(e.target.tagName) ||
    e.target.isContentEditable ||
    e.target.closest?.('[contenteditable="true"]')
  );
}
document.addEventListener("keydown", (e) => {
  if (typing(e) || !$("material-menu").hidden) return;
  const key = e.key.toLowerCase();
  // Browser reload remains native, even if Ctrl is already controlling a drag.
  if (key === "r" && (e.ctrlKey || e.metaKey)) return;
  if (key === "z" && !e.metaKey) {
    e.preventDefault();
    if (!e.repeat) {
      sim.updateSettings({ snapping: !sim.settings.snapping });
      snapStatus();
      updateInteraction();
    }
    return;
  }
  if (e.key === "Control") ctrl = true;
  if (e.key === "Shift") shift = true;
  if (e.key === "Alt") {
    alt = true;
    e.preventDefault();
  }
  if (["Control", "Shift", "Alt"].includes(e.key)) {
    updateInteraction();
    return;
  }
  if (key === "r" && !e.metaKey) {
    resizeHeld = true;
    e.preventDefault();
    return;
  }
  if (e.key === "Escape") {
    pending = null;
    cancelDrag();
    resizeHeld = false;
    chooseTool("grab");
    closeMenu();
    $("keys-panel").hidden = true;
    closeSettings();
  }
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === "Space" || e.key === " ") {
    e.preventDefault();
    $("pause").click();
    return;
  }
  const keys = {
    q: "select",
    g: "grab",
    b: "ball",
    n: "block",
    w: "wedge",
    s: "spring",
    d: "rod",
    t: "belt",
    u: "pulley",
    i: "impulse",
    h: "pan",
    e: "electric",
    m: "magnetic",
  };
  if (keys[key]) {
    e.preventDefault();
    cancelDrag();
    chooseTool(keys[key]);
  }
  if (key === "v") {
    $("vectors").checked = !$("vectors").checked;
    e.preventDefault();
  }
  if (e.key === "?") {
    $("keys-panel").hidden = !$("keys-panel").hidden;
    e.preventDefault();
  }
  if (e.key === "Delete") {
    e.preventDefault();
    removeSelected();
  }
});
document.addEventListener("keyup", (e) => {
  if (e.key === "Control") ctrl = false;
  if (e.key === "Shift") shift = false;
  if (e.key === "Alt") alt = false;
  if (e.key.toLowerCase() === "r") resizeHeld = false;
  if (["Control", "Shift", "Alt"].includes(e.key)) updateInteraction();
});
window.addEventListener("blur", () => {
  cancelDrag();
  resizeHeld = ctrl = shift = alt = false;
});
document.addEventListener("visibilitychange", () => {
  cancelDrag();
  resizeHeld = ctrl = shift = alt = false;
  last = 0;
  accumulator = 0;
});
window.addEventListener("resize", () => {
  if (menuId) positionMenu();
});
function impulseVector() {
  const gain = Number($("impulse-gain").value);
  const factor = Number.isFinite(gain)
    ? Math.max(0.01, Math.min(100, gain))
    : 1;
  const q = (v) => (sim.settings.snapping ? snap(v) : v);
  return {
    x: q(pointer.x - impulseDrag.start.x) * factor,
    y: q(pointer.y - impulseDrag.start.y) * factor,
  };
}
function visibleBounds() {
  return {
    minX: -view.x / view.scale,
    maxX: (view.width - view.x) / view.scale,
    minY: (view.y - view.height) / view.scale,
    maxY: view.y / view.scale,
  };
}
function zoom(factor, point = { x: view.width / 2, y: view.height / 2 }) {
  cancelDrag();
  const before = world(point);
  view.scale = Math.max(0.1, Math.min(400, view.scale * factor));
  view.x = point.x - before.x * view.scale;
  view.y = point.y + before.y * view.scale;
}
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    zoom(Math.exp(-e.deltaY * 0.001), {
      x: e.clientX - r.left,
      y: e.clientY - r.top,
    });
  },
  { passive: false },
);
$("zoom-in").onclick = () => zoom(1.25);
$("zoom-out").onclick = () => zoom(0.8);
$("fit-scene").onclick = () => {
  cancelDrag();
  const v = sim.viewport;
  if (!v) return;
  view.scale = Math.max(
    0.1,
    Math.min(
      400,
      (view.width - 40) / (v.maxX - v.minX),
      (view.height - 40) / (v.maxY - v.minY),
    ),
  );
  view.x = view.width / 2 - ((v.minX + v.maxX) / 2) * view.scale;
  view.y = view.height / 2 + ((v.minY + v.maxY) / 2) * view.scale;
};
$("apply-scene").onclick = () => {
  try {
    sim.setSceneSize(
      Number($("scene-width").value),
      Number($("scene-height").value),
    );
    syncSettings();
  } catch (error) {
    toast(error.message);
  }
};
$("scene-to-view").onclick = () => {
  cancelDrag();
  const v = visibleBounds();
  if (
    v.maxX - v.minX < 2 ||
    v.maxY - v.minY < 2 ||
    v.maxX - v.minX > 1000 ||
    v.maxY - v.minY > 1000
  ) {
    toast("Current view must span between 2 and 1000 m on each axis.");
    return;
  }
  sim.setViewport(v);
  syncSettings();
};
function line(a, b, colour, width = 1) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.stroke();
}
function draw() {
  const r = canvas.getBoundingClientRect(),
    dpr = window.devicePixelRatio || 1;
  if (view.width !== r.width || view.height !== r.height) {
    if (view.width) {
      view.x += (r.width - view.width) / 2;
      view.y += (r.height - view.height) / 2;
    } else {
      view.scale = Math.max(
        25,
        Math.min(75, r.width / 15, (r.height - 160) / 8),
      );
      view.x = r.width / 2;
      view.y = r.height - 100;
    }
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
  if (!sim.viewport)
    sim.setViewport({
      minX: -view.x / view.scale,
      maxX: (r.width - view.x) / view.scale,
      minY: (view.y - r.height) / view.scale,
      maxY: view.y / view.scale,
    });
  $("zoom-level").textContent = Math.round((view.scale / 65) * 100) + "%";
  const toolbar = document.querySelector(".tools"),
    editBar = document.querySelector(".edit-tools");
  $("tool-settings").style.top =
    toolbar.offsetTop + toolbar.offsetHeight + 8 + "px";
  // Keep the centred options strip clear of the left-hand edit bar.
  $("tool-settings").style.maxWidth =
    Math.max(
      200,
      canvas.clientWidth / (prefs.size / 100) -
        2 * (editBar.offsetLeft + editBar.offsetWidth + 8),
    ) + "px";
  const dark = document.documentElement.dataset.theme === "dark";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, r.width, r.height);
  const min = world({ x: 0, y: r.height }),
    max = world({ x: r.width, y: 0 });
  const gridStep =
    GRID * 2 ** Math.max(0, Math.ceil(Math.log2(12 / (GRID * view.scale))));
  if (prefs.grid)
    for (
      let x = Math.ceil(min.x / gridStep) * gridStep;
      x <= max.x;
      x += gridStep
    ) {
      const major = Math.abs(x - Math.round(x)) < 0.01;
      line(
        screen({ x, y: min.y }),
        screen({ x, y: max.y }),
        major ? (dark ? "#3c5042" : "#c6cebf") : dark ? "#2c3931" : "#dce1d4",
        major ? 1 : 0.75,
      );
    }
  if (prefs.grid)
    for (
      let y = Math.ceil(min.y / gridStep) * gridStep;
      y <= max.y;
      y += gridStep
    ) {
      const major = Math.abs(y - Math.round(y)) < 0.01;
      line(
        screen({ x: min.x, y }),
        screen({ x: max.x, y }),
        major ? (dark ? "#3c5042" : "#c6cebf") : dark ? "#2c3931" : "#dce1d4",
        major ? 1 : 0.75,
      );
    }
  ctx.fillStyle = dark ? "#25332a" : "#e0e3d8";
  ctx.fillRect(0, view.y, r.width, r.height - view.y);
  line({ x: 0, y: view.y }, { x: r.width, y: view.y }, "#7f9076", 2);
  if (sim.settings.walls) {
    ctx.strokeStyle = "#7f9076";
    ctx.lineWidth = 4;
    const v = sim.viewport,
      p = screen({ x: v.minX, y: v.maxY });
    ctx.strokeRect(
      p.x,
      p.y,
      (v.maxX - v.minX) * view.scale,
      (v.maxY - v.minY) * view.scale,
    );
  }
  ctx.font = "9px ui-monospace,monospace";
  ctx.fillStyle = "#819078";
  const labelStep = Math.max(1, Math.ceil(60 / view.scale));
  for (
    let x = Math.ceil(min.x / labelStep) * labelStep;
    x <= max.x;
    x += labelStep
  )
    ctx.fillText(x + " m", screen({ x, y: 0 }).x + 4, view.y + 16);
  drawFields(ctx, sim.fields, screen, view.scale, highlighted, { min, max });
  for (const l of sim.links.values()) {
    if (["belt", "pulley"].includes(l.type)) {
      const path = linkPath(l).map(screen);
      ctx.beginPath();
      path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.strokeStyle = highlighted(l.id) ? "#566b91" : "#617569";
      ctx.lineWidth = l.type === "belt" ? 5 : 2.5;
      ctx.stroke();
      if (l.type === "belt") {
        ctx.setLineDash([5, 14]);
        ctx.lineDashOffset = -l.travel * view.scale;
        ctx.strokeStyle = "#cdd9bd";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
      }
      continue;
    }
    const a = screen(sim.endpoint(l, "a")),
      b = screen(sim.endpoint(l, "b")),
      dx = b.x - a.x,
      dy = b.y - a.y,
      d = Math.hypot(dx, dy) || 1;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    if (l.type === "spring")
      for (let i = 1; i < 24; i++) {
        const zig = i < 3 || i > 21 ? 0 : i % 2 ? 5 : -5;
        ctx.lineTo(
          a.x + (dx * i) / 24 - (dy / d) * zig,
          a.y + (dy * i) / 24 + (dx / d) * zig,
        );
      }
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = highlighted(l.id) ? "#566b91" : "#879579";
    ctx.lineWidth = l.type === "rod" ? 3 : 1.8;
    ctx.stroke();
    if (l.type === "spring" && l.lockAngle) {
      ctx.font = "10px system-ui";
      ctx.fillStyle = "#46553e";
      ctx.fillText("axis locked", (a.x + b.x) / 2 + 8, (a.y + b.y) / 2 - 12);
    }
    for (const [id, p] of [
      [l.a, a],
      [l.b, b],
    ])
      if (!id) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#65775c";
        ctx.fill();
      }
  }
  for (const o of sim.objects.values()) {
    const s = sim.state(o.id),
      p = screen(s);
    ctx.beginPath();
    for (let i = 0; i < o.body.vertices.length; i++) {
      const v = o.body.vertices[i],
        q = screen({ x: v.x / 100, y: -v.y / 100 });
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    }
    ctx.closePath();
    ctx.fillStyle =
      o.shape === "ball"
        ? "#dba66be0"
        : o.shape === "wedge"
          ? "#a2b889e0"
          : "#8ca6bce0";
    ctx.fill();
    ctx.strokeStyle = highlighted(o.id)
      ? "#334e3c"
      : o.shape === "ball"
        ? "#a77943"
        : "#658199";
    ctx.lineWidth = highlighted(o.id) ? 2.5 : 1.5;
    ctx.stroke();
    // Ruler markings rotate with the body, so spin is visible on any shape.
    // Balls carry degree ticks; straight edges carry length ticks in metres.
    if (o.shape === "ball") {
      for (let degrees = 0; degrees < 360; degrees += 10) {
        const angle = s.angle + (degrees * Math.PI) / 180;
        const outer = o.radius * 0.95,
          inner = o.radius * (degrees % 30 === 0 ? 0.74 : 0.85);
        line(
          screen({
            x: s.x + inner * Math.cos(angle),
            y: s.y + inner * Math.sin(angle),
          }),
          screen({
            x: s.x + outer * Math.cos(angle),
            y: s.y + outer * Math.sin(angle),
          }),
          "#fff7e9",
          degrees % 30 === 0 ? 2 : 1,
        );
      }
    } else {
      const half = Math.min(o.width, o.height) / 2,
        // Coarser spacing when zoomed out, so ticks never merge.
        minor = [0.1, 0.5, 1, 5].find((m) => m * view.scale >= 5) ?? 10,
        every = minor === 0.5 ? 2 : 5,
        corners = o.body.vertices.map((v) => ({ x: v.x / 100, y: -v.y / 100 }));
      ctx.save();
      ctx.clip(); // the body outline is still the current path
      corners.forEach((a, i) => {
        const b = corners[(i + 1) % corners.length],
          length = Math.hypot(b.x - a.x, b.y - a.y),
          ux = (b.x - a.x) / length,
          uy = (b.y - a.y) / length,
          // Inward normal: towards the centre of mass.
          side = (s.x - a.x) * -uy + (s.y - a.y) * ux > 0 ? 1 : -1,
          nx = -uy * side,
          ny = ux * side;
        for (let k = 1; k * minor < length - 1e-6; k++) {
          const major = k % every === 0,
            x = a.x + ux * k * minor,
            y = a.y + uy * k * minor,
            from = half * 0.05,
            to = half * (major ? 0.26 : 0.15);
          line(
            screen({ x: x + nx * from, y: y + ny * from }),
            screen({ x: x + nx * to, y: y + ny * to }),
            "#fff7e9",
            major ? 2 : 1,
          );
        }
      });
      ctx.restore();
    }
    if (o.charge) {
      ctx.fillStyle = o.charge > 0 ? "#bd5948" : "#467cb8";
      ctx.font = "bold 11px system-ui";
      ctx.fillText(
        (o.charge > 0 ? "+" : "") + o.charge + " C",
        p.x + 12,
        p.y + 20,
      );
    }
    if (o.lockPosition) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#3a5140";
      ctx.fill();
    }
    if (o.lockRotation) {
      ctx.font = "10px system-ui";
      ctx.fillStyle = "#46553e";
      ctx.fillText("↻ ×", p.x + 12, p.y - 12);
    }
    if ($("vectors").checked) {
      const speed = Math.hypot(s.vx, s.vy);
      if (speed > 0.03) {
        const factor = Math.min(14, 130 / speed),
          end = { x: p.x + s.vx * factor, y: p.y - s.vy * factor },
          a = Math.atan2(end.y - p.y, end.x - p.x);
        line(p, end, "#497caa", 2);
        line(
          end,
          {
            x: end.x - 7 * Math.cos(a - 0.45),
            y: end.y - 7 * Math.sin(a - 0.45),
          },
          "#497caa",
          2,
        );
        line(
          end,
          {
            x: end.x - 7 * Math.cos(a + 0.45),
            y: end.y - 7 * Math.sin(a + 0.45),
          },
          "#497caa",
          2,
        );
        if (highlighted(o.id)) {
          ctx.fillStyle = "#497caa";
          ctx.font = "10px monospace";
          ctx.fillText(speed.toFixed(1) + " m/s", end.x + 7, end.y - 6);
        }
      }
    }
  }
  if (sim.grab) {
    const g = sim.grab;
    if (g.snapCentre) {
      const p = screen(g.snapCentre);
      ctx.strokeStyle = "#426f3e";
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - 6, p.y - 6, 12, 12);
    }
  }
  if (marquee) {
    const a = screen(marquee.start),
      b = screen(marquee.end);
    ctx.fillStyle = "#63876a22";
    ctx.strokeStyle = "#507954";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    ctx.fillRect(
      Math.min(a.x, b.x),
      Math.min(a.y, b.y),
      Math.abs(b.x - a.x),
      Math.abs(b.y - a.y),
    );
    ctx.strokeRect(
      Math.min(a.x, b.x),
      Math.min(a.y, b.y),
      Math.abs(b.x - a.x),
      Math.abs(b.y - a.y),
    );
    ctx.setLineDash([]);
  }
  if (impulseDrag && pointer) {
    const o = sim.state(impulseDrag.id);
    if (o) {
      const start = screen(o),
        delta = {
          x: pointer.x - impulseDrag.start.x,
          y: pointer.y - impulseDrag.start.y,
        };
      const end = screen({ x: o.x + delta.x, y: o.y + delta.y }),
        a = Math.atan2(end.y - start.y, end.x - start.x);
      line(start, end, "#c16145", 3);
      line(
        end,
        {
          x: end.x - 10 * Math.cos(a - 0.45),
          y: end.y - 10 * Math.sin(a - 0.45),
        },
        "#c16145",
        3,
      );
      line(
        end,
        {
          x: end.x - 10 * Math.cos(a + 0.45),
          y: end.y - 10 * Math.sin(a + 0.45),
        },
        "#c16145",
        3,
      );
      const v = impulseVector();
      ctx.fillStyle = "#c16145";
      ctx.font = "12px system-ui";
      ctx.fillText(
        Math.hypot(v.x, v.y).toFixed(2) +
          ($("impulse-mode").value === "impulse" ? " N·s" : " m/s"),
        end.x + 8,
        end.y - 8,
      );
    }
  }
  if (pending && pointer) {
    ctx.setLineDash([4, 4]);
    line(screen(pending.point), screen(pointer), "#7d946e", 2);
    ctx.setLineDash([]);
  }
  if (sim.sizing) showDimensions();
  $("time").textContent = sim.time.toFixed(2) + " s";
}
function frame(now) {
  const elapsed = last ? Math.min((now - last) / 1000, 0.05) : 0;
  last = now;
  if (running) {
    accumulator += elapsed;
    while (accumulator >= DT) {
      sim.step();
      accumulator -= DT;
    }
  }
  draw();
  requestAnimationFrame(frame);
}
for (const [key, t] of Object.entries({
  Q: "select",
  G: "grab",
  B: "ball",
  N: "block",
  W: "wedge",
  S: "spring",
  D: "rod",
  T: "belt",
  U: "pulley",
  I: "impulse",
  H: "pan",
  E: "electric",
  M: "magnetic",
}))
  document.querySelector(`[data-tool="${t}"]`).title =
    `${t[0].toUpperCase() + t.slice(1)} (${key})`;
chooseTool("grab");
snapStatus();
draw();
requestAnimationFrame(frame);
