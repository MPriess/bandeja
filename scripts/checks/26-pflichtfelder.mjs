// Required fields per content type, valid references, unique article IDs.
// (Quiz questions are checked in 25-quiz.mjs, court diagrams in 40-court-regeln.mjs.)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { frontMatter } from "../lib/courts.mjs";

export const name = "Pflichtfelder";

function mdFiles(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) mdFiles(p, acc);
    else if (p.endsWith(".md")) acc.push(p);
  }
  return acc;
}

const text = (v) => typeof v === "string" && v.trim().length > 0;
const posInt = (v) => Number.isInteger(v) && v > 0;
const list = (v, min = 1) => Array.isArray(v) && v.length >= min;

export default async ({ root }) => {
  const errors = [];
  const content = path.join(root, "content");
  const exists = (p) => typeof p === "string" && (fs.existsSync(path.join(content, p + ".md")) || fs.existsSync(path.join(content, p, "_index.md")));
  const ids = new Map();
  const themen = (frontMatter(path.join(content, "videos", "_index.md")).themen ?? []).map((t) => t.id);
  let n = 0;
  for (const file of mdFiles(content)) {
    const rel = path.relative(content, file);
    const fm = frontMatter(file);
    const need = (cond, msg) => { if (!cond) errors.push(`content/${rel}: ${msg}`); };
    const isIndex = rel.endsWith("_index.md");
    n++;
    if (rel.startsWith("wissen/") && !isIndex) {
      for (const k of ["title", "description", "slug"]) need(text(fm[k]), `\`${k}\` fehlt`);
      need(/^[A-Z]{1,2}\d{2}$/.test(fm.id ?? ""), `\`id\` fehlt oder hat nicht die Form R01/TR04`);
      need(posInt(fm.weight), "`weight` fehlt");
      need(list(fm.sections) && fm.sections.every((s) => text(s.h) && text(s.p)), "`sections` fehlt oder Abschnitt ohne `h`/`p`");
      need(!fm.lektion || exists(fm.lektion), `\`lektion: ${fm.lektion}\` gibt es nicht`);
      if (fm.id && !fm.draft) { if (ids.has(fm.id)) need(false, `\`id: ${fm.id}\` schon vergeben in ${ids.get(fm.id)}`); ids.set(fm.id, rel); }
    } else if (rel.startsWith("drills/") && !isIndex) {
      for (const k of ["title", "description", "with", "pause", "focus"]) need(text(fm[k]), `\`${k}\` fehlt`);
      for (const k of ["minutes", "sets", "balls"]) need(posInt(fm[k]), `\`${k}\` muss eine ganze Zahl > 0 sein`);
      need(list(fm.steps), "`steps` fehlt");
      need(!fm.lesson || exists(fm.lesson), `\`lesson: ${fm.lesson}\` gibt es nicht`);
    } else if (rel.startsWith("videos/") && !isIndex) {
      for (const k of ["title", "description", "situation"]) need(text(fm[k]), `\`${k}\` fehlt`);
      need(posInt(fm.weight), "`weight` fehlt");
      // Learning videos: own animation (local MP4 + poster), theme from content/videos/_index.md,
      // length as m:ss that matches the file, linked to a lesson or an article.
      const statisch = (f) => typeof f === "string" && !f.startsWith("/") && fs.existsSync(path.join(root, "static", f));
      need(fm.youtube === undefined, "`youtube` gibt es nicht mehr – nur eigene Videos (`datei`)");
      need(/\.mp4$/.test(fm.datei ?? "") && statisch(fm.datei), `\`datei: ${fm.datei}\` fehlt in static/ (MP4, Pfad ohne / am Anfang, erzeugen mit npm run videos:web)`);
      need(/\.(jpe?g|png|webp)$/.test(fm.poster ?? "") && statisch(fm.poster), `\`poster: ${fm.poster}\` fehlt in static/ (Vorschaubild)`);
      need(exists(fm.lektion) || exists(fm.wissen), "`lektion` oder `wissen` fehlt oder gibt es nicht");
      need(themen.includes(fm.thema), `\`thema: ${fm.thema}\` ist kein Thema aus content/videos/_index.md (${themen.join(", ")})`);
      const m = /^(\d+):([0-5]\d)$/.exec(fm.dauer ?? "");
      need(m, "`dauer` fehlt oder ist nicht m:ss (z. B. \"0:21\")");
      if (m && statisch(fm.datei)) {
        const ist = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(root, "static", fm.datei)], { encoding: "utf8" }));
        need(Math.abs(ist - (Number(m[1]) * 60 + Number(m[2]))) <= 1.5, `\`dauer: ${fm.dauer}\` passt nicht zur Datei (${Math.round(ist)} s)`);
      }
      need(fm.achte === undefined || list(fm.achte), "`achte` muss eine Liste sein");
    } else if (/^lektionen\/[^/]+\/_index\.md$/.test(rel)) {
      for (const k of ["title", "description"]) need(text(fm[k]), `\`${k}\` fehlt`);
      need([1, 2, 3, 4].includes(fm.stufe), "`stufe` muss 1–4 sein");
      need(exists(fm.drill), `\`drill: ${fm.drill}\` gibt es nicht`);
      need(list(fm.phases, 2) && fm.phases.every((p) => text(p.title) && list(p.items)), "`phases`: mind. 2 Phasen mit `title` und `items`");
    } else if (/^lektionen\/[^/]+\/[^/]+\.md$/.test(rel) && fm.layout !== "quiz") {
      for (const k of ["title", "dauer", "intro"]) need(text(fm[k]), `\`${k}\` fehlt`);
      need(posInt(fm.weight), "`weight` fehlt");
      need(list(fm.points), "`points` fehlt");
      need(text(fm.court?.cap), "Court-Grafik (`court` mit `cap`) fehlt");
    } else if (fm.layout === "quiz") {
      need(text(fm.ergebnis), "`ergebnis` (Text unter dem Ergebnis) fehlt");
    } else if (/^lernpfad\/stufe-\d\/_index\.md$/.test(rel)) {
      for (const k of ["title", "name", "description", "checkTitle"]) need(text(fm[k]), `\`${k}\` fehlt`);
      need(list(fm.lessons) && list(fm.check), "`lessons` und `check` dürfen nicht leer sein");
      for (const p of [...(fm.lessons ?? []), ...(fm.drills ?? [])]) need(exists(p), `Verweis \`${p}\` gibt es nicht (Hugo würde ihn still weglassen)`);
    }
  }
  return { ok: errors.length === 0, errors, note: `${n} Dateien` };
};
