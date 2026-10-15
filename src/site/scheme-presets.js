// Built-in colour schemes for the developer options: ready-made palettes for
// the whole site, offered beside the schemes the author saves. They change
// colours only (no fonts, sizes, shapes or patterns). Picking one loads a
// copy as the working scheme, which can then be changed and saved under a
// new name; the built-in itself never changes. No DOM. Every one is checked
// by checkScheme and for readable contrast in tests/developer.test.mjs.
//
// Each theme of a scheme is written as a few hand-picked colours (page,
// panels, text, accent, and the bodies and physics colours that give it its
// character); the rest (borders, secondary text, grid, hover) are mixed from
// those. Where a picked colour would be hard to read, it is moved towards
// the text colour until it is readable, so every scheme passes the same
// contrast rules as theme.js. Velocity and force, + and −, always stay
// different colours.

// ---------------------------------------------------------------- colour

const parse = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex = (rgb) =>
  "#" +
  rgb
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
// `a` moved a fraction t of the way to `b`.
const mix = (a, b, t) => {
  const p = parse(a),
    q = parse(b);
  return hex(p.map((v, i) => v + (q[i] - v) * t));
};
const luminance = (h) => {
  const [r, g, b] = parse(h)
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
// `fg` moved towards `to` in small steps until it reaches `min` against
// every colour in `against`.
function readable(fg, against, min, to) {
  let c = fg;
  for (let t = 0; t <= 1.0001; t += 0.04) {
    c = mix(fg, to, t);
    if (against.every((bg) => contrast(c, bg) >= min)) return c;
  }
  return to;
}
const WHITE = "#ffffff",
  BLACK = "#000000";

// ---------------------------------------------------------------- building

// One theme of a scheme from its picked colours:
//   bg, panel, ink        page, panels, text
//   accent                filled buttons (white text goes on it)
//   accentText            links, selection, sliders (default: accent)
//   bodies                [ball, block, wedge, structure, orbit-body]
//   extra                 any other tokens, by name (physics colours)
function theme({ bg, panel, ink, accent, accentText, bodies, extra = {} }) {
  const dark = luminance(bg) < 0.2,
    away = dark ? BLACK : WHITE;
  const out = {
    "canvas-bg": bg,
    panel,
    ink: readable(ink, [bg, panel], 7, dark ? WHITE : BLACK),
    line: mix(panel, ink, dark ? 0.2 : 0.18),
    "canvas-grid": mix(bg, ink, dark ? 0.08 : 0.09),
    "canvas-ground": mix(bg, accentText ?? accent, 0.12),
    shadow: (dark ? "#000000" : mix(ink, BLACK, 0.3)) + (dark ? "55" : "24"),
    accent: readable(accent, [WHITE], 4.6, BLACK),
  };
  out["ink-soft"] = readable(mix(bg, out.ink, 0.6), [bg, panel], 4.5, out.ink);
  out["accent-text"] = readable(accentText ?? accent, [bg, panel], 4.6, out.ink);
  out["accent-soft"] = readable(
    mix(panel, out["accent-text"], dark ? 0.22 : 0.14),
    [out.ink],
    4.6,
    away,
  );
  if (bodies) {
    const [ball, block, wedge, structure, orbit] = bodies;
    Object.assign(out, {
      "body-ball": ball,
      "body-block": block,
      "body-wedge": wedge,
      structure,
      "orbit-body": orbit ?? wedge,
    });
  }
  Object.assign(out, extra);
  // Arrows, fields and charges must stand out from the page.
  for (const key of [
    "vector-velocity",
    "vector-force",
    "field-electric",
    "field-magnetic",
    "charge-positive",
    "charge-negative",
    "circuit-current",
  ])
    if (out[key]) out[key] = readable(out[key], [bg], 3, out.ink);
  return out;
}

const scheme = (name, description, light, dark) => ({
  physiumScheme: 1,
  name,
  description,
  light: theme(light),
  dark: theme(dark),
  values: {},
});

// Physics colour sets used by several schemes. Each keeps velocity cool and
// force warm, + warm and − cool, so a picture reads the same way.
const NEON = {
  "vector-velocity": "#38e1ff",
  "vector-force": "#ff7b39",
  "field-electric": "#ffd23f",
  "field-magnetic": "#c08bff",
  "charge-positive": "#ff4f7b",
  "charge-negative": "#3fa2ff",
  "circuit-current": "#ffd23f",
  "circuit-dot": "#ff5ee0",
  "circuit-dot-electron": "#38e1ff",
  "circuit-glow": "#fff27a",
};

// ---------------------------------------------------------------- schemes

export const PRESETS = [
  scheme(
    "Ocean depths",
    "Sea-glass by day, deep water by night",
    {
      bg: "#e9f4f4",
      panel: "#f8fdfc",
      ink: "#123a45",
      accent: "#0e6a7a",
      bodies: ["#f2a65a", "#5aa9b8", "#9bd1c4", "#4f7f88", "#7fb7c9"],
    },
    {
      bg: "#06171f",
      panel: "#0c2530",
      ink: "#d8f1f2",
      accent: "#0e6a7a",
      accentText: "#4fd6d0",
      bodies: ["#f2a65a", "#3d8fa0", "#2f6f6a", "#5d8e96", "#2b6f86"],
      extra: { "vector-velocity": "#5fd3ff", "field-equipotential": "#56e3c1" },
    },
  ),
  scheme(
    "Outback",
    "Red earth, spinifex and a big blue sky",
    {
      bg: "#f6e8d8",
      panel: "#fff7ee",
      ink: "#3f2116",
      accent: "#b0431f",
      bodies: ["#e07a3a", "#7a9cc0", "#c9a45c", "#8b5a3c", "#c9733e"],
      extra: { "vector-velocity": "#2f6fb0" },
    },
    {
      bg: "#1e110c",
      panel: "#2c1912",
      ink: "#f6e2cc",
      accent: "#b0431f",
      accentText: "#f0915a",
      bodies: ["#e07a3a", "#6b8fb5", "#b38a45", "#9a6a49", "#b5562c"],
    },
  ),
  scheme(
    "Blueprint",
    "Drafting paper; white lines on blueprint blue in the dark",
    {
      bg: "#e8f0fb",
      panel: "#f6f9ff",
      ink: "#123566",
      accent: "#1d4f91",
      bodies: ["#f4b860", "#8db3e2", "#b7cdea", "#4c6f9e", "#9ab7dd"],
    },
    {
      bg: "#0f3566",
      panel: "#143f76",
      ink: "#f4f8ff",
      accent: "#0a2a54",
      accentText: "#ffffff",
      bodies: ["#ffd48a", "#bcd4f4", "#7ea6da", "#d6e4f7", "#5f8cc8"],
      extra: {
        "vector-velocity": "#9fe6ff",
        "vector-force": "#ffb36b",
        "charge-negative": "#9fd1ff",
      },
    },
  ),
  scheme(
    "Chalkboard",
    "A clean whiteboard, or chalk on a green board",
    {
      bg: "#f7f8f5",
      panel: "#ffffff",
      ink: "#1f2a26",
      accent: "#2f6b4f",
      bodies: ["#e9a64a", "#6f9fd8", "#a9d18e", "#6b7c73", "#9cc49a"],
    },
    {
      bg: "#22342b",
      panel: "#2b4036",
      ink: "#f5f2e7",
      accent: "#4b7a5d",
      accentText: "#f7e27a",
      bodies: ["#f6c27a", "#a9cdf2", "#d8ecc4", "#e9e4d2", "#b9d6a6"],
      extra: {
        "vector-velocity": "#9fd6ff",
        "vector-force": "#ffb38a",
        "charge-positive": "#ff9f9f",
        "charge-negative": "#a6c8ff",
      },
    },
  ),
  scheme(
    "Jacaranda",
    "Perth in November: purple blossom on grey",
    {
      bg: "#f4f0fa",
      panel: "#fdfbff",
      ink: "#2f2445",
      accent: "#6a48a3",
      bodies: ["#e8a3c9", "#8c86d8", "#b8d39a", "#7f7499", "#a58fd1"],
    },
    {
      bg: "#181322",
      panel: "#231b31",
      ink: "#efe8fa",
      accent: "#6a48a3",
      accentText: "#c8adf4",
      bodies: ["#e8a3c9", "#7d77c8", "#7f9a63", "#9a8fb3", "#7a5fb0"],
    },
  ),
  scheme(
    "Synthwave",
    "Hot pink and cyan on a violet night",
    {
      bg: "#fbf0fb",
      panel: "#fffaff",
      ink: "#2a1340",
      accent: "#c2177a",
      accentText: "#a3176e",
      bodies: ["#ff8ad4", "#6fc3ff", "#ffcf6b", "#7e5aa6", "#b98cff"],
    },
    {
      bg: "#140825",
      panel: "#1f0f36",
      ink: "#ffe9fb",
      accent: "#c2177a",
      accentText: "#ff5fc8",
      bodies: ["#ff5fc8", "#3fd2ff", "#ffb547", "#8d6bd6", "#ff7a59"],
      extra: NEON,
    },
  ),
  scheme(
    "Terminal",
    "Green phosphor on black; dot-matrix paper by day",
    {
      bg: "#f4f2e6",
      panel: "#fbfaf2",
      ink: "#1c2a1c",
      accent: "#2d7a2d",
      bodies: ["#c9a227", "#6b9a6b", "#a9c49a", "#5c6b5c", "#7fae7f"],
    },
    {
      bg: "#050a05",
      panel: "#0b140b",
      ink: "#b6ffb0",
      accent: "#1f7a2a",
      accentText: "#4dff6a",
      bodies: ["#ffcf3f", "#2ea84a", "#1d6b2c", "#3fa04f", "#2a8a3a"],
      extra: {
        "vector-velocity": "#7dff8a",
        "vector-force": "#ffb000",
        "field-electric": "#ffd84a",
        "field-magnetic": "#5ce1ff",
        "charge-positive": "#ff8a3d",
        "charge-negative": "#5ce1ff",
        "circuit-current": "#ffb000",
      },
    },
  ),
  scheme(
    "Solar",
    "The warm-paper and blue-teal palette programmers know as Solarized",
    {
      bg: "#fdf6e3",
      panel: "#fffbef",
      ink: "#073642",
      accent: "#268bd2",
      bodies: ["#b58900", "#268bd2", "#859900", "#657b83", "#2aa198"],
      extra: {
        "vector-velocity": "#268bd2",
        "vector-force": "#cb4b16",
        "field-magnetic": "#6c71c4",
        "charge-positive": "#dc322f",
      },
    },
    {
      bg: "#002b36",
      panel: "#073642",
      ink: "#eee8d5",
      accent: "#1f6fa8",
      accentText: "#2aa198",
      bodies: ["#b58900", "#268bd2", "#859900", "#839496", "#2aa198"],
      extra: {
        "vector-velocity": "#4fb3ff",
        "vector-force": "#ff7a3d",
        "field-magnetic": "#9d8cff",
        "charge-positive": "#ff6b5f",
      },
    },
  ),
  scheme(
    "Arctic",
    "Frost, glacier blue and the polar night",
    {
      bg: "#eef2f7",
      panel: "#fbfcfe",
      ink: "#2e3440",
      accent: "#3b6ea8",
      bodies: ["#d08770", "#81a1c1", "#a3be8c", "#6b778a", "#88c0d0"],
    },
    {
      bg: "#232833",
      panel: "#2e3440",
      ink: "#eceff4",
      accent: "#3b6ea8",
      accentText: "#88c0d0",
      bodies: ["#d08770", "#81a1c1", "#a3be8c", "#8a96ab", "#5e81ac"],
      extra: { "vector-velocity": "#88c0d0", "vector-force": "#d08770" },
    },
  ),
  scheme(
    "Vampire",
    "Gothic purples with a blood-red accent",
    {
      bg: "#f5f0f2",
      panel: "#fffbfc",
      ink: "#2b1520",
      accent: "#9b1b3a",
      bodies: ["#d9506b", "#8a7fb8", "#b9a3c4", "#6e5563", "#a35a7a"],
    },
    {
      bg: "#1a1320",
      panel: "#251b2e",
      ink: "#f8f2f8",
      accent: "#a51d3f",
      accentText: "#ff79c6",
      bodies: ["#ff5555", "#bd93f9", "#50fa7b", "#9a8aa8", "#6272a4"],
      extra: {
        "vector-velocity": "#8be9fd",
        "vector-force": "#ffb86c",
        "field-magnetic": "#bd93f9",
        "field-electric": "#f1fa8c",
      },
    },
  ),
  scheme(
    "Coral reef",
    "Living coral, turquoise water, a flash of yellow",
    {
      bg: "#fff1ec",
      panel: "#fffaf7",
      ink: "#14353b",
      accent: "#c2453a",
      accentText: "#0f7d80",
      bodies: ["#ff7f6b", "#2ec4c6", "#ffd166", "#5f8f8f", "#ff9e8a"],
    },
    {
      bg: "#071e24",
      panel: "#0d2c33",
      ink: "#e8fbf8",
      accent: "#c2453a",
      accentText: "#3fe0d0",
      bodies: ["#ff7f6b", "#1fa6aa", "#e8b84a", "#6fa3a3", "#ff9e8a"],
    },
  ),
  scheme(
    "Sunset",
    "Apricot, rose and dusky violet",
    {
      bg: "#fff1e8",
      panel: "#fffaf5",
      ink: "#3a1c33",
      accent: "#c2410c",
      accentText: "#b4235f",
      bodies: ["#ff9f5a", "#9c7ad6", "#ffc58a", "#8a5a6e", "#ff7a7a"],
      extra: { "vector-velocity": "#5a5fc8" },
    },
    {
      bg: "#1c1029",
      panel: "#2a1838",
      ink: "#ffeedd",
      accent: "#c2410c",
      accentText: "#ff9f7a",
      bodies: ["#ff9f5a", "#8a6ad0", "#e07a9a", "#a07a90", "#ff6f6f"],
      extra: { "vector-velocity": "#8fa8ff", "vector-force": "#ffb347" },
    },
  ),
  scheme(
    "Aurora",
    "Green and violet light over snow and starless sky",
    {
      bg: "#eef6f4",
      panel: "#fafefd",
      ink: "#122b2e",
      accent: "#1b7a62",
      accentText: "#6a3fb5",
      bodies: ["#f2b45a", "#7aa7e0", "#9be0c0", "#5a7a7a", "#8fd6b8"],
    },
    {
      bg: "#060d16",
      panel: "#0d1824",
      ink: "#e6fff7",
      accent: "#16795f",
      accentText: "#5cffb8",
      bodies: ["#ffc46b", "#6a8ff0", "#3fd69a", "#6f8fa0", "#a97bff"],
      extra: {
        "vector-velocity": "#7ad7ff",
        "field-magnetic": "#b98aff",
        "field-equipotential": "#5cffb8",
      },
    },
  ),
  scheme(
    "Sakura",
    "Cherry blossom pink on rice paper; plum at night",
    {
      bg: "#fdf1f3",
      panel: "#fffafb",
      ink: "#3a2229",
      accent: "#b3365e",
      bodies: ["#f7a1b8", "#9bb6e0", "#c9dfa8", "#8a6f77", "#e8a0b5"],
    },
    {
      bg: "#22141a",
      panel: "#301d25",
      ink: "#fdebf0",
      accent: "#a8325a",
      accentText: "#ff9fbf",
      bodies: ["#f7a1b8", "#7f9dcc", "#9cba7a", "#a38791", "#c46a8a"],
    },
  ),
  scheme(
    "Matcha",
    "Whisked green tea and steamed milk",
    {
      bg: "#f3f4e8",
      panel: "#fcfcf4",
      ink: "#26301c",
      accent: "#4f7a28",
      bodies: ["#d9b46a", "#8aa7a0", "#b5cf7e", "#7a7f62", "#9fbf6a"],
    },
    {
      bg: "#161a10",
      panel: "#20261a",
      ink: "#eef3df",
      accent: "#4f7a28",
      accentText: "#b5dc6e",
      bodies: ["#d9b46a", "#6f8f88", "#7fa04a", "#8c9174", "#6e9a3c"],
    },
  ),
  scheme(
    "Coffee house",
    "Crema, mocha and dark roast",
    {
      bg: "#f5ede4",
      panel: "#fcf7f1",
      ink: "#2e1d14",
      accent: "#7a4a2a",
      bodies: ["#c98f5a", "#8fa3b0", "#c9b48a", "#7a5f4c", "#a8774f"],
    },
    {
      bg: "#18110d",
      panel: "#241a14",
      ink: "#f3e6d8",
      accent: "#7a4a2a",
      accentText: "#e0a874",
      bodies: ["#d9995e", "#7a8f9c", "#a88a5a", "#8f7461", "#8a5a36"],
    },
  ),
  scheme(
    "Mint chocolate",
    "Peppermint green with cocoa brown",
    {
      bg: "#eaf7f1",
      panel: "#f8fffb",
      ink: "#3a2318",
      accent: "#6b3f26",
      accentText: "#1f7a5a",
      bodies: ["#7a4a2f", "#7fd1b3", "#c9ecd9", "#8a6a58", "#5fbf9a"],
    },
    {
      bg: "#1c130e",
      panel: "#291c15",
      ink: "#eafbf2",
      accent: "#2a7a5d",
      accentText: "#7fe8c0",
      bodies: ["#b07a52", "#5fbf9a", "#3f8a6c", "#9a7a66", "#7fe8c0"],
    },
  ),
  scheme(
    "Lemonade",
    "Sharp yellow, fresh and bright",
    {
      bg: "#fffbe0",
      panel: "#fffef4",
      ink: "#2e2a10",
      accent: "#8a6d00",
      accentText: "#7a6200",
      bodies: ["#ffd23f", "#6fb3e0", "#b6e07a", "#8a845c", "#ffe066"],
    },
    {
      bg: "#1a1806",
      panel: "#26230c",
      ink: "#fffbd6",
      accent: "#7a6200",
      accentText: "#ffe14d",
      bodies: ["#ffd23f", "#5a9ac8", "#8ab84a", "#a39c6a", "#e8c42f"],
    },
  ),
  scheme(
    "Bubblegum",
    "Playground pastels: pink, mint and sky",
    {
      bg: "#fdf0f7",
      panel: "#fffafd",
      ink: "#35203a",
      accent: "#c2378a",
      accentText: "#9a2f8a",
      bodies: ["#ff9ad5", "#8ad6ff", "#a8f0c8", "#a08aa8", "#ffc4e6"],
      extra: { "vector-velocity": "#2f7fd0" },
    },
    {
      bg: "#1e1424",
      panel: "#2b1d33",
      ink: "#fff0fb",
      accent: "#b3307f",
      accentText: "#ff9ad5",
      bodies: ["#ff9ad5", "#6fc3f0", "#7fe0b0", "#b39ac0", "#c48af0"],
      extra: { "vector-velocity": "#8ad6ff", "vector-force": "#ffb07a" },
    },
  ),
  scheme(
    "Forest floor",
    "Moss, bark, ferns and dappled light",
    {
      bg: "#eef0e4",
      panel: "#f9faf2",
      ink: "#1f2a1a",
      accent: "#3d6b2c",
      bodies: ["#c98a3e", "#7c95a8", "#93b06b", "#6b5a44", "#7da35a"],
    },
    {
      bg: "#10170e",
      panel: "#1a2316",
      ink: "#e9f0dc",
      accent: "#3d6b2c",
      accentText: "#a6d07a",
      bodies: ["#c98a3e", "#62798c", "#5f7f44", "#8a7558", "#4f7a36"],
    },
  ),
  scheme(
    "Mars",
    "Rust-red dust and a butterscotch sky",
    {
      bg: "#f7e6dc",
      panel: "#fff5ef",
      ink: "#3a1810",
      accent: "#a33a1a",
      bodies: ["#e07a4a", "#6f8fa8", "#d9a07a", "#8a4a32", "#c4532c"],
      extra: { "vector-velocity": "#2f6f9a" },
    },
    {
      bg: "#1f0c07",
      panel: "#2e130b",
      ink: "#ffe4d6",
      accent: "#a33a1a",
      accentText: "#ff8a5a",
      bodies: ["#ff8a5a", "#6f8fa8", "#b0643f", "#a0614a", "#d4582c"],
      extra: { "vector-velocity": "#7ac0ff" },
    },
  ),
  scheme(
    "Deep space",
    "Starlight gold on the blackest navy",
    {
      bg: "#eef0f6",
      panel: "#fbfcff",
      ink: "#141a33",
      accent: "#2b3a8a",
      accentText: "#2b3a8a",
      bodies: ["#e8b84a", "#7a8fd0", "#a8b0d8", "#5a6080", "#c47a3a"],
    },
    {
      bg: "#03040c",
      panel: "#0b0e1f",
      ink: "#f0f2ff",
      accent: "#2b3a8a",
      accentText: "#ffd36b",
      bodies: ["#ffd36b", "#5f7ae0", "#3a4a8a", "#6a7099", "#e07a3a"],
      extra: { "vector-velocity": "#7ab8ff", "vector-force": "#ff8a5a" },
    },
  ),
  scheme(
    "Lavender field",
    "Soft lilac and sage, like Provence in summer",
    {
      bg: "#f3f1fa",
      panel: "#fcfbff",
      ink: "#2c2840",
      accent: "#5d4fa0",
      bodies: ["#f0b87a", "#a39ae0", "#b8cfa8", "#7a768f", "#c2b5f0"],
    },
    {
      bg: "#18161f",
      panel: "#22202c",
      ink: "#f0eeff",
      accent: "#5d4fa0",
      accentText: "#c2b5f0",
      bodies: ["#f0b87a", "#8a80d0", "#8aa87a", "#938fa8", "#7a6ad0"],
    },
  ),
  scheme(
    "Sepia",
    "An old textbook: brown ink on yellowed paper",
    {
      bg: "#f3ead6",
      panel: "#faf4e4",
      ink: "#3b2a1a",
      accent: "#6e4a2a",
      bodies: ["#c9a06a", "#a39478", "#cbbd94", "#7a6448", "#b8925a"],
      extra: {
        "vector-velocity": "#3d5a7a",
        "vector-force": "#9a3a1a",
        "charge-positive": "#9a3a1a",
        "charge-negative": "#3d5a7a",
      },
    },
    {
      bg: "#1c160e",
      panel: "#272015",
      ink: "#efe2c6",
      accent: "#6e4a2a",
      accentText: "#d9b07a",
      bodies: ["#c9a06a", "#8f846a", "#a8986e", "#9a8462", "#9a7a4a"],
      extra: {
        "vector-velocity": "#8fb0d0",
        "vector-force": "#e0895a",
        "charge-positive": "#e0895a",
        "charge-negative": "#8fb0d0",
      },
    },
  ),
  scheme(
    "Retro arcade",
    "Primary-colour cabinets: bold red, blue and yellow",
    {
      bg: "#fff8e8",
      panel: "#ffffff",
      ink: "#141414",
      accent: "#d62828",
      accentText: "#1d4fd6",
      bodies: ["#ffcc00", "#1d4fd6", "#2fbf4a", "#3a3a3a", "#d62828"],
      extra: {
        "vector-velocity": "#1d4fd6",
        "vector-force": "#d62828",
        "charge-positive": "#d62828",
        "charge-negative": "#1d4fd6",
        "circuit-dot": "#ff6a00",
      },
    },
    {
      bg: "#0a0a12",
      panel: "#14141f",
      ink: "#ffffff",
      accent: "#c41f1f",
      accentText: "#ffcc00",
      bodies: ["#ffcc00", "#3a6aff", "#2fdf5a", "#8a8aa0", "#ff3b3b"],
      extra: {
        "vector-velocity": "#4f8aff",
        "vector-force": "#ff4f3b",
        "charge-positive": "#ff4f3b",
        "charge-negative": "#4f8aff",
      },
    },
  ),
  scheme(
    "Volcanic",
    "Basalt grey with glowing lava",
    {
      bg: "#efeceb",
      panel: "#fbfaf9",
      ink: "#1f1a19",
      accent: "#b3260f",
      bodies: ["#ff7a2f", "#7a8a9a", "#a8a09a", "#4a4442", "#d9461f"],
    },
    {
      bg: "#100c0b",
      panel: "#1b1514",
      ink: "#f5ece8",
      accent: "#b3260f",
      accentText: "#ff8a3d",
      bodies: ["#ff7a2f", "#5a6a7a", "#4a4442", "#8a807c", "#ff4a1f"],
      extra: {
        "vector-velocity": "#6fc0ff",
        "vector-force": "#ffb03b",
        "circuit-glow": "#ff8a3d",
      },
    },
  ),
  scheme(
    "Monochrome",
    "Pure greyscale surfaces; the physics keeps its colours",
    {
      bg: "#f2f2f2",
      panel: "#ffffff",
      ink: "#1a1a1a",
      accent: "#333333",
      bodies: ["#bdbdbd", "#9e9e9e", "#d6d6d6", "#6e6e6e", "#a8a8a8"],
    },
    {
      bg: "#121212",
      panel: "#1e1e1e",
      ink: "#f0f0f0",
      accent: "#4a4a4a",
      accentText: "#e0e0e0",
      bodies: ["#9e9e9e", "#7a7a7a", "#5a5a5a", "#a8a8a8", "#6e6e6e"],
    },
  ),
  scheme(
    "High contrast",
    "Black and white with the strongest possible colours",
    {
      bg: "#ffffff",
      panel: "#ffffff",
      ink: "#000000",
      accent: "#0033cc",
      bodies: ["#ff9900", "#3366ff", "#33cc66", "#333333", "#888888"],
      extra: {
        line: "#000000",
        "vector-velocity": "#0047d6",
        "vector-force": "#c43c00",
        danger: "#b00020",
        "danger-text": "#b00020",
      },
    },
    {
      bg: "#000000",
      panel: "#000000",
      ink: "#ffffff",
      accent: "#1a4fd6",
      accentText: "#ffff00",
      bodies: ["#ffaa00", "#4d88ff", "#33dd66", "#cccccc", "#888888"],
      extra: {
        line: "#ffffff",
        "vector-velocity": "#66b3ff",
        "vector-force": "#ff9933",
      },
    },
  ),
  scheme(
    "Colour-blind safe",
    "The default surfaces with the Okabe–Ito physics palette",
    {
      bg: "#f2f0e9",
      panel: "#fffefa",
      ink: "#354438",
      accent: "#435d49",
      accentText: "#4f7547",
      extra: {
        "vector-velocity": "#0072b2",
        "vector-force": "#d55e00",
        "charge-positive": "#d55e00",
        "charge-negative": "#0072b2",
        "field-electric": "#e69f00",
        "field-magnetic": "#cc79a7",
        "field-equipotential": "#009e73",
        "field-test-charge": "#009e73",
        "energy-kinetic": "#0072b2",
        "energy-gravitational": "#009e73",
        "energy-elastic": "#e69f00",
        "energy-electric": "#cc79a7",
        "circuit-current": "#d55e00",
        "circuit-dot": "#e69f00",
        "circuit-dot-electron": "#56b4e9",
      },
    },
    {
      bg: "#1c1a16",
      panel: "#2a2722",
      ink: "#ebe5d6",
      accent: "#435d49",
      accentText: "#a9c49d",
      extra: {
        "vector-velocity": "#56b4e9",
        "vector-force": "#e69f00",
        "charge-positive": "#e69f00",
        "charge-negative": "#56b4e9",
        "field-electric": "#f0e442",
        "field-magnetic": "#cc79a7",
        "field-equipotential": "#009e73",
        "field-test-charge": "#2bc497",
        "energy-kinetic": "#56b4e9",
        "energy-gravitational": "#009e73",
        "energy-elastic": "#e69f00",
        "energy-electric": "#cc79a7",
        "circuit-current": "#f0e442",
        "circuit-dot": "#e69f00",
        "circuit-dot-electron": "#56b4e9",
      },
    },
  ),
];

export const presetByName = (name) => PRESETS.find((p) => p.name === name);
