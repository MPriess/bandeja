// Quiz content: answers are plain text (the letter badge is added by the template),
// and `right` points to an existing answer.
import fs from "node:fs";
import path from "node:path";
import { frontMatter } from "../lib/courts.mjs";

export const name = "Quiz-Inhalte";

function quizFiles(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) quizFiles(p, acc);
    else if (p.endsWith(".md") && frontMatter(p).layout === "quiz") acc.push(p);
  }
  return acc;
}

export default async ({ root }) => {
  const errors = [];
  const files = quizFiles(path.join(root, "content"));
  let questions = 0;
  for (const file of files) {
    const rel = path.relative(root, file);
    (frontMatter(file).questions ?? []).forEach((q, i) => {
      questions++;
      const where = `${rel} Frage ${i + 1}`;
      const opts = q.options ?? [];
      if (opts.length < 2 || opts.length > 4) errors.push(`${where}: ${opts.length} Antworten (erlaubt 2–4)`);
      if (!Number.isInteger(q.right) || q.right < 0 || q.right >= opts.length) errors.push(`${where}: \`right\` zeigt auf keine Antwort`);
      if (!q.why?.trim()) errors.push(`${where}: Erklärung \`why\` fehlt`);
      opts.forEach((o, j) => {
        if (/^\s*[A-D]\s*[–—\-:.)]\s/.test(String(o))) errors.push(`${where}: Antwort ${j + 1} beginnt mit Buchstaben („${String(o).slice(0, 12)}…“) – der Buchstabe steht schon im Kästchen`);
      });
    });
  }
  return { ok: errors.length === 0, errors, note: `${files.length} Quiz, ${questions} Fragen` };
};
