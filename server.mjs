// Local static server that resolves addresses the way GitHub Pages does, so
// the site behaves the same here as at https://physium.j031.dev:
//   1. the path itself, if it is a file;
//   2. the path plus ".html" (so /sims/Mechanics serves sims/Mechanics.html);
//   3. a folder: redirect to add the trailing slash, then its index.html;
//   4. otherwise 404.html with status 404.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve(import.meta.dirname);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
};

const kind = async (path) => {
  try {
    const s = await stat(path);
    return s.isDirectory() ? "dir" : s.isFile() ? "file" : null;
  } catch {
    return null;
  }
};

async function locate(pathname) {
  const path = resolve(root, "." + pathname);
  if (path !== root && !path.startsWith(root + sep)) return null;
  if ((await kind(path)) === "file") return { file: path };
  if (!pathname.endsWith("/") && (await kind(path + ".html")) === "file")
    return { file: path + ".html" };
  if ((await kind(path)) === "dir") {
    if (!pathname.endsWith("/")) return { redirect: pathname + "/" };
    const index = resolve(path, "index.html");
    if ((await kind(index)) === "file") return { file: index };
  }
  return null;
}

const send = async (res, status, file) => {
  res.writeHead(status, {
    "Content-Type": types[extname(file)] || "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  res.end(await readFile(file));
};

http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const found = await locate(decodeURIComponent(url.pathname));
      if (found?.redirect) {
        res.writeHead(301, { Location: found.redirect + url.search });
        res.end();
      } else if (found) await send(res, 200, found.file);
      else await send(res, 404, resolve(root, "404.html"));
    } catch {
      res.writeHead(500);
      res.end("Server error");
    }
  })
  .listen(Number(process.env.PORT || 3000), "0.0.0.0", () =>
    console.log("Physium: http://localhost:" + (process.env.PORT || 3000)),
  );
