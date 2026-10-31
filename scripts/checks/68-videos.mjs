// Learning videos are own animations on our own server:
// - nowhere an <iframe>, nowhere a load from another host;
// - every <video> (video pages, lesson chapters and the home page's sample lesson) is local with controls, poster,
//   preload="none", aria-label and an MP4 <source>; a video page has exactly one;
// - in Chromium, neither a video page nor a lesson chapter requests the MP4 before play,
//   and switching a chapter to its video view shows the player without loading anything else.
import fs from "node:fs";
import path from "node:path";
import { withBrowser, SAMPLES } from "../lib/browser.mjs";

export const name = "Lernvideos";
const VIDEO_PAGE = /^videos\/[^/]+\/index\.html$/;

export default async ({ pub, htmlFiles }) => {
  const errors = [];
  let players = 0;
  let beispiel = null;
  const attr = (t, k) => t.match(new RegExp(`\\s${k}=(?:"([^"]*)"|([^\\s>]+))`))?.slice(1).find((x) => x !== undefined);
  const lokal = (u) => u && !/^(https?:)?\/\//.test(u) && fs.existsSync(path.join(pub, decodeURIComponent(u.split("?")[0])));
  for (const file of htmlFiles()) {
    const html = fs.readFileSync(file, "utf8");
    if (/http-equiv="?refresh/i.test(html)) continue;
    const rel = path.relative(pub, file);
    if (/<iframe\b/.test(html)) errors.push(`${rel}: <iframe> – Videos laufen nur im eigenen Player`);
    const external = [...html.matchAll(/<(?:script|img|iframe|link|source|video|audio|embed|object)\b[^>]*?\s(?:src|href|data|poster)="?(?:https?:)?\/\/[^"\s>]+/g)].map((m) => m[0]).filter((t) => !/<link[^>]*rel="?(canonical|alternate)/.test(t));
    for (const t of external) errors.push(`${rel}: lädt von einem anderen Host: ${t.slice(0, 80)}`);
    const videos = [...html.matchAll(/<video\b[\s\S]*?<\/video>/g)].map((m) => m[0]);
    const seite = VIDEO_PAGE.test(rel), kapitel = /^lektionen\/[^/]+\/kapitel-[^/]+\/index\.html$/.test(rel) || rel === "index.html";
    if (!seite && !kapitel) {
      if (videos.length) errors.push(`${rel}: <video> außerhalb von Video-Seite, Lektionskapitel und Startseite`);
      continue;
    }
    if (seite) {
      players += videos.length;
      if (videos.length !== 1) { errors.push(`${rel}: ${videos.length} Player statt genau 1`); continue; }
      beispiel ??= "/" + rel.replace(/index\.html$/, "");
    }
    if (kapitel && videos.length > 1) errors.push(`${rel}: mehr als ein Video im Kapitel bzw. auf der Startseite`);
    for (const v of videos) {
      const tag = v.match(/<video\b[^>]*>/)[0];
      if (!/\scontrols[\s>=]/.test(tag)) errors.push(`${rel}: <video> ohne controls`);
      if (attr(tag, "preload") !== "none") errors.push(`${rel}: <video> lädt vor dem Abspielen (preload="none" fehlt)`);
      if (!lokal(attr(tag, "poster"))) errors.push(`${rel}: Vorschaubild (poster) fehlt oder liegt nicht auf der Seite`);
      if (!attr(tag, "aria-label")) errors.push(`${rel}: <video> ohne aria-label (Screenreader)`);
      const src = v.match(/<source\b[^>]*>/)?.[0];
      if (!src || !lokal(attr(src, "src")) || attr(src, "type") !== "video/mp4") errors.push(`${rel}: <source> fehlt, liegt nicht auf der Seite oder ist kein video/mp4`);
    }
  }
  if (!players) errors.push("Keine Video-Seite mit Player gefunden");

  await withBrowser(pub, async (browser, base) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const anfragen = [];
    page.on("request", (r) => anfragen.push(r.url()));
    // A video page must not fetch the video before play.
    if (beispiel) {
      await page.goto(base + beispiel);
      await page.waitForTimeout(800);
      const mp4 = anfragen.filter((u) => u.endsWith(".mp4"));
      if (mp4.length) errors.push(`${beispiel}: lädt das Video schon vor dem Abspielen (${mp4[0]})`);
    }
    anfragen.length = 0;
    await page.goto(base + SAMPLES.kapitel);
    // Chapter: switch to the video view – the player shows, the MP4 still waits for play.
    if (!(await page.locator("#ansicht-video").count())) errors.push(`${SAMPLES.kapitel}: kein Umschalter auf das Video`);
    else {
      await page.click("label:has(#ansicht-video)");
      await page.waitForTimeout(500);
      if (!(await page.locator("video").isVisible())) errors.push(`${SAMPLES.kapitel}: Video-Ansicht zeigt keinen Player`);
      if (await page.locator(".court-scope").isVisible()) errors.push(`${SAMPLES.kapitel}: Court bleibt in der Video-Ansicht sichtbar`);
    }
    const mp4 = anfragen.filter((u) => u.endsWith(".mp4"));
    if (mp4.length) errors.push(`${SAMPLES.kapitel}: lädt das Video schon vor dem Abspielen (${mp4[0]})`);
    const fremd = anfragen.filter((u) => !u.startsWith(base) && !u.startsWith("data:"));
    if (fremd.length) errors.push(`${SAMPLES.kapitel}: Anfrage an anderen Host: ${fremd[0]}`);
    await page.close();
  });
  return { ok: errors.length === 0, errors, note: `${players} Video-Seiten` };
};
