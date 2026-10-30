// Court diagrams follow the padel rules in loop/regeln.md.
import { collectCourts } from "../lib/courts.mjs";
import { NET_X, FIELD, PX, SERVICE_RIGHT_X } from "../lib/padel.mjs";
import { sample, crossings, dist, parsePath } from "../lib/svgpath.mjs";

export const name = "Court-Regeln";

const PERSONS = { p: "Du", q: "Partner", a: "Gegner A", b: "Gegner B", g: "Deine frühere Position" };
const R_PERSON = 13, R_LABEL = 22;
const SERVICE = SERVICE_RIGHT_X - NET_X; // 6,95 m in px
const M3 = 3 * PX;
const fromNet = (x) => Math.abs(x - NET_X);
export const TYPES = ["aufschlag", "return", "lob", "bandeja", "vibora", "smash", "volley", "chiquita", "stopp", "schlag", "rueckwand", "ecke", "bajada", "contrapared", "wand", "aufstellung", "bewegung", "zielzonen", "quiz"];
const atWall = (pt, slack = 5) => {
  const w = [];
  if (pt.x <= FIELD.x1 + slack || pt.x >= FIELD.x2 - slack) w.push("rueck");
  if (pt.y <= FIELD.y1 + slack || pt.y >= FIELD.y2 - slack) w.push("seite");
  return w;
};
const side = (x) => Math.sign(x - NET_X); // -1 links, 1 rechts
const inField = (pt, slack = 0) => pt.x >= FIELD.x1 - slack && pt.x <= FIELD.x2 + slack && pt.y >= FIELD.y1 && pt.y <= FIELD.y2;

export function checkCourt(d) {
  const e = [];
  if (!d.cap?.trim()) e.push("`cap` (Beschreibung) fehlt");
  if (!d.type) e.push(`\`type\` fehlt (${TYPES.join(", ")})`);
  else if (!TYPES.includes(d.type)) e.push(`unbekannter \`type: ${d.type}\``);
  if (d.typ2 && !TYPES.includes(d.typ2)) e.push(`unbekannter \`typ2: ${d.typ2}\``);

  const people = Object.fromEntries(
    Object.keys(PERSONS).filter((k) => d[`${k}x`] !== undefined).map((k) => [k, { x: +d[`${k}x`], y: +d[`${k}y`] }])
  );

  // Positions: in the field (up to 1 m behind the back walls), off the net.
  for (const [k, pt] of Object.entries(people)) {
    if (Number.isNaN(pt.x) || Number.isNaN(pt.y)) { e.push(`${PERSONS[k]}: Koordinate fehlt`); continue; }
    if (!d.ausserhalb && !inField(pt, PX)) e.push(`${PERSONS[k]} (${pt.x}|${pt.y}) steht außerhalb des Courts`);
    if (Math.abs(pt.x - NET_X) < R_PERSON + 2) e.push(`${PERSONS[k]} steht auf dem Netz`);
  }

  // Teams: you, partner and ghost on one side, opponents on the other.
  const own = ["p", "q", "g"].filter((k) => people[k]).map((k) => [k, side(people[k].x)]);
  const opp = ["a", "b"].filter((k) => people[k]).map((k) => [k, side(people[k].x)]);
  const ownSide = own[0]?.[1], oppSide = opp[0]?.[1];
  for (const [k, s] of own) if (s !== ownSide) e.push(`${PERSONS[k]} steht nicht auf deiner Netzseite`);
  for (const [k, s] of opp) if (s !== oppSide) e.push(`${PERSONS[k]} steht nicht auf der Seite des anderen Gegners`);
  if (ownSide && oppSide && ownSide === oppSide) e.push("Gegner stehen auf deiner Netzseite");

  // No overlaps (the ghost may overlap, it shows where you were).
  const solid = Object.entries(people).filter(([k]) => k !== "g");
  for (let i = 0; i < solid.length; i++)
    for (let j = i + 1; j < solid.length; j++)
      if (dist(solid[i][1], solid[j][1]) < 30) e.push(`${PERSONS[solid[i][0]]} und ${PERSONS[solid[j][0]]} überlappen sich`);
  for (const l of d.labels ?? []) {
    if (!inField(l)) e.push(`Markierung ${l.t} liegt außerhalb des Courts`);
    for (const [k, pt] of solid) if (dist(l, pt) < R_LABEL + R_PERSON) e.push(`Markierung ${l.t} verdeckt ${PERSONS[k]}`);
  }

  // Zones inside the field.
  for (const z of ["z", "y"]) {
    if (d[`${z}w`] === undefined) continue;
    const x = +d[`${z}x`], y = +d[`${z}y`], w = +d[`${z}w`], h = +d[`${z}h`];
    if (!(inField({ x, y }) && inField({ x: x + w, y: y + h }))) e.push(`Zielzone ${z === "z" ? 1 : 2} ragt aus dem Court`);
  }

  // Ball paths.
  const shot = (key, target, typ) => {
    if (!d[key]) return;
    let pts, start;
    try { pts = sample(d[key]); start = parsePath(d[key]).start; } catch (err) { e.push(`${key}: ${err.message}`); return; }
    let hitterSide, hitter;
    if (d.von) {
      if (!people[d.von]) e.push(`\`von: ${d.von}\` – diese Person fehlt in der Grafik`);
      else { hitter = people[d.von]; hitterSide = side(hitter.x); }
    } else {
      const near = Object.entries(people).map(([k, pt]) => [k, dist(pt, start)]).sort((x, y) => x[1] - y[1])[0];
      if (!near || near[1] > 40) e.push(`${key}: Ballweg beginnt bei keiner Person (nächste ${near ? Math.round(near[1]) + " px" : "–"} entfernt); sonst \`von\` setzen`);
      else { hitter = people[near[0]]; hitterSide = side(hitter.x); }
    }
    const end = target ?? pts.at(-1);
    let cut = pts.length;
    if (target) {
      const i = pts.reduce((best, p, j) => (dist(p, target) < dist(pts[best], target) ? j : best), 0);
      if (dist(pts[i], target) > 4) e.push(`${key}: Ziel (${target.x}|${target.y}) liegt nicht auf dem Ballweg`);
      cut = i + 1;
    }
    if (!inField(end)) e.push(`${key}: Ziel (${Math.round(end.x)}|${Math.round(end.y)}) liegt außerhalb des Courts`);
    typeRules(key, typ, { pts: pts.slice(0, cut), hitter, hitterSide, end, treffpunkt: key === "ball" && d.treffpunkt });
    if (d.ohneNetz) return;
    const c = crossings(pts.slice(0, cut), NET_X);
    if (c.n !== 1) e.push(`${key}: Ball kreuzt das Netz ${c.n}× bis zum Ziel statt genau 1×${c.n === 0 ? " (sonst `ohneNetz: true`)" : ""}`);
    if (hitterSide && side(end.x) === hitterSide) e.push(`${key}: Ziel liegt auf der Seite des Schlagenden`);
  };
  // Padel rules per shot type. Distances: 6,95 m service line, 3 m "near the net".
  function typeRules(key, typ, { pts, hitter, hitterSide, end, treffpunkt }) {
    const label = `${key} (${typ})`;
    const deep = fromNet(end.x) >= SERVICE;
    const netHalf = (pt) => fromNet(pt.x) <= SERVICE + PX; // incl. 1 m behind the service line
    const walls = pts.filter((p, i) => i > 0 && atWall(p).length);
    const recvSide = hitterSide ? -hitterSide : 0;
    const wallOnSide = (sd) => walls.filter((p) => side(p.x) === sd);
    switch (typ) {
      case "aufschlag":
        if (hitter && fromNet(hitter.x) < SERVICE) e.push(`${label}: Aufschläger steht vor seiner Aufschlaglinie (muss dahinter stehen)`);
        if (hitter && Math.sign(hitter.y - 115) === Math.sign(end.y - 115)) e.push(`${label}: Aufschlag geht nicht diagonal`);
        if (fromNet(end.x) > SERVICE) e.push(`${label}: Aufprall hinter der Aufschlaglinie – Fehler`);
        break;
      case "return":
        if (hitter && fromNet(hitter.x) < SERVICE - PX) e.push(`${label}: Rückschläger steht vorn am Netz (Return wird nach dem Aufspringen hinten gespielt)`);
        break;
      case "lob": {
        if (treffpunkt) {
          const front = Object.entries(people).filter(([k, pt]) => k !== "g" && side(pt.x) === recvSide).map(([, pt]) => fromNet(pt.x));
          if (front.length && fromNet(end.x) <= Math.min(...front)) e.push(`${label}: Lob geht nicht über den vorderen Spieler hinweg`);
        } else if (!deep) e.push(`${label}: Lob landet vor der Aufschlaglinie (${(fromNet(end.x) / PX).toFixed(1)} m vom Netz) statt tief`);
        break;
      }
      case "bandeja":
      case "vibora":
        if (!deep) e.push(`${label}: Ziel nicht tief hinter der gegnerischen Aufschlaglinie`);
      // fall through
      case "smash":
        if (hitter && !netHalf(hitter)) e.push(`${label}: wird aus der Netzhälfte gespielt, Schlagender steht zu weit hinten`);
        break;
      case "volley":
        if (treffpunkt && !netHalf(end)) e.push(`${label}: Volley-Treffpunkt liegt nicht in der Netzhälfte`);
        break;
      case "chiquita":
        if (hitter && fromNet(hitter.x) < SERVICE) e.push(`${label}: Chiquita wird von hinten gespielt`);
      // fall through
      case "stopp":
        if (fromNet(end.x) > M3) e.push(`${label}: landet ${(fromNet(end.x) / PX).toFixed(1)} m hinter dem Netz statt kurz dahinter (≤ 3 m)`);
        break;
      case "rueckwand":
      case "bajada":
      case "ecke":
        if (!wallOnSide(recvSide).some((p) => atWall(p).includes("rueck"))) e.push(`${label}: Ballweg berührt die Rückwand auf der Seite des Annehmenden nicht`);
        if (typ === "ecke" && !wallOnSide(recvSide).some((p) => atWall(p).includes("seite"))) e.push(`${label}: Ballweg berührt die Seitenwand nicht (Doppelwand)`);
        if (!treffpunkt) e.push(`${label}: \`treffpunkt: true\` fehlt – das Ziel ist der Treffpunkt nach der Wand`);
        break;
      case "contrapared":
        if (!wallOnSide(hitterSide).some((p) => atWall(p).includes("rueck"))) e.push(`${label}: Ball geht nicht gegen die eigene Rückwand`);
        break;
    }
  }

  shot("ball", d.tx !== undefined ? { x: +d.tx, y: +d.ty } : null, d.type);
  if (d.ball && d.tx === undefined) e.push("ball ohne Ziel (`tx`, `ty`)");
  shot("ball2", null, d.typ2 ?? d.type);

  // Movement: stays on the mover's side, starts or ends at you.
  if (d.mv) {
    try {
      const pts = sample(d.mv);
      if (crossings(pts, NET_X).n) e.push("Laufweg (`mv`) führt über das Netz – Spieler wechseln nie die Seite (ist es ein Ballweg? dann `ball2`)");
      const mover = ["p", "g"].map((k) => people[k]).filter(Boolean);
      const ends = [pts[0], pts.at(-1)];
      if (!mover.some((m) => ends.some((x) => dist(m, x) <= 40))) e.push("Laufweg (`mv`) beginnt oder endet nicht bei dir");
    } catch (err) { e.push(`mv: ${err.message}`); }
  }
  return e;
}

export default async ({ root }) => {
  const errors = [];
  const courts = collectCourts(root);
  for (const c of courts) for (const msg of checkCourt(c.d)) errors.push(`${c.file} (${c.where}): ${msg}`);
  return { ok: errors.length === 0, errors, note: `${courts.length} Grafiken` };
};
