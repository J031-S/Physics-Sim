import { GroupMove } from "./group-move.js";
import { Mechanisms } from "./mechanisms.js";
// The sandbox exposes SI units; Matter uses px, ms and 60 Hz-normalised velocity.
const { Engine, Bodies, Body, Composite, Constraint, Query } =
  globalThis.Matter;
export const SCALE = 100;
export const DT = 1 / 120;
export const GRID = 0.5;
export const snap = (value) => Math.round(value / GRID) * GRID;
const toEngine = (p) => ({ x: p.x * SCALE, y: -p.y * SCALE });
const toWorld = (p) => ({ x: p.x / SCALE, y: -p.y / SCALE });
export class Sandbox {
  constructor() {
    this.engine = Engine.create({
      positionIterations: 10,
      velocityIterations: 10,
      constraintIterations: 8,
    });
    this.engine.gravity.scale = 0; // Gravity and damping are explicit SI forces.
    this.objects = new Map();
    this.links = new Map();
    this.settings = {
      gravity: 9.81,
      airResistance: 0,
      snapping: false,
      walls: false,
    };
    this.viewport = null;
    this.walls = [];
    this.group = null;
    this.time = 0;
    this.serial = 0;
    this.grab = null;
    this.sizing = null;
    this.mechanisms = new Mechanisms(this);
    this.floor = Bodies.rectangle(
      0,
      -(-0.25) * SCALE,
      2000 * SCALE,
      0.5 * SCALE,
      { isStatic: true, friction: 0.5, restitution: 0 },
    );
    Composite.add(this.engine.world, this.floor);
    const filter = (pairs) => {
      for (const pair of pairs) {
        const { parentA: a, parentB: b } = pair.collision;
        pair.isSensor =
          a.inverseMass + b.inverseMass === 0 ||
          this.mechanisms.ignoreContact(a, b);
      }
    };
    globalThis.Matter.Events.on(this.engine, "beforeSolve", () => {
      this.enforceLocks();
      filter(this.engine.pairs.list);
    });
    globalThis.Matter.Events.on(this.engine, "collisionStart", (event) =>
      filter(event.pairs),
    );
  }
  updateSettings(patch) {
    const ranges = { gravity: [-50, 50], airResistance: [0, 10] };
    for (const [key, v] of Object.entries(patch))
      if (
        ["walls", "snapping"].includes(key)
          ? typeof v !== "boolean"
          : !ranges[key] ||
            !Number.isFinite(v) ||
            v < ranges[key][0] ||
            v > ranges[key][1]
      )
        throw new Error("Invalid simulation setting: " + key);
    Object.assign(this.settings, patch);
    if (patch.walls !== undefined) this.syncWalls();
  }
  setViewport(bounds) {
    if (
      this.viewport &&
      Object.keys(bounds).every(
        (k) => Math.abs(bounds[k] - this.viewport[k]) < 1e-6,
      )
    )
      return;
    this.viewport = { ...bounds };
    this.syncWalls();
  }
  syncWalls() {
    for (const b of this.walls) Composite.remove(this.engine.world, b);
    this.walls = [];
    if (!this.settings.walls || !this.viewport) return;
    const { minX, maxX, minY, maxY } = this.viewport,
      t = 0.5,
      options = { isStatic: true, friction: 0.5, restitution: 0 };
    for (const [x, y, w, h] of [
      [minX - t / 2, (minY + maxY) / 2, t, maxY - minY + 2 * t],
      [maxX + t / 2, (minY + maxY) / 2, t, maxY - minY + 2 * t],
      [(minX + maxX) / 2, maxY + t / 2, maxX - minX, t],
      [(minX + maxX) / 2, minY - t / 2, maxX - minX, t],
    ])
      this.walls.push(
        Bodies.rectangle(x * SCALE, -y * SCALE, w * SCALE, h * SCALE, options),
      );
    Composite.add(this.engine.world, this.walls);
  }
  boundPosition(id, p) {
    const b = this.objects.get(id).body,
      xs = b.vertices.map((v) => v.x),
      ys = b.vertices.map((v) => v.y),
      left = (b.position.x - Math.min(...xs)) / SCALE,
      right = (Math.max(...xs) - b.position.x) / SCALE,
      down = (Math.max(...ys) - b.position.y) / SCALE,
      up = (b.position.y - Math.min(...ys)) / SCALE;
    let x = p.x,
      y = Math.max(down, p.y);
    if (this.settings.walls && this.viewport) {
      const v = this.viewport;
      x = Math.max(v.minX + left, Math.min(v.maxX - right, x));
      y = Math.max(Math.max(0, v.minY) + down, Math.min(v.maxY - up, y));
    }
    return { x, y };
  }
  beginGroup(ids, p, options = { paused: true }) {
    this.endGrab(false);
    this.endResize();
    this.group = new GroupMove(this, ids, p, options);
    return [...this.group.ids];
  }
  moveGroup(p, snapping = false) {
    this.group?.move(p, snapping);
  }
  endGroup() {
    this.group = null;
  }
  add(shape, point) {
    if (!["ball", "block"].includes(shape))
      throw new Error("Only balls and blocks are supported.");
    const radius = 0.4,
      width = 0.9,
      height = 0.9,
      p = {
        x: point.x,
        y: Math.max(shape === "ball" ? radius : height / 2, point.y),
      };
    const options = {
      friction: 0.3,
      frictionStatic: 1,
      frictionAir: 0,
      restitution: 0.6,
    };
    const body =
      shape === "ball"
        ? Bodies.circle(p.x * SCALE, -p.y * SCALE, radius * SCALE, options, 64)
        : Bodies.rectangle(
            p.x * SCALE,
            -p.y * SCALE,
            width * SCALE,
            height * SCALE,
            options,
          );
    Body.setMass(body, 1);
    const id = "body-" + ++this.serial,
      object = {
        id,
        shape,
        body,
        radius,
        width,
        height,
        mass: 1,
        friction: 0.3,
        restitution: 0.6,
        linearDamping: 0,
        angularDamping: 0.05,
        lockPosition: false,
        lockRotation: false,
        positionAnchor: { ...body.position },
        angleAnchor: body.angle,
        freeInertia: body.inertia,
      };
    this.objects.set(id, object);
    Composite.add(this.engine.world, body);
    return id;
  }
  state(id) {
    const o = this.objects.get(id);
    if (!o) return null;
    const b = o.body,
      v = Body.getVelocity(b);
    return {
      ...toWorld(b.position),
      vx: (v.x * 60) / SCALE,
      vy: (-v.y * 60) / SCALE,
      angle: -b.angle,
      omega: -Body.getAngularVelocity(b) * 60,
    };
  }
  hit(p) {
    return (
      [...this.objects.values()]
        .reverse()
        .find((o) => Query.point([o.body], toEngine(p)).length)?.id ?? null
    );
  }
  endpoint(link, side) {
    const id = link[side];
    return id
      ? toWorld(this.objects.get(id).body.position)
      : link[side + "Point"];
  }
  connect(type, a, b, aPoint, bPoint) {
    if (
      !["spring", "rod"].includes(type) ||
      a === b ||
      (!a && !b) ||
      (a && !this.objects.has(a)) ||
      (b && !this.objects.has(b))
    )
      throw new Error(
        "Connect two different objects, or an object and a fixed point.",
      );
    const pa = a ? this.state(a) : aPoint,
      pb = b ? this.state(b) : bPoint,
      length = Math.hypot(pb.x - pa.x, pb.y - pa.y);
    if (length < 0.05) throw new Error("Place the endpoints farther apart.");
    const id = "link-" + ++this.serial,
      link = {
        id,
        type,
        a,
        b,
        aPoint: { x: pa.x, y: pa.y },
        bPoint: { x: pb.x, y: pb.y },
        length,
        k: 20,
        damping: 0.3,
        lockAngle: false,
        axis: { x: (pb.x - pa.x) / length, y: (pb.y - pa.y) / length },
        constraint: null,
        attached: false,
      };
    if (type === "rod")
      link.constraint = Constraint.create({
        bodyA: a ? this.objects.get(a).body : undefined,
        bodyB: b ? this.objects.get(b).body : undefined,
        pointA: a ? { x: 0, y: 0 } : toEngine(pa),
        pointB: b ? { x: 0, y: 0 } : toEngine(pb),
        length: length * SCALE,
        stiffness: 1,
        damping: 0,
      });
    this.links.set(id, link);
    this.syncRods();
    return id;
  }
  syncRods() {
    for (const l of this.links.values())
      if (l.constraint) {
        // Matter's distance solver divides by summed inverse mass. Two pinned
        // endpoints have no translational degree of freedom: do not solve them.
        const movable =
          (l.a && !this.objects.get(l.a).lockPosition) ||
          (l.b && !this.objects.get(l.b).lockPosition);
        if (movable && !l.attached) {
          Composite.add(this.engine.world, l.constraint);
          l.attached = true;
        }
        if (!movable && l.attached) {
          Composite.remove(this.engine.world, l.constraint);
          l.attached = false;
        }
      }
  }
  setLock(id, axis, locked) {
    const o = this.objects.get(id);
    if (!o) return;
    if (axis === "position") {
      if (
        !locked &&
        [...this.links.values()].some(
          (l) => l.type === "belt" && (l.a === id || l.b === id),
        )
      )
        throw new Error(
          "Remove the belt before moving its fixed axle. Pulley axles can be unlocked.",
        );
      o.lockPosition = locked;
      o.positionAnchor = { ...o.body.position };
      o.body.inverseMass = locked ? 0 : 1 / o.mass;
      Body.setVelocity(o.body, { x: 0, y: 0 });
    } else if (axis === "rotation") {
      o.lockRotation = locked;
      o.angleAnchor = o.body.angle;
      Body.setInertia(o.body, locked ? Infinity : o.freeInertia);
      Body.setAngularVelocity(o.body, 0);
    } else throw new Error("Unknown lock axis.");
    this.syncRods();
  }
  updateConstants(id, patch) {
    const o = this.objects.get(id);
    const ranges = {
      mass: [0.05, 100],
      friction: [0, 1],
      restitution: [0, 1],
      linearDamping: [0, 20],
      angularDamping: [0, 20],
    };
    if (!o) throw new Error("Object no longer exists.");
    for (const [key, value] of Object.entries(patch))
      if (
        !ranges[key] ||
        !Number.isFinite(value) ||
        value < ranges[key][0] ||
        value > ranges[key][1]
      )
        throw new Error("Invalid " + key + ".");
    if (patch.mass !== undefined) {
      // Restore finite inertia before changing mass; retain independent locks.
      Body.setInertia(o.body, o.freeInertia);
      Body.setMass(o.body, patch.mass);
      o.freeInertia = o.body.inertia;
    }
    Object.assign(o, patch);
    o.body.friction = o.friction;
    o.body.restitution = o.restitution;
    o.body.inverseMass = o.lockPosition ? 0 : 1 / o.mass;
    Body.setInertia(o.body, o.lockRotation ? Infinity : o.freeInertia);
  }
  updateLink(id, patch) {
    const l = this.links.get(id);
    if (!l) throw new Error("Connection no longer exists.");
    const ranges =
      l.type === "spring"
        ? { k: [0.1, 100], damping: [0, 5], length: [0.05, 50] }
        : { length: [0.05, 50] };
    for (const [key, v] of Object.entries(patch))
      if (
        !ranges[key] ||
        !Number.isFinite(v) ||
        v < ranges[key][0] ||
        v > ranges[key][1]
      )
        throw new Error("Invalid " + key + ".");
    Object.assign(l, patch);
    if (l.constraint) l.constraint.length = l.length * SCALE;
  }
  setSpringAngle(id, locked) {
    const l = this.links.get(id);
    if (l?.type !== "spring") return;
    if (locked) {
      const a = this.endpoint(l, "a"),
        b = this.endpoint(l, "b"),
        d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d < 1e-6)
        throw new Error(
          "Separate the spring endpoints before locking its angle.",
        );
      l.axis = { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
    }
    l.lockAngle = locked;
    this.solveGuides();
  }
  solveGuides() {
    for (const l of this.links.values())
      if (l.type === "spring" && l.lockAngle) {
        const a = this.endpoint(l, "a"),
          b = this.endpoint(l, "b"),
          n = { x: -l.axis.y, y: l.axis.x };
        const oa = this.objects.get(l.a),
          ob = this.objects.get(l.b);
        const wa =
          oa &&
          !oa.lockPosition &&
          this.grab?.id !== l.a &&
          this.sizing?.id !== l.a
            ? 1 / oa.mass
            : 0;
        const wb =
          ob &&
          !ob.lockPosition &&
          this.grab?.id !== l.b &&
          this.sizing?.id !== l.b
            ? 1 / ob.mass
            : 0;
        if (!wa && !wb) continue;
        const error = (b.x - a.x) * n.x + (b.y - a.y) * n.y;
        const va = oa ? this.state(l.a) : { vx: 0, vy: 0 },
          vb = ob ? this.state(l.b) : { vx: 0, vy: 0 };
        const speed = (vb.vx - va.vx) * n.x + (vb.vy - va.vy) * n.y;
        for (const [o, w, sign] of [
          [oa, wa, 1],
          [ob, wb, -1],
        ])
          if (w) {
            const p = this.state(o.id),
              f = (sign * w) / (wa + wb);
            Body.setPosition(
              o.body,
              toEngine({ x: p.x + f * error * n.x, y: p.y + f * error * n.y }),
            );
            Body.setVelocity(o.body, {
              x: ((p.vx + f * speed * n.x) * SCALE) / 60,
              y: (-(p.vy + f * speed * n.y) * SCALE) / 60,
            });
          }
      }
  }
  resizeBody(id, width, height = width) {
    const o = this.objects.get(id);
    if (
      !o ||
      ![width, height].every((v) => Number.isFinite(v) && v >= 0.1 && v <= 10)
    )
      throw new Error("Dimensions must be between 0.1 and 10 m.");
    if (o.shape === "ball") height = width;
    const p = this.state(id),
      c = Math.abs(Math.cos(p.angle)),
      sn = Math.abs(Math.sin(p.angle));
    const clearance =
      o.shape === "ball" ? width / 2 : (width * sn + height * c) / 2;
    if (p.y < clearance - 1e-5)
      throw new Error(
        "There is not enough room above the floor. Move the object up first.",
      );
    if (this.settings.walls && this.viewport) {
      const v = this.viewport,
        halfX = o.shape === "ball" ? width / 2 : (width * c + height * sn) / 2;
      if (
        p.x - halfX < v.minX ||
        p.x + halfX > v.maxX ||
        p.y + clearance > v.maxY
      )
        throw new Error("There is not enough room inside the screen walls.");
    }
    this.mechanisms.validateResize(id, width, height);
    const b = o.body,
      angle = b.angle;
    Body.setInertia(b, o.freeInertia);
    Body.setAngle(b, 0);
    Body.scale(
      b,
      width / (o.shape === "ball" ? o.radius * 2 : o.width),
      height / (o.shape === "ball" ? o.radius * 2 : o.height),
    );
    Body.setMass(b, o.mass);
    o.freeInertia = b.inertia;
    o.width = width;
    o.height = height;
    if (o.shape === "ball") o.radius = width / 2;
    Body.setAngle(b, angle);
    b.inverseMass = o.lockPosition ? 0 : 1 / o.mass;
    Body.setInertia(b, o.lockRotation ? Infinity : o.freeInertia);
    this.mechanisms.rebase(id);
  }
  beginResize(id, p) {
    const o = this.objects.get(id);
    if (!o) return;
    this.endGrab(false);
    this.sizing = {
      id,
      start: { ...p },
      centre: this.state(id),
      width: o.shape === "ball" ? o.radius * 2 : o.width,
      height: o.shape === "ball" ? o.radius * 2 : o.height,
    };
  }
  moveResize(p, snapping = false) {
    const g = this.sizing;
    if (!g) return;
    const o = this.objects.get(g.id),
      a = g.centre.angle,
      dx = p.x - g.start.x,
      dy = p.y - g.start.y;
    let w, h;
    if (o.shape === "ball") {
      w =
        g.width +
        2 *
          (Math.hypot(p.x - g.centre.x, p.y - g.centre.y) -
            Math.hypot(g.start.x - g.centre.x, g.start.y - g.centre.y));
      h = w;
    } else {
      const sx =
        (g.start.x - g.centre.x) * Math.cos(a) +
        (g.start.y - g.centre.y) * Math.sin(a);
      const sy =
        -(g.start.x - g.centre.x) * Math.sin(a) +
        (g.start.y - g.centre.y) * Math.cos(a);
      w =
        g.width +
        2 * (dx * Math.cos(a) + dy * Math.sin(a)) * (Math.sign(sx) || 1);
      h =
        g.height +
        2 * (-dx * Math.sin(a) + dy * Math.cos(a)) * (Math.sign(sy) || 1);
    }
    const dimension = (v) =>
      Math.max(snapping ? GRID : 0.1, Math.min(10, snapping ? snap(v) : v));
    this.resizeBody(g.id, dimension(w), dimension(h));
    this.holdResize();
  }
  holdResize() {
    const g = this.sizing;
    if (!g) return;
    const b = this.objects.get(g.id).body;
    Body.setPosition(b, toEngine(g.centre));
    Body.setAngle(b, -g.centre.angle);
    Body.setVelocity(b, { x: 0, y: 0 });
    Body.setAngularVelocity(b, 0);
  }
  endResize() {
    this.sizing = null;
  }
  beginGrab(id, p, now = performance.now(), options = {}) {
    const o = this.objects.get(id);
    if (!o) return;
    const b = o.body,
      q = toEngine(p),
      dx = q.x - b.position.x,
      dy = q.y - b.position.y,
      c = Math.cos(-b.angle),
      s = Math.sin(-b.angle);
    this.grab = {
      id,
      mode: options.mode || "auto",
      paused: !!options.paused,
      centre: toWorld(b.position),
      startPoint: { ...p },
      startAngle: b.angle,
      local: { x: dx * c - dy * s, y: dx * s + dy * c },
      target: { ...p },
      snap: false,
      snapCentre: null,
      resize: false,
      samples: [{ ...this.state(id), t: now }],
      angle: b.angle,
    };
  }
  grabPoint() {
    const g = this.grab;
    if (!g) return null;
    const b = this.objects.get(g.id).body,
      c = Math.cos(b.angle),
      s = Math.sin(b.angle);
    return {
      x: b.position.x + g.local.x * c - g.local.y * s,
      y: b.position.y + g.local.x * s + g.local.y * c,
    };
  }
  moveGrab(
    p,
    snapping = false,
    resize = false,
    now = performance.now(),
    options = null,
  ) {
    if (!this.grab) return;
    const g = this.grab;
    if (options) {
      if ((options.mode || "auto") !== g.mode) {
        const b = this.objects.get(g.id).body,
          q = toEngine(g.target),
          dx = q.x - b.position.x,
          dy = q.y - b.position.y,
          c = Math.cos(-b.angle),
          sn = Math.sin(-b.angle);
        g.local = { x: dx * c - dy * sn, y: dx * sn + dy * c };
        g.centre = toWorld(b.position);
        g.angle = b.angle;
        g.startPoint = { ...g.target };
        g.startAngle = b.angle;
      }
      g.mode = options.mode || "auto";
      g.paused = !!options.paused;
    }
    const cable = this.mechanisms.cables,
      saved =
        cable.involves(g.id) || this.mechanisms.isWheel(g.id)
          ? cable.capture()
          : null;
    const previous = { ...g.target },
      previousAngle = g.angle;
    g.target = { ...p };
    g.snap = snapping;
    g.resize = resize;
    this.placeGrab(true);
    // If a lock or the floor makes the requested cable pose impossible, stop
    // at the last feasible point instead of stretching or moving a pinned body.
    if (saved && cable.error(g.id) > 0.000002) {
      let lo = 0,
        hi = 1,
        best = saved,
        bestTarget = previous,
        bestAngle = previousAngle;
      for (let i = 0; i < 12; i++) {
        cable.restore(saved);
        g.angle = previousAngle;
        const t = (lo + hi) / 2;
        g.target = {
          x: previous.x + (p.x - previous.x) * t,
          y: previous.y + (p.y - previous.y) * t,
        };
        this.placeGrab(true);
        if (cable.error(g.id) <= 0.000002) {
          lo = t;
          best = cable.capture();
          bestTarget = { ...g.target };
          bestAngle = g.angle;
        } else hi = t;
      }
      cable.restore(best);
      g.target = bestTarget;
      g.angle = bestAngle;
    }
    const state = this.state(g.id);
    g.samples.push({ ...state, t: now });
    while (g.samples.length > 2 && g.samples[1].t < now - 100)
      g.samples.shift();
  }
  grabRods() {
    const g = this.grab;
    return [...this.links.values()].filter(
      (l) => l.type === "rod" && (l.a === g.id || l.b === g.id),
    );
  }
  placeGrab(editLength = false) {
    const g = this.grab;
    if (!g) return;
    const o = this.objects.get(g.id),
      b = o.body;
    const old = this.state(g.id);
    g.blocked =
      !g.paused &&
      ((g.mode === "move" && o.lockPosition) ||
        (g.mode === "rotate" && o.lockRotation));
    if (g.blocked) return;
    const rotating =
      g.mode === "rotate" || (g.mode === "auto" && o.lockPosition);
    if (rotating) {
      if (
        g.mode === "rotate" &&
        (!o.lockRotation || g.paused) &&
        Math.hypot(g.local.x, g.local.y) <= 1e-4
      ) {
        let desired = g.startAngle + (g.target.x - g.startPoint.x) * Math.PI;
        if (g.snap)
          desired = Math.round(desired / (Math.PI / 12)) * (Math.PI / 12);
        Body.setAngle(b, desired);
        const bounded = this.boundPosition(g.id, g.centre);
        if (Math.hypot(bounded.x - g.centre.x, bounded.y - g.centre.y) <= 0.001)
          g.angle = desired;
        else Body.setAngle(b, g.angle);
      }
      if (
        (!o.lockRotation || g.paused) &&
        Math.hypot(g.local.x, g.local.y) > 1e-4
      ) {
        const q = toEngine(g.target),
          centre = toEngine(g.centre),
          dx = q.x - centre.x,
          dy = q.y - centre.y;
        if (Math.hypot(dx, dy) > 1e-4) {
          let desired = Math.atan2(dy, dx) - Math.atan2(g.local.y, g.local.x);
          if (g.snap)
            desired = Math.round(desired / (Math.PI / 12)) * (Math.PI / 12);
          g.angle =
            b.angle +
            Math.atan2(
              Math.sin(desired - b.angle),
              Math.cos(desired - b.angle),
            );
          Body.setAngle(b, g.angle);
          const bounded = this.boundPosition(g.id, g.centre);
          if (
            Math.hypot(bounded.x - g.centre.x, bounded.y - g.centre.y) > 0.001
          ) {
            g.angle = -old.angle;
            Body.setAngle(b, g.angle);
          }
        }
      }
      Body.setPosition(b, toEngine(g.centre));
      if (o.lockRotation && g.paused) o.angleAnchor = g.angle;
    } else if (!o.lockPosition || g.paused) {
      const c = Math.cos(g.angle),
        sn = Math.sin(g.angle);
      let desired = {
        x: g.target.x - (g.local.x * c - g.local.y * sn) / SCALE,
        y: g.target.y + (g.local.x * sn + g.local.y * c) / SCALE,
      };
      Body.setAngle(b, o.lockRotation ? o.angleAnchor : g.angle);
      const floor =
        (Math.max(...b.vertices.map((v) => v.y)) - b.position.y) / SCALE;
      if (g.snap && !g.resize)
        desired = {
          x: snap(desired.x),
          y: Math.max(Math.ceil(floor / GRID) * GRID, snap(desired.y)),
        };
      desired = this.boundPosition(g.id, desired);
      const guides = [...this.links.values()]
        .filter(
          (l) =>
            l.type === "spring" &&
            l.lockAngle &&
            (l.a === g.id || l.b === g.id),
        )
        .map((l) => ({
          ...this.endpoint(l, l.a === g.id ? "b" : "a"),
          axis: l.axis,
        }));
      for (const line of guides) {
        const t =
          (desired.x - line.x) * line.axis.x +
          (desired.y - line.y) * line.axis.y;
        desired = { x: line.x + t * line.axis.x, y: line.y + t * line.axis.y };
      }
      const rods = this.grabRods();
      const circles = rods.map((l) => ({
        ...this.endpoint(l, l.a === g.id ? "b" : "a"),
        r: l.length,
      }));
      const oldLengths = circles.map((c) => c.r);
      if (g.resize && editLength) {
        // Reject impossible/extreme edits atomically, without stretching locks.
        if (g.snap && circles.length === 1) {
          const c = circles[0],
            dx = desired.x - c.x,
            dy = desired.y - c.y,
            d = Math.hypot(dx, dy);
          if (d > 1e-8) {
            const length = Math.max(GRID, snap(d));
            desired = {
              x: c.x + (dx * length) / d,
              y: c.y + (dy * length) / d,
            };
          }
        }
        const lengths = circles.map((c) => {
          const d = Math.hypot(desired.x - c.x, desired.y - c.y);
          return g.snap ? Math.max(GRID, snap(d)) : d;
        });
        if (lengths.every((l) => l >= 0.05 && l <= 50)) {
          rods.forEach((l, i) => {
            this.updateLink(l.id, { length: lengths[i] });
            circles[i].r = lengths[i];
          });
        } else desired = old;
      }
      if (circles.length && !(g.resize && editLength && !g.snap)) {
        const candidates = [old];
        // Closest point on each circle, plus circle/circle and circle/floor
        // intersections. This handles multiple rods without iterative drift.
        for (let i = 0; i < circles.length; i++) {
          const a = circles[i],
            dx = desired.x - a.x,
            dy = desired.y - a.y,
            d = Math.hypot(dx, dy);
          if (d > 1e-9)
            candidates.push({
              x: a.x + (dx * a.r) / d,
              y: a.y + (dy * a.r) / d,
            });
          if (Math.abs(floor - a.y) <= a.r) {
            const x = Math.sqrt(Math.max(0, a.r * a.r - (floor - a.y) ** 2));
            candidates.push({ x: a.x + x, y: floor }, { x: a.x - x, y: floor });
          }
          for (const c of circles.slice(i + 1)) {
            const dx = c.x - a.x,
              dy = c.y - a.y,
              d = Math.hypot(dx, dy);
            if (
              d < 1e-9 ||
              d > a.r + c.r + 1e-9 ||
              d < Math.abs(a.r - c.r) - 1e-9
            )
              continue;
            const u = (a.r * a.r - c.r * c.r + d * d) / (2 * d),
              h = Math.sqrt(Math.max(0, a.r * a.r - u * u));
            for (const sign of [-1, 1])
              candidates.push({
                x: a.x + (u * dx) / d - (sign * h * dy) / d,
                y: a.y + (u * dy) / d + (sign * h * dx) / d,
              });
          }
        }
        for (const line of guides)
          for (const circle of circles) {
            const dx = line.x - circle.x,
              dy = line.y - circle.y,
              t = -(dx * line.axis.x + dy * line.axis.y);
            const h2 = circle.r ** 2 - (dx * dx + dy * dy - t * t);
            if (h2 >= 0)
              for (const sign of [-1, 1])
                candidates.push({
                  x: line.x + (t + sign * Math.sqrt(h2)) * line.axis.x,
                  y: line.y + (t + sign * Math.sqrt(h2)) * line.axis.y,
                });
          }
        const valid = candidates.filter(
          (p) =>
            p.y >= floor - 1e-7 &&
            guides.every(
              (l) =>
                Math.abs((p.x - l.x) * l.axis.y - (p.y - l.y) * l.axis.x) <
                1e-6,
            ) &&
            circles.every(
              (c) => Math.abs(Math.hypot(p.x - c.x, p.y - c.y) - c.r) < 1e-6,
            ),
        );
        valid.sort(
          (a, b) =>
            Math.hypot(a.x - desired.x, a.y - desired.y) -
            Math.hypot(b.x - desired.x, b.y - desired.y),
        );
        if (!valid.length && g.resize && editLength)
          rods.forEach((l, i) =>
            this.updateLink(l.id, { length: oldLengths[i] }),
          );
        desired = valid[0] || old; // Inconsistent constraints must not teleport a body.
      }
      if (desired.y < floor - 1e-7) desired = old;
      if (
        [...this.links.values()].some(
          (l) =>
            l.type === "belt" &&
            (l.a === g.id || l.b === g.id) &&
            (() => {
              const other = this.objects.get(l.a === g.id ? l.b : l.a),
                p = this.state(other.id);
              return (
                Math.hypot(desired.x - p.x, desired.y - p.y) <=
                o.radius + other.radius + 0.1
              );
            })(),
        )
      )
        desired = old;
      const bounded = this.boundPosition(g.id, desired);
      if (Math.hypot(bounded.x - desired.x, bounded.y - desired.y) > 0.001)
        desired = old;
      Body.setPosition(b, toEngine(desired));
      if (o.lockPosition && g.paused) o.positionAnchor = { ...b.position };
    }
    Body.setAngle(b, o.lockRotation ? o.angleAnchor : g.angle);
    Body.setVelocity(b, { x: 0, y: 0 });
    Body.setAngularVelocity(b, 0);
    b.positionImpulse.x = b.positionImpulse.y = 0;
    b.constraintImpulse.x =
      b.constraintImpulse.y =
      b.constraintImpulse.angle =
        0;
    if (g.resize && editLength)
      for (const l of this.mechanisms.cables.links())
        if ([l.a, l.b, l.wheel].includes(g.id)) {
          this.mechanisms.cables.bind(l);
          if (g.snap) {
            const target = Math.max(GRID, snap(l.length)),
              delta = target - l.length;
            if (l.b === g.id) l.feedA += delta;
            else l.feedB += delta;
            l.length = target;
          }
        }
    this.mechanisms.solvePulley(g.id);

    g.snapCentre = g.snap && !o.lockPosition ? toWorld(b.position) : null;
  }
  endGrab(throwObject = true, now = performance.now()) {
    const g = this.grab;
    if (!g) return;
    const o = this.objects.get(g.id),
      samples = g.samples;
    const last = samples.at(-1),
      first = samples.find((s) => s.t >= last.t - 100) || samples[0];
    const dt = (last.t - first.t) / 1000;
    if (
      throwObject &&
      !g.blocked &&
      !g.paused &&
      !g.snap &&
      dt > 0.001 &&
      now - last.t < 100
    ) {
      let vx = (last.x - first.x) / dt,
        vy = (last.y - first.y) / dt;
      const rods = this.grabRods();
      // Release along the allowed tangent, never radially through a rod.
      if (rods.length === 1) {
        const c = this.endpoint(rods[0], rods[0].a === g.id ? "b" : "a"),
          p = this.state(g.id);
        const dx = p.x - c.x,
          dy = p.y - c.y,
          d = Math.hypot(dx, dy);
        if (d > 1e-9) {
          const radial = (vx * dx + vy * dy) / (d * d);
          vx -= radial * dx;
          vy -= radial * dy;
        }
      } else if (rods.length > 1) vx = vy = 0;
      const scale = Math.min(1, 30 / (Math.hypot(vx, vy) || 1));
      if (!o.lockPosition)
        Body.setVelocity(o.body, {
          x: (vx * scale * SCALE) / 60,
          y: (-vy * scale * SCALE) / 60,
        });
      if (!o.lockRotation && (o.lockPosition || g.mode === "rotate"))
        Body.setAngularVelocity(
          o.body,
          -Math.max(-30, Math.min(30, (last.angle - first.angle) / dt)) / 60,
        );
    }
    this.grab = null;
    this.solveGuides();
    this.mechanisms.solvePulley();
  }
  applyForce(id, point, force) {
    const o = this.objects.get(id);
    if (o)
      Body.applyForce(o.body, toEngine(point), {
        x: (force.x * SCALE) / 1e6,
        y: (-force.y * SCALE) / 1e6,
      });
  }
  enforceLocks() {
    for (const o of this.objects.values()) {
      if (o.lockPosition) {
        Body.setPosition(o.body, o.positionAnchor);
        Body.setVelocity(o.body, { x: 0, y: 0 });
        o.body.force.x = 0;
        o.body.force.y = 0;
        o.body.positionImpulse.x = 0;
        o.body.positionImpulse.y = 0;
        o.body.constraintImpulse.x = 0;
        o.body.constraintImpulse.y = 0;
      }
      if (o.lockRotation) {
        Body.setAngle(o.body, o.angleAnchor);
        Body.setAngularVelocity(o.body, 0);
        o.body.torque = 0;
        o.body.constraintImpulse.angle = 0;
      }
    }
  }
  step() {
    for (const o of this.objects.values()) {
      const s = this.state(o.id),
        b = o.body;
      if (!o.lockPosition) {
        this.applyForce(o.id, s, { x: 0, y: -this.settings.gravity * o.mass });
        Body.setVelocity(b, {
          x:
            b.velocity.x *
            Math.exp(-(o.linearDamping + this.settings.airResistance) * DT),
          y:
            b.velocity.y *
            Math.exp(-(o.linearDamping + this.settings.airResistance) * DT),
        });
      }
      if (!o.lockRotation)
        Body.setAngularVelocity(
          b,
          Body.getAngularVelocity(b) *
            Math.exp(-(o.angularDamping + this.settings.airResistance) * DT),
        );
    }
    for (const l of this.links.values())
      if (l.type === "spring") {
        const a = this.endpoint(l, "a"),
          b = this.endpoint(l, "b"),
          dx = b.x - a.x,
          dy = b.y - a.y,
          d = Math.hypot(dx, dy);
        if (!l.lockAngle && d > 1e-8) l.axis = { x: dx / d, y: dy / d };
        const va = l.a ? this.state(l.a) : { vx: 0, vy: 0 },
          vb = l.b ? this.state(l.b) : { vx: 0, vy: 0 },
          nx = l.lockAngle || d < 1e-8 ? l.axis.x : dx / d,
          ny = l.lockAngle || d < 1e-8 ? l.axis.y : dy / d;
        const f =
          l.k * ((l.lockAngle ? dx * nx + dy * ny : d) - l.length) +
          l.damping * ((vb.vx - va.vx) * nx + (vb.vy - va.vy) * ny);
        if (l.a) this.applyForce(l.a, a, { x: f * nx, y: f * ny });
        if (l.b) this.applyForce(l.b, b, { x: -f * nx, y: -f * ny });
      }
    this.placeGrab();
    this.enforceLocks();
    this.holdResize();
    this.group?.hold();
    this.mechanisms.beforeStep();
    Engine.update(this.engine, DT * 1000);
    this.enforceLocks();
    this.placeGrab();
    this.holdResize();
    for (let i = 0; i < 6; i++) this.solveGuides();
    this.mechanisms.afterStep();
    this.group?.hold();
    this.time += DT;
  }
  remove(id) {
    if (this.group?.ids.has(id)) this.endGroup();
    if (this.grab?.id === id) this.endGrab(false);
    if (this.sizing?.id === id) this.endResize();
    this.mechanisms.remove(id);
    for (const [key, l] of this.links)
      if (key === id || l.a === id || l.b === id) {
        if (l.constraint) Composite.remove(this.engine.world, l.constraint);
        this.links.delete(key);
      }
    const o = this.objects.get(id);
    if (o) {
      Composite.remove(this.engine.world, o.body);
      this.objects.delete(id);
    }
  }
  dispose() {
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }
}
