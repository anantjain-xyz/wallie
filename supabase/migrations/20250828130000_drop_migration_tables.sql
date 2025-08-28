-- Drop migration-related tables that are no longer needed
-- These were used by the old migration system and are now managed by Supabase

-- Drop the sequence first (it depends on the table)
DROP SEQUENCE IF EXISTS "public"."atdatabases_migrations_applied_id_seq" CASCADE;

-- Drop the migration tables
DROP TABLE IF EXISTS "public"."atdatabases_migrations_applied" CASCADE;
DROP TABLE IF EXISTS "public"."atdatabases_migrations_version" CASCADE;