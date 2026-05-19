# Uptime + SSL monitoring setup (UptimeRobot)

> **What this is for:** catch a Vocaband outage *before* a teacher
> texts you angry on Monday morning.  Closes §0c of
> `docs/operator-tasks.md` — the last remaining ⚠️ HIGH operational
> item.
>
> **Estimated time:** 30 minutes.  No code change.
> **Cost:** free.

---

## What you're setting up

Three monitors that page you when something breaks:

| Monitor | What it watches | Alerts when |
|---|---|---|
| HTTP health probe | `https://www.vocaband.com/api/health` every 5 min | endpoint returns 5xx or doesn't respond |
| SSL certificate expiry | TLS cert on `www.vocaband.com` and `auth.vocaband.com` | < 14 days until expiry |
| DNS record check | A/AAAA records for both domains | DNS resolution stops working |

You get notified via **email + UptimeRobot mobile app push** (both
free).  SMS is paid and unreliable — push notifications from the
UptimeRobot app are faster and harder to miss.

---

## Step-by-step

### 1.  Sign up (5 min)

1. Go to **https://uptimerobot.com**
2. Click **Sign Up**, use the **`Vocaband Production` 1Password vault
   email** (the one from §0b — *not* a personal Gmail).  This way if
   you ever need to hand off ops, the next person inherits the
   monitoring account with the vault.
3. Confirm the email.  Set a strong password and store it in the
   vault.

### 2.  Install the mobile app (3 min)

1. App Store / Play Store → search **"UptimeRobot"** → install.
2. Log in with the account you just made.
3. **Enable notifications** when it asks.  This is how you get paged.

### 3.  Add the HTTP health monitor (5 min)

1. Dashboard → **+ Add New Monitor** (top-right).
2. Fill in:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `Vocaband — /api/health`
   - **URL:** `https://www.vocaband.com/api/health`
   - **Monitoring Interval:** `5 minutes` (default; free tier max
     resolution)
   - **Alert Contacts To Notify:** check **Email** and **Push
     Notification** (the latter appears after you log in on mobile).
3. **Create Monitor**.  Within 30 sec the dashboard should show it as
   green ("Up").

### 4.  Add the SSL certificate expiry monitors (5 min)

UptimeRobot has a built-in monitor type for this — no special setup,
no port forwarding, just the hostname.

1. **+ Add New Monitor** again.
2. Fill in:
   - **Monitor Type:** `SSL Certificate Expiry`
   - **Friendly Name:** `SSL — www.vocaband.com`
   - **Domain:** `www.vocaband.com`
   - **Alert me when SSL expires in:** `14 days`
   - **Alert Contacts To Notify:** Email + Push.
3. **Create Monitor**.
4. Repeat for `auth.vocaband.com`:
   - **Friendly Name:** `SSL — auth.vocaband.com`
   - **Domain:** `auth.vocaband.com`
   - Same 14-day threshold + same alert contacts.

### 5.  Add the DNS monitor (3 min)

Catches the case where Cloudflare DNS stops resolving (rare but
catastrophic — domain looks expired to every browser).

1. **+ Add New Monitor**.
2. Fill in:
   - **Monitor Type:** `DNS`
   - **Friendly Name:** `DNS — vocaband.com (A)`
   - **Hostname / Domain:** `vocaband.com`
   - **DNS Record Type:** `A`
   - **Expected Value:** *leave blank* — the monitor just checks
     that the lookup succeeds and returns *some* IP.  We don't pin
     a specific IP because Cloudflare rotates them.
   - **Alert Contacts To Notify:** Email + Push.
3. **Create Monitor**.

(Optional: repeat for `auth.vocaband.com` if you want the same
coverage on the auth subdomain.  Two monitors total covers ~99% of
DNS failure modes.)

### 6.  Verify it actually pages you (3 min)

You need to test the alerts NOW, while you remember setting it up —
not in 6 months when something real breaks.

1. Dashboard → click the **HTTP health monitor** → **Pause** (top-right).
2. Wait 5-10 min.  You should get an email *and* a push notification
   saying the monitor is **paused** (most plans treat "paused" as a
   non-down alert; if not, the next "Down" event will).
3. **Resume** the monitor.

If neither alert arrived: open **My Settings → Alert Contacts**,
re-add the email and push contact, confirm any verification emails,
re-test.

### 7.  Mark §0c done

Once all 5 monitors (1 HTTP + 2 SSL + 2 DNS, or 4 if you skipped the
second DNS) show green for at least one full cycle:

1. Move §0c in `docs/operator-tasks.md` to a `✅ DONE 2026-05-XX` block
   like §0 / §0b / §0d above it.
2. Commit + push.

---

## What to do when it pages you

Push notification fires at 3am Sunday.  You wake up.  Now what?

**For the HTTP monitor (`/api/health` down):**
1. Open Vocaband in a browser.  Site loads? → Fly.io is fine; the
   health endpoint might be misreporting.  Check Fly logs.
2. Site doesn't load? → check Cloudflare status
   (`https://www.cloudflarestatus.com`) then Fly status
   (`https://status.fly.io`).
3. Both clouds green? → check Supabase status; the auth
   roundtrip in `/api/health` touches Supabase.

**For the SSL monitor (expiry < 14 days):**
1. Don't panic.  14 days is plenty of runway.
2. Cloudflare: `Dashboard → SSL/TLS → Edge Certificates` → check
   "Universal SSL" status.  Should say "Active Certificate".  If
   stuck on "Pending Validation", DNS is the culprit.
3. Fly cert: `flyctl certs show vocaband` from the production
   `flyctl` setup (creds live in the vault per §0b).
4. Force a renewal: `flyctl certs add vocaband.com` re-runs the
   ACME flow.

**For the DNS monitor (resolution failing):**
1. Open `https://www.whatsmydns.net` → look up `vocaband.com` from
   multiple regions.
2. All regions failing → Cloudflare DNS is down or your DNS records
   were edited.  Log into Cloudflare immediately.
3. Some regions failing → propagation issue, usually self-resolves
   within 1-2 hours.

---

## Why we chose UptimeRobot

- **Free tier is genuinely free** (no credit card required).  50
  monitors, 5-min resolution, unlimited email alerts.  Push
  notifications via their mobile app are free too.
- **SSL expiry monitoring built-in** — not a paid add-on like Better
  Stack.
- **DNS monitoring built-in** — same.
- **Anonymous probes from multiple regions** — they hit us from
  Frankfurt, US-East, Singapore, etc., so a regional Cloudflare
  failure doesn't fool the monitor.

Alternatives if UptimeRobot ever doesn't fit:
- **Better Stack** (formerly Better Uptime) — nicer UI, paid SSL.
- **Cronitor** — focused on cron-job monitoring (we don't need that yet).
- **Pingdom** — enterprise-priced, overkill.

---

## Future enhancements (don't do these now)

- **Status page** — UptimeRobot has a free public status page feature.
  Useful once you have paying schools who want to see "is Vocaband up
  right now?" without emailing support.  Skip until then.
- **Webhook to Slack / Discord** — useful when there's a team, not
  while bus-factor is 1.
- **Synthetic transaction monitor** — probes that don't just check
  `/api/health` but actually log in as a test student and play a game.
  Catches deeper outages.  ~1 hr to set up; defer until first real
  outage convinces you it's worth the time.
