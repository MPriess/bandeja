// Camera presets in metres (x along the court, z across, y up), per format.
// s = side of "du" (+1 right half of the diagram, -1 left half), so "behind you" works either way.
// Each camera: pos, ziel (look-at), fov (vertical, degrees), up (optional), folgen (follows du).
import { position } from "./szene.mjs";

export const FORMATE = {
  quer: { breite: 1920, hoehe: 1080 },
  short: { breite: 1080, hoehe: 1920 },
};

const du = (sz) => sz.personen.find((p) => p.id === "p") ?? sz.personen[0];
export const seiteVonDu = (sz) => (du(sz)?.seite ?? 1);

export const KAMERAS = {
  oben: (sz, f) => {
    const s = seiteVonDu(sz);
    return f === "short"
      ? { pos: [0, 40, 0], ziel: [0, 0, 0], up: [-s, 0, 0], fov: 33 }
      : { pos: [0, 40, 0], ziel: [0, 0, 0], up: [0, 0, -1], fov: 19 };
  },
  tv: (sz, f) => {
    const s = seiteVonDu(sz);
    return f === "short"
      ? { pos: [s * 17, 10.5, 0], ziel: [-s * 1.5, 0, 0], fov: 62 }
      : { pos: [s * 18, 8, 0], ziel: [-s * 0.5, 0.4, 0], fov: 40 };
  },
  seite: (sz, f) => (f === "short" ? { pos: [0, 7, 19], ziel: [0, 0.6, 0], fov: 46 } : { pos: [0, 3.6, 13], ziel: [0, 1.2, 0], fov: 50 }),
  schraeg: (sz, f) => {
    const s = seiteVonDu(sz);
    return f === "short" ? { pos: [s * 15, 13, 13], ziel: [0, 0.5, 0], fov: 58 } : { pos: [s * 16, 10, 13], ziel: [-s * 0.5, 0.5, 0], fov: 40 };
  },
  // Low, just inside your back glass, centred on you.
  hinten: (sz, f, t) => {
    const s = seiteVonDu(sz);
    const p = position(du(sz), t);
    return { pos: [s * 9.7, 3.0, p.z * 0.5], ziel: [-s * 4, 0.9, p.z * 0.2], fov: f === "short" ? 78 : 56, folgen: true };
  },
  // Over your shoulder: what you see on court.
  spieler: (sz, f, t) => {
    const s = seiteVonDu(sz);
    const p = position(du(sz), t);
    return { pos: [p.x + s * 1.6, 2.2, p.z + 0.35], ziel: [p.x - s * 8, 1.3, p.z * 0.5], fov: f === "short" ? 75 : 55, folgen: true };
  },
};

const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, u) => a.map((x, i) => x + (b[i] - x) * u);

// A camera move from a to b: eased, with a slight lift in the middle so it does not cut through the net.
export function fahrt(a, b, u) {
  const e = ease(Math.min(1, Math.max(0, u)));
  const pos = lerp(a.pos, b.pos, e);
  pos[1] += Math.sin(Math.PI * e) * 2.5;
  return { pos, ziel: lerp(a.ziel, b.ziel, e), fov: a.fov + (b.fov - a.fov) * e, up: lerp(a.up ?? [0, 1, 0], b.up ?? [0, 1, 0], e) };
}
