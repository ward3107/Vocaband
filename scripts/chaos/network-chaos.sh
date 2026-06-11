#!/usr/bin/env bash
#
# network-chaos.sh — drive Toxiproxy to inject network faults in front of
# a TCP dependency, so you can watch how the app DEGRADES (not just how it
# behaves on a perfect network). Chaos testing = deliberately break a
# dependency and confirm the system fails gracefully instead of hanging.
#
# Best targets (Toxiproxy is L4 TCP, see the TLS note in README.md):
#   * server.ts → Supabase  ("what happens to a live class if the DB
#     goes slow / drops for 10s mid-round?")
#   * server.ts → Redis     (socket.io adapter)
#   * a LOCAL dev origin you hit over plain HTTP
#
# Prereqs (one-time, see scripts/chaos/README.md):
#   * toxiproxy-server running (API on :8474)
#   * toxiproxy-cli on PATH
#
# Usage:
#   # 1. create the proxy (point your client/server at $LISTEN instead of upstream)
#   ./network-chaos.sh create db.<ref>.supabase.co:5432 127.0.0.1:6543
#
#   # 2. inject a fault, run your scenario, then clear it
#   ./network-chaos.sh latency      # +800ms ±400ms jitter — "laggy Wi-Fi"
#   ./network-chaos.sh slow         # trickle bandwidth — "congested classroom"
#   ./network-chaos.sh timeout      # connections hang then fail — "DB unreachable"
#   ./network-chaos.sh down         # 100% rejected — "dependency is dead"
#   ./network-chaos.sh clear        # remove all toxics (back to healthy)
#   ./network-chaos.sh destroy      # tear the proxy down entirely
#
# Env overrides: PROXY (name, default "vocaband-chaos"), API (toxiproxy
# API addr, default http://127.0.0.1:8474).
set -euo pipefail

PROXY="${PROXY:-vocaband-chaos}"
API="${API:-http://127.0.0.1:8474}"
CLI=(toxiproxy-cli -h "$API")

cmd="${1:-}"

case "$cmd" in
  create)
    upstream="${2:?usage: create <upstream host:port> <listen host:port>}"
    listen="${3:?usage: create <upstream host:port> <listen host:port>}"
    "${CLI[@]}" create "$PROXY" --listen "$listen" --upstream "$upstream"
    echo "Proxy '$PROXY' up: point your client at $listen → $upstream"
    ;;
  latency)
    "${CLI[@]}" toxic add "$PROXY" -t latency -a latency=800 -a jitter=400 2>/dev/null \
      || "${CLI[@]}" toxic update "$PROXY" -n latency_downstream -a latency=800 -a jitter=400
    echo "Injected +800ms ±400ms latency."
    ;;
  slow)
    # 16 KB/s throughput — simulates a saturated school uplink.
    "${CLI[@]}" toxic add "$PROXY" -t bandwidth -a rate=16 2>/dev/null \
      || "${CLI[@]}" toxic update "$PROXY" -n bandwidth_downstream -a rate=16
    echo "Throttled to 16 KB/s."
    ;;
  timeout)
    "${CLI[@]}" toxic add "$PROXY" -t timeout -a timeout=5000 2>/dev/null \
      || "${CLI[@]}" toxic update "$PROXY" -n timeout_downstream -a timeout=5000
    echo "Connections will hang ~5s then fail."
    ;;
  down)
    # Drop the proxy entirely → every connection refused.
    "${CLI[@]}" toggle "$PROXY"
    echo "Toggled proxy enabled/disabled (run again to restore)."
    ;;
  clear)
    for t in $("${CLI[@]}" inspect "$PROXY" | awk '/Toxics/{f=1;next} f&&/^[a-z]/{print $1}'); do
      "${CLI[@]}" toxic remove "$PROXY" -n "$t" || true
    done
    echo "Cleared all toxics on '$PROXY'."
    ;;
  destroy)
    "${CLI[@]}" delete "$PROXY"
    echo "Deleted proxy '$PROXY'."
    ;;
  *)
    grep '^#' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
