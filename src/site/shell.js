// The site shell: the header brand, the navigation drop-down and the Website
// settings section, built into placeholders in each page from pages.js, so
// they are written once and identical everywhere. Call setupSite() at the top
// of a page's script, before anything looks up a control; it returns the
// website preferences.
import { pages, pageById } from "./pages.js";
import { setupNav } from "./nav.js";
import { setupPreferences } from "./preferences.js";
import { $ } from "./dom.js";
import { setupDeveloper } from "./developer.js";

// This file sits at src/site/, so the site root is two folders up. Every link
// is built from it, so nothing depends on the folder a page is in.
export const siteRoot = new URL("../../", import.meta.url);
export const pageUrl = (page) => new URL(page.address, siteRoot).href;
export const assetUrl = (path) => new URL(path, siteRoot).href;

const escape = (text) =>
  String(text).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

function buildBrand() {
  for (const brand of document.querySelectorAll("a.brand")) {
    brand.href = pageUrl(pageById("home"));
    brand.innerHTML =
      '<span class="brand-mark" aria-hidden="true"></span>Physium';
  }
}

// Pages listed in the navigation drop-down, in order.
export const navPages = () => pages.filter((p) => p.group === "simulation");

function buildNav(current) {
  const nav = document.querySelector("nav.site-nav");
  if (!nav) return;
  const here = pageById(current);
  nav.setAttribute("aria-label", "Simulations");
  nav.innerHTML = `<button
    id="nav-toggle"
    class="nav-toggle"
    aria-haspopup="true"
    aria-expanded="false"
    aria-controls="nav-menu"
    title="Switch simulation"
  >${escape(here?.group === "simulation" ? here.title : "Simulations")}</button>
  <div id="nav-menu" class="nav-menu" hidden>${navPages()
    .map(
      (p) =>
        `<a href="${pageUrl(p)}"${p.id === current ? ' aria-current="page"' : ""}><strong>${escape(p.title)}</strong><small>${escape(p.description)}</small></a>`,
    )
    .join("")}</div>`;
}

// The Website section of the settings panel: the same on every page. A
// control with no effect on a given page still appears.
export const WEBSITE_SETTINGS = `<summary>Website</summary>
  <label class="select-row"
    >Theme
    <select id="ui-theme">
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select></label
  >
  <div class="prop-row">
    <label for="ui-size">GUI size</label
    ><input id="ui-size" type="range" min="80" max="140" step="5" value="100"
    /><span class="prop-value"
      ><output id="ui-size-value" for="ui-size">100%</output></span
    >
  </div>
  <label class="setting-toggle"
    ><input id="ui-grid" type="checkbox" checked /> Show grid</label
  >
  <label class="select-row"
    >Angle unit
    <select id="ui-angle-unit">
      <option value="degrees">Degrees (°)</option>
      <option value="radians">Radians (rad)</option>
    </select></label
  >
  <small
    >Website preferences are remembered on this browser and shared by every
    page.</small
  >`;

function buildWebsite() {
  const section = $("website-settings");
  if (section) section.innerHTML = WEBSITE_SETTINGS;
}

export function setupSite() {
  buildBrand();
  buildNav(document.body.dataset.page);
  buildWebsite();
  setupNav();
  const prefs = setupPreferences($);
  setupDeveloper(prefs);
  return prefs;
}

// Settings button and panel for pages that have no settings of their own
// (homepage, minitools, page not found): open, close, Escape, press outside.
export function setupSettingsPanel() {
  const toggle = $("settings-toggle"),
    panel = $("settings-panel");
  if (!toggle || !panel) return;
  const set = (open) => {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  };
  toggle.addEventListener("click", () => set(panel.hidden));
  $("close-settings")?.addEventListener("click", () => {
    set(false);
    toggle.focus();
  });
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      set(false);
      toggle.focus();
    }
  });
  document.addEventListener("pointerdown", (e) => {
    if (
      !panel.hidden &&
      !panel.contains(e.target) &&
      !toggle.contains(e.target)
    )
      set(false);
  });
}
