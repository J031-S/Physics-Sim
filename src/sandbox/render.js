// Drawing of the mechanics sandbox scene, shared by the sandbox page and the
// minitool mini simulations so both look the same. It is given a canvas
// context, a view and, for each scene, the model and a few display options;
// it looks nothing up in the page. Editing handles (grab marker, selection
// box, impulse and connection previews) and panels stay with the page.
import { color } from "../site/theme.js";
import { canvasIcon } from "../site/icons.js";
import { tidyNumber } from "../site/numbers.js";
import { drawFields } from "../field-view.js";
import { GRID } from "../physics.js";
import {
  arrowheadScale,
  endGrid,
  gridDash,
  vectorWeight,
} from "../site/canvas-style.js";

// Velocity arrows: fixed px per m/s. Long force arrows are capped.
export const VELOCITY_PX = 12,
  FORCE_CAP = 180;
export function fixed(value) {
  return Number(value.toPrecision(3)).toString();
}
// Angles are held in radians; the angle unit chooses how they are shown.
function formatAngle(radians, unit) {
  return unit === "radians"
    ? radians.toFixed(3) + " rad"
    : ((radians * 180) / Math.PI).toFixed(1) + "°";
}
// The path drawn for a belt, pulley cable, spring or rod, in metres.
export function linkPath(sim, l) {
  if (l.type === "belt") return sim.mechanisms.beltGeometry(l).path;
  if (l.type === "pulley") return sim.mechanisms.pulleyPath(l);
  return [sim.endpoint(l, "a"), sim.endpoint(l, "b")];
}

// `view` is { x, y, scale }: the screen position (CSS px) of the world origin
// and pixels per metre, y up. The page may change it between frames.
export function createSceneRenderer(ctx, view) {
  const screen = (p) => ({
      x: view.x + p.x * view.scale,
      y: view.y - p.y * view.scale,
    }),
    world = (p) => ({
      x: (p.x - view.x) / view.scale,
      y: (view.y - p.y) / view.scale,
    });
  function line(a, b, colour, width = 1) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  // Lock indicator at a body's centre (or beside a body too small on screen),
  // sized in screen pixels so it does not grow with zoom. It uses the same icons
  // as the Lock toggles in the selected-item panel, so it follows the icon weight.
  function lockGlyph(o, p, dark, size, iconWeight) {
    const names = [
        ...(o.lockPosition ? ["lockPosition"] : []),
        ...(o.lockRotation ? ["lockRotation"] : []),
      ],
      icons = names.map((n) => canvasIcon(iconWeight, n)).filter(Boolean),
      px = 14,
      gap = 3,
      w = icons.length * px + (icons.length - 1) * gap + 8,
      h = px + 6,
      offset = size < 14 ? size * Math.SQRT1_2 + w / 2 + 2 : 0;
    if (!icons.length) return;
    ctx.save();
    ctx.translate(Math.round(p.x + offset), Math.round(p.y - (offset && h)));
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
    else ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = color("panel", dark) + "dd";
    ctx.fill();
    ctx.lineWidth = 0.75;
    ctx.strokeStyle = color("accent-border", dark);
    ctx.stroke();
    const ink = color("ink", dark);
    icons.forEach((icon, i) => {
      ctx.save();
      ctx.translate(-w / 2 + 4 + i * (px + gap), -px / 2);
      ctx.scale(px / icon.size, px / icon.size);
      ctx.fillStyle = ctx.strokeStyle = ink;
      ctx.lineWidth = 2;
      ctx.lineCap = ctx.lineJoin = "round";
      for (const { path, opacity } of icon.paths) {
        ctx.globalAlpha = opacity;
        ctx.fill(path);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    });
    ctx.restore();
  }
  // Arrow from screen point p along world-space (dx, dy) pixels (y up).
  function arrow(p, dx, dy, colour, label, cap = 600) {
    const length = Math.hypot(dx, dy),
      capped = length > cap,
      k = capped ? cap / length : 1,
      end = { x: p.x + dx * k, y: p.y - dy * k },
      a = Math.atan2(end.y - p.y, end.x - p.x),
      width = 2 * vectorWeight(),
      head = 7 * arrowheadScale();
    line(p, end, colour, width);
    for (const turn of [-0.45, 0.45])
      line(
        end,
        {
          x: end.x - head * Math.cos(a + turn),
          y: end.y - head * Math.sin(a + turn),
        },
        colour,
        width,
      );
    if (capped)
      // Two short slashes across the shaft: drawn shorter than true length.
      for (const at of [0.62, 0.68]) {
        const c = { x: p.x + (end.x - p.x) * at, y: p.y + (end.y - p.y) * at },
          n = { x: -Math.sin(a), y: Math.cos(a) };
        line(
          {
            x: c.x + 5 * n.x - 2 * Math.cos(a),
            y: c.y + 5 * n.y - 2 * Math.sin(a),
          },
          {
            x: c.x - 5 * n.x + 2 * Math.cos(a),
            y: c.y - 5 * n.y + 2 * Math.sin(a),
          },
          colour,
          1.5,
        );
      }
    if (label) {
      ctx.fillStyle = colour;
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillText(label, end.x + 7, end.y - 6);
    }
  }
  // Ruler markings rotate with the body, so spin is visible on any shape. Tick
  // lengths and spacing are fixed in metres, so a large body is marked exactly
  // like a small one (ticks still scale with zoom, like the body itself).
  const TICK = { gap: 0.025, minor: 0.075, mid: 0.1, major: 0.13 },
    RULER_INK = "on-colour";
  function distanceToSegment(p, a, b) {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy),
        ),
      );
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  }
  function drawRuler(o, s) {
    if (o.shape === "ball") {
      // Degree ticks: the finest of these steps whose arc spacing is at least
      // 0.065 m (10° on the default 0.4 m radius) and 5 px on screen. Long
      // ticks every 30°, medium every 10°.
      const outer = o.radius - Math.min(TICK.gap, o.radius * 0.1),
        room = Math.min(1, (o.radius * 0.45) / TICK.major),
        step =
          [1, 2, 5, 10, 15, 30, 90].find((d) => {
            const arc = (o.radius * d * Math.PI) / 180;
            return arc >= 0.065 && arc * view.scale >= 5;
          }) ?? 90;
      for (let degrees = 0; degrees < 360; degrees += step) {
        const angle = s.angle + (degrees * Math.PI) / 180,
          level =
            degrees % 30 === 0 ? "major" : degrees % 10 === 0 ? "mid" : "minor",
          inner = outer - (TICK[level] - TICK.gap) * room,
          c = Math.cos(angle),
          si = Math.sin(angle);
        line(
          screen({ x: s.x + inner * c, y: s.y + inner * si }),
          screen({ x: s.x + outer * c, y: s.y + outer * si }),
          color(RULER_INK),
          level === "major" ? 2 : 1,
        );
      }
      return;
    }
    // Straight edges carry length ticks: 0.1 m apart with long ones every
    // 0.5 m, coarser when zoomed out so ticks never merge.
    const minor = [0.1, 0.5, 1, 5].find((m) => m * view.scale >= 5) ?? 10,
      every = minor === 0.5 ? 2 : 5,
      corners = o.body.vertices.map((v) => ({ x: v.x / 100, y: -v.y / 100 })),
      edges = corners.map((a, i) => [a, corners[(i + 1) % corners.length]]);
    ctx.save();
    ctx.clip(); // the body outline is still the current path
    edges.forEach(([a, b], i) => {
      const length = Math.hypot(b.x - a.x, b.y - a.y),
        ux = (b.x - a.x) / length,
        uy = (b.y - a.y) / length,
        // Inward normal: towards the centre of mass.
        side = (s.x - a.x) * -uy + (s.y - a.y) * ux > 0 ? 1 : -1,
        nx = -uy * side,
        ny = ux * side;
      for (let k = 1; k * minor < length - 1e-6; k++) {
        const major = k % every === 0,
          x = a.x + ux * k * minor,
          y = a.y + uy * k * minor,
          to = major ? TICK.major : TICK.minor,
          tip = { x: x + nx * to, y: y + ny * to };
        // Near a corner a tick would run into the next edge's ticks; leave the
        // corner clear instead (both edges skip, so corners stay symmetric).
        if (
          edges.some(
            (e, j) =>
              j !== i &&
              Math.min(
                distanceToSegment(tip, ...e),
                distanceToSegment({ x, y }, ...e),
              ) <
                TICK.major + TICK.gap,
          )
        )
          continue;
        line(
          screen({ x: x + nx * TICK.gap, y: y + ny * TICK.gap }),
          screen(tip),
          color(RULER_INK),
          major ? 2 : 1,
        );
      }
    });
    ctx.restore();
  }
  // A wedge shows the size of both acute corners: a small arc at each, with the
  // angle written inside the corner where it fits and just outside it where the
  // corner is too narrow. Skipped only when the wedge is tiny on screen.
  function drawWedgeAngles(o, dark, angleUnit) {
    const corners = o.body.vertices.map((v) =>
        screen({ x: v.x / 100, y: -v.y / 100 }),
      ),
      inside = color("body-label", dark),
      outside = color("ink", dark);
    ctx.save();
    ctx.font = "600 10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 1.25;
    corners.forEach((c, i) => {
      const a = corners[(i + 1) % 3],
        b = corners[(i + 2) % 3],
        toA = Math.atan2(a.y - c.y, a.x - c.x),
        toB = Math.atan2(b.y - c.y, b.x - c.x);
      let sweep = toB - toA;
      if (sweep > Math.PI) sweep -= 2 * Math.PI;
      if (sweep < -Math.PI) sweep += 2 * Math.PI;
      const angle = Math.abs(sweep);
      if (angle > Math.PI / 2 - 1e-3) return; // the right angle
      const reach = Math.min(
        Math.hypot(a.x - c.x, a.y - c.y),
        Math.hypot(b.x - c.x, b.y - c.y),
      );
      if (reach < 36) return;
      const label = formatAngle(angle, angleUnit),
        width = ctx.measureText(label)?.width || label.length * 6,
        // The label must clear both edges whichever way the wedge is turned,
        // so fit the circle around it into the corner.
        clearance = Math.hypot(width / 2, 6) + 2,
        radius = Math.min(26, reach * 0.3),
        fit = Math.max(radius + clearance, clearance / Math.sin(angle / 2)),
        // Kept in the corner's own half of the edge, clear of the lock badge.
        fits = fit < reach * 0.45,
        distance = fits ? fit : -(clearance + 4),
        middle = toA + sweep / 2;
      ctx.strokeStyle = inside;
      ctx.beginPath();
      ctx.arc(c.x, c.y, radius, toA, toB, sweep < 0);
      ctx.stroke();
      ctx.fillStyle = fits ? inside : outside;
      ctx.fillText(
        label,
        c.x + distance * Math.cos(middle),
        c.y + distance * Math.sin(middle),
      );
    });
    ctx.restore();
  }

  // Draws the whole scene: grid, ground, walls, fields, connections, bodies
  // and (as chosen) velocity and net-force arrows.
  // Options: dark, width, height (CSS px), grid, vectors, forceVectors,
  // highlighted(id), selected, forceOf(id) → {x, y} N, forceScale (px/N),
  // iconWeight, angleUnit.
  function drawScene(sim, options) {
    const o = {
        grid: true,
        // The pin and no-turn marks on locked bodies (off in the minitools,
        // where nothing can be unlocked).
        locks: true,
        vectors: false,
        forceVectors: false,
        highlighted: () => false,
        // Label every arrow with its value, not only the selected body's.
        labels: false,
        selected: null,
        forceOf: (id) => sim.netForce(id),
        forceScale: 4,
        iconWeight: "regular",
        angleUnit: "degrees",
        ...options,
      },
      dark = !!o.dark,
      min = world({ x: 0, y: o.height }),
      max = world({ x: o.width, y: 0 });
    const gridStep =
      GRID * 2 ** Math.max(0, Math.ceil(Math.log2(12 / (GRID * view.scale))));
    const gridPx = gridStep * view.scale;
    if (o.grid)
      gridDash(
        ctx,
        gridPx,
        (o.height -
          screen({ x: 0, y: Math.ceil(min.y / gridStep) * gridStep }).y) %
          gridPx,
      );
    if (o.grid)
      for (
        let x = Math.ceil(min.x / gridStep) * gridStep;
        x <= max.x;
        x += gridStep
      ) {
        const major = Math.abs(x - Math.round(x)) < 0.01;
        line(
          screen({ x, y: min.y }),
          screen({ x, y: max.y }),
          color(major ? "canvas-grid-major" : "canvas-grid", dark),
          major ? 1 : 0.75,
        );
      }
    if (o.grid)
      gridDash(
        ctx,
        gridPx,
        screen({ x: Math.ceil(min.x / gridStep) * gridStep, y: 0 }).x % gridPx,
      );
    if (o.grid)
      for (
        let y = Math.ceil(min.y / gridStep) * gridStep;
        y <= max.y;
        y += gridStep
      ) {
        const major = Math.abs(y - Math.round(y)) < 0.01;
        line(
          screen({ x: min.x, y }),
          screen({ x: max.x, y }),
          color(major ? "canvas-grid-major" : "canvas-grid", dark),
          major ? 1 : 0.75,
        );
      }
    endGrid(ctx);
    ctx.fillStyle = color("canvas-ground", dark);
    ctx.fillRect(0, view.y, o.width, o.height - view.y);
    line(
      { x: 0, y: view.y },
      { x: o.width, y: view.y },
      color("structure", dark),
      2,
    );
    if (sim.settings.walls) {
      ctx.strokeStyle = color("structure", dark);
      ctx.lineWidth = 4;
      const v = sim.viewport,
        p = screen({ x: v.minX, y: v.maxY });
      ctx.strokeRect(
        p.x,
        p.y,
        (v.maxX - v.minX) * view.scale,
        (v.maxY - v.minY) * view.scale,
      );
    }
    ctx.font = "9px ui-monospace,monospace";
    ctx.fillStyle = color("structure", dark);
    const labelStep = Math.max(1, Math.ceil(60 / view.scale));
    for (
      let x = Math.ceil(min.x / labelStep) * labelStep;
      x <= max.x;
      x += labelStep
    )
      ctx.fillText(x + " m", screen({ x, y: 0 }).x + 4, view.y + 16);
    drawFields(
      ctx,
      sim.fields,
      screen,
      view.scale,
      o.highlighted,
      { min, max },
      dark,
    );
    for (const l of sim.links.values()) {
      if (["belt", "pulley"].includes(l.type)) {
        const path = linkPath(sim, l).map(screen);
        ctx.beginPath();
        path.forEach((p, i) =>
          i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
        );
        ctx.strokeStyle = color(
          o.highlighted(l.id) ? "vector-velocity" : "structure",
          dark,
        );
        ctx.lineWidth = l.type === "belt" ? 5 : 2.5;
        ctx.stroke();
        if (l.type === "belt") {
          ctx.setLineDash([5, 14]);
          ctx.lineDashOffset = -l.travel * view.scale;
          ctx.strokeStyle = color("canvas-ground", dark);
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineDashOffset = 0;
        }
        continue;
      }
      const a = screen(sim.endpoint(l, "a")),
        b = screen(sim.endpoint(l, "b")),
        dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.hypot(dx, dy) || 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      if (l.type === "spring")
        for (let i = 1; i < 24; i++) {
          const zig = i < 3 || i > 21 ? 0 : i % 2 ? 5 : -5;
          ctx.lineTo(
            a.x + (dx * i) / 24 - (dy / d) * zig,
            a.y + (dy * i) / 24 + (dx / d) * zig,
          );
        }
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = color(
        o.highlighted(l.id) ? "vector-velocity" : "structure",
        dark,
      );
      ctx.lineWidth = l.type === "rod" ? 3 : 1.8;
      ctx.stroke();
      if (l.type === "spring" && l.lockAngle) {
        ctx.font = "10px system-ui";
        ctx.fillStyle = color("accent-text", dark);
        ctx.fillText("axis locked", (a.x + b.x) / 2 + 8, (a.y + b.y) / 2 - 12);
      }
      for (const [id, p] of [
        [l.a, a],
        [l.b, b],
      ])
        if (!id) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = color("structure", dark);
          ctx.fill();
        }
    }
    for (const body of sim.objects.values()) {
      const s = sim.state(body.id),
        p = screen(s);
      ctx.beginPath();
      for (let i = 0; i < body.body.vertices.length; i++) {
        const v = body.body.vertices[i],
          q = screen({ x: v.x / 100, y: -v.y / 100 });
        i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
      }
      ctx.closePath();
      ctx.fillStyle =
        color(
          body.shape === "ball"
            ? "body-ball"
            : body.shape === "wedge"
              ? "body-wedge"
              : "body-block",
          dark,
        ) + "e0";
      ctx.fill();
      ctx.strokeStyle = color(
        o.highlighted(body.id)
          ? "ink"
          : body.shape === "ball"
            ? "body-ball-edge"
            : "body-edge",
        dark,
      );
      ctx.lineWidth = o.highlighted(body.id) ? 2.5 : 1.5;
      ctx.stroke();
      drawRuler(body, s);
      if (body.shape === "wedge") drawWedgeAngles(body, dark, o.angleUnit);
      if (body.charge) {
        ctx.fillStyle = color(
          body.charge > 0 ? "charge-positive" : "charge-negative",
          dark,
        );
        ctx.font = "bold 11px system-ui";
        ctx.fillText(
          (body.charge > 0 ? "+" : "") + tidyNumber(body.charge, 4) + " C",
          p.x + 12,
          p.y + 20,
        );
      }
      if (o.locks && (body.lockPosition || body.lockRotation))
        lockGlyph(
          body,
          p,
          dark,
          (body.shape === "ball"
            ? body.radius
            : Math.min(body.width, body.height) / 2) * view.scale,
          o.iconWeight,
        );
      if (o.vectors) {
        const speed = Math.hypot(s.vx, s.vy);
        if (speed * VELOCITY_PX >= 3)
          arrow(
            p,
            s.vx * VELOCITY_PX,
            s.vy * VELOCITY_PX,
            color("vector-velocity", dark),
            (o.labels || o.highlighted(body.id)) && fixed(speed) + " m/s",
          );
      }
      if (o.forceVectors) {
        const f = o.forceOf(body.id),
          size = Math.hypot(f.x, f.y),
          length = size * o.forceScale;
        // A body at rest has zero net force and draws nothing.
        if (length >= 3)
          arrow(
            p,
            f.x * o.forceScale,
            f.y * o.forceScale,
            color("vector-force", dark),
            (o.labels || body.id === o.selected) && fixed(size) + " N",
            FORCE_CAP,
          );
      }
    }
  }

  return { screen, world, line, arrow, drawScene };
}
