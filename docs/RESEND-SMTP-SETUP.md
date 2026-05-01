# Resend SMTP setup for Vocaband — step by step

Goal: get magic-link emails (student + teacher OTP) delivering at
classroom-scale volumes via Resend instead of Supabase's default
demo SMTP (which rate-limits at ~3 emails/hour and is the reason
codes don't arrive when a teacher tries to log in for the second
time).

Total time: 20-30 min once you have a domain you control.

---

## Why Resend

| Provider | Free tier | Paid tier 1 | Notes |
|---|---|---|---|
| **Resend** | 100/day, 3 000/mo | $20/mo for 50K | One-click Supabase integration. **Pick this.** |
| Postmark | 100/mo | $15/mo for 10K | Best deliverability stats, weaker free tier |
| AWS SES | 62K/mo (from EC2) | $1 per 10K | Cheapest at scale, ~3 days to leave the sandbox |
| SendGrid | 100/day forever | $19.95/mo for 50K | Reliable, oldest, most paperwork |

Resend wins for our stage: free covers the founding-100 phase,
Supabase has a native integration, and migrating later (if
volumes ever justify SES) is painless because Resend uses the
same SMTP shape every other provider does.

---

## Step 1 — Create a Resend account

1. Go to https://resend.com and click **Sign up**.
2. Sign in with the email you'd like to send mail FROM (e.g.
   the one tied to vocaband.com).  Their free tier gives you
   3 000 emails / month with no credit card.

---

## Step 2 — Verify your sending domain

Resend will not send from `noreply@gmail.com` or any address you
don't own.  You have to prove control of `vocaband.com` (or
whatever domain you plan to send from).

1. In the Resend dashboard, go to **Domains** -> **Add domain**.
2. Type `vocaband.com` and click Add.
3. Resend shows you 3-4 DNS records to copy:
   - One **MX** record (for incoming bounce handling)
   - One **TXT** record for SPF (`v=spf1 include:...`)
   - One or two **TXT/CNAME** records for DKIM (`resend._domainkey`)
   - Optionally a DMARC record (`_dmarc`) - skip for now,
     add later when you're past founding-100
4. In your **Cloudflare** dashboard (or wherever your DNS lives):
   - DNS -> Records -> **Add record**
   - For each Resend row, paste the Type / Name / Value exactly
     as shown.  IMPORTANT: **disable Cloudflare's proxy** (gray
     cloud, not orange) for these records.  Email DNS records
     don't go through Cloudflare's proxy.
5. Back on Resend, click **Verify**.  Records typically propagate
   in 1-5 minutes; if Verify says "still pending" wait 10 min
   and click again.  Don't move on until all rows show **Verified**
   green.

---

## Step 3 — Create an API key in Resend

1. Resend dashboard -> **API Keys** -> **Create API Key**.
2. Name it `vocaband-supabase-smtp`.
3. Permission: **Sending access** (default).
4. Domain restriction: select `vocaband.com` (NOT "All domains" -
   tighter blast radius if the key leaks).
5. **Copy the key** (starts with `re_`).  You'll see it ONCE; if
   you close the tab without copying you have to make a new one.

---

## Step 4 — Wire Resend into Supabase

1. Open https://supabase.com/dashboard/project/<YOUR_PROJECT>.
2. Left sidebar: **Project Settings** (the gear icon).
3. Sub-tab: **Authentication** -> **SMTP Settings**.
4. Toggle **Enable Custom SMTP** to ON.
5. Fill in:

   | Field | Value |
   |---|---|
   | Sender email | `noreply@vocaband.com` (or any verified address on the domain) |
   | Sender name | `Vocaband` |
   | Host | `smtp.resend.com` |
   | Port number | `465` |
   | Username | `resend` (literal string - not your account email) |
   | Password | the `re_...` API key from Step 3 |
   | Minimum interval between emails | `60` (seconds, prevents spam if a kid mashes the resend button) |

6. Click **Save**.

---

## Step 5 — Test it

1. Supabase dashboard -> **Authentication** -> **Users** -> **Invite user**.
2. Type your own personal email.  Click Send.
3. Check your inbox.  If the magic-link email arrives in 30s
   from `noreply@vocaband.com`, you're done.  If it lands in
   spam, that's normal for a brand-new sender domain - keep
   sending more emails to grow trust, the spam-filter score
   improves within a week.

If the email **doesn't** arrive at all:
- Check Resend dashboard -> **Logs**.  If you see the email
  there with a "delivered" status, the issue is the recipient's
  spam folder, not Resend.
- If the email isn't in Resend's logs at all, your Supabase ->
  Resend handshake failed.  Most common cause: **typoed API key**
  (re-paste from a clean source) or **wrong port** (must be
  `465`, not `587` - Supabase's SMTP integration uses TLS-on-connect).

---

## Step 6 — Update the Magic Link template

Default Supabase template ships an English-only "Click here to
sign in" message that's fine for desktop but doesn't show the
6-digit code in the inbox preview - which is the whole point of
Vocaband's teacher-OTP flow on shared classroom PCs (teacher reads
the code from the email subject without ever opening the email).

1. Supabase dashboard -> **Authentication** -> **Email Templates**.
2. Pick **Magic Link**.
3. **Subject** field - replace with:
   ```
   Vocaband sign-in code: {{ .Token }}
   ```
   Now the 6-digit code shows in the inbox preview.
4. **Body (HTML)** - paste this minimal styled template:
   ```html
   <h2 style="font-family:system-ui,sans-serif;color:#0f172a;">
     Your Vocaband sign-in code
   </h2>
   <p style="font-family:system-ui,sans-serif;color:#0f172a;">
     Enter this code in the Vocaband sign-in screen:
   </p>
   <p style="font-size:36px;font-weight:900;letter-spacing:6px;
            font-family:'SF Mono',monospace;color:#4f46e5;
            background:#eef2ff;padding:16px 24px;border-radius:12px;
            text-align:center;margin:24px 0;">
     {{ .Token }}
   </p>
   <p style="font-family:system-ui,sans-serif;color:#64748b;
            font-size:14px;">
     Or click here:
     <a href="{{ .ConfirmationURL }}">Sign in to Vocaband</a>
   </p>
   <p style="font-family:system-ui,sans-serif;color:#94a3b8;
            font-size:12px;">
     This code expires in 1 hour.  If you didn't request it, you
     can safely ignore this email.
   </p>
   ```
5. **Token expiry** - leave at default (1 hour).
6. **OTP length** - confirm it's set to **6** (Authentication ->
   Providers -> Email).  If it's still 8, your `<input maxLength={6}>`
   in TeacherLoginCard / StudentEmailOtpCard will reject every
   code that arrives.
7. Click **Save changes**.

Repeat for **Confirm signup** and **Invite user** if you ever
plan to use those flows - same template body, same `{{ .Token }}`.

---

## Step 7 - Watch the meter

Resend dashboard -> **Logs** shows every email sent.  Watch this
the first day or two for any `bounced` or `complaint` rows -
those are signals that:
- An email address you sent to doesn't exist (typo)
- A recipient marked your mail as spam (rare for OTP, but possible)
- Your domain hasn't fully warmed up yet

The free tier resets monthly.  If you're approaching 3 000 emails
in a month, you'll get an email from Resend before you hit the
hard wall - they don't drop emails silently.  Upgrade in-app
(takes 30 seconds) when needed.

---

## Step 8 - When you outgrow Resend's $20 tier

You'll know because monthly usage is consistently over 50 000 OTP +
magic-link sends.  At that point migrate to AWS SES:

1. Sign up at https://aws.amazon.com/ses/
2. Verify the same domain (same DKIM/SPF records, except SES
   gives you SES-specific values).
3. Request production access (escape sandbox) - this is a 1-2
   business-day approval.
4. Generate SMTP credentials (separate from your AWS access keys -
   IAM -> SMTP credentials).
5. Replace Supabase's SMTP host with `email-smtp.eu-west-1.amazonaws.com`
   (region matches your Supabase region for latency).

SES at our scale: ~$2/mo for 200 000 emails.  Resend at the same
volume: ~$80/mo.  Worth migrating once you're spending $40+/mo on
Resend.

---

## Common gotchas

| Symptom | Cause | Fix |
|---|---|---|
| Verify spins forever in Resend | Cloudflare proxy is ON for the DNS records | Toggle it OFF (gray cloud), wait 5 min |
| Email arrives but no `{{ .Token }}` | Subject still uses Supabase default | Edit Subject field per Step 6 |
| Code says invalid even though it matches | OTP length is 8, your input is 6 | Set OTP length to 6 in Auth -> Providers -> Email |
| 1st email works, 2nd says "rate limited" | Supabase's "minimum interval" is too long | Drop from default 300s to 60s in Step 4 |
| Email in Resend logs but never arrives | Spam folder | Add `noreply@vocaband.com` to recipient's contacts; spam-trust grows over weeks |
| Resend logs show "domain not verified" | DKIM record not propagated yet | Wait 5 more min, click Verify again |

---

## Tracking the operator step

Once Steps 1-7 are complete, mark item **#3** in
`CLAUDE.md` -> "Pending operator actions" as done.  This file
becomes irrelevant for daily ops; bookmark it only for re-verification
or for migrating to a different provider later.
