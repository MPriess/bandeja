// The bandeja. jingle, synthesised from scratch (no samples, no third-party music – free to use
// on the site and on YouTube). Intro: a ball "pock" and a rising marimba arpeggio; outro: the same
// motif ending on a full chord. Writes 48 kHz 16-bit stereo WAV.
import fs from "node:fs";

const RATE = 48000;
const ton = (midi) => 440 * 2 ** ((midi - 69) / 12);

// Marimba-like mallet note: fundamental, a soft 4th harmonic, fast attack, exponential decay.
function note(buf, t0, midi, { dauer = 1.2, laut = 0.5, pan = 0 } = {}) {
  const f = ton(midi), start = Math.round(t0 * RATE), n = Math.round(dauer * RATE);
  for (let i = 0; i < n && start + i < buf[0].length; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.004) * Math.exp(-t * 4.2);
    const v = laut * env * (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.exp(-t * 14) * Math.sin(2 * Math.PI * f * 4 * t) + 0.12 * Math.sin(2 * Math.PI * f * 2 * t));
    buf[0][start + i] += v * (1 - pan) * 0.5 * 2 ** 0.5;
    buf[1][start + i] += v * (1 + pan) * 0.5 * 2 ** 0.5;
  }
}

// Padel ball hit: a short noise click plus a damped resonance around 1.1 kHz.
function pock(buf, t0, laut = 0.7) {
  const start = Math.round(t0 * RATE);
  let seed = 12345;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < RATE * 0.12; i++) {
    const t = i / RATE;
    const v = laut * (0.5 * rnd() * Math.exp(-t * 900) + Math.sin(2 * Math.PI * 1150 * t) * Math.exp(-t * 60) + 0.4 * Math.sin(2 * Math.PI * 420 * t) * Math.exp(-t * 45));
    buf[0][start + i] += v;
    buf[1][start + i] += v;
  }
}

// A little room: two feedback delays, slightly different per channel.
function raum(buf) {
  for (const [ch, ms] of [[0, 83], [1, 97]]) {
    const d = Math.round((ms / 1000) * RATE), x = buf[ch];
    for (let i = d; i < x.length; i++) x[i] += x[i - d] * 0.28;
  }
}

function normalisieren(buf, spitze = 0.7) {
  let m = 0;
  for (const c of buf) for (const v of c) m = Math.max(m, Math.abs(v));
  for (const c of buf) for (let i = 0; i < c.length; i++) c[i] *= spitze / (m || 1);
  // Short fade out so nothing clicks at the end.
  const f = Math.round(0.08 * RATE);
  for (const c of buf) for (let i = 0; i < f; i++) c[c.length - 1 - i] *= i / f;
}

function wav(buf) {
  const n = buf[0].length, daten = Buffer.alloc(44 + n * 4);
  daten.write("RIFF", 0); daten.writeUInt32LE(36 + n * 4, 4); daten.write("WAVE", 8);
  daten.write("fmt ", 12); daten.writeUInt32LE(16, 16); daten.writeUInt16LE(1, 20); daten.writeUInt16LE(2, 22);
  daten.writeUInt32LE(RATE, 24); daten.writeUInt32LE(RATE * 4, 28); daten.writeUInt16LE(4, 32); daten.writeUInt16LE(16, 34);
  daten.write("data", 36); daten.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) daten.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[c][i])) * 32767), 44 + i * 4 + c * 2);
  return daten;
}

const leer = (s) => [new Float64Array(Math.round(s * RATE)), new Float64Array(Math.round(s * RATE))];

// Motif in D major: D5 F#5 A5 D6 (a bright, sporty rise), lime = the top note.
export function intro() {
  const b = leer(1.9);
  pock(b, 0.0);
  [74, 78, 81, 86].forEach((m, i) => note(b, 0.12 + i * 0.11, m, { laut: 0.42 + i * 0.05, pan: -0.3 + i * 0.2 }));
  note(b, 0.45, 62, { laut: 0.35, dauer: 1.4 });
  raum(b);
  normalisieren(b);
  return b;
}

export function outro() {
  const b = leer(2.6);
  [74, 78, 81].forEach((m, i) => note(b, i * 0.12, m, { laut: 0.4, pan: -0.25 + i * 0.25 }));
  pock(b, 0.42, 0.5);
  for (const m of [74, 78, 81, 86, 62, 50]) note(b, 0.5, m, { laut: m < 70 ? 0.35 : 0.3, dauer: 2.1 });
  raum(b);
  normalisieren(b);
  return b;
}

export function schreiben(datei, buf) {
  fs.writeFileSync(datei, wav(buf));
  return datei;
}
