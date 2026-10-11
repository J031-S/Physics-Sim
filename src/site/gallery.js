// The component gallery (developer page). dev/gallery shows two frames of
// dev/gallery-pane, one per theme; each pane holds the shared components in
// the theme its address names, with the current developer scheme, and
// follows the theme tweaker live (developer.js listens for scheme changes
// made in another frame or tab).
import { setupSite, setupSettingsPanel } from "./shell.js";

setupSite();
if (document.body.classList.contains("gallery-pane")) {
  const theme =
    new URLSearchParams(window.location.search).get("theme") === "dark"
      ? "dark"
      : "light";
  // Preferences set the page's theme; this pane always shows its own.
  const force = () => {
    if (document.documentElement.dataset.theme !== theme)
      document.documentElement.dataset.theme = theme;
  };
  new MutationObserver(force).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  force();
  document.querySelector(".gallery-theme").textContent =
    theme === "dark" ? "Dark theme" : "Light theme";
  // A copy of the navigation menu, shown open.
  const menu = document.getElementById("nav-menu")?.cloneNode(true);
  if (menu) {
    menu.removeAttribute("id");
    menu.hidden = false;
    menu.classList.add("gallery-static");
    document.querySelector(".gallery-nav").append(menu);
  }
} else {
  setupSettingsPanel();
  // The frames load after developer mode (?dev) has been remembered, so they
  // show the scheme too.
  for (const frame of document.querySelectorAll("iframe[data-src]"))
    frame.src = frame.dataset.src;
}
