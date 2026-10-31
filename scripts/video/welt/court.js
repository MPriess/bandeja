// Padel court in 3D (FIP measures): 20 × 10 m artificial turf, lines, net with posts,
// glass walls (back 3 m, sides 4 m stepped from 3 m to 2 m), metal mesh above and in the middle.
import * as THREE from "three";

export const FARBEN = {
  ink: 0x0c1a24, court: 0x1e4fa0, court2: 0x2a63be, lime: 0xcdeb3b, paper: 0xf3f4ee,
  clay: 0xc2552e, umfeld: 0x23313b,
};

function rasenTextur() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#2457ad";
  g.fillRect(0, 0, 512, 512);
  // Fine fibres: deterministic noise, so every frame and every run looks the same.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26000; i++) {
    const x = rnd() * 512, y = rnd() * 512, l = 0.35 + rnd() * 0.3;
    g.fillStyle = `rgba(${rnd() < 0.5 ? "20,60,140" : "70,120,205"},${l})`;
    g.fillRect(x, y, 1.2, 2.6);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 5);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function gitterTextur() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  g.strokeStyle = "rgba(40,48,56,0.95)";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function netzTextur() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  g.strokeStyle = "rgba(15,20,24,0.9)";
  g.lineWidth = 2;
  g.strokeRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function baueCourt() {
  const court = new THREE.Group();
  court.name = "court";

  // Surroundings: a larger floor so the court does not float in space.
  const umfeld = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), new THREE.MeshStandardMaterial({ color: FARBEN.umfeld, roughness: 1 }));
  umfeld.rotation.x = -Math.PI / 2;
  umfeld.position.y = -0.01;
  umfeld.receiveShadow = true;
  court.add(umfeld);

  const rasen = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), new THREE.MeshStandardMaterial({ map: rasenTextur(), roughness: 0.95 }));
  rasen.rotation.x = -Math.PI / 2;
  rasen.receiveShadow = true;
  court.add(rasen);

  // Lines (5 cm, white): service lines 6.95 m from the net, centre line between them.
  const linie = new THREE.MeshStandardMaterial({ color: FARBEN.paper, roughness: 0.8 });
  const strich = (x0, z0, x1, z1) => {
    const w = 0.05;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(x1 - x0) || w, Math.abs(z1 - z0) || w), linie);
    m.rotation.x = -Math.PI / 2;
    m.position.set((x0 + x1) / 2, 0.003, (z0 + z1) / 2);
    m.receiveShadow = true;
    court.add(m);
  };
  strich(-6.95, -5, -6.95, 5);
  strich(6.95, -5, 6.95, 5);
  strich(-6.95, 0, 6.95, 0);

  // Net: 10 m wide, 0.88 m in the middle, 0.92 m at the posts (sag modelled by a curved top).
  const netzGeo = new THREE.PlaneGeometry(10, 0.92, 40, 1);
  const pos = netzGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getX(i), y = pos.getY(i);
    if (y > 0) pos.setY(i, 0.46 - 0.04 * (1 - (z / 5) ** 2));
  }
  netzGeo.computeVertexNormals();
  const nt = netzTextur();
  nt.repeat.set(220, 20);
  const netz = new THREE.Mesh(netzGeo, new THREE.MeshStandardMaterial({ map: nt, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, roughness: 1 }));
  netz.rotation.y = Math.PI / 2;
  netz.position.y = 0.46;
  netz.castShadow = true;
  court.add(netz);
  // White tape on top, following the sag.
  const pts = [];
  for (let i = 0; i <= 40; i++) { const z = -5 + i / 4; pts.push(new THREE.Vector3(0, 0.92 - 0.04 * (1 - (z / 5) ** 2), z)); }
  const band = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.025, 6), new THREE.MeshStandardMaterial({ color: FARBEN.paper, roughness: 0.6 }));
  band.castShadow = true;
  court.add(band);
  const pfostenMat = new THREE.MeshStandardMaterial({ color: FARBEN.ink, metalness: 0.4, roughness: 0.5 });
  for (const z of [-5.05, 5.05]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), pfostenMat);
    p.position.set(0, 0.5, z);
    p.castShadow = true;
    court.add(p);
  }

  // Walls. Glass: subtle, slightly reflective; frames and posts dark steel.
  const glas = new THREE.MeshStandardMaterial({ color: 0xcfe3ee, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false });
  const kante = new THREE.MeshStandardMaterial({ color: 0x5d6b75, metalness: 0.5, roughness: 0.45 });
  const gt = gitterTextur();
  const gitter = (w, h) => {
    const t = gt.clone();
    t.repeat.set(w * 18, h * 18);
    t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.8, metalness: 0.3 });
  };
  const wand = (mat, w, h, x, y, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    court.add(m);
    return m;
  };
  const pfosten = (x, z, h) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.06), kante);
    p.position.set(x, h / 2, z);
    p.castShadow = true;
    court.add(p);
  };
  for (const sx of [-1, 1]) {
    const x = sx * 10;
    // Back wall: 3 m glass in 2 m panels, 1 m mesh above.
    for (let i = 0; i < 5; i++) wand(glas, 1.98, 3, x, 1.5, -4 + i * 2, Math.PI / 2);
    wand(gitter(10, 1), 10, 1, x, 3.5, 0, Math.PI / 2);
    for (let i = 0; i <= 5; i++) pfosten(x, -5 + i * 2, 4);
    // Side walls: first 2 m glass 3 m high (with 1 m mesh above), next 2 m glass stepping down to 2 m.
    for (const sz of [-1, 1]) {
      const z = sz * 5;
      wand(glas, 1.98, 3, sx * 9, 1.5, z, 0);
      wand(gitter(2, 1), 2, 1, sx * 9, 3.5, z, 0);
      wand(glas, 1.98, 2, sx * 7, 1, z, 0);
      wand(gitter(2, 1), 2, 1, sx * 7, 2.5, z, 0);
      pfosten(sx * 8, z, 4);
      pfosten(sx * 6, z, 3);
      // Middle: mesh 3 m high.
      wand(gitter(6, 3), 6, 3, sx * 3, 1.5, z, 0);
      pfosten(sx * 3, z, 3);
      pfosten(0, z, 3);
    }
  }
  // Top rails.
  const holm = (len, x, y, z, ry) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.045, 0.045), kante);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    court.add(m);
  };
  for (const sx of [-1, 1]) {
    holm(10, sx * 10, 4, 0, Math.PI / 2);
    holm(10, sx * 10, 3, 0, Math.PI / 2);
    for (const sz of [-1, 1]) { holm(2, sx * 9, 4, sz * 5, 0); holm(2, sx * 7, 3, sz * 5, 0); holm(6, sx * 3, 3, sz * 5, 0); }
  }
  return court;
}

export function baueLicht(scene) {
  scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x1c2630, 1.1));
  const sonne = new THREE.DirectionalLight(0xffffff, 2.4);
  sonne.position.set(-6, 16, 8);
  sonne.castShadow = true;
  sonne.shadow.mapSize.set(2048, 2048);
  Object.assign(sonne.shadow.camera, { left: -13, right: 13, top: 9, bottom: -9, near: 1, far: 40 });
  sonne.shadow.bias = -0.0004;
  sonne.shadow.normalBias = 0.02;
  scene.add(sonne);
  const fuell = new THREE.DirectionalLight(0xbcd0ff, 0.6);
  fuell.position.set(8, 6, -10);
  scene.add(fuell);
}

// Target zones and the walking path, drawn on the turf.
export function baueMarkierungen(sz) {
  const g = new THREE.Group();
  for (const z of sz.zonen) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(z.x1 - z.x0, z.z1 - z.z0), new THREE.MeshBasicMaterial({ color: FARBEN.lime, transparent: true, opacity: z.opacity * 0.8, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set((z.x0 + z.x1) / 2, 0.006, (z.z0 + z.z1) / 2);
    g.add(m);
  }
  return g;
}
