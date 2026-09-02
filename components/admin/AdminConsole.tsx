"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { workspaceSlugFromName } from "@/components/admin/AdminForms";
import { SupabaseAdminRepository } from "@/lib/admin-repository";
import type { WorkspaceAccess } from "@/lib/admin-types";
import {
  getBrowserSupabaseClient,
  readPublicSupabaseConfiguration,
  type PublicSupabaseConfiguration,
} from "@/lib/supabase-client";
import { requireAdminLabel } from "@/lib/admin-validation";

const WORKSPACE_STORAGE_KEY = "vision-smart-studio:admin-workspace";

function AdminProductPreview() {
  return (
    <section aria-label="Capacités du centre d’administration" className="admin-auth-preview">
      <article><span aria-hidden="true">⌁</span><div><strong>Connectivités</strong><small>API, MCP, OAuth, GitHub, Supabase et Netlify</small></div></article>
      <article><span aria-hidden="true">▦</span><div><strong>VPS et GPU</strong><small>Cloud, on-premise, workers et heartbeats</small></div></article>
      <article><span aria-hidden="true">✦</span><div><strong>Modèles open source</strong><small>Ollama, vLLM, TGI et llama.cpp</small></div></article>
      <article><span aria-hidden="true">⇄</span><div><strong>Routage gouverné</strong><small>Confidentialité, coût, latence et repli</small></div></article>
    </section>
  );
}

function ConfigurationMissing() {
  return (
    <main className="admin-auth-shell">
      <Link className="admin-auth-back" href="/">← Retour au Studio</Link>
      <section className="admin-auth-card admin-auth-card--wide">
        <header className="admin-auth-card__brand"><span>V</span><div><p className="eyebrow">VISIION SMART STUDIO</p><h1>Centre d’administration</h1></div></header>
        <div className="admin-config-warning" role="alert">
          <strong>Configuration Supabase requise</strong>
          <p>Le centre de contrôle refuse de démarrer sans une URL Supabase et une clé publique valides. Aucune clé de service ne doit être exposée au navigateur.</p>
          <code>NEXT_PUBLIC_SUPABASE_URL</code>
          <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>
        </div>
        <AdminProductPreview />
      </section>
    </main>
  );
}

function Authentication({
  configuration,
  onAuthenticated,
}: {
  configuration: PublicSupabaseConfiguration;
  onAuthenticated: (user: User) => void;
}) {
  const client = useMemo(() => getBrowserSupabaseClient(configuration), [configuration]);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim().toLocaleLowerCase("fr");
    const password = String(data.get("password") ?? "");
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        if (password.length < 12) throw new Error("Le mot de passe doit contenir au moins 12 caractères.");
        const result = await client.auth.signUp({ email, password });
        if (result.error) throw result.error;
        if (result.data.user && result.data.session) onAuthenticated(result.data.user);
        else setNotice("Compte demandé. Consulte ta messagerie pour confirmer l’adresse, puis connecte-toi.");
      } else {
        const result = await client.auth.signInWithPassword({ email, password });
        if (result.error || !result.data.user) throw result.error ?? new Error("Session absente.");
        onAuthenticated(result.data.user);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "L’authentification a échoué.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="admin-auth-shell">
      <Link className="admin-auth-back" href="/">← Retour au Studio</Link>
      <div className="admin-auth-layout">
        <section className="admin-auth-card">
          <header className="admin-auth-card__brand"><span>V</span><div><p className="eyebrow">VISIION SMART STUDIO</p><h1>Centre d’administration</h1></div></header>
          <p className="admin-auth-intro">Pilote les connexions, l’infrastructure et les modèles IA depuis un plan de contrôle sécurisé.</p>
          <div className="admin-auth-tabs" role="tablist">
            <button aria-selected={mode === "signin"} onClick={() => setMode("signin")} role="tab" type="button">Connexion</button>
            <button aria-selected={mode === "signup"} onClick={() => setMode("signup")} role="tab" type="button">Créer un compte</button>
          </div>
          <form className="admin-auth-form" onSubmit={submit}>
            <label htmlFor="admin-email">Adresse e-mail</label>
            <input autoComplete="email" id="admin-email" name="email" required type="email" />
            <label htmlFor="admin-password">Mot de passe</label>
            <input autoComplete={mode === "signin" ? "current-password" : "new-password"} id="admin-password" minLength={mode === "signup" ? 12 : undefined} name="password" required type="password" />
            {mode === "signup" ? <small>12 caractères minimum. L’adresse peut nécessiter une confirmation.</small> : null}
            {error ? <p className="submit-error" role="alert">{error}</p> : null}
            {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
            <button className="primary-button" disabled={pending} type="submit">{pending ? "Vérification…" : mode === "signin" ? "Accéder au contrôle" : "Créer le compte"}</button>
          </form>
          <p className="admin-auth-security"><span aria-hidden="true">◇</span> Accès protégé par Supabase Auth et RLS.</p>
        </section>
        <div className="admin-auth-side">
          <p className="eyebrow">PLAN DE CONTRÔLE UNIFIÉ</p>
          <h2>Une vue fiable de toute l’exécution.</h2>
          <p>Les états demandés et observés restent séparés. Chaque opération sensible produit une demande auditable avant son exécution sur un service distant.</p>
          <AdminProductPreview />
        </div>
      </div>
    </main>
  );
}

function WorkspaceBootstrap({
  repository,
  onCreated,
  onSignOut,
}: {
  repository: SupabaseAdminRepository;
  onCreated: (workspaceId: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const name = requireAdminLabel(String(data.get("workspace-name") ?? ""), "Nom de l’espace");
      const slug = workspaceSlugFromName(name);
      if (slug.length < 3) throw new Error("Le nom doit produire un identifiant d’au moins 3 caractères.");
      const workspaceId = await repository.createWorkspace(name, slug);
      await onCreated(workspaceId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "La création de l’espace a échoué.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="admin-auth-shell">
      <section className="admin-auth-card">
        <header className="admin-auth-card__brand"><span>V</span><div><p className="eyebrow">PREMIÈRE CONFIGURATION</p><h1>Créer l’espace administrateur</h1></div></header>
        <p className="admin-auth-intro">Cet espace isolera ses connexions, machines, modèles, politiques et journaux. Ton compte en deviendra l’administrateur initial.</p>
        <form className="admin-auth-form" onSubmit={submit}>
          <label htmlFor="workspace-name">Nom de l’organisation ou du studio</label>
          <input autoFocus id="workspace-name" maxLength={120} name="workspace-name" placeholder="VISIION Smart Studio" required />
          {error ? <p className="submit-error" role="alert">{error}</p> : null}
          <button className="primary-button" disabled={pending} type="submit">{pending ? "Création…" : "Créer l’espace sécurisé"}</button>
          <button className="admin-link-button" onClick={() => void onSignOut()} type="button">Utiliser un autre compte</button>
        </form>
      </section>
    </main>
  );
}

export function AdminConsole() {
  const [configuration] = useState<PublicSupabaseConfiguration | null>(() => readPublicSupabaseConfiguration());
  const client = useMemo(() => configuration ? getBrowserSupabaseClient(configuration) : null, [configuration]);
  const repository = useMemo(() => client ? new SupabaseAdminRepository(client) : null, [client]);
  const [sessionLoading, setSessionLoading] = useState(Boolean(client));
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceAccess[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setSessionLoading(false);
    });
    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      if (!session) {
        setWorkspaces([]);
        setSelectedWorkspaceId(null);
      }
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [client]);

  const reloadWorkspaces = useCallback(async () => {
    if (!repository || !user) return;
    setWorkspacesLoading(true);
    setError(null);
    try {
      const access = await repository.listWorkspaceAccess(user.id);
      setWorkspaces(access);
      const remembered = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
      const next = access.some((entry) => entry.workspace.id === remembered) ? remembered : access[0]?.workspace.id ?? null;
      setSelectedWorkspaceId(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Les espaces n’ont pas pu être chargés.");
    } finally {
      setWorkspacesLoading(false);
    }
  }, [repository, user]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void reloadWorkspaces(), 0);
    return () => window.clearTimeout(timeout);
  }, [reloadWorkspaces]);

  function selectWorkspace(workspaceId: string) {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
    setSelectedWorkspaceId(workspaceId);
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
    window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  }

  if (!configuration) return <ConfigurationMissing />;
  if (sessionLoading) return <div className="loading-screen">Vérification de la session sécurisée…</div>;
  if (!user) return <Authentication configuration={configuration} onAuthenticated={setUser} />;
  if (!repository) return <ConfigurationMissing />;
  if (workspacesLoading) return <div className="loading-screen">Chargement des espaces administrés…</div>;
  if (error) return <main className="admin-auth-shell"><section className="admin-auth-card"><p className="submit-error" role="alert">{error}</p><button className="secondary-button" onClick={() => void reloadWorkspaces()} type="button">Réessayer</button></section></main>;
  if (!workspaces.length) return <WorkspaceBootstrap onCreated={async (workspaceId) => { await reloadWorkspaces(); selectWorkspace(workspaceId); }} onSignOut={signOut} repository={repository} />;

  const access = workspaces.find((entry) => entry.workspace.id === selectedWorkspaceId) ?? workspaces[0];
  return (
    <AdminDashboard
      access={access}
      onReloadWorkspaces={reloadWorkspaces}
      onSelectWorkspace={selectWorkspace}
      onSignOut={signOut}
      repository={repository}
      userEmail={user.email ?? "Compte authentifié"}
      workspaces={workspaces}
    />
  );
}

export default AdminConsole;
