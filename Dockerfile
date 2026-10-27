# Stage 1: Frontend bauen
FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Kein VITE_API_URL → relative URLs (gleiches Origin in Production)
RUN npm run build

# Stage 2: Backend-Dependencies bauen (better-sqlite3 kompiliert per node-gyp → braucht python3, make, g++)
FROM node:22-slim AS backend-deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 3: Production-Image (better-sqlite3 braucht Node >= 22)
FROM node:22-slim
WORKDIR /app

# Systembibliotheken: fontconfig wird von libass (im FFmpeg-Binary) für Font-Discovery benötigt
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Backend-Dependencies (nur Production, in Stage 2 gebaut)
COPY package*.json ./
COPY --from=backend-deps /app/node_modules ./node_modules

# Backend-Quellcode + Font
COPY backend/ ./backend/
COPY THEBOLDFONT-FREEVERSION.ttf ./

# Gebautes Frontend aus Stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Verzeichnisse anlegen
RUN mkdir -p uploads outputs data

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "backend/server.js"]
