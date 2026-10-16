// The mini simulation of each minitool, by tool id. Each scene is built with
// one engine's public API and measured from that engine's state; nothing here
// models physics, and nothing is adjusted to make a measurement agree with a
// formula. No DOM.
//
// A sim is { engine, caption, build(values, E), watch, duration?, until?,
// speed? }:
//   build     returns a ready model for these values (every quantity, the
//             unknown already worked out). E is the engine module.
//   watch     { unknown: (model, unknown, values) => measured value }, or
//             { value, note }; null while there is nothing to report yet.
//   duration  seconds of simulated time after which the scene stops.
//   until     (model, values) => true when the scene has shown its result.
//   speed     (values, model) => how many times faster than life to play it
//             (slow things are played faster, quick things slower).
//
// Forces on a ball are made with field regions that can be seen in the
// scene, never with the sandbox's invisible scene-wide field settings: a
// ball carrying 1 C in an electric region of F N/C feels F newtons.
import {
  body,
  circleThrough,
  crossing,
  fields,
  loop,
  once,
  orbit,
  parallel,
  period,
  region,
  sandbox,
  travelled,
} from "./scenes.js";

const deg = Math.PI / 180;
const ball = (m) => m.state(m.tags.ball);
// The sandbox takes steps of 1/120 s. Something turning faster than this
// many radians a second moves through more than about 10° in a step, and its
// measured radius or force is then out by more than about a quarter of one
// per cent (the error grows as the square of the turning rate), so such a
// scene is not shown rather than shown wrongly.
const FASTEST_TURN = 20;
function turning(rate) {
  if (rate > FASTEST_TURN)
    throw new Error(
      "it would turn through more than 10° in one step of the simulation (1/120 s), too fast to follow accurately.",
    );
}

// The wavelength measured on a ripple tank's grid at the end of the run,
// between upward zero crossings along the middle (null until then).
const waveLength = (m) =>
  m.time >= 12 / m.tags.f ? m.wavelengthAlong(-2.5 * m.tags.l, 0, 0, 5 * m.tags.l) : null;
// The first surface a rays scene's ray meets: what happened there.
const surface = (m) => m.readings(m.trace(), m.tags.ray)[0]?.events[0] ?? null;

// What an engine says when it cannot take a value, in plain words.
const LIMITS = [
  [/setting: gravity/, "gravity in the sandbox goes up to 50 m/s²."],
  [/^Invalid mass/, "bodies in the sandbox are between 0.05 kg and 100 kg."],
  [/^Invalid charge/, "charges in the sandbox go up to 100 C."],
  [/friction/, "friction coefficients in the sandbox are between 0 and 1."],
  [/restitution/, "the coefficient of restitution is between 0 and 1."],
  [
    /^Invalid field strength/,
    "field regions in the sandbox hold between 0 and 100 N/C (or tesla).",
  ],
  [
    /^Invalid field (width|height)/,
    "field regions in the sandbox are between 0.1 m and 50 m across.",
  ],
  [/^Invalid (position|velocity)/, "it is outside what the sandbox can hold."],
];
/** An engine's refusal as a sentence a student can read. */
export function explain(error) {
  const text = String(error?.message ?? error);
  for (const [pattern, plain] of LIMITS) if (pattern.test(text)) return plain;
  return text[0].toLowerCase() + text.slice(1);
}
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
// Played so that something lasting `seconds` takes about `shown` seconds to
// watch, never slower than life unless it is over in a blink.
const paced = (seconds, shown = 4) =>
  Number.isFinite(seconds) && seconds > 0
    ? clamp(seconds / shown, seconds < 0.4 ? 0.1 : 1, 400)
    : 1;

// ---------------------------------------------------------------- gliding

// A ball carrying 1 C in the open with gravity off, moving along x. A force
// on it comes from an electric field region laid along its whole path.
// `time` or `reach` says how far the scene has to go.
function glide(
  E,
  {
    u = 0,
    force = 0,
    mass = 1,
    time = null,
    reach = null,
    angle = 0,
    gravity = 0,
    floor = false,
  },
) {
  const a = (force * Math.cos(angle)) / mass,
    x = (t) => u * t + 0.5 * a * t * t;
  let T = time;
  if (T === null && reach !== null)
    T = a ? (-u + Math.sqrt(u * u + 2 * a * reach)) / a : reach / u;
  if (!Number.isFinite(T) || T <= 0) T = 6;
  const ends = [0, x(T)],
    turn = a ? -u / a : -1;
  if (turn > 0 && turn < T) ends.push(x(turn));
  const lo = Math.min(...ends),
    hi = Math.max(...ends),
    y = floor ? 0.2 : 1.5,
    // The region is 2 m deep, or sits on the floor.
    regionY = floor ? 0.8 : 1.5,
    depth = floor ? 1.6 : 2,
    sim = sandbox(E, {
      gravity,
      view: { minX: lo - 1, maxX: hi + 1, minY: 0, maxY: 3 },
    });
  // A region holds at most 100 N/C, so a bigger force is made with more
  // charge on the ball; and at most 50 m, so a longer path gets several
  // regions end to end.
  const charge = Math.max(1, Math.ceil(Math.abs(force) / 100));
  if (force) {
    const length = hi - lo + 2,
      // (Turned regions would overlap, so a field at an angle gets one.)
      pieces = angle ? 1 : Math.ceil(length / 48),
      piece = length / pieces,
      c = Math.abs(Math.cos(angle)),
      sn = Math.abs(Math.sin(angle));
    for (let i = 0; i < pieces; i++)
      // Each region lies along the field, so it is turned with it, and is
      // made big enough to hold its stretch of the path either way up.
      region(sim, "electric", {
        x: lo - 1 + (i + 0.5) * piece,
        y: regionY,
        width: piece * c + depth * sn,
        height: piece * sn + depth * c,
        angle: angle / deg,
        strength: force / charge,
      });
  }
  sim.tags.ball = body(sim, "ball", {
    x: 0,
    y,
    size: 0.4,
    mass,
    // No field, no charge: a ball that only glides is not labelled "+1 C".
    charge: force ? charge : 0,
    vx: u,
  });
  sim.tags.start = sim.potentialPoint(sim.tags.ball);
  sim.tags.u0 = u;
  sim.tags.T = T;
  return sim;
}
const pushCaption =
  "A 1 kg ball carrying 1 C, with gravity off. The shaded region with arrows is a uniform electric field: 1 C in a field of a N/C feels a force of a newtons, so the 1 kg ball has the steady acceleration a.";

// A ball whirled on a light rod round a fixed centre, gravity off: uniform
// circular motion at speed v and radius r.
function whirl(watch) {
  return {
    engine: "sandbox",
    caption:
      "A ball on a light rod pinned at the centre, gravity off, set moving at speed v at right angles to the rod.",
    build: (v, E) => {
      turning(v.v / v.r);
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
        size: clamp(v.r / 2, 0.1, 0.3),
        mass: v.m ?? 1,
        vx: v.v,
      });
      sim.connect("rod", null, sim.tags.ball, centre, null);
      return sim;
    },
    speed: (v) => paced((2 * Math.PI * v.r) / v.v, 3),
    watch,
  };
}

// A satellite on a circular orbit of radius r round a body of mass M.
function circularOrbit(watch) {
  return {
    engine: "orbitlab",
    caption:
      "A satellite of mass m launched sideways at radius r in the orbits simulation, at the speed that keeps it on a circle; the value is read from the simulation.",
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

// A small mass let go from rest a distance r from the centre of a body of
// mass M (radius 0.4 r, so the fall can be seen), in the orbits simulation:
// it falls straight in and stops on the surface. `watch` reads what is
// wanted at the moment of release. With `potential`, the scene shades the
// potential and draws equipotentials.
function fallFrom(watch, { potential = false, bars } = {}) {
  return {
    engine: "orbitlab",
    caption: `A satellite of mass m let go from rest at a distance r from the centre of a body of mass M, in the orbits simulation. It falls straight in until it reaches the surface; the value is read from the simulation at the moment it is let go.${potential ? " The shading and dashed circles show the gravitational potential (circles at equal steps of it)." : ""}`,
    build: (v, E) => {
      const lab = orbit(E, {
        M: v.M,
        R: Math.min(6.371e6, 0.4 * v.r),
        r: v.r,
        v: 0,
        m: v.m,
      });
      lab.tags.potential = potential;
      return lab;
    },
    until: (lab) => lab.get(lab.tags.satellite)?.status === "impact",
    watch,
    ...(bars ? { bars } : {}),
  };
}

// ---------------------------------------------------------------- plates

// Two plates a gap d apart in the fields simulation, held at a potential
// difference V: the charge on them is set so that the simulation's own
// potential difference between them is V (it is proportional to the charge).
function plates(E, V, d) {
  const length = 6 * d,
    lab = fields(E, "electric", 2.2 * d);
  const top = lab.add("plate", { x: 0, y: d / 2, length, density: 1e-12 }),
    bottom = lab.add("plate", { x: 0, y: -d / 2, length, density: -1e-12 });
  const gap = (y) => lab.potential(0, y),
    // Just inside each plate's face.
    between = () => gap(d / 2 - 1e-6 * d) - gap(-d / 2 + 1e-6 * d),
    sigma = (1e-12 * V) / between();
  lab.update(top, { density: sigma });
  lab.update(bottom, { density: -sigma });
  lab.tags.d = d;
  lab.tags.difference = between;
  lab.tags.probe = { x: 0, y: 0 };
  lab.tags.labels = false;
  // About fourteen lines between the plates.
  lab.tags.density = clamp((14 * 7.06) / (6 * V), 0.125, 4);
  return lab;
}
const platesCaption =
  "Two plates in the fields simulation held at a potential difference V (seen edge on; they are 6d long). ";
const fieldAt = (lab, x, y) => {
  const [ex, ey] = lab.electricField(x, y);
  return Math.hypot(ex, ey);
};
const forceOn = (lab, id) => {
  const f = lab.forceOn(id);
  return f && Math.hypot(f.x, f.y);
};
// The x-component of a force or field, which carries its sign: these
// scenes are laid out along x, so a negative charge gives a negative
// reading, as the formula does.
const forceAlongX = (lab, id) => lab.forceOn(id)?.x ?? null;
// A reading from the circuit's solution (magnitude), or null.
function reading(lab, id, quantity) {
  const value = lab.solve().of(id)?.[quantity];
  return value === null || value === undefined ? null : Math.abs(value);
}

// The scene a moving charge needs: a magnetic region (out of the screen)
// covering everything the scene shows.
function magneticScene(E, B, view) {
  const sim = sandbox(E, { view });
  region(sim, "magnetic", {
    x: (view.minX + view.maxX) / 2,
    y: (view.minY + view.maxY) / 2,
    width: view.maxX - view.minX + 2,
    height: view.maxY - view.minY + 2,
    strength: B,
  });
  return sim;
}

export const sims = {
  // -------------------------------------------------------------- motion
  "suvat-v-u-at": {
    engine: "sandbox",
    caption: pushCaption,
    build: (v, E) => glide(E, { u: v.u, force: v.a, time: v.t }),
    duration: (v) => v.t,
    watch: {
      v: (m) => ball(m).vx,
      a: (m) => (m.time > 0 ? (ball(m).vx - m.tags.u0) / m.time : null),
    },
  },
  "suvat-s-ut-at2": {
    engine: "sandbox",
    caption: pushCaption,
    build: (v, E) => glide(E, { u: v.u, force: v.a, time: v.t }),
    duration: (v) => v.t,
    watch: { s: (m) => travelled(m).x },
  },
  "suvat-v2-u2-2as": {
    engine: "sandbox",
    caption:
      pushCaption + " Its speed is read as it passes the distance s.",
    build: (v, E) => glide(E, { u: v.u, force: v.a, reach: v.s }),
    speed: (v, m) => paced(m.tags.T),
    until: (m) => !!m.tags.crossings?.v?.done,
    watch: {
      v: (m, _, v) => {
        const at = crossing(m, "v", travelled(m).x, v.s, () => ({
          v: ball(m).vx,
        }));
        return at && Math.abs(at.v);
      },
    },
  },
  "suvat-average-velocity": {
    engine: "sandbox",
    caption:
      "A 1 kg ball carrying 1 C, gravity off, in a uniform electric field (shaded) of the strength that takes it from u to v in the time t.",
    build: (v, E) =>
      glide(E, { u: v.u, force: (v.v - v.u) / v.t, time: v.t }),
    duration: (v) => v.t,
    watch: { s: (m) => travelled(m).x },
  },
  "average-velocity": {
    engine: "sandbox",
    caption: "A ball gliding at a steady velocity with nothing acting on it.",
    build: (v, E) => glide(E, { u: v.vav, time: v.t }),
    duration: (v) => v.t,
    watch: {
      vav: (m) => (m.time > 0 ? travelled(m).x / m.time : null),
      s: (m) => travelled(m).x,
    },
  },

  // -------------------------------------------------------------- forces
  "newtons-second-law": {
    engine: "sandbox",
    caption:
      "A ball of mass m carrying 1 C, gravity off, in a uniform electric field (shaded) of F N/C, so the force on it is F. Its acceleration is its gain in velocity divided by the time.",
    build: (v, E) => glide(E, { force: v.F, mass: v.m, time: 2 }),
    duration: () => 2,
    watch: {
      a: (m) => (m.time > 0 ? ball(m).vx / m.time : null),
      F: (m, _, v) => (m.time > 0 ? (v.m * ball(m).vx) / m.time : null),
      m: (m, _, v) => (m.time > 0 ? v.F / (ball(m).vx / m.time) : null),
    },
  },
  weight: {
    engine: "sandbox",
    caption:
      "The ball is dropped; its weight is its mass times its measured acceleration.",
    build: (v, E) => {
      const sim = sandbox(E, {
        gravity: v.g,
        view: { minX: -3, maxX: 3, minY: 0, maxY: 6 },
      });
      sim.tags.ball = body(sim, "ball", { x: 0, y: 5.5, size: 0.4, mass: v.m });
      return sim;
    },
    duration: () => 0.5,
    watch: {
      W: (m, _, v) => (m.time > 0 ? (-v.m * ball(m).vy) / m.time : null),
      g: (m) => (m.time > 0 ? -ball(m).vy / m.time : null),
    },
  },
  friction: {
    engine: "sandbox",
    caption:
      "A block of weight N slides at 6 m/s on a floor of friction μ; the friction force is its mass times its measured deceleration. The scene stops just before the block does.",
    build: (v, E) => {
      // Watched until just before it stops (the deceleration is only μg
      // while it slides), or for 3 s on a floor with little friction.
      const T = v.mu > 0 ? Math.min(3, (0.95 * 6) / (v.mu * 9.81)) : 3,
        reach = 6 * T - 0.5 * v.mu * 9.81 * T * T;
      const sim = sandbox(E, {
        gravity: 9.81,
        floorFriction: v.mu,
        view: {
          minX: -1,
          maxX: reach + 1,
          minY: 0,
          maxY: Math.max(3, (reach + 2) / 2),
        },
      });
      sim.tags.T = T;
      sim.tags.mass = v.N / 9.81;
      sim.tags.ball = body(sim, "block", {
        // Twice as wide as it is tall: friction at the floor tips a block
        // whose μ is more than its width over its height, and μ goes to 1.
        x: 0,
        y: 0.2,
        size: [0.8, 0.4],
        mass: v.N / 9.81,
        friction: v.mu,
        vx: 6,
      });
      return sim;
    },
    duration: (v, m) => m?.tags.T ?? 0.4,
    speed: (v, m) => paced(m.tags.T, 3),
    watch: {
      Ff: (m) =>
        m.time > 0 ? (m.tags.mass * (6 - ball(m).vx)) / m.time : null,
      mu: (m) => (m.time > 0 ? (6 - ball(m).vx) / m.time / 9.81 : null),
    },
  },
  "hookes-law": {
    engine: "sandbox",
    caption:
      "A 1 kg ball carrying charge, gravity off, on a horizontal spring of stiffness k (natural length 1 m) fixed to the wall at the left; the spring is kept horizontal. The shaded electric field pulls the ball to the right with the force F, and damping brings it to rest. The extension is how far past the natural length it comes to rest.",
    build: (v, E) => {
      const stretch = v.F / v.k;
      if (stretch > 60)
        throw new Error("the spring would stretch more than 60 m.");
      const y = 1.5,
        end = 1 + stretch,
        sim = sandbox(E, {
          view: { minX: -0.5, maxX: end + 1, minY: 0, maxY: 3 },
        });
      // A region holds at most 100 N/C, so a bigger pull uses more charge.
      const charge = Math.max(1, Math.ceil(Math.abs(v.F) / 100));
      // And at most 50 m long, so a long stretch gets several end to end.
      const length = end + 0.5,
        pieces = Math.ceil(length / 48);
      if (v.F)
        for (let i = 0; i < pieces; i++)
          region(sim, "electric", {
            x: 0.5 + (i + 0.5) * (length / pieces),
            y,
            width: length / pieces,
            height: 1.2,
            strength: v.F / charge,
          });
      const omega = Math.sqrt(v.k);
      sim.tags.ball = body(sim, "ball", {
        x: 1,
        y,
        size: 0.3,
        charge: v.F ? charge : 0,
        // About critical damping, so it settles without bouncing for long.
        linearDamping: Math.min(20, 2 * omega),
      });
      const spring = sim.connect(
        "spring",
        null,
        sim.tags.ball,
        { x: 0, y },
        null,
      );
      sim.updateLink(spring, { k: v.k, damping: 0 });
      sim.setSpringAngle(spring, true);
      sim.tags.T = (2 * Math.PI) / omega;
      return sim;
    },
    speed: (v, m) => paced(1.5 * m.tags.T, 3),
    until: (m) => m.time > 3 * m.tags.T,
    watch: {
      x: (m) => ball(m).x - 1,
      F: (m, _, v) => v.k * (ball(m).x - 1),
    },
  },

  // -------------------------------------------------------------- momentum
  momentum: {
    engine: "sandbox",
    bars: "momentum",
    caption:
      "A ball of mass m gliding at v; its momentum is read from the simulation.",
    build: (v, E) => glide(E, { u: v.v, mass: v.m, time: 3 }),
    duration: () => 3,
    watch: {
      p: (m) => {
        const p = m.measure(m.tags.ball).momentum;
        return Math.hypot(p.x, p.y);
      },
    },
  },
  impulse: {
    engine: "sandbox",
    bars: "momentum",
    caption:
      "A ball of mass m carrying 1 C, gravity off, in a uniform electric field (shaded) of F N/C, so the force on it is F, for the time Δt.",
    build: (v, E) => glide(E, { force: v.F, mass: v.m, time: v.dt }),
    duration: (v) => v.dt,
    speed: (v) => paced(v.dt, 2),
    watch: { dv: (m) => ball(m).vx },
  },

  // -------------------------------------------------------------- energy
  "work-done": {
    engine: "sandbox",
    bars: "energy",
    caption:
      "A 20 kg ball carrying 1 C on a frictionless floor, in a uniform electric field (shaded) of F N/C at the angle θ, so it is pulled with force F. The work done is the kinetic energy it has gained after moving s.",
    build: (v, E) =>
      glide(E, {
        force: v.F,
        angle: v.theta * deg,
        mass: 20,
        gravity: 9.81,
        floor: true,
        reach: v.s,
      }),
    speed: (v, m) => paced(m.tags.T),
    until: (m) => !!m.tags.crossings?.W?.done,
    watch: {
      W: (m, _, v) =>
        crossing(m, "W", travelled(m).x, v.s, () => ({
          W: m.measure(m.tags.ball).translational,
        }))?.W ?? null,
    },
  },
  "kinetic-energy": {
    engine: "sandbox",
    bars: "energy",
    caption:
      "A ball of mass m gliding at v; its kinetic energy is read from the simulation.",
    build: (v, E) => glide(E, { u: v.v, mass: v.m, time: 3 }),
    duration: () => 3,
    watch: {
      Ek: (m) => m.measure(m.tags.ball).kinetic,
      v: (m) => m.measure(m.tags.ball).speed,
    },
  },
  "gravitational-potential-energy": {
    engine: "sandbox",
    bars: "energy",
    caption:
      "A ball of mass m held with its centre at height h above the floor, then let go; its potential energy is read from the simulation at the moment of release.",
    build: (v, E) => {
      const sim = sandbox(E, {
        gravity: v.g,
        view: { minX: -3, maxX: 3, minY: 0, maxY: Math.max(3, v.h + 1) },
      });
      sim.tags.ball = body(sim, "ball", {
        x: 0,
        y: v.h,
        size: clamp(v.h / 10, 0.2, 1),
        mass: v.m,
      });
      return sim;
    },
    duration: () => 3,
    watch: {
      Ep: (m) => once(m, "Ep", true, () => m.measure(m.tags.ball).gravitational),
    },
  },
  "elastic-potential-energy": {
    engine: "sandbox",
    bars: "energy",
    caption:
      "A 1 kg ball on a spring of natural length 2 m, pulled out by x and let go, with gravity off; the stored energy is read from the simulation at the moment of release.",
    build: (v, E) => {
      const sim = sandbox(E, {
        view: { minX: -1, maxX: 3 + v.x, minY: 0, maxY: 3 },
      });
      sim.tags.ball = body(sim, "ball", { x: 2, y: 1.5, size: 0.3 });
      const spring = sim.connect(
        "spring",
        null,
        sim.tags.ball,
        { x: 0, y: 1.5 },
        null,
      );
      sim.updateLink(spring, { k: v.k, damping: 0 });
      sim.setPose(sim.tags.ball, { x: 2 + v.x, y: 1.5 });
      return sim;
    },
    duration: (v) => 2 * 2 * Math.PI * Math.sqrt(1 / v.k),
    speed: (v) => paced(2 * 2 * Math.PI * Math.sqrt(1 / v.k), 5),
    watch: { Es: (m) => once(m, "Es", true, () => m.energy().elastic) },
  },
  "power-work-time": {
    engine: "sandbox",
    bars: "energy",
    caption:
      "A 1 kg ball carrying 1 C is pushed from rest by a uniform electric field (shaded) for the time t, with the push that does work W on it in that time. The power is the kinetic energy it gains divided by t.",
    build: (v, E) =>
      glide(E, { force: Math.sqrt(2 * v.W) / v.t, time: v.t }),
    duration: (v) => v.t,
    watch: {
      P: (m) => (m.time > 0 ? m.measure(m.tags.ball).kinetic / m.time : null),
    },
  },
  "power-force-velocity": {
    engine: "sandbox",
    bars: "energy",
    caption:
      "A 100 kg ball carrying 1 C moving at v through a uniform electric field (shaded) of F N/C. The power is the force on it, read from the simulation, times its speed.",
    build: (v, E) => glide(E, { u: v.v, force: v.F, mass: 100, time: 1 }),
    duration: () => 1,
    watch: {
      P: (m) =>
        once(m, "P", m.time > 0, () => m.netForce(m.tags.ball).x * m.tags.u0),
    },
  },

  // -------------------------------------------------------------- circular
  "circular-speed": whirl({
    T: (m) => period(m, "T", ball(m).y, m.tags.centre.y, m.time),
    v: (m) => m.measure(m.tags.ball).speed,
  }),
  "centripetal-acceleration": whirl({
    a: (m) => {
      const f = m.netForce(m.tags.ball);
      return m.time > 0 ? Math.hypot(f.x, f.y) / m.tags.mass : null;
    },
  }),
  "centripetal-force": whirl({
    F: (m) => {
      const f = m.netForce(m.tags.ball);
      return m.time > 0 ? Math.hypot(f.x, f.y) : null;
    },
  }),

  // -------------------------------------------------------------- gravitation
  "newtons-gravitation": fallFrom({
    F: (lab) => once(lab, "F", true, () => lab.measure(lab.tags.satellite).force),
  }),
  "gravitational-field-strength": fallFrom(
    {
      g: (lab) =>
        once(
          lab,
          "g",
          true,
          () => lab.measure(lab.tags.satellite).force / lab.satelliteMass,
        ),
    },
    { potential: true },
  ),
  "gravitational-potential": fallFrom(
    {
      Ep: (lab) =>
        once(lab, "Ep", true, () => lab.measure(lab.tags.satellite).potential),
    },
    { potential: true, bars: "energy" },
  ),

  // -------------------------------------------------------------- electric fields
  "coulombs-law": {
    engine: "fieldlab",
    caption:
      "Two charges in the fields simulation; the arrows are the forces on them, and the force on the second is read from it.",
    build: (v, E) => {
      const lab = fields(E, "electric", Math.max(0.3, v.r * 1.2));
      lab.add("charge", { x: -v.r / 2, y: 0, charge: v.q1 });
      lab.tags.second = lab.add("charge", { x: v.r / 2, y: 0, charge: v.q2 });
      lab.tags.forces = true;
      return lab;
    },
    // The second charge is on the +x side: + is a push apart (like
    // charges), − a pull together, as the sign of kq₁q₂/r².
    watch: { F: (lab) => forceAlongX(lab, lab.tags.second) },
  },
  "electric-field-force": {
    engine: "fieldlab",
    caption:
      "A charge q in a uniform field of strength E in the fields simulation; the arrow is the force on it, read from the simulation.",
    build: (v, E) => {
      const lab = fields(E, "electric", 2);
      lab.setUniform("electric", { x: v.E, y: 0 });
      lab.tags.charge = lab.add("charge", { x: 0, y: 0, charge: v.q });
      lab.tags.forces = true;
      // About a dozen lines of the uniform field across the picture.
      lab.tags.density = clamp((12 * 7.06) / (4 * v.E), 0.125, 4);
      return lab;
    },
    watch: {
      F: (lab) => forceAlongX(lab, lab.tags.charge),
      E: (lab, _, v) => {
        const f = forceAlongX(lab, lab.tags.charge);
        return f === null ? null : f / v.q;
      },
    },
  },
  "point-charge-field": {
    engine: "fieldlab",
    caption:
      "One charge in the fields simulation; the field strength is read at the marked point, a distance r away.",
    build: (v, E) => {
      const lab = fields(E, "electric", Math.max(0.3, v.r * 1.3));
      lab.add("charge", { x: 0, y: 0, charge: v.q });
      lab.tags.probe = { x: v.r, y: 0 };
      return lab;
    },
    // Along +x from the charge: away from a positive charge is +.
    watch: {
      E: (lab) => lab.electricField(lab.tags.probe.x, lab.tags.probe.y)[0],
    },
  },
  "uniform-field-plates": {
    engine: "fieldlab",
    caption:
      platesCaption +
      "The field strength is read at the marked point midway between them.",
    build: (v, E) => plates(E, v.V, v.d),
    watch: {
      E: (lab) => fieldAt(lab, 0, 0),
      V: (lab) => fieldAt(lab, 0, 0) * lab.tags.d,
      d: (lab, _, v) => v.V / fieldAt(lab, 0, 0),
    },
  },
  "electric-work": {
    engine: "sandbox",
    bars: "energy",
    caption:
      "Two plates d apart with a uniform electric field of V/d N/C between them (arrows), so the potential difference across the gap is V; gravity off, and the charge (50 g, the lightest body the sandbox has) passes through holes in the plates. The work the field does on it is the kinetic energy it has gained once it is through. A positive charge starts at rest at the + plate; a negative one is fired at the + plate fast enough to get through, and the field slows it down (negative work).",
    build: (v, E) => {
      // A region holds at most 100 N/C, so a large p.d. needs a wide gap.
      const d = Math.max(1, v.V / 100);
      if (d > 50)
        throw new Error(
          "the plates would have to be more than 50 m apart: sandbox fields go up to 100 N/C.",
        );
      const mass = 0.05,
        // The speed the field gives (or takes away) across the whole gap.
        gained = Math.sqrt((2 * Math.abs(v.q) * v.V) / mass),
        u = v.q < 0 ? Math.SQRT2 * gained : 0,
        // From rest, or slowing from √2·gained to gained: either way the
        // crossing takes a time of about 2d/gained.
        T = (2 * d) / gained;
      if (!(T < 1200))
        throw new Error(
          "the charge would take more than 20 minutes to cross the gap (the lightest body in the sandbox is 50 g).",
        );
      const half = Math.max(1.2, 0.4 * d),
        y = half + 0.3,
        sim = sandbox(E, {
          view: { minX: -1, maxX: d + 1.5, minY: 0, maxY: 2 * half + 0.6 },
        });
      region(sim, "electric", {
        x: d / 2,
        y,
        width: d,
        height: 2 * half,
        strength: v.V / d,
      });
      // Each plate is two fixed pieces with a hole between them.
      for (const x of [-0.05, d + 0.05])
        for (const side of [-1, 1]) {
          const piece = body(sim, "block", {
            x,
            y: y + (side * (half + 0.15)) / 2,
            size: [0.1, half - 0.15],
          });
          sim.setLock(piece, "position", true);
          sim.setLock(piece, "rotation", true);
        }
      sim.tags.ball = body(sim, "ball", {
        x: 1e-6 * d,
        y,
        size: 0.1,
        mass,
        charge: v.q,
        vx: u,
      });
      sim.tags.d = d;
      sim.tags.start = mass * u * u * 0.5;
      sim.tags.T = T;
      return sim;
    },
    speed: (v, m) => paced(m.tags.T, 4),
    until: (m) => m.potentialPoint(m.tags.ball).x > m.tags.d + 0.4,
    watch: {
      // Once it has left the field nothing more acts on it, so its kinetic
      // energy from then on is its energy at the far plate.
      W: (m) =>
        once(
          m,
          "W",
          m.potentialPoint(m.tags.ball).x > m.tags.d + 0.01,
          () => m.measure(m.tags.ball).kinetic - m.tags.start,
        ),
      q: (m, _, v) => {
        const W = sims["electric-work"].watch.W(m);
        return W === null ? null : W / v.V;
      },
      V: (m, _, v) => {
        const W = sims["electric-work"].watch.W(m);
        return W === null ? null : W / v.q;
      },
    },
  },

  // -------------------------------------------------------------- circuits
  "current-charge": {
    engine: "circuitlab",
    caption:
      "A 12 V cell and a resistor chosen to draw the current I; the ammeter reading is the measured current, and the charge passed is that current times t.",
    build: (v, E) => loop(E, 12, [["resistor", { resistance: 12 / v.I }]]),
    watch: {
      I: (lab) => reading(lab, lab.tags.ammeter, "current"),
      q: (lab, _, v) => reading(lab, lab.tags.ammeter, "current") * v.t,
    },
  },
  "ohms-law": {
    engine: "circuitlab",
    caption:
      "A cell of emf V and a resistor R, with an ammeter in series and a voltmeter across the resistor; the readings are the simulation's.",
    build: (v, E) =>
      loop(E, v.V, [["resistor", { resistance: v.R }]], { voltmeter: 0 }),
    watch: {
      I: (lab) => reading(lab, lab.tags.ammeter, "current"),
      V: (lab) => reading(lab, lab.tags.voltmeter, "voltage"),
      R: (lab) =>
        reading(lab, lab.tags.voltmeter, "voltage") /
        reading(lab, lab.tags.ammeter, "current"),
    },
  },
  "electrical-power": {
    engine: "circuitlab",
    caption:
      "A cell of emf V and a resistor that draws the current I, with an ammeter in series and a voltmeter across the resistor; the resistor's power is read from the simulation.",
    build: (v, E) =>
      loop(E, v.V, [["resistor", { resistance: v.V / v.I }]], {
        voltmeter: 0,
      }),
    watch: { P: (lab) => reading(lab, lab.tags.parts[0], "power") },
  },
  "power-current-resistance": {
    engine: "circuitlab",
    caption:
      "A resistor R carrying the current I (from a cell of emf IR); its power is read from the simulation.",
    build: (v, E) => loop(E, v.I * v.R, [["resistor", { resistance: v.R }]]),
    watch: { P: (lab) => reading(lab, lab.tags.parts[0], "power") },
  },
  "series-resistors": {
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
  "parallel-resistors": {
    engine: "circuitlab",
    caption:
      "Three resistors in parallel across a 12 V cell; the total resistance is the emf divided by the ammeter reading.",
    build: (v, E) => parallel(E, 12, [v.R1, v.R2, v.R3]),
    watch: { R: (lab) => 12 / reading(lab, lab.tags.ammeter, "current") },
  },
  "power-lines": {
    engine: "circuitlab",
    caption:
      "A supply of voltage V feeding a line of resistance R in series with the load that makes the supply deliver the power P; the power lost in the line is read from the simulation.",
    build: (v, E) => {
      const load = (v.V * v.V) / v.P - v.R;
      if (!(load > 0))
        throw new Error(
          "this line cannot carry that much power at this voltage.",
        );
      return loop(E, v.V, [
        ["resistor", { resistance: v.R }],
        ["resistor", { resistance: load }],
      ]);
    },
    watch: { Ploss: (lab) => reading(lab, lab.tags.parts[0], "power") },
  },

  // -------------------------------------------------------------- magnetism
  "force-on-moving-charge": {
    engine: "sandbox",
    caption:
      "A 20 kg ball carrying the charge q, moving at v through a uniform magnetic field (dots: out of the screen), gravity off. The force is read from the simulation as it starts to turn. The simulation is flat, so it shows the part of the field at right angles to the motion, B sin θ.",
    build: (v, E) => {
      const sim = magneticScene(E, v.B * Math.sin(v.theta * deg), {
        minX: -6,
        maxX: 6,
        minY: 0,
        maxY: 8,
      });
      sim.tags.ball = body(sim, "ball", {
        x: -3,
        y: 6,
        size: 0.4,
        mass: 20,
        charge: v.q,
        vx: v.v,
      });
      return sim;
    },
    until: (m) => {
      const s = ball(m);
      return m.time > 8 || Math.abs(s.x) > 6 || s.y < 0.4 || s.y > 8;
    },
    watch: {
      F: (m) =>
        once(m, "F", m.time > 0, () => {
          const f = m.netForce(m.tags.ball);
          return Math.hypot(f.x, f.y);
        }),
    },
  },
  "force-on-wire": {
    engine: "fieldlab",
    caption:
      "A wire carrying I out of the screen, across a uniform magnetic field, in the fields simulation; the arrow is the force on each metre of it, which is read from the simulation and multiplied by ℓ. Wires in this simulation always run out of the screen, at right angles to the field, so it shows the part of the field at right angles to the wire, B sin θ.",
    build: (v, E) => {
      const lab = fields(E, "magnetic", 1.5);
      lab.setUniform("magnetic", { x: v.B * Math.sin(v.theta * deg), y: 0 });
      lab.tags.wire = lab.add("wire", { x: 0, y: 0, current: v.I });
      lab.tags.forces = true;
      return lab;
    },
    watch: {
      F: (lab, _, v) => {
        const f = forceOn(lab, lab.tags.wire);
        return f && f * v.l;
      },
    },
  },
  "field-of-wire": {
    engine: "fieldlab",
    caption:
      "A wire carrying I out of the screen in the fields simulation; the field is read at the marked point, a distance r away.",
    build: (v, E) => {
      const lab = fields(E, "magnetic", Math.max(0.05, v.r * 1.3));
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

  // -------------------------------------------------------------- combinations
  "kepler-third-law": circularOrbit({
    T: (lab) => lab.get(lab.tags.satellite)?.measuredPeriod ?? null,
  }),
  "orbital-speed": {
    ...circularOrbit({ v: (lab) => lab.measure(lab.tags.satellite).speed }),
    caption:
      "A satellite launched sideways at radius r with the speed shown. On a circle its speed stays the same; it is read from the simulation.",
    build: (v, E) =>
      orbit(E, { M: v.M, R: Math.min(6.371e6, 0.95 * v.r), r: v.r, v: v.v }),
  },
  "geostationary-orbit": {
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
      "A satellite on a circular orbit of radius r; after one orbit its radius and its timed period are read from the simulation.",
    build: (v, E) =>
      orbit(E, {
        M: v.M,
        R: Math.min(6.371e6, 0.5 * v.r),
        r: v.r,
        v: Math.sqrt((E.G * v.M) / v.r),
      }),
  },
  "escape-speed": {
    engine: "orbitlab",
    bars: "energy",
    caption:
      "A satellite launched sideways at the distance r with the speed shown: at the escape speed its path is a parabola and it never comes back. The measured value is the speed that makes the simulation's own kinetic and potential energies add to zero at launch.",
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
  "cyclotron-motion": {
    engine: "sandbox",
    caption:
      "A charge moving through a uniform magnetic field (dots: out of the screen), gravity off. The radius is that of the circle through three points of its path.",
    build: (v, E) => {
      const r = v.r;
      if (!(r <= 20))
        throw new Error("the circle is more than 40 m across.");
      turning((v.q * v.B) / v.m);
      const sim = magneticScene(E, v.B, {
        minX: -1.2 * r,
        maxX: 1.2 * r,
        minY: 0,
        maxY: 2.4 * r + 0.2,
      });
      sim.tags.ball = body(sim, "ball", {
        x: 0,
        y: 2.2 * r + 0.1,
        size: clamp(r / 4, 0.1, 0.5),
        mass: v.m,
        charge: v.q,
        vx: v.v,
      });
      sim.tags.T = (2 * Math.PI * v.m) / (v.q * v.B);
      return sim;
    },
    speed: (v, m) => paced(m.tags.T, 4),
    until: (m) => m.time > 1.25 * m.tags.T,
    watch: { r: (m) => circleThrough(m, "r", m.potentialPoint(m.tags.ball)) },
  },
  "velocity-selector": {
    engine: "sandbox",
    caption:
      "A 1 kg ball carrying 1 C enters crossed fields at the speed v, gravity off: an electric field up the screen (arrows) and a magnetic field out of it (dots). The measured value is its speed after 2 m in the fields, with how far it has drifted sideways.",
    build: (v, E) => {
      const sim = sandbox(E, {
        view: { minX: -4, maxX: 5, minY: 0, maxY: 5 },
      });
      region(sim, "electric", {
        x: 1,
        y: 2.5,
        width: 4,
        height: 6,
        angle: 90,
        strength: v.E,
      });
      region(sim, "magnetic", {
        x: 1,
        y: 2.5,
        width: 6,
        height: 4,
        strength: v.B,
      });
      sim.tags.ball = body(sim, "ball", {
        x: -3.5,
        y: 2.5,
        size: 0.3,
        charge: 1,
        vx: v.v,
      });
      return sim;
    },
    speed: (v) => paced(8.5 / v.v, 4),
    until: (m) => {
      const s = ball(m);
      return s.x > 4.5 || s.y < 0.3 || s.y > 4.7 || s.x < -3.6;
    },
    watch: {
      v: (m) => {
        const at = crossing(m, "v", ball(m).x, 0, () => ({
          speed: m.measure(m.tags.ball).speed,
          y: m.potentialPoint(m.tags.ball).y - 2.5,
        }));
        return (
          at && { value: at.speed, note: `drifted ${at.y.toFixed(3)} m` }
        );
      },
    },
  },
  "mass-spectrometer": {
    engine: "sandbox",
    caption:
      "The charge starts at rest in a 1 m wide electric field of V N/C (arrows: a potential difference of V across it), then enters a magnetic field (dots: out of the screen) and turns through half a circle. The radius is half the distance between where it goes in and where it comes back out.",
    build: (v, E) => {
      const r = v.r;
      if (!(r <= 20))
        throw new Error("the half circle is more than 40 m across.");
      turning((v.q * v.B) / v.m);
      const sim = sandbox(E, {
        view: {
          minX: -2.2,
          maxX: Math.max(2, 1.3 * r),
          minY: 0,
          maxY: 2.4 * r + 1,
        },
      });
      const y = 2.2 * r + 0.6;
      region(sim, "electric", { x: -1, y, width: 1, height: 1, strength: v.V });
      region(sim, "magnetic", {
        x: 0.5 + 0.7 * r,
        y: y - r,
        width: 1.4 * r + 1,
        height: 2.4 * r + 1,
        strength: v.B,
      });
      sim.tags.ball = body(sim, "ball", {
        x: -1.4999,
        y,
        size: clamp(r / 6, 0.1, 0.4),
        mass: v.m,
        charge: v.q,
      });
      sim.tags.y = y;
      sim.tags.T =
        2 / Math.sqrt((2 * v.q * v.V) / v.m) + (Math.PI * v.m) / (v.q * v.B);
      return sim;
    },
    speed: (v, m) => paced(m.tags.T, 4),
    until: (m) => !!m.tags.crossings?.r?.done,
    watch: {
      // Back at the edge of the magnetic field (x = 0), having been inside.
      r: (m) => {
        const p = m.potentialPoint(m.tags.ball);
        if (p.x > 0.05) m.tags.inside = true;
        if (!m.tags.inside) return null;
        const at = crossing(m, "r", p.x, 0, () => ({ y: p.y }));
        return at && Math.abs(m.tags.y - at.y) / 2;
      },
    },
  },
  "electron-gun": {
    engine: "sandbox",
    bars: "energy",
    caption:
      "The charge starts at rest at one side of a 1 m wide electric field of V N/C (arrows), so it crosses a potential difference of V; its speed is read once it has left the field.",
    build: (v, E) => {
      const sim = sandbox(E, {
        view: { minX: -2, maxX: 4, minY: 0, maxY: 3 },
      });
      region(sim, "electric", {
        x: -1,
        y: 1.5,
        width: 1,
        height: 1.6,
        strength: v.V,
      });
      sim.tags.ball = body(sim, "ball", {
        x: -1.4999,
        y: 1.5,
        size: 0.2,
        mass: v.m,
        charge: v.q,
      });
      sim.tags.T = 6 / Math.sqrt((2 * v.q * v.V) / v.m);
      if (!(sim.tags.T < 1500))
        throw new Error(
          "the charge would take more than 25 minutes to cross the scene.",
        );
      return sim;
    },
    speed: (v, m) => paced(m.tags.T, 4),
    until: (m) => ball(m).x > 3.5,
    watch: {
      v: (m) =>
        once(m, "v", ball(m).x >= -0.3, () => m.measure(m.tags.ball).speed),
    },
  },
  "deflection-between-plates": {
    engine: "sandbox",
    caption:
      "A charge enters the uniform electric field (arrows) between two plates L long and d apart, with field strength V/d, gravity off. Its sideways deflection is read as it passes the far end of the plates.",
    build: (v, E) => {
      const mid = 1 + v.d / 2,
        sim = sandbox(E, {
          view: { minX: -1, maxX: v.L + 1, minY: 0, maxY: v.d + 2 },
        });
      region(sim, "electric", {
        x: v.L / 2,
        y: mid,
        width: v.d,
        height: v.L,
        angle: -90,
        strength: v.V / v.d,
      });
      // The plates themselves, fixed in place.
      for (const y of [1 - 0.06, 1 + v.d + 0.06]) {
        const plate = body(sim, "block", {
          x: v.L / 2,
          y,
          size: [Math.max(0.1, v.L), 0.1],
        });
        sim.setLock(plate, "position", true);
        sim.setLock(plate, "rotation", true);
      }
      sim.tags.ball = body(sim, "ball", {
        x: -0.5,
        y: mid,
        size: 0.1,
        mass: v.m,
        charge: v.q,
        vx: v.u,
      });
      sim.tags.y0 = mid;
      sim.tags.half = v.d / 2 - 0.05;
      sim.tags.T = (v.L + 1) / v.u;
      return sim;
    },
    speed: (v, m) => paced(m.tags.T, 4),
    until: (m) =>
      !!m.tags.crossings?.y?.done ||
      m.tags.hit ||
      ball(m).x > (m.tags.view.maxX ?? 99),
    watch: {
      y: (m, _, v) => {
        const p = m.potentialPoint(m.tags.ball),
          fallen = m.tags.y0 - p.y;
        if (p.x < v.L && Math.abs(fallen) >= m.tags.half) m.tags.hit = true;
        if (m.tags.hit)
          return { value: fallen, note: "it has hit a plate" };
        return (
          crossing(m, "y", p.x, v.L, () => ({ y: fallen }))?.y ?? null
        );
      },
    },
  },
  millikan: {
    engine: "sandbox",
    caption:
      "A drop of mass m and charge q between two plates d apart, in an upward electric field (arrows) of strength V/d, with gravity g. If the charge is right it hangs still. The measured value is the charge worked out from its measured acceleration a, q = m(g + a)/E.",
    build: (v, E) => {
      const mid = 1 + v.d / 2,
        sim = sandbox(E, {
          gravity: v.g,
          view: { minX: -3, maxX: 3, minY: 0, maxY: v.d + 2 },
        });
      region(sim, "electric", {
        x: 0,
        y: mid,
        width: v.d,
        height: 5,
        angle: 90,
        strength: v.V / v.d,
      });
      for (const y of [1 - 0.06, 1 + v.d + 0.06]) {
        const plate = body(sim, "block", { x: 0, y, size: [5, 0.1] });
        sim.setLock(plate, "position", true);
        sim.setLock(plate, "rotation", true);
      }
      sim.tags.ball = body(sim, "ball", {
        x: 0,
        y: mid,
        size: clamp(v.d / 8, 0.1, 0.3),
        mass: v.m,
        charge: v.q,
      });
      return sim;
    },
    duration: () => 1,
    watch: {
      q: (m, _, v) =>
        m.time > 0 ? (v.m * (v.g + ball(m).vy / m.time)) / (v.V / v.d) : null,
    },
  },
  "projectile-range": {
    engine: "sandbox",
    caption:
      "A ball launched from the floor with gravity g; the range is how far it has gone when it is back down at the height it was launched from.",
    build: (v, E) => {
      if ((2 * v.u * Math.sin(v.theta * deg)) / v.g < 0.25)
        throw new Error(
          "the flight lasts under a quarter of a second, too brief to time in steps of 1/120 s.",
        );
      const sim = sandbox(E, {
        gravity: v.g,
        view: { minX: -1, maxX: Math.max(4, v.R + 1), minY: 0, maxY: 3 },
      });
      // Launched from the floor: the ball starts resting on it (a
      // millimetre clear, so that it is not touching at the start).
      sim.tags.ball = body(sim, "ball", {
        x: 0,
        y: 0.051,
        size: 0.1,
        vx: v.u * Math.cos(v.theta * deg),
        vy: v.u * Math.sin(v.theta * deg),
      });
      sim.tags.start = sim.potentialPoint(sim.tags.ball);
      sim.tags.T = (2 * v.u * Math.sin(v.theta * deg)) / v.g;
      return sim;
    },
    speed: (v, m) => paced(m.tags.T, 3),
    until: (m) => m.tags.landed !== undefined,
    watch: {
      // The ball lands back on the floor, at the height it started from.
      // The floor stops it in the step it arrives, so its last step in free
      // flight is carried on to that height along the same parabola (exact
      // for free fall), rather than read from a step the floor has
      // already changed.
      R: (m, _, v) => {
        if (m.tags.landed !== undefined) return m.tags.landed;
        const s = travelled(m),
          b = ball(m),
          last = m.tags.flight;
        if (last && last.vy < 0 && (b.vy > last.vy || s.y <= 0)) {
          const t = (last.vy + Math.sqrt(last.vy ** 2 + 2 * v.g * last.y)) / v.g;
          m.tags.landed = last.x + last.vx * t;
          return m.tags.landed;
        }
        m.tags.flight = { x: s.x, y: s.y, vx: b.vx, vy: b.vy };
        return null;
      },
    },
  },
  "falling-without-friction": {
    engine: "sandbox",
    bars: "energy",
    caption:
      "A ball dropped from rest with gravity g; its speed is read as it passes a point h below where it started.",
    build: (v, E) => {
      const sim = sandbox(E, {
        gravity: v.g,
        view: { minX: -2, maxX: 2, minY: 0, maxY: v.h + 2.5 },
      });
      sim.tags.ball = body(sim, "ball", {
        x: 0,
        y: v.h + 2,
        size: clamp(v.h / 12, 0.2, 0.6),
      });
      sim.tags.start = sim.potentialPoint(sim.tags.ball);
      sim.tags.T = Math.sqrt((2 * v.h) / v.g);
      return sim;
    },
    speed: (v, m) => paced(m.tags.T, 2.5),
    until: (m) => !!m.tags.crossings?.v?.done,
    watch: {
      v: (m, _, v) =>
        crossing(m, "v", -travelled(m).y, v.h, () => ({
          v: m.measure(m.tags.ball).speed,
        }))?.v ?? null,
    },
  },
  "block-on-ramp": {
    engine: "sandbox",
    caption:
      "A block let go from rest on a fixed ramp with gravity g; the ramp and the block both have friction μ. Its acceleration down the slope is its gain in speed divided by the time.",
    build: (v, E) => {
      const theta = v.theta * deg,
        width = 7 * Math.cos(theta),
        height = 7 * Math.sin(theta);
      if (height < 0.1)
        throw new Error("the ramp is too shallow to build (under 1°).");
      const sim = sandbox(E, {
        gravity: v.g,
        view: { minX: -1, maxX: width + 1, minY: 0, maxY: height + 1.5 },
      });
      const ramp = body(sim, "wedge", {
        x: (2 * width) / 3,
        y: height / 3,
        size: [width, height],
        friction: v.mu,
      });
      sim.setLock(ramp, "position", true);
      sim.setLock(ramp, "rotation", true);
      const half = 0.2,
        t = 0.82;
      sim.tags.ball = body(sim, "block", {
        x: width * t - Math.sin(theta) * (half + 0.001),
        y: height * t + Math.cos(theta) * (half + 0.001),
        angle: theta,
        size: [0.4, 0.4],
        friction: v.mu,
      });
      sim.tags.theta = theta;
      // Stopped before it runs off the bottom (4.5 m down the slope).
      const a = v.g * (Math.sin(theta) - v.mu * Math.cos(theta));
      sim.tags.end = a > 0 ? Math.min(1.5, Math.sqrt(9 / a)) : 1.5;
      return sim;
    },
    duration: (v, m) => m?.tags.end ?? 1.5,
    watch: {
      a: (m) => {
        if (!(m.time > 0)) return null;
        const s = ball(m),
          along = -(
            s.vx * Math.cos(m.tags.theta) +
            s.vy * Math.sin(m.tags.theta)
          );
        return along / m.time;
      },
    },
  },
  "mass-on-spring": {
    engine: "sandbox",
    bars: "energy",
    caption:
      "A mass on a spring with no damping and gravity off, pulled 0.5 m from the spring's natural length and let go; the period is timed from the simulation.",
    build: (v, E) => {
      const sim = sandbox(E, {
        view: { minX: -0.5, maxX: 3.2, minY: 0, maxY: 3 },
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
    speed: (v) => paced(2 * Math.PI * Math.sqrt(v.m / v.k), 2.5),
    watch: { T: (m) => period(m, "T", ball(m).x, 2, m.time) },
  },
  "simple-pendulum": {
    engine: "sandbox",
    bars: "energy",
    caption:
      "A ball on a light rod of length L, let go from 5° with gravity g; the period is timed from the simulation. (The formula is for small swings; at 5° the true period is 0.05% longer.)",
    build: (v, E) => {
      const top = v.L + 0.5,
        a = 5 * deg,
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
        size: clamp(v.L / 4, 0.1, 0.3),
      });
      sim.connect("rod", null, sim.tags.ball, { x: 0, y: top }, null);
      return sim;
    },
    speed: (v) => paced(2 * Math.PI * Math.sqrt(v.L / v.g), 3),
    watch: { T: (m) => period(m, "T", ball(m).x, 0, m.time) },
  },
  // ---------------------------------------------------------------- waves

  "wave-equation": {
    engine: "waves",
    caption:
      "A ripple tank set to the wave speed v and driven at the frequency f, 30 grid cells to a wavelength. The wavelength is measured on the grid (the spacing of the waves' upward zero crossings), the frequency by a probe, and v = fλ from those.",
    build: (v, E) => {
      const l = v.v / v.f,
        lab = new E.WaveLab({ width: 10 * l, height: 12 * l, cell: l / 30, speed: v.v, absorber: 2 * l });
      // A line source running through the absorbing layer: plane waves.
      lab.add("line", { x: -4 * l, y: 0, angle: 0, length: 16.5 * l, frequency: v.f, amplitude: 1 });
      lab.tags = { probe: lab.add("probe", { x: l, y: 0 }), l, f: v.f };
      return lab;
    },
    // Twelve periods: the waves have filled the tank and those sent while
    // the source was switched on have gone by.
    duration: (v) => 12.5 / v.f,
    speed: (v) => 2 / v.f,
    watch: {
      lambda: (m) => waveLength(m),
      v: (m) => {
        const l = waveLength(m),
          r = m.probeReading(m.tags.probe);
        return l && r ? l * r.frequency : null;
      },
      f: (m) => (m.time >= 12 / m.tags.f ? (m.probeReading(m.tags.probe)?.frequency ?? null) : null),
    },
  },
  "period-frequency": {
    engine: "waves",
    caption:
      "A source of frequency f in a ripple tank; the probe times its waves' cycles (the spacing of their upward zero crossings), giving the period T and its frequency.",
    build: (v, E) => {
      const f = v.f,
        lab = new E.WaveLab({ width: 6, height: 6, cell: 0.05, speed: f });
      // Waves of 1 m: the speed is f metres per second.
      lab.add("point", { x: -1, y: 0, frequency: f, amplitude: 1 });
      lab.tags = { probe: lab.add("probe", { x: 1, y: 0 }), f };
      return lab;
    },
    // In 2D a point source's switching on leaves a slowly fading tail that
    // shifts the zero crossings (0.4% after 7 periods); by 15 it is gone.
    duration: (v) => 16 / v.f,
    speed: (v) => 2 / v.f,
    watch: {
      T: (m) => {
        const r = m.time >= 15 / m.tags.f ? m.probeReading(m.tags.probe) : null;
        return r ? 1 / r.frequency : null;
      },
      f: (m) => (m.time >= 15 / m.tags.f ? (m.probeReading(m.tags.probe)?.frequency ?? null) : null),
    },
  },
  "snells-law": {
    engine: "rays",
    caption:
      "A ray in a medium of index n₁ meets a flat surface of a block of index n₂ at θ₁ to the normal. The angles are measured from the traced ray, which follows Snell's law in vector form; beyond the critical angle it is totally reflected.",
    build: (v, E) => {
      const lab = new E.RayLab();
      lab.setMedium(v.n1);
      lab.add("block", { x: 0, y: -0.5, width: 2, height: 1, material: "fixed", index: v.n2 });
      const a = v.theta1 * deg;
      lab.tags = {
        ray: lab.add("ray", { x: -0.4 * Math.sin(a), y: 0.4 * Math.cos(a), angle: a - Math.PI / 2 }),
        view: { x: 0, y: 0, width: 1.1 },
        n1: v.n1,
      };
      return lab;
    },
    watch: {
      theta2: (m) => {
        const e = surface(m);
        return e?.event === "refract" ? e.leaving / deg : null;
      },
      theta1: (m) => {
        const e = surface(m);
        return e ? e.incidence / deg : null;
      },
      n2: (m) => {
        const e = surface(m);
        return e?.event === "refract" ? (m.tags.n1 * Math.sin(e.incidence)) / Math.sin(e.leaving) : null;
      },
    },
  },
  "standing-waves": {
    engine: "sound",
    caption:
      "A string of length L with waves travelling along it at v, set going in harmonic n alone: n half-wavelengths fit between its fixed ends. The frequency is timed at an antinode (the spacing of its zero crossings).",
    build: (v, E) => {
      // Tension for the wave speed v on a string of 1 g per metre.
      const scene = new E.StringScene(
        { length: v.L, tension: v.v * v.v * 1e-3, density: 1e-3, pluck: { kind: "mode", n: v.n, height: v.L / 40 }, modes: v.n },
        v.L / (2 * v.n),
      );
      scene.tags = { n: v.n, L: v.L, f: v.f };
      return scene;
    },
    duration: (v) => 3 / v.f,
    speed: (v) => 1 / v.f,
    watch: {
      f: (m) => (m.time >= 2.5 / m.tags.f ? m.measuredFrequency() : null),
      v: (m) => {
        const f = m.time >= 2.5 / m.tags.f ? m.measuredFrequency() : null;
        return f ? (2 * m.tags.L * f) / m.tags.n : null;
      },
      L: (m) => {
        const f = m.time >= 2.5 / m.tags.f ? m.measuredFrequency() : null;
        return f ? (m.tags.n * m.string.speed) / (2 * f) : null;
      },
    },
  },

  "collisions-1d": {
    engine: "sandbox",
    bars: "momentum",
    caption:
      "Two balls with gravity off, the first on the left. The first ball's velocity is read from the simulation just after they collide, with the second ball's beside it.",
    build: (v, E) => {
      const sim = sandbox(E, {
        view: { minX: -6, maxX: 6, minY: 0, maxY: 3 },
      });
      sim.tags.ball = body(sim, "ball", {
        x: -1.5,
        y: 1.5,
        size: 0.6,
        mass: v.m1,
        restitution: v.e,
        vx: v.u1,
      });
      sim.tags.other = body(sim, "ball", {
        x: 1.5,
        y: 1.5,
        size: 0.6,
        mass: v.m2,
        restitution: v.e,
        vx: v.u2,
      });
      sim.tags.u1 = v.u1;
      // They are 2.4 m apart, closing at u₁ − u₂.
      sim.tags.T = v.u1 > v.u2 ? 2.4 / (v.u1 - v.u2) : NaN;
      return sim;
    },
    speed: (v, m) => paced(m.tags.T, 1.5),
    until: (m) =>
      m.tags.once?.v1
        ? m.time > 2 * m.tags.T + 0.2
        : !(m.tags.T > 0) && m.time > 3,
    watch: {
      v1: (m) =>
        once(m, "v1", Math.abs(ball(m).vx - m.tags.u1) > 1e-9, () => ({
          value: ball(m).vx,
          note: `second ball ${m.state(m.tags.other).vx.toPrecision(3)} m/s`,
        })),
    },
  },
};
