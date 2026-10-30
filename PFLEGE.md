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
| Video | `npx hugo new content videos/der-lob.md` | `youtube`, `lektion`, `situation` ausfüllen, Startzeit prüfen |
| Lektion | `npx hugo new content --kind lektion lektionen/die-vibora` | weitere Kapitel als Kopie von `kapitel-2.md`; Lektion in `content/lernpfad/stufe-N/_index.md` unter `lessons` eintragen |

Entwürfe in der Vorschau sehen: `npx hugo server -D`.

## Wo steht was?

| Inhalt | Datei |
| --- | --- |
| Probelektion, Grafik und Lektionsauswahl auf der Startseite | `content/_index.md` |
| Probelektion im Lernpfad | `content/lernpfad/_index.md` |
| Schnellstart (8 Schritte auf einer Seite, mit Grafiken) | `content/schnellstart.md` |
| Eine Stufe: Lektionen, Drills, Stufen-Check | `content/lernpfad/stufe-N/_index.md` |
| Lektion: Bewegungsablauf, Kapitel, Quiz | `content/lektionen/<name>/` |
| Wissensartikel und Kategorie-Farben | `content/wissen/<kategorie>/` |
| Impressum, Datenschutz | `content/impressum.md`, `content/datenschutz.md` |

## Videos zu Spielsituationen

Ein Video ist eine Datei in `content/videos/`. Es erscheint in der Video-Übersicht und in allen Kapiteln der Lektion, die unter `lektion` steht.

| Feld | Bedeutung |
| --- | --- |
| `youtube` | Die Video-ID: der Teil nach `v=` in der YouTube-Adresse (11 Zeichen) |
| `start`, `ende` | Optional: ab welcher Sekunde das Video startet und wo es endet – so zeigst du genau die Szene |
| `kanal`, `sprache` | Wer das Video gemacht hat und in welcher Sprache es ist (als Hinweis auf der Karte) |
| `lektion` | Die passende Lektion, z. B. `/lektionen/bandeja` |
| `situation` | Ein bis zwei Sätze: Was passiert auf dem Court? |
| `achte` | Zwei bis drei Punkte, worauf man im Video achtet |

Wir nehmen nur Videos vom YouTube-Kanal **PadelCity TV** (PadelCity Academy mit Coach Hank), damit Sprache, Stil und Fachbegriffe einheitlich bleiben.

`review: true` heißt: Video noch nicht angeschaut – Inhalt und Startzeit prüfen, dann auf `false` setzen. Der YouTube-Player lädt nur auf der Video-Seite selbst; Lektionen zeigen eine Karte ohne Bild von YouTube. Bitte keine Vorschaubilder von YouTube einbauen, sonst lädt jede Lektion wieder Daten von Google.

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

## Einnahmen (standardmäßig aus)

Alle Bausteine sind in `hugo.toml` unter `[params.monetarisierung]` ausgeschaltet. Einschalten erst, wenn Impressum, Datenschutz und Partnerprogramm rechtlich geklärt sind.

| Baustein | Inhalt | Schalter |
| --- | --- | --- |
| Produktempfehlungen | `data/empfehlungen.yaml` (je Wissen-Kategorie, z. B. `schlaeger`) | `produkte = true` |
| Newsletter-Anmeldung über der Fußzeile | `newsletterText`; Formular-Adresse deines Anbieters in `newsletterAction` (mit Double-Opt-in) | `newsletter = true` |
| Premium-Hinweis auf der Lernpfad-Übersicht | `premiumTitel`, `premiumText`, optional `premiumLink` | `premium = true` |

Empfehlungen werden automatisch als „Anzeige“ gekennzeichnet, mit Hinweis auf die Provision und Links mit `rel="sponsored nofollow"`. `npm run check` prüft das mit einem Testprodukt, auch wenn der Schalter aus ist.
