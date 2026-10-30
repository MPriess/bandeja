// Learning area: on a phone the page heading is near the top (sidebar collapses to a bar),
// on desktop the sidebar with the Stufen-Check box is shown.
import { withBrowser, SAMPLES } from "../lib/browser.mjs";

export const name = "Lernpfad-Layout";

export default async ({ pub }) => {
  const errors = [];
  await withBrowser(pub, async (browser, base) => {
    for (const [w, maxTop] of [[360, 260], [768, 260], [1280, 200]]) {
      const page = await browser.newPage({ viewport: { width: w, height: 800 } });
      for (const key of ["lernpfad", "stufe"]) {
        await page.goto(base + SAMPLES[key]);
        const r = await page.evaluate(() => ({
          h1: Math.round(document.querySelector("h1").getBoundingClientRect().top),
          box: [...document.querySelectorAll("aside .bg-court")].some((e) => e.checkVisibility()),
          small: [...document.querySelectorAll('nav[aria-label="Lernbereich"] a')].filter((a) => a.getBoundingClientRect().height < 44).length,
          overflow: document.documentElement.scrollWidth > innerWidth,
          longTitles: [...document.querySelectorAll('section[aria-labelledby="lektionen"] a > span:nth-child(2) > span:first-child')]
            .filter((t) => t.getBoundingClientRect().height > 2.2 * parseFloat(getComputedStyle(t).lineHeight)).map((t) => t.textContent.trim()),
          headWrap: (() => { const h = document.getElementById("lektionen"); return h ? h.getBoundingClientRect().height > 1.5 * parseFloat(getComputedStyle(h).lineHeight) : false; })(),
          rows: new Set([...document.querySelectorAll('nav[aria-label="Stufen"] a')].map((a) => Math.round(a.getBoundingClientRect().top))).size,
        }));
        const where = `${SAMPLES[key]} bei ${w} px`;
        if (r.h1 > maxTop) errors.push(`${where}: Überschrift beginnt erst bei ${r.h1} px (max. ${maxTop})`);
        if (w >= 1024 && !r.box) errors.push(`${where}: Stufen-Check-Kasten fehlt in der Seitenleiste`);
        if (r.small) errors.push(`${where}: ${r.small} Navigationslinks kleiner als 44 px`);
        if (r.rows > 1) errors.push(`${where}: Stufen-Umschalter bricht auf ${r.rows} Zeilen um`);
        for (const t of r.longTitles) errors.push(`${where}: Lektionstitel „${t}“ bricht auf mehr als 2 Zeilen um`);
        if (r.headWrap) errors.push(`${where}: Überschrift „Lektionen in Stufe …“ bricht um`);
        if (r.overflow) errors.push(`${where}: Seite läuft seitlich über`);
      }
      await page.close();
    }
  });
  return { ok: errors.length === 0, errors };
};
