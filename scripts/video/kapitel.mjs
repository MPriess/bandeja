// One short video per lesson chapter, made from that chapter's court diagram: TV camera at normal
// speed with the chapter's caption, slow motion from the side, then behind you. No title card,
// no end card, no sound – it plays inside the lesson, in place of the diagram (view "Video").
// Output: static/media/kapitel/<lesson>/<chapter>.mp4 + .jpg, found by layouts/lektionen/page.html.
//
//   npm run videos:kapitel                       all chapters (existing videos are kept)
//   npm run videos:kapitel -- bandeja            one lesson
//   npm run videos:kapitel -- bandeja/kapitel-2  one chapter
//   npm run videos:kapitel -- --neu              render again even if the video exists
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { collectCourts } from "../lib/courts.mjs";
import { rendern } from "./render.mjs";
import { pruefen } from "./regeln.mjs";
import { szene } from "./szene.mjs";
import { VORLAUF } from "./zeitplan.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const args = process.argv.slice(2);
const neu = args.includes("--neu");
const filter = args.filter((a) => !a.startsWith("--"));

export function kapitelDrehbuch(sz) {
  const zeitlupe = Math.min(1, Math.max(0.6, (sz.T + VORLAUF) / 5));
  return {
    titel: null,
    abschnitte: [
      { kamera: "tv", abspielen: true, ab: "start", text: sz.cap || null },
      { kamera: "seite", abspielen: true, ab: "start", tempo: zeitlupe },
      { kamera: "hinten", abspielen: true, ab: "start" },
    ],
    abspann: null,
  };
}

const kapitel = collectCourts(root)
  .filter((c) => c.kind === "kapitel")
  .map((c) => {
    const [, lektion, datei] = c.file.match(/^content\/lektionen\/([^/]+)\/(kapitel-[^/]+)\.md$/);
    return { lektion, kapitel: datei, d: c.d };
  })
  .filter((k) => !filter.length || filter.some((f) => f === k.lektion || f === `${k.lektion}/${k.kapitel}`));

let fertig = 0, uebersprungen = 0;
for (const k of kapitel) {
  const ziel = path.join(root, "static", "media", "kapitel", k.lektion);
  const mp4 = path.join(ziel, `${k.kapitel}.mp4`);
  if (fs.existsSync(mp4) && !neu) { uebersprungen++; continue; }
  const fehler = pruefen(k.d);
  if (fehler.length) { console.log(`${k.lektion}/${k.kapitel}: ${fehler.length} Regelverstöße – übersprungen\n  ${fehler.join("\n  ")}`); process.exitCode = 1; continue; }
  const clip = { name: `kapitel--${k.lektion}--${k.kapitel}`, d: k.d, formate: ["quer"], markierungen: true, ton: false, buch: kapitelDrehbuch(szene(k.d)) };
  const [out] = await rendern(clip, { web: true });
  fs.mkdirSync(ziel, { recursive: true });
  fs.copyFileSync(out, mp4);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", out.replace(/\.mp4$/, ".jpg"), "-q:v", "6", mp4.replace(/\.mp4$/, ".jpg")]);
  fertig++;
  console.log(`  → static/media/kapitel/${k.lektion}/${k.kapitel}.mp4 (${Math.round(fs.statSync(mp4).size / 1024)} kB)`);
}
console.log(`Fertig: ${fertig} neu, ${uebersprungen} schon vorhanden.`);
