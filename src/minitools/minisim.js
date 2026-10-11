// The mini simulation of a minitool: a small canvas showing one behaviour
// with the real engine, built by the tool's `sim.build(values, E)` through the
// engine's public API, stepped by the engine's own step/advance and drawn by
// the shared renderer of that tool (src/*/render.js). Only Play/Pause,
// Restart and the page's sliders; the view fits the scene by itself.
import { isDark } from "../site/dom.js";
import { color } from "../site/theme.js";
import { tidyNumber } from "../site/numbers.js";
import { styleCanvas } from "../site/canvas-style.js";
import { reportFrame } from "../site/dev-hooks.js";
import { renderIcons } from "../site/icons.js";
import { startRun } from "./runner.js";
import { explain } from "./sims.js";

const root = new URL("../../", import.meta.url);

// Matter.js (UMD) is needed by the sandbox only, so it is loaded only then.
function loadMatter() {
  if (globalThis.Matter) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL("vendor/matter.js", root).href;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Matter.js could not be loaded."));
    document.head.append(script);
  });
}

// Each engine: its model module, its renderer, and how to step and draw.
const ENGINES = {
  async sandbox() {
    await loadMatter();
    const [E, R] = await Promise.all([
      import("../physics.js"),
      import("../sandbox/render.js"),
    ]);
    return { E, R, ...sandboxDriver };
  },
  async orbitlab() {
    const [E, R] = await Promise.all([
      import("../orbitlab/model.js"),
      import("../orbitlab/render.js"),
    ]);
    return { E, R, ...orbitDriver };
  },
  async fieldlab() {
    const [E, R] = await Promise.all([
      import("../fieldlab/model.js"),
      import("../fieldlab/render.js"),
    ]);
    return { E, R, ...fieldDriver };
  },
  async circuitlab() {
    const [E, R] = await Promise.all([
      import("../circuitlab/model.js"),
      import("../circuitlab/render.js"),
    ]);
    return { E, R, ...circuitDriver };
  },
};

// ---------------------------------------------------------------- sandbox

// The middle one of a short list of numbers.
const median = (list) => [...list].sort((a, b) => a - b)[list.length >> 1];

const sandboxDriver = {
  still: false,
  // Which arrows this scene can show.
  arrows: () => ({ velocity: true, force: true }),
  renderer: (R, ctx, view) => R.createSceneRenderer(ctx, view),
  draw(model, renderer, view, size, prefs, R, E, ctx, shown) {
    // Net force arrows: the largest steady force seen so far in the scene is
    // drawn 56 px long and the others in proportion. "Steady" is the median
    // of the last few frames, so that the one-step force of an impact (which
    // is drawn, up to the renderer's longest arrow) does not shrink every
    // other arrow for the rest of the run.
    let largest = 0;
    for (const id of model.objects.keys()) {
      const f = model.netForce(id);
      largest = Math.max(largest, Math.hypot(f.x, f.y));
    }
    const recent = (model.tags.forceRecent ??= []);
    recent.push(largest);
    if (recent.length > 9) recent.shift();
    model.tags.forceRef = Math.max(model.tags.forceRef ?? 0, median(recent));
    const forceScale = model.tags.forceRef > 0 ? 56 / model.tags.forceRef : 4;
    // The region to show: the scene's own, grown to keep every body in view.
    // A strip below the floor holds its metre labels.
    const fit = (model.tags.fit ??= {
      ...model.tags.view,
      minY: Math.min(model.tags.view.minY, -0.5),
    });
    for (const id of model.objects.keys()) {
      const s = model.state(id);
      fit.minX = Math.min(fit.minX, s.x - 0.6);
      fit.maxX = Math.max(fit.maxX, s.x + 0.6);
      fit.maxY = Math.max(fit.maxY, s.y + 0.6);
    }
    const pad = 12,
      w = size.width - 2 * pad,
      h = size.height - 2 * pad;
    view.scale = Math.max(
      0.1,
      Math.min(400, w / (fit.maxX - fit.minX), h / (fit.maxY - fit.minY)),
    );
    view.x = pad + w / 2 - ((fit.minX + fit.maxX) / 2) * view.scale;
    view.y = pad + h / 2 + ((fit.minY + fit.maxY) / 2) * view.scale;
    view.width = size.width;
    view.height = size.height;
    renderer.drawScene(model, {
      dark: isDark(),
      width: size.width,
      height: size.height,
      grid: prefs.grid,
      locks: false,
      vectors: shown.velocity,
      forceVectors: shown.force,
      forceOf: (id) => model.netForce(id),
      forceScale,
      iconWeight: prefs.iconWeight,
      angleUnit: prefs.angleUnit,
    });
    // The path the watched body has taken, so that a curve can be seen
    // after the body has moved on. Drawing only: nothing is measured from it.
    const watched = model.tags.ball;
    if (watched !== undefined && model.objects.has(watched)) {
      const s = model.state(watched),
        trail = (model.tags.trail ??= []),
        last = trail[trail.length - 1];
      if (!last || Math.hypot(s.x - last[0], s.y - last[1]) * view.scale > 2)
        trail.push([s.x, s.y]);
      if (trail.length > 4000) trail.splice(0, trail.length - 4000);
      if (trail.length > 1) {
        ctx.save();
        ctx.strokeStyle = color("vector-velocity", isDark());
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        trail.forEach(([x, y], i) => {
          const at = renderer.screen({ x, y });
          if (i) ctx.lineTo(at.x, at.y);
          else ctx.moveTo(at.x, at.y);
        });
        ctx.stroke();
        ctx.restore();
      }
    }
  },
};

// ---------------------------------------------------------------- orbits

// Kilometres to three significant figures, written out in full (5000, not
// 5.00e+3).
const km = (m) => tidyNumber(Number((m / 1e3).toPrecision(3)), 3);
const orbitFormat = {
  joined: (pair) => (pair[1] ? pair[0] + " " + pair[1] : pair[0]),
  distance: (m) => [km(m), "km"],
  prefixed: (value, unit) => [value.toPrecision(3), unit],
  speedText: (v) => [km(v), "km/s"],
  angleText: (a) => ((a * 180) / Math.PI).toFixed(0) + "°",
};
const orbitDriver = {
  still: false,
  arrows: () => ({ velocity: true, force: true }),
  renderer: (R, ctx, view) => R.createOrbitRenderer(ctx, view),
  draw(model, renderer, view, size, prefs, R, E, ctx, shown) {
    const aim = model.tags.aim,
      p = model.preview(aim),
      preview = {
        ...p,
        hit: E.predictImpact(p.elements),
        path: E.orbitPath(p.elements, {
          maxRadius: model.rangeFactor * aim.radius,
        }),
      };
    let extent = (model.tags.extent ??= Math.max(
      aim.radius * 1.25,
      p.elements.bound ? p.elements.apoapsis * 1.1 : aim.radius * 3,
    ));
    for (const s of model.list())
      extent = Math.max(extent, Math.hypot(s.x, s.y) * 1.1);
    model.tags.extent = extent;
    view.scale = Math.min(size.width, size.height) / (2 * extent);
    view.x = size.width / 2;
    view.y = size.height / 2;
    view.width = size.width;
    view.height = size.height;
    const paths = new Map(
      model.list().map((s) => [
        s.id,
        E.orbitPath(s.elements, {
          maxRadius: model.rangeFactor * aim.radius,
        }),
      ]),
    );
    renderer.drawScene(model, {
      colours: R.orbitPalette(isDark()),
      grid: prefs.grid,
      show: {
        velocity: shown.velocity,
        force: shown.force,
        prediction: true,
        trails: true,
        areas: false,
        labels: false,
      },
      selected: model.tags.satellite,
      aim,
      preview,
      paths,
      area: { left: 0, right: size.width, top: 0, bottom: size.height },
      format: orbitFormat,
    });
  },
};

// ---------------------------------------------------------------- fields

const fieldDriver = {
  // Nothing moves: the sources are fixed.
  still: true,
  // Nothing has a velocity; forces only where the scene has a test charge.
  arrows: (model) => ({ velocity: false, force: !!model.tags.forces }),
  renderer: (R, ctx, view) => R.createFieldRenderer(ctx, view),
  draw(model, renderer, view, size, prefs, R, E, ctx, shown) {
    const half = model.tags.view,
      state = {
        mode: model.tags.mode,
        density: model.tags.density ?? 1,
        selected: { electric: null, magnetic: null },
        show: {
          lines: true,
          arrows: false,
          equipotentials: false,
          forces: !!model.tags.forces && shown.force,
          labels: model.tags.labels !== false,
        },
      };
    view.scale = Math.min(size.width, size.height) / (2 * half);
    view.x = size.width / 2;
    view.y = size.height / 2;
    view.width = size.width;
    view.height = size.height;
    const dark = isDark(),
      key = [size.width, size.height, dark].join();
    // Field lines are worked out once per scene, size and theme.
    if (model.tags.computedFor !== key) {
      model.tags.computed = renderer.compute(model, state, { dark });
      model.tags.computedFor = key;
    }
    renderer.drawScene(model, state, {
      computed: model.tags.computed,
      grid: prefs.grid,
      dark,
    });
    // The point where a value is read.
    const probe = model.tags.probe;
    if (probe) {
      const [x, y] = renderer.screen(probe.x, probe.y);
      ctx.strokeStyle = R.fieldPalette(dark).ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.moveTo(x - 9, y);
      ctx.lineTo(x + 9, y);
      ctx.moveTo(x, y - 9);
      ctx.lineTo(x, y + 9);
      ctx.stroke();
    }
  },
};

// ---------------------------------------------------------------- circuits

const circuitDriver = {
  still: false,
  // A circuit has no velocity or force arrows.
  arrows: () => ({ velocity: false, force: false }),
  renderer: (R, ctx, view) => R.createCircuitRenderer(ctx, view),
  draw(model, renderer, view, size, prefs, R) {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const item of model.list())
      for (const t of model.terminals(item.id)) {
        minX = Math.min(minX, t.x);
        maxX = Math.max(maxX, t.x);
        minY = Math.min(minY, t.y);
        maxY = Math.max(maxY, t.y);
      }
    view.scale = Math.min(
      44,
      size.width / (maxX - minX + 3),
      size.height / (maxY - minY + 3),
    );
    view.x = size.width / 2 - ((minX + maxX) / 2) * view.scale;
    view.y = size.height / 2 + ((minY + maxY) / 2) * view.scale;
    view.width = size.width;
    view.height = size.height;
    renderer.drawScene(model, {
      colours: R.circuitPalette(isDark()),
      solution: model.solve(),
      grid: prefs.grid,
      selected: null,
      labels: view.scale >= 24,
      potential: false,
      ac: false,
      current: true,
      electrons: false,
      phase: (model.tags.phase ??= new Map()),
    });
  },
};

// ---------------------------------------------------------------- host

// `box` is the element to fill. `options`: tool, prefs, values() (all values
// with the unknown solved), unknown(), onMeasure(measured) each frame.
export async function createMiniSim(box, options) {
  const { tool, prefs } = options,
    sim = tool.sim;
  box.innerHTML = `<div class="mt-sim-stage"><canvas class="mt-sim-canvas" role="img"></canvas><p class="mt-sim-message" hidden></p></div>
    <div class="mt-sim-controls">
      <button type="button" class="mt-play" aria-pressed="false">Pause</button>
      <button type="button" class="mt-restart">Restart</button>
      <label class="icon-toggle mt-show-velocity" title="Velocity vectors"
        ><input type="checkbox" checked /><span
          data-icon="velocity"
          data-icon-label="Velocity vectors"
          data-icon-only="true"
        ></span></label
      ><label class="icon-toggle mt-show-force" title="Net force vectors"
        ><input type="checkbox" checked /><span
          data-icon="force"
          data-icon-label="Net force vectors"
          data-icon-only="true"
        ></span></label>
      <span class="mt-sim-time" aria-live="off"></span>
    </div>
    <p class="mt-sim-caption"></p>`;
  const canvas = box.querySelector("canvas"),
    message = box.querySelector(".mt-sim-message"),
    play = box.querySelector(".mt-play"),
    clock = box.querySelector(".mt-sim-time"),
    toggles = {
      velocity: box.querySelector(".mt-show-velocity"),
      force: box.querySelector(".mt-show-force"),
    };
  renderIcons(prefs.iconWeight);
  canvas.setAttribute("aria-label", `Simulation: ${sim.caption}`);
  box.querySelector(".mt-sim-caption").textContent = sim.caption;
  const ctx = styleCanvas(canvas.getContext("2d"));
  const driver = await ENGINES[sim.engine]();
  const view = { scale: 1, x: 0, y: 0, width: 0, height: 0 },
    renderer = driver.renderer(driver.R, ctx, view);
  let run = null,
    running = !driver.still;

  function setRunning(on) {
    running = on && !driver.still;
    play.textContent = running ? "Pause" : "Play";
    play.setAttribute("aria-pressed", String(!running));
  }
  // The scene is built, stepped and measured by runner.js, the same code
  // the tests run.
  function build() {
    run?.dispose();
    run = null;
    try {
      run = startRun(sim, driver.E, options.values, options.unknown);
      message.hidden = true;
      canvas.hidden = false;
      // Only the arrows this scene can show have a button.
      const can = driver.arrows(run.model);
      for (const key of ["velocity", "force"]) toggles[key].hidden = !can[key];
    } catch (error) {
      message.hidden = false;
      canvas.hidden = true;
      message.textContent = `The simulation cannot show these values: ${explain(error)} The equation above still holds.`;
      clock.textContent = "";
    }
    setRunning(true);
    options.onMeasure(run?.measured ?? null, !!run);
  }

  play.disabled = driver.still;
  if (driver.still) play.title = "Nothing moves in this scene";
  play.addEventListener("click", () => {
    if (run?.stopped) build();
    else setRunning(!running);
  });
  box.querySelector(".mt-restart").addEventListener("click", () => build());

  function frame(now) {
    if (!box.isConnected) return;
    const elapsed = last ? Math.min((now - last) / 1000, 0.05) : 0,
      began = performance.now();
    last = now;
    if (run && running && !run.stopped && elapsed > 0) {
      run.advance(elapsed);
      if (run.stopped) {
        setRunning(false);
        play.textContent = "Play again";
      }
    }
    const r = canvas.getBoundingClientRect(),
      dpr = window.devicePixelRatio || 1;
    if (run && r.width > 0) {
      if (
        canvas.width !== Math.round(r.width * dpr) ||
        canvas.height !== Math.round(r.height * dpr)
      ) {
        canvas.width = Math.round(r.width * dpr);
        canvas.height = Math.round(r.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, r.width, r.height);
      try {
        driver.draw(
          run.model,
          renderer,
          view,
          { width: r.width, height: r.height },
          options.prefs,
          driver.R,
          driver.E,
          ctx,
          {
            velocity: toggles.velocity.querySelector("input").checked,
            force: toggles.force.querySelector("input").checked,
          },
        );
      } catch (error) {
        message.hidden = false;
        message.textContent = `The simulation could not be drawn: ${error.message}`;
      }
      if (!driver.still) {
        // Slow things are played faster than life and quick things slower;
        // the clock is the simulation's own.
        const rate = run.speed(),
          pace =
            Math.abs(rate - 1) < 0.05
              ? ""
              : rate > 1
                ? ` · played ${Number(rate.toPrecision(2))}× faster`
                : ` · played ${Number((1 / rate).toPrecision(2))}× slower`;
        clock.textContent = `t = ${formatTime(run.time())}${pace}`;
      }
    }
    options.onMeasure(run?.measured ?? null, !!run);
    reportFrame({ ms: performance.now() - began });
    requestAnimationFrame(frame);
  }
  let last = 0;
  build();
  requestAnimationFrame(frame);
  return { rebuild: build };
}

function formatTime(s) {
  if (s < 120) return s.toFixed(2) + " s";
  if (s < 7200) return (s / 60).toFixed(1) + " min";
  if (s < 172800) return (s / 3600).toFixed(2) + " h";
  return (s / 86400).toFixed(2) + " days";
}
