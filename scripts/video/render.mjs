// Renders court videos (MP4) from clips/*.yaml or straight from a court diagram in the content.
//
//   npm run video -- <clip>                     clips/<clip>.yaml, all formats it lists
//   npm run video -- <clip> --format short      only one format (quer | short)
//   npm run video -- --quelle content/lektionen/bandeja/kapitel-2.md   standard script
//   npm run video -- <clip> --standbild 1.5 --kamera tv                one PNG at 1.5 s
//   npm run video -- <clip> --vorschau          half size, 15 fps (quick look)
//   npm run videos                              every clip in clips/
//
// Output: video-out/<clip>-<format>.mp4 and .jpg (poster). Needs ffmpeg and Chromium (Playwright).
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { parse as parseYaml } from "yaml";
import { collectCourts } from "../lib/courts.mjs";
import { szene } from "./szene.mjs";
import { standardDrehbuch, zeitplan } from "./zeitplan.mjs";
import { FORMATE } from "./kameras.mjs";
import { pruefen } from "./regeln.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(root, "video-out");

function argumente(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const k = argv[i].slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) a[k] = true;
      else { a[k] = next; i++; }
    } else a._.push(argv[i]);
  }
  return a;
}

// Finds the diagram a clip refers to: "content/…md" plus optional "#where" (e.g. "#diag", "#schritte[2].court").
export function grafik(quelle) {
  const [file, where] = quelle.split("#");
  const rel = path.normalize(file.startsWith("content/") ? file : path.join("content", file));
  const alle = collectCourts(root).filter((c) => c.file === rel);
  if (!alle.length) throw new Error(`Keine Court-Grafik in ${rel}`);
  const c = where ? alle.find((x) => x.where === where) : alle[0];
  if (!c) throw new Error(`${rel}: keine Grafik unter „${where}“ (vorhanden: ${alle.map((x) => x.where).join(", ")})`);
  return c.d;
}

export function clipLaden(name) {
  const file = path.join(root, "clips", `${name}.yaml`);
  if (!fs.existsSync(file)) throw new Error(`Drehbuch fehlt: clips/${name}.yaml`);
  const c = parseYaml(fs.readFileSync(file, "utf8"));
  const d = { ...grafik(c.quelle), ...(c.court ?? {}) };
  const sz = szene(d);
  const std = standardDrehbuch(sz);
  return {
    name, d,
    formate: c.formate ?? ["quer", "short"],
    markierungen: c.markierungen ?? true,
    buch: { titel: c.titel ?? null, abschnitte: c.ablauf ?? std.abschnitte, abspann: c.abspann === false ? null : { ...std.abspann, ...(c.abspann ?? {}) } },
  };
}

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2" };
async function server() {
  const erlaubt = ["scripts/", "node_modules/three/", "node_modules/@fontsource/", "node_modules/@fontsource-variable/"];
  const s = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
    const file = path.join(root, rel);
    if (!erlaubt.some((e) => rel.startsWith(e)) || !file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${s.address().port}`, close: () => s.close() };
}

async function seite(browser, url, job, skala) {
  const { breite, hoehe } = FORMATE[job.format];
  const page = await browser.newPage({ viewport: { width: breite, height: hoehe }, deviceScaleFactor: skala });
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  await page.goto(`${url}/scripts/video/render.html`);
  await page.waitForFunction(() => window.bereit === true || false, null, { timeout: 30000 }).catch(() => {});
  if (fehler.length) throw new Error(`Renderer: ${fehler.join("; ")}`);
  const info = await page.evaluate((j) => window.vorbereiten(j), job);
  return { page, info };
}

function ffmpeg(ziel, fps) {
  const p = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", ziel], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => p.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg beendet mit ${c}`)))));
  return { stdin: p.stdin, done };
}

export async function rendern(clip, { format, fps = 30, vorschau = false, standbild = null, kamera = null } = {}) {
  const { chromium } = createRequire(import.meta.url)("playwright");
  fs.mkdirSync(OUT, { recursive: true });
  const site = await server();
  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const fertig = [];
  try {
    for (const f of format ? [format] : clip.formate) {
      const buch = kamera ? { ...clip.buch, abschnitte: [{ kamera, abspielen: true, ab: "start" }], abspann: null } : clip.buch;
      const job = { format: f, d: clip.d, buch, markierungen: clip.markierungen };
      const skala = vorschau ? 0.5 : 1;
      const { page, info } = await seite(browser, site.url, job, skala);
      if (standbild !== null) {
        await page.evaluate((t) => window.bild(t), Number(standbild));
        const ziel = path.join(OUT, `${clip.name}-${f}${kamera ? `-${kamera}` : ""}-${standbild}s.png`);
        await page.screenshot({ path: ziel });
        fertig.push(ziel);
        await page.close();
        continue;
      }
      const rate = vorschau ? 15 : fps;
      const n = Math.round(info.dauer * rate);
      const ziel = path.join(OUT, `${clip.name}-${f}${vorschau ? "-vorschau" : ""}.mp4`);
      const enc = ffmpeg(ziel, rate);
      const start = Date.now();
      for (let i = 0; i < n; i++) {
        await page.evaluate((t) => window.bild(t), i / rate);
        // JPEG (q 95) is twice as fast as PNG; H.264 at CRF 20 hides the difference.
        const bild = await page.screenshot({ type: "jpeg", quality: 95 });
        if (!enc.stdin.write(bild)) await new Promise((r) => enc.stdin.once("drain", r));
        if (i % rate === 0 || i === n - 1) {
          const s = (Date.now() - start) / 1000;
          process.stdout.write(`\r  ${clip.name} ${f}: Bild ${i + 1}/${n}  (${(s / (i + 1)).toFixed(2)} s/Bild, noch ~${Math.round((s / (i + 1)) * (n - i - 1))} s)   `);
        }
      }
      enc.stdin.end();
      await enc.done;
      process.stdout.write("\n");
      // Poster: the moment of the first contact in the first played section.
      await page.evaluate((t) => window.bild(t), Math.min(info.dauer - 0.1, 2.0));
      await page.screenshot({ path: ziel.replace(/\.mp4$/, ".jpg"), type: "jpeg", quality: 85 });
      await page.close();
      fertig.push(ziel);
    }
  } finally {
    await browser.close();
    site.close();
  }
  return fertig;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = argumente(process.argv.slice(2));
  let clips = [];
  if (a.alle) clips = fs.readdirSync(path.join(root, "clips")).filter((f) => f.endsWith(".yaml")).map((f) => clipLaden(f.replace(/\.yaml$/, "")));
  else if (a.quelle) {
    const d = grafik(a.quelle);
    const std = standardDrehbuch(szene(d));
    const name = path.basename(a.quelle.split("#")[0], ".md") + (a.quelle.includes("#") ? "-" + a.quelle.split("#")[1].replace(/\W+/g, "") : "");
    clips = [{ name: path.basename(path.dirname(a.quelle)) + "-" + name, d, formate: ["quer", "short"], markierungen: true, buch: { titel: null, abschnitte: std.abschnitte, abspann: std.abspann } }];
  } else if (a._[0]) clips = [clipLaden(a._[0])];
  else {
    console.log("Aufruf: npm run video -- <clip> [--format quer|short] [--vorschau] [--standbild <s>] [--kamera <name>]");
    console.log("        npm run video -- --quelle content/<datei>.md[#pfad]");
    console.log("        npm run videos");
    process.exit(1);
  }
  for (const c of clips) {
    // Only scenes that keep the padel rules are rendered (override with --trotzdem).
    const fehler = pruefen(c.d);
    if (fehler.length) {
      console.log(`${c.name}: ${fehler.length} Regelverstöße\n  ${fehler.join("\n  ")}`);
      if (!a.trotzdem) { console.log("  → nicht gerendert (mit --trotzdem trotzdem rendern)"); process.exitCode = 1; continue; }
    }
    const plan = zeitplan(szene(c.d), c.buch);
    console.log(`${c.name}: ${plan.dauer.toFixed(1)} s, ${plan.abschnitte.length} Abschnitte`);
    const out = await rendern(c, { format: a.format, vorschau: !!a.vorschau, standbild: a.standbild ?? null, kamera: a.kamera ?? null, fps: Number(a.fps ?? 30) });
    for (const f of out) console.log(`  → ${path.relative(root, f)}`);
  }
}
