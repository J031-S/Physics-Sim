// The whole of styles/tokens.css: every colour (theme.js `tokensCss`), then
// the house style, the rules that give each size and choice token its
// theme.js value where the stylesheets were written for its `plain` one
// (src/site/surface.js). They apply only while no developer scheme is shown.
// No DOM. Written by `npm run tokens`; tests check the file is up to date.
import { tokensCss, value, colourValue } from "./theme.js";
import { surfaceCss } from "./surface.js";

export function tokensFile() {
  const house = surfaceCss(value, {
    colours: (name) => ({
      light: colourValue(name, "light"),
      dark: colourValue(name, "dark"),
    }),
    // Relative to styles/tokens.css.
    fontRoot: "../vendor/fonts/",
    scope: true,
  });
  return (
    tokensCss() +
    "\n/* The house style: size and choice tokens (src/site/surface.js). */\n" +
    house +
    "\n"
  );
}

// assets/logo.svg with its favicon colours set to the header mark's
// (`accent-text`, which the mark takes as a mask): the style block only
// applies when the file is shown on its own, as the browser tab's icon, and
// follows the browser's light or dark setting. Written by `npm run tokens`.
export function logoFile(svg) {
  const light = colourValue("accent-text", "light"),
    dark = colourValue("accent-text", "dark");
  return svg.replace(
    /<style>[\s\S]*?<\/style>/,
    `<style>
    svg { color: ${light}; }
    @media (prefers-color-scheme: dark) {
      svg { color: ${dark}; }
    }
  </style>`,
  );
}
