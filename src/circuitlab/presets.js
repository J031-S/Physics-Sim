// Ready-made circuits. Each one is built through the public CircuitLab API
// on the grid. `readings` states the textbook result each meter or component
// should show, written from the formula; tests/circuitlab.test.mjs holds the
// model to them and the page is checked against the same list.
//   readings  at the start (for a steady circuit, at all times)
//   later     after `time` seconds of running
//   watch     the component selected, and graphed, when the preset loads
//   scale     simulated seconds per real second that suits it
// Components stand upright with terminal 0 (the + of a cell or a meter) at
// the top: that is a rotation of three quarter-turns.
const UP = 3;
const kilo = 1e3,
  micro = 1e-6;

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
];
