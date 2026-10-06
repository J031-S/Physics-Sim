# Physics Sim — minimal sandbox

This version intentionally replaces the expanded workbench with a small, running 2D mechanics sandbox. The previous versions remain in Git history.

## Run

Node.js 20.11+:

```sh
npm start
```

Open http://localhost:3000. Running the app needs no package installation or build step. The bundled Matter.js 0.20.0 engine includes its MIT licence. Any ordinary static server also works; opening via `file://` does not.

## Controls

- **Ball / Block:** choose the tool, then click above the floor. The tool returns to Grab after placing one object.
- **Grab:** hold the left mouse button on an object and move it. The simulation keeps running. Release while moving to throw it. Grab off-centre to apply torque and spin it.
- **Ctrl-drag:** place precisely on the 0.5 m grid. The cursor target snaps the object's centre; releasing with Ctrl places the centre exactly and stops linear velocity. Ordinary release preserves throw velocity. Position locks and connections still apply, and snapped placement stays above the floor.
- **Spring / Rod:** click two objects, or one empty world anchor and an object. Connections attach to body centres. Escape cancels an unfinished connection. Click a connection to select it; right-click for its constants.
- **Velocity vectors:** toggle blue velocity arrows. The selected object's speed is labelled in m/s; arrow lengths are capped for visibility.
- **Lock position:** pins the selected centre at its current coordinates and stops translation, while allowing rotation.
- **Lock rotation:** holds the current angle and stops spin, while allowing translation. Both locks may be enabled independently. A ball's radial stripe shows its orientation.
- **Delete:** removes the selected object or connection. Deleting an object also removes its connections.
- **Pause:** deliberately suspends physics; resume to grab and throw. Grabbing never pauses playback automatically.
- **Clear scene:** removes everything except the static floor.

The floor is not selectable or editable. Gravity is fixed at 9.81 m/s². The grid has darker 1 m lines and lighter 0.5 m lines.

## Right-click menu

For a ball or block, only these constants are editable:

| Constant | Meaning |
|---|---|
| Mass (kg) | Inertial mass |
| Surface friction μ | Dimensionless contact friction |
| Restitution e | Bounce coefficient, 0–1 |
| Linear damping (s⁻¹) | Exponential decay rate of linear velocity |
| Angular damping (s⁻¹) | Independent exponential decay rate of spin |

Surface friction is not internal material hysteresis. The two damping coefficients model motion loss; this rigid-body simulation does not model deformation, heat generation or microscopic material properties.

Springs expose stiffness, axial damping and rest length; rods expose length. Property changes apply on Enter or leaving the field, without pausing, resetting time, or rebuilding the world. Invalid values are rejected. Close with Escape, the cross, or clicking outside. Shift+F10 opens the menu for a selected object while the canvas is focused.

There are no position/velocity inputs, geometry settings, charge/temperature placeholders, equation editor, graph panel, presets, additional shapes, rope, inspector, autosave, scene import/export, or hidden advanced modes. Old localStorage saves are not loaded or deleted. This is a fresh, transient sandbox on every page load.

## Physics implementation

The app uses SI units at the boundary and a fixed 1/120-second physics step. Pointer dragging applies a capped, damped spring force at the grabbed local point. This transfers linear momentum and torque naturally; releasing removes the mouse force without replacing the body's velocity. No manual pause, reset, or scene snapshot is involved.

Translation and rotation are independent degrees of freedom. A position lock sets inverse translational mass to zero and restores the pinned centre during solver phases, but keeps finite rotational inertia. A rotation lock sets rotational inertia to infinity while retaining translational inverse mass. Unlocking restores the finite values, including after changing mass. A completely immovable collision pair cannot be resolved, so its collision response is skipped; collisions with unpinned bodies still resolve. Rod constraints between two pinned centres are suspended until an endpoint is unlocked.

This is an educational rigid-body approximation. Discrete collisions can tunnel at extreme speeds, iterative rods have numerical tolerance, and spring stability depends on stiffness/mass. Locks can conflict with arbitrarily placed constraints; they take priority. A rod may pull a Ctrl-placed object back to its permitted distance on the next physics step. Pinning both ends of a rod at a new separation holds those centres until unlocked. Pointer forces are capped to avoid unbounded impulses from sudden cursor jumps. Objects can be thrown out of view; Clear scene starts fresh.

## Tests

```sh
npm run check
npm test
# Optional DOM interaction suite:
npm ci
npm run test:ui
```

Numerical regression coverage includes free fall, static floor, grab/throw velocity, off-centre torque, independent locks, lock/unlock after mass changes, pinned contacts, snapping, rod safety, springs and live constants. DOM checks exercise the actual creation/drag/menu/lock/snap controls. Visual browser verification was not available in the authoring environment; these checks do not claim exhaustive browser/device coverage.

Source is deliberately small: `src/physics.js` owns the physics and locks; `src/app.js` owns canvas input, drawing and the constants menu.
