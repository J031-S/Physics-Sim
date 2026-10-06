// Ideal fixed-axle belts and a guided, no-slip cable over a single pulley.
// Geometry uses metres/radians; conversions to Matter units stay at the boundary.
const { Body, Bodies, Composite } = globalThis.Matter;
const SCALE = 100,
  STEP = 1 / 120;
const pos = (b, p) => Body.setPosition(b, { x: p.x * SCALE, y: -p.y * SCALE });
const velocity = (b, x, y) =>
  Body.setVelocity(b, { x: (x * SCALE) / 60, y: (-y * SCALE) / 60 });
const angle = (b, a) => Body.setAngle(b, -a);
const spin = (b, w) => Body.setAngularVelocity(b, -w / 60);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export class Mechanisms {
  constructor(sim) {
    this.sim = sim;
  }
  isLoad(id) {
    return (
      id &&
      [...this.sim.links.values()].some(
        (l) => l.type === "pulley" && (l.a === id || l.b === id),
      )
    );
  }
  isWheel(id) {
    return [...this.sim.links.values()].some(
      (l) =>
        (l.type === "belt" && (l.a === id || l.b === id)) ||
        (l.type === "pulley" && l.wheel === id),
    );
  }
  wheels(l) {
    return [this.sim.objects.get(l.a), this.sim.objects.get(l.b)];
  }
  createBelt(a, b) {
    const s = this.sim,
      oa = s.objects.get(a),
      ob = s.objects.get(b);
    if (!oa || !ob || a === b || oa.shape !== "ball" || ob.shape !== "ball")
      throw new Error("Choose two different balls for the belt wheels.");
    if (this.isLoad(a) || this.isLoad(b))
      throw new Error("A hanging load cannot also be a fixed belt wheel.");
    if (
      [...s.links.values()].some(
        (l) =>
          l.type === "belt" && [l.a, l.b].includes(a) && [l.a, l.b].includes(b),
      )
    )
      throw new Error("These wheels already share a belt.");
    const pa = s.state(a),
      pb = s.state(b),
      d = Math.hypot(pa.x - pb.x, pa.y - pb.y);
    if (d <= oa.radius + ob.radius + 0.1)
      throw new Error("Leave space between the two wheels.");
    const l = {
      id: "link-" + ++s.serial,
      type: "belt",
      a,
      b,
      crossed: false,
      motor: false,
      speed: 1,
      phase: oa.radius * pa.angle - ob.radius * pb.angle,
      surfaces: [],
      travel: 0,
    };
    s.setLock(a, "position", true);
    s.setLock(b, "position", true);
    for (let i = 0; i < 2; i++) {
      const body = Bodies.rectangle(0, 0, 1, 4, {
        isStatic: true,
        friction: 0,
        frictionStatic: 0,
        restitution: 0,
      });
      body.plugin.belt = l.id;
      l.surfaces.push(body);
      Composite.add(s.engine.world, body);
    }
    s.links.set(l.id, l);
    this.updateSurfaces(l);
    return l.id;
  }
  configureBelt(id, patch) {
    const l = this.sim.links.get(id);
    if (l?.type !== "belt") return;
    if (
      patch.speed !== undefined &&
      (!Number.isFinite(patch.speed) || Math.abs(patch.speed) > 10)
    )
      throw new Error("Belt speed must be between −10 and 10 m/s.");
    for (const k of Object.keys(patch))
      if (!["crossed", "motor", "speed"].includes(k))
        throw new Error("Unknown belt setting.");
    if (
      (patch.crossed !== undefined && typeof patch.crossed !== "boolean") ||
      (patch.motor !== undefined && typeof patch.motor !== "boolean")
    )
      throw new Error("Invalid belt switch.");
    Object.assign(l, patch);
    this.rebase(l.a);
    this.updateSurfaces(l);
  }
  beltGeometry(l) {
    const [oa, ob] = this.wheels(l),
      a = this.sim.state(l.a),
      b = this.sim.state(l.b),
      sign = l.crossed ? -1 : 1;
    const dx = b.x - a.x,
      dy = b.y - a.y,
      d = Math.hypot(dx, dy),
      u = { x: dx / d, y: dy / d },
      q = (oa.radius - sign * ob.radius) / d,
      h = Math.sqrt(Math.max(0, 1 - q * q));
    const normals = [1, -1].map((k) => ({
      x: q * u.x - k * h * u.y,
      y: q * u.y + k * h * u.x,
    }));
    const ends = normals.map((n) => ({
      a: { x: a.x + oa.radius * n.x, y: a.y + oa.radius * n.y },
      b: { x: b.x + sign * ob.radius * n.x, y: b.y + sign * ob.radius * n.y },
    }));
    const path = [ends[0].a, ends[0].b];
    const arc = (c, r, start, end, direction) => {
      let delta = end - start;
      if (direction < 0) {
        while (delta >= 0) delta -= 2 * Math.PI;
      } else {
        while (delta <= 0) delta += 2 * Math.PI;
      }
      const steps = Math.ceil(Math.abs(delta) * 16);
      for (let i = 1; i <= steps; i++) {
        const t = start + (delta * i) / steps;
        path.push({ x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) });
      }
    };
    arc(
      b,
      ob.radius,
      Math.atan2(sign * normals[0].y, sign * normals[0].x),
      Math.atan2(sign * normals[1].y, sign * normals[1].x),
      -sign,
    );
    path.push(ends[1].a);
    arc(
      a,
      oa.radius,
      Math.atan2(normals[1].y, normals[1].x),
      Math.atan2(normals[0].y, normals[0].x),
      -1,
    );
    return { path, ends };
  }
  updateSurfaces(l) {
    const { ends } = this.beltGeometry(l),
      a = this.sim.objects.get(l.a),
      speed = -this.sim.state(l.a).omega * a.radius;
    ends.forEach((e, i) => {
      const b = l.surfaces[i],
        dx = e.b.x - e.a.x,
        dy = e.b.y - e.a.y,
        d = Math.hypot(dx, dy);
      Body.setAngle(b, 0);
      Body.scale(b, (d * SCALE) / (b.plugin.span || 1), 1);
      b.plugin.span = d * SCALE;
      Body.setAngle(b, -Math.atan2(dy, dx));
      pos(b, { x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2 });
      // Collision response sees a moving surface, while its fixed geometry stays put.
      b.deltaTime = STEP * 1000;
      velocity(
        b,
        ((i ? -1 : 1) * speed * dx) / d,
        ((i ? -1 : 1) * speed * dy) / d,
      );
    });
  }
  ignoreContact(a, b) {
    const l = this.sim.links.get(a.plugin?.belt || b.plugin?.belt);
    if (!l) return false;
    const other = a.plugin?.belt ? b : a;
    return (
      !!other.plugin?.belt ||
      [l.a, l.b].some((id) => this.sim.objects.get(id)?.body === other)
    );
  }
  solveBelts() {
    const s = this.sim;
    for (let i = 0; i < 8; i++)
      for (const l of s.links.values())
        if (l.type === "belt") {
          const [a, b] = this.wheels(l),
            sa = s.state(l.a),
            sb = s.state(l.b),
            sign = l.crossed ? -1 : 1;
          const ra = a.radius,
            rb = b.radius,
            ia = a.body.inverseInertia * SCALE * SCALE,
            ib = b.body.inverseInertia * SCALE * SCALE;
          if (
            l.motor &&
            !a.lockRotation &&
            !b.lockRotation &&
            ![l.a, l.b].includes(s.grab?.id) &&
            ![l.a, l.b].includes(s.sizing?.id)
          ) {
            spin(a.body, -l.speed / ra);
            spin(b.body, (-sign * l.speed) / rb);
          }
          const denom = ra * ra * ia + rb * rb * ib;
          if (denom < 1e-12) continue;
          const error = ra * sa.angle - sign * rb * sb.angle - l.phase;
          if (ia) angle(a.body, sa.angle - (error * ra * ia) / denom);
          if (ib) angle(b.body, sb.angle + (error * sign * rb * ib) / denom);
          const va = s.state(l.a).omega,
            vb = s.state(l.b).omega,
            v = ra * va - sign * rb * vb;
          if (ia) spin(a.body, va - (v * ra * ia) / denom);
          if (ib) spin(b.body, vb + (v * sign * rb * ib) / denom);
        }
  }
  driveDraggedWheel(id) {
    const s = this.sim;
    for (const l of s.links.values())
      if (l.type === "belt" && (l.a === id || l.b === id)) {
        const [a, b] = this.wheels(l),
          sign = l.crossed ? -1 : 1,
          sa = s.state(l.a),
          sb = s.state(l.b);
        if (id === l.a && !b.lockRotation)
          angle(b.body, (a.radius * sa.angle - l.phase) / (sign * b.radius));
        else if (id === l.b && !a.lockRotation)
          angle(a.body, (l.phase + sign * b.radius * sb.angle) / a.radius);
        else if (id === l.a)
          angle(a.body, (l.phase + sign * b.radius * sb.angle) / a.radius);
        else angle(b.body, (a.radius * sa.angle - l.phase) / (sign * b.radius));
        this.updateSurfaces(l);
      }
  }
  createPulley(left, wheel, right) {
    const s = this.sim,
      a = s.objects.get(left),
      w = s.objects.get(wheel),
      b = s.objects.get(right);
    if (
      new Set([left, wheel, right]).size !== 3 ||
      !a ||
      !b ||
      w?.shape !== "ball"
    )
      throw new Error(
        "Choose a left load, a ball for the wheel, and a different right load.",
      );
    if (
      [...s.links.values()].some(
        (l) => l.type === "pulley" && l.wheel === wheel,
      )
    )
      throw new Error("This wheel already has a pulley cable.");
    if (
      this.isWheel(left) ||
      this.isWheel(right) ||
      this.isLoad(wheel) ||
      [...s.links.values()].some((l) =>
        [l.a, l.b].some((id) => id === left || id === right),
      )
    )
      throw new Error("Choose loads that do not already have connections.");
    if (a.lockPosition || b.lockPosition)
      throw new Error("Unlock the positions of the two loads first.");
    const pa = s.state(left),
      pb = s.state(right),
      pw = s.state(wheel),
      extent = (o) =>
        o.shape === "ball" ? o.radius : Math.hypot(o.width, o.height) / 2;
    if (Math.max(pa.y + extent(a), pb.y + extent(b)) >= pw.y - 0.05)
      throw new Error("Place both loads below the pulley wheel.");
    if (extent(a) + extent(b) >= 2 * w.radius - 0.05)
      throw new Error(
        "Enlarge the pulley wheel or reduce the loads so they fit side by side.",
      );
    const l = {
      id: "link-" + ++s.serial,
      type: "pulley",
      a: left,
      b: right,
      wheel,
      yA: pa.y,
      yB: pb.y,
      theta: pw.angle,
      q: 0,
    };
    s.setLock(wheel, "position", true);
    s.links.set(l.id, l);
    this.solvePulley();
    return l.id;
  }
  solvePulley(driver = null) {
    const s = this.sim;
    for (const l of s.links.values())
      if (l.type === "pulley") {
        const a = s.objects.get(l.a),
          b = s.objects.get(l.b),
          w = s.objects.get(l.wheel),
          sa = s.state(l.a),
          sb = s.state(l.b),
          sw = s.state(l.wheel),
          r = w.radius;
        const inertia = w.freeInertia / (SCALE * SCALE),
          denom = (a.mass + b.mass) * r * r + inertia;
        let q =
          (a.mass * -r * (sa.y - l.yA) +
            b.mass * r * (sb.y - l.yB) +
            inertia * (sw.angle - l.theta)) /
          denom;
        let omega =
          (-a.mass * r * sa.vy + b.mass * r * sb.vy + inertia * sw.omega) /
          denom;
        if (driver === l.a) q = (l.yA - sa.y) / r;
        if (driver === l.b) q = (sb.y - l.yB) / r;
        if (driver === l.wheel) q = sw.angle - l.theta;
        if ([l.a, l.b, l.wheel].includes(driver)) omega = 0;
        if (a.lockPosition) {
          q = (l.yA - sa.y) / r;
          omega = 0;
        }
        if (b.lockPosition) {
          q = (sb.y - l.yB) / r;
          omega = 0;
        }
        if (w.lockRotation) {
          q = -w.angleAnchor - l.theta;
          omega = 0;
        }
        const clearance = (o) =>
          (Math.max(...o.body.vertices.map((v) => v.y)) - o.body.position.y) /
          SCALE;
        const ca = clearance(a),
          cb = clearance(b),
          topA = sw.y - ca - 0.05,
          topB = sw.y - cb - 0.05;
        const lo = Math.max((l.yA - topA) / r, (cb - l.yB) / r),
          hi = Math.min((l.yA - ca) / r, (topB - l.yB) / r);
        const bounded = clamp(q, lo, hi);
        if (bounded !== q) omega = 0;
        q = bounded;
        l.q = q;
        if (!a.lockPosition) pos(a.body, { x: sw.x - r, y: l.yA - r * q });
        if (!b.lockPosition) pos(b.body, { x: sw.x + r, y: l.yB + r * q });
        velocity(a.body, 0, a.lockPosition ? 0 : -r * omega);
        velocity(b.body, 0, b.lockPosition ? 0 : r * omega);
        if (!w.lockRotation) angle(w.body, l.theta + q);
        spin(w.body, w.lockRotation ? 0 : omega);
      }
  }
  pulleyPath(l) {
    const s = this.sim,
      w = s.objects.get(l.wheel),
      p = s.state(l.wheel),
      path = [s.state(l.a), { x: p.x - w.radius, y: p.y }];
    for (let i = 0; i <= 32; i++) {
      const a = Math.PI - (i * Math.PI) / 32;
      path.push({
        x: p.x + w.radius * Math.cos(a),
        y: p.y + w.radius * Math.sin(a),
      });
    }
    path.push(s.state(l.b));
    return path;
  }
  validateResize(id, width, height) {
    const radius = width / 2;
    const s = this.sim;
    for (const l of s.links.values()) {
      if (l.type === "belt" && (l.a === id || l.b === id)) {
        const other = s.objects.get(l.a === id ? l.b : l.a),
          a = s.state(id),
          b = s.state(other.id);
        if (Math.hypot(a.x - b.x, a.y - b.y) <= radius + other.radius + 0.1)
          throw new Error("The belt wheels need a gap between them.");
      }
      if (l.type === "pulley" && (l.a === id || l.b === id || l.wheel === id)) {
        const w = s.objects.get(l.wheel),
          a = s.objects.get(l.a),
          b = s.objects.get(l.b);
        const extent = (o) =>
          o.id === id
            ? o.shape === "ball"
              ? radius
              : Math.hypot(width, height) / 2
            : o.shape === "ball"
              ? o.radius
              : Math.hypot(o.width, o.height) / 2;
        const r = l.wheel === id ? radius : w.radius;
        if (extent(a) + extent(b) >= 2 * r - 0.05)
          throw new Error("Leave room for both pulley loads.");
        if (l.wheel === id && (a.lockPosition || b.lockPosition))
          throw new Error(
            "Unlock the pulley loads before changing wheel size.",
          );
        if (
          Math.max(s.state(l.a).y + extent(a), s.state(l.b).y + extent(b)) >=
          s.state(l.wheel).y - 0.05
        )
          throw new Error("Leave clearance below the pulley wheel.");
      }
    }
  }
  rebase(id) {
    const s = this.sim;
    for (const l of s.links.values()) {
      if (l.type === "belt" && (l.a === id || l.b === id)) {
        const [a, b] = this.wheels(l);
        l.phase =
          a.radius * s.state(l.a).angle -
          (l.crossed ? -1 : 1) * b.radius * s.state(l.b).angle;
        this.updateSurfaces(l);
      }
      if (l.type === "pulley" && (l.wheel === id || l.a === id || l.b === id)) {
        l.yA = s.state(l.a).y;
        l.yB = s.state(l.b).y;
        l.theta = s.state(l.wheel).angle;
        l.q = 0;
        this.solvePulley();
      }
    }
  }
  conveyorContacts() {
    const s = this.sim;
    for (const pair of s.engine.pairs.list) {
      if (!pair.isActive || pair.isSensor) continue;
      const ca = pair.collision.parentA,
        cb = pair.collision.parentB;
      const surface = ca.plugin?.belt ? ca : cb.plugin?.belt ? cb : null;
      if (!surface) continue;
      const other = surface === ca ? cb : ca,
        o = [...s.objects.values()].find((o) => o.body === other);
      if (!o || o.lockPosition || s.grab?.id === o.id || s.sizing?.id === o.id)
        continue;
      const l = s.links.get(surface.plugin.belt),
        [a, b] = this.wheels(l),
        i = l.surfaces.indexOf(surface);
      const e = this.beltGeometry(l).ends[i],
        dx = e.b.x - e.a.x,
        dy = e.b.y - e.a.y,
        d = Math.hypot(dx, dy),
        t = { x: ((i ? -1 : 1) * dx) / d, y: ((i ? -1 : 1) * dy) / d };
      const contacts = pair.contacts.slice(0, pair.contactCount);
      if (!contacts.length) continue;
      const at = contacts.reduce(
        (p, c) => ({
          x: p.x + c.vertex.x / (SCALE * contacts.length),
          y: p.y - c.vertex.y / (SCALE * contacts.length),
        }),
        { x: 0, y: 0 },
      );
      const state = s.state(o.id),
        lever = (at.x - state.x) * t.y - (at.y - state.y) * t.x,
        ii = other.inverseInertia * SCALE * SCALE;
      const inv = 1 / o.mass + lever * lever * ii;
      const invBelt =
        l.motor ||
        a.lockRotation ||
        b.lockRotation ||
        [l.a, l.b].includes(s.grab?.id)
          ? 0
          : 1 /
            (a.freeInertia / (SCALE * SCALE * a.radius * a.radius) +
              b.freeInertia / (SCALE * SCALE * b.radius * b.radius));
      const speed = -s.state(l.a).omega * a.radius,
        relative = state.vx * t.x + state.vy * t.y + state.omega * lever;
      const normal = Math.max(
        o.mass * 9.81 * STEP,
        contacts.reduce((sum, c) => sum + Math.abs(c.normalImpulse), 0) /
          (SCALE * STEP),
      );
      const limit = o.friction * 0.8 * normal,
        j = clamp((speed - relative) / (inv + invBelt), -limit, limit);
      velocity(
        other,
        state.vx + (j * t.x) / o.mass,
        state.vy + (j * t.y) / o.mass,
      );
      if (ii) spin(other, state.omega + j * lever * ii);
      if (invBelt) {
        const delta = j * invBelt;
        spin(a.body, s.state(l.a).omega + delta / a.radius);
        spin(
          b.body,
          s.state(l.b).omega + ((l.crossed ? -1 : 1) * delta) / b.radius,
        );
      }
    }
  }
  beforeStep() {
    this.solveBelts();
    for (const l of this.sim.links.values())
      if (l.type === "belt") this.updateSurfaces(l);
  }
  afterStep() {
    this.solveBelts();
    this.conveyorContacts();
    this.solvePulley(this.sim.sizing?.id || null);
    for (const l of this.sim.links.values())
      if (l.type === "belt")
        l.travel +=
          -this.sim.state(l.a).omega * this.sim.objects.get(l.a).radius * STEP;
  }
  remove(id) {
    for (const [key, l] of this.sim.links)
      if (
        (l.type === "belt" || l.type === "pulley") &&
        (key === id || l.a === id || l.b === id || l.wheel === id)
      ) {
        for (const b of l.surfaces || [])
          Composite.remove(this.sim.engine.world, b);
        this.sim.links.delete(key);
      }
  }
}
