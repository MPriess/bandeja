# Plan: Court-Videos (JavaScript-Version)

Ziel: Aus den Court-Grafiken im Content **MP4-Videos** mit Spielern und Schlägern erzeugen – aus mehreren Kameras, quer (1920 × 1080) für die Seite und hochkant (1080 × 1920) für YouTube Shorts.

Erst mit JavaScript (three.js im Headless-Chromium, Bild für Bild, ffmpeg). Ein späterer Umstieg auf Blender bleibt möglich: Szene und Drehbuch sind vom Renderer getrennt.

`- [ ]` offen · `- [x]` erledigt · `- [!]` gescheitert (Notiz in `loop/log.md`).

## Leitplanken

- Die **Seite** bleibt ohne JavaScript. JavaScript läuft nur beim Erzeugen der Videos (`scripts/video/`), wie `scripts/og-bild.mjs`.
- **Eine Quelle:** Videos lesen dieselben `court`-Daten wie die Grafiken (`scripts/lib/courts.mjs`), mit denselben Zeiten wie die Animationen in `court.html`.
- **Bild für Bild:** Der Renderer setzt die Zeit exakt, nimmt auf, gibt das Bild an ffmpeg. Gleiches Ergebnis bei jedem Lauf.
- MP4-Dateien kommen nicht ins Git (`video-out/` in `.gitignore`), nur Drehbücher in `clips/`.

## Aufbau

| Datei | Aufgabe |
| --- | --- |
| `scripts/video/szene.mjs` | Grafik → Szene in Metern: Personen mit Weg über die Zeit, Ball mit Höhe, Schläge (wer, wann, welche Art), Zonen |
| `scripts/video/kameras.mjs` | Kameras `oben`, `tv`, `seite`, `schraeg`, `spieler`, `hinten` je Format, weiche Fahrten |
| `scripts/video/drehbuch.mjs` | `clips/*.yaml` lesen, Quelle auflösen, Standard-Drehbuch für jede Grafik |
| `scripts/video/welt/*.js` | three.js: Court (Kunstrasen, Linien, Netz, Glas, Gitter), Spieler mit Skelett und IK, Schläger, Posen und Schläge, Einblendungen |
| `scripts/video/render.mjs` | CLI: Chromium, Bild für Bild, ffmpeg → MP4 + Vorschaubild |

## Schritte

- [ ] Szene: Grafik → Meter, Zeiten wie `court.html`, Ballhöhe nach Schlagtyp (Netz überquert > 0,88 m), Wandkontakt, Schlagender und Annehmender
- [ ] Court in 3D: Kunstrasen, Linien, Netz mit Pfosten, Glaswände, Gitter, Licht und Schatten
- [ ] Schläger nach Regelmaß (45,5 × 26 cm, 38 mm, Lochmuster, Griff, Schlaufe)
- [ ] Spieler: Körper mit Skelett, Kleidung je Team, Arme und Beine per IK
- [ ] Posen: Bereitschaft, Laufen, Seitschritt; Schläge Vorhand, Rückhand, Volley, Aufschlag, Bandeja, Vibora, Smash, Lob, Chiquita
- [ ] Kameras und Fahrten, beide Formate
- [ ] Einblendungen: Titel, Text je Abschnitt, Abspann mit Logo; im Short sichere Ränder
- [ ] Render-CLI mit ffmpeg (H.264, yuv420p, faststart), Vorschau-Modus, Standbild
- [ ] Drehbücher: Format `clips/*.yaml`, Standard-Drehbuch, erste Clips (Aufschlag, Lob, Bandeja, Vibora, Smash, Rückwand)
- [ ] Prüfung: Szene-Selbsttest (Zeiten = Seite, Ballhöhen) in `npm run check`, ohne Rendern
- [ ] `PFLEGE.md`: Abschnitt „Videos erzeugen“
