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
    };
    for (const [key, v] of Object.entries(patch)) {
      if (
        key === "shape"
          ? !["rectangle", "ellipse", "circle"].includes(v)
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
  at(p) {
    const settings = this.sim.settings;
    let ex = settings.electricX,
      ey = settings.electricY,
      bz = settings.magneticZ;
    for (const f of this.regions.values())
      if (this.contains(f, p)) {
        if (f.type === "magnetic") bz += f.strength;
        else {
          const a = (f.angle * Math.PI) / 180;
          ex += f.strength * Math.cos(a);
          ey += f.strength * Math.sin(a);
        }
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
