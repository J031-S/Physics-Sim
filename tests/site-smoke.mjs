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

async function load(file, address) {
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
  await import(src.href);
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
  ...pages.filter((p) => p.group === "simulation"),
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
  assert.ok(nav.length >= 4, "navigation lists the simulations");
  for (const [href] of nav) assert.ok(!href.endsWith(".html"), href);
  const current = links.filter((a) => a.getAttribute("aria-current"));
  if (page.group === "simulation") {
    assert.equal(current.length, 1, page.id + ": one current entry");
    assert.equal(
      current[0].getAttribute("href"),
      new URL(page.address, root).href,
    );
  } else assert.equal(current.length, 0);

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
