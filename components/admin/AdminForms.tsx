"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import {
  ADMIN_ROLES,
  CONNECTOR_KINDS,
  CONNECTOR_PROTOCOLS,
  ENVIRONMENTS,
  HOSTING_TARGET_KINDS,
  MODEL_RUNTIMES,
  OPERATING_MODES,
  PROVIDER_KINDS,
  VAULT_PROVIDERS,
  WORKER_KINDS,
  type AdminRole,
  type ConnectorBinding,
  type ConnectorInput,
  type HostingTarget,
  type HostingTargetInput,
  type ModelDeploymentInput,
  type ModelInput,
  type PlatformSettings,
  type ProviderInput,
  type RoutingPolicyInput,
  type SecretReference,
  type SecretReferenceInput,
  type AIModel,
  type AIProvider,
  type Worker,
  type WorkerInput,
} from "@/lib/admin-types";
import {
  normalizeAdminText,
  optionalAdminText,
  optionalPositiveInteger,
  optionalPositiveNumber,
  parseAdminList,
  parseOptionalAdminList,
  requireAdminLabel,
  requireEnvironment,
  requireHttpsUrl,
  requireSecretReference,
} from "@/lib/admin-validation";

function value(data: FormData, name: string): string {
  return String(data.get(name) ?? "");
}

function nullableId(data: FormData, name: string): string | null {
  const normalized = value(data, name).trim();
  return normalized || null;
}

type CreateFormProps<T> = {
  title: string;
  description: string;
  submitLabel: string;
  parse: (data: FormData) => T;
  onCreate: (input: T) => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
};

function CreateForm<T>({ title, description, submitLabel, parse, onCreate, children, disabled = false }: CreateFormProps<T>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || disabled) return;
    setPending(true);
    setError(null);
    try {
      const form = event.currentTarget;
      const input = parse(new FormData(form));
      await onCreate(input);
      form.reset();
      form.closest("details")?.removeAttribute("open");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "L’opération a échoué.");
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="admin-create-disclosure">
      <summary>{title}</summary>
      <form className="admin-form" onSubmit={submit}>
        <p className="admin-form__description">{description}</p>
        <div className="admin-form__grid">{children}</div>
        {error ? <p className="submit-error" role="alert">{error}</p> : null}
        <button className="primary-button" disabled={pending || disabled} type="submit">
          {pending ? "Enregistrement…" : submitLabel}
        </button>
      </form>
    </details>
  );
}

function Field({ label, name, children, help, wide = false }: { label: string; name: string; children: ReactNode; help?: string; wide?: boolean }) {
  return (
    <div className={wide ? "admin-field admin-field--wide" : "admin-field"}>
      <label htmlFor={name}>{label}</label>
      {children}
      {help ? <small>{help}</small> : null}
    </div>
  );
}

function EnvironmentSelect({ name = "environment" }: { name?: string }) {
  return (
    <select defaultValue="development" id={name} name={name}>
      {ENVIRONMENTS.map((environment) => <option key={environment} value={environment}>{environment}</option>)}
    </select>
  );
}

export function ConnectorForm({ secretReferences, onCreate, disabled }: { secretReferences: SecretReference[]; onCreate: (input: ConnectorInput) => Promise<void>; disabled: boolean }) {
  return (
    <CreateForm
      description="Déclare une connexion normalisée. La présence de la configuration ne prouve pas sa santé."
      disabled={disabled}
      onCreate={onCreate}
      parse={(data) => ({
        displayName: requireAdminLabel(value(data, "connector-name"), "Nom du connecteur"),
        connectorKind: value(data, "connector-kind") as ConnectorInput["connectorKind"],
        protocol: value(data, "connector-protocol") as ConnectorInput["protocol"],
        environment: requireEnvironment(value(data, "connector-environment")),
        capabilities: parseAdminList(value(data, "connector-capabilities"), "Capacités"),
        requiredScopes: parseOptionalAdminList(value(data, "connector-scopes"), "Scopes"),
        endpointUrl: requireHttpsUrl(value(data, "connector-endpoint"), "Endpoint"),
        secretReferenceId: nullableId(data, "connector-secret"),
      })}
      submitLabel="Enregistrer le connecteur"
      title="Ajouter une connexion"
    >
      <Field label="Nom" name="connector-name"><input id="connector-name" maxLength={120} name="connector-name" required /></Field>
      <Field label="Type" name="connector-kind"><select id="connector-kind" name="connector-kind">{CONNECTOR_KINDS.map((kind) => <option key={kind}>{kind}</option>)}</select></Field>
      <Field label="Protocole" name="connector-protocol"><select id="connector-protocol" name="connector-protocol">{CONNECTOR_PROTOCOLS.map((protocol) => <option key={protocol}>{protocol}</option>)}</select></Field>
      <Field label="Environnement" name="connector-environment"><EnvironmentSelect name="connector-environment" /></Field>
      <Field help="Séparées par des virgules, ex. repository.read, repository.commit" label="Capacités" name="connector-capabilities" wide><textarea id="connector-capabilities" name="connector-capabilities" required rows={3} /></Field>
      <Field help="Références de permissions, jamais de jeton." label="Scopes requis" name="connector-scopes" wide><textarea id="connector-scopes" name="connector-scopes" rows={2} /></Field>
      <Field label="Endpoint HTTPS" name="connector-endpoint" wide><input id="connector-endpoint" name="connector-endpoint" placeholder="https://api.exemple.com" type="url" /></Field>
      <Field label="Référence de secret" name="connector-secret" wide>
        <select defaultValue="" id="connector-secret" name="connector-secret">
          <option value="">Aucune</option>
          {secretReferences.map((secret) => <option key={secret.id} value={secret.id}>{secret.display_name} · {secret.environment}</option>)}
        </select>
      </Field>
    </CreateForm>
  );
}

export function SecretReferenceForm({ onCreate, disabled }: { onCreate: (input: SecretReferenceInput) => Promise<void>; disabled: boolean }) {
  return (
    <CreateForm
      description="Enregistre uniquement l’identifiant d’un secret déjà placé dans un coffre approuvé."
      disabled={disabled}
      onCreate={onCreate}
      parse={(data) => ({
        displayName: requireAdminLabel(value(data, "secret-name"), "Nom"),
        vaultProvider: value(data, "secret-provider") as SecretReferenceInput["vaultProvider"],
        externalReference: requireSecretReference(value(data, "secret-reference")),
        environment: requireEnvironment(value(data, "secret-environment")),
        scope: parseOptionalAdminList(value(data, "secret-scope"), "Scopes", 30),
      })}
      submitLabel="Enregistrer la référence"
      title="Ajouter une référence de secret"
    >
      <Field label="Nom" name="secret-name"><input id="secret-name" maxLength={120} name="secret-name" required /></Field>
      <Field label="Coffre" name="secret-provider"><select id="secret-provider" name="secret-provider">{VAULT_PROVIDERS.map((provider) => <option key={provider}>{provider}</option>)}</select></Field>
      <Field label="Environnement" name="secret-environment"><EnvironmentSelect name="secret-environment" /></Field>
      <Field help="Ex. netlify:VISION_GITHUB_TOKEN. Ne colle jamais la valeur du secret." label="Identifiant externe" name="secret-reference" wide><input autoComplete="off" id="secret-reference" maxLength={255} name="secret-reference" required /></Field>
      <Field label="Scopes" name="secret-scope" wide><textarea id="secret-scope" name="secret-scope" rows={2} /></Field>
    </CreateForm>
  );
}

export function HostingTargetForm({ connectors, onCreate, disabled }: { connectors: ConnectorBinding[]; onCreate: (input: HostingTargetInput) => Promise<void>; disabled: boolean }) {
  return (
    <CreateForm
      description="Déclare une plateforme, un VPS, une machine locale ou une cible de stockage."
      disabled={disabled}
      onCreate={onCreate}
      parse={(data) => ({
        displayName: requireAdminLabel(value(data, "target-name"), "Nom de la cible"),
        provider: requireAdminLabel(value(data, "target-provider"), "Fournisseur", 80),
        targetKind: value(data, "target-kind") as HostingTargetInput["targetKind"],
        environment: requireEnvironment(value(data, "target-environment")),
        region: optionalAdminText(value(data, "target-region"), "Région", 80),
        endpointUrl: requireHttpsUrl(value(data, "target-endpoint"), "Endpoint"),
        connectorBindingId: nullableId(data, "target-connector"),
      })}
      submitLabel="Enregistrer la cible"
      title="Ajouter un hébergement"
    >
      <Field label="Nom" name="target-name"><input id="target-name" maxLength={120} name="target-name" required /></Field>
      <Field label="Fournisseur" name="target-provider"><input id="target-provider" maxLength={80} name="target-provider" placeholder="Hostinger, Netlify…" required /></Field>
      <Field label="Type" name="target-kind"><select id="target-kind" name="target-kind">{HOSTING_TARGET_KINDS.map((kind) => <option key={kind}>{kind}</option>)}</select></Field>
      <Field label="Environnement" name="target-environment"><EnvironmentSelect name="target-environment" /></Field>
      <Field label="Région" name="target-region"><input id="target-region" maxLength={80} name="target-region" /></Field>
      <Field label="Endpoint HTTPS" name="target-endpoint"><input id="target-endpoint" name="target-endpoint" type="url" /></Field>
      <Field label="Connecteur lié" name="target-connector" wide><select defaultValue="" id="target-connector" name="target-connector"><option value="">Aucun</option>{connectors.map((connector) => <option key={connector.id} value={connector.id}>{connector.display_name}</option>)}</select></Field>
    </CreateForm>
  );
}

export function WorkerForm({ targets, onCreate, disabled }: { targets: HostingTarget[]; onCreate: (input: WorkerInput) => Promise<void>; disabled: boolean }) {
  return (
    <CreateForm
      description="Enregistre une capacité d’exécution. Les valeurs saisies sont déclaratives jusqu’au premier heartbeat vérifié."
      disabled={disabled}
      onCreate={onCreate}
      parse={(data) => {
        const cpu = optionalPositiveInteger(value(data, "worker-cpu"), "CPU");
        const ram = optionalPositiveInteger(value(data, "worker-ram"), "RAM");
        const gpu = optionalPositiveInteger(value(data, "worker-gpu"), "GPU");
        const vram = optionalPositiveInteger(value(data, "worker-vram"), "VRAM");
        return {
          displayName: requireAdminLabel(value(data, "worker-name"), "Nom du worker"),
          workerKind: value(data, "worker-kind") as WorkerInput["workerKind"],
          environment: requireEnvironment(value(data, "worker-environment")),
          hostingTargetId: nullableId(data, "worker-target"),
          endpointUrl: requireHttpsUrl(value(data, "worker-endpoint"), "Endpoint"),
          capabilities: parseAdminList(value(data, "worker-capabilities"), "Capacités"),
          capacity: Object.fromEntries(Object.entries({ cpu_cores: cpu, ram_mb: ram, gpu_count: gpu, vram_mb: vram }).filter(([, entry]) => entry !== null)) as Record<string, number>,
          agentVersion: optionalAdminText(value(data, "worker-agent"), "Version agent", 80),
        };
      }}
      submitLabel="Enregistrer le worker"
      title="Ajouter un worker CPU/GPU"
    >
      <Field label="Nom" name="worker-name"><input id="worker-name" maxLength={120} name="worker-name" required /></Field>
      <Field label="Type" name="worker-kind"><select id="worker-kind" name="worker-kind">{WORKER_KINDS.map((kind) => <option key={kind}>{kind}</option>)}</select></Field>
      <Field label="Environnement" name="worker-environment"><EnvironmentSelect name="worker-environment" /></Field>
      <Field label="Hébergement" name="worker-target"><select defaultValue="" id="worker-target" name="worker-target"><option value="">Non lié</option>{targets.map((target) => <option key={target.id} value={target.id}>{target.display_name}</option>)}</select></Field>
      <Field label="Endpoint agent HTTPS" name="worker-endpoint" wide><input id="worker-endpoint" name="worker-endpoint" type="url" /></Field>
      <Field label="CPU (cœurs)" name="worker-cpu"><input id="worker-cpu" min="0" name="worker-cpu" type="number" /></Field>
      <Field label="RAM (Mo)" name="worker-ram"><input id="worker-ram" min="0" name="worker-ram" type="number" /></Field>
      <Field label="Nombre de GPU" name="worker-gpu"><input id="worker-gpu" min="0" name="worker-gpu" type="number" /></Field>
      <Field label="VRAM (Mo)" name="worker-vram"><input id="worker-vram" min="0" name="worker-vram" type="number" /></Field>
      <Field label="Version agent" name="worker-agent"><input id="worker-agent" maxLength={80} name="worker-agent" /></Field>
      <Field help="Ex. compute.execute, model.inference, build.run" label="Capacités" name="worker-capabilities" wide><textarea id="worker-capabilities" name="worker-capabilities" required rows={2} /></Field>
    </CreateForm>
  );
}

export function ProviderForm({ connectors, onCreate, disabled }: { connectors: ConnectorBinding[]; onCreate: (input: ProviderInput) => Promise<void>; disabled: boolean }) {
  return (
    <CreateForm
      description="Déclare un fournisseur externe ou un runtime interne sans lier l’interface à une marque."
      disabled={disabled}
      onCreate={onCreate}
      parse={(data) => ({
        displayName: requireAdminLabel(value(data, "provider-name"), "Nom du fournisseur"),
        providerKind: value(data, "provider-kind") as ProviderInput["providerKind"],
        hostingMode: value(data, "provider-hosting") as ProviderInput["hostingMode"],
        connectorBindingId: nullableId(data, "provider-connector"),
        endpointUrl: requireHttpsUrl(value(data, "provider-endpoint"), "Endpoint"),
      })}
      submitLabel="Enregistrer le fournisseur"
      title="Ajouter un fournisseur IA"
    >
      <Field label="Nom" name="provider-name"><input id="provider-name" maxLength={120} name="provider-name" required /></Field>
      <Field label="Type" name="provider-kind"><select id="provider-kind" name="provider-kind">{PROVIDER_KINDS.map((kind) => <option key={kind}>{kind}</option>)}</select></Field>
      <Field label="Hébergement" name="provider-hosting"><select defaultValue="external" id="provider-hosting" name="provider-hosting"><option value="external">Externe</option><option value="internal">Interne / open source</option></select></Field>
      <Field label="Connecteur" name="provider-connector"><select defaultValue="" id="provider-connector" name="provider-connector"><option value="">Aucun</option>{connectors.map((connector) => <option key={connector.id} value={connector.id}>{connector.display_name}</option>)}</select></Field>
      <Field label="Endpoint HTTPS" name="provider-endpoint" wide><input id="provider-endpoint" name="provider-endpoint" type="url" /></Field>
    </CreateForm>
  );
}

export function ModelForm({ providers, onCreate, disabled }: { providers: AIProvider[]; onCreate: (input: ModelInput) => Promise<void>; disabled: boolean }) {
  return (
    <CreateForm
      description="Catalogue un modèle, y compris open source, avec ses capacités et besoins matériels."
      disabled={disabled || providers.length === 0}
      onCreate={onCreate}
      parse={(data) => {
        const hostingMode = value(data, "model-hosting") as ModelInput["hostingMode"];
        const runtimeRaw = value(data, "model-runtime");
        return {
          displayName: requireAdminLabel(value(data, "model-name"), "Nom du modèle"),
          providerId: value(data, "model-provider"),
          modelIdentifier: requireAdminLabel(value(data, "model-identifier"), "Identifiant", 200),
          modelVersion: requireAdminLabel(value(data, "model-version") || "unversioned", "Version", 100),
          hostingMode,
          modalities: parseAdminList(value(data, "model-modalities"), "Modalités", 10),
          contextWindow: optionalPositiveInteger(value(data, "model-context"), "Contexte"),
          supportsTools: data.get("model-tools") === "on",
          confidentialityClass: value(data, "model-confidentiality") as ModelInput["confidentialityClass"],
          runtime: runtimeRaw ? runtimeRaw as ModelInput["runtime"] : null,
          artifactReference: optionalAdminText(value(data, "model-artifact"), "Référence artefact", 500),
          resourceRequirements: Object.fromEntries(Object.entries({
            ram_mb: optionalPositiveInteger(value(data, "model-ram"), "RAM"),
            gpu_count: optionalPositiveInteger(value(data, "model-gpu"), "GPU"),
            vram_mb: optionalPositiveInteger(value(data, "model-vram"), "VRAM"),
            storage_mb: optionalPositiveInteger(value(data, "model-storage"), "Stockage"),
          }).filter(([, entry]) => entry !== null)) as Record<string, number>,
        };
      }}
      submitLabel="Enregistrer le modèle"
      title="Ajouter un modèle"
    >
      <Field label="Nom" name="model-name"><input id="model-name" maxLength={120} name="model-name" required /></Field>
      <Field label="Fournisseur" name="model-provider"><select id="model-provider" name="model-provider" required>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.display_name}</option>)}</select></Field>
      <Field label="Identifiant modèle" name="model-identifier"><input id="model-identifier" maxLength={200} name="model-identifier" required /></Field>
      <Field label="Version" name="model-version"><input defaultValue="unversioned" id="model-version" maxLength={100} name="model-version" required /></Field>
      <Field label="Hébergement" name="model-hosting"><select defaultValue="internal" id="model-hosting" name="model-hosting"><option value="internal">Interne / open source</option><option value="external">API externe</option></select></Field>
      <Field label="Runtime" name="model-runtime"><select defaultValue="" id="model-runtime" name="model-runtime"><option value="">Non défini</option>{MODEL_RUNTIMES.map((runtime) => <option key={runtime}>{runtime}</option>)}</select></Field>
      <Field label="Modalités" name="model-modalities"><input defaultValue="text" id="model-modalities" name="model-modalities" required /></Field>
      <Field label="Fenêtre de contexte" name="model-context"><input id="model-context" min="1" name="model-context" type="number" /></Field>
      <Field label="Confidentialité" name="model-confidentiality"><select defaultValue="standard" id="model-confidentiality" name="model-confidentiality"><option value="public">Public</option><option value="standard">Standard</option><option value="confidential">Confidentiel</option><option value="restricted">Restreint</option></select></Field>
      <Field label="Référence artefact" name="model-artifact"><input id="model-artifact" maxLength={500} name="model-artifact" /></Field>
      <Field label="RAM requise (Mo)" name="model-ram"><input id="model-ram" min="0" name="model-ram" type="number" /></Field>
      <Field label="GPU requis" name="model-gpu"><input id="model-gpu" min="0" name="model-gpu" type="number" /></Field>
      <Field label="VRAM requise (Mo)" name="model-vram"><input id="model-vram" min="0" name="model-vram" type="number" /></Field>
      <Field label="Stockage requis (Mo)" name="model-storage"><input id="model-storage" min="0" name="model-storage" type="number" /></Field>
      <label className="admin-checkbox admin-field--wide"><input id="model-tools" name="model-tools" type="checkbox" /> Support des outils</label>
    </CreateForm>
  );
}

export function ModelDeploymentForm({ models, workers, onCreate, disabled }: { models: AIModel[]; workers: Worker[]; onCreate: (input: ModelDeploymentInput) => Promise<void>; disabled: boolean }) {
  return (
    <CreateForm
      description="Lie un modèle interne à un worker compatible. L’installation réelle passe par une demande d’action."
      disabled={disabled || models.length === 0 || workers.length === 0}
      onCreate={onCreate}
      parse={(data) => ({
        displayName: requireAdminLabel(value(data, "deployment-name"), "Nom du déploiement"),
        modelId: value(data, "deployment-model"),
        workerId: value(data, "deployment-worker"),
        runtimeConfiguration: {
          replicas: optionalPositiveInteger(value(data, "deployment-replicas"), "Réplicas") ?? 1,
          max_concurrency: optionalPositiveInteger(value(data, "deployment-concurrency"), "Concurrence") ?? 1,
        },
      })}
      submitLabel="Enregistrer le déploiement"
      title="Lier un modèle à un worker"
    >
      <Field label="Nom" name="deployment-name"><input id="deployment-name" maxLength={120} name="deployment-name" required /></Field>
      <Field label="Modèle" name="deployment-model"><select id="deployment-model" name="deployment-model">{models.map((model) => <option key={model.id} value={model.id}>{model.display_name}</option>)}</select></Field>
      <Field label="Worker" name="deployment-worker"><select id="deployment-worker" name="deployment-worker">{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.display_name}</option>)}</select></Field>
      <Field label="Réplicas" name="deployment-replicas"><input defaultValue="1" id="deployment-replicas" min="1" name="deployment-replicas" type="number" /></Field>
      <Field label="Concurrence max" name="deployment-concurrency"><input defaultValue="1" id="deployment-concurrency" min="1" name="deployment-concurrency" type="number" /></Field>
    </CreateForm>
  );
}

export function RoutingPolicyForm({ models, onCreate, disabled }: { models: AIModel[]; onCreate: (input: RoutingPolicyInput) => Promise<void>; disabled: boolean }) {
  return (
    <CreateForm
      description="Définit un routage explicite. Les politiques internal_only interdisent tout repli externe."
      disabled={disabled}
      onCreate={onCreate}
      parse={(data) => {
        const confidentiality = value(data, "routing-confidentiality") as RoutingPolicyInput["confidentialityRule"];
        const allowExternal = data.get("routing-external-fallback") === "on";
        if (confidentiality.includes("internal_only") && allowExternal) {
          throw new Error("Un routage interne ne peut pas autoriser un repli externe.");
        }
        return {
          displayName: requireAdminLabel(value(data, "routing-name"), "Nom de la politique"),
          operatingMode: value(data, "routing-mode") as RoutingPolicyInput["operatingMode"],
          confidentialityRule: confidentiality,
          requiredModalities: parseAdminList(value(data, "routing-modalities"), "Modalités", 10),
          preferredModelIds: data.getAll("routing-preferred").map(String),
          fallbackModelIds: data.getAll("routing-fallback").map(String),
          allowExternalFallback: allowExternal,
          requireFallbackConfirmation: data.get("routing-confirm") === "on",
          maxCostUsdPerRequest: optionalPositiveNumber(value(data, "routing-cost"), "Coût maximum"),
          targetLatencyMs: optionalPositiveInteger(value(data, "routing-latency"), "Latence"),
          minimumFreeVramMb: optionalPositiveInteger(value(data, "routing-vram"), "VRAM libre"),
        };
      }}
      submitLabel="Enregistrer la politique"
      title="Ajouter une politique de routage"
    >
      <Field label="Nom" name="routing-name"><input id="routing-name" maxLength={120} name="routing-name" required /></Field>
      <Field label="Mode" name="routing-mode"><select defaultValue="hybrid" id="routing-mode" name="routing-mode">{OPERATING_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></Field>
      <Field label="Confidentialité" name="routing-confidentiality"><select defaultValue="standard" id="routing-confidentiality" name="routing-confidentiality"><option value="public">Public</option><option value="standard">Standard</option><option value="internal_only">Interne uniquement</option><option value="restricted_internal_only">Restreint interne uniquement</option></select></Field>
      <Field label="Modalités requises" name="routing-modalities"><input defaultValue="text" id="routing-modalities" name="routing-modalities" required /></Field>
      <Field help="Ctrl/Cmd pour plusieurs valeurs." label="Modèles préférés" name="routing-preferred" wide><select id="routing-preferred" multiple name="routing-preferred">{models.map((model) => <option key={model.id} value={model.id}>{model.display_name}</option>)}</select></Field>
      <Field label="Modèles de repli" name="routing-fallback" wide><select id="routing-fallback" multiple name="routing-fallback">{models.map((model) => <option key={model.id} value={model.id}>{model.display_name}</option>)}</select></Field>
      <Field label="Coût max / requête (USD)" name="routing-cost"><input id="routing-cost" min="0" name="routing-cost" step="0.000001" type="number" /></Field>
      <Field label="Latence cible (ms)" name="routing-latency"><input id="routing-latency" min="1" name="routing-latency" type="number" /></Field>
      <Field label="VRAM libre minimale (Mo)" name="routing-vram"><input id="routing-vram" min="0" name="routing-vram" type="number" /></Field>
      <div className="admin-checkboxes admin-field--wide">
        <label className="admin-checkbox"><input id="routing-external-fallback" name="routing-external-fallback" type="checkbox" /> Autoriser un repli externe</label>
        <label className="admin-checkbox"><input defaultChecked id="routing-confirm" name="routing-confirm" type="checkbox" /> Confirmer avant le repli</label>
      </div>
    </CreateForm>
  );
}

export function SettingsForm({ settings, onSave, disabled }: { settings: PlatformSettings; onSave: (values: { operatingMode: "external" | "internal" | "hybrid"; defaultEnvironment: "development" | "staging" | "production"; requireProductionApproval: boolean; requireInternalForConfidential: boolean; maxMonthlyCostUsd: number | null; maxActionRetries: number }) => Promise<void>; disabled: boolean }) {
  return (
    <CreateForm
      description="Ces règles s’appliquent à tout l’espace administratif."
      disabled={disabled}
      onCreate={onSave}
      parse={(data) => ({
        operatingMode: value(data, "settings-mode") as "external" | "internal" | "hybrid",
        defaultEnvironment: requireEnvironment(value(data, "settings-environment")),
        requireProductionApproval: data.get("settings-production-approval") === "on",
        requireInternalForConfidential: data.get("settings-internal-confidential") === "on",
        maxMonthlyCostUsd: optionalPositiveNumber(value(data, "settings-budget"), "Budget"),
        maxActionRetries: optionalPositiveInteger(value(data, "settings-retries"), "Tentatives") ?? 2,
      })}
      submitLabel="Enregistrer les paramètres"
      title="Modifier les paramètres globaux"
    >
      <Field label="Mode opérationnel" name="settings-mode"><select defaultValue={settings.operating_mode} id="settings-mode" name="settings-mode">{OPERATING_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></Field>
      <Field label="Environnement par défaut" name="settings-environment"><select defaultValue={settings.default_environment} id="settings-environment" name="settings-environment">{ENVIRONMENTS.map((environment) => <option key={environment}>{environment}</option>)}</select></Field>
      <Field label="Budget mensuel maximum (USD)" name="settings-budget"><input defaultValue={settings.max_monthly_cost_usd ?? ""} id="settings-budget" min="0" name="settings-budget" step="0.01" type="number" /></Field>
      <Field label="Tentatives maximum" name="settings-retries"><input defaultValue={settings.max_action_retries} id="settings-retries" max="5" min="0" name="settings-retries" type="number" /></Field>
      <div className="admin-checkboxes admin-field--wide">
        <label className="admin-checkbox"><input defaultChecked={settings.require_production_approval} id="settings-production-approval" name="settings-production-approval" type="checkbox" /> Approbation obligatoire en production</label>
        <label className="admin-checkbox"><input defaultChecked={settings.require_internal_for_confidential} id="settings-internal-confidential" name="settings-internal-confidential" type="checkbox" /> Modèle interne obligatoire pour le confidentiel</label>
      </div>
    </CreateForm>
  );
}

export function MemberForm({ onCreate, disabled }: { onCreate: (input: { email: string; role: AdminRole }) => Promise<void>; disabled: boolean }) {
  return (
    <CreateForm
      description="Un compte existant est ajouté immédiatement ; sinon Supabase envoie une invitation sécurisée par e-mail."
      disabled={disabled}
      onCreate={onCreate}
      parse={(data) => {
        const email = value(data, "member-email").trim().toLocaleLowerCase("fr");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) || email.length > 254) throw new Error("L’adresse e-mail est invalide.");
        return { email, role: value(data, "member-role") as AdminRole };
      }}
      submitLabel="Inviter le membre"
      title="Inviter un membre"
    >
      <Field label="Adresse e-mail" name="member-email" wide><input autoComplete="email" id="member-email" name="member-email" required type="email" /></Field>
      <Field label="Rôle" name="member-role"><select defaultValue="viewer" id="member-role" name="member-role">{ADMIN_ROLES.map((role) => <option key={role}>{role}</option>)}</select></Field>
    </CreateForm>
  );
}

export function workspaceSlugFromName(name: string): string {
  return normalizeAdminText(name)
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 63);
}
