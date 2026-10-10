# UI and feature tasks

Work list for the interface of Physics Sim. Read `CLAUDE.md` first: it covers how to run and test the project, the unit conventions, and the code style.

## Ground rules

- **The physics engine is finished for these tasks.** Everything below is interface work in `index.html`, `styles.css`, `src/app.js`, `src/field-view.js`, `src/preferences.js` and `src/icons.js`. Do not change `src/physics.js`, `src/contacts.js`, `src/fields.js`, `src/mechanisms.js` or `src/pulley.js`. If a task seems to need an engine change, stop and say what is missing.
- **Use the engine API** listed under "Engine API for UI features" in `CLAUDE.md`. Each task below names the calls it needs.
- **Keep it a no-build, no-dependency site.** No frameworks, no new packages.
- **Keep existing element ids** wherever a control survives, even if it moves. `tests/editor-smoke.mjs` finds controls by id; when a control genuinely changes, update that test in the same commit.
- **Match the existing look**: the CSS custom properties in `styles.css`, the three bundled icon sets (add any new icon to all three in `vendor/icons/sets.js`), light and dark themes, and the GUI-size scale. Every new control needs a visible label or an accessible name, and must be reachable by keyboard.
- **Verify by looking.** Run `npm start`, open the page, and try each change at a narrow window (about 900 px wide) and a wide one, in both themes. The DOM test cannot see pixels.
- After each task: `npm run check && npm test && npm run test:ui`, then update `README.md` and the in-app Keys panel if behaviour or controls changed.
- Do the tasks in order; later ones assume the layout from earlier ones. One commit per task.

## Layout tasks

### 1. Edit tools on a left-hand bar; object categories as drop-downs

The top toolbar currently shows every tool in four labelled groups.

- Move the **Edit** tools (Grab, Select, Impulse, Pan) to a vertical bar on the left edge of the canvas, icon-first with the label as tooltip and accessible name.
- Replace the **Bodies**, **Connections** and **Fields** groups with three compact toggle buttons. Clicking one opens a small drop-down listing that category's tools; choosing a tool closes it. The category button shows which of its tools is active.
- Keyboard shortcuts (`G`, `B`, `S`, `E`, …) keep working whether or not a drop-down is open.
- The tool-options strip (`#tool-settings`) must still sit clear of the new bars.

Done when: the canvas has visibly more room, every tool is reachable in at most two clicks, and all `[data-tool]` buttons still exist with their `aria-pressed` state.

### 2. Bottom-left view cluster

Rework `.camera-controls` into one compact cluster containing:

- zoom out, zoom level, zoom in, Fit scene (as now, smaller);
- **Velocity vectors** toggle, moved here from the top toolbar (keep id `vectors` and shortcut `V`);
- **Net force vectors** toggle (new, see task 9);
- **Snapping** toggle, mirroring the existing `Z` shortcut and the Settings checkbox (all three must stay in sync through `snapStatus()`).

Use icon toggles with tooltips rather than text labels so the cluster stays one row.

### 3. Compact right-click menu

In `openMenu()` each numeric property takes three lines: label, number input, slider, then help text.

- Put the label, the slider and the number input (with its unit) on **one row**.
- Move the help sentence to a tooltip on the label (and `aria-describedby`), not a visible line.
- Keep `data-constant` and `data-slider` attributes and the live-update behaviour.

Done when the ball menu fits without scrolling at 100% GUI size on a 768 px tall window.

### 4. Compact Settings panel

Apply the same one-row pattern to every numeric setting in `#settings-panel`, with help text as tooltips. Group the panel into collapsible sections (Simulation, Fields, Charge interactions, Scene, Website), with Simulation open by default. Keep the gravity slider's zero detent and its centre tick.

### 5. Compact selected-item panel

`#selection` (bottom right) stacks every control vertically.

- Show the name and dimensions on one header row with Delete as an icon button.
- Show Lock position / Lock rotation as two icon toggles side by side (keep ids `lock-position` and `lock-rotation`; they may stay checkboxes styled as toggles).
- Show the link-specific switches (spring angle lock, cable wrap, crossed belt, drive belt and its speed) only for the matching link type, as now, in a single row where they fit.

### 6. Panels close when the scene is clicked

A pointer press on the canvas closes any open panel: Settings, Keys, the presets menu (task 8) and the category drop-downs (task 1). The right-click menu already does this in the capture-phase `pointerdown` listener; extend that mechanism rather than adding a second one. The press that closes a panel should **not** also place an object or start a drag.

### 7. Lock indicators

Position lock is drawn on the canvas as a plain dot and rotation lock as the text `↻ ×` (see the `o.lockPosition` / `o.lockRotation` branches in `draw()`).

Replace both with small drawn glyphs in the site's own style: thin strokes in the existing green-grey palette, readable in both themes, and sized in screen pixels so they do not grow with zoom. Suggested: a pin for position, a small circular arrow with a bar for rotation, and a single padlock when both are on. Draw them with canvas paths so they match whichever icon set is active.

## Feature tasks

### 8. Presets, save and load

Add a **Presets** button beside **Clear scene**, plus **Save scene** and **Load scene**.

- `import { presets } from "./presets.js"`. Each entry has `id`, `group`, `title`, `description`, `expect` and `setup(sim)`.
- The Presets button opens a panel listing presets under their `group` headings, each showing the title, the description and the `expect` line ("What to look for").
- To load a preset: `const next = new Sandbox(); preset.setup(next);` then swap it in exactly as the Clear handler does (`sim.dispose(); sim = next;`), clear the selection, close menus, call `syncSettings()`, and fit the view to `sim.viewport`. Presets set their own bounds, so do not reset `view.width` in a way that overwrites them.
- **Save scene**: `JSON.stringify(sim.exportScene(), null, 2)` downloaded as `physics-sim-scene.json` through a Blob and a temporary link.
- **Load scene**: a hidden `<input type="file" accept="application/json">`; parse the text and call `Sandbox.fromScene(data)`. It throws an `Error` with a student-readable message for a bad file: show that with `toast()` and leave the current scene untouched.
- **Reset** (new button beside Pause): keep the `exportScene()` snapshot taken whenever a preset or file is loaded, and whenever the simulation goes from paused to running; Reset restores it with `Sandbox.fromScene()`.
- Loading starts paused, so students can read the description first.

### 9. Net force vectors

When the toggle from task 2 is on, draw one arrow per body from its centre along `sim.netForce(id)`.

- Use a colour clearly distinct from the velocity arrows and add a small legend naming both.
- Use a **linear** scale (a fixed number of pixels per newton, adjustable from the cluster), and label the selected body's arrow in newtons.
- A collision lasts a single 1/120 s step, so its force is a one-frame spike. Draw the average over the last 6 steps, and cap the drawn length (keeping the label truthful).
- A body at rest has zero net force, so it draws no arrow. That is correct: do not draw weight and normal force separately in this task.

While here, make the **velocity** arrows linear too. They currently use `Math.min(14, 130 / speed)`, which makes every body faster than about 9 m/s look identical.

### 10. Floor properties

Right-clicking the ground (anywhere at or below `y = 0` that is not an object) opens the constants menu titled "Floor" with **Surface friction μ** and **Restitution e**, both 0–1, read from `sim.floorMaterial` and written with `sim.updateFloor({ … })`. Add a note that the scene walls share the floor's material and that a contact uses the lower friction and the higher restitution of the two surfaces.

### 11. Readouts for the selected body

Add a compact, collapsible readout to the selected-item panel, updated every frame from `sim.state(id)`, `sim.measure(id)` and `sim.netForce(id)`:

position (m), velocity components and speed (m/s), acceleration = net force ÷ mass (m/s²), momentum (kg·m/s), kinetic energy and gravitational potential energy (J).

Below it, when nothing is selected or always in a corner, show scene totals from `sim.energy()` as a stacked bar: kinetic, gravitational, elastic, and the total as a number. Use three significant figures and fixed-width digits so the numbers do not jitter.

### 12. Graphs

A collapsible graph panel for the selected body with a choice of quantity against time: x, y, vx, vy, speed, kinetic energy, total scene energy.

- Sample once per rendered frame into a ring buffer of the last 20 s of **simulation** time (`sim.time`), so pausing freezes the graph.
- Draw on a small canvas with labelled axes, units and automatic vertical scaling; clear the buffer when the selection changes or a scene is loaded.
- No charting library.

### 13. Time controls

Beside Pause: **Step** (calls `sim.step()` once while paused; shortcut `.`) and a **speed** selector (1×, 0.5×, 0.25×, 0.1×) that scales `elapsed` in `frame()` before it is added to the accumulator. Show the current speed next to the clock when it is not 1×.

### 14. Small corrections

- The ball's constants menu should say that a ball is modelled as a uniform **disc** (rolling acceleration `(2/3) g sin θ`, not the `5/7` of a solid sphere).
- Update tool hints, the Keys panel and `README.md` for the lock behaviour that is already implemented: an object with both locks on ignores all dragging while running; paused, a plain drag moves it and Ctrl-drag rotates it. Show a toast ("Pause to move a locked object") when a running drag is refused. The Wedge hint still says "Pause + Shift-drag to move".

### 15. Electric energy in the readouts, energy bar and graphs

The engine now reports electric energy; nothing needs changing in the physics files.

- `sim.energy()` returns `electric` and `fieldWork` alongside `kinetic`, `gravitational`, `elastic` and `total` (which now includes `electric`). `sim.measure(id)` returns `electric` for one body.
- `electric` is potential energy in the global uniform field plus mutual Coulomb energy. It is often **negative** (opposite charges, or a charge downfield of the origin).
- Field **regions** have no potential energy. The work they have done on charges so far is `fieldWork`, also signed.
- Add an **Electric** segment to the stacked bar and an "Electric PE" row to the selected-body readout, using the existing negative-value styling.
- Under the total, show **"Supplied by field regions: … J"** whenever `fieldWork` is non-zero, and a second line **"Total − supplied: … J"**. That second number is the one that stays constant, which is what students should watch.
- Offer `electric` and `total − fieldWork` as graph quantities.
- Hide the electric rows when the scene has no charged body, so mechanics scenes stay uncluttered.

## Not in this list

These need engine work and will be handled separately; do not attempt them here: separate free-body arrows (weight, normal, friction, tension), a sphere/disc choice for balls, an "ideal" no-damping default, recovering bodies that leave the scene, conveyor grip, rod energy loss, mass-dependent air resistance, and slack pulley cables.
