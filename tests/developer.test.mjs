// Developer schemes (src/site/scheme.js, surface.js, canvas-style.js): a
// scheme is checked strictly, the empty scheme changes nothing, "Copy as
// code" reproduces theme.js exactly, and changed tokens produce CSS.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CHOICES,
  COLOURS,
  FONTS,
  SIZES,
  setOverrides,
  value,
} from "../src/site/theme.js";
import {
  checkScheme,
  emptyScheme,
  isDefault,
  optionsOf,
  themeCode,
} from "../src/site/scheme.js";
import { fontFaces, surfaceCss } from "../src/site/surface.js";
import { canvasFont } from "../src/site/canvas-style.js";
import { iconWeights } from "../src/site/icons.js";

const root = new URL("../", import.meta.url);
// The values the stylesheets are written for (`plain`, else the default).
const defaults = Object.fromEntries(
  [...SIZES, ...CHOICES].map((t) => [t.name, t.plain ?? t.value]),
);
const colours = (name) => {
  const t = COLOURS.find((c) => c.name === name);
  return { light: t.light, dark: t.dark };
};
const css = (values) =>
  surfaceCss((n) => ({ ...defaults, ...values })[n], {
    colours,
    fontRoot: "/vendor/fonts/",
  });

test("Copy as code of the empty scheme is theme.js exactly", async () => {
  const source = await readFile(new URL("src/site/theme.js", root), "utf8");
  assert.ok(source.includes(themeCode(emptyScheme())));
});

test("Copy as code carries a scheme's values", () => {
  const code = themeCode(
    checkScheme({
      physiumScheme: 1,
      name: "x",
      light: { ink: "#112233" },
      values: { "radius-button": 12, shadow: "hard" },
      css: "a { color: red; }",
    }),
  );
  assert.match(code, /name: "ink",\n {4}group: "Page",\n {4}light: "#112233",/);
  assert.match(code, /name: "radius-button",[^}]*value: 12,/);
  assert.match(code, /name: "shadow",[^}]*value: "hard",/);
  assert.match(code, /export const CUSTOM_CSS = `a \{ color: red; \}`;/);
});

test("schemes are checked strictly and drop default values", () => {
  const ok = checkScheme({
    physiumScheme: 1,
    name: "Mine",
    light: { ink: COLOURS.find((t) => t.name === "ink").light, line: "#ABCDEF" },
    dark: {},
    values: { "border-width": 1, "icon-weight": "bold" },
  });
  assert.deepEqual(ok.light, { line: "#abcdef" });
  assert.deepEqual(ok.values, { "icon-weight": "bold" });
  assert.ok(isDefault(emptyScheme()));
  const bad = (scheme, pattern) =>
    assert.throws(
      () => checkScheme({ physiumScheme: 1, name: "b", ...scheme }),
      pattern,
    );
  assert.throws(() => checkScheme({ name: "no marker" }), /not a Physium/);
  bad({ light: { nope: "#000000" } }, /Unknown colour token "nope"/);
  bad({ light: { ink: "red" } }, /must be a hex colour/);
  bad({ values: { "radius-button": 99 } }, /from 0 to 32/);
  bad({ values: { "radius-button": "7" } }, /must be a number/);
  bad({ values: { shadow: "glow" } }, /cannot be "glow"/);
  bad({ values: { "font-ui": "comic" } }, /cannot be "comic"/);
  bad({ values: { what: 1 } }, /Unknown token "what"/);
  bad({ css: 3 }, /must be text/);
});

test("every choice's default is one of its options", () => {
  for (const t of CHOICES) assert.ok(optionsOf(t).includes(t.value), t.name);
  for (const t of SIZES)
    assert.ok(t.value >= t.min && t.value <= t.max, t.name);
  // The icon-weight choice lists exactly the bundled weights.
  assert.deepEqual(
    optionsOf(CHOICES.find((t) => t.name === "icon-weight")),
    iconWeights,
  );
});

test("the values the stylesheets are written for add no CSS, and canvas fonts are left alone", () => {
  assert.equal(css({}), "");
  setOverrides();
  assert.equal(
    canvasFont("600 10.5px system-ui,sans-serif"),
    "600 10.5px system-ui,sans-serif",
  );
  assert.equal(value("canvas-line"), 1);
});

test("changed tokens produce override rules", () => {
  const out = css({
    "radius-button": 32,
    shadow: "none",
    "toggle-style": "switch",
    "page-pattern": "noise",
    "canvas-pattern": "graph",
    "font-ui": "inter",
    "font-numbers": "plex-mono",
    "header-style": "floating",
  });
  // Presets are cards, so the button radius leaves them alone.
  assert.match(
    out,
    /button:not\(\.preset\), \.button-link \{ border-radius: 999px !important; \}/,
  );
  // A floating header leaves the canvas running up behind it.
  assert.doesNotMatch(out, /main canvas[^{]*\{[^}]*margin-top/);
  assert.match(out, /box-shadow: none !important/);
  assert.match(out, /appearance: none !important/);
  assert.match(out, /data:image\/svg\+xml/);
  assert.match(
    out,
    /@font-face \{ font-family: "Physium Inter"; src: url\("\/vendor\/fonts\/inter\.woff2"\)/,
  );
  assert.match(out, /font-variant-numeric: tabular-nums/);
  assert.match(out, /header \{[^}]*position: fixed/);
  // No colour literal: patterns use the pattern tokens.
  assert.doesNotMatch(out.replace(/data:[^")]*/g, ""), /#[0-9a-f]{3,8}\b/i);
});

test("canvas fonts follow the scheme", () => {
  setOverrides({
    values: { "font-canvas": "jetbrains-mono", "font-size-canvas": 150 },
  });
  assert.equal(
    canvasFont("600 10px system-ui,sans-serif"),
    '600 15.00px "Physium JetBrains Mono", system-ui, sans-serif',
  );
  setOverrides({ values: { "font-weight-canvas": 400 } });
  assert.equal(
    canvasFont("bold 12px ui-monospace"),
    "400 12.00px ui-monospace",
  );
  setOverrides();
});

test("every vendored font file and licence exists", async () => {
  for (const font of FONTS.filter((f) => f.file)) {
    for (const file of [font.file, font.bold].filter(Boolean))
      await readFile(new URL("vendor/fonts/" + file, root));
    assert.equal(fontFaces([font.id], "/f/").length, font.bold ? 2 : 1);
  }
  const notice = await readFile(
    new URL("vendor/fonts/NOTICE.txt", root),
    "utf8",
  );
  for (const font of FONTS.filter((f) => f.file))
    assert.ok(notice.includes(font.file), font.file);
});

test("built-in schemes are valid and readable in both themes", async () => {
  const { PRESETS } = await import("../src/site/scheme-presets.js");
  const { COLOURS } = await import("../src/site/theme.js");
  const { checkScheme } = await import("../src/site/scheme.js");
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const [r, g, b] = c.map((v) =>
      v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const { CUSTOM_CSS } = await import("../src/site/theme.js");
  assert.ok(PRESETS.length >= 20);
  assert.equal(new Set(PRESETS.map((p) => p.name)).size, PRESETS.length);
  for (const preset of PRESETS) {
    const scheme = checkScheme(preset);
    // Colours only: nothing else about the site changes.
    assert.deepEqual(scheme.values, {}, `${preset.name} changes more than colour`);
    assert.equal(scheme.css, CUSTOM_CSS, `${preset.name} adds CSS`);
    for (const mode of ["light", "dark"]) {
      const col = (name) =>
        (preset[mode][name] ??
          COLOURS.find((t) => t.name === name)[mode]).slice(0, 7);
      const at = `${preset.name} (${mode})`;
      for (const bg of ["canvas-bg", "panel"]) {
        assert.ok(ratio(col("ink"), col(bg)) >= 7, `${at}: ink on ${bg}`);
        // Secondary text: at least as readable as theme.js's own (3.76:1).
        assert.ok(ratio(col("ink-soft"), col(bg)) >= 3.7, `${at}: ink-soft on ${bg}`);
        assert.ok(ratio(col("accent-text"), col(bg)) >= 4.5, `${at}: accent-text on ${bg}`);
      }
      assert.ok(ratio(col("ink"), col("accent-soft")) >= 4.5, `${at}: ink on accent-soft`);
      assert.ok(ratio(col("on-colour"), col("accent")) >= 4.5, `${at}: text on accent`);
      assert.ok(ratio(col("on-colour"), col("danger")) >= 4.5, `${at}: text on danger`);
      // Velocity and force arrows must stay distinct, and visible on the page.
      assert.notEqual(col("vector-velocity"), col("vector-force"), at);
      assert.notEqual(col("charge-positive"), col("charge-negative"), at);
      for (const k of ["vector-velocity", "vector-force"])
        assert.ok(ratio(col(k), col("canvas-bg")) >= 3, `${at}: ${k} on the page`);
    }
    assert.ok(Object.keys(scheme.light).length + Object.keys(scheme.dark).length);
  }
});
