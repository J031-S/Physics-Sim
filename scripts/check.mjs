// Syntax check (node --check) of every JavaScript source file: everything
// under src/ and scripts/, the server, and the vendored icon sets. New files
// are picked up without editing this list.
import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const files = ["server.mjs", "vendor/icons/sets.js"];
const walk = (dir) => {
  for (const entry of readdirSync(new URL(dir, root), { withFileTypes: true }))
    if (entry.isDirectory()) walk(dir + entry.name + "/");
    else if (/\.m?js$/.test(entry.name)) files.push(dir + entry.name);
};
walk("src/");
walk("scripts/");
let failed = 0;
for (const file of files)
  try {
    execFileSync(process.execPath, ["--check", file], {
      cwd: root,
      stdio: "inherit",
    });
  } catch {
    failed++;
  }
console.log(
  `checked ${files.length} files${failed ? `, ${failed} failed` : ""}`,
);
process.exit(failed ? 1 : 0);
