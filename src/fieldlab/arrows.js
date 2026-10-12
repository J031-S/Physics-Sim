// Where the direction arrows sit on a field line. No DOM.
//
// Every arrow's place is fixed by the line and the sources alone, never by
// the view or by where the line happened to start being traced, so arrows do
// not slide along their lines when the picture is panned.
//
// A line is measured against the source nearest to it:
//   * where it runs towards or away from that source, it gets an arrow each
//     time it crosses a ring round the source, at (k + ½) spacings;
//   * where it runs round the source, it gets an arrow each time it crosses a
//     spoke from the source. The spokes start straight up and double in
//     number with distance, so they stay about one spacing apart.
// Beside the flat face of a plate or magnet the rings are lines parallel to
// the face and the spokes are lines square to it, counted from its middle.
// Arrows are therefore arranged round the sources, as in a textbook drawing,
// and not on the squares of the grid.
//
// With no sources at all (a uniform field) the lines are straight and the
// arrows sit where they cross a square lattice fixed in the world.

const TAU = 2 * Math.PI;

/**
 * The things arrows are arranged round, from `lab.compiled()`.
 * Returns { points: [[x, y]], segments: [{ x, y, cos, sin, a }] }.
 */
export function arrowFeatures(compiled, mode) {
  return mode === "electric"
    ? {
        points: compiled.charges.map((p) => [p.x, p.y]),
        segments: compiled.strips,
      }
    : {
        points: compiled.wires.map((p) => [p.x, p.y]),
        segments: compiled.sheets,
      };
}

// The nearest source to (x, y): a point (a charge, a wire, or the end of a
// plate), or the flat side of a plate.
function nearest(features, x, y) {
  let best = null,
    distance = Infinity;
  for (const p of features.points) {
    const d = Math.hypot(x - p[0], y - p[1]);
    if (d < distance) {
      distance = d;
      best = { x: p[0], y: p[1] };
    }
  }
  for (const s of features.segments) {
    const u = (x - s.x) * s.cos + (y - s.y) * s.sin,
      v = -(x - s.x) * s.sin + (y - s.y) * s.cos;
    if (Math.abs(u) <= s.a) {
      if (Math.abs(v) < distance) {
        distance = Math.abs(v);
        best = { side: s };
      }
    } else {
      const end = Math.sign(u) * s.a,
        ex = s.x + end * s.cos,
        ey = s.y + end * s.sin,
        d = Math.hypot(x - ex, y - ey);
      if (d < distance) {
        distance = d;
        best = { x: ex, y: ey };
      }
    }
  }
  return best;
}

// Where along a step from a to b the value passes a level of the ladder
// `(k + offset) * gap`, as a fraction of the step; null if it passes none.
function crossing(a, b, gap, offset) {
  const ia = Math.floor(a / gap - offset),
    ib = Math.floor(b / gap - offset);
  if (ia === ib) return null;
  return ((Math.max(ia, ib) + offset) * gap - a) / (b - a);
}

/**
 * Arrows for one field line.
 *
 * `points` is the line as [x, y] in metres, ordered along the field.
 * `spacing` is the distance wanted between arrows, in metres.
 * `whole` says the line was traced from end to end (it does not simply leave
 * the region that was drawn); such a line always gets at least one arrow.
 *
 * Returns [{ x, y, dx, dy }]: a place on the line and the unit direction of
 * the line there.
 */
export function lineArrows(points, features, spacing, { whole = false } = {}) {
  const count = points.length;
  if (count < 2 || !(spacing > 0)) return [];
  const along = new Float64Array(count);
  for (let i = 1; i < count; i++)
    along[i] =
      along[i - 1] +
      Math.hypot(
        points[i][0] - points[i - 1][0],
        points[i][1] - points[i - 1][1],
      );
  const length = along[count - 1],
    bare = !features.points.length && !features.segments.length,
    marks = [];
  for (let i = 1; i < count; i++) {
    const [x0, y0] = points[i - 1],
      [x1, y1] = points[i];
    let f = null;
    if (bare) {
      const sideways = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
      f = sideways
        ? crossing(x0, x1, spacing, 0.5)
        : crossing(y0, y1, spacing, 0.5);
    } else {
      const near = nearest(features, (x0 + x1) / 2, (y0 + y1) / 2);
      if (near.side) {
        const s = near.side,
          u0 = (x0 - s.x) * s.cos + (y0 - s.y) * s.sin,
          u1 = (x1 - s.x) * s.cos + (y1 - s.y) * s.sin,
          v0 = Math.abs(-(x0 - s.x) * s.sin + (y0 - s.y) * s.cos),
          v1 = Math.abs(-(x1 - s.x) * s.sin + (y1 - s.y) * s.cos);
        f =
          Math.abs(v1 - v0) >= Math.abs(u1 - u0)
            ? crossing(v0, v1, spacing, 0.5)
            : crossing(u0, u1, spacing, 0);
      } else {
        const d0 = Math.hypot(x0 - near.x, y0 - near.y),
          d1 = Math.hypot(x1 - near.x, y1 - near.y),
          d = (d0 + d1) / 2,
          // Angles are measured from straight up, so the first spoke is the
          // one above the source.
          a0 = Math.atan2(y0 - near.y, x0 - near.x) - Math.PI / 2;
        let turn = Math.atan2(y1 - near.y, x1 - near.x) - Math.PI / 2 - a0;
        turn -= TAU * Math.round(turn / TAU);
        if (Math.abs(d1 - d0) >= d * Math.abs(turn))
          f = crossing(d0, d1, spacing, 0.5);
        else {
          const spokes = Math.max(
            1,
            2 ** Math.round(Math.log2((TAU * d) / spacing)),
          );
          f = crossing(a0, a0 + turn, TAU / spokes, 0);
        }
      }
    }
    if (f !== null && f >= 0 && f <= 1)
      marks.push(along[i - 1] + f * (along[i] - along[i - 1]));
  }
  // Arrows that fall close together (a ring round one source just before a
  // ring round the next) become one arrow midway between them. On a closed
  // loop the count starts after a clear gap, so that the result does not
  // depend on which point of the loop the list happens to begin at.
  const closed =
      points[0][0] === points[count - 1][0] &&
      points[0][1] === points[count - 1][1],
    close = 0.5 * spacing;
  if (closed && marks.length > 1) {
    let start = marks[0] + length - marks[marks.length - 1] < close ? -1 : 0;
    for (let k = 1; k < marks.length && start < 0; k++)
      if (marks[k] - marks[k - 1] >= close) start = k;
    if (start > 0)
      marks.push(...marks.splice(0, start).map((mark) => mark + length));
  }
  const merged = [];
  for (let i = 0; i < marks.length; ) {
    let j = i;
    while (j + 1 < marks.length && marks[j + 1] - marks[j] < close) j++;
    const middle = (marks[i] + marks[j]) / 2;
    merged.push(middle > length ? middle - length : middle);
    i = j + 1;
  }
  merged.sort((p, q) => p - q);
  if (!merged.length && whole && length > 0.1 * spacing)
    merged.push(length / 2);
  const arrows = [];
  let i = 1;
  for (const s of merged) {
    while (i < count - 1 && along[i] < s) i++;
    const [x0, y0] = points[i - 1],
      [x1, y1] = points[i],
      step = along[i] - along[i - 1];
    if (!(step > 0)) continue;
    const f = (s - along[i - 1]) / step;
    arrows.push({
      x: x0 + f * (x1 - x0),
      y: y0 + f * (y1 - y0),
      dx: (x1 - x0) / step,
      dy: (y1 - y0) / step,
    });
  }
  return arrows;
}
