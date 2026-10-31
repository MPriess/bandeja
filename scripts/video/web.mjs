// Renders every clip for the site (1280 × 720, 25 fps, H.264 + AAC, ~1–2 MB) and puts video and
// poster into static/media/animationen/<clip>.mp4|.jpg, where content/videos/animation-*.md uses them.
//
//   npm run videos:web               all clips
//   npm run videos:web -- smash      one clip
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { clipLaden, rendern } from "./render.mjs";
import { pruefen } from "./regeln.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const ziel = path.join(root, "static", "media", "animationen");
fs.mkdirSync(ziel, { recursive: true });
const namen = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(path.join(root, "clips")).filter((f) => f.endsWith(".yaml")).map((f) => f.replace(/\.yaml$/, ""));
for (const n of namen) {
  const clip = clipLaden(n);
  const fehler = pruefen(clip.d);
  if (fehler.length) { console.log(`${n}: ${fehler.length} Regelverstöße – übersprungen\n  ${fehler.join("\n  ")}`); process.exitCode = 1; continue; }
  const [mp4] = await rendern(clip, { web: true });
  fs.copyFileSync(mp4, path.join(ziel, `${n}.mp4`));
  // Poster: compact JPEG (stays well under the 200 kB image budget).
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", mp4.replace(/\.mp4$/, ".jpg"), "-q:v", "6", path.join(ziel, `${n}.jpg`)]);
  const kb = (f) => Math.round(fs.statSync(path.join(ziel, f)).size / 1024);
  console.log(`  → static/media/animationen/${n}.mp4 (${kb(`${n}.mp4`)} kB), ${n}.jpg (${kb(`${n}.jpg`)} kB)`);
}
