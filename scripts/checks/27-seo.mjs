// Every real page: canonical URL, Open Graph basics, preview image exists, valid structured data.
import fs from "node:fs";
import path from "node:path";

export const name = "SEO";

export default async ({ pub, htmlFiles }) => {
  const errors = [];
  const base = fs.readFileSync(path.join(pub, "index.html"), "utf8").match(/rel="?canonical"? href="?([^"\s>]+)/)?.[1];
  let pages = 0;
  for (const file of htmlFiles()) {
    const html = fs.readFileSync(file, "utf8");
    if (/http-equiv="?refresh/i.test(html)) continue;
    const rel = path.relative(pub, file);
    pages++;
    const meta = (prop) => html.match(new RegExp(`property="?${prop}"? content="([^"]*)"`))?.[1];
    const canonical = html.match(/rel="?canonical"? href="?([^"\s>]+)/)?.[1];
    if (!canonical || !/^https?:\/\//.test(canonical)) errors.push(`${rel}: Canonical fehlt oder ist nicht absolut`);
    for (const p of ["og:title", "og:description", "og:image", "og:url"]) if (!meta(p)) errors.push(`${rel}: ${p} fehlt`);
    const img = meta("og:image");
    if (img && base && !fs.existsSync(path.join(pub, img.replace(new URL(base).origin + new URL(base).pathname, "")))) errors.push(`${rel}: Vorschaubild ${img} fehlt im Build`);
    const ld = html.match(/<script type="?application\/ld\+json"?>([\s\S]*?)<\/script>/)?.[1];
    try { const j = JSON.parse(ld); if (!j["@type"] || j["@context"] !== "https://schema.org") throw new Error("ohne @type/@context"); }
    catch (e) { errors.push(`${rel}: strukturierte Daten fehlen oder ungültig (${e.message})`); }
  }
  return { ok: errors.length === 0, errors, note: `${pages} Seiten` };
};
