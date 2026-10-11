// Numbers, units and equation templates for the minitool pages. No DOM.

// Three significant figures; × 10ⁿ for very large or very small values.
// As LaTeX, or as plain text.
function parts(x, sig = 3) {
  if (x === 0) return { mantissa: "0", exponent: 0, sci: false };
  const size = Math.abs(x);
  if (size >= 1e4 || size < 1e-3) {
    const [m, e] = x.toExponential(sig - 1).split("e");
    return { mantissa: m, exponent: Number(e), sci: true };
  }
  const fixed = x.toPrecision(sig);
  return {
    mantissa: fixed.includes("e") ? String(Number(fixed)) : fixed,
    exponent: 0,
    sci: false,
  };
}
export function numberTex(x, sig = 3) {
  if (!Number.isFinite(x)) return "\\text{—}";
  const p = parts(x, sig);
  return p.sci ? `${p.mantissa} \\times 10^{${p.exponent}}` : p.mantissa;
}
const SUPER = "⁰¹²³⁴⁵⁶⁷⁸⁹";
export function numberText(x, sig = 3) {
  if (!Number.isFinite(x)) return "—";
  const p = parts(x, sig),
    minus = (s) => s.replace("-", "−");
  if (!p.sci) return minus(p.mantissa);
  const e = String(p.exponent)
    .replace("-", "⁻")
    .replace(/\d/g, (d) => SUPER[d]);
  return `${minus(p.mantissa)} × 10${e}`;
}
// A value for a number field: plain, enough digits to round-trip a slider.
export const fieldText = (x) =>
  Number.isFinite(x) ? String(Number(x.toPrecision(4))) : "";

// A unit as written in the catalogue ("m/s²", "N m² kg⁻²", "Ω", "°") as
// LaTeX.
export function unitTex(unit) {
  if (!unit) return "";
  if (unit === "°") return "^{\\circ}";
  const supers = { "⁻": "-", "¹": "1", "²": "2", "³": "3", "⁴": "4" };
  let out = "",
    sup = "";
  const flush = () => {
    if (sup) out += `^{${sup}}`;
    sup = "";
  };
  for (const ch of unit) {
    if (ch in supers) {
      sup += supers[ch];
      continue;
    }
    flush();
    if (ch === " ") out += "\\,";
    else if (ch === "Ω") out += "\\Omega";
    else if (ch === "µ" || ch === "μ") out += "\\mu ";
    else if (ch === "/") out += "/";
    else out += `\\mathrm{${ch}}`;
  }
  flush();
  return out;
}

// An equation template (see catalogue.js): @key for each quantity and · for
// a product. `symbol(key)` gives a quantity's LaTeX symbol; with `number`,
// each quantity is replaced by its value instead.
export function fillForm(template, symbol, number) {
  const filled = template.replace(
    /@\{([A-Za-z]\w*)\}|@([A-Za-z][A-Za-z0-9]*)/g,
    (_, braced, plain) => {
      const key = braced ?? plain;
      return number ? number(key) : `{${symbol(key)}}`;
    },
  );
  return filled.replace(/·/g, number ? " \\times " : "\\,");
}
// A quantity's value in a working line: bracketed when negative or in
// powers of ten, so that it reads correctly next to operators and powers.
export function workingNumber(x, unit) {
  const tex = numberTex(x);
  const degrees = unit === "°" ? "^{\\circ}" : "";
  return x < 0 || tex.includes("\\times")
    ? `\\left(${tex}${degrees}\\right)`
    : tex + degrees;
}
