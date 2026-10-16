// The part of a quantity's range that a slider may cover. No DOM.
//
// A slider only ever gives values that the page can work with: the unknown
// has a value, and the mini simulation (if there is one) can show it. Values
// outside that can still be typed into the number field, and then the page
// says why there is no answer or why the simulation cannot show it. The
// range depends on the other quantities and on which one is the unknown, so
// the page works it out again after each change.

// Where a fraction t (0 to 1) of the way along the catalogue range falls.
function along(q, t) {
  const log = q.scale === "log" && q.min > 0;
  const x = log ? q.min * (q.max / q.min) ** t : q.min + (q.max - q.min) * t;
  return q.step ? Math.round(x / q.step) * q.step : x;
}

/**
 * The stretch [lo, hi] of quantity `key`'s catalogue range that works with
 * the other values as they are, or null if nowhere does. `values` holds every
 * quantity; `works(values)` says whether a full set (the unknown worked out)
 * is usable, and is given the catalogue's solve for the unknown.
 *
 * The range is sampled at `samples` points; of the stretches that work, the
 * one holding the present value is taken, or else the one nearest to it.
 * Each end is then found more closely by halving the gap to the next point.
 */
export function allowedRange(tool, values, unknown, key, works, samples = 64) {
  const q = tool.variables.find((v) => v.key === key);
  const ok = (x) => {
    const v = { ...values, [key]: x };
    let result;
    try {
      result = tool.solve[unknown](v);
    } catch {
      return false;
    }
    if (!Number.isFinite(result)) return false;
    v[unknown] = result;
    try {
      return works(v);
    } catch {
      return false;
    }
  };
  const ts = [...Array(samples + 1)].map((_, i) => i / samples),
    good = ts.map((t) => ok(along(q, t)));
  if (good.every(Boolean)) return [q.min, q.max];
  // Stretches of working samples, as [first, last] indices.
  const runs = [];
  good.forEach((g, i) => {
    if (!g) return;
    if (runs.length && runs[runs.length - 1][1] === i - 1)
      runs[runs.length - 1][1] = i;
    else runs.push([i, i]);
  });
  if (!runs.length) return null;
  // Where the present value is, as a fraction of the way along.
  const log = q.scale === "log" && q.min > 0,
    x = values[key],
    t0 = log
      ? Math.log(x / q.min) / Math.log(q.max / q.min)
      : (x - q.min) / (q.max - q.min),
    at = Number.isFinite(t0) ? t0 * samples : 0;
  const distance = ([a, b]) => (at < a ? a - at : at > b ? at - b : 0);
  const [a, b] = runs.reduce((best, run) =>
    distance(run) < distance(best) ? run : best,
  );
  // Close in on each end: between a working sample and its failing
  // neighbour.
  const edge = (inside, outside) => {
    let i = inside,
      o = outside;
    for (let k = 0; k < 8; k++) {
      const m = (i + o) / 2;
      if (ok(along(q, m))) i = m;
      else o = m;
    }
    return along(q, i);
  };
  const lo = a > 0 ? edge(ts[a], ts[a - 1]) : q.min,
    hi = b < samples ? edge(ts[b], ts[b + 1]) : q.max;
  return [lo, hi];
}
