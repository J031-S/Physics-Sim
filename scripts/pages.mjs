// Writes minitools/<id>.html for every tool in src/minitools/catalogue.js,
// and removes stubs for tools that no longer exist. GitHub Pages needs a file
// per address; every stub is the same page apart from its title, and the one
// shared script (src/minitools/app.js) reads the id from the address.
// Run `npm run pages` after adding, removing or renaming a tool. Never edit a
// stub by hand: tests/minitools.test.mjs checks they match this script.
import { readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { tools } from "../src/minitools/catalogue.js";

const folder = new URL("../minitools/", import.meta.url);
const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function stubFor(tool) {
  return `<!doctype html>
<!-- Written by \`npm run pages\` from src/minitools/catalogue.js. Do not edit. -->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Physium · ${escape(tool.title)}</title>
    <link rel="icon" type="image/svg+xml" href="../assets/logo.svg" />
    <link rel="stylesheet" href="../styles/tokens.css" />
    <link rel="stylesheet" href="../styles/base.css" />
    <link rel="stylesheet" href="../styles/minitools.css" />
  </head>
  <body class="doc-page" data-page="minitools">
    <header>
      <a class="brand"></a>
      <nav class="site-nav"></nav>
      <div class="playback">
        <button
          id="settings-toggle"
          title="Settings"
          aria-expanded="false"
          aria-controls="settings-panel"
        >
          Settings
        </button>
      </div>
    </header>
    <main id="minitool"></main>
    <section id="settings-panel" hidden aria-labelledby="settings-title">
      <div class="menu-header">
        <strong id="settings-title">Settings</strong
        ><button id="close-settings" aria-label="Close settings">×</button>
      </div>
      <details id="website-settings" class="settings-section" open></details>
    </section>
    <div id="toast" role="status" aria-live="polite"></div>
    <script type="module" src="../src/minitools/app.js"></script>
  </body>
</html>
`;
}
// The stubs as they should be: file name → text.
export function expectedStubs() {
  return new Map(tools.map((t) => [t.id + ".html", stubFor(t)]));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const want = expectedStubs();
  let written = 0,
    removed = 0;
  for (const name of readdirSync(folder)) {
    if (name === "index.html" || !name.endsWith(".html")) continue;
    if (!want.has(name)) {
      unlinkSync(new URL(name, folder));
      removed++;
    }
  }
  for (const [name, text] of want) {
    let old = null;
    try {
      old = readFileSync(new URL(name, folder), "utf8");
    } catch {}
    if (old !== text) {
      writeFileSync(new URL(name, folder), text);
      written++;
    }
  }
  console.log(
    `minitools: ${want.size} stubs (${written} written, ${removed} removed)`,
  );
}
