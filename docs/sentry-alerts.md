# Sentry alert setup — 5-minute guide

> Goal: get an email within 60 seconds when a real school's lesson breaks.

Sentry is already wired into the app (org `was-at`, project `javascript-nextjs`) and collecting errors. What's missing are **alert rules** — without them, errors silently pile up and you only find out when a teacher emails complaining.

This guide sets up two rules that cover ~95% of bad-push scenarios.

---

## Prerequisite — confirm your email is on the Sentry account

1. Open https://was-at.sentry.io
2. Top-right avatar → **User Settings** → **Notifications**
3. Confirm the email is correct and that **Email** is checked for "Issue Alerts"

---

## Alert 1 — "New issue in production" (~2 min)

This emails you the moment a brand-new error appears. Catches "I pushed at 09:00 and immediately broke something."

1. Open https://was-at.sentry.io → left sidebar → **Alerts**
2. Click **Create Alert Rule** (top right)
3. Pick **Issues** as the alert type → click **Set Conditions**
4. **Project:** `javascript-nextjs`
5. **Environment:** `production` (so dev/staging noise doesn't email you)
6. **When:** `A new issue is created` (this is the default — leave it)
7. **If:** leave empty (no extra filters)
8. **Then:** `Send a notification to Email` → pick yourself
9. **Rule name:** `New issue in production`
10. **Action interval:** `30 minutes` (Sentry won't email you about the same issue more than once per 30 min — prevents inbox flooding)
11. Click **Save Rule**

Done. Try it: in your dev branch, throw a `new Error('test alert')` somewhere, push to a deployed preview, trigger it once, and you should get an email within ~1 minute.

---

## Alert 2 — "Error spike" (~3 min)

This emails you when error volume jumps. Catches regressions that don't crash on first load but slowly affect more users.

1. **Alerts → Create Alert Rule**
2. Pick **Metric alert** this time (not Issues) → **Set Conditions**
3. **Dataset:** `Errors`
4. **What metric?** `count()`
5. **Filter:** `event.type:error environment:production`
6. **Time window:** `5 minutes`
7. **Trigger when:** `count() > 10` → label this trigger **Critical**
   - Why 10/5min: Vocaband's normal error rate is near zero; 10 errors in 5 minutes means something real is breaking. Adjust up if you see false positives.
8. Optionally add a second trigger at `count() > 3` labeled **Warning** — early heads-up.
9. **Action:** Send a notification to Email → yourself
10. **Rule name:** `Error spike — production`
11. **Save Rule**

---

## Alert 3 (optional) — "Performance regression"

Sentry's free tier includes basic transaction monitoring. If you want to catch "the app got 3× slower":

1. **Alerts → Create Alert Rule → Metric alert**
2. **Dataset:** `Performance` → **transaction.duration**
3. **Aggregation:** `p95(transaction.duration)`
4. **Trigger when:** `p95 > 3000` (ms) over 10 minutes
5. **Save Rule**

Skip this on first pass — get the two error rules above working first, add this in month 2 once you know your baseline performance.

---

## Test your setup

After saving rule 1, trigger a real-looking error:

```ts
// Drop this in any visible screen, push to a preview deployment, click it once.
<button onClick={() => { throw new Error('Vocaband alert test — safe to ignore'); }}>
  test
</button>
```

You should get an email within 60–90 seconds. If you don't, check:
- Notification settings (top-right avatar → User Settings → Notifications → Issue Alerts → Email checked)
- The environment filter — the error must come from `environment:production` to match the rule. If you tested on a preview build with `environment:preview` it won't fire.
- Spam folder

**Remember to remove the test button before merging.**

---

## How to silence an alert temporarily

You're going to legitimately deploy a feature that throws errors during onboarding (e.g. expected 401s during sign-in flow). To stop those from spamming alerts:

1. Open the issue in Sentry
2. Click **Ignore** → choose **Until it occurs N times** or **For X hours**
3. Resolved errors auto-un-ignore once they recur after the timeout

Or, mute the entire alert rule from **Alerts → click the rule → Edit → Active toggle**.

---

## When to revisit

- **First month:** check Sentry once per day. If you're getting too many emails, raise the spike threshold. Too few? Lower it.
- **After 3 months of stable traffic:** add the performance alert (rule 3 above).
- **Once you have 50+ schools:** consider upgrading to Slack/Discord notifications so alerts surface where you actually look, not in email.
