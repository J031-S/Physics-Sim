// Building blocks for the minitools' mini simulations. Every scene is built
// through an engine's public API, the way the engines' own presets build
// theirs, and measured from the engine's state; nothing here models physics.
// No DOM. `E` is the engine module the page loaded (physics.js,
// orbitlab/model.js, fieldlab/model.js or circuitlab/model.js).
//
// A built model carries `tags` for the minitool: ids of what to watch, the
// region to keep in view, and what the measurements have seen so far.

// ---------------------------------------------------------------- sandbox

// An empty sandbox with no losses. Gravity is off unless asked for; the floor
// (always at y = 0) is frictionless unless asked otherwise.
export function sandbox(E, options = {}) {
  const {
    view = { minX: -6, maxX: 6, minY: 0, maxY: 6 },
    gravity = 0,
    floorFriction = 0,
    ...settings
  } = options;
  const sim = new E.Sandbox();
  sim.setViewport(view);
  sim.updateSettings({ gravity, walls: false, ...settings });
  sim.updateFloor({ friction: floorFriction, restitution: 0 });
  sim.tags = { view: { ...view } };
  return sim;
}

// A body placed exactly, with no damping: `size` is a ball's diameter or a
// block's [width, height].
export function body(sim, shape, options) {
  const {
    x,
    y,
    angle = 0,
    size,
    vx = 0,
    vy = 0,
    omega = 0,
    ...constants
  } = options;
  const id = sim.add(shape, { x: 0, y: sim.viewport.maxY / 2 });
  if (shape === "wedge") {
    sim.setLock(id, "position", false);
    sim.setLock(id, "rotation", false);
  }
  if (size) sim.resizeBody(id, ...[].concat(size));
  sim.updateConstants(id, {
    linearDamping: 0,
    angularDamping: 0,
    friction: 0,
    restitution: 0,
    ...constants,
  });
  sim.setPose(id, { x, y, angle });
  if (vx || vy || omega) sim.setVelocity(id, { vx, vy, omega });
  return id;
}

// A uniform field region (sandbox `fields`): type "electric" (strength in
// N/C along `angle`) or "magnetic" (tesla, out of the screen).
export function region(
  sim,
  type,
  { x, y, width, height, strength, angle = 0 },
) {
  const id = sim.fields.add(type, { x, y });
  sim.fields.update(id, {
    shape: "rectangle",
    width,
    height,
    angle,
    strength,
  });
  return id;
}

// ---------------------------------------------------------------- orbitlab

// An orbit scene around a central body of mass M (kg) and radius R (m),
// with one satellite launched horizontally at radius r with speed v.
export function orbit(E, { M, R = 6.371e6, r, v, angle = 0, m, warp }) {
  const lab = new E.OrbitLab();
  lab.setBody({ key: "custom", name: "Central body", mass: M, radius: R });
  if (m !== undefined) lab.setSatelliteMass(m);
  const aim = { radius: r, speed: v, angle };
  const id = lab.launch(aim),
    el = lab.preview(aim).elements;
  // Played so that an orbit takes about eight seconds (the engine's own
  // predicted period), or a leaving satellite crosses a few radii.
  lab.tags = {
    satellite: id,
    aim,
    warp: warp ?? (Number.isFinite(el.period) ? el.period / 8 : (3 * r) / v),
  };
  return lab;
}

// ---------------------------------------------------------------- fieldlab

export function fields(E, mode = "electric", view = 3) {
  const lab = new E.FieldLab();
  lab.tags = { mode, view };
  return lab;
}

// ---------------------------------------------------------------- circuitlab

// A cell of emf `emf` with the given components in series round one loop,
// an ammeter first. Returns the circuit with tags.cell, tags.ammeter and
// tags.parts (ids in order).
export function loop(E, emf, parts) {
  const lab = new E.CircuitLab(),
    UP = 3,
    width = 3 + 3 * parts.length;
  lab.tags = { parts: [] };
  lab.tags.cell = lab.add("cell", { x: 0, y: 2, rot: UP, emf });
  lab.wire([0, 3], [0, 4], [1, 4]);
  lab.tags.ammeter = lab.add("ammeter", { x: 2, y: 4 });
  let x = 3;
  for (const [kind, props] of parts) {
    lab.wire([x, 4], [x + 1, 4]);
    lab.tags.parts.push(lab.add(kind, { x: x + 2, y: 4, ...props }));
    x += 3;
  }
  lab.wire([x, 4], [width, 4], [width, 0], [0, 0], [0, 1]);
  return lab;
}
// Resistors side by side between two rails, fed by a cell.
export function parallel(E, emf, resistances) {
  const lab = new E.CircuitLab(),
    UP = 3,
    right = 3 + 3 * resistances.length;
  lab.tags = { parts: [] };
  lab.tags.cell = lab.add("cell", { x: 0, y: 2, rot: UP, emf });
  lab.wire([0, 3], [0, 6], [1, 6]);
  lab.tags.ammeter = lab.add("ammeter", { x: 2, y: 6 });
  lab.wire([3, 6], [right, 6]);
  lab.wire([0, 1], [0, 0], [right, 0]);
  resistances.forEach((resistance, i) => {
    const x = 4 + 3 * i;
    lab.tags.parts.push(lab.add("resistor", { x, y: 3, rot: UP, resistance }));
    lab.wire([x, 4], [x, 6]);
    lab.wire([x, 2], [x, 0]);
  });
  return lab;
}

// ---------------------------------------------------------------- measuring

// The period of an oscillating quantity, from the times it last crossed its
// middle value going upwards. `value` is read each frame; returns the
// latest period, or null until two crossings have been seen.
export function period(model, key, value, middle, time) {
  const t = (model.tags.periods ??= {}),
    seen = (t[key] ??= { last: null, crossings: [] });
  if (seen.last !== null && seen.last < middle && value >= middle) {
    // Interpolated between the two frames.
    const at =
      time -
      (time - (seen.lastTime ?? time)) *
        ((value - middle) / (value - seen.last || 1));
    seen.crossings.push(at);
  }
  seen.last = value;
  seen.lastTime = time;
  const c = seen.crossings;
  return c.length >= 2 ? c[c.length - 1] - c[c.length - 2] : null;
}

// A value captured once, when `ready` first becomes true.
export function once(model, key, ready, read) {
  const t = (model.tags.once ??= {});
  if (!(key in t) && ready) t[key] = read();
  return t[key] ?? null;
}
