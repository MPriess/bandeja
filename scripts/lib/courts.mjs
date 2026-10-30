// Collects every court diagram from the content, as the templates render it.
// Returns [{ file, where, kind, d }]: kind is "wissen" | "kapitel" | "quiz",
// `where` is the path inside the front matter, `d` the diagram data.
// Run directly for an overview: node scripts/lib/courts.mjs
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

// Defaults the lesson template merges into every chapter diagram (layouts/lektionen/page.html).
export const KAPITEL_DEFAULTS = { ax: 130, ay: 70, bx: 140, by: 165 };

export function frontMatter(file) {
  const text = fs.readFileSync(file, "utf8");
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    return parseYaml(text.slice(3, end));
  }
  if (text.startsWith("{")) {
    // JSON front matter: the object ends at the first line that is just "}".
    const end = text.search(/\n}\s*(\n|$)/);
    return JSON.parse(text.slice(0, end + 2));
  }
  return {};
}

function mdFiles(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) mdFiles(p, acc);
    else if (p.endsWith(".md")) acc.push(p);
  }
  return acc;
}

export function collectCourts(root) {
  const out = [];
  for (const file of mdFiles(path.join(root, "content"))) {
    const rel = path.relative(root, file);
    const fm = frontMatter(file);
    if (fm.diag) out.push({ file: rel, where: "diag", kind: "wissen", d: fm.diag });
    if (rel.startsWith("content/lektionen/") && fm.layout !== "quiz" && !rel.endsWith("_index.md")) {
      out.push({ file: rel, where: "court", kind: "kapitel", d: { ...KAPITEL_DEFAULTS, ...(fm.court ?? {}) } });
    }
    (fm.questions ?? []).forEach((q, i) => {
      if (q.court) out.push({ file: rel, where: `questions[${i}].court`, kind: "quiz", d: q.court });
    });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const all = collectCourts(path.resolve(import.meta.dirname, "../.."));
  const by = Object.groupBy(all, (c) => c.kind);
  for (const [k, v] of Object.entries(by)) console.log(`${k}: ${v.length}`);
  for (const c of all) console.log(`${c.file} ${c.where}  ${c.d.cap ?? "(ohne cap)"}`);
}
