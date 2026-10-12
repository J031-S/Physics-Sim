# Physium: site shell, homepage, minitools and developer options

Work list for turning Physics Sim into **Physium**: a named site with a
homepage, a shared shell, a catalogue of small single-equation "minitools", and
developer options for tuning the look. Read `CLAUDE.md` first.

This is **interface and structure work**. The physics of the four existing
tools is not to change at all, and the physics of the minitools will be checked
and refined afterwards in a separate review. Spend the effort on layout,
consistency and structure, not on numerical accuracy.

## Ground rules

- **Branch**: pull, then work on `claude/physics-fixes` only. Do not create
  other branches and do not touch `main`. Commit after each task below (one
  logical change per commit) and push to that branch without asking. This
  overrides "do not commit unless asked" in `CLAUDE.md` for this work list.
- **Do not change** `src/physics.js`, `src/contacts.js`, `src/fields.js`,
  `src/mechanisms.js`, `src/pulley.js`, `src/presets.js`, any `model.js` or
  `presets.js` under `src/fieldlab`, `src/orbitlab`, `src/circuitlab`, or
  `vendor/matter.js`. If a task seems to need it, stop and say what is missing.
- **No build step, no frameworks, no npm runtime dependencies.** The only new
  third-party material allowed is vendored as files under `vendor/` with its
  licence: KaTeX (task 5), extra icon sets and open-licensed fonts (task 4).
  Nothing is loaded from a CDN.
- **Refactors are pure moves.** Tasks 2 to 4 must not change what any existing
  page does or looks like at default settings. Compare before and after by eye,
  in both themes.
- **Keep existing element ids** (`ui-theme`, `ui-size`, `ui-size-value`,
  `ui-grid`, `ui-angle-unit`, `ui-icons`, `nav-toggle`, `nav-menu`,
  `settings-panel`, and everything the smoke tests look up). When a control
  really changes, update the test in the same commit.
- **Do not rename** the scene file formats in `src/scene-format.js` or the
  saved-scene file names: files students have already saved must still load.
- Every new control needs a visible label or accessible name, keyboard access,
  and must work in light and dark themes and at 80% to 140% GUI size.
- **Verify by looking.** `npm start`, then check each page at about 900 px and
  at full width, both themes. Say plainly what you could not check.
- After every task: `npm run check && npm test && npm run test:ui`. Add each
  new source file to the `check` script. Update `README.md` and `CLAUDE.md`
  (file table, page list, commands) in the task that changes them.
- Australian/British spelling in all text. SI units.

Do the tasks in order. Later ones depend on earlier ones.

---

## 1. Rename to Physium; one logo asset

- The site is called **Physium**. Replace "Physics Sim" in page titles
  (`Physium · Mechanics sandbox` and so on), the header brand, the server's
  start-up message, `README.md` and `CLAUDE.md` headings. The repository name
  and the `physics-sim-…` scene file names stay as they are.
- The logo is the LaTeX glyph `\varphi` (the open, looped phi), not the
  straight-stroke `\phi`. A plain `φ` character changes shape with the font, so
  do not rely on it. Make one file, `assets/logo.svg`, holding the glyph as a
  path that uses `currentColor`, taken from the KaTeX Math Italic outline of
  `\varphi` (credit the font in `vendor/katex/` notices). A one-off script or
  tool to extract the outline is fine; do not add it to `package.json`.
- Use that one asset for the header mark on every page, the homepage hero and
  the favicon (`<link rel="icon" type="image/svg+xml">`).
- The header brand (logo and "Physium", top left) is a link to the homepage on
  **every** page, at every depth of folder. Today it is `href="./"`, which
  only works because all pages sit in one folder; after the address change in
  task 2 it must come from the shell's site root. Check it by clicking it on
  every page, including a minitool page.
- Add `.svg` and `.woff2` content types to `server.mjs`.

Done when: every page shows the same mark and the word Physium, the browser tab
shows the logo, and `grep -ri "physics sim"` finds only the repository name and
historical notes.

## 2. Shared site shell (first half of the modularisation)

Today each page writes out its own header brand, navigation links and Website
settings by hand, and they have drifted: the icon-set option exists only on the
sandbox, the angle unit is missing from circuits, and Snapping sits inside
Website on the fields page only.

Create `src/site/` and make it the single source of everything the pages share:

| File | Owns |
| --- | --- |
| `src/site/pages.js` | The one list of pages: id, address, file, title, one-line description, group (home, simulation, minitools). No DOM |
| `src/site/shell.js` | Builds the header brand, the navigation drop-down (from `pages.js`, marking the current page) and the Website settings section into placeholders in each page |
| `src/site/preferences.js` | Moved from `src/preferences.js`. Loads, applies and saves website preferences |
| `src/site/nav.js`, `src/site/icons.js` | Moved from `src/` |
| `src/site/dom.js` | Small helpers the four `app.js` files each define for themselves today (`$`, toast, panel open/close, `isDark`), where they are truly identical |

- Each page keeps a placeholder (for example `<nav class="site-nav"></nav>` and
  `<details id="website-settings"></details>`) and calls one `setupSite()` at
  the top of its script, before anything looks up a control.
- **The Website section is identical on every page**: Theme, GUI size, Show
  grid, Angle unit, then the developer options of task 4. A control that has
  no effect on a given page still appears, so the section is the same
  everywhere. Move the fields page's Snapping checkbox to that page's own
  settings section, keeping its id.
- Preferences move to the localStorage key `physium-ui`. On first load, read
  the old `physics-sim-ui` key so nobody loses their settings.
- Adding a page must now mean adding one entry to `pages.js`, not editing
  every HTML file. Update the note in `CLAUDE.md` that says otherwise.
- Add `tests/site-smoke.mjs` (happy-dom, added to `test:ui`): load every page
  and check that each has the same Website controls with the same ids and
  options, the same navigation entries, exactly one entry marked current, and
  a brand link that resolves to the homepage.

### Addresses without `.html`

The site is served by GitHub Pages at `https://physium.j031.dev`. The address
bar must never show `.html`. The addresses are:

| Page | Address | File |
| --- | --- | --- |
| Homepage (task 7) | `/` | `index.html` |
| Mechanics sandbox | `/sims/Mechanics` | `sims/Mechanics.html` |
| Electric & magnetic fields | `/sims/EMFields` | `sims/EMFields.html` |
| Orbits & gravitation | `/sims/Orbits` | `sims/Orbits.html` |
| Electric circuits | `/sims/Circuits` | `sims/Circuits.html` |
| Minitool catalogue (task 6) | `/minitools/` | `minitools/index.html` |
| One minitool (task 6) | `/minitools/time-dilation` | `minitools/time-dilation.html` |

- GitHub Pages serves `sims/Mechanics.html` at `/sims/Mechanics` with no
  extension. Every link the site writes uses the extensionless address; no
  link anywhere ends in `.html`.
- `server.mjs` must behave the same way locally: try the path, then the path
  plus `.html`, then `index.html` inside a folder, and serve `404.html` with
  status 404 otherwise.
- Pages now sit at different folder depths. `shell.js` works out the site root
  from its own `import.meta.url` and builds every link (brand, navigation,
  cards) from it, so nothing depends on the folder a page is in. Stylesheets
  and scripts in the HTML use relative paths (`../styles/…`).
- Until task 7 builds the homepage, leave a temporary `index.html` that sends
  visitors to `/sims/Mechanics`.
- Addresses are case-sensitive on GitHub Pages. Add `404.html`: it looks the
  requested path up in `pages.js` ignoring case and ignoring a trailing
  `.html`, also maps the old addresses (`fields.html`, `orbits.html`,
  `circuits.html`), and redirects; otherwise it shows a normal "page not
  found" in the site's shell with a link home.
- Keep the `CNAME` file in the repository root (GitHub added it on `main`) and
  add an empty `.nojekyll` beside it.
- Update every test that opens a page by file name.

Done when: the Website section and navigation exist in one place in the source,
all four tools show the same Website section, every page opens at its address
above on the local server with no `.html` in the address bar, the brand link
returns home from every page, and all existing tests pass.

## 3. Colours as tokens; split the oversized files (second half)

The theme tweaker of task 4 can only reach colours that are tokens. At present
`styles.css` has about 107 hard-coded colours with dark-theme overrides
scattered through it, and the four `app.js` files hold about 190 more for
canvas drawing, each with its own `palette()` and `isDark()`.

- Create `src/site/theme.js` (no DOM in the data part): the complete list of
  colour tokens, each with a name, a group (Page, Panels, Text, Controls,
  Canvas, Vectors, Energy, Fields, Orbits, Circuits, Graphs, Status), a short
  description of where it is used, and its light and dark values.
- CSS uses only `var(--token)`. Dark theme becomes one block of token values,
  not per-selector overrides. Canvas code asks `theme.js` for colours, so the
  per-page `palette()` functions read tokens instead of holding literals.
- Add non-colour tokens the same way for corner radius, border width, base
  font size, font family, spacing step and shadow, so they can be tuned too.
- Group near-identical colours onto one token only where they are already the
  same value. Do not "tidy" two different greens into one: the result must
  look the same as before.
- Split stylesheets into `styles/tokens.css`, `styles/base.css` (shell, panels,
  forms, buttons, shared `.fl-*` pieces) and one file per page.
- Split each `app.js` only along seams that already exist (drawing, input,
  panels, graphs) and only by moving code. If a split would need logic
  rewritten, leave that part where it is and note it. A smaller safe split
  beats a complete risky one.
- **The drawing of each simulation must become reusable**, because the
  minitools of task 6 embed small live simulations that use the same engines
  and must look the same. For each of the four tools, move the scene drawing
  into `src/<tool>/render.js` (for the sandbox, `src/sandbox/render.js`): a
  function that is given a canvas context, the model, a view (centre and
  scale), the colours and a few display options, and draws the scene. It must
  not look anything up in the page. The full page then calls it, and so will
  the minitools. Editing handles, selection outlines and panels stay with the
  page.
- Do not change `src/fieldlab/arrows.js` (where the arrows on field lines
  sit); it has its own tests.

Done when: outside `src/site/theme.js`, `styles/tokens.css` and `vendor/`, a
search for hex or `rgb(` colour literals finds none (or a short listed set of
justified exceptions); every page looks the same as before in both themes; all
tests pass.

## 4. Developer options

All of this is for the site's author, not students. Put it in a
**Developer** group at the bottom of the shared Website section, hidden unless
developer mode is on. Developer mode is turned on by `?dev` in the address or
by a small "Developer options" switch at the foot of the Website section, and
is remembered.

### Theme tweaker (the main item)

A panel, movable and collapsible so the page stays visible while tuning:

- Every token from `theme.js`, grouped as there, each with a colour picker, a
  hex field and its description. Light and dark values are edited separately,
  with a switch for which is shown. Changes apply live to CSS **and** to the
  canvas.
- Search box to filter tokens; "pick from page" (click an element to jump to
  the tokens that colour it) if it can be done simply.
- Contrast ratio beside each text/background pair, flagged below 4.5:1.
- The non-colour tokens (radius, border, font, spacing, shadow) as sliders.
- **Schemes**: save the current set under a name, switch between saved
  schemes, duplicate, delete, and reset to the built-in default. Stored in
  localStorage under their own key.
- **Export / import** a scheme as JSON, and "Copy as code" that produces the
  exact text to paste into `theme.js` to make it the default.
- Undo and redo for edits, and a hold-to-compare button that shows the
  built-in default while pressed.
- A tweaked scheme never reaches students: without developer mode the site
  always uses the defaults in `theme.js`.

### Other options

- **Icon sets**: the selector moves from the sandbox to every page, and gains
  more sets. Add at least four more open-licensed sets beside Material,
  Lucide and Tabler (for example Phosphor, Heroicons, Feather, Bootstrap
  Icons, Remix), each in `vendor/icons/` with its licence. Every set must
  supply every icon name the site uses; a set that lacks a suitable glyph for
  one is completed from the closest match and noted in the report. Also offer
  icon stroke weight and icon size.
- **Shape and surface**, all as tokens in `theme.js`, saved in a scheme and
  applied live:
  - corner radius, separately for buttons, inputs, panels, cards and the
    canvas frame, from square to pill;
  - border width and style; panel and menu shadow (none, soft, hard, raised);
    panel opacity with optional background blur;
  - button style (filled, outlined, flat) and toggle style;
  - density: control height, padding and gaps (compact, normal, roomy);
  - slider track and thumb shape; focus-ring style;
  - **background pattern** for the page and, separately, for the canvas:
    none, dots, square grid, graph paper, diagonal lines, isometric, soft
    noise, drawn with CSS gradients or inline SVG, with pattern colour, size
    and strength;
  - canvas line weights (field lines, vectors, outlines), arrowhead size, and
    grid line style (solid, dotted, crosses);
  - header style (flat, bordered, tinted, floating).
- **Fonts**, chosen separately for: interface text, headings and the brand
  name, numbers and readouts, canvas labels, and code. Offer the common system
  font stacks plus about eight open-licensed fonts vendored as `.woff2` in
  `vendor/fonts/` with their licences (a mix of sans, serif, rounded and
  monospace; readouts need a face with fixed-width digits). Each also has
  size, weight and letter-spacing. Equations always use KaTeX's own fonts.
- **Custom CSS**: a text box whose contents are applied to the page live and
  saved with the scheme, for trying anything the controls do not cover.
- All of the above is part of a scheme: saved, exported, imported and reset
  with the colours.
- **Component gallery**: a page `dev/gallery.html` showing every shared
  component in every state (buttons, toggles, sliders, number rows, selects,
  panels, menus, toasts, navigation, a minitool card, a rendered equation),
  light and dark side by side, so a scheme can be judged in one view.
- **Layout aids**: outline every element's box; show a spacing grid; show the
  window size and current breakpoint in a corner; buttons to preview the page
  at phone, tablet, laptop and projector widths.
- **Performance overlay**: frames per second, frame time, and simulation steps
  per frame on pages that run a loop.
- **Motion**: slow all CSS transitions ×5, and force reduced motion.
- **Text stress test**: swap labels for long strings to find overflow.
- **Toast and error tester**: fire a sample toast and a sample error.
- **Minitool review aids**: show each minitool's id and its
  verified / unverified flag on cards and pages (see task 6); list any
  equation that failed to render.
- **Preferences**: show stored preferences as JSON, export, import, clear.
- **Screenshot**: save the current canvas as a PNG named after the page, theme
  and scheme, for comparing schemes side by side.

Done when: with developer mode off no page shows any of this; with it on, a
scheme can be built, saved, exported, re-imported and seen on every page and
canvas without reloading.

## 5. Equation rendering

- Vendor **KaTeX** (one pinned release) into `vendor/katex/`: the minified
  script and stylesheet, the `.woff2` fonts only, its licence, and a
  `package.json` naming the version, as `vendor/icons/` does. No CDN: the site
  must work on a school network and offline.
- `src/site/math.js` wraps it: `renderMath(element, latex, { display })` and a
  pass that renders every `[data-math]` element. A LaTeX error shows the source
  in an error style and is reported to the developer list of task 4, never a
  blank space.
- Load KaTeX only on pages that show equations.
- Equation colour and size follow the theme tokens and GUI size.

Done when: equations render as typeset maths in both themes and scale with GUI
size, with the network disconnected.

## 6. Minitools

Small pages that each explain **one equation or one combination of equations**
with adjustable values. These are quick "what happens if I double r?" tools,
separate from the four full simulations.

### Structure

- `/minitools/` (`minitools/index.html`): the catalogue. Cards grouped by
  topic, each with the title, the equation typeset, and a one-line purpose.
  Search box, topic filter, and a filter for single equations versus
  combinations.
- `/minitools/<id>` (for example `/minitools/time-dilation`): **one page
  design for every minitool**, driven by data. Static hosting needs a file
  per address, so each tool gets a tiny stub `minitools/<id>.html` that is
  identical except for its title and loads the one shared script, which reads
  the id from the address. The stubs are written by `npm run pages` (a small
  Node script that reads the catalogue) and committed. A test fails if a stub
  is missing, extra, or out of date. Never write or edit a stub by hand.
- `src/minitools/catalogue.js` (**no DOM**, importable from Node): one entry
  per tool, shaped like this:

  ```js
  {
    id: "kepler-third-law",
    title: "Kepler's third law",
    topic: "Gravitation",
    kind: "combined",            // or "single"
    purpose: "Why a larger orbit takes longer",
    latex: "T^2 = \\frac{4\\pi^2}{GM} r^3",
    variables: [
      { key: "r", latex: "r", name: "Orbital radius", unit: "m",
        min: 6.6e6, max: 4e8, value: 4.2e7, scale: "log" },
      // …
    ],
    constants: [{ key: "G", latex: "G", value: 6.674e-11, unit: "N m² kg⁻²" }],
    solveFor: ["T", "r", "M"],   // which variables may be the unknown
    solve: { T: (v) => …, r: (v) => …, M: (v) => … },
    derivation: [                // combined tools only
      { say: "Gravity provides the centripetal force",
        latex: "\\frac{GMm}{r^2} = \\frac{mv^2}{r}" },
      // …
    ],
    visual: "orbit",             // name of a renderer in src/minitools/visuals/
    sim: {                       // the mini simulation, or null (see below)
      engine: "orbitlab",
      build: (v) => …,           // returns a ready model for these values
      watch: (model) => …,       // the measured value of the unknown
    },
    wants: null,                 // if sim is null: the engine it is waiting for
    related: "orbits",           // id in pages.js of the full simulation, if any
    verified: false,
  }
  ```

- `src/minitools/visuals/`: one module per kind of picture, reused across
  tools. Every tool must at least get the generic **graph** visual (the
  unknown plotted against any one variable the student picks, with the current
  point marked). Add bespoke pictures where they are cheap: circular path,
  projectile path, orbit, charged particle in a field, ramp, spring, wave,
  circuit loop. A simple, clear picture is enough; it will be refined later.
- `src/minitools/app.js`: the page.

### Mini simulations

Wherever one of the four engines can show the behaviour, the minitool has a
small live simulation of **that one behaviour**, driven by the same sliders.
Nothing fancy.

- **It uses the real engine**, not a separate animation: `Sandbox`,
  `FieldLab`, `OrbitLab` or `CircuitLab`, built through its public API in the
  entry's `sim.build(values)`, stepped by the engine's own `step` / `advance`,
  and drawn by the shared `render.js` of task 3. Do not write a second physics
  model for a minitool, and do not change the engines to suit one.
- `src/minitools/minisim.js` hosts it: a small canvas, the frame loop, and
  rebuilding the scene when a slider changes.
- **Limited interaction**: Play / Pause, Restart, and the sliders. No placing,
  deleting or editing objects, no tool palette, no panels, no camera controls
  (the view fits the scene by itself). At most one direct gesture where it is
  the point of the tool (for example dragging the launch arrow).
- Beside the equation's result, show the value **measured from the
  simulation** (`sim.watch`), labelled as measured, so students see the two
  agree. Do not tune anything to make them agree: a mismatch is information
  for the review.
- Load only the engine a tool needs (`vendor/matter.js` only for sandbox
  minisims).
- Suggested engine for each topic: Motion, Forces, Momentum, Energy, ramps,
  springs, pendulums, collisions and charged particles in fields → sandbox;
  Gravitation, Kepler, orbital and escape speed → orbitlab; field strength and
  potential of charges, plates and wires → fieldlab; Circuits, power lines,
  resistor combinations → circuitlab. Where the engine cannot show it without
  being changed, leave `sim: null` and say why in the report.
- **Tools with no suitable engine yet** (waves, refraction, photons, special
  relativity and the like) have `sim: null` and `wants` naming the simulation
  they are waiting for (`"waves"`, `"modern"`, `"fluids"`, …). They show the
  graph visual only.
- **Standing rule, to be written into `CLAUDE.md`**: whenever a new full
  simulation is added to the site, every minitool whose `wants` names it gets
  a mini simulation in the same piece of work, and `wants` is cleared. The
  structure test lists minitools still waiting, and the developer options
  show the same list.

### The minitool page

One layout for all tools, top to bottom on a narrow window, two columns wide:

1. Title, topic, purpose, and a back link to the catalogue.
2. The equation, typeset large.
3. **Solve for**: buttons choosing which variable is the unknown. The equation
   is shown rearranged for it.
4. One row per remaining variable: symbol (typeset), name, slider, number
   field and unit, using the existing one-row property pattern. Sensible range
   and a log slider where the range spans decades.
5. **Working**: the equation with the current numbers substituted, then the
   result with its unit, typeset, updating live. Three significant figures,
   scientific notation where needed.
6. The mini simulation where there is one, with the graph visual beside or
   below it; otherwise the visual alone.
7. For combinations: the derivation as numbered steps, each with a sentence
   and an equation, revealed one at a time with "Next step" and "Show all".
8. "Open in the full simulation" where `related` is set, and links to the
   single-equation tools the combination is built from.
9. Reset to defaults, and the current values kept in the address so a teacher
   can share a link to an exact set-up.

### What to build

Lay out **all** of these as catalogue entries using the straightforward
textbook formula. Give each `verified: false`. Do not spend time checking
numbers or edge cases; that is the review's job. This list is a starting point
and will be edited to match the course formula sheet.

**Single equations**

| Topic | Equations |
| --- | --- |
| Motion | `v = u + at`; `s = ut + ½at²`; `v² = u² + 2as`; `s = ½(u + v)t`; `v_av = s/t` |
| Forces | `F = ma`; `W = mg`; `F_f = μN`; `F = kx`; `τ = rF sin θ` |
| Momentum | `p = mv`; `FΔt = mΔv` |
| Energy | `W = Fs cos θ`; `E_k = ½mv²`; `E_p = mgh`; `E_s = ½kx²`; `P = W/t`; `P = Fv` |
| Circular motion | `v = 2πr/T`; `a = v²/r`; `F = mv²/r` |
| Gravitation | `F = GMm/r²`; `g = GM/r²`; `E_p = −GMm/r` |
| Electric fields | `F = kq₁q₂/r²`; `E = F/q`; `E = kq/r²`; `E = V/d`; `W = qV` |
| Circuits | `I = q/t`; `V = IR`; `P = VI`; `P = I²R`; resistors in series; resistors in parallel |
| Magnetism | `F = qvB sin θ`; `F = BIℓ sin θ`; `B = μ₀I/2πr`; `Φ = BA cos θ`; `ε = −NΔΦ/Δt`; `ε = Bℓv`; `V_p/V_s = N_p/N_s` |
| Waves | `v = fλ`; `T = 1/f`; `n₁ sin θ₁ = n₂ sin θ₂`; standing waves on a string; `I ∝ 1/r²` |
| Modern physics | `E = hf`; `E_k = hf − W`; `λ = h/p`; `E = mc²`; time dilation; length contraction |

**Combinations**

| Tool | Built from | Result |
| --- | --- | --- |
| Kepler's third law | gravity = centripetal | `T² = 4π²r³/GM` |
| Orbital speed | gravity = centripetal | `v = √(GM/r)` |
| Geostationary orbit | Kepler III with T = 1 day | radius and altitude |
| Escape speed | kinetic + gravitational energy = 0 | `v = √(2GM/r)` |
| Cyclotron motion | magnetic force = centripetal | `r = mv/qB`, `T = 2πm/qB` |
| Velocity selector | electric force = magnetic force | `v = E/B` |
| Mass spectrometer | `qV = ½mv²` then `r = mv/qB` | `r = (1/B)√(2mV/q)` |
| Electron gun | `qV = ½mv²` | `v = √(2qV/m)` |
| Deflection between plates | `E = V/d`, `a = qE/m`, projectile motion | deflection `y` |
| Millikan balance | `qE = mg` | `q = mgd/V` |
| Projectile range | constant-acceleration equations on two axes | `R = u² sin 2θ / g`, height, time |
| Falling without friction | `mgh = ½mv²` | `v = √(2gh)` |
| Block on a ramp | `F = ma` along the slope with friction | `a = g(sin θ − μ cos θ)` |
| Banked curve | normal force components | `tan θ = v²/rg` |
| Conical pendulum | tension components | `T = 2π√(L cos θ / g)` |
| Vertical circle | weight and tension at top and bottom | minimum speed `√(gr)` |
| Mass on a spring | `F = −kx` with `F = ma` | `T = 2π√(m/k)` |
| Simple pendulum | restoring force for small angles | `T = 2π√(L/g)` |
| Collisions in one dimension | momentum, and energy if elastic | final velocities |
| Power lines | `P = VI`, `P_loss = I²R`, transformer ratio | loss against line voltage |
| AC generator | `Φ = BA cos ωt` with Faraday's law | `ε = NBAω sin ωt` |
| Photoelectric stopping voltage | `E_k = hf − W` with `W = qV` | `V_s = (hf − W)/e` |

### Tests

`tests/minitools.test.mjs` checks structure only: ids unique and usable as an
address, every field present, defaults inside their ranges, every `solve`
function returns a finite number at the defaults, every `visual` and `related`
exists, every `sim.build` returns a model at the defaults without throwing,
every tool has either `sim` or `wants`, and the stubs match the catalogue. Do not write
numerical tests against expected values; those are added in the review.

Done when: every entry above appears in the catalogue and opens a working page
at its own address from the one shared script; every equation, rearrangement,
working line and derivation step is typeset; every tool an engine can show has
a running mini simulation with a measured value; the page works at 900 px and full width in both
themes; adding a tool means adding one catalogue entry and nothing else.

## 7. Homepage

- The homepage is `index.html`, so it is what opens at the site's address.
  It replaces the temporary redirect left by task 2.
- Content, in order: the logo and name; one or two sentences on the goal
  (a place for physics students to test their intuition against what the
  equations really predict, by changing things and watching); a main button
  to the simulations; a card for each of the four simulations with its
  description; a section introducing the minitools with a few featured cards
  and a link to the full catalogue; a short "how to use this in class or at
  home" note; a footer with the stated limits link (README) and credits.
- **A clearly visible link to the source on GitHub**,
  `https://github.com/J031-S/Physics-Sim`, with a GitHub icon: in the footer
  and also near the top of the page (for example beside the main button).
- The copy is placeholder text to be rewritten by the author: keep it short
  and put it in one obvious place in the file.
- It uses the shared shell, theme and settings like every other page, and
  scrolls normally (the simulation pages set `overflow: hidden` on `body`;
  the homepage, catalogue and minitool pages must not).
- The navigation drop-down gains Home and Minitools entries, and the header
  brand links to the homepage.

Done when: opening the site shows the homepage; every simulation and the
minitool catalogue is one click away; the GitHub link opens the repository;
clicking the top-left Physium brand on any page returns here; it reads well on
a phone-width window.

## 8. Finish

- `README.md`: the new pages, the minitools, developer mode and how to turn it
  on. `CLAUDE.md`: the new file table, the page list, `src/site/`, the theme
  token rule ("no colour literals outside `theme.js`"), the address scheme and
  `npm run pages`, how to add a page, how to add a minitool, and the standing
  rule that a new simulation supplies mini simulations for the minitools
  waiting on it.
- Write `docs/physium-ui-report.md`: what was done per task, anything left
  undone and why, every place a refactor could not be a pure move, every
  minitool whose formula or ranges you were unsure of, and what you could not
  verify by looking.

## Not in this list

Checking minitool physics against analytic values, refining their visuals and
ranges, choosing the final colour scheme, and writing the final homepage copy.
