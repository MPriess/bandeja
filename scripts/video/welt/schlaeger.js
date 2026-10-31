// Padel racket after the FIP rules: at most 45.5 cm long, 26 cm wide, 38 mm thick,
// perforated face, no strings, wrist strap. Local frame: handle along +Y (grip end at y = 0),
// face normal along +Z, so a hand bone with Y = racket direction and Z = face normal holds it.
import * as THREE from "three";

export const MASSE = { laenge: 0.455, breite: 0.26, dicke: 0.038, griff: 0.13 };

function kopfUmriss() {
  // Round/teardrop head from the throat (y = 0.15) to the tip (y = 0.455).
  const s = new THREE.Shape();
  const b = MASSE.breite / 2, y0 = 0.17, top = MASSE.laenge;
  s.moveTo(-0.035, 0.145);
  s.bezierCurveTo(-0.07, 0.16, -b, 0.2, -b, 0.3);
  s.bezierCurveTo(-b, 0.39, -0.07, top, 0, top);
  s.bezierCurveTo(0.07, top, b, 0.39, b, 0.3);
  s.bezierCurveTo(b, 0.2, 0.07, 0.16, 0.035, 0.145);
  s.lineTo(-0.035, 0.145);
  // Holes in a triangular grid, only inside the hitting area.
  const r = 0.0065;
  for (let row = 0; row < 11; row++) {
    const y = 0.215 + row * 0.019;
    const off = row % 2 ? 0.0105 : 0;
    for (let col = -5; col <= 5; col++) {
      const x = col * 0.021 + off;
      const ey = (y - 0.31) / 0.12, ex = x / 0.105;
      if (ex * ex + ey * ey > 1) continue;
      const h = new THREE.Path();
      h.absarc(x, y, r, 0, Math.PI * 2, true);
      s.holes.push(h);
    }
  }
  void y0;
  return s;
}

export function baueSchlaeger({ farbe = 0x0c1a24, akzent = 0xcdeb3b } = {}) {
  const g = new THREE.Group();
  g.name = "schlaeger";
  const kopfGeo = new THREE.ExtrudeGeometry(kopfUmriss(), { depth: MASSE.dicke - 0.008, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 24 });
  kopfGeo.translate(0, 0, -(MASSE.dicke - 0.008) / 2);
  const flaeche = new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.45, metalness: 0.15 });
  const kopf = new THREE.Mesh(kopfGeo, flaeche);
  kopf.castShadow = true;
  g.add(kopf);
  // Coloured frame rim around the head.
  const rand = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.006, 6, 48), new THREE.MeshStandardMaterial({ color: akzent, roughness: 0.5 }));
  rand.scale.set(1, 1.27, 1);
  rand.position.set(0, 0.31, 0);
  g.add(rand);
  // Throat and handle with grip tape.
  const hals = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.03), flaeche);
  hals.position.set(0, 0.13, 0);
  g.add(hals);
  const griff = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, MASSE.griff, 8), new THREE.MeshStandardMaterial({ color: 0xf3f4ee, roughness: 0.9 }));
  griff.position.set(0, MASSE.griff / 2 - 0.01, 0);
  griff.castShadow = true;
  g.add(griff);
  const kappe = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 8), flaeche);
  kappe.position.set(0, -0.012, 0);
  g.add(kappe);
  // Wrist strap: a small loop below the grip end.
  const schlaufe = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 4, 16), new THREE.MeshStandardMaterial({ color: 0x1b252d }));
  schlaufe.position.set(0, -0.045, 0);
  schlaufe.rotation.y = Math.PI / 2;
  g.add(schlaufe);
  return g;
}

// The sweet spot in racket coordinates (where the ball is hit).
export const SWEETSPOT = new THREE.Vector3(0, 0.31, 0);
