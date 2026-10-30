---
# Neue Lektion. Anlegen: npx hugo new content --kind lektion lektionen/<name>
# Dann in content/lernpfad/stufe-N/_index.md unter `lessons` eintragen.
title: "{{ replace .File.ContentBaseName "-" " " | title }}"
description: Ein Satz, was man in dieser Lektion lernt.
stufe: 1
stufeName: Einstieg
drill: /drills/bandeja-an-die-seitenwand
# Grafik auf Vorschau-Karten (optional, sonst das erste Kapitel mit Ballweg)
# vorschau: { type: aufstellung, cap: "…", px: 268, py: 80 }
draft: true
review: true
build:
  render: never
  list: always
# Bewegungsablauf: drei Phasen, gezeigt in der zweiten Ansicht jedes Kapitels.
phases:
  - title: Vorbereitung
    items: [Punkt eins, Punkt zwei]
  - title: Treffen
    items: [Punkt eins, Punkt zwei]
  - title: Ausschwingen
    items: [Punkt eins, Punkt zwei]
---
