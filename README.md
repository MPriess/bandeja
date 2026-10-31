# bandeja.

Offene Online-Padelschule: ein Lernpfad in vier Stufen, Lektionen mit Court-Grafiken, Drills für den Platz und 100 Seiten Padel-Wissen. Kostenlos, ohne Konto, ohne Anmeldung – und ohne JavaScript (nur die Video-Seiten laden nach einem Klick den YouTube-Player).

Gebaut mit [Hugo](https://gohugo.io) und [Tailwind CSS](https://tailwindcss.com) v4.

## Loslegen

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run check
```

Hugo und das Tailwind-CLI kommen über npm mit (`hugo-extended`, `@tailwindcss/cli`). Die Seite landet in `public/`. Vor dem Veröffentlichen `baseURL` in `hugo.toml` setzen und Impressum/Datenschutz (`content/impressum.md`, `content/datenschutz.md`) ausfüllen.

Wie du Inhalte anlegst, prüfst und Court-Grafiken baust, steht in [PFLEGE.md](PFLEGE.md).

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `content/lernpfad/stufe-N/_index.md` | Eine Stufe: Lektionen, Drills und die Punkte für den Stufen-Check |
| `content/lektionen/<lektion>/` | Eine Lektion: `_index.md` (Bewegungsablauf, Drill), je Kapitel eine Datei, `quiz.md` |
| `content/drills/` | Drills für den Court |
| `content/videos/` | YouTube-Videos zu Spielsituationen, je Video eine Datei mit `youtube` (ID) und `lektion` |
| `content/wissen/<kategorie>/` | Die 100 Wissensseiten; Farben der Kategorie in `_index.md` |
| `layouts/_partials/ui/` | Basis-Bausteine: Button, Icon, Chip, Logo, Fortschrittsbalken |
| `layouts/_partials/court.html` | Der Padelcourt als SVG (Positionen, Flugbahn, Zielzonen) |
| `scripts/video/`, `clips/` | Court-Videos (MP4) mit Spielern und Kameras, `npm run video` – nur zum Erzeugen, nicht auf der Seite |
| `assets/css/main.css` | Tailwind-Import, Design-Tokens (`@theme`), Schriften, Zähler |

## Interaktion ohne JavaScript

- **Ansicht umschalten** (Court / Bewegungsablauf) und **Quiz-Feedback**: Radio-Buttons plus CSS `:has()`.
- **Quiz-Punktzahl** und **Treffer im Drill**: CSS-Counter (`.tally` in `main.css`).
- **Neu starten**: `<button type="reset">`.
- Nichts wird gespeichert; Kapitel, Stufen und Seiten sind einfache Links.
- **Eigene 3D-Animationen** (`static/media/animationen/`): lokales `<video>` mit `preload="none"` – lädt erst beim Abspielen, nichts von Dritten.
- **YouTube-Videos per Zwei-Klick**: Lektionen und `/videos/` zeigen nur eine Karte. Der Player (youtube-nocookie.com) steckt allein auf der Video-Seite `/videos/<name>/`, die nie vorgeladen wird. Alle anderen Seiten laden nichts von Drittanbietern; `npm run check` prüft das.

Schriften (Barlow Condensed, Inter) werden über `@fontsource` selbst gehostet – keine Anfragen an Drittanbieter.
