// Shared pieces of the minitool pictures.
//
// A picture is drawn from the tool's current values and labels each
// quantity it shows with the tool's own symbol, value and unit
// ("u = 3.00 m/s"); the unknown is drawn in the accent colour. Sizes on the
// picture are only roughly proportional (an arrow grows with its quantity
// between a shortest and a longest length); the numbers are exact.
import { color } from "../../site/theme.js";
import { numberText } from "../format.js";

export const TAU = 2 * Math.PI;
export const deg = Math.PI / 180;
export const c = (name, dark) => color(name, dark);
export const val = (v, key, fallback) =>
  Number.isFinite(v[key]) ? v[key] : fallback;
const FONT = "system-ui, sans-serif";

export function arrow(ctx, x0, y0, x1, y1, colour, width = 2) {
  const a = Math.atan2(y1 - y0, x1 - x0),
    head = Math.min(9, Math.hypot(x1 - x0, y1 - y0) / 2);
  ctx.strokeStyle = ctx.fillStyle = colour;
  ctx.lineWidth = width;
  ctx.setLineDash([]);
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
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = c("ink-soft", dark);
  ctx.fillText(text, x, y);
}

// A LaTeX symbol from the catalogue as runs of plain text, each either on
// the line or a subscript: "v_{av}" → v, (av, sub).
const GREEK = {
  theta: "θ",
  lambda: "λ",
  mu: "μ",
  omega: "ω",
  Phi: "Φ",
  Delta: "Δ",
  tau: "τ",
  varepsilon: "ε",
  epsilon: "ε",
  ell: "ℓ",
  pi: "π",
};
export function symbolRuns(latex) {
  const plain = (s) =>
    s.replace(/\\([A-Za-z]+)\s*/g, (_, name) => GREEK[name] ?? name);
  const m = /^(.*?)_(?:\{(.*)\}|(.))$/.exec(latex);
  if (!m) return [{ text: plain(latex).replace(/[{}]/g, ""), sub: false }];
  return [
    { text: plain(m[1]).replace(/[{}]/g, ""), sub: false },
    { text: plain(m[2] ?? m[3]).replace(/[{}]/g, ""), sub: true },
  ];
}

// Draw runs of text ({ text, sub }) with their left, centre or right at x.
function drawRuns(ctx, runs, x, y, align, size, weight) {
  const fontOf = (sub) =>
    `${weight} ${sub ? Math.round(size * 0.75) : size}px ${FONT}`;
  let total = 0;
  for (const r of runs) {
    ctx.font = fontOf(r.sub);
    total += ctx.measureText(r.text).width;
  }
  let left =
    align === "left" ? x : align === "right" ? x - total : x - total / 2;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  for (const r of runs) {
    ctx.font = fontOf(r.sub);
    ctx.fillText(r.text, left, r.sub ? y + size * 0.3 : y);
    left += ctx.measureText(r.text).width;
  }
  return total;
}

// The helper every picture uses: the canvas, the values and the drawing
// pieces, with labels built from the tool's own symbols and units.
export function picture(ctx, o) {
  const { width: w, height: h, values: v, tool, unknown, dark } = o;
  const all = [...tool.variables, ...tool.constants],
    byKey = new Map(all.map((q) => [q.key, q]));
  const col = (name) => c(name, dark);
  const has = (key) => byKey.has(key);
  const value = (key, fallback = 0) => val(v, key, fallback);

  // A counted quantity (turns, harmonic number) is written as a whole
  // number when it is one.
  const shown = (x, q) =>
    q.step === 1 && Number.isInteger(x) && Math.abs(x) < 1e6
      ? String(x).replace("-", "−")
      : numberText(x);
  // "sym = value unit" for a quantity of the tool.
  function runsOf(key, { name } = {}) {
    const q = byKey.get(key);
    if (!q) return [{ text: name ?? key, sub: false }];
    const x = v[key],
      unit = q.unit ? (q.unit === "°" ? "°" : " " + q.unit) : "";
    return [
      ...symbolRuns(q.latex),
      {
        text: ` = ${Number.isFinite(x) ? shown(x, q) + unit : "—"}`,
        sub: false,
      },
    ];
  }
  // A label on a pale backing, so it reads over lines and fields.
  function backed(runs, x, y, align, colour, weight) {
    ctx.save();
    ctx.globalAlpha = 0;
    const width = drawRuns(ctx, runs, x, y, align, 12.5, weight);
    ctx.restore();
    // A label never runs off the picture: it is moved back inside instead.
    let left =
      align === "left" ? x : align === "right" ? x - width : x - width / 2;
    left = Math.max(6, Math.min(w - width - 6, left));
    y = Math.max(12, Math.min(h - 12, y));
    x = left;
    align = "left";
    ctx.fillStyle = col("canvas-bg");
    ctx.globalAlpha = 0.82;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(left - 4, y - 10, width + 8, 20, 5);
    else ctx.rect(left - 4, y - 10, width + 8, 20);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = colour;
    drawRuns(ctx, runs, x, y, align, 12.5, weight);
    return width;
  }
  // The quantity's label; the unknown stands out.
  function tag(key, x, y, align = "center") {
    if (!has(key)) return 0;
    const isUnknown = key === unknown;
    return backed(
      runsOf(key),
      x,
      y,
      align,
      col(isUnknown ? "accent-text" : "ink"),
      isUnknown ? 650 : 450,
    );
  }
  // A plain note.
  function text(s, x, y, align = "center", colour = "ink-soft") {
    return backed([{ text: s, sub: false }], x, y, align, col(colour), 450);
  }
  // An arrow's length for a quantity: grows with its size across the slider
  // range (on a log slider, with its position) between `lo` and `hi` pixels.
  function length(key, lo = 18, hi = 90, x = value(key)) {
    const q = byKey.get(key);
    if (!Number.isFinite(x) || x === 0) return 0;
    const size = Math.abs(x);
    let t = 0.5;
    if (q && q.max > 0) {
      if (q.scale === "log" && q.min > 0)
        t = Math.log(size / q.min) / Math.log(q.max / q.min);
      else t = Math.sqrt(size / Math.max(Math.abs(q.max), Math.abs(q.min)));
    }
    t = Math.max(0, Math.min(1, t));
    return Math.sign(x) * (lo + (hi - lo) * t);
  }
  function line(points, colour = "ink", width = 1.5, dash = []) {
    ctx.strokeStyle = col(colour);
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function ball(x, y, r, colour = "body-ball", alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = col(colour);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = col("body-edge");
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function block(x, y, bw, bh, colour = "body-block", angle = 0, alpha = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = col(colour);
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.strokeStyle = col("body-edge");
    ctx.lineWidth = 1;
    ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
    ctx.restore();
  }
  // Ground: a line with hatching below.
  function ground(x0, x1, y) {
    ctx.strokeStyle = col("hatch");
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0 + 4; x < x1; x += 9) {
      ctx.moveTo(x, y);
      ctx.lineTo(x - 7, y + 7);
    }
    ctx.stroke();
    line(
      [
        [x0, y],
        [x1, y],
      ],
      "structure",
      2,
    );
  }
  function arrowTo(x0, y0, x1, y1, colour = "vector-force", width = 2) {
    if (Math.hypot(x1 - x0, y1 - y0) < 1) return;
    arrow(ctx, x0, y0, x1, y1, col(colour), width);
  }
  // A measurement line with ends marked, for lengths and distances.
  function dim(x0, y0, x1, y1, colour = "ink-soft") {
    const a = Math.atan2(y1 - y0, x1 - x0),
      nx = -Math.sin(a) * 5,
      ny = Math.cos(a) * 5;
    line(
      [
        [x0, y0],
        [x1, y1],
      ],
      colour,
      1,
    );
    line(
      [
        [x0 - nx, y0 - ny],
        [x0 + nx, y0 + ny],
      ],
      colour,
      1,
    );
    line(
      [
        [x1 - nx, y1 - ny],
        [x1 + nx, y1 + ny],
      ],
      colour,
      1,
    );
  }
  // An angle mark: an arc about (x, y) between two canvas angles.
  function angle(x, y, r, a0, a1, colour = "ink-soft") {
    ctx.strokeStyle = col(colour);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r, Math.min(a0, a1), Math.max(a0, a1));
    ctx.stroke();
  }
  // A zigzag spring between two points.
  function spring(x0, y0, x1, y1, coils = 8, amp = 8, colour = "structure") {
    const len = Math.hypot(x1 - x0, y1 - y0),
      ux = (x1 - x0) / len,
      uy = (y1 - y0) / len,
      lead = Math.min(10, len * 0.1),
      pts = [[x0, y0]];
    pts.push([x0 + ux * lead, y0 + uy * lead]);
    const n = coils * 2;
    for (let i = 1; i < n; i++) {
      const t = lead + ((len - 2 * lead) * i) / n,
        side = i % 2 ? amp : -amp;
      pts.push([x0 + ux * t - uy * side, y0 + uy * t + ux * side]);
    }
    pts.push([x1 - ux * lead, y1 - uy * lead], [x1, y1]);
    line(pts, colour, 1.8);
  }
  // A charge: a disc with + or −.
  function charge(x, y, q, r = 11) {
    ctx.fillStyle = col(q < 0 ? "charge-negative" : "charge-positive");
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = col("on-colour");
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y);
    ctx.lineTo(x + r * 0.5, y);
    if (q >= 0) {
      ctx.moveTo(x, y - r * 0.5);
      ctx.lineTo(x, y + r * 0.5);
    }
    ctx.stroke();
  }
  // Out of the screen (dot) or into it (cross), as for B or a force.
  function outOf(x, y, r = 7, colour = "field-magnetic", into = false) {
    ctx.strokeStyle = ctx.fillStyle = col(colour);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    if (into) {
      const d = r * 0.6;
      ctx.moveTo(x - d, y - d);
      ctx.lineTo(x + d, y + d);
      ctx.moveTo(x + d, y - d);
      ctx.lineTo(x - d, y + d);
      ctx.stroke();
    } else {
      ctx.arc(x, y, r * 0.3, 0, TAU);
      ctx.fill();
    }
  }
  // A region of uniform B into (crosses) or out of (dots) the screen.
  function bRegion(x0, y0, x1, y1, into = false, step = 26) {
    ctx.fillStyle = col("field-magnetic");
    ctx.globalAlpha = 0.08;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = col("field-magnetic");
    ctx.lineWidth = 1.2;
    for (let x = x0 + step / 2; x < x1; x += step)
      for (let y = y0 + step / 2; y < y1; y += step) {
        ctx.beginPath();
        if (into) {
          ctx.moveTo(x - 3, y - 3);
          ctx.lineTo(x + 3, y + 3);
          ctx.moveTo(x + 3, y - 3);
          ctx.lineTo(x - 3, y + 3);
          ctx.stroke();
        } else {
          ctx.arc(x, y, 1.8, 0, TAU);
          ctx.fill();
        }
      }
    ctx.globalAlpha = 1;
  }
  // A uniform field in the plane of the screen, drawn as the field is
  // drawn in the simulations: a faint shade and a lattice of short arrows,
  // all the same length, pointing along it (canvas angle, 0 is to the
  // right). `clear` lists circles { x, y, r } kept free of arrows, so the
  // things in the field are not drawn over.
  function fieldArrows(
    x0,
    y0,
    x1,
    y1,
    { angle = 0, colour = "field-electric", step = 36, clear = [] } = {},
  ) {
    ctx.fillStyle = col(colour);
    ctx.globalAlpha = 0.07;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.globalAlpha = 1;
    const c = Math.cos(angle) * 8,
      sn = Math.sin(angle) * 8,
      nx = Math.floor((x1 - x0) / step),
      ny = Math.floor((y1 - y0) / step),
      ox = x0 + (x1 - x0 - (nx - 1) * step) / 2,
      oy = y0 + (y1 - y0 - (ny - 1) * step) / 2;
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < ny; j++) {
        const x = ox + i * step,
          y = oy + j * step;
        if (clear.some((k) => Math.hypot(x - k.x, y - k.y) < k.r)) continue;
        arrowTo(x - c, y - sn, x + c, y + sn, colour, 1.3);
      }
  }
  // A coil of wire seen from the side: one continuous helix of `turns`
  // turns and radius r round the axis from (x0, y0) to (x1, y1). The half of
  // each turn behind the axis is drawn faintly, the half in front over it.
  function helix(x0, y0, x1, y1, r, turns, colour = "circuit-current") {
    const len = Math.hypot(x1 - x0, y1 - y0),
      ux = (x1 - x0) / len,
      uy = (y1 - y0) / len,
      n = Math.max(24, Math.ceil(turns * 24)),
      at = (k) => {
        const t = (k / n) * turns,
          a = TAU * t,
          // Along the axis, with a little lean so each turn reads as a loop.
          along = (k / n) * len + 0.18 * r * Math.sin(a),
          across = r * Math.cos(a);
        return [x0 + ux * along - uy * across, y0 + uy * along + ux * across];
      },
      front = (k) => Math.sin((TAU * (k + 0.5) * turns) / n) > 0;
    ctx.strokeStyle = col(colour);
    ctx.lineCap = "round";
    for (const pass of [false, true]) {
      ctx.globalAlpha = pass ? 1 : 0.35;
      ctx.lineWidth = pass ? 2 : 1.4;
      ctx.beginPath();
      for (let k = 0; k < n; k++)
        if (front(k) === pass) {
          const [ax, ay] = at(k),
            [bx, by] = at(k + 1);
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
        }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = "butt";
    return { start: at(0), end: at(n) };
  }
  // A charged plate seen edge on.
  function plate(x0, y0, x1, y1, sign) {
    line(
      [
        [x0, y0],
        [x1, y1],
      ],
      sign > 0 ? "charge-positive" : sign < 0 ? "charge-negative" : "structure",
      5,
    );
  }
  return {
    ctx,
    w,
    h,
    v,
    dark,
    unknown,
    col,
    has,
    value,
    tag,
    text,
    length,
    line,
    ball,
    block,
    ground,
    arrow: arrowTo,
    dim,
    angle,
    spring,
    charge,
    outOf,
    bRegion,
    fieldArrows,
    helix,
    plate,
  };
}
