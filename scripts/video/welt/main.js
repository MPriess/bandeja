// Renderer page: builds the world for one clip and draws any moment on request.
// The CLI calls window.vorbereiten(job) once and then window.bild(tau) for every frame.
import * as THREE from "three";
import { baueCourt, baueLicht, baueMarkierungen, baueUmgebung, FARBEN } from "./court.js";
import { Steuerung } from "./steuerung.js";
import { szene, ballBei } from "../szene.mjs";
import { KAMERAS, FORMATE, fahrt } from "../kameras.mjs";
import { zeitplan, bei, KAMERA_NAMEN, VORLAUF } from "../zeitplan.mjs";

let R, scene, cam, steuerung, sz, plan, job, ballMesh, schatten, spur, ringe, ebene;

function himmel() {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 256;
  const g = c.getContext("2d");
  const v = g.createLinearGradient(0, 0, 0, 256);
  v.addColorStop(0, "#1d3a5c");
  v.addColorStop(0.55, "#16293b");
  v.addColorStop(1, "#0c1a24");
  g.fillStyle = v;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function schattenTextur() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(0,0,0,0.55)");
  r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function el(cls, html = "") {
  const d = document.createElement("div");
  d.className = cls;
  d.innerHTML = html;
  ebene.appendChild(d);
  return d;
}

window.vorbereiten = async (j) => {
  job = j;
  const { breite, hoehe } = FORMATE[j.format];
  const buehne = document.getElementById("buehne");
  buehne.className = j.format;
  buehne.style.width = `${breite}px`;
  buehne.style.height = `${hoehe}px`;
  // Draft quality: render at the reduced pixel size directly (not full HD scaled down afterwards),
  // without antialiasing and with a small shadow map – several times faster for quick iterations.
  R = new THREE.WebGLRenderer({ antialias: !j.entwurf, preserveDrawingBuffer: true });
  R.setPixelRatio(j.pixelRatio ?? 1);
  R.setSize(breite, hoehe);
  R.shadowMap.enabled = true;
  R.shadowMap.type = THREE.PCFSoftShadowMap;
  R.toneMapping = THREE.ACESFilmicToneMapping;
  R.toneMappingExposure = 1.05;
  R.outputColorSpace = THREE.SRGBColorSpace;
  buehne.appendChild(R.domElement);
  ebene = document.createElement("div");
  ebene.className = "ebene";
  buehne.appendChild(ebene);

  scene = new THREE.Scene();
  scene.background = himmel();
  cam = new THREE.PerspectiveCamera(40, breite / hoehe, 0.1, 200);
  baueLicht(scene);
  if (j.entwurf) scene.traverse((o) => { if (o.isDirectionalLight && o.castShadow) o.shadow.mapSize.set(512, 512); });
  scene.add(baueCourt());
  scene.add(await baueUmgebung());
  sz = szene(j.d);
  if (j.markierungen !== false) scene.add(baueMarkierungen(sz));
  steuerung = new Steuerung(scene, sz);

  // Padel ball: 6.5 cm, drawn slightly larger so it reads in wide shots.
  ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), new THREE.MeshStandardMaterial({ color: 0xe6f03c, emissive: 0x3a4410, roughness: 0.6 }));
  ballMesh.castShadow = true;
  scene.add(ballMesh);
  schatten = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: schattenTextur(), transparent: true, depthWrite: false }));
  schatten.rotation.x = -Math.PI / 2;
  scene.add(schatten);
  spur = Array.from({ length: 9 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.045 * (1 - i / 11), 10, 8), new THREE.MeshBasicMaterial({ color: FARBEN.lime, transparent: true, opacity: 0.5 * (1 - i / 9), depthWrite: false }));
    scene.add(m);
    return m;
  });
  // Rings where the ball bounces.
  ringe = [];
  for (const b of sz.baelle) for (const s of b.bounces) {
    const p = b.punkte.reduce((best, q) => (Math.abs(q.s - s) < Math.abs(best.s - s) ? q : best));
    const m = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.16, 32), new THREE.MeshBasicMaterial({ color: FARBEN.lime, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(p.x, 0.008, p.z);
    scene.add(m);
    ringe.push({ m, t: b.t0 + (b.t1 - b.t0) * s });
  }

  plan = zeitplan(sz, j.buch);
  // Overlays.
  ebene.innerHTML = "";
  ebene.titel = el("titel");
  ebene.text = el("text");
  ebene.kamera = el("kamera");
  ebene.marke = el("marke", "bandeja<span>.</span>");
  ebene.abspann = el("abspann", `<div class="gross">bandeja<span>.</span></div><div class="klein"></div>`);
  ebene.abspann.querySelector(".klein").textContent = plan.abspann?.text ?? "";
  await document.fonts.ready;
  return { dauer: plan.dauer, T: sz.T };
};

// TV, side and oblique cameras pan a little with the ball, like a broadcast; the weight fades in
// after the hit and out before the ball arrives, so the camera never jerks.
const FOLGT = { tv: [0.12, 0.25], seite: [0.25, 0.1], schraeg: [0.12, 0.2] };
function kameraBei(name, t) {
  const k = KAMERAS[name](sz, job.format, t);
  const f = FOLGT[name];
  if (!f) return k;
  for (const b of sz.baelle) {
    const p = ballBei(b, t);
    if (!p || t > b.t1) continue;
    const w = Math.max(0, Math.min(1, (t - b.t0) / 0.4, (b.t1 - t) / 0.5));
    const e = w * w * (3 - 2 * w);
    return { ...k, ziel: [k.ziel[0] + p.x * f[0] * e, k.ziel[1] + Math.max(0, p.y - 1.5) * 0.12 * e, k.ziel[2] + p.z * f[1] * e] };
  }
  return k;
}

function ballZeigen(t) {
  let p = null, b = null;
  for (const x of sz.baelle) { const q = ballBei(x, t); if (q && t <= x.t1) { p = q; b = x; break; } }
  // Serve: the ball is dropped from the left hand and bounces once before the contact.
  const auf = steuerung.schlaege.find((s) => s.art === "aufschlag");
  if (!p && auf && t > auf.t - 0.8 && t < auf.t) {
    const k = auf.ball3, u = t - (auf.t - 0.8);
    const w = (u - 0.42) / 0.38;
    const y = u < 0.42 ? 1.0 - (u / 0.42) ** 2 : k.y * (1 - (1 - w) ** 2);
    p = { x: k.x + 0.05, y: Math.max(0.033, y), z: k.z };
  }
  // A ball taken in the air flies on a little after the contact, towards the other side.
  if (!p) for (const x of sz.baelle) {
    if (!x.ziel?.treffpunkt || t <= x.t1 || t > x.t1 + 0.45) continue;
    const e = x.punkte.at(-1), u = t - x.t1;
    const s = e.x > 0 ? -1 : 1;
    p = { x: e.x + s * 9 * u, y: Math.max(0.05, e.y - 2.5 * u), z: e.z * (1 - u) };
  }
  ballMesh.visible = schatten.visible = !!p;
  if (p) {
    ballMesh.position.set(p.x, Math.max(0.033, p.y), p.z);
    schatten.position.set(p.x, 0.005, p.z);
    const k = 1 + p.y * 0.4;
    schatten.scale.set(k, k, k);
    schatten.material.opacity = Math.max(0.15, 1 - p.y / 8);
  }
  spur.forEach((m, i) => {
    const q = b ? ballBei(b, t - (i + 1) * 0.022) : null;
    m.visible = !!q && t - (i + 1) * 0.022 >= b.t0;
    if (q) m.position.set(q.x, Math.max(0.033, q.y), q.z);
  });
  for (const r of ringe) {
    const u = (t - r.t) / 0.6;
    r.m.visible = u >= 0 && u <= 1;
    if (r.m.visible) { r.m.scale.setScalar(1 + u * 3); r.m.material.opacity = 0.9 * (1 - u); }
  }
}

const fade = (tau, a, b, f = 0.3) => Math.max(0, Math.min(1, (tau - a) / f, (b - tau) / f));

// zeichnen = false: only pose everything (for exports), skip the expensive drawing.
window.bild = (tau, zeichnen = true) => {
  const abspann = plan.abspann && tau >= plan.abspann.t0;
  const { abschnitt: a, szeneT, u } = bei(plan, Math.min(tau, plan.abspann?.t0 - 1e-6 || tau));
  const t = Math.max(-VORLAUF, Math.min(sz.T, szeneT));
  steuerung.stellen(t);
  ballZeigen(t);
  const k = a.von ? fahrt(kameraBei(a.von, t), kameraBei(a.kamera, t), u) : kameraBei(a.kamera, t);
  cam.position.set(...k.pos);
  cam.up.set(...(k.up ?? [0, 1, 0]));
  cam.fov = k.fov;
  cam.updateProjectionMatrix();
  cam.lookAt(...k.ziel);
  if (zeichnen) R.render(scene, cam);

  // Overlays: title in the first section, section text, camera chip, end card.
  const erster = plan.abschnitte[0];
  const titel = job.buch.titel;
  ebene.titel.textContent = titel ?? "";
  ebene.titel.style.opacity = titel && !abspann ? fade(tau, erster.t0, erster.t1 + (plan.abschnitte[1]?.t1 - plan.abschnitte[1]?.t0 || 0)) : 0;
  ebene.text.textContent = a.text ?? "";
  ebene.text.style.opacity = a.text && !abspann ? fade(tau, a.t0, a.t1) : 0;
  const name = (KAMERA_NAMEN[a.kamera] ?? a.kamera) + (a.tempo > 0 && a.tempo < 1 ? " · Zeitlupe" : "");
  ebene.kamera.textContent = name;
  ebene.kamera.style.opacity = !a.von && !abspann ? fade(tau, a.t0, a.t1) : 0;
  ebene.abspann.style.opacity = abspann ? fade(tau, plan.abspann.t0, plan.abspann.t1 + 1, 0.4) : 0;
  ebene.marke.style.opacity = abspann ? 0 : 1;
  return true;
};

window.bereit = true;

// ---- Export for other tools (Blender, own analysis): data per frame and an animated glTF. ----

const r3 = (v) => [+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)];

// Everything that changes, sampled at `fps`: players (root, joints, racket), ball, camera, overlay text.
window.exportDaten = (fps = 30) => {
  const frames = [];
  const n = Math.round(plan.dauer * fps);
  for (let i = 0; i < n; i++) {
    const tau = i / fps;
    window.bild(tau, false);
    const { abschnitt: a, szeneT } = bei(plan, Math.min(tau, plan.abspann?.t0 - 1e-6 || tau));
    frames.push({
      bild: i, zeit: +tau.toFixed(4), szeneZeit: +Math.max(-VORLAUF, Math.min(sz.T, szeneT)).toFixed(4),
      abschnitt: plan.abschnitte.indexOf(a) + 1, abspann: !!(plan.abspann && tau >= plan.abspann.t0),
      kamera: { name: a.kamera, pos: r3(cam.position), blick: r3(new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion)), fov: +cam.fov.toFixed(2) },
      ball: ballMesh.visible ? r3(ballMesh.position) : null,
      spieler: Object.fromEntries(steuerung.figuren.map((f) => {
        const g = f.figur.gelenkeWelt();
        return [f.person.id, {
          wurzel: r3(f.figur.root.position), yaw: +f.figur.root.rotation.y.toFixed(4),
          gelenke: Object.fromEntries(Object.entries(g).map(([k, v]) => [k, r3(v)])),
          schlaeger: { pos: r3(f.figur.schlaeger.position), quat: f.figur.schlaeger.quaternion.toArray().map((x) => +x.toFixed(5)) },
        }];
      })),
      text: ebene.text.style.opacity > 0 ? ebene.text.textContent : null,
    });
  }
  return { fps, dauer: plan.dauer, frames };
};

// The whole 3D scene as binary glTF with one animation (every moving part sampled per frame).
window.exportGlb = async (fps = 30) => {
  const { GLTFExporter } = await import("/node_modules/three/examples/jsm/exporters/GLTFExporter.js");
  cam.name = "Kamera";
  scene.add(cam);
  ballMesh.name = "Ball";
  const bewegt = [ballMesh, cam];
  steuerung.figuren.forEach((f) => {
    const id = f.person.id;
    f.figur.gruppe.name = `Spieler_${id}`;
    for (const [k, o] of [["wurzel", f.figur.root], ["becken", f.figur.becken], ["brust", f.figur.brust], ["kopf", f.figur.kopf], ["schlaeger", f.figur.schlaeger], ["band", f.figur.band]]) { o.name = `${id}_${k}`; bewegt.push(o); }
    for (const [k, meshes] of Object.entries(f.figur.glieder)) meshes.forEach((m, i) => { m.name = `${id}_${k}_${i}`; bewegt.push(m); });
  });
  const n = Math.round(plan.dauer * fps), zeiten = [];
  const spuren = bewegt.map(() => ({ p: [], q: [], s: [] }));
  for (let i = 0; i < n; i++) {
    window.bild(i / fps, false);
    zeiten.push(i / fps);
    bewegt.forEach((o, j) => {
      spuren[j].p.push(...o.position.toArray());
      spuren[j].q.push(...o.quaternion.toArray());
      const sc = o === ballMesh && !o.visible ? 0 : 1;
      spuren[j].s.push(sc, sc, sc);
    });
  }
  const tracks = [];
  bewegt.forEach((o, j) => {
    tracks.push(new THREE.VectorKeyframeTrack(`${o.name}.position`, zeiten, spuren[j].p));
    tracks.push(new THREE.QuaternionKeyframeTrack(`${o.name}.quaternion`, zeiten, spuren[j].q));
    if (o === ballMesh) tracks.push(new THREE.VectorKeyframeTrack(`${o.name}.scale`, zeiten, spuren[j].s));
  });
  const clip = new THREE.AnimationClip("Szene", plan.dauer, tracks);
  ballMesh.visible = true;
  const glb = await new GLTFExporter().parseAsync(scene, { binary: true, animations: [clip], onlyVisible: false });
  const bytes = new Uint8Array(glb);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
