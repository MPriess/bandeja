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

**Eigene Animationen** (3D-Videos aus `npm run videos:web`) haben statt `youtube` die Felder `datei` und `poster` (Pfade in `static/`, z. B. `media/animationen/smash.mp4`) und statt `lektion` wahlweise `wissen` (z. B. `/wissen/schlagtechniken/t10`). Sie laufen in einem eigenen Player ohne YouTube: nichts lädt vor dem Klick auf Play, nichts kommt von anderen Anbietern. Neu rendern und in die Seite übernehmen:

```bash
npm run videos:web
```

Schreibt `static/media/animationen/<clip>.mp4` (1280 × 720, ca. 1–2 MB) und `<clip>.jpg` für jedes Drehbuch in `clips/`.

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

## Court-Videos erzeugen (MP4)

Aus jeder Court-Grafik lässt sich ein Video mit Spielern, Schlägern und mehreren Kameras machen: quer (1920 × 1080) für die Seite und hochkant (1080 × 1920) für YouTube Shorts. Das läuft nur auf deinem Rechner, nicht auf der Seite (dort bleibt alles ohne JavaScript). Nötig sind `ffmpeg` und Playwright mit Chromium (einmalig: `npm install --no-save playwright` und `npx playwright install chromium`).

```bash
npm run video -- vibora-oder-bandeja
```

Rendert `clips/vibora-oder-bandeja.yaml` in beiden Formaten nach `video-out/` (MP4 und Vorschaubild). Der Ordner kommt nicht ins Git.

```bash
npm run video -- vibora-oder-bandeja --vorschau
```

Halbe Größe, 15 Bilder pro Sekunde – zum schnellen Anschauen.

```bash
npm run videos -- --entwurf
```

Entwurf: 480 × 270 (bzw. 270 × 480), 12 Bilder pro Sekunde, ohne Kantenglättung – etwa eine Minute pro Clip statt 13 Minuten in Full HD. Zum Abstimmen von Bewegung, Kamera und Text; erst wenn alles sitzt, in voller Qualität rendern.

```bash
npm run video -- smash --standbild 1.2 --kamera seite
```

Ein einzelnes Bild bei 1,2 s aus einer Kamera, zum Prüfen von Schlag und Ausschnitt.

```bash
npm run video -- --quelle content/wissen/schlagtechniken/t11.md
```

Video direkt aus einer Grafik mit dem Standard-Ablauf, ohne Drehbuch.

```bash
npm run videos
```

Alle Drehbücher in `clips/`.

### Referenz-Clip zum schnellen Abstimmen

```bash
npm run referenz
```

Prüft die Regeln, rendert den Referenz-Clip „Bandeja oder Vibora?“ als Entwurf, legt einen Kontaktbogen (2 Bilder pro Sekunde) und eine Nahaufnahme im Treffpunkt an – in etwa einer Minute: `video-out/referenz-entwurf.mp4`, `referenz-blatt.png`, `referenz-nah.png`. Jede Änderung zuerst hier prüfen, danach erst alle Clips. Anderer Clip als Referenz: `npm run referenz -- smash`.

### Drehbuch (`clips/<name>.yaml`)

| Feld | Bedeutung |
| --- | --- |
| `titel` | Großer Titel am Anfang |
| `quelle` | Datei mit der Court-Grafik, bei mehreren Grafiken mit `#pfad`, z. B. `content/schnellstart.md#schritte[4].court` |
| `court` | Felder, die nur im Video gelten, z. B. `{ annahme: vibora }` (welchen Schlag du am Treffpunkt spielst) oder `{ hoehe: [1, 6.5, 0] }` (Ballhöhe Start, Scheitel, Ende in Metern) |
| `formate` | `[quer, short]` (Standard) oder nur eines davon |
| `ablauf` | Abschnitte nacheinander (fehlt er, gilt der Standard-Ablauf) |
| `abspann` | `{ text, dauer }` oder `false` |
| `jingle` | `false` schaltet den Jingle ab (Standard: an) |
| `ton` | `false`: Video ohne Tonspur |

Ein Abschnitt im `ablauf`:

| Feld | Bedeutung |
| --- | --- |
| `kamera` | `oben`, `tv`, `seite`, `schraeg`, `hinten` (hinter dir, durchs Glas), `spieler` (über deine Schulter), `nah` (Nahaufnahme von dir) |
| `fahrt` | statt `kamera`: weiche Kamerafahrt von der vorigen Kamera zu dieser |
| `abspielen` | `true`: die Spielszene läuft; sonst steht sie |
| `ab` | `start` (Szene von vorn), `ende` oder eine Sekundenzahl |
| `tempo` | z. B. `0.5` für Zeitlupe (im Video als „Zeitlupe“ markiert) |
| `dauer` | Sekunden; bei `abspielen` ergibt sie sich sonst aus der Szene |
| `text` | Einblendung in diesem Abschnitt |
| `sprecher` | Text für den Voice-over in diesem Abschnitt (ohne eigenen `ablauf`: als Liste `sprecher:` oben im Drehbuch, je Abschnitt des Standard-Ablaufs eine Zeile) |

Die Zeiten von Ballflug und Laufweg sind dieselben wie in den Animationen auf der Seite. Die Ballhöhe ergibt sich aus `type` (ein Lob steigt auf 6,5 m, eine Bandeja fällt ab 2,3 m). `npm run check` prüft alle Szenen und Drehbücher in 3D, ohne zu rendern: Ball über dem Netz (mit Durchhang), erst Boden dann Wand, höchstens ein Aufprall, nie durchs Glas oder über die Wand; Aufschlag höchstens in Hüfthöhe und ins diagonale Feld; der Schläger trifft den Ball (± 10 cm), der Ball fliegt durch niemanden, niemand läuft ans Netz oder in die Wand; Shorts höchstens 60 s. `npm run video` rendert nur Szenen, die diese Regeln einhalten.

### Ton: Jingle und Voice-over

Jedes Video bekommt den bandeja.-Jingle: einen Ball-„Pock“ mit kurzem Marimba-Motiv unter dem Titel und einen Schlussakkord unter dem Logo. Der Jingle wird im Skript erzeugt (`scripts/video/jingle.mjs`), es ist keine fremde Musik – frei nutzbar auf der Seite und auf YouTube (keine Content-ID-Treffer). Lautheit etwa −14 LUFS wie bei YouTube üblich.

Voice-over, Schritt für Schritt:

1. Im Drehbuch je Abschnitt `sprecher:` ausfüllen.
2. Skript mit Zeitbudget je Abschnitt erzeugen:

```bash
npm run video -- aufschlag --sprechertext
```

3. Je Abschnitt eine Aufnahme ablegen: `clips/sprache/aufschlag/1.wav`, `2.wav` … (auch `.mp3`, `.m4a`). Eigene Stimme oder ein Sprachdienst – Nutzungsrechte der Stimme beachten. Alle Texte stehen gesammelt in `clips/SPRECHERTEXTE.md` (neu erzeugen mit `npm run sprache -- --text`). Automatisch vertonen auf deinem Rechner:

```bash
npm run sprache -- --alle --piper ~/piper/de_DE-thorsten-high.onnx
```

Mit [Piper](https://github.com/rhasspy/piper) (kostenlos, lokal; deutsche Stimmen z. B. `de_DE-thorsten-high`). Auf dem Mac geht auch die eingebaute Stimme:

```bash
npm run sprache -- --alle --say Anna
```

Vorhandene Aufnahmen bleiben erhalten (eigene Stimme hat Vorrang), `--neu` ersetzt sie.
4. Neu rendern. Ist eine Aufnahme länger als ihr Abschnitt, wird der Abschnitt automatisch verlängert. Die Sprache wird auf −16 LUFS gebracht, der Jingle darunter leiser.

Nur den Ton neu mischen, ohne das Bild neu zu rendern (wenn sich die Länge nicht ändert):

```bash
npm run video -- aufschlag --nur-ton
```

### Szene exportieren (für Blender oder eigene Auswertung)

```bash
npm run export -- vibora-oder-bandeja
```

Legt `video-out/export/vibora-oder-bandeja.zip` an: die animierte 3D-Szene als `szene.glb` (in Blender: Datei → Import → glTF 2.0), alle Bilder mit Gelenken, Schläger, Ball und Kamera als JSON und CSV, Szene, Zeitplan, Drehbuch, Sprechertext und – falls schon gerendert – das Video. Erklärung der Dateien in `LIESMICH.md` im Zip.

### Hochladen

- **YouTube Shorts:** die Datei `…-short.mp4` hochladen. Text steht oben, unten und rechts bleibt Platz für die YouTube-Knöpfe. Jingle ist drin; zusätzliche Musik am besten in YouTube hinzufügen (Lizenzen).
- **Seite:** MP4-Dateien nicht ins Git. Auf YouTube hochladen und wie bisher unter `content/videos/` eintragen.

## Einnahmen (standardmäßig aus)

Alle Bausteine sind in `hugo.toml` unter `[params.monetarisierung]` ausgeschaltet. Einschalten erst, wenn Impressum, Datenschutz und Partnerprogramm rechtlich geklärt sind.

| Baustein | Inhalt | Schalter |
| --- | --- | --- |
| Produktempfehlungen | `data/empfehlungen.yaml` (je Wissen-Kategorie, z. B. `schlaeger`) | `produkte = true` |
| Newsletter-Anmeldung über der Fußzeile | `newsletterText`; Formular-Adresse deines Anbieters in `newsletterAction` (mit Double-Opt-in) | `newsletter = true` |
| Premium-Hinweis auf der Lernpfad-Übersicht | `premiumTitel`, `premiumText`, optional `premiumLink` | `premium = true` |

Empfehlungen werden automatisch als „Anzeige“ gekennzeichnet, mit Hinweis auf die Provision und Links mit `rel="sponsored nofollow"`. `npm run check` prüft das mit einem Testprodukt, auch wenn der Schalter aus ist.
