// Speculation Rules and page transitions:
// - every page carries valid rules (prerender on hover, prefetch on press), limited to the site,
//   excluding new tabs and partner links; hovering a link starts the preload in Chromium
//   (Chromium disables the prerender itself while a test tool is attached, so we see the prefetch);
// - view transitions run between pages with motion allowed, never with reduced motion, and
//   view-transition names are unique on every page.
import fs from "node:fs";
import path from "node:path";
import { withBrowser, SAMPLES } from "../lib/browser.mjs";

export const name = "Vorladen und Übergänge";

export default async ({ pub, htmlFiles }) => {
  const errors = [];
  for (const file of htmlFiles()) {
    const html = fs.readFileSync(file, "utf8");
    if (/http-equiv="?refresh/i.test(html)) continue;
    const rel = path.relative(pub, file);
    const blocks = [...html.matchAll(/<script type="?speculationrules"?>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    if (blocks.length !== 1) { errors.push(`${rel}: ${blocks.length} Speculation-Rules-Blöcke statt 1`); continue; }
    let r;
    try { r = JSON.parse(blocks[0]); } catch (e) { errors.push(`${rel}: Speculation Rules kein gültiges JSON (${e.message})`); continue; }
    const text = JSON.stringify(r);
    if (!r.prerender?.length || !r.prefetch?.length) errors.push(`${rel}: prerender oder prefetch fehlt`);
    for (const s of ["[target=_blank]", "nofollow", "sponsored"]) if (!text.includes(s)) errors.push(`${rel}: Ausschluss ${s} fehlt`);
  }

  await withBrowser(pub, async (browser, base) => {
    // Rules accepted and preloading starts on hover.
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const cdp = await page.context().newCDPSession(page);
    const ev = [];
    cdp.on("Preload.ruleSetUpdated", (e) => ev.push(e.ruleSet.errorType ? `Regelfehler ${e.ruleSet.errorType}` : "ok"));
    cdp.on("Preload.prefetchStatusUpdated", (e) => ev.push(`prefetch ${e.status}`));
    cdp.on("Preload.prerenderStatusUpdated", (e) => ev.push(`prerender ${e.status}`));
    await cdp.send("Preload.enable");
    await page.goto(base + SAMPLES.lernpfad);
    await page.hover('a[href$="/lernpfad/stufe-2/"]');
    await page.waitForTimeout(1200);
    if (ev.some((e) => e.startsWith("Regelfehler"))) errors.push(`Chromium lehnt die Regeln ab: ${ev.join(", ")}`);
    if (!ev.some((e) => /^(prefetch|prerender) Ready/.test(e))) errors.push(`Verweilen auf einem Link lädt nichts vor (${ev.join(", ") || "keine Ereignisse"})`);
    await page.close();

    // View transitions between lesson chapters.
    for (const motion of ["no-preference", "reduce"]) {
      const p = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: motion });
      await p.addInitScript(() => addEventListener("pagereveal", (e) => { window.__vt = !!e.viewTransition; }));
      await p.goto(base + "/lektionen/bandeja/kapitel-1/");
      await p.click('nav[aria-label="Kapitel blättern"] a:has-text("Nächstes Kapitel")');
      await p.waitForURL(/kapitel-2/);
      await p.waitForTimeout(300);
      const vt = await p.evaluate(() => window.__vt);
      if (motion === "no-preference" && !vt) errors.push("Kein Seitenübergang beim Blättern zwischen Kapiteln");
      if (motion === "reduce" && vt) errors.push("Seitenübergang trotz reduzierter Bewegung");
      await p.close();
    }

    // Unique view-transition names on every page type.
    const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    for (const url of Object.values(SAMPLES)) {
      await p.goto(base + url);
      const dup = await p.evaluate(() => {
        const n = [...document.querySelectorAll("*")].map((e) => getComputedStyle(e).viewTransitionName).filter((x) => x !== "none");
        return [...new Set(n.filter((x, i) => n.indexOf(x) !== i))];
      });
      if (dup.length) errors.push(`${url}: view-transition-name doppelt: ${dup.join(", ")}`);
    }
  });
  return { ok: errors.length === 0, errors };
};
