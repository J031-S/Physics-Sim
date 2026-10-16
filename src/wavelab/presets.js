// Ready-made scenes for the three views of the waves, light & sound page,
// each with the textbook result it shows. Built through the models' public
// APIs; tests/wavelab-presets.test.mjs builds every one and checks the
// readings against the formulas named in `expect`.
import { speedOfSound } from "./sound.js";

const deg = Math.PI / 180;

// ---------------------------------------------------------------- rays

const rays = [
  {
    id: "block",
    title: "Refraction at a block",
    text: "A ray enters a glass block (n = 1.50) at 30° to the normal and leaves the far side.",
    expect: "inside the glass the ray is at sin⁻¹(sin 30° / 1.50) = 19.47° to the normal; it leaves parallel to how it came in, shifted sideways.",
    view: { x: 0, y: 0, width: 0.5 },
    build(lab) {
      lab.add("block", { x: 0, y: -0.05, width: 0.3, height: 0.1, material: "fixed", index: 1.5 });
      lab.add("ray", { x: -Math.tan(30 * deg) * 0.1, y: 0.1, angle: -60 * deg });
    },
    watch: "ray",
  },
  {
    id: "critical",
    title: "Critical angle",
    text: "Two rays inside glass (n = 1.50) meet its top face: one at 41°, one at 43°. The critical angle is sin⁻¹(1/1.50) = 41.81°.",
    expect: "the 41° ray leaves (at sin⁻¹(1.50 sin 41°) = 79.8° to the normal) with a faint reflection; the 43° ray is totally reflected, with nothing leaving.",
    view: { x: 0, y: -0.02, width: 0.4 },
    build(lab) {
      lab.add("block", { x: 0, y: -0.06, width: 0.36, height: 0.12, material: "fixed", index: 1.5 });
      lab.add("ray", { x: -0.12, y: -0.1, angle: 90 * deg - 41 * deg });
      lab.add("ray", { x: -0.08, y: -0.1, angle: 90 * deg - 43 * deg, wavelength: 620e-9 });
    },
    watch: "ray",
  },
  {
    id: "fibre",
    title: "Optical fibre",
    text: "Light enters the end of an acrylic rod and is trapped inside it by total internal reflection.",
    expect: "inside, each bounce meets the side at more than the critical angle sin⁻¹(1/1.492) = 42.1°, so nothing escapes through the sides; the light arrives at the screen.",
    view: { x: 0.45, y: 0, width: 1.1 },
    build(lab) {
      lab.add("block", { x: 0.45, y: 0, width: 0.8, height: 0.03, material: "acrylic" });
      lab.add("screen", { x: 0.9, y: 0, angle: Math.PI, length: 0.12 });
      lab.add("ray", { x: 0.04, y: 0.005, angle: 25 * deg });
      lab.add("ray", { x: 0.04, y: -0.008, angle: -12 * deg, wavelength: 620e-9 });
    },
    watch: "ray",
  },
  {
    id: "prism-deviation",
    title: "Prism at minimum deviation",
    text: "A 60° prism of n = 1.50, with the ray passing through it symmetrically.",
    expect: "the deviation is 2 sin⁻¹(1.50 sin 30°) − 60° = 37.18°, the least for any angle of incidence: turn the ray either way and it grows.",
    view: { x: 0, y: 0, width: 0.5 },
    build(lab) {
      lab.add("prism", { x: 0, y: 0, angle: 0, apex: 60 * deg, side: 0.12, material: "fixed", index: 1.5 });
      // Incidence sin⁻¹(0.75) = 48.59° on the left face.
      const i = Math.asin(0.75),
        H = 0.12 * Math.cos(30 * deg),
        mid = { x: -0.03, y: H / 6 },
        dir = -30 * deg + i;
      lab.add("ray", { x: mid.x - 0.2 * Math.cos(dir), y: mid.y - 0.2 * Math.sin(dir), angle: dir });
    },
    watch: "ray",
  },
  {
    id: "dispersion",
    title: "Prism and dispersion",
    text: "White light through a flint-glass prism. Flint's index is higher for violet (1.65 at 400 nm) than for red (1.613 at 700 nm), by Cauchy's equation.",
    expect: "violet is deviated most and red least, spreading the colours; the screen shows them in order.",
    view: { x: 0.08, y: -0.02, width: 0.6 },
    build(lab) {
      lab.add("prism", { x: 0, y: 0, angle: 0, apex: 60 * deg, side: 0.12, material: "flint" });
      lab.add("screen", { x: 0.28, y: -0.07, angle: 160 * deg, length: 0.2 });
      lab.add("ray", { x: -0.22, y: -0.06, angle: 20 * deg, wavelength: "white" });
    },
    watch: "ray",
  },
  {
    id: "converging",
    title: "Converging lens",
    text: "An object 0.300 m from an ideal thin lens of focal length 0.100 m. (The ideal lens obeys the lens equation exactly for every ray: an idealisation.)",
    expect: "1/v = 1/f − 1/u gives a real, inverted image 0.150 m beyond the lens, magnification −0.500.",
    view: { x: -0.05, y: 0, width: 0.65 },
    build(lab) {
      lab.add("thinLens", { x: 0, y: 0, angle: 0, f: 0.1, aperture: 0.1 });
      lab.add("object", { x: -0.3, y: 0, angle: 0, height: 0.02, spread: 18 * deg, count: 9 });
    },
    watch: "object",
  },
  {
    id: "diverging",
    title: "Diverging lens",
    text: "An object 0.300 m from an ideal thin lens of focal length −0.100 m.",
    expect: "1/v = 1/f − 1/u = −13.33 m⁻¹: a virtual, upright image 0.075 m from the lens on the object's side, magnification +0.250.",
    view: { x: -0.1, y: 0, width: 0.6 },
    build(lab) {
      lab.add("thinLens", { x: 0, y: 0, angle: 0, f: -0.1, aperture: 0.1 });
      lab.add("object", { x: -0.3, y: 0, angle: 0, height: 0.02, spread: 14 * deg, count: 9 });
    },
    watch: "object",
  },
  {
    id: "real-lens",
    title: "Real lens: spherical aberration",
    text: "A biconvex crown-glass lens (R₁ = 0.200 m, R₂ = −0.200 m, 12 mm thick) traced exactly: Snell's law at both curved faces, no small-angle approximation.",
    expect: "rays near the edge cross the axis closer to the lens than rays near the middle (spherical aberration); the paraxial focal length matches the thick-lens formula, 0.195 m (measured from the lens's principal plane, close to its centre).",
    view: { x: 0.08, y: 0, width: 0.55 },
    build(lab) {
      lab.add("lens", { x: 0, y: 0, angle: 0, R1: 0.2, R2: -0.2, thickness: 0.012, aperture: 0.09, material: "crown" });
      lab.add("beam", { x: -0.15, y: 0, angle: 0, width: 0.08, count: 15 });
    },
    watch: "beam",
  },
  {
    id: "concave",
    title: "Concave mirror",
    text: "An object 0.600 m in front of a concave mirror of radius 0.400 m (focal length 0.200 m).",
    expect: "1/v = 1/f − 1/u gives a real, inverted image 0.300 m in front of the mirror, magnification −0.500.",
    view: { x: -0.3, y: 0, width: 0.8 },
    build(lab) {
      lab.add("sphericalMirror", { x: 0, y: 0, angle: Math.PI, radius: 0.4, aperture: 0.16 });
      lab.add("object", { x: -0.6, y: 0, angle: 0, height: 0.03, spread: 12 * deg, count: 7 });
    },
    watch: "object",
  },
  {
    id: "convex",
    title: "Convex mirror",
    text: "An object 0.600 m in front of a convex mirror of radius 0.400 m (focal length −0.200 m).",
    expect: "a virtual, upright, smaller image 0.150 m behind the mirror (v = −0.150 m), magnification +0.250.",
    view: { x: -0.25, y: 0, width: 0.8 },
    build(lab) {
      lab.add("sphericalMirror", { x: 0, y: 0, angle: Math.PI, radius: -0.4, aperture: 0.16 });
      lab.add("object", { x: -0.6, y: 0, angle: 0, height: 0.03, spread: 12 * deg, count: 7 });
    },
    watch: "object",
  },
  {
    id: "magnifier",
    title: "Magnifying glass",
    text: "An object 0.050 m from an ideal lens of focal length 0.100 m: closer than its focal point.",
    expect: "the rays leave diverging; traced back they meet at a virtual, upright image 0.100 m from the lens on the object's side, magnification +2.00.",
    view: { x: -0.04, y: 0, width: 0.4 },
    build(lab) {
      lab.add("thinLens", { x: 0, y: 0, angle: 0, f: 0.1, aperture: 0.1 });
      lab.add("object", { x: -0.05, y: 0, angle: 0, height: 0.012, spread: 40 * deg, count: 9 });
    },
    watch: "object",
  },
  {
    id: "telescope",
    title: "Refracting telescope",
    text: "Objective f = 0.500 m and eyepiece f = 0.050 m, 0.550 m apart (their foci together). Light from a distant star arrives as a parallel beam at 1° to the axis.",
    expect: "the beam leaves parallel again at 10° on the other side: angular magnification −f_o/f_e = −10.0 (the image is inverted).",
    view: { x: 0.25, y: 0, width: 1.0 },
    build(lab) {
      lab.add("thinLens", { x: 0, y: 0, angle: 0, f: 0.5, aperture: 0.08 });
      lab.add("thinLens", { x: 0.55, y: 0, angle: 0, f: 0.05, aperture: 0.03 });
      lab.add("beam", { x: -0.2, y: 0.2 * Math.tan(1 * deg), angle: -1 * deg, width: 0.05, count: 7 });
    },
    watch: "beam",
  },
  {
    id: "microscope",
    title: "Compound microscope",
    text: "An objective of f = 20 mm makes a real image of an object 22 mm away; an eyepiece of f = 50 mm, placed one focal length beyond that image, sends it to infinity.",
    expect: "the objective's image is at 1/(1/0.020 − 1/0.022) = 0.220 m, magnified −10.0; with the eyepiece the angular magnification against the object seen at 25 cm is −10.0 × 0.25/0.050 = −50.",
    view: { x: 0.13, y: 0, width: 0.4 },
    build(lab) {
      lab.add("thinLens", { x: 0, y: 0, angle: 0, f: 0.02, aperture: 0.016 });
      lab.add("thinLens", { x: 0.27, y: 0, angle: 0, f: 0.05, aperture: 0.06 });
      lab.add("object", { x: -0.022, y: 0, angle: 0, height: 0.0015, spread: 30 * deg, count: 7 });
    },
    watch: "object",
  },
  {
    id: "aberration",
    title: "Spherical versus parabolic mirror",
    text: "The same parallel beam meets a spherical mirror (radius 0.600 m) above and a parabolic mirror (focal length 0.300 m) below.",
    expect: "the parabola sends every ray through its focus, 0.300 m from it; the sphere's outer rays cross the axis closer to the mirror than its focus R/2 = 0.300 m.",
    view: { x: -0.2, y: 0, width: 0.75 },
    build(lab) {
      lab.add("sphericalMirror", { x: 0, y: 0.2, angle: Math.PI, radius: 0.6, aperture: 0.34 });
      lab.add("parabolicMirror", { x: 0, y: -0.2, angle: Math.PI, f: 0.3, aperture: 0.34 });
      lab.add("beam", { x: -0.5, y: 0.2, angle: 0, width: 0.32, count: 13 });
      lab.add("beam", { x: -0.5, y: -0.2, angle: 0, width: 0.32, count: 13 });
    },
    watch: "beam",
  },
].map((p) => ({ ...p, mode: "rays" }));

// ---------------------------------------------------------------- waves

// The tank is set up in wavelengths of a 1 Hz wave at 1 m/s: 1 m is 1 λ.
const waves = [
  {
    id: "two-sources",
    title: "Two-source interference",
    text: "Two point sources 4λ apart, in phase. The screen on the right reads the intensity averaged over time.",
    expect: "bright fringes where the paths differ by a whole number of wavelengths (the marks on the screen graph, from r₁ − r₂ = mλ), dark between.",
    tank: { width: 30, height: 20, cell: 0.05 },
    build(lab) {
      lab.add("point", { x: -8, y: 2 });
      lab.add("point", { x: -8, y: -2 });
      lab.add("screen", { x: 10, y: 0, angle: Math.PI, length: 16 });
    },
    display: "intensity",
  },
  {
    id: "double-slit",
    title: "Double slit",
    text: "Plane waves meet a wall with two slits 1λ wide, 5λ apart (centre to centre).",
    expect: "bright fringes at d sin θ = mλ: the first at sin⁻¹(1/5) = 11.5° from the middle, about 3.5λ up the screen 17λ away (marked on the screen graph).",
    tank: { width: 32, height: 24, cell: 0.05 },
    build(lab) {
      lab.add("line", { x: -12, y: 0, angle: 0, length: 30 });
      lab.add("wall", { x: -9, y: 0, angle: 90 * deg, length: 30, thickness: 0.2, slits: 2, slitWidth: 1, separation: 5 });
      lab.add("screen", { x: 8, y: 0, angle: Math.PI, length: 20 });
    },
    display: "intensity",
  },
  {
    id: "single-slit",
    title: "Single slit",
    text: "Plane waves through one slit 3λ wide.",
    expect: "a broad central band with dark fringes at a sin θ = mλ: the first at sin⁻¹(1/3) = 19.5° (marked on the screen graph; far-field formula).",
    tank: { width: 32, height: 24, cell: 0.05 },
    build(lab) {
      lab.add("line", { x: -12, y: 0, angle: 0, length: 30 });
      lab.add("wall", { x: -9, y: 0, angle: 90 * deg, length: 30, thickness: 0.2, slits: 1, slitWidth: 3 });
      lab.add("screen", { x: 8, y: 0, angle: Math.PI, length: 20 });
    },
    display: "intensity",
  },
  {
    id: "gap",
    title: "Diffraction through a gap",
    text: "Plane waves through a gap 2λ wide. Select the wall and change the slit width to compare narrow and wide gaps.",
    expect: "a gap about a wavelength wide spreads the waves almost in semicircles; a gap many wavelengths wide lets a straight-edged beam through, spreading by about λ/a radians.",
    tank: { width: 30, height: 22, cell: 0.05 },
    build(lab) {
      lab.add("line", { x: -11, y: 0, angle: 0, length: 26 });
      lab.add("wall", { x: -7, y: 0, angle: 90 * deg, length: 26, thickness: 0.2, slits: 1, slitWidth: 2 });
    },
    display: "wave",
  },
  {
    id: "refraction",
    title: "Refraction at a boundary",
    text: "Plane waves at 30° to the normal pass into a region where the waves travel at half the speed (n = 2).",
    expect: "the wavelength halves and the waves turn towards the normal: sin θ₂ = sin 30° / 2, θ₂ = 14.5°.",
    tank: { width: 24, height: 16, cell: 0.025 },
    build(lab) {
      lab.add("medium", { shape: "rect", x: 20, y: 0, width: 40, height: 40, index: 2 });
      lab.add("line", { x: -5, y: -5 * Math.tan(30 * deg), angle: 30 * deg, length: 8 });
    },
    display: "wave",
  },
  {
    id: "tir",
    title: "Total internal reflection",
    text: "Waves in a slow region (n = 2) meet the boundary with a fast one at 45°, beyond the critical angle sin⁻¹(1/2) = 30°.",
    expect: "nothing travels on into the fast region (only a disturbance that dies away within about a wavelength); the waves reflect at 45°.",
    tank: { width: 24, height: 16, cell: 0.025 },
    build(lab) {
      lab.add("medium", { shape: "rect", x: -20, y: 0, width: 40, height: 40, index: 2 });
      lab.add("line", { x: -5, y: -5, angle: 45 * deg, length: 6 });
    },
    display: "wave",
  },
  {
    id: "standing",
    title: "Standing waves between two walls",
    text: "Waves from a line source bounce between two walls 6λ apart. Light damping (0.3 per second, labelled under Tank) lets the ringing settle.",
    expect: "nodes, where nothing moves, every λ/2 counted from each wall, with antinodes between; switch to the intensity view to see them as dark lines.",
    tank: { width: 10, height: 12, cell: 0.05, damping: 0.3 },
    build(lab) {
      lab.add("wall", { x: -3, y: 0, angle: 90 * deg, length: 12, thickness: 0.2 });
      lab.add("wall", { x: 3, y: 0, angle: 90 * deg, length: 12, thickness: 0.2 });
      lab.add("line", { x: 0.27, y: 0, angle: 0, length: 12 });
      lab.add("probe", { x: 1.5, y: 0 });
    },
    display: "intensity",
  },
  {
    id: "doppler",
    title: "Doppler effect",
    text: "A source moving to the right at half the wave speed. The probes ahead and behind record what they receive.",
    expect: "ahead the wavelength is λ(1 − v/c) = λ/2 and the probe hears 2f; behind it is 1.5λ and the probe hears 2f/3.",
    tank: { width: 32, height: 14, cell: 0.025 },
    build(lab) {
      lab.add("moving", { x: -10, y: 0, angle: 0, speed: 0.5 });
      lab.add("probe", { x: 4, y: 0 });
      lab.add("probe", { x: -13, y: 0 });
    },
    display: "wave",
  },
  {
    id: "shock",
    title: "Shock cone",
    text: "A source moving at twice the wave speed outruns its own waves. (On a finer grid: the waves crowd together without limit at the cone.)",
    expect: "the waves pile up on a cone of half-angle sin⁻¹(c/v) = 30°.",
    tank: { width: 40, height: 18, cell: 0.025 },
    build(lab) {
      lab.add("moving", { x: -18, y: 0, angle: 0, speed: 2 });
    },
    display: "wave",
  },
  {
    id: "lens-region",
    title: "A lens-shaped region focusing waves",
    text: "Plane waves pass through a lens-shaped region where they travel 1.5 times slower (n = 1.5). Its faces have radius 8λ.",
    expect: "the middle, where the region is thickest, is held back most, so the wavefronts curve and converge near the thin-lens focus f = R / 2(n − 1) = 8λ (the lens is thick, so a little nearer).",
    tank: { width: 28, height: 16, cell: 0.03 },
    build(lab) {
      lab.add("medium", { shape: "lens", x: -6, y: 0, angle: 0, radius: 8, thickness: 3, index: 1.5 });
      lab.add("line", { x: -11, y: 0, angle: 0, length: 16 });
    },
    display: "intensity",
  },
].map((p) => ({ ...p, mode: "waves" }));

// ---------------------------------------------------------------- sound

const sound = [
  {
    id: "guitar",
    title: "Guitar string",
    text: "A string 0.650 m long at a tension of 70.0 N, 1.00 g per metre, plucked a fifth of the way along.",
    expect: "v = √(T/μ) = 264.6 m/s and f₁ = v/2L = 203.5 Hz, with harmonics at whole multiples; plucked at L/5, the 5th, 10th, … are missing.",
    set: { mode: "string", string: { length: 0.65, tension: 70, density: 1e-3, kind: "pluck", position: 0.2, height: 0.004, harmonic: 0, damping: 0 } },
  },
  {
    id: "open-pipe",
    title: "Open pipe",
    text: "A pipe 0.500 m long, open at both ends, in air at 20 °C.",
    expect: `v = 331.3√(1 + 20/273.15) = 343.2 m/s; every harmonic, f = nv/2L: ${(speedOfSound(20) / 1).toFixed(1)} Hz, ${(2 * speedOfSound(20)).toFixed(1)} Hz, … (343 Hz at exactly 343 m/s).`,
    set: { mode: "pipe", pipe: { length: 0.5, ends: "open", temperature: 20, medium: "air", harmonic: 1, endCorrection: false } },
  },
  {
    id: "closed-pipe",
    title: "Closed pipe",
    text: "The same pipe closed at one end.",
    expect: `odd harmonics only, f = nv/4L: ${(speedOfSound(20) / 2).toFixed(1)} Hz, ${((3 * speedOfSound(20)) / 2).toFixed(1)} Hz, … (171.5 Hz at 343 m/s); a displacement node and pressure antinode at the closed end.`,
    set: { mode: "pipe", pipe: { length: 0.5, ends: "closed", temperature: 20, medium: "air", harmonic: 1, endCorrection: false } },
  },
  {
    id: "beats",
    title: "Beats between tuning forks",
    text: "Two tuning forks of 440 Hz and 444 Hz sounding together.",
    expect: "the loudness rises and falls |f₁ − f₂| = 4 times a second (one beat every 0.25 s).",
    set: { mode: "beats", beats: { f1: 440, f2: 444 } },
  },
  {
    id: "decibels",
    title: "Decibel ladder",
    text: "A point source of 10 mW. Drag the listener away and compare the level with the ladder from a whisper to a jet engine.",
    expect: "I = P/4πr² and β = 10 log₁₀(I/10⁻¹² W/m²): 89.0 dB at 1 m; twice as far is 6.02 dB quieter, ten times as far 20.0 dB quieter.",
    set: { mode: "level", level: { power: 0.01, distance: 1 } },
  },
  {
    id: "approach",
    title: "Approaching and receding source",
    text: "A 500 Hz source moving at 30 m/s straight towards, then away from, a listener, in air at 19.6 °C, where sound travels at 343.0 m/s.",
    expect: "f′ = f v/(v − v_s) = 547.9 Hz while it approaches and f v/(v + v_s) = 459.8 Hz once it has passed.",
    set: { mode: "doppler", doppler: { frequency: 500, medium: "air", temperature: 273.15 * ((343 / 331.3) ** 2 - 1), sourceSpeed: 30, observerSpeed: 0, distance: 0.1, layout: "line" } },
  },
  {
    id: "ambulance",
    title: "Ambulance passing",
    text: "A 700 Hz siren on an ambulance at 25 m/s passing 10 m from the listener, in air at 20 °C.",
    expect: "the pitch falls from 700 × 343.2/(343.2 − 25) = 755.0 Hz to 700 × 343.2/(343.2 + 25) = 652.5 Hz, fastest as it passes, and the level peaks then too.",
    set: { mode: "doppler", doppler: { frequency: 700, medium: "air", temperature: 20, sourceSpeed: 25, observerSpeed: 0, distance: 10, layout: "pass" } },
  },
].map((p) => ({ ...p, mode: "sound" }));

export const presets = [...rays, ...waves, ...sound];
