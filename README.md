# Animated Subtitles Generator

Ein Web-Tool zum Hochladen von Shortform-Videos, das automatisch animierte Untertitel im TikTok/Reels-Stil generiert und einbettet.

## Features

- Video-Upload (MP4, MOV)
- Automatische Transkription via **Whisper API** (OpenAI)
- Animierte Untertitel (Wort-für-Wort Highlight, Bold, farbige Akzente)
- Stil-Auswahl (Farbe, Schriftart, Position)
- Video-Download mit eingebetteten Untertiteln

## Tech Stack

- **Frontend:** React + Tailwind CSS
- **Backend:** Node.js + Express
- **Transkription:** OpenAI Whisper API
- **Video-Processing:** FFmpeg (Untertitel einbetten & rendern)
- **Untertitel-Format:** ASS (Advanced SubStation Alpha) für Animationen

## Projektstruktur

```
/
├── frontend/          # React App
│   └── src/
│       ├── App.jsx
│       └── components/
├── backend/           # Express API
│   ├── server.js
│   ├── routes/
│   │   ├── upload.js      # Video-Upload Handler
│   │   ├── transcribe.js  # Whisper API Integration
│   │   └── render.js      # FFmpeg Rendering
│   └── utils/
│       └── assGenerator.js  # ASS-Subtitle Animationen
├── uploads/           # Temporäre Video-Dateien
└── outputs/           # Fertige Videos
```

## Setup

```bash
# Dependencies installieren
npm install        # Backend
cd frontend && npm install

# .env anlegen
OPENAI_API_KEY=sk-...

# FFmpeg installieren (macOS)
brew install ffmpeg

# Starten
npm run dev
```

## Workflow

1. User lädt Video hoch → gespeichert in `/uploads`
2. Backend schickt Audio an Whisper API → bekommt Wort-Timestamps zurück
3. `assGenerator.js` erstellt `.ass`-Datei mit Animationen pro Wort
4. FFmpeg brennt Untertitel ins Video ein
5. Fertiges Video wird zum Download bereitgestellt

## ASS Subtitle Animations (Kern-Feature)

Die `.ass`-Datei definiert pro Wort:
- **Highlight-Farbe** beim aktiven Wort (z.B. Gelb/Grün)
- **Scale-Animation** (`\t(\fscx120\fscy120)`) für "Pop"-Effekt
- **Bold + Uppercase** für alle Wörter
- Position zentriert unten im Frame

## TODO / Erweiterungen

- [ ] Stil-Editor im Frontend (Farben, Fonts, Größe)
- [ ] Vorschau im Browser vor dem Render
- [ ] Mehrsprachige Transkription
- [ ] Preset-Styles (TikTok, Reels, YouTube Shorts)
