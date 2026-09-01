"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
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
  onCreateProject: (name: string) => void | Promise<void>;
  onSelectProject: (projectId: string) => void;
  files?: readonly ProjectFileSummary[];
  selectedFileId?: string | null;
  onSelectFile?: (fileId: string) => void;
  persistence?: PersistencePresentation;
  maxProjectNameLength?: number;
  mutationsDisabled?: boolean;
};

const DEFAULT_MAX_PROJECT_NAME_LENGTH = 120;

export function ProjectExplorer({
  projects,
  activeProjectId,
  onCreateProject,
  onSelectProject,
  files = [],
  selectedFileId = null,
  onSelectFile,
  persistence,
  maxProjectNameLength = DEFAULT_MAX_PROJECT_NAME_LENGTH,
  mutationsDisabled = false,
}: ProjectExplorerProps) {
  const fieldId = useId();
  const errorId = useId();
  const [projectName, setProjectName] = useState("");
  const [creationError, setCreationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = projectName.trim();

    if (mutationsDisabled) {
      setCreationError("Les modifications sont indisponibles tant que l’état local n’est pas récupéré.");
      return;
    }

    if (!normalizedName) {
      setCreationError("Saisis un nom de projet.");
      return;
    }

    setCreationError(null);
    setIsSubmitting(true);

    try {
      await onCreateProject(normalizedName);
      setProjectName("");
    } catch {
      setCreationError("Le projet n’a pas pu être créé. Réessaie.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const persistenceStatus = persistence?.status ?? "idle";
  const persistenceMessage = persistence?.message ?? "État local de développement — Phase 1";

  return (
    <aside aria-labelledby="project-explorer-title" className="studio-panel project-explorer">
      <header className="project-explorer__brand">
        <p className="eyebrow">VISION SMART</p>
        <h1 id="project-explorer-title">Studio</h1>
      </header>

      <form aria-describedby={creationError ? errorId : undefined} className="project-create" onSubmit={handleCreateProject}>
        <label htmlFor={fieldId}>Nouveau projet</label>
        <div className="project-create__controls">
          <input
            aria-invalid={creationError ? "true" : undefined}
            autoComplete="off"
            disabled={isSubmitting || mutationsDisabled}
            id={fieldId}
            maxLength={maxProjectNameLength}
            onChange={(event) => {
              setProjectName(event.target.value);
              if (creationError) setCreationError(null);
            }}
            placeholder="Nom du projet"
            value={projectName}
          />
          <button className="primary-button" disabled={isSubmitting || mutationsDisabled} type="submit">
            {isSubmitting ? "Création…" : "Créer"}
          </button>
        </div>
        {creationError ? <p className="field-error" id={errorId} role="alert">{creationError}</p> : null}
      </form>

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
                    <span className="project__name">{project.name}</span>
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
    </aside>
  );
}

export default ProjectExplorer;
