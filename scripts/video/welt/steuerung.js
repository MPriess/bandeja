// Drives the players from the scene: where they stand, which way they face, which stroke they
// play when, how their feet step while running, where they look.
import * as THREE from "three";
import { Spieler } from "./spieler.js";
import { BEREIT, KONTAKT, SCHLAG_FUER, UEBERKOPF, schlagPose, schlagFenster, mischen } from "./posen.js";
import { position, ballBei } from "../szene.mjs";

const AUSSEHEN = {
  p: { trikot: 0xcdeb3b, hose: 0x0c1a24, haut: 0xd6a07c, haare: 0x3a2516, schuhe: 0xf3f4ee, schlaeger: { farbe: 0x0c1a24, akzent: 0xcdeb3b } },
  q: { trikot: 0xf3f4ee, hose: 0x0c1a24, haut: 0x8d5a3b, haare: 0x14100c, schuhe: 0x0c1a24, kappe: 0x0c1a24, schlaeger: { farbe: 0xf3f4ee, akzent: 0x2a63be } },
  a: { trikot: 0xc2552e, hose: 0x22323e, haut: 0xe2b694, haare: 0x6b4a2a, schuhe: 0xf3f4ee, schlaeger: { farbe: 0x22323e, akzent: 0xe07a52 } },
  b: { trikot: 0xe07a52, hose: 0x22323e, haut: 0xb07a55, haare: 0x1a1410, schuhe: 0x22323e, kappe: 0xf3f4ee, schlaeger: { farbe: 0xc2552e, akzent: 0xf3f4ee } },
};

const SCHRITT = 0.62; // step length while running, m
const ease = (t) => t * t * (3 - 2 * t);
const clamp = THREE.MathUtils.clamp;

// Distance along a person's path → world point (for planting the feet).
function wegPunkt(person, s) {
  const pts = person.weg.punkte;
  let rest = Math.max(0, s);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const l = Math.hypot(b.x - a.x, b.z - a.z);
    if (rest <= l || i === pts.length - 1) {
      const u = l ? clamp(rest / l, 0, 1) : 0;
      return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, dx: (b.x - a.x) / (l || 1), dz: (b.z - a.z) / (l || 1) };
    }
    rest -= l;
  }
  return { x: pts.at(-1).x, z: pts.at(-1).z, dx: 1, dz: 0 };
}
function wegLaenge(person) {
  const pts = person.weg.punkte;
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  return l;
}

export class Steuerung {
  constructor(scene, sz) {
    this.sz = sz;
    this.figuren = sz.personen.map((p, i) => {
      const f = new Spieler({ ...AUSSEHEN[p.id], name: p.id });
      scene.add(f.gruppe);
      return { person: p, figur: f, seed: i * 1.7, laenge: p.weg ? wegLaenge(p) : 0 };
    });
    // Each stroke: who, when, which motion, forehand or backhand, and where the body should be at contact.
    this.schlaege = sz.schlaege.map((s) => this.#planen(s)).filter(Boolean);
    for (const s of this.schlaege) this.#kontaktEinmessen(s);
  }

  #figur(id) { return this.figuren.find((f) => f.person.id === id); }

  #yaw(person) { return person.seite < 0 ? Math.PI / 2 : -Math.PI / 2; }

  #planen(s) {
    const f = this.#figur(s.wer);
    if (!f) return null;
    const name = SCHLAG_FUER[s.art] ?? "vorhand";
    const yaw = this.#yaw(f.person);
    const basis = position(f.person, s.t);
    // Ball relative to the body decides forehand or backhand (overheads are always on the right).
    const rel = new THREE.Vector3(s.kontakt.x - basis.x, 0, s.kontakt.z - basis.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw);
    const rueckhand = !UEBERKOPF.has(name) && name !== "aufschlag" && rel.x > 0.15;
    const ideal = new THREE.Vector3(...(KONTAKT[name] ?? KONTAKT.vorhand));
    if (rueckhand) ideal.x = -ideal.x * 0.85;
    // Step towards the ball so it meets the racket at the ideal spot (at most 4 m).
    const ziel = new THREE.Vector3(s.kontakt.x, 0, s.kontakt.z).sub(new THREE.Vector3(ideal.x, 0, ideal.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
    const versatz = ziel.sub(new THREE.Vector3(basis.x, 0, basis.z));
    if (versatz.length() > 4) versatz.setLength(4);
    return { ...s, f, name, rueckhand, yaw, versatz, kontaktHand: null, ball3: new THREE.Vector3(s.kontakt.x, s.kontakt.y, s.kontakt.z) };
  }

  // Solve the contact pose a few times so the sweet spot lands on the ball.
  #kontaktEinmessen(s) {
    const basis = position(s.f.person, s.t);
    const x = basis.x + s.versatz.x, z = basis.z + s.versatz.z;
    const ideal = new THREE.Vector3(...(KONTAKT[s.name] ?? KONTAKT.vorhand));
    let hand = [ideal.x * (s.rueckhand ? -0.85 : 1) * 0.6, s.ball3.y - 0.25, ideal.z * 0.7];
    for (let i = 0; i < 4; i++) {
      const pose = schlagPose(s.name, 0.0001, { rueckhand: s.rueckhand, kontakt: hand }) ?? BEREIT;
      s.f.figur.stellen({ x, z, yaw: s.yaw, pose: { ...pose, hand } });
      const fehler = s.ball3.clone().sub(s.f.figur.sweetspot());
      const lokal = fehler.applyAxisAngle(new THREE.Vector3(0, 1, 0), -s.yaw);
      hand = [hand[0] + lokal.x, hand[1] + lokal.y, hand[2] + lokal.z];
    }
    s.kontaktHand = hand;
  }

  stellen(t) {
    const ballJetzt = this.#ballJetzt(t);
    for (const f of this.figuren) {
      const p = f.person;
      const pos = position(p, t);
      let x = pos.x, z = pos.z;
      let yaw = this.#yaw(p);
      // The stroke of this person whose window contains t; with two overlapping strokes the one
      // closer to its contact wins, so steps towards the ball never add up.
      let pose = null, sw = 0, best = null;
      for (const s of this.schlaege) {
        if (s.f !== f) continue;
        const [w0, w1] = schlagFenster(s.name);
        const rt = t - s.t;
        if (rt <= w0 || rt >= w1) continue;
        if (!best || Math.abs(rt) < Math.abs(t - best.t)) best = s;
      }
      if (best) {
        const [w0, w1] = schlagFenster(best.name);
        const rt = t - best.t;
        pose = schlagPose(best.name, rt, { rueckhand: best.rueckhand, kontakt: best.kontaktHand });
        // Weight of the step towards the ball: in before contact, hold, back afterwards.
        sw = rt < 0 ? ease(clamp((rt - w0) / (-w0 * 0.85), 0, 1)) : 1 - ease(clamp((rt - 0.35) / (w1 - 0.35), 0, 1));
        x += best.versatz.x * sw;
        z += best.versatz.z * sw;
      }
      // Running: arms swing, feet are planted along the path.
      const k = clamp(pos.v / 1.6, 0, 1) * (1 - sw);
      let fuesse = null;
      const phase = p.weg ? (pos.strecke ?? 0) / (2 * SCHRITT) : 0;
      const wq = this.#quer(f, pos, yaw);
      if (!pose) {
        const atmen = 0.012 * Math.sin(t * 2.3 + f.seed);
        const lauf = {
          ...BEREIT,
          hand: [-0.3, 1.02 + 0.06 * Math.sin(phase * 2 * Math.PI), 0.15 + 0.18 * Math.sin(phase * 2 * Math.PI)],
          dir: [-0.15, 0.7, 0.7], norm: [-1, 0, 0.2],
          links: [0.28, 1.05 - 0.06 * Math.sin(phase * 2 * Math.PI), 0.1 - 0.22 * Math.sin(phase * 2 * Math.PI)],
          lean: 18, tief: 0.08 + 0.035 * Math.abs(Math.sin(phase * 2 * Math.PI)),
        };
        // Side steps: low ready position, racket in front, no arm swing.
        const seit = { ...BEREIT, lean: 16, tief: 0.17 + 0.03 * Math.abs(Math.sin((pos.strecke ?? 0) / 0.5 * Math.PI)) };
        pose = mischen({ ...BEREIT, tief: BEREIT.tief + atmen }, mischen(lauf, seit, wq), k);
        // Split step: when someone on the other side hits, hop lightly at the contact and land low.
        for (const sch of this.schlaege) {
          if (sch.f.person.team === p.team) continue;
          const rt = t - sch.t;
          if (rt > -0.25 && rt < 0.05) pose.sprung += 0.07 * Math.sin(Math.PI * (rt + 0.25) / 0.3);
          if (rt >= 0.05 && rt < 0.45) pose.tief += 0.08 * Math.sin(Math.PI * (rt - 0.05) / 0.4);
        }
      }
      if (p.weg && k > 0.01) fuesse = this.#fuesse(f, pos, k, x - pos.x, z - pos.z, yaw, wq);
      f.figur.stellen({ x, z, yaw, pose, blick: ballJetzt ?? new THREE.Vector3(-p.seite * 6, 1, 0), fuesse });
    }
  }

  // How much a movement goes sideways to the facing direction (0 = forward/back, 1 = sideways).
  #quer(f, pos, yaw) {
    if (!pos.richtung) return 0;
    const l = Math.hypot(pos.richtung.x, pos.richtung.z) || 1;
    const dot = Math.abs((pos.richtung.x * Math.sin(yaw) + pos.richtung.z * Math.cos(yaw)) / l);
    return clamp((0.75 - dot) / 0.4, 0, 1);
  }

  // Feet while moving: running steps along the path, or side steps (shuffle) when the path goes
  // sideways – then the feet stay on their side of the body, the leading foot steps first and the
  // other one closes up, they never cross.
  #fuesse(f, pos, k, ox, oz, yaw, wq) {
    const L = SCHRITT, s = pos.strecke ?? 0;
    const out = {};
    const Yachse = new THREE.Vector3(0, 1, 0);
    const links = new THREE.Vector3(1, 0, 0).applyAxisAngle(Yachse, yaw); // the player's left in the world
    const r = pos.richtung ?? { x: 1, z: 0 };
    const vorLinks = r.x * links.x + r.z * links.z > 0; // moving towards the left: the left foot leads
    for (const [seite, versatz, quer] of [["l", 0, 1], ["r", L, -1]]) {
      // Running.
      const sv = s + versatz;
      const n = Math.floor(sv / (2 * L)), u = sv / (2 * L) - n;
      let sf = 2 * L * n + L / 2 + (u < 0.5 ? 0 : ease((u - 0.5) / 0.5) * 2 * L) - versatz;
      sf = Math.min(sf, f.laenge);
      const w = wegPunkt(f.person, sf);
      const hub = u < 0.5 ? 0 : 0.14 * Math.sin(Math.PI * (u - 0.5) / 0.5);
      const lauf = new THREE.Vector3(w.x - quer * w.dz * 0.12 + ox, 0.075 + hub, w.z + quer * w.dx * 0.12 + oz);
      // Side steps: step length 0.5 m, the leading foot moves in the first half of each cycle.
      const Q = 0.5;
      const fuehrt = (quer > 0) === vorLinks;
      const sq = s / Q, m = Math.floor(sq), v = sq - m;
      const anteil = fuehrt ? ease(clamp(v / 0.5, 0, 1)) : ease(clamp((v - 0.5) / 0.5, 0, 1));
      const sf2 = Math.min(f.laenge, (m + anteil) * Q);
      const w2 = wegPunkt(f.person, sf2);
      const hub2 = 0.06 * Math.sin(Math.PI * (fuehrt ? clamp(v / 0.5, 0, 1) : clamp((v - 0.5) / 0.5, 0, 1)));
      const seit = new THREE.Vector3(w2.x + ox, 0.075 + hub2, w2.z + oz).add(links.clone().multiplyScalar(quer * 0.24));
      const bewegt = lauf.lerp(seit, wq);
      const stand = new THREE.Vector3(pos.x + ox, 0.075, pos.z + oz).add(new THREE.Vector3(quer * 0.23, 0, quer * 0.04).applyAxisAngle(Yachse, yaw));
      out[seite] = stand.lerp(bewegt, k);
    }
    return out;
  }

  #ballJetzt(t) {
    for (const b of this.sz.baelle) {
      const p = ballBei(b, t);
      if (p && t <= b.t1) return new THREE.Vector3(p.x, p.y, p.z);
    }
    return null;
  }
}
