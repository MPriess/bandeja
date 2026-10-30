// Wissen overview: not endlessly long on a phone; every article stays reachable.
import { withBrowser, SAMPLES } from "../lib/browser.mjs";

export const name = "Wissen-Übersicht";
const MAX = 4000;

export default async ({ pub }) => {
  const errors = [];
  await withBrowser(pub, async (browser, base) => {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
    await page.goto(base + SAMPLES.wissen);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    if (h > MAX) errors.push(`Seite bei 360 px ${h} px hoch (max. ${MAX})`);
    const r = await page.evaluate(() => ({
      links: new Set([...document.querySelectorAll("main a[href*='/wissen/']")].map((a) => a.getAttribute("href"))).size,
    }));
    for (const s of await page.$$("main details summary")) await s.click();
    const visible = await page.evaluate(() => [...document.querySelectorAll("main section a[href*='/wissen/']")].filter((a) => a.checkVisibility()).length);
    if (r.links < 100) errors.push(`nur ${r.links} Artikel verlinkt`);
    if (visible < 100) errors.push(`nach dem Aufklappen nur ${visible} Artikel sichtbar`);
    errors.length || (errors.note = `${h} px`);
  });
  return { ok: errors.length === 0, errors, note: errors.note };
};
