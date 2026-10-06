// Layout translation moves whole connected assemblies, including their pins.
const { Body } = globalThis.Matter;
const S = 100;
export class GroupMove {
  constructor(sim, ids, start) {
    this.sim = sim;
    this.ids = new Set(ids.filter((id) => sim.objects.has(id)));
    this.start = { ...start };
    this.offset = { x: 0, y: 0 };
    let changed = true;
    while (changed) {
      changed = false;
      for (const l of sim.links.values()) {
        const ends = [l.a, l.b, l.wheel].filter(Boolean);
        if (ends.some((id) => this.ids.has(id)))
          for (const id of ends)
            if (!this.ids.has(id)) {
              this.ids.add(id);
              changed = true;
            }
      }
    }
    this.bodies = [...this.ids].map((id) => {
      const o = sim.objects.get(id);
      return {
        id,
        position: { ...o.body.position },
        angle: o.body.angle,
        anchor: { ...o.positionAnchor },
      };
    });
    this.anchors = [];
    for (const l of sim.links.values())
      if ([l.a, l.b, l.wheel].some((id) => this.ids.has(id)))
        for (const side of ["a", "b"])
          if (!l[side] && l[side + "Point"])
            this.anchors.push({
              link: l,
              side,
              point: { ...l[side + "Point"] },
            });
    this.floorLimit = this.bodies.length
      ? Math.max(
          ...this.bodies.map(
            ({ id }) =>
              Math.max(...sim.objects.get(id).body.vertices.map((v) => v.y)) /
                S -
              0.001,
          ),
        )
      : 0;
  }
  move(p, snapping = false) {
    const snap = (v) => Math.round(v / 0.5) * 0.5;
    let x = p.x - this.start.x,
      y = p.y - this.start.y;
    if (snapping) {
      x = snap(x);
      y = snap(y);
    }
    y = Math.max(
      snapping ? Math.ceil(this.floorLimit / 0.5) * 0.5 : this.floorLimit,
      y,
    );
    this.offset = { x, y };
    this.hold();
  }
  hold() {
    const { x, y } = this.offset;
    for (const saved of this.bodies) {
      const o = this.sim.objects.get(saved.id);
      if (!o) continue;
      Body.setPosition(o.body, {
        x: saved.position.x + x * S,
        y: saved.position.y - y * S,
      });
      Body.setAngle(o.body, saved.angle);
      o.positionAnchor = {
        x: saved.anchor.x + x * S,
        y: saved.anchor.y - y * S,
      };
      Body.setVelocity(o.body, { x: 0, y: 0 });
      Body.setAngularVelocity(o.body, 0);
      o.body.positionImpulse.x = o.body.positionImpulse.y = 0;
      o.body.constraintImpulse.x =
        o.body.constraintImpulse.y =
        o.body.constraintImpulse.angle =
          0;
    }
    for (const { link, side, point } of this.anchors) {
      link[side + "Point"] = { x: point.x + x, y: point.y + y };
      if (link.constraint)
        link.constraint[side === "a" ? "pointA" : "pointB"] = {
          x: (point.x + x) * S,
          y: -(point.y + y) * S,
        };
    }
    for (const l of this.sim.links.values())
      if (l.type === "belt" && this.ids.has(l.a))
        this.sim.mechanisms.updateSurfaces(l);
  }
}
