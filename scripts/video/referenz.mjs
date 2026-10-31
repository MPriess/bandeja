// Quick check on the reference clip: renders a draft (480 × 270, about a minute), a contact sheet
// (2 frames per second) and a close-up still, and runs the 3D rules. Use after every change.
//
//   npm run referenz                 → video-out/referenz-entwurf.mp4, referenz-blatt.png, referenz-nah.png
//   npm run referenz -- smash        another clip as reference
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { clipLaden, rendern } from "./render.mjs";
import { pruefen } from "./regeln.mjs";
import { szene } from "./szene.mjs";

export const REFERENZ = "vibora-oder-bandeja";
const root = path.resolve(import.meta.dirname, "../..");
const out = path.join(root, "video-out");
const name = process.argv[2] ?? REFERENZ;
const start = Date.now();
const clip = clipLaden(name);
const fehler = pruefen(clip.d);
console.log(fehler.length ? `Regeln: ${fehler.length} Verstöße\n  ${fehler.join("\n  ")}` : "Regeln: alles in Ordnung");
const [mp4] = await rendern(clip, { format: "quer", entwurf: true });
const ziel = path.join(out, "referenz-entwurf.mp4");
fs.copyFileSync(mp4, ziel);
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", ziel, "-vf", "fps=2,tile=6x6", "-frames:v", "1", path.join(out, "referenz-blatt.png")]);
// Close-up at your first contact.
const s = szene(clip.d).schlaege.find((x) => x.wer === "p") ?? szene(clip.d).schlaege[0];
const [nah] = await rendern(clip, { format: "quer", standbild: (s.t + 1.2 - 0.15).toFixed(2), kamera: "nah" });
fs.renameSync(nah, path.join(out, "referenz-nah.png"));
console.log(`Fertig in ${Math.round((Date.now() - start) / 1000)} s → video-out/referenz-entwurf.mp4, referenz-blatt.png, referenz-nah.png`);
