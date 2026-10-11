// Ready-made field arrangements. Each one is built through the public
// FieldLab API; `expect` states the textbook result to check with the probe.
const nC = 1e-9,
  uT = 1e-6;
export const presets = [
  {
    id: "single-charge",
    mode: "electric",
    title: "Single point charge",
    text: "Lines leave a positive charge evenly in every direction.",
    expect:
      "E = kq/r²: 18 N/C at 1 m, 4.5 N/C at 2 m. Doubling the distance quarters the field.",
    build(lab) {
      lab.add("charge", { x: 0, y: 0, charge: 2 * nC });
    },
  },
  {
    id: "dipole",
    mode: "electric",
    title: "Opposite charges (dipole)",
    text: "Every line that leaves the positive charge ends on the negative one.",
    expect:
      "Midway between them the two fields add: E = 2kq/r² = 16 N/C, and V = 0 along the whole centre line.",
    build(lab) {
      lab.add("charge", { x: -1.5, y: 0, charge: 2 * nC });
      lab.add("charge", { x: 1.5, y: 0, charge: -2 * nC });
    },
  },
  {
    id: "like-charges",
    mode: "electric",
    title: "Two like charges",
    text: "The lines push apart and never cross.",
    expect:
      "The fields cancel exactly midway: E = 0 there, although V is not zero (24 V).",
    build(lab) {
      lab.add("charge", { x: -1.5, y: 0, charge: 2 * nC });
      lab.add("charge", { x: 1.5, y: 0, charge: 2 * nC });
    },
  },
  {
    id: "unequal-charges",
    mode: "electric",
    title: "Unequal opposite charges",
    text: "Only the lines that leave +4 nC within 60° of the line joining the charges end on −1 nC: a quarter of its flux. The rest go off to infinity.",
    expect:
      "E = 0 on the far side of the smaller charge, as far beyond it as the charges are apart (at x = 3 m).",
    build(lab) {
      lab.add("charge", { x: -1, y: 0, charge: 4 * nC });
      lab.add("charge", { x: 1, y: 0, charge: -1 * nC });
    },
  },
  {
    id: "parallel-plates",
    mode: "electric",
    title: "Parallel plates",
    text: "Between the plates the lines are straight, parallel and evenly spaced: a uniform field. It bulges at the edges.",
    expect:
      "E ≈ 20 N/C between the plates: a little under σ/ε₀ = 22.6 N/C because the plates are not infinitely wide. Outside it is about a tenth of that. V changes by E·d ≈ 20 V across the 1 m gap.",
    build(lab) {
      lab.add("plate", { x: 0, y: 0.5, length: 6, density: 0.2 * nC });
      lab.add("plate", { x: 0, y: -0.5, length: 6, density: -0.2 * nC });
    },
  },
  {
    id: "charge-in-field",
    mode: "electric",
    title: "Charge in a uniform field",
    text: "A background field of 10 N/C to the right, with a positive charge placed in it.",
    expect:
      "Left of the charge its field opposes the background one: E = 0 where kq/r² = 10 N/C, 1.34 m to its left.",
    build(lab) {
      lab.setUniform("electric", { x: 10, y: 0 });
      lab.add("charge", { x: 0, y: 0, charge: 2 * nC });
    },
  },
  {
    id: "quadrupole",
    mode: "electric",
    title: "Four alternating charges",
    text: "Each charge shares its lines between its two opposite neighbours.",
    expect: "E = 0 at the centre, and V = 0 along both axes of symmetry.",
    build(lab) {
      for (const [x, y, s] of [
        [-1, 1, 1],
        [1, 1, -1],
        [1, -1, 1],
        [-1, -1, -1],
      ])
        lab.add("charge", { x, y, charge: s * 2 * nC });
    },
  },
  {
    id: "single-wire",
    mode: "magnetic",
    title: "Straight wire",
    text: "Current out of the screen (⊙): circular lines running anticlockwise, by the right-hand grip rule.",
    expect:
      "B = μ₀I/2πr: 2 µT at 1 m, 1 µT at 2 m. Doubling the distance halves the field.",
    build(lab) {
      lab.add("wire", { x: 0, y: 0, current: 10 });
    },
  },
  {
    id: "parallel-currents",
    mode: "magnetic",
    title: "Parallel currents",
    text: "Two currents in the same direction. Between them the fields oppose; outside they reinforce.",
    expect:
      "B = 0 midway. The wires attract with F/ℓ = μ₀I₁I₂/2πd = 10 µN/m (turn on Forces).",
    build(lab) {
      lab.add("wire", { x: -1, y: 0, current: 10 });
      lab.add("wire", { x: 1, y: 0, current: 10 });
    },
  },
  {
    id: "opposite-currents",
    mode: "magnetic",
    title: "Opposite currents",
    text: "One current out of the screen, one into it. Their fields reinforce in the gap.",
    expect:
      "Midway B = 2 × μ₀I/2πr = 4 µT, pointing up. The wires repel with 10 µN/m.",
    build(lab) {
      lab.add("wire", { x: -1, y: 0, current: 10 });
      lab.add("wire", { x: 1, y: 0, current: -10 });
    },
  },
  {
    id: "solenoid",
    mode: "magnetic",
    title: "Solenoid",
    text: "A long coil in cross-section: current out of the screen along the top, into it along the bottom.",
    expect:
      "Inside, the field is nearly uniform: 58 µT at the centre, approaching μ₀nI = 62.8 µT for a longer coil, and half of that at each end. Beside the middle it is weak (about 5 µT) and reversed.",
    build(lab) {
      lab.add("magnet", { x: 0, y: 0, length: 8, width: 1, sheetCurrent: 50 });
    },
  },
  {
    id: "two-magnets",
    mode: "magnetic",
    title: "Two bar magnets",
    text: "Unlike poles face each other: lines run from the north pole of one into the south pole of the other. Rotate one by 180° to see like poles repel.",
    expect: "Lines leave north poles and enter south poles, and never cross.",
    build(lab) {
      lab.add("magnet", {
        x: -2,
        y: 0,
        length: 2,
        width: 0.6,
        sheetCurrent: 50,
      });
      lab.add("magnet", {
        x: 2,
        y: 0,
        length: 2,
        width: 0.6,
        sheetCurrent: 50,
      });
    },
  },
  {
    id: "wire-in-field",
    mode: "magnetic",
    title: "Wire in a uniform field",
    text: "A current out of the screen in a 2 µT field pointing right. The lines crowd together below the wire and thin out above it.",
    expect:
      "The wire is pushed from the strong side to the weak side: F/ℓ = BI = 20 µN/m, upwards (turn on Forces).",
    build(lab) {
      lab.setUniform("magnetic", { x: 2 * uT, y: 0 });
      lab.add("wire", { x: 0, y: 0, current: 10 });
    },
  },
];
