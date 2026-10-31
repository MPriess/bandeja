// Padel rules and ball position for a video scene, checked in 3D (metres, same model as szene.mjs).
// Runs in Node without rendering: the players are posed with the same code as in the video.
//
// Ball:     over the net (with the sag of the net at that spot), first floor then wall, at most one
//           bounce per side, never through the glass or over the wall, serve at or below the waist
//           and into the diagonal service box.
// Players:  the racket really meets the ball at contact, the ball flies through nobody,
//           nobody crosses the net or stands in the wall, players do not overlap.
import * as THREE from "three";
import { szene, ballBei, position } from "./szene.mjs";
import { Steuerung } from "./welt/steuerung.js";

export const BALL_R = 0.033;
const AUFSCHLAG_LINIE = 6.95;
export const netzHoehe = (z) => 0.92 - 0.04 * (1 - (Math.max(-5, Math.min(5, z)) / 5) ** 2);
// Height of the enclosure at a point on its edge: back wall 4 m (3 m glass + 1 m mesh);
// side walls 4 m in the last 2 m, 3 m from 2 to 4 m from the back, 3 m mesh in the middle.
export function wandHoehe(x, z) {
  if (Math.abs(x) >= 9.95) return 4;
  if (Math.abs(z) >= 4.95) return Math.abs(x) > 8 ? 4 : 3;
  return Infinity;
}
const an = (p) => Math.abs(p.x) >= 9.95 || Math.abs(p.z) >= 4.95; // at a wall
const seite = (x) => Math.sign(x) || 1;

export function ballRegeln(sz, d = {}) {
  const fehler = [];
  sz.baelle.forEach((b, i) => {
    const name = `Ball ${i + 1} (${b.typ})`;
    const pts = b.punkte;
    const start = pts[0];
    const eigene = seite(start.x);
    const bisS = b.ziel?.treffpunkt ? b.sZiel : 1;
    // Inside the enclosure and never above a wall where it touches one.
    for (const p of pts) {
      if (p.y < -0.001) fehler.push(`${name}: unter dem Boden bei x ${p.x.toFixed(1)} m`);
      if ((Math.abs(p.x) > 10.05 || Math.abs(p.z) > 5.05) && !d.ausserhalb) { fehler.push(`${name}: fliegt durch die Wand (x ${p.x.toFixed(1)}, z ${p.z.toFixed(1)})`); break; }
      if (an(p) && p.y > wandHoehe(p.x, p.z) && !d.ausserhalb) { fehler.push(`${name}: fliegt über die Wand (${p.y.toFixed(1)} m hoch bei x ${p.x.toFixed(1)}, z ${p.z.toFixed(1)})`); break; }
      if (p.y > 12) { fehler.push(`${name}: unrealistisch hoch (${p.y.toFixed(1)} m)`); break; }
    }
    // Net: clearance at the crossing point, with the sag of the net.
    if (b.sNetz !== null) {
      const p = pts.find((q) => q.s >= b.sNetz);
      const h = b.hoeheBei(b.sNetz);
      if (h < netzHoehe(p.z) + BALL_R) fehler.push(`${name}: geht durchs Netz (${h.toFixed(2)} m, Netz ${netzHoehe(p.z).toFixed(2)} m bei z ${p.z.toFixed(1)})`);
    }
    // Order of events up to the contact: bounces and wall touches per side.
    const ereignisse = [];
    for (const s of b.bounces) if (s <= bisS + 1e-6) ereignisse.push({ s, art: "boden", x: pts.find((q) => q.s >= s - 1e-9).x });
    let anWand = false;
    for (const p of pts) {
      if (p.s > bisS + 1e-6) break;
      if (an(p) && !anWand && p.s > 0) ereignisse.push({ s: p.s, art: "wand", x: p.x });
      anWand = an(p);
    }
    ereignisse.sort((a, c) => a.s - c.s);
    if (b.sNetz !== null) {
      const vorNetz = ereignisse.filter((e) => e.s < b.sNetz);
      if (vorNetz.some((e) => e.art === "boden")) fehler.push(`${name}: springt auf der eigenen Seite auf, bevor er übers Netz geht`);
      const danach = ereignisse.filter((e) => e.s > b.sNetz && seite(e.x) !== eigene);
      if (danach[0]?.art === "wand") fehler.push(`${name}: trifft die Wand, bevor er auf der Gegenseite aufspringt (Fehler)`);
      const boeden = danach.filter((e) => e.art === "boden").length;
      if (boeden > 1) fehler.push(`${name}: springt ${boeden}× auf, bevor er gespielt wird`);
    }
    // Serve: at or below the waist, bounce behind the service line, into the diagonal box.
    if (b.typ === "aufschlag" && i === 0) {
      if (start.y > 1.0) fehler.push(`${name}: Aufschlag über Hüfthöhe getroffen (${start.y.toFixed(2)} m)`);
      if (Math.abs(start.x) < AUFSCHLAG_LINIE) fehler.push(`${name}: Aufschläger steht vor der Aufschlaglinie`);
      const auf = b.bounces[0];
      if (auf !== undefined) {
        const p = pts.find((q) => q.s >= auf - 1e-9);
        const imFeld = seite(p.x) !== eigene && Math.abs(p.x) <= AUFSCHLAG_LINIE && Math.sign(p.z) !== Math.sign(start.z);
        if (!imFeld) fehler.push(`${name}: Aufschlag springt nicht im diagonalen Aufschlagfeld auf (x ${p.x.toFixed(1)}, z ${p.z.toFixed(1)})`);
      }
    }
  });
  // A volley is played before the bounce.
  for (const s of sz.schlaege) {
    if (s.ball !== null || s.art !== "volley") continue;
    const b = sz.baelle.find((x) => x.ziel?.treffpunkt && Math.abs(x.t0 + (x.t1 - x.t0) * x.sZiel - s.t) < 1e-6);
    if (b && b.bounces.some((x) => x < b.sZiel)) fehler.push(`Volley: Ball springt vorher auf – das ist kein Volley`);
  }
  return fehler;
}

// Players posed over the whole scene with the video code.
export function spielerRegeln(sz, d = {}, schritt = 1 / 30) {
  const fehler = new Set();
  const st = new Steuerung(new THREE.Scene(), sz);
  // 1. Racket meets the ball at every contact.
  for (const s of st.schlaege) {
    st.stellen(s.t);
    const ball = s.ball !== null ? s.ball3 : (() => { for (const b of sz.baelle) { const p = ballBei(b, s.t); if (p) return new THREE.Vector3(p.x, p.y, p.z); } return s.ball3; })();
    const abw = s.f.figur.sweetspot().distanceTo(ball);
    if (abw > 0.1) fehler.add(`${s.f.person.id} (${s.name}): Schläger verfehlt den Ball um ${(abw * 100).toFixed(0)} cm`);
  }
  // 2.–4. Over time: ball through bodies, net, walls, overlaps.
  const seiten = Object.fromEntries(st.figuren.map((f) => [f.person.id, seite(f.person.pos.x)]));
  for (let t = -1.2; t <= sz.T; t += schritt) {
    st.stellen(t);
    let ball = null;
    for (const b of sz.baelle) { const p = ballBei(b, t); if (p && t <= b.t1) ball = new THREE.Vector3(p.x, p.y, p.z); }
    for (const f of st.figuren) {
      const id = f.person.id;
      const r = f.figur.root.position;
      if (seite(r.x) !== seiten[id] || Math.abs(r.x) < 0.35) fehler.add(`${id}: läuft ans oder übers Netz (x ${r.x.toFixed(2)} m bei ${t.toFixed(1)} s)`);
      if (!d.ausserhalb && (Math.abs(r.x) > 9.75 || Math.abs(r.z) > 4.75)) fehler.add(`${id}: steht in der Wand (x ${r.x.toFixed(1)}, z ${r.z.toFixed(1)} bei ${t.toFixed(1)} s)`);
      const ss = f.figur.sweetspot();
      if (ss.y < 0.05) fehler.add(`${id}: Schläger im Boden bei ${t.toFixed(1)} s`);
      for (const g of st.figuren) {
        if (g === f || g.person.id < id) continue;
        const dd = Math.hypot(r.x - g.figur.root.position.x, r.z - g.figur.root.position.z);
        if (dd < 0.6) fehler.add(`${id} und ${g.person.id}: stehen ineinander (${dd.toFixed(2)} m bei ${t.toFixed(1)} s)`);
      }
      if (!ball) continue;
      // The hitter and receiver are allowed close to the ball around their own contact.
      if (st.schlaege.some((s) => s.f === f && Math.abs(t - s.t) < 0.3)) continue;
      const becken = f.figur.becken.getWorldPosition(new THREE.Vector3());
      const kopf = f.figur.kopf.getWorldPosition(new THREE.Vector3());
      const rumpf = new THREE.Line3(becken, kopf).closestPointToPoint(ball, true, new THREE.Vector3());
      if (rumpf.distanceTo(ball) < 0.22) fehler.add(`${id}: Ball fliegt durch den Körper (${t.toFixed(1)} s, ${ball.y.toFixed(1)} m hoch)`);
    }
  }
  void position;
  return [...fehler];
}

export function pruefen(d) {
  const sz = szene(d);
  return [...ballRegeln(sz, d), ...spielerRegeln(sz, d)];
}
