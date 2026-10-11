// Minitool pictures: circular motion and gravitation.
import { TAU, deg, picture } from "./draw.js";

// A body moving round a circle: radius, speed, and the inward a or F.
export function circle(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    cx = w * 0.36,
    cy = h / 2,
    R = Math.min(h * 0.38, w * 0.28),
    a = -50 * deg,
    bx = cx + R * Math.cos(a),
    by = cy + R * Math.sin(a);
  P.line(
    Array.from({ length: 121 }, (_, i) => [
      cx + R * Math.cos((i / 120) * TAU),
      cy + R * Math.sin((i / 120) * TAU),
    ]),
    "ink-soft",
    1,
    [4, 4],
  );
  P.ball(cx, cy, 3, "ink");
  P.dim(cx, cy, bx, by);
  P.tag("r", (cx + bx) / 2 + 10, (cy + by) / 2 + 12, "left");
  P.ball(bx, by, 11);
  // Moving anticlockwise: velocity along the tangent.
  const L = Math.abs(P.length("v", 30, 80)) || 50,
    tx = Math.sin(a),
    ty = -Math.cos(a);
  P.arrow(bx, by, bx + tx * L, by + ty * L, "vector-velocity");
  P.tag("v", bx + tx * L + 6, by + ty * L - 10, "left");
  const inward = P.has("F") ? "F" : P.has("a") ? "a" : null;
  if (inward) {
    const k = Math.min(R - 16, Math.abs(P.length(inward, 30, 80)));
    P.arrow(bx, by, bx - Math.cos(a) * k, by - Math.sin(a) * k);
    P.tag(inward, bx + 18, by + 18, "left");
  }
  const right = w - 24;
  let y = 30;
  for (const key of ["m", "T"])
    if (P.has(key)) {
      P.tag(key, right, y, "right");
      y += 26;
    }
  if (P.has("T")) P.text("T: time for one turn", right, y, "right");
}

// A car on a banked curve, seen from behind.
export function banked(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g } = P,
    th = Math.max(2, Math.min(60, P.value("theta", 20))) * deg,
    x0 = w * 0.18,
    y0 = h - 30,
    run = w * 0.5,
    rise = Math.min(run * Math.tan(th), h - 60),
    len = rise / Math.sin(th);
  g.fillStyle = P.col("body-wedge");
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x0 + len * Math.cos(th), y0);
  g.lineTo(x0 + len * Math.cos(th), y0 - rise);
  g.closePath();
  g.fill();
  P.angle(x0, y0, 34, -th, 0);
  P.tag("theta", x0 + 42, y0 - 10, "left");
  const t = 0.55,
    nx = -Math.sin(th),
    ny = -Math.cos(th),
    bx = x0 + len * t * Math.cos(th) + nx * 14,
    by = y0 - len * t * Math.sin(th) + ny * 14;
  P.block(bx, by, 40, 26, "body-block", -th);
  P.arrow(bx, by, bx + nx * 70, by + ny * 70);
  P.text("N", bx + nx * 80, by + ny * 80);
  P.arrow(bx, by, bx, by + 50);
  P.text("mg", bx + 8, by + 56, "left");
  P.arrow(bx, by, bx - 60, by, "accent-text");
  P.text("towards the centre", bx - 66, by, "right");
  P.tag("r", w - 24, 26, "right");
  P.tag("v", w - 24, 52, "right");
  P.tag("g", w - 24, 78, "right");
}

// A ball at the top of a vertical circle, going as slowly as it can.
export function vertical(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    cx = w * 0.38,
    cy = h * 0.55,
    R = h * 0.36;
  P.line(
    Array.from({ length: 121 }, (_, i) => [
      cx + R * Math.cos((i / 120) * TAU),
      cy + R * Math.sin((i / 120) * TAU),
    ]),
    "structure",
    2,
  );
  P.ball(cx, cy, 3, "ink");
  P.dim(cx, cy, cx + R * Math.cos(0.5), cy + R * Math.sin(0.5));
  P.tag("r", cx + R * 0.5, cy + R * 0.25 + 14, "left");
  P.ball(cx, cy - R, 11);
  P.arrow(cx, cy - R, cx - 70, cy - R, "vector-velocity");
  P.tag("v", cx - 76, cy - R - 2, "right");
  P.arrow(cx, cy - R, cx, cy - R + 46);
  P.text("mg", cx + 8, cy - R + 50, "left");
  P.text("at the top, weight alone", w - 24, h * 0.3, "right");
  P.text("gives the inward force", w - 24, h * 0.3 + 20, "right");
  P.tag("g", w - 24, h * 0.3 + 48, "right");
}

// A conical pendulum: a bob going round a horizontal circle.
export function conical(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g } = P,
    th = Math.max(3, Math.min(80, P.value("theta", 30))) * deg,
    px = w * 0.38,
    py = 18,
    L = Math.min((h - 50) / Math.cos(th), (w * 0.3) / Math.sin(th)),
    r = L * Math.sin(th),
    by = py + L * Math.cos(th);
  P.line(
    [
      [px - 40, py],
      [px + 40, py],
    ],
    "structure",
    3,
  );
  g.strokeStyle = P.col("ink-soft");
  g.setLineDash([4, 4]);
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(px, by, r, Math.max(6, r * 0.22), 0, 0, TAU);
  g.stroke();
  g.setLineDash([]);
  P.line(
    [
      [px, py],
      [px, by],
    ],
    "ink-soft",
    1,
    [3, 3],
  );
  P.line(
    [
      [px, py],
      [px + r, by],
    ],
    "ink",
    1.5,
  );
  P.angle(px, py, 30, Math.PI / 2 - th, Math.PI / 2);
  P.tag("theta", px + 8, py + 44, "left");
  P.tag("L", px + r / 2 + 14, (py + by) / 2, "left");
  P.ball(px + r, by, 11);
  P.arrow(px + r, by, px + r - 50, by, "accent-text");
  P.text("towards the centre", px + r - 56, by + 18, "right");
  P.tag("T", w - 24, 26, "right");
  P.tag("g", w - 24, 52, "right");
}

// Two masses attracting each other.
export function masses(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    y = h * 0.5,
    ax = w * 0.22,
    bx = w * 0.72;
  P.ball(ax, y, 34, "orbit-body");
  P.ball(bx, y, 12);
  P.tag("M", ax, y + 52);
  P.tag("m", bx, y + 30);
  P.dim(ax, y + 74, bx, y + 74);
  P.tag("r", (ax + bx) / 2, y + 74);
  P.text("centre to centre", (ax + bx) / 2, y + 96);
  const F = Math.abs(P.length("F", 30, 80));
  P.arrow(bx - 12, y, bx - 12 - F, y);
  P.arrow(ax + 34, y, ax + 34 + F, y);
  P.tag("F", (ax + bx) / 2, y - 26);
  P.tag("G", w - 20, 22, "right");
}

// A planet and a point at distance r: the field g, or the potential
// energy of a mass there.
export function gfield(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g } = P,
    cx = w * 0.2,
    cy = h * 0.55,
    R = 34,
    px = w * 0.7;
  g.strokeStyle = P.col("ink-soft");
  g.setLineDash([3, 5]);
  g.beginPath();
  g.arc(cx, cy, px - cx, -0.5, 0.5);
  g.stroke();
  g.setLineDash([]);
  P.ball(cx, cy, R, "orbit-body");
  P.tag("M", cx, cy + R + 18);
  P.dim(cx, cy - R - 26, px, cy - R - 26);
  P.tag("r", (cx + px) / 2, cy - R - 26);
  if (P.has("m")) {
    P.ball(px, cy, 9);
    P.tag("m", px, cy + 26);
    P.tag("Ep", px, cy + 52);
    P.text("zero far away; negative nearer", px, cy + 76);
  } else {
    P.ball(px, cy, 4, "ink");
    const L = Math.abs(P.length("g", 30, 90));
    P.arrow(px, cy, px - L, cy);
    P.tag("g", px - L / 2, cy + 22);
    P.text("force on each kg here", px, cy + 46);
  }
  P.tag("G", w - 20, h - 18, "right");
}

// A satellite in a circular orbit.
export function orbit(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    cx = w * 0.36,
    cy = h / 2,
    R = Math.min(h * 0.4, w * 0.28),
    a = -40 * deg,
    sx = cx + R * Math.cos(a),
    sy = cy + R * Math.sin(a);
  P.line(
    Array.from({ length: 121 }, (_, i) => [
      cx + R * Math.cos((i / 120) * TAU),
      cy + R * Math.sin((i / 120) * TAU),
    ]),
    "ink-soft",
    1,
    [4, 4],
  );
  P.ball(cx, cy, Math.min(26, R * 0.3), "orbit-body");
  P.tag("M", cx, cy + Math.min(26, R * 0.3) + 16);
  P.dim(cx, cy, sx, sy);
  P.tag("r", (cx + sx) / 2 + 10, (cy + sy) / 2 + 12, "left");
  P.ball(sx, sy, 7, "body-block");
  const tx = Math.sin(a),
    ty = -Math.cos(a);
  P.arrow(sx, sy, sx + tx * 56, sy + ty * 56, "vector-velocity");
  if (P.has("v")) P.tag("v", sx + tx * 56 + 6, sy + ty * 56 - 10, "left");
  const right = w - 22;
  let y = 26;
  for (const key of ["T", "G"])
    if (P.has(key)) {
      P.tag(key, right, y, "right");
      y += 26;
    }
  if (o.tool.id === "geostationary-orbit")
    P.text("period = one turn of the planet", right, y, "right");
}

// Launching at escape speed: the path never comes back.
export function escape(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    cx = w * 0.2,
    cy = h * 0.62,
    R = Math.min(h * 0.32, 60);
  P.ball(cx, cy, R, "orbit-body");
  P.tag("M", cx, cy + R + 16);
  P.dim(cx, cy, cx + R, cy);
  P.tag("r", cx + R + 12, cy, "left");
  const sx = cx + R * Math.cos(-0.5),
    sy = cy + R * Math.sin(-0.5);
  P.line(
    Array.from({ length: 40 }, (_, i) => {
      const t = i / 39;
      return [sx + t * (w * 0.7 - sx), sy - t * (sy - 20) + 40 * t * (1 - t)];
    }),
    "ink-soft",
    1.2,
    [5, 4],
  );
  P.ball(sx, sy, 6, "body-block");
  P.arrow(
    sx,
    sy,
    sx + 70 * Math.cos(-0.5),
    sy + 70 * Math.sin(-0.5),
    "vector-velocity",
  );
  P.tag("v", sx + 78 * Math.cos(-0.5), sy + 78 * Math.sin(-0.5) - 8, "left");
  P.text("total energy zero: never returns", w - 20, h - 22, "right");
  P.tag("G", 20, 22, "left");
}
