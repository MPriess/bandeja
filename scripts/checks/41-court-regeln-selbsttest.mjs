// Self-test of the court rules: deliberately wrong diagrams must be rejected,
// a correct one must pass. Protects the rules from silently losing their teeth.
import { checkCourt } from "./40-court-regeln.mjs";

export const name = "Court-Regeln (Selbsttest)";

const base = { cap: "Test", px: 395, py: 160, qx: 270, qy: 65, ax: 45, ay: 65, bx: 165, by: 165 };
const serve = { ...base, type: "aufschlag", ball: "M 395 160 Q 260 150 135 60", tx: 135, ty: 60 };

const CASES = [
  ["korrekter Aufschlag", serve, false],
  ["Aufschlag vor der Aufschlaglinie", { ...serve, px: 340, ball: "M 340 160 Q 240 150 135 60" }, true],
  ["Aufschlag nicht diagonal", { ...serve, ball: "M 395 160 Q 260 170 135 170", tx: 135, ty: 170 }, true],
  ["Aufschlag zu lang", { ...serve, ball: "M 395 160 Q 260 150 40 60", tx: 40, ty: 60 }, true],
  ["Gegner auf deiner Seite", { ...serve, bx: 260 }, true],
  ["Ball kreuzt das Netz nicht", { ...serve, ball: "M 395 160 L 300 60", tx: 300, ty: 60 }, true],
  ["Ziel nicht auf dem Ballweg", { ...serve, tx: 150, ty: 90 }, true],
  ["Laufweg über das Netz", { ...base, type: "bewegung", mv: "M 395 160 L 100 160" }, true],
  ["Lob zu kurz", { ...base, type: "lob", ball: "M 395 160 Q 260 0 150 70", tx: 150, ty: 70 }, true],
  ["Bandeja von hinten", { ...base, type: "bandeja", px: 410, ball: "M 410 160 Q 200 40 40 180", tx: 40, ty: 180 }, true],
  ["Bandeja nicht tief", { ...base, type: "bandeja", px: 300, ball: "M 300 160 Q 200 40 150 100", tx: 150, ty: 100 }, true],
  ["Chiquita zu lang", { ...base, type: "chiquita", ball: "M 395 160 Q 300 140 100 120", tx: 100, ty: 120 }, true],
  ["Rückwand ohne Wand", { ...base, type: "rueckwand", treffpunkt: true, ball: "M 45 65 Q 300 40 380 150", tx: 380, ty: 150 }, true],
  ["ohne type", { ...base }, true],
  ["Ball fliegt durch den Partner", { ...base, type: "lob", ball: "M 395 160 Q 300 60 40 60", tx: 40, ty: 60, qx: 300, qy: 95 }, true],
  ["Laufweg endet auf dem Partner", { ...base, type: "bewegung", mv: "M 395 160 L 275 70" }, true],
  ["nach eigener Bandeja rückwärts", { ...base, type: "bandeja", px: 300, py: 160, ball: "M 300 160 Q 200 220 40 180", tx: 40, ty: 180, mv: "M 300 160 L 330 160" }, true],
  ["Lob-Bogen über die Seitenlinie", { ...base, type: "lob", ball: "M 395 160 Q 230 -120 40 60", tx: 40, ty: 60 }, true],
];

export default async () => {
  const errors = [];
  for (const [label, d, shouldFail] of CASES) {
    const found = checkCourt(d);
    if (shouldFail && !found.length) errors.push(`„${label}“ wird nicht erkannt`);
    if (!shouldFail && found.length) errors.push(`„${label}“ wird fälschlich abgelehnt: ${found.join("; ")}`);
  }
  return { ok: errors.length === 0, errors, note: `${CASES.length} Fälle` };
};
