// The site header stays compact: at most 110 px on a phone, one row from 768 px.
import { withBrowser, SAMPLES } from "../lib/browser.mjs";

export const name = "Kopfzeile";
const LIMITS = [[360, 110], [768, 80], [1280, 80]];

export default async ({ pub }) => {
  const errors = [];
  await withBrowser(pub, async (browser, base) => {
    for (const [w, max] of LIMITS) {
      const page = await browser.newPage({ viewport: { width: w, height: 800 } });
      for (const key of ["start", "wissen", "artikel"]) {
        await page.goto(base + SAMPLES[key]);
        const r = await page.evaluate(() => {
          const h = document.querySelector("header");
          const links = [...h.querySelectorAll('nav[aria-label="Hauptnavigation"] a')];
          return { height: Math.round(h.getBoundingClientRect().height), small: links.filter((a) => a.getBoundingClientRect().height < 44).length, overflow: document.documentElement.scrollWidth > innerWidth };
        });
        if (r.height > max) errors.push(`${SAMPLES[key]} bei ${w} px: Kopfzeile ${r.height} px hoch (max. ${max})`);
        if (r.small) errors.push(`${SAMPLES[key]} bei ${w} px: ${r.small} Navigationslinks kleiner als 44 px`);
        if (r.overflow) errors.push(`${SAMPLES[key]} bei ${w} px: Seite läuft seitlich über`);
      }
      await page.close();
    }
  });
  return { ok: errors.length === 0, errors };
};
