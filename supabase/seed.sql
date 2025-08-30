-- Seed for local development
-- Using dev email: anant@wallie.app
-- 2) Then run one of:
--    - supabase db reset          -- resets local DB, runs migrations, then this seed
--    - supabase db execute --file supabase/seed.sql   -- runs seed without reset

-- Ensure a stable local workspace exists
insert into public.workspace (id, name, url)
select uuid_generate_v4(), 'Local', 'local'
where not exists (
  select 1 from public.workspace where url = 'local'
);

-- Ensure an app_user that maps to your Clerk dev email
with ws as (
  select id from public.workspace where url = 'local' limit 1
)
insert into public.app_user (id, email, username, full_name, profile_picture, workspace_id)
select uuid_generate_v4(), 'anant@wallie.app', 'anant', 'Anant', null, ws.id
from ws
on conflict (workspace_id, email)
do update set
  username = excluded.username,
  full_name = excluded.full_name,
  profile_picture = excluded.profile_picture,
  modified = now();

-- Ensure the Wallie system user exists for the local workspace (matches API behavior)
with ws as (
  select id from public.workspace where url = 'local' limit 1
)
insert into public.app_user (id, email, username, full_name, profile_picture, workspace_id)
select
  uuid_generate_v4(),
  'agent@wallie.app',
  'wallie',
  'Wallie',
  'https://wallie.sfo2.digitaloceanspaces.com/production/workspace-avatars/4ddf8d2f-fce0-433f-af07-c970b43db995.png',
  ws.id
from ws
on conflict (workspace_id, email)
do update set
  username = excluded.username,
  full_name = excluded.full_name,
  profile_picture = excluded.profile_picture,
  modified = now();

-- Seed a few issues for the board/list
with ws as (
  select id from public.workspace where url = 'local' limit 1
), au as (
  select id from public.app_user where email = 'anant@wallie.app' limit 1
)
insert into public.issue (
  id, title, description, priority, status, kanbanorder, creator_id, workspace_id,
  github_repository_id, assignee_id, estimate, external_id, plan, design
)
select
  uuid_generate_v4(), 'First task', '', 'none', 'backlog', 'a', au.id, ws.id,
  null, null, null, 1, null, null
from ws, au
where not exists (
  select 1 from public.issue where external_id = 1 and workspace_id = ws.id
);

with ws as (
  select id from public.workspace where url = 'local' limit 1
), au as (
  select id from public.app_user where email = 'anant@wallie.app' limit 1
)
insert into public.issue (
  id, title, description, priority, status, kanbanorder, creator_id, workspace_id,
  github_repository_id, assignee_id, estimate, external_id, plan, design
)
select
  uuid_generate_v4(), 'Second task', 'Try dragging me on the board', 'low', 'todo', 'b', au.id, ws.id,
  null, null, 1, 2, null, null
from ws, au
where not exists (
  select 1 from public.issue where external_id = 2 and workspace_id = ws.id
);

with ws as (
  select id from public.workspace where url = 'local' limit 1
), au as (
  select id from public.app_user where email = 'anant@wallie.app' limit 1
)
insert into public.issue (
  id, title, description, priority, status, kanbanorder, creator_id, workspace_id,
  github_repository_id, assignee_id, estimate, external_id, plan, design
)
select
  uuid_generate_v4(), 'Third task', 'Has an estimate', 'medium', 'in_progress', 'c', au.id, ws.id,
  null, null, 3, 3, null, null
from ws, au
where not exists (
  select 1 from public.issue where external_id = 3 and workspace_id = ws.id
);
