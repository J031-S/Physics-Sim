// Local convex polygons, in metres. Concave tracks are compounds with real holes.
export const SHAPES = [
  "circle",
  "box",
  "triangle",
  "ring",
  "arc",
  "trough",
  "half-trough",
  "polygon",
  "stroke",
];
export function hull(points) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (a, b, c) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const half = (list) => {
    const h = [];
    for (const p of list) {
      while (h.length > 1 && cross(h.at(-2), h.at(-1), p) <= 0) h.pop();
      h.push(p);
    }
    return h;
  };
  const a = half(sorted),
    b = half([...sorted].reverse());
  a.pop();
  b.pop();
  return a.concat(b);
}
export function polygons(spec) {
  const w = spec.width,
    h = spec.height,
    r = spec.radius,
    thickness = spec.thickness ?? 0.15;
  const box = (cx, cy, width, height) => [
    { x: cx - width / 2, y: cy - height / 2 },
    { x: cx + width / 2, y: cy - height / 2 },
    { x: cx + width / 2, y: cy + height / 2 },
    { x: cx - width / 2, y: cy + height / 2 },
  ];
  if (spec.shape === "box") return [box(0, 0, w, h)];
  if (spec.shape === "triangle")
    return [
      [
        { x: -w / 3, y: -h / 3 },
        { x: (2 * w) / 3, y: -h / 3 },
        { x: -w / 3, y: (2 * h) / 3 },
      ],
    ];
  if (spec.shape === "polygon") return [hull(spec.points)];
  if (spec.shape === "stroke")
    return spec.points.slice(1).map((b, i) => {
      const a = spec.points[i],
        angle = Math.atan2(b.y - a.y, b.x - a.x),
        length = Math.hypot(b.x - a.x, b.y - a.y),
        cx = (a.x + b.x) / 2,
        cy = (a.y + b.y) / 2;
      return box(0, 0, length + thickness * 0.3, thickness).map((p) => ({
        x: cx + p.x * Math.cos(angle) - p.y * Math.sin(angle),
        y: cy + p.x * Math.sin(angle) + p.y * Math.cos(angle),
      }));
    });
  if (["trough", "half-trough"].includes(spec.shape)) {
    const parts = [box(0, -h / 2, w, thickness), box(-w / 2, 0, thickness, h)];
    if (spec.shape === "trough") parts.push(box(w / 2, 0, thickness, h));
    return parts;
  }
  const sweep =
    ((spec.shape === "ring" ? 360 : (spec.sweep ?? 180)) * Math.PI) / 180;
  const count = Math.max(8, Math.ceil(sweep / (Math.PI / 32))),
    start = -Math.PI / 2 - sweep / 2,
    inside = Math.max(0.01, r - thickness);
  return Array.from({ length: count }, (_, i) => {
    const a = start + (sweep * i) / count,
      b = start + (sweep * (i + 1)) / count;
    return [
      { x: r * Math.cos(a), y: r * Math.sin(a) },
      { x: r * Math.cos(b), y: r * Math.sin(b) },
      { x: inside * Math.cos(b), y: inside * Math.sin(b) },
      { x: inside * Math.cos(a), y: inside * Math.sin(a) },
    ];
  });
}
export function makeBody(spec, Matter, scale) {
  const { Bodies, Body, Vertices } = Matter;
  const options = {
    friction: spec.friction,
    frictionStatic: spec.friction,
    frictionAir: 0,
    restitution: spec.restitution,
    label: spec.name,
  };
  let body;
  if (spec.shape === "circle")
    body = Bodies.circle(0, 0, spec.radius * scale, options, 64);
  else {
    const parts = polygons(spec).map((poly) => {
      const vertices = poly.map((p) => ({ x: p.x * scale, y: -p.y * scale }));
      Vertices.clockwiseSort(vertices);
      return Body.create({
        ...options,
        position: Vertices.centre(vertices),
        vertices,
      });
    });
    body = parts.length === 1 ? parts[0] : Body.create({ ...options, parts });
  }
  Body.setPosition(body, { x: spec.x * scale, y: -spec.y * scale });
  Body.setAngle(body, (-spec.angle * Math.PI) / 180);
  return body;
}
