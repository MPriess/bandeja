// Minimal SVG path tools for court diagrams: absolute M, L, Q, C commands.
// sample(d, steps) returns points along the path; also used for animations.
export function parsePath(d) {
  const tokens = d.match(/[MLQC]|-?\d*\.?\d+/gi) ?? [];
  const segs = [];
  let cmd = null, cur = null, start = null;
  for (let i = 0; i < tokens.length; ) {
    if (/[a-z]/i.test(tokens[i])) {
      cmd = tokens[i++];
      if (cmd !== cmd.toUpperCase()) throw new Error(`Relativer Pfadbefehl "${cmd}" nicht erlaubt, bitte absolut (${cmd.toUpperCase()})`);
    }
    const n = { M: 2, L: 2, Q: 4, C: 6 }[cmd];
    if (!n) throw new Error(`Pfadbefehl "${cmd}" nicht unterstützt (erlaubt: M, L, Q, C)`);
    const v = tokens.slice(i, i + n).map(Number);
    if (v.length < n || v.some(Number.isNaN)) throw new Error(`Pfad unvollständig: "${d}"`);
    i += n;
    const pts = [];
    for (let k = 0; k < n; k += 2) pts.push({ x: v[k], y: v[k + 1] });
    if (cmd === "M") { cur = start = pts[0]; cmd = "L"; continue; }
    if (!cur) throw new Error(`Pfad muss mit M beginnen: "${d}"`);
    segs.push({ cmd, p: [cur, ...pts] });
    cur = pts.at(-1);
  }
  if (!start) throw new Error(`Leerer Pfad: "${d}"`);
  return { start, end: cur, segs };
}

function point(seg, t) {
  const [a, b, c, e] = seg.p;
  const u = 1 - t;
  if (seg.cmd === "L") return { x: u * a.x + t * b.x, y: u * a.y + t * b.y };
  if (seg.cmd === "Q") return { x: u * u * a.x + 2 * u * t * b.x + t * t * c.x, y: u * u * a.y + 2 * u * t * b.y + t * t * c.y };
  return {
    x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * e.x,
    y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * e.y,
  };
}

export function sample(d, steps = 120) {
  const { start, segs } = parsePath(d);
  const out = [start];
  for (const s of segs) for (let i = 1; i <= steps; i++) out.push(point(s, i / steps));
  return out;
}

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function length(d) {
  const pts = sample(d);
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1], pts[i]);
  return l;
}

// How often the path crosses the vertical line x = lineX, and the index of the first crossing.
export function crossings(points, lineX) {
  let n = 0, first = -1, side = 0;
  points.forEach((p, i) => {
    const s = Math.sign(p.x - lineX);
    if (s === 0) return;
    if (side && s !== side) { n++; if (first < 0) first = i; }
    side = s;
  });
  return { n, first };
}

// Any SVG path (relative commands, H/V, S/T – as the HTML minifier writes them) as absolute M/L/Q/C.
export function toAbsolute(d) {
  const tokens = d.match(/[MLHVQTCSZ]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/gi) ?? [];
  const n = { M: 2, L: 2, H: 1, V: 1, Q: 4, T: 2, C: 6, S: 4, Z: 0 };
  const out = [];
  let i = 0, cmd = null, x = 0, y = 0, sx = 0, sy = 0, lastCtrl = null, lastCmd = null;
  while (i < tokens.length) {
    if (/[a-z]/i.test(tokens[i])) cmd = tokens[i++];
    const C = cmd.toUpperCase(), rel = cmd !== C;
    const v = tokens.slice(i, i + n[C]).map(Number);
    i += n[C];
    const ax = (k) => (rel ? x + v[k] : v[k]), ay = (k) => (rel ? y + v[k] : v[k]);
    const refl = () => (lastCtrl && ["Q", "T", "C", "S"].includes(lastCmd) ? [2 * x - lastCtrl[0], 2 * y - lastCtrl[1]] : [x, y]);
    if (C === "M") { x = sx = ax(0); y = sy = ay(1); out.push(`M ${x} ${y}`); cmd = rel ? "l" : "L"; lastCtrl = null; }
    else if (C === "L") { x = ax(0); y = ay(1); out.push(`L ${x} ${y}`); lastCtrl = null; }
    else if (C === "H") { x = rel ? x + v[0] : v[0]; out.push(`L ${x} ${y}`); lastCtrl = null; }
    else if (C === "V") { y = rel ? y + v[0] : v[0]; out.push(`L ${x} ${y}`); lastCtrl = null; }
    else if (C === "Q") { const c = [ax(0), ay(1)]; x = ax(2); y = ay(3); out.push(`Q ${c[0]} ${c[1]} ${x} ${y}`); lastCtrl = c; }
    else if (C === "T") { const c = lastCmd === "Q" || lastCmd === "T" ? refl() : [x, y]; x = ax(0); y = ay(1); out.push(`Q ${c[0]} ${c[1]} ${x} ${y}`); lastCtrl = c; }
    else if (C === "C") { const c1 = [ax(0), ay(1)], c2 = [ax(2), ay(3)]; x = ax(4); y = ay(5); out.push(`C ${c1.join(" ")} ${c2.join(" ")} ${x} ${y}`); lastCtrl = c2; }
    else if (C === "S") { const c1 = lastCmd === "C" || lastCmd === "S" ? refl() : [x, y]; const c2 = [ax(0), ay(1)]; x = ax(2); y = ay(3); out.push(`C ${c1.join(" ")} ${c2.join(" ")} ${x} ${y}`); lastCtrl = c2; }
    else if (C === "Z") { x = sx; y = sy; out.push(`L ${x} ${y}`); lastCtrl = null; }
    lastCmd = C;
  }
  return out.join(" ");
}

// Two paths describe the same curve (sampled points within tol px).
export function samePath(a, b, tol = 0.5) {
  const pa = sample(toAbsolute(a), 40), pb = sample(toAbsolute(b), 40);
  return pa.length === pb.length && pa.every((p, i) => dist(p, pb[i]) <= tol);
}
