// Turns a script (Drehbuch) into a timeline: which camera, which scene time and which text
// at every moment of the video. Pure module, shared by the CLI (frame count) and the renderer.
export const VORLAUF = 1.2; // scene starts this long before the first contact, so the swing is visible

export const KAMERA_NAMEN = { oben: "Von oben", tv: "TV", seite: "Von der Seite", schraeg: "Schräg", hinten: "Hinter dir", spieler: "Deine Sicht" };

export function standardDrehbuch(sz) {
  return {
    titel: null,
    abschnitte: [
      { kamera: "oben", dauer: 2.2, ab: "start", text: sz.cap },
      { fahrt: "tv", dauer: 1.6, ab: "start" },
      { kamera: "tv", abspielen: true, ab: "start" },
      // Slow motion, but at most about 6.5 s, so long scenes (a lob) do not drag.
      { kamera: "seite", abspielen: true, ab: "start", tempo: Math.min(1, Math.max(0.6, (sz.T + VORLAUF) / 6.5)) },
      { kamera: "hinten", abspielen: true, ab: "start" },
    ],
    abspann: { text: "Mehr auf bandeja.", dauer: 2.5 },
  };
}

export function zeitplan(sz, buch) {
  const out = [];
  let t = 0, szeneT = -VORLAUF, letzte = "oben";
  for (const a of buch.abschnitte) {
    if (a.ab === "start") szeneT = -VORLAUF;
    else if (a.ab === "ende") szeneT = sz.T;
    else if (typeof a.ab === "number") szeneT = a.ab;
    const tempo = a.abspielen ? a.tempo ?? 1 : 0;
    // `mindestens`: room for a voice-over that is longer than the section would be.
    const dauer = Math.max(a.dauer ?? (tempo ? (sz.T - szeneT) / tempo : 2), a.mindestens ?? 0);
    const kamera = a.kamera ?? a.fahrt;
    if (!kamera) throw new Error("Abschnitt ohne kamera oder fahrt");
    out.push({ t0: t, t1: t + dauer, kamera, von: a.fahrt ? letzte : null, szeneT0: szeneT, tempo, text: a.text ?? null, titel: a.titel ?? null });
    t += dauer;
    szeneT = Math.min(sz.T, szeneT + dauer * tempo);
    letzte = kamera;
  }
  const abspann = buch.abspann ? { t0: t, t1: t + (buch.abspann.dauer ?? 2.5), text: buch.abspann.text ?? "" } : null;
  return { abschnitte: out, abspann, dauer: abspann ? abspann.t1 : t };
}

// Scene time and section at video time tau.
export function bei(plan, tau) {
  const a = plan.abschnitte.find((x) => tau < x.t1) ?? plan.abschnitte.at(-1);
  return { abschnitt: a, szeneT: a.szeneT0 + Math.max(0, tau - a.t0) * a.tempo, u: (tau - a.t0) / (a.t1 - a.t0) };
}
