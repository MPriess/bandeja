---
# Neues Lernvideo. Anlegen: npx hugo new content videos/<name>.md
# Vorher Drehbuch clips/<name>.yaml anlegen und rendern: npm run videos:web -- <name>
title: "Der Schlag"
description: Ein Satz, was das Video zeigt.
weight: 10
# Thema aus content/videos/_index.md: aufschlag-return, grundschlaege, ueberkopf, wand
thema: grundschlaege
# Länge (m:ss), muss zur Datei passen – steht in der Ausgabe von npm run videos:web
dauer: "0:20"
datei: media/animationen/<name>.mp4
poster: media/animationen/<name>.jpg
# Zugehörige Lektion – oder stattdessen wissen: /wissen/<kategorie>/<seite>
lektion: /lektionen/bandeja
draft: true
review: true
situation: Ein bis zwei Sätze – was passiert auf dem Court?
achte: [Erster Punkt, Zweiter Punkt]
---
