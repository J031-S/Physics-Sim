// Minitool pictures: electric and magnetic fields.
import { TAU, deg, picture } from "./draw.js";

const sign = (x) => (x < 0 ? -1 : 1);

// Two point charges and the force on each.
export function coulomb(ctx, o) {
  const P = picture(ctx, o),
    { w, h, value } = P,
    y = h * 0.48,
    ax = w * 0.25,
    bx = w * 0.68,
    q1 = value("q1", 1),
    q2 = value("q2", 1),
    repel = q1 * q2 > 0,
    F = Math.abs(P.length("F", 30, 70)) * (repel ? 1 : -1);
  P.charge(ax, y, q1, 14);
  P.charge(bx, y, q2, 14);
  P.tag("q1", ax, y + 32);
  P.tag("q2", bx, y + 32);
  P.arrow(ax - 16 * sign(F), y, ax - 16 * sign(F) - F, y);
  P.arrow(bx + 16 * sign(F), y, bx + 16 * sign(F) + F, y);
  P.tag("F", (ax + bx) / 2, y - 26);
  P.text(
    repel ? "like charges repel" : "unlike charges attract",
    (ax + bx) / 2,
    y - 50,
  );
  P.dim(ax, y + 60, bx, y + 60);
  P.tag("r", (ax + bx) / 2, y + 60);
  P.tag("k", w - 20, h - 18, "right");
}

// Horizontal field lines across the whole picture.
function fieldLines(P, x0, x1, ys, dir = 1) {
  for (const y of ys) {
    P.line(
      [
        [x0, y],
        [x1, y],
      ],
      "field-electric",
      1.2,
    );
    const mx = (x0 + x1) / 2;
    P.arrow(mx - 6 * dir, y, mx + 6 * dir, y, "field-electric", 1.2);
  }
}

// A charge in a uniform field and the force on it.
export function fieldForce(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    x = w * 0.42,
    y = h * 0.5,
    q = P.value("q", 1);
  fieldLines(P, 20, w - 20, [h * 0.18, h * 0.82]);
  P.tag("E", w - 24, h * 0.18 - 14, "right");
  P.charge(x, y, q, 13);
  P.tag("q", x, y + 30);
  const F = Math.abs(P.length("F", 30, 110)) * sign(q);
  P.arrow(x + 14 * sign(F), y, x + 14 * sign(F) + F, y);
  P.tag(
    "F",
    x + 14 * sign(F) + F + 8 * sign(F),
    y - 18,
    F < 0 ? "right" : "left",
  );
  P.text(
    q < 0 ? "negative: force against E" : "positive: force along E",
    x,
    y - 44,
  );
}

// The field at a distance from a point charge.
export function pointField(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    cx = w * 0.22,
    cy = h * 0.52,
    q = P.value("q", 1),
    px = w * 0.66;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    P.line(
      [
        [cx + 20 * Math.cos(a), cy + 20 * Math.sin(a)],
        [cx + 70 * Math.cos(a), cy + 70 * Math.sin(a)],
      ],
      "field-electric",
      1,
    );
  }
  P.charge(cx, cy, q, 14);
  P.tag("q", cx, cy + 88);
  P.dim(cx, cy - 92, px, cy - 92);
  P.tag("r", (cx + px) / 2, cy - 92);
  P.ball(px, cy, 4, "ink");
  const E = Math.abs(P.length("E", 30, 90)) * sign(q);
  P.arrow(px, cy, px + E, cy, "field-electric");
  P.tag("E", px + E / 2, cy + 22);
  P.text(
    q < 0
      ? "points towards a negative charge"
      : "points away from a positive charge",
    px,
    cy + 48,
  );
  P.tag("k", w - 20, h - 16, "right");
}

// Two parallel plates and the uniform field between them.
function plates(P, x0, x1, top, bottom) {
  P.plate(x0, top, x0, bottom, 1);
  P.plate(x1, top, x1, bottom, -1);
  P.text("+", x0, top - 12, "center", "charge-positive");
  P.text("−", x1, top - 12, "center", "charge-negative");
  for (let y = top + 18; y < bottom - 8; y += 28)
    P.arrow(x0 + 10, y, x1 - 10, y, "field-electric", 1);
}

export function platesField(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    x0 = w * 0.25,
    x1 = w * 0.62,
    top = 30,
    bottom = h - 46;
  plates(P, x0, x1, top, bottom);
  P.dim(x0, bottom + 20, x1, bottom + 20);
  P.tag("d", (x0 + x1) / 2, bottom + 20);
  P.tag("V", x1 + 24, top + 20, "left");
  P.text("p.d. between the plates", x1 + 24, top + 44, "left");
  P.tag("E", x1 + 24, (top + bottom) / 2 + 20, "left");
  P.text("uniform between them", x1 + 24, (top + bottom) / 2 + 44, "left");
}

// Work done moving a charge across a p.d.
export function electricWork(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    x0 = w * 0.22,
    x1 = w * 0.6,
    top = 30,
    bottom = h - 40,
    y = (top + bottom) / 2,
    q = P.value("q", 1);
  plates(P, x0, x1, top, bottom);
  P.charge(x0 + 22, y, q, 10);
  P.charge(x1 - 22, y, q, 10);
  P.line(
    [
      [x0 + 36, y - 22],
      [x1 - 36, y - 22],
    ],
    "accent-text",
    1.5,
    [5, 4],
  );
  P.arrow(x1 - 46, y - 22, x1 - 36, y - 22, "accent-text", 1.5);
  P.tag("q", x0 + 22, y + 26, "left");
  P.tag("V", x1 + 24, top + 20, "left");
  P.tag("W", x1 + 24, y, "left");
  P.text("energy transferred", x1 + 24, y + 24, "left");
}

// An electron gun: a charge accelerated from rest across a p.d.
export function electronGun(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    x0 = w * 0.18,
    x1 = w * 0.48,
    top = 26,
    bottom = h - 46,
    y = (top + bottom) / 2,
    q = P.value("q", 1);
  P.plate(x0, top, x0, bottom, sign(q));
  P.plate(x1, top, x1, y - 10, -sign(q));
  P.plate(x1, y + 10, x1, bottom, -sign(q));
  P.charge(x0 + 18, y, q, 8);
  P.line(
    [
      [x0 + 30, y],
      [w - 60, y],
    ],
    "ink-soft",
    1,
    [3, 4],
  );
  P.ball(w * 0.72, y, 7, q < 0 ? "charge-negative" : "charge-positive");
  P.arrow(w * 0.72 + 9, y, w * 0.72 + 70, y, "vector-velocity");
  P.tag("v", w * 0.72 + 30, y - 22);
  P.text("starts at rest", x0 + 18, y + 30, "left");
  P.tag("V", (x0 + x1) / 2, bottom + 20);
  P.tag("q", w - 20, top + 6, "right");
  P.tag("m", w - 20, top + 32, "right");
}

// A charge deflected between horizontal plates.
export function deflection(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    x0 = w * 0.2,
    x1 = w * 0.7,
    top = 34,
    bottom = h - 52,
    mid = (top + bottom) / 2,
    q = P.value("q", 1),
    yv = P.value("y", 0),
    d = P.value("d", 1),
    dy = Math.min(0.95, Math.abs(yv / (d / 2)) || 0) * ((bottom - top) / 2 - 8);
  P.plate(x0, top, x1, top, 1);
  P.plate(x0, bottom, x1, bottom, -1);
  for (let x = x0 + 20; x < x1; x += 40)
    P.arrow(x, top + 8, x, bottom - 8, "field-electric", 1);
  // Positive charges move towards the negative (lower) plate.
  const down = q >= 0 ? 1 : -1,
    pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    pts.push([x0 + (x1 - x0) * t, mid + down * dy * t * t]);
  }
  P.line(
    [
      [30, mid],
      [x0, mid],
    ],
    "vector-velocity",
    1.5,
  );
  P.line(pts, "vector-velocity", 1.5);
  P.charge(40, mid, q, 8);
  P.arrow(50, mid, 90, mid, "vector-velocity");
  P.tag("u", 70, mid - 20);
  P.line(
    [
      [x0, mid],
      [x1 + 20, mid],
    ],
    "ink-soft",
    1,
    [3, 4],
  );
  P.dim(x1 + 14, mid, x1 + 14, mid + down * dy);
  P.tag("y", x1 + 22, mid + (down * dy) / 2, "left");
  P.dim(x0, bottom + 18, x1, bottom + 18);
  P.tag("L", (x0 + x1) / 2, bottom + 18);
  P.dim(x0 - 14, top, x0 - 14, bottom);
  P.tag("d", x0 - 20, top + 24, "right");
  P.tag("V", x1 + 22, top + 4, "left");
  P.tag("q", w - 20, h - 18, "right");
  P.tag("m", w - 20, h - 42, "right");
}

// Millikan: a charged drop held still between plates.
export function millikan(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    x0 = w * 0.18,
    x1 = w * 0.62,
    top = 30,
    bottom = h - 34,
    x = (x0 + x1) / 2,
    y = (top + bottom) / 2;
  // A positive drop is held up by an upward field: the lower plate is +.
  P.plate(x0, top, x1, top, -1);
  P.plate(x0, bottom, x1, bottom, 1);
  for (let ax = x0 + 20; ax < x1; ax += 46)
    if (Math.abs(ax - x) > 30)
      P.arrow(ax, bottom - 8, ax, top + 8, "field-electric", 1);
  P.ball(x, y, 9, "body-ball");
  P.arrow(x, y - 9, x, y - 52);
  P.text("qE", x + 8, y - 44, "left");
  P.arrow(x, y + 9, x, y + 52);
  P.text("mg", x + 8, y + 44, "left");
  P.dim(x1 + 16, top, x1 + 16, bottom);
  P.tag("d", x1 + 24, y, "left");
  P.tag("V", x1 + 24, top + 8, "left");
  P.tag("q", w - 20, bottom - 52, "right");
  P.tag("m", w - 20, bottom - 26, "right");
  P.tag("g", w - 20, bottom, "right");
}

// B as arrows across the picture (in the plane of the screen).
function bLines(P, x0, x1, ys) {
  for (const y of ys) {
    P.line(
      [
        [x0, y],
        [x1, y],
      ],
      "field-magnetic",
      1.2,
    );
    P.arrow(x1 - 30, y, x1 - 18, y, "field-magnetic", 1.2);
  }
}

// The force on a charge moving at an angle to B.
export function movingCharge(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    x = w * 0.36,
    y = h * 0.58,
    th = P.value("theta", 90) * deg;
  bLines(P, 20, w - 20, [h * 0.14, h * 0.92]);
  P.tag("B", w - 24, h * 0.14 + 18, "right");
  P.line(
    [
      [x, y],
      [x + 110, y],
    ],
    "ink-soft",
    1,
    [3, 3],
  );
  P.charge(x, y, P.value("q", 1), 10);
  P.tag("q", x - 16, y + 22, "right");
  const L = Math.abs(P.length("v", 40, 100));
  P.arrow(x, y, x + L * Math.cos(th), y - L * Math.sin(th), "vector-velocity");
  P.tag("v", x + L * Math.cos(th) + 6, y - L * Math.sin(th) - 8, "left");
  P.angle(x, y, 28, -th, 0);
  P.tag("theta", x + 36, y + 14, "left");
  // F = qv × B: into the screen for a positive charge here.
  const into = P.value("q", 1) >= 0;
  P.outOf(w * 0.72, y, 9, "vector-force", into);
  P.tag("F", w * 0.72 + 16, y, "left");
  P.text(`${into ? "into" : "out of"} the screen`, w * 0.72, y + 26);
}

// The force on a current-carrying wire in B.
export function wireForce(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    x = w * 0.3,
    y = h * 0.62,
    th = P.value("theta", 90) * deg,
    L = 60 + 0.6 * Math.abs(P.length("l", 0, 100));
  bLines(P, 20, w - 20, [h * 0.14, h * 0.92]);
  P.tag("B", w - 24, h * 0.14 + 18, "right");
  const ex = x + L * Math.cos(th),
    ey = y - L * Math.sin(th);
  P.line(
    [
      [x, y],
      [ex, ey],
    ],
    "structure",
    5,
  );
  P.arrow(
    x + (L / 2 - 14) * Math.cos(th),
    y - (L / 2 - 14) * Math.sin(th),
    x + (L / 2 + 14) * Math.cos(th),
    y - (L / 2 + 14) * Math.sin(th),
    "circuit-current",
  );
  P.tag(
    "I",
    x + (L / 2) * Math.cos(th) - 16,
    y - (L / 2) * Math.sin(th),
    "right",
  );
  P.tag("l", ex + 10, ey, "left");
  P.line(
    [
      [x, y],
      [x + 80, y],
    ],
    "ink-soft",
    1,
    [3, 3],
  );
  P.angle(x, y, 26, -th, 0);
  P.tag("theta", x + 34, y + 14, "left");
  // F = Il × B: into the screen.
  P.outOf(w * 0.74, y, 9, "vector-force", true);
  P.tag("F", w * 0.74 + 16, y, "left");
  P.text("F into the screen", w * 0.74, y + 26);
}

// The field round a long straight wire.
export function wireField(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g } = P,
    cx = w * 0.3,
    cy = h / 2,
    R = Math.min(h * 0.38, w * 0.24);
  g.strokeStyle = P.col("field-magnetic");
  g.lineWidth = 1;
  for (const k of [0.35, 0.65, 1]) {
    g.beginPath();
    g.arc(cx, cy, R * k, 0, TAU);
    g.stroke();
  }
  P.outOf(cx, cy, 10, "circuit-current");
  P.tag("I", cx, cy + 26);
  P.text("current out of the screen", cx, cy + 50);
  const a = -30 * deg,
    px = cx + R * Math.cos(a),
    py = cy + R * Math.sin(a);
  P.dim(cx, cy, px, py);
  P.tag("r", (cx + px) / 2 + 6, (cy + py) / 2 - 12, "left");
  // Anticlockwise, by the right-hand grip rule.
  P.arrow(
    px,
    py,
    px + 50 * Math.sin(a),
    py - 50 * Math.cos(a),
    "field-magnetic",
  );
  P.tag("B", px + 14, py - 34, "left");
  P.tag("mu0", w - 20, h - 18, "right");
}

// A loop in B, seen edge on: the flux through it.
export function flux(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    cx = w * 0.4,
    cy = h / 2,
    th = P.value("theta", 0) * deg,
    half = h * 0.32;
  bLines(P, 20, w - 20, [h * 0.14, h * 0.38, h * 0.62, h * 0.86]);
  P.tag("B", w - 24, h * 0.14 - 14, "right");
  // The loop's normal is at θ to B; the loop itself is at right angles to
  // the normal.
  const nx = Math.cos(th),
    ny = -Math.sin(th);
  P.line(
    [
      [cx + ny * half, cy - nx * half],
      [cx - ny * half, cy + nx * half],
    ],
    "structure",
    6,
  );
  P.arrow(cx, cy, cx + nx * 70, cy + ny * 70, "accent-text");
  P.text("normal", cx + nx * 80 + 4, cy + ny * 80 - 12, "left");
  P.angle(cx, cy, 30, Math.min(0, -th), Math.max(0, -th));
  P.tag("theta", cx + 40, cy + 16, "left");
  P.tag("A", cx - ny * half - 10, cy + nx * half + 14, "right");
  P.tag("Phi", w * 0.2, 22);
  P.text("loop seen edge on", w * 0.2, h - 14);
}

// A magnet moving into a coil: the changing flux makes an e.m.f.
export function faraday(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g } = P,
    cx = w * 0.52,
    cy = h * 0.5,
    turns = Math.max(2, Math.min(10, Math.round(Math.sqrt(P.value("N", 4)))));
  g.strokeStyle = P.col("circuit-current");
  g.lineWidth = 2;
  for (let i = 0; i < turns; i++) {
    const x = cx - 50 + (100 * i) / Math.max(1, turns - 1);
    g.beginPath();
    g.ellipse(x, cy, 9, 40, 0, 0, TAU);
    g.stroke();
  }
  P.tag("N", cx, cy + 56);
  // The magnet, moving in.
  P.block(w * 0.2, cy, 70, 26, "charge-positive");
  P.block(w * 0.2 - 35 + 17, cy, 35, 26, "charge-negative");
  P.text("S", w * 0.2 - 18, cy, "center", "ink");
  P.text("N", w * 0.2 + 18, cy, "center", "ink");
  P.arrow(w * 0.2 - 30, cy - 34, w * 0.2 + 30, cy - 34, "vector-velocity");
  P.tag("dPhi", w * 0.2, cy + 40);
  P.tag("dt", w * 0.2, cy + 64);
  // A meter across the coil's ends.
  P.line(
    [
      [cx + 50, cy - 40],
      [cx + 50, 20],
      [w - 60, 20],
      [w - 60, cy - 14],
    ],
    "ink",
    1.2,
  );
  P.line(
    [
      [cx + 50, cy + 40],
      [cx + 50, h - 20],
      [w - 60, h - 20],
      [w - 60, cy + 14],
    ],
    "ink",
    1.2,
  );
  P.ball(w - 60, cy, 14, "canvas-bg");
  P.text("V", w - 60, cy, "center", "ink");
  P.tag("emf", w - 82, cy + 34, "right");
}

// A rod sliding along rails in B.
export function motional(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    top = h * 0.2,
    bottom = h * 0.8,
    x = w * 0.58;
  P.bRegion(30, top - 16, w - 30, bottom + 16, true);
  P.tag("B", w - 34, top - 26, "right");
  P.line(
    [
      [40, top],
      [w - 40, top],
    ],
    "structure",
    3,
  );
  P.line(
    [
      [40, bottom],
      [w - 40, bottom],
    ],
    "structure",
    3,
  );
  P.line(
    [
      [40, top],
      [40, bottom],
    ],
    "ink",
    1.5,
  );
  P.ball(40, (top + bottom) / 2, 13, "canvas-bg");
  P.text("V", 40, (top + bottom) / 2, "center", "ink");
  P.line(
    [
      [x, top - 8],
      [x, bottom + 8],
    ],
    "body-block",
    7,
  );
  P.arrow(
    x + 8,
    (top + bottom) / 2,
    x + 70,
    (top + bottom) / 2,
    "vector-velocity",
  );
  P.tag("v", x + 40, (top + bottom) / 2 - 18);
  P.dim(x - 18, top, x - 18, bottom);
  P.tag("l", x - 24, (top + bottom) / 2, "right");
  P.tag("emf", 62, (top + bottom) / 2, "left");
}

// A transformer: two coils on one iron core.
export function transformer(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g } = P,
    cx = w / 2,
    cy = h / 2,
    cw = Math.min(200, w * 0.36),
    ch = h * 0.66;
  g.strokeStyle = P.col("structure");
  g.lineWidth = 16;
  g.strokeRect(cx - cw / 2, cy - ch / 2, cw, ch);
  const coil = (x, n, side) => {
    const shown = Math.max(2, Math.min(12, Math.round(Math.log2(n + 1) * 2))),
      span = ch * 0.6;
    g.strokeStyle = P.col("circuit-current");
    g.lineWidth = 2;
    for (let i = 0; i < shown; i++) {
      const y = cy - span / 2 + (span * i) / (shown - 1);
      g.beginPath();
      g.ellipse(x, y, 16, 4, 0, 0, TAU);
      g.stroke();
    }
    P.line(
      [
        [x + side * 16, cy - span / 2],
        [x + side * 60, cy - span / 2],
      ],
      "ink",
      1.2,
    );
    P.line(
      [
        [x + side * 16, cy + span / 2],
        [x + side * 60, cy + span / 2],
      ],
      "ink",
      1.2,
    );
  };
  coil(cx - cw / 2, P.value("Np", 100), -1);
  coil(cx + cw / 2, P.value("Ns", 100), 1);
  P.tag("Np", cx - cw / 2, cy + ch / 2 + 20);
  P.tag("Ns", cx + cw / 2, cy + ch / 2 + 20);
  P.tag("Vp", cx - cw / 2 - 64, cy, "right");
  P.tag("Vs", cx + cw / 2 + 64, cy, "left");
  P.text("primary (a.c. in)", cx - cw / 2 - 64, cy + 24, "right");
  P.text("secondary (out)", cx + cw / 2 + 64, cy + 24, "left");
}

// A coil turning between magnet poles, and the e.m.f. it makes.
export function generator(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g } = P,
    cx = w * 0.3,
    cy = h / 2,
    gap = Math.min(110, w * 0.17);
  P.block(cx - gap - 22, cy, 44, h * 0.6, "charge-positive");
  P.block(cx + gap + 22, cy, 44, h * 0.6, "charge-negative");
  P.text("N", cx - gap - 22, cy, "center", "ink");
  P.text("S", cx + gap + 22, cy, "center", "ink");
  for (const y of [cy - 40, cy, cy + 40])
    P.arrow(cx - gap + 4, y, cx + gap - 4, y, "field-magnetic", 1);
  g.strokeStyle = P.col("circuit-current");
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(cx, cy, 18, h * 0.3, 0, 0, TAU);
  g.stroke();
  g.strokeStyle = P.col("accent-text");
  g.lineWidth = 1.5;
  g.beginPath();
  g.ellipse(cx, cy - h * 0.38, 30, 8, 0, 0.2, Math.PI - 0.2);
  g.stroke();
  P.tag("omega", cx, 18);
  P.tag("B", cx, h - 14);
  // The e.m.f. against time.
  const gx = w * 0.58,
    gw = w * 0.38,
    amp = h * 0.28,
    pts = [];
  for (let i = 0; i <= 80; i++)
    pts.push([gx + (gw * i) / 80, cy - amp * Math.sin((i / 80) * 2 * TAU)]);
  P.line(
    [
      [gx, cy],
      [gx + gw, cy],
    ],
    "ink-soft",
    1,
  );
  P.line(pts, "circuit-current", 1.8);
  P.tag("emf", gx + gw / 8, cy - amp - 14);
  P.text("peak", gx + gw / 8 + 34, cy - amp + 4, "left");
  P.tag("N", gx, h - 14, "left");
  P.tag("A", gx + gw, h - 14, "right");
}

// A charge going round in a uniform B.
export function cyclotron(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g } = P,
    cx = w * 0.38,
    cy = h / 2,
    R = h * 0.36,
    q = P.value("q", 1);
  P.bRegion(20, 10, w - 20, h - 10, false);
  P.tag("B", w - 24, 22, "right");
  P.text("B out of the screen", w - 24, 46, "right");
  g.strokeStyle = P.col("vector-velocity");
  g.lineWidth = 1.5;
  g.setLineDash([5, 4]);
  g.beginPath();
  g.arc(cx, cy, R, 0, TAU);
  g.stroke();
  g.setLineDash([]);
  P.dim(cx, cy, cx + R, cy);
  P.tag("r", cx + R / 2, cy + 16);
  const by = cy - R;
  P.charge(cx, by, q, 9);
  // With B out of the screen a positive charge goes clockwise.
  const dir = q >= 0 ? 1 : -1;
  P.arrow(cx + dir * 11, by, cx + dir * 70, by, "vector-velocity");
  P.tag("v", cx + dir * 80, by, dir > 0 ? "left" : "right");
  P.arrow(cx, by + 11, cx, by + 50);
  P.text("F", cx + 8, by + 46, "left");
  P.tag("q", cx - 16, by - 18, "right");
  P.tag("m", w - 24, h - 20, "right");
}

// A velocity selector: E and B forces balance at one speed.
export function selector(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    x0 = w * 0.2,
    x1 = w * 0.75,
    top = 30,
    bottom = h - 30,
    y = h / 2;
  P.bRegion(x0, top + 4, x1, bottom - 4, true);
  P.plate(x0, top, x1, top, 1);
  P.plate(x0, bottom, x1, bottom, -1);
  P.line(
    [
      [30, y],
      [w - 30, y],
    ],
    "vector-velocity",
    1.5,
    [5, 4],
  );
  const x = (x0 + x1) / 2;
  P.charge(x, y, 1, 9);
  P.arrow(x, y + 10, x, y + 52);
  P.text("qE", x + 8, y + 44, "left");
  P.arrow(x, y - 10, x, y - 52);
  P.text("qvB", x + 8, y - 44, "left");
  P.arrow(40, y - 18, 90, y - 18, "vector-velocity");
  P.tag("v", 64, y - 38);
  P.tag("E", x1 + 14, top + 14, "left");
  P.tag("B", x1 + 14, bottom - 14, "left");
  P.text("B into the screen", x1 + 14, bottom - 38, "left");
}

// A mass spectrometer: accelerated through V, then bent round in B.
export function spectrometer(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g } = P,
    x0 = 30,
    x1 = w * 0.2,
    entry = w * 0.3,
    y = h - 30,
    R = Math.min(h - 60, (w - entry - 40) / 2) * 0.9,
    q = P.value("q", 1);
  P.plate(x0, y - 50, x0, y + 10, 1);
  P.plate(x1, y - 50, x1, y - 28, -1);
  P.plate(x1, y - 12, x1, y + 10, -1);
  P.tag("V", (x0 + x1) / 2, y - 64);
  P.line(
    [
      [x0 + 10, y - 20],
      [entry, y - 20],
    ],
    "vector-velocity",
    1.5,
  );
  // B into the screen bends a positive charge moving right upwards.
  P.bRegion(entry, 10, w - 20, y - 4, true);
  g.strokeStyle = P.col("vector-velocity");
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(entry + R, y - 20, R, Math.PI, 0);
  g.stroke();
  P.charge(entry + R, y - 20 - R, q, 8);
  P.dim(entry + R, y - 20, entry + 2 * R, y - 20);
  P.tag("r", entry + 1.5 * R, y - 4);
  P.line(
    [
      [entry + 2 * R - 14, y - 4],
      [entry + 2 * R + 14, y - 4],
    ],
    "structure",
    5,
  );
  P.text("detector", entry + 2 * R, y + 14);
  P.tag("B", w - 24, 26, "right");
  P.text("into the screen", w - 24, 50, "right");
  P.tag("m", w - 24, 76, "right");
  P.tag("q", w - 24, 102, "right");
}
