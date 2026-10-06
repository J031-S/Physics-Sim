// Indicator spacing uses a bounded logarithmic scale so both weak and strong fields remain readable.
export const fieldSpacing = (strength) =>
  Math.max(14, 80 / Math.sqrt(1 + 3 * Math.log1p(Math.abs(strength))));
export function drawFields(
  ctx,
  fields,
  screen,
  scale,
  selected,
  visible = null,
) {
  const arrow = (x, y, dx, dy, size = 5) => {
    ctx.beginPath();
    ctx.moveTo(
      x - size * dx - size * 0.6 * dy,
      y - size * dy + size * 0.6 * dx,
    );
    ctx.lineTo(x, y);
    ctx.lineTo(
      x - size * dx + size * 0.6 * dy,
      y - size * dy - size * 0.6 * dx,
    );
    ctx.stroke();
  };
  for (const f of fields.regions.values()) {
    const p = screen(f),
      w = f.width * scale,
      h = f.height * scale,
      a = (f.angle * Math.PI) / 180;
    const toWorld = (x, y) => ({
      x: f.x + (x * Math.cos(a) + y * Math.sin(a)) / scale,
      y: f.y + (x * Math.sin(a) - y * Math.cos(a)) / scale,
    });
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-a);
    ctx.beginPath();
    if (f.shape === "rectangle") ctx.rect(-w / 2, -h / 2, w, h);
    else ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, 2 * Math.PI);
    ctx.fillStyle = f.type === "electric" ? "#dea73918" : "#9874cb18";
    ctx.fill();
    ctx.strokeStyle = f.type === "electric" ? "#ae7d24" : "#8060ae";
    ctx.lineWidth = selected(f.id) ? 2.5 : 1;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.save();
    ctx.clip();
    const spacing = fieldSpacing(f.strength),
      d = f.strength >= 0 ? 1 : -1;
    // Bound work when zooming into very large regions; clip to visible canvas in local coordinates.
    const limit = 6000;
    const corners = visible
      ? [
          { x: visible.min.x, y: visible.min.y },
          { x: visible.min.x, y: visible.max.y },
          { x: visible.max.x, y: visible.min.y },
          { x: visible.max.x, y: visible.max.y },
        ].map((p) => fields.local(f, p))
      : null;
    const left = Math.max(
        -w / 2,
        corners ? Math.min(...corners.map((p) => p.x)) * scale : -limit,
      ),
      right = Math.min(
        w / 2,
        corners ? Math.max(...corners.map((p) => p.x)) * scale : limit,
      ),
      top = Math.max(
        -h / 2,
        corners ? -Math.max(...corners.map((p) => p.y)) * scale : -limit,
      ),
      bottom = Math.min(
        h / 2,
        corners ? -Math.min(...corners.map((p) => p.y)) * scale : limit,
      );
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 1.1;
    if (f.strength && f.type === "electric" && f.direction === "parallel") {
      for (
        let y = Math.ceil(top / spacing) * spacing;
        y <= bottom;
        y += spacing
      ) {
        for (let x = left; x < right; x += spacing) {
          const sample = fields.sample(f, toWorld(x + spacing / 2, y));
          if (!sample.strength) continue;
          ctx.globalAlpha = Math.min(
            1,
            0.18 + 0.82 * Math.sqrt(Math.abs(sample.strength / f.strength)),
          );
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(Math.min(right, x + spacing), y);
          ctx.stroke();
          arrow(x + spacing / 2, y, d, 0);
        }
      }
    } else if (f.strength && f.type === "electric") {
      const q = fields.local(f, { x: f.x + f.gradientX, y: f.y + f.gradientY }),
        ox = q.x * scale,
        oy = -q.y * scale;
      const rays = Math.min(64, Math.max(8, Math.round(650 / spacing))),
        reach = Math.hypot(w, h) + Math.hypot(ox, oy);
      for (let i = 0; i < rays; i++) {
        const angle = (i * Math.PI * 2) / rays,
          dx = Math.cos(angle),
          dy = Math.sin(angle);
        for (let r = 10; r < Math.min(reach, limit); r += spacing) {
          const x = ox + r * dx,
            y = oy + r * dy,
            sample = fields.sample(f, toWorld(x, y));
          if (!sample.strength) continue;
          ctx.globalAlpha = Math.min(
            1,
            0.18 + 0.82 * Math.sqrt(Math.abs(sample.strength / f.strength)),
          );
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + spacing * dx, y + spacing * dy);
          ctx.stroke();
          arrow(x, y, d * dx, d * dy);
        }
      }
    } else if (f.strength) {
      for (let i = Math.ceil(left / spacing); i * spacing <= right; i++)
        for (let j = Math.ceil(top / spacing); j * spacing <= bottom; j++) {
          const x = i * spacing,
            y = j * spacing,
            sample = fields.sample(f, toWorld(x, y));
          const density = Math.sqrt(Math.abs(sample.strength / f.strength));
          const hash =
            (((Math.sin(i * 127.1 + j * 311.7) * 43758.5453) % 1) + 1) % 1;
          if (!sample.strength || hash > density) continue;
          ctx.globalAlpha = 0.35 + 0.65 * density;
          if (sample.bz > 0) {
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, 2 * Math.PI);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(x - 3, y - 3);
            ctx.lineTo(x + 3, y + 3);
            ctx.moveTo(x + 3, y - 3);
            ctx.lineTo(x - 3, y + 3);
            ctx.stroke();
          }
        }
    }
    ctx.restore();
    ctx.font = "11px system-ui";
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(
      `${f.type === "electric" ? "E" : "B"} ${f.strength} ${f.type === "electric" ? "N/C" : "T"} · ${f.gradient}`,
      -w / 2 + 6,
      -h / 2 - 7,
    );
    ctx.restore();
  }
}
export class FieldDrag {
  constructor(fields, id, p, mode) {
    this.fields = fields;
    this.id = id;
    this.rebase(p, mode);
  }
  rebase(p, mode) {
    this.start = { ...p };
    this.original = { ...this.fields.regions.get(this.id) };
    this.mode = mode;
  }
  move(p, mode, snapping) {
    if (!this.fields.regions.has(this.id)) return;
    if (mode !== this.mode) this.rebase(p, mode);
    const f = this.original,
      quant = (v, step) => (snapping ? Math.round(v / step) * step : v);
    if (mode === "rotate") {
      const a = Math.atan2(this.start.y - f.y, this.start.x - f.x),
        b = Math.atan2(p.y - f.y, p.x - f.x);
      const degrees =
        Math.hypot(this.start.x - f.x, this.start.y - f.y) < 0.05
          ? (p.x - this.start.x) * 180
          : ((b - a) * 180) / Math.PI;
      const angle = quant(f.angle + degrees, 15);
      this.fields.update(this.id, {
        angle: ((((angle + 180) % 360) + 360) % 360) - 180,
      });
    } else if (mode === "resize") {
      const a = this.fields.local(f, this.start),
        b = this.fields.local(f, p);
      const width = Math.max(
        0.1,
        Math.min(
          50,
          quant(f.width + 2 * ((b.x - a.x) * (Math.sign(a.x) || 1)), 0.5),
        ),
      );
      const height = Math.max(
        0.1,
        Math.min(
          50,
          quant(f.height + 2 * ((b.y - a.y) * (Math.sign(a.y) || 1)), 0.5),
        ),
      );
      const diameter = Math.max(
        0.1,
        Math.min(
          50,
          quant(
            f.width +
              2 *
                ((b.x - a.x) *
                  (Math.hypot(a.x, a.y) > 1e-6
                    ? a.x / Math.hypot(a.x, a.y)
                    : 1) +
                  (b.y - a.y) *
                    (Math.hypot(a.x, a.y) > 1e-6
                      ? a.y / Math.hypot(a.x, a.y)
                      : 0)),
            0.5,
          ),
        ),
      );
      this.fields.update(
        this.id,
        f.shape === "circle" ? { width: diameter } : { width, height },
      );
    } else
      this.fields.update(this.id, {
        x: quant(f.x + p.x - this.start.x, 0.5),
        y: quant(f.y + p.y - this.start.y, 0.5),
      });
  }
}
