// Monetisation building blocks: off by default; when switched on, recommendations are
// labelled as „Anzeige“, links are rel="sponsored nofollow", and they only appear in their category.
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const name = "Monetarisierung";

function html(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) html(p, acc);
    else if (p.endsWith(".html")) acc.push(p);
  }
  return acc;
}

export default async ({ root, pub }) => {
  const errors = [];
  for (const f of html(pub)) if (/data-anzeige|data-newsletter|data-premium/.test(fs.readFileSync(f, "utf8"))) errors.push(`${path.relative(pub, f)}: Einnahmen-Baustein sichtbar, obwohl ausgeschaltet`);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bandeja-mon-"));
  try {
    const data = path.join(tmp, "data"), out = path.join(tmp, "public");
    fs.mkdirSync(data);
    fs.writeFileSync(path.join(data, "empfehlungen.yaml"), "- { kategorie: schlaeger, name: Testschläger, text: Nur für die Prüfung., link: 'https://partner.example/x', haendler: Testshop }\n");
    execSync(`npx hugo --gc --minify --quiet -d ${out}`, { cwd: root, stdio: "pipe", env: { ...process.env, HUGO_DATADIR: data, HUGO_PARAMS_MONETARISIERUNG_PRODUKTE: "true" } });
    const pages = html(path.join(out, "wissen"));
    const inCat = pages.filter((f) => f.includes(`${path.sep}schlaeger${path.sep}`) && !f.endsWith(`schlaeger${path.sep}index.html`));
    const other = pages.filter((f) => !f.includes(`${path.sep}schlaeger${path.sep}`));
    for (const f of inCat.slice(0, 3)) {
      const t = fs.readFileSync(f, "utf8"), rel = path.relative(out, f);
      if (!t.includes("data-anzeige")) { errors.push(`${rel}: eingeschaltete Empfehlung fehlt`); continue; }
      if (!/>Anzeige</.test(t)) errors.push(`${rel}: Kennzeichnung „Anzeige“ fehlt`);
      const a = t.match(/<a href="?https:\/\/partner\.example[^>]*>/)?.[0] ?? "";
      if (!/rel="?[^">]*sponsored/.test(a) || !/nofollow/.test(a)) errors.push(`${rel}: Partnerlink ohne rel="sponsored nofollow"`);
      if (!/Provision/.test(t)) errors.push(`${rel}: Hinweis auf Provision fehlt`);
    }
    if (!inCat.length) errors.push("Testbuild ohne Schläger-Artikel");
    for (const f of other) if (fs.readFileSync(f, "utf8").includes("data-anzeige")) { errors.push(`${path.relative(out, f)}: Empfehlung in falscher Kategorie`); break; }
  } catch (e) {
    errors.push(String(e.stderr || e.message).trim());
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return { ok: errors.length === 0, errors, note: "aus; Testbuild an" };
};
