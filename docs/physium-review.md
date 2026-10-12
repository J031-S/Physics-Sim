# Physium review, 11 October 2026

A check of everything on `claude/physics-fixes` for numerical accuracy first,
then for what a student sees. What was verified, how, and what was changed.

## How it was checked

| Check | Method | Result |
| --- | --- | --- |
| Every minitool formula | 209 values (every unknown of all 75 tools) recomputed from the textbook relation in a separately written script, at the default values | 209 of 209 agree to 1 part in 10⁹ |
| Every rearrangement | Solve for one unknown, then feed the answer back to solve for each of the others, 200 random settings per tool | All return their inputs |
| Every line of generated algebra | 560 rearranging steps; each generated equation evaluated with the tool's own numbers | All true (now a test) |
| Every mini simulation | Run headlessly with the real engine through the same code as the page; measured value against formula at the defaults, then at 40 random settings each | See below |
| Every picture | All 75 drawn in a real browser and read against the physics (directions of forces, fields and currents; geometry) | One wrong (mass spectrometer) |
| Every page | All 75 minitool pages, the homepage, the catalogue and the four simulations loaded in a real browser | No script or typesetting errors |
| The four full simulations | Their analytic test suites (246 tests in all) | All pass |

Not run: the happy-dom suite (`npm run test:ui`), because its dependency could
not be downloaded in the review environment. Run it locally.

## Mini simulations against their formulas (defaults)

All 54 mini simulations agree with their formulas to better than 0.02%, except
three, each for a real physical reason and each said so on the page:

| Tool | Formula | Measured | Why |
| --- | --- | --- | --- |
| Field between plates | 500 V/m | 499.5 V/m (−0.10%) | Plates of finite width: the field at the centre is a little under V/d |
| Simple pendulum | 3.4746 s | 3.4762 s (+0.047%) | A 5° swing; the formula is for vanishingly small swings (theory: +0.048%) |
| Deflection between plates | 1.000 m | hit the plate | The old default sat exactly on the plate. Default p.d. changed from 4 V to 2 V (0.500 m, measured 0.500 m) |

Before this review eight tools were off by 0.1% to 3% at their defaults and
many more away from them; the causes were in how values were read, not in the
engines (below).

## What was wrong and is fixed

**Engines (physics)**

- A charge crossing the edge of a field region felt the field for up to a
  whole step too long or too short: exit speed up to 3.8% off √(2qEd/m),
  deflection up to 1% off. Now within 0.02% (`src/fields.js`, with tests).
- In the fields tool a background field above about 40 N/C lost its lines
  from part of the screen, and above 150 N/C from all of it
  (`src/fieldlab/model.js`, with tests).

**Mini simulations**

- Forces now come from field regions that can be seen, as asked, in every
  scene that needs one. None uses the scene-wide field settings.
- Positions were read half a step ahead of the velocity they were paired
  with, which made displacement 0.25% long. Read from the engine's
  `potentialPoint` instead.
- Values "as it passes" a point (speed after a distance, range, deflection)
  were taken at the first step beyond it; they are now taken between the two
  steps either side.
- Radius of a charge's circle was inferred from force and speed; it is now
  measured from the path itself (the circle through three points, or half
  the distance between entry and exit).
- Scenes the 1/120 s step cannot follow accurately are refused with a reason
  instead of shown wrongly. Measured error of circular motion in the sandbox:
  0.02% at 6 rad/s, 0.3% at 24 rad/s, 1.3% at 48 rad/s, 3% at 72 rad/s
  (it grows as the square). The limit is set at 20 rad/s.
- Engine refusals are put in plain words ("gravity in the sandbox goes up to
  50 m/s²") instead of "Invalid simulation setting: gravity".
- Slow scenes are played faster and brief ones slower, and the clock says so.
- The watched body leaves a dashed trail, so curved paths can be seen.
- Lock marks, an unrounded field label ("E 7.0710678118654755 N/C"), a
  "+1 C" label on balls with no field, and "5.00e+3 km" scale bars are gone.

**Formulas outside their range**

The formulas were right, but several gave a bare number where the physics
says something else. The page now says what happens, under the working:

- Block on a ramp with μ > tan θ: negative acceleration (a sliding block
  slows; a block at rest stays put).
- Photoelectric effect and stopping voltage below the threshold frequency:
  no electrons.
- Snell's law beyond the critical angle: total internal reflection.
- Collisions when the first ball never catches the second.
- Deflection larger than half the gap: it hits a plate.
- Power lines losing more than is sent.
- Velocity after a distance when the object stops or never gets there.
- Division by zero at 0° or 90° in the torque, work, flux and force tools.
- Accelerated charges above a tenth of the speed of light.
- Turns and harmonic numbers are now whole numbers.

**Defaults that disagreed with each other** (the stated value of one quantity
did not follow from the others, by 0.3% to 1.6%): banking angle, conical
pendulum period, mass-on-spring period, photoelectric kinetic energy, time
dilation, length contraction, Hooke's law extension.

**Pictures**

- Mass spectrometer: the ion arrived moving right and was drawn leaving
  straight up, and the detector was on the wrong side. Redrawn: it enters the
  field, turns through half a circle and comes back out a diameter away, as
  in the mini simulation.

**Explanations**

- Every one of the 75 tools now has "Where it comes from" (before, only the
  22 combinations did, in 2 to 5 terse steps). Each step makes one change
  and says why. 426 steps in all.
- Every unknown of every tool has "How to rearrange it, step by step" under
  the rearranged equation: 560 steps.

## Known limits left as they are

- **Sandbox-sized values.** The charged-particle tools (cyclotron, velocity
  selector, mass spectrometer, accelerating a charge, deflection, Millikan,
  force on a moving charge) use kilograms and coulombs so the sandbox can
  show them. Each now says so. Real values cannot be simulated in the
  sandbox.
- **Engine limits narrower than the sliders.** The fields tool holds charges
  up to 20 nC, background fields up to 1000 N/C and 1000 µT; circuits up to
  1000 V; the sandbox gravity up to 50 m/s². Outside these the page says the
  simulation cannot show the values and why; the formula still works.
- **No mini simulation** for 21 tools that wait for a waves, induction,
  modern-physics, statics, three-dimensional or slack-rope simulation.
- **Transformer picture** draws the same number of loops on both coils
  whatever the turns ratio.
- **Velocity selector picture** has the fields the opposite way up from its
  mini simulation. Both are correct physics.
- The known gaps of the mechanics sandbox listed in `CLAUDE.md` are unchanged.
