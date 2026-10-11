// The one page script for every minitool. minitools/<id>.html is a stub
// written by `npm run pages`; this reads the id from the address and builds
// the page from the tool's catalogue entry.
import { setupSite, setupSettingsPanel, pageUrl } from "../site/shell.js";
import { $, isDark, option } from "../site/dom.js";
import { pageById } from "../site/pages.js";
import { renderMath, renderAllMath } from "../site/math.js";
import { onSchemeChange } from "../site/dev-hooks.js";
import { toolById } from "./catalogue.js";
import { reviewBadges, toolUrl } from "./card.js";
import {
  fieldText,
  fillForm,
  numberTex,
  numberText,
  unitTex,
  workingNumber,
} from "./format.js";
import { visuals } from "./visuals/index.js";

const prefs = setupSite();
setupSettingsPanel();

const id = decodeURIComponent(
  window.location.pathname
    .replace(/\/+$/, "")
    .split("/")
    .pop()
    .replace(/\.html$/, ""),
);
const tool = toolById(id),
  main = $("minitool");

if (!tool) {
  main.innerHTML = `<div class="doc-main"><h1>No such minitool</h1><p>There is no minitool called <code></code>.</p><p><a href="./">See all the minitools</a></p></div>`;
  main.querySelector("code").textContent = id;
} else build();

function build() {
  document.title = `Physium · ${tool.title}`;
  const all = [...tool.variables, ...tool.constants],
    byKey = new Map(all.map((q) => [q.key, q])),
    symbol = (key) => byKey.get(key).latex;
  const defaults = () => ({
    unknown: tool.solveFor[0],
    values: Object.fromEntries(tool.variables.map((v) => [v.key, v.value])),
  });
  // The set-up: from the address if it names one, else the defaults.
  const state = defaults(),
    query = new URLSearchParams(window.location.search);
  if (tool.solveFor.includes(query.get("solve")))
    state.unknown = query.get("solve");
  for (const v of tool.variables) {
    const given = Number(query.get(v.key));
    if (query.has(v.key) && Number.isFinite(given))
      state.values[v.key] = Math.min(v.max, Math.max(v.min, given));
  }
  // Every quantity's value, the unknown worked out from the others.
  const values = () => {
    const out = { ...state.values };
    for (const c of tool.constants) out[c.key] = c.value;
    let result = NaN;
    try {
      result = tool.solve[state.unknown](out);
    } catch {}
    out[state.unknown] = result;
    return out;
  };

  main.innerHTML = `
    <div class="mt-page">
      <p class="mt-back"><a href="./">← All minitools</a></p>
      <div class="mt-head">
        <h1></h1>
        <p class="mt-topic"></p>
        <p class="mt-purpose"></p>
      </div>
      <div class="mt-columns">
        <section class="mt-left" aria-label="Equation and values">
          <div class="mt-equation" aria-label="The equation"></div>
          <div class="mt-solve">
            <span id="solve-label">Solve for</span>
            <div class="mt-solve-buttons" role="group" aria-labelledby="solve-label"></div>
          </div>
          <div class="mt-rearranged"></div>
          <div class="mt-rows"></div>
          <p class="mt-constants"></p>
          <section class="mt-working" aria-labelledby="working-title">
            <h2 id="working-title">Working</h2>
            <div class="mt-working-math" aria-live="polite"></div>
            <p class="mt-measured" aria-live="polite"></p>
          </section>
        </section>
        <section class="mt-right" aria-label="Simulation and pictures">
          <div class="mt-sim"></div>
          <canvas class="mt-visual" role="img"></canvas>
          <div class="mt-graph-box">
            <label class="select-row mt-plot">Plot against <select id="plot-against"></select></label>
            <canvas class="mt-graph" role="img"></canvas>
          </div>
        </section>
      </div>
      <section class="mt-derivation" aria-labelledby="derivation-title" hidden>
        <h2 id="derivation-title">Where it comes from</h2>
        <ol></ol>
        <div class="mt-row-buttons">
          <button type="button" class="mt-next">Next step</button>
          <button type="button" class="mt-all">Show all</button>
        </div>
      </section>
      <section class="mt-links" aria-label="Related pages"></section>
      <div class="mt-row-buttons">
        <button type="button" class="mt-reset">Reset to defaults</button>
        <span class="mt-share">The address keeps these values, so it can be shared.</span>
      </div>
    </div>`;
  const q = (s) => main.querySelector(s);
  q("h1").textContent = tool.title;
  q(".mt-topic").innerHTML =
    `<span></span> · <span></span> ${reviewBadges(tool)}`;
  q(".mt-topic span").textContent = tool.topic;
  q(".mt-topic span + span").textContent =
    tool.kind === "combined" ? "a combination of equations" : "one equation";
  q(".mt-purpose").textContent = tool.purpose;
  renderMath(q(".mt-equation"), tool.latex, { display: true });
  if (tool.constants.length)
    renderMath(
      q(".mt-constants"),
      tool.constants
        .map(
          (c) => `${c.latex} = ${numberTex(c.value, 4)}\\,${unitTex(c.unit)}`,
        )
        .join(",\\quad "),
    );

  // Solve for.
  const solveButtons = q(".mt-solve-buttons");
  for (const key of tool.solveFor) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.key = key;
    b.setAttribute("aria-label", `Solve for ${byKey.get(key).name}`);
    renderMath(b, symbol(key));
    b.addEventListener("click", () => {
      state.unknown = key;
      changed(true);
    });
    solveButtons.append(b);
  }

  // One row per known quantity.
  const rows = q(".mt-rows"),
    controls = new Map();
  for (const v of tool.variables) {
    const row = document.createElement("div");
    row.className = "prop-row mt-row";
    row.dataset.key = v.key;
    const sliderId = `slider-${v.key}`;
    row.innerHTML = `<label for="${sliderId}"><span class="mt-symbol"></span> <span class="mt-name"></span></label><input id="${sliderId}" type="range" min="0" max="1000" step="1" /><span class="prop-value"><input type="number" step="any" /><span class="unit"></span></span>`;
    renderMath(row.querySelector(".mt-symbol"), v.latex);
    row.querySelector(".mt-name").textContent = v.name;
    row.querySelector(".unit").textContent = v.unit;
    const slider = row.querySelector('input[type="range"]'),
      field = row.querySelector('input[type="number"]');
    field.setAttribute(
      "aria-label",
      `${v.name}${v.unit ? ` in ${v.unit}` : ""}`,
    );
    field.min = v.min;
    field.max = v.max;
    const log = v.scale === "log" && v.min > 0;
    const toSlider = (x) =>
      Math.round(
        1000 *
          (log
            ? Math.log(x / v.min) / Math.log(v.max / v.min)
            : (x - v.min) / (v.max - v.min)),
      );
    const fromSlider = (n) =>
      log
        ? Number((v.min * (v.max / v.min) ** (n / 1000)).toPrecision(3))
        : Number((v.min + ((v.max - v.min) * n) / 1000).toPrecision(4));
    slider.addEventListener("input", () => {
      state.values[v.key] = fromSlider(Number(slider.value));
      changed(false, slider);
    });
    field.addEventListener("change", () => {
      const x = Number(field.value);
      if (field.value.trim() === "" || !Number.isFinite(x)) {
        field.value = fieldText(state.values[v.key]);
        return;
      }
      state.values[v.key] = Math.min(v.max, Math.max(v.min, x));
      changed(false, field);
    });
    controls.set(v.key, { row, slider, field, toSlider });
    rows.append(row);
  }

  // Pictures: the tool's own (if any) and the graph.
  const plot = $("plot-against");
  const visualCanvas = q(".mt-visual"),
    graphCanvas = q(".mt-graph");
  visualCanvas.hidden = tool.visual === "graph";
  visualCanvas.setAttribute(
    "aria-label",
    `A picture of ${tool.title.toLowerCase()}`,
  );
  graphCanvas.setAttribute(
    "aria-label",
    "Graph of the unknown against the chosen quantity",
  );
  plot.addEventListener("change", drawPictures);

  // Derivation, one step at a time.
  if (tool.derivation.length) {
    const section = q(".mt-derivation"),
      list = section.querySelector("ol");
    section.hidden = false;
    for (const step of tool.derivation) {
      const item = document.createElement("li");
      item.innerHTML = `<p></p><div class="mt-step-math"></div>`;
      item.querySelector("p").textContent = step.say;
      renderMath(item.querySelector("div"), step.latex, { display: true });
      item.hidden = true;
      list.append(item);
    }
    let shown = 1;
    const show = () => {
      [...list.children].forEach((li, i) => (li.hidden = i >= shown));
      section.querySelector(".mt-next").disabled =
        shown >= list.children.length;
      section.querySelector(".mt-all").disabled = shown >= list.children.length;
    };
    section.querySelector(".mt-next").addEventListener("click", () => {
      shown++;
      show();
      list.children[shown - 1]?.querySelector("p").focus?.();
    });
    section.querySelector(".mt-all").addEventListener("click", () => {
      shown = list.children.length;
      show();
    });
    show();
  }

  // Links.
  const links = q(".mt-links"),
    related = tool.related && pageById(tool.related);
  if (related) {
    const a = document.createElement("a");
    a.className = "mt-open";
    a.href = pageUrl(related);
    a.textContent = `Open in the full simulation: ${related.title}`;
    links.append(a);
  }
  if (tool.uses.length) {
    const p = document.createElement("p");
    p.textContent = "Built from: ";
    tool.uses.forEach((use, i) => {
      const other = toolById(use);
      if (!other) return;
      const a = document.createElement("a");
      a.href = toolUrl(other);
      a.textContent = other.title;
      if (i) p.append(", ");
      p.append(a);
    });
    links.append(p);
  }
  q(".mt-reset").addEventListener("click", () => {
    Object.assign(state, defaults());
    changed(true);
  });

  // The mini simulation, or what it is waiting for.
  let sim = null,
    measured = null,
    simAlive = false;
  const simBox = q(".mt-sim");
  if (tool.sim)
    import("./minisim.js").then(({ createMiniSim }) =>
      createMiniSim(simBox, {
        tool,
        prefs,
        values,
        unknown: () => state.unknown,
        onMeasure: (m, alive) => {
          measured = m;
          simAlive = alive;
          showMeasured();
        },
      }).then((s) => (sim = s)),
    );
  else {
    simBox.innerHTML = `<p class="mt-wants"></p>`;
    simBox.querySelector("p").textContent = tool.wants
      ? `No mini simulation yet: this tool is waiting for a ${tool.wants} simulation on the site. The graph shows how the result changes.`
      : "No mini simulation for this tool.";
  }

  function showMeasured() {
    const el = q(".mt-measured"),
      v = byKey.get(state.unknown);
    if (!tool.sim) {
      el.textContent = "";
      return;
    }
    const watched =
      typeof tool.sim.watch === "function" || tool.sim.watch?.[state.unknown];
    let text;
    if (!simAlive) text = "Measured in the simulation: —";
    else if (!watched)
      text = `The simulation does not measure ${v.name.toLowerCase()} directly.`;
    else if (measured === null || measured === undefined)
      text = "Measured in the simulation: waiting…";
    else {
      const value = typeof measured === "object" ? measured.value : measured,
        note =
          typeof measured === "object" && measured.note
            ? ` (${measured.note})`
            : "";
      text = `Measured in the simulation: ${numberText(value)}${v.unit ? " " + v.unit : ""}${note}`;
    }
    if (el.textContent !== text) el.textContent = text;
  }

  // ---------------------------------------------------------------- updates

  let rebuildTimer = null,
    urlTimer = null;
  function changed(structure, source) {
    const all = values();
    // Buttons and rows.
    for (const b of solveButtons.children)
      b.setAttribute("aria-pressed", String(b.dataset.key === state.unknown));
    for (const [key, c] of controls) {
      c.row.hidden = key === state.unknown;
      const v = state.values[key];
      if (source !== c.slider) c.slider.value = c.toSlider(v);
      if (source !== c.field) c.field.value = fieldText(v);
    }
    // The equation rearranged for the unknown, and the working.
    const unknown = byKey.get(state.unknown),
      form = tool.forms[state.unknown];
    if (structure || !q(".mt-rearranged").dataset.for) {
      q(".mt-rearranged").dataset.for = state.unknown;
      renderMath(
        q(".mt-rearranged"),
        `${unknown.latex} = ${fillForm(form, symbol)}`,
        { display: true },
      );
      plot.replaceChildren(
        ...tool.variables
          .filter((v) => v.key !== state.unknown)
          .map((v) => option(v.name, v.key)),
      );
    }
    const result = all[state.unknown],
      substituted = fillForm(form, symbol, (key) =>
        workingNumber(all[key], byKey.get(key).unit),
      );
    renderMath(
      q(".mt-working-math"),
      Number.isFinite(result)
        ? `${unknown.latex} = ${substituted} = ${numberTex(result)}\\,${unitTex(unknown.unit)}`
        : `${unknown.latex} = ${substituted}\\quad\\text{(no solution for these values)}`,
      { display: true },
    );
    showMeasured();
    drawPictures();
    // The simulation is rebuilt for the new values, a little after the
    // last slider movement.
    clearTimeout(rebuildTimer);
    if (sim)
      rebuildTimer = setTimeout(() => sim.rebuild(), structure ? 0 : 120);
    // The address keeps the set-up.
    clearTimeout(urlTimer);
    urlTimer = setTimeout(() => {
      const params = new URLSearchParams({ solve: state.unknown });
      for (const v of tool.variables)
        if (v.key !== state.unknown)
          params.set(v.key, String(state.values[v.key]));
      window.history.replaceState(null, "", "?" + params);
    }, 250);
  }

  function fitCanvas(canvas) {
    const r = canvas.getBoundingClientRect(),
      dpr = window.devicePixelRatio || 1;
    if (!r.width) return null;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx?.setTransform) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    return { ctx, width: r.width, height: r.height };
  }
  function drawPictures() {
    const options = {
      tool,
      values: values(),
      unknown: state.unknown,
      xKey: plot.value,
      dark: isDark(),
    };
    for (const [canvas, draw] of [
      [graphCanvas, visuals.graph],
      [visualCanvas, visuals[tool.visual]],
    ]) {
      if (canvas.hidden || !draw) continue;
      const fit = fitCanvas(canvas);
      if (fit) draw(fit.ctx, { ...options, ...fit });
    }
  }
  window.addEventListener("resize", drawPictures);
  onSchemeChange(drawPictures);
  new MutationObserver(drawPictures).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  changed(true);
  renderAllMath(main);
}
