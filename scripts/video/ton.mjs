// Sound for the videos: the bandeja. jingle at the start and under the end card, plus an optional
// voice-over per section. Voice recordings (own voice or any TTS) go to
// clips/sprache/<clip>/<nr>.wav|mp3|m4a (nr = section number from 1); they are brought to speech
// loudness (-16 LUFS) and placed 0.35 s after the section starts. While someone speaks, the
// jingle is turned down. Output: AAC 192 kbit/s, muxed into the MP4 without re-encoding the picture.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { intro, outro } from "./jingle.mjs";

const RATE = 48000;
const root = path.resolve(import.meta.dirname, "../..");
const ENDUNGEN = [".wav", ".mp3", ".m4a", ".aac", ".ogg", ".flac"];
export const VO_VERSATZ = 0.35;

// Recording for section nr (1-based), or null.
export function sprachDatei(clip, nr) {
  const dir = path.join(root, "clips", "sprache", clip);
  for (const e of ENDUNGEN) {
    const f = path.join(dir, `${nr}${e}`);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

export function dauerVon(datei) {
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", datei], { encoding: "utf8" }).trim());
}

// Decode any audio file to 48 kHz stereo float, loudness-normalised for speech.
function laden(datei) {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", datei, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", String(RATE), "-ac", "2", "-f", "f32le", "-"], { maxBuffer: 512 * 1024 * 1024 });
  const f = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
  const l = new Float64Array(f.length / 2), r = new Float64Array(f.length / 2);
  for (let i = 0; i < l.length; i++) { l[i] = f[2 * i]; r[i] = f[2 * i + 1]; }
  return [l, r];
}

function einfuegen(ziel, quelle, t0, gain = 1) {
  const s = Math.round(t0 * RATE);
  for (let c = 0; c < 2; c++) for (let i = 0; i < quelle[c].length && s + i < ziel[c].length; i++) if (s + i >= 0) ziel[c][s + i] += quelle[c][i] * gain;
}

// The full soundtrack for a clip and its timeline; returns the WAV path.
export function tonspur(clipName, plan, ausgabe, { jingle = true } = {}) {
  const n = Math.ceil(plan.dauer * RATE);
  const spur = [new Float64Array(n), new Float64Array(n)];
  const sprache = [];
  plan.abschnitte.forEach((a, i) => {
    const f = sprachDatei(clipName, i + 1);
    if (f) sprache.push({ t0: a.t0 + VO_VERSATZ, buf: laden(f) });
  });
  const sprichtBei = (t) => sprache.some((v) => t >= v.t0 - 0.2 && t <= v.t0 + v.buf[0].length / RATE + 0.2);
  if (jingle) {
    // Intro under the title; quieter if a voice starts right away.
    einfuegen(spur, intro(), 0, sprichtBei(0.6) ? 0.4 : 1);
    if (plan.abspann) einfuegen(spur, outro(), plan.abspann.t0, 1);
  }
  for (const v of sprache) einfuegen(spur, v.buf, v.t0);
  // Soft limiter against clipping where voice and jingle overlap.
  for (const c of spur) for (let i = 0; i < n; i++) { const x = c[i]; c[i] = Math.abs(x) > 0.89 ? Math.sign(x) * (0.89 + 0.1 * Math.tanh((Math.abs(x) - 0.89) / 0.1)) : x; }
  const daten = Buffer.alloc(44 + n * 4);
  daten.write("RIFF", 0); daten.writeUInt32LE(36 + n * 4, 4); daten.write("WAVE", 8);
  daten.write("fmt ", 12); daten.writeUInt32LE(16, 16); daten.writeUInt16LE(1, 20); daten.writeUInt16LE(2, 22);
  daten.writeUInt32LE(RATE, 24); daten.writeUInt32LE(RATE * 4, 28); daten.writeUInt16LE(4, 32); daten.writeUInt16LE(16, 34);
  daten.write("data", 36); daten.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) daten.writeInt16LE(Math.round(Math.max(-1, Math.min(1, spur[c][i])) * 32767), 44 + i * 4 + c * 2);
  fs.writeFileSync(ausgabe, daten);
  return { datei: ausgabe, sprache: sprache.length };
}

// Put the soundtrack into an existing MP4 (picture is copied, not re-encoded).
export function mischen(mp4, wav) {
  const tmp = mp4.replace(/\.mp4$/, ".ton.mp4");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", mp4, "-i", wav, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", tmp]);
  fs.renameSync(tmp, mp4);
}

// Script for the speaker: every section with its time budget (about 2.3 words per second).
export function sprecherText(clipName, buch, plan) {
  const zeilen = [`Sprechertext: ${buch.titel ?? clipName}`, `Aufnahmen ablegen als clips/sprache/${clipName}/<Nr>.wav (oder .mp3)`, ""];
  plan.abschnitte.forEach((a, i) => {
    const s = buch.abschnitte[i];
    const zeit = Math.max(0, a.t1 - a.t0 - VO_VERSATZ - 0.3);
    const text = s.sprecher ?? "";
    const woerter = text.split(/\s+/).filter(Boolean).length;
    const passt = woerter / 2.3 <= zeit ? "" : `  ← zu lang (${(woerter / 2.3).toFixed(1)} s), Abschnitt wird verlängert`;
    zeilen.push(`${i + 1}. ${a.t0.toFixed(1)}–${a.t1.toFixed(1)} s, Kamera ${a.kamera}, Platz für ~${zeit.toFixed(1)} s (${Math.floor(zeit * 2.3)} Wörter)${passt}`);
    zeilen.push(`   ${text || "(kein Text)"}`);
    zeilen.push(`   Datei: ${sprachDatei(clipName, i + 1) ? path.relative(root, sprachDatei(clipName, i + 1)) : "fehlt"}`);
  });
  return zeilen.join("\n") + "\n";
}
