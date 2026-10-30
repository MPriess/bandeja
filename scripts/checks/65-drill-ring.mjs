// Drill: the ring has one segment per ball, it is empty without hits and lights one segment per hit;
// phone order is kept, from 1024 px the page has two columns.
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

    // Layout: phone order title → ring → focus → steps → counter; from 1024 px two columns.
    const boxes = () => page.evaluate(() => {
      const r = (el) => el.getBoundingClientRect();
      return {
        title: r(document.querySelector("h1")), ring: r(document.querySelector("[data-seg]").closest(".bg-court")),
        steps: r(document.getElementById("ablauf")), counter: r(document.getElementById("zaehlen")),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    let b = await boxes();
    if (!(b.title.top < b.ring.top && b.ring.top < b.steps.top && b.steps.top < b.counter.top)) errors.push("360 px: Reihenfolge Titel → Ring → Ablauf → Zähler stimmt nicht");
    if (b.overflow) errors.push("360 px: Seite läuft seitlich über");
    await page.setViewportSize({ width: 1280, height: 900 });
    b = await boxes();
    if (!(b.ring.left > b.steps.right)) errors.push("1280 px: Drill nicht zweispaltig (Ring/Zähler rechts neben dem Ablauf)");
    if (b.overflow) errors.push("1280 px: Seite läuft seitlich über");
  });
  return { ok: errors.length === 0, errors };
};
