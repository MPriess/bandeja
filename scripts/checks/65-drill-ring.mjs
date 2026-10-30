// Drill: the ring has one segment per ball, it is empty without hits and lights one segment per hit.
import { withBrowser, SAMPLES } from "../lib/browser.mjs";

export const name = "Drill-Fortschritt";

export default async ({ pub }) => {
  const errors = [];
  await withBrowser(pub, async (browser, base) => {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
    await page.goto(base + SAMPLES.drill);
    const lime = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--color-lime").trim());
    const state = () => page.evaluate((lime) => {
      const segs = [...document.querySelectorAll("[data-seg]")];
      const toRgb = (c) => { const d = document.createElement("i"); d.style.color = c; document.body.append(d); const v = getComputedStyle(d).color; d.remove(); return v; };
      const on = toRgb(lime);
      return { total: segs.length, lit: segs.filter((s) => getComputedStyle(s).stroke === on).length, boxes: document.querySelectorAll("input[data-tally]").length };
    }, lime);
    let s = await state();
    if (s.total !== s.boxes) errors.push(`${s.total} Ring-Segmente für ${s.boxes} Bälle`);
    if (s.lit) errors.push(`Ring zeigt ohne Treffer ${s.lit} Segmente`);
    for (const b of [1, 2, 7]) await page.click(`label:has([name="satz-1-ball-${b}"])`);
    s = await state();
    if (s.lit !== 3) errors.push(`Nach 3 Treffern leuchten ${s.lit} Segmente`);
    await page.click('button[type="reset"]');
    s = await state();
    if (s.lit) errors.push(`Nach „Neu starten“ leuchten noch ${s.lit} Segmente`);
  });
  return { ok: errors.length === 0, errors };
};
