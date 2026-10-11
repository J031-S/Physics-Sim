// Minitool picture: spring.
import { TAU, c, label, val } from "./draw.js";
import { numberText } from "../format.js";

export default function spring(ctx, { width: w, height: h, values: v, dark }) {
  const x = val(v, "x", 0.5),
    top = 16,
    natural = h * 0.35,
    stretch = Math.min(h * 0.4, natural * Math.min(2, Math.abs(x))),
    end = top + natural + stretch,
    cx = w / 2;
  ctx.strokeStyle = c("canvas-wall", dark);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 40, top);
  ctx.lineTo(cx + 40, top);
  ctx.stroke();
  ctx.strokeStyle = c("link", dark);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(cx, top);
  for (let i = 1; i <= 14; i++)
    ctx.lineTo(cx + (i % 2 ? 12 : -12), top + ((end - top) * i) / 15);
  ctx.lineTo(cx, end);
  ctx.stroke();
  ctx.fillStyle = c("body-ball", dark);
  ctx.beginPath();
  ctx.arc(cx, end + 14, 14, 0, TAU);
  ctx.fill();
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = c("canvas-soft", dark);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx + 30, top + natural);
  ctx.lineTo(cx + 90, top + natural);
  ctx.moveTo(cx + 30, end);
  ctx.lineTo(cx + 90, end);
  ctx.stroke();
  ctx.setLineDash([]);
  label(ctx, "natural length", cx + 95, top + natural, dark, "left");
  label(ctx, `x = ${numberText(x)} m`, cx + 95, end, dark, "left");
}
