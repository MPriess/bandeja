// Quality gate for bandeja. Runs every check and exits non-zero if one fails.
// Usage: npm run check
// New checks go into scripts/checks/ and are listed in CHECKS below.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const pub = path.join(root, "public");

function build() {
  fs.rmSync(pub, { recursive: true, force: true });
  const out = execSync("npx hugo --gc --minify --panicOnWarning", { cwd: root, encoding: "utf8", stdio: "pipe" });
  return { ok: true, note: out.match(/Pages\s+│\s+(\d+)/)?.[1] + " Seiten" };
}

function htmlFiles(dir = pub, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) htmlFiles(p, acc);
    else if (p.endsWith(".html")) acc.push(p);
  }
  return acc;
}

function links() {
  const errors = [];
  for (const file of htmlFiles()) {
    const html = fs.readFileSync(file, "utf8");
    for (const m of html.matchAll(/(?:href|src)="?([^"\s>]+)/g)) {
      let url = m[1];
      if (/^(https?:|mailto:|tel:|#|data:)/.test(url)) continue;
      url = decodeURIComponent(url.split("#")[0].split("?")[0]);
      let target = path.join(pub, url);
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
      if (!fs.existsSync(target)) errors.push(`${path.relative(pub, file)} → ${url}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

const CHECKS = [
  ["Build", build],
  ["Interne Links", links],
];

// Optional checks added later live in scripts/checks/*.mjs and export `default async () => ({ ok, errors, note })`.
const extraDir = path.join(root, "scripts/checks");
if (fs.existsSync(extraDir)) {
  for (const f of fs.readdirSync(extraDir).filter((f) => f.endsWith(".mjs")).sort()) {
    const mod = await import(path.join(extraDir, f));
    CHECKS.push([mod.name ?? f, mod.default]);
  }
}

let failed = 0;
for (const [name, fn] of CHECKS) {
  let r;
  try {
    r = await fn({ root, pub, htmlFiles });
  } catch (e) {
    r = { ok: false, errors: [String(e.stderr || e.message || e).trim()] };
  }
  console.log(`${r.ok ? "✔" : "✘"} ${name}${r.note ? ` (${r.note})` : ""}`);
  for (const e of (r.errors ?? []).slice(0, 40)) console.log(`   ${e}`);
  if ((r.errors?.length ?? 0) > 40) console.log(`   … ${r.errors.length - 40} weitere`);
  if (!r.ok) failed++;
}
console.log(failed ? `\n${failed} Prüfung(en) fehlgeschlagen.` : "\nAlle Prüfungen bestanden.");
process.exit(failed ? 1 : 0);
