// Minitool picture: wave.
import { TAU, arrow, c, label, val } from "./draw.js";

export default function wave(ctx, { width: w, height: h, values: v, dark }) {
  const cycles = Math.max(1, Math.min(6, Math.round(val(v, "n", 2.5) * 1))),
    amp = h * 0.28;
  ctx.strokeStyle = c("canvas-grid-major", dark);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, h / 2);
  ctx.lineTo(w - 10, h / 2);
  ctx.stroke();
  ctx.strokeStyle = c("vector-velocity", dark);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 10; x <= w - 10; x++) {
    const y = h / 2 - amp * Math.sin(((x - 10) / (w - 20)) * TAU * cycles);
    if (x === 10) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  const lambda = (w - 20) / cycles;
  arrow(
    ctx,
    10 + lambda * 0.25,
    18,
    10 + lambda * 1.25,
    18,
    c("ink-soft", dark),
    1.2,
  );
  label(ctx, "λ", 10 + lambda * 0.75, 30, dark);
}
