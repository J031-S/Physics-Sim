// Minitool picture: projectile.
import { arrow, c, deg, label, val } from "./draw.js";
import { numberText } from "../format.js";

export default function projectile(
  ctx,
  { width: w, height: h, values: v, dark },
) {
  const u = val(v, "u", 10),
    th = val(v, "theta", 45) * deg,
    g = val(v, "g", 9.81),
    R = (u * u * Math.sin(2 * th)) / g,
    H = (u * u * Math.sin(th) ** 2) / (2 * g),
    pad = 30,
    k = Math.min(
      (w - 2 * pad) / Math.max(R, 1e-6),
      (h - 2 * pad) / Math.max(H, 1e-6),
    ),
    x0 = pad,
    y0 = h - pad;
  ctx.strokeStyle = c("canvas-wall", dark);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, y0);
  ctx.lineTo(w, y0);
  ctx.stroke();
  ctx.strokeStyle = c("graph-trace", dark);
  ctx.lineWidth = 2;
  ctx.beginPath();
  const T = (2 * u * Math.sin(th)) / g;
  for (let i = 0; i <= 80; i++) {
    const t = (T * i) / 80,
      x = u * Math.cos(th) * t,
      y = u * Math.sin(th) * t - 0.5 * g * t * t;
    const sx = x0 + x * k,
      sy = y0 - y * k;
    if (i) ctx.lineTo(sx, sy);
    else ctx.moveTo(sx, sy);
  }
  ctx.stroke();
  arrow(
    ctx,
    x0,
    y0,
    x0 + 50 * Math.cos(th),
    y0 - 50 * Math.sin(th),
    c("vector-velocity", dark),
  );
  label(ctx, `R = ${numberText(R)} m`, x0 + (R * k) / 2, y0 + 14, dark);
  label(ctx, `H = ${numberText(H)} m`, x0 + (R * k) / 2, y0 - H * k - 12, dark);
}
