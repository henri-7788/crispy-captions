# Stage 1: Frontend bauen
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Kein VITE_API_URL → relative URLs (gleiches Origin in Production)
RUN npm run build

# Stage 2: Production-Image
FROM node:20-slim
WORKDIR /app

# Systembibliotheken: fontconfig wird von libass (im FFmpeg-Binary) für Font-Discovery benötigt
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Backend-Dependencies (nur Production)
COPY package*.json ./
RUN npm install --omit=dev

# Backend-Quellcode + Font
COPY backend/ ./backend/
COPY THEBOLDFONT-FREEVERSION.ttf ./

# Gebautes Frontend aus Stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Verzeichnisse anlegen
RUN mkdir -p uploads outputs

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "backend/server.js"]
