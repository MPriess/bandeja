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
| `scripts/video/zeitplan.mjs` | Drehbuch → Zeitplan (Kamera, Szenenzeit, Text je Moment), Standard-Drehbuch |
| `scripts/video/regeln.mjs` | Padel-Regeln und Ballposition in 3D: Netz, Aufprall vor Wand, Aufschlag, Treffpunkt Schläger–Ball, Ball durch Körper, Netz und Wände für Spieler |
| `scripts/video/welt/*.js` | three.js: Court (Kunstrasen, Linien, Netz, Glas, Gitter), Spieler mit Skelett und IK, Schläger, Posen und Schläge, Einblendungen |
| `scripts/video/render.mjs` | CLI: Chromium, Bild für Bild, ffmpeg → MP4 + Vorschaubild |

## Schritte

- [x] Szene: Grafik → Meter, Zeiten wie `court.html`, Ballhöhe nach Schlagtyp (Netz überquert > 0,88 m), Wandkontakt, Schlagender und Annehmender
- [x] Court in 3D: Kunstrasen, Linien, Netz mit Pfosten, Glaswände, Gitter, Licht und Schatten
- [x] Schläger nach Regelmaß (45,5 × 26 cm, 38 mm, Lochmuster, Griff, Schlaufe)
- [x] Spieler: Körper mit Skelett, Kleidung je Team, Arme und Beine per IK
- [x] Posen: Bereitschaft, Laufen, Seitschritt; Schläge Vorhand, Rückhand, Volley, Aufschlag, Bandeja, Vibora, Smash, Lob, Chiquita
- [x] Kameras und Fahrten, beide Formate
- [x] Einblendungen: Titel, Text je Abschnitt, Abspann mit Logo; im Short sichere Ränder
- [x] Render-CLI mit ffmpeg (H.264, yuv420p, faststart), Vorschau-Modus, Standbild
- [x] Drehbücher: Format `clips/*.yaml`, Standard-Drehbuch, erste Clips (Aufschlag, Lob, Bandeja, Vibora, Smash, Rückwand)
- [x] Prüfung: Szene-Selbsttest (Zeiten = Seite, Ballhöhen) in `npm run check`, ohne Rendern
- [x] `PFLEGE.md`: Abschnitt „Videos erzeugen“

## Nächste Runde

- [x] Referenz-Clip „Bandeja oder Vibora?“: `npm run referenz` (Regeln, Entwurf, Kontaktbogen, Nahaufnahme in ~1 min)
- [x] Spieler-Aussehen: Gesicht, Pferdeschwanz, Stirnband, Kragen, Hosenstreifen; Trikot über der Hose, Schultern geschlossen; Kamera `nah`

- [x] Realistischere Bewegung: Schläge als Spline durch alle Posen (Schläger schwingt durch den Ball), Schrittfolge mit festen Standfüßen statt Gleiten, Körper dreht mit dem Ball, Wippen in Bereitschaft, Ausholen mit gebeugtem Arm, kräftigere Arme und Beine
- [x] Umgebung: Banden mit „bandeja.“-Logo rund um den Court, Flutlichtmasten, Boden um den Court

- [x] Jingle (selbst erzeugt, −14 LUFS) am Anfang und im Abspann jedes Videos; `--nur-ton` mischt in fertige Videos
- [x] Voice-over eingeplant: `sprecher` je Abschnitt, `--sprechertext` mit Zeitbudget, Aufnahmen aus `clips/sprache/<clip>/<nr>.wav`, Abschnitt verlängert sich bei langen Aufnahmen
- [ ] Voice-over aufnehmen oder per TTS erzeugen (Piper-Stimmen liegen auf Hugging Face, hier gesperrt) und für alle Clips Sprechertexte schreiben
- [x] Short: Seitenkamera an deiner Position ausgerichtet (näher, Spieler größer); langer Bildtext im Standard-Ablauf nur noch in der Ansicht von oben

- [x] Regeln und Ballposition in 3D prüfen (`51-video-regeln.mjs` mit Selbsttest); `npm run video` rendert nur regelkonforme Szenen

- [ ] Volle Renders aller Clips prüfen (Kontaktbogen je Clip), Auffälligkeiten beheben
- [x] Renderzeit senken: JPEG statt PNG, 1,6 → 0,8 s pro Bild in 1080p (Zeichnen allein 0,2 s; nächster Schritt wäre WebCodecs im Browser)
- [x] Laufen: Seitschritte statt Vorwärtslauf, wenn der Weg quer zur Blickrichtung geht (Füße kreuzen nicht, führender Fuß zuerst, tiefe Bereitschaftshaltung)
- [x] Gegner und Partner reagieren: Split-Step zum gegnerischen Treffpunkt, Blick zum Ball
- [x] Paare verschieben sich gemeinsam zur Ballseite (wie im Match), Kameras TV/Seite/Schräg schwenken dezent mit dem Ball
