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

// Circles every 16 px along a horizontal line: a strip kept free of field
// arrows, where something is drawn.
function along(x0, x1, y, r) {
  const out = [];
  for (let x = x0; x <= x1; x += 16) out.push({ x, y, r });
  return out;
}

// A charge in a uniform field and the force on it.
export function fieldForce(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    x = w * 0.42,
    y = h * 0.5,
    q = P.value("q", 1);
  P.fieldArrows(10, 10, w - 10, h - 10, {
    clear: [
      ...along(x - 150, x + 150, y, 26),
      { x, y: y - 44, r: 30 },
      { x: w - 60, y: 22, r: 30 },
    ],
  });
  P.tag("E", w - 24, 22, "right");
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
  // The field at points on a lattice: away from a positive charge, towards
  // a negative one, shorter where it is weaker (as 1/r², down to a
  // smallest size that can still be seen).
  const step = 36;
  for (let x = cx - step * 6; x < w; x += step)
    for (let y = cy - step * 4; y < h; y += step) {
      const dx = x - cx,
        dy = y - cy,
        r = Math.hypot(dx, dy);
      if (x < 8 || y < 8 || r < 28) continue;
      if (Math.abs(y - cy) < 22 && x > px - 30) continue;
      if (Math.abs(y - (cy - 92)) < 16 && x > cx - 10 && x < px + 10) continue;
      if (Math.abs(y - (cy + 48)) < 14 && Math.abs(x - px) < 130) continue;
      const L = Math.max(5, Math.min(16, 16 * (60 / r) ** 2)) * sign(q),
        ux = dx / r,
        uy = dy / r;
      P.arrow(
        x - (ux * L) / 2,
        y - (uy * L) / 2,
        x + (ux * L) / 2,
        y + (uy * L) / 2,
        "field-electric",
        1.2,
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

// A charge deflected between horizontal plates. The path is the real
// parabola to scale between the plates: if the sideways displacement would be
// more than half the gap, the charge meets a plate part of the way along, and
// the picture stops it there.
export function deflection(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    x0 = w * 0.24,
    x1 = w * 0.72,
    top = 34,
    bottom = h - 52,
    mid = (top + bottom) / 2,
    half = (bottom - top) / 2,
    q = P.value("q", 1),
    yv = P.value("y", 0),
    d = P.value("d", 1),
    // The displacement at the far end, as a fraction of half the gap.
    ratio = Math.abs(yv / (d / 2)) || 0,
    hits = ratio > 1,
    // Where along the plates the path ends (1 is the far end).
    reach = hits ? Math.sqrt(1 / ratio) : 1,
    // Positive charges move towards the negative (lower) plate; the sign of
    // y says which way it is measured.
    down = (q >= 0 ? 1 : -1) * (yv < 0 ? -1 : 1),
    pts = [];
  P.plate(x0, top, x1, top, 1);
  P.plate(x0, bottom, x1, bottom, -1);
  for (let x = x0 + 20; x < x1; x += 40)
    P.arrow(x, top + 8, x, bottom - 8, "field-electric", 1);
  for (let i = 0; i <= 40; i++) {
    const t = (reach * i) / 40;
    pts.push([
      x0 + (x1 - x0) * t,
      mid + down * Math.min(half - 3, ratio * half * t * t),
    ]);
  }
  const [ex, ey] = pts[pts.length - 1];
  P.line(
    [
      [x0, mid],
      [x1 + 20, mid],
    ],
    "ink-soft",
    1,
    [3, 4],
  );
  P.line(
    [
      [26, mid],
      [x0, mid],
    ],
    "vector-velocity",
    1.5,
  );
  P.line(pts, "vector-velocity", 1.5);
  P.charge(34, mid, q, 8);
  P.arrow(44, mid, Math.min(x0 - 6, 92), mid, "vector-velocity");
  P.tag("u", 26, mid - 22, "left");
  if (hits) {
    P.ball(ex, ey, 3.5, "vector-velocity");
    P.text("hits the plate here", ex + 10, ey - down * 16, "left", "ink");
    P.tag("y", x1 + 22, mid + down * 16, "left");
    P.text("if the plate were not there", x1 + 22, mid + down * 38, "left");
  } else {
    P.arrow(
      ex - 1,
      ey - 0.05 * down * ratio * half,
      ex,
      ey,
      "vector-velocity",
    );
    P.dim(x1 + 14, mid, x1 + 14, ey);
    P.tag("y", x1 + 22, (mid + ey) / 2, "left");
  }
  P.dim(x0, bottom + 18, x1, bottom + 18);
  P.tag("L", (x0 + x1) / 2, bottom + 18);
  P.dim(x0 - 14, top, x0 - 14, bottom);
  P.tag("d", x0 - 22, bottom - 18, "right");
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

// B to the right, in the plane of the screen, as a lattice of arrows over
// the picture, kept clear of the circles in `clear`.
function bArrows(P, clear = []) {
  P.fieldArrows(10, 10, P.w - 10, P.h - 10, {
    colour: "field-magnetic",
    clear,
  });
}

// The force on a charge moving at an angle to B.
export function movingCharge(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    x = w * 0.36,
    y = h * 0.58,
    th = P.value("theta", 90) * deg;
  const L = Math.abs(P.length("v", 40, 100));
  bArrows(P, [
    ...along(x - 20, x + 110, y, 22),
    ...[0.25, 0.5, 0.75, 1].map((f) => ({
      x: x + L * f * Math.cos(th),
      y: y - L * f * Math.sin(th),
      r: 24,
    })),
    { x: x - 16, y: y + 24, r: 24 },
    ...along(w * 0.72 - 60, w * 0.72 + 50, y + 13, 30),
    { x: w - 50, y: 22, r: 30 },
  ]);
  P.tag("B", w - 24, 22, "right");
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
  P.arrow(
    x + 11 * Math.cos(th),
    y - 11 * Math.sin(th),
    x + L * Math.cos(th),
    y - L * Math.sin(th),
    "vector-velocity",
  );
  P.tag("v", x + L * Math.cos(th) + 6, y - L * Math.sin(th) - 8, "left");
  P.angle(x, y, 28, -th, 0);
  P.tag("theta", x + 36, y + 14, "left");
  // F = qv × B: into the screen for a positive charge here.
  const into = P.value("q", 1) >= 0;
  P.outOf(w * 0.72, y, 9, "vector-force", into);
  P.tag("F", w * 0.72 + 16, y, "left");
  P.text(`${into ? "into" : "out of"} the screen`, w * 0.72, y + 26);
}

// The force on a current-carrying rod in B. Flexible leads join its ends to
// a cell, so the current has a complete circuit to flow round.
export function wireForce(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    th = P.value("theta", 90) * deg,
    L = 60 + 0.6 * Math.abs(P.length("l", 0, 100)),
    cell = 34,
    x = Math.max(w * 0.36, cell + 100 + L * Math.max(0, -Math.cos(th))),
    y = h * 0.66,
    ex = x + L * Math.cos(th),
    ey = y - L * Math.sin(th),
    mid = (y + ey) / 2,
    // The current runs from the + terminal, up the lead to the rod's lower
    // end, along the rod and back.
    sx = -Math.sin(th),
    sy = -Math.cos(th);
  bArrows(P, [
    ...[0, 0.25, 0.5, 0.75, 1].map((f) => ({
      x: x + L * f * Math.cos(th),
      y: y - L * f * Math.sin(th),
      r: 30,
    })),
    { x: x + 40, y: y + 10, r: 30 },
    ...along(w * 0.76 - 40, w * 0.76 + 60, y + 13, 30),
    { x: w - 50, y: 22, r: 30 },
    { x: cell, y: mid, r: 28 },
  ]);
  P.tag("B", w - 24, 22, "right");
  P.line(
    [
      [x, y],
      [x, h - 12],
      [cell, h - 12],
      [cell, mid + 5],
    ],
    "ink",
    1.2,
  );
  P.line(
    [
      [ex, ey],
      [ex, 12],
      [cell, 12],
      [cell, mid - 5],
    ],
    "ink",
    1.2,
  );
  P.line(
    [
      [cell - 13, mid + 5],
      [cell + 13, mid + 5],
    ],
    "ink",
    1.5,
  );
  P.line(
    [
      [cell - 7, mid - 5],
      [cell + 7, mid - 5],
    ],
    "ink",
    3.5,
  );
  P.text("+", cell + 18, mid + 9, "left");
  P.line(
    [
      [x, y],
      [ex, ey],
    ],
    "structure",
    5,
  );
  P.arrow(
    x + (L / 2 - 24) * Math.cos(th) + 13 * sx,
    y - (L / 2 - 24) * Math.sin(th) + 13 * sy,
    x + (L / 2 + 24) * Math.cos(th) + 13 * sx,
    y - (L / 2 + 24) * Math.sin(th) + 13 * sy,
    "circuit-current",
    2.5,
  );
  P.tag(
    "I",
    x + (L / 2) * Math.cos(th) + 30 * sx,
    y - (L / 2) * Math.sin(th) + 30 * sy,
    sx < -0.5 ? "right" : "center",
  );
  P.tag("l", ex + 10 * Math.sign(Math.cos(th) || 1), ey, Math.cos(th) < -0.1 ? "right" : "left");
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
  P.outOf(w * 0.76, y, 9, "vector-force", true);
  P.tag("F", w * 0.76 + 16, y, "left");
  P.text("F into the screen", w * 0.76, y + 26);
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
  bArrows(P, [
    ...[-1, -0.5, 0, 0.5, 1].map((f) => ({
      x: cx - Math.sin(th) * half * f,
      y: cy - Math.cos(th) * half * f,
      r: 22,
    })),
    ...[0.3, 0.6, 1, 1.25].map((f) => ({
      x: cx + Math.cos(th) * 70 * f,
      y: cy - Math.sin(th) * 70 * f,
      r: 22,
    })),
    { x: cx + 50, y: cy + 16, r: 28 },
    { x: w - 50, y: h - 14, r: 30 },
    ...along(w * 0.2 - 60, w * 0.2 + 60, h - 14, 16),
    { x: w - 50, y: 22, r: 30 },
  ]);
  P.tag("B", w - 24, 22, "right");
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
  if (Math.abs(th) < 45 * deg) P.tag("theta", cx + 40, cy + 16, "left");
  else
    P.tag(
      "theta",
      cx + 56 * Math.cos(th / 2),
      cy - 56 * Math.sin(th / 2),
      "left",
    );
  P.tag("A", cx + ny * half - 12, cy - nx * half - 6, "right");
  P.tag("Phi", w - 24, h - 14, "right");
  P.text("loop seen edge on", w * 0.2, h - 14);
}

// A magnet moving into a coil: the changing flux makes an e.m.f.
export function faraday(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g } = P,
    cx = w * 0.52,
    cy = h * 0.5,
    N = Math.max(1, Math.round(Math.abs(P.value("N", 4)))),
    // Every turn is drawn, up to 40; a bigger coil is drawn with 40 and
    // says so.
    turns = Math.min(N, 40),
    coil = P.helix(cx - 55, cy, cx + 55, cy, 38, turns);
  if (turns < N) P.text(`drawn with 40 of its ${N} turns`, cx, cy - 56);
  const [sx, sy] = coil.start,
    [ex, ey] = coil.end;
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
      [ex, ey],
      [ex, 20],
      [w - 60, 20],
      [w - 60, cy - 14],
    ],
    "ink",
    1.2,
  );
  P.line(
    [
      [sx, sy],
      [sx, h - 20],
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
  P.tag("v", x + 14, (top + bottom) / 2 - 20, "left");
  P.dim(x - 18, top, x - 18, bottom);
  P.tag("l", x - 24, (top + bottom) / 2, "right");
  P.tag("emf", 62, (top + bottom) / 2, "left");
}

// A transformer: two coils on one soft-iron core, and the magnetic field
// lines going round inside the core. The coils are drawn with their turns in
// the true ratio when that fits (at most 24 turns on the bigger one).
export function transformer(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g } = P,
    cx = w / 2,
    cy = h / 2,
    cw = Math.min(200, w * 0.36),
    ch = h * 0.66,
    band = 18;
  g.strokeStyle = P.col("structure");
  g.lineWidth = band;
  g.strokeRect(cx - cw / 2, cy - ch / 2, cw, ch);
  // Field lines: closed loops along the core, clockwise here.
  for (const inset of [-5, 5]) {
    const x0 = cx - cw / 2 - inset,
      y0 = cy - ch / 2 - inset,
      x1 = cx + cw / 2 + inset,
      y1 = cy + ch / 2 + inset;
    P.line(
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
        [x0, y0],
      ],
      "field-magnetic",
      1.2,
      [5, 4],
    );
    P.arrow(cx - 6, y0, cx + 6, y0, "field-magnetic", 1.4);
    P.arrow(cx + 6, y1, cx - 6, y1, "field-magnetic", 1.4);
  }
  P.text("field lines in the iron core", cx, cy - ch / 2 - 22);
  const np = Math.max(1, Math.round(Math.abs(P.value("Np", 100)))),
    ns = Math.max(1, Math.round(Math.abs(P.value("Ns", 100)))),
    most = Math.max(np, ns),
    k = Math.min(1, 24 / most),
    shown = (n) => Math.max(1, Math.round(n * k));
  const coil = (x, n, side) => {
    const span = ch * 0.6,
      c = P.helix(x, cy - span / 2, x, cy + span / 2, 17, shown(n));
    P.line(
      [
        c.start,
        [x + side * 60, c.start[1]],
      ],
      "ink",
      1.2,
    );
    P.line(
      [
        c.end,
        [x + side * 60, c.end[1]],
      ],
      "ink",
      1.2,
    );
  };
  coil(cx - cw / 2, np, -1);
  coil(cx + cw / 2, ns, 1);
  if (k < 1) {
    // In the window of the core, which is otherwise empty.
    P.text("turns drawn in", cx, cy - 10);
    P.text(
      `the ratio ${np} : ${ns}` +
        (shown(np) * ns !== shown(ns) * np ? " (roughly)" : ""),
      cx,
      cy + 10,
    );
  }
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
  P.tag("emf", gx + 4, cy - amp - 14, "left");
  P.text("peak", gx + gw / 8 + 34, cy - amp + 6, "left");
  P.tag("N", gx, h - 14, "left");
  P.tag("A", gx + gw, h - 14, "right");
}

// A charge going round in a uniform B.
export function cyclotron(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g } = P,
    cx = w * 0.38,
    cy = h / 2,
    R = Math.abs(P.length("r", h * 0.16, h * 0.38)) || h * 0.3,
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
  P.arrow(cx, by + 11, cx, by + Math.min(50, R - 8));
  P.text("F", cx + 8, by + Math.min(46, R - 12), "left");
  P.tag("q", cx - dir * 16, by - 18, dir > 0 ? "right" : "left");
  P.tag("m", w - 24, h - 20, "right");
}

// A velocity selector: E and B forces balance at one speed. The charge at
// that speed goes straight through; a faster one is bent towards the qvB
// side, a slower one towards the qE side.
export function selector(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g } = P,
    x0 = w * 0.2,
    x1 = w * 0.75,
    top = 30,
    bottom = h - 30,
    y = h / 2;
  P.bRegion(x0, top + 4, x1, bottom - 4, true);
  P.plate(x0, top, x1, top, 1);
  P.plate(x0, bottom, x1, bottom, -1);
  // Faster (bent up, magnetic force wins) and slower (bent down, electric
  // force wins): drawn faintly.
  for (const [bend, label] of [
    [-1, "faster: qvB wins"],
    [1, "slower: qE wins"],
  ]) {
    const pts = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      pts.push([x0 + (x1 - x0) * t, y + bend * (h * 0.3) * t * t]);
    }
    g.globalAlpha = 0.55;
    P.line([[30, y], ...pts], "vector-velocity", 1.3, [4, 3]);
    g.globalAlpha = 1;
    const [ex, ey] = pts[pts.length - 1];
    P.text(label, ex + 8, ey, "left");
  }
  P.line(
    [
      [30, y],
      [w - 30, y],
    ],
    "vector-velocity",
    1.5,
  );
  P.text("just right: goes straight through", x1 + 8, y - 14, "left");
  const x = (x0 + x1) / 2;
  P.charge(x, y, 1, 9);
  P.arrow(x + 11, y, x + 60, y, "vector-velocity");
  P.tag("v", x + 44, y - 16);
  P.arrow(x, y + 10, x, y + 48);
  P.text("qE", x - 8, y + 40, "right");
  P.arrow(x, y - 10, x, y - 48);
  P.text("qvB", x - 8, y - 40, "right");
  P.tag("E", x0 - 8, top + 14, "right");
  P.tag("B", x0 - 8, bottom - 14, "right");
  P.text("B into the screen", x0 - 8, bottom - 38, "right");
}

// A mass spectrometer: accelerated through V, then bent through half a
// circle in B. As in the mini simulation, the field is out of the screen, so
// a positive charge moving right is pushed downwards (F = qv × B) and comes
// back out of the field a diameter below where it went in.
export function spectrometer(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g } = P,
    x0 = 26,
    x1 = w * 0.16,
    entry = w * 0.3,
    top = 44,
    R = Math.min((h - top - 34) / 2, w - entry - 150),
    q = P.value("q", 1);
  P.plate(x0, top - 30, x0, top + 30, 1);
  P.plate(x1, top - 30, x1, top - 8, -1);
  P.plate(x1, top + 8, x1, top + 30, -1);
  P.tag("V", (x0 + x1) / 2, top + 48);
  P.bRegion(entry, 8, w - 14, h - 8, false);
  // From rest at the first plate, straight to the edge of the field.
  P.line(
    [
      [x0 + 10, top],
      [entry, top],
    ],
    "vector-velocity",
    1.5,
  );
  g.strokeStyle = P.col("vector-velocity");
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(entry, top + R, R, -Math.PI / 2, Math.PI / 2);
  g.stroke();
  // Leaving the field again, towards the detector.
  P.line(
    [
      [entry, top + 2 * R],
      [entry - 34, top + 2 * R],
    ],
    "vector-velocity",
    1.5,
  );
  P.charge(entry + R, top + R, q, 8);
  P.dim(entry, top + R, entry + R - 12, top + R);
  P.tag("r", entry + R / 2, top + R - 14);
  P.line(
    [
      [entry - 38, top + 2 * R - 14],
      [entry - 38, top + 2 * R + 14],
    ],
    "structure",
    5,
  );
  P.text("detector", entry - 46, top + 2 * R + 4, "right");
  P.text("goes in", entry - 8, top - 12, "right");
  P.tag("B", w - 24, 30, "right");
  P.text("out of the screen", w - 24, 54, "right");
  P.tag("m", w - 24, 80, "right");
  P.tag("q", w - 24, 106, "right");
}
