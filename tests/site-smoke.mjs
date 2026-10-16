// Loads every page of the site through happy-dom and checks the shared shell:
// each has the same Website controls (ids and options), the same navigation
// entries with exactly one marked current, and a brand link to the homepage.
// Also checks the 404 lookup and that server.mjs resolves addresses the way
// GitHub Pages does. It cannot see pixels.
import { Window } from "happy-dom";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import Matter from "../vendor/matter.js";
import { pages, findPage, pageById } from "../src/site/pages.js";

const root = new URL("../", import.meta.url);
const home = root.href;

async function load(file, address, fresh = "") {
  const window = new Window({ url: "http://localhost:3000/" + address });
  const html = await readFile(new URL(file, root), "utf8");
  window.document.write(html);
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.Matter = Matter;
  globalThis.setTimeout = window.setTimeout.bind(window);
  globalThis.clearTimeout = window.clearTimeout.bind(window);
  globalThis.requestAnimationFrame = () => 0;
  const ctx = new Proxy(
    {},
    { get: (o, k) => o[k] || (() => {}), set: (o, k, v) => ((o[k] = v), true) },
  );
  window.HTMLCanvasElement.prototype.getContext = () => ctx;
  window.HTMLCanvasElement.prototype.setPointerCapture = () => {};
  window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 1000,
    height: 700,
  });
  // The page's own module script, resolved from the HTML file's folder (the
  // 404 page uses paths from the site root).
  const script = [...window.document.querySelectorAll("script[type=module]")]
    .map((s) => s.getAttribute("src"))
    .find(Boolean);
  const src = script.startsWith("/")
    ? new URL("." + script, root)
    : new URL(script, new URL(file, root));
  // `fresh` loads the script again (modules are otherwise cached).
  await import(src.href + fresh);
  return window.document;
}

const describe = (doc) => {
  const section = doc.getElementById("website-settings");
  assert.ok(section, "has a Website section");
  return [...section.querySelectorAll("input, select, output")].map((el) => [
    el.id,
    el.tagName,
    el.type || "",
    [...(el.options || [])].map((o) => o.value).join(","),
  ]);
};

const shellPages = [
  ...pages,
  { id: "not-found", file: "404.html", address: "no-such-page" },
];
let reference = null,
  referenceNav = null;
for (const page of shellPages) {
  const doc = await load(page.file, page.address);
  const controls = describe(doc);
  assert.ok(
    ["ui-theme", "ui-size", "ui-size-value", "ui-grid", "ui-angle-unit"].every(
      (id) => controls.some(([c]) => c === id),
    ),
    page.id + ": core Website controls",
  );
  reference ??= controls;
  assert.deepEqual(controls, reference, page.id + ": same Website controls");
  // Only one element with each shared id.
  for (const [id] of controls)
    assert.equal(doc.querySelectorAll("#" + id).length, 1, page.id + " " + id);

  const links = [...doc.querySelectorAll("#nav-menu a")];
  const nav = links.map((a) => [a.getAttribute("href"), a.textContent]);
  referenceNav ??= nav;
  assert.deepEqual(nav, referenceNav, page.id + ": same navigation");
  assert.equal(nav.length, 7, "home, the five simulations, the minitools");
  for (const [href] of nav) assert.ok(!href.endsWith(".html"), href);
  const current = links.filter((a) => a.getAttribute("aria-current"));
  if (["home", "simulation", "minitools"].includes(page.group)) {
    assert.equal(current.length, 1, page.id + ": one current entry");
    assert.equal(
      current[0].getAttribute("href"),
      new URL(page.address, root).href,
    );
  } else assert.equal(current.length, 0);

  if (page.id === "home") {
    // The GitHub link near the top and in the footer.
    const github = [...doc.querySelectorAll("a")].filter(
      (a) => a.getAttribute("href") === "https://github.com/J031-S/Physics-Sim",
    );
    assert.equal(github.length, 2, "GitHub link at the top and in the footer");
    for (const a of github)
      assert.equal(a.dataset.icon, "github", "GitHub icon");
    // Every simulation and the minitool catalogue one click away.
    const hrefs = [...doc.querySelectorAll("main a")].map((a) =>
      a.getAttribute("href"),
    );
    for (const p of pages.filter((p) =>
      ["simulation", "minitools"].includes(p.group),
    ))
      assert.ok(hrefs.includes(new URL(p.address, root).href), p.id);
    assert.ok(doc.querySelectorAll(".mt-card").length >= 3, "featured tools");
    assert.ok(doc.querySelector(".home-goal").textContent.length > 20);
  }
  if (page.id === "not-found") {
    assert.equal(
      doc.getElementById("missing-path").textContent,
      "/no-such-page",
    );
    assert.equal(doc.getElementById("home-link").getAttribute("href"), home);
  }
  const brand = doc.querySelector("a.brand");
  assert.equal(brand.getAttribute("href"), home, page.id + ": brand → home");
  assert.match(brand.textContent, /Physium/);
  assert.ok(brand.querySelector(".brand-mark"));
}

// Developer mode: off by default, with nothing of it showing (not even the
// switch) and no scheme applied; ?physium-dev turns it on and shows the
// switch and the Developer group.
{
  const gallery = pageById("gallery");
  let doc = await load(gallery.file, gallery.address, "?off");
  assert.equal(doc.getElementById("ui-developer"), null, "no switch");
  assert.equal(doc.getElementById("developer-settings"), null);
  assert.equal(doc.getElementById("ui-icons"), null);
  assert.equal(doc.getElementById("physium-scheme"), null);
  doc = await load(gallery.file, gallery.address + "?dev", "?dev");
  assert.equal(doc.getElementById("ui-developer"), null, "?dev is not enough");
  doc = await load(gallery.file, gallery.address + "?physium-dev", "?on");
  assert.ok(
    doc.getElementById("developer-settings"),
    "?physium-dev shows the group",
  );
  assert.equal(doc.getElementById("ui-developer").checked, true);
  assert.equal(
    doc.getElementById("ui-developer").closest("#website-settings"),
    doc.getElementById("website-settings"),
  );
  // The group sits above the switch, at the foot of the Website section.
  assert.equal(
    doc.getElementById("developer-settings").nextElementSibling,
    doc.getElementById("ui-developer").parentElement,
  );
  const weights = [...doc.getElementById("ui-icons").options].map(
    (o) => o.value,
  );
  assert.equal(weights.length, 6, "six Phosphor weights");
}

// Lookups the 404 page redirects: case, ".html", trailing slash, old names.
assert.equal(findPage("sims/mechanics")?.id, "mechanics");
assert.equal(findPage("SIMS/EMFields.html")?.id, "fields");
assert.equal(findPage("sims/Orbits/")?.id, "orbits");
assert.equal(findPage("fields.html")?.id, "fields");
assert.equal(findPage("orbits.html")?.id, "orbits");
assert.equal(findPage("circuits.html")?.id, "circuits");
assert.equal(findPage("index.html")?.id, "home");
assert.equal(findPage("")?.id, "home");
assert.equal(findPage("no-such-page"), null);
assert.equal(pageById("minitools").address, "minitools/");

// No page address or link in pages.js ends in ".html".
for (const p of pages) assert.ok(!p.address.endsWith(".html"), p.id);

// server.mjs resolves addresses like GitHub Pages.
{
  const port = 3900 + Math.floor(Math.random() * 90);
  const server = spawn(process.execPath, ["server.mjs"], {
    cwd: new URL(root).pathname,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "inherit"],
  });
  await new Promise((done) => server.stdout.once("data", done));
  const get = (path) =>
    fetch(`http://localhost:${port}${path}`, { redirect: "manual" });
  try {
    for (const p of pages.filter((p) => p.group === "simulation")) {
      const r = await get("/" + p.address);
      assert.equal(r.status, 200, p.address);
      assert.match(await r.text(), /data-page=/);
    }
    assert.equal((await get("/")).status, 200);
    // Minitools: the catalogue, and each tool at its own address.
    assert.equal((await get("/minitools/")).status, 200);
    assert.equal((await get("/minitools")).status, 301);
    const tool = await get("/minitools/kepler-third-law");
    assert.equal(tool.status, 200);
    assert.match(await tool.text(), /src\/minitools\/app\.js/);
    assert.equal((await get("/sims/Mechanics.html")).status, 200);
    const folder = await get("/sims");
    assert.equal(folder.status, 301);
    assert.equal(folder.headers.get("location"), "/sims/");
    const missing = await get("/no-such-page");
    assert.equal(missing.status, 404);
    assert.match(await missing.text(), /Page not found/);
    assert.equal((await get("/sims/mechanics")).status, 404, "case-sensitive");
    assert.equal(
      (await get("/assets/logo.svg")).headers.get("content-type"),
      "image/svg+xml",
    );
  } finally {
    server.kill();
  }
}

console.log("site smoke: ok");
process.exit(0);
