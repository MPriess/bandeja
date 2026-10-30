// All court diagrams can be read from the content.
import { collectCourts } from "../lib/courts.mjs";

export const name = "Court-Daten";

export default async ({ root }) => {
  const courts = collectCourts(root);
  const errors = courts.length ? [] : ["Keine Court-Grafiken gefunden – Sammel-Skript defekt?"];
  return { ok: errors.length === 0, errors, note: `${courts.length} Grafiken` };
};
