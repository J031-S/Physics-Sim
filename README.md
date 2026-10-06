# Physics Sim — minimal sandbox

This version intentionally replaces the expanded workbench with a small, running 2D mechanics and prescribed-field sandbox. The previous versions remain in Git history.

## Run

Node.js 20.11+:

```sh
npm start
```

Open http://localhost:3000. Running the app needs no package installation or build step. The bundled Matter.js 0.20.0 engine includes its MIT licence. Any ordinary static server also works; opening via `file://` does not.

## Controls

Click **Keys ?** (or press **?**) for the built-in shortcut guide. Shortcuts do not intercept typing in property fields or other form controls.

| Key / gesture           | Action                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------ |
| Space                   | Play / pause (holding the key does not repeatedly toggle)                            |
| Q / Shift-box           | Select tool / add objects to a selection box                                         |
| G / B / N               | Grab / Ball / Block                                                                  |
| S / D / T / U           | Spring / Rod / Belt / Pulley                                                         |
| E / M                   | Electric / Magnetic field                                                            |
| V                       | Toggle velocity vectors                                                              |
| R + left-drag           | Resize a body or field about its current centre                                      |
| Z                       | Toggle snapping for every geometry operation; also available in Settings             |
| Shift + drag            | Prioritise movement; moving a position-locked body requires Pause                    |
| Ctrl + drag             | Prioritise rotation about the centre; changing a rotation-locked body requires Pause |
| Shift + Alt + drag      | Move while refitting rod/cable lengths                                               |
| Ctrl + R                | Native browser reload                                                                |
| Alt + drag              | Refit attached rod / pulley cable lengths                                            |
| Delete / Escape         | Delete selection / cancel interaction                                                |
| Right-click / Shift+F10 | Material constants / constants for selection                                         |

- **Ball / Block:** select a tool and click above the floor. The tool returns to Grab after one placement.
- **Grab:** drag directly without a mouse tether. Release while moving to throw; hold still before release to stop. A rod constrains normal dragging to its arc. Snapping suppresses throwing on release; locks and connections take priority over grid placement.
- **Independent locks:** use the selection bar to lock position, rotation, or both. For a pinned ball, grab away from its centre to rotate it. With snapping enabled, rotation follows absolute 15° steps. Shift explicitly chooses translation, Ctrl explicitly chooses rotation. When paused, manual edits update the stored locked position/angle without disabling either lock; physics continues to respect those locks on resume. Running interactions cannot edit a locked degree of freedom. Balls have 10° rim ticks, longer 30° ticks, and a distinct zero mark that rotates with the body.
- **Resize:** hold R before starting a drag, or click the selection bar's **Resize (R)** button. Drag outward/inward to resize a ball's diameter; drag a block near a corner to change width and height along its local axes. Dimensions appear beside the selection. The body stays centred and still during the gesture, even while physics runs. Mass stays constant; inertia is recalculated. Limits are 0.1–10 m. Edits that penetrate the floor or overlap pulley wheels are rejected. Return from the button-operated resize tool with G.
- **Spring / Rod:** click two bodies, or a world anchor and a body. Connections attach at body centres. Select a connection by clicking its line. Alt-drag changes rod length while paused or running.
- **Pause / Clear scene:** pause deliberately stops physics but editing still works. Clear removes everything except the static floor. Dragging does not pause the world.

### Box selection and layout moves

Choose **Select (Q)** and drag a rectangle over objects. Shift-box selection adds objects to the current selection. Drag a selected body to move the group. With snapping enabled, translation follows 0.5 m increments, preserving the spacing between objects. Delete removes the selected objects and their attached connections.

Moving a selection includes every body connected to it, so springs, rods, cables and belts stay assembled. The expanded selection is highlighted and announced. World anchors and pinned positions translate with the group; lock states, dimensions, angles and connection lengths remain unchanged. This is a layout edit and does not throw the group: selected bodies stay still during placement and release with zero velocity. Assemblies containing position-locked objects can only be moved while paused. The rest of the simulation keeps running for unlocked group moves. Ctrl in Select mode rotates the clicked body individually. Use Grab for individual, constraint-respecting physical manipulation instead.

### Simulation settings

Click **Settings** in the header to open the side panel. Gravity and air resistance offer numeric entry and a live slider:

- **Gravity:** −50 to +50 m/s²; positive is downward, zero disables gravity, negative is upward. Default 9.81. The slider snaps to exactly zero within ±2.5 m/s², with a visible centre tick and zero label; manual input and keyboard arrow nudges still permit smaller nonzero values.
- **Air resistance:** 0–10 s⁻¹; an isotropic linear velocity and spin damping rate, added to each body's existing damping. Default 0. This is a simple linear drag model rather than a fluid simulation.

- **Snapping (Z):** one persistent toggle for position and group translations (0.5 m), rotation (15°), dimensions (0.5 m), and Alt-refitted connection lengths (0.5 m). The active operation determines what is snapped; physical constraints and walls take priority when exact grid placement is impossible. Shift/Ctrl/Alt can be changed during a drag; Shift wins if Shift and Ctrl are held together. R chooses resizing and works with the snapping toggle, but Ctrl+R and Cmd+R retain browser reload.
- **Screen-edge walls:** enables four nonselectable static colliders at the canvas edges, tracking browser viewport changes. The existing ground remains in place. Disabled by default.

Changes preserve the current scene, velocities and simulation time. **Restore defaults** resets just these settings. Clear scene retains them; reloading the page restores defaults. Global electric X/Y fields (N/C) and magnetic Z field (T) each range from −100 to +100 and default to zero. Positive X points right, positive Y up, and positive magnetic Z out of the screen.

### Electric and magnetic fields

Press **E** or **M**, then click to place a field. Electric regions start rectangular; magnetic regions start circular. Right-click the region to choose **rectangle, ellipse or circle**, edit dimensions (0.1–50 m), strength (−100 to +100 N/C or T), and angle. Drag empty space within a region to move it; Ctrl-drag rotates it; R-drag resizes it about its centre. Z snaps position/dimensions to 0.5 m and rotation to 15°. These are stationary prescribed regions, editable while running. Bodies and connections take pointer priority over fields; box selection remains for physical bodies.

Right-click a ball or block and set its signed **Charge (C)** (−100 to +100; default 0). Electric force is `F = qE`; magnetic force is `F = q(v × B)`. The electric arrows follow the region's angle, reversing when strength is negative. Magnetic symbols are ⊙ for out of screen and ⊗ for into screen. Magnetic fields bend a moving charge's trajectory without doing work; they do not start a stationary charge moving. Overlapping regions and global fields add together.

Fields sample the body's centre and model charge as a point charge at that centre, without torque. Boundaries are abrupt, with no fringe field. There is no mutual Coulomb interaction, induction, current, or magnetic material model yet. Position/rotation locks retain their normal behaviour. Each fixed step uses the exact constant-field velocity solution for combined E/B; position, boundary crossings, contacts and mechanical constraints retain the simulation's finite-step approximation. Very rapid motion or very tight cyclotron orbits relative to the timestep remain under-resolved.

### Spring angle lock / horizontal SHO

Create a spring between an empty anchor point and a ball/block at the same height. Select the spring and enable **Lock spring angle**. Its current axis becomes a frictionless guide: the free endpoint can move along it but cannot sag or be dragged sideways. Stretch the spring along that axis and release. For undamped SHO, set the spring's damping and the body's linear damping to zero. A spring between two free bodies fixes their relative angle; both centres can still fall together. Pin one endpoint or use a world anchor when a fixed laboratory frame is wanted.

### Belts and conveyors

Press **T**, then click two separate balls. A closed belt wraps tangentially around their circumferences, and the two centres become fixed axles. Resize the balls before or after creating the belt to change the transmission ratio; the wheels must remain separate.

Select the belt to enable **Crossed belt** (opposite rotation), or **Drive belt** and a signed speed in m/s (−10 to 10). Positive speed goes from the first wheel to the second along the first span. With Drive off, spin a wheel by dragging its rim and releasing; momentum is shared according to the wheels' radii and inertias. A rotation-locked wheel brakes the pair.

For a conveyor, place the two wheels horizontally, enable Drive belt, then place a block just above the upper span. The spans support contact and use the object's surface friction to transport it. Zero surface friction means no conveyor traction. Passive belt contact reacts back on the wheels; a driven belt is an ideal external motor supplying whatever torque is required. Animated dashes show belt travel. Delete the belt before unlocking an axle's position for physics motion. While paused, Shift-drag can reposition the pinned axle directly.

### Flexible pulley cable / spring–Atwood machine

Press **U**, then click **first endpoint → wheel ball → second endpoint**. Endpoints may be at any angle, and creation keeps them where you placed them. Cable spans meet the wheel tangentially and wrap around its rim. Endpoints may already have springs or rods, and further connections may be added afterward.

The axle starts pinned for convenient setup. Select the wheel and uncheck **Lock position** to move it or let it move dynamically. Normal dragging preserves the cable's length and adjusts other free endpoints; pinned positions and spring guides still constrain the result. If a requested drag cannot satisfy those constraints, it stops at a feasible position. **Alt-drag** an endpoint or an unlocked wheel to refit cable length for a new layout. Resizing the wheel also refits the cable around its new rim. Select the cable and use **Reverse cable wrap** to route around the other side, without repositioning the bodies.

To reproduce a spring–Atwood arrangement:

1. Place a block to the left of a wheel, roughly level with its top, and a second block below the wheel's right side.
2. Connect a horizontal spring from an empty anchor on the left to the first block. Enable **Lock spring angle** to represent the tabletop's frictionless horizontal guide.
3. Choose Pulley and click the spring-connected block, the wheel, then the hanging block.
4. Drag either block to displace the system and release. The spring and cable act on the same body; the hanging mass drives the horizontal motion. Set spring/body damping to zero for sustained ideal oscillation.

The model is a taut, massless, no-slip cable with finite wheel inertia. It allows swinging/angled endpoints and translating axles; it does not simulate slack rope, rope collisions with unrelated objects, or automatic rerouting around extra wheels. Each cable wraps one selected wheel. The normal contact engine handles the objects and floor. Very stiff/conflicting assemblies retain the ordinary numerical limitations of an iterative rigid-body simulation.

The floor is not selectable or editable. Gravity defaults to 9.81 m/s² and is configurable in Settings. Grid lines mark 0.5 m and 1 m intervals.

## Right-click menu

For a ball or block, only these constants are editable:

| Constant              | Meaning                                         |
| --------------------- | ----------------------------------------------- |
| Mass (kg)             | Inertial mass                                   |
| Charge (C)            | Signed point charge at the centre; 0 is neutral |
| Surface friction μ    | Dimensionless contact friction                  |
| Restitution e         | Bounce coefficient, 0–1                         |
| Linear damping (s⁻¹)  | Exponential decay rate of linear velocity       |
| Angular damping (s⁻¹) | Independent exponential decay rate of spin      |

Surface friction is not internal material hysteresis. The two damping coefficients model motion loss; this rigid-body simulation does not model deformation, heat generation or microscopic material properties.

Springs expose stiffness, axial damping and rest length; rods expose length. Every numeric property also has a slider. Sliders apply continuously while dragged and stay synchronized with manual input; manual changes apply on Enter or leaving the field, without pausing, resetting time, or rebuilding the world. Invalid values are rejected. Close with Escape, the cross, or clicking outside. Shift+F10 opens the menu for a selected object while the canvas is focused.

Material menus contain no position/velocity inputs or geometry controls. Geometry, locks and belt drive controls are separate from material constants. Field menus separately expose shape, dimensions, angle and strength. There are no temperature placeholders, equation editor, graph panel, presets, additional body shapes, inspector, autosave or scene import/export. Old localStorage saves are not loaded or deleted. This is a fresh, transient sandbox on every page load.

## Physics implementation

The app uses SI units at the boundary and a fixed 1/120-second physics step. Pointer dragging places the grabbed point directly at the mouse where constraints allow, retaining its original offset. Rods project the requested centre onto their permitted circles (or circle intersections for multiple rods); floor clearance and independent locks remain enforced. Alt-drag updates rod rest lengths. Recent pointer-driven movement determines release velocity, capped at 30 m/s and projected onto the rod's tangent. Holding still before release stops the throw. No mouse spring or tether is used.

Translation and rotation are independent degrees of freedom. A position lock sets inverse translational mass to zero and restores the pinned centre during solver phases, but keeps finite rotational inertia. A rotation lock sets rotational inertia to infinity while retaining translational inverse mass. Unlocking restores the finite values, including after changing mass. A completely immovable collision pair cannot be resolved, so its collision response is skipped; collisions with unpinned bodies still resolve. Rod constraints between two pinned centres are suspended until an endpoint is unlocked.

This is an educational rigid-body approximation. Discrete collisions can tunnel at extreme speeds, iterative rods have numerical tolerance, and spring stability depends on stiffness/mass. Locks can conflict with arbitrarily placed constraints; they take priority. Position snapping is projected onto rod constraints before placement, including while paused. Pinning both ends of a rod at a new separation holds those centres until unlocked. Direct dragging can pass through other movable objects between pointer events; it is an editing interaction, not a swept collision solver. With screen walls disabled, objects can be thrown out of view; Clear scene starts fresh.

## Tests

```sh
npm run check
npm test
# Optional DOM interaction suite:
npm ci
npm run test:ui
```

Belts and pulley cables share iterative position and velocity solving, so one connection no longer overwrites a wheel angle already solved by the other. Guided springs use signed extension to remain continuous when an endpoint crosses its anchor.

Numerical regression coverage also checks SHO period, guide motion, snapped rotation, local-axis resizing and inertia, open/crossed transmission ratios, passive conveyor reaction, driven conveyor transport, and Atwood acceleration with finite wheel inertia, tangent geometry, spring–Atwood oscillation, angled dragging, movable axles, explicit cable refitting, and infeasible pinned poses, coupled belt/multiple-pulley/spring assemblies, paused lock editing, modifier combinations, walls and viewport resizing.

The original regression coverage includes free fall, static floor, grab/throw velocity, pinned-object rotation, independent locks, lock/unlock after mass changes, pinned contacts, snapping, rod safety, springs and live constants. DOM checks exercise the actual creation/drag/menu/lock/snap controls. Visual browser verification was not available in the authoring environment; these checks do not claim exhaustive browser/device coverage.

`src/physics.js` owns bodies, global settings, locks, dragging, resizing and spring guides. `src/group-move.js` owns connected-assembly layout translation. `src/mechanisms.js` owns belts and conveyor contact; `src/pulley.js` owns tangent cable geometry and its coupled translational/rotational constraints. `src/fields.js` owns field regions, overlap sampling and Lorentz integration; `src/field-view.js` owns field rendering and editing gestures. `src/app.js` owns keyboard/pointer input, body drawing and menus.

Field regressions verify signed qE/m acceleration, neutral and stationary magnetic cases, magnetic speed conservation, crossed-field drift, region boundaries and superposition, locked bodies, atomic validation, and snapped editing. DOM checks cover field creation/shape/strength/rotation/resize/delete, global field settings, gravity detent and keyboard escape from zero.
