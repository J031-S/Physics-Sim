// Circuit lab model: DC circuits of ideal components, solved exactly by
// modified nodal analysis. SI units throughout (V, A, Ω, F, s, W, J, C).
// No DOM: everything here is testable from Node.
//
// A circuit is a list of components, each with two terminals (three for the
// two-way switch). Terminals that share a node are joined. A component is
// either placed on the grid, when its nodes are the grid points its
// terminals sit on, or given node names directly (`nodes`), as the tests do.
//
// The unknowns are the potential of every node and the current through
// every element that fixes a potential difference rather than obeying
// I = V/R: cells, wires, ammeters, closed switches, and capacitors at an
// instant. A wire is exactly zero resistance and a voltmeter exactly
// infinite; neither is approximated by a large or small resistor.
//
// The solver is general about time: an EMF may be a function of time, and a
// capacitor is one case of a "reactive" element described by three stamps
// (see `branchOf`). An inductor would be a fourth kind of the same shape.
// Elements are linear; a non-linear one would repeat the solve of `#solveAt`
// with its stamp re-linearised (Newton's method) until it stops changing.

export const STEPS_PER_TAU = 100; // time steps in the shortest time constant

export const KINDS = {
  cell: { label: "Cell", prefix: "E", keys: ["emf", "internal"] },
  resistor: { label: "Resistor", prefix: "R", keys: ["resistance"] },
  variable: {
    label: "Variable resistor",
    prefix: "R",
    keys: ["resistance", "maximum"],
  },
  lamp: { label: "Lamp", prefix: "L", keys: ["resistance", "ratedPower"] },
  switch: { label: "Switch", prefix: "S", keys: ["closed"] },
  switch2: {
    label: "Two-way switch",
    prefix: "S",
    keys: ["position"],
    terminals: 3,
  },
  wire: { label: "Wire", prefix: "", keys: [] },
  ammeter: { label: "Ammeter", prefix: "A", keys: [] },
  voltmeter: { label: "Voltmeter", prefix: "V", keys: [] },
  capacitor: {
    label: "Capacitor",
    prefix: "C",
    keys: ["capacitance", "initialVoltage"],
  },
};

// Allowed range of every editable quantity (SI). The forms in app.js mirror
// these; change both together.
export const LIMITS = {
  emf: [-1000, 1000],
  internal: [0, 1e6],
  resistance: [0, 1e9],
  lampResistance: [0.01, 1e6],
  maximum: [0.01, 1e9],
  ratedPower: [1e-3, 1e4],
  capacitance: [1e-12, 100],
  initialVoltage: [-1000, 1000],
  grid: 10000,
  items: 400,
};

const DEFAULTS = {
  cell: { emf: 6, internal: 0 },
  resistor: { resistance: 10 },
  variable: { resistance: 50, maximum: 100 },
  lamp: { resistance: 12, ratedPower: 3 },
  switch: { closed: false },
  switch2: { position: "a" },
  wire: {},
  ammeter: {},
  voltmeter: {},
  capacitor: { capacitance: 100e-6, initialVoltage: 0 },
};

const NAMES = {
  emf: "EMF",
  internal: "Internal resistance",
  resistance: "Resistance",
  maximum: "Maximum resistance",
  ratedPower: "Rated power",
  capacitance: "Capacitance",
  initialVoltage: "Initial voltage",
};

// Terminal positions about the component's centre, in grid units, before it
// is turned. Terminal 0 is the positive one of a cell, of a capacitor and
// of a meter, and the common contact of a two-way switch.
const SHAPES = {
  2: [
    [-1, 0],
    [1, 0],
  ],
  3: [
    [-1, 0],
    [1, 1],
    [1, -1],
  ],
};
const terminalCount = (kind) => KINDS[kind].terminals || 2;
// `rot` counts quarter-turns anticlockwise (y is up).
export function terminalOffsets(kind, rot = 0) {
  return SHAPES[terminalCount(kind)].map(([x, y]) => {
    for (let i = 0; i < (rot & 3); i++) [x, y] = [-y, x];
    return [x + 0, y + 0];
  });
}
const pointKey = (x, y) => x + "," + y;

function inRange(key, value, [lo, hi], unit) {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`${NAMES[key]} must be a number.`);
  if (value < lo || value > hi)
    throw new Error(
      `${NAMES[key]} must be between ${lo} and ${hi.toPrecision(1) / 1} ${unit}.`,
    );
}
function gridNumber(value, what) {
  if (!Number.isInteger(value) || Math.abs(value) > LIMITS.grid)
    throw new Error(`${what} must be a point on the grid.`);
}

// Checks a whole component; throws a student-readable Error.
function validate(item) {
  const kind = item.kind;
  if (kind === "cell") {
    if (typeof item.emf !== "function")
      inRange("emf", item.emf, LIMITS.emf, "V");
    inRange("internal", item.internal, LIMITS.internal, "Ω");
  } else if (kind === "resistor")
    inRange("resistance", item.resistance, LIMITS.resistance, "Ω");
  else if (kind === "variable") {
    inRange("maximum", item.maximum, LIMITS.maximum, "Ω");
    inRange("resistance", item.resistance, LIMITS.resistance, "Ω");
    if (item.resistance > item.maximum)
      throw new Error(
        "Resistance cannot be more than this variable resistor's maximum.",
      );
  } else if (kind === "lamp") {
    inRange("resistance", item.resistance, LIMITS.lampResistance, "Ω");
    inRange("ratedPower", item.ratedPower, LIMITS.ratedPower, "W");
  } else if (kind === "switch") {
    if (typeof item.closed !== "boolean")
      throw new Error("A switch is either open or closed.");
  } else if (kind === "switch2") {
    if (item.position !== "a" && item.position !== "b")
      throw new Error("A two-way switch is at position a or b.");
  } else if (kind === "capacitor") {
    inRange("capacitance", item.capacitance, LIMITS.capacitance, "F");
    inRange(
      "initialVoltage",
      item.initialVoltage,
      LIMITS.initialVoltage,
      "V",
    );
  }
  if (item.explicit) {
    if (
      !Array.isArray(item.nodes) ||
      item.nodes.length !== terminalCount(kind) ||
      item.nodes.some((n) => typeof n !== "string" || !n)
    )
      throw new Error(
        `${KINDS[kind].label}: give one node name for each terminal.`,
      );
  } else if (kind === "wire")
    for (const k of ["x1", "y1", "x2", "y2"]) gridNumber(item[k], "A wire end");
  else {
    gridNumber(item.x, "Position");
    gridNumber(item.y, "Position");
    if (!Number.isInteger(item.rot))
      throw new Error("A component turns in quarter-turns.");
  }
}

// ------------------------------------------------------------ linear algebra

// Gaussian elimination with scaled partial pivoting, kept as an LU
// factorisation so that one elimination serves every time step. `a` is the
// n × n matrix by rows and is overwritten. Rows are compared after scaling
// each by its largest entry, because a row of conductances (10⁻⁶ S) and a
// row of ±1 from a wire differ by many orders of magnitude.
export function factor(a, n) {
  const perm = new Int32Array(n),
    scale = new Float64Array(n);
  let ok = true;
  for (let i = 0; i < n; i++) {
    perm[i] = i;
    let big = 0;
    for (let j = 0; j < n; j++) big = Math.max(big, Math.abs(a[i * n + j]));
    if (big === 0) ok = false;
    scale[i] = big || 1;
  }
  for (let k = 0; k < n && ok; k++) {
    let best = -1,
      size = 0;
    for (let i = k; i < n; i++) {
      const s = Math.abs(a[perm[i] * n + k]) / scale[perm[i]];
      if (s > size) {
        size = s;
        best = i;
      }
    }
    // No usable pivot: the equations are not independent.
    if (size < 1e-13) {
      ok = false;
      break;
    }
    [perm[k], perm[best]] = [perm[best], perm[k]];
    const pk = perm[k] * n,
      pivot = a[pk + k];
    for (let i = k + 1; i < n; i++) {
      const pi = perm[i] * n,
        m = a[pi + k] / pivot;
      a[pi + k] = m;
      if (m !== 0) for (let j = k + 1; j < n; j++) a[pi + j] -= m * a[pk + j];
    }
  }
  return { ok, a, n, perm };
}
// Forward and back substitution: the solution x of the factorised system.
export function substitute(f, b) {
  const { a, n, perm } = f,
    x = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const pi = perm[i] * n;
    let sum = b[perm[i]];
    for (let j = 0; j < i; j++) sum -= a[pi + j] * x[j];
    x[i] = sum;
  }
  for (let i = n - 1; i >= 0; i--) {
    const pi = perm[i] * n;
    let sum = x[i];
    for (let j = i + 1; j < n; j++) sum -= a[pi + j] * x[j];
    x[i] = sum / a[pi + i];
  }
  return x;
}

// Eigenvalues and eigenvectors of a small symmetric matrix (cyclic Jacobi).
function symmetricEigen(a) {
  const n = a.length,
    v = a.map((_, i) => a.map((_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 80; sweep++) {
    let off = 0,
      diag = 0;
    for (let p = 0; p < n; p++) {
      diag += a[p][p] ** 2;
      for (let q = p + 1; q < n; q++) off += a[p][q] ** 2;
    }
    if (off <= 1e-32 * diag || off === 0) break;
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) {
        if (a[p][q] === 0) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]),
          t =
            (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.hypot(theta, 1)),
          c = 1 / Math.hypot(t, 1),
          s = t * c;
        for (let k = 0; k < n; k++) {
          const kp = a[k][p],
            kq = a[k][q];
          a[k][p] = c * kp - s * kq;
          a[k][q] = s * kp + c * kq;
        }
        for (let k = 0; k < n; k++) {
          const pk = a[p][k],
            qk = a[q][k];
          a[p][k] = c * pk - s * qk;
          a[q][k] = s * pk + c * qk;
        }
        for (let k = 0; k < n; k++) {
          const kp = v[k][p],
            kq = v[k][q];
          v[k][p] = c * kp - s * kq;
          v[k][q] = s * kp + c * kq;
        }
      }
  }
  return { values: a.map((row, i) => row[i]), vectors: v };
}

function makeSets(n) {
  const parent = Array.from({ length: n }, (_, i) => i),
    find = (i) => {
      while (parent[i] !== i) i = parent[i] = parent[parent[i]];
      return i;
    };
  return {
    find,
    union(a, b) {
      a = find(a);
      b = find(b);
      if (a === b) return false;
      parent[b] = a;
      return true;
    },
  };
}

// Edges that lie on no closed loop. By Kirchhoff's current law such a
// branch carries exactly no current, so it is reported as exactly zero
// rather than as the rounding error of the solve.
function findBridges(nodeCount, edges) {
  const adj = Array.from({ length: nodeCount }, () => []);
  edges.forEach((e, i) => {
    if (e.a === e.b) return;
    adj[e.a].push([e.b, i]);
    adj[e.b].push([e.a, i]);
  });
  const seen = new Int32Array(nodeCount).fill(-1),
    low = new Int32Array(nodeCount),
    out = new Set();
  let clock = 0;
  for (let root = 0; root < nodeCount; root++) {
    if (seen[root] >= 0) continue;
    const stack = [[root, -1, 0]];
    seen[root] = low[root] = clock++;
    while (stack.length) {
      const top = stack[stack.length - 1],
        [u, via] = top;
      if (top[2] < adj[u].length) {
        const [w, edge] = adj[u][top[2]++];
        if (edge === via) continue;
        if (seen[w] >= 0) low[u] = Math.min(low[u], seen[w]);
        else {
          seen[w] = low[w] = clock++;
          stack.push([w, edge, 0]);
        }
      } else {
        stack.pop();
        if (stack.length) {
          const parent = stack[stack.length - 1][0];
          low[parent] = Math.min(low[parent], low[u]);
          if (low[u] > seen[parent]) out.add(via);
        }
      }
    }
  }
  return out;
}

// --------------------------------------------------------------- the stamps

const emfAt = (item, t) => {
  if (typeof item.emf !== "function") return item.emf;
  const e = Number(item.emf(t));
  return Number.isFinite(e) ? e : 0;
};
// dE/dt of a time-varying EMF, by central difference.
const emfRate = (item, t) => {
  if (typeof item.emf !== "function") return 0;
  const d = 1e-7;
  return (emfAt(item, t + d) - emfAt(item, t - d)) / (2 * d);
};

// What a component is to the solver, in one of three views of the circuit.
//
//   "now"   the circuit at this instant. A capacitor holds its p.d.
//   "step"  the circuit one time step h later (trapezoidal rule): a
//           capacitor is the conductance 2C/h beside a current source that
//           carries its present p.d. and current forward.
//   "jump"  charge moving in no time at all, when a switch joins capacitors
//           or ideal cells that disagree. Every quantity is a charge, not a
//           current: a capacitor passes ΔQ = C·ΔV, a resistance passes none.
//
// Two kinds of branch come back (or null for an open circuit):
//   g  obeys  I = G(Va − Vb) − s                  (I from terminal a to b)
//   v  obeys  Va − Vb − R·I = e, with I an unknown of the solve
// plus `from`/`to`, the terminals it joins.
function branchOf(item, view, h) {
  const wire = { type: "v", R: 0, e: () => 0, from: 0, to: 1 };
  switch (item.kind) {
    case "cell":
      // Terminal p.d. V = E − Ir, where the current out of the + terminal
      // is −I in the a → b sense used here.
      if (view === "jump" && item.internal > 0) return null;
      return {
        ...wire,
        R: view === "jump" ? 0 : item.internal,
        e: (t) => emfAt(item, t),
        rate: (t) => emfRate(item, t),
        source: true,
      };
    case "resistor":
    case "variable":
    case "lamp":
      if (item.resistance === 0) return wire;
      if (view === "jump") return null;
      return { type: "g", G: 1 / item.resistance, s: () => 0, from: 0, to: 1 };
    case "wire":
    case "ammeter":
      return wire;
    case "switch":
      return item.closed ? wire : null;
    case "switch2":
      return { ...wire, to: item.position === "a" ? 1 : 2 };
    case "capacitor": {
      const C = item.capacitance;
      if (view === "now")
        return { ...wire, e: () => item.voltage, cap: true, weight: 1 / C };
      const G = view === "step" ? (2 * C) / h : C;
      return {
        type: "g",
        G,
        s:
          view === "step"
            ? () => G * item.voltage + item.current
            : () => G * item.voltage,
        from: 0,
        to: 1,
        reactive: true,
      };
    }
    default: // voltmeter: no current at all
      return null;
  }
}

const RESISTIVE = new Set(["resistor", "variable", "lamp"]);
const describe = (items) => {
  const names = items.map((i) => i.name);
  return names.length > 1
    ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1]
    : names[0] || "";
};
const volts = (v) => Number(v.toPrecision(4)) + " V";

// The answer to one solve: a status, and a reading for every component.
class Solution {
  constructor(time) {
    this.time = time;
    this.status = "ok";
    this.message = "";
    this.problems = []; // faults: no reading exists in the affected section
    this.notices = []; // remarks about a solution that is valid
    this.readings = new Map();
    this.nodes = new Map(); // node key → { potential, part }
    this.currentFloor = 0;
  }
  of(id) {
    return this.readings.get(id) || null;
  }
  // Potential of a node relative to the reference of its own section, or
  // null where it is not defined.
  potential(key) {
    return this.nodes.get(key)?.potential ?? null;
  }
  // Nodes with the same part number are joined by a conducting path.
  part(key) {
    return this.nodes.get(key)?.part ?? null;
  }
}

export class CircuitLab {
  #items = [];
  #nextId = 1;
  #counters = {};
  #cache = null;
  #unsettled = false;
  #events = [];
  #work = new Map(); // id → { heat, supplied } in joules since reset
  #origin = 0; // time = origin + count × step
  #count = 0;
  #step = 0;
  #carry = 0; // requested time not yet covered by a whole step

  constructor() {
    // Upper limit on the time step, for a circuit whose EMFs change in time
    // (the time constants alone decide it otherwise).
    this.maxStep = Infinity;
  }

  get time() {
    return this.#origin + this.#count * this.#step;
  }

  // ---------------------------------------------------------------- editing

  list() {
    return this.#items;
  }
  get(id) {
    return this.#items.find((i) => i.id === id) || null;
  }
  #need(id) {
    const item = this.get(id);
    if (!item) throw new Error("That component no longer exists.");
    return item;
  }
  #touch() {
    this.#cache = null;
  }

  // Adds a component. Give `nodes` (one name per terminal), or a grid
  // position `x`, `y` and quarter-turns `rot` (a wire: `x1`, `y1`, `x2`,
  // `y2`). Returns its id (null for a wire of no length).
  add(kind, props = {}) {
    if (!KINDS[kind]) throw new Error("Unknown component: " + kind + ".");
    if (this.#items.length >= LIMITS.items)
      throw new Error(`A circuit can hold ${LIMITS.items} parts at most.`);
    const allowed = new Set([
      ...KINDS[kind].keys,
      ...(kind === "wire" ? ["x1", "y1", "x2", "y2"] : ["x", "y", "rot"]),
      "nodes",
    ]);
    for (const k of Object.keys(props))
      if (!allowed.has(k))
        throw new Error(`${KINDS[kind].label} has no "${k}".`);
    const explicit = props.nodes !== undefined,
      item = {
        id: 0,
        kind,
        name: "",
        explicit,
        ...(explicit
          ? {}
          : kind === "wire"
            ? { x1: 0, y1: 0, x2: 0, y2: 0 }
            : { x: 0, y: 0, rot: 0 }),
        ...DEFAULTS[kind],
        ...props,
      };
    if (explicit) item.nodes = [...props.nodes];
    if (kind === "variable" && props.maximum === undefined)
      item.maximum = Math.max(item.maximum, item.resistance || 0);
    validate(item);
    if (
      kind === "wire" &&
      !explicit &&
      item.x1 === item.x2 &&
      item.y1 === item.y2
    )
      return null;
    if (kind === "capacitor") {
      item.voltage = item.initialVoltage;
      item.current = 0;
    }
    item.id = this.#nextId++;
    const prefix = KINDS[kind].prefix;
    if (prefix) {
      this.#counters[prefix] = (this.#counters[prefix] || 0) + 1;
      item.name = prefix + this.#counters[prefix];
    } else item.name = "wire";
    this.#place(item);
    this.#items.push(item);
    this.#touch();
    if (!explicit) this.settle(kind === "wire" ? undefined : item.id);
    return this.get(item.id) ? item.id : null;
  }

  // Wires along a path of grid points: wire([0, 0], [4, 0], [4, 2]).
  wire(...points) {
    const ids = [];
    for (let i = 1; i < points.length; i++) {
      const [x1, y1] = points[i - 1],
        [x2, y2] = points[i],
        id = this.add("wire", { x1, y1, x2, y2 });
      if (id) ids.push(id);
    }
    return ids.filter((id) => this.get(id));
  }

  // Changes values, or a position (then call `settle`, as after `move`),
  // or the nodes of a component given by node names. The whole patch is
  // checked before any of it is applied.
  update(id, patch) {
    const item = this.#need(id),
      allowed = new Set([
        ...KINDS[item.kind].keys,
        ...(item.explicit
          ? ["nodes"]
          : item.kind === "wire"
            ? ["x1", "y1", "x2", "y2"]
            : ["x", "y", "rot"]),
      ]);
    for (const k of Object.keys(patch))
      if (!allowed.has(k))
        throw new Error(
          `"${k}" cannot be changed on a ${KINDS[item.kind].label.toLowerCase()}.`,
        );
    const next = { ...item, ...patch };
    if (patch.nodes) next.nodes = [...patch.nodes];
    validate(next);
    Object.assign(item, next);
    // A change of position is part of a gesture: `settle` ends it.
    if (["x", "y", "rot", "x1", "y1", "x2", "y2"].some((k) => k in patch))
      this.#unsettled = true;
    // Setting the starting p.d. of a capacitor sets its p.d. now as well.
    if (patch.initialVoltage !== undefined) item.voltage = item.initialVoltage;
    this.#place(item);
    this.#touch();
    return item;
  }

  // Opens or closes a switch; moves a two-way switch to its other contact.
  toggle(id) {
    const item = this.#need(id);
    if (item.kind === "switch") item.closed = !item.closed;
    else if (item.kind === "switch2")
      item.position = item.position === "a" ? "b" : "a";
    else throw new Error("Only a switch can be switched.");
    this.#touch();
    return item;
  }

  remove(id) {
    this.#need(id);
    this.#items = this.#items.filter((i) => i.id !== id);
    this.#work.delete(id);
    this.#touch();
  }

  clear() {
    this.#items = [];
    this.#counters = {};
    this.#work.clear();
    this.#events = [];
    this.#unsettled = false;
    this.#restart();
    this.#touch();
  }

  #restart() {
    this.#origin = this.#count = this.#step = this.#carry = 0;
  }

  // Time back to zero, every capacitor back to its starting p.d., and the
  // energy totals cleared. The circuit itself is untouched.
  reset() {
    for (const item of this.#items)
      if (item.kind === "capacitor") {
        item.voltage = item.initialVoltage;
        item.current = 0;
      }
    this.#work.clear();
    this.#events = [];
    this.#restart();
    this.#touch();
  }

  // Notes about things that happened in no time (charge jumping between
  // capacitors), oldest first. Reading them empties the list.
  takeEvents() {
    const events = this.#events;
    this.#events = [];
    return events;
  }

  // --------------------------------------------------------------- the grid

  // Grid points of a placed component's terminals: [{ x, y, key }].
  terminals(id) {
    const item = typeof id === "object" ? id : this.#need(id);
    if (item.explicit) return [];
    const points =
      item.kind === "wire"
        ? [
            [item.x1, item.y1],
            [item.x2, item.y2],
          ]
        : terminalOffsets(item.kind, item.rot).map(([dx, dy]) => [
            item.x + dx,
            item.y + dy,
          ]);
    return points.map(([x, y]) => ({ x, y, key: pointKey(x, y) }));
  }
  #place(item) {
    if (!item.explicit) item.nodes = this.terminals(item).map((t) => t.key);
  }

  // The wire ends that sit on a component's terminals. Passed to `move` so
  // that a drag takes exactly these with it, however far it goes.
  attached(id) {
    const item = this.#need(id),
      out = [];
    if (item.explicit || item.kind === "wire") return out;
    this.terminals(item).forEach((t, terminal) => {
      for (const w of this.#items) {
        if (w.kind !== "wire" || w.explicit) continue;
        if (w.x1 === t.x && w.y1 === t.y)
          out.push({ wire: w.id, end: 1, terminal });
        if (w.x2 === t.x && w.y2 === t.y)
          out.push({ wire: w.id, end: 2, terminal });
      }
    });
    return out;
  }

  // Moves a component's centre (or a wire's first end, the second keeping
  // its offset) to a grid point, optionally turning it to `rot`. Wire ends
  // on its terminals follow. Call `settle` when the gesture ends.
  move(id, x, y, carry, rot) {
    const item = this.#need(id);
    if (item.explicit) throw new Error("This component has no position.");
    gridNumber(x, "Position");
    gridNumber(y, "Position");
    if (item.kind === "wire") {
      const dx = x - item.x1,
        dy = y - item.y1;
      gridNumber(item.x2 + dx, "A wire end");
      gridNumber(item.y2 + dy, "A wire end");
      Object.assign(item, { x1: x, y1: y, x2: item.x2 + dx, y2: item.y2 + dy });
    } else {
      carry = carry || this.attached(id);
      Object.assign(item, {
        x,
        y,
        rot: rot === undefined ? item.rot : rot & 3,
      });
      const now = this.terminals(item);
      for (const c of carry) {
        const w = this.get(c.wire),
          t = now[c.terminal];
        if (!w || !t) continue;
        if (c.end === 1) Object.assign(w, { x1: t.x, y1: t.y });
        else Object.assign(w, { x2: t.x, y2: t.y });
        this.#place(w);
      }
    }
    this.#place(item);
    this.#unsettled = true;
    this.#touch();
  }

  // A quarter-turn anticlockwise (or `turns` of them) about the centre.
  // The wires stay where they are: two quarter-turns put the component
  // back on them the other way round, which is how a cell or a meter is
  // reversed.
  rotate(id, turns = 1) {
    const item = this.#need(id);
    if (item.explicit || item.kind === "wire") return;
    this.move(id, item.x, item.y, [], item.rot + turns);
    this.settle();
  }

  // Tidies the wiring after something has been put down:
  //  - a wire is cut wherever a terminal or another wire's end lies on it,
  //    so that touching it there makes a junction;
  //  - wires of no length and repeats of the same wire are removed;
  //  - if `inserted` names a component, wire lying straight across its two
  //    terminals is removed: dropping an ammeter onto a wire puts it in
  //    series. Wires that were already on its terminals (`carry`) are kept.
  settle(inserted, carry = []) {
    const target = inserted ? this.get(inserted) : null,
      ends =
        target && !target.explicit && target.kind !== "wire"
          ? this.terminals(target)
          : null,
      kept = new Set(carry.map((c) => c.wire)),
      at = (end, x, y) => end.x === x && end.y === y,
      spans = (ax, ay, bx, by) =>
        ends &&
        ends.length === 2 &&
        ((at(ends[0], ax, ay) && at(ends[1], bx, by)) ||
          (at(ends[1], ax, ay) && at(ends[0], bx, by))),
      points = new Map();
    for (const item of this.#items)
      for (const t of this.terminals(item)) points.set(t.key, t);
    const next = [];
    for (const w of this.#items) {
      if (w.kind !== "wire" || w.explicit) {
        next.push(w);
        continue;
      }
      const dx = w.x2 - w.x1,
        dy = w.y2 - w.y1,
        length2 = dx * dx + dy * dy;
      if (length2 === 0) continue;
      const cuts = [];
      for (const p of points.values()) {
        const px = p.x - w.x1,
          py = p.y - w.y1,
          along = px * dx + py * dy;
        if (dx * py - dy * px === 0 && along > 0 && along < length2)
          cuts.push({ ...p, along });
      }
      if (!cuts.length) {
        if (!(spans(w.x1, w.y1, w.x2, w.y2) && !kept.has(w.id))) next.push(w);
        continue;
      }
      cuts.sort((a, b) => a.along - b.along);
      const chain = [{ x: w.x1, y: w.y1 }, ...cuts, { x: w.x2, y: w.y2 }];
      for (let i = 1; i < chain.length; i++) {
        const a = chain[i - 1],
          b = chain[i];
        if (spans(a.x, a.y, b.x, b.y)) continue;
        const piece = {
          ...w,
          id: this.#nextId++,
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
        };
        this.#place(piece);
        next.push(piece);
      }
    }
    const seen = new Set();
    this.#items = next.filter((w) => {
      if (w.kind !== "wire" || w.explicit) return true;
      const a = pointKey(w.x1, w.y1),
        b = pointKey(w.x2, w.y2),
        key = a < b ? a + "|" + b : b + "|" + a;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    this.#unsettled = false;
    this.#touch();
  }

  // -------------------------------------------------------------- assembly

  // Builds the equations of one view of the circuit and factorises them.
  //
  // Kirchhoff's current law at every node but one reference node in each
  // separate section, and the branch law of every "v" branch, give a
  // symmetric system [[G, B], [Bᵀ, −R]]·[V, I] = [s, e].
  //
  // A closed loop made only of zero-resistance branches makes it singular:
  // the loop's p.d.s must add to zero by themselves (if they do not, that is
  // a short circuit), and a current circulating round it changes nothing.
  // Each such loop is found from the graph, not from the arithmetic, and
  // gets one extra unknown and one extra equation:
  //  - the unknown λ soaks up any disagreement round the loop, so the
  //    system stays solvable and other sections are unaffected;
  //  - the equation settles how the current shares. For a loop through
  //    capacitors it is the time derivative of the loop rule, Σ I/C =
  //    −Σ dE/dt (capacitors in parallel share in proportion to C). For a
  //    loop of plain wire, where the split is truly undetermined, it is
  //    Σ I = 0 round the loop: identical conductors share equally.
  #assemble(view, h) {
    const keys = [],
      index = new Map(),
      node = (key) => {
        let i = index.get(key);
        if (i === undefined) {
          i = keys.length;
          index.set(key, i);
          keys.push(key);
        }
        return i;
      },
      branches = [],
      byItem = new Map();
    for (const item of this.#items) {
      const nodes = item.nodes.map(node),
        spec = branchOf(item, view, h);
      if (!spec) continue;
      const branch = { ...spec, item, a: nodes[spec.from], b: nodes[spec.to] };
      byItem.set(item.id, branch);
      branches.push(branch);
    }
    const n0 = keys.length,
      parts = makeSets(n0);
    for (const b of branches) parts.union(b.a, b.b);
    // Reference node of each section: the negative terminal of its first
    // cell, so that potentials read as they do on a circuit diagram.
    const reference = new Map();
    for (const item of this.#items)
      if (item.kind === "cell") {
        const i = index.get(item.nodes[1]),
          root = parts.find(i);
        if (!reference.has(root)) reference.set(root, i);
      }
    for (let i = 0; i < n0; i++) {
      const root = parts.find(i);
      if (!reference.has(root)) reference.set(root, i);
    }
    const col = new Int32Array(n0);
    let nv = 0;
    for (let i = 0; i < n0; i++)
      col[i] = reference.get(parts.find(i)) === i ? -1 : nv++;
    const vs = branches.filter((b) => b.type === "v");
    vs.forEach((b, k) => (b.k = k));
    const nb = vs.length;

    // Loops of zero-resistance branches, as the fundamental cycles of a
    // spanning forest. Wires and cells are put in the forest before
    // capacitors, so that every loop free of capacitors is found as one.
    const forest = makeSets(n0),
      tree = Array.from({ length: n0 }, () => []),
      cycles = [];
    for (const withCaps of [false, true])
      for (const b of vs) {
        if (b.R !== 0 || !!b.cap !== withCaps) continue;
        if (forest.union(b.a, b.b)) {
          tree[b.a].push({ to: b.b, branch: b, sign: 1 });
          tree[b.b].push({ to: b.a, branch: b, sign: -1 });
          continue;
        }
        // Round the loop: along this branch from a to b, then back from b
        // to a through the forest.
        const entries = [{ branch: b, sign: 1 }],
          from = new Map([[b.b, null]]),
          queue = [b.b];
        while (queue.length && !from.has(b.a)) {
          const u = queue.shift();
          for (const edge of tree[u])
            if (!from.has(edge.to)) {
              from.set(edge.to, { u, edge });
              queue.push(edge.to);
            }
        }
        for (let at = b.a; from.get(at); at = from.get(at).u) {
          const { edge } = from.get(at);
          entries.push({ branch: edge.branch, sign: edge.sign });
        }
        cycles.push({
          entries,
          hasCap: entries.some((e) => e.branch.cap),
          part: parts.find(b.a),
        });
      }

    const n = nv + nb + cycles.length,
      a = new Float64Array(n * n),
      put = (r, c, value) => {
        if (r >= 0 && c >= 0) a[r * n + c] += value;
      };
    for (const b of branches) {
      const ca = col[b.a],
        cb = col[b.b];
      if (b.type === "g") {
        put(ca, ca, b.G);
        put(cb, cb, b.G);
        put(ca, cb, -b.G);
        put(cb, ca, -b.G);
      } else {
        const r = nv + b.k;
        put(r, ca, 1);
        put(r, cb, -1);
        put(ca, r, 1);
        put(cb, r, -1);
        put(r, r, -b.R);
      }
    }
    cycles.forEach((cycle, c) => {
      const q = nv + nb + c,
        weight = (e) => (cycle.hasCap ? e.branch.weight || 0 : 1);
      cycle.scale = Math.max(...cycle.entries.map(weight));
      for (const e of cycle.entries) {
        put(nv + e.branch.k, q, e.sign);
        put(q, nv + e.branch.k, (e.sign * weight(e)) / cycle.scale);
      }
    });
    const bridges = findBridges(n0, branches);
    branches.forEach((b, i) => (b.isBridge = bridges.has(i)));
    return {
      view,
      h,
      keys,
      index,
      branches,
      byItem,
      parts,
      col,
      nv,
      nb,
      n,
      cycles,
      bridge: (branch) => branch.isBridge,
      lu: factor(a, n),
    };
  }

  // Solves one view at time t. `over` replaces the sources: e(branch),
  // s(branch) and whether the loop equations keep their dE/dt terms.
  #solveAt(st, t, over) {
    const rhs = new Float64Array(st.n);
    for (const b of st.branches) {
      if (b.type === "g") {
        const s = over ? over.s(b) : b.s();
        if (st.col[b.a] >= 0) rhs[st.col[b.a]] += s;
        if (st.col[b.b] >= 0) rhs[st.col[b.b]] -= s;
      } else rhs[st.nv + b.k] = over ? over.e(b) : b.e(t);
    }
    if (!over)
      st.cycles.forEach((cycle, c) => {
        if (!cycle.hasCap) return;
        let sum = 0;
        for (const e of cycle.entries)
          if (e.branch.rate) sum -= e.sign * e.branch.rate(t);
        rhs[st.nv + st.nb + c] = sum / cycle.scale;
      });
    return substitute(st.lu, rhs);
  }

  // Current through every branch, from terminal a to terminal b.
  //
  // Potentials carry a rounding error of about one part in 10¹⁶ of the
  // largest p.d. in their section (the largest potential or EMF, since a
  // shorted cell has a large EMF and no potential anywhere), and a branch
  // turns that into a current error of that p.d. times its conductance. A current no bigger than sixteen
  // times that floor cannot be told from zero and is reported as zero, so
  // that a balanced bridge reads 0 A and not 10⁻¹⁷ A. (`floor` is kept on
  // the view for p.d.s, which are treated the same way.)
  #flows(st, x, t) {
    const potential = (i) => (st.col[i] >= 0 ? x[st.col[i]] : 0),
      size = new Map(),
      of = (i) => {
        const root = st.parts.find(i);
        let entry = size.get(root);
        if (!entry) size.set(root, (entry = { V: 0, G: 0 }));
        return entry;
      };
    for (let i = 0; i < st.keys.length; i++) {
      const entry = of(i);
      entry.V = Math.max(entry.V, Math.abs(potential(i)));
    }
    for (const b of st.branches) {
      const entry = of(b.a);
      entry.G = Math.max(entry.G, b.type === "g" ? b.G : b.R > 0 ? 1 / b.R : 0);
      if (b.type === "v") entry.V = Math.max(entry.V, Math.abs(b.e(t)));
    }
    st.floor = (i) => 16 * Number.EPSILON * of(i).V;
    st.currentFloor = 0;
    for (const entry of size.values())
      st.currentFloor = Math.max(
        st.currentFloor,
        16 * Number.EPSILON * entry.V * entry.G,
      );
    return st.branches.map((b) => {
      if (st.bridge(b)) return 0;
      const flow =
        b.type === "v"
          ? x[st.nv + b.k]
          : b.G * (potential(b.a) - potential(b.b)) - b.s();
      return Math.abs(flow) <= st.floor(b.a) * of(b.a).G ? 0 : flow;
    });
  }

  // Loops of zero resistance whose p.d.s do not add to zero.
  #disagreements(st, t, withCaps) {
    return st.cycles.filter((cycle) => {
      if (cycle.hasCap !== withCaps) return false;
      let sum = 0,
        size = 0;
      for (const e of cycle.entries) {
        const value = e.branch.e(t);
        sum += e.sign * value;
        size += Math.abs(value);
      }
      cycle.residual = sum;
      return Math.abs(sum) > 1e-9 * size;
    });
  }

  // Charge that must move in no time: capacitors (or a capacitor and an
  // ideal cell) joined by zero resistance while at different p.d.s. Charge
  // is conserved at every node; resistances pass none in zero time.
  #jump(cache, commit) {
    const st = (cache.jump ||= this.#assemble("jump")),
      now = cache.now;
    if (!st.lu.ok) return;
    const x = this.#solveAt(st, this.time),
      potential = (i) => (st.col[i] >= 0 ? x[st.col[i]] : 0),
      partNow = (item) => now.parts.find(now.index.get(item.nodes[0])),
      moved = [];
    let lost = 0;
    for (const b of st.branches) {
      if (!b.reactive || cache.broken.has(partNow(b.item))) continue;
      const item = b.item,
        before = item.voltage;
      let after = potential(b.a) - potential(b.b);
      if (Math.abs(after) < 1e-12 * Math.abs(before)) after = 0;
      const size = Math.max(Math.abs(after), Math.abs(before));
      if (Math.abs(after - before) <= 1e-12 * size) continue;
      item.voltage = after;
      lost += 0.5 * item.capacitance * (before * before - after * after);
      moved.push(item);
    }
    if (!moved.length) return;
    // Work done by ideal cells as the charge passed through them.
    const involved = new Set(
      moved.map((m) => st.parts.find(st.index.get(m.nodes[0]))),
    );
    for (const b of st.branches) {
      if (!b.source || !involved.has(st.parts.find(b.a))) continue;
      const work = -b.e(this.time) * x[st.nv + b.k];
      lost += work;
      if (commit) this.#workOf(b.item.id).supplied += work;
    }
    if (commit)
      this.#events.push({
        type: "jump",
        time: this.time,
        ids: moved.map((m) => m.id),
        lost,
        message:
          `${describe(moved)} ${moved.length > 1 ? "were" : "was"} joined through zero resistance while at a different p.d., so charge moved at once. ` +
          "With no resistance in the way there is no gradual curve to plot.",
      });
  }

  #workOf(id) {
    let w = this.#work.get(id);
    if (!w) this.#work.set(id, (w = { heat: 0, supplied: 0 }));
    return w;
  }

  // Everything that follows from the circuit as it stands now.
  #refresh() {
    if (this.#cache) return this.#cache;
    const t = this.time,
      commit = !this.#unsettled,
      cache = { now: this.#assemble("now"), jump: null, steps: new Map() },
      now = cache.now;
    // Faults: loops of ideal sources and wire that cannot be satisfied.
    cache.faults = this.#disagreements(now, t, false);
    cache.broken = new Set(cache.faults.map((c) => c.part));
    // While something is being dragged, capacitors are left as they are:
    // the jump is worked out for the readings but not kept.
    const held = this.#items
      .filter((i) => i.kind === "capacitor")
      .map((i) => [i, i.voltage]);
    const unequal = this.#disagreements(now, t, true);
    if (unequal.some((c) => !cache.broken.has(c.part)))
      this.#jump(cache, commit);
    const x = now.lu.ok ? this.#solveAt(now, t) : null;
    cache.solution = this.#read(now, x, x && this.#flows(now, x, t), t, cache);
    if (commit) {
      for (const item of this.#items)
        if (item.kind === "capacitor")
          item.current = cache.solution.of(item.id).flow || 0;
    } else for (const [item, voltage] of held) item.voltage = voltage;
    return (this.#cache = cache);
  }

  // Turns a solved view into readings.
  #read(st, x, flows, t, cache) {
    const out = new Solution(t),
      ok = !!x,
      potential = (i) => (st.col[i] >= 0 ? x[st.col[i]] : 0),
      broken = (i) => !ok || cache.broken.has(st.parts.find(i));
    st.keys.forEach((key, i) =>
      out.nodes.set(key, {
        potential: broken(i) ? null : potential(i) + 0,
        part: st.parts.find(i),
      }),
    );
    const flowOf = new Map();
    if (ok) st.branches.forEach((b, i) => flowOf.set(b.item.id, flows[i]));
    // Currents smaller than this are below what the arithmetic resolves.
    out.currentFloor = ok ? st.currentFloor : 0;
    for (const item of this.#items) {
      const nodes = item.nodes.map((k) => st.index.get(k)),
        branch = st.byItem.get(item.id),
        work = this.#work.get(item.id),
        r = {
          current: null,
          flow: null,
          voltage: null,
          power: null,
          potentials: nodes.map((i) => out.nodes.get(st.keys[i]).potential),
        };
      out.readings.set(item.id, r);
      if (item.kind === "cell")
        Object.assign(r, { emf: emfAt(item, t), emfPower: null, lost: null });
      if (item.kind === "cell" || RESISTIVE.has(item.kind))
        r.heat = work ? work.heat : 0;
      if (item.kind === "cell") r.supplied = work ? work.supplied : 0;
      if (item.kind === "lamp") r.brightness = null;
      if (item.kind === "capacitor")
        Object.assign(r, { charge: null, energy: null });
      if (nodes.some(broken)) continue;
      // p.d. from terminal 0 to terminal 1 (for a two-way switch, across
      // its open contact). Not defined between sections that are not joined.
      const other = item.kind === "switch2" && item.position === "a" ? 2 : 1,
        joined = st.parts.find(nodes[0]) === st.parts.find(nodes[other]);
      let across = joined
        ? potential(nodes[0]) - potential(nodes[other])
        : null;
      if (joined && Math.abs(across) <= st.floor(nodes[0])) across = 0;
      r.flow = (branch ? flowOf.get(item.id) : 0) + 0;
      if (!branch || item.kind === "switch2") r.voltage = across;
      else if (branch.type === "v") {
        // From the branch law itself, so that a wire has exactly no p.d.
        r.voltage = branch.e(t) + branch.R * r.flow;
        if (branch.R > 0 && Math.abs(r.voltage) <= st.floor(nodes[0]))
          r.voltage = 0;
      } else if (branch.reactive) r.voltage = item.voltage;
      else r.voltage = st.bridge(branch) ? 0 : across;
      if (r.voltage !== null) r.voltage += 0;
      r.current = r.flow;
      // An ideal switch dissipates nothing, whatever is across its gap.
      r.power =
        r.voltage === null || item.kind === "switch2"
          ? 0
          : r.voltage * r.flow + 0;
      if (item.kind === "cell") {
        // Reported as the current the cell drives out of its + terminal.
        r.current = -r.flow + 0;
        r.emfPower = r.emf * r.current + 0;
        r.lost = r.current * r.current * item.internal;
      } else if (item.kind === "lamp")
        r.brightness = r.power / item.ratedPower;
      else if (item.kind === "capacitor") {
        r.charge = item.capacitance * r.voltage;
        r.energy = 0.5 * item.capacitance * r.voltage * r.voltage;
      }
    }
    this.#report(st, out, t, cache);
    return out;
  }

  // Status, faults and remarks.
  #report(st, out, t, cache) {
    if (!st.lu.ok || (cache.now && !cache.now.lu.ok)) {
      out.status = "error";
      out.message =
        "This circuit could not be solved. Please report how it was built.";
      out.problems.push({ type: "error", message: out.message, ids: [] });
      return;
    }
    for (const cycle of cache.faults) {
      const items = cycle.entries.map((e) => e.branch.item),
        sources = cycle.entries
          .filter((e) => e.branch.source && e.branch.e(t) !== 0)
          .map((e) => e.branch.item),
        path = items.filter((i) => !sources.includes(i) && i.kind !== "wire"),
        through = path.length ? `wire, ${describe(path)}` : "wire",
        problem =
          sources.length > 1
            ? {
                type: "conflict",
                message:
                  `${describe(sources)} are ideal cells (no internal resistance) joined directly together, but they disagree: ` +
                  `${sources.map((s) => `${s.name} is ${volts(emfAt(s, t))}`).join(", ")}, leaving ${volts(Math.abs(cycle.residual))} with nothing to drop across. ` +
                  "Give one of them an internal resistance, or put a resistance between them.",
              }
            : {
                type: "short",
                message:
                  `Short circuit: ${describe(sources)} (${volts(Math.abs(cycle.residual))}) has its terminals joined by zero resistance (${through}), so nothing limits the current. ` +
                  "Add a resistance to the loop, or give the cell an internal resistance.",
              };
      problem.ids = items.map((i) => i.id);
      out.problems.push(problem);
    }
    const live = (item) => out.of(item.id).flow !== null;
    for (const cycle of st.cycles) {
      if (cycle.hasCap || cache.broken.has(cycle.part)) continue;
      const items = cycle.entries.map((e) => e.branch.item);
      out.notices.push({
        type: "split",
        ids: items.map((i) => i.id),
        message:
          `${describe(items.filter((i) => i.kind !== "wire")) || "These wires"} ${items.some((i) => i.kind !== "wire") ? "and the wire joining them make" : "make"} a loop of zero resistance. ` +
          "The circuit fixes the total current but not how it divides round the loop, so identical conductors are assumed and it is shared equally.",
      });
    }
    // Cells and charged capacitors that have no complete path to drive.
    const drivers = [],
      open = [];
    for (const b of st.branches) {
      const item = b.item;
      if (!live(item)) continue;
      const drives =
        item.kind === "cell"
          ? typeof item.emf === "function" || item.emf !== 0
          : item.kind === "capacitor" && item.voltage !== 0;
      if (!drives) continue;
      drivers.push(item);
      if (st.bridge(b)) open.push(item);
    }
    for (const item of this.#items) {
      const r = out.of(item.id);
      if (
        item.kind === "cell" &&
        item.internal > 0 &&
        r.voltage !== null &&
        r.emf !== 0 &&
        Math.abs(r.voltage) <= 1e-12 * Math.abs(r.emf)
      )
        out.notices.push({
          type: "shorted-cell",
          ids: [item.id],
          message: `Short circuit: the terminals of ${item.name} are joined by zero resistance. Only its internal resistance limits the current, to E/r.`,
        });
      if (item.kind === "voltmeter" && r.voltage === null && r.flow !== null)
        out.notices.push({
          type: "floating",
          ids: [item.id],
          message: `${item.name} is connected between two sections that are not joined, so there is no potential difference for it to read.`,
        });
    }
    if (open.length)
      out.notices.push({
        type: "open",
        ids: open.map((i) => i.id),
        message: `Open circuit: there is no complete conducting path through ${describe(open)}, so no current flows there.`,
      });
    if (out.problems.length) {
      out.status = out.problems[0].type;
      out.message = out.problems[0].message;
    } else if (drivers.length && open.length === drivers.length) {
      out.status = "open";
      out.message = out.notices[out.notices.length - 1].message;
    }
  }

  // The state of the circuit at this instant.
  solve() {
    return this.#refresh().solution;
  }

  // ------------------------------------------------------------------ time

  // Natural modes of the circuit. With the capacitor p.d.s as the state,
  // dv/dt = M·v + (sources); the time constants are −1/eigenvalue of M.
  // Column k of M is found by solving the circuit with the sources off and
  // 1 V on capacitor k alone (first sharing that charge with any capacitor
  // wired straight across it, which is what `#jump` does).
  #dynamics() {
    const cache = this.#refresh();
    if (cache.dynamics) return cache.dynamics;
    const now = cache.now,
      caps = now.branches.filter(
        (b) => b.cap && !cache.broken.has(now.parts.find(b.a)),
      ),
      n = caps.length,
      result = (cache.dynamics = { modes: [], step: Infinity });
    if (!n || !now.lu.ok) return result;
    const constrained = now.cycles.some((c) => c.hasCap),
      jump = constrained ? (cache.jump ||= this.#assemble("jump")) : null,
      at = new Map(caps.map((b, k) => [b.item.id, k])),
      C = caps.map((b) => b.item.capacitance),
      m = caps.map(() => new Array(n).fill(0));
    for (let k = 0; k < n; k++) {
      let state = caps.map((_, i) => (i === k ? 1 : 0));
      if (jump?.lu.ok) {
        const x = this.#solveAt(jump, 0, {
            e: () => 0,
            s: (b) => (b.reactive && at.get(b.item.id) === k ? b.G : 0),
          }),
          potential = (i) => (jump.col[i] >= 0 ? x[jump.col[i]] : 0);
        state = caps.map((b) => {
          const j = jump.byItem.get(b.item.id);
          return potential(j.a) - potential(j.b);
        });
      }
      const x = this.#solveAt(now, 0, {
        e: (b) => (b.cap && at.has(b.item.id) ? state[at.get(b.item.id)] : 0),
        s: () => 0,
      });
      // dV/dt = I/C for each capacitor.
      caps.forEach((b, i) => {
        m[i][k] = now.bridge(b) ? 0 : x[now.nv + b.k] / C[i];
      });
    }
    // M is self-adjoint in the energy inner product ⟨u, v⟩ = Σ C·u·v, so
    // C^½ M C^−½ is symmetric and has the same (real) eigenvalues.
    const s = m.map((row, i) =>
      row.map(
        (_, j) =>
          0.5 *
          ((Math.sqrt(C[i]) * m[i][j]) / Math.sqrt(C[j]) +
            (Math.sqrt(C[j]) * m[j][i]) / Math.sqrt(C[i])),
      ),
    );
    const { values, vectors } = symmetricEigen(s),
      fastest = Math.max(...values.map((v) => -v));
    values.forEach((value, i) => {
      // A zero eigenvalue is charge that has nowhere to go, not a decay.
      if (!(-value > 1e-9 * fastest)) return;
      result.modes.push({
        tau: -1 / value,
        ids: caps
          .filter((_, j) => Math.abs(vectors[j][i]) > 1e-6)
          .map((b) => b.item.id),
      });
    });
    result.modes.sort((a, b) => a.tau - b.tau);
    // Rounded to twelve figures, so that a time constant of 1 s gives steps
    // of exactly 10 ms and the clock reads whole numbers.
    if (result.modes.length)
      result.step = Number(
        (result.modes[0].tau / STEPS_PER_TAU).toPrecision(12),
      );
    return result;
  }

  // The circuit's time constants in seconds, shortest first; with an id,
  // those of the modes that capacitor takes part in.
  timeConstants(id) {
    const out = [];
    for (const mode of this.#dynamics().modes) {
      if (id !== undefined && !mode.ids.includes(id)) continue;
      const last = out[out.length - 1];
      if (last === undefined || mode.tau - last > 1e-9 * last)
        out.push(mode.tau);
    }
    return out;
  }

  // The fixed time step: a set fraction of the shortest time constant (and
  // no more than `maxStep`). Infinity when nothing in the circuit changes
  // with time.
  get timestep() {
    return Math.min(this.#dynamics().step, this.maxStep);
  }

  // Advances by up to `dt` seconds in whole fixed steps and returns the
  // seconds actually covered. Time left over is carried to the next call,
  // so the result does not depend on how the time is divided into frames.
  //   maxSteps    stop after this many steps instead of lengthening them
  //   resolution  halve the step until it is no longer than this, for a
  //               smooth display when the time constant is long
  advance(dt, { maxSteps = Infinity, resolution = Infinity } = {}) {
    if (!(dt > 0) || this.#unsettled) return 0;
    const cache = this.#refresh(),
      before = cache.solution;
    if (!cache.now.lu.ok) return 0;
    const varying = this.#items.some(
      (i) => i.kind === "cell" && typeof i.emf === "function",
    );
    let h = this.timestep;
    if (h === Infinity) {
      if (varying) h = Math.min(dt, resolution);
      else {
        // Nothing changes: every power is constant over the interval.
        this.#origin = this.time + dt;
        this.#count = this.#carry = 0;
        this.#integrate(before, before, dt);
        this.#stamp(before);
        return dt;
      }
    }
    while (h > resolution) h /= 2;
    if (h !== this.#step) {
      this.#origin = this.time;
      this.#count = 0;
      this.#step = h;
    }
    const wanted = Math.floor((this.#carry + dt) / h + 1e-9),
      steps = Math.min(wanted, maxSteps);
    // Time that the step budget could not cover is dropped, not owed.
    this.#carry =
      steps < wanted ? 0 : Math.max(0, this.#carry + dt - steps * h);
    if (!steps) return 0;
    let st = cache.steps.get(h);
    if (!st) {
      cache.steps.clear();
      cache.steps.set(h, (st = this.#assemble("step", h)));
    }
    if (!st.lu.ok) return 0;
    let last = before;
    for (let i = 0; i < steps; i++) {
      const t = this.#origin + (this.#count + 1) * h,
        x = this.#solveAt(st, t),
        flows = this.#flows(st, x, t),
        potential = (k) => (st.col[k] >= 0 ? x[st.col[k]] : 0);
      st.branches.forEach((b, k) => {
        if (!b.reactive || cache.broken.has(st.parts.find(b.a))) return;
        // A capacitor with no path for charge keeps exactly what it has.
        if (!st.bridge(b)) b.item.voltage = potential(b.a) - potential(b.b);
        b.item.current = flows[k];
      });
      this.#count++;
      const next = this.#read(st, x, flows, t, cache);
      this.#integrate(last, next, h);
      last = next;
    }
    this.#stamp(last);
    cache.solution = last;
    return steps * h;
  }

  // Energy over one step: mean p.d. × mean current × h. The trapezoidal
  // step moves charge h × (mean current) and changes a capacitor's ½CV² by
  // exactly that charge × its mean p.d., so with this rule the energy
  // supplied, stored and dissipated agree to rounding at every step.
  #integrate(a, b, h) {
    for (const item of this.#items) {
      const p = a.of(item.id),
        q = b.of(item.id);
      if (!p || !q || p.power === null || q.power === null) continue;
      const current = (p.current + q.current) / 2;
      if (item.kind === "cell") {
        const w = this.#workOf(item.id);
        w.supplied += (h * current * (p.emf + q.emf)) / 2;
        w.heat += h * current * current * item.internal;
      } else if (RESISTIVE.has(item.kind))
        this.#workOf(item.id).heat +=
          (h * current * (p.voltage + q.voltage)) / 2;
    }
  }
  // Writes the running energy totals and the time into a solution.
  #stamp(solution) {
    solution.time = this.time;
    for (const [id, w] of this.#work) {
      const r = solution.of(id);
      if (!r) continue;
      if ("heat" in r) r.heat = w.heat;
      if ("supplied" in r) r.supplied = w.supplied;
    }
  }
}
