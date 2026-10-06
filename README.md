# Physics Sim — kinematics workspace

A canvas-first browser-based 2D physics workbench: create a scene, change a variable, and watch what happens. The interface is an original implementation; the reference sandbox's source/assets were not copied.

## Run locally

Install Node.js 20.11+ (22+ recommended), then:

```sh
git clone https://github.com/J031-S/Physics-Sim.git
cd Physics-Sim
npm start
```

Open http://localhost:3000. Running the app requires no dependency installation or build step. The optional DOM test suite uses a development dependency. Matter.js 0.20.0 is vendored with its MIT licence. After downloading the repository, the app needs no internet connection. Alternatively, use any static web server such as VSCodium's Live Server. Opening `index.html` via `file://` is not supported because the app uses ES modules.

The static files can be hosted on GitHub Pages or Cloudflare Pages later. This commit does not configure or publish a deployment.

## What works

- Balls, rectangular blocks, right triangles, fixed walls, rings, arcs, open troughs, drawn paths and convex drawn solids.
- Floating, collapsible tool palettes, inspector, optional graph panel, and fullscreen.
- Per-object acceleration equations with clickable symbols and a safe mathematical parser.
- Mouse tools for movement, rotation, uniform resizing, velocity editing, ruler measurement, and world-anchor movement.
- Position, size, angle, mass, initial linear/angular velocity, friction, restitution, and constant applied force controls.
- Springs with stiffness in N/m and viscous damping in N·s/m.
- Rod/pivot constraints and unilateral ropes. Connections attach to body centres or fixed world points.
- Play/pause, 1/120-second stepping, initial-condition reset, and 0.25–2× playback.
- Pan, zoom, fit scene, velocity vectors, applied-force/gravity vectors, and motion trails.
- Live speed, component velocity/acceleration, displacement, position, kinetic energy, and motion graphs; CSV measurement export.
- Local autosave, validated JSON import/export, undo/redo, and duplication/deletion.
- Uniform motion, constant acceleration, circular motion, curved track, projectile, pendulum, spring oscillator, collision, and inclined-plane presets.
- Keyboard shortcuts and a help dialog. Click the question mark in the top bar.

### Editing and saving

**Right-click an object** to open its property menu at the cursor. Edit its name, position, velocity, dimensions, mass, friction, restitution, forces, colour, fixed state, or motion equations. Duplicate and Delete are included. Changes apply on Enter or leaving a field; motion equations use their Apply button. Playback continues while the menu is open. Property changes apply live without resetting elapsed time, other bodies, trails or recordings. Escape, clicking outside, or the close button dismisses the menu. Use Open in inspector for the side panel. With a selected object and canvas focus, Shift+F10 opens the same menu.

Create objects by selecting a tool and clicking the canvas. The tool remains active until you choose another tool or press V. Use Select to drag objects, Rotate to drag around the centre, Resize to scale from the centre, and Velocity to drag a velocity vector (one metre on the canvas represents 1 m/s). Draw path makes a fixed surface; Draw solid creates the convex hull of the drawn outline. Concave freehand bodies are not yet supported.

Grabbing a running object pauses the simulation. Dragging after a run captures the current positions and velocities of **all** bodies as the new initial setup, applies the edit, and resets elapsed time to zero. **Use current as start** performs this capture explicitly. Undo restores the prior starting setup. Motion equations using `t`, `x0`, or `y0` consequently restart from the new setup. Property edits in the inspector and right-click menu apply live. World gravity, fixed state, geometry and motion equations can also be changed during playback. Unedited positions and velocities are preserved; equations keep their original x0/y0 and elapsed t. Live edits are also saved into the initial setup, so Reset uses the updated property values. Undo returns to the previous saved setup and pauses. Clicking to select an object pauses a running scene but does not capture a new setup until you move it.

Connection tools take two clicks: two objects, or an empty world point and an object. Select a connection on its line or in the dropdown. Drag a world anchor to move it. Moving an endpoint updates rods to the new distance and extends a rope's maximum length if necessary; spring rest lengths stay unchanged so you can stretch a spring before running.

The Graphs button opens the measurement panel. The Tools and Inspector buttons toggle their palettes. On narrow screens both palettes start closed to leave the canvas accessible. Reset restores the current starting setup. All saved/exported scenes contain initial conditions, not transient simulation state. Preset changes, imports, edits and deletions are undoable.

### Motion equations

Select a body, enable **Motion equations**, then edit `ax` and `ay`. Click symbols to insert them and press **Apply equations** to commit. Examples populate the fields without committing until Apply is pressed.

- `ax = 2`, `ay = 0`, world gravity off: constant horizontal acceleration.
- `ax = 0`, `ay = -g`, world gravity off: free fall without double-counting gravity.
- `ax = 2*cos(t)`, `ay = 0`: time-dependent acceleration.
- The Circular motion preset uses `ax = -(x-6)`, `ay = -(y-3)` with perpendicular initial velocity.

Use explicit `*`, `/`, `+`, `-`, `^`, parentheses and the functions `sin`, `cos`, `tan`, `sqrt`, `abs`, `exp`, `log`, `min`, `max`. Trig arguments are radians. Variables are `t`, `x`, `y`, `x0`, `y0`, `vx`, `vy`, `v`, `m`, `g`, `omega`, `pi`. Acceleration outputs are interpreted as m/s²; this version does not perform dimensional analysis. No JavaScript is evaluated. Invalid syntax is rejected without replacing the current scene; runtime undefined values pause the simulation with an error. Acceleration magnitudes above 10,000 m/s² are rejected.

The equations specify additional acceleration, implemented as `F = ma`; contacts and other forces still affect motion. Uncheck **Also apply world gravity** when gravity is already included in your expression.

Autosave uses browser localStorage, scoped to the serving origin. If storage is unavailable, the header says to save a file. Only the current scene is persisted; undo history and measurements are in memory. Export important experiments as JSON files. CSV and graphs contain the last 400 samples (20 simulated seconds at 20 Hz) for the selected object; selecting another object starts a new measurement series.

## Physics model and units

The public scene format uses metres, kilograms, seconds, radians/second, and newtons. Angles in the editor are degrees; positive y is upward and positive rotation is counterclockwise. Positive gravity points downward. Restitution and friction are dimensionless. Air resistance is disabled.

Matter.js operates internally at 100 engine units per metre and a fixed 1/120-second timestep. Velocity is converted through Matter's 60 Hz base-step convention, not assumed to be pixels per second. Gravity and applied forces are converted to engine units per millisecond squared. Springs apply `F = k(extension) + c(relative axial velocity)` every substep, with equal and opposite endpoint forces. Gravity is applied once by the engine.

Kinetic energy includes translational and rotational energy; it excludes gravitational and spring potential energy. The orange force arrows show the sum of constant external forces, spring forces, and weight. They intentionally do not include contact impulses or rod/rope reactions and are not a complete free-body diagram. Vector lengths are capped for legibility; numeric values are authoritative.

### Limits of this first version

This is an educational rigid-body approximation, not an engineering solver. Matter.js uses discrete collision detection and iterative constraints. Small or high-speed objects can tunnel, collisions and constraints introduce numerical error, and ropes may stretch slightly or jitter near their limit. Very stiff springs with very small masses require finer timesteps than this version provides; a numerical-limit guard resets runaway states, but does not guarantee accuracy for extreme parameters.

Curved tracks and drawn paths are segmented compound shapes, so collision seams may be visible. Drawn solids are convex hulls. Joints attach at centres; arbitrary attachment points, true zero-length hinges, conveyors, pulleys, motors, electromagnetism, fluids, 3D, full energy accounting, and continuous collision detection are not implemented. See [FEATURE-PARITY.md](FEATURE-PARITY.md) for the full reference comparison and staged roadmap. No accounts, telemetry, cloud sync, external fonts, or remote runtime dependencies are used.

## Development

```sh
npm run check
npm test
# Optional DOM interaction checks:
npm install
npm run test:ui
```

- `index.html`, `styles.css`: accessible controls and responsive workbench layout.
- `src/app.js`: editor, history, persistence, input, canvas renderer, and measurements.
- `src/physics.js`: Matter adapter, fixed timestep, force model, and SI-unit conversions.
- `src/expressions.js`, `src/motion-panel.js`: restricted equation language and editor.
- `src/geometry.js`: primitive and compound shape construction.
- `src/behaviours.js`: extensible SI force contribution API and kinematics module.
- `src/scenes.js`: scene schema validation and experiment presets.
- `tests/physics.test.mjs`, `tests/kinematics.test.mjs`: analytical physics, geometry, equations and schema regression tests.
- `vendor/`: pinned Matter.js distribution and licence.
- `server.mjs`: dependency-free local static server.

Physics regression tests cover analytical projectile motion, F/m acceleration, elastic collision momentum/energy, spring period, pendulum distance, unilateral ropes, fixed bodies/reset, finite preset evolution, scene round-trips, and invalid inputs. The automated checks are numerical tests, not proof of physical accuracy for every possible scene.

## Next directions

1. Offset anchors, editable connection endpoints, pulley and motor components.
2. Total-energy and momentum charts, arbitrary data series, longer recordings.
3. Continuous collision detection or a higher-precision optional solver.
4. Scene thumbnails, multiple saved experiments, and shareable scene links.
5. A browser-tested installable/offline PWA and a deployment workflow.

## Validation of v0.2

22 automated numerical/schema/parser tests pass, including preservation of live state and equation origins during edits. The optional `npm run test:ui` DOM harness also exercised mouse movement, resize, velocity editing, current-state capture, equations, graph toggling and freehand shapes. Live browser visual testing was unavailable in the authoring environment; final responsive layout and touch behaviour still need real-browser testing.
