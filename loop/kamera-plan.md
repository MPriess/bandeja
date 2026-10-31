# Plan: Court-Kameras

Ziel: Ein Baustein, der eine Spielsituation **einmal** beschreibt und sie aus mehreren Blickwinkeln zeigt – von oben (wie heute), aus der TV-Perspektive hinter der Rückwand, von der Seite, schräg von oben und aus Spielersicht.

Regeln: `loop/regeln.md`. `- [ ]` offen · `- [x]` erledigt · `- [!]` gescheitert (Notiz in `loop/log.md`).

## Leitplanken

- **Kein JavaScript.** Die Projektion rechnet Hugo beim Bauen aus; im Browser landet fertiges SVG. Umschalten der Kamera mit Radio-Buttons und `:has()`, wie heute „Court / Ablauf“.
- **Bestehende Grafiken bleiben gleich.** Die Kamera `oben` erzeugt dasselbe SVG wie `court.html` heute (440 × 230, 21 px = 1 m). Alle bisherigen Prüfungen laufen unverändert weiter.
- **Inhalte ändern sich nicht.** Die vorhandenen Felder (`px`, `ball`, `mv`, `zx` …) reichen. Neue Felder sind optional: Welche Kameras gezeigt werden und – falls nötig – die Höhe des Balls.
- **Eine Szene, viele Kameras.** Intern gibt es ein Modell in Metern (x entlang des Courts, y quer, z Höhe). Jede Kamera ist nur eine Projektion dieses Modells.

## Architektur

```
content (court: …)  ──►  fn/szene.html      2D-Felder → Szene in Metern (Personen, Ball mit Höhe, Zonen)
                          data/kameras.yaml  Kameras: Position, Blickpunkt, Brennweite, Bildformat
                          fn/projektion.html Punkt (x, y, z) → (u, v, Tiefe) für eine Kamera
                     ──►  court-kamera.html  zeichnet Boden, Linien, Netz, Wände, Personen, Ball
                     ──►  court-ansichten.html  Umschalter + eine court-kamera je gewählter Kamera
```

| Teil | Aufgabe |
| --- | --- |
| `data/court.yaml` | Maße nach FIP: 20 × 10 m, Aufschlaglinie 6,95 m vom Netz, Netz 0,88 m (Mitte) / 0,92 m (Pfosten), Rückwand 3 m Glas + 1 m Gitter, Seitenwand 2 m Glas (3 m hoch) + Gitter. Gleiche Werte wie `scripts/lib/padel.mjs`. |
| `data/kameras.yaml` | Voreinstellungen (siehe unten). Neue Kamera = neuer Eintrag, kein Template-Code. |
| `fn/projektion.html` | Lochkamera: Blickrichtung aus Position und Ziel (look-at), Punkt in Kamerakoordinaten, Perspektivteilung, Skalierung auf die viewBox. `oben` ist eine orthografische Sonderform, damit die heutige Grafik exakt herauskommt. |
| `fn/szene.html` | Rechnet px → m, legt die Ballhöhe fest (siehe unten), tastet Kurven (`Q`, `C`) in Punktlisten ab – eine perspektivisch verzerrte Bézierkurve ist keine Bézierkurve mehr. |
| `court-kamera.html` | Zeichnet alles von hinten nach vorn (nach Tiefe sortiert), damit Näheres verdeckt Ferneres. Gleiche Rollen (`data-r`) und Farben wie heute. |
| `court-ansichten.html` | Radiogruppe „Oben / TV / Seite / …“, darunter die SVGs; nur das gewählte ist sichtbar. Legende und Pause-Knopf gelten für alle. |

### Kameras (Voreinstellung)

| Name | Blick | Wofür |
| --- | --- | --- |
| `oben` | senkrecht von oben, orthografisch | Positionen, Laufwege, Zonen (heutige Grafik) |
| `tv` | hinter der eigenen Rückwand, ca. 6 m hoch, Blick zum Netz | Übersicht wie im Fernsehen, Lob-Höhe sichtbar |
| `seite` | Tribüne an der Seitenwand, ca. 4 m hoch | Ballkurven über dem Netz, Höhe von Lob und Smash |
| `schraeg` | Ecke, ca. 45° von oben | Wände und Ecken (Rückwand, Bajada, Contrapared) |
| `spieler` | Augenhöhe 1,70 m an der Position von „Du“ | „So siehst du es auf dem Platz“, z. B. beim Lob über dich |

### Personen

- `oben`: Kreise wie heute.
- Andere Kameras: einfache stehende Figur (Kopf + Körper, 1,80 m hoch, immer zur Kamera gedreht) mit Schatten auf dem Boden. Füllung und Rand nach Rolle wie heute (Du gefüllt, Partner blasser, Gegner gestrichelt, Vorher als Umriss).
- Größe ergibt sich aus der Tiefe – weiter hinten = kleiner.

### Ballhöhe

Die Inhalte kennen den Ballweg nur von oben. Die Höhe kommt aus dem Schlagtyp (`type`), überschreibbar mit einem optionalen Feld:

| Typ | Höhenverlauf (Start → Scheitel → Ende) |
| --- | --- |
| `lob` | 1 m → 6–7 m → 0 m (Aufprall) bzw. Treffpunkt bei `treffpunkt: true` |
| `bandeja`, `vibora` | 2,6 m → fallend → 0 m |
| `smash` | 3 m → steil fallend → 0 m |
| `chiquita` | 0,6 m → knapp über Netz (≈ 1,1 m) → 0 m |
| sonst | 1 m → 1,5 m über dem Netz → 0 m |

Optional: `hoehe: [1, 6.5, 0]` im Frontmatter. Prüfung: Ball über dem Netz höher als 0,88 m, nie unter dem Boden, Lob-Scheitel ≥ 4 m.

### Animation

Wie heute mit `offset-path`, aber auf dem projizierten Weg (Polylinie aus ~32 Punkten). Zeiten, Reihenfolge und Pause-Knopf übernimmt `court-kamera.html` aus der bestehenden Logik in `court.html` (in ein eigenes Partial auslagern, damit beide dieselben Zeiten nutzen). Der Ball wird in Perspektiven zusätzlich kleiner, je weiter er weg ist, und wirft einen Schatten auf den Boden – so liest man die Höhe.

### Nutzung im Content

```yaml
court: { type: lob, kameras: [oben, tv, seite], ball: "M 130 70 Q 230 0 318 66", … }
```

Ohne `kameras` bleibt alles wie heute. Ein Kanal-Eintrag in `hugo.toml` (`params.kameras.standard`) kann später festlegen, welche Kameras überall zusätzlich angeboten werden.

## Schritte

### 1 · Modell und Projektion

- [ ] `data/court.yaml` mit den FIP-Maßen; Prüfung, dass die Werte zu `scripts/lib/padel.mjs` passen.
- [ ] `scripts/lib/kamera.mjs`: dieselbe Projektion in JavaScript (nur für die Prüfungen) mit Selbsttest: bekannte Punkte → erwartete Bildpunkte.
- [ ] `fn/projektion.html` in Hugo; Prüfung: Hugo und `kamera.mjs` liefern für alle Kameras dieselben Eckpunkte (± 0,5 px).
- [ ] `data/kameras.yaml` mit den fünf Kameras.

### 2 · Leerer Court aus jeder Kamera

- [ ] `court-kamera.html`: Boden, Linien, Netz mit Pfosten, Glaswände (halbdurchsichtig), Gitter angedeutet.
- [ ] Musterseite `/kameras/` (Entwurf, nicht im Menü): jede Kamera einmal, zum Anschauen.
- [ ] `oben` liefert dasselbe SVG wie `court.html` – Prüfung vergleicht beide für alle vorhandenen Grafiken.

### 3 · Szene: Personen, Ball, Zonen

- [ ] `fn/szene.html`: px → m, Kurven abtasten, Ballhöhe nach Typ.
- [ ] Personen als Figuren mit Schatten, nach Tiefe sortiert; Rollen und `data-r` wie heute.
- [ ] Ballweg mit Höhe, Schatten auf dem Boden, Ziel und Ring; Zielzonen auf den Boden projiziert; Laufweg auf dem Boden.
- [ ] Musterseite um drei echte Grafiken erweitern (Lob, Bandeja, Rückwand).

### 4 · Animation

- [ ] Zeitberechnung aus `court.html` in ein gemeinsames Partial auslagern (Ausgabe von `court.html` bleibt byte-gleich).
- [ ] Ball und Laufweg in allen Kameras animiert, gleiche Zeiten wie von oben.
- [ ] `80-animationen.mjs` auf projizierte Wege erweitern (Pfad = gezeichneter Weg, Reduced Motion, Pause).

### 5 · Umschalter und Einbau

- [ ] `court-ansichten.html`: Radiogruppe ohne JS, nur gewählte Kamera sichtbar, Tastatur bedienbar, Beschriftung auf dem Handy kurz.
- [ ] Legende: Figur statt Kreis, wenn eine Perspektive aktiv ist; `45-legende.mjs` anpassen.
- [ ] Einbau in Lektion, Wissen und Schnellstart, wenn `kameras` gesetzt ist; Ansicht „Ablauf“ in der Lektion bleibt.
- [ ] Erste Inhalte: Lob, Bandeja, Smash, Rückwand mit `kameras: [oben, tv, seite]`.

### 6 · Prüfungen und Doku

- [ ] Neue Prüfung „Court-Kameras“: alles liegt in der viewBox, Tiefenreihenfolge stimmt, Ball über dem Netz höher als 0,88 m, keine Person steht in einer Wand.
- [ ] Handy-Prüfung bei 360 px: Figuren und Ball noch erkennbar, Umschalter bricht nicht um.
- [ ] Barrierefreiheit: `aria-label` nennt die Perspektive („Lob, Blick von der Seite“).
- [ ] Performance: Größe pro Lektion mit drei Kameras im Budget (`95-performance.mjs`).
- [ ] `PFLEGE.md`: Abschnitt „Kameras“ (Feld `kameras`, `hoehe`, neue Kamera in `data/kameras.yaml` anlegen).

## Risiken

| Risiko | Gegenmaßnahme |
| --- | --- |
| Matrixrechnung in Hugo-Templates ist umständlich und langsam | Basisvektoren je Kamera einmal pro Seite berechnen; Kurven mit fester Punktzahl; Bauzeit vorher/nachher messen. Notfalls Kamerawerte vorab mit `kamera.mjs` nach `data/` schreiben. |
| HTML wird mit mehreren SVGs je Grafik größer | Kameras nur auf Wunsch (`kameras`), gemeinsame Formen per `<symbol>`/`<use>`. |
| Ballhöhe aus dem Typ wirkt in Einzelfällen falsch | Feld `hoehe` zum Überschreiben; Prüfung mit Regeln je Typ. |
| Spielersicht verdeckt viel (Netz, Partner) | Spielerkamera leicht erhöht und hinter „Du“ statt exakt im Kopf. |

## Offene Fragen

1. Welche Kameras sind wirklich gewünscht – alle fünf oder zunächst `oben`, `tv`, `seite`?
2. Figuren schlicht (Kopf + Körper) oder mit angedeutetem Schläger und Blickrichtung?
3. Bleibt es bei „kein JavaScript“? (Empfehlung: ja. Frei drehbare Kamera ginge nur mit JS, z. B. three.js.)
