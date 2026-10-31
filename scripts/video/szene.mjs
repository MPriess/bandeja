// Turns a court diagram (the same data as layouts/_partials/court.html) into a 3D scene in metres
// with a timeline. Pure module: runs in Node (checks, CLI) and in the browser (renderer).
//
// Coordinates: x along the court (-10 … 10, net at 0), z across (-5 … 5), y up.
// Diagram px → metres: x = (px - 10) / 21 - 10, z = (py - 10) / 21 - 5.
import { sample, parsePath } from "../lib/svgpath.mjs";

export const PX = 21;
export const toX = (px) => (px - 10) / PX - 10;
export const toZ = (py) => (py - 10) / PX - 5;
export const NETZ_MITTE = 0.88;
export const NETZ_PFOSTEN = 0.92;

// Same values as $speed in court.html (m/s, slow motion for learning).
export const TEMPO = { aufschlag: 8, return: 8, schlag: 8, volley: 8, lob: 6, bandeja: 8, vibora: 9, smash: 16, chiquita: 6, stopp: 5, rueckwand: 7, ecke: 7, bajada: 7, contrapared: 7, wand: 5 };
export const PAUSE = 1.2;
const LAUF_PX = 63; // about 3 m/s

// Height profile per shot type in metres: start, peak (null = falling shot), end on the ground.
// `treffpunkt` ends at the hitting height of the receiver instead of the ground.
export const HOEHE = {
  aufschlag: [0.8, 1.5, 0],
  return: [0.9, 1.6, 0],
  schlag: [1.0, 1.7, 0],
  volley: [1.1, 1.4, 0],
  lob: [0.9, 6.5, 0],
  bandeja: [2.3, null, 0],
  vibora: [2.25, null, 0],
  smash: [2.65, null, 0],
  chiquita: [0.5, 1.15, 0],
  stopp: [1.0, 1.3, 0],
  rueckwand: [1.1, 1.8, 0],
  ecke: [1.1, 1.8, 0],
  bajada: [1.0, 5.5, 0],
  contrapared: [1.0, 2.0, 0],
  wand: [1.0, 1.6, 0],
};
// Hitting height at a `treffpunkt` (ball taken in the air or after the wall).
const TREFF = { lob: 2.3, bajada: 1.6 };
const UEBER_NETZ = 0.35; // minimum clearance above the net tape

const len = (pts) => pts.reduce((l, p, i) => (i ? l + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);

// Path length exactly as court.html measures it: straight lines between the end points of the
// commands (M, L, Q, C), not the curve itself – so video and site share the same timing.
export function sehnenLaenge(d) {
  const { start, segs } = parsePath(d);
  let l = 0, p = start;
  for (const s of segs) { const e = s.p.at(-1); l += Math.hypot(e.x - p.x, e.y - p.y); p = e; }
  return l;
}

// Time of flight like court.html: path length / speed, 0.8–4 s.
export function flugzeit(d, typ) {
  const v = TEMPO[typ];
  if (!d || !v) return 0;
  return clamp(sehnenLaenge(d) / PX / v, 0.8, 4);
}

// Samples a path evenly by arc length: [{x, y, s}] with s from 0 to 1.
export function abtasten(d, n = 64) {
  const raw = sample(d, 80);
  const cum = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y));
  const L = cum.at(-1) || 1;
  const out = [];
  let j = 1;
  for (let k = 0; k <= n; k++) {
    const target = (k / n) * L;
    while (j < cum.length - 1 && cum[j] < target) j++;
    const a = raw[j - 1], b = raw[j], span = cum[j] - cum[j - 1] || 1;
    const u = clamp((target - cum[j - 1]) / span, 0, 1);
    out.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, s: k / n });
  }
  return { punkte: out, laenge: L };
}

const PERSONEN = [
  { id: "p", rolle: "du", team: "wir" },
  { id: "q", rolle: "partner", team: "wir" },
  { id: "a", rolle: "gegner", team: "sie" },
  { id: "b", rolle: "gegner", team: "sie" },
];

function naechste(d, x, y, keys = ["p", "g", "q", "a", "b"]) {
  let best = null, bd = Infinity;
  for (const k of keys) {
    if (d[`${k}x`] === undefined) continue;
    const dd = Math.hypot(d[`${k}x`] - x, d[`${k}y`] - y);
    if (dd < bd) { bd = dd; best = k; }
  }
  return { k: best, dist: bd };
}

// Piecewise parabolas through key points [{s, h, top}] (top = peak height of the arc to the next point).
function profil(keys) {
  const arcs = [];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    const mid = (a.h + b.h) / 2;
    arcs.push({ s0: a.s, s1: b.s, h0: a.h, h1: b.h, k: a.top == null ? 0 : Math.max(0, a.top - mid) });
  }
  return arcs;
}
function hoeheBei(arcs, s) {
  const a = arcs.find((r) => s <= r.s1) ?? arcs.at(-1);
  const u = a.s1 > a.s0 ? clamp((s - a.s0) / (a.s1 - a.s0), 0, 1) : 1;
  return a.h0 + (a.h1 - a.h0) * u + 4 * a.k * u * (1 - u);
}

// Ball in 3D: points with height, plus where it touches ground, wall and net line.
export function ballweg(d, pfad, typ, { treffpunkt = false, ohneNetz = false, ziel = null } = {}) {
  const { punkte, laenge } = abtasten(pfad);
  const [h0, top, h1] = d.hoehe ?? HOEHE[typ] ?? HOEHE.schlag;
  // s at the target (bounce or contact), the path may go on afterwards.
  let sZiel = 1;
  if (ziel) {
    let bd = Infinity;
    for (const p of punkte) { const dd = Math.hypot(p.x - ziel.x, p.y - ziel.y); if (dd < bd) { bd = dd; sZiel = p.s; } }
  }
  const wandIdx = punkte.findIndex((p, i) => i > 0 && (p.x <= 10.6 || p.x >= 429.4 || p.y <= 10.6 || p.y >= 219.4));
  const sWand = wandIdx > 0 ? punkte[wandIdx].s : null;
  const netzIdx = punkte.findIndex((p, i) => i > 0 && Math.sign(p.x - 220) !== Math.sign(punkte[0].x - 220));
  const sNetz = netzIdx > 0 && !ohneNetz ? punkte[netzIdx].s : null;

  const keys = [{ s: 0, h: h0, top }];
  const ende = treffpunkt ? (TREFF[typ] ?? 1.0) : h1;
  if (treffpunkt && sWand !== null && sWand < sZiel) {
    // Bounce on the floor before the wall, up against the glass, then taken at hitting height.
    const vorWand = Math.max((sNetz ?? 0) + 0.05, sWand - 2.5 * PX / laenge);
    keys.push({ s: vorWand, h: 0, top: 1.5 }, { s: sWand, h: 1.4, top: null }, { s: sZiel, h: ende, top: null });
  } else if (sWand !== null && sWand < sZiel && ["contrapared", "wand"].includes(typ)) {
    keys.push({ s: sWand, h: 1.6, top: 2.2 }, { s: sZiel, h: ende, top: null });
    keys[0].top = 2.0;
  } else {
    keys.push({ s: sZiel, h: ende, top: null });
  }
  if (sZiel < 1) keys.push({ s: 1, h: 1.0, top: null }), (keys.at(-2).top = 1.4);
  const arcs = profil(keys);
  // Over the net with enough clearance: lift the arc that crosses it.
  if (sNetz !== null) {
    const arc = arcs.find((r) => sNetz >= r.s0 && sNetz <= r.s1);
    const u = (sNetz - arc.s0) / (arc.s1 - arc.s0 || 1);
    const h = hoeheBei([arc], sNetz);
    const need = NETZ_MITTE + UEBER_NETZ;
    if (h < need && u > 0 && u < 1) arc.k += (need - h) / (4 * u * (1 - u));
  }
  const bounces = keys.filter((k, i) => i > 0 && k.h === 0).map((k) => k.s);
  return {
    punkte: punkte.map((p) => ({ x: toX(p.x), z: toZ(p.y), y: hoeheBei(arcs, p.s), s: p.s })),
    laenge: laenge / PX,
    sZiel, sWand, sNetz, bounces,
    hoeheBei: (s) => hoeheBei(arcs, s),
  };
}

// The whole scene for one diagram.
export function szene(d) {
  const typ = d.type ?? "schlag";
  const F = d.ball ? flugzeit(d.ball, TEMPO[typ] ? typ : "schlag") : 0;
  const F2 = d.ball2 ? flugzeit(d.ball2, TEMPO[d.typ2 ?? typ] ? d.typ2 ?? typ : "schlag") : 0;
  const M = d.mv ? Math.max(0.8, sehnenLaenge(d.mv) / LAUF_PX) : 0;
  let own = true;
  if (d.ball) {
    const s = parsePath(d.ball).start;
    own = ["p", "g", "q"].includes(naechste(d, s.x, s.y).k);
  }
  // Timeline exactly as court.html.
  let b0 = 0, b1 = F, m0 = 0, m1 = M;
  if (F && M) {
    if (own) { m0 = F + 0.15; m1 = m0 + M; }
    else { m0 = Math.max(0, F - M); m1 = Math.max(F, M); b0 = m1 - F; b1 = m1; }
  }
  const c0 = Math.max(b1, m1) + 0.3, c1 = c0 + F2;
  const T = Math.max(b1, m1, F2 ? c1 : 0) + PAUSE;

  const personen = [];
  for (const p of PERSONEN) {
    if (d[`${p.id}x`] === undefined) continue;
    const pos = { x: toX(d[`${p.id}x`]), z: toZ(d[`${p.id}y`]) };
    let weg = null;
    if (p.id === "p" && d.mv) {
      const { punkte } = abtasten(d.mv, 48);
      weg = { t0: m0, t1: m1, punkte: punkte.map((q) => ({ x: toX(q.x), z: toZ(q.y) })) };
    }
    personen.push({ ...p, pos, weg, seite: pos.x < 0 ? -1 : 1 });
  }
  // A former position without movement: du starts there and walks to p in the movement phase.
  if (d.gx !== undefined && !d.mv) {
    const du = personen.find((p) => p.id === "p");
    if (du) du.weg = { t0: m0, t1: Math.max(m0 + 0.8, m0 + Math.hypot(d.gx - d.px, d.gy - d.py) / LAUF_PX), punkte: [{ x: toX(d.gx), z: toZ(d.gy) }, du.pos] };
  }

  const baelle = [];
  const schlaege = [];
  const ballDazu = (pfad, t0, t1, btyp, mitZiel) => {
    const s = parsePath(pfad).start;
    let von = d.von ? { k: d.von } : naechste(d, s.x, s.y);
    const wer = von.k === "g" ? "p" : von.k;
    const ziel = mitZiel && d.tx !== undefined ? { x: d.tx, y: d.ty } : null;
    const w = ballweg(d, pfad, btyp, { treffpunkt: mitZiel && !!d.treffpunkt, ohneNetz: !!d.ohneNetz, ziel });
    baelle.push({ typ: btyp, t0, t1, ...w, ziel: ziel ? { x: toX(ziel.x), z: toZ(ziel.y), treffpunkt: !!d.treffpunkt } : null });
    if (wer) schlaege.push({ wer, t: t0, art: btyp, ball: baelle.length - 1, kontakt: w.punkte[0] });
    // Receiver plays the ball at the target if it is a contact point in the air or after the wall.
    if (ziel && d.treffpunkt) {
      const rec = naechste(d, ziel.x, ziel.y, ["p", "q", "a", "b"]);
      if (rec.k && rec.k !== wer && rec.dist < 90) {
        const tz = t0 + (t1 - t0) * w.sZiel;
        schlaege.push({ wer: rec.k, t: tz, art: d.annahme ?? annahme(btyp), ball: null, kontakt: w.punkte.find((p) => p.s >= w.sZiel) ?? w.punkte.at(-1) });
      }
    }
  };
  if (d.ball) ballDazu(d.ball, b0, b1, TEMPO[typ] ? typ : "schlag", true);
  if (d.ball2) ballDazu(d.ball2, c0, c1, TEMPO[d.typ2 ?? typ] ? d.typ2 ?? typ : "schlag", false);

  const zonen = [];
  for (const k of ["z", "y"]) {
    if (!d[`${k}w`]) continue;
    zonen.push({ x0: toX(d[`${k}x`]), z0: toZ(d[`${k}y`]), x1: toX(d[`${k}x`] + d[`${k}w`]), z1: toZ(d[`${k}y`] + d[`${k}h`]), opacity: d[`${k}o`] ?? 0.4 });
  }
  return { typ, cap: d.cap ?? "", T, phasen: { b0, b1, m0, m1, c0, c1 }, personen, baelle, schlaege, zonen };
}

// What the receiver does with a ball taken at a contact point.
function annahme(typ) {
  if (typ === "lob") return "bandeja";
  if (["rueckwand", "ecke", "bajada"].includes(typ)) return typ === "bajada" ? "smash" : "schlag";
  return "volley";
}

// Position of a person at time t (eased along their path).
export function position(person, t) {
  const w = person.weg;
  if (!w) return { ...person.pos, v: 0, richtung: null, strecke: 0 };
  const u = smooth(clamp((t - w.t0) / (w.t1 - w.t0), 0, 1));
  const pts = w.punkte;
  const f = u * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  const a = pts[i], b = pts[i + 1];
  const r = f - i;
  const moving = t > w.t0 && t < w.t1;
  const dx = b.x - a.x, dz = b.z - a.z;
  let total = 0;
  for (let k = 1; k < pts.length; k++) total += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z);
  // Speed of the eased motion: derivative of smoothstep is 6u(1-u).
  const lin = clamp((t - w.t0) / (w.t1 - w.t0), 0, 1);
  const v = moving ? (total / (w.t1 - w.t0)) * 6 * lin * (1 - lin) : 0;
  return { x: a.x + dx * r, z: a.z + dz * r, v, strecke: u * total, richtung: Math.hypot(dx, dz) > 1e-6 ? { x: dx, z: dz } : null };
}

// Ball position at time t, or null when it is not in the air.
export function ballBei(ball, t) {
  if (t < ball.t0 || t > ball.t1 + 0.6) return null;
  const s = clamp((t - ball.t0) / (ball.t1 - ball.t0), 0, 1);
  const pts = ball.punkte;
  const f = s * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  const a = pts[i], b = pts[i + 1], r = f - i;
  return { x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r, z: a.z + (b.z - a.z) * r, s };
}
