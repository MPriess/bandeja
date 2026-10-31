# Plan: Court-Videos aus mehreren Kameras

Ziel: Aus den Spielsituationen, die schon im Content stehen, **MP4-Videos** erzeugen – von oben, aus der TV-Perspektive, von der Seite, schräg und aus Spielersicht, mit Kamerafahrten und Texteinblendungen. Die Videos laufen auf der eigenen Seite (ohne YouTube) und als **YouTube Shorts** (Hochformat).

Regeln: `loop/regeln.md`. `- [ ]` offen · `- [x]` erledigt · `- [!]` gescheitert (Notiz in `loop/log.md`).

## Leitplanken

- **Die Seite bleibt ohne JavaScript.** JavaScript läuft nur beim Erzeugen der Videos auf dem eigenen Rechner (wie heute `scripts/og-bild.mjs`). Auf der Seite steht ein einfaches `<video>` mit eigener Datei – keine Anfragen an Drittanbieter.
- **Eine Quelle für Grafik und Video.** Die Videos lesen dieselben `court`-Daten wie die Grafiken (über `scripts/lib/courts.mjs`). Wer eine Grafik korrigiert, korrigiert auch das Video.
- **Bild für Bild statt in Echtzeit.** Der Renderer stellt für jedes Bild die Zeit exakt ein und macht dann eine Aufnahme. So ist jedes Video ruckelfrei und bei jedem Durchlauf gleich, egal wie schnell der Rechner ist.
- **Padel-Regeln gelten weiter.** Videos entstehen nur aus Grafiken, die `npm run check` bestehen. Für die Höhe des Balls kommen eigene Regeln dazu.

## Ablauf

```
content (court: …)        Clip-Datei (clips/*.yaml)
        │                        │  welche Situation, welche Kameras, Texte, Format
        ▼                        ▼
scripts/video/szene.mjs ──► Szene in Metern: Personen, Laufwege, Ball mit Höhe, Zonen, Zeitachse
        ▼
scripts/video/render.html  3D-Court im Browser (three.js), Kamera und Zeit von außen gesetzt
        ▼
scripts/video/render.mjs   Playwright: Bild für Bild als PNG → ffmpeg → MP4 (H.264) + Vorschaubild
        ▼
video-out/<clip>-quer.mp4, <clip>-short.mp4, <clip>.jpg
```

| Teil | Aufgabe |
| --- | --- |
| `scripts/lib/padel.mjs` | Erweitert um Höhen nach FIP: Netz 0,88 m (Mitte) / 0,92 m (Pfosten), Rückwand 3 m Glas + 1 m Gitter, Seitenwand 2 m Glas (3 m hoch), danach Gitter. |
| `scripts/video/szene.mjs` | px → m, Kurven (`Q`, `C`) abtasten, Ballhöhe nach Schlagtyp, Zeiten aus derselben Logik wie die Animationen in `court.html` (Ball zuerst, dann Laufweg usw.). |
| `scripts/video/kameras.mjs` | Voreinstellungen und Kamerafahrten (siehe unten). |
| `scripts/video/render.html` | three.js-Szene im Stil der Seite: Court-Blau, weiße Linien, Lime-Ball, Glas halbdurchsichtig, weiche Schatten. Funktion `zeige(t)` setzt alles auf Zeitpunkt t. |
| `scripts/video/render.mjs` | Startet Chromium, ruft `zeige(t)` für jedes Bild auf, schreibt PNGs, ruft ffmpeg auf, löscht die PNGs. |
| `clips/*.yaml` | Drehbuch je Video (siehe unten). |

### Kameras

| Name | Blick | Wofür |
| --- | --- | --- |
| `oben` | senkrecht von oben | Positionen, Laufwege, Zonen – wie die Grafik |
| `tv` | hinter der Rückwand, ca. 6 m hoch | Übersicht wie im Fernsehen |
| `seite` | Tribüne an der Seitenwand, ca. 4 m hoch | Höhe von Lob, Bandeja, Smash über dem Netz |
| `schraeg` | Ecke, ca. 45° | Spiel mit der Wand (Rückwand, Bajada, Contrapared) |
| `spieler` | knapp hinter „Du“, 1,9 m hoch | „So siehst du es auf dem Platz“ |

Zwischen zwei Kameras gibt es einen **Schnitt** oder eine **Fahrt** (weiche Bewegung über 1–2 s). Optional **Zeitlupe** für den Treffpunkt.

### Personen und Ball

- Spieler als schlichte Figuren (Körper, Kopf, angedeuteter Schläger), Farben nach Rolle wie in der Legende: Du, Partner, Gegner. „Vorher“ als blasser Umriss am Boden.
- Ballhöhe aus dem Schlagtyp, überschreibbar mit `hoehe: [start, scheitel, ende]` in der Grafik:

| Typ | Höhe in m (Start → Scheitel → Ende) |
| --- | --- |
| `lob` | 1 → 6–7 → 0 (oder Treffpunkt bei `treffpunkt: true`) |
| `bandeja`, `vibora` | 2,6 → fallend → 0 |
| `smash` | 3 → steil fallend → 0 |
| `chiquita` | 0,6 → ca. 1,1 über dem Netz → 0 |
| sonst | 1 → 1,5 über dem Netz → 0 |

- Ball mit Schatten auf dem Boden, Aufprall als kurzer Ring, Wandkontakt als Aufblitzen am Glas.

### Formate

| Format | Größe | Wofür |
| --- | --- | --- |
| `quer` | 1920 × 1080, 30 fps | Einbau in Lektionen und Wissen, YouTube |
| `short` | 1080 × 1920, 30 fps, ≤ 60 s | YouTube Shorts, Instagram Reels, TikTok |

Im Hochformat steht der Court längs (Netz waagerecht), Texte oben, die unteren ~20 % und der rechte Rand bleiben frei, weil YouTube dort Knöpfe einblendet. H.264, `yuv420p`, `+faststart`, ohne Ton. Musik fügt man am besten in YouTube selbst hinzu (Lizenzen).

### Drehbuch (Clip-Datei)

```yaml
# clips/vibora-oder-bandeja.yaml
titel: Bandeja oder Vibora?
quelle: lektionen/die-vibora/kapitel-1.md      # deren `court` wird abgespielt
formate: [quer, short]
ablauf:
  - { kamera: oben, dauer: 2, text: "Der Gegner lobt etwas zu kurz" }
  - { fahrt: seite, dauer: 1.5 }
  - { kamera: seite, abspielen: true, zeitlupe: treffpunkt }
  - { kamera: tv, abspielen: true, text: "Ziel: das Seitenglas" }
abspann: { text: "Ganze Lektion auf bandeja.", link: /lektionen/die-vibora/ }
```

Später möglich: mehrere Grafiken nacheinander als **Ballwechsel** (`quelle` als Liste).

Ohne eigene Clip-Datei gibt es ein **Standard-Drehbuch**: oben → Fahrt zu `tv` → Ablauf → Wiederholung von der Seite. So lässt sich aus jeder der vorhandenen Grafiken mit einem Befehl ein Video machen.

### Befehle

```bash
npm run video -- vibora-oder-bandeja
npm run video -- vibora-oder-bandeja --format short --kamera seite
npm run videos
```

Dazu ein schneller Vorschau-Modus (niedrige Auflösung, 15 fps) und `--standbild 2.5`, das ein einzelnes PNG zum Zeitpunkt 2,5 s ausgibt.

### Einbau in die Seite

- Neues Feld `datei` in `content/videos/*.md` neben `youtube`. Mit `datei` zeigt die Video-Seite ein eigenes `<video controls preload="none" poster="…">` – kein Zwei-Klick nötig, weil nichts von Google geladen wird.
- In Lektionskapiteln optional als dritte Ansicht neben „Court“ und „Ablauf“: „Video“.
- MP4-Dateien **nicht ins Git** (je Video ca. 2–8 MB). Entweder Git LFS oder ein eigener Speicher (z. B. ein Bucket), Adresse in `hugo.toml` unter `params.videoBasis`. Kurze Klips bis ca. 1 MB können in `static/videos/`.
- Performance-Prüfung: Videos laden erst beim Klick auf Play (`preload="none"`), zählen also nicht zum Seitenbudget.

## Schritte

### 1 · Szene und Zeitachse

- [ ] `padel.mjs` um Höhen der Wände und des Netzes erweitern.
- [ ] `scripts/video/szene.mjs`: Grafik → Szene in Metern, Ballhöhe nach Typ, Zeiten wie in `court.html`.
- [ ] Selbsttest: Zeiten aus `szene.mjs` = `data-start`/`data-end` der Animationen auf der gebauten Seite; Ball über dem Netz > 0,88 m, nie unter dem Boden, Lob-Scheitel ≥ 4 m.

### 2 · Renderer, Standbild

- [ ] `three` als devDependency; `render.html` mit Court, Netz, Wänden, Licht im Stil der Seite.
- [ ] Figuren und Ball mit Schatten; Zonen und Laufwege auf dem Boden.
- [ ] Fünf Kameras; `--standbild` erzeugt je Kamera ein PNG zum Anschauen (zur Abstimmung des Looks vor dem ersten Video).

### 3 · Video

- [ ] `render.mjs`: Bild für Bild aufnehmen, ffmpeg, MP4 + Vorschaubild; Fortschrittsanzeige im Terminal.
- [ ] Drehbuch-Format (`clips/*.yaml`) mit Schnitt, Fahrt, Zeitlupe, Text, Abspann; Standard-Drehbuch für jede Grafik.
- [ ] Texte mit den Schriften der Seite (Barlow Condensed, Inter) und Logo im Abspann.
- [ ] Format `short`: Court längs, sichere Ränder für die YouTube-Knöpfe.

### 4 · Prüfungen

- [ ] Neue Prüfung „Videos“ (nur wenn Videos vorhanden): `ffprobe` meldet richtige Größe, H.264, `yuv420p`, Länge ≤ 60 s bei `short`, Datei ≤ 10 MB; jedes Drehbuch verweist auf eine existierende Grafik.
- [ ] Prüfung „Sichere Ränder“: im Short-Format keine Texte im unteren Fünftel und am rechten Rand.

### 5 · Einbau und erste Videos

- [ ] Feld `datei` in `content/videos/`, eigener Player ohne Drittanbieter; `68-videos.mjs` anpassen.
- [ ] Ablage der MP4-Dateien festlegen (LFS oder Speicher) und in `PFLEGE.md` beschreiben.
- [ ] Erste Clips: Aufschlag, Lob, Bandeja, Vibora, Smash, Rückwand – jeweils quer und als Short.
- [ ] `PFLEGE.md`: Abschnitt „Videos erzeugen“ (Drehbuch, Befehle, Hochladen zu YouTube).

## Risiken

| Risiko | Gegenmaßnahme |
| --- | --- |
| 3D im Headless-Chromium ohne Grafikkarte ist langsam | Bild für Bild ist unabhängig vom Tempo; 30 s Video ≈ 900 Bilder ≈ wenige Minuten. Vorschau-Modus für schnelles Abstimmen. |
| Ballhöhe aus dem Typ wirkt in Einzelfällen falsch | Feld `hoehe` zum Überschreiben; Höhenregeln in der Prüfung. |
| Große Dateien im Repository | MP4 nicht ins Git, nur Drehbücher; Ausgabe in `video-out/` (in `.gitignore`). |
| Figuren wirken steif | Bewusst schlicht halten (Stil der Grafiken); kleine Ausholbewegung beim Schlag reicht. |

## Offene Fragen

1. **Look:** schlicht im Stil der Grafiken (flache Farben, Court-Blau, Lime-Ball) oder eher realistisch (Kunstrasen, Glas mit Spiegelungen, Halle)? Empfehlung: schlicht – passt zur Seite und ist als Marke wiedererkennbar.
2. **Ton:** stumm (Musik in YouTube hinzufügen) oder Schlaggeräusche/Sprechertext? Empfehlung: zuerst stumm.
3. **Ablage der MP4:** Git LFS, ein eigener Speicher, oder nur YouTube und auf der Seite weiter per Zwei-Klick einbinden?
4. **Erste Clips:** passt die Liste (Aufschlag, Lob, Bandeja, Vibora, Smash, Rückwand)?
