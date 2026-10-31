// Court videos (scripts/video/): every diagram becomes a valid 3D scene, with the same timing as
// the animations on the site, a ball that clears the net and never goes below the floor, and
// every clip script in clips/ points to an existing diagram and known cameras. Nothing is rendered.
import fs from "node:fs";
import path from "node:path";
import { collectCourts } from "../lib/courts.mjs";
import { szene, NETZ_MITTE } from "../video/szene.mjs";
import { zeitplan } from "../video/zeitplan.mjs";
import { KAMERAS, kamera } from "../video/kameras.mjs";
import { clipLaden } from "../video/render.mjs";

export const name = "Video-Szenen";

export default async ({ root, pub, htmlFiles }) => {
  const errors = [];
  const courts = collectCourts(root);
  const zyklen = new Set();
  for (const c of courts) {
    const where = `${c.file} ${c.where}`;
    let sz;
    try { sz = szene(c.d); } catch (e) { errors.push(`${where}: Szene nicht baubar (${e.message})`); continue; }
    zyklen.add(sz.T.toFixed(2));
    for (const b of sz.baelle) {
      const min = Math.min(...b.punkte.map((p) => p.y));
      if (min < -0.001) errors.push(`${where}: Ball (${b.typ}) unter dem Boden (${min.toFixed(2)} m)`);
      if (b.sNetz !== null && b.hoeheBei(b.sNetz) < NETZ_MITTE + 0.1) errors.push(`${where}: Ball (${b.typ}) geht durchs Netz (${b.hoeheBei(b.sNetz).toFixed(2)} m)`);
      if (b.typ === "lob" && Math.max(...b.punkte.map((p) => p.y)) < 4) errors.push(`${where}: Lob zu flach (< 4 m)`);
    }
    for (const s of sz.schlaege) if (!sz.personen.some((p) => p.id === s.wer)) errors.push(`${where}: Schlag von unbekannter Person ${s.wer}`);
  }
  // Same timing as the site: every animation cycle on the built pages is a scene length.
  let geprueft = 0;
  for (const file of htmlFiles()) {
    const html = fs.readFileSync(file, "utf8");
    for (const m of html.matchAll(/data-cycle="?([\d.]+)/g)) {
      geprueft++;
      if (!zyklen.has(Number(m[1]).toFixed(2))) errors.push(`${path.relative(pub, file)}: Animationszyklus ${Number(m[1]).toFixed(2)} s passt zu keiner Video-Szene – Zeiten in court.html und szene.mjs weichen ab`);
    }
  }
  // Clip scripts.
  const dir = path.join(root, "clips");
  const clips = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".yaml")) : [];
  for (const f of clips) {
    const n = f.replace(/\.yaml$/, "");
    try {
      const c = clipLaden(n);
      for (const a of c.buch.abschnitte) {
        const k = a.kamera ?? a.fahrt;
        if (!kamera(k)) errors.push(`clips/${f}: unbekannte Kamera „${k}“ (erlaubt: ${Object.keys(KAMERAS).join(", ")})`);
      }
      for (const fmt of c.formate) if (!["quer", "short"].includes(fmt)) errors.push(`clips/${f}: unbekanntes Format „${fmt}“`);
      const plan = zeitplan(szene(c.d), c.buch);
      if (c.formate.includes("short") && plan.dauer > 60) errors.push(`clips/${f}: Short ist ${plan.dauer.toFixed(1)} s lang (höchstens 60 s)`);
    } catch (e) {
      errors.push(`clips/${f}: ${e.message}`);
    }
  }
  return { ok: errors.length === 0, errors: [...new Set(errors)], note: `${courts.length} Szenen, ${geprueft} Zyklen verglichen, ${clips.length} Drehbücher` };
};
