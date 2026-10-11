// Minitool picture: pendulum.
import { TAU, c, deg, label, val } from "./draw.js";

export default function pendulum(
  ctx,
  { width: w, height: h, values: v, dark },
) {
  const th = Math.min(60, val(v, "theta", 20)) * deg,
    L = h * 0.7,
    px = w / 2,
    py = 16,
    bx = px + L * Math.sin(th),
    by = py + L * Math.cos(th);
  ctx.strokeStyle = c("structure", dark);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px - 40, py);
  ctx.lineTo(px + 40, py);
  ctx.stroke();
  ctx.strokeStyle = c("structure", dark);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = c("ink-soft", dark);
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px, py + L);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = c("body-ball", dark);
  ctx.beginPath();
  ctx.arc(bx, by, 13, 0, TAU);
  ctx.fill();
  label(ctx, "L", (px + bx) / 2 - 12, (py + by) / 2, dark);
}
