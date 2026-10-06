// SI units at the boundary; Matter uses pixels, milliseconds, and base-step velocities.
const { Engine, Bodies, Body, Composite, Constraint } = globalThis.Matter;
export const SCALE = 100;
export const DT = 1 / 120;
const point = p => ({ x: p.x * SCALE, y: -p.y * SCALE });
export class Simulation {
  constructor(scene) {
    this.engine = Engine.create({ positionIterations: 10, velocityIterations: 10, constraintIterations: 6 });
    this.engine.gravity = { x: 0, y: scene.gravity, scale: SCALE / 1e6 };
    this.scene = scene; this.time = 0; this.bodies = new Map(); this.constraints = new Map(); this.forces = new Map();
    for (const spec of scene.bodies) {
      const p = point(spec);
      const options = { friction: spec.friction, frictionStatic: spec.friction, frictionAir: 0, restitution: spec.restitution, angle: -spec.angle * Math.PI / 180, label: spec.name };
      const body = spec.shape === 'circle' ? Bodies.circle(p.x, p.y, spec.radius * SCALE, options, 64) : Bodies.rectangle(p.x, p.y, spec.width * SCALE, spec.height * SCALE, options);
      Body.setMass(body, spec.mass); Body.setStatic(body, spec.fixed);
      if (!spec.fixed) { Body.setVelocity(body, { x: spec.vx * SCALE / 60, y: -spec.vy * SCALE / 60 }); Body.setAngularVelocity(body, -spec.omega / 60); }
      this.bodies.set(spec.id, body); Composite.add(this.engine.world, body);
    }
    for (const l of scene.links) {
      if (l.type === 'spring') continue;
      const a = this.bodies.get(l.a), b = this.bodies.get(l.b);
      const c = Constraint.create({ bodyA: a, bodyB: b, pointA: a ? { x: 0, y: 0 } : point(l.anchorA), pointB: b ? { x: 0, y: 0 } : point(l.anchorB), length: l.length * SCALE, stiffness: 1, damping: 0 });
      this.constraints.set(l.id, c); Composite.add(this.engine.world, c);
    }
    this.computeForces();
  }
  endpoint(l, side) { const id = l[side.toLowerCase()]; return id ? this.state(id) : l['anchor' + side]; }
  computeForces() {
    for (const s of this.scene.bodies) this.forces.set(s.id, { x: s.fx, y: s.fy - s.mass * this.scene.gravity });
    for (const l of this.scene.links) {
      if (l.type !== 'spring') continue;
      const a = this.endpoint(l, 'A'), b = this.endpoint(l, 'B');
      const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
      if (distance < 1e-9) continue;
      const nx = dx / distance, ny = dy / distance;
      const speed = ((b.vx || 0) - (a.vx || 0)) * nx + ((b.vy || 0) - (a.vy || 0)) * ny;
      const f = l.k * (distance - l.length) + l.damping * speed;
      if (l.a) { const force = this.forces.get(l.a); force.x += f * nx; force.y += f * ny; }
      if (l.b) { const force = this.forces.get(l.b); force.x -= f * nx; force.y -= f * ny; }
    }
  }
  step() {
    this.computeForces();
    for (const s of this.scene.bodies) {
      if (s.fixed) continue;
      const f = this.forces.get(s.id), b = this.bodies.get(s.id);
      // Gravity is handled by Matter; apply only external and spring forces here.
      Body.applyForce(b, b.position, { x: f.x * SCALE / 1e6, y: -(f.y + s.mass * this.scene.gravity) * SCALE / 1e6 });
    }
    for (const l of this.scene.links) if (l.type === 'rope') {
      const a = this.endpoint(l, 'A'), b = this.endpoint(l, 'B');
      this.constraints.get(l.id).stiffness = Math.hypot(b.x - a.x, b.y - a.y) > l.length ? 1 : 0;
    }
    Engine.update(this.engine, DT * 1000); this.time += DT;
    this.computeForces();
  }
  state(id) {
    const b = this.bodies.get(id), v = Body.getVelocity(b);
    return { x: b.position.x / SCALE, y: -b.position.y / SCALE, vx: v.x * 60 / SCALE, vy: -v.y * 60 / SCALE, angle: -b.angle * 180 / Math.PI, omega: -Body.getAngularVelocity(b) * 60 };
  }
  energy(id) { const b = this.bodies.get(id), s = this.state(id); return b.isStatic ? 0 : .5 * b.mass * (s.vx ** 2 + s.vy ** 2) + .5 * b.inertia / SCALE ** 2 * s.omega ** 2; }
  dispose() { Composite.clear(this.engine.world, false); Engine.clear(this.engine); }
}
