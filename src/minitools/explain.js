// The explanations of each minitool, by tool id. No DOM.
//
//   about, idea, origin
//            the longer description at the top of the page, the idea behind
//            the derivation, and the "Where it comes from" steps. These are
//            written in the origins-*.js files (by topic) and joined on at
//            the foot of this file.
//   eq       the equation in the form algebra.js rearranges (see there); the
//            "How to rearrange" steps for each unknown are worked out from it
//   before   a sentence for the first of those steps, when `eq` is not
//            written quite as the equation is usually shown
//   steps    rearranging steps written by hand, by unknown, for equations
//            that are not a plain product or quotient
//   finish   steps added after the worked-out ones, by unknown
//   note     a sentence shown under the tool's purpose
//   check    (values, unknown) => a sentence when these values are outside
//            what the equation describes, else null
//
// Sentences may hold mathematics between $ signs.

import { mechanics } from "./origins-mechanics.js";
import { fields } from "./origins-fields.js";
import { waves } from "./origins-waves.js";
import { combined } from "./origins-combined.js";

const T = String.raw;
const deg = Math.PI / 180;

// Tools whose values are sandbox-sized so that the mini simulation can show
// them.
const SCALED =
  "The values here are everyday-sized (kilograms and coulombs) so that the simulation can show the motion. A real electron or ion has a mass of about 10⁻³⁰ to 10⁻²⁵ kg and a charge of about 10⁻¹⁹ C; the same equation applies.";

const already = (symbol) => [
  [
    T`The equation is already written with $${symbol}$ by itself on the left, so there is nothing to rearrange.`,
    null,
  ],
];

export const explain = {
  // ---------------------------------------------------------------- motion
  "suvat-v-u-at": {
    steps: {
      v: already("v"),
      u: [
        ["Start from the equation.", T`v = u + at`],
        [
          "Subtract $at$ from both sides to leave $u$ by itself.",
          T`v - at = u`,
        ],
        ["Swap the sides.", T`u = v - at`],
      ],
      a: [
        ["Start from the equation.", T`v = u + at`],
        [
          "Subtract $u$ from both sides, so that only the term with $a$ is left on the right.",
          T`v - u = at`,
        ],
        [
          "$a$ is multiplied by $t$. Divide both sides by $t$ to undo that.",
          T`\frac{v - u}{t} = a`,
        ],
        ["Swap the sides.", T`a = \frac{v - u}{t}`],
      ],
      t: [
        ["Start from the equation.", T`v = u + at`],
        [
          "Subtract $u$ from both sides, so that only the term with $t$ is left on the right.",
          T`v - u = at`,
        ],
        [
          "$t$ is multiplied by $a$. Divide both sides by $a$ to undo that.",
          T`\frac{v - u}{a} = t`,
        ],
        ["Swap the sides.", T`t = \frac{v - u}{a}`],
      ],
    },
  },
  "suvat-s-ut-at2": {
    steps: {
      s: already("s"),
      u: [
        ["Start from the equation.", T`s = ut + \tfrac{1}{2}at^2`],
        [
          "Subtract $\\tfrac{1}{2}at^2$ from both sides, so that only the term with $u$ is left on the right.",
          T`s - \tfrac{1}{2}at^2 = ut`,
        ],
        [
          "$u$ is multiplied by $t$. Divide both sides by $t$ to undo that.",
          T`\frac{s - \tfrac{1}{2}at^2}{t} = u`,
        ],
        ["Swap the sides.", T`u = \frac{s - \tfrac{1}{2}at^2}{t}`],
      ],
      a: [
        ["Start from the equation.", T`s = ut + \tfrac{1}{2}at^2`],
        [
          "Subtract $ut$ from both sides, so that only the term with $a$ is left on the right.",
          T`s - ut = \tfrac{1}{2}at^2`,
        ],
        [
          "Multiply both sides by 2 to remove the half.",
          T`2(s - ut) = at^2`,
        ],
        [
          "$a$ is multiplied by $t^2$. Divide both sides by $t^2$ to undo that.",
          T`\frac{2(s - ut)}{t^2} = a`,
        ],
        ["Swap the sides.", T`a = \frac{2(s - ut)}{t^2}`],
      ],
    },
  },
  "suvat-v2-u2-2as": {
    steps: {
      v: [
        ["Start from the equation.", T`v^2 = u^2 + 2as`],
        [
          "$v$ is squared. Take the square root of both sides to undo that. The positive root is the speed; the velocity is negative if it is moving backwards.",
          T`v = \sqrt{u^2 + 2as}`,
        ],
      ],
      a: [
        ["Start from the equation.", T`v^2 = u^2 + 2as`],
        [
          "Subtract $u^2$ from both sides, so that only the term with $a$ is left on the right.",
          T`v^2 - u^2 = 2as`,
        ],
        [
          "$a$ is multiplied by $2s$. Divide both sides by $2s$ to undo that.",
          T`\frac{v^2 - u^2}{2s} = a`,
        ],
        ["Swap the sides.", T`a = \frac{v^2 - u^2}{2s}`],
      ],
      s: [
        ["Start from the equation.", T`v^2 = u^2 + 2as`],
        [
          "Subtract $u^2$ from both sides, so that only the term with $s$ is left on the right.",
          T`v^2 - u^2 = 2as`,
        ],
        [
          "$s$ is multiplied by $2a$. Divide both sides by $2a$ to undo that.",
          T`\frac{v^2 - u^2}{2a} = s`,
        ],
        ["Swap the sides.", T`s = \frac{v^2 - u^2}{2a}`],
      ],
    },
    check: (v, unknown) => {
      // A real journey takes a positive time. With steady acceleration the
      // time is the displacement divided by the average velocity,
      // t = 2s / (u + v), and also the change in velocity divided by the
      // acceleration, t = (v − u) / a.
      if (unknown === "a" && v.s * (v.u + v.v) < 0)
        return "These numbers satisfy the equation but describe no real motion: the average of u and v points the opposite way to the displacement, so the journey would have to take a negative time.";
      if (unknown === "s" && v.a !== 0 && (v.v - v.u) / v.a < 0)
        return "These numbers satisfy the equation but describe no real motion after the start: this acceleration changes the velocity away from v, not towards it, so the object had velocity v before the start, not after it.";
      if (unknown !== "v") return null;
      if (v.u * v.u + 2 * v.a * v.s < 0)
        return "It slows down and stops before it has gone this far, so it never reaches this displacement: u² + 2as is negative, and no speed has a negative square.";
      // Does it ever get to s? ½at² + ut − s = 0 needs a root with t > 0.
      const reaches =
        v.s === 0 ||
        (v.a === 0
          ? v.u * v.s > 0
          : [1, -1].some(
              (sign) =>
                (-v.u + sign * Math.sqrt(v.u * v.u + 2 * v.a * v.s)) / v.a >
                1e-12,
            ));
      return reaches
        ? null
        : "With these values it moves away from this displacement and never reaches it, so the equation has nothing to describe.";
    },
  },
  "suvat-average-velocity": {
    steps: {
      s: already("s"),
      v: [
        ["Start from the equation.", T`s = \tfrac{1}{2}(u + v)t`],
        ["Multiply both sides by 2 to remove the half.", T`2s = (u + v)t`],
        [
          "The bracket is multiplied by $t$. Divide both sides by $t$ to undo that.",
          T`\frac{2s}{t} = u + v`,
        ],
        [
          "Subtract $u$ from both sides to leave $v$ by itself.",
          T`\frac{2s}{t} - u = v`,
        ],
        ["Swap the sides.", T`v = \frac{2s}{t} - u`],
      ],
      t: [
        ["Start from the equation.", T`s = \tfrac{1}{2}(u + v)t`],
        ["Multiply both sides by 2 to remove the half.", T`2s = (u + v)t`],
        [
          "$t$ is multiplied by the whole bracket $(u + v)$. Divide both sides by $(u + v)$ to undo that.",
          T`\frac{2s}{u + v} = t`,
        ],
        ["Swap the sides.", T`t = \frac{2s}{u + v}`],
      ],
    },
  },
  "average-velocity": {
    eq: "vav = s / t",
  },

  // ---------------------------------------------------------------- forces
  "newtons-second-law": {
    eq: "F = m a",
  },
  weight: {
    eq: "W = m g",
  },
  friction: {
    eq: "Ff = mu N",
    check: (v, unknown) =>
      unknown === "mu" && v.mu > 1.5
        ? "A coefficient above about 1.5 is unusual: check that the friction force is not larger than these surfaces could give."
        : null,
  },
  "hookes-law": {
    eq: "F = k x",
  },
  torque: {
    eq: "tau = r F #sin",
    check: (v, unknown) =>
      unknown !== "tau" && Math.sin(v.theta * deg) < 1e-9
        ? "At 0° or 180° the force points straight at or away from the pivot and has no turning effect, so no force or distance could give this torque."
        : null,
  },

  // ---------------------------------------------------------------- momentum
  momentum: {
    eq: "p = m v",
  },
  impulse: {
    eq: "F dt = m dv",
  },

  // ---------------------------------------------------------------- energy
  "work-done": {
    eq: "W = F s #cos",
    check: (v, unknown) =>
      unknown !== "W" && Math.cos(v.theta * deg) < 1e-9
        ? "At 90° the force is at right angles to the motion and does no work, so no force or distance could give this amount of work."
        : null,
  },
  "kinetic-energy": {
    eq: "Ek = m v^2 / #2",
    before:
      "Half of something is the same as that thing divided by 2, so write the equation as a fraction.",
  },
  "gravitational-potential-energy": {
    eq: "Ep = m g h",
  },
  "elastic-potential-energy": {
    eq: "Es = k x^2 / #2",
    before:
      "Half of something is the same as that thing divided by 2, so write the equation as a fraction.",
  },
  "power-work-time": {
    eq: "P = W / t",
  },
  "power-force-velocity": {
    eq: "P = F v",
  },

  // ---------------------------------------------------------------- circular motion
  "circular-speed": {
    eq: "v = #2pi r / T",
  },
  "centripetal-acceleration": {
    eq: "a = v^2 / r",
  },
  "centripetal-force": {
    eq: "F = m v^2 / r",
  },

  // ---------------------------------------------------------------- gravitation
  "newtons-gravitation": {
    eq: "F = G M m / r^2",
  },
  "gravitational-field-strength": {
    eq: "g = G M / r^2",
  },
  "gravitational-potential": {
    steps: {
      Ep: already("E_p"),
      r: [
        ["Start from the equation.", T`E_p = -\frac{GMm}{r}`],
        [
          "$r$ is on the bottom of a fraction. Multiply both sides by $r$ to bring it up to the top line.",
          T`E_p\,r = -GMm`,
        ],
        [
          "$r$ is multiplied by $E_p$. Divide both sides by $E_p$ to undo that.",
          T`r = -\frac{GMm}{E_p}`,
        ],
        [
          "$E_p$ is itself negative, and a negative divided by a negative is positive, so $r$ comes out positive as a distance must.",
          T`r = \frac{GMm}{|E_p|}`,
        ],
      ],
    },
  },

  // ---------------------------------------------------------------- electric fields
  "coulombs-law": {
    eq: "F = k q1 q2 / r^2",
  },
  "electric-field-force": {
    eq: "E = F / q",
  },
  "point-charge-field": {
    eq: "E = k q / r^2",
  },
  "uniform-field-plates": {
    eq: "E = V / d",
  },
  "electric-work": {
    eq: "W = q V",
  },

  // ---------------------------------------------------------------- circuits
  "current-charge": {
    eq: "I = q / t",
  },
  "ohms-law": {
    eq: "V = I R",
  },
  "electrical-power": {
    eq: "P = V I",
  },
  "power-current-resistance": {
    eq: "P = I^2 R",
  },
  "series-resistors": {
    steps: {
      R: already("R"),
      R3: [
        ["Start from the equation.", T`R = R_1 + R_2 + R_3`],
        [
          "Subtract $R_1$ from both sides.",
          T`R - R_1 = R_2 + R_3`,
        ],
        [
          "Subtract $R_2$ from both sides to leave $R_3$ by itself.",
          T`R - R_1 - R_2 = R_3`,
        ],
        ["Swap the sides.", T`R_3 = R - R_1 - R_2`],
      ],
    },
    check: (v, unknown) =>
      unknown === "R3" && v.R - v.R1 - v.R2 < 0
        ? "The total is less than the first two resistors alone, which cannot happen in series: a resistance cannot be negative."
        : null,
  },
  "parallel-resistors": {
    steps: {
      R: [
        [
          "Start from the equation. It gives $\\frac{1}{R}$, not $R$.",
          T`\frac{1}{R} = \frac{1}{R_1} + \frac{1}{R_2} + \frac{1}{R_3}`,
        ],
        [
          "Work out the right-hand side as a single number: find each $1 \\div R$ and add them. Call the total $S$.",
          T`\frac{1}{R} = S`,
        ],
        [
          "Multiply both sides by $R$ to bring it up from the bottom of the fraction.",
          T`1 = SR`,
        ],
        [
          "Divide both sides by $S$ to leave $R$ by itself. So $R$ is 1 divided by the total: the last step is always to turn the answer upside down.",
          T`R = \frac{1}{S} = \left(\frac{1}{R_1} + \frac{1}{R_2} + \frac{1}{R_3}\right)^{-1}`,
        ],
      ],
    },
  },

  // ---------------------------------------------------------------- magnetism
  "force-on-moving-charge": {
    eq: "F = q v B #sin",
    note: SCALED,
    check: (v, unknown) =>
      unknown !== "F" && Math.sin(v.theta * deg) < 1e-9
        ? "At 0° the charge moves along the field lines and feels no force, so no field or speed could give this force."
        : null,
  },
  "force-on-wire": {
    eq: "F = B I l #sin",
    check: (v, unknown) =>
      unknown !== "F" && Math.sin(v.theta * deg) < 1e-9
        ? "At 0° the wire runs along the field lines and feels no force, so no field or current could give this force."
        : null,
  },
  "field-of-wire": {
    eq: "B = mu0 I / #2pi r",
  },
  "magnetic-flux": {
    eq: "Phi = B A #cos",
    check: (v, unknown) =>
      unknown !== "Phi" && Math.cos(v.theta * deg) < 1e-9
        ? "At 90° the loop is edge-on to the field and no flux passes through it, so no field or area could give this flux."
        : null,
  },
  "faradays-law": {
    steps: {
      emf: already(T`\varepsilon`),
      N: [
        ["Start from the equation.", T`\varepsilon = -N\,\frac{\Delta\Phi}{\Delta t}`],
        [
          "Multiply both sides by $\\Delta t$ to clear the fraction.",
          T`\varepsilon\,\Delta t = -N\,\Delta\Phi`,
        ],
        [
          "$N$ is multiplied by $-\\Delta\\Phi$. Divide both sides by $-\\Delta\\Phi$ to undo that. Dividing by a negative puts a minus sign in front.",
          T`-\frac{\varepsilon\,\Delta t}{\Delta\Phi} = N`,
        ],
        ["Swap the sides.", T`N = -\frac{\varepsilon\,\Delta t}{\Delta\Phi}`],
      ],
      dt: [
        ["Start from the equation.", T`\varepsilon = -N\,\frac{\Delta\Phi}{\Delta t}`],
        [
          "$\\Delta t$ is on the bottom of a fraction. Multiply both sides by $\\Delta t$ to bring it up to the top line.",
          T`\varepsilon\,\Delta t = -N\,\Delta\Phi`,
        ],
        [
          "$\\Delta t$ is multiplied by $\\varepsilon$. Divide both sides by $\\varepsilon$ to undo that.",
          T`\Delta t = -\frac{N\,\Delta\Phi}{\varepsilon}`,
        ],
      ],
    },
    check: (v, unknown) => {
      if (unknown === "N" && !(-v.emf * v.dt / v.dPhi > 0))
        return "The emf and the change in flux have the same sign here, which Lenz's law does not allow: the number of turns comes out negative.";
      if (unknown === "dt" && !(-v.N * v.dPhi / v.emf > 0))
        return "The emf and the change in flux have the same sign here, which Lenz's law does not allow: the time comes out negative.";
      return null;
    },
  },
  "motional-emf": {
    eq: "emf = B l v",
  },
  transformer: {
    eq: "Vp / Vs = Np / Ns",
  },

  // ---------------------------------------------------------------- waves
  "wave-equation": {
    eq: "v = f lambda",
  },
  "period-frequency": {
    eq: "T = 1 / f",
  },
  "snells-law": {
    steps: {
      theta2: [
        ["Start from the equation.", T`n_1\sin\theta_1 = n_2\sin\theta_2`],
        [
          "$\\sin\\theta_2$ is multiplied by $n_2$. Divide both sides by $n_2$ to undo that.",
          T`\frac{n_1\sin\theta_1}{n_2} = \sin\theta_2`,
        ],
        ["Swap the sides.", T`\sin\theta_2 = \frac{n_1\sin\theta_1}{n_2}`],
        [
          "This gives the sine of the angle, not the angle. Use the inverse sine ($\\sin^{-1}$ on a calculator) to get the angle back.",
          T`\theta_2 = \sin^{-1}\left(\frac{n_1\sin\theta_1}{n_2}\right)`,
        ],
      ],
      n2: [
        ["Start from the equation.", T`n_1\sin\theta_1 = n_2\sin\theta_2`],
        [
          "$n_2$ is multiplied by $\\sin\\theta_2$. Divide both sides by $\\sin\\theta_2$ to undo that.",
          T`\frac{n_1\sin\theta_1}{\sin\theta_2} = n_2`,
        ],
        ["Swap the sides.", T`n_2 = \frac{n_1\sin\theta_1}{\sin\theta_2}`],
      ],
      theta1: [
        ["Start from the equation.", T`n_1\sin\theta_1 = n_2\sin\theta_2`],
        [
          "$\\sin\\theta_1$ is multiplied by $n_1$. Divide both sides by $n_1$ to undo that.",
          T`\sin\theta_1 = \frac{n_2\sin\theta_2}{n_1}`,
        ],
        [
          "This gives the sine of the angle, not the angle. Use the inverse sine ($\\sin^{-1}$ on a calculator) to get the angle back.",
          T`\theta_1 = \sin^{-1}\left(\frac{n_2\sin\theta_2}{n_1}\right)`,
        ],
      ],
    },
    check: (v, unknown) => {
      if (unknown === "theta2" && (v.n1 * Math.sin(v.theta1 * deg)) / v.n2 > 1)
        return "Total internal reflection: n₁ sin θ₁ is greater than n₂, and no angle has a sine greater than 1. No light is refracted; all of it reflects back into the first medium.";
      if (unknown === "theta1" && (v.n2 * Math.sin(v.theta2 * deg)) / v.n1 > 1)
        return "No angle of incidence gives this angle of refraction: its sine would have to be greater than 1.";
      if (unknown === "n2" && v.theta2 === 0 && v.theta1 !== 0)
        return "A ray that arrives at an angle cannot leave along the normal, so no refractive index gives this.";
      if (unknown === "n2" && v.n2 < 1)
        return "A refractive index below 1 would mean light travelling faster than in a vacuum, which no ordinary material allows.";
      return null;
    },
  },
  "standing-waves": {
    eq: "f = n v / #2 L",
  },
  "inverse-square-intensity": {
    eq: "I = P / #4pi r^2",
  },

  // ---------------------------------------------------------------- modern physics
  "photon-energy": {
    eq: "E = h f",
  },
  "photoelectric-effect": {
    steps: {
      Ek: already("E_k"),
      f: [
        ["Start from the equation.", T`E_k = hf - W`],
        [
          "Add $W$ to both sides, so that only the term with $f$ is left on the right.",
          T`E_k + W = hf`,
        ],
        [
          "$f$ is multiplied by $h$. Divide both sides by $h$ to undo that.",
          T`\frac{E_k + W}{h} = f`,
        ],
        ["Swap the sides.", T`f = \frac{E_k + W}{h}`],
      ],
      W: [
        ["Start from the equation.", T`E_k = hf - W`],
        [
          "Add $W$ to both sides to make it positive.",
          T`E_k + W = hf`,
        ],
        [
          "Subtract $E_k$ from both sides to leave $W$ by itself.",
          T`W = hf - E_k`,
        ],
      ],
    },
    check: (v, unknown) => {
      if (unknown === "Ek" && v.h * v.f - v.W < 0)
        return "The photon energy hf is less than the work function, so no electrons are emitted at all: a negative kinetic energy has no meaning. The frequency is below the threshold frequency W/h.";
      if (unknown === "W" && v.h * v.f - v.Ek < 0)
        return "The electrons would have more kinetic energy than the photons bring, which cannot happen: the work function comes out negative.";
      return null;
    },
  },
  "de-broglie": {
    eq: "lambda = h / p",
  },
  "mass-energy": {
    eq: "E = m c^2",
  },
  "time-dilation": {
    asymptotes: [
      { x: "v", y: "t", at: (v) => v.c, label: "v = c, the speed of light" },
    ],
    steps: {
      t: already("t"),
      t0: [
        ["Start from the equation.", T`t = \frac{t_0}{\sqrt{1 - v^2/c^2}}`],
        [
          "$t_0$ is divided by the square root. Multiply both sides by the square root to undo that.",
          T`t\,\sqrt{1 - v^2/c^2} = t_0`,
        ],
        ["Swap the sides.", T`t_0 = t\,\sqrt{1 - v^2/c^2}`],
      ],
    },
  },
  "length-contraction": {
    asymptotes: [
      { x: "v", y: "L0", at: (v) => v.c, label: "v = c, the speed of light" },
    ],
    steps: {
      L: already("L"),
      L0: [
        ["Start from the equation.", T`L = L_0\sqrt{1 - v^2/c^2}`],
        [
          "$L_0$ is multiplied by the square root. Divide both sides by the square root to undo that.",
          T`\frac{L}{\sqrt{1 - v^2/c^2}} = L_0`,
        ],
        ["Swap the sides.", T`L_0 = \frac{L}{\sqrt{1 - v^2/c^2}}`],
      ],
    },
  },

  // ---------------------------------------------------------------- combinations
  "kepler-third-law": {
    eq: "T^2 = #4pi2 r^3 / G M",
    finish: {
      T: [
        [
          "$4\\pi^2$ is $(2\\pi)^2$, so its square root is $2\\pi$ and can be written in front of the root.",
          T`T = 2\pi\sqrt{\frac{r^3}{GM}}`,
        ],
      ],
    },
  },
  "orbital-speed": {
    subject: "v",
    eq: "v^2 = G M / r",
    before:
      "Start one line before the square root is taken, where the equation is simpler to rearrange.",
  },
  "geostationary-orbit": {
    eq: "T^2 = #4pi2 r^3 / G M",
    before:
      "Start from Kepler's third law, which is this equation before the cube root is taken.",
    finish: {
      T: [
        [
          "$4\\pi^2$ is $(2\\pi)^2$, so its square root is $2\\pi$ and can be written in front of the root.",
          T`T = 2\pi\sqrt{\frac{r^3}{GM}}`,
        ],
      ],
    },
  },
  "escape-speed": {
    subject: "v",
    eq: "v^2 = #2 G M / r",
    before:
      "Start one line before the square root is taken, where the equation is simpler to rearrange.",
  },
  "cyclotron-motion": {
    eq: "r = m v / q B",
    note: SCALED,
  },
  "velocity-selector": {
    eq: "v = E / B",
    note: SCALED,
  },
  "mass-spectrometer": {
    subject: "r",
    eq: "r^2 = #2 m V / q B^2",
    before:
      "Square both sides of the equation first, to get rid of the square root: $\\left(\\frac{1}{B}\\right)^2 = \\frac{1}{B^2}$, and squaring a square root leaves what was inside it.",
    note: SCALED,
    finish: {
      r: [
        [
          "$B^2$ under the square root comes out as $B$ on the bottom, in front of the root.",
          T`r = \frac{1}{B}\sqrt{\frac{2mV}{q}}`,
        ],
      ],
      B: [
        [
          "$r^2$ under the square root comes out as $r$ on the bottom, in front of the root.",
          T`B = \frac{1}{r}\sqrt{\frac{2mV}{q}}`,
        ],
      ],
    },
  },
  "electron-gun": {
    subject: "v",
    eq: "v^2 = #2 q V / m",
    before:
      "Start one line before the square root is taken, where the equation is simpler to rearrange.",
    note: SCALED,
    check: (v) =>
      Math.sqrt((2 * v.q * v.V) / v.m) > 3e7 ||
      (Number.isFinite(v.v) && v.v > 3e7)
        ? "Above about a tenth of the speed of light this equation starts to go wrong, because it uses ½mv² for the kinetic energy. Special relativity is needed for speeds this high."
        : null,
  },
  "deflection-between-plates": {
    eq: "y = q V L^2 / #2 m d u^2",
    note:
      SCALED +
      " The charge is taken to enter midway between the plates, moving parallel to them.",
    check: (v, unknown) => {
      const y =
        unknown === "y"
          ? (v.q * v.V * v.L * v.L) / (2 * v.m * v.d * v.u * v.u)
          : v.y;
      return y > v.d / 2
        ? "This is more than half the gap, so a charge that enters midway between the plates would hit one of them before reaching the far end."
        : null;
    },
  },
  millikan: {
    eq: "q = m g d / V",
    note: SCALED,
  },
  "projectile-range": {
    eq: "R = u^2 #sin2 / g",
  },
  "falling-without-friction": {
    subject: "v",
    eq: "v^2 = #2 g h",
    before:
      "Start one line before the square root is taken, where the equation is simpler to rearrange.",
  },
  "block-on-ramp": {
    steps: {
      a: already("a"),
      mu: [
        ["Start from the equation.", T`a = g(\sin\theta - \mu\cos\theta)`],
        [
          "The bracket is multiplied by $g$. Divide both sides by $g$ to undo that.",
          T`\frac{a}{g} = \sin\theta - \mu\cos\theta`,
        ],
        [
          "Add $\\mu\\cos\\theta$ to both sides to make that term positive.",
          T`\frac{a}{g} + \mu\cos\theta = \sin\theta`,
        ],
        [
          "Subtract $\\frac{a}{g}$ from both sides, so that only the term with $\\mu$ is left on the left.",
          T`\mu\cos\theta = \sin\theta - \frac{a}{g}`,
        ],
        [
          "$\\mu$ is multiplied by $\\cos\\theta$. Divide both sides by $\\cos\\theta$ to undo that.",
          T`\mu = \frac{\sin\theta - a/g}{\cos\theta}`,
        ],
      ],
      theta: [
        ["Start from the equation.", T`a = g(\sin\theta - \mu\cos\theta)`],
        [
          "Divide both sides by $g$.",
          T`\frac{a}{g} = \sin\theta - \mu\cos\theta`,
        ],
        [
          "$\\theta$ appears twice, inside a sine and a cosine, so it cannot be collected by adding and dividing. Instead use the identity that turns the right-hand side into a single sine: $\\sin\\theta - \\mu\\cos\\theta = \\sqrt{1 + \\mu^2}\\,\\sin(\\theta - \\phi)$, where $\\tan\\phi = \\mu$.",
          T`\frac{a}{g} = \sqrt{1 + \mu^2}\;\sin(\theta - \phi), \qquad \phi = \tan^{-1}\mu`,
        ],
        [
          "Divide both sides by $\\sqrt{1 + \\mu^2}$.",
          T`\sin(\theta - \phi) = \frac{a/g}{\sqrt{1 + \mu^2}}`,
        ],
        [
          "Use the inverse sine to get the angle $\\theta - \\phi$ back.",
          T`\theta - \phi = \sin^{-1}\left(\frac{a/g}{\sqrt{1 + \mu^2}}\right)`,
        ],
        [
          "Add $\\phi$ to both sides, writing it as $\\tan^{-1}\\mu$.",
          T`\theta = \sin^{-1}\left(\frac{a/g}{\sqrt{1 + \mu^2}}\right) + \tan^{-1}\mu`,
        ],
      ],
    },
    check: (v, unknown) => {
      if (unknown === "a" && v.mu > Math.tan(v.theta * deg))
        return "The acceleration is negative because μ is greater than tan θ: friction is stronger than the weight's pull down the slope. A block already sliding down would slow at this rate; a block placed at rest, as in the simulation, stays where it is (a = 0).";
      if (unknown === "mu" && (Math.sin(v.theta * deg) - v.a / v.g) / Math.cos(v.theta * deg) < 0)
        return "The block would have to accelerate faster than a frictionless slope allows (g sin θ), so no friction coefficient gives this: it comes out negative.";
      return null;
    },
  },
  "banked-curve": {
    eq: "#tan = v^2 / r g",
    steps: {
      theta: [
        ["Start from the equation.", T`\tan\theta = \frac{v^2}{rg}`],
        [
          "This gives the tangent of the angle, not the angle. Use the inverse tangent ($\\tan^{-1}$ on a calculator) to get the angle back.",
          T`\theta = \tan^{-1}\left(\frac{v^2}{rg}\right)`,
        ],
      ],
    },
    check: (v, unknown) =>
      unknown !== "theta" && Math.tan(v.theta * deg) < 1e-9
        ? "A flat road (0°) gives no sideways force without friction, so no speed or radius fits."
        : null,
  },
  "conical-pendulum": {
    subject: "T",
    eq: "T^2 = #4pi2 L #cos / g",
    before:
      "Square both sides of the equation first, to get rid of the square root: $(2\\pi)^2 = 4\\pi^2$, and squaring a square root leaves what was inside it.",
    finish: {
      T: [
        [
          "$4\\pi^2$ is $(2\\pi)^2$, so its square root is $2\\pi$ and can be written in front of the root.",
          T`T = 2\pi\sqrt{\frac{L\cos\theta}{g}}`,
        ],
      ],
    },
  },
  "vertical-circle": {
    subject: "v",
    eq: "v^2 = g r",
    before:
      "Start one line before the square root is taken, where the equation is simpler to rearrange.",
  },
  "mass-on-spring": {
    subject: "T",
    eq: "T^2 = #4pi2 m / k",
    before:
      "Square both sides of the equation first, to get rid of the square root: $(2\\pi)^2 = 4\\pi^2$, and squaring a square root leaves what was inside it.",
    finish: {
      T: [
        [
          "$4\\pi^2$ is $(2\\pi)^2$, so its square root is $2\\pi$ and can be written in front of the root.",
          T`T = 2\pi\sqrt{\frac{m}{k}}`,
        ],
      ],
    },
  },
  "simple-pendulum": {
    subject: "T",
    eq: "T^2 = #4pi2 L / g",
    before:
      "Square both sides of the equation first, to get rid of the square root: $(2\\pi)^2 = 4\\pi^2$, and squaring a square root leaves what was inside it.",
    finish: {
      T: [
        [
          "$4\\pi^2$ is $(2\\pi)^2$, so its square root is $2\\pi$ and can be written in front of the root.",
          T`T = 2\pi\sqrt{\frac{L}{g}}`,
        ],
      ],
    },
  },
  "collisions-1d": {
    note:
      "The first ball is on the left of the second, and velocities to the right are positive.",
    steps: { v1: already("v_1") },
    check: (v) =>
      v.u1 <= v.u2
        ? "With these velocities the first ball (on the left) never catches the second, so there is no collision: each ball simply keeps its own velocity, and v₁ = u₁."
        : null,
  },
  "power-lines": {
    eq: "Ploss = P^2 R / V^2",
    before:
      "Squaring a fraction squares its top and its bottom, so $\\left(\\frac{P}{V}\\right)^2 = \\frac{P^2}{V^2}$. Write the equation as one fraction.",
    finish: {
      V: [
        [
          "$P^2$ under the square root comes out as $P$ in front of the root.",
          T`V = P\sqrt{\frac{R}{P_{loss}}}`,
        ],
      ],
    },
    check: (v, unknown) => {
      const loss = unknown === "Ploss" ? (v.P / v.V) ** 2 * v.R : v.Ploss;
      return loss >= v.P
        ? "The line would turn more power into heat than is being sent, which cannot happen: at this voltage the line cannot carry this much power."
        : null;
    },
  },
  "ac-generator": {
    eq: "emf = N B A omega",
  },
  "photoelectric-stopping-voltage": {
    steps: {
      Vs: already("V_s"),
      f: [
        ["Start from the equation.", T`V_s = \frac{hf - W}{e}`],
        ["Multiply both sides by $e$ to clear the fraction.", T`eV_s = hf - W`],
        [
          "Add $W$ to both sides, so that only the term with $f$ is left on the right.",
          T`eV_s + W = hf`,
        ],
        [
          "$f$ is multiplied by $h$. Divide both sides by $h$ to undo that.",
          T`\frac{eV_s + W}{h} = f`,
        ],
        ["Swap the sides.", T`f = \frac{eV_s + W}{h}`],
      ],
    },
    check: (v, unknown) =>
      unknown === "Vs" && v.h * v.f - v.W < 0
        ? "The photon energy hf is less than the work function, so no electrons are emitted and there is nothing to stop: a negative stopping voltage has no meaning."
        : null,
  },
};

// Join on what each tool is about and where its equation comes from.
for (const [id, entry] of Object.entries({
  ...mechanics,
  ...fields,
  ...waves,
  ...combined,
}))
  Object.assign((explain[id] ??= {}), entry);
