// Developer options: for the site's author, not students. Developer mode is
// turned on by ?dev in the address or by the switch at the foot of the
// Website section, and is remembered. With it off, nothing here shows and
// the site uses the theme.js defaults; with it on, the Developer group
// appears above the switch, the current developer scheme is applied, and the
// theme tweaker (tweaker.js, loaded when first opened) can edit it.
import { $, option, showToast } from "./dom.js";
import { colourValue, setOverrides, value } from "./theme.js";
import { checkScheme, emptyScheme, isDefault } from "./scheme.js";
import { PRESETS, presetByName } from "./scheme-presets.js";
import { fontStack, surfaceCss } from "./surface.js";
import { failedEquations, onFrame } from "./dev-hooks.js";
import { iconWeights } from "./icons.js";

const root = new URL("../../", import.meta.url);
export const DEV_KEY = "physium-developer";
export const SCHEMES_KEY = "physium-schemes";
const CSS_KEY = "physium-scheme-css";
const forget = (key) => {
  try {
    window.localStorage.removeItem(key);
  } catch {}
};

const read = (key, fallback) => {
  try {
    return JSON.parse(window.localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, data) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {}
};

// ---------------------------------------------------------------- state

let prefs = null,
  dev = { on: false, tools: {} },
  // The scheme being worked on, and the saved ones by name.
  store = { current: emptyScheme("Default"), saved: {} },
  history = { past: [], future: [] },
  comparing = false;

function loadStore() {
  const data = read(SCHEMES_KEY, {});
  try {
    store.current = data.current
      ? checkScheme(data.current)
      : emptyScheme("Default");
  } catch {
    store.current = emptyScheme("Default");
  }
  store.saved = {};
  for (const [name, scheme] of Object.entries(data.saved ?? {}))
    try {
      store.saved[name] = checkScheme(scheme);
    } catch {
      // A damaged saved scheme is dropped rather than breaking the page.
    }
}
const saveStore = () => write(SCHEMES_KEY, store);

export const developerMode = () => dev.on;
export const currentScheme = () => structuredClone(store.current);
export const savedSchemes = () => store.saved;

// ---------------------------------------------------------------- applying

const styleId = "physium-scheme";
function colourCss(scheme) {
  const block = (selector, colours) => {
    const entries = Object.entries(colours);
    if (!entries.length) return "";
    return `${selector} { ${entries.map(([k, v]) => `--${k}: ${v};`).join(" ")} }`;
  };
  return [
    block(':root:not([data-theme="dark"])', scheme.light),
    block(':root[data-theme="dark"]', scheme.dark),
  ].join("\n");
}

// Applies `scheme` to the page (CSS, canvas colours, icons) or, with null,
// returns everything to the theme.js defaults.
function applyToPage(scheme) {
  let style = document.getElementById(styleId);
  if (!scheme || isDefault(scheme)) {
    setOverrides();
    style?.remove();
    forget(CSS_KEY);
  } else {
    setOverrides(scheme);
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.append(style);
    }
    style.textContent = [
      colourCss(scheme),
      surfaceCss(value, {
        colours: (name) => ({
          light: colourValue(name, "light"),
          dark: colourValue(name, "dark"),
        }),
        fontRoot: new URL("vendor/fonts/", root).href,
      }),
      scheme.css,
    ].join("\n");
    // For src/site/boot.js, which puts it back before the next page is
    // first drawn.
    try {
      window.localStorage.setItem(CSS_KEY, style.textContent);
    } catch {}
    // Canvas text is drawn at once; ask for the canvas font so later frames
    // have it.
    if (value("font-canvas") !== "default")
      document.fonts?.load?.(`16px ${fontStack(value("font-canvas"))}`);
  }
  if (prefs) {
    prefs.iconWeight = scheme ? value("icon-weight") : "regular";
    prefs.refresh();
  }
  window.dispatchEvent(new window.Event("physium-scheme"));
}

// Changes the working scheme. `record` keeps the old one for Undo.
export function setScheme(next, { record = true } = {}) {
  const checked = checkScheme(next);
  if (record) {
    history.past.push(JSON.stringify(store.current));
    if (history.past.length > 200) history.past.shift();
    history.future = [];
  }
  store.current = checked;
  saveStore();
  if (!comparing) applyToPage(store.current);
  window.dispatchEvent(new window.Event("physium-scheme-edit"));
}
export function undo() {
  if (!history.past.length) return false;
  history.future.push(JSON.stringify(store.current));
  store.current = JSON.parse(history.past.pop());
  saveStore();
  applyToPage(store.current);
  window.dispatchEvent(new window.Event("physium-scheme-edit"));
  return true;
}
export function redo() {
  if (!history.future.length) return false;
  history.past.push(JSON.stringify(store.current));
  store.current = JSON.parse(history.future.pop());
  saveStore();
  applyToPage(store.current);
  window.dispatchEvent(new window.Event("physium-scheme-edit"));
  return true;
}
export const canUndo = () => history.past.length > 0;
export const canRedo = () => history.future.length > 0;
// While held: the built-in default, to compare against.
export function compare(on) {
  comparing = on;
  applyToPage(on ? null : store.current);
}
export function saveSchemeAs(name) {
  const clean = String(name).trim().slice(0, 60);
  if (!clean) throw new Error("Give the scheme a name.");
  store.saved[clean] = { ...structuredClone(store.current), name: clean };
  setScheme({ ...store.current, name: clean }, { record: false });
  saveStore();
  return clean;
}
export function deleteSaved(name) {
  delete store.saved[name];
  saveStore();
}
// A value from a scheme picker: "" for the default, "builtin:<name>" for a
// built-in scheme (loaded as a copy to work on), otherwise a saved one.
export const BUILTIN = "builtin:";
export function switchTo(name) {
  const scheme =
    name === ""
      ? emptyScheme("Default")
      : name.startsWith(BUILTIN)
        ? (presetByName(name.slice(BUILTIN.length)) ?? null)
        : (store.saved[name] ?? null);
  if (!scheme) throw new Error(`There is no scheme called "${name}".`);
  setScheme(structuredClone(scheme));
}

// ---------------------------------------------------------------- the switch

function turnOn(on) {
  dev.on = on;
  write(DEV_KEY, dev);
  if (on) enable();
  else disable();
}

function setupSwitch() {
  const section = $("website-settings");
  if (!section) return;
  const label = document.createElement("label");
  label.className = "setting-toggle dev-switch";
  label.innerHTML = `<input id="ui-developer" type="checkbox" /> Developer options`;
  section.append(label);
  const box = label.querySelector("input");
  box.checked = dev.on;
  box.addEventListener("change", () => turnOn(box.checked));
}

// ---------------------------------------------------------------- the group

const GROUP = `<summary>Developer</summary>
  <div class="dev-row">
    <button type="button" id="dev-tweaker">Theme tweaker</button>
    <a class="button-link dev-link" id="dev-gallery">Component gallery</a>
  </div>
  <label class="select-row"
    >Scheme
    <select id="dev-scheme"></select>
  </label>
  <label class="select-row"
    >Icon weight
    <select id="ui-icons"></select>
  </label>
  <fieldset class="dev-set">
    <legend>Layout aids</legend>
    <label class="setting-toggle"
      ><input type="checkbox" data-dev-tool="outlines" /> Outline every
      box</label
    >
    <label class="setting-toggle"
      ><input type="checkbox" data-dev-tool="spacing" /> Spacing grid
      (8&nbsp;px)</label
    >
    <label class="setting-toggle"
      ><input type="checkbox" data-dev-tool="size" /> Window size and
      breakpoint</label
    >
    <div class="dev-row" role="group" aria-label="Preview the page at a width">
      <button type="button" data-preview="390">Phone</button>
      <button type="button" data-preview="768">Tablet</button>
      <button type="button" data-preview="1366">Laptop</button>
      <button type="button" data-preview="1024">Projector</button>
    </div>
  </fieldset>
  <fieldset class="dev-set">
    <legend>Checks</legend>
    <label class="setting-toggle"
      ><input type="checkbox" data-dev-tool="performance" /> Performance
      overlay</label
    >
    <label class="setting-toggle"
      ><input type="checkbox" data-dev-tool="slow" /> Slow transitions
      ×5</label
    >
    <label class="setting-toggle"
      ><input type="checkbox" data-dev-tool="reduced" /> Reduced
      motion</label
    >
    <label class="setting-toggle"
      ><input type="checkbox" data-dev-tool="stress" /> Long labels (text
      stress test)</label
    >
    <label class="setting-toggle"
      ><input type="checkbox" data-dev-tool="review" /> Minitool ids and
      verified flags</label
    >
    <div class="dev-row">
      <button type="button" id="dev-toast">Sample toast</button>
      <button type="button" id="dev-error">Sample error</button>
      <button type="button" id="dev-screenshot">Save canvas PNG</button>
    </div>
    <p class="dev-note" id="dev-equations">No equation has failed to render.</p>
    <details class="dev-note" id="dev-waiting">
      <summary>Minitools waiting for a simulation</summary>
      <ul></ul>
    </details>
  </fieldset>
  <fieldset class="dev-set">
    <legend>Stored preferences</legend>
    <div class="dev-row">
      <button type="button" id="dev-prefs-show" aria-expanded="false">
        Show
      </button>
      <button type="button" id="dev-prefs-export">Export</button>
      <button type="button" id="dev-prefs-import">Import</button>
      <button type="button" id="dev-prefs-clear">Clear</button>
      <input type="file" id="dev-prefs-file" accept=".json,application/json" hidden />
    </div>
    <pre id="dev-prefs" class="dev-pre" hidden></pre>
  </fieldset>`;

function enable() {
  if (!document.getElementById("dev-styles")) {
    const link = document.createElement("link");
    link.id = "dev-styles";
    link.rel = "stylesheet";
    link.href = new URL("styles/developer.css", root).href;
    document.head.append(link);
  }
  document.documentElement.dataset.developer = "on";
  buildGroup();
  applyToPage(store.current);
  for (const [tool, on] of Object.entries(dev.tools)) setTool(tool, on);
}
function disable() {
  for (const tool of Object.keys(dev.tools)) setTool(tool, false, true);
  $("developer-settings")?.remove();
  document.querySelector(".dev-window")?.remove();
  document.getElementById("dev-styles")?.remove();
  delete document.documentElement.dataset.developer;
  applyToPage(null);
}

// The options of a scheme picker: the default, the built-in schemes and the
// saved ones, with the working scheme selected. Shared with the tweaker.
export function schemeOptions(select) {
  const group = (label, items) => {
    const g = document.createElement("optgroup");
    g.label = label;
    g.append(...items);
    return g;
  };
  const names = Object.keys(store.saved).sort();
  select.replaceChildren(
    option("Default (theme.js)", ""),
    group(
      "Built-in schemes",
      PRESETS.map((p) => option(p.name, BUILTIN + p.name)),
    ),
    ...(names.length
      ? [group("Your saved schemes", names.map((n) => option(n, n)))]
      : []),
  );
  // A built-in shows as selected only while it is unchanged.
  const preset = presetByName(store.current.name),
    same =
      preset &&
      JSON.stringify(checkScheme(preset)) === JSON.stringify(store.current);
  select.value = store.saved[store.current.name]
    ? store.current.name
    : same
      ? BUILTIN + preset.name
      : "";
  return !!store.saved[store.current.name] || same;
}

function fillSchemes() {
  const select = $("dev-scheme");
  if (!select) return;
  const known = schemeOptions(select);
  if (!known && !isDefault(store.current)) {
    const unsaved = option(`${store.current.name} (unsaved)`, "*");
    select.append(unsaved);
    select.value = "*";
  }
}

function buildGroup() {
  if ($("developer-settings")) return;
  const group = document.createElement("details");
  group.id = "developer-settings";
  group.className = "settings-section dev-group";
  group.open = true;
  group.innerHTML = GROUP;
  $("website-settings").querySelector(".dev-switch").before(group);

  $("dev-gallery").href = new URL("dev/gallery", root).href;
  const icons = $("ui-icons");
  icons.replaceChildren(
    ...iconWeights.map((n) => option(n[0].toUpperCase() + n.slice(1), n)),
  );
  icons.value = value("icon-weight");
  icons.addEventListener("change", () =>
    setScheme({
      ...store.current,
      values: { ...store.current.values, "icon-weight": icons.value },
    }),
  );
  fillSchemes();
  $("dev-scheme").addEventListener("change", (e) => {
    if (e.target.value === "*") return;
    switchTo(e.target.value);
  });
  window.addEventListener("physium-scheme-edit", () => {
    fillSchemes();
    if ($("ui-icons")) $("ui-icons").value = value("icon-weight");
  });
  $("dev-tweaker").addEventListener("click", openTweaker);

  for (const box of group.querySelectorAll("[data-dev-tool]")) {
    box.checked = !!dev.tools[box.dataset.devTool];
    box.addEventListener("change", () => {
      dev.tools[box.dataset.devTool] = box.checked;
      write(DEV_KEY, dev);
      setTool(box.dataset.devTool, box.checked);
    });
  }
  for (const button of group.querySelectorAll("[data-preview]"))
    button.addEventListener("click", () =>
      previewAt(Number(button.dataset.preview), button.textContent.trim()),
    );
  $("dev-toast").addEventListener("click", () =>
    showToast("Sample toast: a message the page shows for a few seconds."),
  );
  $("dev-error").addEventListener("click", () => {
    const error = new Error(
      "Sample error: the mass must be a number from 0.01 to 1000 kg.",
    );
    showToast(error.message, 4000);
    console.error(error);
  });
  $("dev-screenshot").addEventListener("click", screenshot);
  setupPreferencesTools();
  listFailedEquations();
  listWaiting();
  window.addEventListener("physium-equation-error", listFailedEquations);
}

// Minitools with no mini simulation yet, by the simulation each waits for
// (the standing rule in CLAUDE.md: a new simulation supplies theirs).
async function listWaiting() {
  const { tools } = await import("../minitools/catalogue.js"),
    list = $("dev-waiting")?.querySelector("ul");
  if (!list) return;
  const waiting = tools.filter((t) => t.wants);
  $("dev-waiting").querySelector("summary").textContent =
    `Minitools waiting for a simulation (${waiting.length})`;
  for (const t of waiting) {
    const item = document.createElement("li");
    item.textContent = `${t.title} (${t.id}): ${t.wants}`;
    list.append(item);
  }
}

function listFailedEquations() {
  const el = $("dev-equations");
  if (!el) return;
  if (!failedEquations.length) {
    el.textContent = "No equation has failed to render.";
    return;
  }
  el.textContent = `${failedEquations.length} equation(s) failed to render: `;
  const list = document.createElement("ul");
  for (const f of failedEquations) {
    const item = document.createElement("li");
    item.textContent = `${f.source} — ${f.message}`;
    list.append(item);
  }
  el.append(list);
}

let tweaker = null;
async function openTweaker() {
  tweaker ??= await import("./tweaker.js");
  tweaker.openTweaker();
}

// ---------------------------------------------------------------- tools

const html = document.documentElement;
function overlay(id, className) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.className = className;
    el.setAttribute("aria-hidden", "true");
    document.body.append(el);
  }
  return el;
}

const BREAKPOINTS = [
  [700, "phone (≤ 700 px)"],
  [900, "narrow (≤ 900 px)"],
  [1150, "medium (≤ 1150 px)"],
  [Infinity, "wide"],
];
function showSize() {
  const el = document.getElementById("dev-size");
  if (!el) return;
  const w = window.innerWidth,
    h = window.innerHeight;
  el.textContent = `${w} × ${h} · ${BREAKPOINTS.find(([max]) => w <= max)[1]}`;
}

let perf = null;
function startPerformance() {
  const el = overlay("dev-performance", "dev-badge dev-performance");
  let frames = 0,
    since = performance.now(),
    work = 0,
    steps = 0,
    simulated = 0,
    reports = 0,
    stepsKnown = false;
  onFrame((info) => {
    reports++;
    work += info.ms ?? 0;
    if (info.steps !== undefined) {
      steps += info.steps;
      stepsKnown = true;
    }
    simulated += info.simulated ?? 0;
  });
  const tick = (now) => {
    if (!perf) return;
    frames++;
    if (now - since >= 500) {
      const fps = (frames * 1000) / (now - since),
        n = Math.max(1, reports);
      el.textContent = [
        `${fps.toFixed(0)} fps`,
        `${((now - since) / frames).toFixed(1)} ms/frame`,
        reports ? `${(work / n).toFixed(1)} ms work` : "no loop",
        stepsKnown
          ? `${(steps / n).toFixed(1)} steps/frame`
          : reports
            ? `${(simulated / n).toPrecision(3)} s/frame`
            : "",
      ]
        .filter(Boolean)
        .join(" · ");
      frames = reports = steps = simulated = work = 0;
      since = now;
    }
    perf = requestAnimationFrame(tick);
  };
  perf = requestAnimationFrame(tick);
}

// Long labels: every text in a label, button, summary or heading becomes a
// long string; switched off, the originals come back.
const stressed = new Map();
function stress(on) {
  if (!on) {
    for (const [node, text] of stressed) node.nodeValue = text;
    stressed.clear();
    return;
  }
  const scope = document.querySelectorAll(
    "label, button, summary, h1, h2, h3, legend, .prop-row > span, th, a",
  );
  for (const el of scope)
    for (const node of el.childNodes)
      if (node.nodeType === 3 && node.nodeValue.trim().length > 1) {
        stressed.set(node, node.nodeValue);
        node.nodeValue =
          " Considerably longer label text to find overflow " +
          node.nodeValue.trim() +
          " ";
      }
}

function slowTransitions(event) {
  for (const animation of event.target.getAnimations?.() ?? [])
    animation.playbackRate = 0.2;
}

function setTool(tool, on, quiet) {
  switch (tool) {
    case "outlines":
    case "spacing":
    case "reduced":
    case "review": {
      const key = "dev" + tool[0].toUpperCase() + tool.slice(1);
      if (on) html.dataset[key] = "on";
      else delete html.dataset[key];
      if (tool === "spacing") {
        if (on) overlay("dev-spacing", "dev-spacing");
        else document.getElementById("dev-spacing")?.remove();
      }
      break;
    }
    case "size":
      if (on) {
        overlay("dev-size", "dev-badge dev-size");
        window.addEventListener("resize", showSize);
        showSize();
      } else {
        window.removeEventListener("resize", showSize);
        document.getElementById("dev-size")?.remove();
      }
      break;
    case "performance":
      if (on && !perf) startPerformance();
      if (!on) {
        cancelAnimationFrame(perf);
        perf = null;
        onFrame(null);
        document.getElementById("dev-performance")?.remove();
      }
      break;
    case "slow":
      if (on) {
        document.addEventListener("transitionrun", slowTransitions, true);
        document.addEventListener("animationstart", slowTransitions, true);
      } else {
        document.removeEventListener("transitionrun", slowTransitions, true);
        document.removeEventListener("animationstart", slowTransitions, true);
      }
      break;
    case "stress":
      stress(on);
      break;
  }
  if (!quiet) window.dispatchEvent(new window.Event("resize"));
}

// The page at a chosen width, in a frame over the page.
function previewAt(width, name) {
  document.querySelector(".dev-preview")?.remove();
  const box = document.createElement("div");
  box.className = "dev-preview";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", `${name} preview, ${width} px wide`);
  box.innerHTML = `<div class="dev-preview-bar"><strong></strong><button type="button">Close preview</button></div><iframe></iframe>`;
  box.querySelector("strong").textContent = `${name} · ${width} px`;
  const frame = box.querySelector("iframe");
  frame.title = `${name} preview`;
  frame.style.width = width + "px";
  frame.src = window.location.href;
  const close = () => box.remove();
  box.querySelector("button").addEventListener("click", close);
  box.addEventListener("keydown", (e) => e.key === "Escape" && close());
  document.body.append(box);
  box.querySelector("button").focus();
}

// The page's scene canvas as a PNG named after the page, theme and scheme.
function screenshot() {
  const canvas =
    document.getElementById("canvas") ??
    [...document.querySelectorAll("main canvas")].sort(
      (a, b) => b.width * b.height - a.width * a.height,
    )[0];
  if (!canvas) {
    showToast("This page has no canvas to save.");
    return;
  }
  const slug = (s) =>
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const name = [
    "physium",
    slug(document.body.dataset.page || "page"),
    html.dataset.theme || "light",
    slug(store.current.name || "default"),
  ].join("-");
  canvas.toBlob((blob) => {
    if (blob) download(blob, name + ".png");
  });
}
export function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Stored preferences: every physium-* key in this browser.
function storedPreferences() {
  const out = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key.startsWith("physium") && key !== "physics-sim-ui") continue;
    try {
      out[key] = JSON.parse(window.localStorage.getItem(key));
    } catch {
      out[key] = window.localStorage.getItem(key);
    }
  }
  return out;
}
function setupPreferencesTools() {
  const pre = $("dev-prefs"),
    show = $("dev-prefs-show");
  const refresh = () =>
    (pre.textContent = JSON.stringify(storedPreferences(), null, 2));
  show.addEventListener("click", () => {
    pre.hidden = !pre.hidden;
    show.setAttribute("aria-expanded", String(!pre.hidden));
    refresh();
  });
  $("dev-prefs-export").addEventListener("click", () =>
    download(
      new Blob([JSON.stringify(storedPreferences(), null, 2)], {
        type: "application/json",
      }),
      "physium-preferences.json",
    ),
  );
  $("dev-prefs-import").addEventListener("click", () =>
    $("dev-prefs-file").click(),
  );
  $("dev-prefs-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== "object" || Array.isArray(data))
        throw new Error("This file is not a set of Physium preferences.");
      const keys = Object.keys(data).filter((k) => k.startsWith("physium"));
      if (!keys.length)
        throw new Error("This file is not a set of Physium preferences.");
      for (const key of keys)
        window.localStorage.setItem(key, JSON.stringify(data[key]));
      showToast("Preferences imported. Reload the page to use them.");
      refresh();
    } catch (error) {
      showToast(
        error instanceof SyntaxError
          ? "This file is not valid JSON."
          : error.message,
      );
    }
  });
  $("dev-prefs-clear").addEventListener("click", () => {
    if (
      !window.confirm(
        "Clear every Physium preference and developer scheme stored in this browser?",
      )
    )
      return;
    for (const key of Object.keys(storedPreferences()))
      window.localStorage.removeItem(key);
    showToast("Stored preferences cleared. Reload the page to start afresh.");
    refresh();
  });
}

// ---------------------------------------------------------------- setup

export function setupDeveloper(preferences) {
  prefs = preferences;
  dev = { on: false, tools: {}, ...read(DEV_KEY, {}) };
  const asked = new URLSearchParams(window.location.search).get("dev");
  if (asked !== null) {
    dev.on = asked !== "0" && asked !== "off";
    write(DEV_KEY, dev);
  }
  loadStore();
  setupSwitch();
  if (dev.on) enable();
  // Another tab (or the gallery's frames) changed the scheme.
  window.addEventListener("storage", (e) => {
    if (e.key !== SCHEMES_KEY || !dev.on) return;
    loadStore();
    applyToPage(store.current);
    window.dispatchEvent(new window.Event("physium-scheme-edit"));
  });
}
