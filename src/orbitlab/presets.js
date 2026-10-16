// Ready-made launches. Each gives the central body and the launch
// conditions as a function of that body's μ = GM and radius; `expect` states
// the textbook result to check against the readouts, and `quoted` holds the
// same numbers in SI so that tests/orbitlab.test.mjs can check the wording.
import { SIDEREAL_DAY, circularSpeed } from "./model.js";

const km = 1e3,
  minute = 60,
  hour = 3600,
  day = 86400;

export const presets = [
  {
    id: "low-earth-orbit",
    body: "earth",
    title: "Low Earth orbit",
    text: "A circular orbit 400 km up, about the height of the International Space Station.",
    expect:
      "Speed 7.67 km/s and period 92.4 min. Kinetic and potential energy are both constant, because the distance never changes.",
    warp: 500,
    launch: (mu, R) => ({
      radius: R + 400 * km,
      speed: circularSpeed(mu, R + 400 * km),
      angle: 0,
    }),
    quoted: { speed: 7.67 * km, period: 92.4 * minute },
  },
  {
    id: "geostationary",
    body: "earth",
    title: "Geostationary orbit",
    text: "The circular orbit whose period is one turn of the Earth (23.93 h), so the satellite stays above one place on the equator.",
    expect:
      "42 160 km from the centre, 3.07 km/s, period 23.93 h. Compare with low Earth orbit: further out is slower.",
    warp: 5000,
    launch(mu) {
      // T = 2π√(r³/μ) solved for r.
      const radius = Math.cbrt((mu * SIDEREAL_DAY ** 2) / (4 * Math.PI ** 2));
      return { radius, speed: circularSpeed(mu, radius), angle: 0 };
    },
    quoted: { radius: 42160 * km, speed: 3.07 * km, period: 23.93 * hour },
  },
  {
    id: "moon-orbit",
    body: "earth",
    title: "The Moon's orbit",
    text: "A circular orbit at the Moon's average distance, 384 400 km.",
    expect:
      "1.02 km/s and 27.5 days. The real Moon takes 27.3 days: it is massive enough to pull the Earth round too, and here the Earth is held still.",
    warp: 200000,
    launch: (mu) => ({
      radius: 384400 * km,
      speed: circularSpeed(mu, 384400 * km),
      angle: 0,
    }),
    quoted: { speed: 1.02 * km, period: 27.5 * day },
  },
  {
    id: "newtons-cannon",
    body: "earth",
    title: "Newton's cannon",
    text: "Fired horizontally at 6 km/s from a mountain 100 km high, with no air. It falls to the ground 1340 km away.",
    expect:
      "Raise the speed and it lands further round. At 7.85 km/s it never lands (a circle); above that an ellipse; at 11.1 km/s it escapes.",
    warp: 50,
    launch: (mu, R) => ({ radius: R + 100 * km, speed: 6 * km, angle: 0 }),
    quoted: {
      range: 1340 * km,
      circular: 7.85 * km,
      escape: 11.1 * km,
    },
  },
  {
    id: "eccentric-ellipse",
    body: "earth",
    title: "Eccentric ellipse (e = 0.7)",
    text: "Launched 400 km up at 10.0 km/s, faster than the circular speed but slower than escape.",
    expect:
      "It climbs to 38 370 km from the centre and takes 9.37 h. Turn on Equal areas: it is fastest when closest, and the twelve areas match.",
    warp: 2000,
    launch: (mu, R) => ({
      radius: R + 400 * km,
      // At periapsis v = v_circular·√(1 + e).
      speed: circularSpeed(mu, R + 400 * km) * Math.sqrt(1.7),
      angle: 0,
    }),
    quoted: {
      speed: 10.0 * km,
      eccentricity: 0.7,
      apoapsis: 38370 * km,
      period: 9.37 * hour,
    },
  },
];

// ---------------------------------------------------------------- sandbox

// Ready-made scenes for the gravity sandbox (nbody.js). Each `build(lab)`
// adds bodies through the lab's own API and then puts the centre of mass at
// rest at the origin, so the system does not drift off the screen; `warp`
// suits it, and `check` is how long tests/gravitylab.test.mjs runs it.
const AU = 1.496e11,
  SUN = { mass: 1.989e30, radius: 6.957e8 };

// The centre of mass to the origin and at rest: every body is shifted by
// the same position and velocity, which changes nothing in their motion
// relative to one another.
function balance(lab) {
  const c = lab.centreOfMass();
  for (const b of lab.list())
    lab.update(b.id, {
      x: b.x - c.x,
      y: b.y - c.y,
      vx: b.vx - c.vx,
      vy: b.vy - c.vy,
    });
}
// A body on a circular orbit round `about`, at `distance` and `angle`
// (radians anticlockwise from +x round it), going anticlockwise.
function orbiting(lab, about, distance, angle, props) {
  const centre = lab.get(about),
    id = lab.add({
      ...props,
      x: centre.x + distance * Math.cos(angle),
      y: centre.y + distance * Math.sin(angle),
    }),
    v = lab.circularVelocity(id, about);
  lab.update(id, { vx: v.vx, vy: v.vy });
  return id;
}
const deg = Math.PI / 180;

export const sandboxPresets = [
  {
    id: "sun-earth-moon",
    title: "Sun, Earth and Moon",
    text: "The real masses and distances. Zoom in on the Earth to see the Moon.",
    expect:
      "The Earth goes round the Sun in a year; the Moon goes round the Earth every 27.3 days. Seen from the Sun, the Moon's path is a slightly wavy circle that never loops back.",
    warp: 1e6,
    check: 365.25 * day,
    build(lab) {
      const sun = lab.add({ name: "Sun", ...SUN, x: 0, y: 0 }),
        earth = orbiting(lab, sun, AU, 0, {
          name: "Earth",
          mass: 5.972e24,
          radius: 6.371e6,
        });
      orbiting(lab, earth, 3.844e8, 90 * deg, {
        name: "Moon",
        mass: 7.342e22,
        radius: 1.737e6,
      });
      balance(lab);
    },
  },
  {
    id: "inner-planets",
    title: "The inner planets",
    text: "Mercury, Venus, Earth and Mars on circular orbits at their mean distances from the Sun.",
    expect:
      "Periods 88, 225, 365 and 687 days: the further out, the slower, with T² ∝ a³ (Kepler's third law).",
    warp: 2e6,
    check: 365.25 * day,
    build(lab) {
      const sun = lab.add({ name: "Sun", ...SUN, x: 0, y: 0 });
      for (const [name, a, mass, radius, angle] of [
        ["Mercury", 0.387, 3.301e23, 2.44e6, 30],
        ["Venus", 0.723, 4.867e24, 6.052e6, 150],
        ["Earth", 1, 5.972e24, 6.371e6, 260],
        ["Mars", 1.524, 6.417e23, 3.39e6, 340],
      ])
        orbiting(lab, sun, a * AU, angle * deg, { name, mass, radius });
      balance(lab);
    },
  },
  {
    id: "binary-stars",
    title: "Binary stars",
    text: "Two stars like the Sun, 1 AU apart, each going round the point midway between them.",
    expect:
      "Neither star is fixed: both go round their centre of mass, on opposite sides of it. Period T = 2π√(a³/G(m₁+m₂)) = 258 days.",
    warp: 1e6,
    check: 258 * day,
    build(lab) {
      const a = lab.add({ name: "Star A", ...SUN, x: -AU / 2, y: 0 }),
        b = lab.add({ name: "Star B", ...SUN, x: AU / 2, y: 0 }),
        v = lab.circularVelocity(b, a);
      lab.update(b, { vx: v.vx, vy: v.vy });
      balance(lab);
    },
  },
  {
    id: "star-and-planet",
    title: "A star's wobble",
    text: "A star with a planet ten times the mass of Jupiter, 1 AU out. Zoom in on the star.",
    expect:
      "The star moves on a small circle of its own, of radius 1.4 million km (about twice its own radius), at 283 m/s, once per orbit of the planet. Astronomers find planets round other stars from this wobble.",
    warp: 1e6,
    check: 365.25 * day,
    build(lab) {
      const star = lab.add({ name: "Star", ...SUN, x: 0, y: 0 });
      orbiting(lab, star, AU, 0, {
        name: "Planet",
        mass: 10 * 1.898e27,
        radius: 7e7,
      });
      balance(lab);
    },
  },
  {
    id: "figure-eight",
    title: "Three stars in a figure of eight",
    text: "Three equal stars chasing one another round one figure-of-eight path (Chenciner and Montgomery, 2000).",
    expect:
      "Each star follows the same figure of eight, a third of a period behind the next. The total momentum stays zero and the energy constant; nudge one star and the pattern soon breaks up.",
    warp: 1e6,
    check: 2.45e7,
    build(lab) {
      // In units with G = m = 1 and a length of 10¹¹ m.
      const L = 1e11,
        M = 1e30,
        V = L / Math.sqrt(L ** 3 / (6.674e-11 * M)),
        p = [0.97000436, -0.24308753],
        v3 = [-0.93240737, -0.86473146];
      for (const [name, x, y, vx, vy] of [
        ["Star A", p[0], p[1], -v3[0] / 2, -v3[1] / 2],
        ["Star B", -p[0], -p[1], -v3[0] / 2, -v3[1] / 2],
        ["Star C", 0, 0, v3[0], v3[1]],
      ])
        lab.add({
          name,
          mass: M,
          radius: 7e8,
          x: x * L,
          y: y * L,
          vx: vx * V,
          vy: vy * V,
        });
      balance(lab);
    },
  },
  {
    id: "jupiter-moons",
    title: "Jupiter and its moons",
    text: "Jupiter with Io, Europa, Ganymede and Callisto at their real distances and masses.",
    expect:
      "Periods 1.77, 3.55, 7.15 and 16.7 days. Io goes round four times while Europa goes round twice and Ganymede once: they are locked in step.",
    warp: 1e5,
    check: 17 * day,
    build(lab) {
      const jupiter = lab.add({
        name: "Jupiter",
        mass: 1.898e27,
        radius: 6.991e7,
        x: 0,
        y: 0,
      });
      for (const [name, a, mass, radius, angle] of [
        ["Io", 4.217e8, 8.932e22, 1.822e6, 0],
        ["Europa", 6.709e8, 4.8e22, 1.561e6, 120],
        ["Ganymede", 1.0704e9, 1.4819e23, 2.634e6, 200],
        ["Callisto", 1.8827e9, 1.0759e23, 2.41e6, 300],
      ])
        orbiting(lab, jupiter, a, angle * deg, { name, mass, radius });
      balance(lab);
    },
  },
];
