// Serves the built site (public/) on a free local port and opens Chromium.
// Playwright and Chromium are provided by the environment (not an npm dependency).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png", ".xml": "application/xml", ".txt": "text/plain" };

export async function serve(pub) {
  const server = http.createServer((req, res) => {
    let file = path.join(pub, decodeURIComponent(req.url.split("?")[0]));
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!file.startsWith(pub) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

export async function withBrowser(pub, fn) {
  const { chromium } = createRequire(import.meta.url)("playwright");
  const site = await serve(pub);
  const browser = await chromium.launch();
  try { return await fn(browser, site.url); } finally { await browser.close(); site.close(); }
}

// One representative page per page type, relative to the site root.
export const SAMPLES = {
  start: "/",
  lernpfad: "/lernpfad/",
  stufe: "/lernpfad/stufe-3/",
  kapitel: "/lektionen/bandeja/kapitel-2/",
  quiz: "/lektionen/bandeja/quiz/",
  drill: "/drills/bandeja-an-die-seitenwand/",
  wissen: "/wissen/",
  artikel: "/wissen/schlagtechniken/der-aufschlag-technik/",
  fehler: "/404.html",
  schnellstart: "/schnellstart/",
};
