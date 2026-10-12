// Pictures for the minitools. Each draws on a canvas context from the
// tool's current values and labels the quantities it shows with the tool's
// own symbols, values and units (see draw.js); the numbers come from the
// formula, the picture shows the situation they describe.
//
//   draw(ctx, { width, height, values, unknown, tool, xKey, dark })
//
// Every tool gets `graph`; `visual` in its catalogue entry names its own
// picture.
import graph from "./graph.js";
import * as mechanics from "./mechanics.js";
import * as circular from "./circular.js";
import * as fields from "./fields.js";
import * as circuits from "./circuits.js";
import * as waves from "./waves.js";

export const visuals = {
  graph,
  ...mechanics,
  ...circular,
  ...fields,
  ...circuits,
  ...waves,
};
