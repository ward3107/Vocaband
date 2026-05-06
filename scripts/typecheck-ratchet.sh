#!/usr/bin/env bash
# =============================================================================
# typecheck-ratchet.sh — fail CI on REGRESSION, not on the existing backlog
# =============================================================================
#
# Why this exists:
#   `tsc` reports 80+ errors today on this repo, mostly inside files that
#   need their own targeted refactors (sentence-bank field renames,
#   vocabulary-matching after the schema split, App.tsx Supabase typing
#   drift, etc.).  Going from "continue-on-error: true" → "false" outright
#   would block every future PR until that 80-error backlog is gone — not
#   realistic.
#
# Strategy:
#   Treat the current count as a BASELINE.  CI fails only when a PR
#   *increases* the count.  That gives us:
#     - New code is held to a high standard (no new errors allowed)
#     - Old code becomes a measurable backlog (count visible in every CI run)
#     - Each fix ratchets the baseline down (commit the new lower number
#       in the same PR; ratchet never goes back up)
#
# Usage (from repo root):
#   ./scripts/typecheck-ratchet.sh        # CI mode — exits 1 on regression
#   ./scripts/typecheck-ratchet.sh --update  # writes the new lower baseline
#                                            after a backlog cleanup PR
# =============================================================================

set -uo pipefail

BASELINE_FILE=".typecheck-baseline"
CONFIG="tsconfig.ci.json"

if [[ ! -f "$BASELINE_FILE" ]]; then
  echo "ERROR: $BASELINE_FILE missing.  Create it with the current error count." >&2
  exit 2
fi

BASELINE=$(cat "$BASELINE_FILE" | tr -d '[:space:]')
if ! [[ "$BASELINE" =~ ^[0-9]+$ ]]; then
  echo "ERROR: $BASELINE_FILE doesn't contain a number (got: '$BASELINE')." >&2
  exit 2
fi

# Run tsc, count error lines.  We grep for "^src/" / "^vite.config" because
# tsc prints summary lines too ("Found N errors") and we only want the
# per-error rows.
CURRENT=$(npx tsc --noEmit -p "$CONFIG" 2>&1 \
  | grep -cE '^(src/|vite\.config)' \
  || true)

echo "TypeScript errors — baseline: $BASELINE, current: $CURRENT"

if [[ "${1:-}" == "--update" ]]; then
  if [[ "$CURRENT" -gt "$BASELINE" ]]; then
    echo "Refusing to update baseline UPWARD (current $CURRENT > baseline $BASELINE)." >&2
    echo "The ratchet only goes down.  Fix the new errors first." >&2
    exit 1
  fi
  echo "$CURRENT" > "$BASELINE_FILE"
  echo "Baseline updated: $BASELINE → $CURRENT"
  exit 0
fi

if [[ "$CURRENT" -gt "$BASELINE" ]]; then
  echo "" >&2
  echo "❌ TYPECHECK REGRESSION" >&2
  echo "   Baseline: $BASELINE" >&2
  echo "   Current:  $CURRENT" >&2
  echo "   New errors introduced: $((CURRENT - BASELINE))" >&2
  echo "" >&2
  echo "Fix the new errors, OR if you fixed something else (count went" >&2
  echo "down), run: ./scripts/typecheck-ratchet.sh --update" >&2
  echo "and commit the lower baseline in the same PR." >&2
  exit 1
fi

if [[ "$CURRENT" -lt "$BASELINE" ]]; then
  echo ""
  echo "🎉 You fixed $((BASELINE - CURRENT)) error(s) — the ratchet went down."
  echo "   To lock in the win, run:"
  echo "     ./scripts/typecheck-ratchet.sh --update"
  echo "   …and commit the new baseline in this PR."
  echo ""
  # Don't fail — the PR is good.  But surface the win.
fi

echo "✅ No regression."
