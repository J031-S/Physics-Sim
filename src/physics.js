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
    this.time = 0;
    this.serial = 0;
    this.grab = null;
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
        pair.isSensor = a.inverseMass + b.inverseMass === 0;
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
  beginGrab(id, p, now = performance.now()) {
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
  moveGrab(p, snapping = false, resize = false, now = performance.now()) {
    if (!this.grab) return;
    const g = this.grab;
    g.target = { ...p };
    g.snap = snapping;
    g.resize = resize;
    this.placeGrab(true);
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
    if (o.lockPosition) {
      // A pinned centre leaves only rotation; a centre grab has no lever arm.
      if (!o.lockRotation && Math.hypot(g.local.x, g.local.y) > 1e-4) {
        const q = toEngine(g.target),
          dx = q.x - o.positionAnchor.x,
          dy = q.y - o.positionAnchor.y;
        if (Math.hypot(dx, dy) > 1e-4) {
          const desired = Math.atan2(dy, dx) - Math.atan2(g.local.y, g.local.x);
          g.angle =
            b.angle +
            Math.atan2(
              Math.sin(desired - b.angle),
              Math.cos(desired - b.angle),
            );
        }
      }
      Body.setPosition(b, o.positionAnchor);
    } else {
      const c = Math.cos(g.angle),
        sn = Math.sin(g.angle);
      let desired = {
        x: g.target.x - (g.local.x * c - g.local.y * sn) / SCALE,
        y: g.target.y + (g.local.x * sn + g.local.y * c) / SCALE,
      };
      Body.setAngle(b, o.lockRotation ? o.angleAnchor : g.angle);
      const floor =
        (Math.max(...b.vertices.map((v) => v.y)) - b.position.y) / SCALE;
      if (g.snap)
        desired = {
          x: snap(desired.x),
          y: Math.max(Math.ceil(floor / GRID) * GRID, snap(desired.y)),
        };
      desired.y = Math.max(floor, desired.y);
      const rods = this.grabRods();
      const circles = rods.map((l) => ({
        ...this.endpoint(l, l.a === g.id ? "b" : "a"),
        r: l.length,
      }));
      if (g.resize && editLength) {
        // Reject impossible/extreme edits atomically, without stretching locks.
        const lengths = circles.map((c) =>
          Math.hypot(desired.x - c.x, desired.y - c.y),
        );
        if (lengths.every((l) => l >= 0.05 && l <= 50)) {
          rods.forEach((l, i) => this.updateLink(l.id, { length: lengths[i] }));
        } else desired = old;
      } else if (circles.length) {
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
        const valid = candidates.filter(
          (p) =>
            p.y >= floor - 1e-7 &&
            circles.every(
              (c) => Math.abs(Math.hypot(p.x - c.x, p.y - c.y) - c.r) < 1e-6,
            ),
        );
        valid.sort(
          (a, b) =>
            Math.hypot(a.x - desired.x, a.y - desired.y) -
            Math.hypot(b.x - desired.x, b.y - desired.y),
        );
        desired = valid[0] || old; // Inconsistent constraints must not teleport a body.
      }
      Body.setPosition(b, toEngine(desired));
    }
    Body.setAngle(b, o.lockRotation ? o.angleAnchor : g.angle);
    Body.setVelocity(b, { x: 0, y: 0 });
    Body.setAngularVelocity(b, 0);
    b.positionImpulse.x = b.positionImpulse.y = 0;
    b.constraintImpulse.x =
      b.constraintImpulse.y =
      b.constraintImpulse.angle =
        0;
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
    if (throwObject && !g.snap && dt > 0.001 && now - last.t < 100) {
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
      if (!o.lockRotation && o.lockPosition)
        Body.setAngularVelocity(
          o.body,
          -Math.max(-30, Math.min(30, (last.angle - first.angle) / dt)) / 60,
        );
    }
    this.grab = null;
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
        this.applyForce(o.id, s, { x: 0, y: -9.81 * o.mass });
        Body.setVelocity(b, {
          x: b.velocity.x * Math.exp(-o.linearDamping * DT),
          y: b.velocity.y * Math.exp(-o.linearDamping * DT),
        });
      }
      if (!o.lockRotation)
        Body.setAngularVelocity(
          b,
          Body.getAngularVelocity(b) * Math.exp(-o.angularDamping * DT),
        );
    }
    for (const l of this.links.values())
      if (l.type === "spring") {
        const a = this.endpoint(l, "a"),
          b = this.endpoint(l, "b"),
          dx = b.x - a.x,
          dy = b.y - a.y,
          d = Math.hypot(dx, dy);
        if (d < 1e-8) continue;
        const va = l.a ? this.state(l.a) : { vx: 0, vy: 0 },
          vb = l.b ? this.state(l.b) : { vx: 0, vy: 0 },
          nx = dx / d,
          ny = dy / d;
        const f =
          l.k * (d - l.length) +
          l.damping * ((vb.vx - va.vx) * nx + (vb.vy - va.vy) * ny);
        if (l.a) this.applyForce(l.a, a, { x: f * nx, y: f * ny });
        if (l.b) this.applyForce(l.b, b, { x: -f * nx, y: -f * ny });
      }
    this.placeGrab();
    this.enforceLocks();
    Engine.update(this.engine, DT * 1000);
    this.enforceLocks();
    this.placeGrab();
    this.time += DT;
  }
  remove(id) {
    if (this.grab?.id === id) this.endGrab(false);
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
