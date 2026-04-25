# Vocaband API server — Docker image for Fly.io
#
# Single-stage build: keeps `tsx` (which lives in devDependencies and
# the `start` script needs at runtime) instead of a more elaborate
# build → prune → run dance.  ~200–300 MB image, fine for Fly's free
# Hobby plan.
#
# The frontend is NOT built here — Cloudflare Pages already builds it
# from the same git repo and serves it at vocaband.com.  Fly only
# hosts /api/* + /socket.io/* (the Express + socket.io part of
# server.ts).  The static() fallback in server.ts will 404 if
# Cloudflare ever proxies a non-API request to Fly, which is
# acceptable behaviour.
#
# Build: `fly deploy` (Fly's builder runs this automatically)
# Run:   `npm run start`  (= `NODE_ENV=production tsx server.ts`)

FROM node:20-alpine

WORKDIR /app

# Layer the dep install so a code-only change doesn't bust the cache.
COPY package*.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "start"]
