// The CSS that applies a developer scheme's size and choice tokens (shape,
// surface, density, patterns, fonts, icons). No DOM: given the token values,
// it returns text for a <style> element. A token at its theme.js default adds
// nothing, so with no scheme the stylesheets are exactly as written; the
// override rules use !important because each page's own rules are more
// specific. Colours are applied separately (as custom properties).
import { SIZES, CHOICES, FONTS } from "./theme.js";

const defaults = new Map([...SIZES, ...CHOICES].map((t) => [t.name, t.value]));

// Groups of elements that share a token.
export const PARTS = {
  buttons: "button",
  inputs:
    'input[type="number"], input[type="text"], input[type="search"], select, textarea',
  panels:
    "#settings-panel, #keys-panel, #presets-panel, #clear-confirm, #material-menu, .nav-menu, .category-menu, .dev-window",
  cards:
    ".camera-controls, #selection, .edit-tools, .tools, .fl-toolbar, .fl-modes, .fl-hint, .fl-display, .cl-panel, .cl-note, .ol-panel, .tool-settings, .vector-legend, .energy-panel, .card",
  toolbars: ".edit-tools, .tools, .fl-toolbar, .cl-warning",
  canvas: "main canvas:not(.preset-preview)",
  headings: "h1, h2, h3, h4, .brand, summary",
  numbers:
    'output, input[type="number"], .prop-value, .num, .status, #dimensions, .vector-legend small, .energy-total, .fl-check small, [id^="readout-"]',
  code: "code, pre, kbd, textarea, .key",
};

const SHADOWS = {
  none: "none",
  hard: "4px 4px 0 var(--panel-shadow)",
  raised: "0 1px 2px var(--panel-shadow), 0 18px 50px var(--panel-shadow)",
};

// Background patterns as CSS images, in colour `c` (a CSS colour) with
// spacing `s` px. Noise is an SVG turbulence tinted with `rgb` (0–1 each).
function pattern(kind, c, s, rgb, alpha) {
  const lines = (angle) =>
    `repeating-linear-gradient(${angle}, ${c} 0 1px, transparent 1px ${s}px)`;
  switch (kind) {
    case "dots":
      return {
        image: `radial-gradient(circle, ${c} 1.2px, transparent 1.6px)`,
        size: `${s}px ${s}px`,
      };
    case "grid":
      return {
        image: `${lines("0deg")}, ${lines("90deg")}`,
        size: "auto",
      };
    case "graph":
      return {
        image: [
          `repeating-linear-gradient(0deg, ${c} 0 1px, transparent 1px ${s * 5}px)`,
          `repeating-linear-gradient(90deg, ${c} 0 1px, transparent 1px ${s * 5}px)`,
          `repeating-linear-gradient(0deg, color-mix(in srgb, ${c} 45%, transparent) 0 1px, transparent 1px ${s}px)`,
          `repeating-linear-gradient(90deg, color-mix(in srgb, ${c} 45%, transparent) 0 1px, transparent 1px ${s}px)`,
        ].join(", "),
        size: "auto",
      };
    case "diagonal":
      return { image: lines("45deg"), size: "auto" };
    case "isometric":
      return {
        image: `${lines("30deg")}, ${lines("150deg")}, ${lines("90deg")}`,
        size: "auto",
      };
    case "noise": {
      const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='${s * 6}' height='${s * 6}'>` +
        `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${(
          1.6 / s
        ).toFixed(3)}' numOctaves='2' stitchTiles='stitch'/>` +
        `<feColorMatrix values='0 0 0 0 ${rgb[0]} 0 0 0 0 ${rgb[1]} 0 0 0 0 ${rgb[2]} 0 0 0 ${(
          alpha * 1.6
        ).toFixed(3)} 0'/></filter>` +
        `<rect width='100%' height='100%' filter='url(%23n)'/></svg>`;
      return {
        image: `url("data:image/svg+xml,${svg.replace(/"/g, "'").replace(/</g, "%3C").replace(/>/g, "%3E")}")`,
        size: `${s * 6}px ${s * 6}px`,
      };
    }
  }
  return null;
}
const rgbOf = (hex) => {
  const h = hex.length < 7 ? hex.replace(/\w/g, (d) => d + d) : hex;
  return [1, 3, 5].map((i) =>
    (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(3),
  );
};

export const fontStack = (id) => {
  const font = FONTS.find((f) => f.id === id);
  if (!font) return null;
  return font.stack ?? `"Physium ${font.label}", system-ui, sans-serif`;
};
// @font-face rules for the vendored fonts in `ids`, from `fontRoot` (the URL
// of vendor/fonts/).
export function fontFaces(ids, fontRoot) {
  const out = [];
  for (const id of new Set(ids)) {
    const font = FONTS.find((f) => f.id === id);
    if (!font?.file) continue;
    const face = (file, weight) =>
      `@font-face { font-family: "Physium ${font.label}"; src: url("${fontRoot}${file}") format("woff2"); font-weight: ${weight}; font-display: swap; }`;
    out.push(face(font.file, font.weights));
    if (font.bold) out.push(face(font.bold, "600 900"));
  }
  return out;
}

// `get(name)` gives a token's value in the scheme; `colours(name)` gives
// { light, dark } for a colour token. Returns the CSS text.
export function surfaceCss(get, { colours, fontRoot }) {
  const changed = (name) => get(name) !== defaults.get(name);
  const rules = [];
  const rule = (selector, body) => rules.push(`${selector} { ${body} }`);
  const imp = (decls) =>
    decls
      .filter(Boolean)
      .map((d) => d + " !important;")
      .join(" ");
  const px = (name) => {
    const v = get(name);
    return v >= 32 && name.startsWith("radius-") ? "999px" : v + "px";
  };

  // Shape.
  const radius = {
    "radius-button": PARTS.buttons,
    "radius-input": PARTS.inputs,
    "radius-panel": PARTS.panels,
    "radius-card": PARTS.cards,
    "radius-canvas": PARTS.canvas,
  };
  for (const [name, selector] of Object.entries(radius))
    if (changed(name)) rule(selector, imp([`border-radius: ${px(name)}`]));
  const bordered = [
    PARTS.buttons,
    PARTS.inputs,
    PARTS.panels,
    PARTS.cards,
  ].join(", ");
  if (changed("border-width") || changed("border-style"))
    rule(
      bordered,
      imp([
        changed("border-width") && `border-width: ${get("border-width")}px`,
        changed("border-style") && `border-style: ${get("border-style")}`,
      ]),
    );

  // Surface.
  if (changed("shadow"))
    rule(
      [PARTS.panels, PARTS.toolbars].join(", "),
      imp([`box-shadow: ${SHADOWS[get("shadow")]}`]),
    );
  if (changed("panel-opacity") || changed("panel-blur"))
    rule(
      [PARTS.panels, PARTS.cards].join(", "),
      imp([
        changed("panel-opacity") &&
          `background-color: color-mix(in srgb, var(--panel) ${get("panel-opacity")}%, transparent)`,
        changed("panel-blur") &&
          `backdrop-filter: blur(${get("panel-blur")}px)`,
      ]),
    );
  // Coloured buttons (Run, Clear, the confirm button) keep their colour.
  const plain =
    'button:not(.active):not([aria-pressed="true"]):not(#pause):not(#clear):not(.danger)';
  if (get("button-style") === "outlined")
    rule(plain, imp(["background: transparent", "border-color: var(--line)"]));
  if (get("button-style") === "flat")
    rule(plain, imp(["background: transparent", "border-color: transparent"]));
  if (get("toggle-style") === "switch") {
    const box = 'input[type="checkbox"]:not(.icon-toggle *, .sr-only)';
    rule(
      box,
      imp([
        "appearance: none",
        "width: 26px",
        "height: 15px",
        "flex: 0 0 26px",
        "border-radius: 999px",
        "background-color: var(--line)",
        "background-image: radial-gradient(circle, var(--panel) 5px, transparent 5.5px)",
        "background-size: 15px 15px",
        "background-repeat: no-repeat",
        "background-position: left center",
        "transition: background-position 0.15s, background-color 0.15s",
        "cursor: pointer",
      ]),
    );
    rule(
      `${box}:checked`,
      imp([
        "background-color: var(--control-accent)",
        "background-position: right center",
      ]),
    );
  }
  if (get("density") !== "normal") {
    const compact = get("density") === "compact";
    rule(
      `${PARTS.buttons}, ${PARTS.inputs}`,
      imp([
        `padding-top: ${compact ? 2 : 9}px`,
        `padding-bottom: ${compact ? 2 : 9}px`,
        compact ? "min-height: 0" : "min-height: 36px",
      ]),
    );
    rule(
      ".prop-row, .setting-toggle, .select-row, .fl-check",
      imp([`margin-block: ${compact ? 2 : 10}px`]),
    );
    rule(
      ".playback, .tools, .fl-toolbar, .edit-tools, .camera-controls",
      imp([`gap: ${compact ? 1 : 9}px`]),
    );
  }
  const slider = 'input[type="range"]';
  if (get("slider-shape") !== "default") {
    const shape = get("slider-shape"),
      thin = shape === "thin",
      square = shape === "square";
    rule(
      slider,
      imp([
        "appearance: none",
        `height: ${thin ? 2 : 6}px`,
        `border-radius: ${square ? 1 : 999}px`,
        "background: var(--line)",
      ]),
    );
    const thumb = imp([
      "appearance: none",
      `width: ${thin ? 12 : 16}px`,
      `height: ${thin ? 12 : 16}px`,
      `border-radius: ${square ? 3 : 999}px`,
      "background: var(--control-accent)",
      "border: 2px solid var(--panel)",
    ]);
    rule(`${slider}::-webkit-slider-thumb`, thumb);
    rule(`${slider}::-moz-range-thumb`, thumb);
  }
  const focus = ":focus-visible";
  if (get("focus-ring") === "thick")
    rule(
      focus,
      imp(["outline: 3px solid var(--focus-ring)", "outline-offset: 2px"]),
    );
  if (get("focus-ring") === "glow")
    rule(
      focus,
      imp([
        "outline: none",
        "box-shadow: 0 0 0 4px color-mix(in srgb, var(--focus-ring) 45%, transparent)",
      ]),
    );
  if (get("focus-ring") === "underline")
    rule(
      focus,
      imp(["outline: none", "box-shadow: inset 0 -3px 0 var(--focus-ring)"]),
    );
  if (get("header-style") === "flat")
    rule("header", imp(["border-bottom-color: transparent"]));
  if (get("header-style") === "tinted")
    rule(
      "header",
      imp([
        "background: color-mix(in srgb, var(--panel), var(--control-accent) 14%)",
      ]),
    );
  if (get("header-style") === "floating") {
    rule(
      "header",
      imp([
        "position: relative",
        "z-index: 12",
        "margin: 6px 8px 0",
        "border: 1px solid var(--line)",
        "border-radius: 12px",
        "box-shadow: 0 6px 24px var(--panel-shadow)",
      ]),
    );
    rule(
      "main",
      imp(["height: calc(100dvh - var(--header-h) * var(--ui-scale) - 6px)"]),
    );
  }

  // Patterns: the page behind everything, and the canvas behind the scene
  // (the scene canvases clear to transparent each frame).
  for (const [where, selector] of [
    ["page", "body, .doc-page main"],
    ["canvas", PARTS.canvas],
  ]) {
    const kind = get(`${where}-pattern`);
    if (kind === "none") continue;
    const strength = get(`${where}-pattern-strength`),
      size = get(`${where}-pattern-size`),
      token = `pattern-${where}`,
      c = `color-mix(in srgb, var(--${token}) ${strength}%, transparent)`;
    for (const mode of ["light", "dark"]) {
      const p = pattern(
        kind,
        c,
        size,
        rgbOf(colours(token)[mode]),
        strength / 100,
      );
      const scope = mode === "dark" ? ':root[data-theme="dark"] ' : "";
      rule(
        selector
          .split(", ")
          .map((s) => scope + s)
          .join(", "),
        imp([`background-image: ${p.image}`, `background-size: ${p.size}`]),
      );
    }
  }

  // Fonts, per part of the page.
  const used = [];
  const area = (key, selector, extra) => {
    const family = get(`font-${key}`);
    const decls = [];
    if (family !== "default") {
      decls.push(`font-family: ${fontStack(family)}`);
      used.push(family);
    }
    if (key !== "ui" && changed(`font-size-${key}`))
      decls.push(`font-size: ${get(`font-size-${key}`)}px`);
    if (changed(`font-weight-${key}`))
      decls.push(`font-weight: ${get(`font-weight-${key}`)}`);
    if (changed(`letter-spacing-${key}`))
      decls.push(`letter-spacing: ${get(`letter-spacing-${key}`)}em`);
    if (decls.length) rule(selector, imp([...decls, ...(extra || [])]));
  };
  if (changed("font-size"))
    rule(":root", imp([`font-size: ${get("font-size")}px`]));
  area("ui", ":root, body");
  area("heading", PARTS.headings);
  area("numbers", PARTS.numbers, ["font-variant-numeric: tabular-nums"]);
  area("code", PARTS.code);
  if (get("font-canvas") !== "default") used.push(get("font-canvas"));

  // Icons.
  if (changed("icon-size"))
    rule(".ui-icon", imp([`zoom: ${get("icon-size") / 100}`]));
  // Phosphor icons are filled shapes, so a stroke round each one thickens
  // it; the icons are 256 units across.
  if (changed("icon-stroke"))
    rule(
      ".ui-icon path",
      imp([
        "stroke: currentColor",
        `stroke-width: ${(get("icon-stroke") * 2.56).toFixed(2)}`,
        "stroke-linejoin: round",
        "paint-order: stroke",
      ]),
    );

  return [...fontFaces(used, fontRoot), ...rules].join("\n");
}
