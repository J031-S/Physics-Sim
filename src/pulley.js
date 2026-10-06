// Taut, no-slip cable over a circular wheel. Ends are free in 2D.
// Two material-coordinate constraints couple tangent spans to wheel rotation.
const { Body } = globalThis.Matter;
const S = 100,
  TAU = 2 * Math.PI;
const dot = (a, b) => a.x * b.x + a.y * b.y;
const minus = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const unwrap = (a, ref) => a + TAU * Math.round((ref - a) / TAU);
const position = (body, p) =>
  Body.setPosition(body, { x: p.x * S, y: -p.y * S });
const velocity = (body, v) =>
  Body.setVelocity(body, { x: (v.x * S) / 60, y: (-v.y * S) / 60 });
export class PulleyCables {
  constructor(sim) {
    this.sim = sim;
  }
  links() {
    return [...this.sim.links.values()].filter((l) => l.type === "pulley");
  }
  involves(id) {
    return this.links().some((l) => [l.a, l.b, l.wheel].includes(id));
  }
  create(a, wheel, b) {
    const s = this.sim,
      w = s.objects.get(wheel);
    if (
      new Set([a, wheel, b]).size !== 3 ||
      !s.objects.has(a) ||
      !s.objects.has(b) ||
      w?.shape !== "ball"
    )
      throw new Error(
        "Choose one endpoint, a ball for the wheel, and a different endpoint.",
      );
    const c = s.state(wheel);
    if (
      [a, b].some(
        (id) =>
          Math.hypot(s.state(id).x - c.x, s.state(id).y - c.y) <=
          w.radius + 0.02,
      )
    )
      throw new Error("Cable endpoints must be outside the wheel.");
    if (
      this.links().some(
        (l) =>
          l.wheel === wheel && [l.a, l.b].includes(a) && [l.a, l.b].includes(b),
      )
    )
      throw new Error("These objects already share a pulley cable.");
    const l = {
      id: "link-" + ++s.serial,
      type: "pulley",
      a,
      b,
      wheel,
      reverse: false,
    };
    this.bind(l, true);
    s.links.set(l.id, l);
    s.setLock(wheel, "position", true);
    return l.id;
  }
  geometry(l, commit = false) {
    const s = this.sim,
      a = s.state(l.a),
      b = s.state(l.b),
      c = s.state(l.wheel),
      r = s.objects.get(l.wheel).radius,
      k = l.reverse ? -1 : 1;
    const tangent = (p, sign, ref) => {
      const v = minus(p, c),
        d = Math.hypot(v.x, v.y),
        alpha = Math.acos(Math.min(1, r / Math.max(d, r + 0.000001)));
      let t = Math.atan2(v.y, v.x) + sign * alpha;
      if (Number.isFinite(ref)) t = unwrap(t, ref);
      const point = { x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) },
        v2 = minus(p, point),
        length = Math.max(1e-7, Math.hypot(v2.x, v2.y));
      return {
        t,
        point,
        length,
        u: { x: v2.x / length, y: v2.y / length },
        distance: d,
      };
    };
    const A = tangent(a, -k, l.aAngle),
      B = tangent(b, k, l.bAngle);
    if (!Number.isFinite(l.bAngle)) {
      while (k * (A.t - B.t) < 0) B.t -= k * TAU;
      while (k * (A.t - B.t) >= TAU) B.t += k * TAU;
    }
    if (commit) {
      l.aAngle = A.t;
      l.bAngle = B.t;
    }
    const wrap = k * (A.t - B.t),
      fA = A.length + k * r * A.t,
      fB = B.length - k * r * B.t;
    return { a, b, c, r, k, A, B, wrap, fA, fB, length: fA + fB };
  }
  bind(l, resetRoute = false) {
    if (resetRoute) {
      delete l.aAngle;
      delete l.bAngle;
    }
    const g = this.geometry(l, true);
    l.feedA = g.fA - g.k * g.r * g.c.angle;
    l.feedB = g.fB + g.k * g.r * g.c.angle;
    l.length = g.length;
  }
  reverse(id, value) {
    const l = this.sim.links.get(id);
    if (l?.type !== "pulley") return;
    l.reverse = !!value;
    this.bind(l, true);
  }
  path(l) {
    const g = this.geometry(l),
      path = [g.a, g.A.point],
      steps = Math.max(2, Math.ceil(Math.abs(g.wrap) * 20));
    for (let i = 1; i <= steps; i++) {
      const t = g.A.t - (g.k * g.wrap * i) / steps;
      path.push({ x: g.c.x + g.r * Math.cos(t), y: g.c.y + g.r * Math.sin(t) });
    }
    path.push(g.b);
    return path;
  }
  mobility(id, driver) {
    const s = this.sim,
      o = s.objects.get(id);
    if (o.lockPosition || id === driver || s.sizing?.id === id)
      return { xx: 0, xy: 0, yy: 0 };
    // A spring angle lock is a frictionless rail. Project cable impulses onto
    // its allowed axis, rather than solving a guide and cable against each other.
    let axis = null;
    for (const l of s.links.values())
      if (l.type === "spring" && l.lockAngle && (l.a === id || l.b === id)) {
        const other = l.a === id ? l.b : l.a;
        if (
          other &&
          !s.objects.get(other).lockPosition &&
          other !== driver &&
          s.sizing?.id !== other
        )
          continue;
        if (axis && Math.abs(axis.x * l.axis.y - axis.y * l.axis.x) > 1e-5)
          return { xx: 0, xy: 0, yy: 0 };
        axis = l.axis;
      }
    const m = 1 / o.mass;
    return axis
      ? {
          xx: m * axis.x * axis.x,
          xy: m * axis.x * axis.y,
          yy: m * axis.y * axis.y,
        }
      : { xx: m, xy: 0, yy: m };
  }
  times(m, v) {
    return { x: m.xx * v.x + m.xy * v.y, y: m.xy * v.x + m.yy * v.y };
  }
  system(l, g, driver) {
    const s = this.sim,
      ma = this.mobility(l.a, driver),
      mb = this.mobility(l.b, driver),
      mc = this.mobility(l.wheel, driver),
      w = s.objects.get(l.wheel);
    const ii =
      l.wheel === driver || s.sizing?.id === l.wheel
        ? 0
        : w.body.inverseInertia * S * S;
    const A = this.times(ma, g.A.u),
      B = this.times(mb, g.B.u),
      CA = this.times(mc, g.A.u),
      CB = this.times(mc, g.B.u),
      j = g.k * g.r;
    return {
      ma,
      mb,
      mc,
      ii,
      j,
      A,
      B,
      CA,
      CB,
      m00: dot(g.A.u, A) + dot(g.A.u, CA) + j * j * ii,
      m11: dot(g.B.u, B) + dot(g.B.u, CB) + j * j * ii,
      m01: dot(g.A.u, CB) - j * j * ii,
    };
  }
  multipliers(m, e0, e1) {
    const det = m.m00 * m.m11 - m.m01 * m.m01;
    if (det > 1e-12)
      return [
        (-e0 * m.m11 + e1 * m.m01) / det,
        (-e1 * m.m00 + e0 * m.m01) / det,
      ];
    // Rank-one systems occur with both centres pinned and a free wheel.
    const norm = m.m00 * m.m00 + 2 * m.m01 * m.m01 + m.m11 * m.m11;
    return norm > 1e-12
      ? [-(m.m00 * e0 + m.m01 * e1) / norm, -(m.m01 * e0 + m.m11 * e1) / norm]
      : [0, 0];
  }
  apply(l, g, m, lambdas, isVelocity) {
    const [la, lb] = lambdas,
      s = this.sim;
    const deltaA = { x: m.A.x * la, y: m.A.y * la },
      deltaB = { x: m.B.x * lb, y: m.B.y * lb },
      deltaC = { x: -m.CA.x * la - m.CB.x * lb, y: -m.CA.y * la - m.CB.y * lb };
    for (const [id, d] of [
      [l.a, deltaA],
      [l.b, deltaB],
      [l.wheel, deltaC],
    ]) {
      const o = s.objects.get(id),
        p = s.state(id);
      if (isVelocity) velocity(o.body, { x: p.vx + d.x, y: p.vy + d.y });
      else {
        const floor =
          (Math.max(...o.body.vertices.map((v) => v.y)) - o.body.position.y) /
          S;
        position(o.body, {
          x: p.x + d.x,
          y: o.lockPosition ? p.y : Math.max(floor, p.y + d.y),
        });
      }
    }
    const w = s.objects.get(l.wheel),
      turn = m.ii * m.j * (-la + lb);
    if (isVelocity)
      Body.setAngularVelocity(w.body, -(s.state(l.wheel).omega + turn) / 60);
    else Body.setAngle(w.body, -(g.c.angle + turn));
  }
  projectRods(driver, isVelocity = false) {
    const s = this.sim;
    for (const l of s.links.values())
      if (l.type === "rod") {
        const a = s.endpoint(l, "a"),
          b = s.endpoint(l, "b"),
          dx = b.x - a.x,
          dy = b.y - a.y,
          d = Math.hypot(dx, dy);
        if (d < 1e-8) continue;
        const u = { x: dx / d, y: dy / d },
          zero = { xx: 0, xy: 0, yy: 0 };
        const ma = l.a ? this.mobility(l.a, driver) : zero,
          mb = l.b ? this.mobility(l.b, driver) : zero,
          va = this.times(ma, u),
          vb = this.times(mb, u),
          denom = dot(u, va) + dot(u, vb);
        if (denom < 1e-12) continue;
        const sa = l.a ? s.state(l.a) : { vx: 0, vy: 0 },
          sb = l.b ? s.state(l.b) : { vx: 0, vy: 0 };
        const lambda = isVelocity
          ? -((sb.vx - sa.vx) * u.x + (sb.vy - sa.vy) * u.y) / denom
          : (l.length - d) / denom;
        for (const [id, v, sign] of [
          [l.a, va, -1],
          [l.b, vb, 1],
        ])
          if (id) {
            const o = s.objects.get(id),
              p = s.state(id),
              delta = { x: sign * lambda * v.x, y: sign * lambda * v.y };
            if (isVelocity)
              velocity(o.body, { x: p.vx + delta.x, y: p.vy + delta.y });
            else position(o.body, { x: p.x + delta.x, y: p.y + delta.y });
          }
      }
  }
  solve(driver = null) {
    const links = this.links();
    if (!links.length) return;
    const s = this.sim;
    for (let iteration = 0; iteration < 16; iteration++) {
      for (const l of links) {
        const g = this.geometry(l, true),
          m = this.system(l, g, driver);
        const errors = [
          g.fA - g.k * g.r * g.c.angle - l.feedA,
          g.fB + g.k * g.r * g.c.angle - l.feedB,
        ];
        let lambdas = this.multipliers(m, ...errors);
        // Limit nonlinear correction near a tangent singularity.
        const movement = Math.max(
          Math.hypot(m.A.x * lambdas[0], m.A.y * lambdas[0]),
          Math.hypot(m.B.x * lambdas[1], m.B.y * lambdas[1]),
          Math.hypot(
            m.CA.x * lambdas[0] + m.CB.x * lambdas[1],
            m.CA.y * lambdas[0] + m.CB.y * lambdas[1],
          ),
        );
        if (movement > 0.25)
          lambdas = lambdas.map((v) => (v * 0.25) / movement);
        this.apply(l, g, m, lambdas, false);
      }
      this.projectRods(driver);
      s.solveGuides();
    }
    for (let iteration = 0; iteration < 8; iteration++) {
      for (const l of links) {
        const g = this.geometry(l, true),
          m = this.system(l, g, driver),
          a = s.state(l.a),
          b = s.state(l.b),
          c = s.state(l.wheel);
        const va = { x: a.vx - c.vx, y: a.vy - c.vy },
          vb = { x: b.vx - c.vx, y: b.vy - c.vy };
        this.apply(
          l,
          g,
          m,
          this.multipliers(
            m,
            dot(g.A.u, va) - m.j * c.omega,
            dot(g.B.u, vb) + m.j * c.omega,
          ),
          true,
        );
      }
      this.projectRods(driver, true);
    }
  }
  error() {
    let max = 0;
    for (const l of this.links()) {
      const g = this.geometry(l);
      max = Math.max(
        max,
        Math.abs(g.fA - g.k * g.r * g.c.angle - l.feedA),
        Math.abs(g.fB + g.k * g.r * g.c.angle - l.feedB),
        g.r + 0.005 - g.A.distance,
        g.r + 0.005 - g.B.distance,
        -g.wrap,
        g.wrap - TAU,
      );
    }
    const connected = new Set(this.links().flatMap((l) => [l.a, l.b, l.wheel]));
    for (const l of this.sim.links.values())
      if (l.type === "rod" && (connected.has(l.a) || connected.has(l.b))) {
        const a = this.sim.endpoint(l, "a"),
          b = this.sim.endpoint(l, "b");
        max = Math.max(
          max,
          Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - l.length),
        );
      }
    return max;
  }
  capture() {
    return {
      bodies: [...this.sim.objects.keys()].map((id) => [
        id,
        this.sim.state(id),
      ]),
      links: [...this.sim.links.values()].map((l) => [
        l.id,
        {
          aAngle: l.aAngle,
          bAngle: l.bAngle,
          feedA: l.feedA,
          feedB: l.feedB,
          length: l.length,
        },
      ]),
    };
  }
  restore(saved) {
    const s = this.sim;
    for (const [id, p] of saved.bodies) {
      const b = s.objects.get(id).body;
      position(b, p);
      Body.setAngle(b, -p.angle);
      velocity(b, { x: p.vx, y: p.vy });
      Body.setAngularVelocity(b, -p.omega / 60);
    }
    for (const [id, fields] of saved.links) {
      const l = s.links.get(id);
      Object.assign(l, fields);
      if (l.constraint) l.constraint.length = l.length * S;
    }
  }
}
