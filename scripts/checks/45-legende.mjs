// The legend lists exactly what the court diagram on the page shows.
// Court elements carry data-r, legend entries data-legend (see court.html).
import fs from "node:fs";
import path from "node:path";

export const name = "Court-Legende";
const NAMES = { du: "Du", partner: "Partner", frueher: "Vorher", gegner: "Gegner", ball: "Ball", lauf: "Laufweg", zone: "Zielzone" };

export default async ({ pub, htmlFiles }) => {
  const errors = [];
  let legends = 0;
  for (const file of htmlFiles()) {
    const rel = path.relative(pub, file);
    const html = fs.readFileSync(file, "utf8");
    const legend = new Set([...html.matchAll(/data-legend="?(\w+)/g)].map((m) => m[1]));
    const needsLegend = /^(wissen\/[^/]+\/[^/]+|lektionen\/[^/]+\/kapitel-[^/]+)\/index\.html$/.test(rel);
    const svgs = [...html.matchAll(/<svg viewBox="?0 0 440 230[\s\S]*?<\/svg>/g)].map((m) => m[0]);
    if (!legend.size) {
      if (needsLegend && svgs.length) errors.push(`${rel}: Court ohne Legende`);
      continue;
    }
    legends++;
    const shown = new Set(svgs.flatMap((s) => [...s.matchAll(/data-r="?(\w+)/g)].map((m) => m[1])));
    for (const r of shown) if (!legend.has(r)) errors.push(`${rel}: ${NAMES[r] ?? r} ist in der Grafik, fehlt aber in der Legende`);
    for (const r of legend) if (!shown.has(r)) errors.push(`${rel}: ${NAMES[r] ?? r} steht in der Legende, ist aber nicht in der Grafik`);
  }
  return { ok: errors.length === 0, errors, note: `${legends} Legenden` };
};
