// The site also works in a subfolder (e.g. https://example.org/padel/): build once with such a
// baseURL and make sure no root-relative path escapes it (HTML and CSS, fonts included).
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const name = "Unterordner";
const SUB = "/padel-test/";

function files(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) files(p, acc);
    else if (/\.(html|css)$/.test(p)) acc.push(p);
  }
  return acc;
}

export default async ({ root }) => {
  const errors = [];
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "bandeja-sub-"));
  try {
    execSync(`npx hugo --gc --minify --quiet -b https://example.org${SUB} -d ${out}`, { cwd: root, stdio: "pipe" });
    for (const file of files(out)) {
      const text = fs.readFileSync(file, "utf8");
      const rel = path.relative(out, file);
      const urls = [...text.matchAll(/(?:href|src)="?(\/[^"\s>]*)|url\(["']?(\/[^"')]*)/g)].map((m) => m[1] ?? m[2]);
      for (const u of new Set(urls)) {
        if (u.startsWith("//")) continue;
        if (!u.startsWith(SUB)) errors.push(`${rel}: Pfad ${u} verlässt den Unterordner`);
        else if (!fs.existsSync(path.join(out, decodeURIComponent(u.slice(SUB.length).split(/[?#]/)[0])))) errors.push(`${rel}: ${u} fehlt`);
      }
      for (const m of text.matchAll(/url\(["']?(\.\.\/[^"')]*)/g)) {
        if (!fs.existsSync(path.resolve(path.dirname(file), m[1]))) errors.push(`${rel}: ${m[1]} fehlt`);
      }
    }
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
  return { ok: errors.length === 0, errors: [...new Set(errors)], note: SUB };
};
