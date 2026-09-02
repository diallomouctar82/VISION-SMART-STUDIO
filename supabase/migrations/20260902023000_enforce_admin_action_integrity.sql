begin;

create or replace function private.studio_action_target_exists(
  p_workspace_id uuid,
  p_target_type text,
  p_target_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  return case p_target_type
    when 'connector' then exists (select 1 from public.studio_connector_bindings where workspace_id = p_workspace_id and id = p_target_id)
    when 'hosting_target' then exists (select 1 from public.studio_hosting_targets where workspace_id = p_workspace_id and id = p_target_id)
    when 'worker' then exists (select 1 from public.studio_workers where workspace_id = p_workspace_id and id = p_target_id)
    when 'provider' then exists (select 1 from public.studio_ai_providers where workspace_id = p_workspace_id and id = p_target_id)
    when 'model' then exists (select 1 from public.studio_ai_models where workspace_id = p_workspace_id and id = p_target_id)
    when 'model_deployment' then exists (select 1 from public.studio_model_deployments where workspace_id = p_workspace_id and id = p_target_id)
    else false
  end;
end;
$$;

revoke all on function private.studio_action_target_exists(uuid, text, uuid) from public, anon, authenticated;

create or replace function private.studio_validate_action_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  allowed_actions text[];
begin
  if not private.studio_action_target_exists(new.workspace_id, new.target_type, new.target_id) then
    raise exception 'ACTION_TARGET_INVALID' using errcode = '23503';
  end if;

  allowed_actions := case new.target_type
    when 'connector' then array['authorize', 'health_check', 'activate', 'deactivate', 'upgrade', 'rollback', 'remove']
    when 'hosting_target' then array['health_check', 'activate', 'deactivate', 'maintenance', 'resume', 'remove']
    when 'worker' then array['health_check', 'activate', 'deactivate', 'upgrade', 'maintenance', 'resume', 'remove']
    when 'provider' then array['authorize', 'health_check', 'activate', 'deactivate', 'remove']
    when 'model' then array['verify', 'upgrade', 'rollback', 'remove']
    when 'model_deployment' then array['health_check', 'install', 'verify', 'activate', 'deactivate', 'upgrade', 'rollback', 'maintenance', 'resume', 'remove']
    else array[]::text[]
  end;

  if not (new.action = any(allowed_actions)) then
    raise exception 'ACTION_NOT_ALLOWED_FOR_TARGET' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.studio_validate_action_request() from public, anon, authenticated;

create trigger studio_validate_action_request
before insert on public.studio_action_requests
for each row execute function private.studio_validate_action_request();

create or replace function private.studio_validate_routing_policy()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_model_ids uuid[] := new.preferred_model_ids || new.fallback_model_ids;
begin
  if cardinality(selected_model_ids) <> cardinality(array(select distinct unnest(selected_model_ids))) then
    raise exception 'ROUTING_MODEL_DUPLICATE' using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(selected_model_ids) selected_model_id
    left join public.studio_ai_models model
      on model.id = selected_model_id
      and model.workspace_id = new.workspace_id
    where model.id is null
  ) then
    raise exception 'ROUTING_MODEL_INVALID' using errcode = '23503';
  end if;

  if new.confidentiality_rule in ('internal_only', 'restricted_internal_only') and exists (
    select 1
    from public.studio_ai_models model
    where model.id = any(selected_model_ids)
      and model.hosting_mode <> 'internal'
  ) then
    raise exception 'ROUTING_INTERNAL_MODEL_REQUIRED' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.studio_validate_routing_policy() from public, anon, authenticated;

create trigger studio_validate_routing_policy
before insert or update of preferred_model_ids, fallback_model_ids, confidentiality_rule, workspace_id
on public.studio_routing_policies
for each row execute function private.studio_validate_routing_policy();

create or replace function public.studio_request_transition(
  p_workspace_id uuid,
  p_target_type text,
  p_target_id uuid,
  p_resource_version bigint,
  p_desired_state text,
  p_action text,
  p_environment text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  action_request_id uuid;
begin
  case p_target_type
    when 'connector' then
      update public.studio_connector_bindings set desired_state = p_desired_state
      where workspace_id = p_workspace_id and id = p_target_id and resource_version = p_resource_version;
    when 'hosting_target' then
      update public.studio_hosting_targets set desired_state = p_desired_state
      where workspace_id = p_workspace_id and id = p_target_id and resource_version = p_resource_version;
    when 'worker' then
      update public.studio_workers set desired_state = p_desired_state
      where workspace_id = p_workspace_id and id = p_target_id and resource_version = p_resource_version;
    when 'provider' then
      update public.studio_ai_providers set desired_state = p_desired_state
      where workspace_id = p_workspace_id and id = p_target_id and resource_version = p_resource_version;
    when 'model' then
      update public.studio_ai_models set desired_state = p_desired_state
      where workspace_id = p_workspace_id and id = p_target_id and resource_version = p_resource_version;
    when 'model_deployment' then
      update public.studio_model_deployments set desired_state = p_desired_state
      where workspace_id = p_workspace_id and id = p_target_id and resource_version = p_resource_version;
    else
      raise exception 'TARGET_TYPE_INVALID' using errcode = '22023';
  end case;

  if not found then
    raise exception 'RESOURCE_VERSION_CONFLICT' using errcode = '40001';
  end if;

  insert into public.studio_action_requests (
    workspace_id,
    target_type,
    target_id,
    action,
    environment,
    idempotency_key
  ) values (
    p_workspace_id,
    p_target_type,
    p_target_id,
    p_action,
    p_environment,
    p_idempotency_key
  ) returning id into action_request_id;

  return action_request_id;
end;
$$;

revoke all on function public.studio_request_transition(uuid, text, uuid, bigint, text, text, text, text) from public, anon;
grant execute on function public.studio_request_transition(uuid, text, uuid, bigint, text, text, text, text) to authenticated;

commit;

