// Ready-made circuits. Each one is built through the public CircuitLab API
// on the grid. `readings` states the textbook result each meter or component
// should show, written from the formula; tests/circuitlab.test.mjs holds the
// model to them and the page is checked against the same list.
//   readings  at the start (for a steady circuit, at all times)
//   later     after `time` seconds of running
//   steady    RMS values once the circuit has run for `settle` seconds (AC)
//   watch     the component selected, and graphed, when the preset loads
//   scale     simulated seconds per real second that suits it
// Components stand upright with terminal 0 (the + of a cell or a meter) at
// the top: that is a rotation of three quarter-turns.
const UP = 3;
const kilo = 1e3,
  micro = 1e-6;
// The AC presets: 10 V RMS at 50 Hz unless they say otherwise.
const RMS = 10,
  PEAK = RMS * Math.SQRT2,
  HZ = 50,
  OMEGA = 2 * Math.PI * HZ;
// Source, ammeter and one component with a voltmeter across it.
function single(lab, kind, props, phase = 0) {
  lab.add("source", {
    x: 0,
    y: 2,
    rot: UP,
    amplitude: PEAK,
    frequency: HZ,
    phase,
  });
  lab.wire([0, 3], [0, 5], [2, 5]);
  lab.add("ammeter", { x: 3, y: 5 });
  lab.wire([4, 5], [7, 5], [7, 3]);
  lab.add(kind, { x: 7, y: 2, rot: UP, ...props });
  lab.wire([7, 1], [7, 0], [0, 0], [0, 1]);
  lab.add("voltmeter", { x: 10, y: 2, rot: UP });
  lab.wire([7, 3], [10, 3]);
  lab.wire([7, 1], [10, 1]);
}
// Source, ammeter, then R, L and C in series, each with its own voltmeter.
const R = 100,
  L = 0.5,
  C = 10 * micro;
function seriesRLC(lab, frequency) {
  lab.add("source", { x: 0, y: 2, rot: UP, amplitude: PEAK, frequency });
  lab.wire([0, 3], [0, 5], [1, 5]);
  lab.add("ammeter", { x: 2, y: 5 });
  lab.wire([3, 5], [4, 5]);
  lab.add("resistor", { x: 5, y: 5, resistance: R });
  lab.wire([6, 5], [7, 5]);
  lab.add("inductor", { x: 8, y: 5, inductance: L });
  lab.wire([9, 5], [10, 5]);
  lab.add("capacitor", { x: 11, y: 5, capacitance: C });
  lab.wire([12, 5], [13, 5], [13, 0], [0, 0], [0, 1]);
  for (const x of [5, 8, 11]) {
    lab.add("voltmeter", { x, y: 7 });
    lab.wire([x - 1, 7], [x - 1, 5]);
    lab.wire([x + 1, 7], [x + 1, 5]);
  }
}
const impedance = (f) =>
  Math.hypot(R, 2 * Math.PI * f * L - 1 / (2 * Math.PI * f * C));
// 71.18 Hz: 1/2π√(LC) to four figures.
const RESONANT = 71.18;

export const presets = [
  {
    id: "series",
    view: "dc",
    title: "Resistors in series",
    text: "One path, so the same current passes through both resistors. The supply p.d. is shared in proportion to resistance.",
    expect:
      "R = 4 + 8 = 12 Ω, so I = 12/12 = 1.00 A everywhere. V = IR gives 4.00 V and 8.00 V, which add to 12 V.",
    watch: "R1",
    scale: 1,
    build(lab) {
      lab.add("cell", { x: 0, y: 2, rot: UP, emf: 12 });
      lab.wire([0, 3], [0, 4], [1, 4]);
      lab.add("ammeter", { x: 2, y: 4 });
      lab.wire([3, 4], [4, 4]);
      lab.add("resistor", { x: 5, y: 4, resistance: 4 });
      lab.wire([6, 4], [7, 4]);
      lab.add("resistor", { x: 8, y: 4, resistance: 8 });
      lab.wire([9, 4], [10, 4], [10, 0], [0, 0], [0, 1]);
      lab.add("voltmeter", { x: 5, y: 6 });
      lab.wire([4, 6], [4, 4]);
      lab.wire([6, 6], [6, 4]);
      lab.add("voltmeter", { x: 8, y: 6 });
      lab.wire([7, 6], [7, 4]);
      lab.wire([9, 6], [9, 4]);
    },
    readings: [
      { name: "A1", quantity: "current", value: 1 },
      { name: "V1", quantity: "voltage", value: 4 },
      { name: "V2", quantity: "voltage", value: 8 },
      { name: "R1", quantity: "power", value: 4 },
      { name: "R2", quantity: "power", value: 8 },
    ],
  },
  {
    id: "parallel",
    view: "dc",
    title: "Resistors in parallel",
    text: "Each resistor is connected straight across the cell, so each has the full 12 V. The currents add at the junction.",
    expect:
      "I = V/R gives 3.00 A in the 4 Ω and 1.00 A in the 12 Ω: 4.00 A in all, the same as one 3 Ω resistor (1/R = 1/4 + 1/12).",
    watch: "R1",
    scale: 1,
    build(lab) {
      lab.add("cell", { x: 0, y: 2, rot: UP, emf: 12 });
      lab.wire([0, 3], [0, 6], [1, 6]);
      lab.add("ammeter", { x: 2, y: 6 });
      lab.wire([3, 6], [5, 6], [8, 6]);
      lab.add("ammeter", { x: 5, y: 5, rot: UP });
      lab.add("resistor", { x: 5, y: 3, rot: UP, resistance: 4 });
      lab.wire([5, 2], [5, 0]);
      lab.add("ammeter", { x: 8, y: 5, rot: UP });
      lab.add("resistor", { x: 8, y: 3, rot: UP, resistance: 12 });
      lab.wire([8, 2], [8, 0], [5, 0], [0, 0], [0, 1]);
    },
    readings: [
      { name: "A1", quantity: "current", value: 4 },
      { name: "A2", quantity: "current", value: 3 },
      { name: "A3", quantity: "current", value: 1 },
      { name: "R1", quantity: "voltage", value: 12 },
      { name: "R2", quantity: "voltage", value: 12 },
    ],
  },
  {
    id: "divider",
    view: "dc",
    title: "Potential divider",
    text: "Two resistors in series divide the supply p.d. The lower one is a variable resistor: change it and watch the output.",
    expect:
      "V_out = V × R₂/(R₁ + R₂) = 12 × 1/(2 + 1) = 4.00 V, with I = 12/3000 = 4.00 mA. Setting R₂ to 2 kΩ gives 6.00 V.",
    watch: "R2",
    scale: 1,
    build(lab) {
      lab.add("cell", { x: 0, y: 2, rot: UP, emf: 12 });
      lab.wire([0, 3], [0, 6], [1, 6]);
      lab.add("ammeter", { x: 2, y: 6 });
      lab.wire([3, 6], [5, 6]);
      lab.add("resistor", { x: 5, y: 5, rot: UP, resistance: 2 * kilo });
      lab.wire([5, 4], [5, 3]);
      lab.add("variable", {
        x: 5,
        y: 2,
        rot: UP,
        resistance: 1 * kilo,
        maximum: 10 * kilo,
      });
      lab.wire([5, 1], [5, 0], [0, 0], [0, 1]);
      lab.add("voltmeter", { x: 8, y: 2, rot: UP });
      lab.wire([5, 3], [8, 3]);
      lab.wire([5, 1], [8, 1]);
    },
    readings: [
      { name: "V1", quantity: "voltage", value: 4 },
      { name: "A1", quantity: "current", value: 4e-3 },
      { name: "R1", quantity: "voltage", value: 8 },
    ],
  },
  {
    id: "internal-resistance",
    view: "dc",
    title: "Cell with internal resistance",
    text: "A real cell loses some of its EMF across its own resistance. The voltmeter reads the terminal p.d., which falls as the current rises.",
    expect:
      "I = E/(R + r) = 12/(5 + 1) = 2.00 A and V = E − Ir = 10.0 V. The load takes 20.0 W and 4.00 W is lost in the cell. Open the switch: no current, and the voltmeter reads the full EMF, 12.0 V.",
    watch: "E1",
    scale: 1,
    build(lab) {
      lab.add("cell", { x: 0, y: 2, rot: UP, emf: 12, internal: 1 });
      lab.add("voltmeter", { x: -3, y: 2, rot: UP });
      lab.wire([-3, 3], [0, 3]);
      lab.wire([-3, 1], [0, 1]);
      lab.wire([0, 3], [0, 5], [1, 5]);
      lab.add("switch", { x: 2, y: 5, closed: true });
      lab.wire([3, 5], [4, 5]);
      lab.add("ammeter", { x: 5, y: 5 });
      lab.wire([6, 5], [8, 5], [8, 3]);
      lab.add("variable", {
        x: 8,
        y: 2,
        rot: UP,
        resistance: 5,
        maximum: 20,
      });
      lab.wire([8, 1], [8, 0], [0, 0], [0, 1]);
    },
    readings: [
      { name: "A1", quantity: "current", value: 2 },
      { name: "V1", quantity: "voltage", value: 10 },
      { name: "R1", quantity: "power", value: 20 },
      { name: "E1", quantity: "lost", value: 4 },
    ],
  },
  {
    id: "wheatstone",
    view: "dc",
    title: "Wheatstone bridge",
    text: "Two potential dividers side by side, with an ammeter joining their mid-points. When the ratios match, the mid-points are at the same potential.",
    expect:
      "100/200 = 300/600, so both mid-points are at 6.00 V and the bridge ammeter reads exactly 0. The arms carry 30.0 mA and 10.0 mA. Change the variable resistor from 600 Ω and a current appears.",
    watch: "A1",
    scale: 1,
    build(lab) {
      lab.add("cell", { x: 0, y: 3, rot: UP, emf: 9 });
      lab.wire([0, 4], [0, 6], [4, 6], [8, 6]);
      lab.wire([0, 2], [0, 0], [4, 0], [8, 0]);
      lab.add("resistor", { x: 4, y: 5, rot: UP, resistance: 100 });
      lab.wire([4, 4], [4, 3], [4, 2]);
      lab.add("resistor", { x: 4, y: 1, rot: UP, resistance: 200 });
      lab.add("resistor", { x: 8, y: 5, rot: UP, resistance: 300 });
      lab.wire([8, 4], [8, 3], [8, 2]);
      lab.add("variable", {
        x: 8,
        y: 1,
        rot: UP,
        resistance: 600,
        maximum: 1000,
      });
      lab.wire([4, 3], [5, 3]);
      lab.add("ammeter", { x: 6, y: 3 });
      lab.wire([7, 3], [8, 3]);
    },
    readings: [
      { name: "A1", quantity: "current", value: 0 },
      { name: "R1", quantity: "current", value: 0.03 },
      { name: "R3", quantity: "current", value: 0.01 },
      { name: "R2", quantity: "voltage", value: 6 },
      { name: "R4", quantity: "voltage", value: 6 },
    ],
  },
  {
    id: "rc",
    view: "dc",
    title: "Capacitor charge and discharge",
    text: "A two-way switch joins the capacitor either to the cell or to a plain wire, through the same 10 kΩ. Press Run to charge it, then click the switch to discharge it.",
    expect:
      "RC = 10 kΩ × 100 µF = 1.00 s. Charging starts at I = V/R = 1.00 mA and V = 10(1 − e^(−t/RC)): 6.32 V after 1 s, 9.93 V after 5 s. Discharging from 10 V it falls to 3.68 V in 1 s.",
    watch: "C1",
    scale: 1,
    build(lab) {
      lab.add("cell", { x: 0, y: 4, rot: UP, emf: 10 });
      lab.wire([0, 5], [3, 5]);
      lab.wire([0, 3], [0, 1], [3, 1], [12, 1]);
      // Upper contact: to the cell. Lower contact: straight to the far rail.
      lab.add("switch2", { x: 4, y: 4, rot: 2, position: "b" });
      lab.wire([3, 3], [3, 1]);
      lab.wire([5, 4], [6, 4]);
      lab.add("ammeter", { x: 7, y: 4 });
      lab.wire([8, 4], [9, 4]);
      lab.add("resistor", { x: 10, y: 4, resistance: 10 * kilo });
      lab.wire([11, 4], [12, 4]);
      lab.add("capacitor", { x: 12, y: 3, rot: UP, capacitance: 100 * micro });
      lab.wire([12, 2], [12, 1]);
      lab.add("voltmeter", { x: 14, y: 3, rot: UP });
      lab.wire([12, 4], [14, 4]);
      lab.wire([12, 2], [14, 2]);
    },
    readings: [
      { name: "A1", quantity: "current", value: 1e-3 },
      { name: "V1", quantity: "voltage", value: 0 },
    ],
    timeConstant: 1,
    later: [
      {
        time: 1,
        name: "V1",
        quantity: "voltage",
        value: 10 * (1 - Math.exp(-1)),
      },
      { time: 1, name: "A1", quantity: "current", value: 1e-3 * Math.exp(-1) },
      {
        time: 5,
        name: "V1",
        quantity: "voltage",
        value: 10 * (1 - Math.exp(-5)),
      },
    ],
  },
  {
    id: "rl",
    view: "dc",
    title: "Inductor: current growth and decay",
    text: "An inductor opposes any change in its current. A two-way switch joins it, through 100 Ω, to the cell or to a plain wire. Press Run, then click the switch.",
    expect:
      "L/R = 0.5 H / 100 Ω = 5.00 ms. At first no current flows and the whole 10 V is across the inductor. I = (V/R)(1 − e^(−tR/L)): 63.2 mA after 5 ms, rising to 100 mA. Switched over, the current carries on and decays to 36.8 mA in 5 ms.",
    watch: "L1",
    scale: 0.005,
    build(lab) {
      lab.add("cell", { x: 0, y: 4, rot: UP, emf: 10 });
      lab.wire([0, 5], [3, 5]);
      lab.wire([0, 3], [0, 1], [3, 1], [12, 1]);
      lab.add("switch2", { x: 4, y: 4, rot: 2, position: "b" });
      lab.wire([3, 3], [3, 1]);
      lab.wire([5, 4], [6, 4]);
      lab.add("ammeter", { x: 7, y: 4 });
      lab.wire([8, 4], [9, 4]);
      lab.add("resistor", { x: 10, y: 4, resistance: 100 });
      lab.wire([11, 4], [12, 4]);
      lab.add("inductor", { x: 12, y: 3, rot: UP, inductance: 0.5 });
      lab.wire([12, 2], [12, 1]);
      lab.add("voltmeter", { x: 14, y: 3, rot: UP });
      lab.wire([12, 4], [14, 4]);
      lab.wire([12, 2], [14, 2]);
    },
    readings: [
      { name: "A1", quantity: "current", value: 0 },
      { name: "V1", quantity: "voltage", value: 10 },
    ],
    timeConstant: 5e-3,
    later: [
      {
        time: 5e-3,
        name: "A1",
        quantity: "current",
        value: 0.1 * (1 - Math.exp(-1)),
      },
      { time: 5e-3, name: "V1", quantity: "voltage", value: 10 * Math.exp(-1) },
    ],
  },
  {
    id: "ac-resistor",
    view: "ac",
    title: "Resistor on AC",
    text: "The current follows the p.d. exactly: the two traces rise and fall together. The meters read RMS values, peak/√2.",
    expect:
      "I = V/R = 10/100 = 100 mA RMS (141 mA peak), in phase with the p.d. Mean power VI = 1.00 W, half the peak power.",
    watch: "R1",
    scale: 0.02,
    build: (lab) => single(lab, "resistor", { resistance: 100 }),
    readings: [],
    settle: 0.04,
    steady: [
      { name: "A1", quantity: "rmsCurrent", value: RMS / 100 },
      { name: "V1", quantity: "rmsVoltage", value: RMS },
      { name: "R1", quantity: "meanPower", value: RMS ** 2 / 100 },
    ],
    lead: { name: "R1", value: 0 },
  },
  {
    id: "ac-capacitor",
    view: "ac",
    title: "Capacitor on AC",
    text: "The current is greatest while the p.d. is changing fastest, as it passes through zero: the current leads the p.d. by a quarter of a cycle.",
    expect:
      "X_C = 1/(2πfC) = 1/(2π × 50 × 10 µF) = 318 Ω, so I = 10/318 = 31.4 mA RMS, leading by 90°. Mean power 0: energy goes in and comes back out each half-cycle. Doubling f doubles the current.",
    watch: "C1",
    scale: 0.02,
    build: (lab) => single(lab, "capacitor", { capacitance: C }),
    readings: [],
    settle: 0.04,
    steady: [
      { name: "A1", quantity: "rmsCurrent", value: RMS * OMEGA * C },
      { name: "V1", quantity: "rmsVoltage", value: RMS },
    ],
    lead: { name: "C1", value: Math.PI / 2 },
  },
  {
    id: "ac-inductor",
    view: "ac",
    title: "Inductor on AC",
    text: "The p.d. across an inductor is greatest while its current is changing fastest: the current lags the p.d. by a quarter of a cycle. (The source here starts at its peak, phase 90°; started from zero, an ideal inductor's current would never reverse.)",
    expect:
      "X_L = 2πfL = 2π × 50 × 0.5 H = 157 Ω, so I = 10/157 = 63.7 mA RMS, lagging by 90°. Mean power 0. Doubling f halves the current.",
    watch: "L1",
    scale: 0.02,
    build: (lab) => single(lab, "inductor", { inductance: L }, Math.PI / 2),
    readings: [],
    settle: 0.04,
    steady: [
      { name: "A1", quantity: "rmsCurrent", value: RMS / (OMEGA * L) },
      { name: "V1", quantity: "rmsVoltage", value: RMS },
    ],
    lead: { name: "L1", value: -Math.PI / 2 },
  },
  {
    id: "rlc",
    view: "ac",
    title: "Series RLC circuit",
    text: "One current through all three. The p.d.s across L and C are in antiphase and partly cancel, so the three voltmeter readings do not add up to the supply: they add as phasors.",
    expect:
      "X_L = 157 Ω, X_C = 318 Ω, Z = √(R² + (X_L − X_C)²) = 190 Ω. I = 10/190 = 52.7 mA RMS, leading the supply by 58.2° (capacitive). V_R = 5.27 V, V_L = 8.28 V, V_C = 16.8 V. Mean power I²R = 0.278 W, all of it in the resistor.",
    watch: "E1",
    scale: 0.02,
    build: (lab) => seriesRLC(lab, HZ),
    readings: [],
    settle: 0.5,
    steady: [
      { name: "A1", quantity: "rmsCurrent", value: RMS / impedance(HZ) },
      { name: "V1", quantity: "rmsVoltage", value: (RMS / impedance(HZ)) * R },
      {
        name: "V2",
        quantity: "rmsVoltage",
        value: (RMS / impedance(HZ)) * OMEGA * L,
      },
      {
        name: "V3",
        quantity: "rmsVoltage",
        value: RMS / impedance(HZ) / (OMEGA * C),
      },
      {
        name: "R1",
        quantity: "meanPower",
        value: (RMS / impedance(HZ)) ** 2 * R,
      },
    ],
    lead: {
      name: "E1",
      value: Math.atan((1 / (OMEGA * C) - OMEGA * L) / R),
    },
  },
  {
    id: "resonance",
    view: "ac",
    title: "Series resonance",
    text: "The same circuit at the frequency where X_L = X_C. The p.d.s across L and C are equal and opposite, cancel exactly, and each is larger than the supply.",
    expect:
      "f₀ = 1/(2π√(LC)) = 71.18 Hz. Z = R, so I = 10/100 = 100 mA RMS, in phase with the supply. V_L = V_C = I × 2πf₀L = 22.4 V, more than twice the 10 V supply. Change the frequency either way and the current falls.",
    watch: "E1",
    scale: 0.02,
    build: (lab) => seriesRLC(lab, RESONANT),
    readings: [],
    settle: 50 / RESONANT,
    steady: [
      { name: "A1", quantity: "rmsCurrent", value: RMS / impedance(RESONANT) },
      {
        name: "V2",
        quantity: "rmsVoltage",
        value: (RMS / impedance(RESONANT)) * 2 * Math.PI * RESONANT * L,
      },
      {
        name: "V3",
        quantity: "rmsVoltage",
        value: RMS / impedance(RESONANT) / (2 * Math.PI * RESONANT * C),
      },
    ],
    lead: { name: "E1", value: 0, within: 0.01 },
  },
];
