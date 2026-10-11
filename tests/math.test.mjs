// Equation rendering: KaTeX is vendored complete (script, stylesheet, every
// .woff2 the stylesheet names) at the pinned version, and only pages that
// show equations import src/site/math.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("KaTeX is vendored with its fonts, licence and version", async () => {
  const pkg = JSON.parse(await read("vendor/katex/package.json"));
  assert.equal(pkg.name, "katex");
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  const script = await read("vendor/katex/katex.min.js");
  assert.ok(script.includes(`version:"${pkg.version}"`), "script version");
  await access(new URL("vendor/katex/LICENSE", root));
  const css = await read("vendor/katex/katex.min.css");
  const fonts = [...css.matchAll(/url\((fonts\/[^)]+\.woff2)\)/g)].map(
    (m) => m[1],
  );
  assert.ok(fonts.length >= 20);
  for (const font of fonts) await access(new URL("vendor/katex/" + font, root));
});

// The modules a script imports, followed through relative imports.
async function importsOf(path, seen = new Set()) {
  if (seen.has(path)) return seen;
  seen.add(path);
  const text = await read(path);
  for (const m of text.matchAll(/(?:import|from)\s*\(?\s*"(\.{1,2}\/[^"]+)"/g))
    await importsOf(
      new URL(m[1], new URL(path, root)).href.slice(root.href.length),
      seen,
    );
  return seen;
}

test("simulation pages do not load KaTeX", async () => {
  for (const page of [
    "src/app.js",
    "src/fieldlab/app.js",
    "src/orbitlab/app.js",
    "src/circuitlab/app.js",
  ]) {
    const graph = await importsOf(page);
    assert.ok(!graph.has("src/site/math.js"), page);
  }
});
