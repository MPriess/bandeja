// A player: body with a simple skeleton (hips → chest → head), arms and legs solved with
// two-bone IK every frame, racket in the right hand. Height about 1.80 m.
import * as THREE from "three";
import { baueSchlaeger } from "./schlaeger.js";

const MASS = { oberarm: 0.3, unterarm: 0.26, oberschenkel: 0.44, unterschenkel: 0.44, knoechel: 0.075, huefte: 0.95, schulter: 0.19, schulterY: 0.42, huefteX: 0.095 };
const Y = new THREE.Vector3(0, 1, 0);
const v = (a) => new THREE.Vector3(a[0], a[1], a[2]);

function mat(color, rough = 0.75) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough });
}
function kapsel(r, l, m) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 12), m);
  mesh.castShadow = true;
  return mesh;
}
function drehkoerper(profil, m, tiefe) {
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(profil.map(([r, y]) => new THREE.Vector2(r, y)), 24), m);
  mesh.scale.z = tiefe;
  mesh.castShadow = true;
  return mesh;
}

// Two-bone IK: elbow/knee position for a chain from `a` to target `t` with lengths l1, l2, bending towards `pol`.
export function zweiGlieder(a, t, l1, l2, pol) {
  const d = t.clone().sub(a);
  const dist = THREE.MathUtils.clamp(d.length(), 0.05, l1 + l2 - 1e-4);
  d.normalize();
  const x = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const p = pol.clone().sub(a);
  p.sub(d.clone().multiplyScalar(p.dot(d)));
  if (p.lengthSq() < 1e-8) p.set(0, 0, 1);
  p.normalize();
  const mitte = a.clone().add(d.clone().multiplyScalar(x)).add(p.multiplyScalar(h));
  return { mitte, ende: a.clone().add(d.multiplyScalar(dist)) };
}

// Place a mesh built along +Y between two points.
function zwischen(mesh, a, b, versatz = 0.5) {
  const d = b.clone().sub(a);
  const l = d.length();
  mesh.position.copy(a).add(d.clone().multiplyScalar(versatz));
  if (l > 1e-6) mesh.quaternion.setFromUnitVectors(Y, d.divideScalar(l));
}

export class Spieler {
  constructor({ trikot = 0xcdeb3b, hose = 0x0c1a24, haut = 0xd9a07a, haare = 0x2b1d14, schuhe = 0xf3f4ee, socken = 0xf3f4ee, schlaeger = {}, kappe = null, name = "" } = {}) {
    this.name = name;
    this.gruppe = new THREE.Group();
    this.root = new THREE.Group();
    this.becken = new THREE.Group();
    this.brust = new THREE.Group();
    this.kopf = new THREE.Group();
    this.gruppe.add(this.root);
    this.root.add(this.becken);
    this.becken.add(this.brust);
    this.brust.position.y = 0.06;
    this.brust.rotation.order = "YXZ";
    this.brust.add(this.kopf);
    this.kopf.position.y = 0.6;
    this.kopf.rotation.order = "YXZ";

    const mTrikot = mat(trikot, 0.85), mHose = mat(hose, 0.85), mHaut = mat(haut, 0.6), mHaare = mat(haare, 0.9);
    // Torso: shirt from the waist to the shoulders, shorts around the hips.
    this.brust.add(drehkoerper([[0.0, -0.08], [0.135, -0.08], [0.145, 0.05], [0.15, 0.2], [0.175, 0.33], [0.165, 0.41], [0.1, 0.46], [0.055, 0.48], [0, 0.48]], mTrikot, 0.62));
    const hals = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 10), mHaut);
    hals.position.y = 0.5;
    hals.castShadow = true;
    this.brust.add(hals);
    const hose_ = drehkoerper([[0, 0.12], [0.145, 0.12], [0.16, 0.0], [0.165, -0.1], [0, -0.1]], mHose, 0.72);
    this.becken.add(hose_);
    // Head: skull, hair, nose and ears so the facing reads from far away.
    const schaedel = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), mHaut);
    schaedel.scale.set(0.9, 1.12, 1);
    schaedel.castShadow = true;
    this.kopf.add(schaedel);
    const haar = new THREE.Mesh(new THREE.SphereGeometry(0.104, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), mHaare);
    haar.scale.set(0.92, 1.14, 1.02);
    haar.rotation.x = -0.35;
    haar.position.set(0, 0.012, -0.008);
    this.kopf.add(haar);
    const nase = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), mHaut);
    nase.position.set(0, -0.005, 0.098);
    this.kopf.add(nase);
    for (const s of [-1, 1]) {
      const ohr = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), mHaut);
      ohr.scale.set(0.5, 1, 0.8);
      ohr.position.set(s * 0.092, 0, 0);
      this.kopf.add(ohr);
    }
    if (kappe !== null) {
      const mk = mat(kappe, 0.8);
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.108, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), mk);
      k.scale.set(0.93, 1.1, 1.03);
      k.position.y = 0.012;
      this.kopf.add(k);
      const schirm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.008, 16, 1, false, -Math.PI / 2, Math.PI), mk);
      schirm.position.set(0, 0.035, 0.07);
      schirm.rotation.x = 0.15;
      this.kopf.add(schirm);
    }

    // Limbs live directly in the group and are placed in world space each frame.
    this.glieder = {};
    const g = (name, ...meshes) => { this.glieder[name] = meshes; meshes.forEach((m) => this.gruppe.add(m)); };
    for (const s of ["l", "r"]) {
      g(`oberarm${s}`, kapsel(0.05, MASS.oberarm, mHaut), kapsel(0.064, 0.11, mTrikot));
      g(`unterarm${s}`, kapsel(0.041, MASS.unterarm, mHaut));
      g(`hand${s}`, kapsel(0.041, 0.05, mHaut));
      g(`oberschenkel${s}`, kapsel(0.08, MASS.oberschenkel, mHaut), kapsel(0.097, 0.19, mHose));
      g(`unterschenkel${s}`, kapsel(0.058, MASS.unterschenkel, mHaut), kapsel(0.061, 0.1, mat(socken, 0.9)));
      const schuh = new THREE.Group();
      const ober = kapsel(0.048, 0.17, mat(schuhe, 0.5));
      ober.rotation.x = Math.PI / 2;
      ober.scale.set(1.05, 1, 0.85);
      const sohle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.022, 0.27), mat(0x22323e, 0.9));
      sohle.position.y = -0.04;
      sohle.castShadow = true;
      schuh.add(ober, sohle);
      g(`schuh${s}`, schuh);
    }
    // Sweatband on the racket wrist.
    this.band = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.05, 12), mat(0xf3f4ee, 0.9));
    this.gruppe.add(this.band);
    this.schlaeger = baueSchlaeger(schlaeger);
    this.gruppe.add(this.schlaeger);
  }

  // state: { x, z, yaw, pose, blick (world point or null), fuesse: { l, r } world ankle targets or null }
  stellen({ x, z, yaw, pose, blick = null, fuesse = null }) {
    this.root.position.set(x, 0, z);
    this.root.rotation.y = yaw;
    const D = THREE.MathUtils.degToRad;
    this.becken.position.y = MASS.huefte - pose.tief + pose.sprung;
    this.becken.rotation.y = D(pose.drehung);
    this.brust.rotation.set(D(pose.lean), D(pose.twist), 0);
    this.kopf.rotation.set(0, 0, 0);
    this.gruppe.updateMatrixWorld(true);
    if (blick) {
      const l = this.brust.worldToLocal(blick.clone()).sub(this.kopf.position);
      const yaw_ = THREE.MathUtils.clamp(Math.atan2(l.x, l.z), -1.2, 1.2);
      const pitch = THREE.MathUtils.clamp(-Math.atan2(l.y, Math.hypot(l.x, l.z)), -0.9, 0.6);
      this.kopf.rotation.set(pitch, yaw_, 0);
      this.kopf.updateMatrixWorld(true);
    }
    this.gelenke = {};
    const rq = this.root.getWorldQuaternion(new THREE.Quaternion());
    const welt = (a) => this.root.localToWorld(v(a));
    const richtung = (a) => v(a).applyQuaternion(rq);

    // Arms.
    for (const [s, sx, ziel, pol] of [["r", -1, pose.hand, pose.ellbogen], ["l", 1, pose.links, pose.linksEllbogen]]) {
      const sch = this.brust.localToWorld(new THREE.Vector3(sx * MASS.schulter, MASS.schulterY, 0));
      const t = welt(ziel);
      const { mitte, ende } = zweiGlieder(sch, t, MASS.oberarm, MASS.unterarm, sch.clone().add(richtung(pol)));
      Object.assign(this.gelenke, { [`schulter_${s}`]: sch.clone(), [`ellbogen_${s}`]: mitte.clone(), [`handgelenk_${s}`]: ende.clone() });
      const [oa, aermel] = this.glieder[`oberarm${s}`];
      zwischen(oa, sch, mitte);
      zwischen(aermel, sch, mitte, 0.15);
      zwischen(this.glieder[`unterarm${s}`][0], mitte, ende);
      const fdir = ende.clone().sub(mitte).normalize();
      const hand = this.glieder[`hand${s}`][0];
      zwischen(hand, ende, ende.clone().add(fdir.clone().multiplyScalar(0.12)), 0.45);
      if (s === "r") {
        zwischen(this.band, mitte, ende, 0.88);
        this.handgelenk = ende.clone();
        this.unterarmRichtung = fdir.clone();
        this.#schlaegerStellen(ende.clone().add(fdir.multiplyScalar(0.065)), richtung(pose.dir), richtung(pose.norm));
      }
    }

    // Legs: ankles either at given world targets (walking) or in a stance turned with the hips.
    const bq = this.becken.getWorldQuaternion(new THREE.Quaternion());
    const vorn = new THREE.Vector3(0, 0, 1).applyQuaternion(bq);
    for (const [s, sx] of [["l", 1], ["r", -1]]) {
      const h = this.becken.localToWorld(new THREE.Vector3(sx * MASS.huefteX, 0, 0));
      let fuss = fuesse?.[s];
      if (!fuss) fuss = this.root.localToWorld(new THREE.Vector3(0, 0, 0)).add(new THREE.Vector3(sx * 0.23, 0, sx * 0.04).applyQuaternion(bq)).setY(MASS.knoechel);
      const pol = h.clone().add(vorn.clone().multiplyScalar(1)).add(new THREE.Vector3(sx * 0.15, 0, 0).applyQuaternion(bq));
      const { mitte, ende } = zweiGlieder(h, fuss, MASS.oberschenkel, MASS.unterschenkel, pol);
      Object.assign(this.gelenke, { [`huefte_${s}`]: h.clone(), [`knie_${s}`]: mitte.clone(), [`knoechel_${s}`]: ende.clone() });
      const [os, hose] = this.glieder[`oberschenkel${s}`];
      zwischen(os, h, mitte);
      zwischen(hose, h, mitte, 0.22);
      const [us, socke] = this.glieder[`unterschenkel${s}`];
      zwischen(us, mitte, ende);
      zwischen(socke, mitte, ende, 0.86);
      const schuh = this.glieder[`schuh${s}`][0];
      schuh.position.copy(ende).add(vorn.clone().multiplyScalar(0.05)).add(new THREE.Vector3(0, -0.02, 0));
      schuh.rotation.set(0, Math.atan2(vorn.x, vorn.z), 0);
    }
  }

  // Joint positions in world space after stellen(): pelvis, chest, head and the limb joints.
  gelenkeWelt() {
    const w = (o) => o.getWorldPosition(new THREE.Vector3());
    return { becken: w(this.becken), brust: w(this.brust), kopf: w(this.kopf), ...this.gelenke, sweetspot: this.sweetspot() };
  }

  #schlaegerStellen(griff, dir, norm) {
    const y = dir.clone().normalize();
    const zz = norm.clone().sub(y.clone().multiplyScalar(norm.dot(y))).normalize();
    const x = new THREE.Vector3().crossVectors(y, zz);
    const m = new THREE.Matrix4().makeBasis(x, y, zz);
    this.schlaeger.quaternion.setFromRotationMatrix(m);
    // Grip point (racket y = 0.04) sits in the palm.
    this.schlaeger.position.copy(griff).sub(new THREE.Vector3(0, 0.04, 0).applyQuaternion(this.schlaeger.quaternion));
  }

  // Sweet spot in world space for the current racket pose.
  sweetspot() {
    return this.schlaeger.localToWorld(new THREE.Vector3(0, 0.31, 0));
  }
}
