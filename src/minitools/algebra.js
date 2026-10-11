// The algebra of rearranging an equation, one move at a time, for the
// "How to rearrange" list on a minitool page. No DOM.
//
// Most of the site's equations are products and quotients, such as
// F = GMm/r². For those the moves are always the same few (multiply both
// sides to clear a fraction, divide both sides to leave the unknown alone,
// swap the sides, take a root), so they are worked out here from a short
// description of the equation instead of being typed out for every unknown.
// Every equation this produces can be checked with numbers (`holds`), and
// tests/minitools.test.mjs does so for every tool and every unknown.
//
// An equation is written as, for example,
//     "F = G M m / r^2"       or      "Vp / Vs = Np / Ns"
// with spaces between the factors, at most one " / " a side, and the
// quantities named by their keys in the catalogue. `^2` and `^3` are powers.
// A word starting with # is a fixed factor from FIXED below (#2, #4pi2,
// #sin, …), which is never the unknown.

const deg = Math.PI / 180;
// Fixed factors: how they are written and what they are worth.
const FIXED = {
  2: { tex: "2", value: () => 2 },
  "2pi": { tex: "2\\pi", value: () => 2 * Math.PI },
  "4pi": { tex: "4\\pi", value: () => 4 * Math.PI },
  "4pi2": { tex: "4\\pi^{2}", value: () => 4 * Math.PI ** 2 },
  sin: { tex: "\\sin\\theta", value: (v) => Math.sin(v.theta * deg) },
  cos: { tex: "\\cos\\theta", value: (v) => Math.cos(v.theta * deg) },
  tan: { tex: "\\tan\\theta", value: (v) => Math.tan(v.theta * deg) },
  sin2: { tex: "\\sin 2\\theta", value: (v) => Math.sin(2 * v.theta * deg) },
};

function parseSide(text) {
  const [top, bottom = ""] = text.split(" / ");
  const factors = (part) =>
    part
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => {
        if (word.startsWith("#")) {
          const fixed = FIXED[word.slice(1)];
          if (!fixed) throw new Error(`Unknown fixed factor ${word}`);
          return { fixed };
        }
        const [key, power = "1"] = word.split("^");
        return { key, power: Number(power) };
      })
      // A bare 1 on top of a fraction is only a placeholder.
      .filter((f) => !(f.key === "1"));
  return { top: factors(top), bottom: factors(bottom) };
}
export function parseEquation(text) {
  const [left, right] = text.split(" = ");
  return { left: parseSide(left), right: parseSide(right) };
}

const copy = (eq) => ({
  left: { top: [...eq.left.top], bottom: [...eq.left.bottom] },
  right: { top: [...eq.right.top], bottom: [...eq.right.bottom] },
});

// LaTeX of a factor, a product and a side. `symbol(key)` is a quantity's
// own LaTeX symbol.
function factorTex(f, symbol) {
  if (f.fixed) return f.fixed.tex;
  const s = symbol(f.key);
  return f.power === 1 ? `{${s}}` : `{${s}}^{${f.power}}`;
}
const productTex = (list, symbol) =>
  list.length ? list.map((f) => factorTex(f, symbol)).join("\\,") : "1";
function sideTex(side, symbol) {
  return side.bottom.length
    ? `\\frac{${productTex(side.top, symbol)}}{${productTex(side.bottom, symbol)}}`
    : productTex(side.top, symbol);
}
const equationTex = (eq, symbol) =>
  `${sideTex(eq.left, symbol)} = ${sideTex(eq.right, symbol)}`;

// What a side is worth for the given values.
function sideValue(side, values) {
  const product = (list) =>
    list.reduce(
      (p, f) => p * (f.fixed ? f.fixed.value(values) : values[f.key] ** f.power),
      1,
    );
  return product(side.top) / product(side.bottom);
}
/** Whether an equation is true for these values (to rounding). */
export function holds(eq, values) {
  const a = sideValue(eq.left, values),
    b = sideValue(eq.right, values);
  return Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b), 1e-300);
}

/**
 * The moves that make `unknown` the subject of `text`.
 *
 * Returns { steps: [{ say, latex, equation }], result } where `say` is a
 * sentence (with $…$ round its mathematics), `latex` the equation after the
 * move, `equation` the same in a form `holds` can check (absent once a root
 * has been taken), and `result` the final right-hand side as LaTeX.
 */
export function rearrange(text, unknown, symbol) {
  const eq = parseEquation(text),
    math = (list) => `$${productTex(list, symbol)}$`,
    x = `$${symbol(unknown)}$`,
    steps = [];
  const show = (say) =>
    steps.push({ say, latex: equationTex(eq, symbol), equation: copy(eq) });
  const where = () => {
    for (const side of ["left", "right"])
      for (const part of ["top", "bottom"]) {
        const i = eq[side][part].findIndex((f) => f.key === unknown);
        if (i >= 0) return { side, part, i };
      }
    throw new Error(`${unknown} is not in "${text}"`);
  };
  const other = (side) => (side === "left" ? "right" : "left");

  let at = where();
  const alone = (a) =>
    a.side === "left" &&
    a.part === "top" &&
    eq.left.top.length === 1 &&
    !eq.left.bottom.length;
  if (alone(at) && eq.left.top[0].power === 1) {
    show(
      `The equation is already written with ${x} by itself on the left, so there is nothing to rearrange.`,
    );
    return { steps, result: sideTex(eq.right, symbol) };
  }
  show("Start from the equation as it is usually written.");

  // 1. Out of the bottom of a fraction.
  if (at.part === "bottom") {
    const [f] = eq[at.side].bottom.splice(at.i, 1);
    eq[other(at.side)].top.push(f);
    show(
      `${x} is on the bottom of a fraction. Multiply both sides by ${math([f])} to bring it up to the top line (on the ${at.side} it cancels with the ${math([f])} underneath).`,
    );
    at = where();
  }
  // 2. Clear the fraction on the unknown's own side.
  if (eq[at.side].bottom.length) {
    const down = eq[at.side].bottom.splice(0);
    eq[other(at.side)].top.push(...down);
    show(
      `Multiply both sides by ${math(down)} to clear the fraction on the ${at.side}.`,
    );
    at = where();
  }
  // 3. Leave the unknown by itself.
  const rest = eq[at.side].top.filter((f) => f.key !== unknown);
  if (rest.length) {
    eq[at.side].top = eq[at.side].top.filter((f) => f.key === unknown);
    eq[other(at.side)].bottom.push(...rest);
    const f = eq[at.side].top[0];
    show(
      `${x} is multiplied by ${math(rest)}. Divide both sides by ${math(rest)} to undo that and leave ${math([f])} by itself.`,
    );
  }
  // 4. The unknown on the left.
  if (at.side === "right") {
    [eq.left, eq.right] = [eq.right, eq.left];
    show(
      "Swap the two sides, so that the unknown is on the left. (An equation says the two sides are equal, so it can be read in either direction.)",
    );
  }
  // 5. Undo a power.
  const power = eq.left.top[0].power;
  let result = sideTex(eq.right, symbol);
  if (power !== 1) {
    const root = power === 2 ? "square root" : "cube root",
      undone = power === 2 ? "squared" : "cubed";
    result =
      power === 2 ? `\\sqrt{${result}}` : `\\sqrt[${power}]{${result}}`;
    steps.push({
      say: `${x} is ${undone}. Take the ${root} of both sides to undo that.${power === 2 ? " (Only the positive root is wanted here.)" : ""}`,
      latex: `{${symbol(unknown)}} = ${result}`,
    });
  }
  return { steps, result };
}
