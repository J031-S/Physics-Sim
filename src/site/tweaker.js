// The theme tweaker: a movable, collapsible window for building a developer
// scheme. Every token from theme.js, grouped as there, with live changes to
// the page's CSS and canvases; schemes saved, switched, duplicated, deleted,
// exported, imported and copied as theme.js code; undo, redo, and a
// hold-to-compare button. Loaded by developer.js when first opened.
import { $, option, showToast } from "./dom.js";
import {
  COLOURS,
  CHOICES,
  FONTS,
  GROUPS,
  PAIRS,
  SIZES,
  colourValue,
} from "./theme.js";
import { checkScheme, emptyScheme, optionsOf, themeCode } from "./scheme.js";
import {
  canRedo,
  canUndo,
  compare,
  currentScheme,
  deleteSaved,
  download,
  redo,
  saveSchemeAs,
  savedSchemes,
  setScheme,
  switchTo,
  undo,
} from "./developer.js";

const TABS = [
  ["colours", "Colours"],
  ["shape", "Shape & surface"],
  ["fonts", "Fonts"],
  ["canvas", "Icons & canvas"],
  ["css", "Custom CSS"],
];
const TAB_GROUPS = {
  shape: ["Shape", "Surface", "Patterns"],
  fonts: ["Fonts"],
  canvas: ["Icons", "Canvas"],
};

let win = null,
  queued = false,
  mode = "light",
  tab = "colours",
  query = "",
  picked = null; // token names found by "pick from page"

// ---------------------------------------------------------------- colour maths

// "#rgb", "#rrggbb" or "#rrggbbaa" as [r, g, b, a] (0–255, a 0–1).
function rgba(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h.replace(/./g, (d) => d + d);
  const n = (i) => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
}
const over = (top, under) =>
  top.slice(0, 3).map((v, i) => v * top[3] + under[i] * (1 - top[3]));
function luminance([r, g, b]) {
  const lin = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
// WCAG contrast ratio of text colour `a` on background `b` (both tokens),
// with translucent colours laid over the page background.
export function contrast(a, b, m) {
  const page = rgba(colourValue("canvas-bg", m)).slice(0, 3),
    back = over(rgba(colourValue(b, m)), page),
    text = over(rgba(colourValue(a, m)), back),
    [hi, lo] = [luminance(text), luminance(back)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const six = (hex) => {
  const [r, g, b] = rgba(hex);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
};
const alphaOf = (hex) => (hex.length === 9 ? hex.slice(7) : "");

// ---------------------------------------------------------------- window

const TEMPLATE = `
  <div class="dev-window-bar">
    <strong class="dev-window-title">Theme tweaker</strong>
    <button type="button" class="dev-collapse" aria-expanded="true" aria-label="Collapse the theme tweaker">–</button>
    <button type="button" class="dev-close" aria-label="Close the theme tweaker">×</button>
  </div>
  <div class="dev-window-body">
    <div class="dev-row">
      <label class="dev-inline">Scheme
        <select class="dev-saved" aria-label="Saved schemes"></select></label>
      <label class="dev-inline">Name
        <input type="text" class="dev-name" maxlength="60" /></label>
    </div>
    <div class="dev-row">
      <button type="button" data-act="save">Save</button>
      <button type="button" data-act="duplicate">Duplicate</button>
      <button type="button" data-act="delete">Delete</button>
      <button type="button" data-act="reset">Reset to default</button>
    </div>
    <div class="dev-row">
      <button type="button" data-act="undo">Undo</button>
      <button type="button" data-act="redo">Redo</button>
      <button type="button" data-act="compare" title="Shows the built-in default while held down">Hold to compare</button>
      <button type="button" data-act="export">Export</button>
      <button type="button" data-act="import">Import</button>
      <button type="button" data-act="code">Copy as code</button>
      <input type="file" class="dev-import" accept=".json,application/json" hidden />
    </div>
    <div class="dev-row">
      <div class="dev-modes" role="group" aria-label="Colours of which theme">
        <button type="button" data-mode="light" aria-pressed="true">Light</button>
        <button type="button" data-mode="dark" aria-pressed="false">Dark</button>
      </div>
      <input type="search" class="dev-search" placeholder="Search tokens" aria-label="Search tokens" />
      <button type="button" data-act="pick" aria-pressed="false">Pick from page</button>
    </div>
    <p class="dev-note dev-picked" hidden></p>
    <div class="dev-tabs" role="tablist" aria-label="Token groups"></div>
    <div class="dev-panel" role="tabpanel"></div>
    <div class="dev-code" hidden>
      <p class="dev-note">Paste this over COLOURS … CUSTOM_CSS in src/site/theme.js, then run npm run tokens.</p>
      <textarea readonly rows="10" aria-label="Scheme as theme.js code"></textarea>
    </div>
  </div>`;

function build() {
  win = document.createElement("section");
  win.className = "dev-window";
  win.setAttribute("aria-label", "Theme tweaker");
  win.innerHTML = TEMPLATE;
  document.body.append(win);
  const q = (s) => win.querySelector(s);

  // Moving by the title bar, with the pointer or (focused) the arrow keys.
  const bar = q(".dev-window-bar");
  bar.tabIndex = 0;
  bar.setAttribute("aria-label", "Theme tweaker title bar: arrow keys move it");
  let drag = null;
  bar.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    const r = win.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    bar.setPointerCapture?.(e.pointerId);
  });
  bar.addEventListener("pointermove", (e) => {
    if (!drag) return;
    place(e.clientX - drag.dx, e.clientY - drag.dy);
  });
  bar.addEventListener("pointerup", () => (drag = null));
  bar.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 40 : 10,
      r = win.getBoundingClientRect(),
      d = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      }[e.key];
    if (!d) return;
    e.preventDefault();
    place(r.left + d[0], r.top + d[1]);
  });
  q(".dev-collapse").addEventListener("click", (e) => {
    const open = win.classList.toggle("collapsed");
    e.currentTarget.setAttribute("aria-expanded", String(!open));
    e.currentTarget.textContent = open ? "+" : "–";
  });
  q(".dev-close").addEventListener("click", () => {
    win.hidden = true;
    $("dev-tweaker")?.focus();
  });
  win.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !e.target.closest("textarea")) {
      win.hidden = true;
      $("dev-tweaker")?.focus();
    }
  });

  // Schemes.
  q(".dev-saved").addEventListener("change", (e) =>
    attempt(() => switchTo(e.target.value)),
  );
  q(".dev-name").addEventListener("change", (e) =>
    attempt(() => setScheme({ ...currentScheme(), name: e.target.value })),
  );
  const act = {
    save: () => {
      const name = saveSchemeAs(q(".dev-name").value || "Untitled");
      showToast(`Scheme saved as "${name}".`);
    },
    duplicate: () => {
      let name = currentScheme().name + " copy",
        n = 2;
      while (savedSchemes()[name]) name = `${currentScheme().name} copy ${n++}`;
      saveSchemeAs(name);
      showToast(`Saved a copy as "${name}".`);
    },
    delete: () => {
      const name = q(".dev-saved").value;
      if (!name) throw new Error("The default scheme cannot be deleted.");
      if (!window.confirm(`Delete the saved scheme "${name}"?`)) return;
      deleteSaved(name);
      setScheme({ ...currentScheme(), name: name + " (deleted)" });
    },
    reset: () => setScheme(emptyScheme("Default")),
    undo: () => undo() || showToast("Nothing to undo."),
    redo: () => redo() || showToast("Nothing to redo."),
    export: () => {
      const scheme = currentScheme();
      download(
        new Blob([JSON.stringify(scheme, null, 2)], {
          type: "application/json",
        }),
        `physium-scheme-${scheme.name.replace(/[^\w-]+/g, "-").toLowerCase()}.json`,
      );
    },
    import: () => q(".dev-import").click(),
    code: async () => {
      const code = themeCode(currentScheme()),
        box = q(".dev-code");
      box.hidden = false;
      box.querySelector("textarea").value = code;
      try {
        await navigator.clipboard.writeText(code);
        showToast("Copied as theme.js code.");
      } catch {
        box.querySelector("textarea").select();
        showToast("Select the code below and copy it.");
      }
    },
    pick: () => startPick(),
  };
  for (const button of win.querySelectorAll("[data-act]")) {
    if (button.dataset.act === "compare") continue;
    button.addEventListener("click", () => attempt(act[button.dataset.act]));
  }
  // Hold to compare: pointer or keyboard.
  const hold = q('[data-act="compare"]');
  const on = () => compare(true),
    off = () => compare(false);
  hold.addEventListener("pointerdown", on);
  hold.addEventListener("pointerup", off);
  hold.addEventListener("pointerleave", off);
  hold.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) {
      e.preventDefault();
      on();
    }
  });
  hold.addEventListener("keyup", (e) => {
    if (e.key === " " || e.key === "Enter") off();
  });
  hold.addEventListener("blur", off);
  q(".dev-import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      setScheme(checkScheme(JSON.parse(await file.text())));
      showToast("Scheme imported.");
    } catch (error) {
      showToast(
        error instanceof SyntaxError
          ? "This file is not valid JSON."
          : error.message,
      );
    }
  });

  // Which theme's colours, search, tabs.
  for (const button of win.querySelectorAll("[data-mode]"))
    button.addEventListener("click", () => setMode(button.dataset.mode));
  q(".dev-search").addEventListener("input", (e) => {
    query = e.target.value.trim().toLowerCase();
    picked = null;
    q(".dev-picked").hidden = true;
    fill();
  });
  const tabs = q(".dev-tabs");
  for (const [id, label] of TABS) {
    const b = document.createElement("button");
    b.type = "button";
    b.role = "tab";
    b.dataset.tab = id;
    b.textContent = label;
    b.addEventListener("click", () => {
      tab = id;
      fill();
    });
    tabs.append(b);
  }
  tabs.addEventListener("keydown", (e) => {
    const i = TABS.findIndex(([id]) => id === tab),
      d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!d) return;
    tab = TABS[(i + d + TABS.length) % TABS.length][0];
    fill();
    tabs.querySelector(`[data-tab="${tab}"]`).focus();
  });
  // Rebuilt after the event that changed the scheme has finished, never
  // inside it (rebuilding moves focus, which can fire another change).
  window.addEventListener("physium-scheme-edit", () => {
    if (queued || !win || win.hidden) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      fill();
    });
  });
}

function place(x, y) {
  x = Math.max(0, Math.min(window.innerWidth - 80, x));
  y = Math.max(0, Math.min(window.innerHeight - 40, y));
  win.style.left = x + "px";
  win.style.top = y + "px";
  win.style.right = "auto";
}

function attempt(fn) {
  try {
    const result = fn();
    if (result?.catch) result.catch((e) => showToast(e.message));
  } catch (error) {
    showToast(error.message);
  }
}

// The colours shown are the page's theme: switching shows the page in it.
function setMode(next) {
  mode = next;
  const theme = $("ui-theme");
  if (theme && theme.value !== next) {
    theme.value = next;
    theme.dispatchEvent(new window.Event("change"));
  }
  fill();
}

// ---------------------------------------------------------------- rows

const matches = (t) =>
  picked
    ? picked.includes(t.name)
    : !query ||
      t.name.includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.group.toLowerCase().includes(query);

function colourRow(t, scheme) {
  const current = scheme[mode][t.name] ?? t[mode],
    row = document.createElement("div");
  row.className = "dev-token";
  row.dataset.token = t.name;
  const id = "dev-c-" + t.name;
  row.innerHTML = `<input type="color" /><input type="text" class="dev-hex" spellcheck="false" />
    <label class="dev-token-name"></label><small></small>`;
  const [picker, hex] = row.querySelectorAll("input");
  picker.value = six(current);
  picker.setAttribute("aria-label", `${t.name} colour picker`);
  hex.value = current;
  hex.id = id;
  row.querySelector("label").htmlFor = id;
  row.querySelector("label").textContent = t.name;
  row.querySelector("small").textContent = t.description;
  if (scheme[mode][t.name]) row.classList.add("changed");
  const commit = (v, record) => {
    const scheme = currentScheme();
    scheme[mode][t.name] = v;
    setScheme(scheme, { record });
  };
  // Picker: live while dragging, one undo step when let go.
  let before = null;
  picker.addEventListener("input", () => {
    before ??= currentScheme();
    const v = picker.value + alphaOf(hex.value);
    hex.value = v;
    attempt(() => commit(v, false));
  });
  picker.addEventListener("change", () => {
    if (before) {
      const after = currentScheme();
      setScheme(before, { record: false });
      setScheme(after);
      before = null;
    }
  });
  hex.addEventListener("change", () =>
    attempt(() => commit(hex.value.trim(), true)),
  );
  // Contrast with its partner tokens: the worst pair shown, every pair in
  // the tooltip.
  const pairs = PAIRS.filter(([a, b]) => a === t.name || b === t.name).map(
    ([a, b, where]) => ({ a, b, where, ratio: contrast(a, b, mode) }),
  );
  if (pairs.length) {
    pairs.sort((p, q) => p.ratio - q.ratio);
    const worst = pairs[0],
      badge = document.createElement("span");
    badge.className = "dev-contrast" + (worst.ratio < 4.5 ? " low" : "");
    badge.textContent =
      worst.ratio.toFixed(1) +
      ":1" +
      (pairs.length > 1 ? ` (${pairs.length})` : "");
    badge.title = pairs
      .map(
        (p) =>
          `${p.ratio.toFixed(2)}:1  ${p.where}: ${p.a} on ${p.b}${p.ratio < 4.5 ? " — below 4.5:1" : ""}`,
      )
      .join("\n");
    badge.setAttribute(
      "aria-label",
      `Lowest contrast ${worst.ratio.toFixed(1)} to 1, ${worst.where}`,
    );
    row.append(badge);
  }
  return row;
}

function valueRow(t, scheme) {
  const row = document.createElement("div");
  row.className = "dev-token dev-value";
  const id = "dev-v-" + t.name,
    current = scheme.values[t.name] ?? t.value;
  if (t.name in scheme.values) row.classList.add("changed");
  const label = document.createElement("label");
  label.htmlFor = id;
  label.className = "dev-token-name";
  label.textContent = t.description;
  const set = (v, record) =>
    attempt(() => {
      const scheme = currentScheme();
      scheme.values[t.name] = v;
      setScheme(scheme, { record });
    });
  let control;
  if ("min" in t) {
    control = document.createElement("input");
    control.type = "range";
    Object.assign(control, { min: t.min, max: t.max, step: t.step });
    control.value = current;
    const out = document.createElement("output");
    out.htmlFor = id;
    const show = () =>
      (out.textContent = control.value + (t.unit ? " " + t.unit : ""));
    show();
    let before = null;
    control.addEventListener("input", () => {
      before ??= currentScheme();
      show();
      set(Number(control.value), false);
    });
    control.addEventListener("change", () => {
      if (!before) return;
      const after = currentScheme();
      setScheme(before, { record: false });
      setScheme(after);
      before = null;
    });
    row.append(label, control, out);
  } else {
    control = document.createElement("select");
    for (const choice of optionsOf(t))
      control.append(
        option(
          t.fonts
            ? choice === "default"
              ? "As designed"
              : FONTS.find((f) => f.id === choice).label
            : choice[0].toUpperCase() + choice.slice(1),
          choice,
        ),
      );
    control.value = current;
    control.addEventListener("change", () => set(control.value, true));
    row.append(label, control);
  }
  control.id = id;
  const name = document.createElement("small");
  name.textContent = t.name;
  row.append(name);
  return row;
}

function cssPanel(panel, scheme) {
  const label = document.createElement("label");
  label.className = "dev-token-name";
  label.htmlFor = "dev-css";
  label.textContent =
    "Applied after every other rule, live, and saved with the scheme.";
  const box = document.createElement("textarea");
  box.id = "dev-css";
  box.rows = 14;
  box.spellcheck = false;
  box.value = scheme.css;
  box.placeholder = "header { letter-spacing: 0.02em; }";
  let timer = null,
    before = null;
  box.addEventListener("input", () => {
    before ??= currentScheme();
    clearTimeout(timer);
    timer = setTimeout(
      () =>
        attempt(() =>
          setScheme({ ...currentScheme(), css: box.value }, { record: false }),
        ),
      250,
    );
  });
  box.addEventListener("change", () => {
    clearTimeout(timer);
    const after = { ...currentScheme(), css: box.value };
    if (before) setScheme(before, { record: false });
    setScheme(after);
    before = null;
  });
  panel.append(label, box);
}

// ---------------------------------------------------------------- fill

function fill() {
  const scheme = currentScheme(),
    q = (s) => win.querySelector(s);
  // Keep focus and scroll where they were when the panel is rebuilt.
  const panel = q(".dev-panel"),
    scroll = panel.scrollTop,
    focusId = document.activeElement?.id;

  const saved = q(".dev-saved"),
    names = Object.keys(savedSchemes()).sort();
  saved.replaceChildren(
    option("Default (theme.js)", ""),
    ...names.map((n) => option(n, n)),
  );
  saved.value = savedSchemes()[scheme.name] ? scheme.name : "";
  if (document.activeElement !== q(".dev-name"))
    q(".dev-name").value = scheme.name;
  q('[data-act="undo"]').disabled = !canUndo();
  q('[data-act="redo"]').disabled = !canRedo();
  mode = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  for (const b of win.querySelectorAll("[data-mode]"))
    b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
  for (const b of win.querySelectorAll("[data-tab]")) {
    b.setAttribute("aria-selected", String(b.dataset.tab === tab));
    b.tabIndex = b.dataset.tab === tab ? 0 : -1;
  }

  panel.replaceChildren();
  if (tab === "css") cssPanel(panel, scheme);
  else if (tab === "colours")
    for (const group of GROUPS) {
      const tokens = COLOURS.filter((t) => t.group === group && matches(t));
      if (!tokens.length) continue;
      const h = document.createElement("h3");
      h.textContent = group;
      panel.append(h, ...tokens.map((t) => colourRow(t, scheme)));
    }
  else
    for (const group of TAB_GROUPS[tab]) {
      const tokens = [...SIZES, ...CHOICES].filter(
        (t) => t.group === group && matches(t),
      );
      if (!tokens.length) continue;
      const h = document.createElement("h3");
      h.textContent = group;
      panel.append(h, ...tokens.map((t) => valueRow(t, scheme)));
    }
  if (!panel.children.length) {
    const p = document.createElement("p");
    p.className = "dev-note";
    p.textContent = "No token matches.";
    panel.append(p);
  }
  panel.scrollTop = scroll;
  if (focusId && document.getElementById(focusId))
    document.getElementById(focusId).focus();
}

// ---------------------------------------------------------------- pick

// The next click on the page (outside this window) shows the colour tokens
// whose value matches the colour, background or border of what was clicked.
function startPick() {
  const button = win.querySelector('[data-act="pick"]');
  button.setAttribute("aria-pressed", "true");
  document.documentElement.classList.add("dev-picking");
  const stop = () => {
    button.setAttribute("aria-pressed", "false");
    document.documentElement.classList.remove("dev-picking");
    document.removeEventListener("click", pick, true);
    document.removeEventListener("keydown", cancel, true);
  };
  const cancel = (e) => {
    if (e.key === "Escape") stop();
  };
  const pick = (e) => {
    if (win.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    stop();
    const style = getComputedStyle(e.target),
      wanted = new Set(
        [
          style.color,
          style.backgroundColor,
          style.borderTopColor,
          style.outlineColor,
        ]
          .map(normalise)
          .filter(Boolean),
      );
    picked = COLOURS.filter((t) =>
      wanted.has(normalise(colourValue(t.name, mode))),
    ).map((t) => t.name);
    const where =
      e.target.tagName.toLowerCase() +
      (e.target.id ? "#" + e.target.id : "") +
      [...e.target.classList].map((c) => "." + c).join("");
    const note = win.querySelector(".dev-picked");
    note.hidden = false;
    note.textContent = picked.length
      ? `${where}: ${picked.join(", ")}`
      : `${where}: no token has its exact colours (a canvas is drawn, not styled).`;
    tab = "colours";
    fill();
  };
  document.addEventListener("click", pick, true);
  document.addEventListener("keydown", cancel, true);
}
// A CSS colour as "r,g,b,a" for comparing.
const probe = document.createElement("canvas").getContext?.("2d");
function normalise(colour) {
  if (!colour || colour === "transparent") return null;
  const m = /rgba?\(([^)]+)\)/.exec(colour);
  if (m) {
    const [r, g, b, a = "1"] = m[1].split(/[ ,/]+/).filter(Boolean);
    // Fully transparent says nothing about which token it came from.
    return Number(a) === 0 ? null : [r, g, b, Number(a).toFixed(2)].join(",");
  }
  if (colour.startsWith("#")) {
    const [r, g, b, a] = rgba(colour);
    return [r, g, b, a.toFixed(2)].join(",");
  }
  if (!probe) return null;
  probe.fillStyle = colour;
  return normalise(probe.fillStyle);
}

// ---------------------------------------------------------------- open

export function openTweaker() {
  if (!win) build();
  win.hidden = false;
  fill();
  win.querySelector(".dev-window-bar").focus();
}
