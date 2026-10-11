// Circuit lab: every expected value below is written from the textbook
// formula (Ohm's law, Kirchhoff's laws, V = V₀(1 − e^(−t/RC)), E = ½CV²),
// never copied from what the solver outputs.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CircuitLab,
  KINDS,
  LIMITS,
  STEPS_PER_TAU,
  factor,
  substitute,
} from "../src/circuitlab/model.js";
import { presets } from "../src/circuitlab/presets.js";

const STEADY = 1e-9, // steady-state readings: relative error
  TIMED = 0.005; // time-dependent readings: relative error
const close = (actual, expected, relative, message) =>
  assert.ok(
    typeof actual === "number" &&
      Math.abs(actual - expected) <= relative * Math.abs(expected),
    `${message || "value"}: got ${actual}, expected ${expected} ± ${relative * 100}%`,
  );
const near = (actual, expected, absolute, message) =>
  assert.ok(
    typeof actual === "number" && Math.abs(actual - expected) <= absolute,
    `${message || "value"}: got ${actual}, expected ${expected} ± ${absolute}`,
  );

// No reading may ever be NaN or infinite: a number or null (not defined).
function finite(solution) {
  for (const [id, r] of solution.readings)
    for (const [k, v] of Object.entries(r))
      if (typeof v === "number")
        assert.ok(Number.isFinite(v), `${id}.${k} is ${v}`);
}
// Check 7. Power supplied by the EMFs equals power dissipated in every
// resistance (internal ones included) plus the rate of storing energy in
// capacitors, to 1e-9 of the power being exchanged. A capacitor circuit
// passes `scale`, its peak power, because once the current has died away
// the powers left are smaller than the rounding of the potentials.
function balance(lab, solution, scale) {
  let supplied = 0,
    used = 0,
    gross = 0;
  for (const item of lab.list()) {
    const r = solution.of(item.id);
    if (r.power === null) continue;
    if (item.kind === "cell") {
      supplied += r.emfPower;
      used += r.lost;
      gross += Math.abs(r.emfPower) + r.lost;
    } else {
      used += r.power;
      gross += Math.abs(r.power);
    }
  }
  near(supplied, used, STEADY * (scale ?? gross / 2), "power balance");
  return supplied;
}
function solved(lab, status = "ok", scale) {
  const s = lab.solve();
  assert.equal(s.status, status, s.message);
  finite(s);
  balance(lab, s, scale);
  return s;
}
// Peak power of the 10 V, 10 kΩ capacitor circuits: V²/R.
const RC_POWER = 10 ** 2 / 10e3;

// The four steady circuits of checks 1 to 4, each with or without an
// ammeter in series and a voltmeter in parallel (check 6).
const circuits = {
  series(lab, meters) {
    const id = {
      cell: lab.add("cell", { emf: 12, nodes: ["p", "n"] }),
      r1: lab.add("resistor", {
        resistance: 4,
        nodes: [meters ? "p2" : "p", "m"],
      }),
      r2: lab.add("resistor", { resistance: 8, nodes: ["m", "n"] }),
    };
    if (meters) {
      id.ammeter = lab.add("ammeter", { nodes: ["p", "p2"] });
      id.voltmeter = lab.add("voltmeter", { nodes: ["m", "n"] });
    }
    return { id, ammeter: 1, voltmeter: 8 };
  },
  parallel(lab, meters) {
    const id = {
      cell: lab.add("cell", { emf: 12, nodes: ["p", "n"] }),
      r1: lab.add("resistor", { resistance: 4, nodes: ["p", "n"] }),
      r2: lab.add("resistor", {
        resistance: 12,
        nodes: [meters ? "q" : "p", "n"],
      }),
    };
    if (meters) {
      id.ammeter = lab.add("ammeter", { nodes: ["p", "q"] });
      id.voltmeter = lab.add("voltmeter", { nodes: ["p", "n"] });
    }
    return { id, ammeter: 1, voltmeter: 12 };
  },
  internal(lab, meters) {
    const id = {
      cell: lab.add("cell", { emf: 12, internal: 1, nodes: ["p", "n"] }),
      load: lab.add("resistor", {
        resistance: 5,
        nodes: [meters ? "q" : "p", "n"],
      }),
    };
    if (meters) {
      id.ammeter = lab.add("ammeter", { nodes: ["p", "q"] });
      id.voltmeter = lab.add("voltmeter", { nodes: ["p", "n"] });
    }
    return { id, ammeter: 2, voltmeter: 10 };
  },
  twoCells(lab, meters) {
    const id = {
      cell12: lab.add("cell", { emf: 12, nodes: ["a", "g"] }),
      r2: lab.add("resistor", { resistance: 2, nodes: ["a", "top"] }),
      cell6: lab.add("cell", { emf: 6, nodes: ["b", "g"] }),
      r4: lab.add("resistor", { resistance: 4, nodes: ["b", "top"] }),
      r: lab.add("resistor", {
        resistance: 4,
        nodes: [meters ? "q" : "top", "g"],
      }),
    };
    if (meters) {
      id.ammeter = lab.add("ammeter", { nodes: ["top", "q"] });
      id.voltmeter = lab.add("voltmeter", { nodes: ["top", "g"] });
    }
    return { id, ammeter: 1.875, voltmeter: 7.5 };
  },
};

test("check 1, series: 12 V across 4 Ω and 8 Ω", () => {
  const lab = new CircuitLab(),
    { id } = circuits.series(lab),
    s = solved(lab);
  // I = V/(R₁ + R₂) = 12/12; V = IR.
  close(s.of(id.cell).current, 1, STEADY, "cell current");
  close(s.of(id.r1).current, 1, STEADY, "current in 4 Ω");
  close(s.of(id.r2).current, 1, STEADY, "current in 8 Ω");
  close(s.of(id.r1).voltage, 4, STEADY, "p.d. across 4 Ω");
  close(s.of(id.r2).voltage, 8, STEADY, "p.d. across 8 Ω");
  close(s.of(id.r1).power, 4, STEADY, "P = I²R in 4 Ω");
  close(s.of(id.r2).power, 8, STEADY, "P = I²R in 8 Ω");
});

test("check 2, parallel: 12 V across 4 Ω and 12 Ω", () => {
  const lab = new CircuitLab(),
    { id } = circuits.parallel(lab),
    s = solved(lab);
  close(s.of(id.r1).current, 3, STEADY, "current in 4 Ω");
  close(s.of(id.r2).current, 1, STEADY, "current in 12 Ω");
  close(s.of(id.cell).current, 4, STEADY, "total current");
  // 1/R = 1/4 + 1/12, so R = 3 Ω.
  close(
    s.of(id.cell).voltage / s.of(id.cell).current,
    3,
    STEADY,
    "equivalent resistance",
  );
});

test("check 3, internal resistance: EMF 12 V, r = 1 Ω, load 5 Ω", () => {
  const lab = new CircuitLab(),
    { id } = circuits.internal(lab),
    s = solved(lab),
    cell = s.of(id.cell);
  close(cell.current, 2, STEADY, "I = E/(R + r)");
  close(cell.voltage, 10, STEADY, "terminal voltage V = E − Ir");
  close(s.of(id.load).power, 20, STEADY, "load power");
  close(cell.lost, 4, STEADY, "power lost in the cell, I²r");
  close(cell.emfPower, 24, STEADY, "EI");
  close(cell.power, -20, STEADY, "the cell delivers 20 W to the circuit");
});

test("check 4, two cells: 12 V + 2 Ω, 6 V + 4 Ω and 4 Ω between two nodes", () => {
  const lab = new CircuitLab(),
    { id } = circuits.twoCells(lab),
    s = solved(lab);
  // Node voltage: V(1/2 + 1/4 + 1/4) = 12/2 + 6/4, so V = 7.5 V.
  close(s.potential("top") - s.potential("g"), 7.5, STEADY, "node voltage");
  close(s.of(id.cell12).current, 2.25, STEADY, "out of the 12 V cell");
  // Current is driven backwards through the 6 V cell: it is being charged.
  close(s.of(id.cell6).current, -0.375, STEADY, "into the 6 V cell");
  close(s.of(id.r).current, 1.875, STEADY, "through the 4 Ω resistor");
  assert.ok(s.of(id.cell6).emfPower < 0, "the 6 V cell absorbs energy");

  // The same circuit with the series resistors as internal resistances.
  const real = new CircuitLab(),
    big = real.add("cell", { emf: 12, internal: 2, nodes: ["top", "g"] }),
    small = real.add("cell", { emf: 6, internal: 4, nodes: ["top", "g"] }),
    r = real.add("resistor", { resistance: 4, nodes: ["top", "g"] }),
    t = solved(real);
  close(t.of(big).voltage, 7.5, STEADY, "terminal voltage");
  close(t.of(big).current, 2.25, STEADY);
  close(t.of(small).current, -0.375, STEADY);
  close(t.of(r).current, 1.875, STEADY);
});

test("check 5, Wheatstone bridge: balanced gives zero, unbalanced matches Thévenin", () => {
  const build = (r1, r2, r3, r4, bridge) => {
    const lab = new CircuitLab(),
      id = {
        cell: lab.add("cell", { emf: 9, nodes: ["top", "bottom"] }),
        r1: lab.add("resistor", { resistance: r1, nodes: ["top", "left"] }),
        r2: lab.add("resistor", { resistance: r2, nodes: ["left", "bottom"] }),
        r3: lab.add("resistor", { resistance: r3, nodes: ["top", "right"] }),
        r4: lab.add("resistor", { resistance: r4, nodes: ["right", "bottom"] }),
        g: lab.add(bridge[0], { ...bridge[1], nodes: ["left", "right"] }),
      };
    return { lab, id, s: solved(lab) };
  };
  // 100/200 = 300/600: no p.d. across the bridge, whatever joins it.
  for (const bridge of [
    ["ammeter"],
    ["resistor", { resistance: 50 }],
    ["wire"],
  ]) {
    const [kind, props = {}] = bridge,
      { id, s } = build(100, 200, 300, 600, [kind, props]);
    // Arms carry 9/300 = 30 mA and 9/900 = 10 mA.
    near(s.of(id.g).current, 0, 1e-12 * 0.03, "bridge current, " + kind);
    close(s.of(id.r1).current, 0.03, STEADY);
    close(s.of(id.r3).current, 0.01, STEADY);
  }
  const { id, s } = build(100, 200, 300, 600, ["voltmeter", {}]);
  near(s.of(id.g).voltage, 0, 1e-12 * 9, "bridge p.d.");
  // Unbalanced, 50 Ω galvanometer: I = V_th/(R_th + R_g) with
  // V_th = E(R₂/(R₁+R₂) − R₄/(R₃+R₄)), R_th = R₁∥R₂ + R₃∥R₄.
  const vth = 9 * (200 / 300 - 500 / 800),
    rth = (100 * 200) / 300 + (300 * 500) / 800,
    off = build(100, 200, 300, 500, ["resistor", { resistance: 50 }]);
  close(off.s.of(off.id.g).current, vth / (rth + 50), STEADY, "unbalanced");
});

test("check 6, meters: an ammeter in series and a voltmeter in parallel change nothing", () => {
  for (const [name, build] of Object.entries(circuits)) {
    const plain = new CircuitLab(),
      a = build(plain, false),
      metered = new CircuitLab(),
      b = build(metered, true),
      before = solved(plain),
      after = solved(metered);
    for (const [part, id] of Object.entries(a.id))
      for (const quantity of ["current", "voltage", "power"]) {
        const was = before.of(id)[quantity],
          now = after.of(b.id[part])[quantity];
        near(
          now,
          was,
          STEADY * Math.max(Math.abs(was), 1e-12),
          `${name}: ${part} ${quantity}`,
        );
      }
    close(after.of(b.id.ammeter).current, b.ammeter, STEADY, name + " ammeter");
    close(
      after.of(b.id.voltmeter).voltage,
      b.voltmeter,
      STEADY,
      name + " voltmeter",
    );
    // Ideal meters: no p.d. across the ammeter, no current in the voltmeter.
    assert.equal(after.of(b.id.ammeter).voltage, 0);
    assert.equal(after.of(b.id.voltmeter).current, 0);
    assert.equal(after.of(b.id.ammeter).power, 0);
    assert.equal(after.of(b.id.voltmeter).power, 0);
  }
});

test("check 7, power balance in a mixed network of cells, lamps and switches", () => {
  const lab = new CircuitLab();
  lab.add("cell", { emf: 9, internal: 0.5, nodes: ["a", "0"] });
  lab.add("cell", { emf: 4.5, internal: 0.2, nodes: ["c", "0"] });
  lab.add("switch", { closed: true, nodes: ["a", "b"] });
  lab.add("lamp", { resistance: 12, nodes: ["b", "c"] });
  lab.add("variable", { resistance: 33, maximum: 100, nodes: ["b", "d"] });
  lab.add("resistor", { resistance: 47, nodes: ["d", "0"] });
  lab.add("ammeter", { nodes: ["d", "e"] });
  lab.add("resistor", { resistance: 22, nodes: ["e", "c"] });
  lab.add("wire", { nodes: ["e", "f"] });
  lab.add("voltmeter", { nodes: ["f", "0"] });
  const supplied = balance(lab, solved(lab));
  assert.ok(supplied > 0);
});

// 10 V, 10 kΩ, 100 µF: time constant RC = 1 s.
function rc({ initialVoltage = 0, emf = 10 } = {}) {
  const lab = new CircuitLab(),
    id = {
      cell: emf === null ? null : lab.add("cell", { emf, nodes: ["p", "n"] }),
      r: lab.add("resistor", {
        resistance: 10e3,
        nodes: [emf === null ? "n" : "p", "m"],
      }),
      c: lab.add("capacitor", {
        capacitance: 100e-6,
        initialVoltage,
        nodes: ["m", "n"],
      }),
    };
  return { lab, id };
}

test("check 8, RC charging: initial current, then V = V₀(1 − e^(−t/RC))", () => {
  const { lab, id } = rc();
  close(lab.timeConstants()[0], 1, STEADY, "time constant RC");
  close(lab.timestep, 1 / STEPS_PER_TAU, STEADY, "timestep from the circuit");
  let s = solved(lab);
  // Uncharged, the capacitor has no p.d.: all 10 V is across the resistor.
  close(s.of(id.r).current, 1e-3, STEADY, "initial current");
  close(s.of(id.c).current, 1e-3, STEADY, "initial charging current");
  assert.equal(s.of(id.c).voltage, 0);
  assert.equal(lab.advance(1), 1);
  assert.equal(lab.time, 1);
  s = solved(lab, "ok", RC_POWER);
  close(s.of(id.c).voltage, 10 * (1 - Math.exp(-1)), TIMED, "V at 1 s");
  close(s.of(id.c).voltage, 6.321, 1e-4, "6.321 V at 1 s to four figures");
  close(s.of(id.r).current, 1e-3 * Math.exp(-1), TIMED, "I at 1 s");
  lab.advance(4);
  assert.equal(lab.time, 5);
  s = solved(lab, "ok", RC_POWER);
  close(s.of(id.c).voltage, 10 * (1 - Math.exp(-5)), TIMED, "V at 5 s");
  close(s.of(id.c).voltage, 9.933, 1e-4, "9.933 V at 5 s to four figures");
  close(s.of(id.c).charge, 100e-6 * s.of(id.c).voltage, STEADY, "Q = CV");
});

test("check 9, RC discharging from 10 V through 10 kΩ", () => {
  const { lab, id } = rc({ initialVoltage: 10, emf: null });
  let s = solved(lab);
  close(s.of(id.c).voltage, 10, STEADY, "initial p.d.");
  close(Math.abs(s.of(id.r).current), 1e-3, STEADY, "initial current V/R");
  lab.advance(1);
  s = solved(lab, "ok", RC_POWER);
  close(s.of(id.c).voltage, 10 * Math.exp(-1), TIMED, "V at 1 s");
  close(s.of(id.c).voltage, 3.679, 1e-4, "3.679 V at 1 s to four figures");
});

test("check 10, energy: the capacitor stores ½CV², the resistor dissipates the same", () => {
  const { lab, id } = rc();
  lab.advance(20); // 20 time constants: charged to within e⁻²⁰
  const s = solved(lab, "ok", RC_POWER);
  close(s.of(id.c).energy, 5e-3, TIMED, "stored ½CV²");
  close(s.of(id.r).heat, 5e-3, TIMED, "dissipated in the resistor");
  close(s.of(id.cell).supplied, 10e-3, TIMED, "supplied by the cell, QV");
  close(
    s.of(id.cell).supplied,
    s.of(id.c).energy + s.of(id.r).heat,
    1e-9,
    "energy is accounted for",
  );
});

test("check 11, capacitors in series across 10 V share the charge", () => {
  // Joined straight across an ideal cell they charge at once.
  const lab = new CircuitLab(),
    cell = lab.add("cell", { emf: 10, nodes: ["p", "n"] }),
    c1 = lab.add("capacitor", { capacitance: 100e-6, nodes: ["p", "m"] }),
    c2 = lab.add("capacitor", { capacitance: 100e-6, nodes: ["m", "n"] });
  // Once charged nothing flows: any power left is below 1e-9 of a milliwatt.
  let s = solved(lab, "ok", 1e-3);
  for (const c of [c1, c2]) {
    close(s.of(c).voltage, 5, STEADY, "5 V on each");
    close(s.of(c).charge, 500e-6, STEADY, "500 µC on each");
  }
  assert.ok(lab.takeEvents().some((e) => e.type === "jump"));
  near(s.of(cell).current, 0, 1e-15, "no current once charged");
  // Unequal: C = 75 µF in all, Q = 750 µC, V = Q/C = 7.5 V and 2.5 V.
  lab.update(c2, { capacitance: 300e-6 });
  lab.reset();
  s = solved(lab, "ok", 1e-3);
  close(s.of(c1).voltage, 7.5, STEADY);
  close(s.of(c2).voltage, 2.5, STEADY);
  close(s.of(c1).charge, 750e-6, STEADY);
  close(s.of(c2).charge, 750e-6, STEADY);

  // Through a resistor they reach the same values, with τ = R·C₁C₂/(C₁+C₂).
  const slow = new CircuitLab();
  slow.add("cell", { emf: 10, nodes: ["p", "n"] });
  slow.add("resistor", { resistance: 10e3, nodes: ["p", "a"] });
  const a = slow.add("capacitor", { capacitance: 100e-6, nodes: ["a", "m"] }),
    b = slow.add("capacitor", { capacitance: 100e-6, nodes: ["m", "n"] });
  close(slow.timeConstants()[0], 10e3 * 50e-6, 1e-9, "series time constant");
  slow.advance(0.5);
  close(solved(slow).of(a).voltage, 5 * (1 - Math.exp(-1)), TIMED);
  slow.advance(15);
  s = solved(slow, "ok", RC_POWER);
  for (const c of [a, b]) {
    close(s.of(c).voltage, 5, TIMED, "5 V on each");
    close(s.of(c).charge, 500e-6, TIMED, "500 µC on each");
  }
});

test("check 12, short circuit and open circuit: a clear status, never NaN", () => {
  const short = new CircuitLab(),
    cell = short.add("cell", { emf: 12, nodes: ["p", "n"] }),
    lamp = short.add("lamp", { resistance: 6, nodes: ["p", "n"] });
  short.add("wire", { nodes: ["p", "n"] });
  let s = short.solve();
  finite(s);
  assert.equal(s.status, "short");
  assert.match(s.message, /short circuit/i);
  assert.match(s.message, /E1/);
  assert.equal(s.of(cell).current, null, "no finite current to report");
  assert.equal(s.of(lamp).power, null);
  assert.ok(s.problems[0].ids.includes(cell));
  // Time does not corrupt it.
  short.advance(1);
  finite(short.solve());
  assert.equal(short.solve().status, "short");
  // Giving the cell an internal resistance makes it a finite current, E/r.
  short.update(cell, { internal: 0.5 });
  s = solved(short);
  close(s.of(cell).current, 24, STEADY, "short-circuit current E/r");
  near(s.of(lamp).current, 0, 1e-12, "the wire takes it all");
  assert.ok(s.notices.some((n) => n.type === "shorted-cell"));

  const open = new CircuitLab(),
    source = open.add("cell", { emf: 12, nodes: ["p", "n"] }),
    r = open.add("resistor", { resistance: 4, nodes: ["p", "m"] }),
    sw = open.add("switch", { closed: false, nodes: ["m", "n"] });
  s = solved(open, "open");
  assert.match(s.message, /open circuit/i);
  assert.equal(s.of(source).current, 0);
  assert.equal(s.of(r).current, 0);
  assert.equal(s.of(r).voltage, 0);
  // The whole EMF appears across the gap.
  close(s.of(sw).voltage, 12, STEADY, "p.d. across the open switch");
  open.toggle(sw);
  s = solved(open);
  close(s.of(r).current, 3, STEADY);
  // A cell on its own, a resistor on its own, nothing at all.
  const alone = new CircuitLab();
  assert.equal(alone.solve().status, "ok");
  alone.add("cell", { emf: 6, nodes: ["a", "b"] });
  alone.add("resistor", { resistance: 4, nodes: ["c", "d"] });
  s = solved(alone, "open");
  close(s.of(1).voltage, 6, STEADY, "open-circuit voltage is the EMF");
});

test("ideal cells that disagree are reported, and do not spoil a separate circuit", () => {
  const lab = new CircuitLab(),
    a = lab.add("cell", { emf: 12, nodes: ["p", "n"] }),
    b = lab.add("cell", { emf: 6, nodes: ["p", "n"] }),
    r = lab.add("resistor", { resistance: 10, nodes: ["p", "n"] }),
    // A second, healthy circuit that shares no node with the first.
    other = lab.add("cell", { emf: 3, nodes: ["x", "y"] }),
    load = lab.add("resistor", { resistance: 6, nodes: ["x", "y"] });
  const s = lab.solve();
  finite(s);
  assert.equal(s.status, "conflict");
  assert.match(s.message, /E1/);
  assert.match(s.message, /E2/);
  assert.match(s.message, /12 V/);
  for (const id of [a, b, r]) assert.equal(s.of(id).current, null);
  close(s.of(other).current, 0.5, STEADY, "the other circuit still solves");
  close(s.of(load).voltage, 3, STEADY);
  // Equal ideal cells in parallel agree; they are taken to share equally.
  lab.update(b, { emf: 12 });
  const t = solved(lab);
  close(t.of(r).current, 1.2, STEADY);
  close(t.of(a).current, 0.6, STEADY);
  close(t.of(b).current, 0.6, STEADY);
  assert.ok(t.notices.some((n) => n.type === "split"));
  // Opposed in series they are a valid circuit (net EMF 6 V).
  const opposed = new CircuitLab();
  opposed.add("cell", { emf: 12, nodes: ["p", "m"] });
  opposed.add("cell", { emf: 6, nodes: ["n", "m"] });
  const res = opposed.add("resistor", { resistance: 3, nodes: ["p", "n"] });
  close(solved(opposed).of(res).current, 2, STEADY);
});

test("separate and floating sections each get their own reference", () => {
  const lab = new CircuitLab(),
    c1 = lab.add("cell", { emf: 12, nodes: ["a", "b"] }),
    r1 = lab.add("resistor", { resistance: 6, nodes: ["a", "b"] }),
    c2 = lab.add("cell", { emf: 5, nodes: ["c", "d"] }),
    r2 = lab.add("resistor", { resistance: 10, nodes: ["c", "e"] }),
    r3 = lab.add("resistor", { resistance: 10, nodes: ["e", "d"] }),
    lone = lab.add("resistor", { resistance: 1, nodes: ["f", "g"] }),
    stub = lab.add("wire", { nodes: ["a", "h"] }),
    across = lab.add("voltmeter", { nodes: ["a", "c"] }),
    within = lab.add("voltmeter", { nodes: ["e", "d"] });
  const s = solved(lab);
  close(s.of(r1).current, 2, STEADY);
  close(s.of(r2).current, 0.25, STEADY);
  close(s.of(within).voltage, 2.5, STEADY);
  assert.equal(s.of(lone).current, 0);
  assert.equal(s.of(stub).current, 0);
  // The zero of potential is each section's negative cell terminal.
  assert.equal(s.potential("b"), 0);
  assert.equal(s.potential("d"), 0);
  close(s.potential("a"), 12, STEADY);
  close(s.potential("h"), 12, STEADY, "a dangling wire is at its end's potential");
  close(s.potential("e"), 2.5, STEADY);
  // A voltmeter between two sections that are not joined has no reading.
  assert.equal(s.of(across).voltage, null);
  assert.ok(s.notices.some((n) => n.type === "floating"));
  assert.notEqual(s.part("a"), s.part("c"));
  assert.equal(s.part("c"), s.part("e"));
  assert.ok(s.of(c1).current > 0 && s.of(c2).current > 0);
});

test("zero-resistance elements: no p.d., exact currents, parallel wires share", () => {
  const lab = new CircuitLab(),
    cell = lab.add("cell", { emf: 6, nodes: ["p", "n"] }),
    r = lab.add("resistor", { resistance: 3, nodes: ["p", "a"] }),
    zero = lab.add("resistor", { resistance: 0, nodes: ["a", "b"] }),
    sw = lab.add("switch", { closed: true, nodes: ["b", "c"] }),
    w1 = lab.add("wire", { nodes: ["c", "n"] });
  let s = solved(lab);
  for (const id of [zero, sw, w1]) {
    close(s.of(id).current, 2, STEADY, "series current");
    assert.equal(s.of(id).voltage, 0);
    assert.equal(s.of(id).power, 0);
  }
  assert.equal(s.notices.length, 0);
  // A second wire beside the first: only their total is fixed by the
  // circuit, so identical conductors are taken to share it equally.
  const w2 = lab.add("wire", { nodes: ["c", "n"] });
  s = solved(lab);
  close(s.of(w1).current, 1, STEADY);
  close(s.of(w2).current, 1, STEADY);
  close(s.of(cell).current, 2, STEADY, "nothing else changes");
  close(s.of(r).voltage, 6, STEADY);
  assert.deepEqual(s.notices.find((n) => n.type === "split").ids.sort(), [
    w1,
    w2,
  ]);
  // A wire across a resistor takes all the current.
  lab.remove(w2);
  const bypass = lab.add("wire", { nodes: ["p", "a"] });
  assert.equal(lab.solve().status, "short");
  lab.update(cell, { internal: 1.5 });
  s = solved(lab);
  close(s.of(bypass).current, 4, STEADY, "E/r through the bypass");
  near(s.of(r).current, 0, 1e-15);
});

test("switches: open carries nothing, two-way selects one throw", () => {
  const lab = new CircuitLab(),
    cell = lab.add("cell", { emf: 12, nodes: ["p", "n"] }),
    sw = lab.add("switch2", { position: "a", nodes: ["p", "x", "y"] }),
    ra = lab.add("resistor", { resistance: 4, nodes: ["x", "n"] }),
    rb = lab.add("resistor", { resistance: 6, nodes: ["y", "n"] });
  let s = solved(lab);
  close(s.of(ra).current, 3, STEADY);
  assert.equal(s.of(rb).current, 0);
  close(s.of(sw).current, 3, STEADY);
  // p.d. across the open contact.
  close(s.of(sw).voltage, 12, STEADY);
  lab.toggle(sw);
  assert.equal(lab.get(sw).position, "b");
  s = solved(lab);
  assert.equal(s.of(ra).current, 0);
  close(s.of(rb).current, 2, STEADY);
  close(s.of(cell).current, 2, STEADY);
});

test("lamp brightness follows its power", () => {
  const lab = new CircuitLab();
  lab.add("cell", { emf: 6, nodes: ["p", "n"] });
  const lamp = lab.add("lamp", {
    resistance: 12,
    ratedPower: 3,
    nodes: ["p", "n"],
  });
  let s = solved(lab);
  close(s.of(lamp).power, 3, STEADY, "V²/R");
  close(s.of(lamp).brightness, 1, STEADY, "at its rated power");
  // A second identical lamp in series: half the p.d., a quarter the power.
  lab.update(lamp, { nodes: ["p", "m"] });
  const second = lab.add("lamp", {
    resistance: 12,
    ratedPower: 3,
    nodes: ["m", "n"],
  });
  s = solved(lab);
  close(s.of(lamp).power, 0.75, STEADY);
  close(s.of(second).brightness, 0.25, STEADY);
});

test("parallel capacitors: the charging current divides in proportion to C", () => {
  const lab = new CircuitLab();
  lab.add("cell", { emf: 10, nodes: ["p", "n"] });
  const r = lab.add("resistor", { resistance: 1e3, nodes: ["p", "a"] }),
    c1 = lab.add("capacitor", { capacitance: 100e-6, nodes: ["a", "n"] }),
    // Joined to the first by plain wires, as a student would build it.
    c2 = lab.add("capacitor", { capacitance: 300e-6, nodes: ["b", "c"] });
  lab.add("wire", { nodes: ["a", "b"] });
  lab.add("wire", { nodes: ["c", "n"] });
  let s = solved(lab);
  close(s.of(r).current, 10e-3, STEADY, "initial total current");
  // i = C dV/dt with the same dV/dt on both.
  close(s.of(c1).current, 2.5e-3, STEADY, "share of the 100 µF");
  close(s.of(c2).current, 7.5e-3, STEADY, "share of the 300 µF");
  assert.equal(s.notices.filter((n) => n.type === "split").length, 0);
  // τ = R(C₁ + C₂) = 0.4 s.
  close(lab.timeConstants()[0], 0.4, STEADY, "time constant");
  assert.equal(lab.timeConstants().length, 1);
  lab.advance(0.4);
  s = solved(lab);
  close(s.of(c1).voltage, 10 * (1 - Math.exp(-1)), TIMED);
  close(s.of(c2).voltage, s.of(c1).voltage, STEADY, "same p.d.");
  close(s.of(c2).current / s.of(c1).current, 3, STEADY, "still 3 : 1");
  close(s.of(c2).charge / s.of(c1).charge, 3, STEADY, "Q in proportion to C");
});

test("flipping a switch keeps the charge on each capacitor", () => {
  // Charge through R1, isolate, then discharge through R2.
  const lab = new CircuitLab();
  lab.add("cell", { emf: 10, nodes: ["p", "n"] });
  lab.add("resistor", { resistance: 10e3, nodes: ["p", "a"] });
  const sw = lab.add("switch2", { position: "a", nodes: ["m", "a", "b"] }),
    c = lab.add("capacitor", { capacitance: 100e-6, nodes: ["m", "n"] }),
    r2 = lab.add("resistor", { resistance: 20e3, nodes: ["b", "n"] }),
    gate = lab.add("switch", { closed: false, nodes: ["b", "b2"] });
  lab.add("resistor", { resistance: 20e3, nodes: ["b2", "n"] });
  lab.advance(2);
  const charged = lab.solve().of(c);
  close(charged.voltage, 10 * (1 - Math.exp(-2)), TIMED);
  lab.toggle(sw);
  let s = solved(lab);
  assert.equal(s.of(c).charge, charged.charge, "charge unchanged by the flip");
  assert.equal(s.of(c).voltage, charged.voltage);
  assert.equal(lab.takeEvents().length, 0, "nothing jumped");
  // The current reverses at once: the capacitor now drives V/R through R2.
  close(s.of(r2).current, charged.voltage / 20e3, STEADY);
  close(s.of(c).current, -charged.voltage / 20e3, STEADY, "discharging");
  close(lab.timeConstants()[0], 2, STEADY, "now R₂C = 2 s");
  lab.advance(2);
  s = solved(lab);
  close(s.of(c).voltage, charged.voltage * Math.exp(-1), TIMED);
  // Closing the second switch halves the resistance; the charge carries on
  // from where it was.
  const before = s.of(c).charge;
  lab.toggle(gate);
  s = solved(lab);
  assert.equal(s.of(c).charge, before);
  close(lab.timeConstants()[0], 1, STEADY, "now 10 kΩ × 100 µF");
  // An isolated capacitor holds its charge indefinitely.
  const held = new CircuitLab(),
    cap = held.add("capacitor", {
      capacitance: 1e-6,
      initialVoltage: 7,
      nodes: ["a", "b"],
    }),
    open = held.add("switch", { nodes: ["a", "c"] });
  held.add("resistor", { resistance: 100, nodes: ["c", "b"] });
  held.advance(1000);
  assert.equal(held.solve().of(cap).voltage, 7);
  assert.deepEqual(held.timeConstants(), []);
  held.toggle(open);
  close(held.timeConstants()[0], 1e-4, STEADY);
  held.advance(1e-4);
  close(held.solve().of(cap).voltage, 7 * Math.exp(-1), TIMED);
});

test("joining a charged capacitor to an uncharged one conserves charge", () => {
  const lab = new CircuitLab(),
    c1 = lab.add("capacitor", {
      capacitance: 100e-6,
      initialVoltage: 10,
      nodes: ["a", "n"],
    }),
    sw = lab.add("switch", { closed: false, nodes: ["a", "b"] }),
    c2 = lab.add("capacitor", { capacitance: 300e-6, nodes: ["b", "n"] });
  // Charged, with the switch open, it has nowhere to send its charge.
  let s = solved(lab, "open");
  close(s.of(c1).charge, 1e-3, STEADY);
  lab.toggle(sw);
  s = solved(lab, "ok", 1e-3);
  // Q = 1 mC is shared over 400 µF: 2.5 V on each.
  close(s.of(c1).voltage, 2.5, STEADY);
  close(s.of(c2).voltage, 2.5, STEADY);
  close(s.of(c1).charge + s.of(c2).charge, 1e-3, STEADY, "total charge");
  const event = lab.takeEvents().find((e) => e.type === "jump");
  assert.ok(event, "the instant redistribution is reported");
  // ½CV² falls from 5 mJ to 1.25 mJ; the rest is lost in the joining.
  close(event.lost, 3.75e-3, STEADY, "energy lost");
  // Through a resistor the same end point is reached gradually, and the
  // resistor's heat is that same 3.75 mJ.
  const slow = new CircuitLab(),
    a = slow.add("capacitor", {
      capacitance: 100e-6,
      initialVoltage: 10,
      nodes: ["a", "n"],
    }),
    r = slow.add("resistor", { resistance: 1e3, nodes: ["a", "b"] }),
    b = slow.add("capacitor", { capacitance: 300e-6, nodes: ["b", "n"] });
  // τ = R·C₁C₂/(C₁+C₂) = 75 ms.
  close(slow.timeConstants()[0], 0.075, STEADY);
  slow.advance(2);
  s = solved(slow, "ok", 10 ** 2 / 1e3);
  close(s.of(a).voltage, 2.5, TIMED);
  close(s.of(b).voltage, 2.5, TIMED);
  close(s.of(r).heat, 3.75e-3, TIMED);
  // A capacitor shorted by a wire is discharged at once.
  const shorted = new CircuitLab(),
    cap = shorted.add("capacitor", {
      capacitance: 1e-3,
      initialVoltage: 5,
      nodes: ["a", "b"],
    });
  shorted.add("wire", { nodes: ["a", "b"] });
  s = solved(shorted);
  assert.equal(s.of(cap).voltage, 0);
  assert.equal(s.status, "ok");
});

test("several time constants: each is found, and the step follows the shortest", () => {
  // Two independent RC circuits.
  const lab = new CircuitLab();
  lab.add("cell", { emf: 5, nodes: ["p", "n"] });
  lab.add("resistor", { resistance: 1e3, nodes: ["p", "a"] });
  const fast = lab.add("capacitor", { capacitance: 1e-6, nodes: ["a", "n"] });
  lab.add("cell", { emf: 5, nodes: ["q", "g"] });
  lab.add("resistor", { resistance: 2e6, nodes: ["q", "b"] });
  const slow = lab.add("capacitor", { capacitance: 1e-6, nodes: ["b", "g"] });
  const taus = lab.timeConstants();
  assert.equal(taus.length, 2);
  close(taus[0], 1e-3, STEADY, "1 kΩ × 1 µF");
  close(taus[1], 2, STEADY, "2 MΩ × 1 µF");
  close(lab.timestep, 1e-3 / STEPS_PER_TAU, STEADY);
  assert.deepEqual(lab.timeConstants(fast).map((t) => +t.toPrecision(9)), [
    1e-3,
  ]);
  close(lab.timeConstants(slow)[0], 2, STEADY);
  // A two-stage RC ladder: the modes of dv/dt = −C⁻¹Gv.
  const ladder = new CircuitLab(),
    R = 1e3,
    C = 1e-6;
  ladder.add("cell", { emf: 1, nodes: ["p", "n"] });
  ladder.add("resistor", { resistance: R, nodes: ["p", "a"] });
  const first = ladder.add("capacitor", { capacitance: C, nodes: ["a", "n"] });
  ladder.add("resistor", { resistance: R, nodes: ["a", "b"] });
  const last = ladder.add("capacitor", { capacitance: C, nodes: ["b", "n"] });
  // G = [[2, −1], [−1, 1]]/R: rates (3 ± √5)/2RC.
  const modes = ladder.timeConstants();
  close(modes[0], (R * C * 2) / (3 + Math.sqrt(5)), STEADY);
  close(modes[1], (R * C * 2) / (3 - Math.sqrt(5)), STEADY);
  assert.equal(ladder.timeConstants(last).length, 2);
  // Step response of the far capacitor, from the two modes.
  const t = 3e-3,
    [l1, l2] = [(3 + Math.sqrt(5)) / 2, (3 - Math.sqrt(5)) / 2].map(
      (m) => m / (R * C),
    ),
    expected =
      1 - (l1 * Math.exp(-l2 * t) - l2 * Math.exp(-l1 * t)) / (l1 - l2);
  ladder.advance(t);
  close(ladder.solve().of(last).voltage, expected, TIMED, "ladder response");
  assert.ok(ladder.solve().of(first).voltage > expected);
});

test("time stepping: fixed steps, frame-rate independent, honest when capped", () => {
  const run = (frames, dt) => {
    const { lab, id } = rc();
    for (let i = 0; i < frames; i++) lab.advance(dt);
    return { lab, v: lab.solve().of(id.c).voltage };
  };
  // The same second in 60 frames, 144 frames or 7 uneven ones.
  const a = run(60, 1 / 60),
    b = run(144, 1 / 144),
    c = run(7, 1 / 7);
  close(a.lab.time, 1, 1e-12);
  assert.equal(a.v, b.v, "identical steps, identical result");
  assert.equal(a.v, c.v);
  // Asked for more than the step budget allows, it advances less and says so.
  const { lab } = rc(),
    advanced = lab.advance(10, { maxSteps: 50 });
  close(advanced, 50 / STEPS_PER_TAU, 1e-12);
  close(lab.time, advanced, 1e-12);
  // A finer display resolution only ever shortens the step.
  const fine = rc();
  fine.lab.advance(1, { resolution: 1e-3 });
  close(fine.lab.solve().of(fine.id.c).voltage, 10 * (1 - Math.exp(-1)), 1e-5);
  // Reset: time zero, capacitors back to their starting voltage.
  a.lab.reset();
  assert.equal(a.lab.time, 0);
  assert.equal(a.lab.solve().of(3).voltage, 0);
  assert.equal(a.lab.solve().of(2).heat, 0);
});

test("an EMF may be a function of time: RC driven by a ramp and by a sine", () => {
  // E = kt into RC: V_C = k(t − τ(1 − e^(−t/τ))).
  const ramp = new CircuitLab(),
    k = 4;
  ramp.add("cell", { emf: (t) => k * t, nodes: ["p", "n"] });
  ramp.add("resistor", { resistance: 10e3, nodes: ["p", "m"] });
  const c = ramp.add("capacitor", { capacitance: 100e-6, nodes: ["m", "n"] });
  ramp.advance(2.5);
  close(
    ramp.solve().of(c).voltage,
    k * (2.5 - (1 - Math.exp(-2.5))),
    TIMED,
    "ramp response",
  );
  // A capacitor straight across an ideal source: i = C dE/dt.
  const direct = new CircuitLab(),
    w = 2 * Math.PI * 50;
  direct.maxStep = 1e-5;
  const source = direct.add("cell", {
      emf: (t) => 10 * Math.sin(w * t),
      nodes: ["p", "n"],
    }),
    cap = direct.add("capacitor", { capacitance: 10e-6, nodes: ["p", "n"] });
  let s = direct.solve();
  close(s.of(cap).current, 10e-6 * 10 * w, 1e-6, "i = C dE/dt at t = 0");
  direct.advance(0.0237);
  s = direct.solve();
  close(s.of(cap).voltage, 10 * Math.sin(w * 0.0237), 1e-9);
  close(s.of(cap).current, 10e-6 * 10 * w * Math.cos(w * 0.0237), TIMED);
  close(s.of(source).current, s.of(cap).current, STEADY);
});

test("values are validated at the boundary, atomically, with readable messages", () => {
  const lab = new CircuitLab(),
    r = lab.add("resistor", { resistance: 10, nodes: ["a", "b"] });
  assert.throws(() => lab.add("inductor", {}), /Unknown component/);
  assert.throws(() => lab.add("resistor", { resistance: -1 }), /Resistance/);
  assert.throws(() => lab.add("resistor", { resistance: NaN }), /Resistance/);
  assert.throws(
    () => lab.add("capacitor", { capacitance: 0, nodes: ["a", "b"] }),
    /Capacitance/,
  );
  assert.throws(
    () => lab.add("cell", { internal: -0.1, nodes: ["a", "b"] }),
    /Internal resistance/,
  );
  assert.throws(() => lab.add("resistor", { x: 0.5, y: 0 }), /grid/);
  assert.throws(
    () => lab.update(r, { resistance: 20, bogus: 1 }),
    /cannot be changed/,
  );
  assert.equal(lab.get(r).resistance, 10, "nothing applied from a bad patch");
  const v = lab.add("variable", {
    resistance: 50,
    maximum: 100,
    nodes: ["a", "b"],
  });
  assert.throws(() => lab.update(v, { resistance: 150 }), /maximum/);
  lab.update(v, { resistance: 150, maximum: 200 });
  assert.equal(lab.get(v).resistance, 150);
  assert.throws(() => lab.update(999, { resistance: 1 }), /no longer exists/);
  assert.equal(lab.list().length, 2);
  // Every kind has a label, and its defaults pass its own limits.
  for (const kind of Object.keys(KINDS)) {
    const fresh = new CircuitLab();
    fresh.add(kind, kind === "wire" ? { x2: 2 } : { x: 0, y: 0 });
    assert.ok(KINDS[kind].label);
  }
  assert.ok(LIMITS.resistance[1] >= 1e6);
  // Names count up within each letter.
  const named = new CircuitLab();
  named.add("resistor", { nodes: ["a", "b"] });
  named.add("variable", { nodes: ["a", "b"] });
  named.add("capacitor", { nodes: ["a", "b"] });
  assert.deepEqual(
    named.list().map((i) => i.name),
    ["R1", "R2", "C1"],
  );
});

test("on the grid: terminals that touch are joined, wires split and follow", () => {
  // The series circuit of check 1 laid out on the grid.
  const lab = new CircuitLab(),
    // Three quarter-turns anticlockwise puts the + terminal at the top.
    cell = lab.add("cell", { x: 0, y: 1, rot: 3, emf: 12 }),
    r1 = lab.add("resistor", { x: 2, y: 2, resistance: 4 }),
    r2 = lab.add("resistor", { x: 4, y: 2, resistance: 8 });
  assert.deepEqual(
    lab.terminals(cell).map((t) => [t.x, t.y]),
    [
      [0, 2],
      [0, 0],
    ],
  );
  lab.wire([0, 2], [1, 2]);
  lab.wire([5, 2], [5, 0], [0, 0]);
  let s = solved(lab);
  close(s.of(r1).voltage, 4, STEADY);
  close(s.of(r2).voltage, 8, STEADY);
  close(s.of(cell).current, 1, STEADY);
  assert.equal(lab.list().filter((i) => i.kind === "wire").length, 3);
  // An ammeter dropped on a wire is inserted into it.
  const ammeter = lab.add("ammeter", { x: 3, y: 0 });
  lab.settle(ammeter);
  const wires = lab.list().filter((i) => i.kind === "wire");
  assert.equal(wires.length, 4, "the wire is cut and its middle removed");
  s = solved(lab);
  close(Math.abs(s.of(ammeter).current), 1, STEADY, "reads the series current");
  close(s.of(r2).voltage, 8, STEADY, "and changes nothing");
  // A wire that ends part-way along another joins it there.
  const tap = lab.wire([1, 0], [1, 1])[0];
  assert.equal(lab.list().filter((i) => i.kind === "wire").length, 6);
  near(lab.solve().potential("1,1"), 0, 1e-12, "at the negative terminal");
  lab.remove(tap);
  // Moving a component takes the wire ends on its terminals with it.
  lab.move(r1, 2, 3);
  lab.settle(r1);
  s = lab.solve();
  assert.equal(s.status, "open", "the far terminal came away from R2");
  lab.wire([3, 3], [3, 2]);
  s = solved(lab);
  close(s.of(r1).voltage, 4, STEADY, "rejoined");
  assert.ok(
    lab.list().some((i) => i.kind === "wire" && i.x1 === 0 && i.y2 === 3),
    "the wire from the cell stretched to follow",
  );
  // Dragging a wire's end: nothing is committed until the gesture ends.
  const loose = lab.wire([10, 6], [12, 6])[0];
  lab.update(loose, { x2: 12, y2: 8 });
  assert.equal(lab.advance(1), 0, "the clock waits for the drag to end");
  lab.settle();
  assert.deepEqual(
    lab.terminals(loose).map((t) => [t.x, t.y]),
    [
      [10, 6],
      [12, 8],
    ],
  );
  lab.remove(loose);
  // Duplicate and zero-length wires are tidied away.
  const count = lab.list().length;
  lab.wire([3, 3], [3, 2]);
  lab.wire([8, 8], [8, 8]);
  assert.equal(lab.list().length, count);
  // Turning a component about its centre leaves the wires where they are.
  const wiring = () =>
    lab
      .list()
      .filter((i) => i.kind === "wire")
      .map((w) => [w.x1, w.y1, w.x2, w.y2].join());
  const before = wiring();
  // A resistor is the same either way round, so it has two orientations
  // only: along the grid (terminal 0 at the left) or up it (at the top).
  lab.rotate(r2);
  assert.equal(lab.get(r2).rot, 3);
  assert.deepEqual(
    lab.terminals(r2).map((t) => [t.x, t.y]),
    [
      [4, 3],
      [4, 1],
    ],
  );
  assert.deepEqual(wiring(), before);
  assert.equal(lab.solve().status, "open", "a quarter-turn takes it off");
  // A second quarter-turn puts it back exactly as it was, not reversed.
  lab.rotate(r2);
  assert.equal(lab.get(r2).rot, 0);
  s = solved(lab);
  close(s.of(r2).voltage, 8, STEADY, "the same way round as before");
  close(s.of(r1).voltage, 4, STEADY);
  for (const kind of ["resistor", "variable", "lamp", "switch"]) {
    const two = new CircuitLab(),
      id = two.add(kind, { x: 0, y: 0, rot: 2 });
    assert.equal(two.get(id).rot, 0, kind + " placed back to front");
    two.update(id, { rot: 1 });
    two.settle();
    assert.equal(two.get(id).rot, 3, kind + " placed upside down");
    two.rotate(id, 2);
    assert.equal(two.get(id).rot, 3, kind + ": a half-turn changes nothing");
  }
  // Components with a + terminal, and the two-way switch, keep all four.
  for (const kind of ["cell", "capacitor", "ammeter", "voltmeter", "switch2"]) {
    const four = new CircuitLab(),
      id = four.add(kind, { x: 0, y: 0 });
    const seen = [0, 1, 2, 3].map(() => {
      four.rotate(id);
      return four.get(id).rot;
    });
    assert.deepEqual(seen, [1, 2, 3, 0], kind);
  }
  // A cell turned round drives the current the other way.
  lab.rotate(cell, 2);
  s = solved(lab);
  close(s.of(cell).current, 1, STEADY, "still out of its + terminal");
  close(s.of(r1).voltage, -4, STEADY, "but the other way round the loop");
  // So does a meter: an ammeter in the loop reads the other sign.
  const forwards = lab.solve().of(ammeter).current;
  lab.rotate(ammeter, 2);
  close(Math.abs(forwards), 1, STEADY);
  close(lab.solve().of(ammeter).current, -forwards, STEADY, "meter reversed");
  lab.clear();
  assert.equal(lab.list().length, 0);
  assert.equal(lab.time, 0);
});

test("the linear solver: Gaussian elimination with partial pivoting", () => {
  // A system that needs pivoting (zero on the diagonal).
  const a = [0, 2, 1, 1, 1, 0, 2, 0, 3],
    f = factor(Float64Array.from(a), 3);
  assert.ok(f.ok);
  // 2y + z = 7, x + y = 3, 2x + 3z = 11 has the solution x = 1, y = 2,
  // z = 3 (4 + 3 = 7; 1 + 2 = 3; 2 + 9 = 11).
  const x = substitute(f, Float64Array.from([7, 3, 11]));
  close(x[0], 1, 1e-12);
  close(x[1], 2, 1e-12);
  close(x[2], 3, 1e-12);
  // A singular matrix is reported, not divided by.
  assert.equal(factor(Float64Array.from([1, 2, 2, 4]), 2).ok, false);
  // Badly scaled rows still solve to rounding.
  const g = factor(Float64Array.from([1e-9, 1e-9, 1, -1]), 2),
    y = substitute(g, Float64Array.from([3e-9, 1]));
  close(y[0], 2, 1e-12);
  close(y[1], 1, 1e-12);
});

test("random circuits: never NaN, never unsolvable, current conserved at every node", () => {
  let seed = 20261011;
  const random = () =>
      (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32,
    pick = (list) => list[Math.floor(random() * list.length)],
    kinds = [
      ..."cell cell resistor resistor resistor variable lamp".split(" "),
      ..."switch switch2 wire ammeter voltmeter capacitor capacitor".split(" "),
    ];
  for (let trial = 0; trial < 400; trial++) {
    const lab = new CircuitLab(),
      names = Array.from(
        { length: 2 + Math.floor(random() * 7) },
        (_, i) => "n" + i,
      ),
      nodes = (count = 2) => Array.from({ length: count }, () => pick(names)),
      values = {
        cell: () => ({
          emf: Math.round(random() * 24),
          internal: random() < 0.5 ? 0 : random() * 5,
        }),
        resistor: () => ({
          resistance: random() < 0.1 ? 0 : 10 ** (random() * 8 - 1),
        }),
        variable: () => ({ resistance: random() * 100, maximum: 100 }),
        lamp: () => ({ resistance: 1 + random() * 20 }),
        switch: () => ({ closed: random() < 0.6 }),
        switch2: () => ({ position: pick(["a", "b"]) }),
        capacitor: () => ({
          capacitance: 10 ** (random() * 6 - 9),
          initialVoltage: random() < 0.5 ? 0 : random() * 10,
        }),
      };
    for (let i = 1 + Math.floor(random() * 14); i > 0; i--) {
      const kind = pick(kinds);
      lab.add(kind, {
        ...values[kind]?.(),
        nodes: nodes(kind === "switch2" ? 3 : 2),
      });
    }
    // As built; after three of its shortest time constants; after a switch.
    for (let phase = 0; phase < 3; phase++) {
      if (phase === 1) {
        const taus = lab.timeConstants();
        assert.ok(taus.every((tau) => tau > 0 && Number.isFinite(tau)));
        lab.advance(taus.length ? 3 * taus[0] : 1, { maxSteps: 400 });
      }
      if (phase === 2) {
        const switches = lab.list().filter((i) => i.kind.startsWith("switch"));
        if (switches.length) lab.toggle(pick(switches).id);
        lab.advance(1e-3, { maxSteps: 100 });
      }
      const s = lab.solve();
      assert.notEqual(s.status, "error", `trial ${trial}`);
      finite(s);
      const net = new Map(),
        dead = new Set();
      let largest = 0;
      for (const item of lab.list()) {
        const r = s.of(item.id),
          to = item.kind === "switch2" && item.position === "b" ? 2 : 1;
        if (r.flow === null) {
          item.nodes.forEach((n) => dead.add(n));
          continue;
        }
        net.set(item.nodes[0], (net.get(item.nodes[0]) || 0) + r.flow);
        net.set(item.nodes[to], (net.get(item.nodes[to]) || 0) - r.flow);
        largest = Math.max(largest, Math.abs(r.flow));
      }
      for (const [name, sum] of net)
        if (!dead.has(name))
          near(
            sum,
            0,
            1e-9 * largest + 4 * s.currentFloor,
            `trial ${trial}, phase ${phase}: current into ${name}`,
          );
    }
  }
});

test("presets: each builds a sound circuit and shows its stated readings", () => {
  assert.deepEqual(
    presets.map((p) => p.id),
    ["series", "parallel", "divider", "internal-resistance", "wheatstone", "rc"],
  );
  for (const preset of presets) {
    const lab = new CircuitLab();
    preset.build(lab);
    const named = (name) => {
        const item = lab.list().find((i) => i.name === name);
        assert.ok(item, `${preset.id}: no ${name}`);
        return item;
      },
      s = solved(lab);
    assert.ok(preset.title && preset.text && preset.expect && preset.view);
    named(preset.watch);
    // Sound wiring: no loose end, no doubled wire, no meter left floating.
    const ends = new Map();
    for (const item of lab.list())
      for (const node of item.nodes) ends.set(node, (ends.get(node) || 0) + 1);
    for (const [node, count] of ends)
      assert.ok(count >= 2, `${preset.id}: loose end at ${node}`);
    assert.deepEqual(s.notices, [], preset.id);
    for (const r of preset.readings) {
      const actual = s.of(named(r.name).id)[r.quantity];
      if (r.value === 0) assert.equal(actual, 0, `${preset.id}: ${r.name}`);
      else close(actual, r.value, STEADY, `${preset.id}: ${r.name}`);
    }
    for (const r of preset.later || []) {
      lab.advance(r.time - lab.time);
      close(lab.time, r.time, 1e-12);
      close(
        lab.solve().of(named(r.name).id)[r.quantity],
        r.value,
        TIMED,
        `${preset.id}: ${r.name} at ${r.time} s`,
      );
    }
    if (preset.timeConstant)
      close(lab.timeConstants()[0], preset.timeConstant, STEADY);
  }
  // The capacitor preset, switched over once charged: discharge through
  // the same 10 kΩ, the ammeter now reading the other way.
  const lab = new CircuitLab(),
    rcPreset = presets.find((p) => p.id === "rc");
  rcPreset.build(lab);
  const id = (name) => lab.list().find((i) => i.name === name).id;
  lab.advance(30);
  close(lab.solve().of(id("C1")).voltage, 10, 1e-9, "fully charged");
  lab.toggle(id("S1"));
  let s = lab.solve();
  close(s.of(id("A1")).current, -1e-3, 1e-9, "discharge starts at −V/R");
  close(lab.timeConstants(id("C1"))[0], 1, STEADY);
  lab.advance(1);
  s = lab.solve();
  close(s.of(id("V1")).voltage, 10 * Math.exp(-1), TIMED, "3.679 V after 1 s");
  // The internal-resistance preset with its switch opened reads the EMF.
  const real = new CircuitLab();
  presets.find((p) => p.id === "internal-resistance").build(real);
  real.toggle(real.list().find((i) => i.name === "S1").id);
  s = real.solve();
  assert.equal(s.status, "open");
  close(s.of(real.list().find((i) => i.name === "V1").id).voltage, 12, STEADY);
  // The divider with its lower resistor raised to 2 kΩ gives half the supply.
  const divider = new CircuitLab();
  presets.find((p) => p.id === "divider").build(divider);
  const find = (name) => divider.list().find((i) => i.name === name).id;
  divider.update(find("R2"), { resistance: 2e3 });
  close(divider.solve().of(find("V1")).voltage, 6, STEADY);
});
