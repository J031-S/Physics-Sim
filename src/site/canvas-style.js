// Canvas parts of a developer scheme: line weights, arrowheads, the grid line
// style and the canvas label font. With no scheme every value is the
// theme.js default and nothing here changes what is drawn.
import { value } from "./theme.js";
import { fontStack } from "./surface.js";

const lineWidth = Object.getOwnPropertyDescriptor(
    globalThis.CanvasRenderingContext2D?.prototype ?? {},
    "lineWidth",
  ),
  font = Object.getOwnPropertyDescriptor(
    globalThis.CanvasRenderingContext2D?.prototype ?? {},
    "font",
  );

// Vector arrows and field lines are drawn this many times their designed
// width (on top of the overall canvas line weight); arrowheads this much
// larger.
export const vectorWeight = () => value("canvas-vector-line");
export const fieldLineWeight = () => value("canvas-field-line");
export const arrowheadScale = () => value("canvas-arrowhead");

// The scene canvas of a page: every line width is scaled by the canvas line
// weight, and label fonts follow the scheme's canvas font, size, weight and
// letter-spacing. Done by wrapping the context's own lineWidth and font, so
// the drawing code needs no change.
export function styleCanvas(ctx) {
  if (
    !lineWidth?.set ||
    !font?.set ||
    !(ctx instanceof CanvasRenderingContext2D)
  )
    return ctx;
  Object.defineProperty(ctx, "lineWidth", {
    configurable: true,
    get() {
      return lineWidth.get.call(this) / value("canvas-line");
    },
    set(v) {
      lineWidth.set.call(this, v * value("canvas-line"));
    },
  });
  Object.defineProperty(ctx, "font", {
    configurable: true,
    get() {
      return font.get.call(this);
    },
    set(v) {
      font.set.call(this, canvasFont(v));
      const spacing = value("letter-spacing-canvas");
      if ("letterSpacing" in this)
        this.letterSpacing = spacing ? spacing + "em" : "0px";
    },
  });
  return ctx;
}
// A canvas font string ("600 10.5px system-ui, sans-serif") in the scheme's
// canvas font.
export function canvasFont(spec) {
  const family = value("font-canvas"),
    scale = value("font-size-canvas"),
    weight = value("font-weight-canvas");
  if (family === "default" && scale === 100 && weight === 600) return spec;
  const m = /^(.*?)(\d+(?:\.\d+)?)px\s+(.+)$/.exec(spec);
  if (!m) return spec;
  const [, before, size, stack] = m,
    style = before.replace(/\b(bold|normal|[1-9]00)\b/g, "").trim();
  return [
    style,
    weight === 600 ? before.match(/\b(bold|[1-9]00)\b/)?.[0] : weight,
    ((Number(size) * scale) / 100).toFixed(2) + "px",
    family === "default" ? stack : fontStack(family),
  ]
    .filter(Boolean)
    .join(" ");
}

// Before stroking grid lines that each start at the canvas edge: dotted or
// crossed lines in the scheme's grid style. `step` is the spacing in pixels
// of the lines that cross these, and `first` the distance from the start of
// each line to a crossing. Returns true if a dash was set (call endGrid).
export function gridDash(ctx, step, first) {
  const style = value("grid-style");
  if (style === "dotted") ctx.setLineDash([1.5, 3.5]);
  else if (style === "crosses" && step > 6) {
    const arm = Math.min(5, step / 4);
    ctx.setLineDash([2 * arm, step - 2 * arm]);
    ctx.lineDashOffset = arm - first;
  } else return false;
  return true;
}
export function endGrid(ctx) {
  if (value("grid-style") === "solid") return;
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
}
