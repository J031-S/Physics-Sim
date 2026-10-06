# Physics Sim

A browser-based 2D physics workbench: create a scene, change a variable, and watch what happens. The interface is an original implementation; the reference sandbox's source/assets were not copied.

## Run locally

Install Node.js 20.11+ (22+ recommended), then:

```sh
git clone https://github.com/J031-S/Physics-Sim.git
cd Physics-Sim
npm start
```

Open http://localhost:3000. There is no dependency installation or build step. Matter.js 0.20.0 is vendored with its MIT licence. After downloading the repository, the app needs no internet connection. Alternatively, use any static web server such as VSCodium's Live Server. Opening `index.html` via `file://` is not supported because the app uses ES modules.

The static files can be hosted on GitHub Pages or Cloudflare Pages later. This commit does not configure or publish a deployment.

## What works

- Balls, rectangular blocks, fixed walls, and inclined planes.
- Position, size, angle, mass, initial linear/angular velocity, friction, restitution, and constant applied force controls.
- Springs with stiffness in N/m and viscous damping in N·s/m.
- Rod/pivot constraints and unilateral ropes. Connections attach to body centres or fixed world points.
- Play/pause, 1/120-second stepping, initial-condition reset, and 0.25–2× playback.
- Pan, zoom, fit scene, velocity vectors, applied-force/gravity vectors, and motion trails.
- Live speed, position, kinetic energy, and motion graphs; CSV measurement export.
- Local autosave, validated JSON import/export, undo/redo, and duplication/deletion.
- Projectile, pendulum, spring oscillator, collision, and inclined-plane presets.
- Keyboard shortcuts and a help dialog. Click the question mark in the top bar.

### Editing and saving

Create objects by selecting a tool and clicking the canvas. Drag in the initial editing state to move an object; edit its dimensions and angle in the inspector. Connection tools take two clicks: two objects, or an empty world point and an object. Select connections in the inspector's dropdown.

Clicking an object during a run selects it for inspection without interrupting the simulation. Reset before dragging. Editing a numeric property or adding an object returns the experiment to its initial conditions. All saved/exported scenes contain these initial conditions, not the transient simulation state. Reset leaves the starting scene unchanged. Preset changes, imports, edits, and deletions are undoable.

Autosave uses browser localStorage, scoped to the serving origin. If storage is unavailable, the header says to save a file. Only the current scene is persisted; undo history and measurements are in memory. Export important experiments as JSON files. CSV and graphs contain the last 400 samples (20 simulated seconds at 20 Hz) for the selected object; selecting another object starts a new measurement series.

## Physics model and units

The public scene format uses metres, kilograms, seconds, radians/second, and newtons. Angles in the editor are degrees; positive y is upward and positive rotation is counterclockwise. Positive gravity points downward. Restitution and friction are dimensionless. Air resistance is disabled.

Matter.js operates internally at 100 engine units per metre and a fixed 1/120-second timestep. Velocity is converted through Matter's 60 Hz base-step convention, not assumed to be pixels per second. Gravity and applied forces are converted to engine units per millisecond squared. Springs apply `F = k(extension) + c(relative axial velocity)` every substep, with equal and opposite endpoint forces. Gravity is applied once by the engine.

Kinetic energy includes translational and rotational energy; it excludes gravitational and spring potential energy. The orange force arrows show the sum of constant external forces, spring forces, and weight. They intentionally do not include contact impulses or rod/rope reactions and are not a complete free-body diagram. Vector lengths are capped for legibility; numeric values are authoritative.

### Limits of this first version

This is an educational rigid-body approximation, not an engineering solver. Matter.js uses discrete collision detection and iterative constraints. Small or high-speed objects can tunnel, collisions and constraints introduce numerical error, and ropes may stretch slightly or jitter near their limit. Very stiff springs with very small masses require finer timesteps than this version provides; a numerical-limit guard resets runaway states, but does not guarantee accuracy for extreme parameters.

Objects are circles or rectangles. Joints attach at centres; arbitrary attachment points, compound shapes, pulleys, motors, electromagnetism, fluids, 3D, full energy accounting, and continuous collision detection are not implemented. No accounts, telemetry, cloud sync, external fonts, or remote runtime dependencies are used.

## Development

```sh
npm run check
npm test
```

- `index.html`, `styles.css`: accessible controls and responsive workbench layout.
- `src/app.js`: editor, history, persistence, input, canvas renderer, and measurements.
- `src/physics.js`: Matter adapter, fixed timestep, force model, and SI-unit conversions.
- `src/scenes.js`: scene schema validation and experiment presets.
- `tests/physics.test.mjs`: analytical physics and persistence/validation regression tests.
- `vendor/`: pinned Matter.js distribution and licence.
- `server.mjs`: dependency-free local static server.

Physics regression tests cover analytical projectile motion, F/m acceleration, elastic collision momentum/energy, spring period, pendulum distance, unilateral ropes, fixed bodies/reset, finite preset evolution, scene round-trips, and invalid inputs. The automated checks are numerical tests, not proof of physical accuracy for every possible scene.

## Next directions

1. Offset anchors, editable connection endpoints, pulley and motor components.
2. Total-energy and momentum charts, arbitrary data series, longer recordings.
3. Continuous collision detection or a higher-precision optional solver.
4. Scene thumbnails, multiple saved experiments, and shareable scene links.
5. A browser-tested installable/offline PWA and a deployment workflow.
