# Staging cohort verification — 2026-09-15

Target: vocaband-staging-honeyed-brook-4330.fly.dev.
User deployed backend commit 015e12b5439b1e38bdb248ce0908c10a5d104bb2 to staging.

The post-deployment single-student probe preserved 20 points on rejoin and
accepted the next total of 30, observed by the teacher. Health and Redis checks
returned HTTP 200 with Redis attached and PONG.

The next probe ran two distinct roster students and two teachers in separate
classes. Both teachers received their own scores, neither received the other
student, and both students resumed scoring after reconnection.

The expanded cohort used ten distinct authenticated roster students, five per
class, and two teachers. Each student sent three ten-point increments. Every
teacher observed all five expected scores, with no cross-class student entries.
All ten students disconnected, waited two seconds, opened fresh authenticated
connections, rejoined with retained totals, and sent another accepted increment.
No challenge_error events were observed. All sockets were closed after testing.

## Machine-readable cohort result

```json
{
  "scope": "10 distinct roster students, 2 observing teachers, protocol test",
  "checks": {
    "allTenScoresReceived": true,
    "classIsolation": true,
    "allTenRetained": true,
    "allTenContinued": true
  },
  "pass": true,
  "errors": []
}
```

## Limits

This verifies the Live Challenge socket protocol with synthetic accounts, not
browser gameplay, completed-assignment persistence, Quick Play or demo mode.
The driver used the environment HTTPS proxy; timings cannot isolate server delay.
Explicit disconnect/reconnect is not bandwidth throttling or packet-loss testing.
No 10,000-student load run or capacity certification has been performed.
The eight added synthetic roster accounts remain in the isolated test database
for subsequent tests; credentials are excluded from this report and repository.
