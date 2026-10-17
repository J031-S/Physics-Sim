// Design tokens: the single source of every colour on the site (CSS and
// canvas), and of the main shape and type sizes. No DOM in the data part.
//
// CSS reads the colours as custom properties from styles/tokens.css, which
// is generated from this file (`npm run tokens`; a test fails if it is
// stale). Canvas code asks for colours with `color(name)` or
// `paletteOf(names)`, and for other tokens with `value(name)`. Developer
// schemes (developer options, src/site/scheme.js) replace values through
// `setOverrides`; without developer mode the values below are always used.
// The size and choice defaults describe the stylesheets as they are: a
// developer scheme that changes one adds override rules (surface.js).

export const GROUPS = [
  "Page",
  "Accent",
  "Status",
  "Canvas",
  "Vectors",
  "Energy",
  "Fields",
  "Circuits",
  "Developer",
];

// The colours a scheme sets: name (the CSS custom property is --name), group,
// the value in the light and the dark theme, and what it colours. Shades
// such as hover and active backgrounds are not set separately: they are
// DERIVED from these.
export const COLOURS = [
  {
    name: "canvas-bg",
    group: "Page",
    light: "#eef0f6",
    dark: "#03040c",
    description: "Page and simulation background",
  },
  {
    name: "panel",
    group: "Page",
    light: "#fbfcff",
    dark: "#0b0e1f",
    description: "Panels, menus, cards, buttons and the top bar",
  },
  {
    name: "line",
    group: "Page",
    light: "#d1d3da",
    dark: "#393c4c",
    description: "Borders and dividers",
  },
  {
    name: "ink",
    group: "Page",
    light: "#141a33",
    dark: "#f0f2ff",
    description: "Text, icons and drawn outlines",
  },
  {
    name: "ink-soft",
    group: "Page",
    light: "#686d7e",
    dark: "#91939e",
    description:
      "Secondary text, units, notes, canvas labels and background patterns",
  },
  {
    name: "accent",
    group: "Accent",
    light: "#2b3a8a",
    dark: "#2b3a8a",
    description:
      "Filled buttons (Run, Launch, the homepage's main button) and toasts",
  },
  {
    name: "accent-text",
    group: "Accent",
    light: "#2b3a8a",
    dark: "#ffd36b",
    description:
      "Links, active and selected items, focus rings, checkboxes and sliders",
  },
  {
    name: "accent-soft",
    group: "Accent",
    light: "#dee1ef",
    dark: "#413930",
    description: "Background of active and pressed controls, and hover",
  },
  {
    name: "danger",
    group: "Status",
    light: "#a5544a",
    dark: "#b35d52",
    description: "Destructive buttons (Clear, Delete) and warning boxes",
  },
  {
    name: "danger-text",
    group: "Status",
    light: "#b3261e",
    dark: "#ff8f7d",
    description: "Faults, errors and the delete icon",
  },
  {
    name: "on-colour",
    group: "Status",
    light: "#ffffff",
    dark: "#ffffff",
    description: "Text and marks drawn on filled colours",
  },
  {
    name: "shadow",
    group: "Status",
    light: "#0e122424",
    dark: "#00000055",
    description: "Shadows of panels, menus and toolbars",
  },
  {
    name: "canvas-grid",
    group: "Canvas",
    light: "#dadde4",
    dark: "#16171f",
    description:
      "Grid lines (minor; major lines and graph axes are a little stronger)",
  },
  {
    name: "canvas-ground",
    group: "Canvas",
    light: "#d7dae9",
    dark: "#131221",
    description: "Ground below the floor, and belt dashes",
  },
  {
    name: "structure",
    group: "Canvas",
    light: "#5a6080",
    dark: "#6a7099",
    description: "Floor, walls, springs, rods, cables and anchors",
  },
  {
    name: "body-ball",
    group: "Canvas",
    light: "#e8b84a",
    dark: "#ffd36b",
    description: "Balls (edges are drawn darker)",
  },
  {
    name: "body-block",
    group: "Canvas",
    light: "#7a8fd0",
    dark: "#5f7ae0",
    description: "Blocks (edges are drawn darker)",
  },
  {
    name: "body-wedge",
    group: "Canvas",
    light: "#a8b0d8",
    dark: "#3a4a8a",
    description: "Wedges",
  },
  {
    name: "orbit-body",
    group: "Canvas",
    light: "#c47a3a",
    dark: "#e07a3a",
    description: "The central body in the orbits simulation",
  },
  {
    name: "vector-velocity",
    group: "Vectors",
    light: "#497caa",
    dark: "#7ab8ff",
    description: "Velocity arrows, graph traces and selected connections",
  },
  {
    name: "vector-force",
    group: "Vectors",
    light: "#c2410c",
    dark: "#ff8a5a",
    description: "Force and impulse arrows",
  },
  {
    name: "energy-kinetic",
    group: "Energy",
    light: "#497caa",
    dark: "#3987e5",
    description: "Kinetic energy",
  },
  {
    name: "energy-gravitational",
    group: "Energy",
    light: "#6d8f5f",
    dark: "#199e70",
    description: "Gravitational potential energy",
  },
  {
    name: "energy-elastic",
    group: "Energy",
    light: "#c99a3e",
    dark: "#c98500",
    description: "Elastic energy",
  },
  {
    name: "energy-electric",
    group: "Energy",
    light: "#b0577f",
    dark: "#d55181",
    description: "Electric energy",
  },
  {
    name: "field-electric",
    group: "Fields",
    light: "#ae7d24",
    dark: "#e0a94a",
    description: "Electric fields and their lines",
  },
  {
    name: "field-magnetic",
    group: "Fields",
    light: "#8060ae",
    dark: "#a891e0",
    description: "Magnetic fields and their lines",
  },
  {
    name: "charge-positive",
    group: "Fields",
    light: "#c2503c",
    dark: "#e9826e",
    description: "Positive charges",
  },
  {
    name: "charge-negative",
    group: "Fields",
    light: "#3f76aa",
    dark: "#6fa8ec",
    description: "Negative charges and electron flow",
  },
  {
    name: "field-equipotential",
    group: "Fields",
    light: "#3f8c7c",
    dark: "#6fbfae",
    description: "Equipotential lines",
  },
  {
    name: "field-test-charge",
    group: "Fields",
    light: "#2f7d4f",
    dark: "#8fd3a4",
    description: "Test charges, and voltmeter readings",
  },
  {
    name: "field-neutral",
    group: "Fields",
    light: "#9aa392",
    dark: "#8d8777",
    description: "Neutral (uncharged) objects",
  },
  {
    name: "circuit-current",
    group: "Circuits",
    light: "#b4530a",
    dark: "#f2c14e",
    description: "Current arrows and ammeter readings",
  },
  {
    name: "circuit-dot",
    group: "Circuits",
    light: "#ff7a00",
    dark: "#ff4d2e",
    description: "Moving current dots (conventional current)",
  },
  {
    name: "circuit-dot-electron",
    group: "Circuits",
    light: "#00a3ff",
    dark: "#1f8bff",
    description: "Moving current dots (electron flow)",
  },
  {
    name: "circuit-glow",
    group: "Circuits",
    light: "#f5b700",
    dark: "#ffd866",
    description: "Glow of a lit lamp",
  },
  {
    name: "dev-outline",
    group: "Developer",
    light: "#c2187a",
    dark: "#ff6fb0",
    description: "Developer layout aid: element outlines",
  },
  {
    name: "dev-grid",
    group: "Developer",
    light: "#2f7dd0",
    dark: "#6fa8ec",
    description: "Developer layout aid: spacing grid and badges",
  },
];

// Non-colour tokens. `value` is the default; sliders use min/max/step.
export const SIZES = [
  {
    name: "radius-button",
    group: "Shape",
    unit: "px",
    value: 32,
    plain: 7,
    min: 0,
    max: 32,
    step: 1,
    description: "Corner radius of buttons (32 is fully round)",
  },
  {
    name: "radius-input",
    group: "Shape",
    unit: "px",
    value: 32,
    plain: 5,
    min: 0,
    max: 32,
    step: 1,
    description:
      "Corner radius of number fields and selects (32 is fully round)",
  },
  {
    name: "radius-panel",
    group: "Shape",
    unit: "px",
    value: 13,
    plain: 12,
    min: 0,
    max: 32,
    step: 1,
    description: "Corner radius of panels and menus (32 is fully round)",
  },
  {
    name: "radius-card",
    group: "Shape",
    unit: "px",
    value: 13,
    plain: 9,
    min: 0,
    max: 32,
    step: 1,
    description:
      "Corner radius of cards, toolbars and small panels (32 is fully round)",
  },
  {
    name: "radius-canvas",
    group: "Shape",
    unit: "px",
    value: 13,
    plain: 0,
    min: 0,
    max: 32,
    step: 1,
    description: "Corner radius of the canvas frame (32 is fully round)",
  },
  {
    name: "border-width",
    group: "Shape",
    unit: "px",
    value: 1,
    min: 0,
    max: 4,
    step: 0.5,
    description: "Border width of buttons, inputs, panels and cards",
  },
  {
    name: "panel-opacity",
    group: "Surface",
    unit: "%",
    value: 100,
    min: 40,
    max: 100,
    step: 5,
    description: "Opacity of panel and card backgrounds",
  },
  {
    name: "panel-blur",
    group: "Surface",
    unit: "px",
    value: 0,
    min: 0,
    max: 24,
    step: 1,
    description: "Blur of what shows through a see-through panel",
  },
  {
    name: "icon-size",
    group: "Icons",
    unit: "%",
    value: 105,
    plain: 100,
    min: 70,
    max: 150,
    step: 5,
    description: "Size of interface icons",
  },
  {
    name: "icon-stroke",
    group: "Icons",
    unit: "%",
    value: 0,
    min: 0,
    max: 8,
    step: 0.5,
    description:
      "Extra outline round every icon shape, as a share of the icon's size (on top of the weight)",
  },
  {
    name: "canvas-line",
    group: "Canvas",
    unit: "×",
    value: 1,
    min: 0.5,
    max: 3,
    step: 0.1,
    description: "Weight of every line drawn on the simulation canvas",
  },
  {
    name: "canvas-vector-line",
    group: "Canvas",
    unit: "×",
    value: 1.1,
    plain: 1,
    min: 0.5,
    max: 3,
    step: 0.1,
    description: "Weight of vector arrows (on top of the canvas line weight)",
  },
  {
    name: "canvas-field-line",
    group: "Canvas",
    unit: "×",
    value: 1,
    min: 0.5,
    max: 3,
    step: 0.1,
    description: "Weight of field lines (on top of the canvas line weight)",
  },
  {
    name: "canvas-arrowhead",
    group: "Canvas",
    unit: "×",
    value: 1.2,
    plain: 1,
    min: 0.5,
    max: 2.5,
    step: 0.1,
    description: "Size of arrowheads on the canvas",
  },
  {
    name: "page-pattern-size",
    group: "Patterns",
    unit: "px",
    value: 24,
    min: 6,
    max: 96,
    step: 2,
    description: "Spacing of the page background pattern",
  },
  {
    name: "page-pattern-strength",
    group: "Patterns",
    unit: "%",
    value: 20,
    plain: 25,
    min: 0,
    max: 100,
    step: 5,
    description: "Strength of the page background pattern",
  },
  {
    name: "canvas-pattern-size",
    group: "Patterns",
    unit: "px",
    value: 24,
    min: 6,
    max: 96,
    step: 2,
    description: "Spacing of the canvas background pattern",
  },
  {
    name: "canvas-pattern-strength",
    group: "Patterns",
    unit: "%",
    value: 25,
    min: 0,
    max: 100,
    step: 5,
    description: "Strength of the canvas background pattern",
  },
  {
    name: "font-size",
    group: "Fonts",
    unit: "px",
    value: 13,
    min: 10,
    max: 18,
    step: 0.5,
    description: "Interface text size",
  },
  {
    name: "font-size-heading",
    group: "Fonts",
    unit: "px",
    value: 14,
    min: 10,
    max: 28,
    step: 0.5,
    description: "Headings and brand name size",
  },
  {
    name: "font-size-numbers",
    group: "Fonts",
    unit: "px",
    value: 12,
    min: 9,
    max: 18,
    step: 0.5,
    description: "Numbers and readouts size",
  },
  {
    name: "font-size-canvas",
    group: "Fonts",
    unit: "%",
    value: 100,
    min: 60,
    max: 160,
    step: 5,
    description: "Canvas labels size",
  },
  {
    name: "font-size-code",
    group: "Fonts",
    unit: "px",
    value: 12,
    min: 9,
    max: 18,
    step: 0.5,
    description: "Code size",
  },
  {
    name: "font-weight-ui",
    group: "Fonts",
    unit: "",
    value: 400,
    min: 300,
    max: 700,
    step: 100,
    description: "Interface text weight",
  },
  {
    name: "font-weight-heading",
    group: "Fonts",
    unit: "",
    value: 600,
    min: 300,
    max: 800,
    step: 100,
    description: "Headings and brand name weight",
  },
  {
    name: "font-weight-numbers",
    group: "Fonts",
    unit: "",
    value: 400,
    min: 300,
    max: 700,
    step: 100,
    description: "Numbers and readouts weight",
  },
  {
    name: "font-weight-canvas",
    group: "Fonts",
    unit: "",
    value: 600,
    min: 300,
    max: 800,
    step: 100,
    description: "Canvas labels weight",
  },
  {
    name: "font-weight-code",
    group: "Fonts",
    unit: "",
    value: 400,
    min: 300,
    max: 700,
    step: 100,
    description: "Code weight",
  },
  {
    name: "letter-spacing-ui",
    group: "Fonts",
    unit: "em",
    value: 0,
    min: -0.05,
    max: 0.2,
    step: 0.005,
    description: "Interface text letter-spacing",
  },
  {
    name: "letter-spacing-heading",
    group: "Fonts",
    unit: "em",
    value: 0,
    min: -0.05,
    max: 0.2,
    step: 0.005,
    description: "Headings and brand name letter-spacing",
  },
  {
    name: "letter-spacing-numbers",
    group: "Fonts",
    unit: "em",
    value: 0,
    min: -0.05,
    max: 0.2,
    step: 0.005,
    description: "Numbers and readouts letter-spacing",
  },
  {
    name: "letter-spacing-canvas",
    group: "Fonts",
    unit: "em",
    value: 0,
    min: -0.05,
    max: 0.2,
    step: 0.005,
    description: "Canvas labels letter-spacing",
  },
  {
    name: "letter-spacing-code",
    group: "Fonts",
    unit: "em",
    value: 0,
    min: -0.05,
    max: 0.2,
    step: 0.005,
    description: "Code letter-spacing",
  },
];

// Tokens with a fixed set of values (`fonts: true`: one of FONTS, or
// "default" for the font each part of the page was designed with).
export const CHOICES = [
  {
    name: "border-style",
    group: "Shape",
    value: "dashed",
    plain: "solid",
    options: ["solid", "dashed", "dotted", "double", "none"],
    description: "Border style of buttons, inputs, panels and cards",
  },
  {
    name: "shadow",
    group: "Surface",
    value: "soft",
    options: ["none", "soft", "hard", "raised"],
    description: "Shadow of panels, menus and toolbars",
  },
  {
    name: "button-style",
    group: "Surface",
    value: "filled",
    options: ["filled", "outlined", "flat"],
    description: "Button style",
  },
  {
    name: "toggle-style",
    group: "Surface",
    value: "switch",
    plain: "checkbox",
    options: ["checkbox", "switch"],
    description: "On/off controls drawn as checkboxes or switches",
  },
  {
    name: "density",
    group: "Surface",
    value: "normal",
    options: ["compact", "normal", "roomy"],
    description: "Control height, padding and gaps",
  },
  {
    name: "slider-shape",
    group: "Surface",
    value: "round",
    plain: "default",
    options: ["default", "round", "square", "thin"],
    description: "Slider track and thumb",
  },
  {
    name: "focus-ring",
    group: "Surface",
    value: "underline",
    plain: "outline",
    options: ["outline", "thick", "glow", "underline"],
    description: "Keyboard focus indicator",
  },
  {
    name: "header-style",
    group: "Surface",
    value: "floating",
    plain: "bordered",
    options: ["flat", "bordered", "tinted", "floating"],
    description: "Top bar",
  },
  {
    name: "page-pattern",
    group: "Patterns",
    value: "dots",
    plain: "none",
    options: [
      "none",
      "dots",
      "grid",
      "graph",
      "diagonal",
      "isometric",
      "noise",
    ],
    description: "Background pattern of the page",
  },
  {
    name: "canvas-pattern",
    group: "Patterns",
    value: "none",
    options: [
      "none",
      "dots",
      "grid",
      "graph",
      "diagonal",
      "isometric",
      "noise",
    ],
    description: "Background pattern behind the simulation canvas",
  },
  {
    name: "grid-style",
    group: "Canvas",
    value: "dotted",
    plain: "solid",
    options: ["solid", "dotted", "crosses"],
    description: "Grid lines on the canvas",
  },
  {
    name: "icon-weight",
    group: "Icons",
    value: "regular",
    options: ["thin", "light", "regular", "bold", "fill", "duotone"],
    description: "Phosphor icon weight",
  },
  {
    name: "font-ui",
    group: "Fonts",
    value: "default",
    fonts: true,
    description: "Interface text",
  },
  {
    name: "font-heading",
    group: "Fonts",
    value: "default",
    fonts: true,
    description: "Headings and the brand name",
  },
  {
    name: "font-numbers",
    group: "Fonts",
    value: "jetbrains-mono",
    plain: "default",
    fonts: true,
    description: "Numbers and readouts (shown with fixed-width digits)",
  },
  {
    name: "font-canvas",
    group: "Fonts",
    value: "default",
    fonts: true,
    description: "Labels drawn on the canvas",
  },
  {
    name: "font-code",
    group: "Fonts",
    value: "jetbrains-mono",
    plain: "default",
    fonts: true,
    description: "Code",
  },
];

// CSS applied after everything else when a developer scheme is on.
export const CUSTOM_CSS = "";

// ---- Not part of a scheme.

// Colours mixed from the ones above, so that a scheme only sets the base
// colours: `percent` of `from` with the rest `with` (a colour token, "black"
// or "transparent"), as CSS color-mix() in sRGB does it.
export const DERIVED = [
  {
    name: "canvas-grid-major",
    from: "canvas-grid",
    percent: 85,
    with: "ink-soft",
    description: "Major grid lines and graph axes",
  },
  {
    name: "accent-border",
    from: "line",
    percent: 70,
    with: "accent-text",
    description: "Border of active and pressed controls",
  },
  {
    name: "accent-hover",
    from: "accent",
    percent: 82,
    with: "black",
    description: "A filled button under the pointer",
  },
  {
    name: "danger-hover",
    from: "danger",
    percent: 85,
    with: "black",
    description: "A destructive button under the pointer; warning borders",
  },
  {
    name: "body-ball-edge",
    from: "body-ball",
    percent: 72,
    with: "black",
    description: "Ball edges",
  },
  {
    name: "body-edge",
    from: "body-block",
    percent: 72,
    with: "black",
    description: "Block and wedge edges",
  },
  {
    name: "body-label",
    from: "body-wedge",
    percent: 25,
    with: "black",
    description: "Labels drawn on a wedge",
  },
  {
    name: "hatch",
    from: "on-colour",
    percent: 50,
    with: "transparent",
    description: "Hatching on negative energy bars",
  },
];

// Fonts a scheme can choose: system stacks, and open fonts in vendor/fonts/
// (see its NOTICE.txt), loaded only when a scheme uses them.
export const FONTS = [
  {
    id: "system",
    label: "System UI",
    kind: "sans",
    stack:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    id: "humanist",
    label: "System humanist",
    kind: "sans",
    stack:
      'Seravek, "Gill Sans Nova", Ubuntu, Calibri, "DejaVu Sans", sans-serif',
  },
  {
    id: "rounded-system",
    label: "System rounded",
    kind: "rounded",
    stack:
      'ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, Comfortaa, "Arial Rounded MT", sans-serif',
  },
  {
    id: "serif-system",
    label: "System serif",
    kind: "serif",
    stack: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, serif',
  },
  {
    id: "mono-system",
    label: "System monospace",
    kind: "mono",
    stack:
      'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace',
  },
  {
    id: "inter",
    label: "Inter",
    kind: "sans",
    file: "inter.woff2",
    weights: "100 900",
  },
  {
    id: "atkinson",
    label: "Atkinson Hyperlegible Next",
    kind: "sans",
    file: "atkinson-hyperlegible-next.woff2",
    weights: "200 800",
  },
  {
    id: "plex-sans",
    label: "IBM Plex Sans",
    kind: "sans",
    file: "ibm-plex-sans.woff2",
    weights: "100 700",
  },
  {
    id: "nunito",
    label: "Nunito",
    kind: "rounded",
    file: "nunito.woff2",
    weights: "200 900",
  },
  {
    id: "source-serif",
    label: "Source Serif 4",
    kind: "serif",
    file: "source-serif-4.woff2",
    weights: "200 900",
  },
  {
    id: "literata",
    label: "Literata",
    kind: "serif",
    file: "literata.woff2",
    weights: "200 900",
  },
  {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    kind: "mono",
    file: "jetbrains-mono.woff2",
    weights: "100 800",
  },
  {
    id: "plex-mono",
    label: "IBM Plex Mono",
    kind: "mono",
    file: "ibm-plex-mono-400.woff2",
    bold: "ibm-plex-mono-600.woff2",
    weights: "400",
  },
];

// Text and background tokens drawn together: [text, background, where].
// The theme tweaker shows their contrast ratio.
export const PAIRS = [
  ["ink", "canvas-bg", "Page text"],
  ["ink", "panel", "Panel and menu text"],
  ["ink", "accent-soft", "Active and pressed controls"],
  ["ink-soft", "canvas-bg", "Secondary text on the page"],
  ["ink-soft", "panel", "Secondary text in panels"],
  ["accent-text", "panel", "Links and accents in panels"],
  ["accent-text", "canvas-bg", "Links on the page"],
  ["on-colour", "accent", "Filled buttons and toasts"],
  ["on-colour", "danger", "Destructive buttons"],
  ["danger-text", "panel", "Errors in panels"],
  ["charge-positive", "canvas-bg", "Positive charge labels"],
  ["charge-negative", "canvas-bg", "Negative charge labels"],
  ["circuit-current", "canvas-bg", "Ammeter readings"],
  ["field-test-charge", "canvas-bg", "Voltmeter readings"],
  ["body-label", "body-wedge", "Angles drawn on a wedge"],
];

const byName = new Map(COLOURS.map((t) => [t.name, t]));
const valueTokens = new Map([...SIZES, ...CHOICES].map((t) => [t.name, t]));
let overrides = { light: {}, dark: {}, values: {} };

// Replace (or clear, with no argument) the developer overrides: colours by
// theme, and values of size and choice tokens.
export function setOverrides(next = {}) {
  overrides = {
    light: { ...next.light },
    dark: { ...next.dark },
    values: { ...next.values },
  };
}
export const getOverrides = () => structuredClone(overrides);

const derivedByName = new Map(DERIVED.map((t) => [t.name, t]));
const FIXED = { black: "#000000", transparent: "#00000000" };

// "#rgb", "#rrggbb" or "#rrggbbaa" as [r, g, b, a], all 0–255.
function channels(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h.replace(/./g, (d) => d + d);
  if (h.length === 6) h += "ff";
  return [0, 2, 4, 6].map((i) => parseInt(h.slice(i, i + 2), 16));
}
const hex = (cs) =>
  "#" +
  cs
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .replace(/ff$/, "");
// CSS color-mix(in srgb, a p%, b): premultiplied by alpha, as browsers do.
export function mixColours(a, p, b) {
  const x = channels(a),
    y = channels(b),
    t = p / 100,
    alpha = x[3] * t + y[3] * (1 - t);
  if (alpha === 0) return "#00000000";
  const out = [0, 1, 2].map(
    (i) => (x[i] * x[3] * t + y[i] * y[3] * (1 - t)) / alpha,
  );
  return hex([...out, alpha]);
}

export function colourValue(name, mode) {
  const token = byName.get(name);
  if (token) return overrides[mode][name] ?? token[mode];
  const derived = derivedByName.get(name);
  if (!derived) throw new Error("Unknown colour token: " + name);
  const other = FIXED[derived.with] ?? colourValue(derived.with, mode);
  return mixColours(colourValue(derived.from, mode), derived.percent, other);
}
// Every colour name canvas code may ask for: the base colours and the
// derived ones.
export const colourNames = () => [
  ...COLOURS.map((t) => t.name),
  ...DERIVED.map((t) => t.name),
];
// The value of a size or choice token (the default unless a developer
// scheme changes it).
export function value(name) {
  const token = valueTokens.get(name);
  if (!token) throw new Error("Unknown token: " + name);
  return overrides.values[name] ?? token.value;
}
const pageIsDark = () =>
  globalThis.document?.documentElement?.dataset?.theme === "dark";
// A colour for canvas drawing, in the theme the page is showing.
export const color = (name, dark = pageIsDark()) =>
  colourValue(name, dark ? "dark" : "light");
// { key: colour } for a map of { key: token name }.
export function paletteOf(names, dark = pageIsDark()) {
  const out = {};
  for (const [key, name] of Object.entries(names)) out[key] = color(name, dark);
  return out;
}

// The text of styles/tokens.css: every colour as a custom property, light
// values on :root and dark values in one :root[data-theme="dark"] block,
// then the derived colours as color-mix() of those (so they follow both
// themes and any developer scheme). Size and choice tokens are applied by
// the developer options only (see src/site/surface.js), so the stylesheets
// keep their own sizes.
export function tokensCss() {
  const light = COLOURS.map((t) => `  --${t.name}: ${t.light};`),
    dark = COLOURS.map((t) => `  --${t.name}: ${t.dark};`),
    mixed = DERIVED.map(
      (t) =>
        `  --${t.name}: color-mix(in srgb, var(--${t.from}) ${t.percent}%, ${
          FIXED[t.with] ? t.with : `var(--${t.with})`
        });`,
    );
  return [
    "/* Generated from src/site/theme.js by `npm run tokens`. Do not edit. */",
    ":root {",
    ...light,
    "}",
    ':root[data-theme="dark"] {',
    "  color-scheme: dark;",
    ...dark,
    "}",
    ":root,",
    ':root[data-theme="dark"] {',
    ...mixed,
    "}",
    "",
  ].join("\n");
}

// The colour of light of one wavelength (in metres), for rays drawn in the
// colour they are: an approximation of the visible spectrum in sRGB (after
// Dan Bruton's piecewise fit), fading at the violet and red ends where the
// eye is less sensitive. On the light theme it is darkened so that yellow
// and green rays stay visible on a pale canvas. Not part of a scheme: it is
// physics, like the charge colours' meanings.
export function spectralColour(wavelength, dark = pageIsDark()) {
  // White light (every wavelength together): white on the dark canvas; on
  // the pale light-theme canvas, where white would vanish, a neutral grey.
  if (wavelength === "white") return dark ? "#ffffff" : "#7c8090";
  const nm = wavelength * 1e9;
  let r = 0,
    g = 0,
    b = 0;
  if (nm < 440) [r, g, b] = [(440 - nm) / 60, 0, 1];
  else if (nm < 490) [r, g, b] = [0, (nm - 440) / 50, 1];
  else if (nm < 510) [r, g, b] = [0, 1, (510 - nm) / 20];
  else if (nm < 580) [r, g, b] = [(nm - 510) / 70, 1, 0];
  else if (nm < 645) [r, g, b] = [1, (645 - nm) / 65, 0];
  else [r, g, b] = [1, 0, 0];
  const fade = nm < 420 ? 0.3 + (0.7 * (nm - 380)) / 40 : nm > 700 ? 0.3 + (0.7 * (780 - nm)) / 80 : 1,
    light = dark ? 1 : 0.72,
    hex = (v) =>
      Math.round(255 * Math.max(0, Math.min(1, v * fade * light)) ** 0.8)
        .toString(16)
        .padStart(2, "0");
  return "#" + hex(r) + hex(g) + hex(b);
}
