// Minitools: structure only. Every entry is complete and self-consistent,
// every mini simulation builds at its defaults with the real engine, and the
// stub pages match the catalogue. Numbers are checked against textbook
// values in the physics review, not here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import Matter from "../vendor/matter.js";
import { tools, toolById } from "../src/minitools/catalogue.js";
import { visuals } from "../src/minitools/visuals/index.js";
import { pageById } from "../src/site/pages.js";
import { expectedStubs } from "../scripts/pages.mjs";

globalThis.Matter = Matter;
const engines = {
  sandbox: await import("../src/physics.js"),
  orbitlab: await import("../src/orbitlab/model.js"),
  fieldlab: await import("../src/fieldlab/model.js"),
  circuitlab: await import("../src/circuitlab/model.js"),
};
const defaults = (t) =>
  Object.fromEntries([
    ...t.variables.map((v) => [v.key, v.value]),
    ...t.constants.map((c) => [c.key, c.value]),
  ]);

test("ids are unique and usable as an address", () => {
  const ids = tools.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/, id);
});

test("every entry has every field", () => {
  for (const t of tools) {
    for (const key of ["id", "title", "topic", "purpose", "latex"])
      assert.ok(typeof t[key] === "string" && t[key], `${t.id} ${key}`);
    assert.ok(["single", "combined"].includes(t.kind), t.id);
    assert.equal(t.verified, false, t.id);
    assert.ok(t.variables.length >= 2, t.id);
    for (const v of t.variables)
      for (const key of ["key", "latex", "name", "unit", "min", "max", "value"])
        assert.ok(key in v, `${t.id} ${v.key} ${key}`);
    for (const c of t.constants)
      assert.ok(Number.isFinite(c.value) && c.latex && c.name, t.id);
    assert.ok(t.solveFor.length >= 1, t.id);
    for (const key of t.solveFor) {
      assert.ok(
        t.variables.some((v) => v.key === key),
        `${t.id} ${key}`,
      );
      assert.equal(typeof t.solve[key], "function", `${t.id} solve ${key}`);
      assert.equal(typeof t.forms[key], "string", `${t.id} form ${key}`);
      // Every quantity a form names exists.
      for (const [, braced, plain] of t.forms[key].matchAll(
        /@\{([A-Za-z]\w*)\}|@([A-Za-z][A-Za-z0-9]*)/g,
      ))
        assert.ok(
          [...t.variables, ...t.constants].some(
            (q) => q.key === (braced ?? plain),
          ),
          `${t.id} form ${key} names ${braced ?? plain}`,
        );
    }
    if (t.kind === "combined") assert.ok(t.derivation.length >= 2, t.id);
    for (const step of t.derivation) assert.ok(step.say && step.latex, t.id);
  }
});

test("defaults are inside their ranges", () => {
  for (const t of tools)
    for (const v of t.variables)
      assert.ok(
        v.min <= v.value && v.value <= v.max && v.min < v.max,
        `${t.id} ${v.key}`,
      );
});

test("every solve gives a finite number at the defaults", () => {
  for (const t of tools)
    for (const key of t.solveFor)
      assert.ok(Number.isFinite(t.solve[key](defaults(t))), `${t.id} ${key}`);
});

test("every visual, related page and linked tool exists", () => {
  for (const t of tools) {
    assert.ok(visuals[t.visual], `${t.id} visual ${t.visual}`);
    if (t.related) assert.ok(pageById(t.related), `${t.id} ${t.related}`);
    for (const use of t.uses) assert.ok(toolById(use), `${t.id} uses ${use}`);
  }
});

test("every tool has a simulation or names the one it wants", () => {
  for (const t of tools)
    assert.ok(
      (t.sim && !t.wants) || (!t.sim && typeof t.wants === "string"),
      t.id,
    );
  const waiting = tools.filter((t) => t.wants);
  // The list the standing rule in CLAUDE.md works from.
  console.log(
    `# minitools waiting for a simulation (${waiting.length}): ` +
      waiting.map((t) => `${t.id} (${t.wants})`).join(", "),
  );
});

test("every mini simulation builds at its defaults", () => {
  for (const t of tools.filter((t) => t.sim)) {
    assert.ok(engines[t.sim.engine], `${t.id} engine`);
    assert.ok(t.sim.caption, `${t.id} caption`);
    const values = defaults(t);
    values[t.solveFor[0]] = t.solve[t.solveFor[0]](values);
    const model = t.sim.build(values, engines[t.sim.engine]);
    assert.ok(model, t.id);
    const watch = typeof t.sim.watch === "function" ? t.sim.watch : t.sim.watch;
    assert.ok(watch, `${t.id} watch`);
    model.dispose?.();
  }
});

test("the stub pages match the catalogue", async () => {
  const want = expectedStubs(),
    folder = new URL("../minitools/", import.meta.url),
    have = (await readdir(folder)).filter(
      (n) => n.endsWith(".html") && n !== "index.html",
    );
  assert.deepEqual(
    have.sort(),
    [...want.keys()].sort(),
    "missing or extra stubs: run npm run pages",
  );
  for (const [name, text] of want)
    assert.equal(
      await readFile(new URL(name, folder), "utf8"),
      text,
      `${name} is out of date: run npm run pages`,
    );
});
