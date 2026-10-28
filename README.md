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

## Login & Admin

- Alle Funktionen erfordern einen Login. User werden in SQLite gespeichert (`data/crispy.db`, im Docker-Volume `crispy-data`).
- Der erste Admin wird beim Start aus `ADMIN_EMAIL` / `ADMIN_PASSWORD` angelegt, falls noch keiner existiert.
- Registrierung nur mit Invite-Code. Admins erstellen Codes im **Admin**-Bereich (Button oben rechts) und verschicken den Einladungslink (`/?invite=CODE`).
- Im Admin-Bereich: User sperren/entsperren, zum Admin machen, Passwort zurücksetzen, löschen.
- `JWT_SECRET` muss in Production gesetzt sein.

## API

Authentifizierung mit demselben Token wie im Web-UI (`Authorization: Bearer <token>`).

| Methode | Pfad | Beschreibung |
|---|---|---|
| `POST` | `/api/auth/login` | `{ email, password }` → `{ token, user }` |
| `POST` | `/api/v1/jobs` | multipart: `video` (MP4/MOV) + optional `style` (JSON) → `202 { jobId, statusUrl }` |
| `GET` | `/api/v1/jobs/:id` | `{ status, progress, error?, downloadUrl? }`, Status: `queued` → `transcribing` → `rendering` → `done` / `error` |
| `GET` | `/api/v1/jobs/:id/download` | fertiges MP4 (einmalig, danach gelöscht → Status `downloaded`) |
| `GET` | `/api/v1/jobs` | eigene Jobs (max. 100) |

`style`-Felder (alle optional): `highlightColor`, `dimColor` (`#RRGGBB`), `outlineColor` (`#RRGGBB` oder `none`), `fontName`, `fontSize` (12–200, Pixel bezogen auf ein 1080p-Video, wird mit der Auflösung skaliert), `positionY` (0–100, Unterkante der Textzeile in % der Videohöhe; alternativ `position`: `top`/`center`/`bottom`), `wordsPerLine` (1–15).

```bash
TOKEN=$(curl -s -X POST localhost:3001/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"a@b.de","password":"..."}' | jq -r .token)
curl -X POST localhost:3001/api/v1/jobs -H "Authorization: Bearer $TOKEN" \
  -F video=@clip.mp4 -F 'style={"highlightColor":"#26E200","positionY":85}'
curl localhost:3001/api/v1/jobs/<jobId> -H "Authorization: Bearer $TOKEN"
curl -o out.mp4 localhost:3001/api/v1/jobs/<jobId>/download -H "Authorization: Bearer $TOKEN"
```

Gleichzeitige Renders (Web-UI und API zusammen) sind auf `MAX_CONCURRENT_RENDERS` (Default 2) begrenzt, weitere warten in der Queue. Jobs gehen bei einem Server-Neustart verloren.

Limits:
- `MAX_TRANSCRIPTIONS_PER_DAY` (Default 30): Transkriptionen pro User in 24 Stunden, Admins ausgenommen, `0` = unbegrenzt. Bei Überschreitung antwortet der Server mit `429`.
- Login: max. 10 Fehlversuche pro IP in 15 Minuten. Registrierung: max. 10 Versuche pro IP und Stunde.
- `TRUST_PROXY`: Anzahl Reverse-Proxies vor dem Server, damit das Rate-Limiting die echte Client-IP sieht (in `docker-compose.yml` Default `1`).

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
