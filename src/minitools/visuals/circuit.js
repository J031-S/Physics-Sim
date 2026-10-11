// Minitool picture: circuit.
import { arrow, c, label } from "./draw.js";

export default function circuit(ctx, { width: w, height: h, values: v, dark }) {
  const l = w * 0.2,
    r = w * 0.8,
    t = h * 0.25,
    b = h * 0.78;
  ctx.strokeStyle = c("ink", dark);
  ctx.lineWidth = 2;
  ctx.strokeRect(l, t, r - l, b - t);
  // Cell on the left side.
  ctx.fillStyle = c("canvas-bg", dark);
  ctx.fillRect(l - 6, (t + b) / 2 - 14, 12, 28);
  ctx.beginPath();
  ctx.moveTo(l - 16, (t + b) / 2 - 6);
  ctx.lineTo(l + 16, (t + b) / 2 - 6);
  ctx.moveTo(l - 8, (t + b) / 2 + 6);
  ctx.lineTo(l + 8, (t + b) / 2 + 6);
  ctx.stroke();
  // Resistor on the top.
  ctx.fillStyle = c("canvas-bg", dark);
  ctx.fillRect((l + r) / 2 - 34, t - 10, 68, 20);
  ctx.strokeRect((l + r) / 2 - 34, t - 10, 68, 20);
  arrow(ctx, r - 40, t + 16, r - 10, t + 16, c("circuit-current", dark));
  label(ctx, "I", r - 25, t + 30, dark);
  label(ctx, "R", (l + r) / 2, t - 22, dark);
  void v;
}
