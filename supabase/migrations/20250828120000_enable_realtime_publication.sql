-- Ensure tables are added to the supabase_realtime publication (idempotent)
DO $$
DECLARE
  v_pubname text := 'supabase_realtime';
  v_item text;
  v_schema text;
  v_table text;
  v_targets text[] := ARRAY[
    'public.issue',
    'public.workspace',
    'public.app_user',
    'public.comment',
    'public.github_repository',
    'public.github_installation',
    'public.issue_link'
  ];
BEGIN
  -- Create publication if missing (local dev safety)
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = v_pubname) THEN
    EXECUTE format('CREATE PUBLICATION %I', v_pubname);
  END IF;

  FOREACH v_item IN ARRAY v_targets LOOP
    v_schema := split_part(v_item, '.', 1);
    v_table := split_part(v_item, '.', 2);

    -- Skip if table does not exist
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = v_schema AND c.relname = v_table AND c.relkind = 'r'
    ) THEN
      CONTINUE;
    END IF;

    -- Add to publication if not already present
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = v_pubname AND schemaname = v_schema AND tablename = v_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION %I ADD TABLE ONLY %I.%I', v_pubname, v_schema, v_table);
    END IF;
  END LOOP;
END $$;

