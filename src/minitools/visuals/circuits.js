// Minitool pictures: circuits, drawn with the usual symbols.
import { TAU, picture } from "./draw.js";

function symbols(P) {
  const { ctx: g } = P;
  const wire = (pts) => P.line(pts, "ink", 1.6);
  // A cell across a vertical wire at (x, y): long plate (+) on top.
  const cell = (x, y) => {
    g.fillStyle = P.col("canvas-bg");
    g.fillRect(x - 18, y - 8, 36, 16);
    P.line(
      [
        [x - 16, y - 5],
        [x + 16, y - 5],
      ],
      "ink",
      2,
    );
    P.line(
      [
        [x - 8, y + 5],
        [x + 8, y + 5],
      ],
      "ink",
      4,
    );
  };
  // A resistor on a horizontal (or vertical) wire.
  const resistor = (x, y, vertical = false) => {
    const [rw, rh] = vertical ? [16, 44] : [44, 16];
    g.fillStyle = P.col("canvas-bg");
    g.fillRect(x - rw / 2, y - rh / 2, rw, rh);
    g.strokeStyle = P.col("ink");
    g.lineWidth = 1.6;
    g.strokeRect(x - rw / 2, y - rh / 2, rw, rh);
  };
  const lamp = (x, y) => {
    g.fillStyle = P.col("circuit-glow");
    g.beginPath();
    g.arc(x, y, 20, 0, TAU);
    g.fill();
    g.fillStyle = P.col("canvas-bg");
    g.beginPath();
    g.arc(x, y, 12, 0, TAU);
    g.fill();
    g.strokeStyle = P.col("ink");
    g.lineWidth = 1.6;
    g.stroke();
    const d = 12 * Math.SQRT1_2;
    g.beginPath();
    g.moveTo(x - d, y - d);
    g.lineTo(x + d, y + d);
    g.moveTo(x + d, y - d);
    g.lineTo(x - d, y + d);
    g.stroke();
  };
  const meter = (x, y, letter) => {
    g.fillStyle = P.col("canvas-bg");
    g.beginPath();
    g.arc(x, y, 12, 0, TAU);
    g.fill();
    g.strokeStyle = P.col("ink");
    g.lineWidth = 1.6;
    g.stroke();
    g.fillStyle = P.col("ink");
    g.font = "600 12px system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(letter, x, y + 0.5);
  };
  const current = (x0, y0, x1, y1) =>
    P.arrow(x0, y0, x1, y1, "circuit-current", 2);
  return { wire, cell, resistor, lamp, meter, current };
}

// A loop: cell on the left, the part on top, a meter or two.
function loop(P) {
  const { w, h } = P,
    l = w * 0.2,
    r = w * 0.66,
    t = h * 0.3,
    b = h * 0.82;
  const S = symbols(P);
  S.wire([
    [l, t],
    [r, t],
    [r, b],
    [l, b],
    [l, t],
  ]);
  S.cell(l, (t + b) / 2);
  return { ...S, l, r, t, b, mx: (l + r) / 2, my: (t + b) / 2 };
}

// Ohm's law: the p.d. across a resistor and the current through it.
export function ohm(ctx, o) {
  const P = picture(ctx, o),
    C = loop(P);
  C.resistor(C.mx, C.t);
  C.wire([
    [C.mx - 40, C.t],
    [C.mx - 40, C.t - 40],
    [C.mx + 40, C.t - 40],
    [C.mx + 40, C.t],
  ]);
  C.meter(C.mx, C.t - 40, "V");
  C.meter(C.r, C.my, "A");
  C.current(C.r - 30, C.b, C.r - 70, C.b);
  P.tag("R", C.mx, C.t + 22);
  P.tag("V", C.mx, C.t - 64);
  P.tag("I", C.r + 20, C.my, "left");
}

// Power in a lamp.
export function lampPower(ctx, o) {
  const P = picture(ctx, o),
    C = loop(P);
  C.lamp(C.mx, C.t);
  C.wire([
    [C.mx - 40, C.t],
    [C.mx - 40, C.t - 44],
    [C.mx + 40, C.t - 44],
    [C.mx + 40, C.t],
  ]);
  C.meter(C.mx, C.t - 44, "V");
  C.meter(C.r, C.my, "A");
  P.tag("P", C.mx, C.t + 30);
  P.tag("V", C.mx, C.t - 68);
  P.tag("I", C.r + 20, C.my, "left");
}

// Heating in a resistor from the current through it.
export function heating(ctx, o) {
  const P = picture(ctx, o),
    C = loop(P);
  C.resistor(C.mx, C.t);
  for (const dx of [-14, 0, 14]) {
    const pts = [];
    for (let i = 0; i <= 12; i++)
      pts.push([C.mx + dx + 3 * Math.sin(i * 0.9), C.t - 14 - i * 2.2]);
    P.line(pts, "danger", 1.2);
  }
  C.meter(C.r, C.my, "A");
  C.current(C.r - 30, C.b, C.r - 70, C.b);
  P.tag("R", C.mx, C.t + 22);
  P.tag("I", C.r + 20, C.my, "left");
  P.tag("P", C.mx, C.t - 52);
}

// Charge flowing past a point in a wire.
export function chargeFlow(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    y = h * 0.48;
  P.line(
    [
      [30, y - 18],
      [w - 30, y - 18],
    ],
    "ink",
    1.5,
  );
  P.line(
    [
      [30, y + 18],
      [w - 30, y + 18],
    ],
    "ink",
    1.5,
  );
  for (let x = 50; x < w - 40; x += 34) P.ball(x, y, 5, "circuit-dot");
  P.line(
    [
      [w / 2, y - 32],
      [w / 2, y + 32],
    ],
    "accent-text",
    1.5,
    [4, 3],
  );
  P.arrow(w / 2 - 70, y - 40, w / 2 + 70, y - 40, "circuit-current");
  P.tag("I", w / 2, y - 60);
  P.tag("q", w / 2 - 10, y + 50, "right");
  P.tag("t", w / 2 + 10, y + 50, "left");
  P.text("charge q passes this point in time t", w / 2, y + 76);
}

// Resistors in series or in parallel.
export function series(ctx, o) {
  const P = picture(ctx, o),
    C = loop(P),
    xs = [0.25, 0.5, 0.75].map((f) => C.l + (C.r - C.l) * f);
  xs.forEach((x, i) => {
    C.resistor(x, C.t);
    // Alternate sides so that long values do not run into each other.
    P.tag(`R${i + 1}`, x, i % 2 ? C.t + 22 : C.t - 22);
  });
  C.current(C.r - 30, C.b, C.r - 70, C.b);
  P.text("the same current through each", C.mx, C.b + 18);
  P.tag("R", C.r + 16, C.my, "left");
  P.text("in total", C.r + 16, C.my + 22, "left");
}

export function parallel(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    l = w * 0.16,
    a = w * 0.36,
    b = w * 0.66,
    t = h * 0.14,
    bottom = h * 0.84,
    S = symbols(P),
    rows = [0.18, 0.5, 0.82].map((f) => t + (bottom - 30 - t) * f + 10);
  S.wire([
    [a, bottom],
    [l, bottom],
    [l, t],
    [a, t],
  ]);
  S.cell(l, (t + bottom) / 2);
  S.wire([
    [a, t],
    [a, rows[2]],
  ]);
  S.wire([
    [b, rows[0]],
    [b, bottom],
    [a, bottom],
  ]);
  rows.forEach((y, i) => {
    S.wire([
      [a, y],
      [b, y],
    ]);
    S.resistor((a + b) / 2, y);
    P.tag(`R${i + 1}`, (a + b) / 2, y - 18);
  });
  P.text("the same p.d. across each", (a + b) / 2, bottom + 14);
  P.tag("R", b + 18, (t + bottom) / 2, "left");
  P.text("in total", b + 18, (t + bottom) / 2 + 22, "left");
}

// Power sent along a line with resistance: some is lost on the way.
export function powerLines(ctx, o) {
  const P = picture(ctx, o),
    { w, h } = P,
    y = h * 0.42,
    S = symbols(P);
  P.block(60, y + 10, 70, 60, "structure");
  P.text("power station", 60, y + 56);
  P.block(w - 60, y + 10, 60, 50, "body-block");
  P.text("town", w - 60, y + 56);
  S.wire([
    [95, y],
    [w - 90, y],
  ]);
  S.wire([
    [95, y + 24],
    [w - 90, y + 24],
  ]);
  S.resistor(w / 2, y);
  P.tag("R", w / 2, y - 22);
  P.text("resistance of the line", w / 2, y - 44);
  P.tag("Ploss", w / 2, y + 50);
  P.tag("P", 60, 22, "left");
  P.tag("V", 60, 46, "left");
  for (let x = 150; x < w - 120; x += 90)
    if (Math.abs(x - w / 2) > 40)
      P.arrow(x, y - 12, x + 30, y - 12, "circuit-current", 1.5);
}
