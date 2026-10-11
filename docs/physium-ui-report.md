# Physium work list: report

Branch `claude/physics-fixes`, one commit per task (task 3 in two). After every task `npm run check`, `npm test` and `npm run test:ui` passed (final run: 237 unit tests, every smoke suite). Pages were looked at in Chromium (Playwright) at 1300 px and 900 px wide, in the light and dark themes, after each task; the homepage also at 390 px.

No engine or model file, `vendor/matter.js` or `src/fieldlab/arrows.js` was changed. Nothing is loaded from a CDN.

## 1. Rename to Physium; one logo asset

Done. The mark is `assets/logo.svg`: the `\varphi` outline from KaTeX's Math Italic font, filled with `currentColor`, used as the header mark (a CSS mask), the favicon and the homepage hero. Credit in `vendor/katex/NOTICE.txt`. Preferences moved from `physics-sim-ui` to `physium-ui`; the old key is read once.

## 2. Shared site shell and addresses

Done. Pages live at `/`, `/sims/Mechanics`, `/sims/EMFields`, `/sims/Orbits`, `/sims/Circuits`, `/minitools/` and `/minitools/<id>`; no link or address ends in `.html`. `server.mjs` resolves addresses as GitHub Pages does (file, file + `.html`, folder → 301 to the slash → `index.html`, otherwise `404.html` with status 404); `tests/site-smoke.mjs` checks this against a running server. `404.html` redirects a wrong case, a trailing `.html` and the old addresses. The brand, navigation and Website section are built once (`src/site/shell.js`) from `src/site/pages.js`. The brand was clicked on every page in Chromium and returns to the homepage each time.

## 3. Colour tokens, stylesheet split, renderers

Done. Every colour is a token in `src/site/theme.js` (light and dark, grouped, described); `styles/tokens.css` is generated from it; a test fails on a colour literal anywhere in `styles/` or `src/` outside `theme.js`. Stylesheets are split into `styles/base.css` and one per page. Scene drawing moved into `src/sandbox/render.js`, `src/fieldlab/render.js`, `src/orbitlab/render.js` and `src/circuitlab/render.js`. Pixel comparison of 48 page states (both themes, both widths) and extra orbit/circuit states against the pre-refactor pages: identical apart from run-to-run noise the old code shows too.

Places where the split is not a pure move:

- `fieldlab/render.js` `compute()` returns the legend and contour-step text instead of writing them into the page; the page writes them. The canvas transform and clear stay in the page.
- `circuitlab/render.js`: `meterText` takes the AC flag as an argument instead of reading the page's state, and `dotRuns(lab, s)` takes the circuit as an argument.
- `orbitlab/render.js` receives the page's number formatters as options (they depend on the page's SI/km switch).
- Input overlays (grab marker, selection box, impulse arrow, wire being drawn, component being placed), panels, graphs and preset thumbnails stay in the pages; moving them would need logic rewritten.
- Named colours `white` in CSS became the token `on-colour` (same value).

## 4. Developer options

Done, all behind developer mode (`?dev`, or the switch at the foot of the Website section; remembered). With it off nothing shows and the pages are pixel-identical to before except that the switch replaced the old "Debug · icon preview" block. Checked end to end in Chromium: a scheme built in the tweaker (colours, radii, shadow, button and toggle style, patterns, fonts, grid style, line weights, icon set, custom CSS), saved, exported, reset, re-imported, undone/redone, copied as code (a test checks "Copy as code" of the empty scheme reproduces `theme.js` byte for byte), held to compare, and seen on every page and canvas without reloading; developer mode off restores the defaults.

Limits and choices:

- The size and choice tokens (radius, border, shadow, density, button/toggle/slider/focus/header style, patterns, fonts) are applied by override rules generated in `src/site/surface.js`, only when a scheme changes them. The base stylesheets keep their own literal sizes, so the defaults in `theme.js` describe them rather than drive them. Wiring every size into the base CSS would have changed rules throughout and risked the pixel-identical default.
- Canvas line weight scales every line on a scene canvas; vectors and field lines have their own factors on top. There is no separate "outlines" factor beyond the overall weight.
- Icon stroke weight affects outline sets only (Lucide, Tabler, Heroicons, Feather); filled sets have no stroke.
- A canvas background pattern is drawn by CSS behind the canvas, so **Save canvas PNG** does not include it. Preset thumbnails take new colours the next time the presets panel opens.
- "Pick from page" lists colour tokens whose value exactly matches the clicked element's colour, background, border or outline; it cannot see canvas drawing.
- Density settings are approximations (control padding, row margins, toolbar gaps).
- Five icon sets were added (Phosphor, Heroicons, Feather, Bootstrap Icons, Remix 4.8.0 under its Apache 2.0 licence); every set supplies every icon name. Closest matches used where a set has no glyph are listed in `vendor/icons/NOTICE.txt` (for example Heroicons has no circle, triangle, magnet or keyboard; Material and Heroicons have no GitHub mark).
- Eight open fonts (Latin subset, OFL) in `vendor/fonts/`, loaded only when a scheme uses them.
- The orbits page reports simulated seconds per frame in the performance overlay instead of steps, because `OrbitLab.advance` does not return a step count and the model was not to be changed.
- In the component gallery the Theme select inside each pane shows the stored preference, not the pane's forced theme.

## 5. Equation rendering

Done. KaTeX 0.16.22 vendored (minified script and stylesheet, the twenty `.woff2` fonts, licence, `package.json`), unmodified. `src/site/math.js` loads it on first use (a test follows the simulation pages' imports to check they never load it); a LaTeX error shows its source in the `math-error` style and is listed under the developer checks. Checked in Chromium with every non-local request blocked: equations typeset in both themes and scale at 140% GUI size. Scrolling pages now follow the GUI size like the simulation panels.

## 6. Minitools

Done. 75 tools (53 single equations, 22 combinations), every entry in the work list, all `verified: false`. One page script builds every tool page; `npm run pages` writes the 75 stubs; `tests/minitools.test.mjs` checks structure and the stubs. All 75 pages were opened in Chromium with every Solve-for choice pressed: no page errors and no equation that failed to typeset.

Mini simulations: 54 tools (sandbox 33, orbits 7, fields 7, circuits 7), each built through the engine's public API and drawn by the shared renderer, with a measured value beside the formula's result. 21 tools have `sim: null` and a `wants`: induction (5), waves (5), modern (7), statics (1: torque), mechanics-3d (2: banked curve, conical pendulum), mechanics-ropes (1: vertical circle, because sandbox cables cannot go slack).

Places where a scene is set up from the formula's own quantities (set-up only, never the measurement; listed so the review can judge them):

- Parallel plates (field between plates, work moving a charge): plates charged ±ε₀V/d. They are finite, so the measured field is about 2% under V/d at the defaults (492 vs 500 V/m) and the work about 3% under.
- Orbits: satellites launched at √(GM/r) for a circular orbit; playback speed set from the engine's predicted period.
- Power (W/t): the push is √(2mW)/t so that the ball has gained W after t. Power lines: the load resistor is V²/P − R.
- Force on a moving charge and force on a wire: the 2D engines only represent B at right angles to the motion, so the scenes use B sin θ as that component (said in the caption).
- Escape speed: the measured value is the speed that would make the total energy zero, from the engine's own energies at launch.
- Millikan: measured charge = m(g + a)/E from the drop's measured acceleration.

Measured values differ from the formula where the model differs (useful for the review, not tuned): finite plates; a pendulum released from 10° (3.481 s against 3.475 s); projectile range and some displacements by up to a step (1/120 s) of motion.

Engine limits: the mini simulations use the engines' own validation. Defaults were chosen inside them (circuits: emf ≤ 1000 V, so power lines default to 1000 V; fields: charges ≤ 20 nC and a uniform magnetic field ≤ 1 mT, so the wire tool defaults to 0.5 mT; sandbox: masses 0.05–100 kg, fields ≤ 100). Moving a slider outside makes the simulation say it cannot show those values; nothing is clamped.

Formulas or ranges I was unsure of (the review should look at these first):

- Units: modern-physics energies are in joules; the course may use eV. Charges in the field tools are in coulombs on log sliders (1e-10 to 1e-3); the sandbox tools use whole coulombs (an idealised world).
- Collisions in one dimension solves for v₁ only, with a coefficient of restitution; v₂ is shown as a note from the simulation.
- Deflection between plates, y = qVL²/(2mdu²), assumes the charge enters along the centre line and leaves before hitting a plate.
- Standing waves assume a string fixed at both ends (fₙ = nv/2L); intensity uses I = P/4πr² for "I ∝ 1/r²".
- Snell's law: total internal reflection shows "no solution for these values".
- Geostationary orbit uses a sidereal day (86 164 s) by default; the Kepler and orbit tools hold the central body fixed.
- Banked curve, conical pendulum and vertical circle formulas are the frictionless textbook forms.
- Electron gun allows masses down to 10⁻³¹ kg on the slider, but the sandbox only takes 0.05–100 kg, so real electrons show the "cannot show" message.
- Ranges in general are first guesses and will need editing to the course formula sheet.

Visuals: the generic graph for every tool, and ten cheap pictures (circle, projectile, orbit, charged particle, ramp, spring, wave, circuit, point charge, pendulum), one module each in `src/minitools/visuals/`. Tools with no fitting picture show the graph only.

## 7. Homepage

Done. `index.html` replaces the temporary redirect: logo and name, goal, main button, GitHub link with the GitHub mark (beside the main button and in the footer), four simulation cards, featured minitools and a link to the catalogue, a short "in class or at home" note, footer with the README limits link and credits. All copy is in one JSON block marked PLACEHOLDER COPY at the top of `index.html`. The navigation gains Home and Minitools. Checked at 1300, 900 and 390 px.

## 8. Docs

`README.md` describes the homepage, the minitools, equation typesetting and developer mode; `CLAUDE.md` has the new file table, the page list and addresses, `src/site/`, the token rule, `npm run pages`, how to add a page and a minitool, and the standing rule for minitools waiting on a simulation.

## What I could not verify by looking

- Only Chromium was used; Firefox and Safari were not checked (Safari's `zoom` and `color-mix` support in particular).
- The site has not been served from GitHub Pages itself; addresses were checked against `server.mjs`, which follows GitHub Pages' documented behaviour.
- Screen readers were not tried; keyboard use was spot-checked (tweaker, Solve-for buttons, rows, navigation), not traversed on every page.
- Of the 75 tool pages, six were looked at in screenshots; the rest were opened headless and checked for errors and failed equations only. The mini simulations were watched for a few seconds each; long runs were not.
- Not every combination of developer options was looked at: all patterns were generated, but only dots, graph and noise were seen; five of the eight fonts were seen on a page.
- The GUI size was looked at at 80%, 100% and 140% on a few pages, not all.
- Phone width was checked for the homepage only.
