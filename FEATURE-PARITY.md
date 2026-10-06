# Reference feature map and staged scope

Reference inspected: https://physics-sandbox-881.pages.dev/ on 6 October 2026.

This is an independent implementation inspired by the reference's interface. It is **not yet a complete replica**. The current phase is kinematics plus the mechanical building blocks already available. The reference's advanced physics behaviour has not been validated merely because its symbols are visible.

| Reference area | Physics Sim v0.2 | Remaining work |
|---|---|---|
| Large neutral canvas with floating tools | Implemented: floating tools/inspector, panel toggles, optional graphs, fullscreen | Visual browser comparison on the user's device |
| Shape presets: rectangle, circle, right triangle | Implemented | Direct edge handles, snapped drawing |
| Hollow circular track | Implemented as a segmented compound collider with an empty centre | Smooth collision geometry / fewer seam artefacts |
| Arc, half-trough, full trough | Implemented: radius/sweep, L-shaped and U-shaped open tracks | These are independent interpretations of the reference's labelled shapes, not pixel-identical geometry |
| Drawing tool | Implemented: fixed polylines and convex drawn solids | Arbitrary concave solids, erasing individual segments |
| Object movement / transformation | Drag to move, rotate, uniformly resize, set velocity; numeric properties remain | Edge/corner resize handles, multi-selection, grouping |
| Springs, light rods, ropes, walls | Implemented | Arbitrary attachment offsets and robust high-stiffness solving |
| Smooth hinge | A world anchor with a rod gives a pendulum pivot | True zero-length hinge, off-centre hinges, motors |
| Conveyor belt | Not implemented in this phase | Moving contact surfaces and friction-driven transport |
| Symbol palette and example formulas | Safe acceleration expressions, clickable symbols, motion examples | Spatially arranged/dragged formula tokens, formula-to-force binding, dimensional analysis |
| Kinematics | Constant velocity/acceleration, projectile and circular-motion examples; per-object ax/ay expressions | Explicit position/velocity drivers and piecewise conditions |
| Measurements | Position, velocity, acceleration, displacement, kinetic energy, ruler, trails, graphs, CSV | Multiple simultaneous series, annotation cards and total-energy accounting |
| High-school / university settings | Not implemented as separate modes | First specify exact assumptions and solver differences; labels alone would be misleading |
| Desktop / touch settings | Pointer-based controls and narrow-screen panel toggles | Dedicated touch gesture/large-handle testing |
| Bug recording | Automated numerical tests and scene JSON export | One-click reproducible bug bundle with event log |
| Visible B, E, q, I and other advanced symbols | Reserved for future work; no active EM controls | Field regions, charge, Lorentz force, Coulomb interaction, field visualization |
| Gravitation / relativity examples | Not implemented | N-body gravity, advanced models with documented validity limits |

## Phase 1: kinematics (this update)

- Make the canvas the main workspace and keep tools discoverable.
- Add reference-inspired geometry and freehand construction.
- Enable direct manipulation before and after simulation.
- Add motion equations with a small, restricted mathematical parser.
- Expose component velocity, acceleration and displacement measurements.
- Separate force/behaviour modules from the scene editor and numerical adapter.

## Phase 2: electromagnetism

Add a versioned schema for body charge and field-region geometry. Implement uniform E and perpendicular B first, with `F = q(E + v × B)`, then point-charge interactions with explicit singularity handling. Add field vectors and analytical tests for electric acceleration and cyclotron radius/period. Keep solver assumptions visible; do not equate this with a general Maxwell-equation solver.

## Phase 3: richer mechanics and behaviours

Add off-centre hinges, pulleys, conveyor surfaces and motors; then explicit motion drivers, piecewise conditions, reusable parameter sets, and event-triggered behaviours. Add dimensional checking to the equation editor. Each feature needs independent tests and a declared approximation, rather than silently adding special cases to the canvas event handlers.

## Implementation boundary

`Simulation(scene, behaviourFactories)` creates behaviour modules. Each module exposes `force(spec, state, context)` and returns a force in SI newtons. Context includes the scene, elapsed time, all engine bodies and SI state accessors. The integrator combines force contributions before a fixed timestep. The built-in kinematics module uses this boundary; `tests/kinematics.test.mjs` checks an independent injected module too. Future modules should add optional, validated scene fields and leave existing v1 scenes loadable.

Kinematic acceleration expressions are mass-scaled force contributions, so contacts, springs, and external forces can change the resulting acceleration. They are not collision-ignoring position drivers. Measured acceleration uses the most recent 1/120-second velocity difference and can spike during impacts.
