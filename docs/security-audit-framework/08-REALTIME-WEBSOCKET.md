# 08 — Real-time (Socket.io)

> Two namespaces:
> - `/` — authenticated Live Challenge (teacher-led classroom)
> - `/quick-play` — anonymous (see module 05)
>
> This module focuses on the authenticated namespace and the shared
> infrastructure (rate limiting, abuse).

---

## 1. Security maturity assessment

| Category | Current level | Risk | Severity | Confidence |
|---|---|---|---|---|
| Connect-time JWT verify (`io.use`) | HARDENED — server.ts:584-607 | Low | INFO | HIGH |
| Per-event rate limiting | GOOD — JOIN 5/min, OBSERVE 5/min, SCORE 2/sec | Low | LOW | HIGH |
| Per-event authorisation re-check | GOOD — `isTeacherForClass` re-checks on observe / score-bonus | Low | LOW | HIGH |
| Payload UID match vs JWT UID | HARDENED — explicit check on `JOIN_CHALLENGE` (server.ts:636) | Low | INFO | HIGH |
| Token-rotation mid-connection | MODERATE — Supabase refreshes opaquely; not re-verified mid-stream | Medium | LOW | MEDIUM |
| Anti-flood (room-join spam) | GOOD — per-user, not per-IP | Low | LOW | HIGH |
| Disconnect cleanup | GOOD — `socket.on("disconnect")` removes from room | Low | INFO | HIGH |
| Redis adapter (horizontal scale) | GOOD — health-checked at `/api/health/redis` | Low | INFO | MEDIUM |
| Message-size cap | MODERATE — socket.io default 1MB; tighten for our payloads | Medium | LOW | HIGH |

**Overall:** GOOD (82/100).

---

## 2. Attack surface mapping

| Event | Namespace | Auth | Notes |
|---|---|---|---|
| `JOIN_CHALLENGE` | `/` | JWT + role check | server.ts:626 |
| `OBSERVE_CHALLENGE` | `/` | JWT + teacher-of-class check | server.ts:688 |
| `UPDATE_SCORE` | `/` | JWT + room membership | server.ts:720 |
| `disconnect` | `/` | n/a | cleanup only |
| `QP_EVENTS.STUDENT_JOIN` | `/quick-play` | anon | see module 05 |
| `QP_EVENTS.SCORE_UPDATE` | `/quick-play` | anon | rate-limited |
| `QP_EVENTS.TEACHER_*` | `/quick-play` | **MUST re-verify teacher inline** | flagged in module 05 |

---

## 3. Offensive analysis

### A. Connect without JWT

`io.use()` middleware (server.ts:584-607) rejects sockets without a
valid JWT on the `/` namespace. **Verified.**

### B. UID-spoof on JOIN_CHALLENGE

The handler validates `payload.uid` against the JWT-verified uid
(server.ts:636 — `"uid mismatch — payload uid doesn't match JWT uid"`).
**Verified mitigated.**

### C. Teacher-of-class probe

A teacher attempting to observe another teacher's class triggers
`isTeacherForClass(uid, classCode)` (server.ts:230) → fails. **Verified
mitigated.**

### D. Score-update spam

`UPDATE_SCORE` is rate-limited per-socket at 2/sec (server.ts:720
limiter). A burst of 100 events from a single socket is dropped after
the 2nd in any second. **Verified mitigated.**

### E. Room enumeration

Socket.io doesn't expose room membership to clients; the server's
`socket.join(classCode)` is unilateral. An attacker cannot join a
room they're not a teacher/student of (the join code is enforced).
**Verified mitigated.**

### F. Long-lived connection token expiry

Supabase JWTs expire after ~1h by default. A socket established at
T=0 holds the connection past T=1h+. Current code does **not**
re-verify the JWT mid-stream. Implications:

- **Score updates after revocation:** if a teacher account is
  suspended, their socket continues to receive updates until disconnect.
  Affected scope: live-challenge leaderboards, no PII.
- **Mitigation:** periodically (every 5 min) re-verify the socket's
  stored JWT via `supabaseAdmin.auth.getUser(token)`; on failure, emit
  `force_disconnect` and `socket.disconnect()`.

### G. Payload-size flood

socket.io default `maxHttpBufferSize` is 1MB. Vocaband emits ≤1KB events.
**Tighten** to 16KB to deny payload-DoS:

```ts
const io = new Server(server, { maxHttpBufferSize: 16 * 1024, ... });
```

### H. Redis adapter compromise

If the Redis instance is reachable from outside Fly's private network,
an attacker could publish forged room messages. **Verify** Redis is
private-only (Fly internal IP6 or Upstash with TLS + token).

---

## 4. Blue-team controls

| Control | Status | Priority |
|---|---|---|
| `io.use()` JWT gate | ✅ | — |
| Per-event limiters | ✅ | — |
| `isTeacherForClass` re-check | ✅ | — |
| Mid-stream token re-verify | ❌ | P2 |
| `maxHttpBufferSize` tightening | ❌ | P3 |
| Redis private-only verification | ❓ | operator |
| Per-socket disconnect-on-abuse | partial | implicit via limiter |

---

## 5. Testing strategy

| Test | Auto? |
|---|---|
| Socket connect without JWT → rejected | Auto |
| JOIN_CHALLENGE with mismatched UID → rejected | Auto |
| Burst UPDATE_SCORE 100/sec → first 2/sec land, rest dropped | Auto |
| Disconnect handler removes from room | Auto |
| Redis publish from external host → blocked | Manual (network) |
| Token revocation → socket auto-closes (after re-verify is added) | Auto |

---

## 6. Monitoring + detection

| Signal | Alert | Tier |
|---|---|---|
| Socket auth-fail rate > 5%/5min | abuse / outage | P2 |
| Concurrent sockets > 5k | scale / abuse | P2 |
| Single-token sockets > 5 simultaneously | shared account / abuse | P2 |
| Mean event size > 4KB | payload abuse | P2 |
| Redis adapter latency > 100ms | infra issue | P2 |

---

## 7. Incident response

- **Sockets behaving as wrong user:** rotate JWT secret (revokes all
  tokens), restart Fly machines (drops all sockets), force clients to
  reconnect with fresh tokens.
- **Redis poisoning:** flush relevant Redis keys; verify network ACLs;
  rotate Redis password.

---

## 8. Edge cases

- **Network roams (school WiFi ↔ student phone LTE):** socket auto-
  reconnects; client should re-emit JOIN with stored token.
- **Teacher's class deleted while student mid-game:** student's class
  code is nulled (trigger), next progress write fails RLS; surface UX.
- **Two teachers observing the same class:** acceptable (co-teaching);
  both pass `isTeacherForClass`.
- **socket.id reuse after server restart:** Fly auto-stop / start
  cycles drop all sockets; clients reconnect cleanly.

---

## 9. KPIs

| KPI | Healthy | Warning | Critical |
|---|---|---|---|
| Connect success rate | >99.5% | 99-99.5% | <99% |
| `JOIN_CHALLENGE` deny rate | <0.1% | 0.1-1% | >1% |
| Concurrent sockets at peak | <2k | 2-5k (scale) | >5k (capacity plan) |
| Disconnect cleanup failure | 0 | — | ≥1 (memory leak risk) |

---

## 10. Self-critique

- Mid-stream token re-verification is the only meaningful gap; the
  blast radius is small (no PII flows over sockets after JOIN).
- We did not stress-test concurrency at 5000+ sockets — that's a
  capacity question; security implications kick in at the Redis
  adapter layer.
