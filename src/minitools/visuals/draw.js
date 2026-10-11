// Shared pieces of the minitool pictures.
import { color } from "../../site/theme.js";

export const TAU = 2 * Math.PI;
export const c = (name, dark) => color(name, dark);

export function arrow(ctx, x0, y0, x1, y1, colour, width = 2) {
  const a = Math.atan2(y1 - y0, x1 - x0),
    head = Math.min(9, Math.hypot(x1 - x0, y1 - y0) / 2);
  ctx.strokeStyle = ctx.fillStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(a - 0.4), y1 - head * Math.sin(a - 0.4));
  ctx.lineTo(x1 - head * Math.cos(a + 0.4), y1 - head * Math.sin(a + 0.4));
  ctx.closePath();
  ctx.fill();
}
export function label(ctx, text, x, y, dark, align = "center") {
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = c("ink-soft", dark);
  ctx.fillText(text, x, y);
}
export const val = (v, key, fallback) =>
  Number.isFinite(v[key]) ? v[key] : fallback;
export const deg = Math.PI / 180;
