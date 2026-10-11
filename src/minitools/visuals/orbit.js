// Minitool picture: orbit.
import { TAU, arrow, c, label, val } from "./draw.js";

export default function orbit(ctx, { width: w, height: h, values: v, dark }) {
  const cx = w / 2,
    cy = h / 2,
    r = Math.min(w, h) * 0.38,
    R = Math.max(10, Math.min(r * 0.6, r * (6.371e6 / val(v, "r", 1.3e7))));
  ctx.fillStyle = c("orbit-body", dark);
  ctx.strokeStyle = c("accent-text", dark);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = c("ink-soft", dark);
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = c("field-electric", dark);
  ctx.beginPath();
  ctx.arc(cx, cy - r, 6, 0, TAU);
  ctx.fill();
  arrow(ctx, cx, cy - r, cx + 55, cy - r, c("vector-velocity", dark));
  arrow(ctx, cx, cy - r + 9, cx, cy - r + 45, c("vector-force", dark));
  label(ctx, "M", cx, cy, dark);
  label(ctx, "r", cx + 8, cy - r / 2, dark, "left");
}
