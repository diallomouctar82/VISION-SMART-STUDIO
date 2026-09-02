begin;

revoke all on all tables in schema public from public, anon, authenticated;

create unique index studio_secret_references_workspace_id_unique on public.studio_secret_references (workspace_id, id);
create unique index studio_connector_bindings_workspace_id_unique on public.studio_connector_bindings (workspace_id, id);
create unique index studio_hosting_targets_workspace_id_unique on public.studio_hosting_targets (workspace_id, id);
create unique index studio_workers_workspace_id_unique on public.studio_workers (workspace_id, id);
create unique index studio_ai_providers_workspace_id_unique on public.studio_ai_providers (workspace_id, id);
create unique index studio_ai_models_workspace_id_unique on public.studio_ai_models (workspace_id, id);

alter table public.studio_connector_bindings
  add constraint studio_connector_secret_same_workspace_fkey
  foreign key (workspace_id, secret_reference_id)
  references public.studio_secret_references (workspace_id, id)
  on delete restrict;

alter table public.studio_hosting_targets
  add constraint studio_hosting_connector_same_workspace_fkey
  foreign key (workspace_id, connector_binding_id)
  references public.studio_connector_bindings (workspace_id, id)
  on delete restrict;

alter table public.studio_workers
  add constraint studio_worker_target_same_workspace_fkey
  foreign key (workspace_id, hosting_target_id)
  references public.studio_hosting_targets (workspace_id, id)
  on delete restrict;

alter table public.studio_ai_providers
  add constraint studio_provider_connector_same_workspace_fkey
  foreign key (workspace_id, connector_binding_id)
  references public.studio_connector_bindings (workspace_id, id)
  on delete restrict;

alter table public.studio_ai_models
  add constraint studio_model_provider_same_workspace_fkey
  foreign key (workspace_id, provider_id)
  references public.studio_ai_providers (workspace_id, id)
  on delete restrict;

alter table public.studio_model_deployments
  add constraint studio_deployment_model_same_workspace_fkey
  foreign key (workspace_id, model_id)
  references public.studio_ai_models (workspace_id, id)
  on delete restrict;

alter table public.studio_model_deployments
  add constraint studio_deployment_worker_same_workspace_fkey
  foreign key (workspace_id, worker_id)
  references public.studio_workers (workspace_id, id)
  on delete restrict;

create index studio_workspaces_created_by_idx on public.studio_workspaces (created_by);
create index studio_workspace_members_created_by_idx on public.studio_workspace_members (created_by);
create index studio_secret_references_created_by_idx on public.studio_secret_references (created_by);
create index studio_connector_bindings_secret_idx on public.studio_connector_bindings (secret_reference_id);
create index studio_connector_bindings_created_by_idx on public.studio_connector_bindings (created_by);
create index studio_hosting_targets_connector_idx on public.studio_hosting_targets (connector_binding_id);
create index studio_hosting_targets_created_by_idx on public.studio_hosting_targets (created_by);
create index studio_workers_hosting_target_idx on public.studio_workers (hosting_target_id);
create index studio_workers_created_by_idx on public.studio_workers (created_by);
create index studio_ai_providers_connector_idx on public.studio_ai_providers (connector_binding_id);
create index studio_ai_providers_created_by_idx on public.studio_ai_providers (created_by);
create index studio_ai_models_created_by_idx on public.studio_ai_models (created_by);
create index studio_model_deployments_model_idx on public.studio_model_deployments (model_id);
create index studio_model_deployments_worker_idx on public.studio_model_deployments (worker_id);
create index studio_model_deployments_created_by_idx on public.studio_model_deployments (created_by);
create index studio_routing_policies_created_by_idx on public.studio_routing_policies (created_by);
create index studio_action_requests_requested_by_idx on public.studio_action_requests (requested_by);
create index studio_connection_checks_request_idx on public.studio_connection_checks (action_request_id);
create index studio_audit_events_actor_idx on public.studio_audit_events (actor_user_id);

create or replace function private.studio_has_workspace_role(p_workspace_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.studio_workspace_members member
      where member.workspace_id = p_workspace_id
        and member.user_id = (select auth.uid())
        and member.role = any(p_roles)
    );
$$;

create or replace function private.studio_preserve_workspace_admin()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.role = 'admin'
    and (tg_op = 'DELETE' or new.role <> 'admin')
    and not exists (
      select 1
      from public.studio_workspace_members member
      where member.workspace_id = old.workspace_id
        and member.user_id <> old.user_id
        and member.role = 'admin'
    ) then
    raise exception 'LAST_ADMIN_REQUIRED' using errcode = '23514';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.studio_preserve_workspace_admin() from public, anon, authenticated;

create trigger studio_preserve_workspace_admin
before update of role or delete on public.studio_workspace_members
for each row execute function private.studio_preserve_workspace_admin();

drop policy studio_members_select on public.studio_workspace_members;
create policy studio_members_select on public.studio_workspace_members
for select to authenticated
using (
  user_id = (select auth.uid())
  or private.studio_has_workspace_role(workspace_id, array['admin', 'auditor'])
);

drop policy studio_members_insert on public.studio_workspace_members;
create policy studio_members_insert on public.studio_workspace_members
for insert to authenticated
with check (
  private.studio_has_workspace_role(workspace_id, array['admin'])
  and created_by = (select auth.uid())
);

drop policy studio_members_delete on public.studio_workspace_members;
create policy studio_members_delete on public.studio_workspace_members
for delete to authenticated
using (
  private.studio_has_workspace_role(workspace_id, array['admin'])
  and not (user_id = (select auth.uid()) and role = 'admin')
);

drop policy studio_secret_references_insert on public.studio_secret_references;
create policy studio_secret_references_insert on public.studio_secret_references
for insert to authenticated
with check (private.studio_has_workspace_role(workspace_id, array['admin']) and created_by = (select auth.uid()));

drop policy studio_connector_bindings_insert on public.studio_connector_bindings;
create policy studio_connector_bindings_insert on public.studio_connector_bindings
for insert to authenticated
with check (
  private.studio_has_workspace_role(workspace_id, array['admin', 'operator'])
  and created_by = (select auth.uid())
  and observed_state = 'unknown'
  and health_status = 'unknown'
  and last_checked_at is null
  and verified_at is null
);

drop policy studio_hosting_targets_insert on public.studio_hosting_targets;
create policy studio_hosting_targets_insert on public.studio_hosting_targets
for insert to authenticated
with check (
  private.studio_has_workspace_role(workspace_id, array['admin', 'operator'])
  and created_by = (select auth.uid())
  and observed_state = 'unknown'
  and health_status = 'unknown'
  and last_checked_at is null
);

drop policy studio_workers_insert on public.studio_workers;
create policy studio_workers_insert on public.studio_workers
for insert to authenticated
with check (
  private.studio_has_workspace_role(workspace_id, array['admin', 'operator'])
  and created_by = (select auth.uid())
  and observed_state = 'unknown'
  and health_status = 'unknown'
  and last_heartbeat_at is null
  and observed_usage = '{}'::jsonb
);

drop policy studio_ai_providers_insert on public.studio_ai_providers;
create policy studio_ai_providers_insert on public.studio_ai_providers
for insert to authenticated
with check (
  private.studio_has_workspace_role(workspace_id, array['admin', 'operator'])
  and created_by = (select auth.uid())
  and observed_state = 'unknown'
  and health_status = 'unknown'
  and last_checked_at is null
);

drop policy studio_ai_models_insert on public.studio_ai_models;
create policy studio_ai_models_insert on public.studio_ai_models
for insert to authenticated
with check (
  private.studio_has_workspace_role(workspace_id, array['admin', 'operator'])
  and created_by = (select auth.uid())
  and observed_state = 'unknown'
  and health_status = 'unknown'
  and last_checked_at is null
);

drop policy studio_model_deployments_insert on public.studio_model_deployments;
create policy studio_model_deployments_insert on public.studio_model_deployments
for insert to authenticated
with check (
  private.studio_has_workspace_role(workspace_id, array['admin', 'operator'])
  and created_by = (select auth.uid())
  and observed_state = 'unknown'
  and health_status = 'unknown'
  and last_checked_at is null
);

drop policy studio_routing_policies_insert on public.studio_routing_policies;
create policy studio_routing_policies_insert on public.studio_routing_policies
for insert to authenticated
with check (private.studio_has_workspace_role(workspace_id, array['admin', 'operator']) and created_by = (select auth.uid()));

drop policy studio_action_requests_insert on public.studio_action_requests;
create policy studio_action_requests_insert on public.studio_action_requests
for insert to authenticated
with check (
  private.studio_has_workspace_role(workspace_id, array['admin', 'operator'])
  and requested_by = (select auth.uid())
  and status = 'pending'
  and started_at is null
  and completed_at is null
  and result_code is null
  and result_summary is null
);

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
