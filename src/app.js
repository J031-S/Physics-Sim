import { Sandbox, DT, GRID, snap } from "./physics.js";
const $ = (id) => document.getElementById(id),
  canvas = $("canvas"),
  ctx = canvas.getContext("2d");
let sim = new Sandbox(),
  running = true,
  tool = "grab",
  selected = null,
  pending = null,
  pointer = null,
  ctrl = false,
  alt = false,
  resizeHeld = false,
  accumulator = 0,
  last = 0,
  menuId = null,
  menuPoint = null,
  toastTimer;
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
  sim.endResize();
  tool = next;
  pending = null;
  for (const b of document.querySelectorAll("[data-tool]")) {
    b.classList.toggle("active", b.dataset.tool === tool);
    b.setAttribute("aria-pressed", b.dataset.tool === tool);
  }
  $("hint").textContent = {
    grab: "Drag to move · R-drag resizes · Alt-drag refits rods / cables · Ctrl snaps · ? shortcuts",
    resize:
      "Drag a ball or block to resize around its centre. Ctrl snaps dimensions to 0.5 m. G returns to Grab.",
    belt: "Click two balls to wrap a belt around them. Their centres will be pinned. Escape cancels.",
    pulley:
      "Click endpoint → wheel ball → endpoint. Any angle; springs can share endpoints. Alt-drag refits cable length.",
    ball: "Click to add a ball. Hold Ctrl to place its centre on the grid.",
    block: "Click to add a block. Hold Ctrl to place its centre on the grid.",
    spring:
      "Click two objects, or an empty anchor point and an object. Escape cancels.",
    rod: "Click two objects, or an empty anchor point and an object. Escape cancels.",
  }[tool];
  canvas.style.cursor = tool === "grab" ? "grab" : "crosshair";
}
function select(id) {
  selected = id;
  const o = sim.objects.get(id),
    l = sim.links.get(id);
  $("selection").hidden = !o && !l;
  $("selected-name").textContent = o
    ? o.shape === "ball"
      ? "Ball"
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
  $("resize-object").hidden = !o;
  $("dimensions").hidden = !o;
  showDimensions();
  for (const [id, key] of [
    ["lock-position", "lockPosition"],
    ["lock-rotation", "lockRotation"],
  ]) {
    $(id).parentElement.hidden = !o;
    $(id).checked = !!o?.[key];
  }
}
function showDimensions() {
  const o = sim.objects.get(selected);
  if (o)
    $("dimensions").textContent =
      o.shape === "ball"
        ? `Ø ${(o.radius * 2).toFixed(2)} m`
        : `${o.width.toFixed(2)} × ${o.height.toFixed(2)} m`;
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
    w = box.width || 285,
    h = box.height || 420;
  $("material-menu").style.left =
    Math.max(10, Math.min(menuPoint.x, window.innerWidth - w - 10)) + "px";
  $("material-menu").style.top =
    Math.max(10, Math.min(menuPoint.y, window.innerHeight - h - 10)) + "px";
}
function openMenu(id, x, y) {
  const o = sim.objects.get(id),
    l = sim.links.get(id);
  if (!o && !l) return;
  menuId = id;
  menuPoint = { x, y };
  select(id);
  $("menu-title").textContent = o
    ? (o.shape === "ball" ? "Ball" : "Block") + " · material constants"
    : l.type === "spring"
      ? "Spring constants"
      : l.type === "rod"
        ? "Rod constant"
        : l.type === "belt"
          ? "Belt"
          : "Pulley cable";
  $("menu-note").textContent =
    l?.type === "belt"
      ? "Ideal no-slip belt. Crossed / drive controls are in the selection bar. Wheel mass and damping are edited on each ball."
      : l?.type === "pulley"
        ? "Taut cable with freely angled ends. Wheel mass and radius determine inertia. Alt-drag refits length; select the wheel to unlock its axle."
        : "Changes apply while the simulation runs.";
  const fields = o
    ? [
        ["mass", "Mass", "kg", 0.05, 100, 0.1, "Inertial mass."],
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
          ["length", "Rest length", "m", 0.05, 50, 0.1, "Unstretched length."],
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
  for (const [key, name, unit, min, max, step, help] of fields) {
    const label = document.createElement("label");
    label.append(document.createTextNode(name));
    const units = document.createElement("span");
    units.textContent = unit;
    label.append(units);
    const input = document.createElement("input");
    input.type = "number";
    input.min = min;
    input.max = max;
    input.step = "any";
    input.value = (o || l)[key];
    input.setAttribute("aria-label", name);
    input.dataset.constant = key;
    input.onchange = () => {
      const current = sim.objects.get(id) || sim.links.get(id);
      if (!current) {
        closeMenu();
        return;
      }
      try {
        if (input.value === "" || !input.checkValidity())
          throw new Error(
            `Enter ${name.toLowerCase()} between ${min} and ${max}.`,
          );
        if (o) sim.updateConstants(id, { [key]: Number(input.value) });
        else sim.updateLink(id, { [key]: Number(input.value) });
      } catch (error) {
        toast(error.message);
        input.value = current[key];
      }
    };
    label.append(input);
    const info = document.createElement("small");
    info.textContent = help;
    label.append(info);
    form.append(label);
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
document.addEventListener(
  "pointerdown",
  (e) => {
    if (!$("material-menu").hidden && !$("material-menu").contains(e.target)) {
      if ($("material-menu").contains(document.activeElement))
        document.activeElement.blur();
      closeMenu();
    }
  },
  true,
);
document.addEventListener("focusin", (e) => {
  if (!$("material-menu").hidden && !$("material-menu").contains(e.target))
    closeMenu();
});
function syncCtrl(value) {
  ctrl = value;
  $("snap-status").textContent = ctrl
    ? "SNAP · 0.5 m dimensions / grid · 15° rotation"
    : "Grid: 0.5 m · hold Ctrl to snap";
  $("snap-status").classList.toggle("snapping", ctrl);
}
canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  canvas.focus();
  pointer = locate(e);
  syncCtrl(e.ctrlKey);
  alt = e.altKey;
  canvas.setPointerCapture(e.pointerId);
  if (tool === "grab" || tool === "resize") {
    const id = sim.hit(pointer);
    select(id || linkAt(pointer) || null);
    if (id) {
      if (resizeHeld || tool === "resize") sim.beginResize(id, pointer);
      else sim.beginGrab(id, pointer);
    }
    return;
  }
  if (["ball", "block"].includes(tool)) {
    const p = ctrl
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
      : ctrl
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
  pointer = locate(e);
  syncCtrl(e.ctrlKey);
  alt = e.altKey;
  if (sim.grab) sim.moveGrab(pointer, ctrl, alt);
  if (sim.sizing) {
    try {
      sim.moveResize(pointer, ctrl);
      showDimensions();
    } catch (error) {
      toast(error.message);
    }
  }
});
canvas.addEventListener("pointerup", (e) => {
  if (e.button !== 0) return;
  if (sim.grab) {
    pointer = locate(e);
    sim.moveGrab(pointer, e.ctrlKey, e.altKey);
    sim.endGrab();
  }
  if (sim.sizing) {
    try {
      sim.moveResize(locate(e), e.ctrlKey);
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
  sim.endGrab(false);
  sim.endResize();
}
canvas.addEventListener("contextmenu", (e) => {
  const p = locate(e),
    id = sim.hit(p) || linkAt(p);
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
      p = o ? sim.state(selected) : l ? sim.endpoint(l, "a") : null;
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
function removeSelected() {
  if (selected) {
    sim.remove(selected);
    select(null);
    closeMenu();
  }
}
$("delete").onclick = removeSelected;
$("pause").onclick = () => {
  running = !running;
  accumulator = 0;
  $("pause").textContent = running ? "Ⅱ Pause" : "▶ Run";
  canvas.focus();
};
$("clear").onclick = () => {
  sim.dispose();
  sim = new Sandbox();
  selected = null;
  pending = null;
  select(null);
  closeMenu();
  chooseTool("grab");
  accumulator = 0;
};
for (const b of document.querySelectorAll("[data-tool]"))
  b.onclick = () => {
    sim.endGrab(false);
    chooseTool(b.dataset.tool);
    canvas.focus();
  };
function typing(e) {
  return (
    ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(e.target.tagName) ||
    e.target.isContentEditable ||
    e.target.closest?.('[contenteditable="true"]')
  );
}
document.addEventListener("keydown", (e) => {
  if (typing(e) || !$("material-menu").hidden) return;
  if (e.key === "Control") syncCtrl(true);
  if (e.key === "Alt") {
    alt = true;
    e.preventDefault();
  }
  if (e.key.toLowerCase() === "r" && !e.metaKey && !e.altKey) {
    resizeHeld = true;
    e.preventDefault();
  }
  if (sim.grab && pointer && ["Alt", "Control"].includes(e.key))
    sim.moveGrab(pointer, ctrl, alt);
  if (sim.sizing && pointer && e.key === "Control") {
    try {
      sim.moveResize(pointer, true);
      showDimensions();
    } catch (error) {
      toast(error.message);
    }
  }
  if (e.key === "Escape") {
    pending = null;
    cancelDrag();
    resizeHeld = false;
    chooseTool("grab");
    closeMenu();
    $("keys-panel").hidden = true;
  }
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === "Space" || e.key === " ") {
    e.preventDefault();
    $("pause").click();
    return;
  }
  const keys = {
    g: "grab",
    b: "ball",
    n: "block",
    s: "spring",
    d: "rod",
    t: "belt",
    u: "pulley",
  };
  if (keys[e.key.toLowerCase()]) {
    e.preventDefault();
    cancelDrag();
    chooseTool(keys[e.key.toLowerCase()]);
  }
  if (e.key.toLowerCase() === "v") {
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
  if (e.key === "Control") syncCtrl(false);
  if (e.key === "Alt") alt = false;
  if (e.key.toLowerCase() === "r") resizeHeld = false;
  if (sim.grab && pointer && ["Alt", "Control"].includes(e.key))
    sim.moveGrab(pointer, ctrl, alt);
});
window.addEventListener("blur", () => {
  cancelDrag();
  resizeHeld = false;
  alt = false;
  syncCtrl(false);
});
document.addEventListener("visibilitychange", () => {
  cancelDrag();
  resizeHeld = false;
  last = 0;
  accumulator = 0;
});
window.addEventListener("resize", () => {
  if (menuId) positionMenu();
});
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
    view.width = r.width;
    view.height = r.height;
    view.scale = Math.max(25, Math.min(75, r.width / 15, (r.height - 160) / 8));
    view.x = r.width / 2;
    view.y = r.height - 100;
  }
  if (
    canvas.width !== Math.round(r.width * dpr) ||
    canvas.height !== Math.round(r.height * dpr)
  ) {
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, r.width, r.height);
  const min = world({ x: 0, y: r.height }),
    max = world({ x: r.width, y: 0 });
  for (let x = Math.ceil(min.x / GRID) * GRID; x <= max.x; x += GRID) {
    const major = Math.abs(x - Math.round(x)) < 0.01;
    line(
      screen({ x, y: min.y }),
      screen({ x, y: max.y }),
      major ? "#c6cebf" : "#dce1d4",
      major ? 1 : 0.75,
    );
  }
  for (let y = Math.ceil(min.y / GRID) * GRID; y <= max.y; y += GRID) {
    const major = Math.abs(y - Math.round(y)) < 0.01;
    line(
      screen({ x: min.x, y }),
      screen({ x: max.x, y }),
      major ? "#c6cebf" : "#dce1d4",
      major ? 1 : 0.75,
    );
  }
  ctx.fillStyle = "#e0e3d8";
  ctx.fillRect(0, view.y, r.width, r.height - view.y);
  line({ x: 0, y: view.y }, { x: r.width, y: view.y }, "#7f9076", 2);
  ctx.font = "9px ui-monospace,monospace";
  ctx.fillStyle = "#819078";
  for (let x = Math.ceil(min.x); x <= max.x; x++)
    ctx.fillText(x + " m", screen({ x, y: 0 }).x + 4, view.y + 16);
  for (const l of sim.links.values()) {
    if (["belt", "pulley"].includes(l.type)) {
      const path = linkPath(l).map(screen);
      ctx.beginPath();
      path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.strokeStyle = l.id === selected ? "#566b91" : "#617569";
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
    ctx.strokeStyle = l.id === selected ? "#566b91" : "#879579";
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
    ctx.fillStyle = o.shape === "ball" ? "#dba66be0" : "#8ca6bce0";
    ctx.fill();
    ctx.strokeStyle =
      o.id === selected
        ? "#334e3c"
        : o.shape === "ball"
          ? "#a77943"
          : "#658199";
    ctx.lineWidth = o.id === selected ? 2.5 : 1.5;
    ctx.stroke();
    // A radial stripe makes ball rotation visible, including with a pinned centre.
    if (o.shape === "ball")
      line(
        p,
        screen({
          x: s.x + o.radius * 0.8 * Math.cos(s.angle),
          y: s.y + o.radius * 0.8 * Math.sin(s.angle),
        }),
        "#fff7e9",
        2,
      );
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
        if (o.id === selected) {
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
  G: "grab",
  B: "ball",
  N: "block",
  S: "spring",
  D: "rod",
  T: "belt",
  U: "pulley",
}))
  document.querySelector(`[data-tool="${t}"]`).title =
    `${t[0].toUpperCase() + t.slice(1)} (${key})`;
chooseTool("grab");
draw();
requestAnimationFrame(frame);
