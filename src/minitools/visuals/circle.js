// Minitool picture: circle.
import { TAU, arrow, c, label, val } from "./draw.js";
import { numberText } from "../format.js";

export default function circle(ctx, { width: w, height: h, values: v, dark }) {
  const r = Math.min(w, h) * 0.34,
    cx = w / 2,
    cy = h / 2;
  ctx.strokeStyle = c("ink-soft", dark);
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = c("structure", dark);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - r);
  ctx.stroke();
  ctx.fillStyle = c("body-ball", dark);
  ctx.beginPath();
  ctx.arc(cx, cy - r, 9, 0, TAU);
  ctx.fill();
  arrow(ctx, cx, cy - r, cx + 60, cy - r, c("vector-velocity", dark));
  arrow(ctx, cx, cy - r + 12, cx, cy - r + 50, c("vector-force", dark));
  label(ctx, "v", cx + 70, cy - r, dark);
  label(ctx, "F, a towards the centre", cx, cy - r + 64, dark);
  label(ctx, `r = ${numberText(val(v, "r", 1))} m`, cx, cy + r + 16, dark);
}
