// The generic picture every tool has: the unknown plotted against the
// variable `xKey`, with the current point marked.
import { TAU, c, label } from "./draw.js";
import { numberText } from "../format.js";

export default function graph(ctx, o) {
  const { width: w, height: h, tool, values, unknown, xKey, dark } = o;
  const xVar = tool.variables.find((v) => v.key === xKey),
    yVar = tool.variables.find((v) => v.key === unknown);
  if (!xVar || !yVar) return;
  const left = 58,
    right = 14,
    top = 14,
    bottom = 40,
    log = xVar.scale === "log" && xVar.min > 0,
    n = 160,
    xs = [],
    ys = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n,
      x = log
        ? xVar.min * (xVar.max / xVar.min) ** t
        : xVar.min + (xVar.max - xVar.min) * t;
    let y = NaN;
    try {
      y = tool.solve[unknown]({ ...values, [xKey]: x });
    } catch {}
    xs.push(x);
    ys.push(Number.isFinite(y) ? y : NaN);
  }
  const finite = ys.filter(Number.isFinite);
  if (!finite.length) {
    label(ctx, "No values to plot over this range", w / 2, h / 2, dark);
    return;
  }
  let lo = Math.min(...finite),
    hi = Math.max(...finite);
  const ylog = yVar.scale === "log" && lo > 0;
  if (lo === hi) {
    lo -= Math.abs(lo) * 0.5 || 1;
    hi += Math.abs(hi) * 0.5 || 1;
  }
  const X = (x) =>
      left +
      (log
        ? Math.log(x / xVar.min) / Math.log(xVar.max / xVar.min)
        : (x - xVar.min) / (xVar.max - xVar.min)) *
        (w - left - right),
    Y = (y) =>
      h -
      bottom -
      (ylog ? Math.log(y / lo) / Math.log(hi / lo) : (y - lo) / (hi - lo)) *
        (h - top - bottom);
  // Axes and end labels.
  ctx.strokeStyle = c("canvas-grid-major", dark);
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, w - left - right, h - top - bottom);
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillStyle = c("ink-soft", dark);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(numberText(hi), left - 6, top + 4);
  ctx.fillText(numberText(lo), left - 6, h - bottom - 4);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText(numberText(xVar.min), left, h - bottom + 5);
  ctx.textAlign = "right";
  ctx.fillText(numberText(xVar.max), w - right, h - bottom + 5);
  ctx.textAlign = "center";
  ctx.fillText(
    `${xVar.name}${xVar.unit ? ` (${xVar.unit})` : ""}${log ? ", log scale" : ""}`,
    (left + w - right) / 2,
    h - bottom + 20,
  );
  ctx.save();
  ctx.translate(14, (top + h - bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${yVar.name}${yVar.unit ? ` (${yVar.unit})` : ""}`, 0, -6);
  ctx.restore();
  // The curve, broken where there is no value.
  ctx.strokeStyle = c("vector-velocity", dark);
  ctx.lineWidth = 2;
  ctx.beginPath();
  let pen = false;
  for (let i = 0; i <= n; i++) {
    if (!Number.isFinite(ys[i]) || (ylog && ys[i] <= 0)) {
      pen = false;
      continue;
    }
    if (pen) ctx.lineTo(X(xs[i]), Y(ys[i]));
    else ctx.moveTo(X(xs[i]), Y(ys[i]));
    pen = true;
  }
  ctx.stroke();
  // The current values.
  const x = values[xKey],
    y = values[unknown];
  if (Number.isFinite(x) && Number.isFinite(y) && (!ylog || y > 0)) {
    ctx.fillStyle = c("vector-force", dark);
    ctx.beginPath();
    ctx.arc(X(x), Y(Math.min(hi, Math.max(lo, y))), 5, 0, TAU);
    ctx.fill();
  }
}
