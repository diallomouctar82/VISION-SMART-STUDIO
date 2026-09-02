begin;

create or replace function private.studio_is_workspace_creator(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.studio_workspaces workspace
      where workspace.id = p_workspace_id
        and workspace.created_by = (select auth.uid())
    );
$$;

revoke all on function private.studio_is_workspace_creator(uuid) from public, anon;
grant execute on function private.studio_is_workspace_creator(uuid) to authenticated;

create or replace function private.studio_workspace_has_members(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.studio_workspace_members member
    where member.workspace_id = p_workspace_id
  );
$$;

revoke all on function private.studio_workspace_has_members(uuid) from public, anon;
grant execute on function private.studio_workspace_has_members(uuid) to authenticated;

create or replace function private.studio_enforce_workspace_creation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null or new.created_by <> actor_id then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  if (select count(*) from public.studio_workspaces where created_by = actor_id) >= 5 then
    raise exception 'WORKSPACE_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function private.studio_enforce_workspace_creation() from public, anon, authenticated;

create trigger studio_enforce_workspace_creation
before insert on public.studio_workspaces
for each row execute function private.studio_enforce_workspace_creation();

alter function public.studio_create_workspace(text, text) security invoker;

create policy studio_workspaces_insert on public.studio_workspaces
for insert to authenticated
with check (created_by = (select auth.uid()));

drop policy studio_members_insert on public.studio_workspace_members;
create policy studio_members_insert on public.studio_workspace_members
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (
    private.studio_has_workspace_role(workspace_id, array['admin'])
    or (
      user_id = (select auth.uid())
      and role = 'admin'
      and private.studio_is_workspace_creator(workspace_id)
      and not private.studio_workspace_has_members(workspace_id)
    )
  )
);

create policy studio_settings_insert on public.studio_platform_settings
for insert to authenticated
with check (private.studio_has_workspace_role(workspace_id, array['admin']));

grant insert (name, slug, created_by) on public.studio_workspaces to authenticated;
grant insert (workspace_id, user_id, role, created_by) on public.studio_workspace_members to authenticated;
grant insert (workspace_id) on public.studio_platform_settings to authenticated;

create index studio_connector_secret_workspace_idx on public.studio_connector_bindings (workspace_id, secret_reference_id);
create index studio_hosting_connector_workspace_idx on public.studio_hosting_targets (workspace_id, connector_binding_id);
create index studio_worker_target_workspace_idx on public.studio_workers (workspace_id, hosting_target_id);
create index studio_provider_connector_workspace_idx on public.studio_ai_providers (workspace_id, connector_binding_id);
create index studio_model_provider_workspace_idx on public.studio_ai_models (workspace_id, provider_id);
create index studio_deployment_model_workspace_idx on public.studio_model_deployments (workspace_id, model_id);
create index studio_deployment_worker_workspace_idx on public.studio_model_deployments (workspace_id, worker_id);

commit;
