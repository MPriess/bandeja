---
# Neuer Wissensartikel. Anlegen: npx hugo new content wissen/<kategorie>/<kuerzel>.md
# Erst mit `draft: false` erscheint er auf der Seite. `review: true` heißt: fachlich noch nicht gegengelesen.
title: "{{ replace .File.ContentBaseName "-" " " | title }}"
description: Ein bis zwei Sätze, worum es geht. Steht als Einleitung oben und in Suchmaschinen.
slug: "{{ .File.ContentBaseName }}"
id: XX
weight: 999
draft: true
review: true
# Court-Grafik (optional). Koordinaten 440 × 230, Netz bei x 220, Aufschlaglinien bei x 74 und 366.
# `type` bestimmt die Padel-Regeln, die `npm run check` prüft (Liste in loop/regeln.md).
diag:
  type: aufstellung
  cap: Beschreibung der Grafik in einem Satz (wird auch vorgelesen).
  px: 268
  py: 70
  qx: 268
  qy: 160
  ax: 60
  ay: 70
  bx: 60
  by: 160
sections:
  - h: Zwischenüberschrift
    p: Ein Absatz Text.
steps:
  - Erster Schritt.
  - Zweiter Schritt.
mistake: Der typische Fehler und wie es besser geht.
facts:
  - k: Stichwort
    v: Kurze Antwort
tips:
  - Ein Merksatz.
---
