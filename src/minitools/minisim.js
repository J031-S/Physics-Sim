// The mini simulation of a minitool: a small canvas showing one behaviour
// with the real engine, built by the tool's `sim.build(values, E)` through the
// engine's public API, stepped by the engine's own step/advance and drawn by
// the shared renderer of that tool (src/*/render.js). Only Play/Pause,
// Restart and the page's sliders; the view fits the scene by itself.
import { isDark } from "../site/dom.js";
import { styleCanvas } from "../site/canvas-style.js";
import { reportFrame } from "../site/dev-hooks.js";

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

const sandboxDriver = {
  still: false,
  renderer: (R, ctx, view) => R.createSceneRenderer(ctx, view),
  // Fixed engine steps of 1/120 s, as many as real time asks for; `after`
  // runs after each one so that measurements and stops land on a step.
  advance(model, seconds, after) {
    const steps = Math.min(16, Math.round(seconds * 120));
    for (let i = 0; i < steps; i++) {
      model.step();
      if (after()) return;
    }
  },
  time: (model) => model.time,
  draw(model, renderer, view, size, prefs) {
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
      vectors: true,
      iconSet: prefs.iconSet,
      angleUnit: prefs.angleUnit,
    });
  },
};

// ---------------------------------------------------------------- orbits

const km = (m) => (m / 1e3).toPrecision(3);
const orbitFormat = {
  joined: (pair) => (pair[1] ? pair[0] + " " + pair[1] : pair[0]),
  distance: (m) => [km(m), "km"],
  prefixed: (value, unit) => [value.toPrecision(3), unit],
  speedText: (v) => [km(v), "km/s"],
  angleText: (a) => ((a * 180) / Math.PI).toFixed(0) + "°",
};
const orbitDriver = {
  still: false,
  renderer: (R, ctx, view) => R.createOrbitRenderer(ctx, view),
  advance(model, seconds, after, stopAt) {
    let dt = seconds * model.tags.warp;
    if (stopAt !== null) dt = Math.min(dt, stopAt - model.time);
    if (dt > 0) model.advance(dt);
    after();
  },
  time: (model) => model.time,
  draw(model, renderer, view, size, prefs, R, E) {
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
        velocity: true,
        force: false,
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
  renderer: (R, ctx, view) => R.createFieldRenderer(ctx, view),
  advance(model, seconds, after) {
    after();
  },
  time: () => 0,
  draw(model, renderer, view, size, prefs, R, E, ctx) {
    const half = model.tags.view,
      state = {
        mode: model.tags.mode,
        density: 1,
        selected: { electric: null, magnetic: null },
        show: {
          lines: true,
          arrows: false,
          equipotentials: false,
          forces: false,
          labels: true,
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
  renderer: (R, ctx, view) => R.createCircuitRenderer(ctx, view),
  advance(model, seconds, after, stopAt) {
    let dt = seconds;
    if (stopAt !== null) dt = Math.min(dt, stopAt - model.time);
    if (dt > 0) model.advance(dt);
    after();
  },
  time: (model) => model.time,
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
      <span class="mt-sim-time" aria-live="off"></span>
    </div>
    <p class="mt-sim-caption"></p>`;
  const canvas = box.querySelector("canvas"),
    message = box.querySelector(".mt-sim-message"),
    play = box.querySelector(".mt-play"),
    clock = box.querySelector(".mt-sim-time");
  canvas.setAttribute("aria-label", `Simulation: ${sim.caption}`);
  box.querySelector(".mt-sim-caption").textContent = sim.caption;
  const ctx = styleCanvas(canvas.getContext("2d"));
  const driver = await ENGINES[sim.engine]();
  const view = { scale: 1, x: 0, y: 0, width: 0, height: 0 },
    renderer = driver.renderer(driver.R, ctx, view);
  let model = null,
    running = !driver.still,
    stopped = false,
    last = 0,
    measured = null;

  const watchFor = (unknown) =>
    typeof sim.watch === "function" ? sim.watch : sim.watch?.[unknown];

  function measure() {
    const watch = watchFor(options.unknown());
    if (!model || !watch) return;
    try {
      const m = watch(model, options.unknown(), options.values());
      if (m !== null && m !== undefined) measured = m;
    } catch {
      // A measurement that cannot be taken yet stays blank.
    }
  }
  // Stop at the tool's duration or condition: the measurement is then of
  // that moment, and the scene stays on show.
  function done() {
    const v = options.values(),
      end = sim.duration ? sim.duration(v) : null;
    return (
      (end !== null && driver.time(model) >= end - 1e-9) ||
      !!sim.until?.(model, v)
    );
  }
  function setRunning(on) {
    running = on && !driver.still;
    play.textContent = running ? "Pause" : "Play";
    play.setAttribute("aria-pressed", String(!running));
  }
  function build() {
    model?.dispose?.();
    model = null;
    measured = null;
    stopped = false;
    try {
      model = sim.build(options.values(), driver.E);
      message.hidden = true;
      canvas.hidden = false;
    } catch (error) {
      message.hidden = false;
      canvas.hidden = true;
      message.textContent = `The simulation cannot show these values: ${error.message}`;
    }
    setRunning(true);
    measure();
    options.onMeasure(measured, !!model);
  }

  play.disabled = driver.still;
  if (driver.still) play.title = "Nothing moves in this scene";
  play.addEventListener("click", () => {
    if (stopped) build();
    else setRunning(!running);
  });
  box.querySelector(".mt-restart").addEventListener("click", () => build());

  function frame(now) {
    if (!box.isConnected) return;
    const elapsed = last ? Math.min((now - last) / 1000, 0.05) : 0,
      began = performance.now();
    last = now;
    if (model && running && !stopped && elapsed > 0) {
      const v = options.values(),
        stopAt = sim.duration ? sim.duration(v) : null;
      driver.advance(
        model,
        elapsed,
        () => {
          measure();
          if (done()) {
            stopped = true;
            setRunning(false);
            play.textContent = "Play again";
            return true;
          }
          return false;
        },
        stopAt,
      );
    }
    const r = canvas.getBoundingClientRect(),
      dpr = window.devicePixelRatio || 1;
    if (model && r.width > 0) {
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
          model,
          renderer,
          view,
          { width: r.width, height: r.height },
          options.prefs,
          driver.R,
          driver.E,
          ctx,
        );
      } catch (error) {
        message.hidden = false;
        message.textContent = `The simulation could not be drawn: ${error.message}`;
      }
      if (!driver.still)
        clock.textContent = `t = ${formatTime(driver.time(model))}`;
    }
    options.onMeasure(measured, !!model);
    reportFrame({ ms: performance.now() - began });
    requestAnimationFrame(frame);
  }
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
