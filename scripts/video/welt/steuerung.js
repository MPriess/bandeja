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

export class Steuerung {
  constructor(scene, sz) {
    this.sz = sz;
    this.figuren = sz.personen.map((p, i) => {
      const f = new Spieler({ ...AUSSEHEN[p.id], name: p.id });
      scene.add(f.gruppe);
      return { person: p, figur: f, seed: i * 1.7 };
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

  // Body of a person at time t without the feet: position, facing, pose, where they look.
  #koerper(f, t, ballJetzt) {
    const p = f.person;
    const pos = position(p, t);
    let x = pos.x, z = pos.z;
    let yaw = this.#yaw(p);
    // The stroke of this person whose window contains t; with two overlapping strokes the one
    // closer to its contact wins, so steps towards the ball never add up.
    let pose = null, sw = 0, best = null, imSchlag = 0;
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
      imSchlag = Math.min(ease(clamp((rt - w0) / 0.3, 0, 1)), ease(clamp((w1 - rt) / 0.3, 0, 1)));
      x += best.versatz.x * sw;
      z += best.versatz.z * sw;
    }
    // Turn towards the ball while it is in the air (not during the own stroke, which has its own turn).
    if (ballJetzt) {
      const zumBall = Math.atan2(ballJetzt.x - x, ballJetzt.z - z);
      let d = zumBall - yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      yaw += clamp(d, -0.9, 0.9) * 0.55 * ballJetzt.gewicht * (1 - imSchlag);
    }
    const k = clamp(pos.v / 1.6, 0, 1) * (1 - sw);
    const phase = p.weg ? (pos.strecke ?? 0) / (2 * SCHRITT) : 0;
    const wq = this.#quer(f, pos, yaw);
    if (!pose) {
      // Ready position: breathing, and a light bounce on the toes while the ball is in play.
      const wippen = ballJetzt ? 0.018 * Math.abs(Math.sin(t * Math.PI * 1.8 + f.seed)) : 0.012 * Math.sin(t * 2.3 + f.seed);
      const lauf = {
        ...BEREIT,
        // Racket carried in front of the body, arms swinging a little with the steps.
        hand: [-0.24, 1.08 + 0.04 * Math.sin(phase * 2 * Math.PI), 0.3 + 0.1 * Math.sin(phase * 2 * Math.PI)],
        dir: [0.1, 0.85, 0.45], norm: [0, -0.2, 1],
        links: [0.22, 1.08 - 0.04 * Math.sin(phase * 2 * Math.PI), 0.22 - 0.14 * Math.sin(phase * 2 * Math.PI)],
        lean: 18, tief: 0.08 + 0.035 * Math.abs(Math.sin(phase * 2 * Math.PI)),
      };
      // Side steps: low ready position, racket in front, no arm swing.
      const seit = { ...BEREIT, lean: 16, tief: 0.17 + 0.03 * Math.abs(Math.sin((pos.strecke ?? 0) / 0.5 * Math.PI)) };
      pose = mischen({ ...BEREIT, tief: BEREIT.tief + wippen }, mischen(lauf, seit, wq), k);
      // Split step: when someone on the other side hits, hop lightly at the contact and land low.
      for (const sch of this.schlaege) {
        if (sch.f.person.team === p.team) continue;
        const rt = t - sch.t;
        if (rt > -0.25 && rt < 0.05) pose.sprung += 0.07 * Math.sin(Math.PI * (rt + 0.25) / 0.3);
        if (rt >= 0.05 && rt < 0.45) pose.tief += 0.08 * Math.sin(Math.PI * (rt - 0.05) / 0.4);
      }
    }
    return { x, z, yaw, pose };
  }

  // Where each foot would stand under the body right now (stance turned with the hips).
  #stand(k) {
    const r = (k.yaw + THREE.MathUtils.degToRad(k.pose.drehung)) * 0.85;
    const Y = new THREE.Vector3(0, 1, 0);
    return {
      l: new THREE.Vector3(0.23, 0, 0.04).applyAxisAngle(Y, r).add(new THREE.Vector3(k.x, 0, k.z)),
      r: new THREE.Vector3(-0.23, 0, -0.04).applyAxisAngle(Y, r).add(new THREE.Vector3(k.x, 0, k.z)),
    };
  }

  // Footwork, simulated once over the whole scene: every foot stays planted until the body has
  // moved too far from it, then it steps – one foot after the other, aiming a little ahead in the
  // direction of travel. Covers running, side steps, the step to the ball and walking back.
  #schrittfolge(f) {
    const DT = 1 / 120, t0 = -1.5, t1 = this.sz.T + 0.6;
    const koerper = (t) => this.#koerper(f, t, this.#ballJetzt(t));
    let k = koerper(t0);
    const fuss = { l: { pos: this.#stand(k).l, schritt: null }, r: { pos: this.#stand(k).r, schritt: null } };
    let zuletzt = "r";
    const spur = [];
    for (let t = t0; t <= t1 + 1e-9; t += DT) {
      k = koerper(t);
      const vor = koerper(t + 0.05);
      const vx = (vor.x - k.x) / 0.05, vz = (vor.z - k.z) / 0.05, v = Math.hypot(vx, vz);
      const soll = this.#stand(k);
      // Finish steps that have landed.
      for (const s of ["l", "r"]) {
        const st = fuss[s].schritt;
        if (st && t >= st.t1) { fuss[s].pos = st.nach.clone(); fuss[s].schritt = null; zuletzt = s; }
      }
      // Start a new step if a foot is too far from where it should be.
      const abstand = (s) => fuss[s].pos.distanceTo(soll[s]);
      const grenze = v > 0.4 ? 0.1 : 0.17;
      const frei = (s) => !fuss[s].schritt;
      const kandidaten = ["l", "r"].filter((s) => frei(s) && abstand(s) > grenze).sort((a, b) => abstand(b) - abstand(a));
      const anderer = (s) => (s === "l" ? "r" : "l");
      for (const s of kandidaten) {
        // One foot at a time, alternating; both only when running fast (flight phase).
        if (fuss[anderer(s)].schritt && abstand(s) < 0.5) continue;
        if (s === zuletzt && kandidaten.length > 1 && frei(anderer(s))) continue;
        const dauer = clamp(0.3 - 0.045 * v, 0.13, 0.3);
        const ziel = this.#stand(koerper(t + dauer))[s].add(new THREE.Vector3(vx, 0, vz).multiplyScalar(0.09));
        fuss[s].schritt = { t0: t, t1: t + dauer, von: fuss[s].pos.clone(), nach: ziel, hub: 0.05 + 0.025 * Math.min(v, 4) };
        zuletzt = s;
      }
      const lage = (s) => {
        const st = fuss[s].schritt;
        if (!st) return fuss[s].pos.clone();
        const u = clamp((t - st.t0) / (st.t1 - st.t0), 0, 1);
        return st.von.clone().lerp(st.nach, ease(u)).setY(Math.sin(Math.PI * u) * st.hub);
      };
      spur.push({ l: lage("l"), r: lage("r") });
    }
    return { t0, DT, spur };
  }

  #fuesseBei(f, t, sprung) {
    if (!f.schritte) f.schritte = this.#schrittfolge(f);
    const { t0, DT, spur } = f.schritte;
    const g = clamp((t - t0) / DT, 0, spur.length - 1);
    const i = Math.min(spur.length - 2, Math.floor(g)), u = g - i;
    const out = {};
    for (const s of ["l", "r"]) out[s] = spur[i][s].clone().lerp(spur[i + 1][s], u).add(new THREE.Vector3(0, 0.075 + sprung, 0));
    return out;
  }

  stellen(t) {
    const ballJetzt = this.#ballJetzt(t);
    for (const f of this.figuren) {
      const k = this.#koerper(f, t, ballJetzt);
      const fuesse = this.#fuesseBei(f, t, k.pose.sprung);
      f.figur.stellen({ x: k.x, z: k.z, yaw: k.yaw, pose: k.pose, blick: ballJetzt ?? new THREE.Vector3(-f.person.seite * 6, 1, 0), fuesse });
    }
  }

  // How much a movement goes sideways to the facing direction (0 = forward/back, 1 = sideways).
  #quer(f, pos, yaw) {
    if (!pos.richtung) return 0;
    const l = Math.hypot(pos.richtung.x, pos.richtung.z) || 1;
    const dot = Math.abs((pos.richtung.x * Math.sin(yaw) + pos.richtung.z * Math.cos(yaw)) / l);
    return clamp((0.75 - dot) / 0.4, 0, 1);
  }

  #ballJetzt(t) {
    for (const b of this.sz.baelle) {
      const p = ballBei(b, t);
      if (p && t <= b.t1) {
        const v = new THREE.Vector3(p.x, p.y, p.z);
        // Fade the reaction in after the hit and out before the ball arrives.
        v.gewicht = Math.min(ease(clamp((t - b.t0) / 0.3, 0, 1)), ease(clamp((b.t1 - t) / 0.25, 0, 1)));
        return v;
      }
    }
    return null;
  }

}
