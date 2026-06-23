# Native Push Notifications for the Android App — Simple Plan

> **What this is:** a step-by-step plan to make push notifications work
> **inside the Google Play (Android) app**. This is the Android-only path.
> iOS is a separate, similar job for later.
>
> **Status:** plan only. No code written yet. Nothing here changes the app
> until you decide to build it.

---

## 1. Why we need this (in simple words)

The push notifications I already built use **"Web Push."** That works when a
student opens the site in **Chrome** or installs it as a home-screen app.

But your Google Play app is different. It is a **Capacitor shell** — a thin
Android app that loads your website inside a built-in browser window
(the "Android System WebView").

**The problem:** that built-in WebView does **not** support Web Push. So a
student who uses the **Play Store app** would get no notification, even
though the same student using Chrome would.

**The fix:** Android apps have their own, separate notification system
called **FCM (Firebase Cloud Messaging)**. To notify the Play Store app, we
must use FCM through a **native plugin**, not Web Push.

So: same idea (tell the student about a new task), but a **second delivery
pipe** that only the Android app uses.

---

## 2. The big picture

```
                                  ┌─ Web Push  → Chrome / installed PWA   (ALREADY BUILT)
Teacher posts a task → server ────┤
                                  └─ FCM       → Android Play Store app   (THIS PLAN)
```

Both pipes are fed by the **same** moment (teacher creates an assignment /
reward / live challenge). We just add the second pipe.

---

## 3. What we need to build (the pieces)

| # | Piece | Plain explanation |
|---|---|---|
| 1 | **Firebase project** | A free Google account for the app. It gives us the keys FCM needs. |
| 2 | **`google-services.json`** | A config file from Firebase that goes inside the Android app. |
| 3 | **`@capacitor/push-notifications` plugin** | Official Capacitor add-on. It asks the student for permission and gets a **device token** (the app's "address" for notifications). |
| 4 | **Save the token** | The app sends that token to our database (reuse the existing `push_subscriptions` table, marked as `kind = 'native'`). |
| 5 | **Server sends via FCM** | When a teacher acts, the server sends to native tokens through Firebase (using the Firebase Admin SDK), in addition to the existing Web Push send. |
| 6 | **Tap handling** | When the student taps the notification, the app opens to the right screen. |

---

## 4. How it connects to what's already done

Good news — most of the groundwork is already in place from the Web Push work:
- ✅ The **opt-in / opt-out UI** can be reused (same buttons).
- ✅ The **`push_subscriptions` table** already exists — we add a `kind`
  column (`web` or `native`) and store the FCM token.
- ✅ The **server trigger points** (assignment / reward / live challenge)
  already fire — we just add an FCM send next to the Web Push send.
- ✅ The **feature flag + consent logging + PII-free rule** all carry over.

So this is an **extension**, not a rebuild.

---

## 5. Step-by-step (in order)

**Part A — Firebase setup (no code)**
1. Create a free Firebase project for `com.vocaband.student`.
2. Register the Android app in it → download `google-services.json`.
3. Get the **server key / service account** so our backend can send.

**Part B — Android app changes (needs a Play release)**
4. Add the `@capacitor/push-notifications` plugin.
5. Drop `google-services.json` into the Android project.
6. Add the small native code: ask permission, get the token, send it to
   our server, and handle taps.
7. Build a **new app version** and upload it to Google Play.

**Part C — Server changes**
8. Add an **FCM send** path (Firebase Admin SDK) beside the existing
   Web Push send. Native tokens → FCM; web subscriptions → Web Push.
9. Add a `kind` column to `push_subscriptions` so we know which pipe to use.

**Part D — Compliance (before turning it on)**
10. Update the **Google Play Data Safety** form: we now collect a
    "Device ID" (the FCM token) for notifications. Optional + opt-in.
11. Add **Firebase/FCM** to the sub-processor list (already drafted in
    `docs/legal/PUSH-NOTIFICATIONS-COMPLIANCE.md`).
12. Lawyer sign-off (same gate as the web push).

---

## 6. What needs a Google Play release?

- ✅ **Yes, a new Play release is required** — because we add a native
  plugin and `google-services.json`. That is a "shell-level" change, and
  the rule is: shell changes need a new app upload + Play review.
- The web parts (opt-in card, etc.) still ride the normal web deploy.

**Plan for one Play release** that bundles: the push plugin, the Firebase
config, and any other pending native tweaks.

---

## 7. Cost

- Firebase / FCM: **free.**
- Google Play: you already have the developer account, so **no extra fee**
  for an update (the one-time $25 was paid at first publish).
- Total new money: **$0.**

---

## 8. Important notes / gotchas

- **Android 13+ asks for notification permission** at runtime — the plugin
  handles this. Older Androids grant it automatically.
- The notification **payload stays PII-free** — no student name or score,
  same rule as Web Push.
- **Test on a real Android phone** via the Play **internal testing** track
  before going public.
- Keep it **functional-only** (new task / reward / live challenge). No ads,
  no streak-guilt — same children-safety rules as before.
- **iOS** would be a parallel job: same plugin, but Apple's APNs + an Apple
  Developer account ($99/yr) + an App Store release.

---

## 9. Rough effort

- Firebase setup: ~1 hour.
- Plugin + native wiring: ~half a day.
- Server FCM send path: ~half a day.
- Testing on real devices + Play internal track: ~1 day.
- Then: Data Safety update + lawyer sign-off → enable the flag.

A focused **2–3 day** task end to end, mostly testing and the Play release
wait — not a big rebuild.
