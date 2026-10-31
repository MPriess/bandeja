// Poses and strokes for a right-handed player. All vectors are in the player's frame:
// forward +Z (towards the net), up +Y, the player's right is -X.
//
// A pose sets: hand (right wrist), dir (racket direction grip → tip), norm (racket face normal),
// links (left wrist), ellbogen (where the right elbow points), drehung (hip yaw, degrees, + = turn left),
// twist (chest yaw on top of the hips), lean (forward tilt, degrees), tief (how far the hips drop, m),
// sprung (jump height, m). Strokes are key poses at times relative to the ball contact (t = 0);
// at t = 0 the racket meets the ball, the hand position is then computed from the ball.

export const BEREIT = {
  hand: [-0.2, 1.08, 0.36], dir: [0.25, 0.85, 0.3], norm: [0, -0.25, 1], links: [-0.06, 1.18, 0.4],
  ellbogen: [-0.45, -0.7, -0.2], linksEllbogen: [0.45, -0.7, -0.2], drehung: 0, twist: 0, lean: 14, tief: 0.1, sprung: 0,
};

// Where the sweet spot meets the ball, relative to the player (used to step towards the ball).
export const KONTAKT = {
  vorhand: [-0.78, 0.95, 0.45],
  volley: [-0.55, 1.2, 0.55],
  lob: [-0.7, 0.75, 0.45],
  chiquita: [-0.65, 0.6, 0.5],
  aufschlag: [-0.6, 0.78, 0.5],
  bandeja: [-0.3, 2.25, 0.35],
  vibora: [-0.45, 2.15, 0.3],
  smash: [-0.2, 2.5, 0.35],
};

const K = (t, p) => ({ t, ...p });

export const SCHLAEGE = {
  vorhand: [
    K(-0.75, {}),
    K(-0.32, { hand: [-0.55, 1.15, -0.32], dir: [-0.25, 0.7, -0.65], norm: [-1, 0, 0.2], links: [0.1, 1.2, 0.5], linksEllbogen: [0.4, -0.5, 0.2], ellbogen: [-0.6, -0.6, -0.5], drehung: -35, twist: -25, tief: 0.16 }),
    K(0, { dir: [-0.85, 0.12, 0.5], norm: [0.25, 0.1, 1], links: [0.3, 1.1, 0.25], ellbogen: [-0.4, -0.8, -0.2], drehung: -5, twist: 0, tief: 0.14 }),
    K(0.28, { hand: [0.2, 1.4, 0.4], dir: [0.6, 0.75, -0.15], norm: [1, 0.1, 0.3], links: [0.35, 1.05, 0.0], ellbogen: [0.1, -0.5, 0.6], drehung: 15, twist: 25, tief: 0.12 }),
    K(0.9, {}),
  ],
  volley: [
    K(-0.5, {}),
    K(-0.2, { hand: [-0.48, 1.28, 0.18], dir: [-0.35, 0.88, 0.1], norm: [0, 0, 1], links: [0.15, 1.25, 0.45], drehung: -20, twist: -15, tief: 0.18 }),
    K(0, { dir: [-0.45, 0.72, 0.5], norm: [0.15, 0.2, 1], drehung: -10, twist: 0, tief: 0.18 }),
    K(0.15, { hand: [-0.32, 1.15, 0.72], dir: [-0.3, 0.75, 0.6], norm: [0, 0.3, 1] }),
    K(0.6, {}),
  ],
  lob: [
    K(-0.7, {}),
    K(-0.32, { hand: [-0.6, 0.82, -0.22], dir: [-0.5, 0.25, -0.8], norm: [-0.3, 0.9, 0.3], links: [0.15, 1.15, 0.45], drehung: -30, twist: -25, tief: 0.24 }),
    K(0, { dir: [-0.82, -0.05, 0.55], norm: [0.1, 0.75, 0.65], drehung: -5, twist: 0, tief: 0.22 }),
    K(0.32, { hand: [-0.12, 1.65, 0.6], dir: [0.1, 0.9, 0.4], norm: [0, 0.3, 1], ellbogen: [-0.5, -0.3, 0.2], drehung: 10, twist: 20, tief: 0.08 }),
    K(0.95, {}),
  ],
  chiquita: [
    K(-0.6, {}),
    K(-0.25, { hand: [-0.55, 0.85, 0.02], dir: [-0.6, 0.35, -0.55], norm: [-0.5, 0.3, 0.6], drehung: -25, twist: -15, tief: 0.28 }),
    K(0, { dir: [-0.8, -0.15, 0.55], norm: [0.1, 0.4, 1], drehung: -5, tief: 0.36, lean: 24 }),
    K(0.22, { hand: [-0.32, 0.95, 0.68], dir: [-0.4, 0.4, 0.8], norm: [0, 0.4, 1], tief: 0.24 }),
    K(0.75, {}),
  ],
  aufschlag: [
    K(-1.1, { links: [-0.3, 1.0, 0.55] }),
    K(-0.62, { links: [-0.45, 0.95, 0.55], hand: [-0.35, 1.05, 0.0], dir: [-0.2, 0.9, -0.2] }),
    K(-0.3, { hand: [-0.5, 0.95, -0.38], dir: [-0.35, 0.45, -0.8], norm: [-1, 0, 0.1], links: [0.1, 1.05, 0.45], drehung: -40, twist: -30, tief: 0.2 }),
    K(0, { dir: [-0.82, 0.02, 0.58], norm: [0.2, 0.15, 1], drehung: -5, twist: 0, tief: 0.2 }),
    K(0.32, { hand: [0.02, 1.35, 0.55], dir: [0.35, 0.8, 0.45], norm: [0.5, 0, 1], drehung: 15, twist: 20, tief: 0.1 }),
    K(1.0, {}),
  ],
  bandeja: [
    K(-1.0, {}),
    K(-0.55, { hand: [-0.3, 1.75, -0.08], dir: [-0.15, 0.75, -0.6], norm: [-0.3, 0.3, 0.9], links: [0.25, 2.0, 0.55], linksEllbogen: [0.5, 0.2, 0.3], ellbogen: [-0.7, -0.1, -0.1], drehung: -65, twist: -10, lean: 4, tief: 0.12 }),
    K(-0.22, { hand: [-0.35, 1.85, -0.22], dir: [0, 0.45, -0.9], norm: [-0.2, 0.9, 0.3], links: [0.3, 1.85, 0.5], ellbogen: [-0.8, 0.1, -0.1], drehung: -60, twist: -10, lean: 2 }),
    K(0, { dir: [-0.1, 0.72, 0.68], norm: [0, 0.45, 1], links: [0.4, 1.4, 0.2], ellbogen: [-0.8, 0.0, 0.2], drehung: -35, twist: 5, lean: 6, tief: 0.06 }),
    K(0.32, { hand: [0.1, 1.35, 0.6], dir: [0.3, 0.3, 0.9], norm: [0, 0.8, 0.6], links: [0.45, 1.05, -0.15], ellbogen: [-0.3, -0.7, 0.3], drehung: -15, twist: 15, lean: 14 }),
    K(1.0, {}),
  ],
  vibora: [
    K(-1.0, {}),
    K(-0.55, { hand: [-0.35, 1.75, -0.12], dir: [-0.25, 0.7, -0.65], norm: [-0.6, 0.3, 0.7], links: [0.25, 2.0, 0.55], linksEllbogen: [0.5, 0.2, 0.3], ellbogen: [-0.8, -0.1, -0.1], drehung: -70, twist: -15, lean: 4, tief: 0.12 }),
    K(-0.2, { hand: [-0.45, 1.8, -0.28], dir: [-0.2, 0.35, -0.9], norm: [-0.9, 0.3, 0.2], links: [0.3, 1.85, 0.5], ellbogen: [-0.9, 0.1, -0.2], drehung: -65, twist: -15 }),
    K(0, { dir: [-0.45, 0.7, 0.55], norm: [0.6, 0.2, 0.8], links: [0.4, 1.35, 0.2], ellbogen: [-0.9, 0.0, 0.2], drehung: -30, twist: 10, lean: 8, tief: 0.06 }),
    K(0.3, { hand: [0.35, 1.05, 0.45], dir: [0.7, 0.15, 0.7], norm: [0.4, 0.8, 0.4], links: [0.45, 1.0, -0.2], ellbogen: [-0.2, -0.8, 0.3], drehung: 0, twist: 30, lean: 16 }),
    K(1.0, {}),
  ],
  smash: [
    K(-1.0, {}),
    K(-0.6, { hand: [-0.3, 1.8, -0.1], dir: [-0.1, 0.8, -0.55], norm: [-0.3, 0.3, 0.9], links: [0.25, 2.05, 0.55], linksEllbogen: [0.5, 0.2, 0.3], ellbogen: [-0.75, -0.05, -0.1], drehung: -70, twist: -20, lean: -4, tief: 0.15 }),
    K(-0.2, { hand: [-0.3, 1.75, -0.3], dir: [0.05, -0.5, -0.85], norm: [-0.2, -0.2, 1], links: [0.3, 1.9, 0.45], ellbogen: [-0.6, 0.6, -0.2], drehung: -55, twist: -20, lean: -8, tief: 0.2 }),
    K(0, { dir: [0, 0.92, 0.38], norm: [0, 0.3, 1], links: [0.35, 1.35, 0.15], ellbogen: [-0.7, 0.3, 0.1], drehung: -10, twist: 20, lean: 4, tief: 0, sprung: 0.18 }),
    K(0.3, { hand: [0.28, 0.95, 0.4], dir: [0.35, -0.55, 0.75], norm: [0.2, 0.8, 0.4], links: [0.4, 1.0, -0.2], ellbogen: [-0.2, -0.8, 0.2], drehung: 10, twist: 30, lean: 25, tief: 0.12, sprung: 0 }),
    K(1.0, {}),
  ],
};

// Which stroke a shot type uses, and whether it can be played as a backhand (mirrored).
export const SCHLAG_FUER = {
  aufschlag: "aufschlag", lob: "lob", bandeja: "bandeja", vibora: "vibora", smash: "smash",
  volley: "volley", chiquita: "chiquita", stopp: "chiquita",
  return: "vorhand", schlag: "vorhand", rueckwand: "vorhand", ecke: "vorhand", bajada: "smash", contrapared: "vorhand", wand: "vorhand",
};
export const UEBERKOPF = new Set(["bandeja", "vibora", "smash"]);

const VEC = ["hand", "dir", "norm", "links", "ellbogen", "linksEllbogen"];
const NUM = ["drehung", "twist", "lean", "tief", "sprung"];

// Mirror a pose left ↔ right: a backhand is the forehand on the other side.
export function spiegeln(p) {
  const o = { ...p };
  for (const k of ["hand", "dir", "norm", "ellbogen"]) if (p[k]) o[k] = [-p[k][0], p[k][1], p[k][2]];
  for (const k of ["drehung", "twist"]) if (p[k] !== undefined) o[k] = -p[k];
  if (p.links) o.links = [Math.min(-0.1, -p.links[0] * 0.3), p.links[1], p.links[2] * 0.6];
  return o;
}

const ease = (t) => t * t * (3 - 2 * t);
export function mischen(a, b, u) {
  const o = {};
  for (const k of VEC) {
    const x = a[k], y = b[k];
    o[k] = [0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * u);
  }
  for (const k of NUM) o[k] = a[k] + (b[k] - a[k]) * u;
  return o;
}

// Pose of a stroke at time t relative to contact; keys fill in missing values from BEREIT.
export function schlagPose(name, t, { rueckhand = false, kontakt = null } = {}) {
  let keys = SCHLAEGE[name].map((k) => ({ ...BEREIT, ...k }));
  if (rueckhand) keys = keys.map((k) => ({ ...spiegeln(k), t: k.t }));
  // The hand at contact comes from the ball, so the racket meets it exactly.
  if (kontakt) keys = keys.map((k) => (k.t === 0 ? { ...k, hand: kontakt } : k));
  if (t <= keys[0].t || t >= keys.at(-1).t) return null;
  let i = 0;
  while (keys[i + 1].t < t) i++;
  const a = keys[i], b = keys[i + 1];
  return mischen(a, b, ease((t - a.t) / (b.t - a.t)));
}

export const schlagFenster = (name) => [SCHLAEGE[name][0].t, SCHLAEGE[name].at(-1).t];
