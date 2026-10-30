// Layout on every page type at 360, 768 and 1280 px: no sideways scrolling, and every
// tap target (links, buttons, labels of inputs) is at least 44 × 44 px.
// Links inside running text (p, li text, dd) are exempt, as in WCAG 2.5.8.
import { withBrowser, SAMPLES } from "../lib/browser.mjs";

export const name = "Layout";
const MIN = 44;

export default async ({ pub }) => {
  const errors = [];
  await withBrowser(pub, async (browser, base) => {
    for (const w of [360, 768, 1280]) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      for (const url of Object.values(SAMPLES)) {
        await page.goto(base + url);
        const r = await page.evaluate((MIN) => {
          const small = [];
          for (const el of document.querySelectorAll("a[href], button, label, summary")) {
            if (!el.checkVisibility()) continue;
            if (el.matches("p a, dd a")) continue; // inline text link
            const b = el.getBoundingClientRect();
            if (b.width <= 1 && b.height <= 1 && el.matches(".sr-only")) continue; // skip link: visible (and large) only on keyboard focus
            if (b.width < MIN - 0.5 || b.height < MIN - 0.5) small.push(`${el.tagName.toLowerCase()} „${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}“ ${Math.round(b.width)}×${Math.round(b.height)}`);
          }
          const wide = [...document.querySelectorAll("body *")].filter((e) => e.checkVisibility() && e.getBoundingClientRect().right > innerWidth + 1 && !e.closest("[class*=overflow-x-auto]")).slice(0, 3).map((e) => e.tagName.toLowerCase() + "." + String(e.className.baseVal ?? e.className).split(" ")[0]);
          return { small, overflow: document.documentElement.scrollWidth > innerWidth, wide };
        }, MIN);
        if (r.overflow) errors.push(`${url} bei ${w} px: Seite läuft seitlich über (${r.wide.join(", ")})`);
        for (const s of r.small) errors.push(`${url} bei ${w} px: Touch-Ziel zu klein: ${s}`);
      }
      await page.close();
    }
  });
  return { ok: errors.length === 0, errors, note: "360/768/1280 px" };
};
