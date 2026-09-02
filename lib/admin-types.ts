import type { Tables } from "@/lib/supabase-database.types";

export const ADMIN_ROLES = ["admin", "operator", "auditor", "viewer"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_SECTIONS = [
  "overview",
  "connections",
  "infrastructure",
  "models",
  "routing",
  "security",
  "audit",
] as const;
export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export const ENVIRONMENTS = ["development", "staging", "production"] as const;
export type AdminEnvironment = (typeof ENVIRONMENTS)[number];

export const OPERATING_MODES = ["external", "internal", "hybrid"] as const;
export type OperatingMode = (typeof OPERATING_MODES)[number];

export const CONNECTOR_KINDS = [
  "github",
  "supabase",
  "netlify",
  "vercel",
  "docker",
  "nginx",
  "database",
  "storage",
  "ci_cd",
  "generic_vps",
  "generic_api",
  "identity",
] as const;

export const CONNECTOR_PROTOCOLS = [
  "rest",
  "graphql",
  "webhook",
  "mcp",
  "sdk",
  "oauth",
  "oidc",
  "ssh",
] as const;

export const HOSTING_TARGET_KINDS = [
  "platform",
  "cloud",
  "vps",
  "on_premise",
  "container_host",
  "database",
  "storage",
] as const;

export const WORKER_KINDS = [
  "local",
  "vps_cpu",
  "vps_gpu",
  "cloud_cpu",
  "cloud_gpu",
  "container",
] as const;

export const PROVIDER_KINDS = [
  "openai_compatible",
  "anthropic",
  "gemini",
  "openrouter",
  "ollama",
  "vllm",
  "tgi",
  "llamacpp",
  "custom",
] as const;

export const MODEL_RUNTIMES = [
  "managed_api",
  "ollama",
  "vllm",
  "tgi",
  "llamacpp",
  "custom",
] as const;

export const VAULT_PROVIDERS = [
  "supabase_vault",
  "netlify",
  "hostinger",
  "external_vault",
  "worker_vault",
] as const;

export type Workspace = Tables<"studio_workspaces">;
export type WorkspaceMember = Tables<"studio_workspace_members">;
export type PlatformSettings = Tables<"studio_platform_settings">;
export type SecretReference = Tables<"studio_secret_references">;
export type ConnectorBinding = Tables<"studio_connector_bindings">;
export type HostingTarget = Tables<"studio_hosting_targets">;
export type Worker = Tables<"studio_workers">;
export type AIProvider = Tables<"studio_ai_providers">;
export type AIModel = Tables<"studio_ai_models">;
export type ModelDeployment = Tables<"studio_model_deployments">;
export type RoutingPolicy = Tables<"studio_routing_policies">;
export type ActionRequest = Tables<"studio_action_requests">;
export type ConnectionCheck = Tables<"studio_connection_checks">;
export type AuditEvent = Tables<"studio_audit_events">;

export type WorkspaceAccess = {
  workspace: Workspace;
  role: AdminRole;
};

export type AdminInventory = {
  settings: PlatformSettings;
  members: WorkspaceMember[];
  secretReferences: SecretReference[];
  connectors: ConnectorBinding[];
  hostingTargets: HostingTarget[];
  workers: Worker[];
  providers: AIProvider[];
  models: AIModel[];
  modelDeployments: ModelDeployment[];
  routingPolicies: RoutingPolicy[];
  actionRequests: ActionRequest[];
  connectionChecks: ConnectionCheck[];
  auditEvents: AuditEvent[];
};

export type ConnectorInput = {
  displayName: string;
  connectorKind: (typeof CONNECTOR_KINDS)[number];
  protocol: (typeof CONNECTOR_PROTOCOLS)[number];
  environment: AdminEnvironment;
  capabilities: string[];
  requiredScopes: string[];
  endpointUrl: string | null;
  secretReferenceId: string | null;
};

export type HostingTargetInput = {
  displayName: string;
  provider: string;
  targetKind: (typeof HOSTING_TARGET_KINDS)[number];
  environment: AdminEnvironment;
  region: string | null;
  endpointUrl: string | null;
  connectorBindingId: string | null;
};

export type WorkerInput = {
  displayName: string;
  workerKind: (typeof WORKER_KINDS)[number];
  environment: AdminEnvironment;
  hostingTargetId: string | null;
  endpointUrl: string | null;
  capabilities: string[];
  capacity: Record<string, string | number>;
  agentVersion: string | null;
};

export type ProviderInput = {
  displayName: string;
  providerKind: (typeof PROVIDER_KINDS)[number];
  hostingMode: "external" | "internal";
  connectorBindingId: string | null;
  endpointUrl: string | null;
};

export type ModelInput = {
  displayName: string;
  providerId: string;
  modelIdentifier: string;
  modelVersion: string;
  hostingMode: "external" | "internal";
  modalities: string[];
  contextWindow: number | null;
  supportsTools: boolean;
  confidentialityClass: "public" | "standard" | "confidential" | "restricted";
  runtime: (typeof MODEL_RUNTIMES)[number] | null;
  artifactReference: string | null;
  resourceRequirements: Record<string, string | number>;
};

export type ModelDeploymentInput = {
  displayName: string;
  modelId: string;
  workerId: string;
  runtimeConfiguration: Record<string, string | number | boolean>;
};

export type RoutingPolicyInput = {
  displayName: string;
  operatingMode: OperatingMode;
  confidentialityRule: "public" | "standard" | "internal_only" | "restricted_internal_only";
  requiredModalities: string[];
  preferredModelIds: string[];
  fallbackModelIds: string[];
  allowExternalFallback: boolean;
  requireFallbackConfirmation: boolean;
  maxCostUsdPerRequest: number | null;
  targetLatencyMs: number | null;
  minimumFreeVramMb: number | null;
};

export type SecretReferenceInput = {
  displayName: string;
  vaultProvider: (typeof VAULT_PROVIDERS)[number];
  externalReference: string;
  environment: AdminEnvironment;
  scope: string[];
};

export type ActionTargetType =
  | "connector"
  | "hosting_target"
  | "worker"
  | "provider"
  | "model"
  | "model_deployment";

export type AdminAction =
  | "authorize"
  | "health_check"
  | "activate"
  | "deactivate"
  | "install"
  | "verify"
  | "upgrade"
  | "rollback"
  | "maintenance"
  | "resume"
  | "remove";

export type RepositoryFailureCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "DUPLICATE"
  | "INVALID"
  | "NOT_FOUND"
  | "DEPENDENCY_UNAVAILABLE"
  | "UNEXPECTED";

export class AdminRepositoryError extends Error {
  constructor(
    public readonly code: RepositoryFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "AdminRepositoryError";
  }
}
