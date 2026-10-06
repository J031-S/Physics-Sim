import { makeBody } from "./geometry.js";
import { defaultBehaviourFactories } from "./behaviours.js";
// SI units at the boundary; Matter uses pixels, milliseconds, and base-step velocities.
const { Engine, Body, Composite, Constraint } = globalThis.Matter;
export const SCALE = 100;
export const DT = 1 / 120;
const point = (p) => ({ x: p.x * SCALE, y: -p.y * SCALE });
export class Simulation {
  constructor(scene, behaviourFactories = defaultBehaviourFactories) {
    this.engine = Engine.create({
      positionIterations: 10,
      velocityIterations: 10,
      constraintIterations: 6,
    });
    this.engine.gravity = { x: 0, y: scene.gravity, scale: SCALE / 1e6 };
    this.scene = scene;
    this.time = 0;
    this.bodies = new Map();
    this.constraints = new Map();
    this.forces = new Map();
    for (const spec of scene.bodies) {
      const body = makeBody(spec, globalThis.Matter, SCALE);
      Body.setMass(body, spec.mass);
      Body.setStatic(body, spec.fixed);
      if (!spec.fixed) {
        Body.setVelocity(body, {
          x: (spec.vx * SCALE) / 60,
          y: (-spec.vy * SCALE) / 60,
        });
        Body.setAngularVelocity(body, -spec.omega / 60);
      }
      this.bodies.set(spec.id, body);
      Composite.add(this.engine.world, body);
    }
    for (const l of scene.links) {
      if (l.type === "spring") continue;
      const a = this.bodies.get(l.a),
        b = this.bodies.get(l.b);
      const c = Constraint.create({
        bodyA: a,
        bodyB: b,
        pointA: a ? { x: 0, y: 0 } : point(l.anchorA),
        pointB: b ? { x: 0, y: 0 } : point(l.anchorB),
        length: l.length * SCALE,
        stiffness: 1,
        damping: 0,
      });
      this.constraints.set(l.id, c);
      Composite.add(this.engine.world, c);
    }
    this.modules = behaviourFactories.map((factory) => factory(scene));
    this.accelerations = new Map();
    this.computeForces();
  }
  endpoint(l, side) {
    const id = l[side.toLowerCase()];
    return id ? this.state(id) : l["anchor" + side];
  }
  computeForces() {
    for (const s of this.scene.bodies)
      this.forces.set(s.id, { x: s.fx, y: s.fy - s.mass * this.scene.gravity });
    for (const spec of this.scene.bodies)
      for (const module of this.modules) {
        if (spec.fixed) continue;
        const contribution = module.force(spec, this.state(spec.id), this);
        const force = this.forces.get(spec.id);
        force.x += contribution.x;
        force.y += contribution.y;
      }
    for (const l of this.scene.links) {
      if (l.type !== "spring") continue;
      const a = this.endpoint(l, "A"),
        b = this.endpoint(l, "B");
      const dx = b.x - a.x,
        dy = b.y - a.y,
        distance = Math.hypot(dx, dy);
      if (distance < 1e-9) continue;
      const nx = dx / distance,
        ny = dy / distance;
      const speed =
        ((b.vx || 0) - (a.vx || 0)) * nx + ((b.vy || 0) - (a.vy || 0)) * ny;
      const f = l.k * (distance - l.length) + l.damping * speed;
      if (l.a) {
        const force = this.forces.get(l.a);
        force.x += f * nx;
        force.y += f * ny;
      }
      if (l.b) {
        const force = this.forces.get(l.b);
        force.x -= f * nx;
        force.y -= f * ny;
      }
    }
  }
  step() {
    this.computeForces();
    for (const s of this.scene.bodies) {
      if (s.fixed) continue;
      const f = this.forces.get(s.id),
        b = this.bodies.get(s.id);
      // Gravity is handled by Matter; apply only external and spring forces here.
      Body.applyForce(b, b.position, {
        x: (f.x * SCALE) / 1e6,
        y: (-(f.y + s.mass * this.scene.gravity) * SCALE) / 1e6,
      });
    }
    for (const l of this.scene.links)
      if (l.type === "rope") {
        const a = this.endpoint(l, "A"),
          b = this.endpoint(l, "B");
        this.constraints.get(l.id).stiffness =
          Math.hypot(b.x - a.x, b.y - a.y) > l.length ? 1 : 0;
      }
    const previous = new Map(
      [...this.bodies.keys()].map((id) => [id, this.state(id)]),
    );
    Engine.update(this.engine, DT * 1000);
    this.time += DT;
    for (const id of this.bodies.keys()) {
      const before = previous.get(id),
        after = this.state(id);
      this.accelerations.set(id, {
        x: (after.vx - before.vx) / DT,
        y: (after.vy - before.vy) / DT,
      });
    }
    this.computeForces();
  }
  state(id) {
    const b = this.bodies.get(id),
      v = Body.getVelocity(b);
    return {
      x: b.position.x / SCALE,
      y: -b.position.y / SCALE,
      vx: (v.x * 60) / SCALE,
      vy: (-v.y * 60) / SCALE,
      angle: (-b.angle * 180) / Math.PI,
      omega: -Body.getAngularVelocity(b) * 60,
    };
  }
  acceleration(id) {
    const spec = this.scene.bodies.find((b) => b.id === id);
    if (spec.fixed) return { x: 0, y: 0 };
    return (
      this.accelerations.get(id) || {
        x: this.forces.get(id).x / spec.mass,
        y: this.forces.get(id).y / spec.mass,
      }
    );
  }
  hit(p) {
    return [...this.scene.bodies]
      .reverse()
      .find(
        (spec) =>
          globalThis.Matter.Query.point([this.bodies.get(spec.id)], point(p))
            .length,
      );
  }
  energy(id) {
    const b = this.bodies.get(id),
      s = this.state(id);
    return b.isStatic
      ? 0
      : 0.5 * b.mass * (s.vx ** 2 + s.vy ** 2) +
          ((0.5 * b.inertia) / SCALE ** 2) * s.omega ** 2;
  }
  dispose() {
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }
}
