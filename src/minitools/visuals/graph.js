// The generic picture every tool has: the unknown plotted against the
// variable `xKey`, with the current point marked, a readable scale on both
// axes, and a dashed line wherever the curve runs off to infinity (an
// asymptote).
import { TAU, c, label, symbolRuns } from "./draw.js";

const SUPER = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const power = (e) =>
  "10" +
  String(e)
    .replace("-", "⁻")
    .replace(/\d/g, (d) => SUPER[d]);
// A number on an axis: short, and in powers of ten when large or small.
export function tickText(x) {
  if (x === 0) return "0";
  const size = Math.abs(x);
  if (size >= 0.01 && size < 1e4)
    return String(Number(x.toPrecision(3))).replace("-", "−");
  const e = Math.floor(Math.log10(size) + 1e-9),
    m = Number((x / 10 ** e).toPrecision(2));
  if (m === 1) return power(e);
  if (m === -1) return "−" + power(e);
  return `${String(m).replace("-", "−")}×${power(e)}`;
}
// About `count` round values from lo to hi.
export function ticksBetween(lo, hi, count = 5) {
  const span = hi - lo;
  if (!(span > 0)) return [lo];
  const raw = span / count,
    mag = 10 ** Math.floor(Math.log10(raw)),
    step = [1, 2, 2.5, 5, 10].find((s) => s * mag >= raw) * mag,
    out = [];
  for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + step * 1e-9; k++)
    out.push(Math.abs(k * step) < step * 1e-9 ? 0 : k * step);
  return out;
}
// Powers of ten from lo to hi, thinned to about `count`; with 1, 2 and 5 in
// each decade when the range is under two decades.
export function logTicks(lo, hi, count = 6) {
  const first = Math.ceil(Math.log10(lo) - 1e-9),
    last = Math.floor(Math.log10(hi) + 1e-9),
    out = [];
  if (last - first < 1) {
    for (let e = first - 1; e <= last + 1; e++)
      for (const m of [1, 2, 5]) {
        const x = m * 10 ** e;
        if (x >= lo * (1 - 1e-9) && x <= hi * (1 + 1e-9)) out.push(x);
      }
    return out.length >= 2 ? out : ticksBetween(lo, hi, 4);
  }
  const every = Math.max(1, Math.ceil((last - first + 1) / count));
  for (let e = first; e <= last; e += every) out.push(10 ** e);
  return out;
}

/**
 * The curve as samples, and where it has vertical asymptotes. No drawing,
 * so it can be tested. Returns { xs, ys, asymptotes: [x], lo, hi } with
 * [lo, hi] the range of y worth showing (`current`, the present value of
 * the unknown, is always inside it).
 */
export function curve(
  solve,
  xVar,
  values,
  xKey,
  { extend = null, current = NaN } = {},
) {
  const log = xVar.scale === "log" && xVar.min > 0,
    min = xVar.min,
    max = extend !== null ? Math.max(xVar.max, extend) : xVar.max,
    n = 480,
    at = (x) => {
      let y = NaN;
      try {
        y = solve({ ...values, [xKey]: x });
      } catch {}
      return Number.isFinite(y) ? y : NaN;
    },
    xs = [],
    ys = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    xs.push(log ? min * (max / min) ** t : min + (max - min) * t);
    ys.push(at(xs[i]));
  }
  const finite = ys.filter(Number.isFinite);
  if (!finite.length) return { xs, ys, asymptotes: [], lo: 0, hi: 1, min, max };
  const sizes = finite.map(Math.abs).sort((a, b) => a - b),
    typical = sizes[Math.floor(sizes.length / 2)] || sizes[sizes.length - 1];
  const asymptotes = [];
  const add = (x) => {
    if (!asymptotes.some((a) => Math.abs(a - x) <= 1e-6 * (max - min)))
      asymptotes.push(x);
  };
  // Inside the range: the curve leaps from one infinity to the other, or
  // has a point with no value between two very large ones.
  for (let i = 1; i <= n; i++) {
    const a = ys[i - 1],
      b = ys[i];
    if (
      Number.isFinite(a) &&
      Number.isFinite(b) &&
      a * b < 0 &&
      Math.min(Math.abs(a), Math.abs(b)) > 8 * typical
    ) {
      // Where 1/y passes through zero, by bisection.
      let l = xs[i - 1],
        r = xs[i];
      for (let k = 0; k < 50; k++) {
        const m = (l + r) / 2,
          y = at(m);
        if (!Number.isFinite(y)) {
          l = r = m;
          break;
        }
        if (y * a > 0) l = m;
        else r = m;
      }
      add((l + r) / 2);
    } else if (
      i < n &&
      Number.isNaN(b) &&
      Number.isFinite(a) &&
      Number.isFinite(ys[i + 1]) &&
      Math.min(Math.abs(a), Math.abs(ys[i + 1])) > 8 * typical
    )
      add(xs[i]);
  }
  // At an end of the range: no value there, and growing towards it.
  const grows = (i, step) => {
    const a = Math.abs(ys[i + step]),
      b = Math.abs(ys[i + 2 * step]),
      d = Math.abs(ys[i + 3 * step]);
    return (
      // (No value at the end itself, or one a hundred times its neighbour:
      // 1/cos 90° is not quite infinite in floating point.)
      (Number.isNaN(ys[i]) || Math.abs(ys[i]) > 100 * a) &&
      a > b &&
      b > d &&
      a > 8 * typical
    );
  };
  // (A range that starts just above zero is running off at zero itself.)
  if (grows(0, 1))
    add(xs[0] > 0 && xs[0] < 0.01 * (max - min) && !log ? 0 : xs[0]);
  if (grows(n, -1)) add(xs[n]);
  // What to show: everything, unless the curve runs off to infinity, when
  // the middle nine tenths of its values keeps its shape readable.
  let lo = Math.min(...finite),
    hi = Math.max(...finite);
  if (asymptotes.length) {
    const sorted = [...finite].sort((a, b) => a - b),
      q = (f) => sorted[Math.round(f * (sorted.length - 1))];
    lo = q(0.06);
    hi = q(0.94);
    // Keep zero in view when the curve lies to one side of it.
    if (lo > 0) lo = Math.min(lo, 0);
    if (hi < 0) hi = Math.max(hi, 0);
    if (Number.isFinite(current)) {
      lo = Math.min(lo, current);
      hi = Math.max(hi, current);
    }
  }
  return { xs, ys, asymptotes, lo, hi, min, max };
}

export default function graph(ctx, o) {
  const { width: w, height: h, tool, values, unknown, xKey, dark } = o;
  const xVar = tool.variables.find((v) => v.key === xKey),
    yVar = tool.variables.find((v) => v.key === unknown);
  if (!xVar || !yVar) return;
  const left = 62,
    right = 16,
    top = 16,
    bottom = 44,
    log = xVar.scale === "log" && xVar.min > 0;
  // A stated asymptote just beyond the slider's range (v = c) is brought
  // into view.
  const stated = (tool.asymptotes ?? [])
    .filter((a) => a.x === xKey && (!a.y || a.y === unknown))
    .map((a) => ({ at: a.at(values), label: a.label }))
    .filter((a) => Number.isFinite(a.at));
  const beyond = stated.find(
    (a) => a.at > xVar.max && a.at < xVar.max * 1.05 + 1e-12,
  );
  const data = curve(
    tool.solve[unknown],
    xVar,
    values,
    xKey,
    { extend: beyond ? beyond.at : null, current: values[unknown] },
  );
  const { xs, ys, min, max } = data;
  if (!ys.some(Number.isFinite)) {
    label(ctx, "No values to plot over this range", w / 2, h / 2, dark);
    return;
  }
  const asymptotes = data.asymptotes.map((x) => ({ at: x, label: null }));
  for (const s of stated)
    if (!asymptotes.some((a) => Math.abs(a.at - s.at) < 1e-3 * (max - min)))
      asymptotes.push(s);
    else
      asymptotes.find(
        (a) => Math.abs(a.at - s.at) < 1e-3 * (max - min),
      ).label = s.label;
  let { lo, hi } = data;
  const ylog = yVar.scale === "log" && lo > 0 && !asymptotes.length;
  if (lo === hi) {
    lo -= Math.abs(lo) * 0.5 || 1;
    hi += Math.abs(hi) * 0.5 || 1;
  }
  if (!ylog) {
    // A little room above and below.
    const pad = (hi - lo) * 0.06;
    lo -= lo === 0 ? 0 : pad;
    hi += hi === 0 ? 0 : pad;
  }
  const pw = w - left - right,
    ph = h - top - bottom,
    X = (x) =>
      left +
      (log ? Math.log(x / min) / Math.log(max / min) : (x - min) / (max - min)) *
        pw,
    Y = (y) =>
      h -
      bottom -
      (ylog ? Math.log(y / lo) / Math.log(hi / lo) : (y - lo) / (hi - lo)) * ph;

  // Scales: round values, a faint line across at each.
  // At least four values on a linear axis, so that a point between two
  // lines can be read off.
  const linear = (a, z, count) => {
    const ticks = ticksBetween(a, z, count);
    return ticks.length >= 4 ? ticks : ticksBetween(a, z, 2 * count);
  };
  const xt = log ? logTicks(min, max) : linear(min, max, pw > 380 ? 6 : 4),
    yt = ylog ? logTicks(lo, hi, 5) : linear(lo, hi, ph > 200 ? 6 : 4);
  ctx.font = "11px system-ui, sans-serif";
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  for (const x of xt) {
    const sx = Math.round(X(x)) + 0.5;
    if (sx < left - 1 || sx > w - right + 1) continue;
    ctx.strokeStyle = c("canvas-grid", dark);
    ctx.beginPath();
    ctx.moveTo(sx, top);
    ctx.lineTo(sx, h - bottom);
    ctx.stroke();
    ctx.fillStyle = c("ink-soft", dark);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(tickText(x), sx, h - bottom + 5);
  }
  for (const y of yt) {
    const sy = Math.round(Y(y)) + 0.5;
    if (sy < top - 1 || sy > h - bottom + 1) continue;
    ctx.strokeStyle = c("canvas-grid", dark);
    ctx.beginPath();
    ctx.moveTo(left, sy);
    ctx.lineTo(w - right, sy);
    ctx.stroke();
    ctx.fillStyle = c("ink-soft", dark);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(tickText(y), left - 6, sy);
  }
  // The zero line, when zero is on the graph.
  if (!ylog && lo < 0 && hi > 0) {
    ctx.strokeStyle = c("canvas-grid-major", dark);
    ctx.beginPath();
    ctx.moveTo(left, Math.round(Y(0)) + 0.5);
    ctx.lineTo(w - right, Math.round(Y(0)) + 0.5);
    ctx.stroke();
  }
  ctx.strokeStyle = c("canvas-grid-major", dark);
  ctx.strokeRect(left + 0.5, top + 0.5, pw, ph);
  ctx.fillStyle = c("ink-soft", dark);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(
    `${xVar.name}${xVar.unit ? ` (${xVar.unit})` : ""}${log ? ", log scale" : ""}`,
    left + pw / 2,
    h - bottom + 23,
  );
  ctx.save();
  ctx.translate(13, top + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = "middle";
  // The title up the side has only the height of the plot: a long one drops
  // "log scale" (the tick values show it), then the name gives way to the
  // tool's own symbol.
  const unit = yVar.unit ? ` (${yVar.unit})` : "",
    titles = [
      `${yVar.name}${unit}${ylog ? ", log scale" : ""}`,
      `${yVar.name}${unit}`,
      `${symbolRuns(yVar.latex)
        .map((r) => r.text)
        .join("")}${unit}`,
    ],
    middle = top + ph / 2,
    room = 2 * Math.min(middle, h - middle) - 6;
  ctx.fillText(
    titles.find((t) => ctx.measureText(t).width <= room) ?? titles[2],
    0,
    0,
  );
  ctx.restore();

  // Inside the frame only.
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, pw, ph);
  ctx.clip();
  // Asymptotes: the curve gets ever closer to these lines without reaching
  // them.
  for (const a of asymptotes) {
    const sx = X(Math.min(max, Math.max(min, a.at)));
    ctx.strokeStyle = c("vector-force", dark);
    ctx.lineWidth = 1.25;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(sx, top);
    ctx.lineTo(sx, h - bottom);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // The curve, broken where there is no value and at each asymptote.
  ctx.strokeStyle = c("vector-velocity", dark);
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  let pen = false;
  const limit = (y) => Math.max(lo - 4 * (hi - lo), Math.min(hi + 4 * (hi - lo), y));
  for (let i = 0; i < xs.length; i++) {
    const y = ys[i];
    const cut =
      i > 0 && asymptotes.some((a) => xs[i - 1] < a.at && xs[i] >= a.at);
    if (!Number.isFinite(y) || (ylog && y <= 0)) {
      pen = false;
      continue;
    }
    const sx = X(xs[i]),
      sy = ylog ? Y(y) : Y(limit(y));
    if (pen && !cut) ctx.lineTo(sx, sy);
    else ctx.moveTo(sx, sy);
    pen = true;
  }
  ctx.stroke();
  ctx.restore();
  // Asymptote labels, above the frame's lower edge.
  ctx.font = "11px system-ui, sans-serif";
  for (const a of asymptotes) {
    const sx = X(Math.min(max, Math.max(min, a.at))),
      text =
        a.label ??
        `no value at ${tickText(Number(a.at.toPrecision(3)))}${xVar.unit && xVar.unit !== "°" ? " " + xVar.unit : xVar.unit}`,
      width = ctx.measureText(text).width,
      tx = Math.max(left + 4, Math.min(w - right - width - 4, sx + 6));
    ctx.fillStyle = c("canvas-bg", dark);
    ctx.globalAlpha = 0.85;
    ctx.fillRect(tx - 3, top + 4, width + 6, 16);
    ctx.globalAlpha = 1;
    ctx.fillStyle = c("vector-force", dark);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, tx, top + 12);
  }
  // The current values.
  const x = values[xKey],
    y = values[unknown];
  if (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    (!ylog || y > 0) &&
    x >= min &&
    x <= max
  ) {
    const sy = Math.max(top, Math.min(h - bottom, Y(y)));
    ctx.fillStyle = c("canvas-bg", dark);
    ctx.beginPath();
    ctx.arc(X(x), sy, 6.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = c("vector-force", dark);
    ctx.beginPath();
    ctx.arc(X(x), sy, 5, 0, TAU);
    ctx.fill();
  }
}
