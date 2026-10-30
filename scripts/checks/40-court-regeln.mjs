// Court diagrams follow the padel rules in loop/regeln.md.
import { collectCourts } from "../lib/courts.mjs";
import { NET_X, FIELD, PX } from "../lib/padel.mjs";
import { sample, crossings, dist, parsePath } from "../lib/svgpath.mjs";

export const name = "Court-Regeln";

const PERSONS = { p: "Du", q: "Partner", a: "Gegner A", b: "Gegner B", g: "Deine frühere Position" };
const R_PERSON = 13, R_LABEL = 22;
const side = (x) => Math.sign(x - NET_X); // -1 links, 1 rechts
const inField = (pt, slack = 0) => pt.x >= FIELD.x1 - slack && pt.x <= FIELD.x2 + slack && pt.y >= FIELD.y1 && pt.y <= FIELD.y2;

export function checkCourt(d) {
  const e = [];
  if (!d.cap?.trim()) e.push("`cap` (Beschreibung) fehlt");

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
  const shot = (key, target) => {
    if (!d[key]) return;
    let pts, start;
    try { pts = sample(d[key]); start = parsePath(d[key]).start; } catch (err) { e.push(`${key}: ${err.message}`); return; }
    let hitterSide;
    if (d.von) {
      if (!people[d.von]) e.push(`\`von: ${d.von}\` – diese Person fehlt in der Grafik`);
      else hitterSide = side(people[d.von].x);
    } else {
      const near = Object.entries(people).map(([k, pt]) => [k, dist(pt, start)]).sort((x, y) => x[1] - y[1])[0];
      if (!near || near[1] > 40) e.push(`${key}: Ballweg beginnt bei keiner Person (nächste ${near ? Math.round(near[1]) + " px" : "–"} entfernt); sonst \`von\` setzen`);
      else hitterSide = side(people[near[0]].x);
    }
    const end = target ?? pts.at(-1);
    let cut = pts.length;
    if (target) {
      const i = pts.reduce((best, p, j) => (dist(p, target) < dist(pts[best], target) ? j : best), 0);
      if (dist(pts[i], target) > 4) e.push(`${key}: Ziel (${target.x}|${target.y}) liegt nicht auf dem Ballweg`);
      cut = i + 1;
    }
    if (!inField(end)) e.push(`${key}: Ziel (${Math.round(end.x)}|${Math.round(end.y)}) liegt außerhalb des Courts`);
    if (d.ohneNetz) return;
    const c = crossings(pts.slice(0, cut), NET_X);
    if (c.n !== 1) e.push(`${key}: Ball kreuzt das Netz ${c.n}× bis zum Ziel statt genau 1×${c.n === 0 ? " (sonst `ohneNetz: true`)" : ""}`);
    if (hitterSide && side(end.x) === hitterSide) e.push(`${key}: Ziel liegt auf der Seite des Schlagenden`);
  };
  shot("ball", d.tx !== undefined ? { x: +d.tx, y: +d.ty } : null);
  if (d.ball && d.tx === undefined) e.push("ball ohne Ziel (`tx`, `ty`)");
  shot("ball2", null);

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
