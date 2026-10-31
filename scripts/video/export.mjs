// Exports one clip as a zip for other tools: scene data in metres, every frame (joints, racket,
// ball, camera) as JSON and CSV, the animated 3D scene as glTF (.glb, opens in Blender), the script,
// the voice-over text and the preview video if there is one.
//
//   npm run export -- vibora-oder-bandeja            → video-out/export/vibora-oder-bandeja.zip
//   npm run export -- vibora-oder-bandeja --fps 60
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { clipLaden, server, seite } from "./render.mjs";
import { szene } from "./szene.mjs";
import { zeitplan } from "./zeitplan.mjs";
import { sprecherText } from "./ton.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const name = process.argv[2];
const fpsArg = process.argv.indexOf("--fps");
const fps = fpsArg > 0 ? Number(process.argv[fpsArg + 1]) : 30;
if (!name) { console.log("Aufruf: npm run export -- <clip> [--fps 30]"); process.exit(1); }

const clip = clipLaden(name);
const sz = szene(clip.d);
const plan = zeitplan(sz, clip.buch);
const dir = path.join(root, "video-out", "export", name);
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const json = (f, d) => fs.writeFileSync(path.join(dir, f), JSON.stringify(d, null, 1));

// Scene and timeline (functions dropped, numbers rounded).
const rund = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === "function" ? undefined : typeof v === "number" ? +v.toFixed(4) : v)));
json("grafik.json", clip.d);
json("szene.json", rund(sz));
json("zeitplan.json", rund(plan));
fs.copyFileSync(path.join(root, "clips", `${name}.yaml`), path.join(dir, "drehbuch.yaml"));
fs.writeFileSync(path.join(dir, "sprechertext.txt"), sprecherText(name, clip.buch, plan));

// Frames and glTF from the renderer.
const { chromium } = createRequire(import.meta.url)("playwright");
const site = await server();
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
try {
  const { page } = await seite(browser, site.url, { format: "quer", d: clip.d, buch: clip.buch, markierungen: clip.markierungen }, 0.25);
  console.log("Bilder abtasten …");
  const daten = await page.evaluate((f) => window.exportDaten(f), fps);
  json("bilder.json", daten);
  // CSV: one row per frame, ball and every joint as x;y;z columns.
  const ids = Object.keys(daten.frames[0].spieler);
  const gelenke = Object.keys(daten.frames[0].spieler[ids[0]].gelenke);
  const kopf = ["bild", "zeit", "szene_zeit", "abschnitt", "kamera", "kamera_x", "kamera_y", "kamera_z", "fov", "ball_x", "ball_y", "ball_z"];
  for (const id of ids) {
    kopf.push(`${id}_wurzel_x`, `${id}_wurzel_z`, `${id}_yaw`);
    for (const g of gelenke) kopf.push(`${id}_${g}_x`, `${id}_${g}_y`, `${id}_${g}_z`);
  }
  const zeilen = [kopf.join(";")];
  for (const fr of daten.frames) {
    const z = [fr.bild, fr.zeit, fr.szeneZeit, fr.abschnitt, fr.kamera.name, ...fr.kamera.pos, fr.kamera.fov, ...(fr.ball ?? ["", "", ""])];
    for (const id of ids) {
      const sp = fr.spieler[id];
      z.push(sp.wurzel[0], sp.wurzel[2], sp.yaw);
      for (const g of gelenke) z.push(...sp.gelenke[g]);
    }
    zeilen.push(z.join(";"));
  }
  fs.writeFileSync(path.join(dir, "bilder.csv"), zeilen.join("\n") + "\n");
  console.log("3D-Szene als glTF …");
  const b64 = await page.evaluate((f) => window.exportGlb(f), fps);
  fs.writeFileSync(path.join(dir, "szene.glb"), Buffer.from(b64, "base64"));
} finally {
  await browser.close();
  site.close();
}
for (const f of [`${name}-quer-vorschau.mp4`, `${name}-short-vorschau.mp4`, `${name}-quer.mp4`, `${name}-short.mp4`]) {
  const q = path.join(root, "video-out", f);
  if (fs.existsSync(q) && fs.statSync(q).size > 100000) fs.copyFileSync(q, path.join(dir, f));
}
fs.writeFileSync(path.join(dir, "LIESMICH.md"), `# Szene „${clip.buch.titel ?? name}“

Erzeugt mit \`npm run export -- ${name}\` aus \`clips/${name}.yaml\` und \`${path.relative(root, path.join(root, "content"))}/…\`.

## Koordinaten

Meter. x entlang des Courts (−10 … 10, Netz bei 0), z quer (−5 … 5), y nach oben. Court 20 × 10 m,
Aufschlaglinien bei x = ±6,95, Netz 0,88 m (Mitte) / 0,92 m (Pfosten), Rückwand 3 m Glas + 1 m Gitter.
Spieler: p = du, q = Partner, a und b = Gegner.

## Dateien

| Datei | Inhalt |
| --- | --- |
| \`szene.glb\` | 3D-Szene mit Animation „Szene“ (${fps} Bilder/s): Court, Banden, Spieler, Schläger, Ball, Kamera. In Blender: Datei → Import → glTF 2.0. Die Kamera heißt „Kamera“ (Brennweite je Bild steht in \`bilder.json\`, glTF kann sie nicht animieren). |
| \`bilder.json\` | Je Bild: Zeit, Abschnitt, Kamera (Position, Blickrichtung, fov), Ball, je Spieler Wurzel, Drehung, Gelenke (Becken, Brust, Kopf, Schultern, Ellbogen, Handgelenke, Hüften, Knie, Knöchel, Sweetspot), Schläger (Position, Quaternion), eingeblendeter Text |
| \`bilder.csv\` | Dasselbe als Tabelle (Semikolon), eine Zeile je Bild |
| \`szene.json\` | Szene aus der Grafik: Personen und Laufwege, Ballwege mit Höhen, Schläge (wer, wann, welche Art, Treffpunkt), Zonen |
| \`zeitplan.json\` | Abschnitte des Videos: Zeit, Kamera, Szenenzeit, Tempo, Text |
| \`grafik.json\` | Die Court-Grafik aus dem Content (Pixel, 21 px = 1 m) |
| \`drehbuch.yaml\` | Das Drehbuch |
| \`sprechertext.txt\` | Voice-over je Abschnitt mit Zeitbudget |
| \`*.mp4\` | Video (falls schon gerendert) |
`);
const zip = path.join(root, "video-out", "export", `${name}.zip`);
fs.rmSync(zip, { force: true });
execFileSync("zip", ["-qr", zip, "."], { cwd: dir });
console.log(`→ ${path.relative(root, zip)} (${(fs.statSync(zip).size / 1e6).toFixed(1)} MB)`);
