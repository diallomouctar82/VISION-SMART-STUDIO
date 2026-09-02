"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ConnectorForm,
  HostingTargetForm,
  MemberForm,
  ModelDeploymentForm,
  ModelForm,
  ProviderForm,
  RoutingPolicyForm,
  SecretReferenceForm,
  SettingsForm,
  WorkerForm,
} from "@/components/admin/AdminForms";
import { AdminResourceCard } from "@/components/admin/AdminResourceCard";
import type {
  AdminAction,
  AdminEnvironment,
  AdminInventory,
  AdminRole,
  AdminSection,
  ActionTargetType,
  WorkspaceAccess,
} from "@/lib/admin-types";
import { ADMIN_ROLES, ADMIN_SECTIONS } from "@/lib/admin-types";
import type { SupabaseAdminRepository } from "@/lib/admin-repository";

const SECTION_LABELS: Record<AdminSection, string> = {
  overview: "Vue d’ensemble",
  connections: "Connexions",
  infrastructure: "Infrastructure",
  models: "Modèles IA",
  routing: "Routage",
  security: "Sécurité",
  audit: "Audit",
};

const ROLE_LABELS: Record<AdminRole, string> = {
  admin: "Administrateur",
  operator: "Opérateur",
  auditor: "Auditeur",
  viewer: "Lecteur",
};

function formatDate(value: string | null): string {
  if (!value) return "Jamais";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function listLabel(values: string[]): string {
  return values.length ? values.join(" · ") : "Aucune";
}

function safeEnvironment(value: string): AdminEnvironment {
  return value === "production" || value === "staging" ? value : "development";
}

type AdminDashboardProps = {
  repository: SupabaseAdminRepository;
  access: WorkspaceAccess;
  workspaces: WorkspaceAccess[];
  userEmail: string;
  onSelectWorkspace: (workspaceId: string) => void;
  onReloadWorkspaces: () => Promise<void>;
  onSignOut: () => Promise<void>;
};

export function AdminDashboard({
  repository,
  access,
  workspaces,
  userEmail,
  onSelectWorkspace,
  onReloadWorkspaces,
  onSignOut,
}: AdminDashboardProps) {
  const [section, setSection] = useState<AdminSection>("overview");
  const [inventory, setInventory] = useState<AdminInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canOperate = access.role === "admin" || access.role === "operator";
  const canAdminister = access.role === "admin";
  const canViewAudit = access.role === "admin" || access.role === "auditor";
  const visibleSections = useMemo(
    () => ADMIN_SECTIONS.filter((candidate) => candidate !== "audit" || canViewAudit),
    [canViewAudit],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setInventory(await repository.loadInventory(access.workspace.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Le chargement a échoué.");
    } finally {
      setLoading(false);
    }
  }, [access.workspace.id, repository]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function mutate(message: string, operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await operation();
      await load();
      setNotice(message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "L’opération a échoué.");
    } finally {
      setBusy(false);
    }
  }

  async function request(
    targetType: ActionTargetType,
    targetId: string,
    action: AdminAction,
    environment: string,
  ) {
    await mutate("Demande enregistrée. L’état observé changera uniquement après confirmation de l’agent d’exécution.", () =>
      repository.requestAction(access.workspace.id, targetType, targetId, action, safeEnvironment(environment)),
    );
  }

  async function transition(
    targetType: ActionTargetType,
    targetId: string,
    version: number,
    desiredState: string,
    action: AdminAction,
    environment: string,
  ) {
    await mutate("Transition demandée et inscrite dans la file d’exécution.", () =>
      repository.requestTransition(
        access.workspace.id,
        targetType,
        targetId,
        version,
        desiredState,
        action,
        safeEnvironment(environment),
      ),
    );
  }

  const degradedCount = inventory ? [
    ...inventory.connectors,
    ...inventory.hostingTargets,
    ...inventory.workers,
    ...inventory.providers,
    ...inventory.models,
    ...inventory.modelDeployments,
  ].filter((resource) => resource.health_status === "degraded" || resource.health_status === "unhealthy").length : 0;

  const pendingActions = inventory?.actionRequests.filter((action) => action.status === "pending" || action.status === "running").length ?? 0;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/">
          <span aria-hidden="true" className="admin-brand__mark">V</span>
          <span><strong>VISIION</strong><small>Smart Studio</small></span>
        </Link>

        <div className="admin-workspace-switcher">
          <label htmlFor="admin-workspace">Espace administré</label>
          <select
            id="admin-workspace"
            onChange={(event) => onSelectWorkspace(event.target.value)}
            value={access.workspace.id}
          >
            {workspaces.map((entry) => (
              <option key={entry.workspace.id} value={entry.workspace.id}>{entry.workspace.name}</option>
            ))}
          </select>
          <span>{ROLE_LABELS[access.role]}</span>
        </div>

        <nav aria-label="Administration" className="admin-navigation">
          {visibleSections.map((candidate) => (
            <button
              aria-current={section === candidate ? "page" : undefined}
              className={section === candidate ? "is-active" : ""}
              key={candidate}
              onClick={() => setSection(candidate)}
              type="button"
            >
              <span aria-hidden="true">{candidate === "overview" ? "◫" : candidate === "connections" ? "⌁" : candidate === "infrastructure" ? "▦" : candidate === "models" ? "✦" : candidate === "routing" ? "⇄" : candidate === "security" ? "◇" : "≡"}</span>
              {SECTION_LABELS[candidate]}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <span>{userEmail}</span>
          <button className="admin-link-button" onClick={() => void onSignOut()} type="button">Se déconnecter</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">CENTRE DE CONTRÔLE</p>
            <h1>{SECTION_LABELS[section]}</h1>
          </div>
          <div className="admin-topbar__actions">
            <span className="admin-live-indicator"><i /> Données Supabase</span>
            <button className="secondary-button" disabled={loading || busy} onClick={() => void load()} type="button">Actualiser</button>
          </div>
        </header>

        <div aria-live="polite" className="admin-feedback">
          {error ? <p className="submit-error" role="alert">{error}</p> : null}
          {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
        </div>

        {loading ? <div className="admin-loading" role="status">Chargement du plan de contrôle…</div> : null}
        {!loading && !inventory ? <div className="admin-empty">Aucune donnée administrative disponible.</div> : null}

        {!loading && inventory ? (
          <div className="admin-content">
            {section === "overview" ? (
              <section aria-labelledby="overview-title" className="admin-section">
                <div className="admin-section__heading">
                  <div><h2 id="overview-title">État opérationnel</h2><p>Inventaire réel et demandes d’exécution de {access.workspace.name}.</p></div>
                </div>
                <div className="admin-metrics">
                  <article><span>Connexions</span><strong>{inventory.connectors.length}</strong><small>{inventory.secretReferences.length} référence(s) de coffre</small></article>
                  <article><span>Capacité de calcul</span><strong>{inventory.workers.length}</strong><small>{inventory.hostingTargets.length} cible(s) d’hébergement</small></article>
                  <article><span>Modèles</span><strong>{inventory.models.length}</strong><small>{inventory.modelDeployments.length} déploiement(s)</small></article>
                  <article className={pendingActions ? "is-warning" : ""}><span>Actions en attente</span><strong>{pendingActions}</strong><small>Traçables dans l’audit</small></article>
                  <article className={degradedCount ? "is-danger" : ""}><span>Santé dégradée</span><strong>{degradedCount}</strong><small>Observation vérifiée uniquement</small></article>
                </div>

                <div className="admin-overview-grid">
                  <article className="admin-panel-card">
                    <header><div><p className="eyebrow">POLITIQUE</p><h2>Garde-fous actifs</h2></div><span className="admin-status admin-status--success">appliqués</span></header>
                    <ul className="admin-check-list">
                      <li><span>Mode opérationnel</span><strong>{inventory.settings.operating_mode}</strong></li>
                      <li><span>Approbation production</span><strong>{inventory.settings.require_production_approval ? "Obligatoire" : "Optionnelle"}</strong></li>
                      <li><span>Confidentiel en interne</span><strong>{inventory.settings.require_internal_for_confidential ? "Obligatoire" : "Non imposé"}</strong></li>
                      <li><span>Budget mensuel</span><strong>{inventory.settings.max_monthly_cost_usd === null ? "Non plafonné" : `${inventory.settings.max_monthly_cost_usd} USD`}</strong></li>
                    </ul>
                  </article>
                  <article className="admin-panel-card">
                    <header><div><p className="eyebrow">EXÉCUTION</p><h2>Chaîne de confiance</h2></div></header>
                    <ol className="admin-trust-chain">
                      <li className="is-ready"><span>1</span><div><strong>Demande validée</strong><small>Rôle, RLS et politique</small></div></li>
                      <li><span>2</span><div><strong>Action mise en file</strong><small>Idempotence et corrélation</small></div></li>
                      <li><span>3</span><div><strong>Agent de confiance</strong><small>VPS, GPU ou connecteur</small></div></li>
                      <li><span>4</span><div><strong>Preuve observée</strong><small>Santé, latence et audit</small></div></li>
                    </ol>
                    <p className="admin-honesty-note">Une configuration enregistrée n’est jamais présentée comme opérationnelle avant une preuve émise par l’adaptateur d’exécution.</p>
                  </article>
                </div>
                <SettingsForm
                  disabled={!canAdminister || busy}
                  onSave={(values) => mutate("Paramètres globaux enregistrés.", () => repository.updateSettings(access.workspace.id, inventory.settings.resource_version, values))}
                  settings={inventory.settings}
                />
              </section>
            ) : null}

            {section === "connections" ? (
              <section aria-labelledby="connections-title" className="admin-section">
                <div className="admin-section__heading"><div><h2 id="connections-title">Connecteurs et autorisations</h2><p>GitHub, Supabase, Netlify, API, MCP, OAuth, stockage et services externes.</p></div><span>{inventory.connectors.length} connexion(s)</span></div>
                <div className="admin-callout"><strong>Secrets hors navigateur</strong><p>Cette interface ne reçoit jamais les valeurs secrètes. Elle conserve uniquement des références vers un coffre autorisé.</p></div>
                <div className="admin-resource-grid">
                  {inventory.connectors.map((connector) => (
                    <AdminResourceCard
                      actions={canOperate ? <>
                        <button disabled={busy} onClick={() => void request("connector", connector.id, "health_check", connector.environment)} type="button">Tester</button>
                        {connector.desired_state === "enabled"
                          ? <button disabled={busy} onClick={() => void transition("connector", connector.id, connector.resource_version, "disabled", "deactivate", connector.environment)} type="button">Désactiver</button>
                          : <button disabled={busy} onClick={() => void transition("connector", connector.id, connector.resource_version, "enabled", "activate", connector.environment)} type="button">Activer</button>}
                      </> : null}
                      description={connector.endpoint_url}
                      desiredState={connector.desired_state}
                      environment={connector.environment}
                      healthStatus={connector.health_status}
                      key={connector.id}
                      kind={`${connector.connector_kind} · ${connector.protocol}`}
                      meta={<><span>Capacités : {listLabel(connector.capabilities)}</span><span>Dernier contrôle : {formatDate(connector.last_checked_at)}</span></>}
                      observedState={connector.observed_state}
                      title={connector.display_name}
                    />
                  ))}
                  {!inventory.connectors.length ? <p className="admin-empty admin-empty--grid">Aucun connecteur déclaré.</p> : null}
                </div>
                <div className="admin-form-pair">
                  <ConnectorForm disabled={!canOperate || busy} onCreate={(input) => mutate("Connecteur enregistré.", () => repository.createConnector(access.workspace.id, input))} secretReferences={inventory.secretReferences} />
                  <SecretReferenceForm disabled={!canAdminister || busy} onCreate={(input) => mutate("Référence de coffre enregistrée.", () => repository.createSecretReference(access.workspace.id, input))} />
                </div>
                <div className="admin-table-card">
                  <header><h2>Références de secrets</h2><span>{inventory.secretReferences.length}</span></header>
                  <div className="admin-table-scroll"><table><thead><tr><th>Nom</th><th>Coffre</th><th>Environnement</th><th>Portée</th><th>État</th></tr></thead><tbody>
                    {inventory.secretReferences.map((secret) => <tr key={secret.id}><td>{secret.display_name}</td><td>{secret.vault_provider}<small>{secret.external_reference}</small></td><td>{secret.environment}</td><td>{listLabel(secret.scope)}</td><td><span className="admin-status admin-status--neutral">{secret.status}</span></td></tr>)}
                    {!inventory.secretReferences.length ? <tr><td colSpan={5}>Aucune référence de coffre.</td></tr> : null}
                  </tbody></table></div>
                </div>
              </section>
            ) : null}

            {section === "infrastructure" ? (
              <section aria-labelledby="infrastructure-title" className="admin-section">
                <div className="admin-section__heading"><div><h2 id="infrastructure-title">VPS, cloud et ordinateurs GPU</h2><p>Topologie d’hébergement, agents CPU/GPU, capacités annoncées et heartbeats observés.</p></div><span>{inventory.workers.length} worker(s)</span></div>
                <h3 className="admin-subheading">Cibles d’hébergement</h3>
                <div className="admin-resource-grid">
                  {inventory.hostingTargets.map((target) => <AdminResourceCard
                    actions={canOperate ? <button disabled={busy} onClick={() => void request("hosting_target", target.id, "health_check", target.environment)} type="button">Vérifier</button> : null}
                    description={target.endpoint_url}
                    desiredState={target.desired_state}
                    environment={target.environment}
                    healthStatus={target.health_status}
                    key={target.id}
                    kind={`${target.provider} · ${target.target_kind}`}
                    meta={<><span>Région : {target.region ?? "non renseignée"}</span><span>Dernier contrôle : {formatDate(target.last_checked_at)}</span></>}
                    observedState={target.observed_state}
                    title={target.display_name}
                  />)}
                  {!inventory.hostingTargets.length ? <p className="admin-empty admin-empty--grid">Aucun VPS ou hébergement déclaré.</p> : null}
                </div>
                <h3 className="admin-subheading">Workers d’exécution</h3>
                <div className="admin-resource-grid">
                  {inventory.workers.map((worker) => <AdminResourceCard
                    actions={canOperate ? <>
                      <button disabled={busy} onClick={() => void request("worker", worker.id, "health_check", worker.environment)} type="button">Heartbeat</button>
                      {worker.desired_state === "maintenance"
                        ? <button disabled={busy} onClick={() => void transition("worker", worker.id, worker.resource_version, "enabled", "resume", worker.environment)} type="button">Reprendre</button>
                        : <button disabled={busy} onClick={() => void transition("worker", worker.id, worker.resource_version, "maintenance", "maintenance", worker.environment)} type="button">Maintenance</button>}
                    </> : null}
                    description={worker.endpoint_url}
                    desiredState={worker.desired_state}
                    environment={worker.environment}
                    healthStatus={worker.health_status}
                    key={worker.id}
                    kind={worker.worker_kind}
                    meta={<><span>Capacités : {listLabel(worker.capabilities)}</span><span>Agent : {worker.agent_version ?? "non enrôlé"}</span><span>Dernier heartbeat : {formatDate(worker.last_heartbeat_at)}</span></>}
                    observedState={worker.observed_state}
                    title={worker.display_name}
                  />)}
                  {!inventory.workers.length ? <p className="admin-empty admin-empty--grid">Aucun ordinateur d’exécution enrôlé.</p> : null}
                </div>
                <div className="admin-form-pair">
                  <HostingTargetForm connectors={inventory.connectors} disabled={!canOperate || busy} onCreate={(input) => mutate("Cible d’hébergement enregistrée.", () => repository.createHostingTarget(access.workspace.id, input))} />
                  <WorkerForm disabled={!canOperate || busy} onCreate={(input) => mutate("Worker enregistré. Il restera non vérifié jusqu’au premier heartbeat signé.", () => repository.createWorker(access.workspace.id, input))} targets={inventory.hostingTargets} />
                </div>
              </section>
            ) : null}

            {section === "models" ? (
              <section aria-labelledby="models-title" className="admin-section">
                <div className="admin-section__heading"><div><h2 id="models-title">Catalogue et runtimes open source</h2><p>APIs externes, Ollama, vLLM, TGI, llama.cpp et runtimes personnalisés.</p></div><span>{inventory.models.length} modèle(s)</span></div>
                <h3 className="admin-subheading">Fournisseurs et runtimes</h3>
                <div className="admin-resource-grid">
                  {inventory.providers.map((provider) => <AdminResourceCard
                    actions={canOperate ? <button disabled={busy} onClick={() => void request("provider", provider.id, "health_check", inventory.settings.default_environment)} type="button">Tester l’API</button> : null}
                    description={provider.endpoint_url}
                    desiredState={provider.desired_state}
                    healthStatus={provider.health_status}
                    key={provider.id}
                    kind={`${provider.provider_kind} · ${provider.hosting_mode}`}
                    meta={<span>Dernier contrôle : {formatDate(provider.last_checked_at)}</span>}
                    observedState={provider.observed_state}
                    title={provider.display_name}
                  />)}
                  {!inventory.providers.length ? <p className="admin-empty admin-empty--grid">Aucun fournisseur IA déclaré.</p> : null}
                </div>
                <h3 className="admin-subheading">Modèles</h3>
                <div className="admin-resource-grid">
                  {inventory.models.map((model) => <AdminResourceCard
                    actions={canOperate ? <button disabled={busy} onClick={() => void request("model", model.id, "verify", inventory.settings.default_environment)} type="button">Vérifier</button> : null}
                    description={`${model.model_identifier} · ${model.model_version}`}
                    desiredState={model.desired_state}
                    healthStatus={model.health_status}
                    key={model.id}
                    kind={`${model.hosting_mode} · ${model.runtime ?? "runtime géré"}`}
                    meta={<><span>Modalités : {listLabel(model.modalities)}</span><span>Contexte : {model.context_window?.toLocaleString("fr-FR") ?? "non renseigné"}</span><span>Classe : {model.confidentiality_class}</span></>}
                    observedState={model.observed_state}
                    title={model.display_name}
                  />)}
                  {!inventory.models.length ? <p className="admin-empty admin-empty--grid">Aucun modèle catalogué.</p> : null}
                </div>
                <h3 className="admin-subheading">Déploiements internes</h3>
                <div className="admin-resource-grid">
                  {inventory.modelDeployments.map((deployment) => <AdminResourceCard
                    actions={canOperate ? <>
                      <button disabled={busy} onClick={() => void request("model_deployment", deployment.id, "install", inventory.settings.default_environment)} type="button">Installer</button>
                      <button disabled={busy} onClick={() => void transition("model_deployment", deployment.id, deployment.resource_version, "active", "activate", inventory.settings.default_environment)} type="button">Activer</button>
                    </> : null}
                    desiredState={deployment.desired_state}
                    healthStatus={deployment.health_status}
                    key={deployment.id}
                    kind="modèle ↔ worker"
                    meta={<><span>Modèle : {inventory.models.find((model) => model.id === deployment.model_id)?.display_name ?? deployment.model_id}</span><span>Worker : {inventory.workers.find((worker) => worker.id === deployment.worker_id)?.display_name ?? deployment.worker_id}</span></>}
                    observedState={deployment.observed_state}
                    title={deployment.display_name}
                  />)}
                  {!inventory.modelDeployments.length ? <p className="admin-empty admin-empty--grid">Aucun modèle lié à un worker.</p> : null}
                </div>
                <div className="admin-form-stack">
                  <ProviderForm connectors={inventory.connectors} disabled={!canOperate || busy} onCreate={(input) => mutate("Fournisseur IA enregistré.", () => repository.createProvider(access.workspace.id, input))} />
                  <ModelForm disabled={!canOperate || busy} onCreate={(input) => mutate("Modèle ajouté au catalogue.", () => repository.createModel(access.workspace.id, input))} providers={inventory.providers} />
                  <ModelDeploymentForm disabled={!canOperate || busy} models={inventory.models.filter((model) => model.hosting_mode === "internal")} onCreate={(input) => mutate("Déploiement de modèle enregistré.", () => repository.createModelDeployment(access.workspace.id, input))} workers={inventory.workers} />
                </div>
              </section>
            ) : null}

            {section === "routing" ? (
              <section aria-labelledby="routing-title" className="admin-section">
                <div className="admin-section__heading"><div><h2 id="routing-title">Politiques de routage IA</h2><p>Confidentialité, coût, latence, VRAM, modalités et stratégies de repli explicites.</p></div><span>{inventory.routingPolicies.length} politique(s)</span></div>
                <div className="admin-resource-grid">
                  {inventory.routingPolicies.map((policy) => <AdminResourceCard
                    healthStatus={policy.enabled ? "enabled" : "disabled"}
                    key={policy.id}
                    kind={`${policy.operating_mode} · ${policy.confidentiality_rule}`}
                    meta={<><span>Modalités : {listLabel(policy.required_modalities)}</span><span>Préférés : {policy.preferred_model_ids.length}</span><span>Replis : {policy.fallback_model_ids.length}</span><span>Repli externe : {policy.allow_external_fallback ? "autorisé" : "interdit"}</span></>}
                    title={policy.display_name}
                  />)}
                  {!inventory.routingPolicies.length ? <p className="admin-empty admin-empty--grid">Aucune politique de routage.</p> : null}
                </div>
                <RoutingPolicyForm disabled={!canAdminister || busy} models={inventory.models} onCreate={(input) => mutate("Politique de routage enregistrée.", () => repository.createRoutingPolicy(access.workspace.id, input))} />
              </section>
            ) : null}

            {section === "security" ? (
              <section aria-labelledby="security-title" className="admin-section">
                <div className="admin-section__heading"><div><h2 id="security-title">Accès et gouvernance</h2><p>Rôles de moindre privilège, politiques globales et références de secrets.</p></div><span>{inventory.members.length} membre(s)</span></div>
                <div className="admin-callout admin-callout--success"><strong>RLS active sur 14 tables</strong><p>Les permissions sont contrôlées par Supabase Auth, les rôles d’espace et les politiques Row Level Security.</p></div>
                <SettingsForm disabled={!canAdminister || busy} onSave={(values) => mutate("Paramètres de sécurité enregistrés.", () => repository.updateSettings(access.workspace.id, inventory.settings.resource_version, values))} settings={inventory.settings} />
                <div className="admin-table-card">
                  <header><h2>Membres</h2><span>{inventory.members.length}</span></header>
                  <div className="admin-table-scroll"><table><thead><tr><th>Utilisateur</th><th>Rôle</th><th>Ajout</th><th>Actions</th></tr></thead><tbody>
                    {inventory.members.map((member) => <tr key={member.user_id}><td><code>{member.user_id}</code></td><td>
                      <select aria-label={`Rôle de ${member.user_id}`} disabled={!canAdminister || busy} onChange={(event) => void mutate("Rôle modifié.", () => repository.updateMemberRole(access.workspace.id, member.user_id, event.target.value as AdminRole, member.resource_version))} value={member.role}>
                        {ADMIN_ROLES.map((role) => <option key={role}>{role}</option>)}
                      </select>
                    </td><td>{formatDate(member.created_at)}</td><td><button className="admin-table-action admin-table-action--danger" disabled={!canAdminister || busy} onClick={() => void mutate("Membre retiré.", async () => { await repository.removeMember(access.workspace.id, member.user_id); await onReloadWorkspaces(); })} type="button">Retirer</button></td></tr>)}
                  </tbody></table></div>
                </div>
                <MemberForm disabled={!canAdminister || busy} onCreate={(input) => mutate("Membre ajouté ou invitation envoyée.", () => repository.inviteMember(access.workspace.id, input.email, input.role))} />
              </section>
            ) : null}

            {section === "audit" && canViewAudit ? (
              <section aria-labelledby="audit-title" className="admin-section">
                <div className="admin-section__heading"><div><h2 id="audit-title">Journal et preuves d’exécution</h2><p>Historique append-only des actions, résultats techniques et contrôles de connexion.</p></div><span>{inventory.auditEvents.length} événement(s)</span></div>
                <div className="admin-table-card"><header><h2>Demandes d’action</h2><span>{inventory.actionRequests.length}</span></header><div className="admin-table-scroll"><table><thead><tr><th>Date</th><th>Cible</th><th>Action</th><th>Environnement</th><th>État</th><th>Résultat</th></tr></thead><tbody>
                  {inventory.actionRequests.map((action) => <tr key={action.id}><td>{formatDate(action.created_at)}</td><td>{action.target_type}<small>{action.target_id}</small></td><td>{action.action}</td><td>{action.environment}</td><td><span className={`admin-status admin-status--${action.status === "succeeded" ? "success" : action.status === "failed" ? "danger" : "warning"}`}>{action.status}</span></td><td>{action.result_summary ?? "En attente de l’adaptateur"}</td></tr>)}
                  {!inventory.actionRequests.length ? <tr><td colSpan={6}>Aucune demande d’action.</td></tr> : null}
                </tbody></table></div></div>
                <div className="admin-table-card"><header><h2>Contrôles de connectivité</h2><span>{inventory.connectionChecks.length}</span></header><div className="admin-table-scroll"><table><thead><tr><th>Date</th><th>Cible</th><th>État</th><th>Latence</th><th>Résumé</th></tr></thead><tbody>
                  {inventory.connectionChecks.map((check) => <tr key={check.id}><td>{formatDate(check.checked_at)}</td><td>{check.target_type}<small>{check.target_id}</small></td><td><span className={`admin-status admin-status--${check.status === "healthy" ? "success" : "danger"}`}>{check.status}</span></td><td>{check.latency_ms === null ? "—" : `${check.latency_ms} ms`}</td><td>{check.summary}</td></tr>)}
                  {!inventory.connectionChecks.length ? <tr><td colSpan={5}>Aucun contrôle confirmé.</td></tr> : null}
                </tbody></table></div></div>
                <div className="admin-table-card"><header><h2>Journal immuable</h2><span>{inventory.auditEvents.length}</span></header><div className="admin-table-scroll"><table><thead><tr><th>Date</th><th>Acteur</th><th>Type</th><th>Action</th><th>Résultat</th><th>Corrélation</th></tr></thead><tbody>
                  {inventory.auditEvents.map((event) => <tr key={event.id}><td>{formatDate(event.created_at)}</td><td><code>{event.actor_user_id ?? "système"}</code></td><td>{event.target_type}</td><td>{event.action}</td><td>{event.result}</td><td><code>{event.correlation_id}</code></td></tr>)}
                  {!inventory.auditEvents.length ? <tr><td colSpan={6}>Aucun événement.</td></tr> : null}
                </tbody></table></div></div>
              </section>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
