// Hooks the pages call whatever the mode, for the developer options to listen
// to. With developer mode off nothing listens and each call costs nothing.

let frameListener = null;
// Once per animation frame from a page's loop: `steps` simulation steps
// taken (when the page knows them), `simulated` seconds advanced, `ms` spent
// on the frame's work.
export function reportFrame(info) {
  frameListener?.(info);
}
export function onFrame(fn) {
  frameListener = fn;
}

// Equations that KaTeX could not typeset, for the developer list.
export const failedEquations = [];
export function reportEquationError(source, message) {
  failedEquations.push({
    source,
    message,
    page: globalThis.location?.pathname,
  });
  globalThis.dispatchEvent?.(new Event("physium-equation-error"));
}

// A developer scheme was applied or removed: canvases drawn only on demand
// redraw, and cached drawings (preset thumbnails) are redrawn.
export function onSchemeChange(fn) {
  globalThis.addEventListener?.("physium-scheme", fn);
}
