// Minitool picture: particle.
import { TAU, arrow, c, label } from "./draw.js";

export default function particle(
  ctx,
  { width: w, height: h, values: v, dark },
) {
  // A charge entering a field region (dots: B out of the screen).
  ctx.fillStyle = c("field-magnetic-tint", dark);
  ctx.globalAlpha = 0.15;
  ctx.fillRect(w * 0.35, 10, w * 0.6, h - 20);
  ctx.globalAlpha = 1;
  ctx.fillStyle = c("field-magnetic", dark);
  for (let x = w * 0.4; x < w * 0.95; x += 26)
    for (let y = 24; y < h - 10; y += 26) {
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, TAU);
      ctx.fill();
    }
  const r = Math.min(h * 0.35, w * 0.3);
  ctx.strokeStyle = c("graph-trace", dark);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h / 2 - r);
  ctx.lineTo(w * 0.35, h / 2 - r);
  ctx.arc(w * 0.35, h / 2, r, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.fillStyle = c("charge-positive", dark);
  ctx.beginPath();
  ctx.arc(w * 0.12, h / 2 - r, 7, 0, TAU);
  ctx.fill();
  arrow(
    ctx,
    w * 0.14,
    h / 2 - r,
    w * 0.26,
    h / 2 - r,
    c("vector-velocity", dark),
  );
  label(ctx, "B out of the screen", w * 0.65, h - 16, dark);
  void v;
}
