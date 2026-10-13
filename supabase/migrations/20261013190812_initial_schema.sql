-- ENG content hub: initial schema
--
-- Access model: an internal agency workspace. Every *active team member* can read and write the
-- shared data (projects, media, approvals…). Being authenticated is not enough: a profile must be
-- marked active, so a stray sign-up can't see anything. Clients will reach approvals through
-- share links in a later migration (no direct table access for anon).

-- ---------------------------------------------------------------------------
-- Private helpers (not exposed through the Data API)
-- ---------------------------------------------------------------------------
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  avatar_url text,
  role text not null default 'editor' check (role in ('admin', 'manager', 'editor')),
  is_active boolean not null default false,
  notification_prefs jsonb not null default '{
    "project_created": true, "content_uploaded": true, "field_changed": true,
    "approval_requested": true, "approval_approved": true, "approval_rejected": true
  }'::jsonb,
  created_at timestamptz not null default now()
);

-- True when the current user is an active team member. SECURITY DEFINER so policies on
-- profiles itself can call it without recursion; lives in the private schema and only reads
-- the caller's own row.
create function private.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active
  );
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active and p.role = 'admin'
  );
$$;

revoke all on function private.is_member() from public;
revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_member() to authenticated;
grant execute on function private.is_admin() to authenticated;

-- New auth user → profile. The very first user becomes an active admin so the workspace can be
-- bootstrapped; everyone after that starts inactive until an admin activates them.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;
  insert into public.profiles (id, name, email, role, is_active)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    case when first_user then 'admin' else 'editor' end,
    first_user
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Members can't promote themselves: only admins may change role / is_active.
create function private.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and not private.is_admin() then
    raise exception 'Only admins can change roles or activate members';
  end if;
  new.id := old.id;
  new.email := old.email;
  return new;
end;
$$;

create trigger guard_profile_update
before update on public.profiles
for each row execute function private.guard_profile_update();

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  number integer,
  title text not null,
  client_id uuid not null references public.clients (id) on delete restrict,
  status text not null default 'New' check (status in (
    'New', 'In Progress', 'In Review', 'Changes Requested', 'Approved', 'Final Video Accepted'
  )),
  type text not null default 'Organic' check (type in ('Organic', 'Ads', 'UGC', 'Podcast', 'Long Form')),
  service text not null default '',
  assignee_id uuid references public.profiles (id) on delete set null,
  approver_id uuid references public.profiles (id) on delete set null,
  owner_id uuid references public.profiles (id) on delete set null,
  due_date timestamptz not null,
  archived boolean not null default false,
  format text,
  video_format text,
  scheduled_at timestamptz,
  channels text[] not null default '{}',
  script text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_client_id_idx on public.projects (client_id);
create index projects_assignee_id_idx on public.projects (assignee_id);
create index projects_approver_id_idx on public.projects (approver_id);
create index projects_owner_id_idx on public.projects (owner_id);
create index projects_archived_created_idx on public.projects (archived, created_at desc);

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger projects_touch_updated_at
before update on public.projects
for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Media (files live in the private "media" storage bucket)
-- ---------------------------------------------------------------------------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in ('video', 'image', 'audio')),
  name text not null,
  mime_type text not null default '',
  size_bytes bigint not null default 0,
  width integer,
  height integer,
  duration_sec numeric,
  storage_path text not null,
  thumbnail_path text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index media_project_id_idx on public.media (project_id);
create index media_uploaded_by_idx on public.media (uploaded_by);

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  project_id uuid not null references public.projects (id) on delete cascade,
  assignee_id uuid references public.profiles (id) on delete set null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);

-- ---------------------------------------------------------------------------
-- Approvals and review comments
-- ---------------------------------------------------------------------------
create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  scope text not null check (scope in ('all', 'content', 'media')),
  include_content boolean not null default false,
  media_ids uuid[] not null default '{}',
  requested_by uuid references public.profiles (id) on delete set null,
  -- Ordered list of {kind: 'user' | 'client', id}
  approvers jsonb not null default '[]'::jsonb,
  -- List of {approver: {kind, id}, decision: 'approved' | 'changes_requested', at}
  decisions jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested')),
  status_after_approval text,
  expires_at timestamptz,
  note text,
  -- Secret used by client share links (later migration)
  share_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now()
);

create index approvals_project_id_idx on public.approvals (project_id);
create index approvals_requested_by_idx on public.approvals (requested_by);

create table public.approval_comments (
  id uuid primary key default gen_random_uuid(),
  approval_id uuid not null references public.approvals (id) on delete cascade,
  item_id text,
  author_id uuid references public.profiles (id) on delete set null,
  -- Display name for authors without a profile (clients via share link)
  author_name text,
  body text not null default '',
  timestamp_sec numeric,
  drawing jsonb,
  -- List of {id, name, mimeType, sizeBytes, path} in the "attachments" bucket
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index approval_comments_approval_id_idx on public.approval_comments (approval_id);
create index approval_comments_author_id_idx on public.approval_comments (author_id);

-- ---------------------------------------------------------------------------
-- Notifications: a team-wide activity feed + per-user read receipts
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null check (type in (
    'project_created', 'content_uploaded', 'field_changed',
    'approval_requested', 'approval_approved', 'approval_rejected'
  )),
  project_id uuid references public.projects (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index notifications_created_at_idx on public.notifications (created_at desc);
create index notifications_project_id_idx on public.notifications (project_id);
create index notifications_actor_id_idx on public.notifications (actor_id);

create table public.notification_reads (
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create index notification_reads_user_id_idx on public.notification_reads (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.media enable row level security;
alter table public.tasks enable row level security;
alter table public.approvals enable row level security;
alter table public.approval_comments enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

-- Profiles: members see the team; you can always see and edit your own row (role/is_active are
-- guarded by trigger); admins can edit anyone.
create policy "members read profiles" on public.profiles for select to authenticated
  using ((select private.is_member()) or id = (select auth.uid()));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
create policy "admins update profiles" on public.profiles for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Shared workspace tables: full access for active members only.
create policy "members all" on public.clients for all to authenticated
  using ((select private.is_member())) with check ((select private.is_member()));
create policy "members all" on public.projects for all to authenticated
  using ((select private.is_member())) with check ((select private.is_member()));
create policy "members all" on public.media for all to authenticated
  using ((select private.is_member())) with check ((select private.is_member()));
create policy "members all" on public.tasks for all to authenticated
  using ((select private.is_member())) with check ((select private.is_member()));
create policy "members all" on public.approvals for all to authenticated
  using ((select private.is_member())) with check ((select private.is_member()));

-- Comments: members read all; you can only post as yourself and delete your own.
create policy "members read comments" on public.approval_comments for select to authenticated
  using ((select private.is_member()));
create policy "members add own comments" on public.approval_comments for insert to authenticated
  with check ((select private.is_member()) and author_id = (select auth.uid()));
create policy "delete own comments" on public.approval_comments for delete to authenticated
  using ((select private.is_member()) and author_id = (select auth.uid()));

-- Notifications: members read the feed; you can only create events as yourself.
create policy "members read notifications" on public.notifications for select to authenticated
  using ((select private.is_member()));
create policy "members add own notifications" on public.notifications for insert to authenticated
  with check ((select private.is_member()) and actor_id = (select auth.uid()));

-- Read receipts are private to each user.
create policy "own reads select" on public.notification_reads for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own reads insert" on public.notification_reads for insert to authenticated
  with check ((select private.is_member()) and user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Data API exposure: tables are not exposed automatically, so grant explicitly.
-- (anon gets nothing; RLS above decides which rows authenticated users see.)
-- ---------------------------------------------------------------------------
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.media to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.approvals to authenticated;
grant select, insert, delete on public.approval_comments to authenticated;
grant select, insert on public.notifications to authenticated;
grant select, insert on public.notification_reads to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private buckets; members read/write through signed URLs.
-- (Per-file size limits depend on the plan: 50 MB on Free.)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', false), ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "members read files" on storage.objects for select to authenticated
  using (bucket_id in ('media', 'attachments') and (select private.is_member()));
create policy "members upload files" on storage.objects for insert to authenticated
  with check (bucket_id in ('media', 'attachments') and (select private.is_member()));
create policy "members update files" on storage.objects for update to authenticated
  using (bucket_id in ('media', 'attachments') and (select private.is_member()))
  with check (bucket_id in ('media', 'attachments') and (select private.is_member()));
create policy "members delete files" on storage.objects for delete to authenticated
  using (bucket_id in ('media', 'attachments') and (select private.is_member()));
