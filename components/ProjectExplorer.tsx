"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import ProjectSetupDialog from "@/components/ProjectSetupDialog";
import type {
  ProjectSettingsValues,
  ProjectSetupValues,
} from "@/components/ProjectSetupDialog";
import type { PersistenceStatus, StudioProjectV3 } from "@/lib/studio-types";

export type ProjectFileSummary = {
  id: string;
  name: string;
  kind?: string;
};

export type PersistencePresentation = {
  status: PersistenceStatus;
  message: string;
};

export type ProjectExplorerProps = {
  projects: readonly StudioProjectV3[];
  activeProjectId: string | null;
  onCreateProject: (values: ProjectSetupValues) => void | Promise<void>;
  onUpdateProject?: (
    projectId: string,
    values: ProjectSettingsValues,
  ) => void | Promise<void>;
  onSelectProject: (projectId: string) => void;
  files?: readonly ProjectFileSummary[];
  selectedFileId?: string | null;
  onSelectFile?: (fileId: string) => void;
  persistence?: PersistencePresentation;
  mutationsDisabled?: boolean;
};

const projectStatusLabel: Record<StudioProjectV3["status"], string> = {
  draft: "Brouillon",
  active: "Actif",
  paused: "En pause",
  completed: "Terminé",
};

const projectEnvironmentLabel: Record<StudioProjectV3["environment"], string> = {
  development: "Développement",
  staging: "Préproduction",
  production: "Production",
};

export function ProjectExplorer({
  projects,
  activeProjectId,
  onCreateProject,
  onUpdateProject,
  onSelectProject,
  files = [],
  selectedFileId = null,
  onSelectFile,
  persistence,
  mutationsDisabled = false,
}: ProjectExplorerProps) {
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null;

  function closeDialog() {
    const returnTarget = dialogMode === "edit" ? settingsButtonRef.current : createButtonRef.current;
    setDialogMode(null);
    requestAnimationFrame(() => returnTarget?.focus());
  }

  async function submitSetup(values: ProjectSetupValues) {
    if (dialogMode === "edit") {
      if (!activeProject || !onUpdateProject) {
        throw new Error("Aucun projet actif ne peut être modifié.");
      }
      await onUpdateProject(activeProject.id, values);
    } else {
      await onCreateProject(values);
    }
    closeDialog();
  }

  const persistenceStatus = persistence?.status ?? "idle";
  const persistenceMessage = persistence?.message ?? "État local de développement — Phase 1";

  return (
    <aside aria-labelledby="project-explorer-title" className="studio-panel project-explorer">
      <header className="project-explorer__brand">
        <p className="eyebrow">VISION SMART</p>
        <h1 id="project-explorer-title">Studio</h1>
      </header>

      <div className="project-actions">
        <button
          aria-haspopup="dialog"
          className="primary-button"
          disabled={mutationsDisabled}
          onClick={() => setDialogMode("create")}
          ref={createButtonRef}
          type="button"
        >
          Nouveau projet
        </button>
        <button
          aria-haspopup="dialog"
          aria-label={activeProject ? `Paramètres du projet ${activeProject.name}` : "Paramètres du projet"}
          className="secondary-button"
          disabled={!activeProject || !onUpdateProject || mutationsDisabled}
          onClick={() => setDialogMode("edit")}
          ref={settingsButtonRef}
          type="button"
        >
          Paramètres
        </button>
        <Link className="secondary-button project-admin-link" href="/admin">
          Centre d’administration
        </Link>
      </div>

      <nav aria-label="Projets" className="project-section">
        <div className="section-heading">
          <h2>Projets</h2>
          <span aria-label={`${projects.length} projet${projects.length > 1 ? "s" : ""}`}>{projects.length}</span>
        </div>
        {projects.length ? (
          <ul className="project-list">
            {projects.map((project) => {
              const isActive = project.id === activeProjectId;
              return (
                <li key={project.id}>
                  <button
                    aria-current={isActive ? "page" : undefined}
                    className={isActive ? "project active" : "project"}
                    disabled={mutationsDisabled}
                    onClick={() => onSelectProject(project.id)}
                    type="button"
                  >
                    <span aria-hidden="true" className="project-dot" />
                    <span className="project__identity">
                      <span className="project__name">{project.name}</span>
                      <small>{projectStatusLabel[project.status]} · {projectEnvironmentLabel[project.environment]}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="panel-empty-state">Aucun projet. Crée le premier projet pour commencer.</p>
        )}
      </nav>

      <section aria-labelledby="project-files-title" className="project-section project-files">
        <div className="section-heading">
          <h2 id="project-files-title">Fichiers</h2>
          <span aria-label={`${files.length} fichier${files.length > 1 ? "s" : ""}`}>{files.length}</span>
        </div>
        {files.length ? (
          <ul className="file-list">
            {files.map((file) => {
              const isSelected = file.id === selectedFileId;
              return (
                <li key={file.id}>
                  <button
                    aria-current={isSelected ? "true" : undefined}
                    className={isSelected ? "file-item is-selected" : "file-item"}
                    disabled={!onSelectFile}
                    onClick={() => onSelectFile?.(file.id)}
                    type="button"
                  >
                    <span aria-hidden="true" className="file-item__icon">▧</span>
                    <span>
                      <strong>{file.name}</strong>
                      {file.kind ? <small>{file.kind}</small> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="panel-empty-state">Aucun fichier enregistré dans la fondation Phase 1.</p>
        )}
      </section>

      <p aria-live="polite" className={`persistence-status persistence-status--${persistenceStatus}`} role="status">
        <span aria-hidden="true" className="status-dot" />
        {persistenceMessage}
      </p>

      {dialogMode ? (
        <ProjectSetupDialog
          initialValues={dialogMode === "edit" && activeProject ? {
            name: activeProject.name,
            description: activeProject.description,
            expectedOutcome: activeProject.expectedOutcome,
            status: activeProject.status,
            environment: activeProject.environment,
            repositoryUrl: activeProject.repositoryUrl,
          } : undefined}
          mode={dialogMode}
          onCancel={closeDialog}
          onSubmit={submitSetup}
        />
      ) : null}
    </aside>
  );
}

export default ProjectExplorer;
