// Contact response: Coulomb friction and restitution by sequential impulses.
//
// Matter's own resolver clamps tangential velocity without reference to the
// normal force, zeroes restitution below a fixed approach speed, and only
// cancels a resting body's acceleration after it has already moved, which
// makes blocks creep down any slope. This module replaces the velocity part
// of that resolver (collision detection and position correction stay Matter's).
//
// Units are Matter's: positions in px, velocity = position − positionPrev per
// step, impulses in kg·px/step.
const { Resolver, Collision, Composite, Vertices } = globalThis.Matter;
// Approach speeds below this are treated as resting contact (≈ 2.4 cm/s).
const IMPACT = 0.02;
const saved = new WeakMap(); // pair → { tick, items }
const pending = new WeakMap(); // body → velocity change its forces will add
const ticks = new WeakMap(); // engine → step counter
const NONE = { x: 0, y: 0, w: 0 };
// Sweeps stop once no contact changes a velocity by more than this (px/step).
const TOLERANCE = 1e-5;
// A load crosses a stack one body per sweep, and a heavy body resting on a
// light one needs about (mass ratio) sweeps to be supported. Scenes are small,
// so sweep until converged within a work budget; accumulated impulses carry
// over between steps, so a settled scene converges on the first sweep.
const sweeps = (count) =>
  Math.max(12, Math.min(3000, Math.floor(12000 / (count || 1))));
let current = 0,
  active = null;
// Closest point to `p` on the boundary of a convex polygon.
function closest(vertices, p) {
  let best = null,
    bestDistance = Infinity;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i],
      b = vertices[(i + 1) % vertices.length],
      dx = b.x - a.x,
      dy = b.y - a.y,
      t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
        ),
      ),
      x = a.x + t * dx,
      y = a.y + t * dy,
      distance = Math.hypot(p.x - x, p.y - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { x, y };
    }
  }
  return best;
}
// Balls are 64-sided polygons to Matter, whose facets tilt the contact normal
// off-centre: collisions then leak energy into spin and rolling is bumpy.
// Use the true circle normal (through the centre) and a single contact point.
function refine(collision) {
  const A = collision.parentA,
    B = collision.parentB;
  collision.circle = false;
  if (!A.circleRadius && !B.circleRadius) return;
  let nx, ny, point;
  if (A.circleRadius && B.circleRadius) {
    nx = A.position.x - B.position.x;
    ny = A.position.y - B.position.y;
    const distance = Math.hypot(nx, ny);
    if (distance < 1e-9) return;
    nx /= distance;
    ny /= distance;
    const reach = (B.circleRadius + distance - A.circleRadius) / 2;
    point = { x: B.position.x + nx * reach, y: B.position.y + ny * reach };
  } else {
    const ball = A.circleRadius ? A : B,
      other = ball === A ? B : A;
    if (Vertices.contains(other.vertices, ball.position)) return;
    point = closest(other.vertices, ball.position);
    nx = ball.position.x - point.x;
    ny = ball.position.y - point.y;
    const distance = Math.hypot(nx, ny);
    if (distance < 1e-9) return;
    // The normal points from B towards A.
    const sign = ball === A ? 1 : -1;
    nx = (sign * nx) / distance;
    ny = (sign * ny) / distance;
  }
  collision.circle = true;
  collision.normal.x = nx;
  collision.normal.y = ny;
  collision.tangent.x = -ny;
  collision.tangent.y = nx;
  collision.penetration.x = nx * collision.depth;
  collision.penetration.y = ny * collision.depth;
  collision.supports[0] = point;
  collision.supportCount = 1;
}
function build(pair, collision, old) {
  const A = collision.parentA,
    B = collision.parentB,
    nx = collision.normal.x,
    ny = collision.normal.y,
    tx = -ny,
    ty = nx,
    inverseMass = A.inverseMass + B.inverseMass,
    items = [],
    remaining = old ? [...old] : [];
  for (let i = 0; i < collision.supportCount; i++) {
    const vertex = collision.supports[i],
      rAx = vertex.x - A.position.x,
      rAy = vertex.y - A.position.y,
      rBx = vertex.x - B.position.x,
      rBy = vertex.y - B.position.y,
      rAn = rAx * ny - rAy * nx,
      rBn = rBx * ny - rBy * nx,
      rAt = rAx * ty - rAy * tx,
      rBt = rBx * ty - rBy * tx,
      kn =
        inverseMass +
        A.inverseInertia * rAn * rAn +
        B.inverseInertia * rBn * rBn,
      kt =
        inverseMass +
        A.inverseInertia * rAt * rAt +
        B.inverseInertia * rBt * rBt;
    if (!(kn > 0)) continue;
    // Matter may report the same face contact through either body's
    // vertices from one step to the next, so match by position.
    let previous = null;
    for (const item of remaining)
      if (
        !previous ||
        Math.hypot(item.x - vertex.x, item.y - vertex.y) <
          Math.hypot(previous.x - vertex.x, previous.y - vertex.y)
      )
        previous = item;
    if (previous) remaining.splice(remaining.indexOf(previous), 1);
    items.push({
      pair,
      index: i,
      x: vertex.x,
      y: vertex.y,
      A,
      B,
      nx,
      ny,
      tx,
      ty,
      rAx,
      rAy,
      rBx,
      rBy,
      kn,
      kt,
      depth: collision.depth,
      friction: Math.min(A.friction, B.friction),
      restitution: Math.max(A.restitution, B.restitution),
      normal: previous ? previous.normal : 0, // accumulated resting impulse
      tangent: previous ? previous.tangent : 0,
      hit: 0, // impact impulses this step; never taken back
    });
  }
  return items;
}
// The normal points from B towards A, so a positive impulse pushes A away.
function apply(c, px, py) {
  const { A, B } = c;
  A.positionPrev.x -= px * A.inverseMass;
  A.positionPrev.y -= py * A.inverseMass;
  A.anglePrev -= A.inverseInertia * (c.rAx * py - c.rAy * px);
  B.positionPrev.x += px * B.inverseMass;
  B.positionPrev.y += py * B.inverseMass;
  B.anglePrev += B.inverseInertia * (c.rBx * py - c.rBy * px);
}
function relative(c, predicted) {
  const { A, B } = c,
    a = predicted ? pending.get(A) || NONE : NONE,
    b = predicted ? pending.get(B) || NONE : NONE,
    wA = A.angle - A.anglePrev + a.w,
    wB = B.angle - B.anglePrev + b.w;
  return {
    x:
      A.position.x -
      A.positionPrev.x +
      a.x -
      wA * c.rAy -
      (B.position.x - B.positionPrev.x + b.x - wB * c.rBy),
    y:
      A.position.y -
      A.positionPrev.y +
      a.y +
      wA * c.rAx -
      (B.position.y - B.positionPrev.y + b.y + wB * c.rBx),
  };
}
function solveFriction(c, v) {
  if (!c.kt) return 0;
  const limit = c.friction * (c.normal + c.hit),
    next = Math.max(
      -limit,
      Math.min(limit, c.tangent - (v.x * c.tx + v.y * c.ty) / c.kt),
    ),
    change = next - c.tangent;
  c.tangent = next;
  if (change) apply(c, change * c.tx, change * c.ty);
  return Math.abs(change) * c.kt;
}
function solveResting(c, predicted) {
  const v = relative(c, predicted),
    next = Math.max(0, c.normal - (v.x * c.nx + v.y * c.ny) / c.kn),
    change = next - c.normal;
  c.normal = next;
  if (change) apply(c, change * c.nx, change * c.ny);
  return Math.max(
    Math.abs(change) * c.kn,
    solveFriction(c, relative(c, predicted)),
  );
}
// Run before Engine.update. Bodies already in contact have their pending
// force-driven velocity change constrained before positions are integrated,
// so a resting body neither sinks nor creeps and static friction can hold.
export function solveRestingContacts(engine, delta) {
  const tick = (ticks.get(engine) || 0) + 1,
    bodies = new Set(Composite.allBodies(engine.world)),
    constraints = [];
  ticks.set(engine, tick);
  current = tick;
  for (const body of bodies)
    pending.set(body, {
      x: body.force.x * body.inverseMass * delta * delta,
      y: body.force.y * body.inverseMass * delta * delta,
      w: body.torque * body.inverseInertia * delta * delta,
    });
  for (const pair of engine.pairs.list) {
    const last = saved.get(pair);
    saved.delete(pair);
    if (!pair.isActive || pair.isSensor) continue;
    const { bodyA, bodyB, parentA, parentB } = pair.collision;
    if (!bodies.has(parentA) || !bodies.has(parentB)) continue;
    // Bodies may have been edited since the pair was recorded.
    const collision = Collision.collides(bodyA, bodyB);
    if (!collision) continue;
    refine(collision);
    const items = build(
      pair,
      collision,
      last?.tick === tick - 1 ? last.items : null,
    );
    saved.set(pair, { tick, items });
    constraints.push(...items);
  }
  for (const c of constraints)
    apply(
      c,
      c.normal * c.nx + c.tangent * c.tx,
      c.normal * c.ny + c.tangent * c.ty,
    );
  for (let i = sweeps(constraints.length); i > 0; i--) {
    let change = 0;
    for (const c of constraints)
      change = Math.max(change, solveResting(c, true));
    if (change < TOLERANCE) break;
  }
}
const preSolvePosition = Resolver.preSolvePosition;
Resolver.preSolvePosition = function (pairs) {
  for (const pair of pairs)
    if (pair.isActive) {
      refine(pair.collision);
      pair.contactCount = pair.collision.supportCount;
    }
  preSolvePosition(pairs);
};
Resolver.preSolveVelocity = function (pairs) {
  active = [];
  for (const pair of pairs) {
    if (!pair.isActive || pair.isSensor) continue;
    const last = saved.get(pair),
      items = build(
        pair,
        pair.collision,
        last?.tick === current ? last.items : null,
      );
    saved.set(pair, { tick: current, items });
    active.push(...items);
  }
};
// Separation speed after an impact, or 0 for a resting contact.
//
// The integrator advances velocity then position, so the quantity it conserves
// under a steady acceleration a is ½u² − a·y with u = v + a/2. Carrying u back
// from the detected overlap (`depth` past the surface) to the surface gives the
// true contact speed, so an elastic bounce under gravity returns to its drop
// height. A body merely pressed on by its own weight has a contact speed below
// one step of acceleration and is left at rest, whatever its restitution.
function bounceSpeed(c, vn) {
  const a = pending.get(c.A) || NONE,
    b = pending.get(c.B) || NONE,
    an = Math.min(0, (a.x - b.x) * c.nx + (a.y - b.y) * c.ny),
    u = vn + an / 2,
    contact = Math.sqrt(Math.max(0, u * u + 2 * an * c.depth));
  return contact > -an + IMPACT ? c.restitution * (contact - an / 2) : 0;
}
// Matter calls this once per velocity iteration; all sweeps run on the first.
Resolver.solveVelocity = function () {
  if (!active) return;
  for (let i = sweeps(active.length); i > 0; i--) {
    let change = 0;
    for (const c of active) {
      const v = relative(c, false),
        vn = v.x * c.nx + v.y * c.ny,
        bounce = vn < -IMPACT ? bounceSpeed(c, vn) : 0;
      if (bounce > 0) {
        const impulse = (bounce - vn) / c.kn;
        c.hit += impulse;
        apply(c, impulse * c.nx, impulse * c.ny);
        change = Math.max(
          change,
          impulse * c.kn,
          solveFriction(c, relative(c, false)),
        );
      } else change = Math.max(change, solveResting(c, false));
    }
    if (change < TOLERANCE) break;
  }
  for (const c of active) {
    const contact = c.pair.contacts[c.index];
    contact.normalImpulse = c.normal + c.hit;
    contact.tangentImpulse = c.tangent;
  }
  active = null;
};
