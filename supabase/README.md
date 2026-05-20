# Supabase CLI

This project uses the Supabase CLI through npm scripts.

The scripts use `.supabase-home/` as a local CLI cache/config directory. It is
git-ignored.

## Backups

Set `SUPABASE_DB_URL` to the Supabase direct database connection string before
running a backup. Do not commit that value.

```bash
SUPABASE_DB_URL='postgresql://postgres:password@db.project-ref.supabase.co:5432/postgres' npm run backup:all
```

Or create a local ignored `.env.backup.local` file:

```bash
SUPABASE_DB_URL='postgresql://postgres:password@db.project-ref.supabase.co:5432/postgres'
```

Available commands:

```bash
npm run backup:schema
npm run backup:data
npm run backup:all
```

Backups are written to `backups/supabase/`, which is git-ignored.
