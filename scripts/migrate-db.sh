#!/usr/bin/env bash
# ===========================================================================
# Tokyo → Frankfurt Supabase migration — database half
#
# Dumps the whole Tokyo Postgres database (schema + data + sequences +
# roles) and restores it into the freshly-provisioned Frankfurt project.
# Run this step FIRST, then run scripts/migrate-storage.ts to copy the
# storage bucket contents, then flip the env vars per docs/MIGRATION.md.
#
# Prereqs:
#   - Supabase CLI (`brew install supabase/tap/supabase` or equivalent)
#   - psql / pg_dump — usually from `brew install postgresql@16`
#   - A .env.migrate file in repo root with:
#       TOKYO_DB_URL=postgresql://postgres:<tokyo-password>@db.<tokyo-ref>.supabase.co:5432/postgres
#       FRANKFURT_DB_URL=postgresql://postgres:<frankfurt-password>@db.<frankfurt-ref>.supabase.co:5432/postgres
#
# Get the connection strings from each project's
#   Supabase dashboard → Project Settings → Database → Connection string
# (pick the "URI" tab, not "Transaction pooler"; for the migration we
# want a direct connection, not the pgbouncer pooler).
#
# Usage:
#   ./scripts/migrate-db.sh
# ===========================================================================
set -euo pipefail

# Resolve repo root regardless of where this script is invoked from.
cd "$(dirname "$0")/.."

if [ ! -f .env.migrate ]; then
  echo "✗ .env.migrate not found. Copy .env.migrate.example to .env.migrate"
  echo "  and fill in TOKYO_DB_URL + FRANKFURT_DB_URL."
  exit 1
fi

# shellcheck disable=SC1091
set -a; source .env.migrate; set +a

: "${TOKYO_DB_URL:?TOKYO_DB_URL is empty in .env.migrate}"
: "${FRANKFURT_DB_URL:?FRANKFURT_DB_URL is empty in .env.migrate}"

DUMP_DIR="./migrate-dumps"
mkdir -p "$DUMP_DIR"
TS="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="$DUMP_DIR/tokyo-dump-$TS.sql"

# ── 1. DUMP TOKYO ──────────────────────────────────────────────────────────
# We dump:
#   public schema — the app's tables, RLS policies, functions
#   auth schema   — user rows (needed so logged-in users stay logged in)
#   storage schema metadata (bucket definitions; the actual files are copied
#                            by migrate-storage.ts)
#
# We EXCLUDE the supabase_migrations schema: migration history is per-project,
# and Frankfurt already has its own (empty). Trying to import Tokyo's
# schema_migrations rows would collide with the CI workflow's state.
#
# --format=plain produces SQL we can pipe straight into psql. --no-owner
# and --no-privileges keep the dump portable — Frankfurt's Supabase role
# names differ from Tokyo's, so we let Frankfurt apply its own ownership.
echo "[1/3] Dumping Tokyo database → $DUMP_FILE"
pg_dump \
  --dbname="$TOKYO_DB_URL" \
  --format=plain \
  --no-owner \
  --no-privileges \
  --no-publications \
  --no-subscriptions \
  --schema=public \
  --schema=auth \
  --schema=storage \
  --exclude-schema=supabase_migrations \
  --file="$DUMP_FILE"

# Rough sanity check — the dump file should be at least a few kilobytes.
SIZE=$(wc -c < "$DUMP_FILE")
if [ "$SIZE" -lt 2048 ]; then
  echo "✗ Dump file is suspiciously small ($SIZE bytes). Aborting."
  exit 1
fi
echo "    dump size: $(du -h "$DUMP_FILE" | cut -f1)"

# ── 2. RESTORE INTO FRANKFURT ──────────────────────────────────────────────
# `psql --set ON_ERROR_STOP=on` aborts on the first error, which is what we
# want: partial restores are worse than no restore.
#
# We pass -v ON_ERROR_STOP=1 instead of --set so it applies before the
# first statement (--set applies per-statement which can miss early errors).
echo "[2/3] Restoring into Frankfurt"
psql "$FRANKFURT_DB_URL" \
  -v ON_ERROR_STOP=1 \
  --quiet \
  --single-transaction \
  --file="$DUMP_FILE" 2>&1 | tee "$DUMP_DIR/restore-$TS.log" \
  || {
    echo "✗ Restore failed — inspect $DUMP_DIR/restore-$TS.log"
    exit 1
  }

# ── 3. VERIFY ROW COUNTS MATCH ─────────────────────────────────────────────
# Fast parity check: for every table in public, compare row count on both
# sides. Mismatches are printed in red; a perfect run prints only the
# summary line at the end.
echo "[3/3] Verifying row counts"
TABLES=$(psql "$FRANKFURT_DB_URL" -At -c "
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
")

MISMATCHES=0
for t in $TABLES; do
  TOKYO_COUNT=$(psql "$TOKYO_DB_URL" -At -c "SELECT COUNT(*) FROM public.\"$t\";" 2>/dev/null || echo "err")
  FRANKFURT_COUNT=$(psql "$FRANKFURT_DB_URL" -At -c "SELECT COUNT(*) FROM public.\"$t\";" 2>/dev/null || echo "err")
  if [ "$TOKYO_COUNT" != "$FRANKFURT_COUNT" ]; then
    echo "    ✗ $t: tokyo=$TOKYO_COUNT frankfurt=$FRANKFURT_COUNT"
    MISMATCHES=$((MISMATCHES + 1))
  else
    printf "    ✓ %-40s %s rows\n" "$t" "$FRANKFURT_COUNT"
  fi
done

if [ "$MISMATCHES" -gt 0 ]; then
  echo ""
  echo "✗ $MISMATCHES table(s) don't match. Frankfurt may be missing data."
  echo "  Inspect $DUMP_DIR/restore-$TS.log for errors."
  exit 1
fi

echo ""
echo "✓ Database migration complete. Tables match. Next step:"
echo "  npx tsx scripts/migrate-storage.ts"
