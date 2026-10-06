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
- **Grab:** hold the left mouse button on an object and move it. The simulation keeps running. Release while moving to throw it. Movement is direct, with no elastic mouse tether. A position-locked object can be rotated by grabbing away from its centre.
- **Ctrl-drag:** place precisely on the 0.5 m grid. The desired centre snaps to the grid; rod constraints and locks take priority where an exact grid point is unreachable. Release with Ctrl to stop linear velocity. Placement stays above the floor.
- **Alt-drag:** resize rods attached to the dragged object, while paused or running. Ordinary dragging preserves rod length and follows the allowed arc. Position locks still take priority.
- **Spring / Rod:** click two objects, or one empty world anchor and an object. Connections attach to body centres. Escape cancels an unfinished connection. Click a connection to select it; right-click for its constants.
- **Velocity vectors:** toggle blue velocity arrows. The selected object's speed is labelled in m/s; arrow lengths are capped for visibility.
- **Lock position:** pins the selected centre at its current coordinates and stops translation, while allowing rotation.
- **Lock rotation:** holds the current angle and stops spin, while allowing translation. Both locks may be enabled independently. A ball's radial stripe shows its orientation.
- **Delete:** removes the selected object or connection. Deleting an object also removes its connections.
- **Pause:** deliberately suspends physics. Direct placement, rotation and rod resizing still work while paused. Grabbing never pauses playback automatically.
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

The app uses SI units at the boundary and a fixed 1/120-second physics step. Pointer dragging places the grabbed point directly at the mouse where constraints allow, retaining its original offset. Rods project the requested centre onto their permitted circles (or circle intersections for multiple rods); floor clearance and independent locks remain enforced. Alt-drag updates rod rest lengths. Recent pointer-driven movement determines release velocity, capped at 30 m/s and projected onto the rod's tangent. Holding still before release stops the throw. No mouse spring or tether is used.

Translation and rotation are independent degrees of freedom. A position lock sets inverse translational mass to zero and restores the pinned centre during solver phases, but keeps finite rotational inertia. A rotation lock sets rotational inertia to infinity while retaining translational inverse mass. Unlocking restores the finite values, including after changing mass. A completely immovable collision pair cannot be resolved, so its collision response is skipped; collisions with unpinned bodies still resolve. Rod constraints between two pinned centres are suspended until an endpoint is unlocked.

This is an educational rigid-body approximation. Discrete collisions can tunnel at extreme speeds, iterative rods have numerical tolerance, and spring stability depends on stiffness/mass. Locks can conflict with arbitrarily placed constraints; they take priority. Grid snapping is projected onto rod constraints before placement, including while paused. Pinning both ends of a rod at a new separation holds those centres until unlocked. Direct dragging can pass through other movable objects between pointer events; it is an editing interaction, not a swept collision solver. Objects can be thrown out of view; Clear scene starts fresh.

## Tests

```sh
npm run check
npm test
# Optional DOM interaction suite:
npm ci
npm run test:ui
```

Numerical regression coverage includes free fall, static floor, grab/throw velocity, pinned-object rotation, independent locks, lock/unlock after mass changes, pinned contacts, snapping, rod safety, springs and live constants. DOM checks exercise the actual creation/drag/menu/lock/snap controls. Visual browser verification was not available in the authoring environment; these checks do not claim exhaustive browser/device coverage.

Source is deliberately small: `src/physics.js` owns the physics and locks; `src/app.js` owns canvas input, drawing and the constants menu.
