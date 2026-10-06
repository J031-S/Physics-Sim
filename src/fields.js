// Uniform, prescribed 2D field regions. SI units: E in N/C, Bz in tesla.
export class Fields {
  constructor(sim) {
    this.sim = sim;
    this.regions = new Map();
  }
  add(type, p) {
    if (!["electric", "magnetic"].includes(type))
      throw new Error("Unknown field type.");
    const id = "field-" + ++this.sim.serial;
    this.regions.set(id, {
      id,
      type,
      shape: type === "magnetic" ? "circle" : "rectangle",
      x: p.x,
      y: p.y,
      width: 4,
      height: type === "magnetic" ? 4 : 3,
      angle: 0,
      strength: type === "electric" ? 5 : 1,
      gradient: "uniform",
      gradientShape: "radial",
      gradientAngle: 0,
      gradientX: 0,
      gradientY: 0,
      gradientScaleX: 2,
      gradientScaleY: 2,
      direction: "parallel",
    });
    return id;
  }
  update(id, patch) {
    const f = this.regions.get(id);
    if (!f) throw new Error("Field no longer exists.");
    const ranges = {
      x: [-10000, 10000],
      y: [-10000, 10000],
      width: [0.1, 50],
      height: [0.1, 50],
      angle: [-360, 360],
      strength: [-100, 100],
      gradientAngle: [-360, 360],
      gradientX: [-50, 50],
      gradientY: [-50, 50],
      gradientScaleX: [0.05, 100],
      gradientScaleY: [0.05, 100],
    };
    const enums = {
      shape: ["rectangle", "ellipse", "circle"],
      gradient: [
        "uniform",
        "linear",
        "inverse",
        "inverseSquare",
        "exponential",
      ],
      gradientShape: ["axial", "radial", "elliptical", "box"],
      direction: ["parallel", "radial"],
    };
    for (const [key, v] of Object.entries(patch)) {
      if (
        enums[key]
          ? !enums[key].includes(v)
          : !ranges[key] ||
            !Number.isFinite(v) ||
            v < ranges[key][0] ||
            v > ranges[key][1]
      )
        throw new Error("Invalid field " + key + ".");
    }
    Object.assign(f, patch);
    if (f.shape === "circle")
      f.height =
        patch.height !== undefined && patch.width === undefined
          ? f.height
          : f.width;
    if (f.shape === "circle") f.width = f.height;
  }
  local(f, p) {
    const a = (f.angle * Math.PI) / 180,
      c = Math.cos(a),
      s = Math.sin(a),
      dx = p.x - f.x,
      dy = p.y - f.y;
    return { x: dx * c + dy * s, y: -dx * s + dy * c };
  }
  contains(f, p) {
    const q = this.local(f, p),
      x = (2 * q.x) / f.width,
      y = (2 * q.y) / f.height;
    return f.shape === "rectangle"
      ? Math.abs(x) <= 1 && Math.abs(y) <= 1
      : x * x + y * y <= 1;
  }
  hit(p) {
    return [...this.regions.values()].reverse().find((f) => this.contains(f, p))
      ?.id;
  }
  profile(f, p) {
    if (f.gradient === "uniform") return 1;
    const dx = p.x - f.x - f.gradientX,
      dy = p.y - f.y - f.gradientY,
      a = (f.gradientAngle * Math.PI) / 180;
    const u = dx * Math.cos(a) + dy * Math.sin(a),
      v = -dx * Math.sin(a) + dy * Math.cos(a);
    const x = u / f.gradientScaleX,
      y = v / f.gradientScaleY;
    const d =
      f.gradientShape === "axial"
        ? Math.max(0, x)
        : f.gradientShape === "radial"
          ? Math.hypot(u, v) / f.gradientScaleX
          : f.gradientShape === "box"
            ? Math.max(Math.abs(x), Math.abs(y))
            : Math.hypot(x, y);
    if (f.gradient === "linear") return Math.max(0, 1 - d);
    if (f.gradient === "inverse") return 1 / Math.sqrt(1 + d * d);
    if (f.gradient === "inverseSquare") return 1 / (1 + d * d);
    return Math.exp(-d);
  }
  sample(f, p) {
    if (!this.contains(f, p)) return { ex: 0, ey: 0, bz: 0, strength: 0 };
    const strength = f.strength * this.profile(f, p);
    if (f.type === "magnetic") return { ex: 0, ey: 0, bz: strength, strength };
    let nx = Math.cos((f.angle * Math.PI) / 180),
      ny = Math.sin((f.angle * Math.PI) / 180);
    if (f.direction === "radial") {
      const dx = p.x - f.x - f.gradientX,
        dy = p.y - f.y - f.gradientY,
        d = Math.hypot(dx, dy);
      nx = d > 1e-9 ? dx / d : 0;
      ny = d > 1e-9 ? dy / d : 0;
    }
    return { ex: strength * nx, ey: strength * ny, bz: 0, strength };
  }
  interact() {
    const sim = this.sim;
    if (!sim.settings.chargeInteractions) return;
    const charged = [...sim.objects.values()].filter((o) => o.charge);
    for (let i = 0; i < charged.length; i++)
      for (let j = i + 1; j < charged.length; j++) {
        const a = charged[i],
          b = charged[j],
          pa = sim.state(a.id),
          pb = sim.state(b.id);
        const dx = pb.x - pa.x,
          dy = pb.y - pa.y,
          r2 = dx * dx + dy * dy + sim.settings.chargeSoftening ** 2;
        const k =
          (sim.settings.coulombConstant * a.charge * b.charge) /
          (r2 * Math.sqrt(r2));
        if (!a.lockPosition)
          sim.applyForce(a.id, pa, { x: -k * dx, y: -k * dy });
        if (!b.lockPosition) sim.applyForce(b.id, pb, { x: k * dx, y: k * dy });
      }
  }
  at(p) {
    const settings = this.sim.settings;
    let ex = settings.electricX,
      ey = settings.electricY,
      bz = settings.magneticZ;
    for (const f of this.regions.values()) {
      const sample = this.sample(f, p);
      ex += sample.ex;
      ey += sample.ey;
      bz += sample.bz;
    }
    return { ex, ey, bz };
  }
  advance(o, state, dt) {
    if (o.lockPosition || !o.charge) return;
    const { ex, ey, bz } = this.at(state),
      qm = o.charge / o.mass,
      ax = qm * ex,
      ay = qm * ey,
      w = qm * bz,
      theta = w * dt,
      c = Math.cos(theta),
      s = Math.sin(theta);
    // Exact constant-field velocity solution. Positive Bz is out of the screen:
    // dvx/dt=q/m(Ex+vy Bz), dvy/dt=q/m(Ey-vx Bz).
    // Stable sinc and (1-cos)/theta near zero; pure B preserves kinetic energy.
    const sinc = Math.abs(theta) < 1e-5 ? 1 - (theta * theta) / 6 : s / theta;
    const cosc =
      Math.abs(theta) < 1e-5 ? theta / 2 - theta ** 3 / 24 : (1 - c) / theta;
    const vx = c * state.vx + s * state.vy + dt * (sinc * ax + cosc * ay);
    const vy = -s * state.vx + c * state.vy + dt * (sinc * ay - cosc * ax);
    globalThis.Matter.Body.setVelocity(o.body, {
      x: (vx * 100) / 60,
      y: (-vy * 100) / 60,
    });
  }
}
