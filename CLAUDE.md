# Physics Sim

Interactive 2D mechanics and electromagnetism sandbox for teaching high-school / introductory physics (kinematics, forces, springs, pulleys, electric and magnetic fields). Students use it to check their intuition against "what really happens", so **physical correctness matters more than visual polish**: a result that looks plausible but disagrees with the textbook formula is a bug.

The site has four pages, switched from the drop-down at the left of the top bar (`src/nav.js`): the mechanics sandbox (`index.html`), the electric & magnetic fields tool (`fields.html`, code in `src/fieldlab/`), the orbits & gravitation tool (`orbits.html`, code in `src/orbitlab/`) and the electric circuits tool (`circuits.html`, code in `src/circuitlab/`). Most of this file is about the sandbox; the other three tools each have their own section below.

`README.md` is the user-facing manual (controls, feature behaviour, model assumptions). Keep it in sync when behaviour changes.

## Commands

```sh
npm start            # static dev server on http://localhost:3000 (PORT overrides); no build step
npm run check        # node --check on every source file
npm test             # physics/unit regressions (node:test, no install needed)
npm ci && npm run test:ui   # DOM interaction suite (needs happy-dom)
node --test tests/wedge.test.mjs                       # one file
node --test --test-name-pattern="Atwood" tests/*.test.mjs   # one test
```

Run `npm run check && npm test` before finishing any change. Run `npm run test:ui` as well when touching `src/app.js`, `index.html`, `fields.html`, `src/fieldlab/app.js`, `orbits.html`, `src/orbitlab/app.js`, `circuits.html`, `src/circuitlab/app.js`, or anything a control binds to. Node 20.11+.

## Architecture

No bundler, no framework, no runtime dependencies. `index.html` loads `vendor/matter.js` (Matter.js 0.20.0, UMD, sets `globalThis.Matter`) and then `src/app.js` as an ES module. Opening via `file://` does not work.

| File | Owns |
| --- | --- |
| `src/physics.js` | `Sandbox`: bodies, global settings, locks, grab/throw, resize, springs, rods, spring guides, the fixed-step `step()` |
| `src/contacts.js` | Contact response: Coulomb friction, restitution, exact circle contact. Replaces Matter's velocity resolver; runs a resting-contact pass before `Engine.update` |
| `src/presets.js` | Ready-made experiment scenes, each built through the public `Sandbox` API and checked against its textbook result in `tests/scenes.test.mjs` |
| `src/fields.js` | Field regions, gradient profiles, superposition, Lorentz velocity update, pairwise Coulomb forces |
| `src/mechanisms.js` | Belts, conveyor contact, delegation to pulley cables |
| `src/pulley.js` | Tangent cable geometry and the coupled position/velocity cable solver |
| `src/group-move.js` | Layout translation of connected assemblies (Select tool) |
| `src/field-view.js` | Field rendering and field drag/rotate/resize gestures |
| `src/app.js` | Canvas drawing, pointer/keyboard input, menus, settings panel, the `requestAnimationFrame` loop |
| `src/preferences.js`, `src/icons.js` | Persistent website preferences (localStorage key `physics-sim-ui`), icon sets. Shared by every page, so every control they touch is optional |
| `src/nav.js` | The drop-down of links that switches between the pages. The links themselves are written out in each page's HTML: a new page is added to all of them |
| `src/fieldlab/model.js` | `FieldLab`: sources, E, V, B, A_z, forces, field-line tracing, contours. No DOM |
| `src/fieldlab/presets.js` | Field arrangements with the textbook result each one shows |
| `src/fieldlab/app.js` | The fields page: drawing, input, panels |
| `src/orbitlab/model.js` | `OrbitLab`: central body, satellites, the leapfrog integrator, orbital elements from the state vector, predicted paths, swept areas, third-law points. No DOM |
| `src/orbitlab/presets.js` | Ready-made launches with the textbook result each one shows |
| `src/orbitlab/app.js` | The orbits page: drawing, input, panels, graphs, the frame loop |
| `src/circuitlab/model.js` | `CircuitLab`: components on a grid, modified nodal analysis, the linear solver, capacitor time stepping, fault detection. No DOM |
| `src/circuitlab/presets.js` | Ready-made circuits with the readings each one should show |
| `src/circuitlab/app.js` | The circuits page: drawing, input, panels, graphs, the frame loop |
| `server.mjs` | Tiny static server for local use only |
| `vendor/` | Third-party code and licences. Do not edit `vendor/matter.js` |

`Sandbox` has no DOM dependency: everything physical must stay testable from Node by importing `src/physics.js` after setting `globalThis.Matter`. Keep DOM and canvas code in `app.js` / `field-view.js`.

## Units and conventions (easy to get wrong)

- The public API is **SI, y up, counter-clockwise positive**. Matter is pixels, y down, milliseconds, with velocities normalised to a 60 Hz step.
- `SCALE = 100` px per metre. `DT = 1/120` s fixed step. `toEngine` / `toWorld` flip y.
- Velocity m/s → Matter: `v * SCALE / 60` (and negate y). Angular velocity rad/s → Matter: `-omega / 60`. Angle → `-angle`.
- Force N → Matter: `F * SCALE / 1e6` (see `applyForce`). Inertia kg·m² ↔ Matter: multiply/divide by `SCALE²`.
- Always read motion through `sim.state(id)` (returns SI `x, y, vx, vy, angle, omega`) rather than raw `body.velocity`.
- Engine gravity is disabled (`engine.gravity.scale = 0`); gravity, damping, springs, Coulomb and field forces are applied explicitly in `Sandbox.step()`.
- Inertia comes from `Sandbox.momentOfInertia(o)` (textbook disc / rectangle / right triangle), never from Matter, which scales polygon inertia by 4. Call it after any change to mass or dimensions.
- Position lock = `inverseMass 0` plus anchor restore; rotation lock = infinite inertia. `o.mass` and `o.freeInertia` hold the real values, so restore from those, never from the body.
- Link records live in `sim.links` with `type` of `spring`, `rod`, `belt` or `pulley`. None of them uses a Matter `Constraint`: all are solved by this code (rods in `Sandbox.solveRods`).

## Engine API for UI features

These exist on `Sandbox` and are covered by tests; the UI should call them rather than reach into Matter bodies.

- `updateFloor({ friction, restitution })`, `floorMaterial`: floor and walls share one material.
- `exportScene()` → plain JSON; `Sandbox.fromScene(json)` → new sandbox (throws a readable `Error` on a bad file). Use this pair for save/load, presets and reset-to-start.
- `setPose(id, { x, y, angle })`, `setVelocity(id, { vx, vy, omega })`: exact placement for building scenes.
- `netForce(id)` → `{ x, y }` in newtons over the last step, including contact, friction, rod and cable forces.
- `measure(id)` → speed, momentum, kinetic (translational + rotational), gravitational and electric energy; `energy()` → scene totals `{ kinetic, gravitational, elastic, electric, total, fieldWork }`.
- Electric energy covers the conservative electric forces only: the global uniform field (`−qE·r`, zero at the origin) and mutual Coulomb pairs. Field **regions** have sharp edges and therefore no potential energy; the work they do on charges accumulates in `fieldWork`. `total − fieldWork` is the quantity that stays constant in a lossless scene. Electric energy and `fieldWork` can both be negative.
- Potential energies are evaluated at `potentialPoint(id)`, half a step behind the body's position, because the stored velocity belongs to the middle of the last step. Without that shift the displayed total wobbles by a few tenths of a percent through every swing.
- `step()` advances exactly one 1/120 s step and can be called while paused.

## Order of operations in `step()`

Per body: Lorentz velocity update → gravity force → exponential damping. Then Coulomb pairs, spring forces, grab/lock/resize holds, `mechanisms.beforeStep()`, `solveRestingContacts` (bodies already touching have their pending acceleration constrained before positions move), `solveRods` (an impulse along each rod's start-of-step direction so its length is exact after positions advance; time-symmetric, so pendulums keep their energy), `Engine.update` (whose velocity resolver is ours, handling new impacts), locks again, spring guides (6 passes), `mechanisms.afterStep()` (belts, conveyor contacts, cables). Changing this order changes results; re-run the numerical tests if you touch it.

## Fields tool (`src/fieldlab/`)

The sources are static and the canvas is redrawn on change. The one thing integrated in time is `TestCharges` (electric scene): the frame loop runs only while a test charge is moving. `FieldLab` is independent of `Sandbox` and of Matter.

- The model is **SI throughout** (C, C/m², A, A/m, T, V), y up, angles anticlockwise in radians. `app.js` converts to nC, nC/m², µT and degrees for display; `FIELDS` there mirrors `LIMITS` in `model.js`.
- The screen is a slice through a 3D arrangement. Point charges are true 3D charges (`kq/r²`). Plates, wires and magnets extend into the screen without end, so they are 2D sources (logarithmic potentials). Both kinds are mirror-symmetric about the screen, which is why the in-plane field is the whole field there.
- A plate and a magnet face share one kernel (`kernelG`, `kernelP`): a strip of charge has `E = σG/2πε₀`, a sheet of current has `B = μ₀K ẑ×G/2π`. A magnet is two sheets, `+K` on the face to the left of its S → N axis.
- **Magnetic lines are contours of `A_z`** at equal steps (marching squares), so equal flux lies between neighbours. Do not replace this with integration along B: lines would stop closing.
- **Electric lines are integrated** (RK4 on the unit field) from positive charges, evenly in angle, then backwards from negative charges where too few arrived. Plates and the region's edge are seeded by flux. A line that reaches a plate is finished with a straight step, because RK4 samples beyond the plate see a different field.
- Uniform angular seeding cannot agree with flux for 3D charges in a flat slice (see the README). This is a stated limit of the picture, not a bug to fix by changing counts.
- `TestCharges.step(dt)` is velocity Verlet with substeps that shorten near point charges. A test charge is +1 nC and 1 µg (`TEST_CHARGE`), feels the field without adding to it, and stops on a plate, at a negative charge, or out of range. Its path is not a field line (inertia); do not "fix" that. `fillGrid(bounds, spacing)` replaces them all with one per grid point (the Test grid button); trails are then drawn as a single path, so keep them short.
- Equipotentials come with the sampled potential grid, which `app.js` turns into the red/blue shading (opacity ∝ |V| up to the returned `scale`).
- Placing anything returns the tool to Grab, as in the sandbox.
- **Panning must not change the picture.** Line tracing uses `anchoredBounds()` and contour steps use `referenceBounds()` (both tied to the sources, not the view); contour samples sit on a world lattice; background-field lines start at fixed values of its stream function; arrows sit where a line crosses a world lattice. Do not place anything by distance along a polyline or by the view's edges.
- New behaviour needs a test in `tests/fieldlab.test.mjs` against the formula. `tests/fieldlab-smoke.mjs` drives the page in happy-dom; its `// ---- checks ----` part uses only DOM calls, so it can also be run inside a real browser.

## Orbits tool (`src/orbitlab/`)

One fixed central body and up to 8 satellites of negligible mass under `F = GMm/r²`. `OrbitLab` is independent of `Sandbox`, `FieldLab` and Matter. `orbits.html` loads `styles.css`, then `fields.css` for the shared `.fl-*` panel pieces, then `orbits.css`.

- The model is **SI throughout** (m, kg, s, J), y up, anticlockwise positive, `G = 6.674e-11`. `app.js` converts to km, km/s, minutes/hours/days and prefixed joules for display; the forms there mirror `LIMITS` in `model.js`. The scene is ~10⁷ m across, so the view scale is pixels per metre of order 10⁻⁵.
- The launch point is on +y at distance `radius` from the centre; `angle` is the velocity's direction above the local horizontal, which there is +x. A horizontal launch therefore goes **clockwise** and has negative angular momentum; the page shows its magnitude.
- **`orbitElements(mu, state, bodyRadius)` is the single source of every orbit readout and of the predicted path** (`orbitPath`): specific energy, angular momentum and the eccentricity vector. Do not measure elements from the trail.
- **The integrator is a leapfrog in a stretched time** (`leap()` and the comment on `#advance`): `dt = (r/μ) ds`, fixed `ds` per flight, set at launch from `stepFraction`. For one attracting body every step ends exactly on the conic, so energy, angular momentum and the orbit's shape are conserved to rounding and only timing has error (about 10⁻⁷ of a period per orbit). This depends on `binding` being exactly `μ/r₀ − v₀²/2` at launch. Do not replace it with an Euler step (it fails every conservation test: orbits spiral outward) or with a scheme that steps in fixed seconds (it fails the test that the path stays on the launch conic to 10⁻⁹, and needs far smaller steps near periapsis).
- `advance(dt)` returns the seconds actually advanced. It stops short when `maxSteps` is reached rather than lengthening steps; `app.js` tunes `maxSteps` to about 6 ms of work per frame and reports the achieved warp.
- A step that ends below the surface is redone by bisection on its length so that the satellite stops on `r = R` (status `impact`). `SKIM` keeps an orbit that touches `r = R` from landing through rounding.
- An unbound satellite is dropped from the integration beyond `rangeFactor` launch radii (status `escaped`).
- Swept areas (`sweep.sectors`) and the timed period (`measuredPeriod`, from the angle swept) are **measured** from the integrated motion, which is what makes them a check on Kepler's laws. `thirdLaw` gets one point per satellite, on its first completed orbit, and survives `clear()`.
- A closed orbit's trail is recorded for one turn only (`trailEnd`); `history` holds (time, distance, speed) for the graphs at 400 samples per period.
- `setBody` removes the satellites and resets the clock; it refuses a body whose surface escape speed exceeds `LIMITS.speed`.
- Stated limits (fixed body, point-mass gravity, no drag, no spin, no third bodies) are listed in the README. They are the model, not bugs.
- New behaviour needs a test in `tests/orbitlab.test.mjs` against the formula. `tests/orbitlab-smoke.mjs` drives the page in happy-dom; its `// ---- checks ----` part uses only DOM calls and `await frame()`, so it can also be run inside a real browser. It finds the launch point and arrow handle from `canvas.dataset.launchPoint` / `aimHandle`.

## Circuits tool (`src/circuitlab/`)

DC circuits of ideal components, solved exactly. `CircuitLab` is independent of `Sandbox`, `FieldLab`, `OrbitLab` and Matter. `circuits.html` loads `styles.css`, then `fields.css` for the shared `.fl-*` pieces (toolbar, view buttons, forms), then `circuits.css`.

- The model is **SI throughout** (V, A, Ω, F, s, W, J, C). `app.js` formats with prefixes (`si`, four significant figures); its `FIELDS` mirror `LIMITS` in `model.js`.
- **Every number on the page comes from `lab.solve()`** (a `Solution`: `status`, `problems`, `notices`, and a reading for each component). Do not compute a current or p.d. in `app.js`.
- A component has two terminals (three for `switch2`). Its `nodes` are node names: either given directly (`nodes: ["a", "b"]`, as the tests do) or the grid points its terminals sit on (`x`, `y`, quarter-turns `rot`, y up; a wire has `x1, y1, x2, y2`). Terminals on the same node are joined. Terminal 0 is the + of a cell, capacitor or meter, and the common contact of a two-way switch.
- **Sign conventions.** `flow` is the current through a component from terminal 0 to terminal 1 (for `switch2`, to its live contact); `voltage` is V(terminal 0) − V(terminal 1); `power` is what it absorbs. For a cell `current = −flow`, the current it drives out of its + terminal, and `emfPower`, `lost` and `supplied` describe it as a source. A reading is `null`, never NaN, where no value exists.
- **Modified nodal analysis** (`#assemble`): Kirchhoff's current law at each node except one reference per connected section (the negative terminal of its first cell), plus one unknown current and one equation for every "v" branch (cell, wire, ammeter, closed switch, 0 Ω resistor). Solved by `factor` / `substitute`: Gaussian elimination with scaled partial pivoting, kept as LU so one elimination serves every time step. **Do not model a wire as a small resistance or a voltmeter as a large one**; the tests for meters changing nothing and for exact zeros depend on it.
- **Loops of zero resistance** make the matrix singular. They are found from the graph (fundamental cycles of a spanning forest), not from pivots. Each gets one extra unknown (which absorbs any disagreement, so the solve never fails and other sections are unaffected) and one extra equation that fixes how current shares: `Σ I/C = −Σ dE/dt` round a loop through capacitors (parallel capacitors share in proportion to C), `Σ I = 0` round a loop of plain wire (equal sharing, reported as a `split` notice). A cap-free loop whose EMFs do not add to zero is a fault: `short` for one cell, `conflict` for several; readings in that section are `null`.
- **Three views of the circuit** (`branchOf`): `now` (a capacitor holds its p.d.; used for readings at an instant and for the first instant after any change), `step` (trapezoidal companion: conductance 2C/h beside a current source), and `jump` (charge moved in no time between capacitors or ideal cells joined by zero resistance; resistances pass none). To add an inductor, give it the same three stamps; nothing else in the solver is specific to capacitors. A non-linear element would re-linearise its stamp inside `#solveAt` until it converges; there is none yet.
- **Time step**: `timestep` is 1/`STEPS_PER_TAU` (100) of the shortest time constant, found in `#dynamics` as the eigenvalues of the capacitor state matrix. `advance(dt, { maxSteps, resolution })` takes whole fixed steps, carries the remainder, and returns the seconds covered; it stops short at `maxSteps` rather than lengthening a step, and `app.js` reports the achieved rate. `resolution` only ever halves the step. An EMF may be a function of time (`emf: (t) => …`, with `lab.maxStep`), which is what the AC view will use.
- **Energy** over a step is mean p.d. × mean current × h, which makes supplied = stored + dissipated exact for the trapezoidal step. Do not change it to the mean of the two powers.
- **Exact zeros**: a branch on no closed loop (`findBridges`) carries exactly 0; a current or p.d. below the rounding floor of its section (`#flows`) is reported as 0. Tests compare such readings with `assert.equal(…, 0)`.
- **The grid**: `move` and position `update`s are part of a gesture and need `settle()` to end it; until then capacitors are not disturbed and `advance` returns 0. `settle` cuts wires at junctions, removes duplicates, and (given the component's id) removes wire lying across the component just dropped, which is how a meter is inserted in series. `move` takes the wire ends on the component's terminals with it (`attached`); `rotate` does not, so two quarter-turns reverse a component.
- **Views** in `app.js` follow the fields page: `[data-mode]` buttons, `[data-for]` on palette buttons, `setMode`, one `CircuitLab` per view in `labs`, and `view` on each preset. There is one view, `dc`. An AC view adds its own entries to each; do not fork the page.
- Stated limits (ideal components, fixed-resistance lamp, instantaneous charge sharing, peak-scaled dot speed) are listed in the README. They are the model, not bugs.
- New behaviour needs a test in `tests/circuitlab.test.mjs` against the formula, with expected values written from the formula. `tests/circuitlab-smoke.mjs` drives the page in happy-dom; its `// ---- checks ----` part uses only DOM calls and `await frame()`, so it can also be run inside a real browser. It finds grid points on the canvas from `canvas.dataset.view` (`x, y, scale`), and reads meters from `#meter-<name>` and the selected component from `#reading-<key>`.

## Code style

- Plain modern JavaScript, ES modules, Prettier defaults (double quotes, semicolons, trailing commas, 80 columns). No TypeScript, no new dependencies without asking.
- Validate at the API boundary and throw `Error` with a student-readable message; `app.js` shows it as a toast. Validation is atomic: reject the whole patch, never apply half of it.
- Ranges for every editable constant are defined next to the setter (`updateConstants`, `updateLink`, `updateSettings`, `Fields.update`) and mirrored in the menu definitions in `app.js`. Change both together.
- Comments explain physics or non-obvious engine workarounds, not what the line does.

## Testing expectations

- Tests are numerical regressions: build a scene, `run(s, seconds)`, compare against the **analytic** result with a stated tolerance. New physics needs a test of this kind, checked against the textbook formula rather than against whatever the engine currently outputs.
- Each test creates its own `Sandbox` and calls `s.dispose()`.
- When fixing a realism bug, add the failing analytic case first.
- `tests/editor-smoke.mjs` drives the real `index.html` through happy-dom with a stubbed canvas context. It cannot see pixels, so describe any visual change you could not verify.

## Known physics gaps

Measured against analytic results (October 2026). Do not assume these behave correctly, and do not write tests that enshrine them:

- **Conveyor traction is about 1.8 × μg** instead of μg (`conveyorContacts` in `mechanisms.js` still uses its own friction estimate rather than the contact solver).
- **Restitution** is `max(e₁, e₂)` for a pair. A ball at `e = 1` under gravity loses about 0.1% of its height per bounce.
- **Air resistance and linear damping are rates (s⁻¹), not forces**, so terminal velocity is independent of mass and size.
- **Pulley cables cannot go slack** (they push like a rod).
- **Extreme stacked mass ratios** (about 2000:1, heavy on light) rest correctly but rattle by a millimetre or two; the contact solver stops at a work budget.
- **A magnetic field removes speed from a charged body that is sliding on a surface or held by a rod**, because the rotated velocity component is discarded by the contact/constraint (a charged pendulum in a 2 T field loses about 5% of its energy in 30 s).
- **No continuous collision detection**: bodies tunnel through the 0.5 m floor/walls above roughly 100 m/s, and through thin bodies from about 30 m/s.
- New bodies default to angular damping 0.05 s⁻¹ and new springs to damping 0.3 N·s/m, so default scenes are not energy-conserving.

## Working agreements

- Do not commit or push unless asked.
- Scenes are transient by design (no save/load); only website preferences persist.
- Prefer small, verifiable changes. For anything that alters simulated behaviour, report the before/after numbers from a test, not just "tests pass".
