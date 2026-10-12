// The 404 page. GitHub Pages serves 404.html for any address it has no file
// for; addresses are case-sensitive there. Look the request up in pages.js
// (ignoring case, a trailing ".html" and the old single-folder addresses) and
// redirect; otherwise show "page not found" in the site's shell.
import { findPage } from "./pages.js";
import { setupSite, setupSettingsPanel, pageUrl, siteRoot } from "./shell.js";

const here = new URL(window.location.href),
  relative = here.pathname.startsWith(siteRoot.pathname)
    ? here.pathname.slice(siteRoot.pathname.length)
    : here.pathname,
  page = findPage(relative),
  target = page && new URL(pageUrl(page));

if (target && target.pathname !== here.pathname)
  window.location.replace(target.href + here.search + here.hash);
else {
  setupSite();
  setupSettingsPanel();
  document.getElementById("missing-path").textContent = here.pathname;
  document.getElementById("home-link").href = siteRoot.href;
}
