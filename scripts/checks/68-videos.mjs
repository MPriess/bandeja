// YouTube only behind a click (two-click solution, no JavaScript):
// - only video pages (videos/<name>/) embed anything from another host, and only
//   one youtube-nocookie.com player with a title;
// - every link to a video page carries .ohne-vorladen, and the speculation rules exclude them;
// - in Chromium, a lesson page with a video card requests nothing from other hosts, and
//   hovering or pressing the card does not preload the video page.
import fs from "node:fs";
import path from "node:path";
import { withBrowser, SAMPLES } from "../lib/browser.mjs";

export const name = "Videos (Zwei-Klick)";
const VIDEO_PAGE = /^videos\/[^/]+\/index\.html$/;
const VIDEO_HREF = /\/videos\/[^/"#?]+\/$/;

export default async ({ pub, htmlFiles }) => {
  const errors = [];
  let players = 0;
  for (const file of htmlFiles()) {
    const html = fs.readFileSync(file, "utf8");
    if (/http-equiv="?refresh/i.test(html)) continue;
    const rel = path.relative(pub, file);
    const frames = [...html.matchAll(/<iframe\b[^>]*>/g)].map((m) => m[0]);
    const external = [...html.matchAll(/<(?:script|img|iframe|link|source|video|audio|embed|object)\b[^>]*?\s(?:src|href|data)="?(?:https?:)?\/\/[^"\s>]+/g)].map((m) => m[0]).filter((t) => !/<link[^>]*rel="?(canonical|alternate)/.test(t));
    if (VIDEO_PAGE.test(rel)) {
      players += frames.length;
      if (frames.length !== 1) errors.push(`${rel}: ${frames.length} Player statt genau 1`);
      for (const f of frames) {
        if (!/src="?https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?/.test(f)) errors.push(`${rel}: Player nicht über youtube-nocookie.com`);
        if (!/\stitle="[^"]+"/.test(f)) errors.push(`${rel}: Player ohne title (Screenreader)`);
      }
      if (external.length !== frames.length) errors.push(`${rel}: lädt außer dem Player noch etwas von anderen Hosts`);
    } else {
      if (frames.length) errors.push(`${rel}: <iframe> außerhalb einer Video-Seite`);
      for (const t of external) errors.push(`${rel}: lädt von einem anderen Host: ${t.slice(0, 80)}`);
    }
    for (const m of html.matchAll(/<a\b[^>]*>/g)) {
      const href = m[0].match(/href="?([^"\s>]+)/)?.[1] ?? "";
      if (VIDEO_HREF.test(href) && !/class="?[^">]*\bohne-vorladen\b/.test(m[0])) errors.push(`${rel}: Link auf ${href} ohne Klasse ohne-vorladen`);
    }
    const rules = html.match(/<script type="?speculationrules"?>([\s\S]*?)<\/script>/)?.[1] ?? "";
    if (!rules.includes("videos/:clip/")) errors.push(`${rel}: Vorlade-Regeln schließen Video-Seiten nicht aus`);
  }
  if (!players) errors.push("Keine Video-Seite mit Player gefunden");

  await withBrowser(pub, async (browser, base) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const foreign = [];
    page.on("request", (r) => { if (!r.url().startsWith(base) && !r.url().startsWith("data:")) foreign.push(r.url()); });
    const cdp = await page.context().newCDPSession(page);
    const preload = [];
    cdp.on("Preload.prefetchStatusUpdated", (e) => preload.push(e.prefetchUrl ?? e.key?.url ?? ""));
    cdp.on("Preload.prerenderStatusUpdated", (e) => preload.push(e.prerenderingUrl ?? e.key?.url ?? ""));
    await cdp.send("Preload.enable");
    await page.goto(base + SAMPLES.kapitel);
    const card = page.locator("a.ohne-vorladen[href*='/videos/']").first();
    if (!(await card.count())) errors.push(`${SAMPLES.kapitel}: keine Video-Karte in der Lektion`);
    else {
      await card.hover();
      await page.waitForTimeout(800);
      await page.mouse.down();
      await page.waitForTimeout(800);
      await page.mouse.move(0, 0);
      await page.mouse.up();
      const vids = preload.filter((u) => u.includes("/videos/"));
      if (vids.length) errors.push(`${SAMPLES.kapitel}: Video-Seite wird vorgeladen (${vids[0]})`);
    }
    if (foreign.length) errors.push(`${SAMPLES.kapitel}: Anfrage an anderen Host: ${foreign[0]}`);
    await page.close();
  });
  return { ok: errors.length === 0, errors, note: `${players} Video-Seiten` };
};
