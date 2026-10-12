// Developer schemes. A scheme is a set of changes to the defaults in
// theme.js: colours for each theme, values of the size and choice tokens, and
// custom CSS. No DOM: the developer options apply schemes to the page, and
// tests check this file from Node.
//
// A scheme as stored and exported:
//   { physiumScheme: 1, name, light: { token: "#rrggbb" }, dark: { … },
//     values: { token: number | string }, css: "" }
// Only tokens that differ from theme.js are kept.
import { COLOURS, SIZES, CHOICES, CUSTOM_CSS, FONTS } from "./theme.js";

const colourNames = new Set(COLOURS.map((t) => t.name));
const sizes = new Map(SIZES.map((t) => [t.name, t]));
const choices = new Map(CHOICES.map((t) => [t.name, t]));
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

// The options of a choice token: its own list, or the fonts.
export const optionsOf = (token) =>
  token.fonts ? ["default", ...FONTS.map((f) => f.id)] : token.options;

export function emptyScheme(name = "Untitled") {
  return {
    physiumScheme: 1,
    name,
    light: {},
    dark: {},
    values: {},
    css: CUSTOM_CSS,
  };
}

// A scheme read from a file or from storage, checked and with values equal
// to the defaults dropped. Throws an Error naming the first problem.
export function checkScheme(input) {
  if (!input || typeof input !== "object" || input.physiumScheme !== 1)
    throw new Error("This file is not a Physium developer scheme.");
  const name = String(input.name ?? "").trim() || "Imported scheme";
  const out = emptyScheme(name.slice(0, 60));
  for (const mode of ["light", "dark"]) {
    const given = input[mode] ?? {};
    if (typeof given !== "object")
      throw new Error(`The ${mode} colours must be an object.`);
    for (const [token, value] of Object.entries(given)) {
      if (!colourNames.has(token))
        throw new Error(`Unknown colour token "${token}".`);
      if (typeof value !== "string" || !HEX.test(value))
        throw new Error(`Colour "${token}" (${mode}) must be a hex colour.`);
      const base = COLOURS.find((t) => t.name === token)[mode];
      if (value.toLowerCase() !== base.toLowerCase())
        out[mode][token] = value.toLowerCase();
    }
  }
  for (const [token, value] of Object.entries(input.values ?? {})) {
    if (sizes.has(token)) {
      const t = sizes.get(token);
      if (typeof value !== "number" || !Number.isFinite(value))
        throw new Error(`"${token}" must be a number.`);
      if (value < t.min || value > t.max)
        throw new Error(`"${token}" must be from ${t.min} to ${t.max}.`);
      if (value !== t.value) out.values[token] = value;
    } else if (choices.has(token)) {
      const t = choices.get(token);
      if (!optionsOf(t).includes(value))
        throw new Error(`"${token}" cannot be "${value}".`);
      if (value !== t.value) out.values[token] = value;
    } else throw new Error(`Unknown token "${token}".`);
  }
  if (input.css !== undefined && typeof input.css !== "string")
    throw new Error("The custom CSS must be text.");
  out.css = input.css ?? CUSTOM_CSS;
  return out;
}

// Whether a scheme changes anything.
export const isDefault = (scheme) =>
  !Object.keys(scheme.light).length &&
  !Object.keys(scheme.dark).length &&
  !Object.keys(scheme.values).length &&
  scheme.css === CUSTOM_CSS;

// ---------------------------------------------------------------- code

// The scheme as the text of theme.js's COLOURS, SIZES, CHOICES and
// CUSTOM_CSS, laid out as Prettier lays them out: pasted over those
// declarations it makes the scheme the default. A test checks that the
// empty scheme reproduces theme.js exactly.
// Prettier's choice of quotes: the kind that needs fewer escapes.
function quote(s) {
  const doubles = s.split('"').length,
    singles = s.split("'").length;
  if (doubles <= singles) return JSON.stringify(s);
  return "'" + s.replace(/[\\']/g, (m) => "\\" + m) + "'";
}
const literal = (v) => (typeof v === "string" ? quote(v) : String(v));

function property(key, value, indent) {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    const flat = `${pad}${key}: [${value.map(literal).join(", ")}],`;
    if (flat.length <= 80) return flat;
    return [
      `${pad}${key}: [`,
      ...value.map((v) => `${pad}  ${literal(v)},`),
      `${pad}],`,
    ].join("\n");
  }
  const line = `${pad}${key}: ${literal(value)},`;
  return line.length <= 80 ? line : `${pad}${key}:\n${pad}  ${literal(value)},`;
}
function block(name, entries) {
  return [
    `export const ${name} = [`,
    ...entries.map((entry) =>
      [
        "  {",
        ...Object.entries(entry).map(([k, v]) => property(k, v, 4)),
        "  },",
      ].join("\n"),
    ),
    "];",
  ].join("\n");
}
function cssCode(css) {
  if (!css) return 'export const CUSTOM_CSS = "";';
  const escaped = css.replace(/[\\`]|\$\{/g, (m) => "\\" + m);
  return "export const CUSTOM_CSS = `" + escaped + "`;";
}

export function themeCode(scheme) {
  const colours = COLOURS.map((t) => ({
    ...t,
    light: scheme.light[t.name] ?? t.light,
    dark: scheme.dark[t.name] ?? t.dark,
  }));
  const withValue = (t) => ({ ...t, value: scheme.values[t.name] ?? t.value });
  return [
    block("COLOURS", colours),
    "",
    "// Non-colour tokens. `value` is the default; sliders use min/max/step.",
    block("SIZES", SIZES.map(withValue)),
    "",
    "// Tokens with a fixed set of values (`fonts: true`: one of FONTS, or",
    '// "default" for the font each part of the page was designed with).',
    block("CHOICES", CHOICES.map(withValue)),
    "",
    "// CSS applied after everything else when a developer scheme is on.",
    cssCode(scheme.css),
  ].join("\n");
}
