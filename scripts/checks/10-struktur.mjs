// Every real page: exactly one <h1>, lang, <title>, meta description, unique ids.
import fs from "node:fs";
import path from "node:path";

export const name = "Seitenstruktur";

export default async ({ pub, htmlFiles }) => {
  const errors = [];
  let pages = 0;
  for (const file of htmlFiles()) {
    const html = fs.readFileSync(file, "utf8");
    if (/http-equiv="?refresh/i.test(html)) continue; // alias redirect
    pages++;
    const rel = path.relative(pub, file);
    const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
    if (h1 !== 1) errors.push(`${rel}: ${h1} × <h1> statt genau 1`);
    if (!/<html[^>]*\slang="?[a-z]{2}/i.test(html)) errors.push(`${rel}: <html lang> fehlt`);
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1].trim();
    if (!title) errors.push(`${rel}: <title> fehlt oder leer`);
    const desc = html.match(/<meta name="?description"? content="?([^">]*)/)?.[1].trim();
    if (!desc) errors.push(`${rel}: Meta-Description fehlt oder leer`);
    const ids = [...html.matchAll(/\sid="?([^"\s>]+)/g)].map((m) => m[1]);
    const dup = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    if (dup.length) errors.push(`${rel}: doppelte IDs ${dup.join(", ")}`);
  }
  return { ok: errors.length === 0, errors, note: `${pages} Seiten` };
};
