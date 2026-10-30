# Plan

**Start:** 2026-10-30T00:50Z  
**Ende:** 2026-10-30T08:50Z (8 Stunden)

Regeln: `loop/regeln.md`. Immer den ersten offenen Punkt nehmen. `- [ ]` offen · `- [x]` erledigt · `- [!]` gescheitert (Notiz in `loop/log.md`).

## UX

(Hier trägt die UX-Runde neue Punkte ein. Sie haben Vorrang vor den Abschnitten darunter.)

- [x] Quiz: Ergebnis erst zeigen, wenn alle Fragen beantwortet sind (CSS `:has()`), vorher Hinweis „Noch X Fragen offen“ statt „0/4 richtig“. Textfehler „die Die Bandeja“ beheben.
- [x] Quiz-Antworten ohne doppelten Buchstaben („A – Mitte …“ neben dem Buchstaben-Kästchen A); Prüfung, dass Antworttexte nicht mit „A –“ usw. beginnen.
- [x] Court-Legende passt nicht zur Grafik: „Du“ ist in der Grafik ein gefüllter Kreis, in der Legende ein Ring; Partner fehlt in der Lektions-Legende. Legende aus denselben Formen wie `court.html` erzeugen.
- [x] Court-Grafik auf dem Handy größer: weniger Innenabstand um den Court (Wissen, Quiz), Markierungen und Legende gut lesbar bei 360 px.
- [x] Kopfzeile auf dem Handy kompakter (Navigation zweizeilig plus Button nimmt viel Platz ein), z. B. Navigation als horizontale Leiste.
- [x] Lektion auf dem Handy: Ansichts-Umschalter bricht um („Court-/Ansicht“) – kürzere Beschriftung („Court“ / „Ablauf“); Legende unter den Court statt darüber (3 Zeilen über der Grafik).
- [x] Kapitel-Blättern auf dem Handy: beide Buttons volle Breite, „Nächstes Kapitel“ zuerst (Hauptaktion oben), am Desktop wie bisher nebeneinander.
- [x] Wissen-Artikel: Seitenliste der Kategorie (bis zu 23 Einträge) unterhalb von 1024 px einklappbar (`<details>`, aktuelle Seite sichtbar); „Auf einen Blick“ vor die Seitenliste.
- [x] Lernpfad/Stufe auf dem Handy: App-Seitenleiste füllt den ganzen ersten Bildschirm, Inhalt beginnt erst darunter. Unter 1024 px kompakte Kopfzeile wie `site-header` (Stufen-Check-Kasten ans Ende der Seite); Stufen-Umschalter einzeilig. Prüfung: Überschrift der Stufe bei 360 px im ersten Bildschirm.
- [x] Lektionszeilen im Lernpfad auf dem Handy: Typ („Wissen“/„Lektion“) unter den Titel statt eigener Spalte, Titel nicht mehr dreizeilig; Zeilenkopf „Lektionen in Stufe 3 / 7 Lektionen“ ohne Umbruch.
- [x] Drill: Fortschrittsring um „3 × 10“ ist fest zu ~60 % gefüllt und täuscht Fortschritt vor. Ring als vollen, neutralen Kreis zeichnen oder per CSS-Zähler/`:has()` an die Treffer koppeln (ohne JS); Prüfung, dass der Ring ohne Treffer leer ist.
- [x] Ballwege verlassen in der Draufsicht den Court (t07: Lob-Bogen 6 px über die Seitenlinie – wirkt wie „Aus“). Bogen ins Feld legen; Court-Regel: alle Punkte eines Ballwegs liegen im Feld (Wandkontakt erlaubt).
- [x] Drill am Desktop: einspaltige Handy-Ansicht wirkt verloren auf 1280 px. Ab 1024 px zweispaltig (links Ablauf und Fokus, rechts Ring, Zähler und „Was hat gehakt?“), auf dem Handy unverändert.
- [ ] Kopfzeile und Inhalt fluchten nicht: bei 1280 px steht das Logo 24 px weiter rechts als der Seiteninhalt (Innenabstand in `site-header` innerhalb der Max-Breite, im Inhalt außerhalb). Einheitlich lösen; Prüfung: linke Kante von Logo und `<h1>` gleich (± 1 px) auf Wissen-Seiten bei 1280 px.

## 1 · Fundament: Prüfungen

- [x] Prüfung „Seitenstruktur“: jede HTML-Seite hat genau eine `<h1>`, `lang`, `<title>`, Meta-Description, keine doppelten IDs. Bestehende Verstöße beheben (Quiz-Seite ohne `<h1>`).
- [x] Court-Daten zentral lesbar machen: Skript, das alle Grafiken aus dem Content sammelt (Wissen `diag`, Lektion `court`, Quiz `court`) inkl. Datei und Pfad im Frontmatter.
- [x] Prüfung „Court-Geometrie“: Aufschlaglinie überall x = 74/366 (Lektionen nutzen fälschlich 81 → Partial `court.html` korrigieren, Parameter `service` entfernen).
- [x] Prüfung „Court-Regeln“ nach `loop/regeln.md` (Personen, Netzseiten, Abstände, Ballweg-Endpunkt = Ziel, Netz einmal gekreuzt, Zielzonen im Feld). Bestehende Grafiken korrigieren, bis alles besteht.
- [x] Feld `type` für alle Grafiken einführen und vergeben; Schlagtyp-Regeln (Aufschlag, Lob, Bandeja/Vibora/Smash, Chiquita) in die Court-Prüfung aufnehmen.
- [x] Prüfung „Barrierefreiheit“ mit axe (Playwright) für je eine Seite jeder Seitenart; Verstöße beheben.
- [x] Prüfung „Layout“: kein horizontales Überlaufen bei 360, 768, 1280 px; Touch-Ziele ≥ 44 px.

## 2 · Animationen ohne JS

- [ ] Ballflug-Animation im Partial `court.html` (CSS `offset-path` entlang `ball`), nur bei `prefers-reduced-motion: no-preference`, Endzustand ohne Animation vollständig.
- [ ] Laufweg-Animation entlang `mv` und Reihenfolge Ball → Bewegung; Stopp/Wiederholen-Steuerung ohne JS.
- [ ] Prüfung „Animationen“: Pfad identisch mit gezeichnetem Weg, Dauer-Grenzen, Reduced-Motion-Schutz, Lauftempo ≤ 6 m/s, Ballgeschwindigkeit nach Schlagtyp plausibel.

## 3 · Pflegbarkeit

- [ ] Wissen-Artikel von JSON auf YAML-Frontmatter umstellen (Skript, Inhalt unverändert; Build-Ausgabe vorher/nachher vergleichen).
- [ ] Fest eingebaute Bandeja-Texte entfernen: Quiz-Ergebnistext aus `quiz.md` (`bestanden_ab`, `hinweis`), Probelektion im Lernpfad aus `content/lernpfad/_index.md`.
- [ ] `archetypes/` für Lektion, Kapitel, Quiz, Drill, Wissensartikel; `PFLEGE.md` mit Anleitung zum Anlegen und Prüfen.
- [ ] 404-Seite im Stil der Seite.
- [ ] Prüfung „Pflichtfelder“ je Inhaltsart (z. B. Quiz: genau ein `right` im Bereich; Drill: `sets`, `balls`, `pause`, `steps`).

## 4 · Inhalte

- [ ] Lektion „Der Aufschlag“ (Stufe 1) mit Kapiteln, Quiz, animierten Grafiken.
- [ ] Drill zum Aufschlag; Stufe 1 auf Lektion und Drill verweisen lassen.
- [ ] Lektion „Spiel mit der Rückwand“ (Stufe 2).
- [ ] Drill zur Rückwand; Stufe 2 verlinken.
- [ ] Bandeja-Lektion: Grafiken mit `type` und Animation überarbeiten, Inhalte gegenlesen.
- [ ] Lektion „Die Vibora“ (Stufe 3).
- [ ] Drill zur Vibora; Stufe 3 verlinken.
- [ ] Lektion „Der Smash“ (Stufe 4).
- [ ] Drill zum Smash; Stufe 4 verlinken.
- [ ] Lektion „Volley“ (Stufe 2).
- [ ] Lektion „Chiquita“ (Stufe 4).
- [ ] Wissensartikel mit Grafik: fehlende Animationen nachrüsten (in Blöcken zu 6 Artikeln).

## 5 · Live-Vorbereitung und Monetarisierung (ohne Hosting)

- [ ] SEO-Grundlagen: Canonical, Open-Graph-Tags, Vorschaubild (SVG→PNG beim Build oder statisch), strukturierte Daten für Kurs/Artikel; Prüfung dafür.
- [ ] Schriftpfade relativ zur `baseURL`, damit die Seite auch in einem Unterordner läuft.
- [ ] Baustein Produktempfehlung (Affiliate, gekennzeichnet, per `hugo.toml` abschaltbar, standardmäßig aus).
- [ ] Baustein Newsletter-Hinweis und Premium-Platzhalter (standardmäßig aus).
- [ ] Performance-Budget-Prüfung: CSS ≤ 40 kB, Seiten-HTML ≤ 60 kB, keine Bilder > 200 kB.
