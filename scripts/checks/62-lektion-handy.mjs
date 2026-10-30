// Lesson page on a phone: view switch fits on one line, legend sits below the court.
import { withBrowser, SAMPLES } from "../lib/browser.mjs";

export const name = "Lektion auf dem Handy";

export default async ({ pub }) => {
  const errors = [];
  await withBrowser(pub, async (browser, base) => {
    for (const w of [320, 360]) {
      const page = await browser.newPage({ viewport: { width: w, height: 800 } });
      await page.goto(base + SAMPLES.kapitel);
      const r = await page.evaluate(() => {
        const labels = [...document.querySelectorAll('[role="radiogroup"][aria-label="Ansicht"] label')];
        const svg = document.querySelector('svg[viewBox="0 0 440 230"]');
        const legend = document.querySelector('[aria-label="Legende"]');
        return {
          tall: labels.filter((l) => l.getBoundingClientRect().height > 44).map((l) => l.textContent.trim()),
          pager: (() => {
            const links = [...document.querySelectorAll('nav[aria-label="Kapitel blättern"] a')];
            const box = document.querySelector('nav[aria-label="Kapitel blättern"]').getBoundingClientRect();
            const next = links.find((a) => /→/.test(a.textContent));
            return {
              narrow: links.filter((a) => a.getBoundingClientRect().width < box.width - 1).length,
              nextFirst: !!next && links.every((a) => a === next || a.getBoundingClientRect().top > next.getBoundingClientRect().top),
            };
          })(),
          legendBelow: !!legend && legend.getBoundingClientRect().top >= svg.getBoundingClientRect().bottom,
        };
      });
      for (const t of r.tall) errors.push(`${w} px: Umschalter „${t}“ bricht um`);
      if (r.pager.narrow) errors.push(`${w} px: Kapitel-Buttons nicht in voller Breite`);
      if (!r.pager.nextFirst) errors.push(`${w} px: „Nächstes Kapitel“ steht nicht oben`);
      if (!r.legendBelow) errors.push(`${w} px: Legende steht nicht unter dem Court`);
      await page.close();
    }
  });
  return { ok: errors.length === 0, errors, note: "320/360 px" };
};
