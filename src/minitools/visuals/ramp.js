// Minitool picture: ramp.
import { arrow, c, deg, label, val } from "./draw.js";
import { numberText } from "../format.js";

export default function ramp(ctx, { width: w, height: h, values: v, dark }) {
  const th = Math.max(2, Math.min(60, val(v, "theta", 30))) * deg,
    base = w * 0.7,
    x0 = w * 0.15,
    y0 = h - 24,
    rise = Math.min(base * Math.tan(th), h - 50),
    run = rise / Math.tan(th);
  ctx.fillStyle = c("body-wedge", dark);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 + run, y0);
  ctx.lineTo(x0 + run, y0 - rise);
  ctx.closePath();
  ctx.fill();
  const bx = x0 + run * 0.6,
    by = y0 - rise * 0.6;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-th);
  ctx.fillStyle = c("body-block", dark);
  ctx.fillRect(-14, -28, 28, 28);
  ctx.restore();
  arrow(ctx, bx, by - 14, bx, by + 40, c("vector-force", dark));
  label(ctx, "mg", bx + 10, by + 46, dark, "left");
  label(ctx, `θ = ${numberText(th / deg)}°`, x0 + 40, y0 - 10, dark, "left");
}
