import { prepareIcons, renderIcons, iconSetNames } from "./icons.js";
export function setupPreferences($) {
  let saved = {};
  try {
    saved = JSON.parse(window.localStorage.getItem("physics-sim-ui") || "{}");
  } catch {}
  if (!saved || typeof saved !== "object") saved = {};
  prepareIcons();
  const prefs = {
    iconSet: iconSetNames.includes(saved.iconSet) ? saved.iconSet : "material",
    theme: ["light", "dark", "system"].includes(saved.theme)
      ? saved.theme
      : "light",
    size: Number.isFinite(saved.size)
      ? Math.max(80, Math.min(140, saved.size))
      : 100,
    grid: saved.grid !== false,
  };
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  const apply = () => {
    document.documentElement.dataset.theme =
      prefs.theme === "system"
        ? media?.matches
          ? "dark"
          : "light"
        : prefs.theme;
    document.documentElement.style.setProperty("--ui-scale", prefs.size / 100);
    $("ui-icons").value = prefs.iconSet;
    renderIcons(prefs.iconSet);
    $("ui-theme").value = prefs.theme;
    $("ui-size").value = prefs.size;
    $("ui-size-value").textContent = prefs.size + "%";
    $("ui-grid").checked = prefs.grid;
    try {
      window.localStorage.setItem("physics-sim-ui", JSON.stringify(prefs));
    } catch {}
  };
  $("ui-icons").onchange = (e) => {
    prefs.iconSet = iconSetNames.includes(e.target.value)
      ? e.target.value
      : "material";
    apply();
  };
  $("ui-theme").onchange = (e) => {
    prefs.theme = e.target.value;
    apply();
  };
  $("ui-size").oninput = (e) => {
    prefs.size = Number(e.target.value);
    apply();
  };
  $("ui-grid").onchange = (e) => {
    prefs.grid = e.target.checked;
    apply();
  };
  media?.addEventListener?.("change", apply);
  apply();
  return prefs;
}
