// Wissen article: the category list is collapsed below 1024 px (opens on tap) and open from 1024 px.
import { withBrowser, SAMPLES } from "../lib/browser.mjs";

export const name = "Artikel-Seitenliste";

export default async ({ pub }) => {
  const errors = [];
  await withBrowser(pub, async (browser, base) => {
    for (const w of [360, 768, 1280]) {
      const page = await browser.newPage({ viewport: { width: w, height: 800 } });
      await page.goto(base + SAMPLES.artikel);
      const visibleLinks = () => page.$$eval('nav[aria-label="Seiten dieser Kategorie"] a', (as) => as.filter((a) => a.checkVisibility()).length);
      const current = () => page.$$eval('nav[aria-label="Seiten dieser Kategorie"] a[aria-current="page"]', (as) => as.filter((a) => a.checkVisibility()).length);
      if (w < 1024) {
        if (await visibleLinks()) errors.push(`${w} px: Seitenliste ist nicht eingeklappt`);
        await page.click("details summary");
        if ((await visibleLinks()) < 2) errors.push(`${w} px: Seitenliste öffnet sich nicht`);
      } else if ((await visibleLinks()) < 2) errors.push(`${w} px: Seitenliste nicht sichtbar`);
      if ((await current()) !== 1) errors.push(`${w} px: aktuelle Seite nicht genau einmal markiert`);
      await page.close();
    }
  });
  return { ok: errors.length === 0, errors, note: "360/768/1280 px" };
};
