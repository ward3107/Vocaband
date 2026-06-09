# Chaos testing — network fault injection (Toxiproxy)

> Deliberately break a dependency in **staging** and confirm the app
> degrades gracefully instead of hanging. See `docs/testing-at-scale.md`
> for how this fits the overall strategy.

## Install (one-time)

- macOS: `brew install toxiproxy`
- Other: download from https://github.com/Shopify/toxiproxy/releases
- Start the daemon (API on `:8474`): `toxiproxy-server`

`toxiproxy-cli` and the daemon must both be on PATH / running.

## Use

`network-chaos.sh` wraps `toxiproxy-cli` with ready-made fault presets:

```bash
# Create a proxy: client/server connects to <listen>, traffic flows to <upstream>
./network-chaos.sh create <upstream host:port> <listen host:port>

./network-chaos.sh latency   # +800ms ±400ms jitter   — laggy Wi-Fi
./network-chaos.sh slow      # 16 KB/s throughput      — congested uplink
./network-chaos.sh timeout   # hang ~5s then fail      — dependency unreachable
./network-chaos.sh down      # toggle all traffic off  — dependency dead
./network-chaos.sh clear     # remove all toxics       — back to healthy
./network-chaos.sh destroy   # delete the proxy
```

## TLS caveat — which hops you can proxy

Toxiproxy is a raw **L4 TCP** proxy; it does not terminate TLS. So the
client must not expect a certificate that matches the proxy's localhost
address. That makes these the practical targets:

- ✅ **server.ts → Supabase Postgres** (`db.<ref>.supabase.co:5432`) — the
  Postgres driver validates differently than a browser; point the staging
  server's DB connection at the proxy. **The highest-value target**:
  simulates "the database got slow/unreachable mid-class".
- ✅ **server.ts → Redis** (socket.io adapter) — plain TCP, proxies cleanly.
- ✅ **A local dev origin over plain HTTP** (`localhost:8080`).
- ⚠️ **Browser → HTTPS origin directly** — the cert won't match the proxy
  host, so the browser refuses. For client-side bad-network testing use the
  Playwright slow-network test (`e2e/tests/slow-network.spec.ts`) or
  OS-level `tc netem` (Linux) instead.

## Don't forget to clean up

`./network-chaos.sh clear` (or `destroy`) when you're done, and point the
server's dependency hosts back at the real upstreams. Never run against
production.
