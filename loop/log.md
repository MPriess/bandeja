# Log

| Zeit (UTC) | Punkt | Ergebnis | Offene Fragen |
| --- | --- | --- | --- |
| 2026-10-30T00:47Z | Loop eingerichtet | Prüfbefehl `npm run check` (Build, Links), Regeln, Plan | Pflege-Oberfläche (CMS) später entscheiden |
| 2026-10-30T00:47Z | Prüfung Seitenstruktur | Neue Prüfung (h1, lang, title, description, IDs) über 130 Seiten; Quiz-Seite hat jetzt eine h1 | – |
| 2026-10-30T00:48Z | Court-Daten zentral | `scripts/lib/courts.mjs` liest alle 31 Grafiken (24 Wissen, 6 Kapitel inkl. Gegner-Standardpositionen, 1 Quiz); Prüfung Court-Daten; devDependency yaml 2.9.1 | – |
| 2026-10-30T00:50Z | Prüfung Court-Geometrie | Aufschlaglinie fest auf 6,95 m vom Netz (x 74/366), Parameter `service` entfernt; Maße zentral in `scripts/lib/padel.mjs`; Prüfung über 38 gerenderte Courts. Gegenprobe: alte Vorlagen → 42 Fehler (0,33 m daneben, u. a. Startseite und Lektionen) | – |
| 2026-10-30T00:54Z | Prüfung Court-Regeln | Prüfung über 31 Grafiken (Positionen, Netzseiten, Überlappung, Ballweg/Ziel, Netz 1×, Laufwege, Zonen). Korrigiert: Gegner B stand bei r07/t06 auf deiner Seite; Zielzone „T“ bei t06 lag am Netz statt an der Aufschlaglinie; bei t07/t17 war der zweite Ballweg als Laufweg gezeichnet (neu: `ball2`); tr06 `ohneNetz`. Alle fünf Seiten `review: true` | Bitte r07, t06 (T-Zone), t07, t17 fachlich gegenlesen |
| 2026-10-30T00:55Z | UX-Runde 1 | Screenshots 360/768/1280 von Wissen-Artikel, Lektion, Quiz, Startseite. 5 neue UX-Punkte im Plan (Quiz-Ergebnis vor dem Antworten „0/4“ und Textfehler „die Die Bandeja“, doppelte Buchstaben in Antworten, Legende passt nicht zur Grafik, Court auf dem Handy zu klein, Kopfzeile mobil zu hoch) | – |
