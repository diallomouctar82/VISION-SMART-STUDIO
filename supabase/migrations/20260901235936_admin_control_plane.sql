begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.studio_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  resource_version bigint not null default 1 check (resource_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.studio_workspace_members (
  workspace_id uuid not null references public.studio_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'operator', 'auditor', 'viewer')),
  created_by uuid not null references auth.users(id) on delete restrict,
  resource_version bigint not null default 1 check (resource_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.studio_platform_settings (
  workspace_id uuid primary key references public.studio_workspaces(id) on delete cascade,
  operating_mode text not null default 'hybrid' check (operating_mode in ('external', 'internal', 'hybrid')),
  default_environment text not null default 'development' check (default_environment in ('development', 'staging', 'production')),
  require_production_approval boolean not null default true,
  require_internal_for_confidential boolean not null default true,
  max_monthly_cost_usd numeric(12,2) check (max_monthly_cost_usd is null or max_monthly_cost_usd >= 0),
  max_action_retries smallint not null default 2 check (max_action_retries between 0 and 5),
  resource_version bigint not null default 1 check (resource_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.studio_secret_references (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.studio_workspaces(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 120),
  vault_provider text not null check (vault_provider in ('supabase_vault', 'netlify', 'hostinger', 'external_vault', 'worker_vault')),
  external_reference text not null check (char_length(external_reference) between 3 and 255 and external_reference ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]+$'),
  environment text not null check (environment in ('development', 'staging', 'production')),
  scope text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'rotation_due', 'revoked', 'archived')),
  last_rotated_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  resource_version bigint not null default 1 check (resource_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(scope) <= 30)
);

create table public.studio_connector_bindings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.studio_workspaces(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 120),
  connector_kind text not null check (connector_kind in ('github', 'supabase', 'netlify', 'vercel', 'docker', 'nginx', 'database', 'storage', 'ci_cd', 'generic_vps', 'generic_api', 'identity')),
  protocol text not null check (protocol in ('rest', 'graphql', 'webhook', 'mcp', 'sdk', 'oauth', 'oidc', 'ssh')),
  environment text not null check (environment in ('development', 'staging', 'production')),
  capabilities text[] not null default '{}',
  required_scopes text[] not null default '{}',
  endpoint_url text check (endpoint_url is null or (char_length(endpoint_url) <= 2048 and endpoint_url ~ '^https://')),
  secret_reference_id uuid references public.studio_secret_references(id) on delete restrict,
  adapter_version text check (adapter_version is null or char_length(adapter_version) <= 80),
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object' and octet_length(configuration::text) <= 8192),
  desired_state text not null default 'draft' check (desired_state in ('draft', 'enabled', 'disabled', 'archived')),
  observed_state text not null default 'unknown' check (observed_state in ('unknown', 'authorization_required', 'checking', 'active', 'degraded', 'error')),
  health_status text not null default 'unknown' check (health_status in ('unknown', 'healthy', 'degraded', 'unhealthy')),
  last_checked_at timestamptz,
  last_error_code text check (last_error_code is null or char_length(last_error_code) <= 80),
  verified_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  resource_version bigint not null default 1 check (resource_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(capabilities) between 1 and 50),
  check (cardinality(required_scopes) <= 50)
);

create table public.studio_hosting_targets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.studio_workspaces(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 120),
  provider text not null check (char_length(provider) between 2 and 80),
  target_kind text not null check (target_kind in ('platform', 'cloud', 'vps', 'on_premise', 'container_host', 'database', 'storage')),
  environment text not null check (environment in ('development', 'staging', 'production')),
  region text check (region is null or char_length(region) <= 80),
  endpoint_url text check (endpoint_url is null or (char_length(endpoint_url) <= 2048 and endpoint_url ~ '^https://')),
  connector_binding_id uuid references public.studio_connector_bindings(id) on delete restrict,
  labels jsonb not null default '{}'::jsonb check (jsonb_typeof(labels) = 'object' and octet_length(labels::text) <= 4096),
  desired_state text not null default 'enabled' check (desired_state in ('enabled', 'maintenance', 'disabled', 'archived')),
  observed_state text not null default 'unknown' check (observed_state in ('unknown', 'provisioning', 'ready', 'degraded', 'offline', 'error')),
  health_status text not null default 'unknown' check (health_status in ('unknown', 'healthy', 'degraded', 'unhealthy')),
  last_checked_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  resource_version bigint not null default 1 check (resource_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.studio_workers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.studio_workspaces(id) on delete cascade,
  hosting_target_id uuid references public.studio_hosting_targets(id) on delete restrict,
  display_name text not null check (char_length(display_name) between 2 and 120),
  worker_kind text not null check (worker_kind in ('local', 'vps_cpu', 'vps_gpu', 'cloud_cpu', 'cloud_gpu', 'container')),
  environment text not null check (environment in ('development', 'staging', 'production')),
  endpoint_url text check (endpoint_url is null or (char_length(endpoint_url) <= 2048 and endpoint_url ~ '^https://')),
  capabilities text[] not null default '{}',
  capacity jsonb not null default '{}'::jsonb check (jsonb_typeof(capacity) = 'object' and octet_length(capacity::text) <= 8192),
  observed_usage jsonb not null default '{}'::jsonb check (jsonb_typeof(observed_usage) = 'object' and octet_length(observed_usage::text) <= 8192),
  agent_version text check (agent_version is null or char_length(agent_version) <= 80),
  desired_state text not null default 'enabled' check (desired_state in ('enabled', 'maintenance', 'disabled', 'retired')),
  observed_state text not null default 'unknown' check (observed_state in ('unknown', 'provisioning', 'ready', 'busy', 'maintenance', 'offline', 'error')),
  health_status text not null default 'unknown' check (health_status in ('unknown', 'healthy', 'degraded', 'unhealthy')),
  last_heartbeat_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  resource_version bigint not null default 1 check (resource_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(capabilities) between 1 and 50)
);

create table public.studio_ai_providers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.studio_workspaces(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 120),
  provider_kind text not null check (provider_kind in ('openai_compatible', 'anthropic', 'gemini', 'openrouter', 'ollama', 'vllm', 'tgi', 'llamacpp', 'custom')),
  hosting_mode text not null check (hosting_mode in ('external', 'internal')),
  connector_binding_id uuid references public.studio_connector_bindings(id) on delete restrict,
  endpoint_url text check (endpoint_url is null or (char_length(endpoint_url) <= 2048 and endpoint_url ~ '^https://')),
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object' and octet_length(configuration::text) <= 8192),
  desired_state text not null default 'enabled' check (desired_state in ('enabled', 'disabled', 'archived')),
  observed_state text not null default 'unknown' check (observed_state in ('unknown', 'authorization_required', 'checking', 'active', 'degraded', 'error')),
  health_status text not null default 'unknown' check (health_status in ('unknown', 'healthy', 'degraded', 'unhealthy')),
  last_checked_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  resource_version bigint not null default 1 check (resource_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.studio_ai_models (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.studio_workspaces(id) on delete cascade,
  provider_id uuid not null references public.studio_ai_providers(id) on delete restrict,
  display_name text not null check (char_length(display_name) between 2 and 120),
  model_identifier text not null check (char_length(model_identifier) between 1 and 200),
  model_version text not null default 'unversioned' check (char_length(model_version) between 1 and 100),
  hosting_mode text not null check (hosting_mode in ('external', 'internal')),
  modalities text[] not null default '{text}',
  context_window integer check (context_window is null or context_window > 0),
  supports_tools boolean not null default false,
  confidentiality_class text not null default 'standard' check (confidentiality_class in ('public', 'standard', 'confidential', 'restricted')),
  runtime text check (runtime is null or runtime in ('managed_api', 'ollama', 'vllm', 'tgi', 'llamacpp', 'custom')),
  artifact_reference text check (artifact_reference is null or char_length(artifact_reference) <= 500),
  resource_requirements jsonb not null default '{}'::jsonb check (jsonb_typeof(resource_requirements) = 'object' and octet_length(resource_requirements::text) <= 8192),
  desired_state text not null default 'registered' check (desired_state in ('registered', 'installed', 'active', 'maintenance', 'retired')),
  observed_state text not null default 'unknown' check (observed_state in ('unknown', 'installing', 'verifying', 'available', 'active', 'maintenance', 'failed')),
  health_status text not null default 'unknown' check (health_status in ('unknown', 'healthy', 'degraded', 'unhealthy')),
  last_checked_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  resource_version bigint not null default 1 check (resource_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(modalities) between 1 and 10)
);

create table public.studio_model_deployments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.studio_workspaces(id) on delete cascade,
  model_id uuid not null references public.studio_ai_models(id) on delete restrict,
  worker_id uuid not null references public.studio_workers(id) on delete restrict,
  display_name text not null check (char_length(display_name) between 2 and 120),
  runtime_configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(runtime_configuration) = 'object' and octet_length(runtime_configuration::text) <= 8192),
  desired_state text not null default 'installed' check (desired_state in ('installed', 'active', 'maintenance', 'removed')),
  observed_state text not null default 'unknown' check (observed_state in ('unknown', 'provisioning', 'verifying', 'ready', 'active', 'maintenance', 'failed')),
  health_status text not null default 'unknown' check (health_status in ('unknown', 'healthy', 'degraded', 'unhealthy')),
  last_checked_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  resource_version bigint not null default 1 check (resource_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.studio_routing_policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.studio_workspaces(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 120),
  operating_mode text not null check (operating_mode in ('external', 'internal', 'hybrid')),
  confidentiality_rule text not null default 'standard' check (confidentiality_rule in ('public', 'standard', 'internal_only', 'restricted_internal_only')),
  required_modalities text[] not null default '{text}',
  preferred_model_ids uuid[] not null default '{}',
  fallback_model_ids uuid[] not null default '{}',
  allow_external_fallback boolean not null default false,
  require_fallback_confirmation boolean not null default true,
  max_cost_usd_per_request numeric(12,6) check (max_cost_usd_per_request is null or max_cost_usd_per_request >= 0),
  target_latency_ms integer check (target_latency_ms is null or target_latency_ms > 0),
  minimum_free_vram_mb integer check (minimum_free_vram_mb is null or minimum_free_vram_mb >= 0),
  priority_order text[] not null default '{capability,confidentiality,health,cost,latency,capacity}',
  enabled boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  resource_version bigint not null default 1 check (resource_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(required_modalities) between 1 and 10),
  check (cardinality(preferred_model_ids) <= 20),
  check (cardinality(fallback_model_ids) <= 20),
  check (cardinality(priority_order) between 1 and 10),
  check (not (confidentiality_rule in ('internal_only', 'restricted_internal_only') and allow_external_fallback))
);

create table public.studio_action_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.studio_workspaces(id) on delete cascade,
  target_type text not null check (target_type in ('connector', 'hosting_target', 'worker', 'provider', 'model', 'model_deployment')),
  target_id uuid not null,
  action text not null check (action in ('authorize', 'health_check', 'activate', 'deactivate', 'install', 'verify', 'upgrade', 'rollback', 'maintenance', 'resume', 'remove')),
  environment text not null check (environment in ('development', 'staging', 'production')),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 120 and idempotency_key ~ '^[A-Za-z0-9._:-]+$'),
  request_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(request_payload) = 'object' and octet_length(request_payload::text) <= 8192),
  status text not null default 'pending' check (status in ('pending', 'authorized', 'running', 'succeeded', 'failed', 'blocked', 'cancelled')),
  result_code text check (result_code is null or char_length(result_code) <= 80),
  result_summary text check (result_summary is null or char_length(result_summary) <= 500),
  correlation_id uuid not null default gen_random_uuid(),
  requested_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, idempotency_key)
);

create table public.studio_connection_checks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.studio_workspaces(id) on delete cascade,
  target_type text not null check (target_type in ('connector', 'hosting_target', 'worker', 'provider', 'model', 'model_deployment')),
  target_id uuid not null,
  action_request_id uuid references public.studio_action_requests(id) on delete set null,
  status text not null check (status in ('healthy', 'degraded', 'unhealthy')),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  result_code text not null check (char_length(result_code) between 1 and 80),
  summary text not null check (char_length(summary) between 1 and 500),
  checked_at timestamptz not null default now(),
  correlation_id uuid not null
);

create table public.studio_audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.studio_workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 1 and 120),
  target_type text not null check (char_length(target_type) between 1 and 80),
  target_id uuid,
  environment text check (environment is null or environment in ('development', 'staging', 'production')),
  result text not null check (result in ('accepted', 'succeeded', 'failed', 'blocked')),
  correlation_id uuid not null default gen_random_uuid(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 8192),
  created_at timestamptz not null default now()
);

create unique index studio_secret_references_name_unique on public.studio_secret_references (workspace_id, lower(display_name));
create unique index studio_connector_bindings_name_unique on public.studio_connector_bindings (workspace_id, lower(display_name));
create unique index studio_hosting_targets_name_unique on public.studio_hosting_targets (workspace_id, lower(display_name));
create unique index studio_workers_name_unique on public.studio_workers (workspace_id, lower(display_name));
create unique index studio_ai_providers_name_unique on public.studio_ai_providers (workspace_id, lower(display_name));
create unique index studio_ai_models_identity_unique on public.studio_ai_models (provider_id, lower(model_identifier), lower(model_version));
create unique index studio_model_deployments_name_unique on public.studio_model_deployments (workspace_id, lower(display_name));
create unique index studio_routing_policies_name_unique on public.studio_routing_policies (workspace_id, lower(display_name));
create index studio_workspace_members_user_idx on public.studio_workspace_members (user_id, workspace_id);
create index studio_connector_bindings_workspace_state_idx on public.studio_connector_bindings (workspace_id, desired_state, health_status);
create index studio_hosting_targets_workspace_state_idx on public.studio_hosting_targets (workspace_id, desired_state, health_status);
create index studio_workers_workspace_state_idx on public.studio_workers (workspace_id, desired_state, health_status);
create index studio_ai_models_workspace_state_idx on public.studio_ai_models (workspace_id, desired_state, health_status);
create index studio_action_requests_workspace_status_idx on public.studio_action_requests (workspace_id, status, created_at desc);
create index studio_connection_checks_target_idx on public.studio_connection_checks (workspace_id, target_type, target_id, checked_at desc);
create index studio_audit_events_workspace_created_idx on public.studio_audit_events (workspace_id, created_at desc);

create or replace function private.studio_has_workspace_role(p_workspace_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.studio_workspace_members member
      where member.workspace_id = p_workspace_id
        and member.user_id = auth.uid()
        and member.role = any(p_roles)
    );
$$;

revoke all on function private.studio_has_workspace_role(uuid, text[]) from public, anon;
grant execute on function private.studio_has_workspace_role(uuid, text[]) to authenticated;

create or replace function private.studio_touch_resource()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.resource_version := old.resource_version + 1;
  return new;
end;
$$;

revoke all on function private.studio_touch_resource() from public, anon, authenticated;

create or replace function private.studio_audit_resource()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  row_data jsonb;
  target_workspace_id uuid;
  audit_target_id uuid;
  audit_environment text;
  audit_version bigint;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_workspace_id := case
    when tg_table_name = 'studio_workspaces' then (row_data ->> 'id')::uuid
    else (row_data ->> 'workspace_id')::uuid
  end;
  audit_target_id := nullif(row_data ->> 'id', '')::uuid;
  audit_environment := nullif(row_data ->> 'environment', '');
  audit_version := nullif(row_data ->> 'resource_version', '')::bigint;

  insert into public.studio_audit_events (
    workspace_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    environment,
    result,
    metadata
  ) values (
    target_workspace_id,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    audit_target_id,
    audit_environment,
    'succeeded',
    jsonb_strip_nulls(jsonb_build_object('resource_version', audit_version))
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.studio_audit_resource() from public, anon, authenticated;

create or replace function public.studio_create_workspace(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  normalized_name text;
  normalized_slug text;
  workspace_id uuid;
begin
  if actor_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  if (select count(*) from public.studio_workspace_members where user_id = actor_id) >= 5 then
    raise exception 'WORKSPACE_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  normalized_name := btrim(regexp_replace(coalesce(p_name, ''), '[[:space:]]+', ' ', 'g'));
  normalized_slug := lower(btrim(coalesce(p_slug, '')));

  if char_length(normalized_name) not between 2 and 120 then
    raise exception 'INVALID_WORKSPACE_NAME' using errcode = '22023';
  end if;

  if normalized_slug !~ '^[a-z0-9][a-z0-9-]{1,62}$' then
    raise exception 'INVALID_WORKSPACE_SLUG' using errcode = '22023';
  end if;

  insert into public.studio_workspaces (name, slug, created_by)
  values (normalized_name, normalized_slug, actor_id)
  returning id into workspace_id;

  insert into public.studio_workspace_members (workspace_id, user_id, role, created_by)
  values (workspace_id, actor_id, 'admin', actor_id);

  insert into public.studio_platform_settings (workspace_id)
  values (workspace_id);

  return workspace_id;
end;
$$;

revoke all on function public.studio_create_workspace(text, text) from public, anon;
grant execute on function public.studio_create_workspace(text, text) to authenticated;

do $$
declare
  target_table regclass;
begin
  foreach target_table in array array[
    'public.studio_workspaces'::regclass,
    'public.studio_workspace_members'::regclass,
    'public.studio_platform_settings'::regclass,
    'public.studio_secret_references'::regclass,
    'public.studio_connector_bindings'::regclass,
    'public.studio_hosting_targets'::regclass,
    'public.studio_workers'::regclass,
    'public.studio_ai_providers'::regclass,
    'public.studio_ai_models'::regclass,
    'public.studio_model_deployments'::regclass,
    'public.studio_routing_policies'::regclass
  ] loop
    execute format('create trigger studio_touch before update on %s for each row execute function private.studio_touch_resource()', target_table);
    execute format('create trigger studio_audit after insert or update or delete on %s for each row execute function private.studio_audit_resource()', target_table);
  end loop;
end;
$$;

create trigger studio_audit_action_request
after insert on public.studio_action_requests
for each row execute function private.studio_audit_resource();

alter table public.studio_workspaces enable row level security;
alter table public.studio_workspace_members enable row level security;
alter table public.studio_platform_settings enable row level security;
alter table public.studio_secret_references enable row level security;
alter table public.studio_connector_bindings enable row level security;
alter table public.studio_hosting_targets enable row level security;
alter table public.studio_workers enable row level security;
alter table public.studio_ai_providers enable row level security;
alter table public.studio_ai_models enable row level security;
alter table public.studio_model_deployments enable row level security;
alter table public.studio_routing_policies enable row level security;
alter table public.studio_action_requests enable row level security;
alter table public.studio_connection_checks enable row level security;
alter table public.studio_audit_events enable row level security;

alter table public.studio_workspaces force row level security;
alter table public.studio_workspace_members force row level security;
alter table public.studio_platform_settings force row level security;
alter table public.studio_secret_references force row level security;
alter table public.studio_connector_bindings force row level security;
alter table public.studio_hosting_targets force row level security;
alter table public.studio_workers force row level security;
alter table public.studio_ai_providers force row level security;
alter table public.studio_ai_models force row level security;
alter table public.studio_model_deployments force row level security;
alter table public.studio_routing_policies force row level security;
alter table public.studio_action_requests force row level security;
alter table public.studio_connection_checks force row level security;
alter table public.studio_audit_events force row level security;

create policy studio_workspaces_select on public.studio_workspaces
for select to authenticated
using (private.studio_has_workspace_role(id, array['admin', 'operator', 'auditor', 'viewer']));

create policy studio_workspaces_update on public.studio_workspaces
for update to authenticated
using (private.studio_has_workspace_role(id, array['admin']))
with check (private.studio_has_workspace_role(id, array['admin']));

create policy studio_members_select on public.studio_workspace_members
for select to authenticated
using (
  user_id = auth.uid()
  or private.studio_has_workspace_role(workspace_id, array['admin', 'auditor'])
);

create policy studio_members_insert on public.studio_workspace_members
for insert to authenticated
with check (
  private.studio_has_workspace_role(workspace_id, array['admin'])
  and created_by = auth.uid()
);

create policy studio_members_update on public.studio_workspace_members
for update to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin']))
with check (private.studio_has_workspace_role(workspace_id, array['admin']));

create policy studio_members_delete on public.studio_workspace_members
for delete to authenticated
using (
  private.studio_has_workspace_role(workspace_id, array['admin'])
  and not (user_id = auth.uid() and role = 'admin')
);

create policy studio_settings_select on public.studio_platform_settings
for select to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator', 'auditor', 'viewer']));

create policy studio_settings_update on public.studio_platform_settings
for update to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin']))
with check (private.studio_has_workspace_role(workspace_id, array['admin']));

create policy studio_secret_references_select on public.studio_secret_references
for select to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator', 'auditor']));

create policy studio_secret_references_insert on public.studio_secret_references
for insert to authenticated
with check (private.studio_has_workspace_role(workspace_id, array['admin']) and created_by = auth.uid());

create policy studio_secret_references_update on public.studio_secret_references
for update to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin']))
with check (private.studio_has_workspace_role(workspace_id, array['admin']));

create policy studio_connector_bindings_select on public.studio_connector_bindings
for select to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator', 'auditor', 'viewer']));

create policy studio_connector_bindings_insert on public.studio_connector_bindings
for insert to authenticated
with check (
  private.studio_has_workspace_role(workspace_id, array['admin', 'operator'])
  and created_by = auth.uid()
  and observed_state = 'unknown'
  and health_status = 'unknown'
  and last_checked_at is null
  and verified_at is null
);

create policy studio_connector_bindings_update on public.studio_connector_bindings
for update to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator']))
with check (private.studio_has_workspace_role(workspace_id, array['admin', 'operator']));

create policy studio_hosting_targets_select on public.studio_hosting_targets
for select to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator', 'auditor', 'viewer']));

create policy studio_hosting_targets_insert on public.studio_hosting_targets
for insert to authenticated
with check (
  private.studio_has_workspace_role(workspace_id, array['admin', 'operator'])
  and created_by = auth.uid()
  and observed_state = 'unknown'
  and health_status = 'unknown'
  and last_checked_at is null
);

create policy studio_hosting_targets_update on public.studio_hosting_targets
for update to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator']))
with check (private.studio_has_workspace_role(workspace_id, array['admin', 'operator']));

create policy studio_workers_select on public.studio_workers
for select to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator', 'auditor', 'viewer']));

create policy studio_workers_insert on public.studio_workers
for insert to authenticated
with check (
  private.studio_has_workspace_role(workspace_id, array['admin', 'operator'])
  and created_by = auth.uid()
  and observed_state = 'unknown'
  and health_status = 'unknown'
  and last_heartbeat_at is null
  and observed_usage = '{}'::jsonb
);

create policy studio_workers_update on public.studio_workers
for update to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator']))
with check (private.studio_has_workspace_role(workspace_id, array['admin', 'operator']));

create policy studio_ai_providers_select on public.studio_ai_providers
for select to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator', 'auditor', 'viewer']));

create policy studio_ai_providers_insert on public.studio_ai_providers
for insert to authenticated
with check (
  private.studio_has_workspace_role(workspace_id, array['admin', 'operator'])
  and created_by = auth.uid()
  and observed_state = 'unknown'
  and health_status = 'unknown'
  and last_checked_at is null
);

create policy studio_ai_providers_update on public.studio_ai_providers
for update to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator']))
with check (private.studio_has_workspace_role(workspace_id, array['admin', 'operator']));

create policy studio_ai_models_select on public.studio_ai_models
for select to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator', 'auditor', 'viewer']));

create policy studio_ai_models_insert on public.studio_ai_models
for insert to authenticated
with check (
  private.studio_has_workspace_role(workspace_id, array['admin', 'operator'])
  and created_by = auth.uid()
  and observed_state = 'unknown'
  and health_status = 'unknown'
  and last_checked_at is null
);

create policy studio_ai_models_update on public.studio_ai_models
for update to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator']))
with check (private.studio_has_workspace_role(workspace_id, array['admin', 'operator']));

create policy studio_model_deployments_select on public.studio_model_deployments
for select to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator', 'auditor', 'viewer']));

create policy studio_model_deployments_insert on public.studio_model_deployments
for insert to authenticated
with check (
  private.studio_has_workspace_role(workspace_id, array['admin', 'operator'])
  and created_by = auth.uid()
  and observed_state = 'unknown'
  and health_status = 'unknown'
  and last_checked_at is null
);

create policy studio_model_deployments_update on public.studio_model_deployments
for update to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator']))
with check (private.studio_has_workspace_role(workspace_id, array['admin', 'operator']));

create policy studio_routing_policies_select on public.studio_routing_policies
for select to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator', 'auditor', 'viewer']));

create policy studio_routing_policies_insert on public.studio_routing_policies
for insert to authenticated
with check (private.studio_has_workspace_role(workspace_id, array['admin', 'operator']) and created_by = auth.uid());

create policy studio_routing_policies_update on public.studio_routing_policies
for update to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator']))
with check (private.studio_has_workspace_role(workspace_id, array['admin', 'operator']));

create policy studio_action_requests_select on public.studio_action_requests
for select to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator', 'auditor']));

create policy studio_action_requests_insert on public.studio_action_requests
for insert to authenticated
with check (
  private.studio_has_workspace_role(workspace_id, array['admin', 'operator'])
  and requested_by = auth.uid()
  and status = 'pending'
  and started_at is null
  and completed_at is null
  and result_code is null
  and result_summary is null
);

create policy studio_connection_checks_select on public.studio_connection_checks
for select to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator', 'auditor']));

create policy studio_audit_events_select on public.studio_audit_events
for select to authenticated
using (private.studio_has_workspace_role(workspace_id, array['admin', 'operator', 'auditor']));

revoke all on all tables in schema public from anon;

grant select on public.studio_workspaces to authenticated;
grant update (name, slug) on public.studio_workspaces to authenticated;

grant select, insert, delete on public.studio_workspace_members to authenticated;
grant update (role) on public.studio_workspace_members to authenticated;

grant select on public.studio_platform_settings to authenticated;
grant update (operating_mode, default_environment, require_production_approval, require_internal_for_confidential, max_monthly_cost_usd, max_action_retries) on public.studio_platform_settings to authenticated;

grant select, insert on public.studio_secret_references to authenticated;
grant update (display_name, vault_provider, external_reference, environment, scope, status, last_rotated_at) on public.studio_secret_references to authenticated;

grant select, insert on public.studio_connector_bindings to authenticated;
grant update (display_name, connector_kind, protocol, environment, capabilities, required_scopes, endpoint_url, secret_reference_id, adapter_version, configuration, desired_state) on public.studio_connector_bindings to authenticated;

grant select, insert on public.studio_hosting_targets to authenticated;
grant update (display_name, provider, target_kind, environment, region, endpoint_url, connector_binding_id, labels, desired_state) on public.studio_hosting_targets to authenticated;

grant select, insert on public.studio_workers to authenticated;
grant update (hosting_target_id, display_name, worker_kind, environment, endpoint_url, capabilities, capacity, agent_version, desired_state) on public.studio_workers to authenticated;

grant select, insert on public.studio_ai_providers to authenticated;
grant update (display_name, provider_kind, hosting_mode, connector_binding_id, endpoint_url, configuration, desired_state) on public.studio_ai_providers to authenticated;

grant select, insert on public.studio_ai_models to authenticated;
grant update (provider_id, display_name, model_identifier, model_version, hosting_mode, modalities, context_window, supports_tools, confidentiality_class, runtime, artifact_reference, resource_requirements, desired_state) on public.studio_ai_models to authenticated;

grant select, insert on public.studio_model_deployments to authenticated;
grant update (model_id, worker_id, display_name, runtime_configuration, desired_state) on public.studio_model_deployments to authenticated;

grant select, insert on public.studio_routing_policies to authenticated;
grant update (display_name, operating_mode, confidentiality_rule, required_modalities, preferred_model_ids, fallback_model_ids, allow_external_fallback, require_fallback_confirmation, max_cost_usd_per_request, target_latency_ms, minimum_free_vram_mb, priority_order, enabled) on public.studio_routing_policies to authenticated;

grant select, insert on public.studio_action_requests to authenticated;
grant select on public.studio_connection_checks to authenticated;
grant select on public.studio_audit_events to authenticated;

commit;
