// Drawing of the circuits scene, shared by the circuits page and the
// minitool mini simulations so both look the same. drawCircuit and
// drawComponent take a context and everything they draw from; the renderer
// made by createCircuitRenderer is given a canvas context and a view and, for
// each frame, the circuit, its solution, the colours and what to show. It
// looks nothing up in the page. Selection handles, the wire being drawn,
// the component being placed, panels and graphs stay with the page.
import { paletteOf } from "../site/theme.js";

export const DOT_SPACING = 0.8, // grid squares between current dots
  DOT_FADE = 0.35; // grid squares over which dots fade at a junction
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Four significant figures with an SI prefix: 0.001875 A → "1.875 mA".
// A reading that does not exist (a short circuit, a floating meter) is "–".
export const PREFIXES = [
  [1e9, "G"],
  [1e6, "M"],
  [1e3, "k"],
  [1, ""],
  [1e-3, "m"],
  [1e-6, "µ"],
  [1e-9, "n"],
  [1e-12, "p"],
];
export function si(value, unit, sig = 4) {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "–";
  if (value === 0) return "0 " + unit;
  const size = Math.abs(value),
    round = 1 - 0.5 * 10 ** -sig;
  for (const [factor, prefix] of PREFIXES)
    if (size >= factor * round)
      return (
        (value / factor).toPrecision(sig).replace("-", "−") +
        " " +
        prefix +
        unit
      );
  return (value / 1e-12).toPrecision(2).replace("-", "−") + " p" + unit;
}
// A value that was set, not measured: as short as it can be written.
export function given(value, unit) {
  if (typeof value !== "number") return "varies";
  if (value === 0) return "0 " + unit;
  const size = Math.abs(value),
    [factor, prefix] =
      PREFIXES.find(([f]) => size >= f * 0.9999995) || PREFIXES.at(-1);
  return (
    String(Number((value / factor).toPrecision(6))).replace("-", "−") +
    " " +
    prefix +
    unit
  );
}

export const placed = (item) => item && !item.explicit;

// A point given along and across a component (in grid squares, before it
// is turned) as a grid point.
export function local(item, lx, ly) {
  let x = lx,
    y = ly;
  for (let i = 0; i < (item.rot & 3); i++) [x, y] = [-y, x];
  return [item.x + x, item.y + y];
}
// The line the current follows through a component, terminal to terminal.
export function pathOf(item) {
  if (item.kind === "wire")
    return [
      [item.x1, item.y1],
      [item.x2, item.y2],
    ];
  if (item.kind === "switch2") {
    const side = item.position === "a" ? 1 : -1;
    return [
      local(item, -1, 0),
      local(item, -0.45, 0),
      local(item, 0.5, 0.5 * side),
      local(item, 1, side),
    ];
  }
  return [local(item, -1, 0), local(item, 1, 0)];
}
export const valueText = (item) =>
  ({
    cell:
      given(item.emf, "V") +
      (item.internal > 0 ? ", r = " + given(item.internal, "Ω") : ""),
    resistor: given(item.resistance, "Ω"),
    variable: given(item.resistance, "Ω"),
    lamp: given(item.resistance, "Ω"),
    capacitor: given(item.capacitance, "F"),
    inductor: given(item.inductance, "H"),
    source:
      given(+(item.amplitude * Math.SQRT1_2).toPrecision(4), "V") +
      " rms, " +
      given(item.frequency, "Hz"),
  })[item.kind] || "";
// What a meter shows: the value at this instant in the DC view, and in the
// AC view (`ac` true) the RMS value over the last whole cycle.
export function meterText(item, r, ac) {
  const amps = item.kind === "ammeter";
  if (!ac) return amps ? si(r?.current, "A") : si(r?.voltage, "V");
  const value = amps ? r?.rmsCurrent : r?.rmsVoltage;
  return value === null || value === undefined
    ? "– rms"
    : si(value, amps ? "A" : "V") + " rms";
}

// Canvas colours, by key, from the theme tokens (src/site/theme.js). The
// moving dots are chosen against the wire they sit on as well as the page:
// wires are near-black on the light theme and cream on the dark one, so the
// dots are a saturated colour with a ring of the page colour round them.
export const CIRCUIT_COLOURS = {
  ink: "ink",
  soft: "canvas-soft",
  panel: "panel",
  back: "canvas-bg",
  gridMinor: "canvas-grid-minor",
  gridMajor: "canvas-grid-major",
  positive: "charge-positive",
  negative: "charge-negative",
  current: "circuit-current",
  electron: "circuit-electron",
  dot: "circuit-dot",
  dotElectron: "circuit-dot-electron",
  voltage: "circuit-voltage",
  glow: "circuit-glow",
  danger: "circuit-fault",
  select: "canvas-select",
  axis: "circuit-graph-axis",
};
export function circuitPalette(dark) {
  return {
    dark,
    ...paletteOf(CIRCUIT_COLOURS, dark),
  };
}
export const rgb = (hex) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export function mix(a, b, t) {
  const p = rgb(a),
    q = rgb(b);
  return `rgb(${p.map((v, i) => Math.round(v + (q[i] - v) * t)).join(",")})`;
}
// Lowest and highest potential in the circuit, for the colour scale.
export function potentialRange(s) {
  let lo = Infinity,
    hi = -Infinity;
  for (const node of s.nodes.values())
    if (node.potential !== null) {
      lo = Math.min(lo, node.potential);
      hi = Math.max(hi, node.potential);
    }
  return hi > lo ? [lo, hi] : null;
}

// Draws a circuit with context `g`. `o` gives the mapping from grid to
// pixels (`at`, `scale`), the colours `c`, and what to show; the scene and
// the preset thumbnails both come through here.
export function drawCircuit(g, circuit, s, o) {
  const { c, scale: u, at } = o,
    range = o.potential ? potentialRange(s) : null,
    colourAt = (key, fallback) => {
      const v = range && s.potential(key);
      return v === null || v === undefined || !range
        ? fallback
        : mix(c.negative, c.positive, (v - range[0]) / (range[1] - range[0]));
    },
    faulty = new Set(s.problems.flatMap((p) => p.ids)),
    thin = Math.max(1, u * 0.045),
    count = new Map();
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const item of circuit.list()) {
    if (!placed(item)) continue;
    for (const t of circuit.terminals(item))
      count.set(t.key, (count.get(t.key) || 0) + 1);
  }
  // Wires first, so that components sit on top of them.
  for (const item of circuit.list()) {
    if (item.kind !== "wire" || !placed(item)) continue;
    const [x1, y1] = at(item.x1, item.y1),
      [x2, y2] = at(item.x2, item.y2);
    if (item.id === o.selected) {
      g.strokeStyle = c.select;
      g.globalAlpha = 0.35;
      g.lineWidth = thin + 7;
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
      g.globalAlpha = 1;
    }
    g.strokeStyle = faulty.has(item.id)
      ? c.danger
      : colourAt(item.nodes[0], c.ink);
    g.lineWidth = thin * (range ? 1.5 : 1);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }
  for (const item of circuit.list()) {
    if (item.kind === "wire" || !placed(item)) continue;
    drawComponent(g, item, s.of(item.id), {
      ...o,
      thin,
      ink: faulty.has(item.id) ? c.danger : c.ink,
      leads: item.nodes.map((key) =>
        faulty.has(item.id) ? c.danger : colourAt(key, c.ink),
      ),
    });
  }
  // A dot where three or more ends meet, as on a circuit diagram; a small
  // open ring on an end that is joined to nothing.
  for (const [key, n] of count) {
    const [gx, gy] = key.split(",").map(Number),
      [x, y] = at(gx, gy);
    g.beginPath();
    if (n >= 3) {
      g.fillStyle = colourAt(key, c.ink);
      g.arc(x, y, thin * 2.1, 0, 2 * Math.PI);
      g.fill();
    } else if (n === 1 && !o.preview) {
      g.strokeStyle = c.soft;
      g.lineWidth = 1;
      g.fillStyle = c.back;
      g.arc(x, y, thin * 2, 0, 2 * Math.PI);
      g.fill();
      g.stroke();
    }
  }
}

// One component. Drawn about its centre with +x towards terminal 1, then
// labelled upright.
export function drawComponent(g, item, reading, o) {
  const { c, scale: u, at, thin, ink } = o,
    [cx, cy] = at(item.x, item.y),
    line = (points, colour, width = thin) => {
      g.strokeStyle = colour;
      g.lineWidth = width;
      g.beginPath();
      points.forEach(([x, y], i) =>
        i ? g.lineTo(x * u, -y * u) : g.moveTo(x * u, -y * u),
      );
      g.stroke();
    },
    circle = (x, y, r, fill, stroke) => {
      g.beginPath();
      g.arc(x * u, -y * u, r * u, 0, 2 * Math.PI);
      if (fill) {
        g.fillStyle = fill;
        g.fill();
      }
      if (stroke) {
        g.strokeStyle = stroke;
        g.lineWidth = thin;
        g.stroke();
      }
    },
    // The leads, each in the colour of its own terminal.
    leads = (reach) => {
      line(
        [
          [-1, 0],
          [-reach, 0],
        ],
        o.leads[0],
      );
      line(
        [
          [reach, 0],
          [1, 0],
        ],
        o.leads[1],
      );
    },
    plus = (x, y) => {
      if (u < 20) return;
      line(
        [
          [x - 0.08, y],
          [x + 0.08, y],
        ],
        ink,
        Math.max(1, thin * 0.7),
      );
      line(
        [
          [x, y - 0.08],
          [x, y + 0.08],
        ],
        ink,
        Math.max(1, thin * 0.7),
      );
    };
  g.save();
  g.translate(cx, cy);
  g.rotate((-item.rot * Math.PI) / 2);
  if (item.id === o.selected) {
    g.fillStyle = c.select;
    g.globalAlpha = 0.18;
    const tall = item.kind === "switch2" ? 1.15 : 0.52;
    g.beginPath();
    g.roundRect?.(-0.82 * u, -tall * u, 1.64 * u, 2 * tall * u, 0.14 * u);
    g.fill();
    g.globalAlpha = 1;
  }
  switch (item.kind) {
    case "cell":
      leads(0.1);
      // Long thin plate: positive. Short thick plate: negative.
      line(
        [
          [-0.1, -0.42],
          [-0.1, 0.42],
        ],
        ink,
      );
      line(
        [
          [0.1, -0.21],
          [0.1, 0.21],
        ],
        ink,
        thin * 2.6,
      );
      plus(-0.32, 0.3);
      break;
    case "resistor":
    case "variable":
      leads(0.5);
      g.fillStyle = c.back;
      g.fillRect(-0.5 * u, -0.17 * u, u, 0.34 * u);
      line(
        [
          [-0.5, -0.17],
          [0.5, -0.17],
          [0.5, 0.17],
          [-0.5, 0.17],
          [-0.5, -0.17],
        ],
        ink,
      );
      if (item.kind === "variable") {
        line(
          [
            [-0.42, -0.42],
            [0.42, 0.42],
          ],
          ink,
        );
        line(
          [
            [0.2, 0.42],
            [0.42, 0.42],
            [0.42, 0.2],
          ],
          ink,
        );
      }
      break;
    case "lamp": {
      leads(0.34);
      const b = reading?.brightness;
      if (b > 0) {
        // The glow grows and brightens with power, up to the rated power.
        const level = clamp(b, 0, 1),
          reach = (0.5 + 0.5 * level) * u,
          halo = g.createRadialGradient?.(0, 0, 0.2 * u, 0, 0, reach);
        if (halo?.addColorStop) {
          halo.addColorStop(0, c.glow);
          halo.addColorStop(1, c.glow + "00");
          g.globalAlpha = 0.25 + 0.65 * level;
          g.fillStyle = halo;
          g.beginPath();
          g.arc(0, 0, reach, 0, 2 * Math.PI);
          g.fill();
        }
        g.globalAlpha = 0.2 + 0.8 * level;
        circle(0, 0, 0.34, c.glow);
        g.globalAlpha = 1;
      } else circle(0, 0, 0.34, c.back);
      circle(0, 0, 0.34, null, ink);
      line(
        [
          [-0.24, -0.24],
          [0.24, 0.24],
        ],
        ink,
      );
      line(
        [
          [-0.24, 0.24],
          [0.24, -0.24],
        ],
        ink,
      );
      break;
    }
    case "switch":
      leads(0.42);
      line(
        [[-0.42, 0], item.closed ? [0.42, 0] : [0.34, 0.36]],
        ink,
        thin * 1.4,
      );
      circle(-0.42, 0, 0.07, ink);
      circle(0.42, 0, 0.07, ink);
      break;
    case "switch2": {
      const side = item.position === "a" ? 1 : -1;
      line(
        [
          [-1, 0],
          [-0.45, 0],
        ],
        o.leads[0],
      );
      line(
        [
          [0.5, 0.5],
          [1, 1],
        ],
        o.leads[1],
      );
      line(
        [
          [0.5, -0.5],
          [1, -1],
        ],
        o.leads[2],
      );
      line(
        [
          [-0.45, 0],
          [0.5, 0.5 * side],
        ],
        ink,
        thin * 1.4,
      );
      circle(-0.45, 0, 0.07, ink);
      circle(0.5, 0.5, 0.07, ink);
      circle(0.5, -0.5, 0.07, ink);
      break;
    }
    case "capacitor":
      leads(0.1);
      for (const x of [-0.1, 0.1])
        line(
          [
            [x, -0.38],
            [x, 0.38],
          ],
          ink,
          thin * 1.5,
        );
      plus(-0.32, 0.3);
      break;
    case "source": {
      leads(0.37);
      circle(0, 0, 0.37, c.back, ink);
      plus(-0.56, 0.2);
      // One cycle of a sine wave. It is drawn the same way up whichever
      // way the source is turned, so the symbol never reads backwards.
      const wave = [];
      for (let k = 0; k <= 16; k++)
        wave.push([
          -0.22 + 0.0275 * k,
          0.13 * Math.sin((k / 16) * 2 * Math.PI),
        ]);
      g.restore();
      g.save();
      g.translate(cx, cy);
      line(wave, ink);
      break;
    }
    case "inductor":
      leads(0.5);
      // Four turns of a coil.
      g.strokeStyle = ink;
      g.lineWidth = thin;
      g.beginPath();
      for (let k = 0; k < 4; k++)
        g.arc((-0.375 + 0.25 * k) * u, 0, 0.125 * u, Math.PI, 2 * Math.PI);
      g.stroke();
      break;
    default: {
      // Ammeter or voltmeter.
      leads(0.37);
      circle(0, 0, 0.37, c.back, ink);
      plus(-0.56, 0.2);
      g.restore();
      g.save();
      g.fillStyle = ink;
      g.font = `600 ${Math.max(7, 0.4 * u)}px system-ui, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(item.kind === "ammeter" ? "A" : "V", cx, cy + 0.02 * u);
    }
  }
  g.restore();
  if (!o.labels) return;
  // Name and value, beside the component and always upright. A meter shows
  // its reading there instead.
  const meter = item.kind === "ammeter" || item.kind === "voltmeter",
    text = meter
      ? o.preview
        ? ""
        : meterText(item, reading, o.ac)
      : valueText(item),
    upright = item.rot % 2 !== 0,
    reach = item.kind === "switch2" ? 1.2 : 0.56,
    size = clamp(0.27 * u, 9, 12);
  g.textBaseline = "alphabetic";
  g.textAlign = upright ? "left" : "center";
  const x = upright ? cx + reach * u + 3 : cx,
    y = upright ? cy - 2 : cy - reach * u - size - 3;
  g.font = `${size}px system-ui, sans-serif`;
  g.fillStyle = c.soft;
  g.fillText(item.name, x, y);
  g.font = `${meter ? "600 " : ""}${size}px ui-monospace, monospace`;
  g.fillStyle = meter ? (item.kind === "ammeter" ? c.current : c.voltage) : ink;
  g.fillText(text, x, y + size + 2);
}

// The current dots.
//
// Dots are laid out along *runs*, not along single wires. A run is a chain
// of wires and components in series: it starts and ends where the current
// divides or joins (or it is a closed loop), so the current is the same all
// the way along it. Each run has one set of evenly spaced dots that all
// move together, at a speed in proportion to that current. Laying dots out
// wire by wire instead makes them bunch and gap wherever two wires meet,
// and blink on any wire shorter than the spacing.
//
// The spacing is DOT_SPACING adjusted, by under a third at worst, so that
// a whole number of gaps fits the run: a dot then leaves one end exactly
// as another enters the other, and the number on the run never changes.
export function dotRuns(lab, s) {
  const branches = [],
    meeting = new Map(); // node → the current-carrying branches that end there
  for (const item of lab.list()) {
    if (!placed(item)) continue;
    const flow = s.of(item.id)?.flow;
    if (!flow) continue;
    const to = item.kind === "switch2" && item.position === "b" ? 2 : 1,
      branch = { item, flow, points: pathOf(item) };
    branch.ends = [item.nodes[0], item.nodes[to]];
    branches.push(branch);
    for (const node of branch.ends) {
      if (!meeting.has(node)) meeting.set(node, []);
      meeting.get(node).push(branch);
    }
  }
  // A node where exactly two branch ends meet is the middle of a run.
  const through = (node) => meeting.get(node).length === 2,
    used = new Set(),
    runs = [],
    // Follows a run from `first`, entering it at its end `entry` (0 or 1).
    // Which end a run is followed from depends only on the wiring, never on
    // which way the current is going: an alternating current then moves
    // the same dots to and fro instead of laying out new ones.
    follow = (first, entry) => {
      const run = { points: [], gaps: [], length: 0, ids: [] };
      let branch = first,
        end = entry;
      // Along the run, the current in the direction it is followed.
      run.current = entry === 0 ? first.flow : -first.flow;
      while (branch && !used.has(branch)) {
        used.add(branch);
        const began = run.length,
          points = end === 0 ? branch.points : [...branch.points].reverse();
        points.forEach((point, k) => {
          const last = run.points[run.points.length - 1];
          if (k && last)
            run.length += Math.hypot(point[0] - last[0], point[1] - last[1]);
          if (!last || last[0] !== point[0] || last[1] !== point[1])
            run.points.push(point);
        });
        run.ids.push(branch.item.id);
        // Dots pass out of sight behind a component's symbol.
        if (branch.item.kind !== "wire" && branch.item.kind !== "switch2") {
          const middle = (began + run.length) / 2;
          run.gaps.push([middle - 0.5, middle + 0.5]);
        }
        const node = branch.ends[1 - end];
        run.closed = node === first.ends[entry];
        if (!through(node)) break;
        const next = meeting.get(node).find((b) => b !== branch);
        if (!next) break;
        end = next.ends[0] === node ? 0 : 1;
        branch = next;
      }
      run.key = [...run.ids].sort((a, b) => a - b).join("-");
      runs.push(run);
    };
  // Open runs, each from whichever of its two ends has the older component;
  // then closed loops, from their oldest component.
  const starts = [];
  for (const b of branches)
    b.ends.forEach((node, end) => {
      if (!through(node)) starts.push([b, end]);
    });
  starts.sort((p, q) => p[0].item.id - q[0].item.id || p[1] - q[1]);
  for (const [b, end] of starts) if (!used.has(b)) follow(b, end);
  for (const b of [...branches].sort((p, q) => p.item.id - q.item.id))
    if (!used.has(b)) follow(b, 0);
  return runs;
}

// `view` holds pixels per grid square and the screen position of the grid's
// origin ({ scale, x, y, width, height }).
export function createCircuitRenderer(ctx, view) {
  const screen = (x, y) => [view.x + x * view.scale, view.y - y * view.scale];
  const world = (sx, sy) => ({
    x: (sx - view.x) / view.scale,
    y: (view.y - sy) / view.scale,
  });
  // What the current frame draws (see drawScene).
  let lab, state, phase;
  function drawDots(c, s) {
    if (!state.show.current) return;
    ctx.fillStyle = state.electrons ? c.dotElectron : c.dot;
    ctx.strokeStyle = c.back;
    ctx.lineWidth = 1.5;
    const r = clamp(view.scale * 0.09, 2.4, 4.4);
    for (const run of dotRuns(lab, s)) {
      if (!(run.length > 0)) continue;
      const spacing =
        run.length / Math.max(1, Math.round(run.length / DOT_SPACING));
      let d = (phase.get(run.key) || 0) % spacing;
      if (d < 0) d += spacing;
      // Walk the run once, dropping a dot each time `d` is passed.
      let walked = 0;
      for (let k = 1; k < run.points.length; k++) {
        const [x1, y1] = run.points[k - 1],
          [x2, y2] = run.points[k],
          length = Math.hypot(x2 - x1, y2 - y1);
        for (; d < walked + length - 1e-9; d += spacing) {
          if (run.gaps.some(([lo, hi]) => d > lo && d < hi)) continue;
          const t = (d - walked) / length,
            [x, y] = screen(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
          // Where a run meets a junction its dots fade in and out over a
          // third of a square, so none pops into view and the dots of the
          // runs that meet there do not crowd the junction.
          ctx.globalAlpha = run.closed
            ? 1
            : clamp(Math.min(d, run.length - d) / DOT_FADE, 0, 1);
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        }
        walked += length;
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawGrid(c) {
    const lo = world(0, view.height),
      hi = world(view.width, 0),
      step = 2 ** Math.max(0, Math.ceil(Math.log2(12 / view.scale)));
    ctx.lineWidth = 1;
    for (let x = Math.ceil(lo.x / step) * step; x <= hi.x; x += step) {
      ctx.strokeStyle = x % (step * 5) === 0 ? c.gridMajor : c.gridMinor;
      const sx = Math.round(screen(x, 0)[0]) + 0.5;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, view.height);
      ctx.stroke();
    }
    for (let y = Math.ceil(lo.y / step) * step; y <= hi.y; y += step) {
      ctx.strokeStyle = y % (step * 5) === 0 ? c.gridMajor : c.gridMinor;
      const sy = Math.round(screen(0, y)[1]) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(view.width, sy);
      ctx.stroke();
    }
  }

  // options: colours (circuitPalette), solution (the circuit's solve()),
  // grid, selected, labels, potential, ac (the AC view), current (show the
  // current dots), electrons (dots move with the electrons) and phase (how
  // far each run's dots have travelled, by run).
  function drawScene(model, options) {
    const c = options.colours,
      s = options.solution;
    lab = model;
    state = {
      show: { current: options.current },
      electrons: options.electrons,
    };
    phase = options.phase;
    ctx.setLineDash([]);
    if (options.grid) drawGrid(c);
    drawCircuit(ctx, lab, s, {
      c,
      scale: view.scale,
      at: screen,
      selected: options.selected,
      labels: options.labels,
      potential: options.potential,
      ac: options.ac,
    });
    drawDots(c, s);
  }
  return { screen, world, drawScene };
}
