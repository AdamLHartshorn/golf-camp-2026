#!/usr/bin/env bash
set -euo pipefail

backup_type="${1:-all}"
timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="backups/supabase"
export HOME="${SUPABASE_CLI_HOME:-$PWD/.supabase-home}"

mkdir -p "$HOME"

if [[ -f ".env.backup.local" ]]; then
  set -a
  . ".env.backup.local"
  set +a
fi

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL is required."
  echo "Use the Supabase direct database connection string, percent-encoded if needed."
  echo "Example: SUPABASE_DB_URL='postgresql://postgres:password@db.project-ref.supabase.co:5432/postgres' npm run backup:all"
  exit 1
fi

mkdir -p "$backup_dir"

case "$backup_type" in
  schema)
    supabase db dump \
      --db-url "$SUPABASE_DB_URL" \
      --schema public \
      --file "$backup_dir/schema-$timestamp.sql"
    ;;
  data)
    supabase db dump \
      --db-url "$SUPABASE_DB_URL" \
      --data-only \
      --use-copy \
      --schema public \
      --file "$backup_dir/data-$timestamp.sql"
    ;;
  all)
    supabase db dump \
      --db-url "$SUPABASE_DB_URL" \
      --schema public \
      --file "$backup_dir/schema-$timestamp.sql"

    supabase db dump \
      --db-url "$SUPABASE_DB_URL" \
      --data-only \
      --use-copy \
      --schema public \
      --file "$backup_dir/data-$timestamp.sql"
    ;;
  *)
    echo "Unknown backup type: $backup_type"
    echo "Use one of: schema, data, all"
    exit 1
    ;;
esac

echo "Supabase backup complete: $backup_dir"
