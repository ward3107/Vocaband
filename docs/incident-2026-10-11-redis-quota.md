# Redis quota outage — 11 October 2026

## Evidence

- User reported a Socket.IO WebSocket timeout and an inline-script CSP error.
- Production diagnostics run `38142193682` found all three Fly machines in
  critical health; two returned 500 from `/api/health`, and the third timed out.
- Follow-up run `38142305269` counted 76 `max requests limit exceeded` messages
  in the recent infrastructure logs. Raw logs and credentials are not published.
- The global Redis rate limiter covered process liveness. Redis refusing its
  counter operations turned healthy Node processes into unhealthy Fly targets,
  preventing new HTTP and WebSocket traffic from reaching any server.
- The durable Quick Play finalizer scanned its queue every second on every VM,
  including while empty. This is avoidable quota consumption.
- The uptime monitor accepted the www-to-apex redirect as a successful probe
  without reaching `/api/health` or checking its JSON response.

## Changes

- Exempt only GET/HEAD process liveness from rate limiting; keep dependency
  diagnostics and application requests protected. Draining still returns 503.
- Bound Redis startup waiting to eight seconds, keep reconnection in the
  background and disable the offline command queue. Shared game state never
  falls back to independent RAM when Redis is configured.
- Initialize Redis rate-limit scripts lazily, retry failed initialization after
  a bounded cooldown, and return 503 with Retry-After while the shared counters
  are unavailable. Isolate each limiter's key prefix.
- Scan an empty finalization queue once per minute instead of every second;
  back off failures up to five minutes. Explicit finalization requests still
  run immediately. Abandoned jobs on another VM may take up to a minute to be
  discovered; job retention and exactly-once result persistence are unchanged.
- Verify actual apex health JSON, Redis readiness, and real Engine.IO /
  Quick Play namespace handshakes after a Fly deployment.
- Preserve the strict CSP hashes and sources, adding an unpredictable 128-bit
  nonce to both script directives on each SPA HTML response. Cloudflare can
  copy it to its own injected JavaScript Detections code, as its documentation
  prescribes. The reported extra inline-script hash was not reproduced in a
  clean browser; it is not blindly allowlisted.
- Remove landing-only module hints and the unused Be Vietnam font preload
  from the shared HTML shell. Route selection loads the relevant app chunks.

## Operator dependency

The code cannot replenish an exhausted hosted Redis allowance. Restore capacity
on the existing Redis database before declaring live gameplay fully recovered.
Do not delete/replace it without preserving active game state and pending
finalization jobs. Billing/plan changes require the owner's decision.

Liveness and an accepted WebSocket are intentionally separate from Redis
readiness. No live scoring or persistence success is claimed while Redis is
still refusing commands.

## Verification

Regression tests start the actual production server against a local Redis
fixture that rejects every command with the production quota error. They prove
bounded startup, GET/HEAD liveness, fail-closed API responses, and a WebSocket
namespace handshake. Additional tests cover limiter recovery, idle polling,
quota backoff, fresh CSP nonces and SPA route coverage. Existing distributed
gameplay tests remain part of CI.
