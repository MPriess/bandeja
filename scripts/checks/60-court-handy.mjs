// Court diagrams are large enough on a phone (360 px wide).
import { withBrowser, SAMPLES } from "../lib/browser.mjs";

export const name = "Court auf dem Handy";
const MIN = 0.8; // court width as share of the viewport

export default async ({ pub }) => {
  const errors = [];
  await withBrowser(pub, async (browser, base) => {
    const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
    for (const key of ["kapitel", "quiz", "artikel"]) {
      await page.goto(base + SAMPLES[key]);
      const widths = await page.$$eval('svg[viewBox="0 0 440 230"]', (els) => els.filter((e) => e.getBoundingClientRect().width).map((e) => Math.round(e.getBoundingClientRect().width)));
      for (const w of widths) if (w < 360 * MIN) errors.push(`${SAMPLES[key]}: Court nur ${w} px breit (mind. ${360 * MIN} px)`);
    }
  });
  return { ok: errors.length === 0, errors, note: "360 px" };
};
