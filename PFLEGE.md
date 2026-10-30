# Inhalte pflegen

Alles, was auf der Seite steht, liegt in `content/` als Textdatei mit einem Kopfteil zwischen `---`. Die Vorlagen in `layouts/` musst du dafür nicht anfassen.

## Vorschau und Prüfung

```bash
npm run dev
```

Öffnet die Vorschau unter http://localhost:1313 und lädt bei jeder Änderung neu.

```bash
npm run check
```

Baut die Seite und prüft alles: Links, Seitenaufbau, Court-Grafiken nach Padel-Regeln, Animationen, Barrierefreiheit, Layout auf Handy und Desktop. Erst wenn hier „Alle Prüfungen bestanden.“ steht, ist eine Änderung fertig. Die Meldungen nennen Datei und Problem auf Deutsch.

## Neue Inhalte anlegen

Neue Inhalte starten als Entwurf (`draft: true`) und erscheinen erst, wenn du das auf `false` setzt. `review: true` heißt: fachlich noch nicht gegengelesen.

| Was | Befehl | Danach |
| --- | --- | --- |
| Wissensartikel | `npx hugo new content wissen/schlagtechniken/t23.md` | `id`, `weight` und Texte ausfüllen |
| Drill | `npx hugo new content drills/mein-drill.md` | `lesson` auf die passende Lektion setzen |
| Lektion | `npx hugo new content --kind lektion lektionen/die-vibora` | weitere Kapitel als Kopie von `kapitel-2.md`; Lektion in `content/lernpfad/stufe-N/_index.md` unter `lessons` eintragen |

Entwürfe in der Vorschau sehen: `npx hugo server -D`.

## Wo steht was?

| Inhalt | Datei |
| --- | --- |
| Probelektion, Grafik und „Beliebte Lektionen“ auf der Startseite | `content/_index.md` |
| Probelektion im Lernpfad | `content/lernpfad/_index.md` |
| Eine Stufe: Lektionen, Drills, Stufen-Check | `content/lernpfad/stufe-N/_index.md` |
| Lektion: Bewegungsablauf, Kapitel, Quiz | `content/lektionen/<name>/` |
| Wissensartikel und Kategorie-Farben | `content/wissen/<kategorie>/` |
| Impressum, Datenschutz | `content/impressum.md`, `content/datenschutz.md` |

## Court-Grafiken

Eine Grafik ist eine Liste von Koordinaten im Feld 440 × 230 (Court von oben, Netz in der Mitte bei x 220, Aufschlaglinien bei x 74 und 366, 21 Punkte = 1 Meter).

| Feld | Bedeutung |
| --- | --- |
| `type` | Was die Grafik zeigt, z. B. `aufschlag`, `lob`, `bandeja`, `aufstellung`. Danach richten sich die Regeln der Prüfung. |
| `cap` | Ein Satz Beschreibung (wird vorgelesen). |
| `px`/`py`, `qx`/`qy` | Du, dein Partner |
| `ax`/`ay`, `bx`/`by` | Die Gegner |
| `gx`/`gy` | Deine frühere Position |
| `ball`, `tx`/`ty` | Ballweg (Pfad mit `M`, `L`, `Q`, `C`) und Ziel; `treffpunkt: true`, wenn das Ziel der Treffpunkt in der Luft ist |
| `mv` | Dein Laufweg |
| `zx`/`zy`/`zw`/`zh` | Zielzone |

Ballflug und Laufweg werden in Artikeln und Lektionen automatisch animiert. Die Prüfung meldet, wenn etwas den Padel-Regeln widerspricht, z. B. „Aufschläger steht vor seiner Aufschlaglinie“. Alle Regeln stehen in `loop/regeln.md`.
