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
    angleUnit: saved.angleUnit === "radians" ? "radians" : "degrees",
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
    // The icon-set and angle-unit controls exist only on some pages.
    if ($("ui-icons")) $("ui-icons").value = prefs.iconSet;
    renderIcons(prefs.iconSet);
    $("ui-theme").value = prefs.theme;
    $("ui-size").value = prefs.size;
    $("ui-size-value").textContent = prefs.size + "%";
    $("ui-grid").checked = prefs.grid;
    if ($("ui-angle-unit")) $("ui-angle-unit").value = prefs.angleUnit;
    try {
      window.localStorage.setItem("physics-sim-ui", JSON.stringify(prefs));
    } catch {}
  };
  if ($("ui-icons"))
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
  if ($("ui-angle-unit"))
    $("ui-angle-unit").onchange = (e) => {
      prefs.angleUnit = e.target.value === "radians" ? "radians" : "degrees";
      apply();
      prefs.onchange?.();
    };
  media?.addEventListener?.("change", apply);
  apply();
  return prefs;
}
