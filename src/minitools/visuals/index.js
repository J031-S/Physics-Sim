// Pictures for the minitools, one module each. Each draws on a canvas
// context from the tool's current values: simple and clear, to be refined
// later. They show the situation only; the numbers come from the formula and
// the simulation.
//
//   draw(ctx, { width, height, values, unknown, tool, xKey, dark })
//
// Every tool gets `graph`; `visual` in its catalogue entry names another.
import graph from "./graph.js";
import circle from "./circle.js";
import projectile from "./projectile.js";
import orbit from "./orbit.js";
import particle from "./particle.js";
import ramp from "./ramp.js";
import spring from "./spring.js";
import wave from "./wave.js";
import circuit from "./circuit.js";
import field from "./field.js";
import pendulum from "./pendulum.js";

export const visuals = {
  graph,
  circle,
  projectile,
  orbit,
  particle,
  ramp,
  spring,
  wave,
  circuit,
  field,
  pendulum,
};
