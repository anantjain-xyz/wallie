-- Enable Row Level Security (RLS) across tables and add workspace-based policies
-- Assumptions:
-- - Authenticated JWTs include an `email` claim available via request.jwt.claims
-- - Workspace membership is represented by rows in public.app_user (email, workspace_id)
-- - All rows include a `workspace_id` column except `workspace` and migration tables

-- Helper: current user's email from JWT (lowercased)
create or replace function public.current_user_email()
returns text
language sql
stable
set search_path = ''
as $$
  select lower((current_setting('request.jwt.claims', true)::jsonb ->> 'email'))
$$;

-- Helper: set-returning function of all workspace_ids the current user belongs to
-- SECURITY DEFINER avoids RLS recursion when referencing app_user inside policies
create or replace function public.current_user_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select au.workspace_id
  from public.app_user au
  where lower(au.email) = public.current_user_email()
$$;

-- Grant execute to web roles
grant execute on function public.current_user_email() to anon, authenticated;
grant execute on function public.current_user_workspace_ids() to anon, authenticated;

-- Utility predicate used in multiple policies
-- Note: use inline subqueries to avoid dependency on views

-- Enable RLS and add policies for tables with a workspace_id column
do $$
declare
  tbl record;
begin
  for tbl in
    select table_schema, table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'workspace_id'
      and table_name <> 'app_user'
  loop
    execute format('alter table %I.%I enable row level security;', tbl.table_schema, tbl.table_name);

    -- SELECT policy
    execute format(
      'create policy %I on %I.%I for select using (workspace_id in (select public.current_user_workspace_ids()));',
      'rls_select_by_workspace', tbl.table_schema, tbl.table_name
    );

    -- INSERT policy
    execute format(
      'create policy %I on %I.%I for insert with check (workspace_id in (select public.current_user_workspace_ids()));',
      'rls_insert_by_workspace', tbl.table_schema, tbl.table_name
    );

    -- UPDATE policy
    execute format(
      'create policy %I on %I.%I for update using (workspace_id in (select public.current_user_workspace_ids())) with check (workspace_id in (select public.current_user_workspace_ids()));',
      'rls_update_by_workspace', tbl.table_schema, tbl.table_name
    );

    -- DELETE policy
    execute format(
      'create policy %I on %I.%I for delete using (workspace_id in (select public.current_user_workspace_ids()));',
      'rls_delete_by_workspace', tbl.table_schema, tbl.table_name
    );
  end loop;
end $$;

-- Special-case tables without workspace_id
-- workspace: use id instead of workspace_id
alter table public.workspace enable row level security;
do $$
begin
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'workspace' and policyname = 'rls_select_by_membership';
  if not found then
    create policy rls_select_by_membership on public.workspace for select using (id in (select public.current_user_workspace_ids()));
  end if;

  perform 1 from pg_policies where schemaname = 'public' and tablename = 'workspace' and policyname = 'rls_update_by_membership';
  if not found then
    create policy rls_update_by_membership on public.workspace for update using (id in (select public.current_user_workspace_ids())) with check (id in (select public.current_user_workspace_ids()));
  end if;
end $$;

-- app_user: allow visibility to users in the same workspace(s)
alter table public.app_user enable row level security;
do $$
begin
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'app_user' and policyname = 'rls_select_same_workspace';
  if not found then
    create policy rls_select_same_workspace on public.app_user for select using (workspace_id in (select public.current_user_workspace_ids()));
  end if;

  perform 1 from pg_policies where schemaname = 'public' and tablename = 'app_user' and policyname = 'rls_update_same_workspace';
  if not found then
    create policy rls_update_same_workspace on public.app_user for update using (workspace_id in (select public.current_user_workspace_ids())) with check (workspace_id in (select public.current_user_workspace_ids()));
  end if;

  perform 1 from pg_policies where schemaname = 'public' and tablename = 'app_user' and policyname = 'rls_insert_same_workspace';
  if not found then
    create policy rls_insert_same_workspace on public.app_user for insert with check (workspace_id in (select public.current_user_workspace_ids()));
  end if;

  perform 1 from pg_policies where schemaname = 'public' and tablename = 'app_user' and policyname = 'rls_delete_same_workspace';
  if not found then
    create policy rls_delete_same_workspace on public.app_user for delete using (workspace_id in (select public.current_user_workspace_ids()));
  end if;
end $$;

-- Note: Leave migration metadata tables without RLS changes
