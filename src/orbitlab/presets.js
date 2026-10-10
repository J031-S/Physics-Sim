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
