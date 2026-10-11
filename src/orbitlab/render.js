// Drawing of the orbits scene, shared by the orbits page and the minitool
// mini simulations so both look the same. It is given a canvas context and a
// view, and for each frame the model, the colours, what to show, the launch
// being set up and the page's number formatting; it looks nothing up in the
// page. Panels, graphs, preset thumbnails and input stay with the page.

import { color, paletteOf } from "../site/theme.js";

export const TAU = 2 * Math.PI,
  // The launch arrow is this long, in pixels, at the circular orbit speed
  // for the launch radius; velocity arrows on satellites use the same scale.
  ARROW = 64,
  SATELLITE = 5;

// Canvas colours, by key, from the theme tokens (src/site/theme.js).
export const ORBIT_COLOURS = {
  ink: "ink",
  soft: "canvas-soft",
  panel: "panel",
  paper: "canvas-bg",
  gridMinor: "canvas-grid-minor",
  gridMajor: "canvas-grid-major",
  body: "orbit-body",
  bodyEdge: "orbit-body-edge",
  velocity: "vector-velocity",
  force: "vector-force",
  kinetic: "energy-kinetic",
  potential: "energy-gravitational",
  axis: "graph-grid",
};
export function orbitPalette(dark) {
  return {
    dark,
    ...paletteOf(ORBIT_COLOURS, dark),
    // One colour per satellite, in launch order.
    satellites: [1, 2, 3, 4, 5, 6, 7, 8].map((i) =>
      color("orbit-satellite-" + i, dark),
    ),
  };
}

// Round step (1, 2 or 5 × 10ⁿ) giving about `count` intervals over `range`.
export function niceStep(range, count) {
  const raw = range / count,
    size = 10 ** Math.floor(Math.log10(raw)),
    unit = raw / size;
  return (unit < 1.5 ? 1 : unit < 3.5 ? 2 : unit < 7.5 ? 5 : 10) * size;
}

// `view` holds pixels per metre and the screen position of the body's centre
// ({ scale, x, y, width, height }).
export function createOrbitRenderer(ctx, view) {
  const screen = (x, y) => [view.x + x * view.scale, view.y - y * view.scale];
  const world = (sx, sy) => ({
    x: (sx - view.x) / view.scale,
    y: (view.y - sy) / view.scale,
  });
  // What the current frame draws (see use()).
  let lab, state, aim, preview, clearArea, joined, distance, prefixed;
  let speedText, angleText;
  function use(options) {
    lab = options.model;
    state = { show: options.show, selected: options.selected };
    aim = options.aim;
    const ghost = options.preview,
      area = options.area;
    preview = () => ghost;
    clearArea = () => area;
    ({ joined, distance, prefixed, speedText, angleText } = options.format);
  }
  function arrowHead(x, y, angle, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.7, size * 0.62);
    ctx.lineTo(-size * 0.7, -size * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // An arrow from (x, y) along the screen direction (dx, dy), `length` pixels
  // long. Returns its tip.
  function arrow(x, y, dx, dy, length, colour, width = 2.2) {
    const x1 = x + dx * length,
      y1 = y + dy * length;
    ctx.strokeStyle = ctx.fillStyle = colour;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    if (length > 3) arrowHead(x1 + dx * 4, y1 + dy * 4, Math.atan2(dy, dx), 6);
    return [x1 + dx * 4, y1 + dy * 4];
  }
  function label(text, x, y, c, align = "center") {
    ctx.font = "600 10.5px system-ui,sans-serif";
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.strokeStyle = c.paper;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = c.ink;
    ctx.fillText(text, x, y);
  }
  function strokePoints(points) {
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const [x, y] = screen(points[i][0], points[i][1]);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }

  function drawGrid(c) {
    const lo = world(0, view.height),
      hi = world(view.width, 0),
      step = niceStep(90 / view.scale, 1);
    ctx.lineWidth = 1;
    ctx.strokeStyle = c.gridMinor;
    ctx.beginPath();
    for (let x = Math.ceil(lo.x / step) * step; x <= hi.x; x += step) {
      const sx = Math.round(screen(x, 0)[0]) + 0.5;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, view.height);
    }
    for (let y = Math.ceil(lo.y / step) * step; y <= hi.y; y += step) {
      const sy = Math.round(screen(0, y)[1]) + 0.5;
      ctx.moveTo(0, sy);
      ctx.lineTo(view.width, sy);
    }
    ctx.stroke();
  }
  function drawScaleBar(c) {
    const length = niceStep(80 / view.scale, 1),
      w = length * view.scale,
      area = clearArea(),
      x = Math.round((area.left + area.right) / 2 - w / 2) + 0.5,
      y = view.height - 30.5;
    ctx.strokeStyle = ctx.fillStyle = c.soft;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y - 4);
    ctx.stroke();
    ctx.font = "10px ui-monospace,monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(joined(distance(length, 3)), x + w / 2, y + 4);
  }

  function drawBody(c) {
    const [x, y] = screen(0, 0),
      true_ = lab.body.radius * view.scale,
      r = Math.max(true_, 3);
    ctx.fillStyle = c.body;
    ctx.strokeStyle = c.bodyEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.stroke();
    if (state.show.labels)
      label(
        lab.body.name + (true_ < 3 ? " (drawn larger than scale)" : ""),
        x,
        true_ > 40 ? y : y + r + 11,
        c,
      );
  }

  // Velocity and force arrows share one scale across the scene: ARROW pixels
  // for the circular speed, and for the weight, at the launch radius.
  function drawVectors(x, y, vx, vy, r, c, withLabels) {
    const p = preview(),
      [sx, sy] = screen(x, y),
      // Unit vector pointing away from the centre, on screen.
      d = Math.hypot(x, y) || 1,
      ox = x / d,
      oy = -y / d;
    if (state.show.force) {
      const size = ARROW * (aim.radius / r) ** 2,
        length = Math.min(size, 190),
        tip = arrow(sx, sy, -ox, -oy, length, c.force);
      if (withLabels && state.show.labels)
        label(
          joined(prefixed((lab.mu * lab.satelliteMass) / (r * r), "N", 3)) +
            (size > length ? " (arrow shortened)" : ""),
          tip[0] - ox * 16,
          tip[1] - oy * 16,
          c,
        );
    }
    if (state.show.velocity) {
      const v = Math.hypot(vx, vy);
      if (v > 0) {
        const length = Math.min((ARROW * v) / p.circularSpeed, 400),
          tip = arrow(sx, sy, vx / v, -vy / v, length, c.velocity);
        if (withLabels && state.show.labels)
          label(
            joined(speedText(v, 3)),
            tip[0] + (vx / v) * 14 + ox * 16,
            tip[1] - (vy / v) * 14 + oy * 16,
            c,
          );
      }
    }
  }

  // The swept areas of Kepler's second law for one satellite: alternate
  // equal-time sectors shaded, each numbered.
  function drawAreas(s, colour, c) {
    const [ox, oy] = screen(0, 0),
      sectors = [...s.sweep.sectors];
    if (s.sweep.current) sectors.push(s.sweep.current);
    for (const sector of sectors) {
      const pts = sector.points,
        open = sector === s.sweep.current;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      for (let i = 0; i < pts.length; i += 2)
        ctx.lineTo(...screen(pts[i], pts[i + 1]));
      if (open) ctx.lineTo(...screen(s.x, s.y));
      ctx.closePath();
      ctx.fillStyle = colour;
      ctx.globalAlpha = sector.index % 2 ? 0.1 : 0.3;
      ctx.fill();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (open || !state.show.labels) continue;
      // Number it part-way out along the middle of its arc.
      const mid = 2 * Math.floor(pts.length / 4),
        [mx, my] = screen(0.62 * pts[mid], 0.62 * pts[mid + 1]);
      label(String(sector.index + 1), mx, my, c);
    }
  }

  function drawSatellite(s, c) {
    const colour = c.satellites[s.colour],
      [x, y] = screen(s.x, s.y),
      chosen = s.id === state.selected;
    if (s.status === "flying")
      drawVectors(s.x, s.y, s.vx, s.vy, Math.hypot(s.x, s.y), c, chosen);
    ctx.beginPath();
    ctx.arc(x, y, SATELLITE, 0, TAU);
    ctx.fillStyle = s.status === "flying" ? colour : c.panel;
    ctx.fill();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (s.status === "impact") {
      // A cross where it landed.
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 6);
      ctx.lineTo(x + 6, y + 6);
      ctx.moveTo(x + 6, y - 6);
      ctx.lineTo(x - 6, y + 6);
      ctx.stroke();
    }
    if (chosen) {
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, SATELLITE + 5, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (state.show.labels && s.status !== "flying")
      label(s.status === "impact" ? "Impact" : "Escaped", x, y - 16, c);
  }

  // The launch that is set up: its point, the local horizontal, the velocity
  // arrow with its drag handle, and the path it would follow.
  function ghostGeometry() {
    const p = preview(),
      [x, y] = screen(0, aim.radius),
      length = (ARROW * aim.speed) / p.circularSpeed;
    return {
      x,
      y,
      length,
      tipX: x + Math.cos(aim.angle) * length,
      tipY: y - Math.sin(aim.angle) * length,
    };
  }
  function drawGhost(c) {
    const p = preview(),
      g = ghostGeometry();
    if (state.show.prediction) {
      ctx.strokeStyle = c.ink;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 4]);
      strokePoints(p.path);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    // Local horizontal through the launch point, and the altitude below it.
    ctx.strokeStyle = c.soft;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(g.x - 46, g.y);
    ctx.lineTo(g.x + 46, g.y);
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(...screen(0, lab.body.radius));
    ctx.stroke();
    ctx.setLineDash([]);
    if (Math.abs(aim.angle) > 0.02 && g.length > 24) {
      ctx.beginPath();
      ctx.arc(g.x, g.y, 20, 0, -aim.angle, aim.angle > 0);
      ctx.stroke();
      if (state.show.labels)
        label(
          angleText(aim.angle),
          g.x + 34 * Math.cos(aim.angle / 2),
          g.y - 34 * Math.sin(aim.angle / 2),
          c,
        );
    }
    arrow(
      g.x,
      g.y,
      Math.cos(aim.angle),
      -Math.sin(aim.angle),
      g.length,
      c.velocity,
      2.6,
    );
    // Handle at the tip of the arrow, and the launch point itself.
    ctx.beginPath();
    ctx.arc(g.tipX, g.tipY, 5.5, 0, TAU);
    ctx.fillStyle = c.panel;
    ctx.fill();
    ctx.strokeStyle = c.velocity;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(g.x, g.y, SATELLITE, 0, TAU);
    ctx.fillStyle = c.panel;
    ctx.fill();
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    if (state.show.labels && !lab.list().length)
      label(joined(speedText(aim.speed, 3)), g.tipX, g.tipY - 15, c);
  }

  // options: model, colours (orbitPalette), grid, show, selected, aim,
  // preview (the model's preview of the next launch with its path), paths
  // (predicted path of each satellite, by id), area (the part of the canvas
  // clear of panels) and format (the page's number formatting).
  function drawScene(model, options) {
    use({ ...options, model });
    const c = options.colours,
      paths = options.paths;
    ctx.setLineDash([]);
    ctx.lineJoin = "round";
    if (options.grid) drawGrid(c);
    drawBody(c);
    for (const s of lab.list()) {
      const colour = c.satellites[s.colour];
      if (state.show.prediction && paths.has(s.id)) {
        ctx.strokeStyle = colour;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1;
        strokePoints(paths.get(s.id));
        ctx.globalAlpha = 1;
      }
      if (state.show.areas && s.id === state.selected) drawAreas(s, colour, c);
      if (state.show.trails) {
        ctx.strokeStyle = colour;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < s.trail.length; i++) {
          const [x, y] = screen(s.trail.get(i, 0), s.trail.get(i, 1));
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        // The trail of a closed orbit stops after one turn (it would only
        // retrace itself); until then it runs up to the satellite.
        if (Math.abs(s.swept) < s.trailEnd) ctx.lineTo(...screen(s.x, s.y));
        ctx.stroke();
      }
    }
    drawGhost(c);
    for (const s of lab.list()) drawSatellite(s, c);
    drawScaleBar(c);
  }
  // Where the launch point and the arrow's tip are, in canvas pixels.
  function launchGeometry(options) {
    use(options);
    return ghostGeometry();
  }
  return {
    screen,
    world,
    arrow,
    label,
    strokePoints,
    drawScene,
    launchGeometry,
  };
}
