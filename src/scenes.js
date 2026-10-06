import { compile } from "./expressions.js";
import { SHAPES, hull } from "./geometry.js";
export const clone = (value) => JSON.parse(JSON.stringify(value));
export function object(id, shape, x, y, extra = {}) {
  return {
    id,
    name: shape === "circle" ? "Ball" : "Block",
    shape,
    x,
    y,
    width: 1,
    height: 1,
    radius: 0.4,
    angle: 0,
    mass: 1,
    vx: 0,
    vy: 0,
    omega: 0,
    friction: 0.2,
    restitution: 0.65,
    fixed: false,
    fx: 0,
    fy: 0,
    color: "#5279dd",
    ...extra,
  };
}
const floor = () =>
  object("floor", "box", 6, -0.25, {
    name: "Ground",
    width: 28,
    height: 0.5,
    fixed: true,
    color: "#84919e",
  });
const base = (title) => ({
  version: 1,
  title,
  gravity: 9.81,
  bodies: [floor()],
  links: [],
});
export function preset(name) {
  const s = base(name);
  if (name === "Projectile")
    s.bodies.push(
      object("ball", "circle", 1, 1, {
        name: "Projectile",
        vx: 6,
        vy: 8,
        restitution: 0.5,
        color: "#e38b49",
      }),
    );
  if (name === "Collisions") {
    s.gravity = 0;
    s.bodies = [
      object("a", "circle", 3, 3, {
        name: "Ball A",
        vx: 3,
        restitution: 1,
        friction: 0,
      }),
      object("b", "circle", 8, 3, {
        name: "Ball B",
        mass: 2,
        vx: -1,
        restitution: 1,
        friction: 0,
        color: "#e38b49",
      }),
    ];
  }
  if (name === "Pendulum") {
    s.bodies.push(
      object("bob", "circle", 8, 3.5, {
        name: "Pendulum bob",
        radius: 0.35,
        color: "#e38b49",
      }),
    );
    s.links.push({
      id: "pivot",
      type: "rod",
      a: null,
      b: "bob",
      anchorA: { x: 6, y: 6 },
      anchorB: { x: 8, y: 3.5 },
      length: Math.hypot(2, 2.5),
      k: 20,
      damping: 0,
    });
  }
  if (name === "Spring oscillator") {
    s.gravity = 0;
    s.bodies = [
      object("mass", "box", 8, 3, {
        name: "Oscillating mass",
        color: "#8a71be",
      }),
    ];
    s.links.push({
      id: "spring",
      type: "spring",
      a: null,
      b: "mass",
      anchorA: { x: 3, y: 3 },
      anchorB: { x: 8, y: 3 },
      length: 3,
      k: 8,
      damping: 0,
    });
  }
  if (name === "Ramp") {
    s.bodies.push(
      object("ramp", "box", 5, 2, {
        name: "Inclined plane",
        width: 7,
        height: 0.25,
        angle: -20,
        fixed: true,
        color: "#84919e",
      }),
      object("box", "box", 3, 3.5, {
        name: "Sliding block",
        width: 0.7,
        height: 0.7,
        angle: -20,
        friction: 0.15,
        color: "#e38b49",
      }),
    );
  }
  if (name === "Uniform motion") {
    s.gravity = 0;
    s.bodies = [
      object("mover", "circle", 1, 3, {
        name: "Constant velocity",
        vx: 2,
        vy: 1,
      }),
    ];
  }
  if (name === "Constant acceleration") {
    s.gravity = 0;
    s.bodies = [
      object("mover", "box", 1, 3, {
        name: "Accelerating block",
        motion: { type: "acceleration", ax: "2", ay: "0", gravity: false },
      }),
    ];
  }
  if (name === "Circular motion") {
    s.gravity = 0;
    s.bodies = [
      object("mover", "circle", 8, 3, {
        name: "Circular motion",
        vy: 2,
        motion: {
          type: "acceleration",
          ax: "-(x-6)",
          ay: "-(y-3)",
          gravity: false,
        },
      }),
    ];
  }
  if (name === "Track") {
    s.bodies = [
      object("track", "arc", 6, 3, {
        name: "Curved track",
        radius: 3,
        thickness: 0.18,
        sweep: 180,
        fixed: true,
        color: "#84919e",
      }),
      object("ball", "circle", 4, 3.3, {
        name: "Rolling ball",
        radius: 0.25,
        restitution: 0.2,
      }),
    ];
  }
  return s;
}
export function validateScene(value) {
  const fail = (message) => {
    throw new Error(message);
  };
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.bodies) ||
    !Array.isArray(value.links)
  )
    fail("This is not a Physics Sim v1 scene.");
  if (value.bodies.length > 200 || value.links.length > 300)
    fail("Scenes support up to 200 objects and 300 connections.");
  const number = (v, min, max, label) => {
    if (!Number.isFinite(v) || v < min || v > max)
      fail("Invalid " + label + ".");
  };
  number(value.gravity, -100, 100, "gravity");
  const ids = new Set();
  for (const b of value.bodies) {
    if (typeof b.id !== "string" || !b.id || ids.has(b.id))
      fail("Object IDs must be unique.");
    ids.add(b.id);
    if (
      !SHAPES.includes(b.shape) ||
      typeof b.name !== "string" ||
      b.name.length > 100 ||
      typeof b.fixed !== "boolean" ||
      !/^#[0-9a-f]{6}$/i.test(b.color)
    )
      fail("Invalid object.");
    for (const key of ["x", "y"]) number(b[key], -10000, 10000, key);
    for (const key of ["vx", "vy", "omega", "angle", "fx", "fy"])
      number(b[key], -1000, 1000, key);
    for (const key of ["width", "height", "radius"])
      number(b[key], 0.05, 100, key);
    if (["ring", "arc", "trough", "half-trough", "stroke"].includes(b.shape)) {
      number(b.thickness, 0.02, 10, "wall thickness");
      if (["ring", "arc"].includes(b.shape) && b.thickness >= b.radius)
        fail("Track thickness must be less than its radius.");
    }
    if (b.shape === "arc") number(b.sweep, 10, 350, "arc sweep");
    if (["polygon", "stroke"].includes(b.shape)) {
      if (
        !Array.isArray(b.points) ||
        b.points.length < (b.shape === "polygon" ? 3 : 2) ||
        b.points.length > 100
      )
        fail("Draw 2–100 points for a path or at least 3 for a shape.");
      for (const p of b.points) {
        number(p.x, -100, 100, "point x");
        number(p.y, -100, 100, "point y");
      }
      if (b.shape === "polygon" && hull(b.points).length < 3)
        fail("Draw a shape with a non-zero area.");
      for (let i = 1; i < b.points.length; i++)
        if (
          Math.hypot(
            b.points[i].x - b.points[i - 1].x,
            b.points[i].y - b.points[i - 1].y,
          ) < 0.001
        )
          fail("Path points are too close together.");
    }
    if (b.motion !== undefined) {
      if (
        !b.motion ||
        b.motion.type !== "acceleration" ||
        typeof b.motion.gravity !== "boolean"
      )
        fail("Unsupported motion behaviour.");
      try {
        compile(b.motion.ax);
        compile(b.motion.ay);
      } catch (e) {
        fail(e.message);
      }
    }
    number(b.mass, 0.01, 10000, "mass");
    number(b.friction, 0, 1, "friction");
    number(b.restitution, 0, 1, "restitution");
  }
  const links = new Set();
  for (const l of value.links) {
    if (
      typeof l.id !== "string" ||
      !l.id ||
      links.has(l.id) ||
      !["spring", "rod", "rope"].includes(l.type)
    )
      fail("Invalid connection.");
    links.add(l.id);
    if (
      (l.a !== null && !ids.has(l.a)) ||
      (l.b !== null && !ids.has(l.b)) ||
      l.a === l.b
    )
      fail("Connection endpoints must be different and include an object.");
    for (const p of [l.anchorA, l.anchorB]) {
      if (!p) fail("Missing anchor.");
      number(p.x, -10000, 10000, "anchor");
      number(p.y, -10000, 10000, "anchor");
    }
    number(l.length, 0.05, 1000, "connection length");
    number(l.k, 0.1, 1000, "spring stiffness");
    number(l.damping, 0, 100, "spring damping");
  }
  return clone({
    version: 1,
    title: String(value.title || "Untitled experiment").slice(0, 100),
    gravity: value.gravity,
    bodies: value.bodies,
    links: value.links,
  });
}
