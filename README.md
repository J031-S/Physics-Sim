# Physium — physics simulations for students

This version intentionally replaces the expanded workbench with a small, running 2D mechanics and prescribed-field sandbox. The previous versions remain in Git history.

## Run

Node.js 20.11+:

```sh
npm start
```

Open http://localhost:3000. Running the app needs no package installation or build step. The bundled Matter.js 0.20.0 engine includes its MIT licence. Any ordinary static server also works; opening via `file://` does not.

Physium opens on its **homepage** (`/`): what the site is for, a short section on its aim and how it works, a card for each simulation, every minitool in a row that scrolls sideways (featured ones first; the arrow buttons or the arrow keys move it along, and on a phone it is swiped), a note on using it in class or at home, and links to the source on GitHub (beside the main button and in the footer). The drop-down at the left of the top bar goes to the homepage, to the four simulations and to the **minitools** (`/minitools/`): the **Mechanics sandbox** (`/sims/Mechanics`, described first below), **Electric & magnetic fields** (`/sims/EMFields`), **Orbits & gravitation** (`/sims/Orbits`) and **Electric circuits** (`/sims/Circuits`), each of the last three described in its own section. Addresses never end in `.html`; old addresses such as `fields.html` are redirected by the site's page-not-found page. The **Physium** mark at the top left always returns to the homepage. Website preferences (theme, GUI size, grid, angle unit) are in the **Website** section of every page's settings, are the same on every page, and are remembered in this browser.

## Controls

Click **Keys ?** (or press **?**) for the built-in shortcut guide. Shortcuts do not intercept typing in property fields or other form controls.

| Key / gesture           | Action                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------ |
| Space                   | Play / pause (holding the key does not repeatedly toggle)                            |
| Q / Shift-box           | Select tool / add objects to a selection box                                         |
| G / B / N / W           | Grab / Ball / Block / Wedge                                                          |
| S / D / T / U           | Spring / Rod / Belt / Pulley                                                         |
| I / H                   | Impulse / Pan                                                                        |
| Wheel / middle-drag     | Zoom at cursor / pan in any tool                                                     |
| E / M                   | Electric / Magnetic field                                                            |
| V                       | Toggle velocity vectors                                                              |
| F                       | Toggle net force vectors                                                             |
| .                       | Step one 1/120 s while paused                                                        |
| R + left-drag           | Resize a body or field about its current centre                                      |
| Z                       | Toggle snapping for every geometry operation; also available in Settings             |
| Shift + drag            | Prioritise movement; moving a position-locked body requires Pause                    |
| Ctrl + drag             | Prioritise rotation about the centre; changing a rotation-locked body requires Pause |
| Shift + Alt + drag      | Move while refitting rod/cable lengths                                               |
| Ctrl + R                | Native browser reload                                                                |
| Alt + drag              | Refit attached rod / pulley cable lengths                                            |
| Delete / Escape         | Delete selection / cancel interaction                                                |
| Right-click / Shift+F10 | Material constants / constants for selection                                         |

In the constants menu each property is one row: name, slider, then the number with its unit. Hover the name (or listen to the field's description) for what it means. Type an exact value or drag the slider; both apply while the simulation runs.

- **Ball / Block / Wedge:** select a tool and click above the floor. The tool returns to Grab after one placement.
- **Grab:** drag directly without a mouse tether. Release while moving to throw; hold still before release to stop. A rod constrains normal dragging to its arc. Snapping suppresses throwing on release; locks and connections take priority over grid placement.
- **Independent locks:** use the bottom-right selected-item panel to lock position, rotation, or both. A locked body shows a small badge at its centre with the same icons as the panel's Lock toggles (position, rotation, or both side by side), following the icon weight. Badges keep the same screen size at any zoom and sit beside bodies that are too small to hold them. For a pinned ball, grab away from its centre to rotate it. With snapping enabled, rotation follows absolute 15° steps. Shift explicitly chooses translation, Ctrl explicitly chooses rotation. When paused, manual edits update the stored locked position/angle without disabling either lock; physics continues to respect those locks on resume. Running interactions cannot edit a locked degree of freedom, and an object with both locks on ignores every drag while the simulation runs; a message (“Pause to move a locked object”) says so when such a drag is refused. Paused, a fully locked object is edited like a free one: a plain drag moves it and Ctrl-drag rotates it, and both locks hold the new pose on resume. Every body carries ruler markings that turn with it, so rotation is visible. Tick lengths and spacing are fixed in metres, so a large body is marked exactly like a small one: blocks and wedges have 0.1 m ticks along each edge with longer ones every 0.5 m (coarser when zoomed out), and balls have degree ticks spaced about 0.07 m apart around the rim (10° on a default ball, finer on large ones) with longer ones every 30°. Ticks stop short of corners so neighbouring edges never collide.
- **Resize:** hold R before starting a drag, or click the selected-item panel's **Resize (R)** button. Drag outward/inward to resize a ball's diameter; drag a block near a corner to change width and height along its local axes. Dimensions appear beside the selection. The body stays centred and still during the gesture, even while physics runs. Mass stays constant; inertia is recalculated. Limits are 0.1–10 m. Edits that penetrate the floor or overlap pulley wheels are rejected. Return from the button-operated resize tool with G.
- **Spring / Rod:** click two bodies, or a world anchor and a body. Connections attach at body centres. Select a connection by clicking its line. Alt-drag changes rod length while paused or running.
- **Pause / Clear scene:** pause deliberately stops physics but editing still works. Clear removes everything except the static floor. Dragging does not pause the world.

### Velocity and net force vectors

**Velocity vectors** (V) and **Net force vectors** (F) are toggled from the bottom-left view cluster. Both use **linear** scales in screen pixels, so arrow lengths can be compared directly: velocity is 12 px per m/s, and net force uses the px/N value next to its toggle (default 4 px/N). A legend above the cluster names both colours and their scales. The selected body's arrows are labelled with the speed in m/s and the net force in newtons (three significant figures).

The net force is `sim.netForce()` (gravity, contact, friction, rod, spring and cable forces together) **averaged over the last 6 steps** (0.05 s), because a collision lasts a single 1/120 s step and would otherwise flash as a one-frame spike. Very long force arrows are capped on screen and marked with two slashes across the shaft; the label stays truthful. A body at rest, or a position-locked one, has zero net force and draws no arrow; separate weight / normal / friction arrows are not drawn.

### Readouts and scene energy

Selecting a single body adds a collapsible **Readouts** section to the bottom-right panel, updated every frame: position x, y (m), velocity vx, vy and speed (m/s), acceleration ax, ay (m/s², the net force ÷ mass, using the same 6-step average as the net force arrow), momentum px, py (kg·m/s), kinetic energy (translational + rotational), gravitational potential energy measured from the floor, and, once the scene has a charged body, electric potential energy (J): the body's energy in the global uniform field plus half of each Coulomb pair it belongs to.

The **Scene energy** box in the top-right corner shows the total mechanical energy and a stacked bar of its kinetic, gravitational and elastic (spring) parts, with each value listed beside it. A hatched segment is negative (for example gravitational energy with reversed gravity, or the electric energy of opposite charges). When the scene has a charged body an **Electric** part appears: potential energy in the global uniform field (zero at the origin) plus mutual Coulomb energy; it is often negative.

Placed field **regions** have sharp edges, so their fields have no potential energy. Instead the box shows **Supplied by field regions**, the work they have done on charges so far, and **Total − supplied**. That last number is the one that stays constant (without friction, damping or inelastic impacts), so watch it when checking energy conservation with field regions. The graph offers **Electric PE** for the selected body and **Total − supplied by field regions** for the scene. It appears once the scene has a body or connection and can be collapsed. All values use three significant figures in fixed-width digits so they do not jitter.

### Graphs

The selected-item panel also has a collapsible **Graph** for a single selected body. Choose what to plot: position x or y, velocity vx or vy, speed, the body's kinetic energy, or the total scene energy. The graph shows the last 20 s of **simulation** time (one sample per drawn frame), so pausing freezes it and slow motion stretches nothing. The vertical axis scales automatically, but never to less than 10% of the values' size, so a nearly constant quantity such as total energy reads as flat rather than magnifying tiny rounding wobble. The graph starts empty when you select a different body, load a scene, Reset or Clear.

### Time controls

Beside Run/Pause, **Step** (or **.**) advances exactly one fixed 1/120 s step while paused, so you can watch a collision or a turning point frame by frame. The **speed** selector (1×, 0.5×, 0.25×, 0.1×) runs the simulation in slow motion: less simulated time passes per real second, but every step is still the same 1/120 s, so results are identical to full speed. When the speed is not 1×, it is shown after the clock in the bottom-right corner.

### Presets, save and load

**Presets** (header) opens a list of ready-made experiments grouped by topic (kinematics, energy and momentum, forces, rotation, oscillations, electricity and magnetism). Each shows a small preview of its starting scene (drawn from the preset itself, with initial velocities as arrows), a short description and **What to look for**, the textbook result the scene demonstrates. Choosing one replaces the current scene, fits the view to it and starts **paused** so you can read first; press Run (Space) to start.

**Save scene** (download icon) downloads the whole scene, including settings, floor material, bodies, connections and fields, as `physics-sim-scene.json`. **Load scene** (folder icon) opens such a file. A file that is not a valid scene shows a message and leaves the current scene untouched. Loaded scenes also start paused.

**Reset** (beside Run/Pause) returns to the scene exactly as it was loaded from a preset or file, however many times you have paused and run since, so you can repeat an experiment. For a scene you built yourself, the starting point is its state the first time you pressed Run from paused. Clear scene forgets the starting point.

**Clear scene** asks for confirmation, then removes everything and restores every setting (gravity, air resistance, global fields, charge interactions, scene bounds, walls and floor material) to its default, as on page load. Only the snapping toggle is kept.

### Wedge / inclined plane

Choose **Wedge (W)** and click to create a right-triangular ramp, initially 3 m wide and 1.5 m high. It starts with both position and rotation locked. Pause, then drag to reposition it or Ctrl-drag to rotate it, or R-drag to change width/height and therefore slope. Each wedge shows the size of its two acute corners on the canvas, and the selected-item panel lists them too (the slope angle first). Resize keeps the centre of mass fixed; the triangle's centroid is not its bounding-box centre. The base slopes upward to the right at zero rotation.

Right-click for live **surface friction**, restitution, mass, charge and damping, as with other bodies. Contact friction uses the lower coefficient of the two touching bodies, so adjust both surfaces for a high-friction experiment. Unlock position/rotation independently if you want a movable wedge. Pins remain enabled through paused layout edits and resizing. Changing friction now clears the previous contact's cached tangential impulse, allowing a resting body to start sliding immediately when friction is reduced.

### Box selection and layout moves

Choose **Select (Q)** and drag a rectangle over objects. Shift-box selection adds objects to the current selection. Drag a selected body to move the group. With snapping enabled, translation follows 0.5 m increments, preserving the spacing between objects. Delete removes the selected objects and their attached connections.

Moving a selection includes every body connected to it, so springs, rods, cables and belts stay assembled. Enable **Bodies** and/or **Fields** in the tool-settings bar under the top toolbar. Mixed selections move both together; fields move as prescribed regions, preserving gradient settings. A field-only selection can move through the floor. The expanded selection is highlighted and announced. World anchors and pinned positions translate with the group; lock states, dimensions, angles and connection lengths remain unchanged. This is a layout edit and does not throw the group: selected bodies stay still during placement and release with zero velocity. Assemblies containing position-locked objects can only be moved while paused. The rest of the simulation keeps running for unlocked group moves. Ctrl in Select mode rotates the clicked body individually. Use Grab for individual, constraint-respecting physical manipulation instead.

### Simulation settings

The Edit tools (Grab, Select, Impulse, Pan) sit on an icon bar at the left edge of the canvas; hover for the name and shortcut. **Bodies**, **Connections** and **Fields** are drop-down buttons at the top: click one to list its tools, and choose a tool to close it (Escape or the arrow keys also work inside the list). A category button is highlighted and shows the active tool's icon when one of its tools is in use. Letter shortcuts work whether or not a drop-down is open. The top toolbar and its options strip centre themselves in the space between the edit bar and the Scene energy box; when they do not fit there (narrow window or large GUI size) the energy box moves below them. Messages appear above any bottom panel they would otherwise cover, and the header switches to icon-only buttons whenever its labels do not fit. Pressing on the scene closes whatever is open (Settings, Keys, a category drop-down or the constants menu); that press only closes the panel and does not also place an object or start a drag. The bar below contains the active tool’s options. Selected-item controls live in the bottom-right panel: a header with the name, dimensions, **Resize** and **Delete** icon buttons, then one row of toggles. Bodies show **Lock** with a pin (position) and a crossed rotation arrow (rotation); springs show Lock angle, pulley cables Reverse wrap, and belts Crossed, Drive and the drive speed.

Click **Settings** in the header to open the side panel. It is split into collapsible sections (**Simulation**, **Fields**, **Charge interactions**, **Scene**, **Website**); Simulation starts open. Each numeric setting is one row (name, slider, number with unit); hover the name for its explanation. Every slider whose range is centred on zero (gravity, the global fields, and in the constants menu charge, field strength, angles and gradient offsets) has a faint centre tick and snaps to exactly zero within 2.5% of its span; arrow keys step past the detent, and typed values are never snapped. Gravity and air resistance offer numeric entry and a live slider:

- **Gravity:** −50 to +50 m/s²; positive is downward, zero disables gravity, negative is upward. Default 9.81. The slider snaps to exactly zero within ±2.5 m/s², with a visible centre tick; manual input and keyboard arrow nudges still permit smaller nonzero values.
- **Air resistance:** 0–10 s⁻¹; an isotropic linear velocity and spin damping rate, added to each body's existing damping. Default 0. This is a simple linear drag model rather than a fluid simulation.

- **Snapping (Z):** one persistent toggle for position and group translations (0.5 m), rotation (15°), dimensions (0.5 m), and Alt-refitted connection lengths (0.5 m). The active operation determines what is snapped; physical constraints and walls take priority when exact grid placement is impossible. Shift/Ctrl/Alt can be changed during a drag; Shift wins if Shift and Ctrl are held together. R chooses resizing and works with the snapping toggle, but Ctrl+R and Cmd+R retain browser reload.
- **Floor:** the ground at y = 0 (on by default). Turned off (here, or from the floor's right-click menu), bodies fall past y = 0 and keep going, and can be added and dragged below it; a faint dashed line marks where the floor was, which is still the zero of gravitational potential energy. Right-click empty space to turn it back on. Saved with the scene.
- **Scene boundary walls:** enables four nonselectable static colliders at the world-space scene bounds. New scenes start with walls at the initial visible edges. Panning, zooming and browser resizing do not move them.

Changes preserve the current scene, velocities and simulation time. **Restore defaults** resets just these settings. Clear scene restores all of these to their defaults (except snapping), as reloading the page does. Website preferences are stored separately and persist. Global electric X/Y fields (N/C) and magnetic Z field (T) each range from −100 to +100 and default to zero. Positive X points right, positive Y up, and positive magnetic Z out of the screen.

### Electric and magnetic fields

Press **E** or **M**, then click to place a field. Electric regions start rectangular; magnetic regions start circular. Right-click the region to choose **rectangle, ellipse or circle**, edit dimensions (0.1–50 m), strength (−100 to +100 N/C or T), and angle. Drag empty space within a region to move it; Ctrl-drag rotates it; R-drag resizes it about its centre. Z snaps position/dimensions to 0.5 m and rotation to 15°. These are stationary prescribed regions, editable while running. Bodies and connections take pointer priority in Grab. Select tool options let you include bodies, fields, or both.

Right-click a ball or block and set its signed **Charge (C)** (−100 to +100; default 0). Electric force is `F = qE`; magnetic force is `F = q(v × B)`. The electric arrows follow the region's angle, reversing when strength is negative. Electric indicators are continuous lines with embedded arrowheads. Magnetic indicators are standalone dots for out of screen and crosses for into screen. Indicator spacing decreases with strength on a bounded logarithmic scale; local gradient strength also affects opacity and magnetic density. Magnetic fields bend a moving charge's trajectory without doing work; they do not start a stationary charge moving. Overlapping regions and global fields add together.

Fields sample the body's centre and model charge as a point charge at that centre, without torque. Boundaries are abrupt, with no fringe field. Mutual electrostatic interaction is optional; induction, current and magnetic material models are not implemented. Position/rotation locks retain their normal behaviour. Each fixed step uses the exact constant-field velocity solution for combined E/B; position, boundary crossings, contacts and mechanical constraints retain the simulation's finite-step approximation. Very rapid motion or very tight cyclotron orbits relative to the timestep remain under-resolved.

### Field gradients and charge interactions

Right-click a field to configure **Falloff** independently of its boundary shape. **Gradient shape** can be axial, circular, elliptical or box-shaped. Its origin is an X/Y offset from the region centre in world coordinates; its angle and X/Y scales are independent of the region angle and dimensions. Circular profiles use X scale. Electric direction can be parallel to the region angle or radial from the gradient origin. Negative strength reverses it.

The normalized distance `d` is measured along the positive gradient axis (axial), radially (circular/elliptical), or by the maximum absolute normalized axis distance (box). Profiles are:

| Profile     | Strength multiplier |
| ----------- | ------------------- |
| Uniform     | 1                   |
| Linear      | max(0, 1 − d)       |
| Inverse r   | 1 / √(1 + d²)       |
| Inverse r²  | 1 / (1 + d²)        |
| Exponential | exp(−d)             |

Inverse profiles are softened at the origin: the configured strength is the peak, and the far-field falloff follows the selected power. These are prescribed educational fields, not a solver for Maxwell's equations or arbitrary charge distributions.

In **Settings → Charge interactions**, enable **Mutual electric forces**. Every charged body becomes a source: like charges repel, opposite charges attract. Forces are evaluated pairwise, equal and opposite, with no self-force. A locked body still acts as a source. The Coulomb constant defaults to 1 N·m²/C² for manageable sandbox motion; the real vacuum value is approximately 8.99 × 10⁹. Near-contact smoothing defaults to 0.1 m and uses `F = k q₁ q₂ r / (r² + ε²)^(3/2)`, preventing a singularity at overlap. Very large charge/constant combinations can still exceed the resolution of the fixed timestep. Local/global prescribed fields remain active alongside these forces.

### Impulse tool

Choose **Impulse (I)** and drag a vector from a body in the desired direction. Tool settings offer **Impulse (N·s)** or **Add velocity (m/s)** and a gain per metre dragged. On release, impulse mode adds `Δv = J/m`; velocity mode adds the vector directly, independent of mass. Z snaps vector components before applying gain. The kick acts at the centre and adds no spin. Position locks reject kicks; mechanical constraints remove forbidden velocity components on the next physics step. Paused kicks take effect when resumed. Escape cancels the preview.

### Resizing and camera

Resizing captures the starting side/direction for the whole gesture. Crossing the object's centre keeps reducing the size to its minimum rather than reversing into growth. Moving back restores the size continuously. This applies to balls, blocks and field regions; their centres stay fixed. Z still snaps dimensions.

**Scroll** zooms around the cursor; **Pan (H)** or **middle-drag** moves the camera. The bottom-left view cluster holds zoom out / zoom level / zoom in, **Fit scene**, and three icon toggles (hover for names): **Velocity vectors** (V), **Net force vectors**, and **Snapping** (Z). The snapping toggle, the Z key and the Settings checkbox always agree. Settings lets you resize the scene from 2–1000 m on each axis, or set bounds to the current view. Resizing the scene preserves its horizontal centre and bottom edge; it never teleports existing bodies. If you shrink bounds past an existing body, reposition that body or disable walls while arranging the scene. The initial scene matches the visible canvas; zoom and pan are independent of its walls. Grid drawing becomes coarser at distant zoom levels, while geometric snapping remains 0.5 m.

**Website settings** include Light, Dark or System theme, GUI size (80–140%), grid visibility, and the angle unit (degrees or radians) used for wedge angles. They are remembered in this browser and do not change physics units or scene geometry. The small **Developer options** switch at the foot of the section is for the site's author (see Developer options).

The interface uses **Phosphor** icons (regular weight). The weight (thin, light, regular, bold, fill, duotone) is a developer option (see Developer options); labels and accessible names stay available whatever is shown. The icons are bundled locally with their licence in `vendor/icons`; no remote fonts or runtime icon requests are needed.

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

## Electric & magnetic fields tool

A separate page for static fields: place charges and currents, drag them about, and watch the field lines redraw. The sources stay where you put them; the only things that move are the test charges you release into the electric scene. Open it from the drop-down at the left of the top bar.

It holds two independent scenes, switched with **Electric / Magnetic** in the toolbar (`E` / `M`). Each starts with one arrangement so that it does not open empty.

| Scene    | Source                                                | Quantity                                                          | Range                                     |
| -------- | ----------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| Electric | Point charge                                          | Charge                                                            | −20 to 20 nC                              |
| Electric | Charged plate, seen edge-on                           | Surface charge density, length, angle                             | −10 to 10 nC/m², 0.2 to 20 m              |
| Magnetic | Straight wire, perpendicular to the screen            | Current; positive is out of the screen (⊙), negative into it (⊗)  | −100 to 100 A                             |
| Magnetic | Bar magnet, which is also a solenoid in cross-section | Coil current nI (turns per metre × current), length, width, angle | −500 to 500 A/m, 0.2 to 20 m, 0.1 to 10 m |

Choose a source in the toolbar and click the scene to place it; the tool then returns to Grab, as in the mechanics sandbox, with the new source selected. With Grab (`G`), drag a source to move it, Ctrl-drag a plate or magnet to turn it, hold `R` and drag a plate or magnet to resize it about its centre (its length, and a magnet's width too; `Z` snaps to 0.25 m either side of the centre), and click a source to edit its values and exact position in the panel at the bottom right. Arrow keys nudge the selected source; `Delete` removes it. Dragging empty space, or the Pan tool (`H`), moves the view; scroll to zoom. `Z` snaps positions to 0.25 m and angles to 15°. Up to 40 sources per scene.

The toggles in the view bar at the bottom left choose what is drawn (hover for their names); the **Display** panel holds the equipotential step, the potential key and the line density:

- **Field lines** (`L`), with arrows along the field. The arrows are arranged round the sources: on rings round a charge or wire where a line runs towards or away from it, and on evenly spaced spokes where a line runs round it (parallel to and square to the face of a plate or magnet). They stay on the same spot of their line when the view is moved.
- **Field arrows** (`A`) on a grid. Length and opacity grow with the square root of the field strength relative to the strongest tenth on screen: a guide to strength, not a scale.
- **Equipotentials** (electric scene only), thin green lines at equal steps of a round number of volts shown in the Display panel. The 0 V line is heavier. The scene behind them is shaded by potential: red where V is positive, blue where it is negative, and more opaque the larger |V| is. The opacity is proportional to |V| up to the value shown in the key ("full at ±…"), which is the largest potential outside the 3% of the screen closest to the charges; nearer than that the shading stays at full strength.
- **Forces** (`F`): the force on each point charge (in newtons), or on each metre of each wire (N/m), from every other source and the background field. Arrow lengths are in proportion to each other.
- **Values**: the labels on the sources.
- **Line density**: half to twice the usual number of lines.

Moving the view does not change the picture: the lines, their arrows, the equipotential step and the shading stay fixed to the scene. They are worked out again when you zoom or change a source.

**At the pointer** reads out the field under the mouse: magnitude, direction (anticlockwise from +x) and, in the electric scene, potential. Use it to check a calculation.

Settings adds a uniform **background field** to each scene, and holds the website preferences shared with the mechanics sandbox. **Presets** loads ready-made arrangements, each with a preview picture drawn from the preset itself and the textbook result to check; the numbers quoted are tested against the model. **Clear scene** empties the scene on show only.

### Test charges

In the electric scene, choose **Test charge** (`T`) and click to release one from rest. It is a +1 nC, 1 µg particle, so its acceleration in m/s² equals the field in N/C (`a = qE/m`). It moves in real time, leaves a dotted trail, and shows its speed while Values is on. The Display panel counts the test charges and has a **Clear** button for them and their trails.

**Test grid** (`Shift+T`) replaces any test charges with one at every grid intersection on screen and releases them all at the same moment, so you can watch the whole field act at once. The spacing is the drawn grid's (0.25 m), doubled until the points are at least 40 px apart: 0.5 m at 100% zoom, which is about 460 charges. Intersections on top of a point charge are left out, the limit is 1200, and in a grid each trail keeps only its most recent 1000 px or so.

- A test charge feels the field but does not add to it, and test charges do not affect each other.
- It stops when it lands on a plate or reaches a negative charge, and is stopped if it strays 150 m away. Its trail stays.
- **Its path is not a field line.** It has inertia, so it only follows a field line where the line is straight (from a single charge, between parallel plates, or along the line joining two charges). Elsewhere it overshoots the curve, and may miss a negative charge altogether and swing round it.
- Energy is conserved along the path: the kinetic energy gained is `qΔV`, which the pointer readout lets you check. There is no gravity, drag or radiation.
- Moving or changing a source while a test charge is in flight changes the field it feels from then on, which does not conserve its energy.

### What the picture means, and where it stops being exact

The screen is a flat slice through a three-dimensional arrangement.

- **Point charges** lie in the slice. `E = kq/r²` and `V = kq/r`, with V zero at infinity.
- **Plates, wires and magnets run straight into the screen without end.** A plate is a strip of uniform charge density σ: close to its middle the field is σ/2ε₀ on each side, and two opposite plates give σ/ε₀ between them, falling short of that as the gap becomes comparable with their length, and bulging at the edges. A wire gives `B = μ₀I/2πr`.
- **A bar magnet** is modelled as a uniformly magnetised bar, which is exactly equivalent to two sheets of current on its long faces: an ideal solenoid in cross-section. Inside a long one `B = μ₀nI`; the field lines continue through the inside, from south to north. Because it runs into the screen without end, its field far away falls as 1/r² rather than the 1/r³ of a short real magnet.
- **Magnetic field lines are exact.** They are contours of the vector potential, drawn at equal steps, so the same flux passes between every pair of neighbours and the spacing is inversely proportional to |B| everywhere. The flux per line rescales to suit the scene, so the number of lines cannot be compared between two different scenes.
- **Electric field lines are the textbook convention**, which a flat picture of a three-dimensional field cannot make exact. Lines leave each positive charge evenly in angle, 8 per nanocoulomb at normal density, and each line follows E precisely. But their spacing is only a guide to strength, and the number arriving at a negative charge can differ from 8 per nanocoulomb: with +4 nC and −1 nC, the lines that leave within 60° of the line joining the charges arrive, which is 11 of 32, although only a quarter of the flux does. Plates and the background field are seeded by flux, so equal uniform fields do get equal spacing.
- **A plate has no zero of potential at infinity**, because it never ends. Its potential is taken as zero about 1 m away, so only potential differences mean anything in a scene with plates.
- **Equipotentials** stop short of the few percent of the screen closest to the charges, where they would merge.
- **The sources are static.** They stay where they are put: forces on them are shown but do not move them, there is no induction, and the two scenes do not affect each other. No force is calculated on plates or magnets. Only test charges move, and only in the electric scene: in the magnetic scene the field lies in the screen, so the force on a charge moving in the screen would point out of it.

**Saving and loading.** **Save scene** downloads the electric and magnetic scenes together, with their background fields, as `physics-sim-fields.json`; **Load scene** opens such a file on the scene that was showing when it was saved. Test charges are not saved.

## Orbits & gravitation tool

A separate page for Newton's law of gravitation, `F = GMm/r²`. Open it from the drop-down at the left of the top bar. It has two views, chosen with the **Satellites** and **Gravity sandbox** buttons at the top of the scene (or `S`):

- **Satellites**: a central body (the Earth to begin with) sits still at the centre. You choose where a satellite starts, how fast and in which direction it is launched, and watch the path it takes. Raising the launch speed takes it from falling to the ground, through an ellipse, a circle and a larger ellipse, to escape. Most of this section is about this view.
- **Gravity sandbox**: any number of bodies (up to 40), every one pulling on every other, all free to move: a solar system, binary stars, a planet with moons. See [Gravity sandbox](#gravity-sandbox) below.

### Setting up a launch

The **Launch** panel holds the values; each has a slider and a box to type in.

| Quantity                    | Meaning                                                                                               | Range                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Central body                | Earth, Moon, Mars, Jupiter or Sun, or type your own mass and radius                                   | 10¹⁵ to 10³² kg, 1 km to 10⁷ km                  |
| Altitude and orbital radius | Height above the surface, and distance from the centre: two views of the same number                  | from the surface out to 10¹¹ km                  |
| Launch speed                | Speed at launch                                                                                       | 0 to 30 000 km/s (a tenth of the speed of light) |
| Launch angle                | Direction above the local horizontal: 0 is horizontal, 90° straight up, negative below the horizontal | −180° to 180°                                    |

The launch point starts at the top of the body, where "horizontal" points to the right. **Position round** moves it round the body (anticlockwise from the top, −180° to 180°), and everything about the launch turns with it: the launch angle is always measured from the local horizontal there. On the scene, **drag the arrow** on the launch point to set speed and direction together (hold Shift to keep the direction), and **drag the launch point** in or out to change the altitude. The arrow is 64 px long at the circular orbit speed.

Beside the speed are the two speeds to compare it with, both for the current distance from the centre: the **circular orbit speed** `√(GM/r)` and the **escape speed** `√(2GM/r)`. **Use** sets the launch speed to exactly that value. The line under them gives your speed as a multiple of each.

The strip at the top of the scene says what the launch will do, and the dashed line shows the path it predicts. Both come from the launch position and velocity alone (see below), before anything has moved.

**Launch** (`L`) releases the satellite. Up to 8 can be in flight at once, each in its own colour; launch again with different values to compare orbits. Click a satellite, or its chip under the Launch button, to choose which one the readouts and graphs describe; the × on a chip removes it. Changing the central body removes the satellites in flight, because their orbits belonged to the old one.

**Presets** loads a ready-made launch: low Earth orbit (400 km), geostationary orbit, the Moon's orbit, Newton's cannon, and an eccentric ellipse. Each sets a suitable time warp and says what to check. Loading one removes the satellites in flight and does not start anything: the launch is set up, with its predicted path, and waits for **Run** (or **Launch**).

### Running it

- **Run / Pause** (`Space`). Run with nothing in flight launches the satellite that is set up.
- **Step** (`.`) advances one frame of simulated time while paused: the time warp × 1/60 s.
- **Reset** (`R`) removes every satellite and sets the clock to zero. The launch values and the third-law points are kept.
- **Clear scene** (top bar, after a confirmation) empties the view that is showing and sets its clock to zero. In the satellites view it removes every satellite, trail and third-law point but keeps the central body and the launch set-up; in the gravity sandbox it removes every body. The other view is not affected.
- **Time warp** (`[` and `]`): simulated seconds per real second, from 1× to 1 000 000 000×. A low orbit takes 92 minutes and the Moon 27 days, so the presets choose a warp that shows an orbit in ten or twenty seconds. If a warp asks for more than the computer can do accurately in a frame, the simulation runs slower than asked, and says so beside the clock, rather than taking longer steps.
- **View**: drag empty space to pan, scroll or `+` / `−` to zoom. **Keep orbit in view** (`A`) follows the whole scene as orbits grow; panning or zooming turns it off, and **Fit scene** fits once.
- **Trails** (`T`) draw the path taken; **Clear trails** (`C`) erases them. A closed orbit retraces itself exactly, so its trail is drawn for one turn.

### Display

The display toggles are in the view bar at the bottom left (hover for their names); **Keep orbit in view** and **SI base units** stay in the Display panel.

- **Velocity** (`V`) and **Gravity force** (`G`) arrows on each satellite. All velocity arrows share one scale, and so do all force arrows: 64 px for the circular orbit speed, and for the force, at the launch point's distance. A force arrow that would be longer than 190 px is shortened and marked so.
- **Predicted orbit** (`P`): the conic worked out at launch, as a faint line. The trail then lies on top of it.
- **Equal areas** (`K`): Kepler's second law, below.
- **Equipotentials** (`E`): shades the gravitational potential (darker where it is lower, near the body) and draws dashed circles at equal steps of it, labelled with the step in J/kg. The circles crowd together near the body, where the field is strongest.
- **Values**: the numbers beside the arrows and the names on the scene.
- **SI base units**: readouts in m, m/s, s and J instead of km, km/s, minutes/hours/days and GJ. Either way, hovering over a readout shows the SI value to seven figures.

### Readouts and graphs

The **Readouts** panel shows, for the chosen satellite (or, before launch, for the launch that is set up): time since launch, distance from the centre, altitude, speed, kinetic energy `½mv²`, gravitational potential energy `−GMm/r` (zero at infinity, so always negative), their total, how much that total has changed since launch, and angular momentum. Below them are the orbit's type, semi-major axis, eccentricity, period, periapsis and apoapsis, and the period as timed by the simulation once an orbit has been completed.

Energies, angular momentum and force are for a satellite of the mass set in **Settings** (1000 kg to begin with). The path does not depend on that mass.

**Graphs against time** plot the three energies together, the distance and the speed, over the last few orbits. Kinetic and potential energy trade places as the satellite moves in and out while the total stays flat.

### Kepler's laws

- **Second law.** With **Equal areas** on, the orbit is divided into twelve equal intervals of time (twelfths of the period), and the area swept by the line from the centre to the satellite in each is shaded and numbered, alternately dark and light. The **Kepler's laws** panel lists the twelve areas, how far the largest and smallest differ, and the theoretical value `½(L/m)Δt`. The areas are measured from the simulated motion, not taken from the formula.
- **Third law.** Each satellite adds one point to the plot of `T²` against `a³` when it completes its first orbit: its timed period squared against its semi-major axis cubed. After a few launches at different speeds or altitudes the points lie on a straight line through the origin. The panel gives the slope of the best such line beside Newton's prediction `4π²/GM`, and a tick box draws that line. Points from a different central mass lie on a different line. **Clear points** empties the plot; Reset does not.

### How the orbit is worked out

The readouts and the predicted path are not measured from the trail. They come from the satellite's position and velocity at one instant, through three quantities that gravity conserves (each per kilogram of satellite, with μ = GM):

- energy `ε = v²/2 − μ/r`, which gives the semi-major axis `a = −μ/2ε`;
- angular momentum `h = r × v`, which gives `p = h²/μ`;
- the eccentricity vector `e = ((v² − μ/r) r − (r·v) v)/μ`, whose length is the eccentricity and which points at periapsis.

The path is then the conic `r = p/(1 + e cos ν)`, periapsis is `p/(1 + e)`, apoapsis `2a − periapsis`, and the period `2π√(a³/μ)`.

| ε        | e             | Type                                |
| -------- | ------------- | ----------------------------------- |
| negative | below 0.001   | circular                            |
| negative | 0.001 up to 1 | elliptical                          |
| zero     | 1             | parabolic: exactly the escape speed |
| positive | above 1       | hyperbolic: it keeps `v∞ = √(2ε)`   |

Any of these is an **impact** instead if the path meets the surface: periapsis is inside the body and the satellite is bound, or already heading inward. The satellite stops where its path meets the surface and the strip reports when, how far round from the launch point, and how fast.

The motion itself is integrated numerically, in SI units, with `G = 6.674 × 10⁻¹¹ N·m²/kg²`. The integrator is a leapfrog (drift, kick, drift), which is symplectic and time-reversible, so energy and angular momentum do not drift as they do with a simple Euler step. Its step is not a fixed number of seconds: it is fixed in a stretched time `s` with `dt = (r/μ) ds`, so a step lasts longer when the satellite is far away and slow, and is short when it is close and fast. The step size is chosen at launch so that the satellite never moves more than 0.2% of its distance from the centre in one step (about 3100 steps round a circular orbit, 7500 round an ellipse of eccentricity 0.7). For a single attracting body this scheme has a useful exact property: every step ends on the true conic, whatever its length, so the only numerical error is a small one in timing. The steps do not depend on the frame rate or the time warp; at low warps, where a frame is shorter than a step, a step is cut short to end on the frame, which is still on the conic.

### Gravity sandbox

Every body attracts every other with `F = Gm₁m₂/r²`, and every body moves, so the Sun wobbles as its planets go round, two stars circle their common centre of mass, and moons are tugged by both their planet and the Sun.

**Adding bodies.** In the **Bodies** panel, choose a kind (star like the Sun, gas giant like Jupiter, planet like the Earth, moon like the Moon, asteroid like Ceres, spacecraft, or custom), adjust its mass and radius if you like, press **Place** and click the scene. A new body starts moving on a circular orbit round the body whose pull dominates where you click (of the bodies at least as heavy as it, the one with the largest `M/r³`); if there is none, it starts at rest. Hold `Ctrl` while clicking to keep placing; `Escape` stops. The chips under the panel list the bodies: click one to select it, × removes it. **Remove all** empties the scene.

**Changing a body.** Click a body to select it. Drag it to move it (paused or running). Drag the round handle at the tip of its arrow to set its velocity (Shift keeps the direction and changes only the speed). The **Selected body** panel sets its name, mass and radius; **Circular orbit** gives it exactly the circular speed round the body it goes round; **Delete** (or the `Delete` key) removes it.

**Snapping** (the grid button in the view bar, or `Z`) makes placing and moving land on half a grid square (the grid spacing follows the zoom), and makes the arrow handle set directions in 15° steps and speeds in round steps of about a twentieth of the arrow scale (1 km/s for the Earth's orbit, for example). **Circular orbit** in the Selected body panel gives the exact circular speed.

**Arrows.** Every velocity arrow is the body's velocity in the frame of the scene, and every arrow in the scene is drawn on one scale, shown in the System panel (for example "64 px = 29.8 km/s"); so are the **force arrows** (`G`, the force toggle in the view bar), each the net gravitational force on that body from all the others. Values are written beside the selected body's arrows when Values is on; an arrow too long to draw says "(arrow shortened)". The scales are set when a scene is loaded or built from empty (from the typical circular orbit speed and the typical force), and kept while you edit, so changing one body never changes another body's arrow; they are only set again if the scene changes so much that the arrows would be more than four times too long or too short. A moon's arrow is therefore close to its planet's: it is the planet's velocity plus the moon's small speed round it. The speed of a body relative to the one it goes round is in the Selected body panel, and the dashed line is the conic the body would follow if only that one body pulled on it; it is a guide, and the real path departs from it wherever other bodies matter.

**Readouts.** The **System** panel shows the time, kinetic and gravitational potential energy, their total and how much it has changed since Run (a check on the calculation: it should stay near 10⁻¹⁰ % or smaller), and the total momentum and angular momentum, which stay constant. **Stop drift** gives the whole system zero total momentum and puts its centre of mass (the small cross) at the origin, so it stays in view. The **Selected body** panel shows the gravitational force on the body and the orbit round the body it goes round: distance, relative speed, orbit type, semi-major axis, eccentricity and the period `2π√(a³/G(M + m))`.

**Collisions.** Two bodies that touch merge into one: mass and momentum are kept, the volume is the sum of the two, and a message says so. Energy is not kept in a merger (it becomes heat), so the total energy readout changes then.

**Running it.** Run, Step, the time warp, trails, `C` (clear trails) and the view work as in the satellites view. **Reset** puts every body back where it was when Run was first pressed after the last Reset, preset or loaded file.

**Presets** (the lower half of the Presets list): the Sun, Earth and Moon at their real masses and distances; the four inner planets; the whole Solar System (the Sun and all eight planets at their real masses and mean distances, on circular orbits: periods from Mercury's 88 days to Neptune's 165 years, with Jupiter and Saturn swinging the Sun round by more than its own radius; checked against Kepler's third law to 0.1% for Mercury to Jupiter); two equal stars in a binary; a star wobbling as a heavy planet goes round it; three equal stars chasing each other round a figure of eight (Chenciner and Montgomery's solution); and Jupiter with its four large moons.

**How it is calculated.** Each step moves every body with a fourth-order symplectic method (Yoshida's), which keeps energy from drifting over long runs. The step length is set afresh each step as a fiftieth of the shortest orbital time scale `√(r³/G(m₁ + m₂))` between any pair, and shorter still when two bodies are closing on each other, so close passes are taken in small steps and wide orbits in large ones. Checked against: a binary star over 10 periods (positions within 10⁻⁵ of the separation, energy within 10⁻¹⁰), the Earth's year (within 0.01 day of `2π√(r³/G(M + m))`), an orbit of eccentricity 0.7 over 100 turns (energy within 10⁻⁵, angular momentum within 10⁻⁹) and the figure of eight (back to its start within 10⁻⁴ of its size after one period).

**Limits.** Bodies are points for gravity and spheres for collisions; there is no spin, no tidal effect, no relativity, and no friction or drag. Everything is in one plane. A merger is perfectly inelastic: there is no bouncing or breaking up.

**Saving and loading.** In the sandbox, **Save scene** downloads `physium-gravity.json` with every body's name, mass, radius, position and velocity, and the time. **Load scene** recognises such a file and switches to the sandbox to open it.

### Where it stops being exact

- **The central body is held still.** That is right when the satellite's mass is negligible, and wrong for the Moon: with the Earth fixed, the Moon's-orbit preset takes 27.45 days, where the real Moon takes 27.32, because the Earth and Moon both go round their common centre of mass (`T = 2π√(r³/G(M + m))`). The panel warns when the satellite mass you set is more than a millionth of the body's.
- **Gravity is that of a point mass**, which is exact outside a perfectly spherical body. The real Earth is slightly flattened, which makes real low orbits slowly turn in space; here they do not.
- **No atmosphere.** A real satellite at 400 km loses height over months, and Newton's cannonball would be slowed by air. Here nothing takes energy away.
- **The body does not spin.** Speeds are measured against the non-rotating body, so a launch gets no help from the Earth's rotation, and a geostationary satellite is not shown hovering over one place.
- **Nothing else pulls.** No Sun, Moon or other planets, and satellites neither attract nor collide with each other.
- **Everything is in one plane**, and the Moon's-orbit preset is a circle at the Moon's average distance (the real orbit has eccentricity 0.055).
- **The surface is a smooth sphere** of the body's mean radius: no mountains, and an orbit may skim it exactly.
- **Newtonian gravity only.** Speeds are limited to a tenth of the speed of light, and a body so compact that its escape speed would exceed that is refused.
- **Constants are rounded.** With `G = 6.674 × 10⁻¹¹` and `M = 5.972 × 10²⁴ kg`, the geostationary radius comes to 42 163 km; the usual 42 164 km uses the more precisely known product GM.
- **"Circular" is a label** for eccentricity below 0.001, and "parabolic" for total energy that is zero to rounding. Typing the escape speed to four figures gives a very long ellipse or a hyperbola, correctly; **Use** gives the parabola.
- **An escaping satellite is followed out to 200 launch radii** and then left. The graphs keep the most recent few orbits.

**Saving and loading.** **Save scene** downloads `physics-sim-orbits.json`: the central body, the launch that is set up, and how and when each satellite was launched. **Load scene** flies those launches again up to the moment of saving, so every satellite is back where it was with its trail and Kepler's-law records, then waits for Run. A flight too long to fly again in about a second loads with the satellites on their right orbits but starting from their launches, and says so.

## Electric circuits tool

A separate page for building DC and AC circuits and reading the current, potential difference and power anywhere in them, with capacitors and inductors that respond in time. It is meant for checking a calculation: every reading is the exact solution of Kirchhoff's laws for ideal components, shown to four significant figures. Open it from the drop-down at the left of the top bar.

The **DC** and **AC** buttons at the left of the toolbar switch between the page's two views, the way the fields tool switches between Electric and Magnetic. Each view keeps its own circuit, time scale and presets, so switching away and back loses nothing. DC has the cell; AC has the AC source in its place, reads its meters as RMS values, turns the graphs into an oscilloscope and adds a phasor diagram (see **The AC view** below). Every other component, the inductor included, is in both.

### Building a circuit

- **Place a component**: click it in the toolbar (or press its number key), then click the grid; or drag it straight out of the toolbar onto the grid. Everything snaps to the grid. `R` turns the component before it is placed. The tool then returns to **Grab**.
- **Wire it up**: drag from any terminal to wherever the wire should end. If the two points are not in line the wire is drawn with one corner, along the direction you set off in; hold Shift for a single straight wire. The **Wire** tool (`W`) starts a wire from any grid point and stays on until Esc or `G`.
- **Junctions**: ends that share a grid point are joined. A wire that ends part-way along another wire joins it there (the other wire is cut at that point). A filled dot marks three or more ends meeting; a small open ring marks an end joined to nothing.
- **Put a component in series**: drop it onto a wire. It turns to lie along that wire, whichever way the wire runs, the wire is cut and the component is inserted. This works from the toolbar and when dragging a component that has no wires on it yet; the faint preview shows which way it will face.
- **Move**: drag a component and the wires on its terminals stretch to follow. Arrow keys move the selected component one square. A selected wire has a handle at each end.
- **Turn**: `R` (or the button in the panel) turns the selected component a quarter-turn about its centre. The wires stay put, so one quarter-turn takes it off them and a second puts it back.
  - A **cell, capacitor, ammeter or voltmeter** has a + terminal, so it has four orientations, and the second quarter-turn puts it back the other way round: that is how to reverse one. A two-way switch also has four.
  - A **resistor, variable resistor, lamp or switch** behaves the same either way round, so it has two orientations only, horizontal and vertical. Turning it never draws it upside down or back to front, and two quarter-turns leave it exactly as it was.
- **Delete**: `Delete`. **Clear scene** removes everything.
- **View**: drag empty space to pan (or use Pan, `H`), scroll or `+` / `−` to zoom, **Fit scene** (`F`).

### Components

| Component           | What it is                                                                                                                                                                                                                                                    | Values                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Cell                | An EMF `E` in series with an internal resistance `r`. The long plate, marked +, is the positive terminal.                                                                                                                                                     | `E` up to 1000 V; `r` from 0 (ideal, the default) to 1 MΩ |
| Resistor            | Obeys `V = IR` exactly.                                                                                                                                                                                                                                       | 0 to 1 GΩ (0 Ω behaves as a wire)                         |
| Variable resistor   | A resistor with a slider from 0 to its maximum.                                                                                                                                                                                                               | maximum up to 1 GΩ                                        |
| Lamp                | A fixed resistance. Its glow is drawn from its power as a fraction of its rated power.                                                                                                                                                                        | 0.01 Ω to 1 MΩ; rated power 1 mW to 10 kW                 |
| Switch              | Open: no current at all. Closed: no resistance at all. Click it to work it, also while running.                                                                                                                                                               |                                                           |
| Two-way switch      | Joins its common contact to one of two others; click it to change over.                                                                                                                                                                                       |                                                           |
| AC source (AC view) | An EMF `e = V₀ sin(2πft + φ)`, with an optional internal resistance. Set by its RMS voltage or its peak voltage (`V₀ = √2 × V_rms`; changing one changes the other), frequency and starting phase. The terminal marked + is the one that goes positive first. | up to 1000 V peak; 0.01 Hz to 1 MHz                       |
| Inductor            | `V = L dI/dt`: it opposes any change in its current. Ideal, with no resistance of its own; starts with no current.                                                                                                                                            | 1 nH to 1000 H                                            |
| Capacitor           | `Q = CV`. Uncharged to begin with unless given a **starting p.d.** The plate marked + is the one the p.d. is measured from.                                                                                                                                   | 1 pF to 100 F; starting p.d. up to ±1000 V                |
| Ammeter             | Ideal: zero resistance. Goes in series.                                                                                                                                                                                                                       |                                                           |
| Voltmeter           | Ideal: infinite resistance, takes no current. Goes in parallel.                                                                                                                                                                                               |                                                           |
| Wire                | Ideal: zero resistance, so no p.d. along it.                                                                                                                                                                                                                  |                                                           |

Click a component to see and change its values. The number box is in the unit shown beside it; choosing another unit (Ω, kΩ, MΩ; pF to F) re-expresses the number without changing the value. A value outside its range is refused with a message and nothing changes.

### Readings

- **Meters** show their reading beside them on the circuit, and all of them are listed in the **Meters** panel. A meter has a + terminal: an ammeter reads positive when conventional current enters by it, a voltmeter when it is at the higher potential. Turn a meter round and the sign changes.
- **Any selected component** (DC view) shows its current (with an arrow for the direction of conventional current on the screen), the p.d. across it, its power, and the potential at each end. A cell also shows its EMF, terminal p.d. `V = E − Ir`, the power it delivers `VI`, the power lost inside it `I²r`, and the energy it has supplied since the last reset. A resistor or lamp shows the energy it has dissipated. A capacitor shows its charge `Q = CV`, stored energy `½CV²` and time constant; an inductor its stored energy `½LI²` and time constant `L/R`.
- **Potentials** are measured from the negative terminal of the first cell in each separate section of the circuit, which is that section's 0 V. (A section with no cell takes one of its own nodes as 0 V.)
- A reading of **–** means there is no value to give: the component is in a short-circuited loop, or a voltmeter joins two sections that are not connected to each other.
- Readings are live whether or not the clock is running. In a circuit with no capacitor nothing depends on time, so there is no need to press Run to read it.

### Running it

- **Run / Pause** (`Space`) starts and stops the clock. The dots move, capacitors charge and discharge, and the graphs are drawn, only while it runs.
- **Step** (`.`) advances one frame of simulated time while paused: the time scale × 1/60 s.
- **Reset** (`0`) sets the clock to zero, returns every capacitor to its starting p.d. and clears the energy totals and graphs. The circuit is kept.
- **Time scale** (`[` and `]`): simulated seconds per real second, from 0.001× to 60×, for time constants from milliseconds to minutes. If a scale asks for more steps than the computer can do in a frame, the simulation runs slower than asked, and says so beside the clock, rather than taking longer steps.
- **Graphs against time** plot the p.d. across the selected component and the current through it since the last reset. The graphs stay on the last component selected when you click a switch or a wire, so a capacitor's curve carries on through a change-over. A dashed line marks one **time constant τ** after the last change to the circuit (a switch worked, a value edited, or the reset): in one τ a charging p.d. covers 63% of the way to its final value and a discharging one falls to 37%. If the circuit has more than one time constant its curves are sums of exponentials; the panel lists them and marks none.
- Switches can be worked, values changed and wires moved while it runs. The charge on every capacitor is kept through any such change.

### The AC view

- **Meters read RMS.** An ammeter or voltmeter shows the RMS value over the last whole cycle of the source, marked `rms`, so it shows `–` until one cycle has run. For a sine wave RMS is peak/√2; the reading is measured from the waveform, not assumed, so it is also right while a circuit is still settling.
- **Any selected component** shows its RMS current and p.d., whether its current leads or lags its p.d. and by how many degrees, its impedance `V/I`, its mean power, and the values at this instant. A capacitor or inductor also shows its reactance from the formula, `1/(2πfC)` or `2πfL`, to compare. The source shows the circuit's impedance, the mean power it supplies and the power factor `cos φ`.
- **Oscilloscope.** The graphs show the last three cycles of the p.d. across the selected component and the current through it, one above the other on the same time axis, so a phase difference shows as one trace peaking before the other.
- **Phasor diagram.** The p.d. across each component is drawn as an arrow: its length is the RMS p.d. (all to one scale) and its angle is its phase, measured from the source's EMF, anticlockwise for ahead. In a series circuit the arrows for R, L and C add, tip to tail, to the supply's, which is why three voltmeter readings do not simply add up. The dashed arrow marked I shows the direction of the current; its length means nothing, since it is not a p.d.
- **Time scale.** At 50 Hz a cycle lasts 20 ms, so the AC presets run at 0.02×: one cycle a second. The dots move to and fro with the current.
- **Switching on.** A circuit starts from rest at t = 0, so the first few cycles can include a transient that then dies away (in a series RLC circuit, with time constant 2L/R). With no resistance at all it never dies away: an ideal inductor switched onto a source at a zero of its EMF carries a current that never reverses, `(V₀/ωL)(1 − cos ωt)`. That is correct, and is why the inductor preset starts its source at its peak.

### Display

These are toggles in the view bar at the bottom left (hover for their names); the Display panel keeps the potential colour key and says which way the dots run.

- **Current** (`C`): bright dots, each ringed in the page colour so that it stands out from the wire on both themes, along every wire and lead that carries current. They are evenly spaced along each stretch of the circuit between one junction and the next, where the current is the same all the way along, and they fade in and out at the junctions themselves. Their speed is proportional to the current: at any moment the fastest dots are on the branch with the most current (three times the current, three times the speed), and as a capacitor charges they slow in step with it. The speed is scaled to the largest current seen since the last reset, so that milliamps and amps are both visible. The dots also follow the **time scale**: halve it and they move at half the speed, double it and they double, measured from the scale the preset (or saved file) set. At very high time scales the movement in one frame is held to under half the gap between dots, for every branch alike, so that the dots do not appear to freeze or run backwards.
- **Electron flow** (`E`): the same dots moving the way the electrons do, from the − terminal round to the +. Readings and arrows stay conventional.
- **Colour by potential** (`P`): each wire and lead is coloured from blue (lowest potential in the circuit) to red (highest). Everything joined by plain wire is one colour; the colour changes only across a component.
- **Values** (`V`): names and values beside the components, and the meter readings.

### Presets

**Presets** loads a ready-made circuit, paused at t = 0, and says what to check: resistors in series (1.00 A; 4.00 V and 8.00 V), resistors in parallel (3.00 A + 1.00 A = 4.00 A), a potential divider with a variable resistor (4.00 V), a cell with internal resistance (2.00 A, terminal p.d. 10.0 V, and 12.0 V with the switch open), a balanced Wheatstone bridge (exactly 0 through the bridge), a capacitor charged and discharged through 10 kΩ by a two-way switch (τ = 1.00 s; 6.32 V after 1 s), and an inductor's current growing and decaying through 100 Ω (L/R = 5.00 ms; 63.2 mA after 5 ms).

The AC view has its own, all on 10 V RMS: a resistor (100 mA, in phase, 1.00 W), a capacitor (X_C = 318 Ω, 31.4 mA leading by 90°), an inductor (X_L = 157 Ω, 63.7 mA lagging by 90°), a series RLC circuit at 50 Hz (Z = 190 Ω, 52.7 mA leading by 58.2°; 5.27 V, 8.28 V and 16.8 V across R, L and C), and the same circuit at resonance, 71.18 Hz (Z = R, 100 mA, and 22.4 V across each of L and C).

### How the circuit is solved

The circuit is solved by **modified nodal analysis**, in SI units. The unknowns are the potential of every node (every set of terminals joined at a point), and the current through every element that fixes a p.d. instead of obeying `I = V/R`: each cell, wire, ammeter and closed switch. The equations are Kirchhoff's current law at every node, and for each of those elements its own law (`V₊ − V₋ = E − Ir` for a cell, `V_a − V_b = 0` for a wire). They are solved exactly, by Gaussian elimination with partial pivoting. Nothing is approximated by a very small or very large resistance, so adding an ammeter in series or a voltmeter in parallel changes no reading anywhere.

Each separate section of the circuit gets its own zero of potential, so a part that is not connected to the rest still solves.

**Capacitors** are stepped in time with the trapezoidal rule. The step is fixed for a given circuit, at 1/100 of its shortest time constant, and does not depend on the frame rate; the time constants are found from the circuit itself (they are printed for a selected capacitor, and the step is shown at the bottom of the page). At a time scale where a step would be longer than half a frame it is halved until it is not, to keep slow circuits smooth. With that step a charging curve is within about 0.001% of `V₀(1 − e^(−t/RC))`. Energy is accounted for step by step, so the energy supplied by the cells equals the energy stored plus the energy dissipated to rounding.

**Inductors** are the capacitor's mirror image and are handled the same way: stepped with the trapezoidal rule, with L/R time constants found from the circuit. Where a capacitor holds its p.d. at an instant, an inductor holds its current. A circuit with both capacitors and inductors can oscillate, so no time constant is reported for it; its step is set from a bound on its natural frequencies, and an LC circuit keeps its total energy `½CV² + ½LI²` to rounding.

**AC** is the same time-stepping, not a separate calculation: the source's EMF is followed through each cycle in at least 400 steps (a whole number of them, more if the circuit's own rates need it). RMS values, mean power and phases are then measured over each whole cycle, as a real meter and oscilloscope would. Against the formulas the RMS readings are within about 0.002% and the phase angles within about 0.0002°.

The first instant matters as much as the curve: at t = 0, and immediately after any switch is worked, the circuit is solved with each capacitor holding its present p.d., which gives the starting current exactly (`V/R` for an uncharged capacitor).

### Faults and special cases

- **Short circuit.** A cell with no internal resistance whose terminals are joined by wire has no current that satisfies its equations. A red banner says so and names the cell, the loop is drawn in red, and every reading in that section shows – rather than a number. Other, separate circuits on the page carry on. Give the cell an internal resistance and the current becomes `E/r`; the banner stays, because it is still a short circuit.
- **Ideal cells that disagree.** Two cells with no internal resistance and different EMFs joined in parallel are reported the same way, naming both.
- **Open circuit.** A break is a valid circuit: no current flows, the whole EMF appears across the gap, and a note says which cell has no complete path.
- **Parallel wires.** If two plain wires (or ammeters, or closed switches) join the same two points, the circuit fixes their total current but not how it divides. It is shared as identical conductors would share it, equally, and a note says so. Every other reading is unaffected.
- **Capacitors joined by plain wire.** Capacitors in parallel share a charging current in proportion to their capacitance. If a switch joins two capacitors at different p.d.s, or a capacitor straight across an ideal cell, with no resistance in the loop, the charge moves in no time: the new p.d.s follow from conservation of charge (two 100 µF capacitors in series across 10 V go at once to 5 V and 500 µC each), a message says it has happened, and there is no curve to plot. The energy that a real circuit would lose in the wires and the spark is simply gone from the totals.
- **An inductor's current interrupted.** Opening a switch in series with an inductor that is carrying current leaves that current nowhere to go. It stops at once, a message says so, and the energy `½LI²` is gone from the totals: in a real circuit it makes the spark at the switch. If a switch instead forces two inductors with different currents into series, they take a common current at once by conservation of flux linkage `LI` (0.1 H carrying 100 mA joined to an idle 0.3 H: 25 mA in both). A two-way switch that moves an inductor from one path to another does neither: the current carries on smoothly.
- **A shorted AC source** is a short circuit at every instant, including the moments its EMF passes through zero.
- **Very small readings.** A current or p.d. smaller than the rounding error of the arithmetic (about 10⁻¹⁵ of the largest p.d. in that section) is shown as exactly 0. A balanced bridge therefore reads 0 A, not 10⁻¹⁷ A.

### Where it stops being exact

- **Every component is ideal.** Wires have no resistance, meters do not disturb the circuit, switches are perfect. Real meters and leads are not.
- **A lamp is a fixed resistance.** A real filament's resistance rises several-fold as it heats, so a real lamp's current is not proportional to its p.d. Here it is. A lamp above its rated power is drawn fully bright and does not blow.
- **A cell is a fixed EMF and a fixed internal resistance.** It never runs down, and it can be driven backwards (charged) without complaint.
- **Nothing overheats, sparks or breaks down**, whatever the current, p.d. or power.
- **Capacitors do not leak** and have no resistance of their own: an isolated charged capacitor holds its charge for ever.
- **Changes are instantaneous.** A switch has no bounce and wires have no inductance, which is why charge can move between capacitors in no time.
- **Inductors have no resistance and no capacitance of their own**, and do not saturate. A real coil has all three.
- **AC is a pure sine wave from an ideal source**, and RMS readings are over whole cycles of that source. With two sources of different frequencies the readings are taken over the slower one's cycle and are only approximate.
- **Linear only**: no diodes, transformers or other non-ohmic components.
- **The dots are a picture of the current, not of the charge carriers.** Real electrons drift at a fraction of a millimetre per second, and their speed depends on the wire's thickness as well as on the current.
- A circuit can hold 400 parts at most. Large circuits with very short time constants run slower than the time scale asks, and say so.

**Saving and loading.** **Save scene** downloads the circuit as `physics-sim-circuit.json`, with every part's place, values and name, the time scale and the component being graphed. **Load scene** opens it at t = 0: a file saved part-way through a run starts again, with each capacitor at its starting p.d.

Each tool reads only its own files. A file saved from another tool is refused with a message naming the tool to open it in, and a damaged file leaves the open scene as it was.

## Right-click menu

Right-click the **ground** (anywhere at or below y = 0 that is not an object) for the **Floor** menu: **Turn the floor off**, **Surface friction μ** and **Restitution e**, both 0–1 (defaults 0.5 and 0). The scene walls share the floor's material. Where two surfaces touch, the contact uses the lower friction and the higher restitution of the two, so a bouncy ball still bounces on a dead floor. The floor material is saved with the scene and reset by Clear scene.

Above the constants, the menu of a body or field has **Copy**, **Duplicate**, **Paste** (once something has been copied) and **Delete**; right-clicking one of several selected things acts on the whole selection. Right-clicking empty space offers **Paste here**, and **Turn the floor on** when it is off.

**Copy and paste.** Ctrl+C copies the selected bodies and fields, with every spring, rod, belt and pulley cable joining copied bodies (a link to something left behind is not copied). Ctrl+V pastes the copy centred on the pointer (snapped when snapping is on), or beside the last paste if the pointer is off the scene; Ctrl+D duplicates the selection just to its right without touching the copy. Pasted bodies keep their constants, locks and velocities, and a paste that would reach into the floor is lifted just clear of it. (⌘ instead of Ctrl on a Mac.)

**Placing several.** Hold Ctrl (⌘) while clicking with a ball, block, wedge, spring, rod, belt, pulley or field tool and the tool stays chosen for the next one; let go of Ctrl to return to Grab.

**Reflect.** The ↔ and ↕ buttons in the selected-item panel reflect the selection left to right or top to bottom, about the middle of it. Positions, angles, velocities and spins are mirrored, so the reflected scene moves as the mirror image of the original. A wedge becomes its mirror image (its width and height change places and it turns through 90°, which is the same triangle the other way round); a magnetic field changes sign, as a magnetic field does in a mirror. Reflection is refused, and nothing changes, for part of an assembly joined by rods or belts (select all of it), for a pulley, or if a body would end up in the floor.

Field labels stay upright however the field is turned.

For a ball, block or wedge, these constants are editable:

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

Material menus contain no position/velocity inputs or geometry controls. Geometry, locks and belt drive controls are separate from material constants. Field menus separately expose shape, dimensions, angle and strength. There are no temperature placeholders, equation editor, arbitrary custom body shapes, inspector or scene autosave. Scenes are saved and loaded only as files you choose (see Presets, save and load). Only website preferences (and, in developer mode, the developer settings and schemes) use localStorage; old scene saves are not loaded or deleted. This is a fresh, transient sandbox on every page load.

## Minitools

`/minitools/` lists small pages that each explain one equation, or one combination of equations ("Kepler's third law", "Block on a ramp"), grouped by topic, with a search box, a topic filter and a choice of single equations or combinations. Each tool has its own address, `/minitools/<id>`.

On a tool's page: the equation; **Solve for** buttons choosing the unknown (the equation is shown rearranged for it); one row per other quantity with a slider (logarithmic where the range spans powers of ten), a number field and its unit; **Working**, the rearranged equation with the numbers put in and the result to three significant figures; a picture and a graph of the unknown against any one quantity you choose; and, for combinations, where the equation comes from, one step at a time (**Next step**, **Show all**). Links lead to the full simulation and to the single-equation tools a combination is built from. **Reset to defaults** restores the starting values, and the address always holds the current values, so a link reproduces the set-up exactly.

Where one of the four simulations can show the behaviour, the page has a small live simulation built with that simulation's own engine, with **Play/Pause**, **Restart** and the sliders only. Beside the result it shows the value **measured in the simulation**. The two are not forced to agree: where they differ (finite plates are not infinite ones; a pendulum released from 10° is not quite a small swing), that is part of what the page shows. A simulation that cannot represent the chosen values says so instead of showing something else. Tools no simulation can show yet (waves, light, special relativity, induction and the like) show the graph and say which simulation they are waiting for.

The **All minitools** button at the top of a tool's page returns to the catalogue where you left it: the same search, filters and scroll position (remembered for the open tab only). Each page opens with a paragraph on what the equation is about and when it is used. The left column then runs: the equation, **Solve for**, **How to rearrange it, step by step** (closed until you open it), the rearranged equation, the sliders, **Working**, and **Where it comes from**, a derivation written for a student meeting the equation for the first time, shown one step at a time. The right column has the simulation, a picture and a graph. The simulation waits, paused, until you press **Play**; in circuit simulations the current dots then flow round the circuit as they do on the circuits page. Under the simulation, beside Play/Pause and Restart, are the same **velocity** and **net force** arrow buttons as in the sandbox (on to begin with; shown only where the simulation has such arrows). Net-force arrows are scaled so that the largest steady force in the scene is 56 px long (a net force that is only rounding error beside the forces acting counts as zero), and every arrow carries its value. Circuit simulations add an **electron flow** button (off to begin with) that shows the electrons drifting the other way instead of conventional current. Scenes about energy or momentum have a small bar chart at the top right (kinetic, gravitational, elastic and electric energy and the work done by fields; or each body's momentum and the total) that changes as the scene runs. When a distance is changed the bodies move on the screen; the view only zooms out once something would leave the view the page opened with. Each slider covers only the values for which the unknown has a value and the simulation can show the scene, worked out again whenever another value changes; the number field beside it takes any value, and the page then says why there is no answer or why the simulation cannot show it. Charges can be negative. Angles of 0°, 90° and 180° give exact sines and cosines, so a torque at 180° or a flux at 90° is 0, not 10⁻¹⁷. The picture follows the physics rather than the frame: a deflected charge that would hit a plate is drawn stopping there. The graph has numbered grid lines on both axes and a dashed line wherever the curve has a vertical asymptote (for example at the speed of light for time dilation).

Series and parallel resistors also give the general form for any number of resistors, written with Σ (sum) notation.

Every formula and range is a first version marked "not verified" until it has been reviewed against the course formula sheet.

Equations are typeset with KaTeX 0.16.22, vendored in `vendor/katex/` (no CDN, so they work offline and on school networks); only pages that show equations load it. An equation that cannot be typeset shows its source in red and is listed under the developer Checks.

## Developer options

For the site's author, not for students. Turn developer mode on with `?physium-dev` at the end of any address (for example `/sims/Mechanics?physium-dev`; `?physium-dev=0` turns it off). It is then remembered in this browser, and a **Developer options** switch appears at the foot of the Website section to turn it off again; nothing of it, not even the switch, shows to anyone who has not used the address. With it off, none of the following shows and every page uses the built-in look from `src/site/theme.js`; a developer scheme never reaches anyone else.

With it on, a **Developer** group appears at the bottom of the Website section of every page:

- **Theme tweaker**: a window that can be moved by its title bar (or the arrow keys when the bar has focus) and folded away. Tabs for **Colours** (the 38 base colours, grouped as in `theme.js`, then the few derived shades that follow from them, read-only; with a colour picker, a hex field, its description and the lowest contrast ratio of the text and background pairs it belongs to, marked when below 4.5:1; the Light/Dark switch chooses which theme's values are shown and shows the page in that theme), **Shape & surface** (corner radius of buttons, inputs, panels, cards and the canvas frame, border width and style, shadow, panel opacity and blur, button and toggle style, density, slider shape, focus ring, top bar style, page and canvas background patterns with their size and strength), **Fonts** (interface, headings and brand, numbers and readouts, canvas labels and code, each with font, size, weight and letter-spacing; five system font stacks and eight open fonts in `vendor/fonts/`), **Icons & canvas** (icon weight, icon size and an extra outline that thickens every icon; canvas line weight, vector and field-line weight, arrowhead size, grid line style) and **Custom CSS**. Everything applies live, to the CSS and to the canvas. **Search** filters the tokens; **Pick from page** then a click on the page lists the colour tokens of what was clicked.
- **Colours and style, separately**: the look of the site is chosen in two independent halves, so any colour scheme can be paired with any style. **Colours** is every colour, in light and dark (the tweaker's Colours tab). **Style** is everything else: fonts, sizes, corners, borders, shadows, backgrounds and patterns, icons, canvas line weights and custom CSS (the other tabs). Each has its own picker, in the Developer section and at the top of the tweaker, and its own **Save … as** and **Delete**; changing one never changes the other. A picker shows "(edited)" once you have changed its half since picking it. Undo and Redo, **Hold to compare** (the built-in look while held), **Reset both to default**, and **Export**, **Import** and **Copy as code** (the exact text to paste over `COLOURS` … `CUSTOM_CSS` in `src/site/theme.js` to make the pair the default, then run `npm run tokens`) work on the pair you are looking at. Everything is kept in this browser under `physium-schemes`; schemes saved before colours and style were separated become a colour scheme and a style of the same name.
- **Built-in colour schemes**: 29 ready-made colour schemes, each with a light and a dark version, in the Colours picker under *Built-in colour schemes* (hover over one for a short description): Ocean depths, Outback, Blueprint, Chalkboard, Jacaranda, Synthwave, Terminal, Solar, Arctic, Vampire, Coral reef, Sunset, Aurora, Sakura, Matcha, Coffee house, Mint chocolate, Lemonade, Bubblegum, Forest floor, Mars, Deep space, Lavender field, Sepia, Retro arcade, Volcanic, Monochrome, High contrast and Colour-blind safe. They set colours only, so they sit on top of whatever style is picked. Some change the physics colours too, always with velocity cool and force warm, + warm and − cool. Change one and save it under your own name to keep it; the built-ins themselves never change.
- **Icon weight**: Phosphor's thin, light, regular (the default), bold, fill and duotone.
- **Layout aids**: outline every element's box, an 8 px spacing grid, the window size and breakpoint in a corner, and a preview of the page at phone (390 px), tablet (768 px), laptop (1366 px) and projector (1024 px) widths.
- **Checks**: a performance overlay (frames per second, frame time, the page's own work per frame, and simulation steps per frame where the page knows them; the orbits page reports simulated seconds per frame instead), transitions slowed five times, reduced motion, long labels to find text overflow, minitool ids and verified flags, a sample toast and a sample error, the list of equations that failed to render, and **Save canvas PNG**, named after the page, theme and scheme.
- **Stored preferences**: show every Physium key stored in this browser as JSON, export it, import it, or clear it.
- **Component gallery** (`/dev/gallery`): every shared component in the light and the dark theme side by side, following the theme tweaker live.

What the developer options cannot do: a canvas pattern is drawn behind the canvas by CSS, so **Save canvas PNG** does not include it; preset thumbnails take new colours the next time the presets panel opens.

## Physics implementation

The app uses SI units at the boundary and a fixed 1/120-second physics step. Pointer dragging places the grabbed point directly at the mouse where constraints allow, retaining its original offset. Rods project the requested centre onto their permitted circles (or circle intersections for multiple rods); floor clearance and independent locks remain enforced. Alt-drag updates rod rest lengths. Recent pointer-driven movement determines release velocity, capped at 30 m/s and projected onto the rod's tangent. Holding still before release stops the throw. No mouse spring or tether is used.

Bodies are uniform 2D laminae with textbook moments of inertia about the centre of mass: a ball is a disc (`mr²/2`), a block is `m(w² + h²)/12`, and a right-triangular wedge is `m(w² + h²)/18`. A ball therefore rolls like a disc or solid cylinder, not a solid sphere: down a slope its acceleration is (2/3) g sin θ rather than the (5/7) g sin θ of a solid sphere. The ball's constants menu says so. Inertia is recalculated from the current mass and dimensions.

Contacts use Coulomb friction and Newton's restitution law, solved by sequential impulses in `src/contacts.js` (Matter.js still detects collisions and separates overlapping bodies). One coefficient `μ` serves as both the static and the kinetic value, and a pair uses the lower `μ` and the higher restitution of its two bodies. A body stays put until the applied force exceeds `μN`, slides with a friction force of exactly `μN`, and decelerates linearly to rest; a block holds on an incline while `tan θ < μ` and otherwise accelerates at `g(sin θ − μ cos θ)`. Restitution applies at every impact speed above about 2 cm/s, so slow elastic collisions stay elastic, while a body that is merely resting never bounces whatever its restitution. Balls are treated as true circles in contact, so they roll without loss and central collisions produce no spin.

Translation and rotation are independent degrees of freedom. A position lock sets inverse translational mass to zero and restores the pinned centre during solver phases, but keeps finite rotational inertia. A rotation lock sets rotational inertia to infinity while retaining translational inverse mass. Unlocking restores the finite values, including after changing mass. A completely immovable collision pair cannot be resolved, so its collision response is skipped; collisions with unpinned bodies still resolve. Rod constraints between two pinned centres are suspended until an endpoint is unlocked.

This is an educational rigid-body approximation. Discrete collisions can tunnel at extreme speeds, and spring stability depends on stiffness/mass. Rods hold their length exactly and lose no energy: a pendulum keeps its amplitude at any swing angle, with the exact large-angle period. Locks can conflict with arbitrarily placed constraints; they take priority. Position snapping is projected onto rod constraints before placement, including while paused. Pinning both ends of a rod at a new separation holds those centres until unlocked. Direct dragging can pass through other movable objects between pointer events; it is an editing interaction, not a swept collision solver. With screen walls disabled, objects can be thrown out of view; Clear scene starts fresh.

## Tests

```sh
npm run check
npm test
# Optional DOM interaction suite:
npm ci
npm run test:ui
```

Colours are design tokens defined once in `src/site/theme.js`; after changing one, run `npm run tokens` to regenerate `styles/tokens.css` (a test fails if it is out of date).

`tests/fieldlab.test.mjs` checks the fields tool against the textbook: inverse-square and 1/r laws, superposition and null points, E = −∇V and B = curl A, Gauss's and Ampère's laws by numerical integration, σ/ε₀ between plates, μ₀nI inside a solenoid, Coulomb's law, the force between parallel wires and BIℓ, field lines tangent to the field, equal flux between magnetic field lines, test charges (½at² in a uniform field, kinetic energy gained equal to qΔV, fall time between plates), and every number quoted in the presets. `tests/fieldlab-smoke.mjs` drives `sims/EMFields.html` through its controls and runs with `npm run test:ui`.

`tests/orbitlab.test.mjs` checks the orbits tool against the textbook: surface gravity and escape speed of each preset body, orbital elements recovered from a state vector, the change of orbit type with launch speed, low Earth orbit (7.67 km/s, 92.4 min, radius constant over 100 orbits), the geostationary and Moon's orbits, conservation of energy and angular momentum over 100 orbits at eccentricity 0.7 at the highest time warp, timed periods against `2π√(a³/GM)`, the escape speed (zero energy, no return) and just below it (return), `v∞` on a hyperbola, equal areas in equal times, the integrated path against the predicted conic, independence of frame length and time warp, Newton's cannon (landing point, time of flight from Kepler's equation and landing speed), a vertical launch, other central bodies, validation, and every number quoted in the presets. `tests/orbitlab-smoke.mjs` drives `sims/Orbits.html` through its controls and runs with `npm run test:ui`.

`tests/circuitlab.test.mjs` checks the circuits tool against the textbook: series and parallel resistors, a cell with internal resistance, two cells feeding a common resistor, a balanced and an unbalanced Wheatstone bridge, ideal meters changing nothing, power supplied equal to power dissipated, RC charging and discharging (initial current, 6.321 V at 1 s, 9.933 V at 5 s, 3.679 V), energy stored and dissipated (½CV² each), capacitors in series and in parallel, charge kept through a switch and conserved when capacitors are joined, several time constants, steps independent of the frame rate, a time-varying EMF, short circuits, conflicting ideal cells, open circuits and floating sections (no NaN in any of them), the grid (junctions, wires following, insertion into a wire), 400 random circuits, and every reading quoted in the presets. Steady values are held to 1 part in 10⁹ and time-dependent ones to 0.5%. It also checks inductors and AC against the textbook: RL growth and decay (`L/R`), inductors in series and in parallel, an interrupted inductor current and flux sharing, an LC oscillation at `1/2π√(LC)` with its energy constant, a resistor, capacitor and inductor alone on AC (`V/R`, `V·2πfC`, `V/2πfL`, and 0°, +90°, −90°), and a series RLC circuit at 50 Hz and at resonance (impedance, phase, the p.d. across each component, `I²R` and `VI cos φ`). `tests/circuitlab-smoke.mjs` drives `sims/Circuits.html` through its controls, in both views, and runs with `npm run test:ui`.

Belts and pulley cables share iterative position and velocity solving, so one connection no longer overwrites a wheel angle already solved by the other. Guided springs use signed extension to remain continuous when an endpoint crosses its anchor.

Numerical regression coverage also checks SHO period, guide motion, snapped rotation, local-axis resizing and inertia, open/crossed transmission ratios, passive conveyor reaction, driven conveyor transport, and Atwood acceleration with finite wheel inertia, tangent geometry, spring–Atwood oscillation, angled dragging, movable axles, explicit cable refitting, and infeasible pinned poses, coupled belt/multiple-pulley/spring assemblies, paused lock editing, modifier combinations, walls and viewport resizing.

The original regression coverage includes free fall, static floor, grab/throw velocity, pinned-object rotation, independent locks, lock/unlock after mass changes, pinned contacts, snapping, rod safety, springs and live constants. DOM checks exercise the actual creation/drag/menu/lock/snap controls. Visual browser verification was not available in the authoring environment; these checks do not claim exhaustive browser/device coverage.

`src/physics.js` owns bodies, global settings, locks, dragging, resizing and spring guides. `src/group-move.js` owns connected-assembly layout translation. `src/mechanisms.js` owns belts and conveyor contact; `src/pulley.js` owns tangent cable geometry and its coupled translational/rotational constraints. `src/fields.js` owns field regions, overlap sampling and Lorentz integration; `src/field-view.js` owns field rendering and editing gestures. `src/preferences.js` owns persistent website appearance settings. `src/app.js` owns keyboard/pointer input, body drawing and menus.

Field regressions verify signed qE/m acceleration, neutral and stationary magnetic cases, magnetic speed conservation, crossed-field drift, region boundaries and superposition, locked bodies, atomic validation, and snapped editing. DOM checks cover field creation/shape/strength/rotation/resize/delete, global field settings, gravity detent and keyboard escape from zero.

Additional tests cover independent gradient geometry and falloff, radial direction, pairwise charge momentum/polarity, softened overlaps, impulse units and locks, resizing through the centre, mixed field/body group moves, scene dimensions, tool options, camera-independent bounds and website preferences.

Wedge regression tests cover triangular hit geometry, independent pins, asymmetric resize clearance, inertia, frictionless acceleration along the incline and live friction changes. UI checks cover wedge creation/materials and every icon weight (in developer mode) without losing playback state or controls. The uploaded Hyprland resize reference confirms the fixed-direction behaviour already implemented in the preceding update.
