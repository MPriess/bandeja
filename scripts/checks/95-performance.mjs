// Performance budget: CSS ≤ 40 kB, each HTML page ≤ 60 kB, images ≤ 200 kB, fonts ≤ 60 kB (uncompressed).
import fs from "node:fs";
import path from "node:path";

export const name = "Performance-Budget";
const KB = 1024;
const BUDGET = [
  [/\.css$/, 40 * KB, "CSS"],
  [/\.html$/, 60 * KB, "HTML"],
  [/\.(png|jpe?g|webp|avif|gif|svg)$/, 200 * KB, "Bild"],
  [/\.woff2$/, 60 * KB, "Schrift"],
];

function all(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) all(p, acc);
    else acc.push(p);
  }
  return acc;
}

export default async ({ pub }) => {
  const errors = [];
  const max = {};
  for (const file of all(pub)) {
    const rule = BUDGET.find(([re]) => re.test(file));
    if (!rule) continue;
    const size = fs.statSync(file).size;
    max[rule[2]] = Math.max(max[rule[2]] ?? 0, size);
    if (size > rule[1]) errors.push(`${path.relative(pub, file)}: ${rule[2]} ${(size / KB).toFixed(0)} kB (max. ${rule[1] / KB} kB)`);
  }
  const note = Object.entries(max).map(([k, v]) => `${k} ${(v / KB).toFixed(0)} kB`).join(", ");
  return { ok: errors.length === 0, errors, note: `größte: ${note}` };
};
