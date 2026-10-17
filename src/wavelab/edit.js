// Editing geometry for the waves page: what resizing, turning and snapping
// do to an item of the rays or waves view. No DOM and no physics: every
// patch returned here still goes through the model's own validating
// `update`, which refuses anything it cannot take.
//
// Resizing follows the rest of the site (the mechanics sandbox, the fields
// tool): it is about the item's centre, the side of the centre the drag
// started on is kept for the whole gesture, and crossing the centre takes
// the size down to its minimum rather than turning it inside out.

export const ROTATE_STEP = Math.PI / 12; // 15°
export const snapTo = (v, step) => Math.round(v / step) * step;

// The item's axes: a along its angle, p a quarter-turn anticlockwise.
const axes = (angle = 0) => {
  const a = { x: Math.cos(angle), y: Math.sin(angle) };
  return { a, p: { x: -a.y, y: a.x } };
};
// A point in the item's own frame: u along a, v along p, from its centre.
export function local(item, point) {
  const { a, p } = axes(item.angle),
    dx = point.x - item.x,
    dy = point.y - item.y;
  return { u: dx * a.x + dy * a.y, v: dx * p.x + dy * p.y };
}
const sag = (R, h) => (R === 0 ? 0 : R - Math.sign(R) * Math.sqrt(R * R - h * h));

// What a resize changes on each kind, by view: "u"/"v" are full sizes
// along those axes (2 × the pointer's distance from the centre), "r" the
// distance itself, "scale" every size in proportion, "spread" the angle.
const RAYS = {
  mirror: { v: "length" },
  screen: { v: "length" },
  stop: { v: "length" },
  thinLens: { v: "aperture" },
  sphericalMirror: { v: "aperture" },
  parabolicMirror: { v: "aperture" },
  lens: { lens: true },
  block: { u: "width", v: "height" },
  prism: { scale: ["side"] },
  beam: { v: "width" },
  object: { height: true },
  point: { spread: true },
};
const WAVES = {
  line: { v: "length" },
  screen: { v: "length" },
  wall: { u: "length" },
  medium: { medium: true },
};
export const resizable = (view, item) =>
  !!(view === "rays" ? RAYS : WAVES)[item.kind];

/**
 * Starts a resize: remembers the item and the side of its centre the
 * pointer is on. `min` is the smallest size (metres) the gesture goes down
 * to, `step` the snapping step (or 0).
 */
export function startResize(view, item, point, { min, step = 0 }) {
  const { u, v } = local(item, point);
  return {
    view,
    start: structuredClone(item),
    su: u < 0 ? -1 : 1,
    sv: v < 0 ? -1 : 1,
    r0: Math.max(Math.hypot(u, v), min),
    min,
    step,
  };
}

/** The patch that resizes the item for the pointer at `point`. */
export function resizePatch(gesture, point) {
  const { start: s, su, sv, min, step } = gesture,
    rule = (gesture.view === "rays" ? RAYS : WAVES)[s.kind];
  if (!rule) return {};
  const { u, v } = local(s, point),
    // A half-size on the starting side of the centre, never below the
    // minimum; snapped to whole steps either side.
    half = (d) => {
      let h = Math.max(d, min / 2);
      if (step) h = Math.max(snapTo(h, step), step);
      return h;
    },
    full = (d) => 2 * half(d),
    patch = {};
  if (rule.u) patch[rule.u] = full(su * u);
  if (rule.v) patch[rule.v] = full(sv * v);
  if (s.kind === "stop") patch.opening = (s.opening / s.length) * patch.length;
  if (rule.scale) {
    const k = Math.max(Math.hypot(u, v), min) / gesture.r0;
    for (const key of rule.scale) {
      let size = s[key] * k;
      if (step) size = Math.max(snapTo(size, step), step);
      patch[key] = size;
    }
  }
  if (rule.height) {
    // An object arrow grows from its base, the way it points.
    const sign = Math.sign(s.height) || 1;
    patch.height = sign * Math.max(step ? Math.max(snapTo(sign * v, step), step) : sign * v, min);
  }
  if (rule.spread) {
    // A point source's fan: twice the pointer's angle from its axis.
    let angle = Math.abs(Math.atan2(v, u));
    if (step) angle = Math.max(snapTo(angle, ROTATE_STEP / 3), ROTATE_STEP / 3);
    patch.spread = Math.min(Math.PI, 2 * angle);
  }
  if (rule.lens) {
    // A lens is made wider with its edge kept as thick as it was, as a lens
    // maker would: the centre thickens to keep the surfaces apart.
    const limit = 0.98 * Math.min(...[s.R1, s.R2].filter((R) => R !== 0).map(Math.abs), Infinity);
    const h = Math.min(half(sv * v), limit),
      edge = s.thickness + sag(s.R2, s.aperture / 2) - sag(s.R1, s.aperture / 2);
    patch.aperture = 2 * h;
    patch.thickness = Math.max(0, edge - sag(s.R2, h) + sag(s.R1, h));
  }
  if (rule.medium) {
    if (s.shape === "rect") {
      patch.width = full(su * u);
      patch.height = full(sv * v);
    } else if (s.shape === "circle") {
      patch.radius = half(Math.hypot(u, v));
    } else {
      // A lens-shaped region: thickness t along its axis (u) and half-height
      // h across it (v); its faces' radius follows, R = (h² + t²/4)/t.
      const t = full(su * u),
        h = half(sv * v);
      patch.thickness = t;
      patch.radius = (h * h + (t * t) / 4) / t;
    }
  }
  return patch;
}

/** The angle for a turn: the pointer's bearing from the centre plus the
 * offset it had when the turn began, in 15° steps with snapping. */
export function turnAngle(item, point, offset, snapping) {
  let angle = Math.atan2(point.y - item.y, point.x - item.x) + offset;
  if (snapping) angle = snapTo(angle, ROTATE_STEP);
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
