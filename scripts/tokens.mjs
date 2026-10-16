// Writes styles/tokens.css and the favicon colours in assets/logo.svg from
// src/site/theme.js (see src/site/tokens-file.js). Run after changing a token.
import { readFile, writeFile } from "node:fs/promises";
import { tokensFile, logoFile } from "../src/site/tokens-file.js";
await writeFile(new URL("../styles/tokens.css", import.meta.url), tokensFile());
const logo = new URL("../assets/logo.svg", import.meta.url);
await writeFile(logo, logoFile(await readFile(logo, "utf8")));
console.log("styles/tokens.css and assets/logo.svg written");
