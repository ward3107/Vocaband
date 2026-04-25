# Render → Fly.io migration

Why: Render hit its pipeline-minutes spend cap on 2026-04-25 and
the API stopped redeploying.  Fly.io has no per-build-minute meter
and an `auto_stop_machines = "stop"` mode that suspends the VM when
nobody's connected — at school-hours-only traffic that drops the
real-world cost from $7+/month to roughly $0–2/month.

What moves: the Express + socket.io server (`server.ts`).
What stays put: the SPA (Cloudflare Pages), the database (Supabase),
the workflow CI (GitHub Actions).

The whole migration is ~30 minutes one-time and you can keep Render
running in parallel as a fallback for as long as you want.

---

## Step 1 — Install the Fly CLI (Windows PowerShell)

```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

Reopen PowerShell so the new PATH takes effect.  Verify:

```powershell
fly version
```

(Mac/Linux: `curl -L https://fly.io/install.sh | sh`)

## Step 2 — Sign up + log in

```powershell
fly auth signup        # opens browser, GitHub login is fastest
# OR if you already have an account:
fly auth login
```

Add a credit card under Billing — Fly requires one but the Hobby
plan won't charge you anything for typical school-hours traffic.

## Step 3 — Launch the app

From the repo root (where `fly.toml` and `Dockerfile` live):

```powershell
fly launch --no-deploy
```

When prompted:

| Prompt | Answer |
|---|---|
| "Existing fly.toml — copy?" | **Y** |
| "App name" | `vocaband-api` (or anything; matches `app = …` in fly.toml) |
| "Region" | `fra` (Frankfurt — closest free region to Israel) |
| "Postgres / Redis" | **No** to both |
| "Deploy now?" | **No** — we still need secrets |

If the prompted app name differs from `vocaband-api`, the launcher
writes the name into `fly.toml` automatically.  Just commit that
change.

## Step 4 — Set the secrets

These are the same env vars Render had — the service-role key, the
Google AI key, the Anthropic key, and the Supabase URL.

```powershell
fly secrets set `
  SUPABASE_URL="https://auth.vocaband.com" `
  SUPABASE_SERVICE_ROLE_KEY="<paste from Supabase Dashboard → Settings → API → service_role>" `
  GOOGLE_AI_API_KEY="<paste from Render env var of the same name>" `
  ANTHROPIC_API_KEY="<paste from Render env var of the same name>"
```

Verify with `fly secrets list` — should show all four names (values
are hidden once set).

## Step 5 — Deploy

```powershell
fly deploy
```

Takes ~3–5 minutes.  Watch the build logs.  When it finishes you'll
see something like:

```
Visit your newly deployed app at https://vocaband-api.fly.dev/
```

Hit `https://vocaband-api.fly.dev/api/health` in a browser — you
should see a healthy response.  If you do, the API is live on Fly.

## Step 6 — Point Cloudflare Worker at Fly

The Worker currently proxies `/api/*` and `/socket.io/*` to
`https://api.vocaband.com` (which is Render).  Flip it to the new
Fly URL:

```diff
// worker/index.ts
- const API_BACKEND = "https://api.vocaband.com";
+ const API_BACKEND = "https://vocaband-api.fly.dev";
```

Commit + push.  Cloudflare auto-rebuilds + deploys.

(Alternative: keep `api.vocaband.com` and re-point the DNS
CNAME at Fly.  More work, no real benefit.  Just hard-code the
fly.dev URL for now.)

## Step 7 — Verify, then optionally retire Render

After the Cloudflare deploy finishes (~1 min):

* Sign in as a teacher → start a Quick Play.
* Have a student join from another device → score climbs on the
  teacher's leaderboard live.
* `fly logs` should show the connection + score-update events.

If everything works for 24 hours, suspend the Render service
(don't delete yet — keep it as a one-click fallback for a week).
After a week, delete it.

## Operational cheatsheet

| Task | Command |
|---|---|
| Deploy latest code | `fly deploy` |
| Tail logs | `fly logs` |
| Open a shell on the VM | `fly ssh console` |
| Update one secret | `fly secrets set FOO=bar` |
| Restart without code change | `fly deploy --strategy rolling` |
| Scale memory | edit `fly.toml` `[[vm]]` then `fly deploy` |

## Troubleshooting

**"App stuck in stopped state"** — first request after a long idle
period takes 1–2 s to boot.  That's expected and the user-facing
delay is barely noticeable.

**"Socket disconnects every few minutes"** — Fly's edge proxy idle
timeout is 30 minutes for active WebSockets, plenty for a Quick
Play session.  If you hit this, increase
`[http_service.concurrency]` `idle_timeout`.

**"Out of memory"** — bump `memory = "512mb"` in `fly.toml` and
redeploy.

**"Region is far from my users"** — change `primary_region` in
`fly.toml`, run `fly deploy`.  The whole VM moves.
