// Minitools: every entry is complete and self-consistent, every unknown has
// its rearranging steps (each worked-out line checked with numbers), every
// mini simulation is run with the real engine and compared with its formula
// at the defaults, and the stub pages match the catalogue.
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

// A canvas context that accepts every call and keeps the text drawn.
function recordingContext() {
  const texts = [];
  const ctx = new Proxy(
    {},
    {
      get(target, key) {
        if (key === "fillText") return (text) => texts.push(String(text));
        if (key === "measureText")
          return (text) => ({ width: 7 * text.length });
        if (key in target) return target[key];
        return () => {};
      },
      set(target, key, value) {
        target[key] = value;
        return true;
      },
    },
  );
  return { ctx, texts };
}

test("every tool's picture draws and labels its unknown", () => {
  for (const t of tools)
    for (const unknown of t.solveFor) {
      const values = defaults(t);
      for (const c of t.constants) values[c.key] = c.value;
      values[unknown] = t.solve[unknown](values);
      const { ctx, texts } = recordingContext(),
        q = t.variables.find((v) => v.key === unknown);
      visuals[t.visual](ctx, {
        width: 700,
        height: 250,
        values,
        unknown,
        tool: t,
        xKey: t.variables[0].key,
        dark: false,
      });
      const all = texts.join(" ");
      assert.doesNotMatch(all, /NaN|undefined|Infinity/, `${t.id} ${unknown}`);
      // The unknown's value is shown, with its unit.
      assert.ok(
        texts.some(
          (s) => s.startsWith(" = ") && (!q.unit || s.endsWith(q.unit)),
        ),
        `${t.id}: no value shown for ${unknown}`,
      );
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

test("every tool's graph draws in both themes, for every unknown and every axis", () => {
  let drawn = 0;
  for (const t of tools)
    for (const unknown of t.solveFor)
      for (const x of t.variables.filter((v) => v.key !== unknown))
        for (const dark of [false, true]) {
          const values = defaults(t);
          for (const c of t.constants) values[c.key] = c.value;
          values[unknown] = t.solve[unknown](values);
          const { ctx, texts } = recordingContext();
          visuals.graph(ctx, {
            width: 560,
            height: 230,
            values,
            unknown,
            tool: t,
            xKey: x.key,
            dark,
          });
          // Both axes carry numbers: at least two on each.
          const numbers = texts.filter((s) => /^[−-]?\d/.test(s));
          assert.ok(numbers.length >= 4, `${t.id} ${unknown} against ${x.key}`);
          assert.doesNotMatch(texts.join(" "), /NaN|undefined/, `${t.id} ${unknown}`);
          drawn++;
        }
  assert.ok(drawn > 500);
});

// ---------------------------------------------------------------------------
// Explanations, and the mini simulations against their formulas.

test("every tool says where its equation comes from, with one change a step", () => {
  for (const t of tools) {
    assert.ok(t.derivation.length >= 3, `${t.id}: at least three steps`);
    for (const step of t.derivation) {
      assert.ok(step.say.length > 8, `${t.id}: a step without a reason`);
      assert.ok(step.latex, `${t.id}: a step without its equation`);
      assert.equal(step.say.split("$").length % 2, 1, `${t.id}: unpaired $`);
    }
  }
});

test("v² = u² + 2as says when its numbers describe no real motion", () => {
  const check = toolById("suvat-v2-u2-2as").check;
  // u = −6, v = −12 over s = +35: a = (144 − 36)/70 = 1.54, but moving
  // backwards throughout it cannot end up 35 m forwards.
  assert.match(check({ u: -6, v: -12, s: 35, a: 108 / 70 }, "a"), /no real motion/);
  assert.equal(check({ u: 2, v: 8, s: 10, a: 3 }, "a"), null);
  // u = 8, v = 2 with a = +3: the velocity is rising away from 2.
  assert.match(check({ u: 8, v: 2, a: 3, s: -10 }, "s"), /no real motion/);
  assert.equal(check({ u: 2, v: 8, a: 3, s: 10 }, "s"), null);
});

test("every tool has a longer description and the idea behind its derivation", () => {
  for (const t of tools) {
    assert.ok(t.about?.length >= 200, `${t.id}: a description of what it is about`);
    assert.ok(t.idea?.length >= 40, `${t.id}: the idea of the derivation`);
    assert.ok(t.derivation.length >= 4, `${t.id}: at least four steps`);
    for (const text of [t.about, t.idea])
      assert.equal(text.split("$").length % 2, 1, `${t.id}: unpaired $`);
    // A proportion sign is explained in words the first time it is used.
    const first = t.derivation.find((s) => s.latex.includes("\\propto"));
    if (first)
      assert.match(first.say, /proportional/, `${t.id}: ∝ used without saying what it means`);
  }
});

test("graphs: tick values are round and inside the range", async () => {
  const { ticksBetween, logTicks, tickText } = await import(
    "../src/minitools/visuals/graph.js"
  );
  assert.deepEqual(ticksBetween(0, 10), [0, 2, 4, 6, 8, 10]);
  assert.deepEqual(logTicks(1, 1e4), [1, 10, 100, 1000, 10000]);
  assert.equal(tickText(0.5), "0.5");
});

test("graphs: an asymptote is found where the formula has one, and nowhere else", async () => {
  const { curve } = await import("../src/minitools/visuals/graph.js");
  // Time dilation against speed runs off at v = c, just beyond the slider.
  const dilation = toolById("time-dilation"),
    v = Object.fromEntries(
      [...dilation.variables, ...dilation.constants].map((q) => [q.key, q.value]),
    ),
    speed = dilation.variables.find((q) => q.key === "v");
  assert.ok(dilation.asymptotes.some((a) => a.x === "v" && a.y === "t"));
  assert.deepEqual(
    curve(dilation.solve.t, speed, v, "v", { extend: v.c }).asymptotes,
    [v.c],
  );
  // 1/(1/x − 1/12) changes sign through infinity at x = 12.
  const inside = curve(
    (q) => 1 / (1 / q.x - 1 / 12),
    { key: "x", min: 1, max: 100, scale: "" },
    {},
    "x",
  );
  assert.equal(inside.asymptotes.length, 1);
  assert.ok(Math.abs(inside.asymptotes[0] - 12) < 1e-6);
  // A power law has none, on a linear or a log axis.
  for (const scale of ["", "log"])
    assert.deepEqual(
      curve((q) => 1 / q.x ** 2, { key: "x", min: 0.5, max: 500, scale }, {}, "x")
        .asymptotes,
      [],
      `1/x² on a ${scale || "linear"} axis`,
    );
});

test("every unknown has its rearranging steps, and each worked-out line is true", async () => {
  const { rearrangement } = await import("../src/minitools/catalogue.js"),
    { holds } = await import("../src/minitools/algebra.js");
  let checked = 0;
  for (const t of tools)
    for (const key of t.solveFor) {
      const v = Object.fromEntries([
        ...t.variables.map((q) => [q.key, q.value]),
        ...t.constants.map((c) => [c.key, c.value]),
      ]);
      v[key] = t.solve[key](v);
      const steps = rearrangement(t, key);
      assert.ok(steps.length >= 1, `${t.id}, ${key}: no steps`);
      for (const step of steps) {
        assert.equal(step.say.split("$").length % 2, 1, `${t.id}: unpaired $`);
        if (!step.equation) continue;
        checked++;
        // The tool's own numbers must satisfy every line of the algebra.
        assert.ok(holds(step.equation, v), `${t.id}, ${key}: ${step.latex}`);
      }
    }
  assert.ok(checked > 300, `only ${checked} lines were checked`);
});

test("each mini simulation measures what its formula gives, at the defaults", async () => {
  const { startRun } = await import("../src/minitools/runner.js");
  // What is left is real: plates of finite width (0.1%), a pendulum's swing
  // of 5° (0.05%), and the sandbox's step of 1/120 s.
  const TOLERANCE = 2e-3;
  let compared = 0;
  for (const t of tools.filter((t) => t.sim))
    for (const key of t.solveFor) {
      if (!t.sim.watch?.[key]) continue;
      const v = Object.fromEntries([
        ...t.variables.map((q) => [q.key, q.value]),
        ...t.constants.map((c) => [c.key, c.value]),
      ]);
      v[key] = t.solve[key](v);
      const run = startRun(t.sim, engines[t.sim.engine], () => v, () => key);
      for (let s = 0; s < 60 && !run.stopped && !run.still; s += 1 / 60) {
        run.advance(1 / 60);
        if (run.measured !== null && !t.sim.duration && !t.sim.until) break;
      }
      // Orbits and oscillations report once a turn is complete.
      for (let s = 0; s < 60 && run.measured === null && !run.stopped; s += 1 / 60)
        run.advance(1 / 60);
      const m = run.measured,
        value = m && typeof m === "object" ? m.value : m;
      run.dispose();
      assert.ok(Number.isFinite(value), `${t.id}, ${key}: nothing measured`);
      assert.ok(
        Math.abs(value - v[key]) <= TOLERANCE * Math.abs(v[key]),
        `${t.id}, ${key}: measured ${value}, formula ${v[key]}`,
      );
      compared++;
    }
  assert.ok(compared >= 60, `only ${compared} compared`);
});
