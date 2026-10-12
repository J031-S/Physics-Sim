// Typeset maths with the vendored KaTeX (vendor/katex/), loaded the first
// time a page asks for an equation, so pages without equations never fetch
// it. Equations take their colour from the `equation` token and their size
// from the text around them (and so from the GUI size).
//
//   renderMath(element, latex, { display })  typesets one equation
//   renderAllMath(root)                       every [data-math] element
//                                             ([data-display] for display style)
//
// A LaTeX error shows the source in the error style (never a blank space)
// and is reported to the developer options' list of failed equations.
import { reportEquationError } from "./dev-hooks.js";

const root = new URL("../../", import.meta.url);
let loading = null;

export function loadKatex() {
  if (globalThis.katex) return Promise.resolve(globalThis.katex);
  loading ??= new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = new URL("vendor/katex/katex.min.css", root).href;
    document.head.append(css);
    const script = document.createElement("script");
    script.src = new URL("vendor/katex/katex.min.js", root).href;
    script.onload = () =>
      globalThis.katex
        ? resolve(globalThis.katex)
        : reject(new Error("KaTeX did not start."));
    script.onerror = () => reject(new Error("KaTeX could not be loaded."));
    document.head.append(script);
  });
  return loading;
}

function showError(element, latex, message) {
  element.classList.add("math-error");
  element.textContent = latex;
  element.title = message;
  reportEquationError(latex, message);
}
function typeset(element, latex, display) {
  try {
    globalThis.katex.render(latex, element, {
      displayMode: display,
      throwOnError: true,
    });
    element.classList.remove("math-error", "math-pending");
    element.removeAttribute("title");
  } catch (error) {
    showError(element, latex, error.message);
  }
}

// Typesets at once when KaTeX is already loaded (so live updates do not
// flicker); otherwise shows the source until it is.
export function renderMath(element, latex, { display = false } = {}) {
  element.classList.add("math");
  if (globalThis.katex) {
    typeset(element, latex, display);
    return Promise.resolve();
  }
  element.textContent = latex;
  element.classList.add("math-pending");
  const wanted = latex;
  element.dataset.mathWanted = wanted;
  return loadKatex().then(
    () => {
      // A later call may have asked for something else meanwhile.
      if (element.dataset.mathWanted === wanted)
        typeset(element, latex, display);
    },
    (error) => showError(element, latex, error.message),
  );
}

export function renderAllMath(scope = document) {
  return Promise.all(
    [...scope.querySelectorAll("[data-math]")].map((el) =>
      renderMath(el, el.dataset.math, { display: "display" in el.dataset }),
    ),
  );
}
