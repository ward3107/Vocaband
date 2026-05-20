// scripts/refresh-cloudflare-ips.ts
//
// Fetches the current Cloudflare published IP ranges and rewrites
// `config/cloudflare-ips.ts` to match.  Cloudflare changes the list
// rarely (a handful of new ranges per year), but a stale list is the
// failure mode that turns the Fly ingress allowlist into a self-DoS
// — so we keep the static fallback honest with periodic runs.
//
// Run with:   npx tsx scripts/refresh-cloudflare-ips.ts
//
// Exit codes:
//   0  no change OR file updated successfully
//   1  fetch failed or list looked invalid (we never overwrite the
//      good static file with garbage)

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const CONFIG_PATH = resolve(process.cwd(), "config/cloudflare-ips.ts");

async function fetchList(url: string): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  const body = await res.text();
  return body
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);
}

function formatArray(name: string, items: ReadonlyArray<string>): string {
  const lines = items.map(s => `  "${s}",`).join("\n");
  return `export const ${name}: ReadonlyArray<string> = [\n${lines}\n];`;
}

async function main(): Promise<void> {
  console.log("[refresh-cf-ips] fetching from cloudflare.com…");
  const [v4, v6] = await Promise.all([
    fetchList("https://www.cloudflare.com/ips-v4"),
    fetchList("https://www.cloudflare.com/ips-v6"),
  ]);

  // Sanity-check: a real CF response has at least a dozen v4 ranges
  // and several v6 ranges.  Anything less is almost certainly an
  // upstream hiccup served with a 200.
  if (v4.length < 10 || v6.length < 3) {
    console.error(`[refresh-cf-ips] suspiciously small list (v4=${v4.length} v6=${v6.length}) — not overwriting`);
    process.exit(1);
  }

  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");

  const banner = `// Canonical Cloudflare IP ranges, baked in as the static fallback for
// the Fly ingress allowlist (security-audit-framework module 11).
//
// Source of truth — fetched manually from:
//   https://www.cloudflare.com/ips-v4
//   https://www.cloudflare.com/ips-v6
// Refresh with \`npx tsx scripts/refresh-cloudflare-ips.ts\` and review
// the diff before committing.  Cloudflare publishes a new range
// roughly twice a year, so a stale list is a real-but-low-probability
// failure mode — the runtime refresh below handles the gap.
//
// LAST_REFRESHED_UTC is consumed by CI to flag stale lists; bump it
// whenever you re-run the refresh script.`;

  const file = [
    banner,
    "",
    `export const LAST_REFRESHED_UTC = "${now}";`,
    "",
    formatArray("CLOUDFLARE_IPV4_RANGES", v4),
    "",
    formatArray("CLOUDFLARE_IPV6_RANGES", v6),
    "",
  ].join("\n");

  // Diff before write so the operator can confirm there's an actual
  // change before commit time (the script is otherwise idempotent).
  const current = await readFile(CONFIG_PATH, "utf-8").catch(() => "");
  if (current === file) {
    console.log("[refresh-cf-ips] no change — list is already current.");
    return;
  }

  await writeFile(CONFIG_PATH, file, "utf-8");
  console.log(`[refresh-cf-ips] updated ${CONFIG_PATH}: ${v4.length} v4 + ${v6.length} v6 ranges`);
}

main().catch(err => {
  console.error("[refresh-cf-ips] failed:", err);
  process.exit(1);
});
