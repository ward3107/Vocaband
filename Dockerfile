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

# Make /app owned by the unprivileged `node` user (UID 1000, baked into
# node:*-alpine) so the runtime can read its own files after the USER
# switch below.
RUN chown -R node:node /app

# Layer the dep install so a code-only change doesn't bust the cache.
# `--legacy-peer-deps` works around a peer-dep conflict between
# @eslint/js@10 (peerOptional eslint^10) and the project's eslint@9.
# `--include=dev` forces devDependencies to install regardless of any
# ambient NODE_ENV=production set by Fly's builder — tsx is in devDeps
# and the start script needs it at runtime.
COPY --chown=node:node package*.json ./
RUN npm ci --legacy-peer-deps --include=dev

COPY --chown=node:node . .

ENV NODE_ENV=production
EXPOSE 3000

# Drop root before runtime — defence-in-depth against container escape.
# Multi-stage build was tried previously and reverted (tsx lives in
# devDependencies; the start script needs it at runtime, and `npm prune`
# stripped it).  USER node alone gives us the privilege drop without
# fighting tsx's location.
USER node

CMD ["npm", "run", "start"]
