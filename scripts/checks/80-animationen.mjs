// Court animations (loop/regeln.md): same path as drawn, 0.8–4 s per step, at most 8 s plus pause,
// walking ≤ 6 m/s, ball speed plausible per shot (smash > bandeja > lob), sensible order of ball
// and movement, a pause control wherever something moves, nothing moves with reduced motion.
import fs from "node:fs";
import path from "node:path";
import { length, parsePath, dist, samePath } from "../lib/svgpath.mjs";
import { PX } from "../lib/padel.mjs";
import { withBrowser, SAMPLES as BASE } from "../lib/browser.mjs";

const SAMPLES = { ...BASE, lob: "/wissen/schlagtechniken/der-lob/" };

export const name = "Animationen";
const PAUSE = 1.2;
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)=(?:"([^"]*)"|([^\s>]+))/g)].map((m) => [m[1], m[2] ?? m[3]]));

export default async ({ pub, htmlFiles }) => {
  const errors = [];
  const speeds = {};
  let count = 0;
  for (const file of htmlFiles()) {
    const rel = path.relative(pub, file);
    const html = fs.readFileSync(file, "utf8");
    const svgs = [...html.matchAll(/<svg viewBox="?0 0 440 230[\s\S]*?<\/svg>/g)].map((m) => m[0]);
    for (const svg of svgs) {
      const anims = [...svg.matchAll(/<circle class="?court-anim"?[^>]*>/g)].map((m) => attrs(m[0]));
      const hasPath = /data-r="?(ball|lauf)/.test(svg);
      if (!anims.length) {
        // Articles and lesson chapters animate every drawn ball or walking path.
        if (hasPath && /^(wissen\/[^/]+\/[^/]+|lektionen\/[^/]+\/kapitel-[^/]+)\//.test(rel)) errors.push(`${rel}: Grafik mit Ballweg/Laufweg ist nicht animiert`);
        continue;
      }
      // Without a pause control the animation must play once and be over within 5 s (WCAG 2.2.2).
      const einmal = anims.every((a) => a["data-einmal"] && +a["data-einmal"] + +a["data-cycle"] <= 5);
      if (!html.includes("court-pause") && !einmal) errors.push(`${rel}: Animation ohne Anhalten-Steuerung und länger als 5 s (WCAG 2.2.2)`);
      const drawn = [...svg.matchAll(/<path[^>]*>/g)].map((m) => attrs(m[0]));
      const people = [...svg.matchAll(/<circle[^>]*data-r="?(du|partner|frueher|gegner)[^>]*>/g)].map((m) => attrs(m[0]));
      const byKind = {};
      for (const a of anims) {
        count++;
        const where = `${rel} (${a["data-anim"]})`;
        const d = a.style.match(/path\('([^']*)'\)/)?.[1];
        const anim = a.style.match(/animation-name:\s*([\w-]+)/)?.[1];
        const role = a["data-anim"] === "mv" ? "lauf" : "ball";
        if (!drawn.some((p) => p["data-r"] === role && samePath(p.d, d))) errors.push(`${where}: animierter Weg weicht vom gezeichneten ab`);
        if (!anim || !html.includes(`@keyframes ${anim}{`)) errors.push(`${where}: Keyframes ${anim} fehlen`);
        const start = +a["data-start"], end = +a["data-end"], cycle = +a["data-cycle"], dur = end - start;
        if (dur < 0.79 || dur > 4.01) errors.push(`${where}: Schritt dauert ${dur.toFixed(2)} s (erlaubt 0,8–4 s)`);
        if (cycle - PAUSE > 8.01) errors.push(`${where}: Ablauf ${(cycle - PAUSE).toFixed(1)} s lang (max. 8 s plus Pause)`);
        if (end > cycle) errors.push(`${where}: endet nach dem Zyklus`);
        const v = length(d) / PX / dur;
        if (a["data-anim"] === "mv" && v > 6) errors.push(`${where}: Lauftempo ${v.toFixed(1)} m/s (max. 6 m/s)`);
        if (a["data-anim"] !== "mv") (speeds[a["data-typ"]] ??= []).push(v);
        byKind[a["data-anim"]] = { start, end, d };
      }
      // Order: you hit → ball first, then move; ball from the other side → move during flight, arrive with it.
      if (byKind.ball && byKind.mv) {
        const s0 = parsePath(byKind.ball.d).start;
        const hitter = people.map((p) => ({ r: p["data-r"], dd: dist({ x: +p.cx, y: +p.cy }, s0) })).sort((x, y) => x.dd - y.dd)[0];
        const own = hitter && hitter.r !== "gegner";
        if (own && byKind.mv.start < byKind.ball.end) errors.push(`${rel}: du läufst los, bevor dein Ball angekommen ist`);
        if (!own && Math.abs(byKind.mv.end - byKind.ball.end) > 0.05) errors.push(`${rel}: Laufweg endet nicht mit der Ankunft des gegnerischen Balls`);
      }
    }
  }
  const avg = (t) => (speeds[t]?.length ? speeds[t].reduce((a, b) => a + b, 0) / speeds[t].length : null);
  const [sm, bj, lb] = ["smash", "bandeja", "lob"].map(avg);
  if (sm && bj && !(sm > bj)) errors.push(`Smash (${sm.toFixed(1)} m/s) nicht schneller als Bandeja (${bj.toFixed(1)} m/s)`);
  if (bj && lb && !(bj > lb)) errors.push(`Bandeja (${bj.toFixed(1)} m/s) nicht schneller als Lob (${lb.toFixed(1)} m/s)`);

  // Browser: reduced motion → nothing moves; pause control stops everything.
  await withBrowser(pub, async (browser, base) => {
    for (const motion of ["reduce", "no-preference"]) {
      const page = await browser.newPage({ reducedMotion: motion });
      for (const key of ["kapitel", "artikel", "lob"]) {
        await page.goto(base + SAMPLES[key]);
        const r = await page.evaluate(() => ({
          visible: [...document.querySelectorAll(".court-anim")].filter((c) => c.checkVisibility()).length,
          running: document.getAnimations().filter((a) => a.playState === "running").length,
          control: [...document.querySelectorAll(".court-pause-control")].some((c) => c.checkVisibility()),
        }));
        if (motion === "reduce" && (r.visible || r.running || r.control)) errors.push(`${SAMPLES[key]}: bei reduzierter Bewegung noch ${r.visible} animierte Elemente sichtbar`);
        if (motion === "no-preference") {
          if (!r.running) errors.push(`${SAMPLES[key]}: keine Animation läuft`);
          const ctl = page.locator(".court-pause-control label").first();
          if (!(await ctl.count())) { errors.push(`${SAMPLES[key]}: keine „Anhalten“-Steuerung`); continue; }
          await ctl.click();
          const left = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);
          if (left) errors.push(`${SAMPLES[key]}: „Anhalten“ stoppt ${left} Animation(en) nicht`);
          // Exactly one visible "you" at any moment of the cycle (fresh page: the API calls below override CSS play state).
          await page.goto(base + SAMPLES[key]);
          const youCounts = await page.evaluate(() => {
            const svg = document.querySelector('svg[viewBox="0 0 440 230"]');
            const anims = svg.getAnimations ? document.getAnimations() : [];
            const out = [];
            for (const f of [0, 0.3, 0.6, 0.95]) {
              for (const a of anims) { a.pause(); a.currentTime = a.effect.getComputedTiming().duration * f; }
              const you = [...svg.querySelectorAll('[data-r="du"], .court-anim[data-anim="mv"]')].filter((e) => e.checkVisibility() && +getComputedStyle(e).opacity > 0.1);
              out.push(you.length);
            }
            for (const a of anims) a.play();
            return out;
          });
          if (youCounts.some((n) => n !== 1)) errors.push(`${SAMPLES[key]}: „Du“ während der Animation ${youCounts.join("/")}× sichtbar statt genau 1×`);
        }
      }
      await page.close();
    }
  });
  const note = `${count} Animationen; Smash ${sm?.toFixed(1)}, Bandeja ${bj?.toFixed(1)}, Lob ${lb?.toFixed(1)} m/s`;
  return { ok: errors.length === 0, errors, note };
};
