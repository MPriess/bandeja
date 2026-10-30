// Every rendered court has the official lines in the right place.
import fs from "node:fs";
import path from "node:path";
import { PX, NET_X, SERVICE_LEFT_X, SERVICE_RIGHT_X, CENTRE_Y, FIELD } from "../lib/padel.mjs";

export const name = "Court-Geometrie";
const TOL = 0.5; // px, about 2 cm

const near = (a, b) => Math.abs(a - b) <= TOL;
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)="?([^"\s/>]+)/g)].map((m) => [m[1], m[2]]));

const EXPECTED = [
  ["Netz", { x1: NET_X, y1: FIELD.y1, x2: NET_X, y2: FIELD.y2 }],
  ["Aufschlaglinie links", { x1: SERVICE_LEFT_X, y1: FIELD.y1, x2: SERVICE_LEFT_X, y2: FIELD.y2 }],
  ["Aufschlaglinie rechts", { x1: SERVICE_RIGHT_X, y1: FIELD.y1, x2: SERVICE_RIGHT_X, y2: FIELD.y2 }],
  ["Mittellinie", { x1: SERVICE_LEFT_X, y1: CENTRE_Y, x2: SERVICE_RIGHT_X, y2: CENTRE_Y }],
];

export default async ({ pub, htmlFiles }) => {
  const errors = [];
  let courts = 0;
  for (const file of htmlFiles()) {
    const html = fs.readFileSync(file, "utf8");
    const rel = path.relative(pub, file);
    for (const [n, svg] of [...html.matchAll(/<svg viewBox="?0 0 440 230[\s\S]*?<\/svg>/g)].map((m, i) => [i + 1, m[0]])) {
      courts++;
      const where = `${rel} Court ${n}`;
      const rect = attrs(svg.match(/<rect[^>]*>/)[0]);
      if (!(near(+rect.x, FIELD.x1) && near(+rect.y, FIELD.y1) && near(+rect.width, FIELD.x2 - FIELD.x1) && near(+rect.height, FIELD.y2 - FIELD.y1)))
        errors.push(`${where}: Spielfeld ist nicht 20 × 10 m (${rect.width} × ${rect.height} px)`);
      const lines = [...svg.matchAll(/<line[^>]*>/g)].map((m) => attrs(m[0]));
      for (const [label, e] of EXPECTED) {
        const hit = lines.find((l) => ["x1", "y1", "x2", "y2"].every((k) => near(+l[k], e[k])));
        if (!hit) {
          const got = lines.find((l) => label.startsWith("Aufschlag") ? near(+l.y1, e.y1) && near(+l.y2, e.y2) && Math.abs(+l.x1 - e.x1) < 30 : false);
          const off = got ? ` – liegt bei x = ${got.x1}, ${(Math.abs(+got.x1 - e.x1) / PX).toFixed(2)} m daneben` : "";
          errors.push(`${where}: ${label} fehlt oder falsch${off}`);
        }
      }
      if (lines.length !== EXPECTED.length) errors.push(`${where}: ${lines.length} Linien statt ${EXPECTED.length}`);
    }
  }
  if (!courts) errors.push("Keine Court-Grafik im Build gefunden");
  return { ok: errors.length === 0, errors, note: `${courts} Courts` };
};
