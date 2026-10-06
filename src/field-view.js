export function drawFields(ctx, fields, screen, scale, selected) {
  for (const f of fields.regions.values()) {
    const p = screen(f),
      w = f.width * scale,
      h = f.height * scale;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((-f.angle * Math.PI) / 180);
    ctx.beginPath();
    if (f.shape === "rectangle") ctx.rect(-w / 2, -h / 2, w, h);
    else ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, 2 * Math.PI);
    ctx.fillStyle = f.type === "electric" ? "#dea73920" : "#9874cb20";
    ctx.fill();
    ctx.strokeStyle = f.type === "electric" ? "#ae7d24" : "#8060ae";
    ctx.lineWidth = selected(f.id) ? 2.5 : 1;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = "16px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let x = -w / 2 + 24; x < w / 2; x += 48)
      for (let y = -h / 2 + 24; y < h / 2; y += 48) {
        if (!f.strength) continue;
        if (f.type === "magnetic")
          ctx.fillText(f.strength >= 0 ? "⊙" : "⊗", x, y);
        else {
          const d = f.strength >= 0 ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(x - 12 * d, y);
          ctx.lineTo(x + 12 * d, y);
          ctx.moveTo(x + 7 * d, y - 4);
          ctx.lineTo(x + 12 * d, y);
          ctx.lineTo(x + 7 * d, y + 4);
          ctx.stroke();
        }
      }
    ctx.restore();
    ctx.font = "11px system-ui";
    ctx.textAlign = "left";
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(
      `${f.type === "electric" ? "E" : "B"} ${f.strength} ${f.type === "electric" ? "N/C" : "T"}`,
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
        Math.min(50, quant(f.width + 2 * (Math.abs(b.x) - Math.abs(a.x)), 0.5)),
      );
      const height = Math.max(
        0.1,
        Math.min(
          50,
          quant(f.height + 2 * (Math.abs(b.y) - Math.abs(a.y)), 0.5),
        ),
      );
      const diameter = Math.max(
        0.1,
        Math.min(
          50,
          quant(
            f.width + 2 * (Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y)),
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
