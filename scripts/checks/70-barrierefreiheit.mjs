// Accessibility: axe-core (WCAG 2.2 A/AA) on one page per page type, at phone and desktop width.
// Interactive states are checked too: quiz answered, drill with hits, lesson in movement view.
import fs from "node:fs";
import { createRequire } from "node:module";
import { withBrowser, SAMPLES } from "../lib/browser.mjs";

export const name = "Barrierefreiheit (axe)";
const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const STATES = {
  quiz: async (page) => { await page.click('label:has([name="frage-0"][value="0"])'); await page.click('label:has([name="frage-1"][value="1"])'); },
  drill: async (page) => { await page.click('label:has([name="satz-1-ball-1"])'); },
  kapitel: async (page) => { await page.click('label:has(#ansicht-flow)'); },
};

export default async ({ pub }) => {
  const errors = [];
  let runs = 0;
  await withBrowser(pub, async (browser, base) => {
    for (const w of [360, 1280]) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      for (const [key, url] of Object.entries(SAMPLES)) {
        const variants = [["", null], ...(STATES[key] ? [[" (bedient)", STATES[key]]] : [])];
        for (const [suffix, act] of variants) {
          await page.goto(base + url);
          if (act) await act(page);
          await page.addScriptTag({ content: axeSource });
          const res = await page.evaluate((tags) => window.axe.run(document, { runOnly: { type: "tag", values: tags } }), TAGS);
          runs++;
          for (const v of res.violations) {
            const where = v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(", ");
            errors.push(`${url}${suffix} bei ${w} px: ${v.id} (${v.impact}) – ${v.help} [${v.nodes.length}× z. B. ${where}]`);
          }
        }
      }
      await page.close();
    }
  });
  return { ok: errors.length === 0, errors, note: `${runs} Prüfläufe` };
};
