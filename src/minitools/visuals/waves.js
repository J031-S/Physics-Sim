// Minitool pictures: waves and modern physics.
import { TAU, deg, picture } from "./draw.js";

function sine(
  P,
  x0,
  x1,
  y,
  amp,
  cycles,
  colour = "vector-velocity",
  phase = 0,
) {
  const pts = [];
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    pts.push([
      x0 + (x1 - x0) * t,
      y - amp * Math.sin(TAU * cycles * t + phase),
    ]);
  }
  P.line(pts, colour, 2);
}

// A travelling wave: wavelength, speed and frequency.
export function wave(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    y = h * 0.55,
    x0 = 24,
    x1 = w - 24,
    cycles = 2.5,
    lambda = (x1 - x0) / cycles;
  P.line(
    [
      [x0, y],
      [x1, y],
    ],
    "canvas-grid",
    1,
  );
  sine(P, x0, x1, y, h * 0.26, cycles, "vector-velocity", 0);
  const c1 = x0 + lambda * 0.25,
    c2 = c1 + lambda;
  P.dim(c1, h * 0.12, c2, h * 0.12);
  P.tag("lambda", (c1 + c2) / 2, h * 0.12);
  P.arrow(x1 - 110, h - 18, x1 - 30, h - 18, "accent-text");
  P.tag("v", x1 - 120, h - 18, "right");
  P.tag("f", x0 + 4, h - 18, "left");
  P.text("crests passing each second", x0 + 4, h - 40, "left");
}

// Displacement against time: one period marked.
export function period(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    y = h * 0.52,
    x0 = 40,
    x1 = w - 24,
    cycles = 3,
    T = (x1 - x0) / cycles;
  P.line(
    [
      [x0, h - 16],
      [x0, 14],
    ],
    "ink-soft",
    1,
  );
  P.line(
    [
      [x0, y],
      [x1, y],
    ],
    "ink-soft",
    1,
  );
  P.text("time", x1, y + 16, "right");
  sine(P, x0, x1, y, h * 0.28, cycles, "vector-velocity");
  const c1 = x0 + T * 0.25,
    c2 = c1 + T;
  P.dim(c1, h * 0.12, c2, h * 0.12);
  P.tag("T", (c1 + c2) / 2, h * 0.12);
  P.tag("f", w - 24, h - 16, "right");
  P.text("cycles each second", w - 24, h - 38, "right");
}

// Refraction at a boundary between two media.
export function snell(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g, value } = P,
    cx = w * 0.42,
    cy = h / 2,
    n1 = value("n1", 1),
    n2 = value("n2", 1.5),
    t1 = value("theta1", 30) * deg,
    t2 = value("theta2", NaN) * deg,
    L = h * 0.44;
  g.fillStyle = P.col("field-equipotential");
  g.globalAlpha = Math.min(0.35, 0.08 * n1);
  g.fillRect(0, 0, w, cy);
  g.globalAlpha = Math.min(0.35, 0.08 * n2);
  g.fillRect(0, cy, w, h - cy);
  g.globalAlpha = 1;
  P.line(
    [
      [0, cy],
      [w, cy],
    ],
    "structure",
    1.5,
  );
  P.line(
    [
      [cx, 6],
      [cx, h - 6],
    ],
    "ink-soft",
    1,
    [4, 4],
  );
  P.text("normal", cx + 6, 14, "left");
  const ix = cx - L * Math.sin(t1),
    iy = cy - L * Math.cos(t1);
  P.line(
    [
      [ix, iy],
      [cx, cy],
    ],
    "accent-text",
    2,
  );
  P.arrow(
    (ix + cx) / 2 - 1,
    (iy + cy) / 2 - 1,
    (ix + cx) / 2 + 6 * Math.sin(t1),
    (iy + cy) / 2 + 6 * Math.cos(t1),
    "accent-text",
  );
  P.angle(cx, cy, 34, -Math.PI / 2 - t1, -Math.PI / 2);
  P.tag("theta1", cx - 10, cy - 50, "right");
  if (Number.isFinite(t2)) {
    P.arrow(
      cx,
      cy,
      cx + L * Math.sin(t2),
      cy + L * Math.cos(t2),
      "accent-text",
    );
    P.angle(cx, cy, 34, Math.PI / 2 - t2, Math.PI / 2);
    P.tag("theta2", cx + 10, cy + 50, "left");
  } else {
    P.arrow(
      cx,
      cy,
      cx + L * Math.sin(t1),
      cy - L * Math.cos(t1),
      "accent-text",
    );
    P.text("total internal reflection", cx + 20, cy - 24, "left");
  }
  P.tag("n1", w - 20, 20, "right");
  P.tag("n2", w - 20, h - 20, "right");
}

// A standing wave on a string fixed at both ends.
export function standing(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    x0 = 50,
    x1 = w - 50,
    y = h * 0.48,
    n = Math.max(1, Math.min(12, Math.round(P.value("n", 2)))),
    amp = h * 0.24;
  for (const s of [1, -1, 0.4, -0.4]) {
    const pts = [];
    for (let i = 0; i <= 200; i++) {
      const t = i / 200;
      pts.push([x0 + (x1 - x0) * t, y - s * amp * Math.sin(Math.PI * n * t)]);
    }
    P.line(
      pts,
      Math.abs(s) === 1 ? "vector-velocity" : "ink-soft",
      Math.abs(s) === 1 ? 2 : 1,
      Math.abs(s) === 1 ? [] : [3, 3],
    );
  }
  for (const x of [x0, x1])
    P.line(
      [
        [x, y - amp - 10],
        [x, y + amp + 10],
      ],
      "structure",
      4,
    );
  for (let i = 0; i <= n; i++) P.ball(x0 + ((x1 - x0) * i) / n, y, 3, "ink");
  P.dim(x0, h - 20, x1, h - 20);
  P.tag("L", (x0 + x1) / 2, h - 20);
  P.tag("n", x0 + 10, 16, "left");
  P.text(
    `${n} loop${n > 1 ? "s" : ""}; nodes at the dots`,
    x0 + 10,
    40,
    "left",
  );
  P.tag("v", x1 - 10, 16, "right");
  P.tag("f", x1 - 10, 40, "right");
}

// A point source spreading its power over spheres.
export function intensity(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g } = P,
    cx = w * 0.16,
    cy = h / 2,
    R = Math.min(w * 0.4, h * 0.42);
  g.strokeStyle = P.col("field-equipotential");
  g.lineWidth = 1.2;
  for (const k of [0.5, 1]) {
    g.beginPath();
    g.arc(cx, cy, R * k, -1.1, 1.1);
    g.stroke();
  }
  for (const a of [-0.9, -0.45, 0, 0.45, 0.9])
    P.arrow(
      cx + 14 * Math.cos(a),
      cy + 14 * Math.sin(a),
      cx + R * 1.05 * Math.cos(a),
      cy + R * 1.05 * Math.sin(a),
      "accent-text",
      1,
    );
  P.ball(cx, cy, 9, "circuit-glow");
  P.tag("P", cx, cy + 30);
  P.dim(cx, h - 12, cx + R, h - 12);
  P.tag("r", cx + R / 2, h - 12);
  P.tag("I", cx + R + 16, cy, "left");
  P.text("power per m² at r: spread over 4πr²", cx + R + 16, cy + 24, "left");
}

// A photon: energy from frequency.
export function photon(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    y = h * 0.48,
    x0 = 40,
    x1 = w * 0.7,
    pts = [];
  for (let i = 0; i <= 200; i++) {
    const t = i / 200,
      env = Math.exp(-(((t - 0.5) / 0.22) ** 2));
    pts.push([x0 + (x1 - x0) * t, y - h * 0.28 * env * Math.sin(TAU * 8 * t)]);
  }
  P.line(pts, "accent-text", 2);
  P.arrow(x1 + 6, y, x1 + 60, y, "accent-text");
  P.tag("f", (x0 + x1) / 2, h - 20);
  P.tag("E", x1 + 33, y - 24);
  P.tag("h", w - 20, 20, "right");
}

// Light on a metal: an electron is freed if the photon has enough energy.
export function photoelectric(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g } = P,
    sy = h * 0.72,
    hx = w * 0.42,
    stopping = P.has("Vs");
  g.fillStyle = P.col("structure");
  g.fillRect(40, sy, (stopping ? w * 0.58 : w * 0.68) - 40, h - sy - 8);
  P.text("metal", 50, sy + 18, "left");
  P.tag("W", w * 0.25, sy + 18, "left");
  // The photon, coming in.
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60,
      x = 70 + (hx - 70) * t,
      y = 16 + (sy - 16) * t;
    pts.push([x + 6 * Math.sin(t * 30), y - 6 * Math.sin(t * 30)]);
  }
  P.line(pts, "accent-text", 1.6);
  P.tag("f", 70, 16, "left");
  P.charge(hx + 30, sy - 40, -1, 8);
  P.arrow(hx + 40, sy - 50, hx + 90, sy - 100, "vector-velocity");
  P.tag("Ek", hx + 96, sy - 104, "left");
  if (stopping) {
    P.plate(w * 0.62, 16, w * 0.62, sy - 10, -1);
    P.text("collector", w * 0.62 - 8, 16, "right");
    P.tag("Vs", w * 0.62 + 10, h * 0.4, "left");
    P.text("just stops the fastest", w * 0.62 + 10, h * 0.4 + 24, "left");
  }
  P.tag("h", w - 20, stopping ? h - 18 : 18, "right");
}

// A moving particle and its de Broglie wave.
export function deBroglie(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    y = h * 0.52,
    x0 = 40,
    x1 = w - 120,
    cycles = 4,
    lambda = (x1 - x0) / cycles;
  sine(P, x0, x1, y, h * 0.2, cycles, "field-equipotential");
  P.ball(x1 + 20, y, 10);
  P.arrow(x1 + 32, y, x1 + 90, y, "vector-velocity");
  P.tag("p", w - 16, y - 28, "right");
  const c1 = x0 + lambda * 0.25;
  P.dim(c1, h * 0.15, c1 + lambda, h * 0.15);
  P.tag("lambda", c1 + lambda / 2, h * 0.15);
  P.tag("h", w - 20, h - 16, "right");
}

// Mass and its energy equivalent.
export function massEnergy(ctx, o) {
  const P = picture(ctx, o),
    { w, h, ctx: g } = P,
    y = h / 2;
  P.block(w * 0.22, y, 54, 54);
  P.tag("m", w * 0.22, y + 46);
  P.arrow(w * 0.36, y, w * 0.54, y, "ink-soft");
  P.text("× c²", w * 0.45, y - 18);
  const cx = w * 0.7;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    P.line(
      [
        [cx + 16 * Math.cos(a), y + 16 * Math.sin(a)],
        [cx + 40 * Math.cos(a), y + 40 * Math.sin(a)],
      ],
      "circuit-glow",
      3,
    );
  }
  g.fillStyle = P.col("circuit-glow");
  g.beginPath();
  g.arc(cx, y, 13, 0, TAU);
  g.fill();
  P.tag("E", cx, y + 62);
  P.tag("c", w - 20, 20, "right");
}

// Light clocks: one at rest, one moving.
export function timeDilation(ctx, o) {
  const P = picture(ctx, o),
    { w, h, value } = P,
    beta = Math.min(0.99, Math.abs(value("v", 0) / value("c", 3e8))),
    top = 26,
    bottom = h - 46,
    ax = w * 0.14;
  const mirrors = (x0, x1) => {
    P.line(
      [
        [x0, top],
        [x1, top],
      ],
      "structure",
      3,
    );
    P.line(
      [
        [x0, bottom],
        [x1, bottom],
      ],
      "structure",
      3,
    );
  };
  mirrors(ax - 20, ax + 20);
  P.line(
    [
      [ax, bottom],
      [ax, top],
      [ax, bottom],
    ],
    "accent-text",
    1.6,
  );
  P.text("at rest", ax, bottom + 16);
  P.tag("t0", ax, bottom + 36);
  // The moving clock: the light goes on a slant, so a tick takes longer.
  const H = bottom - top,
    run = Math.min(
      (w - 60 - w * 0.42) / 2,
      (H * beta) / Math.sqrt(1 - beta * beta),
    ),
    bx = w * 0.42;
  mirrors(bx - 20, bx + 2 * run + 20);
  P.line(
    [
      [bx, bottom],
      [bx + run, top],
      [bx + 2 * run, bottom],
    ],
    "accent-text",
    1.6,
  );
  P.arrow(
    bx + run - 30,
    bottom + 16,
    bx + run + 30,
    bottom + 16,
    "vector-velocity",
  );
  P.tag("v", bx + run + 36, bottom + 16, "left");
  P.tag("t", bx + run, bottom + 36);
  P.text("one tick seen from outside", bx + run, top - 14);
}

// A rod at rest and the same rod moving.
export function lengthContraction(ctx, o) {
  const P = picture(ctx, o),
    { w, h, value } = P,
    beta = Math.min(0.999, Math.abs(value("v", 0) / value("c", 3e8))),
    x0 = 60,
    L0 = w * 0.6,
    L = L0 * Math.sqrt(1 - beta * beta);
  P.block(x0 + L0 / 2, h * 0.26, L0, 18);
  P.dim(x0, h * 0.26 + 22, x0 + L0, h * 0.26 + 22);
  P.tag("L0", x0 + L0 / 2, h * 0.26 + 22);
  P.text("at rest", x0 + L0 + 14, h * 0.26, "left");
  P.block(x0 + L / 2, h * 0.68, Math.max(2, L), 18);
  P.dim(x0, h * 0.68 + 22, x0 + L, h * 0.68 + 22);
  P.tag("L", x0 + L / 2, h * 0.68 + 22);
  P.arrow(x0 + L + 10, h * 0.68, x0 + L + 70, h * 0.68, "vector-velocity");
  P.tag("v", x0 + L + 78, h * 0.68, "left");
}
