// The explanations of each minitool, by tool id. No DOM.
//
//   origin   "Where it comes from": numbered steps [sentence, LaTeX]. Every
//            step says what is done and why, and changes one thing at a time,
//            so that a student who is unsure of algebra can follow each line
//            from the one before.
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
    origin: [
      [
        "Acceleration is defined as the change in velocity divided by the time it takes. The change in velocity is the final velocity minus the initial velocity.",
        T`a = \frac{v - u}{t}`,
      ],
      [
        "Multiply both sides by $t$ to clear the fraction.",
        T`at = v - u`,
      ],
      [
        "Add $u$ to both sides, so that $v$ is left by itself on the right.",
        T`u + at = v`,
      ],
      [
        "Swap the sides to put $v$ on the left. This holds only while the acceleration stays the same for the whole time.",
        T`v = u + at`,
      ],
    ],
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
    origin: [
      [
        "With a steady acceleration the velocity changes evenly from $u$ to $v$, so the average velocity is halfway between them.",
        T`v_{av} = \frac{u + v}{2}`,
      ],
      [
        "Displacement is average velocity multiplied by time.",
        T`s = \frac{u + v}{2}\,t`,
      ],
      [
        "The final velocity is $v = u + at$. Put $u + at$ in place of $v$.",
        T`s = \frac{u + (u + at)}{2}\,t`,
      ],
      ["Add the two $u$'s on the top line.", T`s = \frac{2u + at}{2}\,t`],
      [
        "Divide each term on the top line by 2: $2u \\div 2 = u$ and $at \\div 2 = \\tfrac{1}{2}at$.",
        T`s = \left(u + \tfrac{1}{2}at\right)t`,
      ],
      [
        "Multiply out the bracket: each term inside is multiplied by $t$, and $t \\times t = t^2$.",
        T`s = ut + \tfrac{1}{2}at^2`,
      ],
    ],
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
    origin: [
      [
        "Start from $v = u + at$ and make $t$ the subject: subtract $u$ from both sides, then divide both sides by $a$.",
        T`t = \frac{v - u}{a}`,
      ],
      [
        "Displacement is average velocity multiplied by time.",
        T`s = \frac{u + v}{2}\,t`,
      ],
      [
        "Put $\\frac{v - u}{a}$ in place of $t$. This is how the time is removed from the equation.",
        T`s = \frac{(v + u)}{2} \times \frac{(v - u)}{a}`,
      ],
      [
        "Multiply the top lines together and the bottom lines together.",
        T`s = \frac{(v + u)(v - u)}{2a}`,
      ],
      [
        "Multiply out the brackets: $v \\times v - v \\times u + u \\times v - u \\times u$. The two middle terms cancel, leaving $v^2 - u^2$.",
        T`s = \frac{v^2 - u^2}{2a}`,
      ],
      ["Multiply both sides by $2a$ to clear the fraction.", T`2as = v^2 - u^2`],
      [
        "Add $u^2$ to both sides and swap the sides.",
        T`v^2 = u^2 + 2as`,
      ],
    ],
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
    origin: [
      [
        "With a steady acceleration the velocity changes evenly from $u$ to $v$, so the average velocity is halfway between them: add them and divide by 2.",
        T`v_{av} = \frac{u + v}{2}`,
      ],
      [
        "Displacement is average velocity multiplied by time.",
        T`s = v_{av}\,t`,
      ],
      [
        "Put $\\frac{u + v}{2}$ in place of $v_{av}$. Dividing by 2 is the same as multiplying by a half.",
        T`s = \tfrac{1}{2}(u + v)t`,
      ],
      [
        "On a velocity–time graph this is the area under the straight line from $u$ to $v$: a trapezium of width $t$.",
        T`\text{area} = \tfrac{1}{2}(u + v) \times t`,
      ],
    ],
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
    origin: [
      [
        "Velocity says how much displacement is covered in each second. To find it, share the whole displacement equally between the seconds taken: divide.",
        T`v_{av} = \frac{s}{t}`,
      ],
      [
        "It is an average: the object may have gone faster and slower on the way. Only the total displacement and the total time matter.",
        T`\text{average velocity} = \frac{\text{total displacement}}{\text{total time}}`,
      ],
      [
        "The units follow from the division: metres divided by seconds.",
        T`\frac{\text{m}}{\text{s}} = \text{m/s}`,
      ],
    ],
  },

  // ---------------------------------------------------------------- forces
  "newtons-second-law": {
    eq: "F = m a",
    origin: [
      [
        "Newton's second law is found by experiment. Doubling the net force on an object doubles its acceleration: acceleration is proportional to force.",
        T`a \propto F`,
      ],
      [
        "Doubling the mass halves the acceleration for the same force: acceleration is inversely proportional to mass.",
        T`a \propto \frac{1}{m}`,
      ],
      [
        "Put the two together. The newton is defined so that no extra constant is needed: 1 N gives 1 kg an acceleration of 1 m/s².",
        T`a = \frac{F}{m}`,
      ],
      [
        "Multiply both sides by $m$ to clear the fraction, and swap the sides.",
        T`F = ma`,
      ],
      [
        "$F$ is the net force: all the forces on the object added together, taking direction into account.",
        T`F_{net} = ma`,
      ],
    ],
  },
  weight: {
    eq: "W = m g",
    origin: [
      [
        "Weight is the force of gravity on an object. Start from Newton's second law.",
        T`F = ma`,
      ],
      [
        "An object falling freely, with only gravity acting, accelerates at $g$. So for a falling object $a = g$, and the force causing it is the weight $W$.",
        T`W = mg`,
      ],
      [
        "Gravity pulls just as hard when the object is at rest on a table, so this is its weight whether or not it is falling.",
        T`W = mg`,
      ],
      [
        "Divide both sides by $m$: $g$ is the weight of each kilogram, which is why it can be given in N/kg as well as m/s².",
        T`g = \frac{W}{m}`,
      ],
    ],
  },
  friction: {
    eq: "Ff = mu N",
    origin: [
      [
        "Experiments with sliding surfaces show that pressing them together twice as hard doubles the friction: friction is proportional to the normal force $N$.",
        T`F_f \propto N`,
      ],
      [
        "A proportion becomes an equation by putting in a constant. Here it is the coefficient of friction $\\mu$, which depends on the two surfaces.",
        T`F_f = \mu N`,
      ],
      [
        "$\\mu$ is a force divided by a force, so it has no unit.",
        T`\mu = \frac{F_f}{N}`,
      ],
      [
        "On level ground with nothing else pushing down, the normal force balances the weight.",
        T`N = mg`,
      ],
    ],
    check: (v, unknown) =>
      unknown === "mu" && v.mu > 1.5
        ? "A coefficient above about 1.5 is unusual: check that the friction force is not larger than these surfaces could give."
        : null,
  },
  "hookes-law": {
    eq: "F = k x",
    origin: [
      [
        "Hang weights on a spring and measure how far it stretches: twice the force gives twice the extension. The force is proportional to the extension.",
        T`F \propto x`,
      ],
      [
        "Put in a constant to make it an equation. The spring constant $k$ is the force needed for each metre of extension, so a stiff spring has a large $k$.",
        T`F = kx`,
      ],
      [
        "$x$ is the extension, not the length: the stretched length minus the natural length.",
        T`x = \text{length} - \text{natural length}`,
      ],
      [
        "The law holds up to the limit of proportionality. Stretched further, a spring no longer returns to its natural length.",
        T`F = kx \quad \text{(small extensions)}`,
      ],
    ],
  },
  torque: {
    eq: "tau = r F #sin",
    origin: [
      [
        "The turning effect of a force is the force multiplied by its perpendicular distance from the pivot.",
        T`\tau = F \times \text{perpendicular distance}`,
      ],
      [
        "If the force is at right angles to the line from the pivot, that distance is simply $r$.",
        T`\tau = rF \quad (\theta = 90^\circ)`,
      ],
      [
        "At any other angle, split the force into two parts. The part along $r$ pulls straight at the pivot and turns nothing; the part at right angles to $r$ is $F\\sin\\theta$.",
        T`F_{\perp} = F\sin\theta`,
      ],
      [
        "Only that part turns the object, so use it in place of $F$.",
        T`\tau = rF\sin\theta`,
      ],
      [
        "Check the extremes: at $90^\\circ$, $\\sin\\theta = 1$ and the torque is greatest; at $0^\\circ$, $\\sin\\theta = 0$ and there is none.",
        T`\sin 90^\circ = 1, \qquad \sin 0^\circ = 0`,
      ],
    ],
    check: (v, unknown) =>
      unknown !== "tau" && Math.sin(v.theta * deg) < 1e-9
        ? "At 0° or 180° the force points straight at or away from the pivot and has no turning effect, so no force or distance could give this torque."
        : null,
  },

  // ---------------------------------------------------------------- momentum
  momentum: {
    eq: "p = m v",
    origin: [
      [
        "Momentum measures how hard it is to stop something moving. It grows with the mass and with the velocity, and is defined as their product.",
        T`p = mv`,
      ],
      [
        "Velocity has a direction, so momentum does too: an object moving the other way has negative momentum.",
        T`p = m \times (-v) = -mv`,
      ],
      [
        "The unit comes from the product: kilograms times metres per second.",
        T`\text{kg} \times \text{m/s} = \text{kg m/s}`,
      ],
    ],
  },
  impulse: {
    eq: "F dt = m dv",
    origin: [
      ["Start from Newton's second law.", T`F = ma`],
      [
        "Acceleration is the change in velocity divided by the time taken. Put that in place of $a$.",
        T`F = m\,\frac{\Delta v}{\Delta t}`,
      ],
      [
        "Multiply both sides by $\\Delta t$ to clear the fraction.",
        T`F\Delta t = m\Delta v`,
      ],
      [
        "The left side is called the impulse. The right side is the change in momentum, because $m\\Delta v = \\Delta(mv)$ when the mass stays the same.",
        T`\text{impulse} = \Delta p`,
      ],
      [
        "So the same change in momentum can come from a large force for a short time or a small force for a long time, which is how crumple zones and airbags reduce the force.",
        T`F = \frac{m\Delta v}{\Delta t}`,
      ],
    ],
  },

  // ---------------------------------------------------------------- energy
  "work-done": {
    eq: "W = F s #cos",
    origin: [
      [
        "Work is done when a force moves something. For a force along the direction of motion it is the force multiplied by the distance moved.",
        T`W = Fs \quad (\theta = 0^\circ)`,
      ],
      [
        "A force at an angle $\\theta$ to the motion can be split into two parts: one along the motion, $F\\cos\\theta$, and one at right angles to it, $F\\sin\\theta$.",
        T`F_{\parallel} = F\cos\theta`,
      ],
      [
        "The part at right angles moves the object nowhere in its own direction, so it does no work. Only the part along the motion counts.",
        T`W = (F\cos\theta) \times s`,
      ],
      ["Write the product in the usual order.", T`W = Fs\cos\theta`],
      [
        "Check: at $90^\\circ$, $\\cos\\theta = 0$, so a force at right angles to the motion does no work.",
        T`\cos 90^\circ = 0 \;\Rightarrow\; W = 0`,
      ],
    ],
    check: (v, unknown) =>
      unknown !== "W" && Math.cos(v.theta * deg) < 1e-9
        ? "At 90° the force is at right angles to the motion and does no work, so no force or distance could give this amount of work."
        : null,
  },
  "kinetic-energy": {
    eq: "Ek = m v^2 / #2",
    before:
      "Half of something is the same as that thing divided by 2, so write the equation as a fraction.",
    origin: [
      [
        "The kinetic energy of a moving object equals the work done to get it moving from rest.",
        T`E_k = W = Fs`,
      ],
      ["The force is given by Newton's second law.", T`F = ma`],
      ["Put $ma$ in place of $F$.", T`E_k = mas`],
      [
        "For an object starting from rest ($u = 0$), the equation $v^2 = u^2 + 2as$ becomes $v^2 = 2as$.",
        T`v^2 = 2as`,
      ],
      [
        "Divide both sides by 2 to find what $as$ equals.",
        T`as = \frac{v^2}{2}`,
      ],
      [
        "Put $\\frac{v^2}{2}$ in place of $as$ in $E_k = m \\times as$.",
        T`E_k = m \times \frac{v^2}{2}`,
      ],
      ["Write it in the usual way.", T`E_k = \tfrac{1}{2}mv^2`],
    ],
  },
  "gravitational-potential-energy": {
    eq: "Ep = m g h",
    origin: [
      [
        "The potential energy gained by lifting an object equals the work done in lifting it.",
        T`E_p = W = Fs`,
      ],
      [
        "To lift it steadily the upward force must equal its weight.",
        T`F = mg`,
      ],
      ["The distance moved is the height gained.", T`s = h`],
      ["Put these in place of $F$ and $s$.", T`E_p = mg \times h = mgh`],
      [
        "This treats $g$ as the same all the way up, which is true near the ground. Far from a planet, use $E_p = -\\frac{GMm}{r}$ instead.",
        T`E_p = mgh \quad \text{(near the surface)}`,
      ],
    ],
  },
  "elastic-potential-energy": {
    eq: "Es = k x^2 / #2",
    before:
      "Half of something is the same as that thing divided by 2, so write the equation as a fraction.",
    origin: [
      [
        "The energy stored in a stretched spring equals the work done in stretching it: force multiplied by distance.",
        T`E_s = W = \text{force} \times \text{distance}`,
      ],
      [
        "But the force is not constant. By Hooke's law it starts at zero and rises steadily to $kx$ at full extension.",
        T`F = kx`,
      ],
      [
        "Because it rises steadily, the average force is halfway between $0$ and $kx$.",
        T`F_{av} = \frac{0 + kx}{2} = \tfrac{1}{2}kx`,
      ],
      [
        "Work is the average force multiplied by the distance stretched, which is $x$.",
        T`E_s = \tfrac{1}{2}kx \times x`,
      ],
      ["Since $x \\times x = x^2$:", T`E_s = \tfrac{1}{2}kx^2`],
      [
        "This is also the area of the triangle under the force–extension graph: half the base $x$ times the height $kx$.",
        T`\text{area} = \tfrac{1}{2} \times x \times kx`,
      ],
    ],
  },
  "power-work-time": {
    eq: "P = W / t",
    origin: [
      [
        "Power says how much work is done in each second. To find it, share the work equally between the seconds taken: divide.",
        T`P = \frac{W}{t}`,
      ],
      [
        "One joule each second is called one watt.",
        T`1\,\text{W} = 1\,\text{J/s}`,
      ],
      [
        "The same work done in half the time needs twice the power.",
        T`\frac{W}{t/2} = \frac{2W}{t} = 2P`,
      ],
    ],
  },
  "power-force-velocity": {
    eq: "P = F v",
    origin: [
      ["Power is work done divided by the time taken.", T`P = \frac{W}{t}`],
      [
        "The work done by a force along the motion is force multiplied by distance. Put $Fs$ in place of $W$.",
        T`P = \frac{Fs}{t}`,
      ],
      [
        "Write the fraction as $F$ multiplied by $\\frac{s}{t}$.",
        T`P = F \times \frac{s}{t}`,
      ],
      [
        "Distance divided by time is the velocity. Put $v$ in place of $\\frac{s}{t}$.",
        T`P = Fv`,
      ],
    ],
  },

  // ---------------------------------------------------------------- circular motion
  "circular-speed": {
    eq: "v = #2pi r / T",
    origin: [
      ["Speed is distance divided by time.", T`v = \frac{\text{distance}}{\text{time}}`],
      [
        "In one lap of a circle the distance is the circumference.",
        T`\text{distance} = 2\pi r`,
      ],
      ["The time for one lap is the period.", T`\text{time} = T`],
      ["Put these into the first line.", T`v = \frac{2\pi r}{T}`],
    ],
  },
  "centripetal-acceleration": {
    eq: "a = v^2 / r",
    origin: [
      [
        "An object going round a circle at a steady speed is still accelerating, because the direction of its velocity keeps changing. Acceleration is change in velocity divided by time.",
        T`a = \frac{\Delta v}{\Delta t}`,
      ],
      [
        "In a short time $\\Delta t$ it moves a distance $v\\Delta t$ round the circle. As a fraction of the radius, that is the angle its direction turns through (in radians).",
        T`\Delta\theta = \frac{v\,\Delta t}{r}`,
      ],
      [
        "Its velocity arrow turns through the same angle while staying the same length $v$, so the change in velocity is $v$ times that angle.",
        T`\Delta v = v\,\Delta\theta = v \times \frac{v\,\Delta t}{r}`,
      ],
      ["Multiply the two $v$'s together.", T`\Delta v = \frac{v^2\,\Delta t}{r}`],
      [
        "Divide both sides by $\\Delta t$ to get the acceleration. The $\\Delta t$ cancels on the right.",
        T`a = \frac{\Delta v}{\Delta t} = \frac{v^2}{r}`,
      ],
      [
        "The change in velocity points towards the centre of the circle, so the acceleration does too: that is what centripetal means.",
        T`a = \frac{v^2}{r} \quad \text{(towards the centre)}`,
      ],
    ],
  },
  "centripetal-force": {
    eq: "F = m v^2 / r",
    origin: [
      ["Start from Newton's second law.", T`F = ma`],
      [
        "An object moving in a circle at speed $v$ has an acceleration towards the centre.",
        T`a = \frac{v^2}{r}`,
      ],
      ["Put $\\frac{v^2}{r}$ in place of $a$.", T`F = m \times \frac{v^2}{r}`],
      ["Write it as one fraction.", T`F = \frac{mv^2}{r}`],
      [
        "This is not an extra force. It is the net force that something real must supply: tension in a string, friction on a tyre, gravity on a satellite.",
        T`F_{net} = \frac{mv^2}{r} \quad \text{(towards the centre)}`,
      ],
    ],
  },

  // ---------------------------------------------------------------- gravitation
  "newtons-gravitation": {
    eq: "F = G M m / r^2",
    origin: [
      [
        "Newton proposed that every mass attracts every other. The force is proportional to each mass, so to their product.",
        T`F \propto Mm`,
      ],
      [
        "It weakens with distance as an inverse square: twice as far apart, a quarter of the force.",
        T`F \propto \frac{1}{r^2}`,
      ],
      ["Put the two proportions together.", T`F \propto \frac{Mm}{r^2}`],
      [
        "A proportion becomes an equation by putting in a constant. $G$ is the same everywhere in the universe and is found by measurement.",
        T`F = \frac{GMm}{r^2}`,
      ],
      [
        "$r$ is measured between the centres of the two bodies, not between their surfaces.",
        T`r = \text{radius of planet} + \text{height above it}`,
      ],
    ],
  },
  "gravitational-field-strength": {
    eq: "g = G M / r^2",
    origin: [
      [
        "Gravitational field strength is the force on each kilogram placed at that point.",
        T`g = \frac{F}{m}`,
      ],
      [
        "The force on a mass $m$ at a distance $r$ from a body of mass $M$ is given by Newton's law of gravitation.",
        T`F = \frac{GMm}{r^2}`,
      ],
      [
        "Put that in place of $F$. Dividing by $m$ is the same as multiplying by $\\frac{1}{m}$.",
        T`g = \frac{GMm}{r^2} \times \frac{1}{m}`,
      ],
      [
        "There is an $m$ on the top and an $m$ on the bottom, so they cancel.",
        T`g = \frac{GM}{r^2}`,
      ],
      [
        "So $g$ depends only on the body making the field and the distance from its centre, not on what is placed there.",
        T`g = \frac{GM}{r^2}`,
      ],
    ],
  },
  "gravitational-potential": {
    origin: [
      [
        "Potential energy is measured from a chosen zero. Far from a planet, the natural choice is zero when the two bodies are infinitely far apart, where the force between them has faded away.",
        T`E_p = 0 \quad \text{at } r = \infty`,
      ],
      [
        "As the satellite comes in from far away, gravity pulls it in and does work on it. Energy that gravity has given out has left the store, so the potential energy falls below zero.",
        T`E_p < 0 \quad \text{closer in}`,
      ],
      [
        "The work is force multiplied by distance, but the force $\\frac{GMm}{r^2}$ changes all the way in. Adding it up over the whole journey (which needs calculus) gives",
        T`\text{work done by gravity} = \frac{GMm}{r}`,
      ],
      ["The potential energy has dropped from zero by that amount.", T`E_p = 0 - \frac{GMm}{r} = -\frac{GMm}{r}`],
      [
        "Check: doubling $r$ halves the size of the negative number, which brings $E_p$ closer to zero, so it rises as the satellite moves away.",
        T`-\frac{GMm}{2r} > -\frac{GMm}{r}`,
      ],
    ],
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
    origin: [
      [
        "Coulomb measured the force between charged spheres. It is proportional to each charge, so to their product.",
        T`F \propto q_1 q_2`,
      ],
      [
        "It weakens with distance as an inverse square: twice as far apart, a quarter of the force.",
        T`F \propto \frac{1}{r^2}`,
      ],
      ["Put the two proportions together.", T`F \propto \frac{q_1 q_2}{r^2}`],
      [
        "A proportion becomes an equation by putting in a constant, here the Coulomb constant $k$.",
        T`F = \frac{kq_1q_2}{r^2}`,
      ],
      [
        "The equation gives the size of the force. Its direction comes from the signs: like charges repel, unlike charges attract.",
        T`F = \frac{kq_1q_2}{r^2}`,
      ],
    ],
  },
  "electric-field-force": {
    eq: "E = F / q",
    origin: [
      [
        "Electric field strength is the force on each coulomb of charge placed at that point. To find it, share the force equally between the coulombs: divide.",
        T`E = \frac{F}{q}`,
      ],
      [
        "Multiply both sides by $q$ to find the force on any charge in a known field.",
        T`F = qE`,
      ],
      [
        "The field points the way a positive charge is pushed. A negative charge is pushed the opposite way.",
        T`F = qE \quad (q > 0: \text{along } E)`,
      ],
    ],
  },
  "point-charge-field": {
    eq: "E = k q / r^2",
    origin: [
      [
        "Field strength is the force on each coulomb. Imagine a small test charge $q_0$ placed at the point.",
        T`E = \frac{F}{q_0}`,
      ],
      [
        "The force on the test charge, a distance $r$ from the charge $q$, is given by Coulomb's law.",
        T`F = \frac{kqq_0}{r^2}`,
      ],
      [
        "Put that in place of $F$. Dividing by $q_0$ is the same as multiplying by $\\frac{1}{q_0}$.",
        T`E = \frac{kqq_0}{r^2} \times \frac{1}{q_0}`,
      ],
      [
        "There is a $q_0$ on the top and a $q_0$ on the bottom, so they cancel.",
        T`E = \frac{kq}{r^2}`,
      ],
      [
        "So the field depends only on the charge that makes it and the distance from it, not on the test charge.",
        T`E = \frac{kq}{r^2}`,
      ],
    ],
  },
  "uniform-field-plates": {
    eq: "E = V / d",
    origin: [
      [
        "Move a charge $q$ from one plate to the other. The potential difference is the energy transferred for each coulomb, so the work done is",
        T`W = qV`,
      ],
      [
        "The same work can be written as force multiplied by distance. The force on the charge is $qE$ and the distance is the gap $d$.",
        T`W = Fd = qEd`,
      ],
      [
        "These are two ways of writing the same work, so they are equal.",
        T`qV = qEd`,
      ],
      ["Divide both sides by $q$. It cancels on each side.", T`V = Ed`],
      [
        "Divide both sides by $d$ to leave $E$ by itself, and swap the sides.",
        T`E = \frac{V}{d}`,
      ],
      [
        "This assumes the field is the same everywhere between the plates, which is true away from their edges when the plates are much wider than the gap.",
        T`E = \frac{V}{d} \quad \text{(uniform field)}`,
      ],
    ],
  },
  "electric-work": {
    eq: "W = q V",
    origin: [
      [
        "Potential difference is defined as the energy transferred for each coulomb of charge that moves between two points.",
        T`V = \frac{W}{q}`,
      ],
      [
        "Multiply both sides by $q$ to clear the fraction, and swap the sides.",
        T`W = qV`,
      ],
      ["One volt is one joule for each coulomb.", T`1\,\text{V} = 1\,\text{J/C}`],
      [
        "The work does not depend on the path taken or on how far apart the points are, only on the charge and the potential difference.",
        T`W = qV`,
      ],
    ],
  },

  // ---------------------------------------------------------------- circuits
  "current-charge": {
    eq: "I = q / t",
    origin: [
      [
        "Current says how much charge passes a point in each second. To find it, share the charge equally between the seconds taken: divide.",
        T`I = \frac{q}{t}`,
      ],
      [
        "One coulomb each second is called one ampere.",
        T`1\,\text{A} = 1\,\text{C/s}`,
      ],
      [
        "Multiply both sides by $t$ to find the charge that has passed.",
        T`q = It`,
      ],
    ],
  },
  "ohms-law": {
    eq: "V = I R",
    origin: [
      [
        "Resistance is defined as the potential difference across a component divided by the current through it: the volts needed for each ampere.",
        T`R = \frac{V}{I}`,
      ],
      [
        "Multiply both sides by $I$ to clear the fraction, and swap the sides.",
        T`V = IR`,
      ],
      [
        "For a metal wire at a steady temperature, $R$ stays the same whatever the current: doubling $V$ doubles $I$. That is Ohm's law.",
        T`I \propto V \quad \text{(constant } R)`,
      ],
    ],
  },
  "electrical-power": {
    eq: "P = V I",
    origin: [
      ["Power is the energy transferred divided by the time taken.", T`P = \frac{W}{t}`],
      [
        "The energy transferred when a charge $q$ moves through a potential difference $V$ is $qV$. Put that in place of $W$.",
        T`P = \frac{qV}{t}`,
      ],
      [
        "Write the fraction as $V$ multiplied by $\\frac{q}{t}$.",
        T`P = V \times \frac{q}{t}`,
      ],
      [
        "Charge divided by time is the current. Put $I$ in place of $\\frac{q}{t}$.",
        T`P = VI`,
      ],
    ],
  },
  "power-current-resistance": {
    eq: "P = I^2 R",
    origin: [
      ["Start from the power equation.", T`P = VI`],
      [
        "For a resistor, the potential difference across it is $V = IR$. Put $IR$ in place of $V$.",
        T`P = (IR) \times I`,
      ],
      ["Since $I \\times I = I^2$:", T`P = I^2R`],
      [
        "Because the current is squared, doubling it makes four times the heating.",
        T`(2I)^2R = 4I^2R`,
      ],
    ],
  },
  "series-resistors": {
    origin: [
      [
        "In series there is only one path, so the same current $I$ flows through every resistor.",
        T`I_1 = I_2 = I_3 = I`,
      ],
      [
        "The supply's potential difference is shared between them: the parts add up to the whole.",
        T`V = V_1 + V_2 + V_3`,
      ],
      [
        "For each resistor $V = IR$. Write each potential difference that way, and write the whole as $IR$, where $R$ is the single resistance that would replace them.",
        T`IR = IR_1 + IR_2 + IR_3`,
      ],
      [
        "Every term has a factor of $I$. Divide both sides by $I$: it cancels from every term.",
        T`R = R_1 + R_2 + R_3`,
      ],
    ],
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
    origin: [
      [
        "In parallel every resistor is connected straight across the supply, so each has the same potential difference $V$.",
        T`V_1 = V_2 = V_3 = V`,
      ],
      [
        "The current from the supply splits between the branches: the parts add up to the whole.",
        T`I = I_1 + I_2 + I_3`,
      ],
      [
        "For each resistor $I = \\frac{V}{R}$. Write each current that way, and write the whole as $\\frac{V}{R}$, where $R$ is the single resistance that would replace them.",
        T`\frac{V}{R} = \frac{V}{R_1} + \frac{V}{R_2} + \frac{V}{R_3}`,
      ],
      [
        "Every term has a factor of $V$. Divide both sides by $V$: it cancels from every term.",
        T`\frac{1}{R} = \frac{1}{R_1} + \frac{1}{R_2} + \frac{1}{R_3}`,
      ],
      [
        "Each extra branch adds to the right-hand side, so $\\frac{1}{R}$ grows and $R$ itself shrinks: the total is always less than the smallest resistor.",
        T`R < R_{smallest}`,
      ],
    ],
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
    origin: [
      [
        "Experiments with beams of charged particles show that a magnetic field pushes on a moving charge. For motion at right angles to the field, the force is proportional to the charge, the speed and the field strength.",
        T`F = qvB \quad (\theta = 90^\circ)`,
      ],
      [
        "This equation is what defines the tesla: a field of 1 T pushes with 1 N on 1 C moving across it at 1 m/s.",
        T`1\,\text{T} = 1\,\frac{\text{N}}{\text{C m/s}}`,
      ],
      [
        "If the charge moves at an angle $\\theta$ to the field, split its velocity into a part along the field and a part across it. Only the part across the field, $v\\sin\\theta$, is pushed.",
        T`v_{\perp} = v\sin\theta`,
      ],
      ["Use that in place of $v$.", T`F = qvB\sin\theta`],
      [
        "The force is at right angles to both the velocity and the field, so it changes the direction of motion but never the speed.",
        T`F \perp v, \qquad F \perp B`,
      ],
    ],
    check: (v, unknown) =>
      unknown !== "F" && Math.sin(v.theta * deg) < 1e-9
        ? "At 0° the charge moves along the field lines and feels no force, so no field or speed could give this force."
        : null,
  },
  "force-on-wire": {
    eq: "F = B I l #sin",
    origin: [
      [
        "A current is a stream of moving charges, and a magnetic field pushes on each one. For a charge $q$ moving at speed $v$ across the field:",
        T`F = qvB`,
      ],
      [
        "Take all the charge $q$ that is inside a length $\\ell$ of the wire. It takes a time $t = \\frac{\\ell}{v}$ to drift out of that length.",
        T`t = \frac{\ell}{v}`,
      ],
      [
        "Current is charge divided by time. Dividing by $\\frac{\\ell}{v}$ is the same as multiplying by $\\frac{v}{\\ell}$.",
        T`I = \frac{q}{t} = \frac{qv}{\ell}`,
      ],
      ["Multiply both sides by $\\ell$.", T`I\ell = qv`],
      [
        "So $qv$ in the force equation can be replaced by $I\\ell$.",
        T`F = BI\ell`,
      ],
      [
        "If the wire is at an angle $\\theta$ to the field, only the part of the field at right angles to the wire pushes on it.",
        T`F = BI\ell\sin\theta`,
      ],
    ],
    check: (v, unknown) =>
      unknown !== "F" && Math.sin(v.theta * deg) < 1e-9
        ? "At 0° the wire runs along the field lines and feels no force, so no field or current could give this force."
        : null,
  },
  "field-of-wire": {
    eq: "B = mu0 I / #2pi r",
    origin: [
      [
        "The field lines of a long straight wire are circles round the wire. Measurements show the field is proportional to the current.",
        T`B \propto I`,
      ],
      [
        "It gets weaker in proportion to the distance: twice as far away, half the field. (Not an inverse square: the wire is a long line, not a point.)",
        T`B \propto \frac{1}{r}`,
      ],
      ["Put the two proportions together.", T`B \propto \frac{I}{r}`],
      [
        "The constant is written $\\frac{\\mu_0}{2\\pi}$. The $2\\pi r$ on the bottom is the circumference of the field line through the point.",
        T`B = \frac{\mu_0 I}{2\pi r}`,
      ],
    ],
  },
  "magnetic-flux": {
    eq: "Phi = B A #cos",
    origin: [
      [
        "Magnetic flux measures how much field passes through a loop. For a field at right angles to the loop it is the field strength multiplied by the area.",
        T`\Phi = BA \quad (\theta = 0^\circ)`,
      ],
      [
        "If the loop is tilted, less field passes through it. $\\theta$ is the angle between the field and the normal to the loop (the line at right angles to its surface).",
        T`\theta = \text{angle between } B \text{ and the normal}`,
      ],
      [
        "Split the field into a part along the normal, $B\\cos\\theta$, which goes through the loop, and a part along its surface, which does not.",
        T`B_{\perp} = B\cos\theta`,
      ],
      ["Use that in place of $B$.", T`\Phi = BA\cos\theta`],
      [
        "Check: when the loop is edge-on to the field, $\\theta = 90^\\circ$ and $\\cos\\theta = 0$, so no flux passes through it.",
        T`\cos 90^\circ = 0 \;\Rightarrow\; \Phi = 0`,
      ],
    ],
    check: (v, unknown) =>
      unknown !== "Phi" && Math.cos(v.theta * deg) < 1e-9
        ? "At 90° the loop is edge-on to the field and no flux passes through it, so no field or area could give this flux."
        : null,
  },
  "faradays-law": {
    origin: [
      [
        "Faraday found that an emf appears in a loop whenever the magnetic flux through it changes, and that its size is the rate at which the flux changes.",
        T`\text{emf in one turn} = \frac{\Delta\Phi}{\Delta t}`,
      ],
      [
        "A coil of $N$ turns is $N$ loops in series, each with the same changing flux, so their emfs add.",
        T`\text{size of emf} = N\,\frac{\Delta\Phi}{\Delta t}`,
      ],
      [
        "The minus sign is Lenz's law: the emf is in the direction that opposes the change making it. Without it, an induced current would add to the change and create energy from nothing.",
        T`\varepsilon = -N\,\frac{\Delta\Phi}{\Delta t}`,
      ],
    ],
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
    origin: [
      [
        "A rod of length $\\ell$ slides at speed $v$ along rails, across a magnetic field. In a time $\\Delta t$ it moves a distance $v\\Delta t$.",
        T`\text{distance} = v\,\Delta t`,
      ],
      [
        "The loop made by the rod and rails grows by a rectangle: the rod's length times the distance moved.",
        T`\Delta A = \ell \times v\,\Delta t`,
      ],
      [
        "The flux through the loop is field times area, so it grows by the field times the extra area.",
        T`\Delta\Phi = B\,\Delta A = B\ell v\,\Delta t`,
      ],
      [
        "By Faraday's law the size of the emf is the change in flux divided by the time taken.",
        T`\varepsilon = \frac{\Delta\Phi}{\Delta t} = \frac{B\ell v\,\Delta t}{\Delta t}`,
      ],
      ["The $\\Delta t$ on the top and bottom cancel.", T`\varepsilon = B\ell v`],
      [
        "This is for a rod moving at right angles to its own length and to the field.",
        T`\varepsilon = B\ell v \quad (B \perp \ell \perp v)`,
      ],
    ],
  },
  transformer: {
    eq: "Vp / Vs = Np / Ns",
    origin: [
      [
        "An alternating current in the primary coil makes a changing flux in the iron core. In an ideal transformer all of that flux passes through every turn of both coils.",
        T`\frac{\Delta\Phi}{\Delta t} \text{ is the same in every turn}`,
      ],
      [
        "By Faraday's law the voltage across each coil is its number of turns times the rate of change of flux. For the primary:",
        T`V_p = N_p\,\frac{\Delta\Phi}{\Delta t}`,
      ],
      ["And for the secondary:", T`V_s = N_s\,\frac{\Delta\Phi}{\Delta t}`],
      [
        "Divide the first equation by the second: left side by left side, right side by right side.",
        T`\frac{V_p}{V_s} = \frac{N_p\,\frac{\Delta\Phi}{\Delta t}}{N_s\,\frac{\Delta\Phi}{\Delta t}}`,
      ],
      [
        "The rate of change of flux is on the top and the bottom, so it cancels.",
        T`\frac{V_p}{V_s} = \frac{N_p}{N_s}`,
      ],
      [
        "A steady (d.c.) current makes no changing flux, so a transformer only works with alternating current.",
        T`\frac{\Delta\Phi}{\Delta t} = 0 \;\Rightarrow\; V_s = 0`,
      ],
    ],
  },

  // ---------------------------------------------------------------- waves
  "wave-equation": {
    eq: "v = f lambda",
    origin: [
      ["Speed is distance divided by time.", T`v = \frac{\text{distance}}{\text{time}}`],
      [
        "In the time of one complete cycle, the period $T$, a wave moves forward by exactly one wavelength.",
        T`v = \frac{\lambda}{T}`,
      ],
      [
        "Frequency is the number of cycles each second, so each cycle takes $\\frac{1}{f}$ seconds.",
        T`T = \frac{1}{f}`,
      ],
      [
        "Put $\\frac{1}{f}$ in place of $T$. Dividing by $\\frac{1}{f}$ is the same as multiplying by $f$.",
        T`v = \lambda \div \frac{1}{f} = \lambda \times f`,
      ],
      ["Write it in the usual order.", T`v = f\lambda`],
    ],
  },
  "period-frequency": {
    eq: "T = 1 / f",
    origin: [
      [
        "Frequency is the number of complete cycles in one second.",
        T`f = \frac{\text{number of cycles}}{\text{time}}`,
      ],
      [
        "The period is the time for one cycle. So in a time $T$ there is exactly 1 cycle.",
        T`f = \frac{1}{T}`,
      ],
      [
        "Multiply both sides by $T$, then divide both sides by $f$.",
        T`T = \frac{1}{f}`,
      ],
      [
        "For example, 50 cycles each second means each cycle lasts one fiftieth of a second.",
        T`T = \frac{1}{50\,\text{Hz}} = 0.02\,\text{s}`,
      ],
    ],
  },
  "snells-law": {
    origin: [
      [
        "Light travels more slowly in glass or water than in air. The refractive index of a medium says how many times slower than in a vacuum.",
        T`n = \frac{c}{v}`,
      ],
      [
        "When a wavefront crosses a boundary at an angle, one end slows down before the other, so the wave swings round: it bends towards the normal on entering the slower medium.",
        T`\theta_2 < \theta_1 \quad \text{when } n_2 > n_1`,
      ],
      [
        "Working through the geometry of the wavefronts gives the ratio of the sines of the two angles as the ratio of the two speeds.",
        T`\frac{\sin\theta_1}{\sin\theta_2} = \frac{v_1}{v_2}`,
      ],
      [
        "From the first line, $v = \\frac{c}{n}$ in each medium. Put those in: the $c$ cancels and the indices swap places.",
        T`\frac{\sin\theta_1}{\sin\theta_2} = \frac{c/n_1}{c/n_2} = \frac{n_2}{n_1}`,
      ],
      [
        "Multiply both sides by $n_1$ and by $\\sin\\theta_2$ to clear both fractions.",
        T`n_1\sin\theta_1 = n_2\sin\theta_2`,
      ],
      [
        "Both angles are measured from the normal (the line at right angles to the boundary), not from the surface.",
        T`\theta = \text{angle from the normal}`,
      ],
    ],
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
    origin: [
      [
        "A string fixed at both ends cannot move there, so a standing wave must have a node at each end.",
        T`\text{node at each end}`,
      ],
      [
        "Nodes are half a wavelength apart, so a whole number $n$ of half-wavelengths must fit exactly into the length.",
        T`L = n \times \frac{\lambda}{2}`,
      ],
      [
        "Make $\\lambda$ the subject: multiply both sides by 2, then divide both sides by $n$.",
        T`\lambda = \frac{2L}{n}`,
      ],
      [
        "The wave equation $v = f\\lambda$ gives the frequency: divide both sides by $\\lambda$.",
        T`f = \frac{v}{\lambda}`,
      ],
      [
        "Put $\\frac{2L}{n}$ in place of $\\lambda$. Dividing by a fraction is the same as multiplying by it turned upside down.",
        T`f = v \div \frac{2L}{n} = v \times \frac{n}{2L}`,
      ],
      ["Write it as one fraction.", T`f_n = \frac{nv}{2L}`],
      [
        "$n = 1$ is the fundamental; $n = 2, 3, \\dots$ are the harmonics, at whole-number multiples of its frequency.",
        T`f_n = n f_1`,
      ],
    ],
  },
  "inverse-square-intensity": {
    eq: "I = P / #4pi r^2",
    origin: [
      [
        "Intensity is the power arriving on each square metre.",
        T`I = \frac{\text{power}}{\text{area}}`,
      ],
      [
        "A small source sends its power out equally in all directions. At a distance $r$ that power is spread over the surface of a sphere of radius $r$.",
        T`\text{area of a sphere} = 4\pi r^2`,
      ],
      ["Put the power $P$ and that area into the first line.", T`I = \frac{P}{4\pi r^2}`],
      [
        "At twice the distance the same power covers a sphere with four times the area, because $(2r)^2 = 4r^2$, so the intensity is a quarter.",
        T`\frac{P}{4\pi (2r)^2} = \frac{1}{4} \times \frac{P}{4\pi r^2}`,
      ],
    ],
  },

  // ---------------------------------------------------------------- modern physics
  "photon-energy": {
    eq: "E = h f",
    origin: [
      [
        "Planck and Einstein found that light delivers its energy in separate packets, called photons, and that the energy of each is proportional to the frequency of the light.",
        T`E \propto f`,
      ],
      [
        "The constant that turns the proportion into an equation is the Planck constant $h$.",
        T`E = hf`,
      ],
      [
        "Brighter light of the same colour has more photons, not bigger ones. Only a higher frequency (bluer light) gives each photon more energy.",
        T`E_{\text{one photon}} = hf`,
      ],
      [
        "Using $v = f\\lambda$ with the speed of light $c$, the frequency is $f = \\frac{c}{\\lambda}$, which gives the energy from the wavelength.",
        T`E = \frac{hc}{\lambda}`,
      ],
    ],
  },
  "photoelectric-effect": {
    origin: [
      [
        "One photon gives all of its energy to one electron in the metal.",
        T`\text{energy given to the electron} = hf`,
      ],
      [
        "The electron must spend some of that energy to break free of the metal. The least it can cost is the work function $W$.",
        T`\text{energy to escape} = W`,
      ],
      [
        "Energy is conserved: what the photon brings equals what the escape costs plus what is left as kinetic energy.",
        T`hf = W + E_k`,
      ],
      [
        "Subtract $W$ from both sides to leave $E_k$ by itself, and swap the sides.",
        T`E_k = hf - W`,
      ],
      [
        "This is the most kinetic energy an electron can have: electrons from deeper in the metal lose more on the way out.",
        T`E_{k,\,max} = hf - W`,
      ],
      [
        "If $hf$ is less than $W$ no electron escapes, however bright the light. The frequency at which $hf = W$ is the threshold frequency.",
        T`f_0 = \frac{W}{h}`,
      ],
    ],
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
    origin: [
      ["A photon has energy $E = hf$.", T`E = hf`],
      [
        "Light also carries momentum. For a photon, momentum is energy divided by the speed of light.",
        T`p = \frac{E}{c} = \frac{hf}{c}`,
      ],
      [
        "From the wave equation $c = f\\lambda$, dividing both sides by $c\\lambda$ gives $\\frac{f}{c} = \\frac{1}{\\lambda}$.",
        T`\frac{f}{c} = \frac{1}{\lambda}`,
      ],
      ["Put $\\frac{1}{\\lambda}$ in place of $\\frac{f}{c}$.", T`p = \frac{h}{\lambda}`],
      [
        "Multiply both sides by $\\lambda$, then divide both sides by $p$.",
        T`\lambda = \frac{h}{p}`,
      ],
      [
        "De Broglie proposed that the same relation holds for particles of matter, with $p = mv$. Electron diffraction showed he was right.",
        T`\lambda = \frac{h}{mv}`,
      ],
    ],
  },
  "mass-energy": {
    eq: "E = m c^2",
    origin: [
      [
        "Einstein's special relativity shows that mass and energy are two measures of the same thing: an object at rest has an energy just because it has mass.",
        T`E \propto m`,
      ],
      [
        "The constant linking them is the speed of light squared.",
        T`E = mc^2`,
      ],
      [
        "$c^2$ is an enormous number, about $9 \\times 10^{16}$, so a tiny mass corresponds to a huge energy.",
        T`c^2 = (3.00 \times 10^{8})^2 = 9.00 \times 10^{16}\ \text{m}^2/\text{s}^2`,
      ],
      [
        "In a nuclear reaction the products have slightly less mass than what went in. That missing mass $\\Delta m$ is the energy released.",
        T`\Delta E = \Delta m\,c^2`,
      ],
    ],
  },
  "time-dilation": {
    origin: [
      [
        "Picture a light clock: a pulse of light bouncing between two mirrors a distance $d$ apart. For someone moving with the clock, one tick (up and back) takes the proper time $t_0$, with light covering $2d$ at speed $c$.",
        T`t_0 = \frac{2d}{c} \quad\Rightarrow\quad d = \frac{ct_0}{2}`,
      ],
      [
        "Now watch the clock fly past at speed $v$. During half a tick, lasting $\\frac{t}{2}$, the mirrors move sideways by $\\frac{vt}{2}$, so the light travels along a longer, sloping path.",
        T`\text{sideways distance} = \frac{vt}{2}`,
      ],
      [
        "Light still travels at $c$ for this observer (that is Einstein's postulate), so the sloping path has length $\\frac{ct}{2}$. The slope, the sideways distance and $d$ make a right-angled triangle. By Pythagoras:",
        T`\left(\frac{ct}{2}\right)^2 = d^2 + \left(\frac{vt}{2}\right)^2`,
      ],
      [
        "Put $\\frac{ct_0}{2}$ in place of $d$.",
        T`\frac{c^2t^2}{4} = \frac{c^2t_0^2}{4} + \frac{v^2t^2}{4}`,
      ],
      ["Multiply every term by 4 to clear the fractions.", T`c^2t^2 = c^2t_0^2 + v^2t^2`],
      [
        "Subtract $v^2t^2$ from both sides to collect the terms with $t$ on the left.",
        T`c^2t^2 - v^2t^2 = c^2t_0^2`,
      ],
      ["Both terms on the left contain $t^2$. Take it out as a common factor.", T`t^2\,(c^2 - v^2) = c^2t_0^2`],
      [
        "Divide both sides by $(c^2 - v^2)$.",
        T`t^2 = \frac{c^2t_0^2}{c^2 - v^2}`,
      ],
      [
        "Divide the top and the bottom of the fraction by $c^2$. On the bottom, $c^2 \\div c^2 = 1$.",
        T`t^2 = \frac{t_0^2}{1 - v^2/c^2}`,
      ],
      ["Take the square root of both sides.", T`t = \frac{t_0}{\sqrt{1 - v^2/c^2}}`],
      [
        "The bottom is always less than 1, so $t$ is always more than $t_0$: the moving clock takes longer over each tick.",
        T`t > t_0`,
      ],
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
    origin: [
      [
        "A spaceship flies at speed $v$ past two posts a distance $L_0$ apart (measured by someone standing beside them). That person times the trip between the posts as $t$.",
        T`L_0 = vt`,
      ],
      [
        "On the ship, both posts pass the same point, so a single clock times the trip: it reads the proper time $t_0$. The crew sees the posts rushing by at $v$, so the distance between them is",
        T`L = vt_0`,
      ],
      [
        "Divide the second equation by the first. The $v$ cancels.",
        T`\frac{L}{L_0} = \frac{vt_0}{vt} = \frac{t_0}{t}`,
      ],
      [
        "Time dilation says $t = \\frac{t_0}{\\sqrt{1 - v^2/c^2}}$. Multiply both sides by the square root and divide both sides by $t$:",
        T`\frac{t_0}{t} = \sqrt{1 - v^2/c^2}`,
      ],
      ["Put that in place of $\\frac{t_0}{t}$.", T`\frac{L}{L_0} = \sqrt{1 - v^2/c^2}`],
      ["Multiply both sides by $L_0$.", T`L = L_0\sqrt{1 - v^2/c^2}`],
      [
        "The square root is always less than 1, so $L$ is less than $L_0$. Only lengths along the direction of motion shrink.",
        T`L < L_0`,
      ],
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
    origin: [
      [
        "A satellite on a circular orbit needs a net force towards the centre of the circle. Gravity is the only force on it, so gravity must be exactly that force.",
        T`\frac{GMm}{r^2} = \frac{mv^2}{r}`,
      ],
      [
        "Both sides have a factor of $m$, the satellite's mass. Divide both sides by $m$: it cancels, so the orbit does not depend on the satellite's mass.",
        T`\frac{GM}{r^2} = \frac{v^2}{r}`,
      ],
      [
        "Multiply both sides by $r$. On the left, $\\frac{r}{r^2} = \\frac{1}{r}$; on the right, the $r$ cancels.",
        T`\frac{GM}{r} = v^2`,
      ],
      [
        "The speed is the distance round the orbit (its circumference) divided by the time for one orbit.",
        T`v = \frac{2\pi r}{T}`,
      ],
      [
        "Square both sides, squaring every factor: $(2\\pi)^2 = 4\\pi^2$.",
        T`v^2 = \frac{4\pi^2 r^2}{T^2}`,
      ],
      [
        "Put that in place of $v^2$ in the third line.",
        T`\frac{GM}{r} = \frac{4\pi^2 r^2}{T^2}`,
      ],
      [
        "Multiply both sides by $T^2$ to bring it off the bottom.",
        T`\frac{GM\,T^2}{r} = 4\pi^2 r^2`,
      ],
      [
        "Multiply both sides by $r$. On the right, $r^2 \\times r = r^3$.",
        T`GM\,T^2 = 4\pi^2 r^3`,
      ],
      ["Divide both sides by $GM$ to leave $T^2$ by itself.", T`T^2 = \frac{4\pi^2}{GM}\,r^3`],
      [
        "For everything orbiting the same body, $\\frac{4\\pi^2}{GM}$ is a fixed number, so $T^2$ is proportional to $r^3$: that is Kepler's third law.",
        T`T^2 \propto r^3`,
      ],
    ],
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
    origin: [
      [
        "A satellite on a circular orbit needs a net force towards the centre of the circle. Gravity is the only force on it, so gravity must be exactly that force.",
        T`\frac{GMm}{r^2} = \frac{mv^2}{r}`,
      ],
      [
        "Both sides have a factor of $m$, the satellite's mass. Divide both sides by $m$: it cancels.",
        T`\frac{GM}{r^2} = \frac{v^2}{r}`,
      ],
      [
        "Multiply both sides by $r$. On the left, $\\frac{r}{r^2} = \\frac{1}{r}$; on the right, the $r$ cancels.",
        T`\frac{GM}{r} = v^2`,
      ],
      ["Swap the sides.", T`v^2 = \frac{GM}{r}`],
      ["Take the square root of both sides.", T`v = \sqrt{\frac{GM}{r}}`],
      [
        "A bigger $r$ makes the fraction smaller, so satellites further out move more slowly.",
        T`r \uparrow \;\Rightarrow\; v \downarrow`,
      ],
    ],
  },
  "geostationary-orbit": {
    eq: "T^2 = #4pi2 r^3 / G M",
    before:
      "Start from Kepler's third law, which is this equation before the cube root is taken.",
    origin: [
      [
        "A geostationary satellite stays above the same point on the equator, so it must go round exactly once each time the planet turns once.",
        T`T_{orbit} = T_{planet}`,
      ],
      [
        "The period and radius of any circular orbit are linked by Kepler's third law.",
        T`T^2 = \frac{4\pi^2}{GM}\,r^3`,
      ],
      [
        "Multiply both sides by $GM$ to clear the fraction.",
        T`GM\,T^2 = 4\pi^2 r^3`,
      ],
      [
        "Divide both sides by $4\\pi^2$ to leave $r^3$ by itself, and swap the sides.",
        T`r^3 = \frac{GM\,T^2}{4\pi^2}`,
      ],
      [
        "$r$ is cubed. Take the cube root of both sides to undo that.",
        T`r = \sqrt[3]{\frac{GM\,T^2}{4\pi^2}}`,
      ],
      [
        "$r$ is measured from the planet's centre. The height above the ground is $r$ minus the planet's radius $R$.",
        T`h = r - R`,
      ],
      [
        "For the Earth, $T$ is one sidereal day (86 164 s: one turn measured against the stars), which gives $r$ of about 42 200 km, or 35 800 km above the ground.",
        T`h \approx 4.22 \times 10^7 - 6.37 \times 10^6 = 3.58 \times 10^7\ \text{m}`,
      ],
    ],
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
    origin: [
      [
        "An object's total energy is its kinetic energy plus its gravitational potential energy (which is negative).",
        T`E_{total} = \tfrac{1}{2}mv^2 - \frac{GMm}{r}`,
      ],
      [
        "With no engine and no air, the total stays the same all the way out. Infinitely far away the potential energy is zero, and an object that only just escapes arrives there with no speed left, so its total is zero.",
        T`E_{total} = 0 + 0 = 0`,
      ],
      [
        "So at launch the total must already be zero.",
        T`\tfrac{1}{2}mv^2 - \frac{GMm}{r} = 0`,
      ],
      [
        "Add $\\frac{GMm}{r}$ to both sides.",
        T`\tfrac{1}{2}mv^2 = \frac{GMm}{r}`,
      ],
      [
        "Both sides have a factor of $m$. Divide both sides by $m$: it cancels, so the escape speed is the same for any object.",
        T`\tfrac{1}{2}v^2 = \frac{GM}{r}`,
      ],
      ["Multiply both sides by 2 to remove the half.", T`v^2 = \frac{2GM}{r}`],
      ["Take the square root of both sides.", T`v = \sqrt{\frac{2GM}{r}}`],
      [
        "Compare with the speed for a circular orbit at the same distance, $\\sqrt{\\frac{GM}{r}}$: the escape speed is $\\sqrt{2}$ times bigger.",
        T`v_{escape} = \sqrt{2} \times v_{orbit}`,
      ],
    ],
  },
  "cyclotron-motion": {
    eq: "r = m v / q B",
    note: SCALED,
    origin: [
      [
        "A charge moving at right angles to a magnetic field feels a force at right angles to its velocity.",
        T`F = qvB`,
      ],
      [
        "A force that is always at right angles to the motion cannot speed the charge up or slow it down. It only turns it, so the charge moves in a circle at a steady speed.",
        T`F \perp v`,
      ],
      [
        "Motion in a circle needs a net force towards the centre.",
        T`F = \frac{mv^2}{r}`,
      ],
      [
        "The magnetic force is the only force, so it must be exactly that force.",
        T`qvB = \frac{mv^2}{r}`,
      ],
      [
        "Both sides have a factor of $v$. Divide both sides by $v$: on the right, $\\frac{v^2}{v} = v$.",
        T`qB = \frac{mv}{r}`,
      ],
      ["Multiply both sides by $r$ to bring it off the bottom.", T`qBr = mv`],
      ["Divide both sides by $qB$ to leave $r$ by itself.", T`r = \frac{mv}{qB}`],
      [
        "The time for one circle is the circumference divided by the speed. Putting in $r$, the $v$ cancels: the period does not depend on the speed.",
        T`T = \frac{2\pi r}{v} = \frac{2\pi}{v} \times \frac{mv}{qB} = \frac{2\pi m}{qB}`,
      ],
    ],
  },
  "velocity-selector": {
    eq: "v = E / B",
    note: SCALED,
    origin: [
      [
        "A charge passes through a region with an electric field and a magnetic field at right angles to each other and to its path. The electric field pushes it one way.",
        T`F_E = qE`,
      ],
      [
        "The magnetic field is arranged to push it the opposite way.",
        T`F_B = qvB`,
      ],
      [
        "The charge goes straight through only if the two forces are equal and cancel.",
        T`qE = qvB`,
      ],
      [
        "Both sides have a factor of $q$. Divide both sides by $q$: it cancels, so the selected speed is the same for any charge.",
        T`E = vB`,
      ],
      ["Divide both sides by $B$ to leave $v$ by itself, and swap the sides.", T`v = \frac{E}{B}`],
      [
        "A faster charge feels a bigger magnetic force (it depends on $v$) and is bent one way; a slower one is bent the other way. Only charges at this speed get through.",
        T`v > \frac{E}{B}: \; F_B > F_E`,
      ],
    ],
  },
  "mass-spectrometer": {
    subject: "r",
    eq: "r^2 = #2 m V / q B^2",
    before:
      "Square both sides of the equation first, to get rid of the square root: $\\left(\\frac{1}{B}\\right)^2 = \\frac{1}{B^2}$, and squaring a square root leaves what was inside it.",
    note: SCALED,
    origin: [
      [
        "First the ion is accelerated from rest through a potential difference $V$. The work done on it becomes its kinetic energy.",
        T`qV = \tfrac{1}{2}mv^2`,
      ],
      ["Multiply both sides by 2 to remove the half.", T`2qV = mv^2`],
      ["Divide both sides by $m$ to leave $v^2$ by itself.", T`v^2 = \frac{2qV}{m}`],
      ["Take the square root of both sides.", T`v = \sqrt{\frac{2qV}{m}}`],
      [
        "Then it enters a magnetic field, where the magnetic force bends it into a circle (see Charged particle in a magnetic field).",
        T`r = \frac{mv}{qB}`,
      ],
      [
        "Put the expression for $v$ in place of $v$.",
        T`r = \frac{m}{qB}\sqrt{\frac{2qV}{m}}`,
      ],
      [
        "To tidy this, move $\\frac{m}{q}$ inside the square root. Anything moved inside a square root must be squared: $\\frac{m}{q} = \\sqrt{\\frac{m^2}{q^2}}$.",
        T`r = \frac{1}{B}\sqrt{\frac{m^2}{q^2} \times \frac{2qV}{m}}`,
      ],
      [
        "Inside the root, cancel one $m$ from top and bottom ($\\frac{m^2}{m} = m$) and one $q$ ($\\frac{q}{q^2} = \\frac{1}{q}$).",
        T`r = \frac{1}{B}\sqrt{\frac{2mV}{q}}`,
      ],
      [
        "For the same charge, field and voltage, a heavier ion has a larger radius. That is how the instrument separates masses.",
        T`r \propto \sqrt{m}`,
      ],
    ],
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
    origin: [
      [
        "A charge $q$ moves through a potential difference $V$. Potential difference is energy for each coulomb, so the work done on the charge is",
        T`W = qV`,
      ],
      [
        "Starting from rest in a vacuum, all of that work becomes kinetic energy.",
        T`qV = \tfrac{1}{2}mv^2`,
      ],
      ["Multiply both sides by 2 to remove the half.", T`2qV = mv^2`],
      [
        "Divide both sides by $m$ to leave $v^2$ by itself, and swap the sides.",
        T`v^2 = \frac{2qV}{m}`,
      ],
      ["Take the square root of both sides.", T`v = \sqrt{\frac{2qV}{m}}`],
      [
        "The speed does not depend on how far apart the plates are, only on the potential difference between them.",
        T`v = \sqrt{\frac{2qV}{m}}`,
      ],
    ],
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
    origin: [
      [
        "The potential difference across the plates makes a uniform field in the gap.",
        T`E = \frac{V}{d}`,
      ],
      ["The field pushes on the charge with a steady force.", T`F = qE = \frac{qV}{d}`],
      [
        "By Newton's second law that gives a steady acceleration, straight across the plates. Dividing by $m$ puts $m$ on the bottom.",
        T`a = \frac{F}{m} = \frac{qV}{md}`,
      ],
      [
        "Nothing pushes the charge along the plates, so it keeps its entry speed $u$ in that direction. The time to pass plates of length $L$ is distance divided by speed.",
        T`t = \frac{L}{u}`,
      ],
      [
        "Across the plates it starts with no velocity and accelerates steadily, so $s = ut + \\tfrac{1}{2}at^2$ with zero starting velocity gives the deflection.",
        T`y = \tfrac{1}{2}at^2`,
      ],
      [
        "Put in the acceleration and the time. Squaring $\\frac{L}{u}$ squares the top and the bottom.",
        T`y = \tfrac{1}{2} \times \frac{qV}{md} \times \frac{L^2}{u^2}`,
      ],
      [
        "Multiply the top lines together and the bottom lines together.",
        T`y = \frac{qVL^2}{2mdu^2}`,
      ],
      [
        "The two motions are independent, just as for a ball thrown sideways under gravity, so the path is a parabola.",
        T`y \propto t^2`,
      ],
    ],
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
    origin: [
      [
        "A charged oil drop hangs between two horizontal plates. Its weight pulls it down.",
        T`W = mg`,
      ],
      [
        "The potential difference across the plates makes a uniform field in the gap.",
        T`E = \frac{V}{d}`,
      ],
      ["The field pushes on the drop's charge. The plates are connected so that this force is upwards.", T`F = qE = \frac{qV}{d}`],
      [
        "The voltage is adjusted until the drop hangs still. Then the net force on it is zero, so the upward and downward forces are equal.",
        T`\frac{qV}{d} = mg`,
      ],
      ["Multiply both sides by $d$ to clear the fraction.", T`qV = mgd`],
      ["Divide both sides by $V$ to leave $q$ by itself.", T`q = \frac{mgd}{V}`],
      [
        "Millikan found that every drop's charge was a whole number of the same small amount, the charge of one electron.",
        T`q = n \times 1.60 \times 10^{-19}\,\text{C}`,
      ],
    ],
  },
  "projectile-range": {
    eq: "R = u^2 #sin2 / g",
    origin: [
      [
        "Split the launch velocity into a horizontal part and a vertical part. The two motions can then be worked out separately.",
        T`u_x = u\cos\theta, \qquad u_y = u\sin\theta`,
      ],
      [
        "Vertically, gravity gives an acceleration of $-g$ (downwards). Use $s = ut + \\tfrac{1}{2}at^2$ for the height after a time $t$.",
        T`y = u\sin\theta\;t - \tfrac{1}{2}gt^2`,
      ],
      [
        "It lands when it is back at launch height, so set $y = 0$.",
        T`0 = u\sin\theta\;t - \tfrac{1}{2}gt^2`,
      ],
      [
        "Both terms contain $t$. Take it out as a common factor.",
        T`0 = t\left(u\sin\theta - \tfrac{1}{2}gt\right)`,
      ],
      [
        "A product is zero only if one of its factors is zero. $t = 0$ is the launch, so the landing is when the bracket is zero.",
        T`u\sin\theta - \tfrac{1}{2}gt = 0`,
      ],
      [
        "Add $\\tfrac{1}{2}gt$ to both sides, multiply both sides by 2, then divide both sides by $g$.",
        T`t = \frac{2u\sin\theta}{g}`,
      ],
      [
        "Horizontally nothing pushes on it (no air resistance), so it keeps a steady speed. Distance is speed multiplied by time.",
        T`R = u\cos\theta \times t`,
      ],
      [
        "Put in the time of flight.",
        T`R = u\cos\theta \times \frac{2u\sin\theta}{g} = \frac{2u^2\sin\theta\cos\theta}{g}`,
      ],
      [
        "A trigonometric identity says $2\\sin\\theta\\cos\\theta = \\sin 2\\theta$. Use it to tidy the top line.",
        T`R = \frac{u^2\sin 2\theta}{g}`,
      ],
      [
        "$\\sin 2\\theta$ is greatest (equal to 1) when $2\\theta = 90^\\circ$, so the longest range is at $45^\\circ$.",
        T`R_{max} = \frac{u^2}{g} \quad \text{at } \theta = 45^\circ`,
      ],
    ],
  },
  "falling-without-friction": {
    subject: "v",
    eq: "v^2 = #2 g h",
    before:
      "Start one line before the square root is taken, where the equation is simpler to rearrange.",
    origin: [
      [
        "With no friction or air resistance, no energy is lost: the gravitational potential energy lost in falling a height $h$ all becomes kinetic energy.",
        T`mgh = \tfrac{1}{2}mv^2`,
      ],
      [
        "Both sides have a factor of $m$. Divide both sides by $m$: it cancels, so every object reaches the same speed whatever its mass.",
        T`gh = \tfrac{1}{2}v^2`,
      ],
      ["Multiply both sides by 2 to remove the half, and swap the sides.", T`v^2 = 2gh`],
      ["Take the square root of both sides.", T`v = \sqrt{2gh}`],
      [
        "The same result comes from $v^2 = u^2 + 2as$ with $u = 0$, $a = g$ and $s = h$. Using energy shows it also holds on a slope or a curved track, as long as there is no friction.",
        T`v^2 = 0^2 + 2gh`,
      ],
    ],
  },
  "block-on-ramp": {
    origin: [
      [
        "Three forces act on a block sliding down a ramp at angle $\\theta$: its weight $mg$ straight down, the normal force $N$ at right angles to the slope, and friction along the slope.",
        T`mg, \quad N, \quad F_f`,
      ],
      [
        "Split the weight into a part along the slope and a part at right angles to it.",
        T`\text{along: } mg\sin\theta, \qquad \text{into the slope: } mg\cos\theta`,
      ],
      [
        "The block does not move into or off the slope, so the forces at right angles to the slope balance.",
        T`N = mg\cos\theta`,
      ],
      [
        "Sliding friction is $\\mu$ times the normal force, and it acts up the slope, against the sliding.",
        T`F_f = \mu N = \mu mg\cos\theta`,
      ],
      [
        "Along the slope, the net force is the weight's part down the slope minus the friction. Newton's second law sets it equal to $ma$.",
        T`ma = mg\sin\theta - \mu mg\cos\theta`,
      ],
      [
        "Every term has a factor of $m$. Divide both sides by $m$: it cancels, so the acceleration does not depend on the mass.",
        T`a = g\sin\theta - \mu g\cos\theta`,
      ],
      ["Both terms on the right contain $g$. Take it out as a common factor.", T`a = g(\sin\theta - \mu\cos\theta)`],
      [
        "If $\\mu$ is greater than $\\tan\\theta$ the bracket is negative: a block already sliding slows down, and a block at rest stays where it is.",
        T`\mu > \tan\theta \;\Rightarrow\; a < 0`,
      ],
    ],
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
    origin: [
      [
        "A car goes round a banked curve with no friction. Only two forces act on it: its weight $mg$ straight down, and the normal force $N$ at right angles to the road, which is tilted at the banking angle $\\theta$.",
        T`mg, \quad N`,
      ],
      [
        "Split $N$ into a vertical part and a horizontal part. Because the road is tilted by $\\theta$, $N$ leans $\\theta$ away from the vertical.",
        T`\text{vertical: } N\cos\theta, \qquad \text{horizontal: } N\sin\theta`,
      ],
      [
        "The car does not move up or down, so the vertical forces balance.",
        T`N\cos\theta = mg`,
      ],
      [
        "The car moves in a horizontal circle, so it needs a net force towards the centre. The horizontal part of $N$ is the only horizontal force, so it must be that force.",
        T`N\sin\theta = \frac{mv^2}{r}`,
      ],
      [
        "Divide the second equation by the first: left side by left side, right side by right side. This removes the unknown $N$.",
        T`\frac{N\sin\theta}{N\cos\theta} = \frac{mv^2}{r} \div mg`,
      ],
      [
        "On the left the $N$ cancels and $\\frac{\\sin\\theta}{\\cos\\theta} = \\tan\\theta$. On the right, dividing by $mg$ puts it on the bottom, and the $m$ cancels.",
        T`\tan\theta = \frac{v^2}{rg}`,
      ],
      [
        "The mass has cancelled, so the right banking angle is the same for a lorry and a bicycle at the same speed.",
        T`\tan\theta = \frac{v^2}{rg}`,
      ],
    ],
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
    origin: [
      [
        "A mass on a string of length $L$ swings round in a horizontal circle, with the string at an angle $\\theta$ to the vertical. Two forces act on it: its weight $mg$ and the tension $F_T$ along the string.",
        T`mg, \quad F_T`,
      ],
      [
        "Split the tension into a vertical part and a horizontal part.",
        T`\text{vertical: } F_T\cos\theta, \qquad \text{horizontal: } F_T\sin\theta`,
      ],
      [
        "The mass stays at the same height, so the vertical forces balance.",
        T`F_T\cos\theta = mg`,
      ],
      [
        "The radius of the circle is the horizontal distance from the mass to the line below the support.",
        T`r = L\sin\theta`,
      ],
      [
        "The horizontal part of the tension is the only horizontal force, so it is the centripetal force. With speed $v = \\frac{2\\pi r}{T}$, the centripetal force $\\frac{mv^2}{r}$ becomes $\\frac{4\\pi^2 mr}{T^2}$.",
        T`F_T\sin\theta = \frac{4\pi^2 m\,L\sin\theta}{T^2}`,
      ],
      [
        "Both sides have a factor of $\\sin\\theta$. Divide both sides by it.",
        T`F_T = \frac{4\pi^2 mL}{T^2}`,
      ],
      [
        "Put this in place of $F_T$ in the vertical equation.",
        T`\frac{4\pi^2 mL}{T^2}\cos\theta = mg`,
      ],
      [
        "Divide both sides by $m$: it cancels. Then multiply both sides by $T^2$ to bring it off the bottom.",
        T`4\pi^2 L\cos\theta = gT^2`,
      ],
      ["Divide both sides by $g$, and swap the sides.", T`T^2 = \frac{4\pi^2 L\cos\theta}{g}`],
      [
        "Take the square root of both sides. The square root of $4\\pi^2$ is $2\\pi$.",
        T`T = 2\pi\sqrt{\frac{L\cos\theta}{g}}`,
      ],
    ],
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
    origin: [
      [
        "A mass on a string is whirled in a vertical circle. At the top, both forces on it point down, towards the centre: its weight $mg$ and the tension $F_T$.",
        T`F_{net} = F_T + mg`,
      ],
      [
        "Moving in a circle of radius $r$ at speed $v$ needs a net force towards the centre.",
        T`F_T + mg = \frac{mv^2}{r}`,
      ],
      [
        "Subtract $mg$ from both sides to see what the tension must be.",
        T`F_T = \frac{mv^2}{r} - mg`,
      ],
      [
        "A string can pull but it cannot push, so the tension cannot be negative. The slowest possible speed is the one where the tension has just fallen to zero.",
        T`0 = \frac{mv^2}{r} - mg`,
      ],
      ["Add $mg$ to both sides.", T`mg = \frac{mv^2}{r}`],
      [
        "Both sides have a factor of $m$. Divide both sides by $m$: it cancels.",
        T`g = \frac{v^2}{r}`,
      ],
      ["Multiply both sides by $r$, and swap the sides.", T`v^2 = gr`],
      ["Take the square root of both sides.", T`v_{min} = \sqrt{gr}`],
      [
        "Any slower than this at the top and the string goes slack: the mass falls inside the circle.",
        T`v < \sqrt{gr} \;\Rightarrow\; \text{string goes slack}`,
      ],
    ],
  },
  "mass-on-spring": {
    subject: "T",
    eq: "T^2 = #4pi2 m / k",
    before:
      "Square both sides of the equation first, to get rid of the square root: $(2\\pi)^2 = 4\\pi^2$, and squaring a square root leaves what was inside it.",
    origin: [
      [
        "When the mass is a distance $x$ from its rest position, the spring pulls it back with a force proportional to $x$. The minus sign says the force is always towards the rest position.",
        T`F = -kx`,
      ],
      ["Newton's second law gives its acceleration.", T`ma = -kx`],
      ["Divide both sides by $m$.", T`a = -\frac{k}{m}\,x`],
      [
        "An acceleration proportional to the displacement and directed back towards the middle is the definition of simple harmonic motion, which is written with an angular frequency $\\omega$.",
        T`a = -\omega^2 x`,
      ],
      [
        "Compare the two lines: they match if",
        T`\omega^2 = \frac{k}{m}`,
      ],
      ["Take the square root of both sides.", T`\omega = \sqrt{\frac{k}{m}}`],
      [
        "One full oscillation is $2\\pi$ radians, so the period is $2\\pi$ divided by $\\omega$. Dividing by a square root of a fraction turns the fraction upside down.",
        T`T = \frac{2\pi}{\omega} = 2\pi\sqrt{\frac{m}{k}}`,
      ],
      [
        "The amplitude does not appear: a bigger swing takes the same time. A heavier mass or a weaker spring takes longer.",
        T`T \propto \sqrt{m}, \qquad T \propto \frac{1}{\sqrt{k}}`,
      ],
    ],
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
    origin: [
      [
        "When the pendulum is at an angle $\\theta$ from the vertical, the part of its weight along its curved path pulls it back towards the middle.",
        T`F = -mg\sin\theta`,
      ],
      [
        "For small angles (measured in radians), $\\sin\\theta$ is very nearly equal to $\\theta$ itself. At $10^\\circ$ the difference is only half a per cent.",
        T`\sin\theta \approx \theta`,
      ],
      [
        "An angle in radians is arc length divided by radius. The bob is a distance $x$ along the arc and the radius is the length $L$.",
        T`\theta = \frac{x}{L}`,
      ],
      ["Put these into the first line.", T`F \approx -mg\,\frac{x}{L}`],
      [
        "Newton's second law, $F = ma$, gives the acceleration. Divide both sides by $m$: it cancels, so the mass does not matter.",
        T`a = -\frac{g}{L}\,x`,
      ],
      [
        "An acceleration proportional to the displacement and directed back towards the middle is simple harmonic motion, $a = -\\omega^2 x$. Comparing the two:",
        T`\omega^2 = \frac{g}{L}`,
      ],
      [
        "The period is $2\\pi$ divided by $\\omega$. Dividing by a square root of a fraction turns the fraction upside down.",
        T`T = \frac{2\pi}{\omega} = 2\pi\sqrt{\frac{L}{g}}`,
      ],
      [
        "Because of the small-angle step, this is accurate only for small swings. At $20^\\circ$ the real period is about 0.8% longer.",
        T`T = 2\pi\sqrt{\frac{L}{g}} \quad \text{(small swings)}`,
      ],
    ],
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
    origin: [
      [
        "No outside force acts along the line during the collision, so the total momentum before equals the total momentum after.",
        T`m_1u_1 + m_2u_2 = m_1v_1 + m_2v_2`,
      ],
      [
        "The coefficient of restitution $e$ compares how fast the balls separate with how fast they approached. $e = 1$ is perfectly elastic (no kinetic energy lost); $e = 0$ means they stick together.",
        T`v_2 - v_1 = e(u_1 - u_2)`,
      ],
      [
        "That is two equations with two unknowns, $v_1$ and $v_2$. From the second, add $v_1$ to both sides to get $v_2$ by itself.",
        T`v_2 = v_1 + e(u_1 - u_2)`,
      ],
      [
        "Put this in place of $v_2$ in the momentum equation.",
        T`m_1u_1 + m_2u_2 = m_1v_1 + m_2\big(v_1 + e(u_1 - u_2)\big)`,
      ],
      [
        "Multiply out the bracket: $m_2$ multiplies each term inside.",
        T`m_1u_1 + m_2u_2 = m_1v_1 + m_2v_1 + em_2u_1 - em_2u_2`,
      ],
      [
        "Collect the terms with $v_1$ on the right, and move the others to the left by subtracting $em_2u_1$ and adding $em_2u_2$ on both sides.",
        T`m_1u_1 - em_2u_1 + m_2u_2 + em_2u_2 = m_1v_1 + m_2v_1`,
      ],
      [
        "Take out common factors: $u_1$ from the first pair, $m_2u_2$ from the second pair, and $v_1$ on the right.",
        T`(m_1 - em_2)u_1 + (1 + e)m_2u_2 = (m_1 + m_2)v_1`,
      ],
      [
        "Divide both sides by $(m_1 + m_2)$ to leave $v_1$ by itself.",
        T`v_1 = \frac{(m_1 - em_2)u_1 + (1 + e)m_2u_2}{m_1 + m_2}`,
      ],
      [
        "Swapping the labels 1 and 2 in the same working gives the second ball's velocity.",
        T`v_2 = \frac{(m_2 - em_1)u_2 + (1 + e)m_1u_1}{m_1 + m_2}`,
      ],
    ],
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
    origin: [
      [
        "A power station sends out power $P$ at a voltage $V$. Power is voltage times current, so the current in the line is found by dividing both sides of $P = VI$ by $V$.",
        T`I = \frac{P}{V}`,
      ],
      [
        "That current flows through the line, which has resistance $R$. The power turned into heat in a resistance is",
        T`P_{loss} = I^2R`,
      ],
      ["Put $\\frac{P}{V}$ in place of $I$.", T`P_{loss} = \left(\frac{P}{V}\right)^2 R`],
      [
        "Squaring the fraction squares the top and the bottom.",
        T`P_{loss} = \frac{P^2R}{V^2}`,
      ],
      [
        "$V^2$ is on the bottom, so sending the same power at ten times the voltage cuts the loss a hundredfold.",
        T`\frac{P^2R}{(10V)^2} = \frac{1}{100} \times \frac{P^2R}{V^2}`,
      ],
      [
        "Transformers make this possible: a step-up transformer raises the voltage for the line and a step-down transformer lowers it again for homes.",
        T`\frac{V_p}{V_s} = \frac{N_p}{N_s}`,
      ],
    ],
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
    origin: [
      [
        "A coil of area $A$ turns at a steady angular speed $\\omega$ in a magnetic field $B$. After a time $t$ it has turned through an angle $\\omega t$, so the flux through each turn is",
        T`\Phi = BA\cos\omega t`,
      ],
      [
        "By Faraday's law the emf in $N$ turns is $-N$ times the rate at which that flux changes.",
        T`\varepsilon = -N\,\frac{\Delta\Phi}{\Delta t}`,
      ],
      [
        "The rate of change of $\\cos\\omega t$ is $-\\omega\\sin\\omega t$ (a result from calculus: the cosine changes fastest where it crosses zero, which is where the sine is largest).",
        T`\frac{\Delta\Phi}{\Delta t} = -BA\omega\sin\omega t`,
      ],
      [
        "Put that in. The two minus signs multiply to a plus.",
        T`\varepsilon = NBA\omega\sin\omega t`,
      ],
      [
        "The sine swings between $-1$ and $+1$, so the emf alternates, and its greatest value is when $\\sin\\omega t = 1$.",
        T`\varepsilon_0 = NBA\omega`,
      ],
      [
        "Turning the coil faster raises both the peak emf and the frequency, since $\\omega = 2\\pi f$.",
        T`\varepsilon_0 = 2\pi f\,NBA`,
      ],
    ],
  },
  "photoelectric-stopping-voltage": {
    origin: [
      [
        "The fastest electrons leave the metal with the kinetic energy given by Einstein's photoelectric equation.",
        T`E_k = hf - W`,
      ],
      [
        "A collector plate is made negative so that it repels them. An electron with charge $e$ that climbs through a potential difference $V$ loses kinetic energy $eV$.",
        T`\text{energy lost} = eV`,
      ],
      [
        "The stopping voltage $V_s$ is the one that only just stops the fastest electrons: it takes away exactly all of their kinetic energy.",
        T`eV_s = E_k`,
      ],
      ["Put $hf - W$ in place of $E_k$.", T`eV_s = hf - W`],
      ["Divide both sides by $e$ to leave $V_s$ by itself.", T`V_s = \frac{hf - W}{e}`],
      [
        "A graph of $V_s$ against $f$ is a straight line with gradient $\\frac{h}{e}$, which is how the Planck constant was first measured this way.",
        T`V_s = \frac{h}{e}\,f - \frac{W}{e}`,
      ],
    ],
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
