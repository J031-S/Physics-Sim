// Writes styles/tokens.css from src/site/theme.js. Run after changing a token.
import { writeFile } from "node:fs/promises";
import { tokensCss } from "../src/site/theme.js";
await writeFile(new URL("../styles/tokens.css", import.meta.url), tokensCss());
console.log("styles/tokens.css written");
