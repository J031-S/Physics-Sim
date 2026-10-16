// Writes styles/tokens.css from src/site/theme.js (see src/site/tokens-file.js).
// Run after changing a token.
import { writeFile } from "node:fs/promises";
import { tokensFile } from "../src/site/tokens-file.js";
await writeFile(new URL("../styles/tokens.css", import.meta.url), tokensFile());
console.log("styles/tokens.css written");
