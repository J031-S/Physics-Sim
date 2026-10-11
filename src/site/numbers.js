// A number as plain text without floating-point noise: 1.9620000000000002
// → "1.962". At most `places` decimal places (5 by default) for ordinary
// sizes; very small values keep their significant figures. No DOM.
export function tidyNumber(x, places = 5) {
  if (typeof x !== "number" || !Number.isFinite(x)) return String(x);
  const clean = Number(x.toPrecision(10));
  if (clean !== 0 && Math.abs(clean) < 10 ** -places)
    return String(Number(clean.toPrecision(4)));
  return String(Number(clean.toFixed(places)));
}
