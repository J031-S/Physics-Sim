// The minitools: one entry per tool, and the page (src/minitools/app.js)
// builds everything from the entry. No DOM, importable from Node. Adding a
// tool means adding an entry here and running `npm run pages`.
//
// Every formula is the plain textbook one and every entry is `verified:
// false` until the physics review has checked it; do not change a formula
// or range to make a mini simulation agree.
//
// Entry fields (see docs/physium-ui-tasks.md, task 6):
//   id, title, topic, kind ("single" | "combined"), purpose
//   latex       the equation as usually written
//   variables   { key, latex, name, unit, min, max, value, scale }
//               (scale "log" for ranges spanning decades)
//   constants   { key, latex, name, value, unit }
//   solveFor    keys that may be the unknown (the first is the default)
//   solve       { key: (values) => number } for each of them
//   forms       { key: right-hand side } of the rearranged equation, with
//               @key for each quantity and · for a product (shown as a gap
//               between symbols and as × between numbers)
//   derivation  numbered steps { say, latex } (combinations)
//   uses        ids of the single-equation tools a combination is built from
//   visual      the bespoke picture in src/minitools/visuals/ ("graph" is
//               always shown as well)
//   sim         { engine, build(values, E), watch, duration?, until?,
//                 caption } or null. `build` makes a scene with the engine's
//               public API (E is the engine module); `watch` gives the
//               measured value of the unknown: a function (model, unknown,
//               values), or an object of them by unknown.
//   wants       the simulation a tool without `sim` is waiting for
//   related     id in src/site/pages.js of the full simulation
//   verified    false until reviewed
import {
  body,
  fields,
  loop,
  once,
  orbit,
  parallel,
  period,
  region,
  sandbox,
} from "./scenes.js";

const deg = Math.PI / 180;
const V = (key, latex, name, unit, min, max, value, scale = "linear") => ({
  key,
  latex,
  name,
  unit,
  min,
  max,
  value,
  scale,
});
const K = (key, latex, name, value, unit) => ({
  key,
  latex,
  name,
  value,
  unit,
});
const tool = (entry) => ({
  kind: "single",
  constants: [],
  derivation: [],
  uses: [],
  visual: "graph",
  sim: null,
  wants: null,
  related: null,
  verified: false,
  ...entry,
});

// Constants.
const G = K("G", "G", "Gravitational constant", 6.674e-11, "N m² kg⁻²");
const kC = K("k", "k", "Coulomb constant", 8.988e9, "N m² C⁻²");
const MU0 = K(
  "mu0",
  "\\mu_0",
  "Permeability of free space",
  4e-7 * Math.PI,
  "T m A⁻¹",
);
const H = K("h", "h", "Planck constant", 6.626e-34, "J s");
const Cc = K("c", "c", "Speed of light", 2.998e8, "m s⁻¹");
const E0 = K("e", "e", "Elementary charge", 1.602e-19, "C");
const g981 = K("g", "g", "Gravitational field strength", 9.81, "m s⁻²");

// Sandbox helpers: one charged ball floating with gravity off, pushed along
// x by a uniform electric field (F = qE with q = 1 C, so E in N/C equals the
// force in newtons).
function pushedBall(
  E,
  { u = 0, force = 0, mass = 1, angle = 0, gravity = 0, floor = false },
) {
  const sim = sandbox(E, {
    gravity,
    electricX: force * Math.cos(angle),
    electricY: force * Math.sin(angle),
    view: { minX: -1, maxX: 8, minY: 0, maxY: 3 },
  });
  sim.tags.ball = body(sim, "ball", {
    x: 0,
    y: floor ? 0.2 : 1.5,
    size: 0.4,
    mass,
    charge: 1,
    vx: u,
  });
  sim.tags.x0 = 0;
  sim.tags.u0 = u;
  return sim;
}
const ballState = (sim) => sim.state(sim.tags.ball);
// A ball whirled on a rod round a fixed centre, gravity off: uniform
// circular motion at speed v and radius r.
function whirl(watch) {
  return {
    engine: "sandbox",
    caption:
      "A ball on a light rod pinned at the centre, gravity off, set moving at speed v at right angles to the rod.",
    build: (v, E) => {
      const centre = { x: 0, y: v.r + 0.6 },
        sim = sandbox(E, {
          view: {
            minX: -v.r - 0.6,
            maxX: v.r + 0.6,
            minY: 0,
            maxY: 2 * v.r + 1.2,
          },
        });
      sim.tags.centre = centre;
      sim.tags.mass = v.m ?? 1;
      sim.tags.ball = body(sim, "ball", {
        x: 0,
        y: centre.y + v.r,
        size: Math.min(0.3, v.r / 2),
        mass: v.m ?? 1,
        vx: v.v,
      });
      sim.connect("rod", null, sim.tags.ball, centre, null);
      return sim;
    },
    watch,
  };
}
// A satellite on a circular orbit of radius r round a body of mass M.
function circularOrbit(watch) {
  return {
    engine: "orbitlab",
    caption:
      "A satellite of mass m on a circular orbit of radius r in the orbits simulation (launched at √(GM/r)); the value is read from the simulation.",
    build: (v, E) =>
      orbit(E, {
        M: v.M,
        R: Math.min(6.371e6, 0.95 * v.r),
        r: v.r,
        v: Math.sqrt((E.G * v.M) / v.r),
        m: v.m,
      }),
    watch,
  };
}
// Parallel plates a gap d apart in the fields simulation, charged ±σ with
// σ = ε₀V/d (the ideal infinite-plate value), so that the field between
// them should be close to V/d.
function platesSim(watch, gap) {
  return {
    engine: "fieldlab",
    caption:
      "Two plates in the fields simulation charged ±ε₀V/d. They are finite, so the field between them is a little under the ideal value.",
    build: (v, E) => {
      const d = v.d ?? gap,
        length = Math.max(4, 5 * d),
        sigma = (E.EPS0 * v.V) / d,
        lab = fields(E, "electric", Math.max(1.5, length * 0.45));
      lab.add("plate", { x: 0, y: d / 2, length, density: sigma });
      lab.add("plate", { x: 0, y: -d / 2, length, density: -sigma });
      lab.tags.d = d;
      lab.tags.probe = { x: 0, y: 0 };
      return lab;
    },
    watch,
  };
}
const plateDifference = (lab) =>
  lab.potential(0, lab.tags.d / 2) - lab.potential(0, -lab.tags.d / 2);
// A reading from the circuit's solution (magnitude), or null.
function reading(lab, id, quantity) {
  const value = lab.solve().of(id)?.[quantity];
  return value === null || value === undefined ? null : Math.abs(value);
}

// ---------------------------------------------------------------- motion

const motionVars = {
  u: V("u", "u", "Initial velocity", "m/s", -20, 20, 2),
  v: V("v", "v", "Final velocity", "m/s", -40, 40, 8),
  a: V("a", "a", "Acceleration", "m/s²", -10, 10, 3),
  t: V("t", "t", "Time", "s", 0.1, 10, 2),
  s: V("s", "s", "Displacement", "m", -100, 100, 10),
};
const motionSim = (watch, duration) => ({
  engine: "sandbox",
  caption:
    "A 1 kg ball with a 1 C charge, pushed by a uniform electric field with gravity off, so it has a constant acceleration.",
  build: (v, E) => pushedBall(E, { u: v.u, force: v.a }),
  duration,
  watch,
});

export const tools = [
  tool({
    id: "suvat-v-u-at",
    title: "Velocity after a time",
    topic: "Motion",
    purpose: "How a constant acceleration changes the velocity",
    latex: "v = u + at",
    variables: [motionVars.v, motionVars.u, motionVars.a, motionVars.t],
    solveFor: ["v", "u", "a", "t"],
    solve: {
      v: ({ u, a, t }) => u + a * t,
      u: ({ v, a, t }) => v - a * t,
      a: ({ v, u, t }) => (v - u) / t,
      t: ({ v, u, a }) => (v - u) / a,
    },
    forms: {
      v: "@u + @a·@t",
      u: "@v - @a·@t",
      a: "\\frac{@v - @u}{@t}",
      t: "\\frac{@v - @u}{@a}",
    },
    visual: "graph",
    sim: motionSim(
      {
        v: (m) => ballState(m).vx,
        a: (m) => (m.time > 0 ? (ballState(m).vx - m.tags.u0) / m.time : null),
      },
      (v) => v.t,
    ),
    related: "mechanics",
  }),
  tool({
    id: "suvat-s-ut-at2",
    title: "Displacement after a time",
    topic: "Motion",
    purpose: "How far something goes when it speeds up steadily",
    latex: "s = ut + \\tfrac{1}{2}at^2",
    variables: [motionVars.s, motionVars.u, motionVars.a, motionVars.t],
    solveFor: ["s", "u", "a"],
    solve: {
      s: ({ u, a, t }) => u * t + 0.5 * a * t * t,
      u: ({ s, a, t }) => (s - 0.5 * a * t * t) / t,
      a: ({ s, u, t }) => (2 * (s - u * t)) / (t * t),
    },
    forms: {
      s: "@u·@t + \\tfrac{1}{2}·@a·@t^{2}",
      u: "\\frac{@s - \\tfrac{1}{2}·@a·@t^{2}}{@t}",
      a: "\\frac{2(@s - @u·@t)}{@t^{2}}",
    },
    visual: "graph",
    sim: motionSim({ s: (m) => ballState(m).x - m.tags.x0 }, (v) => v.t),
    related: "mechanics",
  }),
  tool({
    id: "suvat-v2-u2-2as",
    title: "Velocity after a distance",
    topic: "Motion",
    purpose: "The speed reached over a distance, without knowing the time",
    latex: "v^2 = u^2 + 2as",
    variables: [
      motionVars.v,
      motionVars.u,
      motionVars.a,
      V("s", "s", "Displacement", "m", 0, 100, 10),
    ],
    solveFor: ["v", "a", "s"],
    solve: {
      v: ({ u, a, s }) => Math.sqrt(u * u + 2 * a * s),
      a: ({ v, u, s }) => (v * v - u * u) / (2 * s),
      s: ({ v, u, a }) => (v * v - u * u) / (2 * a),
    },
    forms: {
      v: "\\sqrt{@u^{2} + 2·@a·@s}",
      a: "\\frac{@v^{2} - @u^{2}}{2·@s}",
      s: "\\frac{@v^{2} - @u^{2}}{2·@a}",
    },
    visual: "graph",
    sim: motionSim(
      {
        v: (m, _, v) =>
          once(m, "v", ballState(m).x - m.tags.x0 >= v.s, () =>
            Math.hypot(ballState(m).vx, ballState(m).vy),
          ),
      },
      null,
    ),
    related: "mechanics",
  }),
  tool({
    id: "suvat-average-velocity",
    title: "Displacement from the average velocity",
    topic: "Motion",
    purpose:
      "With steady acceleration the average velocity is halfway between u and v",
    latex: "s = \\tfrac{1}{2}(u + v)t",
    variables: [motionVars.s, motionVars.u, motionVars.v, motionVars.t],
    solveFor: ["s", "v", "t"],
    solve: {
      s: ({ u, v, t }) => 0.5 * (u + v) * t,
      v: ({ s, u, t }) => (2 * s) / t - u,
      t: ({ s, u, v }) => (2 * s) / (u + v),
    },
    forms: {
      s: "\\tfrac{1}{2}(@u + @v)·@t",
      v: "\\frac{2·@s}{@t} - @u",
      t: "\\frac{2·@s}{@u + @v}",
    },
    visual: "graph",
    sim: {
      engine: "sandbox",
      caption:
        "A charged ball pushed by a uniform electric field, with the acceleration that takes it from u to v in time t.",
      build: (v, E) => pushedBall(E, { u: v.u, force: (v.v - v.u) / v.t }),
      duration: (v) => v.t,
      watch: { s: (m) => ballState(m).x - m.tags.x0 },
    },
    related: "mechanics",
  }),
  tool({
    id: "average-velocity",
    title: "Average velocity",
    topic: "Motion",
    purpose: "Displacement divided by the time taken",
    latex: "v_{av} = \\frac{s}{t}",
    variables: [
      V("vav", "v_{av}", "Average velocity", "m/s", -50, 50, 5),
      motionVars.s,
      motionVars.t,
    ],
    solveFor: ["vav", "s", "t"],
    solve: {
      vav: ({ s, t }) => s / t,
      s: ({ vav, t }) => vav * t,
      t: ({ s, vav }) => s / vav,
    },
    forms: { vav: "\\frac{@s}{@t}", s: "@vav·@t", t: "\\frac{@s}{@vav}" },
    visual: "graph",
    sim: {
      engine: "sandbox",
      caption: "A ball gliding at a steady velocity with nothing acting on it.",
      build: (v, E) => pushedBall(E, { u: v.vav }),
      duration: (v) => v.t,
      watch: {
        vav: (m) => (m.time > 0 ? (ballState(m).x - m.tags.x0) / m.time : null),
        s: (m) => ballState(m).x - m.tags.x0,
      },
    },
    related: "mechanics",
  }),

  // ---------------------------------------------------------------- forces
  tool({
    id: "newtons-second-law",
    title: "Newton's second law",
    topic: "Forces",
    purpose: "A net force gives a mass an acceleration",
    latex: "F = ma",
    variables: [
      V("F", "F", "Net force", "N", 0, 100, 10),
      V("m", "m", "Mass", "kg", 0.05, 100, 2, "log"),
      V("a", "a", "Acceleration", "m/s²", 0, 50, 5),
    ],
    solveFor: ["a", "F", "m"],
    solve: {
      a: ({ F, m }) => F / m,
      F: ({ m, a }) => m * a,
      m: ({ F, a }) => F / a,
    },
    forms: { a: "\\frac{@F}{@m}", F: "@m·@a", m: "\\frac{@F}{@a}" },
    visual: "graph",
    sim: {
      engine: "sandbox",
      caption:
        "A ball of mass m with a 1 C charge in a uniform electric field of F N/C, so the force on it is F.",
      build: (v, E) => pushedBall(E, { force: v.F, mass: v.m }),
      duration: () => 2,
      watch: {
        a: (m) => (m.time > 0 ? ballState(m).vx / m.time : null),
        F: (m, _, v) => (m.time > 0 ? (v.m * ballState(m).vx) / m.time : null),
        m: (m, _, v) => (m.time > 0 ? v.F / (ballState(m).vx / m.time) : null),
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "weight",
    title: "Weight",
    topic: "Forces",
    purpose: "The gravitational force on a mass",
    latex: "W = mg",
    variables: [
      V("W", "W", "Weight", "N", 0, 5000, 98.1),
      V("m", "m", "Mass", "kg", 0.05, 100, 10, "log"),
      V("g", "g", "Gravitational field strength", "N/kg", 0, 30, 9.81),
    ],
    solveFor: ["W", "m", "g"],
    solve: {
      W: ({ m, g }) => m * g,
      m: ({ W, g }) => W / g,
      g: ({ W, m }) => W / m,
    },
    forms: { W: "@m·@g", m: "\\frac{@W}{@g}", g: "\\frac{@W}{@m}" },
    visual: "graph",
    sim: {
      engine: "sandbox",
      caption:
        "The ball is dropped; the weight is worked out from its measured acceleration, W = m × (Δv/Δt).",
      build: (v, E) => {
        const sim = sandbox(E, {
          gravity: v.g,
          view: { minX: -3, maxX: 3, minY: 0, maxY: 6 },
        });
        sim.tags.ball = body(sim, "ball", {
          x: 0,
          y: 5.5,
          size: 0.4,
          mass: v.m,
        });
        return sim;
      },
      duration: () => 0.5,
      watch: {
        W: (m, _, v) => (m.time > 0 ? (-v.m * ballState(m).vy) / m.time : null),
        g: (m) => (m.time > 0 ? -ballState(m).vy / m.time : null),
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "friction",
    title: "Friction",
    topic: "Forces",
    purpose: "Sliding friction is proportional to the normal force",
    latex: "F_f = \\mu N",
    variables: [
      V("Ff", "F_f", "Friction force", "N", 0, 500, 24.5),
      V("mu", "\\mu", "Coefficient of friction", "", 0, 1, 0.5),
      V("N", "N", "Normal force", "N", 0.5, 980, 49),
    ],
    solveFor: ["Ff", "mu", "N"],
    solve: {
      Ff: ({ mu, N }) => mu * N,
      mu: ({ Ff, N }) => Ff / N,
      N: ({ Ff, mu }) => Ff / mu,
    },
    forms: { Ff: "@mu·@N", mu: "\\frac{@Ff}{@N}", N: "\\frac{@Ff}{@mu}" },
    visual: "ramp",
    sim: {
      engine: "sandbox",
      caption:
        "A block of weight N slides on a floor of friction μ; the friction force is its mass times its measured deceleration.",
      build: (v, E) => {
        const sim = sandbox(E, {
          gravity: 9.81,
          floorFriction: v.mu,
          view: { minX: -1, maxX: 9, minY: 0, maxY: 3 },
        });
        sim.tags.mass = v.N / 9.81;
        sim.tags.ball = body(sim, "block", {
          x: 0,
          y: 0.25,
          size: [0.5, 0.5],
          mass: v.N / 9.81,
          friction: v.mu,
          vx: 6,
        });
        return sim;
      },
      duration: () => 0.4,
      watch: {
        Ff: (m) =>
          m.time > 0 ? (m.tags.mass * (6 - ballState(m).vx)) / m.time : null,
        mu: (m) => (m.time > 0 ? (6 - ballState(m).vx) / m.time / 9.81 : null),
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "hookes-law",
    title: "Hooke's law",
    topic: "Forces",
    purpose: "A spring's force is proportional to its extension",
    latex: "F = kx",
    variables: [
      V("F", "F", "Spring force", "N", 0, 100, 9.81),
      V("k", "k", "Spring constant", "N/m", 0.1, 100, 20, "log"),
      V("x", "x", "Extension", "m", 0, 5, 0.49),
    ],
    solveFor: ["x", "F", "k"],
    solve: {
      x: ({ F, k }) => F / k,
      F: ({ k, x }) => k * x,
      k: ({ F, x }) => F / x,
    },
    forms: { x: "\\frac{@F}{@k}", F: "@k·@x", k: "\\frac{@F}{@x}" },
    visual: "spring",
    sim: {
      engine: "sandbox",
      caption:
        "A mass of weight F hangs from a damped spring of stiffness k and settles; the extension is measured from the spring's natural length.",
      build: (v, E) => {
        const sim = sandbox(E, {
          gravity: 9.81,
          view: { minX: -3, maxX: 3, minY: 0, maxY: 8 },
        });
        sim.tags.ball = body(sim, "ball", {
          x: 0,
          y: 7.5 - 1,
          size: 0.3,
          mass: v.F / 9.81,
        });
        sim.tags.spring = sim.connect(
          "spring",
          null,
          sim.tags.ball,
          { x: 0, y: 7.5 },
          null,
        );
        sim.updateLink(sim.tags.spring, { k: v.k, damping: 5 });
        return sim;
      },
      duration: () => 12,
      watch: {
        x: (m) => 7.5 - ballState(m).y - 1,
        F: (m, _, v) => v.k * (7.5 - ballState(m).y - 1),
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "torque",
    title: "Torque",
    topic: "Forces",
    purpose: "The turning effect of a force about a pivot",
    latex: "\\tau = rF\\sin\\theta",
    variables: [
      V("tau", "\\tau", "Torque", "N m", 0, 500, 25),
      V("r", "r", "Distance from the pivot", "m", 0, 5, 0.5),
      V("F", "F", "Force", "N", 0, 200, 50),
      V("theta", "\\theta", "Angle between r and F", "°", 0, 180, 90),
    ],
    solveFor: ["tau", "F", "r"],
    solve: {
      tau: ({ r, F, theta }) => r * F * Math.sin(theta * deg),
      F: ({ tau, r, theta }) => tau / (r * Math.sin(theta * deg)),
      r: ({ tau, F, theta }) => tau / (F * Math.sin(theta * deg)),
    },
    forms: {
      tau: "@r·@F\\sin @theta",
      F: "\\frac{@tau}{@r\\sin @theta}",
      r: "\\frac{@tau}{@F\\sin @theta}",
    },
    visual: "graph",
    wants: "statics",
    related: "mechanics",
  }),

  // ---------------------------------------------------------------- momentum
  tool({
    id: "momentum",
    title: "Momentum",
    topic: "Momentum",
    purpose: "Mass times velocity",
    latex: "p = mv",
    variables: [
      V("p", "p", "Momentum", "kg m/s", 0, 2000, 20),
      V("m", "m", "Mass", "kg", 0.05, 100, 4, "log"),
      V("v", "v", "Velocity", "m/s", 0, 20, 5),
    ],
    solveFor: ["p", "m", "v"],
    solve: {
      p: ({ m, v }) => m * v,
      m: ({ p, v }) => p / v,
      v: ({ p, m }) => p / m,
    },
    forms: { p: "@m·@v", m: "\\frac{@p}{@v}", v: "\\frac{@p}{@m}" },
    visual: "graph",
    sim: {
      engine: "sandbox",
      caption:
        "A ball of mass m gliding at v; its momentum is read from the simulation.",
      build: (v, E) => pushedBall(E, { u: v.v, mass: v.m }),
      duration: () => 3,
      watch: {
        p: (m) => {
          const p = m.measure(m.tags.ball).momentum;
          return Math.hypot(p.x, p.y);
        },
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "impulse",
    title: "Impulse",
    topic: "Momentum",
    purpose: "A force acting for a time changes the momentum",
    latex: "F\\Delta t = m\\Delta v",
    variables: [
      V("F", "F", "Force", "N", 0, 100, 20),
      V("dt", "\\Delta t", "Time the force acts", "s", 0.01, 5, 0.5),
      V("m", "m", "Mass", "kg", 0.05, 100, 2, "log"),
      V("dv", "\\Delta v", "Change in velocity", "m/s", 0, 100, 5),
    ],
    solveFor: ["dv", "F", "dt", "m"],
    solve: {
      dv: ({ F, dt, m }) => (F * dt) / m,
      F: ({ m, dv, dt }) => (m * dv) / dt,
      dt: ({ m, dv, F }) => (m * dv) / F,
      m: ({ F, dt, dv }) => (F * dt) / dv,
    },
    forms: {
      dv: "\\frac{@F·@dt}{@m}",
      F: "\\frac{@m·@dv}{@dt}",
      dt: "\\frac{@m·@dv}{@F}",
      m: "\\frac{@F·@dt}{@dv}",
    },
    visual: "graph",
    sim: {
      engine: "sandbox",
      caption:
        "A charged ball of mass m pushed by a uniform field of F N/C (1 C, so the force is F) for Δt.",
      build: (v, E) => pushedBall(E, { force: v.F, mass: v.m }),
      duration: (v) => v.dt,
      watch: { dv: (m) => ballState(m).vx },
    },
    related: "mechanics",
  }),

  // ---------------------------------------------------------------- energy
  tool({
    id: "work-done",
    title: "Work done by a force",
    topic: "Energy",
    purpose: "Only the part of a force along the motion does work",
    latex: "W = Fs\\cos\\theta",
    variables: [
      V("W", "W", "Work done", "J", 0, 5000, 250),
      V("F", "F", "Force", "N", 0, 100, 50),
      V("s", "s", "Displacement", "m", 0, 50, 5),
      V("theta", "\\theta", "Angle between F and s", "°", 0, 90, 0),
    ],
    solveFor: ["W", "F", "s"],
    solve: {
      W: ({ F, s, theta }) => F * s * Math.cos(theta * deg),
      F: ({ W, s, theta }) => W / (s * Math.cos(theta * deg)),
      s: ({ W, F, theta }) => W / (F * Math.cos(theta * deg)),
    },
    forms: {
      W: "@F·@s\\cos @theta",
      F: "\\frac{@W}{@s\\cos @theta}",
      s: "\\frac{@W}{@F\\cos @theta}",
    },
    visual: "graph",
    sim: {
      engine: "sandbox",
      caption:
        "A 20 kg charged ball on a frictionless floor, pulled by a field at angle θ; the work is the kinetic energy it has gained after moving s.",
      build: (v, E) =>
        pushedBall(E, {
          force: v.F,
          angle: v.theta * deg,
          mass: 20,
          gravity: 9.81,
          floor: true,
        }),
      watch: {
        W: (m, _, v) =>
          once(
            m,
            "W",
            ballState(m).x - m.tags.x0 >= v.s,
            () => m.measure(m.tags.ball).translational,
          ),
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "kinetic-energy",
    title: "Kinetic energy",
    topic: "Energy",
    purpose: "Doubling the speed quadruples the kinetic energy",
    latex: "E_k = \\tfrac{1}{2}mv^2",
    variables: [
      V("Ek", "E_k", "Kinetic energy", "J", 0, 20000, 25),
      V("m", "m", "Mass", "kg", 0.05, 100, 2, "log"),
      V("v", "v", "Speed", "m/s", 0, 20, 5),
    ],
    solveFor: ["Ek", "m", "v"],
    solve: {
      Ek: ({ m, v }) => 0.5 * m * v * v,
      m: ({ Ek, v }) => (2 * Ek) / (v * v),
      v: ({ Ek, m }) => Math.sqrt((2 * Ek) / m),
    },
    forms: {
      Ek: "\\tfrac{1}{2}·@m·@v^{2}",
      m: "\\frac{2·@Ek}{@v^{2}}",
      v: "\\sqrt{\\frac{2·@Ek}{@m}}",
    },
    visual: "graph",
    sim: {
      engine: "sandbox",
      caption:
        "A ball of mass m gliding at v; its kinetic energy is read from the simulation.",
      build: (v, E) => pushedBall(E, { u: v.v, mass: v.m }),
      duration: () => 3,
      watch: {
        Ek: (m) => m.measure(m.tags.ball).kinetic,
        v: (m) => m.measure(m.tags.ball).speed,
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "gravitational-potential-energy",
    title: "Gravitational potential energy",
    topic: "Energy",
    purpose: "Energy stored by lifting a mass near the ground",
    latex: "E_p = mgh",
    variables: [
      V("Ep", "E_p", "Potential energy", "J", 0, 50000, 98.1),
      V("m", "m", "Mass", "kg", 0.05, 100, 2, "log"),
      V("g", "g", "Gravitational field strength", "N/kg", 0, 30, 9.81),
      V("h", "h", "Height", "m", 0, 20, 5),
    ],
    solveFor: ["Ep", "m", "h"],
    solve: {
      Ep: ({ m, g, h }) => m * g * h,
      m: ({ Ep, g, h }) => Ep / (g * h),
      h: ({ Ep, m, g }) => Ep / (m * g),
    },
    forms: {
      Ep: "@m·@g·@h",
      m: "\\frac{@Ep}{@g·@h}",
      h: "\\frac{@Ep}{@m·@g}",
    },
    visual: "graph",
    sim: {
      engine: "sandbox",
      caption:
        "A ball of mass m held with its centre at height h, then let go; its potential energy is read from the simulation as it is released.",
      build: (v, E) => {
        const sim = sandbox(E, {
          gravity: v.g,
          view: { minX: -3, maxX: 3, minY: 0, maxY: Math.max(3, v.h + 1) },
        });
        sim.tags.ball = body(sim, "ball", {
          x: 0,
          y: v.h,
          size: 0.2,
          mass: v.m,
        });
        return sim;
      },
      watch: {
        Ep: (m) =>
          once(m, "Ep", true, () => m.measure(m.tags.ball).gravitational),
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "elastic-potential-energy",
    title: "Elastic potential energy",
    topic: "Energy",
    purpose: "Energy stored in a stretched spring",
    latex: "E_s = \\tfrac{1}{2}kx^2",
    variables: [
      V("Es", "E_s", "Stored energy", "J", 0, 1250, 2.5),
      V("k", "k", "Spring constant", "N/m", 0.1, 100, 20, "log"),
      V("x", "x", "Extension", "m", 0, 5, 0.5),
    ],
    solveFor: ["Es", "k", "x"],
    solve: {
      Es: ({ k, x }) => 0.5 * k * x * x,
      k: ({ Es, x }) => (2 * Es) / (x * x),
      x: ({ Es, k }) => Math.sqrt((2 * Es) / k),
    },
    forms: {
      Es: "\\tfrac{1}{2}·@k·@x^{2}",
      k: "\\frac{2·@Es}{@x^{2}}",
      x: "\\sqrt{\\frac{2·@Es}{@k}}",
    },
    visual: "spring",
    sim: {
      engine: "sandbox",
      caption:
        "A 1 kg ball on a spring of natural length 2 m, pulled out by x and let go, with gravity off; the stored energy is read from the simulation.",
      build: (v, E) => {
        const sim = sandbox(E, {
          view: { minX: -1, maxX: 8, minY: 0, maxY: 3 },
        });
        sim.tags.ball = body(sim, "ball", { x: 2, y: 1.5, size: 0.3 });
        sim.tags.spring = sim.connect(
          "spring",
          null,
          sim.tags.ball,
          { x: 0, y: 1.5 },
          null,
        );
        sim.updateLink(sim.tags.spring, { k: v.k, damping: 0 });
        sim.setPose(sim.tags.ball, { x: 2 + v.x, y: 1.5 });
        return sim;
      },
      watch: { Es: (m) => once(m, "Es", true, () => m.energy().elastic) },
    },
    related: "mechanics",
  }),
  tool({
    id: "power-work-time",
    title: "Power",
    topic: "Energy",
    purpose: "How quickly work is done",
    latex: "P = \\frac{W}{t}",
    variables: [
      V("P", "P", "Power", "W", 0, 5000, 50),
      V("W", "W", "Work done", "J", 0, 10000, 100),
      V("t", "t", "Time", "s", 0.1, 10, 2),
    ],
    solveFor: ["P", "W", "t"],
    solve: {
      P: ({ W, t }) => W / t,
      W: ({ P, t }) => P * t,
      t: ({ W, P }) => W / P,
    },
    forms: { P: "\\frac{@W}{@t}", W: "@P·@t", t: "\\frac{@W}{@P}" },
    visual: "graph",
    sim: {
      engine: "sandbox",
      caption:
        "A 1 kg charged ball pushed from rest by a steady force for time t; the power is the kinetic energy it gains divided by t.",
      build: (v, E) => pushedBall(E, { force: Math.sqrt(2 * v.W) / v.t }),
      duration: (v) => v.t,
      watch: {
        P: (m) => (m.time > 0 ? m.measure(m.tags.ball).kinetic / m.time : null),
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "power-force-velocity",
    title: "Power from force and velocity",
    topic: "Energy",
    purpose: "A force on something moving does work at the rate Fv",
    latex: "P = Fv",
    variables: [
      V("P", "P", "Power", "W", 0, 2000, 50),
      V("F", "F", "Force", "N", 0, 100, 10),
      V("v", "v", "Velocity", "m/s", 0, 20, 5),
    ],
    solveFor: ["P", "F", "v"],
    solve: {
      P: ({ F, v }) => F * v,
      F: ({ P, v }) => P / v,
      v: ({ P, F }) => P / F,
    },
    forms: { P: "@F·@v", F: "\\frac{@P}{@v}", v: "\\frac{@P}{@F}" },
    visual: "graph",
    sim: {
      engine: "sandbox",
      caption:
        "A 100 kg charged ball moving at v is pushed by a force F; the power is the kinetic energy it gains in the first 0.05 s divided by 0.05 s.",
      build: (v, E) => {
        const sim = pushedBall(E, { u: v.v, force: v.F, mass: 100 });
        sim.tags.k0 = 0.5 * 100 * v.v * v.v;
        return sim;
      },
      duration: () => 0.05,
      watch: {
        P: (m) =>
          m.time > 0
            ? (m.measure(m.tags.ball).kinetic - m.tags.k0) / m.time
            : null,
      },
    },
    related: "mechanics",
  }),

  // ---------------------------------------------------------------- circular motion
  tool({
    id: "circular-speed",
    title: "Speed in a circle",
    topic: "Circular motion",
    purpose: "One lap is a circumference in one period",
    latex: "v = \\frac{2\\pi r}{T}",
    variables: [
      V("v", "v", "Speed", "m/s", 0.1, 20, 3.14),
      V("r", "r", "Radius", "m", 0.2, 5, 1),
      V("T", "T", "Period", "s", 0.1, 30, 2),
    ],
    solveFor: ["v", "r", "T"],
    solve: {
      v: ({ r, T }) => (2 * Math.PI * r) / T,
      r: ({ v, T }) => (v * T) / (2 * Math.PI),
      T: ({ v, r }) => (2 * Math.PI * r) / v,
    },
    forms: {
      v: "\\frac{2\\pi·@r}{@T}",
      r: "\\frac{@v·@T}{2\\pi}",
      T: "\\frac{2\\pi·@r}{@v}",
    },
    visual: "circle",
    sim: whirl({
      T: (m) => period(m, "T", ballState(m).y, m.tags.centre.y, m.time),
      v: (m) => m.measure(m.tags.ball).speed,
    }),
    related: "mechanics",
  }),
  tool({
    id: "centripetal-acceleration",
    title: "Centripetal acceleration",
    topic: "Circular motion",
    purpose: "Moving in a circle means accelerating towards its centre",
    latex: "a = \\frac{v^2}{r}",
    variables: [
      V("a", "a", "Centripetal acceleration", "m/s²", 0, 2000, 9),
      V("v", "v", "Speed", "m/s", 0.1, 20, 3),
      V("r", "r", "Radius", "m", 0.2, 5, 1),
    ],
    solveFor: ["a", "v", "r"],
    solve: {
      a: ({ v, r }) => (v * v) / r,
      v: ({ a, r }) => Math.sqrt(a * r),
      r: ({ v, a }) => (v * v) / a,
    },
    forms: {
      a: "\\frac{@v^{2}}{@r}",
      v: "\\sqrt{@a·@r}",
      r: "\\frac{@v^{2}}{@a}",
    },
    visual: "circle",
    sim: whirl({
      a: (m) => {
        const f = m.netForce(m.tags.ball);
        return Math.hypot(f.x, f.y) / m.tags.mass;
      },
    }),
    related: "mechanics",
  }),
  tool({
    id: "centripetal-force",
    title: "Centripetal force",
    topic: "Circular motion",
    purpose: "The net force needed to keep a mass on a circle",
    latex: "F = \\frac{mv^2}{r}",
    variables: [
      V("F", "F", "Centripetal force", "N", 0, 5000, 18),
      V("m", "m", "Mass", "kg", 0.05, 100, 2, "log"),
      V("v", "v", "Speed", "m/s", 0.1, 20, 3),
      V("r", "r", "Radius", "m", 0.2, 5, 1),
    ],
    solveFor: ["F", "m", "v", "r"],
    solve: {
      F: ({ m, v, r }) => (m * v * v) / r,
      m: ({ F, v, r }) => (F * r) / (v * v),
      v: ({ F, m, r }) => Math.sqrt((F * r) / m),
      r: ({ m, v, F }) => (m * v * v) / F,
    },
    forms: {
      F: "\\frac{@m·@v^{2}}{@r}",
      m: "\\frac{@F·@r}{@v^{2}}",
      v: "\\sqrt{\\frac{@F·@r}{@m}}",
      r: "\\frac{@m·@v^{2}}{@F}",
    },
    visual: "circle",
    sim: whirl({
      F: (m) => {
        const f = m.netForce(m.tags.ball);
        return Math.hypot(f.x, f.y);
      },
    }),
    related: "mechanics",
  }),

  // ---------------------------------------------------------------- gravitation
  tool({
    id: "newtons-gravitation",
    title: "Newton's law of gravitation",
    topic: "Gravitation",
    purpose: "Gravity weakens with the square of the distance",
    latex: "F = \\frac{GMm}{r^2}",
    variables: [
      V("F", "F", "Gravitational force", "N", 0, 1e9, 8.69e3, "log"),
      V(
        "M",
        "M",
        "Mass of the central body",
        "kg",
        1e20,
        1e30,
        5.972e24,
        "log",
      ),
      V("m", "m", "Mass of the satellite", "kg", 1, 1e6, 1000, "log"),
      V("r", "r", "Distance between centres", "m", 6.6e6, 4e8, 6.771e6, "log"),
    ],
    constants: [G],
    solveFor: ["F", "M", "m", "r"],
    solve: {
      F: ({ G, M, m, r }) => (G * M * m) / (r * r),
      M: ({ G, F, m, r }) => (F * r * r) / (G * m),
      m: ({ G, F, M, r }) => (F * r * r) / (G * M),
      r: ({ G, F, M, m }) => Math.sqrt((G * M * m) / F),
    },
    forms: {
      F: "\\frac{@G·@M·@m}{@r^{2}}",
      M: "\\frac{@F·@r^{2}}{@G·@m}",
      m: "\\frac{@F·@r^{2}}{@G·@M}",
      r: "\\sqrt{\\frac{@G·@M·@m}{@F}}",
    },
    visual: "orbit",
    sim: circularOrbit({ F: (lab) => lab.measure(lab.tags.satellite).force }),
    related: "orbits",
  }),
  tool({
    id: "gravitational-field-strength",
    title: "Gravitational field strength",
    topic: "Gravitation",
    purpose: "The force on each kilogram, at a distance from a mass",
    latex: "g = \\frac{GM}{r^2}",
    variables: [
      V("g", "g", "Field strength", "N/kg", 1e-6, 1000, 9.8, "log"),
      V(
        "M",
        "M",
        "Mass of the central body",
        "kg",
        1e20,
        1e30,
        5.972e24,
        "log",
      ),
      V(
        "r",
        "r",
        "Distance from the centre",
        "m",
        6.371e6,
        4e8,
        6.371e6,
        "log",
      ),
    ],
    constants: [G],
    solveFor: ["g", "M", "r"],
    solve: {
      g: ({ G, M, r }) => (G * M) / (r * r),
      M: ({ G, g, r }) => (g * r * r) / G,
      r: ({ G, g, M }) => Math.sqrt((G * M) / g),
    },
    forms: {
      g: "\\frac{@G·@M}{@r^{2}}",
      M: "\\frac{@g·@r^{2}}{@G}",
      r: "\\sqrt{\\frac{@G·@M}{@g}}",
    },
    visual: "orbit",
    sim: circularOrbit({
      g: (lab) => lab.measure(lab.tags.satellite).force / lab.satelliteMass,
    }),
    related: "orbits",
  }),
  tool({
    id: "gravitational-potential",
    title: "Gravitational potential energy (far from the surface)",
    topic: "Gravitation",
    purpose: "Zero at infinity and negative everywhere closer",
    latex: "E_p = -\\frac{GMm}{r}",
    variables: [
      V("Ep", "E_p", "Potential energy", "J", -1e15, 0, -5.89e10),
      V(
        "M",
        "M",
        "Mass of the central body",
        "kg",
        1e20,
        1e30,
        5.972e24,
        "log",
      ),
      V("m", "m", "Mass of the satellite", "kg", 1, 1e6, 1000, "log"),
      V("r", "r", "Distance between centres", "m", 6.6e6, 4e8, 6.771e6, "log"),
    ],
    constants: [G],
    solveFor: ["Ep", "r"],
    solve: {
      Ep: ({ G, M, m, r }) => (-G * M * m) / r,
      r: ({ G, M, m, Ep }) => (-G * M * m) / Ep,
    },
    forms: {
      Ep: "-\\frac{@G·@M·@m}{@r}",
      r: "-\\frac{@G·@M·@m}{@Ep}",
    },
    visual: "orbit",
    sim: circularOrbit({
      Ep: (lab) => lab.measure(lab.tags.satellite).potential,
    }),
    related: "orbits",
  }),

  // ---------------------------------------------------------------- electric fields
  tool({
    id: "coulombs-law",
    title: "Coulomb's law",
    topic: "Electric fields",
    purpose: "The force between two charges",
    latex: "F = \\frac{kq_1q_2}{r^2}",
    variables: [
      V("F", "F", "Force", "N", 1e-12, 1e3, 3.6e-8, "log"),
      V("q1", "q_1", "First charge", "C", 1e-10, 1e-3, 2e-9, "log"),
      V("q2", "q_2", "Second charge", "C", 1e-10, 1e-3, 2e-9, "log"),
      V("r", "r", "Distance between them", "m", 0.1, 10, 1, "log"),
    ],
    constants: [kC],
    solveFor: ["F", "q2", "r"],
    solve: {
      F: ({ k, q1, q2, r }) => (k * q1 * q2) / (r * r),
      q2: ({ k, F, q1, r }) => (F * r * r) / (k * q1),
      r: ({ k, F, q1, q2 }) => Math.sqrt((k * q1 * q2) / F),
    },
    forms: {
      F: "\\frac{@k·@q1·@q2}{@r^{2}}",
      q2: "\\frac{@F·@r^{2}}{@k·@q1}",
      r: "\\sqrt{\\frac{@k·@q1·@q2}{@F}}",
    },
    visual: "field",
    sim: {
      engine: "fieldlab",
      caption:
        "Two charges in the fields simulation; the force is read from it.",
      build: (v, E) => {
        const lab = fields(E, "electric", Math.max(2, v.r * 1.2));
        lab.add("charge", { x: -v.r / 2, y: 0, charge: v.q1 });
        lab.tags.second = lab.add("charge", { x: v.r / 2, y: 0, charge: v.q2 });
        return lab;
      },
      watch: {
        F: (lab) => {
          const f = lab.forceOn(lab.tags.second);
          return f && Math.hypot(f.x, f.y);
        },
      },
    },
    related: "fields",
  }),
  tool({
    id: "electric-field-force",
    title: "Electric field strength",
    topic: "Electric fields",
    purpose: "The force on each coulomb of charge",
    latex: "E = \\frac{F}{q}",
    variables: [
      V("E", "E", "Field strength", "N/C", 1, 1e6, 500, "log"),
      V("F", "F", "Force on the charge", "N", 1e-12, 1e3, 1e-6, "log"),
      V("q", "q", "Charge", "C", 1e-10, 1e-3, 2e-9, "log"),
    ],
    solveFor: ["F", "E", "q"],
    solve: {
      F: ({ E, q }) => E * q,
      E: ({ F, q }) => F / q,
      q: ({ F, E }) => F / E,
    },
    forms: { F: "@E·@q", E: "\\frac{@F}{@q}", q: "\\frac{@F}{@E}" },
    visual: "field",
    sim: {
      engine: "fieldlab",
      caption:
        "A charge q in a uniform field of strength E; the force on it is read from the fields simulation.",
      build: (v, E) => {
        const lab = fields(E, "electric", 2);
        lab.setUniform("electric", { x: v.E, y: 0 });
        lab.tags.charge = lab.add("charge", { x: 0, y: 0, charge: v.q });
        return lab;
      },
      watch: {
        F: (lab) => {
          const f = lab.forceOn(lab.tags.charge);
          return f && Math.hypot(f.x, f.y);
        },
        E: (lab, _, v) => {
          const f = lab.forceOn(lab.tags.charge);
          return f && Math.hypot(f.x, f.y) / v.q;
        },
      },
    },
    related: "fields",
  }),
  tool({
    id: "point-charge-field",
    title: "Field of a point charge",
    topic: "Electric fields",
    purpose: "Double the distance, a quarter of the field",
    latex: "E = \\frac{kq}{r^2}",
    variables: [
      V("E", "E", "Field strength", "N/C", 1e-3, 1e9, 18, "log"),
      V("q", "q", "Charge", "C", 1e-10, 1e-3, 2e-9, "log"),
      V("r", "r", "Distance", "m", 0.1, 10, 1, "log"),
    ],
    constants: [kC],
    solveFor: ["E", "q", "r"],
    solve: {
      E: ({ k, q, r }) => (k * q) / (r * r),
      q: ({ k, E, r }) => (E * r * r) / k,
      r: ({ k, q, E }) => Math.sqrt((k * q) / E),
    },
    forms: {
      E: "\\frac{@k·@q}{@r^{2}}",
      q: "\\frac{@E·@r^{2}}{@k}",
      r: "\\sqrt{\\frac{@k·@q}{@E}}",
    },
    visual: "field",
    sim: {
      engine: "fieldlab",
      caption:
        "One charge in the fields simulation; the field strength is read at the marked point, a distance r away.",
      build: (v, E) => {
        const lab = fields(E, "electric", Math.max(2, v.r * 1.3));
        lab.add("charge", { x: 0, y: 0, charge: v.q });
        lab.tags.probe = { x: v.r, y: 0 };
        return lab;
      },
      watch: {
        E: (lab) => {
          const [x, y] = lab.electricField(lab.tags.probe.x, lab.tags.probe.y);
          return Math.hypot(x, y);
        },
      },
    },
    related: "fields",
  }),
  tool({
    id: "uniform-field-plates",
    title: "Field between parallel plates",
    topic: "Electric fields",
    purpose: "A uniform field from a potential difference across a gap",
    latex: "E = \\frac{V}{d}",
    variables: [
      V("E", "E", "Field strength", "V/m", 1, 1e5, 500, "log"),
      V("V", "V", "Potential difference", "V", 1, 1e4, 50, "log"),
      V("d", "d", "Gap between the plates", "m", 0.05, 2, 0.1),
    ],
    solveFor: ["E", "V", "d"],
    solve: {
      E: ({ V, d }) => V / d,
      V: ({ E, d }) => E * d,
      d: ({ V, E }) => V / E,
    },
    forms: { E: "\\frac{@V}{@d}", V: "@E·@d", d: "\\frac{@V}{@E}" },
    visual: "particle",
    sim: platesSim({
      E: (lab) => {
        const [x, y] = lab.electricField(0, 0);
        return Math.hypot(x, y);
      },
      V: (lab) => plateDifference(lab),
    }),
    related: "fields",
  }),
  tool({
    id: "electric-work",
    title: "Work done moving a charge",
    topic: "Electric fields",
    purpose: "Energy gained by a charge falling through a potential difference",
    latex: "W = qV",
    variables: [
      V("W", "W", "Work done", "J", 1e-12, 1e3, 1e-7, "log"),
      V("q", "q", "Charge", "C", 1e-10, 1e-3, 2e-9, "log"),
      V("V", "V", "Potential difference", "V", 1, 1e4, 50, "log"),
    ],
    solveFor: ["W", "q", "V"],
    solve: {
      W: ({ q, V }) => q * V,
      q: ({ W, V }) => W / V,
      V: ({ W, q }) => W / q,
    },
    forms: { W: "@q·@V", q: "\\frac{@W}{@V}", V: "\\frac{@W}{@q}" },
    visual: "particle",
    sim: platesSim({ W: (lab, _, v) => v.q * plateDifference(lab) }, 0.2),
    related: "fields",
  }),

  // ---------------------------------------------------------------- circuits
  tool({
    id: "current-charge",
    title: "Current",
    topic: "Circuits",
    purpose: "Charge passing a point each second",
    latex: "I = \\frac{q}{t}",
    variables: [
      V("I", "I", "Current", "A", 1e-3, 100, 2, "log"),
      V("q", "q", "Charge", "C", 1e-3, 1e4, 20, "log"),
      V("t", "t", "Time", "s", 0.1, 1000, 10, "log"),
    ],
    solveFor: ["I", "q", "t"],
    solve: {
      I: ({ q, t }) => q / t,
      q: ({ I, t }) => I * t,
      t: ({ q, I }) => q / I,
    },
    forms: { I: "\\frac{@q}{@t}", q: "@I·@t", t: "\\frac{@q}{@I}" },
    visual: "circuit",
    sim: {
      engine: "circuitlab",
      caption:
        "A 12 V cell and a resistor chosen to draw the current; the ammeter reading is the measured current, and the charge is that current times t.",
      build: (v, E) => loop(E, 12, [["resistor", { resistance: 12 / v.I }]]),
      watch: {
        I: (lab) => reading(lab, lab.tags.ammeter, "current"),
        q: (lab, _, v) => reading(lab, lab.tags.ammeter, "current") * v.t,
      },
    },
    related: "circuits",
  }),
  tool({
    id: "ohms-law",
    title: "Ohm's law",
    topic: "Circuits",
    purpose: "Current through a resistor is proportional to the p.d. across it",
    latex: "V = IR",
    variables: [
      V("V", "V", "Potential difference", "V", 0.1, 1000, 12, "log"),
      V("I", "I", "Current", "A", 1e-4, 100, 2, "log"),
      V("R", "R", "Resistance", "Ω", 0.1, 1e6, 6, "log"),
    ],
    solveFor: ["I", "V", "R"],
    solve: {
      I: ({ V, R }) => V / R,
      V: ({ I, R }) => I * R,
      R: ({ V, I }) => V / I,
    },
    forms: { I: "\\frac{@V}{@R}", V: "@I·@R", R: "\\frac{@V}{@I}" },
    visual: "circuit",
    sim: {
      engine: "circuitlab",
      caption:
        "A cell of emf V and a resistor R; read the current from the ammeter.",
      build: (v, E) => loop(E, v.V, [["resistor", { resistance: v.R }]]),
      watch: {
        I: (lab) => reading(lab, lab.tags.ammeter, "current"),
        V: (lab) => reading(lab, lab.tags.parts[0], "voltage"),
        R: (lab) =>
          reading(lab, lab.tags.parts[0], "voltage") /
          reading(lab, lab.tags.ammeter, "current"),
      },
    },
    related: "circuits",
  }),
  tool({
    id: "electrical-power",
    title: "Electrical power",
    topic: "Circuits",
    purpose: "Energy transferred each second by a current through a p.d.",
    latex: "P = VI",
    variables: [
      V("P", "P", "Power", "W", 1e-3, 1e5, 24, "log"),
      V("V", "V", "Potential difference", "V", 0.1, 1000, 12, "log"),
      V("I", "I", "Current", "A", 1e-4, 100, 2, "log"),
    ],
    solveFor: ["P", "V", "I"],
    solve: {
      P: ({ V, I }) => V * I,
      V: ({ P, I }) => P / I,
      I: ({ P, V }) => P / V,
    },
    forms: { P: "@V·@I", V: "\\frac{@P}{@I}", I: "\\frac{@P}{@V}" },
    visual: "circuit",
    sim: {
      engine: "circuitlab",
      caption:
        "A cell of emf V and a resistor that draws current I; the resistor's power is read from the simulation.",
      build: (v, E) => loop(E, v.V, [["resistor", { resistance: v.V / v.I }]]),
      watch: { P: (lab) => reading(lab, lab.tags.parts[0], "power") },
    },
    related: "circuits",
  }),
  tool({
    id: "power-current-resistance",
    title: "Power in a resistor",
    topic: "Circuits",
    purpose: "Heating grows with the square of the current",
    latex: "P = I^2R",
    variables: [
      V("P", "P", "Power", "W", 1e-3, 1e5, 24, "log"),
      V("I", "I", "Current", "A", 1e-4, 100, 2, "log"),
      V("R", "R", "Resistance", "Ω", 0.1, 1e6, 6, "log"),
    ],
    solveFor: ["P", "I", "R"],
    solve: {
      P: ({ I, R }) => I * I * R,
      I: ({ P, R }) => Math.sqrt(P / R),
      R: ({ P, I }) => P / (I * I),
    },
    forms: {
      P: "@I^{2}·@R",
      I: "\\sqrt{\\frac{@P}{@R}}",
      R: "\\frac{@P}{@I^{2}}",
    },
    visual: "circuit",
    sim: {
      engine: "circuitlab",
      caption:
        "A resistor R carrying current I (from a cell of emf IR); its power is read from the simulation.",
      build: (v, E) => loop(E, v.I * v.R, [["resistor", { resistance: v.R }]]),
      watch: { P: (lab) => reading(lab, lab.tags.parts[0], "power") },
    },
    related: "circuits",
  }),
  tool({
    id: "series-resistors",
    title: "Resistors in series",
    topic: "Circuits",
    purpose: "One path: the resistances add",
    latex: "R = R_1 + R_2 + R_3",
    variables: [
      V("R", "R", "Total resistance", "Ω", 0, 3e3, 60),
      V("R1", "R_1", "First resistor", "Ω", 1, 1000, 10),
      V("R2", "R_2", "Second resistor", "Ω", 1, 1000, 20),
      V("R3", "R_3", "Third resistor", "Ω", 1, 1000, 30),
    ],
    solveFor: ["R", "R3"],
    solve: {
      R: ({ R1, R2, R3 }) => R1 + R2 + R3,
      R3: ({ R, R1, R2 }) => R - R1 - R2,
    },
    forms: { R: "@R1 + @R2 + @R3", R3: "@R - @R1 - @R2" },
    visual: "circuit",
    sim: {
      engine: "circuitlab",
      caption:
        "Three resistors in series with a 12 V cell; the total resistance is the cell's emf divided by the ammeter reading.",
      build: (v, E) =>
        loop(E, 12, [
          ["resistor", { resistance: v.R1 }],
          ["resistor", { resistance: v.R2 }],
          ["resistor", { resistance: v.R3 }],
        ]),
      watch: { R: (lab) => 12 / reading(lab, lab.tags.ammeter, "current") },
    },
    related: "circuits",
  }),
  tool({
    id: "parallel-resistors",
    title: "Resistors in parallel",
    topic: "Circuits",
    purpose: "More paths: the total resistance falls",
    latex: "\\frac{1}{R} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\frac{1}{R_3}",
    variables: [
      V("R", "R", "Total resistance", "Ω", 0, 1000, 5.45),
      V("R1", "R_1", "First resistor", "Ω", 1, 1000, 10),
      V("R2", "R_2", "Second resistor", "Ω", 1, 1000, 20),
      V("R3", "R_3", "Third resistor", "Ω", 1, 1000, 30),
    ],
    solveFor: ["R"],
    solve: { R: ({ R1, R2, R3 }) => 1 / (1 / R1 + 1 / R2 + 1 / R3) },
    forms: {
      R: "\\left(\\frac{1}{@R1} + \\frac{1}{@R2} + \\frac{1}{@R3}\\right)^{-1}",
    },
    visual: "circuit",
    sim: {
      engine: "circuitlab",
      caption:
        "Three resistors in parallel across a 12 V cell; the total resistance is the emf divided by the ammeter reading.",
      build: (v, E) => parallel(E, 12, [v.R1, v.R2, v.R3]),
      watch: { R: (lab) => 12 / reading(lab, lab.tags.ammeter, "current") },
    },
    related: "circuits",
  }),

  // ---------------------------------------------------------------- magnetism
  tool({
    id: "force-on-moving-charge",
    title: "Force on a moving charge",
    topic: "Magnetism",
    purpose: "A magnetic field pushes sideways on a moving charge",
    latex: "F = qvB\\sin\\theta",
    variables: [
      V("F", "F", "Force", "N", 0, 1000, 12),
      V("q", "q", "Charge", "C", 0.1, 10, 1),
      V("v", "v", "Speed", "m/s", 0, 20, 4),
      V("B", "B", "Magnetic field", "T", 0, 10, 3),
      V("theta", "\\theta", "Angle between v and B", "°", 0, 90, 90),
    ],
    solveFor: ["F", "B", "v"],
    solve: {
      F: ({ q, v, B, theta }) => q * v * B * Math.sin(theta * deg),
      B: ({ F, q, v, theta }) => F / (q * v * Math.sin(theta * deg)),
      v: ({ F, q, B, theta }) => F / (q * B * Math.sin(theta * deg)),
    },
    forms: {
      F: "@q·@v·@B\\sin @theta",
      B: "\\frac{@F}{@q·@v\\sin @theta}",
      v: "\\frac{@F}{@q·@B\\sin @theta}",
    },
    visual: "particle",
    sim: {
      engine: "sandbox",
      caption:
        "A 1 kg charge moving in a uniform magnetic field, gravity off. The sandbox is flat with B out of the screen, so it uses the part of B at right angles to v, B sin θ.",
      build: (v, E) => {
        const sim = sandbox(E, {
          magneticZ: v.B * Math.sin(v.theta * deg),
          view: { minX: -4, maxX: 4, minY: 0, maxY: 6 },
        });
        sim.tags.ball = body(sim, "ball", {
          x: 0,
          y: 3,
          size: 0.3,
          charge: v.q,
          vx: v.v,
        });
        return sim;
      },
      watch: {
        F: (m) =>
          once(m, "F", m.time > 0, () => {
            const f = m.netForce(m.tags.ball);
            return Math.hypot(f.x, f.y);
          }),
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "force-on-wire",
    title: "Force on a current-carrying wire",
    topic: "Magnetism",
    purpose: "The motor effect",
    latex: "F = BI\\ell\\sin\\theta",
    variables: [
      V("F", "F", "Force", "N", 1e-6, 1000, 2.5e-3, "log"),
      V("B", "B", "Magnetic field", "T", 1e-5, 2, 5e-4, "log"),
      V("I", "I", "Current", "A", 0.1, 100, 5, "log"),
      V("l", "\\ell", "Length of wire in the field", "m", 0.01, 2, 1),
      V("theta", "\\theta", "Angle between the wire and B", "°", 0, 90, 90),
    ],
    solveFor: ["F", "B", "I"],
    solve: {
      F: ({ B, I, l, theta }) => B * I * l * Math.sin(theta * deg),
      B: ({ F, I, l, theta }) => F / (I * l * Math.sin(theta * deg)),
      I: ({ F, B, l, theta }) => F / (B * l * Math.sin(theta * deg)),
    },
    forms: {
      F: "@B·@I·@l\\sin @theta",
      B: "\\frac{@F}{@I·@l\\sin @theta}",
      I: "\\frac{@F}{@B·@l\\sin @theta}",
    },
    visual: "field",
    sim: {
      engine: "fieldlab",
      caption:
        "A wire carrying I out of the screen in a uniform field B sin θ across it (the fields simulation's wires all run out of the screen); force per metre from the simulation, times ℓ.",
      build: (v, E) => {
        const lab = fields(E, "magnetic", 1.5);
        lab.setUniform("magnetic", { x: v.B * Math.sin(v.theta * deg), y: 0 });
        lab.tags.wire = lab.add("wire", { x: 0, y: 0, current: v.I });
        return lab;
      },
      watch: {
        F: (lab, _, v) => {
          const f = lab.forceOn(lab.tags.wire);
          return f && Math.hypot(f.x, f.y) * v.l;
        },
      },
    },
    related: "fields",
  }),
  tool({
    id: "field-of-wire",
    title: "Field of a long straight wire",
    topic: "Magnetism",
    purpose: "Circles round the wire, weaker further away",
    latex: "B = \\frac{\\mu_0 I}{2\\pi r}",
    variables: [
      V("B", "B", "Magnetic field", "T", 1e-9, 1e-2, 1e-6, "log"),
      V("I", "I", "Current", "A", 0.1, 100, 5, "log"),
      V("r", "r", "Distance from the wire", "m", 0.01, 10, 1, "log"),
    ],
    constants: [MU0],
    solveFor: ["B", "I", "r"],
    solve: {
      B: ({ mu0, I, r }) => (mu0 * I) / (2 * Math.PI * r),
      I: ({ mu0, B, r }) => (2 * Math.PI * r * B) / mu0,
      r: ({ mu0, I, B }) => (mu0 * I) / (2 * Math.PI * B),
    },
    forms: {
      B: "\\frac{@mu0·@I}{2\\pi·@r}",
      I: "\\frac{2\\pi·@r·@B}{@mu0}",
      r: "\\frac{@mu0·@I}{2\\pi·@B}",
    },
    visual: "field",
    sim: {
      engine: "fieldlab",
      caption:
        "A wire in the fields simulation; the field is read at the marked point, a distance r away.",
      build: (v, E) => {
        const lab = fields(E, "magnetic", Math.max(1.5, v.r * 1.3));
        lab.add("wire", { x: 0, y: 0, current: v.I });
        lab.tags.probe = { x: v.r, y: 0 };
        return lab;
      },
      watch: {
        B: (lab) => {
          const [x, y] = lab.magneticField(lab.tags.probe.x, lab.tags.probe.y);
          return Math.hypot(x, y);
        },
      },
    },
    related: "fields",
  }),
  tool({
    id: "magnetic-flux",
    title: "Magnetic flux",
    topic: "Magnetism",
    purpose: "How much field passes through a loop",
    latex: "\\Phi = BA\\cos\\theta",
    variables: [
      V("Phi", "\\Phi", "Flux", "Wb", 0, 10, 0.05),
      V("B", "B", "Magnetic field", "T", 0, 2, 0.5),
      V("A", "A", "Area of the loop", "m²", 0, 5, 0.1),
      V("theta", "\\theta", "Angle between B and the normal", "°", 0, 90, 0),
    ],
    solveFor: ["Phi", "B", "A"],
    solve: {
      Phi: ({ B, A, theta }) => B * A * Math.cos(theta * deg),
      B: ({ Phi, A, theta }) => Phi / (A * Math.cos(theta * deg)),
      A: ({ Phi, B, theta }) => Phi / (B * Math.cos(theta * deg)),
    },
    forms: {
      Phi: "@B·@A\\cos @theta",
      B: "\\frac{@Phi}{@A\\cos @theta}",
      A: "\\frac{@Phi}{@B\\cos @theta}",
    },
    visual: "graph",
    wants: "induction",
  }),
  tool({
    id: "faradays-law",
    title: "Faraday's law",
    topic: "Magnetism",
    purpose: "A changing flux induces an emf",
    latex: "\\varepsilon = -N\\frac{\\Delta\\Phi}{\\Delta t}",
    variables: [
      V("emf", "\\varepsilon", "Induced emf", "V", -1000, 1000, -5),
      V("N", "N", "Turns", "", 1, 1000, 100),
      V("dPhi", "\\Delta\\Phi", "Change in flux", "Wb", -1, 1, 0.01),
      V("dt", "\\Delta t", "Time taken", "s", 0.001, 10, 0.2, "log"),
    ],
    solveFor: ["emf", "N", "dt"],
    solve: {
      emf: ({ N, dPhi, dt }) => (-N * dPhi) / dt,
      N: ({ emf, dPhi, dt }) => (-emf * dt) / dPhi,
      dt: ({ emf, N, dPhi }) => (-N * dPhi) / emf,
    },
    forms: {
      emf: "-@N·\\frac{@dPhi}{@dt}",
      N: "-\\frac{@emf·@dt}{@dPhi}",
      dt: "-\\frac{@N·@dPhi}{@emf}",
    },
    visual: "graph",
    wants: "induction",
  }),
  tool({
    id: "motional-emf",
    title: "EMF of a moving rod",
    topic: "Magnetism",
    purpose: "A conductor cutting field lines",
    latex: "\\varepsilon = B\\ell v",
    variables: [
      V("emf", "\\varepsilon", "Induced emf", "V", 0, 100, 1),
      V("B", "B", "Magnetic field", "T", 0, 2, 0.5),
      V("l", "\\ell", "Length of the rod", "m", 0, 2, 0.5),
      V("v", "v", "Speed", "m/s", 0, 20, 4),
    ],
    solveFor: ["emf", "B", "v"],
    solve: {
      emf: ({ B, l, v }) => B * l * v,
      B: ({ emf, l, v }) => emf / (l * v),
      v: ({ emf, B, l }) => emf / (B * l),
    },
    forms: {
      emf: "@B·@l·@v",
      B: "\\frac{@emf}{@l·@v}",
      v: "\\frac{@emf}{@B·@l}",
    },
    visual: "graph",
    wants: "induction",
  }),
  tool({
    id: "transformer",
    title: "Transformer",
    topic: "Magnetism",
    purpose: "The voltage ratio equals the turns ratio",
    latex: "\\frac{V_p}{V_s} = \\frac{N_p}{N_s}",
    variables: [
      V("Vs", "V_s", "Secondary voltage", "V", 0.1, 1e5, 12, "log"),
      V("Vp", "V_p", "Primary voltage", "V", 0.1, 1e5, 240, "log"),
      V("Np", "N_p", "Primary turns", "", 1, 1e4, 2000, "log"),
      V("Ns", "N_s", "Secondary turns", "", 1, 1e4, 100, "log"),
    ],
    solveFor: ["Vs", "Vp", "Ns", "Np"],
    solve: {
      Vs: ({ Vp, Np, Ns }) => (Vp * Ns) / Np,
      Vp: ({ Vs, Np, Ns }) => (Vs * Np) / Ns,
      Ns: ({ Vs, Vp, Np }) => (Vs * Np) / Vp,
      Np: ({ Vs, Vp, Ns }) => (Vp * Ns) / Vs,
    },
    forms: {
      Vs: "\\frac{@Vp·@Ns}{@Np}",
      Vp: "\\frac{@Vs·@Np}{@Ns}",
      Ns: "\\frac{@Vs·@Np}{@Vp}",
      Np: "\\frac{@Vp·@Ns}{@Vs}",
    },
    visual: "graph",
    wants: "induction",
  }),

  // ---------------------------------------------------------------- waves
  tool({
    id: "wave-equation",
    title: "The wave equation",
    topic: "Waves",
    purpose: "Speed is frequency times wavelength",
    latex: "v = f\\lambda",
    variables: [
      V("v", "v", "Wave speed", "m/s", 0.01, 3e8, 340, "log"),
      V("f", "f", "Frequency", "Hz", 0.01, 1e15, 440, "log"),
      V("lambda", "\\lambda", "Wavelength", "m", 1e-9, 1e4, 0.773, "log"),
    ],
    solveFor: ["lambda", "v", "f"],
    solve: {
      lambda: ({ v, f }) => v / f,
      v: ({ f, lambda }) => f * lambda,
      f: ({ v, lambda }) => v / lambda,
    },
    forms: {
      lambda: "\\frac{@v}{@f}",
      v: "@f·@lambda",
      f: "\\frac{@v}{@lambda}",
    },
    visual: "wave",
    wants: "waves",
  }),
  tool({
    id: "period-frequency",
    title: "Period and frequency",
    topic: "Waves",
    purpose: "The time for one cycle",
    latex: "T = \\frac{1}{f}",
    variables: [
      V("T", "T", "Period", "s", 1e-6, 100, 0.0227, "log"),
      V("f", "f", "Frequency", "Hz", 0.01, 1e6, 44, "log"),
    ],
    solveFor: ["T", "f"],
    solve: { T: ({ f }) => 1 / f, f: ({ T }) => 1 / T },
    forms: { T: "\\frac{1}{@f}", f: "\\frac{1}{@T}" },
    visual: "wave",
    wants: "waves",
  }),
  tool({
    id: "snells-law",
    title: "Snell's law",
    topic: "Waves",
    purpose: "Light bends as it changes speed at a boundary",
    latex: "n_1\\sin\\theta_1 = n_2\\sin\\theta_2",
    variables: [
      V("theta2", "\\theta_2", "Angle of refraction", "°", 0, 90, 19.5),
      V("n1", "n_1", "Refractive index, first medium", "", 1, 3, 1),
      V("theta1", "\\theta_1", "Angle of incidence", "°", 0, 89, 30),
      V("n2", "n_2", "Refractive index, second medium", "", 1, 3, 1.5),
    ],
    solveFor: ["theta2", "n2", "theta1"],
    solve: {
      theta2: ({ n1, theta1, n2 }) =>
        Math.asin((n1 * Math.sin(theta1 * deg)) / n2) / deg,
      n2: ({ n1, theta1, theta2 }) =>
        (n1 * Math.sin(theta1 * deg)) / Math.sin(theta2 * deg),
      theta1: ({ n1, n2, theta2 }) =>
        Math.asin((n2 * Math.sin(theta2 * deg)) / n1) / deg,
    },
    forms: {
      theta2: "\\sin^{-1}\\left(\\frac{@n1\\sin @theta1}{@n2}\\right)",
      n2: "\\frac{@n1\\sin @theta1}{\\sin @theta2}",
      theta1: "\\sin^{-1}\\left(\\frac{@n2\\sin @theta2}{@n1}\\right)",
    },
    visual: "graph",
    wants: "waves",
  }),
  tool({
    id: "standing-waves",
    title: "Standing waves on a string",
    topic: "Waves",
    purpose: "Only whole numbers of half-wavelengths fit",
    latex: "f_n = \\frac{nv}{2L}",
    variables: [
      V("f", "f_n", "Frequency of harmonic n", "Hz", 0.1, 1e4, 110, "log"),
      V("n", "n", "Harmonic number", "", 1, 10, 1),
      V("v", "v", "Wave speed on the string", "m/s", 1, 1000, 143),
      V("L", "L", "Length of the string", "m", 0.1, 5, 0.65),
    ],
    solveFor: ["f", "v", "L"],
    solve: {
      f: ({ n, v, L }) => (n * v) / (2 * L),
      v: ({ f, n, L }) => (2 * L * f) / n,
      L: ({ f, n, v }) => (n * v) / (2 * f),
    },
    forms: {
      f: "\\frac{@n·@v}{2·@L}",
      v: "\\frac{2·@L·@f}{@n}",
      L: "\\frac{@n·@v}{2·@f}",
    },
    visual: "wave",
    wants: "waves",
  }),
  tool({
    id: "inverse-square-intensity",
    title: "Intensity and distance",
    topic: "Waves",
    purpose: "Spreading over a sphere: twice as far, a quarter as bright",
    latex: "I = \\frac{P}{4\\pi r^2}",
    variables: [
      V("I", "I", "Intensity", "W/m²", 1e-9, 1e6, 0.884, "log"),
      V("P", "P", "Power of the source", "W", 1e-3, 1e6, 100, "log"),
      V("r", "r", "Distance", "m", 0.1, 1000, 3, "log"),
    ],
    solveFor: ["I", "P", "r"],
    solve: {
      I: ({ P, r }) => P / (4 * Math.PI * r * r),
      P: ({ I, r }) => 4 * Math.PI * r * r * I,
      r: ({ P, I }) => Math.sqrt(P / (4 * Math.PI * I)),
    },
    forms: {
      I: "\\frac{@P}{4\\pi·@r^{2}}",
      P: "4\\pi·@r^{2}·@I",
      r: "\\sqrt{\\frac{@P}{4\\pi·@I}}",
    },
    visual: "graph",
    wants: "waves",
  }),

  // ---------------------------------------------------------------- modern physics
  tool({
    id: "photon-energy",
    title: "Photon energy",
    topic: "Modern physics",
    purpose: "Light comes in packets whose energy depends on frequency",
    latex: "E = hf",
    variables: [
      V("E", "E", "Photon energy", "J", 1e-25, 1e-13, 3.98e-19, "log"),
      V("f", "f", "Frequency", "Hz", 1e9, 1e20, 6e14, "log"),
    ],
    constants: [H],
    solveFor: ["E", "f"],
    solve: { E: ({ h, f }) => h * f, f: ({ h, E }) => E / h },
    forms: { E: "@h·@f", f: "\\frac{@E}{@h}" },
    visual: "wave",
    wants: "modern",
  }),
  tool({
    id: "photoelectric-effect",
    title: "Photoelectric effect",
    topic: "Modern physics",
    purpose: "A photon's energy pays the work function, the rest is kinetic",
    latex: "E_k = hf - W",
    variables: [
      V("Ek", "E_{k}", "Maximum kinetic energy", "J", 0, 1e-17, 1.6e-19),
      V("f", "f", "Frequency", "Hz", 1e14, 3e15, 1e15, "log"),
      V("W", "W", "Work function", "J", 1e-19, 1e-18, 5e-19),
    ],
    constants: [H],
    solveFor: ["Ek", "f", "W"],
    solve: {
      Ek: ({ h, f, W }) => h * f - W,
      f: ({ h, Ek, W }) => (Ek + W) / h,
      W: ({ h, f, Ek }) => h * f - Ek,
    },
    forms: {
      Ek: "@h·@f - @W",
      f: "\\frac{@Ek + @W}{@h}",
      W: "@h·@f - @Ek",
    },
    visual: "wave",
    wants: "modern",
  }),
  tool({
    id: "de-broglie",
    title: "De Broglie wavelength",
    topic: "Modern physics",
    purpose: "Moving particles behave as waves",
    latex: "\\lambda = \\frac{h}{p}",
    variables: [
      V("lambda", "\\lambda", "Wavelength", "m", 1e-15, 1e-6, 7.27e-10, "log"),
      V("p", "p", "Momentum", "kg m/s", 1e-30, 1e-18, 9.11e-25, "log"),
    ],
    constants: [H],
    solveFor: ["lambda", "p"],
    solve: { lambda: ({ h, p }) => h / p, p: ({ h, lambda }) => h / lambda },
    forms: { lambda: "\\frac{@h}{@p}", p: "\\frac{@h}{@lambda}" },
    visual: "wave",
    wants: "modern",
  }),
  tool({
    id: "mass-energy",
    title: "Mass–energy equivalence",
    topic: "Modern physics",
    purpose: "A little mass is a great deal of energy",
    latex: "E = mc^2",
    variables: [
      V("E", "E", "Energy", "J", 1e-15, 1e20, 9e13, "log"),
      V("m", "m", "Mass", "kg", 1e-30, 1000, 1e-3, "log"),
    ],
    constants: [Cc],
    solveFor: ["E", "m"],
    solve: { E: ({ m, c }) => m * c * c, m: ({ E, c }) => E / (c * c) },
    forms: { E: "@m·@c^{2}", m: "\\frac{@E}{@c^{2}}" },
    visual: "graph",
    wants: "modern",
  }),
  tool({
    id: "time-dilation",
    title: "Time dilation",
    topic: "Modern physics",
    purpose: "A moving clock runs slow",
    latex: "t = \\frac{t_0}{\\sqrt{1 - v^2/c^2}}",
    variables: [
      V("t", "t", "Time measured by the observer", "s", 0, 1000, 2.29),
      V("t0", "t_0", "Proper time (moving clock)", "s", 0.001, 100, 1, "log"),
      V("v", "v", "Speed", "m/s", 0, 2.99e8, 2.7e8),
    ],
    constants: [Cc],
    solveFor: ["t", "t0"],
    solve: {
      t: ({ t0, v, c }) => t0 / Math.sqrt(1 - (v * v) / (c * c)),
      t0: ({ t, v, c }) => t * Math.sqrt(1 - (v * v) / (c * c)),
    },
    forms: {
      t: "\\frac{@t0}{\\sqrt{1 - @v^{2}/@c^{2}}}",
      t0: "@t·\\sqrt{1 - @v^{2}/@c^{2}}",
    },
    visual: "graph",
    wants: "modern",
  }),
  tool({
    id: "length-contraction",
    title: "Length contraction",
    topic: "Modern physics",
    purpose: "A moving object is shorter along its motion",
    latex: "L = L_0\\sqrt{1 - v^2/c^2}",
    variables: [
      V("L", "L", "Length measured by the observer", "m", 0, 1000, 43.6),
      V("L0", "L_0", "Proper length", "m", 0.01, 1000, 100, "log"),
      V("v", "v", "Speed", "m/s", 0, 2.99e8, 2.7e8),
    ],
    constants: [Cc],
    solveFor: ["L", "L0"],
    solve: {
      L: ({ L0, v, c }) => L0 * Math.sqrt(1 - (v * v) / (c * c)),
      L0: ({ L, v, c }) => L / Math.sqrt(1 - (v * v) / (c * c)),
    },
    forms: {
      L: "@L0·\\sqrt{1 - @v^{2}/@c^{2}}",
      L0: "\\frac{@L}{\\sqrt{1 - @v^{2}/@c^{2}}}",
    },
    visual: "graph",
    wants: "modern",
  }),

  // ---------------------------------------------------------------- combinations
  tool({
    id: "kepler-third-law",
    title: "Kepler's third law",
    topic: "Gravitation",
    kind: "combined",
    purpose: "Why a larger orbit takes longer",
    latex: "T^2 = \\frac{4\\pi^2}{GM} r^3",
    variables: [
      V("T", "T", "Period", "s", 1e3, 1e8, 5.55e3, "log"),
      V(
        "M",
        "M",
        "Mass of the central body",
        "kg",
        1e20,
        1e30,
        5.972e24,
        "log",
      ),
      V("r", "r", "Orbital radius", "m", 6.6e6, 4e8, 6.771e6, "log"),
    ],
    constants: [G],
    solveFor: ["T", "r", "M"],
    solve: {
      T: ({ G, M, r }) => 2 * Math.PI * Math.sqrt((r * r * r) / (G * M)),
      r: ({ G, M, T }) => Math.cbrt((G * M * T * T) / (4 * Math.PI * Math.PI)),
      M: ({ G, r, T }) => (4 * Math.PI * Math.PI * r * r * r) / (G * T * T),
    },
    forms: {
      T: "2\\pi\\sqrt{\\frac{@r^{3}}{@G·@M}}",
      r: "\\sqrt[3]{\\frac{@G·@M·@T^{2}}{4\\pi^{2}}}",
      M: "\\frac{4\\pi^{2}·@r^{3}}{@G·@T^{2}}",
    },
    derivation: [
      {
        say: "Gravity provides the centripetal force",
        latex: "\\frac{GMm}{r^2} = \\frac{mv^2}{r}",
      },
      { say: "The satellite's mass cancels", latex: "v^2 = \\frac{GM}{r}" },
      {
        say: "One orbit is a circumference in one period",
        latex: "v = \\frac{2\\pi r}{T}",
      },
      {
        say: "Substitute and rearrange",
        latex:
          "\\frac{4\\pi^2 r^2}{T^2} = \\frac{GM}{r} \;\\Rightarrow\; T^2 = \\frac{4\\pi^2}{GM} r^3",
      },
    ],
    uses: ["newtons-gravitation", "centripetal-force", "circular-speed"],
    visual: "orbit",
    sim: circularOrbit({
      T: (lab) => lab.get(lab.tags.satellite)?.measuredPeriod ?? null,
    }),
    related: "orbits",
  }),
  tool({
    id: "orbital-speed",
    title: "Orbital speed",
    topic: "Gravitation",
    kind: "combined",
    purpose: "Further out, slower",
    latex: "v = \\sqrt{\\frac{GM}{r}}",
    variables: [
      V("v", "v", "Orbital speed", "m/s", 10, 1e6, 7.67e3, "log"),
      V(
        "M",
        "M",
        "Mass of the central body",
        "kg",
        1e20,
        1e30,
        5.972e24,
        "log",
      ),
      V("r", "r", "Orbital radius", "m", 6.6e6, 4e8, 6.771e6, "log"),
    ],
    constants: [G],
    solveFor: ["v", "r", "M"],
    solve: {
      v: ({ G, M, r }) => Math.sqrt((G * M) / r),
      r: ({ G, M, v }) => (G * M) / (v * v),
      M: ({ G, r, v }) => (v * v * r) / G,
    },
    forms: {
      v: "\\sqrt{\\frac{@G·@M}{@r}}",
      r: "\\frac{@G·@M}{@v^{2}}",
      M: "\\frac{@v^{2}·@r}{@G}",
    },
    derivation: [
      {
        say: "Gravity provides the centripetal force",
        latex: "\\frac{GMm}{r^2} = \\frac{mv^2}{r}",
      },
      { say: "Cancel m and one r", latex: "v^2 = \\frac{GM}{r}" },
      { say: "Take the square root", latex: "v = \\sqrt{\\frac{GM}{r}}" },
    ],
    uses: ["newtons-gravitation", "centripetal-force"],
    visual: "orbit",
    sim: {
      ...circularOrbit({ v: (lab) => lab.measure(lab.tags.satellite).speed }),
      caption:
        "A satellite launched sideways at radius r with the speed shown. On a circle its speed stays the same; read it from the simulation.",
      build: (v, E) =>
        orbit(E, { M: v.M, R: Math.min(6.371e6, 0.95 * v.r), r: v.r, v: v.v }),
    },
    related: "orbits",
  }),
  tool({
    id: "geostationary-orbit",
    title: "Geostationary orbit",
    topic: "Gravitation",
    kind: "combined",
    purpose: "The orbit that keeps pace with the turning Earth",
    latex: "r = \\sqrt[3]{\\frac{GMT^2}{4\\pi^2}}",
    variables: [
      V("r", "r", "Orbital radius", "m", 1e6, 1e9, 4.216e7, "log"),
      V("M", "M", "Mass of the planet", "kg", 1e22, 1e28, 5.972e24, "log"),
      V("T", "T", "Length of the planet's day", "s", 3600, 1e7, 86164, "log"),
    ],
    constants: [G],
    solveFor: ["r", "T"],
    solve: {
      r: ({ G, M, T }) => Math.cbrt((G * M * T * T) / (4 * Math.PI * Math.PI)),
      T: ({ G, M, r }) => 2 * Math.PI * Math.sqrt((r * r * r) / (G * M)),
    },
    forms: {
      r: "\\sqrt[3]{\\frac{@G·@M·@T^{2}}{4\\pi^{2}}}",
      T: "2\\pi\\sqrt{\\frac{@r^{3}}{@G·@M}}",
    },
    derivation: [
      {
        say: "Kepler's third law for a circular orbit",
        latex: "T^2 = \\frac{4\\pi^2}{GM} r^3",
      },
      {
        say: "Set T to one turn of the planet (a sidereal day) and solve for r",
        latex: "r = \\sqrt[3]{\\frac{GMT^2}{4\\pi^2}}",
      },
      {
        say: "The altitude is the radius less the planet's radius",
        latex: "h = r - R",
      },
    ],
    uses: ["kepler-third-law"],
    visual: "orbit",
    sim: {
      ...circularOrbit({
        T: (lab) => lab.get(lab.tags.satellite)?.measuredPeriod ?? null,
        r: (lab) => {
          const s = lab.get(lab.tags.satellite);
          return s?.measuredPeriod
            ? {
                value: lab.measure(s.id).radius,
                note: `period ${(s.measuredPeriod / 3600).toFixed(2)} h`,
              }
            : null;
        },
      }),
      caption:
        "A satellite on a circular orbit of radius r; after one orbit its radius and measured period are read from the simulation.",
      build: (v, E) =>
        orbit(E, {
          M: v.M,
          R: Math.min(6.371e6, 0.5 * v.r),
          r: v.r,
          v: Math.sqrt((E.G * v.M) / v.r),
        }),
    },
    related: "orbits",
  }),
  tool({
    id: "escape-speed",
    title: "Escape speed",
    topic: "Gravitation",
    kind: "combined",
    purpose: "Enough kinetic energy to climb out of the potential well",
    latex: "v = \\sqrt{\\frac{2GM}{r}}",
    variables: [
      V("v", "v", "Escape speed", "m/s", 10, 1e7, 1.12e4, "log"),
      V(
        "M",
        "M",
        "Mass of the central body",
        "kg",
        1e20,
        1e30,
        5.972e24,
        "log",
      ),
      V(
        "r",
        "r",
        "Distance from the centre",
        "m",
        6.371e6,
        4e8,
        6.371e6,
        "log",
      ),
    ],
    constants: [G],
    solveFor: ["v", "M", "r"],
    solve: {
      v: ({ G, M, r }) => Math.sqrt((2 * G * M) / r),
      M: ({ G, v, r }) => (v * v * r) / (2 * G),
      r: ({ G, M, v }) => (2 * G * M) / (v * v),
    },
    forms: {
      v: "\\sqrt{\\frac{2·@G·@M}{@r}}",
      M: "\\frac{@v^{2}·@r}{2·@G}",
      r: "\\frac{2·@G·@M}{@v^{2}}",
    },
    derivation: [
      {
        say: "To escape, the total energy must reach zero",
        latex: "\\tfrac{1}{2}mv^2 - \\frac{GMm}{r} = 0",
      },
      { say: "Cancel m and rearrange", latex: "v^2 = \\frac{2GM}{r}" },
      { say: "Take the square root", latex: "v = \\sqrt{\\frac{2GM}{r}}" },
    ],
    uses: ["kinetic-energy", "gravitational-potential"],
    visual: "orbit",
    sim: {
      engine: "orbitlab",
      caption:
        "A satellite launched sideways at radius r with the speed shown. The measured value is the speed that would make its total energy zero, from the simulation's own energies at launch.",
      build: (v, E) =>
        orbit(E, { M: v.M, R: Math.min(6.371e6, 0.999 * v.r), r: v.r, v: v.v }),
      watch: {
        v: (lab) =>
          once(lab, "v", true, () => {
            const m = lab.measure(lab.tags.satellite);
            return Math.sqrt((-2 * m.potential) / lab.satelliteMass);
          }),
      },
    },
    related: "orbits",
  }),
  tool({
    id: "cyclotron-motion",
    title: "Charged particle in a magnetic field",
    topic: "Magnetism",
    kind: "combined",
    purpose: "The magnetic force bends a moving charge into a circle",
    latex: "r = \\frac{mv}{qB}",
    variables: [
      V("r", "r", "Radius", "m", 0.01, 100, 2),
      V("m", "m", "Mass", "kg", 0.05, 100, 1, "log"),
      V("v", "v", "Speed", "m/s", 0.1, 20, 4),
      V("q", "q", "Charge", "C", 0.1, 10, 1),
      V("B", "B", "Magnetic field", "T", 0.1, 10, 2),
    ],
    solveFor: ["r", "B", "v"],
    solve: {
      r: ({ m, v, q, B }) => (m * v) / (q * B),
      B: ({ m, v, q, r }) => (m * v) / (q * r),
      v: ({ r, q, B, m }) => (r * q * B) / m,
    },
    forms: {
      r: "\\frac{@m·@v}{@q·@B}",
      B: "\\frac{@m·@v}{@q·@r}",
      v: "\\frac{@r·@q·@B}{@m}",
    },
    derivation: [
      {
        say: "The magnetic force is always at right angles to the velocity",
        latex: "F = qvB",
      },
      {
        say: "It provides the centripetal force",
        latex: "qvB = \\frac{mv^2}{r}",
      },
      { say: "Solve for the radius", latex: "r = \\frac{mv}{qB}" },
      {
        say: "The period does not depend on the speed",
        latex: "T = \\frac{2\\pi r}{v} = \\frac{2\\pi m}{qB}",
      },
    ],
    uses: ["force-on-moving-charge", "centripetal-force"],
    visual: "particle",
    sim: {
      engine: "sandbox",
      caption:
        "A charge moving in a uniform magnetic field, gravity off. The radius is worked out from its measured speed and the measured force on it, r = mv²/F.",
      build: (v, E) => {
        const sim = sandbox(E, {
          magneticZ: v.B,
          view: {
            minX: -v.r * 1.3,
            maxX: v.r * 1.3,
            minY: 0,
            maxY: 2.6 * v.r + 0.4,
          },
        });
        sim.tags.mass = v.m;
        sim.tags.ball = body(sim, "ball", {
          x: 0,
          y: 2 * v.r + 0.2,
          size: Math.min(0.3, v.r / 2),
          mass: v.m,
          charge: v.q,
          vx: v.v,
        });
        return sim;
      },
      watch: {
        r: (m) => {
          if (!(m.time > 0)) return null;
          const f = m.netForce(m.tags.ball),
            speed = m.measure(m.tags.ball).speed;
          return (m.tags.mass * speed * speed) / Math.hypot(f.x, f.y);
        },
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "velocity-selector",
    title: "Velocity selector",
    topic: "Magnetism",
    kind: "combined",
    purpose: "Crossed fields let only one speed through undeflected",
    latex: "v = \\frac{E}{B}",
    variables: [
      V("v", "v", "Selected speed", "m/s", 0.1, 100, 3),
      V("E", "E", "Electric field", "N/C", 0.1, 100, 6),
      V("B", "B", "Magnetic field", "T", 0.1, 100, 2),
    ],
    solveFor: ["v", "E", "B"],
    solve: {
      v: ({ E, B }) => E / B,
      E: ({ v, B }) => v * B,
      B: ({ E, v }) => E / v,
    },
    forms: { v: "\\frac{@E}{@B}", E: "@v·@B", B: "\\frac{@E}{@v}" },
    derivation: [
      { say: "The electric force on the charge", latex: "F_E = qE" },
      {
        say: "The magnetic force, in the opposite direction",
        latex: "F_B = qvB",
      },
      {
        say: "Undeflected when they balance",
        latex: "qE = qvB \;\\Rightarrow\; v = \\frac{E}{B}",
      },
    ],
    uses: ["electric-field-force", "force-on-moving-charge"],
    visual: "particle",
    sim: {
      engine: "sandbox",
      caption:
        "A 1 C, 1 kg charge entering crossed fields at speed v, gravity off. The measured value is its speed after 2 m of the fields; how far it has drifted sideways is shown with it.",
      build: (v, E) => {
        const sim = sandbox(E, {
          view: { minX: -4, maxX: 4, minY: 0, maxY: 5 },
        });
        region(sim, "electric", {
          x: 0.5,
          y: 2.5,
          width: 5,
          height: 7,
          angle: 90,
          strength: v.E,
        });
        region(sim, "magnetic", {
          x: 0.5,
          y: 2.5,
          width: 7,
          height: 5,
          strength: v.B,
        });
        sim.tags.ball = body(sim, "ball", {
          x: -3,
          y: 2.5,
          size: 0.3,
          charge: 1,
          vx: v.v,
        });
        return sim;
      },
      watch: {
        v: (m) =>
          once(m, "v", ballState(m).x >= -1, () => ({
            value: m.measure(m.tags.ball).speed,
            note: `drifted ${(ballState(m).y - 2.5).toFixed(3)} m`,
          })),
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "mass-spectrometer",
    title: "Mass spectrometer",
    topic: "Magnetism",
    kind: "combined",
    purpose: "Accelerate, then bend: heavier ions curve less",
    latex: "r = \\frac{1}{B}\\sqrt{\\frac{2mV}{q}}",
    variables: [
      V("r", "r", "Radius of the path", "m", 0.01, 100, 2),
      V("B", "B", "Magnetic field", "T", 0.1, 10, 2),
      V("m", "m", "Mass", "kg", 0.05, 100, 1, "log"),
      V("V", "V", "Accelerating potential difference", "V", 0.1, 100, 8),
      V("q", "q", "Charge", "C", 0.1, 10, 1),
    ],
    solveFor: ["r", "m", "B"],
    solve: {
      r: ({ B, m, V, q }) => Math.sqrt((2 * m * V) / q) / B,
      m: ({ r, B, V, q }) => (q * r * r * B * B) / (2 * V),
      B: ({ r, m, V, q }) => Math.sqrt((2 * m * V) / q) / r,
    },
    forms: {
      r: "\\frac{1}{@B}\\sqrt{\\frac{2·@m·@V}{@q}}",
      m: "\\frac{@q·@r^{2}·@B^{2}}{2·@V}",
      B: "\\frac{1}{@r}\\sqrt{\\frac{2·@m·@V}{@q}}",
    },
    derivation: [
      {
        say: "The accelerating p.d. gives the ion its kinetic energy",
        latex:
          "qV = \\tfrac{1}{2}mv^2 \;\\Rightarrow\; v = \\sqrt{\\frac{2qV}{m}}",
      },
      {
        say: "In the magnetic field it moves on a circle",
        latex: "r = \\frac{mv}{qB}",
      },
      {
        say: "Substitute v",
        latex:
          "r = \\frac{m}{qB}\\sqrt{\\frac{2qV}{m}} = \\frac{1}{B}\\sqrt{\\frac{2mV}{q}}",
      },
    ],
    uses: ["electron-gun", "cyclotron-motion"],
    visual: "particle",
    sim: {
      engine: "sandbox",
      caption:
        "The charge starts at rest in a 1 m electric field of V N/C (a p.d. of V across it), then enters a magnetic field. The radius is worked out there from its measured speed and the force on it, r = mv²/F.",
      build: (v, E) => {
        const sim = sandbox(E, {
          view: { minX: -2, maxX: 6, minY: 0, maxY: 6 },
        });
        region(sim, "electric", {
          x: -1,
          y: 3,
          width: 1,
          height: 1,
          strength: v.V,
        });
        region(sim, "magnetic", {
          x: 4,
          y: 3,
          width: 8,
          height: 12,
          strength: v.B,
        });
        sim.tags.mass = v.m;
        sim.tags.ball = body(sim, "ball", {
          x: -1.4999,
          y: 3,
          size: 0.1,
          mass: v.m,
          charge: v.q,
        });
        return sim;
      },
      watch: {
        // Once, just inside the magnetic field.
        r: (m) =>
          once(m, "r", ballState(m).x >= 0.2, () => {
            const f = m.netForce(m.tags.ball),
              speed = m.measure(m.tags.ball).speed;
            return (m.tags.mass * speed * speed) / Math.hypot(f.x, f.y);
          }),
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "electron-gun",
    title: "Accelerating a charge",
    topic: "Electric fields",
    kind: "combined",
    purpose: "The speed a charge gains falling through a potential difference",
    latex: "v = \\sqrt{\\frac{2qV}{m}}",
    variables: [
      V("v", "v", "Final speed", "m/s", 0.01, 1e8, 4, "log"),
      V("q", "q", "Charge", "C", 1e-19, 10, 1, "log"),
      V("V", "V", "Potential difference", "V", 0.1, 1e4, 8, "log"),
      V("m", "m", "Mass", "kg", 1e-31, 100, 1, "log"),
    ],
    solveFor: ["v", "V"],
    solve: {
      v: ({ q, V, m }) => Math.sqrt((2 * q * V) / m),
      V: ({ v, q, m }) => (m * v * v) / (2 * q),
    },
    forms: {
      v: "\\sqrt{\\frac{2·@q·@V}{@m}}",
      V: "\\frac{@m·@v^{2}}{2·@q}",
    },
    derivation: [
      { say: "The work done by the field", latex: "W = qV" },
      { say: "becomes kinetic energy", latex: "qV = \\tfrac{1}{2}mv^2" },
      { say: "Solve for the speed", latex: "v = \\sqrt{\\frac{2qV}{m}}" },
    ],
    uses: ["electric-work", "kinetic-energy"],
    visual: "particle",
    sim: {
      engine: "sandbox",
      caption:
        "The charge starts at rest in a 1 m wide electric field of V N/C, so it falls through a p.d. of V; its speed is measured as it leaves.",
      build: (v, E) => {
        const sim = sandbox(E, {
          view: { minX: -2, maxX: 4, minY: 0, maxY: 3 },
        });
        region(sim, "electric", {
          x: -1,
          y: 1.5,
          width: 1,
          height: 1,
          strength: v.V,
        });
        sim.tags.ball = body(sim, "ball", {
          x: -1.4999,
          y: 1.5,
          size: 0.1,
          mass: v.m,
          charge: v.q,
        });
        return sim;
      },
      watch: {
        v: (m) =>
          once(
            m,
            "v",
            ballState(m).x >= -0.3,
            () => m.measure(m.tags.ball).speed,
          ),
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "deflection-between-plates",
    title: "Deflection between plates",
    topic: "Electric fields",
    kind: "combined",
    purpose: "A charge crossing a uniform field follows a parabola",
    latex: "y = \\frac{qVL^2}{2mdu^2}",
    variables: [
      V("y", "y", "Sideways deflection", "m", 0, 10, 1),
      V("q", "q", "Charge", "C", 0.1, 10, 1),
      V("V", "V", "P.d. across the plates", "V", 0, 100, 4),
      V("L", "L", "Length of the plates", "m", 0.5, 6, 4),
      V("m", "m", "Mass", "kg", 0.05, 100, 1, "log"),
      V("d", "d", "Gap between the plates", "m", 0.5, 6, 2),
      V("u", "u", "Entry speed", "m/s", 0.5, 20, 4),
    ],
    solveFor: ["y", "V", "u"],
    solve: {
      y: ({ q, V, L, m, d, u }) => (q * V * L * L) / (2 * m * d * u * u),
      V: ({ y, L, m, d, u, q }) => (2 * m * d * u * u * y) / (q * L * L),
      u: ({ q, V, L, m, d, y }) => Math.sqrt((q * V * L * L) / (2 * m * d * y)),
    },
    forms: {
      y: "\\frac{@q·@V·@L^{2}}{2·@m·@d·@u^{2}}",
      V: "\\frac{2·@m·@d·@u^{2}·@y}{@q·@L^{2}}",
      u: "\\sqrt{\\frac{@q·@V·@L^{2}}{2·@m·@d·@y}}",
    },
    derivation: [
      { say: "The field between the plates", latex: "E = \\frac{V}{d}" },
      {
        say: "gives a steady sideways acceleration",
        latex: "a = \\frac{qE}{m} = \\frac{qV}{md}",
      },
      {
        say: "The time between the plates, at the steady forward speed",
        latex: "t = \\frac{L}{u}",
      },
      {
        say: "Sideways, from rest",
        latex: "y = \\tfrac{1}{2}at^2 = \\frac{qVL^2}{2mdu^2}",
      },
    ],
    uses: ["uniform-field-plates", "newtons-second-law", "suvat-s-ut-at2"],
    visual: "particle",
    sim: {
      engine: "sandbox",
      caption:
        "A charge entering a uniform field region L long and d high (field V/d across it), gravity off; its sideways deflection is measured as it leaves.",
      build: (v, E) => {
        const sim = sandbox(E, {
          view: { minX: -1, maxX: v.L + 1, minY: 0, maxY: v.d + 2 },
        });
        region(sim, "electric", {
          x: v.L / 2,
          y: 1 + v.d / 2,
          width: v.d,
          height: v.L,
          angle: 90,
          strength: v.V / v.d,
        });
        sim.tags.y0 = 1 + v.d / 2;
        sim.tags.ball = body(sim, "ball", {
          x: -0.5,
          y: 1 + v.d / 2,
          size: 0.1,
          mass: v.m,
          charge: v.q,
          vx: v.u,
        });
        return sim;
      },
      watch: {
        y: (m, _, v) =>
          once(m, "y", ballState(m).x >= v.L, () => ballState(m).y - m.tags.y0),
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "millikan",
    title: "Millikan's balance",
    topic: "Electric fields",
    kind: "combined",
    purpose: "A charged drop held still by an electric field",
    latex: "q = \\frac{mgd}{V}",
    variables: [
      V("q", "q", "Charge on the drop", "C", 0.01, 100, 1.96),
      V("m", "m", "Mass of the drop", "kg", 0.05, 10, 1, "log"),
      V("g", "g", "Gravitational field strength", "N/kg", 1, 20, 9.81),
      V("d", "d", "Gap between the plates", "m", 0.1, 5, 2),
      V("V", "V", "P.d. across the plates", "V", 1, 200, 10),
    ],
    solveFor: ["q", "V", "m"],
    solve: {
      q: ({ m, g, d, V }) => (m * g * d) / V,
      V: ({ m, g, d, q }) => (m * g * d) / q,
      m: ({ q, V, g, d }) => (q * V) / (g * d),
    },
    forms: {
      q: "\\frac{@m·@g·@d}{@V}",
      V: "\\frac{@m·@g·@d}{@q}",
      m: "\\frac{@q·@V}{@g·@d}",
    },
    derivation: [
      { say: "The field between the plates", latex: "E = \\frac{V}{d}" },
      {
        say: "Held still when the electric force balances the weight",
        latex: "qE = mg",
      },
      { say: "Solve for the charge", latex: "q = \\frac{mgd}{V}" },
    ],
    uses: ["uniform-field-plates", "electric-field-force", "weight"],
    visual: "particle",
    sim: {
      engine: "sandbox",
      caption:
        "A charged drop in an upward field of V/d with gravity g. The measured value is the charge that would hold it, from its measured acceleration: q = m(g + a)/E.",
      build: (v, E) => {
        const sim = sandbox(E, {
          gravity: v.g,
          electricY: v.V / v.d,
          view: { minX: -2, maxX: 2, minY: 0, maxY: 5 },
        });
        sim.tags.ball = body(sim, "ball", {
          x: 0,
          y: 3,
          size: 0.2,
          mass: v.m,
          charge: v.q,
        });
        return sim;
      },
      duration: () => 1,
      watch: {
        q: (m, _, v) =>
          m.time > 0
            ? (v.m * (v.g + ballState(m).vy / m.time)) / (v.V / v.d)
            : null,
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "projectile-range",
    title: "Projectile range",
    topic: "Motion",
    kind: "combined",
    purpose: "How far a launched object travels on level ground",
    latex: "R = \\frac{u^2\\sin 2\\theta}{g}",
    variables: [
      V("R", "R", "Range", "m", 0, 100, 9.99),
      V("u", "u", "Launch speed", "m/s", 0.5, 30, 9.9),
      V("theta", "\\theta", "Launch angle", "°", 1, 89, 45),
      V("g", "g", "Gravitational field strength", "m/s²", 1, 30, 9.81),
    ],
    solveFor: ["R", "u"],
    solve: {
      R: ({ u, theta, g }) => (u * u * Math.sin(2 * theta * deg)) / g,
      u: ({ R, theta, g }) => Math.sqrt((R * g) / Math.sin(2 * theta * deg)),
    },
    forms: {
      R: "\\frac{@u^{2}\\sin(2·@theta)}{@g}",
      u: "\\sqrt{\\frac{@R·@g}{\\sin(2·@theta)}}",
    },
    derivation: [
      {
        say: "Split the launch velocity",
        latex: "u_x = u\\cos\\theta, \\quad u_y = u\\sin\\theta",
      },
      {
        say: "Vertically: up and back down",
        latex:
          "0 = u_y t - \\tfrac{1}{2}gt^2 \;\\Rightarrow\; t = \\frac{2u\\sin\\theta}{g}",
      },
      {
        say: "Horizontally: steady speed",
        latex: "R = u_x t = \\frac{2u^2\\sin\\theta\\cos\\theta}{g}",
      },
      {
        say: "Use 2 sin θ cos θ = sin 2θ",
        latex: "R = \\frac{u^2\\sin 2\\theta}{g}",
      },
      {
        say: "Also: the greatest height",
        latex: "H = \\frac{u^2\\sin^2\\theta}{2g}",
      },
    ],
    uses: ["suvat-s-ut-at2", "suvat-v-u-at"],
    visual: "projectile",
    sim: {
      engine: "sandbox",
      caption:
        "A ball launched from just above the floor, gravity g; the range is how far it has gone when its centre is back at launch height.",
      build: (v, E) => {
        const sim = sandbox(E, {
          gravity: v.g,
          view: { minX: -1, maxX: Math.max(4, v.R + 1), minY: 0, maxY: 3 },
        });
        sim.tags.ball = body(sim, "ball", {
          x: 0,
          y: 0.2,
          size: 0.2,
          vx: v.u * Math.cos(v.theta * deg),
          vy: v.u * Math.sin(v.theta * deg),
        });
        return sim;
      },
      watch: {
        R: (m) =>
          once(
            m,
            "R",
            m.time > 0.02 && ballState(m).y <= 0.2 + 1e-6,
            () => ballState(m).x,
          ),
      },
      until: (m) => m.tags.once && "R" in m.tags.once,
    },
    related: "mechanics",
  }),
  tool({
    id: "falling-without-friction",
    title: "Falling without friction",
    topic: "Energy",
    kind: "combined",
    purpose: "Potential energy becomes kinetic energy",
    latex: "v = \\sqrt{2gh}",
    variables: [
      V("v", "v", "Speed at the bottom", "m/s", 0, 50, 9.9),
      V("g", "g", "Gravitational field strength", "m/s²", 1, 30, 9.81),
      V("h", "h", "Height fallen", "m", 0.1, 20, 5),
    ],
    solveFor: ["v", "h"],
    solve: {
      v: ({ g, h }) => Math.sqrt(2 * g * h),
      h: ({ v, g }) => (v * v) / (2 * g),
    },
    forms: { v: "\\sqrt{2·@g·@h}", h: "\\frac{@v^{2}}{2·@g}" },
    derivation: [
      { say: "Energy is conserved", latex: "mgh = \\tfrac{1}{2}mv^2" },
      { say: "The mass cancels", latex: "v = \\sqrt{2gh}" },
    ],
    uses: ["gravitational-potential-energy", "kinetic-energy"],
    visual: "graph",
    sim: {
      engine: "sandbox",
      caption:
        "A ball dropped from height h; its speed is measured after falling h.",
      build: (v, E) => {
        const sim = sandbox(E, {
          gravity: v.g,
          view: { minX: -2, maxX: 2, minY: 0, maxY: v.h + 1 },
        });
        sim.tags.ball = body(sim, "ball", { x: 0, y: v.h + 0.15, size: 0.2 });
        sim.tags.top = v.h + 0.15;
        return sim;
      },
      watch: {
        v: (m, _, v) =>
          once(
            m,
            "v",
            m.tags.top - ballState(m).y >= v.h,
            () => m.measure(m.tags.ball).speed,
          ),
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "block-on-ramp",
    title: "Block on a ramp",
    topic: "Forces",
    kind: "combined",
    purpose: "Gravity along the slope against friction",
    latex: "a = g(\\sin\\theta - \\mu\\cos\\theta)",
    variables: [
      V("a", "a", "Acceleration down the slope", "m/s²", -10, 10, 2.96),
      V("g", "g", "Gravitational field strength", "m/s²", 1, 30, 9.81),
      V("theta", "\\theta", "Angle of the ramp", "°", 0, 60, 30),
      V("mu", "\\mu", "Coefficient of friction", "", 0, 1, 0.23),
    ],
    solveFor: ["a", "mu", "theta"],
    solve: {
      a: ({ g, theta, mu }) =>
        g * (Math.sin(theta * deg) - mu * Math.cos(theta * deg)),
      mu: ({ a, g, theta }) =>
        (Math.sin(theta * deg) - a / g) / Math.cos(theta * deg),
      theta: ({ a, g, mu }) => {
        // sin θ − μ cos θ = a/g, as R sin(θ − φ) with R = √(1 + μ²), tan φ = μ
        const R = Math.hypot(1, mu);
        return (Math.asin(a / g / R) + Math.atan(mu)) / deg;
      },
    },
    forms: {
      a: "@g(\\sin @theta - @mu\\cos @theta)",
      mu: "\\frac{\\sin @theta - @a/@g}{\\cos @theta}",
      theta:
        "\\sin^{-1}\\left(\\frac{@a/@g}{\\sqrt{1+@mu^{2}}}\\right) + \\tan^{-1} @mu",
    },
    derivation: [
      {
        say: "Along the slope, the weight's component",
        latex: "mg\\sin\\theta",
      },
      { say: "Across it, the normal force", latex: "N = mg\\cos\\theta" },
      {
        say: "Friction opposes the sliding",
        latex: "F_f = \\mu N = \\mu mg\\cos\\theta",
      },
      {
        say: "Newton's second law along the slope; m cancels",
        latex:
          "ma = mg\\sin\\theta - \\mu mg\\cos\\theta \;\\Rightarrow\; a = g(\\sin\\theta - \\mu\\cos\\theta)",
      },
    ],
    uses: ["weight", "friction", "newtons-second-law"],
    visual: "ramp",
    sim: {
      engine: "sandbox",
      caption:
        "A block released on a fixed ramp of friction μ with gravity g (the block has the same friction); its acceleration is measured over the first second.",
      build: (v, E) => {
        const theta = v.theta * deg,
          width = 8,
          height = width * Math.tan(theta),
          sim = sandbox(E, {
            gravity: v.g,
            view: { minX: -1, maxX: width + 1, minY: 0, maxY: height + 1.5 },
          });
        const ramp = body(sim, "wedge", {
          x: (2 * width) / 3,
          y: height / 3,
          size: [width, Math.max(0.05, height)],
          friction: v.mu,
        });
        sim.setLock(ramp, "position", true);
        sim.setLock(ramp, "rotation", true);
        const half = 0.2,
          t = 0.8;
        sim.tags.ball = body(sim, "block", {
          x: width * t - Math.sin(theta) * (half + 0.001),
          y: height * t + Math.cos(theta) * (half + 0.001),
          angle: theta,
          size: [0.4, 0.4],
          friction: v.mu,
        });
        sim.tags.theta = theta;
        return sim;
      },
      duration: () => 1,
      watch: {
        a: (m) => {
          if (!(m.time > 0)) return null;
          const s = ballState(m),
            along = -(
              s.vx * Math.cos(m.tags.theta) +
              s.vy * Math.sin(m.tags.theta)
            );
          return along / m.time;
        },
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "banked-curve",
    title: "Banked curve",
    topic: "Circular motion",
    kind: "combined",
    purpose: "The angle at which no friction is needed to turn",
    latex: "\\tan\\theta = \\frac{v^2}{rg}",
    variables: [
      V("theta", "\\theta", "Banking angle", "°", 0, 80, 17.8),
      V("v", "v", "Speed", "m/s", 1, 60, 20),
      V("r", "r", "Radius of the curve", "m", 5, 1000, 125, "log"),
      V("g", "g", "Gravitational field strength", "m/s²", 1, 30, 9.81),
    ],
    solveFor: ["theta", "v", "r"],
    solve: {
      theta: ({ v, r, g }) => Math.atan((v * v) / (r * g)) / deg,
      v: ({ theta, r, g }) => Math.sqrt(r * g * Math.tan(theta * deg)),
      r: ({ v, g, theta }) => (v * v) / (g * Math.tan(theta * deg)),
    },
    forms: {
      theta: "\\tan^{-1}\\frac{@v^{2}}{@r·@g}",
      v: "\\sqrt{@r·@g\\tan @theta}",
      r: "\\frac{@v^{2}}{@g\\tan @theta}",
    },
    derivation: [
      {
        say: "Vertically, the normal force holds up the weight",
        latex: "N\\cos\\theta = mg",
      },
      {
        say: "Horizontally, it provides the centripetal force",
        latex: "N\\sin\\theta = \\frac{mv^2}{r}",
      },
      { say: "Divide the two", latex: "\\tan\\theta = \\frac{v^2}{rg}" },
    ],
    uses: ["centripetal-force", "weight"],
    visual: "circle",
    wants: "mechanics-3d",
  }),
  tool({
    id: "conical-pendulum",
    title: "Conical pendulum",
    topic: "Circular motion",
    kind: "combined",
    purpose: "A mass swung round in a horizontal circle on a string",
    latex: "T = 2\\pi\\sqrt{\\frac{L\\cos\\theta}{g}}",
    variables: [
      V("T", "T", "Period", "s", 0.1, 20, 1.86),
      V("L", "L", "Length of the string", "m", 0.1, 10, 1),
      V("theta", "\\theta", "Angle from the vertical", "°", 0, 85, 30),
      V("g", "g", "Gravitational field strength", "m/s²", 1, 30, 9.81),
    ],
    solveFor: ["T", "L"],
    solve: {
      T: ({ L, theta, g }) =>
        2 * Math.PI * Math.sqrt((L * Math.cos(theta * deg)) / g),
      L: ({ T, theta, g }) =>
        (g * T * T) / (4 * Math.PI * Math.PI * Math.cos(theta * deg)),
    },
    forms: {
      T: "2\\pi\\sqrt{\\frac{@L\\cos @theta}{@g}}",
      L: "\\frac{@g·@T^{2}}{4\\pi^{2}\\cos @theta}",
    },
    derivation: [
      {
        say: "Vertically, the tension holds up the weight",
        latex: "F_T\\cos\\theta = mg",
      },
      {
        say: "Horizontally, it gives the centripetal force on a circle of radius L sin θ",
        latex: "F_T\\sin\\theta = m\\omega^2 L\\sin\\theta",
      },
      {
        say: "Divide, and use ω = 2π/T",
        latex:
          "\\omega^2 = \\frac{g}{L\\cos\\theta} \;\\Rightarrow\; T = 2\\pi\\sqrt{\\frac{L\\cos\\theta}{g}}",
      },
    ],
    uses: ["centripetal-force", "weight"],
    visual: "pendulum",
    wants: "mechanics-3d",
  }),
  tool({
    id: "vertical-circle",
    title: "Vertical circle",
    topic: "Circular motion",
    kind: "combined",
    purpose: "The slowest a mass on a string can go over the top",
    latex: "v_{min} = \\sqrt{gr}",
    variables: [
      V("v", "v_{min}", "Least speed at the top", "m/s", 0, 50, 3.13),
      V("g", "g", "Gravitational field strength", "m/s²", 1, 30, 9.81),
      V("r", "r", "Radius", "m", 0.1, 20, 1),
    ],
    solveFor: ["v", "r"],
    solve: {
      v: ({ g, r }) => Math.sqrt(g * r),
      r: ({ v, g }) => (v * v) / g,
    },
    forms: { v: "\\sqrt{@g·@r}", r: "\\frac{@v^{2}}{@g}" },
    derivation: [
      {
        say: "At the top, tension and weight both point to the centre",
        latex: "F_T + mg = \\frac{mv^2}{r}",
      },
      {
        say: "The string stays taut while the tension is not negative",
        latex: "F_T \\ge 0 \;\\Rightarrow\; \\frac{mv^2}{r} \\ge mg",
      },
      {
        say: "So the least speed at the top is",
        latex: "v_{min} = \\sqrt{gr}",
      },
    ],
    uses: ["centripetal-force", "weight"],
    visual: "circle",
    wants: "mechanics-ropes",
  }),
  tool({
    id: "mass-on-spring",
    title: "Mass on a spring",
    topic: "Oscillations",
    kind: "combined",
    purpose: "The period of an oscillating mass",
    latex: "T = 2\\pi\\sqrt{\\frac{m}{k}}",
    variables: [
      V("T", "T", "Period", "s", 0.01, 100, 1.4),
      V("m", "m", "Mass", "kg", 0.05, 100, 1, "log"),
      V("k", "k", "Spring constant", "N/m", 0.1, 100, 20, "log"),
    ],
    solveFor: ["T", "m", "k"],
    solve: {
      T: ({ m, k }) => 2 * Math.PI * Math.sqrt(m / k),
      m: ({ T, k }) => (k * T * T) / (4 * Math.PI * Math.PI),
      k: ({ T, m }) => (4 * Math.PI * Math.PI * m) / (T * T),
    },
    forms: {
      T: "2\\pi\\sqrt{\\frac{@m}{@k}}",
      m: "\\frac{@k·@T^{2}}{4\\pi^{2}}",
      k: "\\frac{4\\pi^{2}·@m}{@T^{2}}",
    },
    derivation: [
      {
        say: "The spring pulls back in proportion to the displacement",
        latex: "F = -kx",
      },
      {
        say: "Newton's second law",
        latex: "ma = -kx \;\\Rightarrow\; a = -\\frac{k}{m}x",
      },
      {
        say: "That is simple harmonic motion with",
        latex: "\\omega^2 = \\frac{k}{m}",
      },
      {
        say: "The period",
        latex: "T = \\frac{2\\pi}{\\omega} = 2\\pi\\sqrt{\\frac{m}{k}}",
      },
    ],
    uses: ["hookes-law", "newtons-second-law"],
    visual: "spring",
    sim: {
      engine: "sandbox",
      caption:
        "A mass on an undamped spring, gravity off, pulled 0.5 m from its natural length and let go; the period is timed from the simulation.",
      build: (v, E) => {
        const sim = sandbox(E, {
          view: { minX: -1, maxX: 4, minY: 0, maxY: 3 },
        });
        sim.tags.ball = body(sim, "ball", {
          x: 2,
          y: 1.5,
          size: 0.3,
          mass: v.m,
        });
        const spring = sim.connect(
          "spring",
          null,
          sim.tags.ball,
          { x: 0, y: 1.5 },
          null,
        );
        sim.updateLink(spring, { k: v.k, damping: 0 });
        sim.setPose(sim.tags.ball, { x: 2.5, y: 1.5 });
        return sim;
      },
      watch: { T: (m) => period(m, "T", ballState(m).x, 2, m.time) },
    },
    related: "mechanics",
  }),
  tool({
    id: "simple-pendulum",
    title: "Simple pendulum",
    topic: "Oscillations",
    kind: "combined",
    purpose: "The period depends on length and g, not on mass",
    latex: "T = 2\\pi\\sqrt{\\frac{L}{g}}",
    variables: [
      V("T", "T", "Period", "s", 0.1, 20, 3.47),
      V("L", "L", "Length", "m", 0.1, 10, 3),
      V("g", "g", "Gravitational field strength", "m/s²", 1, 30, 9.81),
    ],
    solveFor: ["T", "L", "g"],
    solve: {
      T: ({ L, g }) => 2 * Math.PI * Math.sqrt(L / g),
      L: ({ T, g }) => (g * T * T) / (4 * Math.PI * Math.PI),
      g: ({ T, L }) => (4 * Math.PI * Math.PI * L) / (T * T),
    },
    forms: {
      T: "2\\pi\\sqrt{\\frac{@L}{@g}}",
      L: "\\frac{@g·@T^{2}}{4\\pi^{2}}",
      g: "\\frac{4\\pi^{2}·@L}{@T^{2}}",
    },
    derivation: [
      {
        say: "The restoring force along the arc",
        latex: "F = -mg\\sin\\theta",
      },
      {
        say: "For small angles sin θ ≈ θ = x/L",
        latex: "F \\approx -\\frac{mg}{L}x",
      },
      { say: "Simple harmonic motion with", latex: "\\omega^2 = \\frac{g}{L}" },
      { say: "The period", latex: "T = 2\\pi\\sqrt{\\frac{L}{g}}" },
    ],
    uses: ["weight", "newtons-second-law"],
    visual: "pendulum",
    sim: {
      engine: "sandbox",
      caption:
        "A ball on a light rod of length L, released from 10°; the period is timed from the simulation.",
      build: (v, E) => {
        const top = v.L + 0.5,
          a = 10 * deg,
          sim = sandbox(E, {
            gravity: v.g,
            view: {
              minX: -v.L * 0.6,
              maxX: v.L * 0.6,
              minY: 0,
              maxY: top + 0.3,
            },
          });
        sim.tags.ball = body(sim, "ball", {
          x: v.L * Math.sin(a),
          y: top - v.L * Math.cos(a),
          size: Math.min(0.3, v.L / 4),
        });
        sim.connect("rod", null, sim.tags.ball, { x: 0, y: top }, null);
        return sim;
      },
      watch: { T: (m) => period(m, "T", ballState(m).x, 0, m.time) },
    },
    related: "mechanics",
  }),
  tool({
    id: "collisions-1d",
    title: "Collisions in one dimension",
    topic: "Momentum",
    kind: "combined",
    purpose: "Momentum is always conserved; kinetic energy only if elastic",
    latex: "v_1 = \\frac{(m_1 - em_2)u_1 + (1 + e)m_2u_2}{m_1 + m_2}",
    variables: [
      V("v1", "v_1", "Final velocity of the first ball", "m/s", -40, 40, -1.5),
      V("m1", "m_1", "Mass of the first ball", "kg", 0.05, 100, 1, "log"),
      V("m2", "m_2", "Mass of the second ball", "kg", 0.05, 100, 3, "log"),
      V("u1", "u_1", "Initial velocity of the first ball", "m/s", -20, 20, 3),
      V("u2", "u_2", "Initial velocity of the second ball", "m/s", -20, 20, 0),
      V("e", "e", "Coefficient of restitution", "", 0, 1, 1),
    ],
    solveFor: ["v1"],
    solve: {
      v1: ({ m1, m2, u1, u2, e }) =>
        ((m1 - e * m2) * u1 + (1 + e) * m2 * u2) / (m1 + m2),
    },
    forms: {
      v1: "\\frac{(@m1 - @e·@m2)·@u1 + (1 + @e)·@m2·@u2}{@m1 + @m2}",
    },
    derivation: [
      {
        say: "Momentum is conserved",
        latex: "m_1u_1 + m_2u_2 = m_1v_1 + m_2v_2",
      },
      {
        say: "Restitution relates the speeds of separation and approach",
        latex: "v_2 - v_1 = e(u_1 - u_2)",
      },
      {
        say: "Solve the two together",
        latex: "v_1 = \\frac{(m_1 - em_2)u_1 + (1 + e)m_2u_2}{m_1 + m_2}",
      },
      {
        say: "and",
        latex: "v_2 = \\frac{(m_2 - em_1)u_2 + (1 + e)m_1u_1}{m_1 + m_2}",
      },
    ],
    uses: ["momentum", "kinetic-energy"],
    visual: "graph",
    sim: {
      engine: "sandbox",
      caption:
        "Two balls on a frictionless floor with gravity off; the first ball's velocity is measured once they have separated.",
      build: (v, E) => {
        const sim = sandbox(E, {
          view: { minX: -6, maxX: 6, minY: 0, maxY: 3 },
        });
        sim.tags.ball = body(sim, "ball", {
          x: -3,
          y: 1.5,
          size: 0.6,
          mass: v.m1,
          restitution: v.e,
          vx: v.u1,
        });
        sim.tags.other = body(sim, "ball", {
          x: 0,
          y: 1.5,
          size: 0.6,
          mass: v.m2,
          restitution: v.e,
          vx: v.u2,
        });
        return sim;
      },
      duration: () => 4,
      watch: {
        v1: (m) => {
          const a = ballState(m),
            b = m.state(m.tags.other);
          return {
            value: a.vx,
            note: `second ball ${b.vx.toFixed(2)} m/s`,
          };
        },
      },
    },
    related: "mechanics",
  }),
  tool({
    id: "power-lines",
    title: "Power lines",
    topic: "Circuits",
    kind: "combined",
    purpose: "Why electricity is sent at high voltage",
    latex: "P_{loss} = \\left(\\frac{P}{V}\\right)^2 R",
    variables: [
      V(
        "Ploss",
        "P_{loss}",
        "Power lost in the line",
        "W",
        1e-3,
        1e8,
        5e3,
        "log",
      ),
      V("P", "P", "Power sent", "W", 1, 1e9, 1e5, "log"),
      V("V", "V", "Line voltage", "V", 10, 1e6, 1000, "log"),
      V("R", "R", "Resistance of the line", "Ω", 0.01, 1000, 0.5, "log"),
    ],
    solveFor: ["Ploss", "V"],
    solve: {
      Ploss: ({ P, V, R }) => (P / V) ** 2 * R,
      V: ({ P, R, Ploss }) => P * Math.sqrt(R / Ploss),
    },
    forms: {
      Ploss: "\\left(\\frac{@P}{@V}\\right)^{2}·@R",
      V: "@P\\sqrt{\\frac{@R}{@Ploss}}",
    },
    derivation: [
      {
        say: "The current needed to send power P at voltage V",
        latex: "I = \\frac{P}{V}",
      },
      { say: "The line heats at", latex: "P_{loss} = I^2R" },
      { say: "So", latex: "P_{loss} = \\left(\\frac{P}{V}\\right)^2 R" },
      {
        say: "A transformer raises V by the turns ratio, cutting the loss by its square",
        latex: "\\frac{V_p}{V_s} = \\frac{N_p}{N_s}",
      },
    ],
    uses: ["electrical-power", "power-current-resistance", "transformer"],
    visual: "circuit",
    sim: {
      engine: "circuitlab",
      caption:
        "A cell of emf V feeding a line of resistance R in series with a load chosen to draw P/V; the line's power is read from the simulation.",
      build: (v, E) =>
        loop(E, v.V, [
          ["resistor", { resistance: v.R }],
          ["resistor", { resistance: Math.max(0, (v.V * v.V) / v.P - v.R) }],
        ]),
      watch: { Ploss: (lab) => reading(lab, lab.tags.parts[0], "power") },
    },
    related: "circuits",
  }),
  tool({
    id: "ac-generator",
    title: "AC generator",
    topic: "Magnetism",
    kind: "combined",
    purpose: "A coil turning in a field makes an alternating emf",
    latex: "\\varepsilon = NBA\\omega\\sin\\omega t",
    variables: [
      V("emf", "\\varepsilon_{0}", "Peak emf", "V", 0, 1e4, 314),
      V("N", "N", "Turns", "", 1, 1000, 100),
      V("B", "B", "Magnetic field", "T", 0, 2, 0.1),
      V("A", "A", "Area of the coil", "m²", 0, 1, 0.1),
      V("omega", "\\omega", "Angular speed", "rad/s", 0, 1000, 314),
    ],
    solveFor: ["emf", "omega"],
    solve: {
      emf: ({ N, B, A, omega }) => N * B * A * omega,
      omega: ({ emf, N, B, A }) => emf / (N * B * A),
    },
    forms: { emf: "@N·@B·@A·@omega", omega: "\\frac{@emf}{@N·@B·@A}" },
    derivation: [
      {
        say: "The flux through the turning coil",
        latex: "\\Phi = BA\\cos\\omega t",
      },
      {
        say: "Faraday's law for N turns",
        latex: "\\varepsilon = -N\\frac{d\\Phi}{dt}",
      },
      {
        say: "Differentiate",
        latex: "\\varepsilon = NBA\\omega\\sin\\omega t",
      },
      { say: "The peak", latex: "\\varepsilon_0 = NBA\\omega" },
    ],
    uses: ["magnetic-flux", "faradays-law"],
    visual: "graph",
    wants: "induction",
  }),
  tool({
    id: "photoelectric-stopping-voltage",
    title: "Stopping voltage",
    topic: "Modern physics",
    kind: "combined",
    purpose: "The p.d. that just stops the fastest photoelectrons",
    latex: "V_s = \\frac{hf - W}{e}",
    variables: [
      V("Vs", "V_s", "Stopping voltage", "V", 0, 20, 1.02),
      V("f", "f", "Frequency", "Hz", 1e14, 3e15, 1e15, "log"),
      V("W", "W", "Work function", "J", 1e-19, 1e-18, 5e-19),
    ],
    constants: [H, E0],
    solveFor: ["Vs", "f"],
    solve: {
      Vs: ({ h, f, W, e }) => (h * f - W) / e,
      f: ({ Vs, W, e, h }) => (Vs * e + W) / h,
    },
    forms: {
      Vs: "\\frac{@h·@f - @W}{@e}",
      f: "\\frac{@Vs·@e + @W}{@h}",
    },
    derivation: [
      { say: "Einstein's photoelectric equation", latex: "E_k = hf - W" },
      {
        say: "The stopping p.d. takes away exactly that energy",
        latex: "eV_s = E_k",
      },
      { say: "So", latex: "V_s = \\frac{hf - W}{e}" },
    ],
    uses: ["photoelectric-effect", "electric-work"],
    visual: "wave",
    wants: "modern",
  }),
];

export const toolById = (id) => tools.find((t) => t.id === id) ?? null;
// Topics in the order they first appear.
export const TOPICS = [...new Set(tools.map((t) => t.topic))];
