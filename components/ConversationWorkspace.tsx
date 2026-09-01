"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { StudioProjectV3 } from "@/lib/studio-types";

export type ConversationWorkspaceProps = {
  activeProject: StudioProjectV3 | null;
  preview?: ReactNode;
  previewLabel?: string;
};

type WorkspaceView = "dialogue" | "preview";

export function ConversationWorkspace({
  activeProject,
  preview,
  previewLabel = "Aperçu du projet",
}: ConversationWorkspaceProps) {
  const [activeView, setActiveView] = useState<WorkspaceView>("dialogue");
  const phaseNoticeId = useId();
  const messageId = useId();
  const dialogueViewId = useId();
  const previewViewId = useId();
  const projectName = activeProject?.name ?? "Aucun projet sélectionné";

  return (
    <section aria-labelledby="workspace-title" className="workspace conversation-workspace">
      <header className="workspace-header">
        <div className="workspace-header__identity">
          <p className="eyebrow">PROJET ACTIF</p>
          <h2 id="workspace-title">{projectName}</h2>
        </div>
        <button aria-describedby={phaseNoticeId} className="model-pill" disabled type="button">
          Modèles IA — phase ultérieure
        </button>
      </header>

      <div aria-label="Vue du workspace" className="workspace-view-switcher">
        <button
          aria-controls={dialogueViewId}
          aria-pressed={activeView === "dialogue"}
          onClick={() => setActiveView("dialogue")}
          type="button"
        >
          Dialogue
        </button>
        <button
          aria-controls={previewViewId}
          aria-pressed={activeView === "preview"}
          onClick={() => setActiveView("preview")}
          type="button"
        >
          Aperçu
        </button>
      </div>

      <div className="conversation-workspace__content">
        <section hidden={activeView !== "dialogue"} id={dialogueViewId}>
          <div className="hero-card">
            <span aria-hidden="true" className="hero-icon">✦</span>
            <p className="eyebrow">FONDATION VISUELLE</p>
            <h3>De l’idée au résultat validé.</h3>
            <p>
              Cette Phase 1 prépare le dialogue, les missions et la reprise du projet. Aucun appel à un modèle IA
              ni aucune exécution distante n’est actif dans cette fondation.
            </p>
          </div>
          <div className="message assistant-message" role="note">
            <strong>Vision Smart Studio</strong>
            <p>Projet actif : {projectName}. Le dialogue IA sera disponible dans une phase ultérieure.</p>
          </div>
        </section>

        <section aria-label={previewLabel} hidden={activeView !== "preview"} id={previewViewId}>
          {preview ?? (
            <div className="preview-empty-state">
              <span aria-hidden="true">▧</span>
              <h3>Aucun artefact à prévisualiser</h3>
              <p>L’aperçu apparaîtra ici lorsqu’un artefact local compatible sera disponible.</p>
            </div>
          )}
        </section>
      </div>

      <form aria-describedby={phaseNoticeId} className="composer" onSubmit={(event) => event.preventDefault()}>
        <button aria-label="Voix — disponible dans une phase ultérieure" className="icon-button" disabled type="button">
          <span aria-hidden="true">◉</span>
        </button>
        <label className="visually-hidden" htmlFor={messageId}>Message</label>
        <input
          disabled
          id={messageId}
          placeholder="Dialogue IA disponible dans une phase ultérieure"
          type="text"
        />
        <button className="send-button" disabled type="submit">Envoyer</button>
      </form>
      <p className="phase-notice" id={phaseNoticeId}>
        Phase 1 : interface locale uniquement. Voix, modèles IA et envoi sont volontairement désactivés.
      </p>
    </section>
  );
}

export default ConversationWorkspace;
