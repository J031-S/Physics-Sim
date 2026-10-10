# Physics Sim

Interactive 2D mechanics and electromagnetism sandbox for teaching high-school / introductory physics (kinematics, forces, springs, pulleys, electric and magnetic fields). Students use it to check their intuition against "what really happens", so **physical correctness matters more than visual polish**: a result that looks plausible but disagrees with the textbook formula is a bug.

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

Run `npm run check && npm test` before finishing any change. Run `npm run test:ui` as well when touching `src/app.js`, `index.html`, or anything a control binds to. Node 20.11+.

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
| `src/preferences.js`, `src/icons.js` | Persistent website preferences (localStorage key `physics-sim-ui`), icon sets |
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
