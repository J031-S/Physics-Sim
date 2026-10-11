// Minitool picture: field.
import { TAU, c, label } from "./draw.js";

export default function field(ctx, { width: w, height: h, values: v, dark }) {
  const cx = w * 0.35,
    cy = h / 2;
  ctx.strokeStyle = c("field-electric", dark);
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    ctx.beginPath();
    ctx.moveTo(cx + 14 * Math.cos(a), cy + 14 * Math.sin(a));
    ctx.lineTo(cx + 300 * Math.cos(a), cy + 300 * Math.sin(a));
    ctx.stroke();
  }
  ctx.fillStyle = c("charge-positive", dark);
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, TAU);
  ctx.fill();
  const px = w * 0.75;
  ctx.strokeStyle = c("ink", dark);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px, cy, 5, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(cx, cy + 30);
  ctx.lineTo(px, cy + 30);
  ctx.stroke();
  ctx.setLineDash([]);
  label(ctx, "r", (cx + px) / 2, cy + 42, dark);
  void v;
}
