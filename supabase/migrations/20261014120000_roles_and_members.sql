-- Roles: a single admin (the agency owner) plus manager, editor and client accounts.
--
-- * Only the admin creates accounts, through the server-side /api/admin/members endpoint
--   (it uses the secret key and passes the role in app_metadata, which users can't set).
-- * Only the admin and managers create projects.
-- * Client accounts are linked to a client and kept out of the internal workspace until the
--   client portal exists (is_member() is false for them).

-- ---------------------------------------------------------------------------
-- Profiles: client role, client link, exactly one admin
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'manager', 'editor', 'client'));

alter table public.profiles
  add column client_id uuid references public.clients (id) on delete set null;
create index profiles_client_id_idx on public.profiles (client_id);

create unique index profiles_single_admin on public.profiles ((true)) where role = 'admin';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Team member = active admin / manager / editor. Clients are not part of the workspace.
create or replace function private.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active and p.role <> 'client'
  );
$$;

create function private.can_create_projects()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active and p.role in ('admin', 'manager')
  );
$$;

revoke all on function private.can_create_projects() from public;
grant execute on function private.can_create_projects() to authenticated;

-- ---------------------------------------------------------------------------
-- New accounts: admin-created users carry their role in app_metadata and start active.
-- Self sign-ups (no app_metadata role) still start as inactive editors.
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_user boolean;
  invited_role text := new.raw_app_meta_data ->> 'role';
  invited boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;
  invited := not first_user and coalesce(invited_role in ('manager', 'editor', 'client'), false);
  insert into public.profiles (id, name, email, role, is_active, client_id)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    case when first_user then 'admin' when invited then invited_role else 'editor' end,
    first_user or invited,
    case when invited and invited_role = 'client'
      then nullif(new.raw_app_meta_data ->> 'client_id', '')::uuid end
  );
  return new;
end;
$$;

-- Only the admin changes roles, activation or client links, and the admin account itself
-- can't be demoted or deactivated (that would lock everyone out of member management).
create or replace function private.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role
      or new.is_active is distinct from old.is_active
      or new.client_id is distinct from old.client_id)
     and not private.is_admin() then
    raise exception 'Only the admin can change roles, access or client links';
  end if;
  if old.role = 'admin' and (new.role <> 'admin' or not new.is_active) then
    raise exception 'The admin account can''t be demoted or deactivated';
  end if;
  new.id := old.id;
  new.email := old.email;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Projects: everyone on the team works on them; only admin / managers create them.
-- ---------------------------------------------------------------------------
drop policy "members all" on public.projects;
create policy "members read projects" on public.projects for select to authenticated
  using ((select private.is_member()));
create policy "managers create projects" on public.projects for insert to authenticated
  with check ((select private.can_create_projects()));
create policy "members update projects" on public.projects for update to authenticated
  using ((select private.is_member())) with check ((select private.is_member()));
create policy "members delete projects" on public.projects for delete to authenticated
  using ((select private.is_member()));

-- ---------------------------------------------------------------------------
-- The /api/admin/members endpoint (secret key → service_role) checks the caller's profile
-- and validates the client link.
-- ---------------------------------------------------------------------------
grant select on public.profiles to service_role;
grant select on public.clients to service_role;
