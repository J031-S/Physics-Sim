// Drawing of the waves, light & sound page: the rays scene, the ripple tank
// and the sound experiments. Each draw function is given a canvas context,
// a view (world to pixels) or an area, the model and options; nothing here
// looks anything up in the page, so the minitool mini simulations can draw
// the same scenes on their own canvas. The only DOM use is an off-screen
// canvas for the tank's field image.
//
// Everything in the rays and waves scenes is placed in world coordinates,
// so panning and zooming move the picture without changing it.
import { paletteOf, spectralColour, value } from "../site/theme.js";
import { arrowheadScale, endGrid, gridDash, vectorWeight } from "../site/canvas-style.js";
import { focalLength, frame, isSource as isRaySource, outlineOf } from "./rays.js";
import { slitOffsets } from "./waves.js";
import { pipePattern } from "./sound.js";

export const WAVE_COLOURS = {
  ink: "ink",
  soft: "ink-soft",
  panel: "panel",
  back: "canvas-bg",
  line: "line",
  gridMinor: "canvas-grid",
  gridMajor: "canvas-grid-major",
  positive: "charge-positive",
  negative: "charge-negative",
  glass: "field-equipotential",
  mirror: "structure",
  select: "accent-text",
  image: "field-magnetic",
  object: "orbit-body",
  intensity: "circuit-glow",
  wall: "structure",
  probe: "field-test-charge",
  pressure: "field-electric",
  displacement: "vector-velocity",
  velocity: "vector-velocity",
};
export const wavePalette = (dark) => ({ dark, ...paletteOf(WAVE_COLOURS, dark) });
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// Grid steps of 1, 2 or 5 × 10ⁿ metres, at least `px` pixels apart.
export function gridStep(scale, px = 14) {
  const raw = px / scale,
    e = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) if (m * e >= raw) return m * e;
  return 10 * e;
}

export function createWaveRenderer(ctx, view) {
  const screen = (x, y) => [view.x + x * view.scale, view.y - y * view.scale];
  const world = (sx, sy) => ({ x: (sx - view.x) / view.scale, y: (view.y - sy) / view.scale });

  function drawGrid(c) {
    const lo = world(0, view.height),
      hi = world(view.width, 0),
      step = gridStep(view.scale),
      px = step * view.scale,
      major = (v) => Math.abs(v / (step * 5) - Math.round(v / (step * 5))) < 1e-6;
    ctx.lineWidth = 1;
    // The dotted grid's dots are set from the world origin, not from the
    // canvas edge where each line starts, so that they move with the scene
    // (the shared helper leaves their phase at the edge).
    const dotted = value("grid-style") === "dotted",
      period = 5; // gridDash's dotted pattern: 1.5 on, 3.5 off
    gridDash(ctx, px, (screen(0, Math.ceil(lo.y / step) * step)[1] + 0.5) % px);
    if (dotted) ctx.lineDashOffset = -(((view.y % period) + period) % period);
    for (let x = Math.ceil(lo.x / step) * step; x <= hi.x; x += step) {
      ctx.strokeStyle = major(x) ? c.gridMajor : c.gridMinor;
      const sx = Math.round(screen(x, 0)[0]) + 0.5;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, view.height);
      ctx.stroke();
    }
    gridDash(ctx, px, (screen(Math.ceil(lo.x / step) * step, 0)[0] + 0.5) % px);
    if (dotted) ctx.lineDashOffset = -(((view.x % period) + period) % period);
    for (let y = Math.ceil(lo.y / step) * step; y <= hi.y; y += step) {
      ctx.strokeStyle = major(y) ? c.gridMajor : c.gridMinor;
      const sy = Math.round(screen(0, y)[1]) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(view.width, sy);
      ctx.stroke();
    }
    endGrid(ctx);
    return step;
  }

  // A line segment in world coordinates, drawn through vertices every Δ
  // along it from its start (Δ about 48 px, a power of two in metres), and
  // only over the stretch that can be seen. The vertices are fixed in the
  // world, so panning moves every vertex by the same whole number of pixels
  // and the line is rasterised the same; only the piece crossing the edge
  // of the canvas, which the browser clips, can differ. Clipping a long ray
  // to the view instead would move its end points as the view pans.
  function worldLine(x1, y1, x2, y2) {
    const dx = x2 - x1,
      dy = y2 - y1,
      len = Math.hypot(dx, dy);
    if (!(len > 0)) return false;
    const step = 2 ** Math.round(Math.log2(48 / view.scale)),
      lo = world(-2, view.height + 2),
      hi = world(view.width + 2, -2),
      margin = 2 * step;
    let t0 = 0,
      t1 = 1;
    for (const [p, q] of [
      [-dx, x1 - (lo.x - margin)],
      [dx, hi.x + margin - x1],
      [-dy, y1 - (lo.y - margin)],
      [dy, hi.y + margin - y1],
    ]) {
      if (p === 0) {
        if (q < 0) return false;
      } else {
        const r = q / p;
        if (p < 0) t0 = Math.max(t0, r);
        else t1 = Math.min(t1, r);
      }
    }
    if (t0 > t1) return false;
    const first = Math.floor((t0 * len) / step),
      last = Math.ceil((t1 * len) / step),
      at = (k) => {
        const s = Math.min(len, Math.max(0, k * step)) / len;
        return screen(x1 + dx * s, y1 + dy * s);
      };
    ctx.moveTo(...at(first));
    for (let k = first + 1; k <= last; k++) ctx.lineTo(...at(k));
    return true;
  }
  function arrowHead(x, y, angle, size) {
    const s = size * arrowheadScale();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - s * Math.cos(angle - 0.45), y + s * Math.sin(angle - 0.45));
    ctx.lineTo(x - s * Math.cos(angle + 0.45), y + s * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fill();
  }
  function label(text, x, y, colour, align = "left") {
    ctx.fillStyle = colour;
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  }
  function polyline(points, closed) {
    ctx.beginPath();
    points.forEach((p, i) => {
      const [x, y] = screen(p.x, p.y);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    if (closed) ctx.closePath();
  }

  // -------------------------------------------------------------- rays

  function drawElement(el, c, selected) {
    const ink = selected ? c.select : c.ink;
    ctx.setLineDash([]);
    const o = outlineOf(el);
    if (el.kind === "block" || el.kind === "prism" || el.kind === "lens") {
      polyline(o.points, true);
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = c.glass;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = selected ? c.select : c.glass;
      ctx.lineWidth = selected ? 2.5 : 1.5;
      ctx.stroke();
      return;
    }
    if (el.kind === "stop") {
      ctx.strokeStyle = selected ? c.select : c.mirror;
      ctx.lineWidth = 5;
      ctx.lineCap = "butt";
      ctx.beginPath();
      for (const part of o.parts) {
        const [a, b] = part.map((p) => screen(p.x, p.y));
        ctx.moveTo(...a);
        ctx.lineTo(...b);
      }
      ctx.stroke();
      ctx.lineCap = "round";
      return;
    }
    if (el.kind === "thinLens") {
      const [a, b] = o.points.map((p) => screen(p.x, p.y)),
        dir = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
      ctx.strokeStyle = selected ? c.select : c.glass;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.stroke();
      // Arrowheads out for converging, in for diverging (the usual symbol).
      const size = 9;
      if (el.f > 0) {
        arrowHead(b[0], b[1], dir, size);
        arrowHead(a[0], a[1], dir + Math.PI, size);
      } else {
        arrowHead(b[0], b[1], dir + Math.PI, size);
        arrowHead(a[0], a[1], dir, size);
      }
      return;
    }
    // Mirrors and screens: a line, with hatching behind a mirror.
    const pts = o.points;
    polyline(pts, false);
    ctx.strokeStyle = selected ? c.select : el.kind === "screen" ? c.soft : c.mirror;
    ctx.lineWidth = el.kind === "screen" ? 4 : 2.5;
    ctx.stroke();
    if (el.kind !== "screen") {
      void ink;
      const f = frame(el),
        back = 7 / view.scale; // hatching 7 px deep, behind the mirror
      ctx.lineWidth = 1;
      ctx.strokeStyle = selected ? c.select : c.mirror;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i += 2) {
        const p = pts[i],
          [x, y] = screen(p.x, p.y),
          [bx, by] = screen(p.x - f.a.x * back + f.p.x * back * 0.6, p.y - f.a.y * back + f.p.y * back * 0.6);
        ctx.moveTo(x, y);
        ctx.lineTo(bx, by);
      }
      ctx.stroke();
    }
  }
  // Focal points (F) and centres of curvature (C) on an element's axis.
  function drawFoci(el, c) {
    const f = focalLength(el);
    if (f === null) return;
    const fr = frame(el),
      mirror = el.kind === "sphericalMirror" || el.kind === "parabolicMirror",
      marks = mirror ? [[f, "F"]] : [[f, "F"], [-f, "F"]];
    if (el.kind === "sphericalMirror") marks.push([el.radius, "C"]);
    ctx.fillStyle = c.soft;
    for (const [d, name] of marks) {
      const [x, y] = screen(el.x + fr.a.x * d, el.y + fr.a.y * d);
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
      ctx.fill();
      label(name, x, y - 9, c.soft, "center");
    }
  }
  function drawSource(src, c, selected) {
    const ink = selected ? c.select : src.kind === "object" ? c.object : c.ink,
      a = { x: Math.cos(src.angle), y: Math.sin(src.angle) },
      p = { x: -a.y, y: a.x };
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    if (src.kind === "object") {
      const [bx, by] = screen(src.x, src.y),
        [tx, ty] = screen(src.x + p.x * src.height, src.y + p.y * src.height);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      arrowHead(tx, ty, Math.atan2(-(ty - by), tx - bx), 10);
      return;
    }
    if (src.kind === "beam") {
      const [ax, ay] = screen(src.x - (p.x * src.width) / 2, src.y - (p.y * src.width) / 2),
        [bx, by] = screen(src.x + (p.x * src.width) / 2, src.y + (p.y * src.width) / 2);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      return;
    }
    const [x, y] = screen(src.x, src.y);
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
  }

  /**
   * The rays scene. options: colours, grid, trace (lab.trace()), images
   * (lab.images()), selected (id), foci (show F and C).
   */
  function drawRays(lab, o) {
    const c = o.colours;
    ctx.setLineDash([]);
    ctx.lineCap = "round";
    const step = o.grid ? drawGrid(c) : gridStep(view.scale);
    const items = lab.list();
    for (const el of items) if (!isRaySource(el.kind)) drawElement(el, c, el.id === o.selected);
    if (o.foci) for (const el of items) if (!isRaySource(el.kind)) drawFoci(el, c);
    // Rays: their own colour, as bright as the share of light they carry.
    const width = Math.max(1, vectorWeight() * 0.6);
    for (const s of o.trace.segments) {
      ctx.beginPath();
      if (!worldLine(s.x1, s.y1, s.x2, s.y2)) continue;
      ctx.strokeStyle = spectralColour(s.wavelength, c.dark);
      ctx.globalAlpha = Math.min(1, 0.08 + 0.92 * s.intensity);
      ctx.lineWidth = width;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Images: real ones solid, virtual ones dashed, with the rays' backward
    // extensions dashed to them.
    for (const im of o.images) {
      if (!im.base || im.blocked) continue;
      const src = lab.get(im.source);
      ctx.strokeStyle = c.image;
      ctx.fillStyle = c.image;
      if (!im.real) {
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.7;
        for (const s of o.trace.segments) {
          if (s.source !== src.id || s.end !== "escape" || s.event === "partial") continue;
          if (s.intensity < 0.5) continue;
          ctx.beginPath();
          worldLine(s.x1, s.y1, im.tip.x, im.tip.y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      const [bx, by] = screen(im.base.x, im.base.y),
        [tx, ty] = screen(im.tip.x, im.tip.y);
      ctx.setLineDash(im.real ? [] : [6, 4]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      if (Math.hypot(tx - bx, ty - by) > 4) arrowHead(tx, ty, Math.atan2(-(ty - by), tx - bx), 10);
      label(im.real ? "image" : "virtual image", tx + 8, ty, c.image);
    }
    for (const el of items) if (isRaySource(el.kind)) drawSource(el, c, el.id === o.selected);
    return { step };
  }

  // -------------------------------------------------------------- waves

  let field = null; // the off-screen canvas holding one pixel per cell
  const luts = new Map();
  // Colour tables for the shading: diverging (wave) and sequential
  // (intensity), 256 entries each, from the theme's colours.
  function lut(c, kind) {
    const key = kind + c.back + c.positive + c.negative + c.intensity;
    if (luts.has(key)) return luts.get(key);
    const table = new Uint8ClampedArray(256 * 3),
      back = rgb(c.back),
      pos = rgb(c.positive),
      neg = rgb(c.negative),
      hot = rgb(c.intensity);
    for (let i = 0; i < 256; i++) {
      let to,
        t;
      if (kind === "wave") {
        t = Math.abs(i - 127.5) / 127.5;
        to = i > 127.5 ? pos : neg;
      } else {
        t = i / 255;
        to = hot;
      }
      for (let k = 0; k < 3; k++) table[i * 3 + k] = back[k] + (to[k] - back[k]) * t;
    }
    luts.set(key, table);
    return table;
  }

  /**
   * The ripple tank. options: colours, grid, display ("wave" | "intensity"),
   * gain (full colour at this |u|; intensity at gain²/2... squared),
   * selected, readings (screen id → { s, intensity }), fringes (screen id
   * → lab.fringes()).
   */
  function drawWaves(lab, o) {
    const c = o.colours,
      { nx, ny, pad, cell: h } = lab;
    ctx.setLineDash([]);
    ctx.lineCap = "round";
    if (o.grid) drawGrid(c);
    // The field, one pixel per cell, scaled into place.
    if (typeof document !== "undefined") {
      if (!field) field = document.createElement("canvas");
      if (field.width !== nx || field.height !== ny) {
        field.width = nx;
        field.height = ny;
      }
      const g = field.getContext("2d"),
        image = g?.createImageData?.(nx, ny);
      if (image?.data) {
        const data = image.data,
          table = lut(c, o.display),
          wall = rgb(c.wall),
          src = o.display === "wave" ? lab.u1 : lab.avg,
          keep = lab.keep,
          k = o.display === "wave" ? 127.5 / o.gain : 255 / (o.gain * o.gain);
        for (let j = 0; j < ny; j++) {
          // Rows from the top of the tank down.
          const row = (ny - 1 - j) * nx;
          for (let i = 0; i < nx; i++) {
            const cellIndex = j * nx + i,
              q = (row + i) * 4;
            if (!keep[cellIndex]) {
              data[q] = wall[0];
              data[q + 1] = wall[1];
              data[q + 2] = wall[2];
              data[q + 3] = 255;
              continue;
            }
            let v = o.display === "wave" ? 127.5 + src[cellIndex] * k : src[cellIndex] * k;
            v = v < 0 ? 0 : v > 255 ? 255 : v | 0;
            data[q] = table[v * 3];
            data[q + 1] = table[v * 3 + 1];
            data[q + 2] = table[v * 3 + 2];
            data[q + 3] = 255;
          }
        }
        g.putImageData(image, 0, 0);
        // The tank only, not the absorbing layer round it.
        const [x0, y0] = screen(-lab.width / 2, lab.height / 2);
        ctx.imageSmoothingEnabled = view.scale * h < 6;
        ctx.drawImage(field, pad, pad, nx - 2 * pad, ny - 2 * pad, x0, y0, lab.width * view.scale, lab.height * view.scale);
        ctx.imageSmoothingEnabled = true;
      }
    }
    // The tank's edge.
    {
      const [x0, y0] = screen(-lab.width / 2, lab.height / 2);
      ctx.strokeStyle = lab.edges === "wall" ? c.wall : c.line;
      ctx.lineWidth = lab.edges === "wall" ? 3 : 1;
      ctx.strokeRect(x0, y0, lab.width * view.scale, lab.height * view.scale);
    }
    for (const item of lab.list()) {
      const selected = item.id === o.selected,
        ink = selected ? c.select : c.ink;
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.lineWidth = selected ? 2 : 1.25;
      if (item.kind === "medium") {
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = selected ? c.select : c.glass;
        mediumPath(item);
        ctx.stroke();
        ctx.setLineDash([]);
        const [x, y] = screen(item.x, item.y);
        label(`n = ${item.index}`, x, y, selected ? c.select : c.glass, "center");
      } else if (item.kind === "wall") {
        if (selected) {
          ctx.setLineDash([3, 3]);
          wallPath(item);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else if (item.kind === "point" || item.kind === "moving") {
        const at = lab.sourcePosition(item),
          [x, y] = screen(at.x, at.y);
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
        if (item.kind === "moving") {
          const a = item.angle,
            len = 18 + 10 * item.speed;
          ctx.strokeStyle = selected ? c.select : c.velocity;
          ctx.fillStyle = ctx.strokeStyle;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + len * Math.cos(a), y - len * Math.sin(a));
          ctx.stroke();
          arrowHead(x + len * Math.cos(a), y - len * Math.sin(a), a, 8);
          // Where it started, faintly.
          const [sx, sy] = screen(item.x, item.y);
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.arc(sx, sy, 3, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else if (item.kind === "line") {
        const a = { x: Math.cos(item.angle), y: Math.sin(item.angle) },
          p = { x: -a.y, y: a.x },
          [x1, y1] = screen(item.x - (p.x * item.length) / 2, item.y - (p.y * item.length) / 2),
          [x2, y2] = screen(item.x + (p.x * item.length) / 2, item.y + (p.y * item.length) / 2),
          [cx, cy] = screen(item.x, item.y);
        ctx.lineWidth = selected ? 4 : 3;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 22 * a.x, cy - 22 * a.y);
        ctx.stroke();
        arrowHead(cx + 22 * a.x, cy - 22 * a.y, item.angle, 8);
      } else if (item.kind === "probe") {
        const [x, y] = screen(item.x, item.y);
        ctx.strokeStyle = selected ? c.select : c.probe;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.moveTo(x - 10, y);
        ctx.lineTo(x + 10, y);
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x, y + 10);
        ctx.stroke();
      } else if (item.kind === "screen") drawScreen(item, o, c, selected, lab);
    }
  }
  function mediumPath(m) {
    const a = { x: Math.cos(m.angle), y: Math.sin(m.angle) },
      p = { x: -a.y, y: a.x },
      at = (u, v) => ({ x: m.x + a.x * u + p.x * v, y: m.y + a.y * u + p.y * v });
    if (m.shape === "rect") {
      const w = m.width / 2,
        h = m.height / 2;
      polyline([at(-w, -h), at(w, -h), at(w, h), at(-w, h)], true);
    } else if (m.shape === "circle") {
      const [x, y] = screen(m.x, m.y);
      ctx.beginPath();
      ctx.arc(x, y, m.radius * view.scale, 0, 2 * Math.PI);
    } else {
      // Lens: the two arcs between the points where the circles cross.
      const off = m.radius - m.thickness / 2,
        half = Math.sqrt(m.radius ** 2 - off ** 2),
        pts = [];
      for (let i = 0; i <= 40; i++) {
        const v = -half + (2 * half * i) / 40;
        pts.push(at(off - Math.sqrt(m.radius ** 2 - v * v), v));
      }
      for (let i = 40; i >= 0; i--) {
        const v = -half + (2 * half * i) / 40;
        pts.push(at(-off + Math.sqrt(m.radius ** 2 - v * v), v));
      }
      polyline(pts, true);
    }
  }
  function wallPath(w) {
    const a = { x: Math.cos(w.angle), y: Math.sin(w.angle) },
      p = { x: -a.y, y: a.x },
      t = Math.max(w.thickness, 0.05) / 2,
      at = (u, v) => ({ x: w.x + a.x * u + p.x * v, y: w.y + a.y * u + p.y * v }),
      L = w.length / 2;
    polyline([at(-L, -t), at(L, -t), at(L, t), at(-L, t)], true);
    void slitOffsets;
  }
  // A screen: its line, the time-averaged intensity along it drawn as a
  // graph behind it (in the tank's own coordinates, so it pans with the
  // picture), and the theoretical fringe positions as ticks.
  function drawScreen(sc, o, c, selected, lab) {
    const a = { x: Math.cos(sc.angle), y: Math.sin(sc.angle) },
      p = { x: -a.y, y: a.x },
      at = (t, off = 0) => screen(sc.x + p.x * t - a.x * off, sc.y + p.y * t - a.y * off),
      reading = o.readings?.get(sc.id),
      marks = o.fringes?.get(sc.id),
      depth = Math.min(4, lab.width / 6); // metres the graph reaches at its peak
    ctx.strokeStyle = selected ? c.select : c.soft;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(...at(-sc.length / 2));
    ctx.lineTo(...at(sc.length / 2));
    ctx.stroke();
    if (reading) {
      const peak = Math.max(...reading.intensity, 1e-12);
      ctx.strokeStyle = c.intensity;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      reading.s.forEach((t, i) => {
        const [x, y] = at(t, 0.3 + (depth * reading.intensity[i]) / peak);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
    if (marks) {
      ctx.strokeStyle = c.ink;
      ctx.fillStyle = c.ink;
      ctx.lineWidth = 1;
      for (const m of marks.list) {
        if (Math.abs(m.s) > sc.length / 2) continue;
        const [x1, y1] = at(m.s, 0.1),
          [x2, y2] = at(m.s, 0.3 + depth);
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        const [lx, ly] = at(m.s, 0.5 + depth);
        label(String(m.m), lx, ly, c.soft, "center");
      }
    }
  }

  return { screen, world, drawGrid, drawRays, drawWaves };
}

// ---------------------------------------------------------------- sound

// The sound experiments are drawn into a rectangle of the canvas (`area`:
// left, top, width, height); the view has no pan or zoom.
export function drawSound(ctx, lab, o) {
  const c = o.colours,
    s = lab.state,
    A = o.area;
  ctx.setLineDash([]);
  ctx.lineCap = "round";
  const text = (t, x, y, colour = c.ink, align = "left", size = 11) => {
    ctx.fillStyle = colour;
    ctx.font = `${size}px system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(t, x, y);
  };
  const axis = (y, x0, x1) => {
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
  };
  const t = o.time;
  if (s.mode === "string") {
    const string = o.string,
      L = s.string.length,
      x0 = A.left + 40,
      x1 = A.left + A.width - 40,
      mid = A.top + A.height * 0.42,
      // The displacement is drawn exaggerated so that it can be seen.
      gain = (A.height * 0.18) / Math.max(s.string.kind === "pluck" ? s.string.height : string.modes().reduce((m, q) => Math.max(m, Math.abs(q.amplitude)), 1e-9) * 2, 1e-9);
    axis(mid, x0, x1);
    ctx.fillStyle = c.mirror;
    for (const x of [x0, x1]) ctx.fillRect(x - 4, mid - 22, 8, 44);
    // Either the whole string (its sum of modes) or one harmonic alone, at
    // a unit amplitude drawn the same height as the plucked shape.
    const n = s.string.harmonic,
      single = n ? string.terms[n - 1] : null,
      shape = (x) => (single ? Math.sin(single.k * x) * Math.cos(single.w * t) : string.shape(x, t)),
      drawGain = single ? A.height * 0.18 : gain;
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 300; i++) {
      const x = (L * i) / 300,
        px = x0 + ((x1 - x0) * i) / 300,
        py = mid - shape(x) * drawGain;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.stroke();
    if (n) {
      // Nodes of harmonic n, every L/n.
      ctx.fillStyle = c.select;
      for (let k = 0; k <= n; k++) {
        ctx.beginPath();
        ctx.arc(x0 + ((x1 - x0) * k) / n, mid, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
      text(`harmonic ${n}: ${n + 1} nodes, ${n} loops, λ = 2L/${n}`, x0, mid + A.height * 0.25, c.soft);
    } else if (s.string.kind === "pluck") {
      const px = x0 + (x1 - x0) * s.string.position;
      text("plucked here", px, mid - A.height * 0.25, c.soft, "center");
    } else text("struck here", x0 + (x1 - x0) * s.string.position, mid - A.height * 0.25, c.soft, "center");
    text(single ? `L = ${L} m · harmonic ${n} drawn at a set height` : `L = ${L} m · sideways displacement drawn ${Math.round(gain / ((x1 - x0) / L))} times larger than the length`, x0, A.top + A.height - 16, c.soft);
    // The spectrum: amplitude of each mode.
    const modes = string.modes().slice(0, 16),
      biggest = Math.max(...modes.map((m) => Math.abs(m.amplitude)), 1e-30),
      by = A.top + A.height * 0.82,
      bw = Math.min(26, (x1 - x0) / 20);
    text("Mode amplitudes", x0, by - 70, c.soft);
    modes.forEach((m, i) => {
      const hgt = (55 * Math.abs(m.amplitude)) / biggest,
        bx = x0 + i * (bw + 4);
      ctx.fillStyle = i + 1 === n ? c.select : c.displacement;
      ctx.fillRect(bx, by - hgt, bw, hgt);
      text(String(m.n), bx + bw / 2, by + 9, c.soft, "center", 9);
    });
    return;
  }
  if (s.mode === "pipe") {
    const p = s.pipe,
      x0 = A.left + 50,
      x1 = A.left + A.width - 50,
      top = A.top + A.height * 0.28,
      bottom = A.top + A.height * 0.62,
      mid = (top + bottom) / 2,
      half = (bottom - top) / 2;
    // The pipe's walls, closed at the left if it is closed.
    ctx.strokeStyle = c.mirror;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x0, top);
    ctx.lineTo(x1, top);
    ctx.moveTo(x0, bottom);
    ctx.lineTo(x1, bottom);
    if (p.ends === "closed") {
      ctx.moveTo(x0, top);
      ctx.lineTo(x0, bottom);
    }
    ctx.stroke();
    const n = p.harmonic,
      w = 2 * Math.PI * o.frequency,
      phase = Math.cos(w * t);
    // Air layers: dots that move to and fro by the displacement pattern.
    ctx.fillStyle = c.displacement;
    for (let i = 0; i <= 60; i++)
      for (let r = 0; r < 7; r++) {
        const u = i / 60,
          d = pipePattern({ length: 1, ends: p.ends, n }, u).displacement,
          x = x0 + (x1 - x0) * u + d * phase * ((x1 - x0) / 60) * 0.9,
          y = top + ((r + 0.5) * (bottom - top)) / 7;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, 2 * Math.PI);
        ctx.fill();
      }
    ctx.globalAlpha = 1;
    // Envelopes: displacement (blue) and pressure (orange) amplitudes.
    const curve = (key, colour, dash) => {
      ctx.strokeStyle = colour;
      ctx.lineWidth = 2;
      ctx.setLineDash(dash);
      for (const sign of [1, -1]) {
        ctx.beginPath();
        for (let i = 0; i <= 200; i++) {
          const u = i / 200,
            v = pipePattern({ length: 1, ends: p.ends, n }, u)[key],
            x = x0 + (x1 - x0) * u,
            y = mid - sign * v * half * 0.9;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
    };
    curve("displacement", c.displacement, []);
    curve("pressure", c.pressure, [5, 4]);
    text("— displacement amplitude", x0, bottom + 24, c.displacement);
    text("- - pressure amplitude", x0 + 190, bottom + 24, c.pressure);
    text(p.ends === "closed" ? "closed end: displacement node, pressure antinode" : "open ends: displacement antinodes, pressure nodes", x0, top - 22, c.soft);
    return;
  }
  if (s.mode === "beats") {
    const { f1, f2 } = s.beats,
      x0 = A.left + 40,
      x1 = A.left + A.width - 40,
      // The single tones over ten of their cycles, so each wave can be seen;
      // the sum over three beats, so the beating can.
      short = 10 / Math.min(f1, f2),
      span = Math.max(0.05, Math.min(3, 3 / Math.max(Math.abs(f1 - f2), 1))),
      amp = A.height * 0.08,
      trace = (y, seconds, value, colour, scale) => {
        axis(y, x0, x1);
        ctx.strokeStyle = colour;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        const N = Math.min(6000, Math.round(x1 - x0) * 3);
        for (let i = 0; i <= N; i++) {
          const tt = t - seconds + (seconds * i) / N,
            x = x0 + ((x1 - x0) * i) / N,
            yy = y - value(tt) * scale;
          if (i) ctx.lineTo(x, yy);
          else ctx.moveTo(x, yy);
        }
        ctx.stroke();
      };
    const rows = [A.top + A.height * 0.16, A.top + A.height * 0.36, A.top + A.height * 0.7];
    trace(rows[0], short, (tt) => Math.sin(2 * Math.PI * f1 * tt), c.displacement, amp * 0.6);
    text(`${f1} Hz · ${(short * 1000).toPrecision(3)} ms across`, x0, rows[0] - amp - 6, c.soft);
    trace(rows[1], short, (tt) => Math.sin(2 * Math.PI * f2 * tt), c.displacement, amp * 0.6);
    text(`${f2} Hz · ${(short * 1000).toPrecision(3)} ms across`, x0, rows[1] - amp - 6, c.soft);
    trace(rows[2], span, (tt) => Math.sin(2 * Math.PI * f1 * tt) + Math.sin(2 * Math.PI * f2 * tt), c.ink, amp);
    // The envelope of the sum: 2|cos(π(f₁ − f₂)t)|.
    ctx.strokeStyle = c.pressure;
    ctx.lineWidth = 2;
    for (const sign of [1, -1]) {
      ctx.beginPath();
      for (let i = 0; i <= 400; i++) {
        const tt = t - span + (span * i) / 400,
          env = 2 * Math.abs(Math.cos(Math.PI * (f1 - f2) * tt)),
          x = x0 + ((x1 - x0) * i) / 400,
          yy = rows[2] - sign * env * amp;
        if (i) ctx.lineTo(x, yy);
        else ctx.moveTo(x, yy);
      }
      ctx.stroke();
    }
    text(`sum, with its envelope 2|cos π(f₁ − f₂)t| · ${(span * 1000).toPrecision(3)} ms across · now at the right`, x0, rows[2] - 2 * amp - 12, c.soft);
    return;
  }
  if (s.mode === "level") {
    // Distance on a log scale from 1 cm to 10 km; rings every factor of 10.
    const x0 = A.left + 60,
      x1 = A.left + A.width - 60,
      y = A.top + A.height * 0.45,
      at = (r) => x0 + ((x1 - x0) * (Math.log10(r) + 2)) / 6;
    axis(y, x0, x1);
    for (let k = -2; k <= 4; k++) {
      const x = at(10 ** k);
      ctx.strokeStyle = c.line;
      ctx.beginPath();
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x, y + 6);
      ctx.stroke();
      text(k < 0 ? `${10 ** (k + 2)} cm` : k < 3 ? `${10 ** k} m` : `${10 ** (k - 3)} km`, x, y + 18, c.soft, "center");
    }
    ctx.fillStyle = c.ink;
    ctx.beginPath();
    ctx.arc(x0 - 26, y, 9, 0, 2 * Math.PI);
    ctx.fill();
    text("source", x0 - 26, y - 22, c.soft, "center");
    const lx = at(s.level.distance);
    ctx.fillStyle = c.probe;
    ctx.beginPath();
    ctx.arc(lx, y, 8, 0, 2 * Math.PI);
    ctx.fill();
    text("listener (drag)", lx, y - 22, c.probe, "center");
    text("distance (logarithmic scale)", x0, y + 40, c.soft);
    o.hit?.("listener", lx, y, 14);
    o.mapLevel?.((sx) => 10 ** (((sx - x0) / (x1 - x0)) * 6 - 2));
    return;
  }
  if (s.mode === "doppler") {
    // Wavefronts drawn from the formula: one circle per period emitted
    // (every few periods for high frequencies), centred where the source
    // was then, radius v × the time since.
    const d = s.doppler,
      v = o.speed,
      metres = o.span, // metres across the area
      k = A.width / metres,
      cx = A.left + A.width / 2,
      cy = A.top + A.height * (d.layout === "pass" ? 0.38 : 0.5),
      pos = o.source, // { x, y } of the source now, metres
      listener = o.listener;
    const toScreen = (x, y) => [cx + x * k, cy - y * k];
    // Every Nth wavefront, so that neighbours are at least 4 px apart.
    const every = Math.max(1, Math.ceil((4 * d.frequency * metres) / (v * A.width))),
      T = 1 / d.frequency;
    ctx.strokeStyle = c.displacement;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    const start = o.start;
    for (let q = Math.floor((t - metres / v) / (T * every)); q * T * every <= t; q++) {
      const te = q * T * every;
      if (te < start) continue;
      const at = o.sourceAt(te),
        r = v * (t - te);
      if (r <= 0) continue;
      const [x, y] = toScreen(at.x, at.y);
      ctx.beginPath();
      ctx.arc(x, y, r * k, 0, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const [sx, sy] = toScreen(pos.x, pos.y),
      [lx, ly] = toScreen(listener.x, listener.y);
    ctx.fillStyle = c.ink;
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = c.velocity;
    ctx.fillStyle = c.velocity;
    ctx.lineWidth = 2;
    const dir = Math.sign(d.sourceSpeed) || 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 30 * dir, sy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + 36 * dir, sy);
    ctx.lineTo(sx + 26 * dir, sy - 5);
    ctx.lineTo(sx + 26 * dir, sy + 5);
    ctx.fill();
    ctx.fillStyle = c.probe;
    ctx.beginPath();
    ctx.arc(lx, ly, 7, 0, 2 * Math.PI);
    ctx.fill();
    text("listener", lx, ly + 18, c.probe, "center");
    text(`every ${every === 1 ? "" : every + "th "}wavefront drawn · ${metres.toPrecision(3)} m across`, A.left + 20, A.top + A.height - 16, c.soft);
  }
}
