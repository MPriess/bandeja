// Voice-over from the `sprecher` texts in clips/*.yaml, with a text-to-speech engine on your computer.
// Writes clips/sprache/<clip>/<nr>.wav; then render the clip again (or use --nur-ton if lengths fit).
//
//   npm run sprache -- aufschlag --piper ~/piper/de_DE-thorsten-high.onnx   Piper (free, local)
//   npm run sprache -- aufschlag --say Anna                                  macOS voice "Anna"
//   npm run sprache -- --alle --piper <modell.onnx>                          every clip
//   npm run sprache -- --text                                                all texts as one file
//
// Existing recordings are kept (your own voice wins); --neu overwrites them.
// Piper: https://github.com/rhasspy/piper – German voices e.g. de_DE-thorsten-high (check the licence
// of the voice before publishing).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { clipLaden } from "./render.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const a = { _: [] };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) {
    const k = argv[i].slice(2), n = argv[i + 1];
    if (n === undefined || n.startsWith("--")) a[k] = true; else { a[k] = n; i++; }
  } else a._.push(argv[i]);
}

const namen = a.alle || a.text ? fs.readdirSync(path.join(root, "clips")).filter((f) => f.endsWith(".yaml")).map((f) => f.replace(/\.yaml$/, "")) : a._;
if (!namen.length || (!a.text && !a.piper && !a.say)) {
  console.log("Aufruf: npm run sprache -- <clip> --piper <modell.onnx>   oder   --say <Stimme>   oder   --text");
  process.exit(1);
}

if (a.text) {
  const zeilen = ["# Sprechertexte bandeja.", "", "Je Abschnitt eine Aufnahme: clips/sprache/<clip>/<Nr>.wav (oder .mp3).", ""];
  for (const n of namen) {
    const c = clipLaden(n);
    zeilen.push(`## ${c.buch.titel ?? n} (\`${n}\`)`, "");
    c.buch.abschnitte.forEach((s, i) => zeilen.push(`${i + 1}. ${s.sprecher ?? "–"}`));
    zeilen.push("");
  }
  const f = path.join(root, "clips", "SPRECHERTEXTE.md");
  fs.writeFileSync(f, zeilen.join("\n"));
  console.log(`→ ${path.relative(root, f)}`);
  process.exit(0);
}

for (const n of namen) {
  const c = clipLaden(n);
  const dir = path.join(root, "clips", "sprache", n);
  fs.mkdirSync(dir, { recursive: true });
  c.buch.abschnitte.forEach((s, i) => {
    if (!s.sprecher) return;
    const ziel = path.join(dir, `${i + 1}.wav`);
    const vorhanden = fs.readdirSync(dir).some((f) => f.startsWith(`${i + 1}.`));
    if (vorhanden && !a.neu) { console.log(`  ${n} ${i + 1}: Aufnahme vorhanden, bleibt (mit --neu ersetzen)`); return; }
    if (a.piper) {
      execFileSync("piper", ["--model", a.piper, "--output_file", ziel], { input: s.sprecher });
    } else {
      const aiff = ziel.replace(/\.wav$/, ".aiff");
      execFileSync("say", ["-v", a.say, "-o", aiff, s.sprecher]);
      execFileSync("ffmpeg", ["-y", "-v", "error", "-i", aiff, ziel]);
      fs.rmSync(aiff);
    }
    console.log(`  ${n} ${i + 1}: ${s.sprecher}`);
  });
}
console.log("Fertig. Jetzt neu rendern: npm run video -- <clip>");
