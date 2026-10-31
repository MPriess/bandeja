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
  R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  R.setPixelRatio(1);
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

function kameraBei(name, t) {
  return KAMERAS[name](sz, job.format, t);
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

window.bild = (tau) => {
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
  R.render(scene, cam);

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
