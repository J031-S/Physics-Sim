// Minitool pictures: motion, forces, energy and momentum.
import { deg, picture } from "./draw.js";

// A body moving along a line: start and end, u and v, a, s and t.
export function motion(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    y = h * 0.58,
    // The end is drawn on the side the displacement points to.
    back = P.has("s") && P.value("s") < 0,
    x0 = back ? w - 120 : 120,
    x1 = back ? 120 : w - 120;
  P.ground(30, w - 30, y + 14);
  P.ball(x0, y, 13, "body-ball", P.has("u") ? 1 : 0.45);
  P.ball(x1, y, 13);
  P.text("start", x0, y + 34);
  if (P.has("t")) P.tag("t", x1, y + 34);
  else P.text("end", x1, y + 34);
  if (P.has("u")) {
    const L = P.length("u", 16, 80);
    P.arrow(x0, y, x0 + L, y, "vector-velocity");
    P.tag("u", x0 + L / 2, y - 26);
  }
  if (P.has("v")) {
    const L = P.length("v", 16, 80);
    P.arrow(x1, y, x1 + L, y, "vector-velocity");
    P.tag("v", x1 + L / 2, y - 26);
  }
  const mid = (x0 + x1) / 2;
  if (P.has("a")) {
    const L = P.length("a", 14, 60);
    P.arrow(mid - L / 2, h * 0.2, mid + L / 2, h * 0.2, "vector-force");
    P.tag("a", mid, h * 0.2 - 20);
  }
  if (P.has("vav")) {
    const L = P.length("vav", 16, 80);
    P.arrow(mid - L / 2, y - 26, mid + L / 2, y - 26, "vector-velocity");
    P.tag("vav", mid, y - 46);
  }
  if (P.has("s")) {
    P.dim(x0, y + 56, x1, y + 56);
    P.tag("s", mid, y + 56);
  }
}

// A force accelerating a block on a smooth floor.
export function push(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    y = h * 0.66,
    x = w * 0.4,
    size = 30 + 20 * Math.min(1, Math.max(0, P.length("m", 0, 1)));
  P.ground(30, w - 30, y);
  P.block(x, y - size / 2, size, size);
  P.tag("m", x, y + 20);
  const F = P.length("F", 20, 120);
  P.arrow(x + size / 2, y - size / 2, x + size / 2 + F, y - size / 2);
  P.tag("F", x + size / 2 + Math.max(F, 0) + 8, y - size / 2, "left");
  const a = P.length("a", 16, 90);
  P.arrow(x - a / 2, y - size - 22, x + a / 2, y - size - 22, "accent-text");
  P.tag("a", x, y - size - 42);
  P.text("smooth floor", w - 40, y + 20, "right");
}

// The weight of a mass in a gravitational field.
export function weight(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    gy = h - 22,
    x = w * 0.42,
    y = h * 0.3;
  P.ground(30, w - 30, gy);
  P.ball(x, y, 16);
  P.tag("m", x - 26, y, "right");
  const W = P.length("W", 24, gy - y - 30);
  P.arrow(x, y + 16, x, y + 16 + W);
  P.tag("W", x + 12, y + 16 + W / 2, "left");
  // The field: g as faint downward arrows.
  for (const fx of [w * 0.72, w * 0.82, w * 0.92])
    P.arrow(fx, h * 0.18, fx, h * 0.18 + 40, "ink-soft", 1.2);
  P.tag("g", w * 0.82, h * 0.18 + 60);
}

// Friction on a block sliding along a rough floor.
export function friction(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    y = h * 0.72,
    x = w * 0.45,
    s = 56;
  P.ground(30, w - 30, y);
  P.block(x, y - s / 2, s, s);
  P.arrow(
    x + s / 2 + 20,
    y - s + 6,
    x + s / 2 + 80,
    y - s + 6,
    "vector-velocity",
    1.5,
  );
  P.text("sliding", x + s / 2 + 88, y - s + 6, "left");
  const N = Math.abs(P.length("N", 24, y - s - 24));
  P.arrow(x, y - s, x, y - s - N);
  P.tag("N", x + 10, y - s - N * 0.7, "left");
  const F = Math.abs(P.length("Ff", 20, 110));
  P.arrow(x - s / 2, y - 6, x - s / 2 - F, y - 6);
  P.tag("Ff", x - s / 2 - F / 2, y + 22);
  P.tag("mu", w - 40, y + 22, "right");
}

// A turning force on a spanner about a pivot.
export function torque(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    px = w * 0.2,
    py = h * 0.62,
    r = 60 + 0.5 * Math.abs(P.length("r", 0, w * 0.5)),
    th = P.value("theta", 90) * deg,
    ex = px + r,
    F = Math.abs(P.length("F", 30, 90));
  P.line(
    [
      [px, py],
      [ex, py],
    ],
    "structure",
    9,
  );
  P.ball(px, py, 8, "structure");
  P.dim(px, py + 22, ex, py + 22);
  P.tag("r", (px + ex) / 2, py + 22);
  // The force at angle θ to the spanner, turning it anticlockwise.
  const fx = ex + F * Math.cos(-th),
    fy = py + F * Math.sin(-th);
  P.line(
    [
      [ex, py],
      [ex + 46, py],
    ],
    "ink-soft",
    1,
    [3, 3],
  );
  P.arrow(ex, py, fx, fy);
  P.angle(ex, py, 22, -th, 0);
  P.tag("theta", ex + 30, py + 20, "left");
  P.tag(
    "F",
    fx + 12 * Math.cos(th),
    fy - 14 * Math.sin(th) - 4,
    Math.cos(th) >= -0.2 ? "left" : "right",
  );
  // The turning effect about the pivot.
  P.ctx.strokeStyle = P.col("accent-text");
  P.ctx.lineWidth = 1.8;
  P.ctx.beginPath();
  P.ctx.arc(px, py, 30, -0.2, -Math.PI * 0.85, true);
  P.ctx.stroke();
  const a = -Math.PI * 0.85;
  P.arrow(
    px + 30 * Math.cos(a + 0.2),
    py + 30 * Math.sin(a + 0.2),
    px + 30 * Math.cos(a),
    py + 30 * Math.sin(a),
    "accent-text",
  );
  P.tag("tau", px, py - 46);
  P.text("pivot", px, py + 44);
}

// A moving body: its mass, velocity and momentum or kinetic energy.
export function moving(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    y = h * 0.62,
    x = w * 0.35,
    r = 12 + 14 * Math.min(1, Math.max(0, P.length("m", 0, 1)));
  P.ground(30, w - 30, y + r);
  P.ball(x, y, r);
  P.tag("m", x, y + r + 20);
  const L = P.length("v", 24, 140);
  P.arrow(x + r, y, x + r + L, y, "vector-velocity");
  P.tag("v", x + r + Math.max(L, 0) + 8, y, "left");
  for (const key of ["p", "Ek"]) if (P.has(key)) P.tag(key, x, y - r - 26);
}

// An impulse: a force for a time changes a body's velocity.
export function impulse(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    y = h * 0.55,
    x = w * 0.22;
  P.ball(x, y, 16);
  P.tag("m", x, y + 32);
  const F = P.length("F", 24, 80);
  P.arrow(x - 16 - F, y, x - 16, y);
  P.tag("F", x - 16 - F / 2, y - 18);
  const dv = P.length("dv", 20, 70);
  P.arrow(x + 16, y, x + 16 + dv, y, "vector-velocity");
  P.tag("dv", x + 20 + Math.max(dv, 0), y - 18, "left");
  // F against t: the impulse is the area under it.
  const gx = w * 0.56,
    gy = h * 0.82,
    gw = w * 0.36,
    gh = h * 0.6,
    bw = Math.max(20, Math.abs(P.length("dt", 20, gw * 0.8))),
    bh = Math.max(16, (gh * 0.8 * Math.abs(F)) / 80);
  P.line(
    [
      [gx, gy - gh],
      [gx, gy],
      [gx + gw, gy],
    ],
    "ink-soft",
    1,
  );
  P.text("F", gx - 10, gy - gh + 6);
  P.text("t", gx + gw + 2, gy + 12, "left");
  P.ctx.fillStyle = P.col("vector-force");
  P.ctx.globalAlpha = 0.25;
  P.ctx.fillRect(gx + 20, gy - bh, bw, bh);
  P.ctx.globalAlpha = 1;
  P.line(
    [
      [gx + 20, gy],
      [gx + 20, gy - bh],
      [gx + 20 + bw, gy - bh],
      [gx + 20 + bw, gy],
    ],
    "vector-force",
    2,
  );
  P.dim(gx + 20, gy + 16, gx + 20 + bw, gy + 16);
  P.tag("dt", gx + 20 + bw / 2, gy + 16);
  P.text("area FΔt = mΔv", gx + 20 + bw / 2, gy - bh - 14);
}

// Work done by a force at an angle over a displacement.
export function work(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    y = h * 0.74,
    x0 = 80,
    x1 = w * 0.55,
    s = 36,
    th = P.value("theta", 0) * deg;
  P.ground(30, w - 30, y);
  P.block(x0, y - s / 2, s, s, "body-block", 0, 0.35);
  P.block(x1, y - s / 2, s, s);
  P.dim(x0, y + 18, x1, y + 18);
  P.tag("s", (x0 + x1) / 2, y + 18);
  const F = Math.abs(P.length("F", 40, 100)),
    ax = x1 + s / 2,
    ay = y - s / 2;
  P.line(
    [
      [ax, ay],
      [ax + 60, ay],
    ],
    "ink-soft",
    1,
    [3, 3],
  );
  P.arrow(ax, ay, ax + F * Math.cos(th), ay - F * Math.sin(th));
  P.angle(ax, ay, 26, -th, 0);
  P.tag("theta", ax + 34, ay + 14, "left");
  P.tag("F", ax + F * Math.cos(th) + 6, ay - F * Math.sin(th) - 10, "left");
  P.tag("W", (x0 + x1) / 2, h * 0.18);
}

// A body at a height: its potential energy, or its speed after falling.
export function drop(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    gy = h - 24,
    x = w * 0.4,
    top = 34;
  P.ground(30, w - 30, gy);
  P.ball(x, top, 13);
  P.dim(x - 60, top, x - 60, gy);
  P.tag("h", x - 66, (top + gy) / 2, "right");
  P.tag("m", x + 22, top, "left");
  P.tag("Ep", x + 22, top + 24, "left");
  P.line(
    [
      [x, top + 16],
      [x, gy - 16],
    ],
    "ink-soft",
    1,
    [3, 4],
  );
  if (P.has("v")) {
    P.ball(x, gy - 13, 13, "body-ball", 0.5);
    const L = Math.abs(P.length("v", 20, 50));
    P.arrow(x + 24, gy - 13 - L, x + 24, gy - 13, "vector-velocity");
    P.tag("v", x + 34, gy - 13 - L / 2, "left");
  }
  P.arrow(w * 0.82, h * 0.25, w * 0.82, h * 0.25 + 40, "ink-soft", 1.2);
  P.tag("g", w * 0.82, h * 0.25 + 60);
}

// A motor lifting a load: work done in a time.
export function power(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    x = w * 0.42,
    top = 30;
  P.line(
    [
      [x - 70, top - 8],
      [x + 70, top - 8],
    ],
    "structure",
    3,
  );
  P.block(x, top + 14, 56, 34, "structure");
  P.text("motor", x - 36, top + 14, "right");
  P.line(
    [
      [x, top + 31],
      [x, h * 0.62],
    ],
    "ink",
    1.5,
  );
  P.block(x, h * 0.62 + 16, 40, 32);
  P.arrow(x + 40, h * 0.7, x + 40, h * 0.45, "vector-velocity");
  P.tag("P", x + 44, top + 14, "left");
  P.tag("W", x + 52, h * 0.58, "left");
  P.tag("t", x + 52, h * 0.58 + 24, "left");
  P.ground(30, w - 30, h - 16);
}

// A car driven by a force at a speed.
export function drive(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    y = h * 0.72,
    x = w * 0.36;
  P.ground(30, w - 30, y);
  P.block(x, y - 26, 90, 30);
  P.block(x - 10, y - 50, 50, 20, "body-block", 0, 0.8);
  P.ball(x - 28, y - 9, 9, "structure");
  P.ball(x + 28, y - 9, 9, "structure");
  const F = P.length("F", 24, 110);
  P.arrow(x + 45, y - 26, x + 45 + F, y - 26);
  P.tag("F", x + 52 + Math.max(F, 0), y - 26, "left");
  const v = P.length("v", 24, 110);
  P.arrow(x - 20, y - 76, x - 20 + v, y - 76, "vector-velocity");
  P.tag("v", x - 12 + Math.max(v, 0), y - 76, "left");
  P.tag("P", w - 40, h * 0.16, "right");
}

// A spring stretched by a force from its natural length.
export function hooke(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    y = h * 0.5,
    wall = 40,
    natural = w * 0.36,
    ext = Math.max(4, Math.abs(P.length("x", 14, w * 0.3))),
    end = wall + natural + ext;
  P.line(
    [
      [wall, y - 50],
      [wall, y + 50],
    ],
    "structure",
    4,
  );
  P.spring(wall, y, end, y, 9, 9);
  P.block(end + 16, y, 32, 32);
  P.tag("k", wall + (end - wall) / 2, y - 26);
  P.line(
    [
      [wall + natural, y + 22],
      [wall + natural, y + 64],
    ],
    "ink-soft",
    1,
    [3, 3],
  );
  P.text("natural length", wall + natural - 6, y + 74, "right");
  P.dim(wall + natural, y + 52, end, y + 52);
  P.tag("x", (wall + natural + end) / 2 + 30, y + 74, "left");
  if (P.has("F")) {
    const F = Math.abs(P.length("F", 24, 90));
    P.arrow(end + 32, y, end + 32 + F, y);
    P.tag("F", end + 36 + F, y - 18, "left");
  }
  if (P.has("Es")) P.tag("Es", w - 30, h * 0.14, "right");
}

// A mass bouncing on a spring.
export function springMass(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    x = w * 0.4,
    top = 18,
    end = h * 0.62;
  P.line(
    [
      [x - 50, top],
      [x + 50, top],
    ],
    "structure",
    4,
  );
  P.spring(x, top, x, end, 8, 10);
  P.block(x, end + 18, 40, 36);
  P.tag("k", x + 22, (top + end) / 2, "left");
  P.tag("m", x + 30, end + 18, "left");
  P.arrow(x - 50, end + 4, x - 50, end - 30, "vector-velocity", 1.5);
  P.arrow(x - 50, end + 30, x - 50, end + 64, "vector-velocity", 1.5);
  P.text("oscillates", x - 60, end + 18, "right");
  P.tag("T", w - 40, h * 0.2, "right");
}

// A block on a slope: weight, normal force, friction and acceleration.
export function ramp(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g } = P,
    th = Math.max(3, Math.min(70, P.value("theta", 30))) * deg,
    x0 = 50,
    y0 = h - 22,
    run = Math.min(w * 0.62, (h - 50) / Math.tan(th)),
    rise = run * Math.tan(th);
  g.fillStyle = P.col("body-wedge");
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x0 + run, y0);
  g.lineTo(x0 + run, y0 - rise);
  g.closePath();
  g.fill();
  P.ground(20, w - 20, y0);
  P.angle(x0, y0, 36, -th, 0);
  P.tag("theta", x0 + 44, y0 - 12, "left");
  // The block, sitting on the slope.
  const t = 0.62,
    s = 30,
    nx = -Math.sin(th),
    ny = -Math.cos(th),
    bx = x0 + run * t + nx * (s / 2),
    by = y0 - rise * t + ny * (s / 2);
  P.block(bx, by, s, s, "body-block", -th);
  P.arrow(bx, by, bx, by + 60);
  P.text("mg", bx + 8, by + 64, "left");
  P.arrow(bx, by, bx + nx * 55, by + ny * 55);
  P.text("N", bx + nx * 64, by + ny * 64);
  const up = [Math.cos(th), -Math.sin(th)];
  if (P.value("mu") > 0) {
    P.arrow(bx, by, bx + up[0] * 46, by + up[1] * 46);
    P.tag("mu", bx + up[0] * 52, by + up[1] * 52 - 14, "left");
  }
  if (P.value("a") > 0) {
    const L = Math.abs(P.length("a", 24, 70));
    P.arrow(
      bx - up[0] * (s / 2 + 4) + nx * 26,
      by - up[1] * (s / 2 + 4) + ny * 26,
      bx - up[0] * (s / 2 + 4 + L) + nx * 26,
      by - up[1] * (s / 2 + 4 + L) + ny * 26,
      "accent-text",
    );
  } else P.text("stays put: friction holds it", w - 30, 24, "right");
  P.tag("a", w - 30, 50, "right");
  P.tag("g", w - 30, 76, "right");
}

// A one-dimensional collision, before and after.
export function collision(ctx, o) {
  const P = picture(ctx, o),
    { w, h, value } = P,
    m1 = value("m1", 1),
    m2 = value("m2", 1),
    u1 = value("u1"),
    u2 = value("u2"),
    v1 = value("v1"),
    v2 = (m1 * u1 + m2 * u2 - m1 * v1) / m2,
    r1 = 10 + 10 * Math.min(1, Math.max(0, P.length("m1", 0, 1))),
    r2 = 10 + 10 * Math.min(1, Math.max(0, P.length("m2", 0, 1))),
    rows = [h * 0.3, h * 0.76],
    a = w * 0.34,
    b = w * 0.62;
  P.text("before", 20, rows[0] - 34, "left");
  P.text("after", 20, rows[1] - 34, "left");
  for (const y of rows) P.ground(20, w - 20, y + 20);
  P.ball(a, rows[0] + 20 - r1, r1);
  P.ball(b, rows[0] + 20 - r2, r2, "body-block");
  P.tag("m1", a, rows[0] + 34);
  P.tag("m2", b, rows[0] + 34);
  const arrowAt = (x, y, r, key, x2) => {
    const L = P.length(key, 18, 60, x2);
    if (!L) return;
    const start = x + Math.sign(L) * r;
    P.arrow(start, y, start + L, y, "vector-velocity");
  };
  arrowAt(a, rows[0] + 20 - r1, r1, "u1");
  arrowAt(b, rows[0] + 20 - r2, r2, "u2");
  P.tag("u1", a, rows[0] - 26 - r1);
  P.tag("u2", b, rows[0] - 26 - r2);
  P.ball(a - 20, rows[1] + 20 - r1, r1);
  P.ball(b + 20, rows[1] + 20 - r2, r2, "body-block");
  arrowAt(a - 20, rows[1] + 20 - r1, r1, "v1");
  arrowAt(b + 20, rows[1] + 20 - r2, r2, "u2", v2);
  P.tag("v1", a - 20, rows[1] - 26 - r1);
  if (Number.isFinite(v2))
    P.text(
      `v₂ = ${v2.toPrecision(3).replace("-", "−")} m/s (momentum)`,
      b + 20,
      rows[1] - 26 - r2,
    );
  P.tag("e", w - 24, rows[0] - 34, "right");
}

// A simple pendulum.
export function pendulum(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    px = w * 0.38,
    py = 20,
    L = h - 66,
    a = 18 * deg,
    bx = px + L * Math.sin(a),
    by = py + L * Math.cos(a);
  P.line(
    [
      [px - 40, py],
      [px + 40, py],
    ],
    "structure",
    3,
  );
  P.line(
    [
      [px, py],
      [px, py + L + 14],
    ],
    "ink-soft",
    1,
    [3, 4],
  );
  P.ctx.strokeStyle = P.col("ink-soft");
  P.ctx.setLineDash([3, 4]);
  P.ctx.beginPath();
  P.ctx.arc(px, py, L, Math.PI / 2 - a, Math.PI / 2 + a);
  P.ctx.stroke();
  P.ctx.setLineDash([]);
  P.line(
    [
      [px, py],
      [bx, by],
    ],
    "ink",
    1.5,
  );
  P.ball(bx, by, 12);
  P.tag("L", (px + bx) / 2 + 10, (py + by) / 2, "left");
  P.ball(px - L * Math.sin(a), by, 12, "body-ball", 0.3);
  P.tag("T", w - 30, h * 0.22, "right");
  P.text("one period: there and back", w - 30, h * 0.22 + 22, "right");
  P.tag("g", w - 30, h * 0.22 + 50, "right");
}

// A projectile launched over level ground.
export function projectile(ctx, o) {
  const P = picture(ctx, o),
    { w, h, value } = P,
    u = value("u", 10),
    th = value("theta", 45) * deg,
    g = value("g", 9.81),
    R = (u * u * Math.sin(2 * th)) / g,
    H = (u * u * Math.sin(th) ** 2) / (2 * g),
    x0 = 50,
    y0 = h - 40,
    k = Math.min((w - 110) / Math.max(R, 1e-6), (h - 90) / Math.max(H, 1e-6));
  P.ground(20, w - 20, y0);
  if (!(R > 0)) return;
  const pts = [];
  const T = (2 * u * Math.sin(th)) / g;
  for (let i = 0; i <= 80; i++) {
    const t = (T * i) / 80;
    pts.push([
      x0 + u * Math.cos(th) * t * k,
      y0 - (u * Math.sin(th) * t - 0.5 * g * t * t) * k,
    ]);
  }
  P.line(pts, "vector-velocity", 1.5, [5, 4]);
  P.ball(x0, y0 - 7, 7);
  P.arrow(
    x0,
    y0,
    x0 + 56 * Math.cos(th),
    y0 - 56 * Math.sin(th),
    "vector-velocity",
  );
  P.tag(
    "u",
    x0 + 60 * Math.cos(th) + 8,
    Math.min(y0 - 60 * Math.sin(th) - 8, y0 - 36),
    "left",
  );
  P.angle(x0, y0, 26, -th, 0);
  P.tag("theta", x0 + 34, y0 - 10, "left");
  P.dim(x0, y0 + 18, x0 + R * k, y0 + 18);
  P.tag("R", x0 + (R * k) / 2, y0 + 18);
  P.tag("g", w - 24, 24, "right");
}
