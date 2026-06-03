# Tier 2 proposal — collapse student login to a single round-trip

> **Status:** proposal / design — needs sign-off before implementation (it touches the auth model).
> **Goal:** turn the 3–4 *serial* client→Frankfurt round-trips of student login into **one** round-trip that lands on the nearby Cloudflare edge.
> **Owner:** TBD. **Created:** 2026-05-30.

---

## Why this, and why not the alternatives

The login slowness students feel (and that gets worse on weak classroom Wi-Fi) is dominated by the **number of serial network hops**, each one a full Israel→Frankfurt round-trip:

```
PIN login today (after the student taps their name + PIN):
  1. signInWithPassword   →  Supabase Auth (Frankfurt)
  2. fetchUserProfile     →  Supabase REST (Frankfurt)
  3. bootstrap_student_session RPC → Supabase (Frankfurt)
  (+ class_roster_for_login ran earlier on the picker — not on this path)
```

Three slow hops in a row, ~50–90 ms each on good Wi-Fi, far more on a saturated classroom AP.

**Things we already ruled out:**

- **Closer database** — Frankfurt is already the closest Supabase region to Israel; there is no Israel/Middle-East region, and GoTrue (auth) is single-region regardless. Moving the DB saves ~20–40 ms *per hop*; cutting a hop saves the *whole* 50–90 ms. Cutting hops wins.
- **Cutting the hops on the client** — the redundant-looking steps are guarded for real reasons (stale-anon-session crash recovery; multi-path role detection). Removing them client-side reintroduces known classroom crashes. See `useQuickPlayUrlBootstrap.ts:101-118` and `src/core/bootstrap.ts:13-16`.

**The insight that makes Tier 2 work:** the `supabase-js` client talks to `auth.vocaband.com` (Frankfurt) *directly*, bypassing our own edge. But Cloudflare has a **Tel Aviv POP**, and our Fly server already sits **in Frankfurt, next to Supabase** (<5 ms between them). If the multi-hop login logic runs on the server, the phone pays **one** hop (terminating at the nearby edge) instead of three-to-four transcontinental ones.

```
Tier 2:
  phone ──(1 hop, terminates at Tel Aviv CF edge)──► Worker ──► Fly (fra)
                                                                  ├─ signInWithPassword  ┐
                                                                  ├─ bootstrap RPC       │ all <5 ms,
                                                                  └─ (role detection)    ┘ intra-region
  ◄── { session tokens, dashboard payload } ──┘
  phone: supabase.auth.setSession(tokens)  // local, no network
```

---

## Design

### New endpoint: `POST /api/student/login`

Lives in `server.ts` (Fly, Frankfurt). Request:

```jsonc
{ "classCode": "ABC12345", "studentId": "<uuid>", "pin": "ABC234", "localDate": "2026-05-30" }
```

Server steps (all intra-region, ~5 ms each):

1. Resolve the roster email for `studentId` within `classCode` (service-role read — the same data `class_roster_for_login` already exposes).
2. `supabase.auth.signInWithPassword({ email, password: pin })` using a **request-scoped anon client** (not the admin client). This returns `{ access_token, refresh_token, expires_at }`.
3. With that user's JWT, call `bootstrap_student_session` (the RPC already returns user + class + assignments + progress + daily missions + pet + rewards in one shot).
4. Respond:

```jsonc
{
  "session": { "access_token": "…", "refresh_token": "…", "expires_at": 1234567890 },
  "bootstrap": { /* the existing BootstrapResult JSON */ }
}
```

### Client change

In `StudentPinLoginCard` / the restore path:

```ts
const res = await fetch(`${API}/api/student/login`, { method: 'POST', body: JSON.stringify({...}) });
const { session, bootstrap } = await res.json();
await supabase.auth.setSession(session);   // local — no network round-trip
hydrateDashboardFromBootstrap(bootstrap);  // setUser/assignments/progress/...
```

`setSession` writes the tokens to local storage and arms the existing refresh timer, so **every subsequent call (realtime, score saves, refresh) behaves exactly as today** — we've only changed *how the first session is obtained*, not the session model.

---

## What this does NOT change (keeps risk contained)

- **Token model is identical.** Still a normal Supabase session; refresh, RLS, realtime all unchanged after `setSession`.
- **Quick Play / anonymous joins** stay on the existing client path for now (their guards are about stale-session recovery, a separate concern). They can move to a parallel `/api/quick-play/join` endpoint in a follow-up if measurements justify it.
- **Teacher / OAuth login** untouched.
- **The old client path stays as a fallback** behind a flag, exactly like the bootstrap RPC did — if `/api/student/login` errors or times out, fall back to `signInWithPassword` + restore. Zero lockout risk.

---

## Security review checklist (must pass before ship)

- The endpoint performs the **same** `signInWithPassword` the client does today — it is **not** a privilege escalation; a wrong PIN still fails auth. PIN brute-force protection must be re-added at the endpoint (per-IP + per-studentId rate limit) since GoTrue's per-IP limit now sees Fly's IP, not the student's. **This is the one genuinely new attack surface — gate it carefully.**
- Never log PINs or tokens. Bodies are already capped at 413 (see MED-1 / INFO-3 hardening).
- Tokens travel client↔edge↔Fly over TLS only; no token in URLs or logs.
- Confirm the request-scoped anon client can't leak one student's tokens into another's response (no shared mutable client state per request).

---

## Expected payoff

| | Today | Tier 2 |
|---|---|---|
| Slow (transcontinental) hops on login | 3–4 | **1** |
| Where the slow hop terminates | Frankfurt | **Tel Aviv edge** |
| Weak-Wi-Fi amplification | ×(3–4) | ×1 |
| Rough login latency (good Wi-Fi) | ~200–350 ms | **~70–120 ms** |
| Rough login latency (saturated classroom Wi-Fi) | multi-second | ~1 slow hop |

Biggest gain is exactly the scenario you hit: weak shared Wi-Fi, where each eliminated hop removes a *multiplied* delay.

---

## Rollout

1. Build endpoint + per-IP/per-student rate limit + the fallback flag.
2. Ship dark (flag off), smoke-test with a few accounts.
3. Flip on for one pilot class, compare login timing vs. the old path.
4. Roll out; delete the client multi-hop path once metrics confirm parity (same discipline the bootstrap RPC used).

**Sequencing:** ship #1019 (done) → measure → then this. This is the highest-leverage *login-latency* change after #1019, but it's also the one that touches auth, so it earns the gate.
