// The bandeja. jingle, synthesised from scratch (no samples, no third-party music – free to use
// on the site and on YouTube). Intro: racket "pock", the ball on the turf, then against the glass
// wall; outro: floor and glass again with a soft chord under the logo. Writes 48 kHz 16-bit stereo WAV.
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

let seed = 12345;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

// Band-pass filtered noise (biquad), for clicks and scrapes.
function rauschen(n, f, q) {
  const w = (2 * Math.PI * f) / RATE, al = Math.sin(w) / (2 * q), c = Math.cos(w), a0 = 1 + al;
  const b0 = al / a0, b2 = -al / a0, a1 = (-2 * c) / a0, a2 = (1 - al) / a0;
  const out = new Float64Array(n);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < n; i++) {
    const x = rnd(), y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y; out[i] = y;
  }
  return out;
}
const add = (buf, start, i, v, pan = 0) => { buf[0][start + i] += v * (1 - pan); buf[1][start + i] += v * (1 + pan); };

// Racket hit: a short dry "pock" (hollow ball on a foam racket).
function pock(buf, t0, laut = 0.7) {
  const start = Math.round(t0 * RATE), n = Math.round(RATE * 0.1), r = rauschen(n, 2500, 1.2);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    add(buf, start, i, laut * (0.9 * r[i] * Math.exp(-t * 700) + Math.sin(2 * Math.PI * 1150 * t) * Math.exp(-t * 70) + 0.5 * Math.sin(2 * Math.PI * 520 * t) * Math.exp(-t * 55)), -0.15);
  }
}

// Ball on artificial turf: dull, short thud with a little sandy scrape.
export function boden(buf, t0, laut = 0.8) {
  const start = Math.round(t0 * RATE), n = Math.round(RATE * 0.18), r = rauschen(n, 1400, 0.8);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const thud = Math.sin(2 * Math.PI * (210 - 60 * Math.min(1, t / 0.03)) * t) * Math.exp(-t * 45);
    add(buf, start, i, laut * (0.85 * thud + 0.5 * r[i] * Math.exp(-t * 160) + 0.35 * Math.sin(2 * Math.PI * 760 * t) * Math.exp(-t * 90)));
  }
}

// Ball against the glass wall: hard "clack", the big pane booming low, a short glassy ring
// and a little rattle of the frame.
export function glas(buf, t0, laut = 1) {
  const start = Math.round(t0 * RATE), n = Math.round(RATE * 0.9);
  const klick = rauschen(n, 4200, 1.5), rassel = rauschen(n, 900, 2);
  const tief = [[62, 0.55, 5.5], [97, 0.45, 7], [141, 0.35, 9], [205, 0.25, 12]];
  const hell = [[1320, 0.18, 38], [2140, 0.13, 45], [3410, 0.09, 60]];
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let v = 1.1 * klick[i] * Math.exp(-t * 500);
    for (const [f, a, d] of tief) v += a * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * d) * Math.min(1, t / 0.002);
    for (const [f, a, d] of hell) v += a * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * d);
    v += 0.12 * rassel[i] * Math.exp(-t * 25) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 28 * t));
    add(buf, start, i, laut * v, 0.25);
  }
}

// A little room: two feedback delays, slightly different per channel.
function raum(buf) {
  for (const [ch, ms] of [[0, 83], [1, 97]]) {
    const d = Math.round((ms / 1000) * RATE), x = buf[ch];
    for (let i = d; i < x.length; i++) x[i] += x[i - d] * 0.28;
  }
}

function normalisieren(buf, spitze = 0.85, drive = 2.2) {
  let m = 0;
  for (const c of buf) for (const v of c) m = Math.max(m, Math.abs(v));
  // Soft saturation: brings the short hits forward without hard clipping (punchier, louder).
  for (const c of buf) for (let i = 0; i < c.length; i++) c[i] = Math.tanh((drive * c[i]) / (m || 1)) / Math.tanh(drive);
  m = 0;
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

// Intro: racket, floor, glass, a last small bounce – the sound of a padel rally in one second.
export function intro() {
  const b = leer(1.6);
  pock(b, 0.0, 0.55);
  boden(b, 0.24, 0.8);
  glas(b, 0.5, 1);
  boden(b, 0.86, 0.35);
  raum(b);
  normalisieren(b);
  return b;
}

// End card: floor and glass again, then a soft low chord in D major for the logo.
export function outro() {
  const b = leer(2.6);
  boden(b, 0.0, 0.8);
  glas(b, 0.26, 1);
  boden(b, 0.62, 0.3);
  for (const m of [50, 62, 66, 69]) note(b, 0.7, m, { laut: 0.12, dauer: 1.8 });
  raum(b);
  normalisieren(b);
  return b;
}

export function schreiben(datei, buf) {
  fs.writeFileSync(datei, wav(buf));
  return datei;
}
