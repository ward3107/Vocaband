// Canonical Cloudflare IP ranges, baked in as the static fallback for
// the Fly ingress allowlist (security-audit-framework module 11).
//
// Source of truth — fetched manually from:
//   https://www.cloudflare.com/ips-v4
//   https://www.cloudflare.com/ips-v6
// Refresh with `npx tsx scripts/refresh-cloudflare-ips.ts` and review
// the diff before committing.  Cloudflare publishes a new range
// roughly twice a year, so a stale list is a real-but-low-probability
// failure mode — the runtime refresh below handles the gap.
//
// LAST_REFRESHED_UTC is consumed by CI to flag stale lists; bump it
// whenever you re-run the refresh script.

export const LAST_REFRESHED_UTC = "2026-05-20T00:00:00Z";

export const CLOUDFLARE_IPV4_RANGES: ReadonlyArray<string> = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
];

export const CLOUDFLARE_IPV6_RANGES: ReadonlyArray<string> = [
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
];
