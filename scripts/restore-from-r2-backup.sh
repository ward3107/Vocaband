#!/usr/bin/env bash
# =============================================================================
# restore-from-r2-backup.sh
#
# Manual restore-drill helper. Downloads the latest (or a specified)
# backup from R2 and restores it into a target Postgres database.
#
# Two intended uses:
#   1. Bi-annual DR drill (docs/DISASTER-RECOVERY.md § 2). Restore into
#      a throwaway staging Supabase project, verify row counts, delete
#      the staging project. File results in docs/postmortems/.
#   2. Real disaster recovery — restore into a freshly-created Supabase
#      project, then update VITE_SUPABASE_URL/KEY + SUPABASE_SERVICE_ROLE_KEY
#      in Cloudflare Pages + Fly.io secrets to point clients at the new
#      project.
#
# Required env (or pass via flags):
#   SUPABASE_DB_URL_TARGET   postgres://... — DESTINATION database (NOT prod)
#   R2_ACCOUNT_ID
#   R2_ACCESS_KEY_ID
#   R2_SECRET_ACCESS_KEY
#   R2_BACKUP_BUCKET         e.g. vocaband-backups
#
# Optional:
#   BACKUP_KEY    e.g. db-backups/2026/supabase-pg-2026-05-17.dump.gz
#                 (default: latest object in the bucket prefix)
#
# Safety: refuses to run if SUPABASE_DB_URL_TARGET points at the same
# hostname as the production project (heuristic check; not bulletproof —
# always double-check before pressing y).
# =============================================================================

set -euo pipefail

SUPABASE_DB_URL_TARGET="${SUPABASE_DB_URL_TARGET:-}"
R2_ACCOUNT_ID="${R2_ACCOUNT_ID:-}"
R2_BACKUP_BUCKET="${R2_BACKUP_BUCKET:-vocaband-backups}"
BACKUP_KEY="${BACKUP_KEY:-}"

if [[ -z "$SUPABASE_DB_URL_TARGET" ]]; then
  echo "ERROR: SUPABASE_DB_URL_TARGET must be set (the DESTINATION database)."
  echo "       Don't point this at production. Use a fresh staging project."
  exit 1
fi
if [[ -z "$R2_ACCOUNT_ID" || -z "${R2_ACCESS_KEY_ID:-}" || -z "${R2_SECRET_ACCESS_KEY:-}" ]]; then
  echo "ERROR: R2_ACCOUNT_ID + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY must be set."
  exit 1
fi

# aws-cli reads AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY. R2 doesn't care
# about region, but the cli requires *some* value.
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="auto"

R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

# ── Production safety check ────────────────────────────────────────────
# auth.vocaband.com is the prod custom domain. If the target host string
# contains it OR contains the prod ref (TODO: fill in after rotation), bail.
TARGET_HOST=$(echo "$SUPABASE_DB_URL_TARGET" | sed -E 's#^[^@]+@([^:/]+).*#\1#')
echo "Target host: $TARGET_HOST"
if echo "$TARGET_HOST" | grep -qiE "(auth\.vocaband\.com|vocaband-prod)"; then
  echo "REFUSED: target host looks like production. Aborting."
  exit 2
fi

# ── Pick a backup ──────────────────────────────────────────────────────
if [[ -z "$BACKUP_KEY" ]]; then
  echo "▶ No BACKUP_KEY given — picking the latest .dump.gz in s3://$R2_BACKUP_BUCKET/db-backups/"
  BACKUP_KEY=$(aws s3 ls "s3://$R2_BACKUP_BUCKET/db-backups/" \
    --endpoint-url "$R2_ENDPOINT" \
    --recursive \
    | grep '\.dump\.gz$' \
    | sort -k1,2 \
    | tail -1 \
    | awk '{print $4}')
  if [[ -z "$BACKUP_KEY" ]]; then
    echo "ERROR: no backups found at s3://$R2_BACKUP_BUCKET/db-backups/"
    exit 3
  fi
fi
echo "▶ Selected backup: $BACKUP_KEY"

# ── Confirm before destructive restore ─────────────────────────────────
echo
echo "About to:"
echo "  1. Download s3://$R2_BACKUP_BUCKET/$BACKUP_KEY"
echo "  2. Restore it into $TARGET_HOST (DESTRUCTIVE — will overwrite matching objects)"
echo
read -rp "Type 'YES' to proceed: " CONFIRM
if [[ "$CONFIRM" != "YES" ]]; then
  echo "Cancelled."
  exit 0
fi

# ── Download ──────────────────────────────────────────────────────────
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

LOCAL_GZ="$TMPDIR/$(basename "$BACKUP_KEY")"
LOCAL_DUMP="${LOCAL_GZ%.gz}"

echo "▶ Downloading to $LOCAL_GZ"
aws s3 cp "s3://$R2_BACKUP_BUCKET/$BACKUP_KEY" "$LOCAL_GZ" \
  --endpoint-url "$R2_ENDPOINT" \
  --no-progress

echo "▶ Decompressing"
gunzip "$LOCAL_GZ"

SIZE_BYTES=$(stat -c%s "$LOCAL_DUMP" 2>/dev/null || stat -f%z "$LOCAL_DUMP")
echo "▶ Decompressed size: $SIZE_BYTES bytes"

# ── Restore ───────────────────────────────────────────────────────────
echo "▶ Running pg_restore against target"
# --clean drops existing objects before recreating; --if-exists makes
# that safe on a fresh empty DB. --no-owner / --no-acl match what we
# dumped with.
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --schema=public \
  --schema=auth \
  --dbname="$SUPABASE_DB_URL_TARGET" \
  "$LOCAL_DUMP"

# ── Verify ────────────────────────────────────────────────────────────
echo "▶ Sanity check: counting rows in critical tables"
psql "$SUPABASE_DB_URL_TARGET" -c "
  SELECT relname AS table,
         n_live_tup AS row_count
    FROM pg_stat_user_tables
   WHERE schemaname = 'public'
     AND relname IN ('users','classes','assignments','progress','audit_log','consent_log')
   ORDER BY relname;
"

echo
echo "✅ Restore complete."
echo "   Backup:        $BACKUP_KEY"
echo "   Target host:   $TARGET_HOST"
echo "   Next:          file results in docs/postmortems/$(date -u +%Y-%m-%d)-dr-drill.md"
