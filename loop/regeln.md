# Regeln für den Content-Loop

Diese Datei ist die feste Grundlage jeder Runde. Änderungswünsche des Inhabers werden hier als neue Regel eingetragen und gelten ab der nächsten Runde.

## Ziel

bandeja. soll eine Padel-Lernseite werden, die der Inhaber selbst pflegen, später live nehmen und monetarisieren kann – mit erstklassiger UX, ohne JavaScript und mit automatisch geprüften Court-Grafiken und Animationen.

## Ablauf einer Runde

1. `loop/plan.md` lesen, Abbruchbedingung prüfen (siehe unten).
2. Den **ersten** offenen Punkt (`- [ ]`) nehmen. Nur diesen einen bearbeiten.
3. Umsetzen. Dabei alle Regeln hier einhalten.
4. `npm run check` ausführen. Fehler beheben, bis alles grün ist.
   - Nach drei gescheiterten Anläufen: Änderungen zurücknehmen, Punkt mit `- [!]` und einer kurzen Notiz markieren, zum nächsten Punkt.
   - Eine Prüfung nie abschwächen oder abschalten, nur damit sie besteht. Prüfungen werden nur strenger.
5. Punkt abhaken (`- [x]`), eine Zeile in `loop/log.md` ergänzen (Zeit UTC, Punkt, Ergebnis, offene Fragen).
6. Ein Commit pro Punkt, deutsche Commit-Nachricht, dann `git push -u origin claude/festive-darwin-y78gtf`.
7. Jede **vierte** erledigte Runde ist eine UX-Runde (siehe unten), bevor der nächste Punkt drankommt.

## Abbruch

- Laufzeit endet am in `loop/plan.md` eingetragenen **Ende**. Danach keinen neuen Punkt beginnen, die Schleife beenden und eine Zusammenfassung schreiben.
- Ebenso beenden, wenn kein offener Punkt mehr übrig ist.
- Fragen an den Inhaber nicht abwarten: Frage in `loop/log.md` notieren, sinnvolle Annahme treffen, weitermachen.

## Technik

- Hugo + Tailwind v4. Kein JavaScript im Frontend, keine externen Anfragen (Schriften selbst gehostet).
- Vorladen per Speculation Rules (JSON, wird nicht ausgeführt) und Seitenübergänge per CSS `@view-transition` sind erlaubt; Übergänge nur bei `prefers-reduced-motion: no-preference`, `view-transition-name` je Seite eindeutig. Links, die nicht vorgeladen werden sollen, bekommen `.ohne-vorladen`.
- Interaktion nur mit HTML/CSS (`:has()`, Radio/Checkbox, CSS-Counter, `<details>`).
- Jede neue Prüfung kommt als Datei in `scripts/checks/NN-name.mjs` (wird von `scripts/check.mjs` automatisch geladen), mit `export const name` und `export default async ({ root, pub, htmlFiles }) => ({ ok, errors, note })`.
- Neue npm-Pakete nur als devDependency und mit fester Version.
- Vorschau-Server: `npx hugo server --port 1313 --baseURL http://localhost:1313/` im Hintergrund; beenden mit `pkill -x hugo` (nie `pkill -f …`, das trifft die eigene Shell).

## Court-Geometrie (verbindlich)

Grafik-Box 440 × 230. Das Spielfeld ist das Rechteck x 10–430, y 10–220 → 20 × 10 m, also **21 px pro Meter**.

| Element | Regel | Pixel |
| --- | --- | --- |
| Netz | Mitte der Länge | x = 220 |
| Aufschlaglinien | 6,95 m vom Netz | x = 74 und x = 366 |
| Mittellinie | zwischen den Aufschlaglinien, Mitte der Breite | y = 115, x 74–366 |
| Aufschlagfelder | zwischen Netz und Aufschlaglinie, je Hälfte | z. B. x 220–366, y 10–115 |

Es gibt keine abweichenden Werte für Lektionen und Artikel.

## Regeln für Court-Grafiken (werden automatisch geprüft)

- Jede Grafik hat `cap` (Beschreibung für Screenreader) und `type` aus: `aufschlag`, `return`, `lob`, `bandeja`, `vibora`, `smash`, `volley`, `chiquita`, `stopp`, `schlag` (neutral), `rueckwand`, `ecke`, `bajada`, `contrapared`, `wand`, `aufstellung`, `bewegung`, `zielzonen`, `quiz`. Ein zweiter Ballweg kann mit `typ2` einen eigenen Typ haben.
- Ziel (`tx`, `ty`) ist der Aufprall. Ist es der Treffpunkt in der Luft oder nach der Wand, `treffpunkt: true` setzen.
- Alle Personen stehen im Feld oder höchstens 1 m dahinter (Spiel außerhalb des Courts ist Ausnahme und braucht `ausserhalb: true`).
- Du (`p`) und Partner (`q`) stehen auf einer Netzseite, die Gegner (`a`, `b`) auf der anderen. Keine Person auf der Netzlinie.
- Personen überlappen sich nicht (Mittelpunkte mind. 30 px auseinander), Beschriftungen überdecken keine Person.
- Ballweg (`ball`): Das Ziel (`tx`, `ty`) liegt auf dem Ballweg (± 4 px) und im Feld; der Weg darf danach weiterlaufen (z. B. Abprall aus dem Court). Bis zum Ziel kreuzt der Ball das Netz genau einmal und landet auf der Gegenseite des Schlagenden. Der Weg beginnt höchstens 40 px von einer Person (auch der früheren Position `g`) entfernt, sonst `von: p|q|a|b|g` setzen. Bewusst ohne Netz (Wand-Drills): `ohneNetz: true`.
- Zweiter Ballweg (`ball2`, z. B. Alternative): dieselben Regeln, Ziel ist der Endpunkt.
- Laufweg (`mv`): kreuzt nie das Netz und beginnt oder endet bei dir (`p`) bzw. deiner früheren Position (`g`). Ballwege nie als `mv` zeichnen.
- Pfade nur mit absoluten Befehlen M, L, Q, C. Kontrollpunkte dürfen außerhalb liegen, der gezeichnete Ballweg aber nie (in der Draufsicht wirkt das wie „Aus“; Ausnahme `ausserhalb: true`).
- Aufschlag: Aufschläger hinter der eigenen Aufschlaglinie, Ball diagonal, Aufprall im diagonal gegenüberliegenden Aufschlagfeld.
- Zielzonen liegen vollständig im Feld.
- Schlagtyp-Regeln (geprüft in `scripts/checks/40-court-regeln.mjs`, Selbsttest in `41-…`): Aufschlag hinter der eigenen Aufschlaglinie, diagonal, Aufprall im Aufschlagfeld. Return von hinten. Lob landet hinter der Aufschlaglinie bzw. geht mit `treffpunkt` über den vorderen Spieler. Bandeja/Vibora aus der Netzhälfte (bis 1 m hinter der Aufschlaglinie), Ziel tief; Smash aus der Netzhälfte. Chiquita von hinten, Chiquita/Stopp landen ≤ 3 m hinter dem Netz. Rückwand/Ecke/Bajada: Ballweg berührt die Rückwand (Ecke zusätzlich Seitenwand) beim Annehmenden, mit `treffpunkt`. Contrapared: gegen die eigene Rückwand.

## Animationen ohne JavaScript (werden automatisch geprüft)

- Nur CSS (`offset-path`, `@keyframes`) oder SVG-SMIL (`<animateMotion>`). Kein JS.
- Der Ball folgt genau dem gezeichneten Ballweg, Laufwege genau dem `mv`-Pfad.
- Animation nur unter `@media (prefers-reduced-motion: no-preference)`. Ohne Animation zeigt die Grafik den vollständigen Endzustand.
- Dauer 0,8–4 s pro Schritt, insgesamt höchstens 8 s, dann Pause/Wiederholung. Nichts blinkt öfter als 3× pro Sekunde.
- Plausible Zeiten: Geschwindigkeit je Schlagtyp in `court.html` (`$speed`, Zeitlupe), Flugzeit = Weglänge / Tempo; gemessen muss gelten Smash > Bandeja > Lob. Laufgeschwindigkeit ≤ 6 m/s (Vorgabe ~3 m/s).
- Reihenfolge: Schlägst du selbst, erst Ball, dann Lauf. Kommt der Ball vom Gegner, läufst du während des Flugs und kommst mit ihm an.
- Animiert wird nur mit „Anhalten/Weiter“-Steuerung in derselben `.court-scope` (WCAG 2.2.2); Grafiken ohne Steuerung (Startseite, Stufe, Quiz) bleiben statisch (`animate` nicht setzen).
- Geprüft in `scripts/checks/80-animationen.mjs`; animierte Wege werden geometrisch mit den gezeichneten verglichen (der Minifier schreibt Pfade relativ um).

## Inhalt

- Deutsch, du-Form, kurze Sätze, aktiv. Keine erfundenen Zahlen, Turnierergebnisse oder Zitate.
- Regeln nach den aktuellen offiziellen Padel-Regeln (FIP). Bei Unsicherheit: in `loop/log.md` als Frage notieren und Seite mit `draft: false`, aber `review: true` im Frontmatter kennzeichnen.
- Neue oder stark geänderte Seiten bekommen `review: true`, bis der Inhaber sie freigibt.
- Lektionen: 4–6 Kapitel, je Kapitel eine Court-Grafik, Quiz mit 4–5 Fragen (genau eine richtige Antwort), ein Drill.
- Drills: echte Seite unter `content/drills/` mit Sätzen, Bällen, Pause, Fokus, Schritten, „Was hat gehakt?“.

## Pflegbarkeit

- Inhalt in lesbarem YAML-Frontmatter oder Markdown, keine verschachtelten JSON-Blöcke.
- Feldnamen sprechend und überall gleich. Jede Inhaltsart hat eine Vorlage in `archetypes/`.
- Kurze Anleitung für den Inhaber in `PFLEGE.md`.

## Monetarisierung (vorbereiten, nicht einschalten)

- Bausteine für Produktempfehlungen (Affiliate, `rel="sponsored nofollow"`, sichtbar als „Werbung“ gekennzeichnet), Newsletter-Hinweis und Premium-Bereich – standardmäßig ausgeschaltet über `hugo.toml`.
- Keine Werbebanner, kein Tracking, keine Cookies.

## UX-Runde

- Screenshots aller in den letzten vier Runden geänderten Seitenarten bei 360, 768 und 1280 px (Playwright, Chromium ist vorinstalliert) in einem Scratch-Ordner, **nicht** ins Repo.
- Seiten selbst kritisch prüfen: Lesbarkeit, Abstände, Kontrast, Touch-Ziele ≥ 44 px, Fokus sichtbar, Hierarchie, Konsistenz.
- Gefundene Verbesserungen als neue Punkte oben in `loop/plan.md` (Abschnitt „UX“) eintragen, nicht in derselben Runde umsetzen.
- Ergebnis kurz in `loop/log.md`.
