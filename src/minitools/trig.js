// Sines, cosines and tangents of angles in degrees, exact where the textbook
// value is exact. Math.sin(Math.PI) is 1.2 × 10⁻¹⁶, not 0, which a page would
// show as a tiny number in scientific notation where the answer is zero (a
// torque at 180°, a flux at 90°). No DOM.

// sin of a whole multiple of 30°, exactly.
const EXACT = { 0: 0, 30: 0.5, 90: 1, 150: 0.5, 180: 0, 210: -0.5, 270: -1, 330: -0.5 };

export function sinDeg(angle) {
  const a = ((angle % 360) + 360) % 360;
  if (a in EXACT) return EXACT[a];
  return Math.sin((angle * Math.PI) / 180);
}
export const cosDeg = (angle) => sinDeg(angle + 90);
// At 90° (and 270°) the tangent has no value: Infinity, which the pages
// report as "no value".
export function tanDeg(angle) {
  const c = cosDeg(angle);
  return c === 0 ? Infinity * Math.sign(sinDeg(angle)) : sinDeg(angle) / c;
}
