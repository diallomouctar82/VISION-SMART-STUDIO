begin;

create or replace function private.studio_is_safe_https_endpoint(p_value text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select p_value is null or (
    char_length(p_value) <= 2048
    and p_value ~ '^https://'
    and p_value !~ '[?#]'
    and p_value !~ '[[:space:][:cntrl:]]'
    and split_part(substring(p_value from 9), '/', 1) <> ''
    and split_part(substring(p_value from 9), '/', 1) !~ '@'
  );
$$;

revoke all on function private.studio_is_safe_https_endpoint(text) from public, anon;
grant execute on function private.studio_is_safe_https_endpoint(text) to authenticated, service_role;

alter table public.studio_connector_bindings
  add constraint studio_connector_endpoint_safe_check
  check (private.studio_is_safe_https_endpoint(endpoint_url)) not valid;
alter table public.studio_hosting_targets
  add constraint studio_hosting_endpoint_safe_check
  check (private.studio_is_safe_https_endpoint(endpoint_url)) not valid;
alter table public.studio_workers
  add constraint studio_worker_endpoint_safe_check
  check (private.studio_is_safe_https_endpoint(endpoint_url)) not valid;
alter table public.studio_ai_providers
  add constraint studio_provider_endpoint_safe_check
  check (private.studio_is_safe_https_endpoint(endpoint_url)) not valid;

alter table public.studio_connector_bindings validate constraint studio_connector_endpoint_safe_check;
alter table public.studio_hosting_targets validate constraint studio_hosting_endpoint_safe_check;
alter table public.studio_workers validate constraint studio_worker_endpoint_safe_check;
alter table public.studio_ai_providers validate constraint studio_provider_endpoint_safe_check;

create or replace function private.studio_jsonb_contains_sensitive_key(p_value jsonb)
returns boolean
language plpgsql
immutable
security definer
set search_path = private, pg_catalog, pg_temp
as $$
declare
  entry record;
  item jsonb;
begin
  if p_value is null then
    return false;
  end if;

  if jsonb_typeof(p_value) = 'object' then
    for entry in select key, value from jsonb_each(p_value)
    loop
      if lower(entry.key) ~ '^(api[_-]?key|access[_-]?token|refresh[_-]?token|auth[_-]?token|token|secret|secret[_-]?value|client[_-]?secret|password|passwd|private[_-]?key|ssh[_-]?(private[_-]?)?key|authorization|credentials?)$' then
        return true;
      end if;
      if private.studio_jsonb_contains_sensitive_key(entry.value) then
        return true;
      end if;
    end loop;
  elsif jsonb_typeof(p_value) = 'array' then
    for item in select value from jsonb_array_elements(p_value)
    loop
      if private.studio_jsonb_contains_sensitive_key(item) then
        return true;
      end if;
    end loop;
  end if;

  return false;
end;
$$;

revoke all on function private.studio_jsonb_contains_sensitive_key(jsonb) from public, anon;
grant execute on function private.studio_jsonb_contains_sensitive_key(jsonb) to authenticated, service_role;

alter table public.studio_connector_bindings
  add constraint studio_connector_configuration_no_secrets_check
  check (not private.studio_jsonb_contains_sensitive_key(configuration)) not valid;
alter table public.studio_hosting_targets
  add constraint studio_hosting_labels_no_secrets_check
  check (not private.studio_jsonb_contains_sensitive_key(labels)) not valid;
alter table public.studio_workers
  add constraint studio_worker_capacity_no_secrets_check
  check (not private.studio_jsonb_contains_sensitive_key(capacity)) not valid;
alter table public.studio_workers
  add constraint studio_worker_usage_no_secrets_check
  check (not private.studio_jsonb_contains_sensitive_key(observed_usage)) not valid;
alter table public.studio_ai_providers
  add constraint studio_provider_configuration_no_secrets_check
  check (not private.studio_jsonb_contains_sensitive_key(configuration)) not valid;
alter table public.studio_ai_models
  add constraint studio_model_requirements_no_secrets_check
  check (not private.studio_jsonb_contains_sensitive_key(resource_requirements)) not valid;
alter table public.studio_model_deployments
  add constraint studio_deployment_configuration_no_secrets_check
  check (not private.studio_jsonb_contains_sensitive_key(runtime_configuration)) not valid;
alter table public.studio_action_requests
  add constraint studio_action_payload_no_secrets_check
  check (not private.studio_jsonb_contains_sensitive_key(request_payload)) not valid;

alter table public.studio_connector_bindings validate constraint studio_connector_configuration_no_secrets_check;
alter table public.studio_hosting_targets validate constraint studio_hosting_labels_no_secrets_check;
alter table public.studio_workers validate constraint studio_worker_capacity_no_secrets_check;
alter table public.studio_workers validate constraint studio_worker_usage_no_secrets_check;
alter table public.studio_ai_providers validate constraint studio_provider_configuration_no_secrets_check;
alter table public.studio_ai_models validate constraint studio_model_requirements_no_secrets_check;
alter table public.studio_model_deployments validate constraint studio_deployment_configuration_no_secrets_check;
alter table public.studio_action_requests validate constraint studio_action_payload_no_secrets_check;

create or replace function private.studio_action_target_context(
  p_workspace_id uuid,
  p_target_type text,
  p_target_id uuid
)
returns table (
  target_environment text,
  target_resource_version bigint,
  target_desired_state text
)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  connector_id uuid;
  provider_id uuid;
  worker_id uuid;
begin
  case p_target_type
    when 'connector' then
      return query
      select connector.environment, connector.resource_version, connector.desired_state
      from public.studio_connector_bindings connector
      where connector.workspace_id = p_workspace_id and connector.id = p_target_id
      for share of connector;
    when 'hosting_target' then
      return query
      select target.environment, target.resource_version, target.desired_state
      from public.studio_hosting_targets target
      where target.workspace_id = p_workspace_id and target.id = p_target_id
      for share of target;
    when 'worker' then
      return query
      select worker.environment, worker.resource_version, worker.desired_state
      from public.studio_workers worker
      where worker.workspace_id = p_workspace_id and worker.id = p_target_id
      for share of worker;
    when 'provider' then
      select provider.connector_binding_id, provider.resource_version, provider.desired_state
      into connector_id, target_resource_version, target_desired_state
      from public.studio_ai_providers provider
      where provider.workspace_id = p_workspace_id and provider.id = p_target_id
      for share of provider;
      if not found then return; end if;
      if connector_id is not null then
        select connector.environment into target_environment
        from public.studio_connector_bindings connector
        where connector.workspace_id = p_workspace_id and connector.id = connector_id
        for share of connector;
      end if;
      return next;
    when 'model' then
      select model.provider_id, model.resource_version, model.desired_state
      into provider_id, target_resource_version, target_desired_state
      from public.studio_ai_models model
      where model.workspace_id = p_workspace_id and model.id = p_target_id
      for share of model;
      if not found then return; end if;
      select provider.connector_binding_id into connector_id
      from public.studio_ai_providers provider
      where provider.workspace_id = p_workspace_id and provider.id = provider_id
      for share of provider;
      if connector_id is not null then
        select connector.environment into target_environment
        from public.studio_connector_bindings connector
        where connector.workspace_id = p_workspace_id and connector.id = connector_id
        for share of connector;
      end if;
      return next;
    when 'model_deployment' then
      select deployment.worker_id, deployment.resource_version, deployment.desired_state
      into worker_id, target_resource_version, target_desired_state
      from public.studio_model_deployments deployment
      where deployment.workspace_id = p_workspace_id and deployment.id = p_target_id
      for share of deployment;
      if not found then return; end if;
      select worker.environment into target_environment
      from public.studio_workers worker
      where worker.workspace_id = p_workspace_id and worker.id = worker_id
      for share of worker;
      return next;
    else
      return;
  end case;
end;
$$;

revoke all on function private.studio_action_target_context(uuid, text, uuid) from public, anon, authenticated;

create or replace function private.studio_action_allowed(p_target_type text, p_action text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select case p_target_type
    when 'connector' then p_action = any(array['authorize', 'health_check', 'activate', 'deactivate', 'upgrade', 'rollback', 'remove'])
    when 'hosting_target' then p_action = any(array['health_check', 'activate', 'deactivate', 'maintenance', 'resume', 'remove'])
    when 'worker' then p_action = any(array['health_check', 'activate', 'deactivate', 'upgrade', 'maintenance', 'resume', 'remove'])
    when 'provider' then p_action = any(array['authorize', 'health_check', 'activate', 'deactivate', 'remove'])
    when 'model' then p_action = any(array['verify', 'upgrade', 'rollback', 'remove'])
    when 'model_deployment' then p_action = any(array['health_check', 'install', 'verify', 'activate', 'deactivate', 'upgrade', 'rollback', 'maintenance', 'resume', 'remove'])
    else false
  end;
$$;

revoke all on function private.studio_action_allowed(text, text) from public, anon, authenticated;

create or replace function private.studio_transition_allowed(
  p_target_type text,
  p_current_state text,
  p_action text,
  p_desired_state text
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select case p_target_type
    when 'connector' then
      (p_action = 'activate' and p_current_state in ('draft', 'disabled') and p_desired_state = 'enabled')
      or (p_action = 'deactivate' and p_current_state = 'enabled' and p_desired_state = 'disabled')
      or (p_action = 'remove' and p_current_state in ('draft', 'disabled') and p_desired_state = 'archived')
    when 'hosting_target' then
      (p_action = 'activate' and p_current_state = 'disabled' and p_desired_state = 'enabled')
      or (p_action = 'deactivate' and p_current_state in ('enabled', 'maintenance') and p_desired_state = 'disabled')
      or (p_action = 'maintenance' and p_current_state = 'enabled' and p_desired_state = 'maintenance')
      or (p_action = 'resume' and p_current_state = 'maintenance' and p_desired_state = 'enabled')
      or (p_action = 'remove' and p_current_state = 'disabled' and p_desired_state = 'archived')
    when 'worker' then
      (p_action = 'activate' and p_current_state = 'disabled' and p_desired_state = 'enabled')
      or (p_action = 'deactivate' and p_current_state in ('enabled', 'maintenance') and p_desired_state = 'disabled')
      or (p_action = 'maintenance' and p_current_state = 'enabled' and p_desired_state = 'maintenance')
      or (p_action = 'resume' and p_current_state = 'maintenance' and p_desired_state = 'enabled')
      or (p_action = 'remove' and p_current_state = 'disabled' and p_desired_state = 'retired')
    when 'provider' then
      (p_action = 'activate' and p_current_state = 'disabled' and p_desired_state = 'enabled')
      or (p_action = 'deactivate' and p_current_state = 'enabled' and p_desired_state = 'disabled')
      or (p_action = 'remove' and p_current_state = 'disabled' and p_desired_state = 'archived')
    when 'model' then
      (p_action = 'upgrade' and p_current_state in ('registered', 'installed', 'maintenance') and p_desired_state = 'installed')
      or (p_action = 'rollback' and p_current_state in ('active', 'maintenance') and p_desired_state = 'installed')
      or (p_action = 'remove' and p_current_state in ('registered', 'installed', 'maintenance') and p_desired_state = 'retired')
    when 'model_deployment' then
      (p_action = 'activate' and p_current_state = 'installed' and p_desired_state = 'active')
      or (p_action = 'deactivate' and p_current_state = 'active' and p_desired_state = 'installed')
      or (p_action = 'maintenance' and p_current_state in ('installed', 'active') and p_desired_state = 'maintenance')
      or (p_action = 'resume' and p_current_state = 'maintenance' and p_desired_state = 'installed')
      or (p_action in ('upgrade', 'rollback') and p_current_state in ('installed', 'maintenance') and p_desired_state = 'installed')
      or (p_action = 'remove' and p_current_state in ('installed', 'maintenance') and p_desired_state = 'removed')
    else false
  end;
$$;

revoke all on function private.studio_transition_allowed(text, text, text, text) from public, anon, authenticated;

create or replace function private.studio_validate_action_request()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  target_context record;
  settings public.studio_platform_settings%rowtype;
begin
  select * into target_context
  from private.studio_action_target_context(new.workspace_id, new.target_type, new.target_id);

  if not found then
    raise exception 'ACTION_TARGET_INVALID' using errcode = '23503';
  end if;

  if not private.studio_action_allowed(new.target_type, new.action) then
    raise exception 'ACTION_NOT_ALLOWED_FOR_TARGET' using errcode = '23514';
  end if;

  if target_context.target_environment is not null
    and target_context.target_environment <> new.environment then
    raise exception 'ACTION_ENVIRONMENT_MISMATCH' using errcode = '23514';
  end if;

  select * into settings
  from public.studio_platform_settings platform_settings
  where platform_settings.workspace_id = new.workspace_id
  for key share;

  if not found then
    raise exception 'PLATFORM_SETTINGS_REQUIRED' using errcode = '23503';
  end if;

  if new.environment = 'production' then
    if not exists (
      select 1
      from public.studio_workspace_members member
      where member.workspace_id = new.workspace_id
        and member.user_id = new.requested_by
        and member.role = 'admin'
    ) then
      raise exception 'PRODUCTION_ADMIN_REQUIRED' using errcode = '42501';
    end if;

    if settings.require_production_approval then
      raise exception 'PRODUCTION_APPROVAL_REQUIRED' using errcode = '42501';
    end if;

    raise exception 'PRODUCTION_RELEASE_GATE_UNAVAILABLE' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.studio_validate_action_request() from public, anon, authenticated;

create or replace function public.studio_request_action(
  p_workspace_id uuid,
  p_target_type text,
  p_target_id uuid,
  p_action text,
  p_environment text,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  action_request_id uuid;
  effective_key text;
  existing_request public.studio_action_requests%rowtype;
  target_context record;
begin
  if not private.studio_has_workspace_role(p_workspace_id, array['admin', 'operator']) then
    raise exception 'ACTION_ROLE_REQUIRED' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_workspace_id::text || ':' || p_target_type), hashtext(p_target_id::text));

  select * into target_context
  from private.studio_action_target_context(p_workspace_id, p_target_type, p_target_id);
  if not found then
    raise exception 'ACTION_TARGET_INVALID' using errcode = '23503';
  end if;

  effective_key := nullif(btrim(p_idempotency_key), '');
  if effective_key is null then
    effective_key := concat_ws(':', 'v1', 'a', p_target_type, p_target_id, p_action, p_environment, target_context.target_resource_version);
  end if;
  if char_length(effective_key) not between 16 and 120 or effective_key !~ '^[A-Za-z0-9._:-]+$' then
    raise exception 'IDEMPOTENCY_KEY_INVALID' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_workspace_id::text), hashtext(effective_key));

  select * into existing_request
  from public.studio_action_requests request
  where request.workspace_id = p_workspace_id and request.idempotency_key = effective_key
  for update;

  if found then
    if existing_request.target_type <> p_target_type
      or existing_request.target_id <> p_target_id
      or existing_request.action <> p_action
      or existing_request.environment <> p_environment
      or coalesce(existing_request.request_payload ->> 'intent', '') <> 'action'
      or coalesce(existing_request.request_payload ->> 'resource_version', '') <> target_context.target_resource_version::text then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '23514';
    end if;
    return existing_request.id;
  end if;

  insert into public.studio_action_requests (
    workspace_id, target_type, target_id, action, environment, idempotency_key, request_payload, requested_by
  ) values (
    p_workspace_id,
    p_target_type,
    p_target_id,
    p_action,
    p_environment,
    effective_key,
    jsonb_build_object('intent', 'action', 'resource_version', target_context.target_resource_version),
    auth.uid()
  ) returning id into action_request_id;

  return action_request_id;
end;
$$;

revoke all on function public.studio_request_action(uuid, text, uuid, text, text, text) from public, anon;
grant execute on function public.studio_request_action(uuid, text, uuid, text, text, text) to authenticated;

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
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  action_request_id uuid;
  effective_key text;
  existing_request public.studio_action_requests%rowtype;
  target_context record;
begin
  if not private.studio_has_workspace_role(p_workspace_id, array['admin', 'operator']) then
    raise exception 'ACTION_ROLE_REQUIRED' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_workspace_id::text || ':' || p_target_type), hashtext(p_target_id::text));

  effective_key := nullif(btrim(p_idempotency_key), '');
  if effective_key is null then
    effective_key := concat_ws(':', 'v1', 't', p_target_type, p_target_id, p_action, p_environment, p_resource_version, p_desired_state);
  end if;
  if char_length(effective_key) not between 16 and 120 or effective_key !~ '^[A-Za-z0-9._:-]+$' then
    raise exception 'IDEMPOTENCY_KEY_INVALID' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_workspace_id::text), hashtext(effective_key));

  select * into existing_request
  from public.studio_action_requests request
  where request.workspace_id = p_workspace_id and request.idempotency_key = effective_key
  for update;

  if found then
    if existing_request.target_type <> p_target_type
      or existing_request.target_id <> p_target_id
      or existing_request.action <> p_action
      or existing_request.environment <> p_environment
      or coalesce(existing_request.request_payload ->> 'intent', '') <> 'transition'
      or coalesce(existing_request.request_payload ->> 'desired_state', '') <> p_desired_state
      or coalesce(existing_request.request_payload ->> 'resource_version', '') <> p_resource_version::text then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '23514';
    end if;
    return existing_request.id;
  end if;

  select * into target_context
  from private.studio_action_target_context(p_workspace_id, p_target_type, p_target_id);
  if not found then
    raise exception 'ACTION_TARGET_INVALID' using errcode = '23503';
  end if;
  if target_context.target_resource_version <> p_resource_version then
    raise exception 'RESOURCE_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if target_context.target_environment is not null and target_context.target_environment <> p_environment then
    raise exception 'ACTION_ENVIRONMENT_MISMATCH' using errcode = '23514';
  end if;
  if not private.studio_transition_allowed(p_target_type, target_context.target_desired_state, p_action, p_desired_state) then
    raise exception 'ACTION_STATE_TRANSITION_INVALID' using errcode = '23514';
  end if;

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
    idempotency_key,
    request_payload,
    requested_by
  ) values (
    p_workspace_id,
    p_target_type,
    p_target_id,
    p_action,
    p_environment,
    effective_key,
    jsonb_build_object(
      'intent', 'transition',
      'desired_state', p_desired_state,
      'resource_version', p_resource_version
    ),
    auth.uid()
  ) returning id into action_request_id;

  return action_request_id;
end;
$$;

revoke all on function public.studio_request_transition(uuid, text, uuid, bigint, text, text, text, text) from public, anon;
grant execute on function public.studio_request_transition(uuid, text, uuid, bigint, text, text, text, text) to authenticated;

revoke insert on public.studio_action_requests from authenticated;
revoke update (desired_state) on public.studio_connector_bindings from authenticated;
revoke update (desired_state) on public.studio_hosting_targets from authenticated;
revoke update (desired_state) on public.studio_workers from authenticated;
revoke update (desired_state) on public.studio_ai_providers from authenticated;
revoke update (desired_state) on public.studio_ai_models from authenticated;
revoke update (desired_state) on public.studio_model_deployments from authenticated;

commit;
