// Padel rules and ball position in the 3D video scenes (scripts/video/regeln.mjs), for every
// diagram and every clip – plus a self-test with deliberately wrong balls, so the rules cannot
// silently pass everything.
import fs from "node:fs";
import path from "node:path";
import { collectCourts } from "../lib/courts.mjs";
import { pruefen, ballRegeln } from "../video/regeln.mjs";
import { clipLaden } from "../video/render.mjs";

export const name = "Video-Regeln (3D)";

// A straight ball from a to b with height h(s) and bounces at the given s.
function ball(typ, a, b, h, bounces = [], extra = {}) {
  const punkte = Array.from({ length: 65 }, (_, i) => {
    const s = i / 64;
    return { s, x: a[0] + (b[0] - a[0]) * s, z: a[1] + (b[1] - a[1]) * s, y: h(s) };
  });
  const netz = punkte.find((p, i) => i > 0 && Math.sign(p.x) !== Math.sign(punkte[0].x));
  return { typ, punkte, sNetz: netz ? netz.s : null, sZiel: 1, bounces, hoeheBei: h, ziel: null, ...extra };
}

const SELBSTTEST = [
  ["durchs Netz", ball("schlag", [-5, 0], [5, 0], (s) => 1 - s), "geht durchs Netz"],
  ["Wand vor Aufprall", ball("schlag", [-5, 0], [10, 0], () => 1.5), "trifft die Wand, bevor"],
  ["zwei Aufpralle", ball("schlag", [-5, 0], [9, 0], (s) => (s > 0.5 ? 0.2 : 1.5), [0.7, 0.9]), "springt 2×"],
  ["Aufschlag zu hoch", ball("aufschlag", [8, 2], [-3, -2], (s) => 1.3 * (1 - s) + 0.6 * Math.sin(Math.PI * s), [1]), "über Hüfthöhe"],
  ["Aufschlag falsches Feld", ball("aufschlag", [8, 2], [-3, 2], (s) => 0.8 * (1 - s) + 0.8 * Math.sin(Math.PI * s), [1]), "nicht im diagonalen Aufschlagfeld"],
  ["Aufschlag vor der Linie", ball("aufschlag", [5, 2], [-3, -2], (s) => 0.8 * (1 - s) + 0.8 * Math.sin(Math.PI * s), [1]), "vor der Aufschlaglinie"],
  ["über die Wand", ball("lob", [-5, 0], [10, 0], () => 5), "über die Wand"],
  ["unter dem Boden", ball("schlag", [-5, 0], [5, 0], (s) => (s < 0.5 ? 1.5 : 1.5 - 4 * (s - 0.5))), "unter dem Boden"],
];

export default async ({ root }) => {
  const errors = [];
  // Self-test: every wrong ball must be caught with the expected message.
  for (const [titel, b, erwartet] of SELBSTTEST) {
    const f = ballRegeln({ baelle: [b], schlaege: [] });
    if (!f.some((x) => x.includes(erwartet))) errors.push(`Selbsttest „${titel}“: Regel greift nicht (erwartet „${erwartet}“, erhalten: ${f.join("; ") || "nichts"})`);
  }
  const netzSpieler = pruefen({ type: "volley", cap: "Test", px: 222, py: 60, ax: 150, ay: 60, ball: "M 150 60 L 240 60", tx: 240, ty: 60, treffpunkt: true });
  if (!netzSpieler.some((x) => x.includes("Netz"))) errors.push(`Selbsttest „Spieler am Netz“: Regel greift nicht (${netzSpieler.join("; ") || "nichts"})`);

  // All diagrams and clips.
  const szenen = collectCourts(root).filter((c) => c.kind !== "quiz").map((c) => ({ wo: `${c.file} ${c.where}`, d: c.d }));
  const dir = path.join(root, "clips");
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => x.endsWith(".yaml")) : []) {
    try { szenen.push({ wo: `clips/${f}`, d: clipLaden(f.replace(/\.yaml$/, "")).d }); } catch (e) { errors.push(`clips/${f}: ${e.message}`); }
  }
  for (const s of szenen) for (const e of pruefen(s.d)) errors.push(`${s.wo}: ${e}`);
  return { ok: errors.length === 0, errors, note: `${szenen.length} Szenen, ${SELBSTTEST.length + 1} Selbsttests` };
};
