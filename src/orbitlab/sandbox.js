// The gravity sandbox on the orbits page: its panels, its input on the
// scene and its part of each frame. The physics is GravityLab (nbody.js);
// the drawing is drawSandbox in render.js. app.js owns the page (header,
// time warp, view, presets, files) and hands over to this while the page is
// in sandbox mode.
import { GravityLab, LIMITS } from "./nbody.js";
import { orbitPath } from "./model.js";
import { ARROW } from "./render.js";

const km = 1e3,
  AU = 1.496e11,
  HANDLE = 11;

// The kinds of body that can be added, each with a real example's values.
export const KINDS = [
  { id: "star", label: "Star", like: "the Sun", mass: 1.989e30, radius: 6.957e8 },
  { id: "giant", label: "Gas giant", like: "Jupiter", mass: 1.898e27, radius: 6.991e7 },
  { id: "planet", label: "Planet", like: "the Earth", mass: 5.972e24, radius: 6.371e6 },
  { id: "moon", label: "Moon", like: "the Moon", mass: 7.342e22, radius: 1.737e6 },
  { id: "asteroid", label: "Asteroid", like: "Ceres", mass: 9.39e20, radius: 4.73e5 },
  { id: "craft", label: "Spacecraft", like: "a small probe", mass: 1000, radius: 10 },
  { id: "custom", label: "Custom", like: "", mass: 1e24, radius: 5e6 },
];

// `page` gives what the sandbox needs from the orbits page: canvas, view,
// renderer, palette(), toast(message), attempt(fn), format { num, duration,
// prefixed, joined, speedText, angleText }, onChange() (the scene changed:
// lists, Reset), and isRunning().
export function createSandbox(page) {
  const lab = new GravityLab(),
    { canvas, view, renderer } = page,
    $ = (id) => document.getElementById(id),
    f = page.format;
  let selected = null,
    placing = null, // the kind being placed, while Place is armed
    keepPlacing = false,
    snapping = false,
    ghost = null,
    drag = null,
    // The scene as it was when Run was first pressed after setting up, for
    // Reset.
    start = null,
    prediction = null; // two-body orbit of the selected body, in metres

  // Distances: kilometres up to a hundredth of an AU, then AU.
  const distance = (m, sig = 4) =>
    Math.abs(m) >= 0.01 * AU
      ? [f.num(m / AU, sig), "AU"]
      : [f.num(m / km, sig), "km"];
  const speed = (v, sig = 4) => [f.num(v / km, sig), "km/s"];
  const mass = (m) => [f.num(m, 4), "kg"];
  const format = { joined: f.joined, distance, speedText: speed };

  // ---------------------------------------------------------------- panels

  function rowsOf(grid, rows) {
    grid.replaceChildren();
    for (const [key, text] of rows) {
      const name = document.createElement("span");
      name.textContent = text;
      if (!key) {
        name.className = "heading";
        grid.append(name);
        continue;
      }
      const value = document.createElement("span"),
        unit = document.createElement("span");
      value.className = "num";
      value.id = `${grid.id}-${key}`;
      unit.className = "unit";
      unit.id = `${grid.id}-${key}-unit`;
      grid.append(name, value, unit);
    }
  }
  const put = (el, text) => {
    if (el && el.textContent !== text) el.textContent = text;
  };
  const show = (grid, key, [value, unit = ""]) => {
    put($(`${grid}-${key}`), value);
    put($(`${grid}-${key}-unit`), unit);
  };
  rowsOf($("system-grid"), [
    ["time", "Time"],
    ["count", "Bodies"],
    ["kinetic", "Kinetic energy"],
    ["potential", "Gravitational PE"],
    ["total", "Total energy"],
    ["drift", "Total energy change"],
    ["momentum", "Total momentum"],
    ["angular", "Angular momentum"],
  ]);
  rowsOf($("body-grid"), [
    ["mass", "Mass"],
    ["radius", "Radius"],
    ["force", "Gravitational force on it"],
    [null, "Orbit"],
    ["ref", "Goes round"],
    ["distance", "Distance"],
    ["speed", "Speed relative to it"],
    ["type", "Orbit type"],
    ["a", "Semi-major axis a"],
    ["e", "Eccentricity e"],
    ["period", "Period T = 2π√(a³/G(M+m))"],
  ]);

  // The Add form: the kind, then its mass and radius (typed values make it
  // Custom).
  const kindSelect = $("body-kind"),
    newMass = $("new-body-mass"),
    newRadius = $("new-body-radius");
  for (const k of KINDS) {
    const option = document.createElement("option");
    option.value = k.id;
    option.textContent = k.like ? `${k.label} (like ${k.like})` : k.label;
    kindSelect.append(option);
  }
  kindSelect.value = "planet";
  const kind = () => KINDS.find((k) => k.id === kindSelect.value);
  function fillKind() {
    const k = kind();
    newMass.value = String(Number(k.mass.toPrecision(4)));
    newRadius.value = String(Number((k.radius / km).toPrecision(4)));
  }
  fillKind();
  kindSelect.addEventListener("change", fillKind);
  for (const input of [newMass, newRadius])
    input.addEventListener("input", () => {
      const k = kind();
      if (
        Number(newMass.value) !== Number(k.mass.toPrecision(4)) ||
        Number(newRadius.value) !== Number((k.radius / km).toPrecision(4))
      )
        kindSelect.value = "custom";
    });
  function newBody() {
    const m = Number(newMass.value),
      r = Number(newRadius.value) * km;
    if (!(m >= LIMITS.mass[0] && m <= LIMITS.mass[1]))
      throw new Error(
        `Mass must be between ${LIMITS.mass[0]} and ${LIMITS.mass[1]} kg.`,
      );
    if (!(r >= LIMITS.radius[0] && r <= LIMITS.radius[1]))
      throw new Error(
        `Radius must be between ${LIMITS.radius[0] / km} and ${LIMITS.radius[1] / km} km.`,
      );
    return { mass: m, radius: r, label: kind().label };
  }
  function armPlace(on) {
    if (on && !page.attempt(() => (placing = newBody()))) return;
    if (!on) placing = null;
    ghost = null;
    $("place-body").setAttribute("aria-pressed", String(!!placing));
    canvas.style.cursor = placing ? "crosshair" : "";
  }
  $("place-body").addEventListener("click", () => armPlace(!placing));
  // Take the centre of mass's velocity off every body, so that the system
  // as a whole stays where it is instead of drifting away. Their motion
  // relative to one another is unchanged.
  $("stop-drift").addEventListener("click", () => {
    const c = lab.centreOfMass();
    for (const b of lab.list())
      lab.update(b.id, { vx: b.vx - c.vx, vy: b.vy - c.vy });
    changed();
    page.toast("The centre of mass is now at rest.");
  });
  $("clear-bodies").addEventListener("click", () => {
    lab.clear();
    selected = null;
    start = null;
    changed();
  });

  // The selected body's editor: name, mass and radius.
  const nameInput = $("body-name"),
    massInput = $("body-mass"),
    radiusInput = $("body-radius");
  function editBody(patch) {
    if (selected === null) return;
    if (page.attempt(() => lab.update(selected, patch))) changed();
    syncEditor();
  }
  nameInput.addEventListener("change", () => editBody({ name: nameInput.value }));
  massInput.addEventListener("change", () =>
    editBody({ mass: Number(massInput.value) }),
  );
  radiusInput.addEventListener("change", () =>
    editBody({ radius: Number(radiusInput.value) * km }),
  );
  $("circular-body").addEventListener("click", () => makeCircular(selected));
  $("delete-body").addEventListener("click", () => removeBody(selected));
  function syncEditor() {
    const b = lab.get(selected);
    $("body-panel").hidden = !b;
    if (!b) return;
    put($("body-subject"), "· " + b.name);
    if (document.activeElement !== nameInput) nameInput.value = b.name;
    if (document.activeElement !== massInput)
      massInput.value = String(Number(b.mass.toPrecision(5)));
    if (document.activeElement !== radiusInput)
      radiusInput.value = String(Number((b.radius / km).toPrecision(5)));
    $("circular-body").disabled = lab.reference(b.id) === null;
  }

  // A chip per body, to select it or remove it.
  function buildList() {
    const list = $("body-list"),
      colours = page.palette();
    list.replaceChildren();
    for (const b of lab.list()) {
      const chip = document.createElement("span"),
        pick = document.createElement("button"),
        dot = document.createElement("span"),
        remove = document.createElement("button");
      chip.className = "ol-chip";
      dot.className = "dot";
      dot.style.background =
        b.mass > 1e29
          ? colours.star
          : colours.satellites[b.colour % colours.satellites.length];
      pick.append(dot, b.name);
      pick.dataset.body = b.id;
      pick.setAttribute("aria-pressed", String(b.id === selected));
      pick.addEventListener("click", () => select(b.id));
      remove.className = "remove";
      remove.textContent = "×";
      remove.title = `Remove ${b.name}`;
      remove.setAttribute("aria-label", `Remove ${b.name}`);
      remove.addEventListener("click", () => removeBody(b.id));
      chip.append(pick, remove);
      list.append(chip);
    }
    put(
      $("place-note"),
      lab.list().length
        ? "A new body starts on a circular orbit round the body it is placed near. Hold Ctrl to place several."
        : "Choose what to add, press Place, then click the scene. Hold Ctrl to place several.",
    );
  }
  function select(id) {
    selected = id;
    prediction = null;
    buildList();
    syncEditor();
  }
  function changed() {
    prediction = null;
    buildList();
    syncEditor();
    page.onChange();
  }
  function removeBody(id) {
    if (id === null || !lab.get(id)) return;
    lab.remove(id);
    if (selected === id) selected = null;
    changed();
  }
  // Set a body moving on a circular orbit round the body it goes round (at
  // √(G(M+m)/r) relative to it, anticlockwise); that body's own motion is
  // left as it is.
  function makeCircular(id) {
    const ref = lab.reference(id);
    if (ref === null) return;
    const v = lab.circularVelocity(id, ref);
    if (page.attempt(() => lab.update(id, { vx: v.vx, vy: v.vy }))) changed();
  }

  function updatePanels() {
    const e = lab.energy(),
      p = lab.momentum();
    show("system-grid", "time", f.duration(lab.time));
    show("system-grid", "count", [String(lab.list().length), ""]);
    show("system-grid", "kinetic", f.prefixed(e.kinetic, "J"));
    show("system-grid", "potential", f.prefixed(e.potential, "J"));
    show("system-grid", "total", f.prefixed(e.total, "J"));
    show("system-grid", "drift", [
      e.start ? f.num((100 * (e.total - e.start)) / Math.abs(e.start), 2) : "0",
      "%",
    ]);
    show("system-grid", "momentum", [f.num(Math.hypot(p.x, p.y), 3), "kg·m/s"]);
    show("system-grid", "angular", [f.num(Math.abs(lab.angularMomentum()), 4), "kg·m²/s"]);
    const b = lab.get(selected);
    if (!b) return;
    const force = lab.force(b.id),
      orbit = lab.orbitRound(b.id);
    show("body-grid", "mass", mass(b.mass));
    show("body-grid", "radius", distance(b.radius));
    show("body-grid", "force", f.prefixed(Math.hypot(force.x, force.y), "N"));
    if (!orbit) {
      for (const key of ["distance", "speed", "type", "a", "e", "period"])
        show("body-grid", key, ["–", ""]);
      show("body-grid", "ref", ["the heaviest body", ""]);
      return;
    }
    const ref = lab.get(orbit.ref),
      el = orbit.elements,
      vrel = Math.hypot(b.vx - ref.vx, b.vy - ref.vy);
    show("body-grid", "ref", [ref.name, ""]);
    show("body-grid", "distance", distance(Math.hypot(b.x - ref.x, b.y - ref.y)));
    show("body-grid", "speed", speed(vrel));
    show("body-grid", "type", [
      el.bound ? (el.shape === "circular" ? "Circle" : "Ellipse") : "Escaping",
      "",
    ]);
    show("body-grid", "a", el.bound ? distance(el.semiMajorAxis) : ["–", ""]);
    show("body-grid", "e", [f.num(el.eccentricity, 4), ""]);
    show("body-grid", "period", el.bound ? f.duration(el.period) : ["–", ""]);
    // The path it would follow round the other if nothing else pulled.
    if (!prediction || prediction.at !== lab.time || prediction.id !== b.id)
      prediction = {
        id: b.id,
        at: lab.time,
        points: orbitPath(el, {
          maxRadius: 3 * Math.hypot(b.x - ref.x, b.y - ref.y),
        }).map(([x, y]) => [x + ref.x, y + ref.y]),
      };
  }

  // ---------------------------------------------------------------- scene

  // The box the view should hold: every body, and the orbits of those that
  // go round another.
  function sceneBox() {
    const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
      add = (x, y) => {
        box.minX = Math.min(box.minX, x);
        box.maxX = Math.max(box.maxX, x);
        box.minY = Math.min(box.minY, y);
        box.maxY = Math.max(box.maxY, y);
      };
    for (const b of lab.list()) {
      add(b.x - b.radius, b.y - b.radius);
      add(b.x + b.radius, b.y + b.radius);
      const orbit = lab.orbitRound(b.id);
      if (orbit?.elements.bound) {
        const ref = lab.get(orbit.ref),
          far = Math.min(orbit.elements.apoapsis, 1e3 * orbit.elements.radius);
        // Only orbits round a body near the middle are worth framing (a
        // moon's orbit is inside its planet's).
        add(ref.x - far, ref.y - far);
        add(ref.x + far, ref.y + far);
      }
    }
    if (!Number.isFinite(box.minX)) return { minX: -AU, maxX: AU, minY: -AU, maxY: AU };
    return box;
  }

  function draw(options) {
    // Trail points about two pixels apart at the present zoom.
    lab.trailSpacing = 2 / view.scale;
    renderer.drawSandbox(lab, {
      ...options,
      selected,
      prediction: prediction?.points ?? null,
      ghost,
      format,
    });
    syncEditor();
    updatePanels();
    // Where the selected body and its arrow's handle are, in canvas pixels,
    // for tests/orbitlab-smoke.mjs (which cannot see the picture).
    const chosen = lab.get(selected),
      at = (x, y) => x.toFixed(1) + "," + y.toFixed(1);
    canvas.dataset.bodyPoint = chosen
      ? at(...renderer.screen(chosen.x, chosen.y))
      : "";
    if (chosen) {
      const g = renderer.sandboxHandle(lab, chosen.id);
      canvas.dataset.bodyHandle = at(g.tipX, g.tipY);
    } else canvas.dataset.bodyHandle = "";
    for (const event of lab.events.splice(0))
      page.toast(`${event.from} hit ${lab.get(event.into)?.name ?? "another body"} and merged with it.`);
    if (lab.list().length !== buildList.count) {
      buildList.count = lab.list().length;
      buildList();
    }
  }

  // ---------------------------------------------------------------- input

  function hitTest(sx, sy) {
    const chosen = lab.get(selected);
    if (chosen) {
      const g = renderer.sandboxHandle(lab, chosen.id);
      if (Math.hypot(sx - g.tipX, sy - g.tipY) <= HANDLE)
        return { type: "aim", id: chosen.id };
    }
    for (const b of [...lab.list()].reverse()) {
      const [x, y] = renderer.screen(b.x, b.y);
      if (Math.hypot(sx - x, sy - y) <= Math.max(renderer.sandboxRadius(b), 8))
        return { type: "body", id: b.id };
    }
    return null;
  }
  // Snapping: positions to half a grid square (the grid follows the zoom);
  // velocities to 15° steps from the line to the body it goes round (so
  // 90° is straight across it) and to 0.05 of the circular speed there.
  const SNAP_ANGLE = Math.PI / 12,
    SNAP_SPEED = 0.05;
  function snapPoint(p) {
    if (!snapping) return p;
    const step = renderer.gridStep() / 2;
    return {
      x: Math.round(p.x / step) * step,
      y: Math.round(p.y / step) * step,
    };
  }
  function setSnapping(on) {
    snapping = on;
    $("snap-toggle").checked = on;
  }
  $("snap-toggle").addEventListener("change", (e) =>
    setSnapping(e.target.checked),
  );

  // Put a new body at world point p, moving on a circular orbit round the
  // body it would go round.
  function place(p, ctrl) {
    let id;
    const count = lab.list().filter((b) => b.name.startsWith(placing.label)).length;
    if (
      !page.attempt(
        () =>
          (id = lab.add({
            name: `${placing.label} ${count + 1}`,
            mass: placing.mass,
            radius: placing.radius,
            x: p.x,
            y: p.y,
          })),
      )
    )
      return;
    if (lab.reference(id) !== null) makeCircular(id);
    select(id);
    changed();
    if (!ctrl) armPlace(false);
    else keepPlacing = true;
  }
  // Returns true if it used the event.
  function pointerdown(e, sx, sy) {
    const p = renderer.world(sx, sy);
    // Building the scene: the view stays put under the pointer.
    page.holdView();
    if (placing) {
      place(snapPoint(p), e.ctrlKey || e.metaKey);
      return true;
    }
    const hit = hitTest(sx, sy);
    if (!hit) return false;
    select(hit.id);
    const b = lab.get(hit.id);
    drag =
      hit.type === "aim"
        ? { type: "aim", id: hit.id }
        : { type: "move", id: hit.id, dx: b.x - p.x, dy: b.y - p.y };
    return true;
  }
  function pointermove(e, sx, sy) {
    const p = renderer.world(sx, sy);
    if (!drag) {
      if (placing)
        ghost = { ...snapPoint(p), mass: placing.mass, radius: placing.radius };
      else {
        const hit = hitTest(sx, sy);
        canvas.style.cursor = hit ? (hit.type === "aim" ? "pointer" : "move") : "";
      }
      return false;
    }
    const b = lab.get(drag.id);
    if (!b) {
      drag = null;
      return true;
    }
    if (drag.type === "move") {
      // A move that would overlap another body is simply not made.
      try {
        lab.update(b.id, snapPoint({ x: p.x + drag.dx, y: p.y + drag.dy }));
        prediction = null;
      } catch {}
    } else {
      // The arrow sets the velocity relative to the body it goes round, in
      // units of the circular speed there (as it is drawn); Shift keeps the
      // direction and changes only the speed.
      const frame = lab.velocityFrame(b.id),
        [x, y] = renderer.screen(b.x, b.y),
        dx = sx - x,
        dy = y - sy,
        ref = frame.ref === null ? lab.centreOfMass() : lab.get(frame.ref),
        now = Math.hypot(frame.vx, frame.vy);
      let size = Math.min(
          (Math.hypot(dx, dy) / ARROW) * frame.unit,
          LIMITS.speed / 2,
        ),
        [ux, uy] =
          e.shiftKey && now > 0
            ? [frame.vx / now, frame.vy / now]
            : Math.hypot(dx, dy) > 1
              ? [dx / Math.hypot(dx, dy), dy / Math.hypot(dx, dy)]
              : [0, 0];
      if (snapping) {
        if (frame.unit > 0)
          size =
            Math.round(size / frame.unit / SNAP_SPEED) *
            SNAP_SPEED *
            frame.unit;
        // Measured from the outward line from the body it goes round.
        const out =
            frame.ref === null ? 0 : Math.atan2(b.y - ref.y, b.x - ref.x),
          turn =
            Math.round((Math.atan2(uy, ux) - out) / SNAP_ANGLE) * SNAP_ANGLE +
            out;
        if ((ux || uy) && !e.shiftKey) [ux, uy] = [Math.cos(turn), Math.sin(turn)];
      }
      try {
        lab.update(b.id, {
          vx: ref.vx + ux * size,
          vy: ref.vy + uy * size,
        });
        prediction = null;
      } catch {}
    }
    return true;
  }
  function pointerup() {
    if (!drag) return false;
    drag = null;
    changed();
    return true;
  }
  function keydown(e) {
    if (e.key === "Escape" && placing) {
      armPlace(false);
      return true;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && selected !== null) {
      e.preventDefault();
      removeBody(selected);
      return true;
    }
    return false;
  }
  function keyup(e) {
    if ((e.key === "Control" || e.key === "Meta") && keepPlacing) {
      keepPlacing = false;
      armPlace(false);
    }
  }

  // ---------------------------------------------------------------- time

  function running() {
    if (!start) start = lab.exportScene();
  }
  // Back to the scene as it was set up, before Run.
  function reset() {
    if (start) lab.loadScene(start);
    start = null;
    selected = lab.get(selected) ? selected : null;
    changed();
  }
  function load(data) {
    lab.loadScene(data);
    start = null;
    selected = null;
    changed();
  }
  function loadPreset(preset) {
    lab.clear();
    lab.nextId = 1;
    preset.build(lab);
    lab.time = 0;
    start = null;
    selected = null;
    changed();
  }

  buildList();
  syncEditor();
  return {
    lab,
    draw,
    sceneBox,
    pointerdown,
    pointermove,
    pointerup,
    keydown,
    keyup,
    setSnapping,
    snapping: () => snapping,
    running,
    reset,
    load,
    loadPreset,
    clearTrails: () => lab.clearTrails(),
    canReset: () => !!start || lab.list().length > 0,
  };
}
