#!/usr/bin/env node
/**
 * Entry static-closure guardrail.
 *
 * The entry chunk (`assets/index-*.js`) and everything it STATICALLY imports
 * loads on every page — including the cold, logged-out landing — before any
 * dynamic import runs. Keeping heavy vendors OUT of that closure is the
 * single biggest landing/TBT lever (see docs/perf-audit-2026-06-03.md).
 *
 * History: rolldown's chunking repeatedly hoisted vendor code onto every page
 * as a side effect of how it places shared CJS-interop modules and the
 * `__vitePreload` helper — React core leaked in via the `lucide` chunk, and
 * all of supabase-js via the preload helper. The fix (codeSplitting.groups in
 * vite.config.ts) pins those shared modules to a stable home. This check
 * asserts the fix holds so a future refactor can't silently re-hoist them.
 *
 * Run after `npm run build`:  node scripts/check-entry-closure.mjs
 * Exits non-zero (CI-failing) if a forbidden vendor reappears in the entry
 * closure, or if the closure grows past the budget.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST = 'dist';
const ASSETS = path.join(DIST, 'assets');

// Vendors that must never sit on the every-page static graph. They all load
// on-demand: supabase on login/App-mount, lucide with the views that render
// icons, sentry on idle, the vocabulary corpora when a game needs them.
const FORBIDDEN = [/^supabase-/, /^lucide-/, /^sentry-/, /^vocabulary(-hebrew)?-/];

// Budget for the whole entry static closure (gzipped). Today it's ~66 kB
// (react-vendor + entry + runtime + preload helper). The pre-fix artifact
// pushed it to ~132 kB. 80 kB leaves headroom for React growth while still
// tripping long before a full vendor (~50 kB) could hoist back in.
const BUDGET_KB = 80;

const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const entry = [...html.matchAll(/src="\/assets\/(index-[\w-]+\.js)"/g)].map((m) => m[1]);
if (entry.length === 0) {
  console.error('[check-entry-closure] no entry chunk found in dist/index.html — did the build run?');
  process.exit(1);
}

// Walk static `import`/`export … from "./chunk.js"` edges transitively.
const RE = /(?:^|[;{}\s])(?:import|export)\s*(?:[\w*{}\s,]+from\s*)?["']\.\/([\w.-]+\.js)["']/g;
const seen = new Set();
const queue = [...entry];
let gz = 0;
while (queue.length) {
  const name = queue.shift();
  if (seen.has(name)) continue;
  seen.add(name);
  let code;
  try {
    code = fs.readFileSync(path.join(ASSETS, name), 'utf8');
  } catch {
    continue;
  }
  gz += zlib.gzipSync(code).length;
  for (const m of code.matchAll(RE)) if (!seen.has(m[1])) queue.push(m[1]);
}

const closureKb = gz / 1024;
const offenders = [...seen].filter((n) => FORBIDDEN.some((re) => re.test(n)));

console.log(
  `[check-entry-closure] ${closureKb.toFixed(1)} kB gz across ${seen.size} chunks: ${[...seen].join(', ')}`,
);

let failed = false;
if (offenders.length) {
  console.error(`[check-entry-closure] FAIL: forbidden vendor(s) hoisted onto the entry: ${offenders.join(', ')}`);
  console.error('  A shared module (React core / __vitePreload / tslib) likely leaked into a vendor chunk again.');
  console.error('  See codeSplitting.groups in vite.config.ts and docs/perf-audit-2026-06-03.md.');
  failed = true;
}
if (closureKb > BUDGET_KB) {
  console.error(`[check-entry-closure] FAIL: entry closure ${closureKb.toFixed(1)} kB > ${BUDGET_KB} kB budget.`);
  failed = true;
}

process.exit(failed ? 1 : 0);
