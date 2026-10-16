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
