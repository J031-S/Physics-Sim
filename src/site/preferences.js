import { prepareIcons, renderIcons } from "./icons.js";
// Website preferences: loaded, applied and saved here for every page.
export const STORAGE_KEY = "physium-ui";
const OLD_STORAGE_KEY = "physics-sim-ui";
export function setupPreferences($) {
  let saved = {};
  try {
    // Preferences moved from "physics-sim-ui" when the site became Physium;
    // read the old key once so nobody loses their settings.
    saved = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ||
        window.localStorage.getItem(OLD_STORAGE_KEY) ||
        "{}",
    );
  } catch {}
  if (!saved || typeof saved !== "object") saved = {};
  prepareIcons();
  const prefs = {
    // The icon weight belongs to developer schemes (developer.js), which
    // set it after loading; without developer mode it is Phosphor regular.
    iconWeight: "regular",
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
    // The icon-weight control exists only in developer mode.
    if ($("ui-icons")) $("ui-icons").value = prefs.iconWeight;
    renderIcons(prefs.iconWeight);
    $("ui-theme").value = prefs.theme;
    $("ui-size").value = prefs.size;
    $("ui-size-value").textContent = prefs.size + "%";
    if ($("ui-size-number")) $("ui-size-number").value = prefs.size;
    $("ui-grid").checked = prefs.grid;
    if ($("ui-angle-unit")) $("ui-angle-unit").value = prefs.angleUnit;
    const { theme, size, grid, angleUnit } = prefs;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ theme, size, grid, angleUnit }),
      );
    } catch {}
  };
  // For the developer options: apply after changing prefs.iconWeight.
  Object.defineProperty(prefs, "refresh", { value: apply });
  $("ui-theme").onchange = (e) => {
    prefs.theme = e.target.value;
    apply();
  };
  // The size changes the layout the slider itself sits in, so while the
  // slider is held with the pointer only its number follows; the page is
  // resized when it is let go. (Resizing under the pointer would move the
  // thumb away from it.) Keys and the number field apply at once.
  let held = false;
  const size = $("ui-size"),
    sizeOf = (x) => Math.max(80, Math.min(140, Math.round(Number(x)) || 100));
  size.addEventListener("pointerdown", () => (held = true));
  size.oninput = (e) => {
    const value = sizeOf(e.target.value);
    if (held) {
      $("ui-size-value").textContent = value + "%";
      if ($("ui-size-number")) $("ui-size-number").value = value;
      return;
    }
    prefs.size = value;
    apply();
  };
  size.onchange = (e) => {
    held = false;
    prefs.size = sizeOf(e.target.value);
    apply();
  };
  if ($("ui-size-number"))
    $("ui-size-number").onchange = (e) => {
      prefs.size = sizeOf(e.target.value);
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
