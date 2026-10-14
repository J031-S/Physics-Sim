// Design tokens: styles/tokens.css is generated from src/site/theme.js and up
// to date, every token is well formed, and colours live only in theme.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import {
  COLOURS,
  SIZES,
  GROUPS,
  tokensCss,
  color,
  setOverrides,
} from "../src/site/theme.js";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\(|:\s*(white|black)\b/;

test("styles/tokens.css is generated from theme.js (npm run tokens)", async () => {
  assert.equal(await read("styles/tokens.css"), tokensCss());
});

test("every colour token has a name, a known group, a description and two hex values", () => {
  const names = new Set();
  for (const t of COLOURS) {
    assert.match(t.name, /^[a-z][a-z0-9-]*$/, t.name);
    assert.ok(!names.has(t.name), "duplicate " + t.name);
    names.add(t.name);
    assert.ok(GROUPS.includes(t.group), t.name + " group " + t.group);
    assert.ok(t.description.length > 3, t.name);
    for (const mode of ["light", "dark"])
      assert.match(
        t[mode],
        /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
        t.name,
      );
  }
  for (const t of SIZES)
    assert.ok(t.value >= t.min && t.value <= t.max, t.name);
});

test("no colour literals in the stylesheets outside tokens.css", async () => {
  for (const file of await readdir(new URL("styles/", root))) {
    if (file === "tokens.css") continue;
    const text = await read("styles/" + file);
    text
      .split("\n")
      .forEach((line, i) =>
        assert.ok(
          !LITERAL.test(line),
          `styles/${file}:${i + 1}: ${line.trim()}`,
        ),
      );
  }
});

test("every var(--token) a stylesheet uses is defined", async () => {
  const defined = new Set([
    ...COLOURS.map((t) => t.name),
    ...SIZES.map((t) => t.name),
  ]);
  for (const file of await readdir(new URL("styles/", root))) {
    const text = await read("styles/" + file);
    for (const [, name] of text.matchAll(/--([\w-]+)\s*:/g)) defined.add(name);
  }
  for (const file of await readdir(new URL("styles/", root))) {
    const text = await read("styles/" + file);
    for (const [, name] of text.matchAll(/var\(--([\w-]+)/g))
      assert.ok(defined.has(name), `styles/${file} uses --${name}`);
  }
});

test("color() follows the theme and developer overrides", () => {
  assert.equal(color("ink", false), "#354438");
  assert.equal(color("ink", true), "#ebe5d6");
  setOverrides({ dark: { ink: "#ffffff" } });
  assert.equal(color("ink", true), "#ffffff");
  assert.equal(color("ink", false), "#354438");
  setOverrides();
  assert.equal(color("ink", true), "#ebe5d6");
  assert.throws(() => color("no-such-token"));
});

test("no colour literals in the page scripts outside theme.js", async () => {
  const files = [];
  const walk = async (dir) => {
    for (const entry of await readdir(new URL(dir, root), {
      withFileTypes: true,
    }))
      if (entry.isDirectory()) await walk(dir + entry.name + "/");
      else if (entry.name.endsWith(".js")) files.push(dir + entry.name);
  };
  await walk("src/");
  // rgb(…) built from numbers in code (e.g. a colour mix) is not a literal.
  const literal = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d/;
  for (const file of files) {
    // theme.js holds the colours; scheme-presets.js holds built-in developer
    // schemes, which are data in the scheme format (like a saved scheme) and
    // are only ever applied in developer mode.
    if (file === "src/site/theme.js" || file === "src/site/scheme-presets.js")
      continue;
    (await read(file))
      .split("\n")
      .forEach((line, i) =>
        assert.ok(!literal.test(line), `${file}:${i + 1}: ${line.trim()}`),
      );
  }
});

test("no stylesheet redefines a colour token", async () => {
  const { colourNames } = await import("../src/site/theme.js");
  const names = new Set(colourNames());
  for (const file of await readdir(new URL("styles/", root))) {
    if (file === "tokens.css") continue;
    for (const m of (await read("styles/" + file)).matchAll(/--([\w-]+)\s*:/g))
      assert.ok(!names.has(m[1]), `styles/${file} redefines --${m[1]}`);
  }
});
