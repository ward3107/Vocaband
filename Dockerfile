# Vocaband API server — Docker image for Fly.io
#
# Single-stage build: keeps tsx (which lives in devDependencies and
# the start script needs at runtime).  The earlier multi-stage version
# Fly's Launch wizard generated tried to `npm prune --omit=dev`, which
# stripped tsx and made the container crash-loop with `tsx: not found`.
#
# The frontend is NOT built here — Cloudflare Pages serves the SPA at
# vocaband.com.  Fly only hosts /api/* + /socket.io/* (Express +
# socket.io from server.ts).
#
# Build: `fly deploy` (Fly's builder runs this automatically)
# Run:   `npm run start`  (= `NODE_ENV=production tsx server.ts`)

FROM node:22-alpine

WORKDIR /app

# Layer the dep install so a code-only change doesn't bust the cache.
# `--legacy-peer-deps` works around a peer-dep conflict between
# @eslint/js@10 (peerOptional eslint^10) and the project's eslint@9.
# `--include=dev` forces devDependencies to install regardless of any
# ambient NODE_ENV=production set by Fly's builder — tsx is in devDeps
# and the start script needs it at runtime.
COPY package*.json ./
RUN npm ci --legacy-peer-deps --include=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "start"]
