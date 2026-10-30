// Renders the social preview image static/og.png (1200 × 630) with Chromium.
// Usage: node scripts/og-bild.mjs   (only needed when the design changes)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(import.meta.dirname, "..");
const font = (f) => fs.readFileSync(path.join(root, "node_modules", f)).toString("base64");
const display = font("@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff2");
const sans = font("@fontsource-variable/inter/files/inter-latin-wght-normal.woff2");
const html = `<!doctype html><html><head><style>
@font-face{font-family:D;src:url(data:font/woff2;base64,${display})}
@font-face{font-family:I;src:url(data:font/woff2;base64,${sans});font-weight:100 900}
body{margin:0;width:1200px;height:630px;background:#0c1a24;color:#f3f4ee;font-family:I;display:flex;align-items:center;gap:56px;padding:0 72px;box-sizing:border-box}
h1{font-family:D;font-size:132px;line-height:.86;margin:0;text-transform:uppercase}
p{font-size:30px;color:#c9d2d8;margin:28px 0 0;line-height:1.35}
.l{font-family:D;font-size:56px}.l span{color:#cdeb3b}
</style></head><body><div style="flex:1"><div class="l">bandeja<span>.</span></div><h1 style="margin-top:28px">Lerne<br>Padel.</h1>
<p>Offene Online-Padelschule – Lektionen, Drills und 100 Seiten Wissen. Kostenlos.</p></div>
<svg viewBox="0 0 440 230" width="470"><rect x="10" y="10" width="420" height="210" rx="4" fill="#2a63be" stroke="#f3f4ee" stroke-width="3"/>
<line x1="220" y1="10" x2="220" y2="220" stroke="#0c1a24" stroke-width="4"/><line x1="74" y1="10" x2="74" y2="220" stroke="#f3f4ee" stroke-width="2"/>
<line x1="366" y1="10" x2="366" y2="220" stroke="#f3f4ee" stroke-width="2"/><line x1="74" y1="115" x2="366" y2="115" stroke="#f3f4ee" stroke-width="2"/>
<path d="M 300 72 Q 170 20 52 182" fill="none" stroke="#cdeb3b" stroke-width="4" stroke-dasharray="8 8"/><circle cx="52" cy="182" r="9" fill="#cdeb3b"/>
<circle cx="300" cy="72" r="14" fill="#0c1a24" stroke="#f3f4ee" stroke-width="3"/></svg></body></html>`;
const { chromium } = createRequire(import.meta.url)("playwright");
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(html);
await p.waitForTimeout(200);
await p.screenshot({ path: path.join(root, "static/og.png") });
await b.close();
console.log("static/og.png geschrieben", fs.statSync(path.join(root, "static/og.png")).size, "Bytes");
