// Ready-made scenes. Each `setup` receives a new, empty Sandbox and builds the
// experiment through the public API, so presets cannot drift from the engine.
// `expect` states the textbook result the scene demonstrates; tests check it.
const g = 9.81;
const scene = (sim, { width = 16, height = 9, walls = true, ...settings }) => {
  sim.setViewport({ minX: -width / 2, maxX: width / 2, minY: 0, maxY: height });
  sim.updateSettings({ walls, ...settings });
};
// No losses except the ones the experiment is about.
const ideal = (sim, id, constants = {}) =>
  sim.updateConstants(id, {
    linearDamping: 0,
    angularDamping: 0,
    ...constants,
  });
function body(sim, shape, { x, y, angle = 0, size, ...constants }) {
  // Built mid-scene, clear of the floor and walls, then moved into place.
  const id = sim.add(shape, { x: 0, y: sim.viewport.maxY / 2 });
  if (shape === "wedge") {
    sim.setLock(id, "position", false);
    sim.setLock(id, "rotation", false);
  }
  if (size) sim.resizeBody(id, ...[].concat(size));
  ideal(sim, id, constants);
  sim.setPose(id, { x, y, angle });
  return id;
}
// A pinned ramp rising to the right from (left, 0). `rest` gives the pose of a
// body of half-height `half` sitting on the slope a fraction `t` of the way up.
function ramp(sim, { left, width, degrees, friction = 1 }) {
  const theta = (degrees * Math.PI) / 180,
    height = width * Math.tan(theta),
    id = body(sim, "wedge", {
      x: left + (2 * width) / 3,
      y: height / 3,
      size: [width, height],
      friction,
      restitution: 0,
    });
  sim.setLock(id, "position", true);
  sim.setLock(id, "rotation", true);
  return {
    id,
    theta,
    rest: (t, half) => ({
      x: left + width * t - Math.sin(theta) * (half + 0.001),
      y: height * t + Math.cos(theta) * (half + 0.001),
      angle: theta,
    }),
  };
}
export const presets = [
  {
    id: "free-fall",
    group: "Kinematics",
    title: "Free fall: light and heavy",
    description:
      "A 0.1 kg, a 1 kg and a 50 kg ball are released together from 6 m. With no air resistance they land at the same instant.",
    expect: "All three reach the floor after √(2h/g) ≈ 1.11 s.",
    setup(sim) {
      scene(sim, { gravity: g });
      [0.1, 1, 50].forEach((mass, i) =>
        body(sim, "ball", {
          x: -2 + 2 * i,
          y: 6.3,
          size: 0.6,
          mass,
          restitution: 0,
        }),
      );
    },
  },
  {
    id: "projectile",
    group: "Kinematics",
    title: "Projectile at 45°",
    description:
      "A ball is launched from the floor at 45° with components of 7 m/s each. Turn on velocity vectors to watch the vertical component reverse while the horizontal one stays constant.",
    expect: "Range 2·vx·vy/g ≈ 9.99 m; peak height vy²/2g ≈ 2.50 m.",
    setup(sim) {
      scene(sim, { gravity: g });
      const id = body(sim, "ball", {
        x: -6,
        y: 0.2,
        size: 0.4,
        restitution: 0,
        friction: 1,
      });
      sim.setVelocity(id, { vx: 7, vy: 7 });
    },
  },
  {
    id: "bouncing",
    group: "Energy and momentum",
    title: "Coefficient of restitution",
    description:
      "Three balls fall 4 m with restitution 0.5, 0.8 and 1. Each rebounds to e² of the height it fell from.",
    expect: "First rebounds: 1.00 m, 2.56 m and 4.00 m.",
    setup(sim) {
      scene(sim, { gravity: g });
      [0.5, 0.8, 1].forEach((restitution, i) =>
        body(sim, "ball", { x: -2 + 2 * i, y: 4.3, size: 0.6, restitution }),
      );
    },
  },
  {
    id: "elastic-collision",
    group: "Energy and momentum",
    title: "Elastic collision, unequal masses",
    description:
      "A 1 kg ball slides at 3 m/s into a 3 kg ball at rest on a frictionless floor. Momentum and kinetic energy are both conserved.",
    expect: "After impact: −1.5 m/s and +1.5 m/s.",
    setup(sim) {
      scene(sim, { gravity: g });
      sim.updateFloor({ friction: 0 });
      const a = body(sim, "ball", {
        x: -4,
        y: 0.4,
        friction: 0,
        restitution: 1,
      });
      body(sim, "ball", { x: 0, y: 0.4, mass: 3, friction: 0, restitution: 1 });
      sim.setVelocity(a, { vx: 3 });
    },
  },
  {
    id: "inelastic-collision",
    group: "Energy and momentum",
    title: "Perfectly inelastic collision",
    description:
      "A 2 kg block slides at 3 m/s into a 1 kg block at rest, with restitution 0. They move off together: momentum is conserved but kinetic energy is not.",
    expect: "Common speed 2 m/s; kinetic energy falls from 9 J to 6 J.",
    setup(sim) {
      scene(sim, { gravity: g });
      sim.updateFloor({ friction: 0 });
      const blocks = [
        [-4, 2],
        [0, 1],
      ].map(([x, mass]) => {
        const id = body(sim, "block", {
          x,
          y: 0.4,
          size: [0.8, 0.8],
          mass,
          friction: 0,
          restitution: 0,
        });
        sim.setLock(id, "rotation", true);
        return id;
      });
      sim.setVelocity(blocks[0], { vx: 3 });
    },
  },
  {
    id: "incline-friction",
    group: "Forces",
    title: "Friction on an incline",
    description:
      "A block with μ = 0.3 sits on a 20° ramp. Because tan 20° = 0.36 exceeds μ it slides. Right-click the block and raise its friction above 0.36, then press Reset, and it stays put.",
    expect: "Acceleration g(sin θ − μ cos θ) ≈ 0.59 m/s² down the slope.",
    setup(sim) {
      scene(sim, { gravity: g });
      const r = ramp(sim, { left: -6, width: 10, degrees: 20 });
      body(sim, "block", {
        ...r.rest(0.85, 0.3),
        size: [0.9, 0.6],
        friction: 0.3,
        restitution: 0,
      });
    },
  },
  {
    id: "rolling",
    group: "Rotation",
    title: "Rolling down an incline",
    description:
      "A ball rolls without slipping down a 15° ramp. Part of its energy goes into spin, so it accelerates more slowly than a frictionless block would. Set the ball's friction to 0 to see it slide instead.",
    expect: "Acceleration (2/3) g sin θ ≈ 1.69 m/s² for a disc.",
    setup(sim) {
      scene(sim, { gravity: g });
      const r = ramp(sim, { left: -6, width: 10, degrees: 15 });
      body(sim, "ball", {
        ...r.rest(0.9, 0.3),
        size: 0.6,
        friction: 1,
        restitution: 0,
      });
    },
  },
  {
    id: "balance-beam",
    group: "Rotation",
    title: "Balanced beam",
    description:
      "A 1 kg block 1.5 m from the pivot balances a 3 kg block 0.5 m from it. Pause and drag either block along the beam to unbalance it.",
    expect: "Torques are equal (1 × 1.5 = 3 × 0.5), so the beam stays level.",
    setup(sim) {
      scene(sim, { gravity: g });
      const pivot = body(sim, "ball", { x: 0, y: 1, size: 0.4, friction: 1 });
      sim.setLock(pivot, "position", true);
      sim.setLock(pivot, "rotation", true);
      body(sim, "block", {
        x: 0,
        y: 1.3005,
        size: [4, 0.2],
        mass: 2,
        friction: 1,
        restitution: 0,
      });
      for (const [x, mass] of [
        [-1.5, 1],
        [0.5, 3],
      ])
        body(sim, "block", {
          x,
          y: 1.5515,
          size: [0.3, 0.3],
          mass,
          friction: 1,
          restitution: 0,
        });
    },
  },
  {
    id: "spring-mass",
    group: "Oscillations",
    title: "Mass on a spring",
    description:
      "A 1 kg ball hangs from a 20 N/m spring and is released at the spring's natural length. It oscillates about the point where the spring force equals its weight.",
    expect: "Period 2π√(m/k) ≈ 1.40 s; amplitude mg/k ≈ 0.49 m.",
    setup(sim) {
      scene(sim, { gravity: g });
      const id = body(sim, "ball", { x: 0, y: 5, size: 0.6 }),
        spring = sim.connect("spring", null, id, { x: 0, y: 7 }, null);
      sim.updateLink(spring, { k: 20, damping: 0 });
    },
  },
  {
    id: "pendulum",
    group: "Oscillations",
    title: "Simple pendulum",
    description:
      "A ball on a 3 m rod is released from 10°. For small swings the period depends only on the length and on g, not on the mass or the amplitude.",
    expect: "Period 2π√(L/g) ≈ 3.47 s.",
    setup(sim) {
      scene(sim, { gravity: g });
      const angle = (10 * Math.PI) / 180,
        id = body(sim, "ball", {
          x: 3 * Math.sin(angle),
          y: 7 - 3 * Math.cos(angle),
          size: 0.5,
        });
      sim.connect("rod", null, id, { x: 0, y: 7 }, null);
    },
  },
  {
    id: "atwood",
    group: "Forces",
    title: "Atwood machine",
    description:
      "A 1 kg and a 1.5 kg block hang over a 1 kg pulley wheel. The heavier block falls, and the wheel's rotational inertia slows the whole system.",
    expect: "Acceleration (m₂ − m₁)g / (m₁ + m₂ + M/2) ≈ 1.64 m/s².",
    setup(sim) {
      scene(sim, { gravity: g });
      const wheel = body(sim, "ball", { x: 0, y: 7 }),
        blocks = [
          [-0.4, 1],
          [0.4, 1.5],
        ].map(([x, mass]) =>
          body(sim, "block", {
            x,
            y: 4,
            size: [0.4, 0.4],
            mass,
            restitution: 0,
          }),
        );
      sim.mechanisms.createPulley(blocks[0], wheel, blocks[1]);
    },
  },
  {
    id: "cyclotron",
    group: "Electricity and magnetism",
    title: "Circular motion in a magnetic field",
    description:
      "A 1 C, 1 kg charge moves at 4 m/s through a uniform 2 T field pointing out of the screen, with gravity off. The magnetic force is always perpendicular to the velocity, so the speed never changes.",
    expect: "Radius mv/qB = 2 m; period 2πm/qB ≈ 3.14 s.",
    setup(sim) {
      scene(sim, { gravity: 0, magneticZ: 2 });
      const id = body(sim, "ball", { x: 0, y: 6.5, size: 0.3, charge: 1 });
      sim.setVelocity(id, { vx: 4 });
    },
  },
  {
    id: "velocity-selector",
    group: "Electricity and magnetism",
    title: "Velocity selector",
    description:
      "Three identical charges enter crossed fields (E = 6 N/C up, B = 2 T out of the screen) at 2, 3 and 4 m/s. Only the one whose speed equals E/B feels no net force.",
    expect: "The 3 m/s charge travels straight; the slower curves up, the faster down.",
    setup(sim) {
      scene(sim, { gravity: 0, walls: false });
      // An electric region points along its own angle, so the upward field
      // is a 5 × 8 region turned 90° to cover the same 8 × 5 area.
      for (const [type, strength, angle, width, height] of [
        ["electric", 6, 90, 5, 8],
        ["magnetic", 2, 0, 8, 5],
      ]) {
        const id = sim.fields.add(type, { x: 1, y: 4.5 });
        sim.fields.update(id, {
          shape: "rectangle",
          width,
          height,
          angle,
          strength,
        });
      }
      [2, 3, 4].forEach((vx, i) => {
        const id = body(sim, "ball", {
          x: -5,
          y: 5.5 - i,
          size: 0.3,
          charge: 1,
        });
        sim.setVelocity(id, { vx });
      });
    },
  },
  {
    id: "coulomb-orbit",
    group: "Electricity and magnetism",
    title: "Orbit under an inverse-square force",
    description:
      "A −1 C charge circles a fixed +10 C charge 3 m away, with gravity off and the Coulomb constant set to 1. Nudge it with the Impulse tool to turn the circle into an ellipse.",
    expect: "Circular orbit at v = √(kQq/mr) ≈ 1.83 m/s.",
    setup(sim) {
      scene(sim, {
        gravity: 0,
        walls: false,
        chargeInteractions: true,
        coulombConstant: 1,
        chargeSoftening: 0.01,
      });
      const centre = body(sim, "ball", { x: 0, y: 4.5, size: 0.6, charge: 10 });
      sim.setLock(centre, "position", true);
      const id = body(sim, "ball", { x: 3, y: 4.5, size: 0.3, charge: -1 });
      sim.setVelocity(id, { vy: Math.sqrt(10 / 3) });
    },
  },
];
