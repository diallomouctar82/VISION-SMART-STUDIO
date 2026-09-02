import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminAction,
  AdminEnvironment,
  AdminInventory,
  AdminRole,
  ActionTargetType,
  ConnectorInput,
  HostingTargetInput,
  ModelDeploymentInput,
  ModelInput,
  ProviderInput,
  RoutingPolicyInput,
  SecretReferenceInput,
  WorkerInput,
  WorkspaceAccess,
} from "@/lib/admin-types";
import { AdminRepositoryError } from "@/lib/admin-types";
import { createIdempotencyKey } from "@/lib/admin-validation";
import type { Database, Json } from "@/lib/supabase-database.types";

function repositoryError(error: PostgrestError | Error | null, fallback: string): AdminRepositoryError {
  if (!error) return new AdminRepositoryError("UNEXPECTED", fallback);
  const code = "code" in error ? error.code : "";
  if (code === "23505") return new AdminRepositoryError("DUPLICATE", "Un élément portant ce nom existe déjà.");
  if (code === "23503") return new AdminRepositoryError("DEPENDENCY_UNAVAILABLE", "Une ressource liée est absente ou appartient à un autre espace.");
  if (code === "23514" || code === "22023" || code === "P0001") return new AdminRepositoryError("INVALID", error.message);
  if (code === "40001") return new AdminRepositoryError("CONFLICT", "La ressource a changé dans une autre session. Recharge la page.");
  if (
    code === "42501"
    && (error.message.includes("PRODUCTION_APPROVAL_REQUIRED") || error.message.includes("PRODUCTION_RELEASE_GATE_UNAVAILABLE"))
  ) {
    return new AdminRepositoryError("FORBIDDEN", "Une approbation de livraison vérifiable est requise avant toute action en production.");
  }
  if (code === "42501" || code === "PGRST301") return new AdminRepositoryError("FORBIDDEN", "Cette action n’est pas autorisée pour ton rôle.");
  if (code === "PGRST116") return new AdminRepositoryError("NOT_FOUND", "La ressource demandée est introuvable.");
  return new AdminRepositoryError("UNEXPECTED", fallback);
}

async function requireUserId(client: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new AdminRepositoryError("AUTH_REQUIRED", "Reconnecte-toi pour continuer.");
  return data.user.id;
}

export class SupabaseAdminRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listWorkspaceAccess(userId: string): Promise<WorkspaceAccess[]> {
    const memberships = await this.client
      .from("studio_workspace_members")
      .select("workspace_id, role")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (memberships.error) throw repositoryError(memberships.error, "Impossible de charger les droits d’accès.");
    if (!memberships.data.length) return [];

    const workspaces = await this.client
      .from("studio_workspaces")
      .select("*")
      .in("id", memberships.data.map((membership) => membership.workspace_id));
    if (workspaces.error) throw repositoryError(workspaces.error, "Impossible de charger les espaces.");

    const byId = new Map(workspaces.data.map((workspace) => [workspace.id, workspace]));
    return memberships.data.flatMap((membership) => {
      const workspace = byId.get(membership.workspace_id);
      return workspace ? [{ workspace, role: membership.role as AdminRole }] : [];
    });
  }

  async createWorkspace(name: string, slug: string): Promise<string> {
    const result = await this.client.rpc("studio_create_workspace", { p_name: name, p_slug: slug });
    if (result.error || !result.data) throw repositoryError(result.error, "La création de l’espace a échoué.");
    return result.data;
  }

  async loadInventory(workspaceId: string): Promise<AdminInventory> {
    const [settings, members, secretReferences, connectors, hostingTargets, workers, providers, models, modelDeployments, routingPolicies, actionRequests, connectionChecks, auditEvents] = await Promise.all([
      this.client.from("studio_platform_settings").select("*").eq("workspace_id", workspaceId).single(),
      this.client.from("studio_workspace_members").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: true }),
      this.client.from("studio_secret_references").select("*").eq("workspace_id", workspaceId).order("display_name"),
      this.client.from("studio_connector_bindings").select("*").eq("workspace_id", workspaceId).order("display_name"),
      this.client.from("studio_hosting_targets").select("*").eq("workspace_id", workspaceId).order("display_name"),
      this.client.from("studio_workers").select("*").eq("workspace_id", workspaceId).order("display_name"),
      this.client.from("studio_ai_providers").select("*").eq("workspace_id", workspaceId).order("display_name"),
      this.client.from("studio_ai_models").select("*").eq("workspace_id", workspaceId).order("display_name"),
      this.client.from("studio_model_deployments").select("*").eq("workspace_id", workspaceId).order("display_name"),
      this.client.from("studio_routing_policies").select("*").eq("workspace_id", workspaceId).order("display_name"),
      this.client.from("studio_action_requests").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50),
      this.client.from("studio_connection_checks").select("*").eq("workspace_id", workspaceId).order("checked_at", { ascending: false }).limit(50),
      this.client.from("studio_audit_events").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(100),
    ]);

    const failed = [settings, members, secretReferences, connectors, hostingTargets, workers, providers, models, modelDeployments, routingPolicies, actionRequests, connectionChecks, auditEvents].find((result) => result.error);
    if (failed?.error) throw repositoryError(failed.error, "Le chargement du centre d’administration a échoué.");
    if (!settings.data) throw new AdminRepositoryError("NOT_FOUND", "Les paramètres de l’espace sont absents.");

    return {
      settings: settings.data,
      members: members.data ?? [],
      secretReferences: secretReferences.data ?? [],
      connectors: connectors.data ?? [],
      hostingTargets: hostingTargets.data ?? [],
      workers: workers.data ?? [],
      providers: providers.data ?? [],
      models: models.data ?? [],
      modelDeployments: modelDeployments.data ?? [],
      routingPolicies: routingPolicies.data ?? [],
      actionRequests: actionRequests.data ?? [],
      connectionChecks: connectionChecks.data ?? [],
      auditEvents: auditEvents.data ?? [],
    };
  }

  async updateSettings(workspaceId: string, version: number, values: {
    operatingMode: "external" | "internal" | "hybrid";
    defaultEnvironment: AdminEnvironment;
    requireProductionApproval: boolean;
    requireInternalForConfidential: boolean;
    maxMonthlyCostUsd: number | null;
    maxActionRetries: number;
  }): Promise<void> {
    const result = await this.client
      .from("studio_platform_settings")
      .update({
        operating_mode: values.operatingMode,
        default_environment: values.defaultEnvironment,
        require_production_approval: values.requireProductionApproval,
        require_internal_for_confidential: values.requireInternalForConfidential,
        max_monthly_cost_usd: values.maxMonthlyCostUsd,
        max_action_retries: values.maxActionRetries,
      })
      .eq("workspace_id", workspaceId)
      .eq("resource_version", version)
      .select("workspace_id");
    if (result.error) throw repositoryError(result.error, "Les paramètres n’ont pas été enregistrés.");
    if (!result.data.length) throw new AdminRepositoryError("CONFLICT", "Les paramètres ont changé dans une autre session. Recharge la page.");
  }

  async createSecretReference(workspaceId: string, input: SecretReferenceInput): Promise<void> {
    const result = await this.client.from("studio_secret_references").insert({
      workspace_id: workspaceId,
      display_name: input.displayName,
      vault_provider: input.vaultProvider,
      external_reference: input.externalReference,
      environment: input.environment,
      scope: input.scope,
    });
    if (result.error) throw repositoryError(result.error, "La référence de secret n’a pas été enregistrée.");
  }

  async createConnector(workspaceId: string, input: ConnectorInput): Promise<void> {
    const result = await this.client.from("studio_connector_bindings").insert({
      workspace_id: workspaceId,
      display_name: input.displayName,
      connector_kind: input.connectorKind,
      protocol: input.protocol,
      environment: input.environment,
      capabilities: input.capabilities,
      required_scopes: input.requiredScopes,
      endpoint_url: input.endpointUrl,
      secret_reference_id: input.secretReferenceId,
    });
    if (result.error) throw repositoryError(result.error, "Le connecteur n’a pas été enregistré.");
  }

  async createHostingTarget(workspaceId: string, input: HostingTargetInput): Promise<void> {
    const result = await this.client.from("studio_hosting_targets").insert({
      workspace_id: workspaceId,
      display_name: input.displayName,
      provider: input.provider,
      target_kind: input.targetKind,
      environment: input.environment,
      region: input.region,
      endpoint_url: input.endpointUrl,
      connector_binding_id: input.connectorBindingId,
    });
    if (result.error) throw repositoryError(result.error, "La cible d’hébergement n’a pas été enregistrée.");
  }

  async createWorker(workspaceId: string, input: WorkerInput): Promise<void> {
    const result = await this.client.from("studio_workers").insert({
      workspace_id: workspaceId,
      display_name: input.displayName,
      worker_kind: input.workerKind,
      environment: input.environment,
      hosting_target_id: input.hostingTargetId,
      endpoint_url: input.endpointUrl,
      capabilities: input.capabilities,
      capacity: input.capacity as Json,
      agent_version: input.agentVersion,
    });
    if (result.error) throw repositoryError(result.error, "Le worker n’a pas été enregistré.");
  }

  async createProvider(workspaceId: string, input: ProviderInput): Promise<void> {
    const result = await this.client.from("studio_ai_providers").insert({
      workspace_id: workspaceId,
      display_name: input.displayName,
      provider_kind: input.providerKind,
      hosting_mode: input.hostingMode,
      connector_binding_id: input.connectorBindingId,
      endpoint_url: input.endpointUrl,
    });
    if (result.error) throw repositoryError(result.error, "Le fournisseur de modèles n’a pas été enregistré.");
  }

  async createModel(workspaceId: string, input: ModelInput): Promise<void> {
    const result = await this.client.from("studio_ai_models").insert({
      workspace_id: workspaceId,
      provider_id: input.providerId,
      display_name: input.displayName,
      model_identifier: input.modelIdentifier,
      model_version: input.modelVersion,
      hosting_mode: input.hostingMode,
      modalities: input.modalities,
      context_window: input.contextWindow,
      supports_tools: input.supportsTools,
      confidentiality_class: input.confidentialityClass,
      runtime: input.runtime,
      artifact_reference: input.artifactReference,
      resource_requirements: input.resourceRequirements as Json,
    });
    if (result.error) throw repositoryError(result.error, "Le modèle n’a pas été enregistré.");
  }

  async createModelDeployment(workspaceId: string, input: ModelDeploymentInput): Promise<void> {
    const result = await this.client.from("studio_model_deployments").insert({
      workspace_id: workspaceId,
      model_id: input.modelId,
      worker_id: input.workerId,
      display_name: input.displayName,
      runtime_configuration: input.runtimeConfiguration as Json,
    });
    if (result.error) throw repositoryError(result.error, "Le déploiement de modèle n’a pas été enregistré.");
  }

  async createRoutingPolicy(workspaceId: string, input: RoutingPolicyInput): Promise<void> {
    const result = await this.client.from("studio_routing_policies").insert({
      workspace_id: workspaceId,
      display_name: input.displayName,
      operating_mode: input.operatingMode,
      confidentiality_rule: input.confidentialityRule,
      required_modalities: input.requiredModalities,
      preferred_model_ids: input.preferredModelIds,
      fallback_model_ids: input.fallbackModelIds,
      allow_external_fallback: input.allowExternalFallback,
      require_fallback_confirmation: input.requireFallbackConfirmation,
      max_cost_usd_per_request: input.maxCostUsdPerRequest,
      target_latency_ms: input.targetLatencyMs,
      minimum_free_vram_mb: input.minimumFreeVramMb,
    });
    if (result.error) throw repositoryError(result.error, "La politique de routage n’a pas été enregistrée.");
  }

  async requestAction(
    workspaceId: string,
    targetType: ActionTargetType,
    targetId: string,
    action: AdminAction,
    environment: AdminEnvironment,
    idempotencyKey: string | null = null,
  ): Promise<void> {
    const result = await this.client.rpc("studio_request_action", {
      p_workspace_id: workspaceId,
      p_target_type: targetType,
      p_target_id: targetId,
      p_action: action,
      p_environment: environment,
      p_idempotency_key: idempotencyKey,
    });
    if (result.error) throw repositoryError(result.error, "La demande d’action n’a pas été créée.");
  }

  async requestTransition(
    workspaceId: string,
    targetType: ActionTargetType,
    targetId: string,
    resourceVersion: number,
    desiredState: string,
    action: AdminAction,
    environment: AdminEnvironment,
  ): Promise<void> {
    const result = await this.client.rpc("studio_request_transition", {
      p_workspace_id: workspaceId,
      p_target_type: targetType,
      p_target_id: targetId,
      p_resource_version: resourceVersion,
      p_desired_state: desiredState,
      p_action: action,
      p_environment: environment,
      p_idempotency_key: createIdempotencyKey(
        targetType,
        targetId,
        action,
        environment,
        resourceVersion,
        desiredState,
      ),
    });
    if (result.error) throw repositoryError(result.error, "La transition n’a pas pu être enregistrée.");
  }

  async addMember(workspaceId: string, userId: string, role: AdminRole): Promise<void> {
    const actorId = await requireUserId(this.client);
    const result = await this.client.from("studio_workspace_members").insert({
      workspace_id: workspaceId,
      user_id: userId,
      role,
      created_by: actorId,
    });
    if (result.error) throw repositoryError(result.error, "Le membre n’a pas été ajouté.");
  }

  async inviteMember(workspaceId: string, email: string, role: AdminRole): Promise<void> {
    const result = await this.client.functions.invoke("admin-invite-member", {
      body: { workspaceId, email, role },
    });
    if (result.error) throw new AdminRepositoryError("UNEXPECTED", "L’invitation n’a pas pu être envoyée.");
    if (result.data?.error) {
      const message = result.data.error === "ADMIN_ROLE_REQUIRED"
        ? "Seul un administrateur peut inviter un membre."
        : "L’invitation n’a pas pu être finalisée.";
      throw new AdminRepositoryError(result.data.error === "ADMIN_ROLE_REQUIRED" ? "FORBIDDEN" : "UNEXPECTED", message);
    }
  }

  async updateMemberRole(workspaceId: string, userId: string, role: AdminRole, version: number): Promise<void> {
    const result = await this.client
      .from("studio_workspace_members")
      .update({ role })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("resource_version", version)
      .select("user_id");
    if (result.error) throw repositoryError(result.error, "Le rôle n’a pas été modifié.");
    if (!result.data.length) throw new AdminRepositoryError("CONFLICT", "Le membre a changé dans une autre session.");
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    const result = await this.client
      .from("studio_workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);
    if (result.error) throw repositoryError(result.error, "Le membre n’a pas été retiré.");
  }
}
