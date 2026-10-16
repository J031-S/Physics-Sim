// Runs before the page is first drawn (a plain script in each page's
// <head>, not a module), so that a reload never flashes the wrong theme or
// the unstyled controls. It sets the stored theme and GUI size, puts back
// the developer scheme's stylesheet when developer mode is on, and hides
// the page until setupSite() has built the shell and drawn the icons (or
// three seconds have passed, should a script fail).
(function () {
  var root = document.documentElement,
    read = function (key) {
      try {
        return JSON.parse(window.localStorage.getItem(key));
      } catch (e) {
        return null;
      }
    };
  var prefs = read("physium-ui") || read("physics-sim-ui") || {},
    theme = prefs.theme;
  if (theme === "system")
    theme =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  root.dataset.theme = theme === "dark" ? "dark" : "light";
  if (typeof prefs.size === "number")
    root.style.setProperty(
      "--ui-scale",
      Math.max(80, Math.min(140, prefs.size)) / 100,
    );
  // The same parameter as DEV_PARAM in src/site/developer.js.
  var asked = new URLSearchParams(window.location.search).get("physium-dev"),
    dev =
      asked !== null
        ? asked !== "0" && asked !== "off"
        : !!(read("physium-developer") || {}).on;
  var css = dev && window.localStorage.getItem("physium-scheme-css");
  if (css) {
    var scheme = document.createElement("style");
    scheme.id = "physium-scheme";
    scheme.textContent = css;
    document.head.appendChild(scheme);
    // The house style in tokens.css stands aside (see src/site/surface.js).
    root.classList.add("dev-scheme");
  }
  root.setAttribute("data-booting", "");
  var hide = document.createElement("style");
  hide.textContent = "html[data-booting] body { visibility: hidden; }";
  document.head.appendChild(hide);
  setTimeout(function () {
    root.removeAttribute("data-booting");
  }, 3000);
})();
